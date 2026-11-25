/* Unified Media Posts Split Column + Infinite-Scroll Stream
   Supports live DB `media_posts` (videos, per-item blur teasers / hard locks, likes, comments)
   and falls back cleanly to auto-grouped `character_gallery_images` when `media_posts` is empty. */
"use strict";

(function () {
  const MediaStreamState = {
    posts: [],
    filter: "all",
    visibleCount: 8,
    postUI: new Map(), // postId -> { activeIndex, lastTileCol, lastCanvasW, liked }
    currentVisiblePostId: null,
    pendingEnterAnim: null,
    pendingReturnAnim: null,
    drawerPostId: null,
    commentsCache: new Map(), // postId -> array of comments
    widthObserver: null,
    visibleObserver: null
  };

  function getPostUI(postId) {
    if (!MediaStreamState.postUI.has(postId)) {
      MediaStreamState.postUI.set(postId, {
        activeIndex: 0,
        lastTileCol: new Map(),
        lastCanvasW: 0,
        liked: false
      });
    }
    return MediaStreamState.postUI.get(postId);
  }

  function mediaPostIsMature(image) {
    return typeof homeIsMatureGalleryImage === "function" ? homeIsMatureGalleryImage(image) : false;
  }

  function mediaPostCanViewMature() {
    return (typeof homeCanViewMatureGallery === "function" && homeCanViewMatureGallery())
      || (D.MEDIA_POSTS || []).some(post => post.items?.some(item => item.studio_private && item.content_label !== "sfw" && !item.locked));
  }

  function formatPostDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function fmtMediaTime(sec) {
    if (!Number.isFinite(sec)) return "0:00";
    const s = Math.floor(sec);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  /* Map live DB `get_media_post_feed` rows, or fall back to auto-grouped gallery rows */
  function buildHomeMediaPosts(story, allStories = false) {
    const targetStory = story || (typeof bySlug === "function" ? bySlug(D.PRIMARY_SLUG) : null) || (D.STORIES || [])[0];
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();

    const dbPosts = Array.isArray(D.MEDIA_POSTS) ? D.MEDIA_POSTS : [];
    const storyDbPosts = !allStories && targetStory
      ? dbPosts.filter(p => !p.story_id || p.story_id === targetStory.id)
      : dbPosts;

    if (storyDbPosts.length) {
      const posts = storyDbPosts.map((row, idx) => {
        const ts = new Date(row.published_at || row.created_at || 0).getTime() || 0;
        const isNew = (ts && (nowMs - ts <= sevenDaysMs)) || idx < 2;
        const rawItems = Array.isArray(row.items) ? row.items : [];
        const items = rawItems.map((it, i) => {
          const w = Number(it.width) || 0;
          const h = Number(it.height) || 0;
          const ratio = (w > 0 && h > 0) ? (w / h) : (it.media_type === "video" ? 16 / 9 : 0.75);
          return {
            id: it.id || `${row.id}-${i}`,
            type: it.media_type === "video" ? "video" : "image",
            locked: !!it.locked,
            accessMode: it.access_mode || "blur_teaser",
            audience: it.audience,
            requiredTierName: it.audience === "registered" ? "Sign in" : (it.required_tier_name || row.required_tier_name || (it.studio_private ? "Locked" : "Resident Licker+")),
            src: homeSafeMediaUrl(it.media_url),
            poster: homeSafeMediaUrl(it.poster_url),
            blurThumb: homeSafeMediaUrl(it.blur_thumb_url),
            thumb: homeSafeMediaUrl(it.media_url) ? homeThumbnailUrl(it.media_url, 720) : homeSafeMediaUrl(it.blur_thumb_url),
            ratio,
            duration: Number(it.duration_seconds || 0),
            label: `${row.title || "Media"} #${i + 1}`,
            isNsfw: it.studio_private ? it.content_label !== "sfw" : !!row.is_nsfw
          };
        });

        const ui = getPostUI(row.id);
        ui.liked = !!row.user_liked;

        return {
          id: row.id,
          isBackend: true,
          slug: row.slug || row.id,
          title: row.title || "Untitled Drop",
          caption: row.caption || "",
          date: formatPostDate(row.published_at || row.created_at) || "Recent",
          isNew,
          isNsfw: !!row.is_nsfw,
          hasVideo: items.some(x => x.type === "video"),
          tierLabel: rawItems.some(x => x.studio_private) ? (rawItems.every(x => x.audience === "public") ? "Public" : "Mixed access") : row.required_tier_name || (row.is_nsfw ? "Resident Licker+" : "Free Access"),
          tierFree: !row.required_tier_id && !items.some(x => x.locked),
          freeToGuests: rawItems.some(x => x.studio_private) ? rawItems.every(x => x.audience === "public") : !row.is_nsfw,
          cardLayout: window.MediaLayout.compactMosaic(items.length, idx).className,
          tags: Array.isArray(row.tags) ? row.tags : [],
          likes: Number(row.like_count || 0),
          commentCount: Number(row.comment_count || 0),
          items
        };
      });
      MediaStreamState.posts = posts;
      return posts;
    }

    // Fallback: auto-group existing character_gallery_images when media_posts is empty
    if (!targetStory) return [];
    const canViewMature = mediaPostCanViewMature();
    const charById = new Map((D.CHARACTERS || []).map(c => [c.id, c]));

    const rawImages = (D.GALLERY_IMAGES || [])
      .filter(img => (!img.story_id || img.story_id === targetStory.id) && (canViewMature || !mediaPostIsMature(img)))
      .filter(img => !!homeSafeMediaUrl(img.image_url))
      .slice()
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const WINDOW_MS = 30 * 60 * 1000;
    const MAX_PER_POST = 9;
    const batches = [];

    rawImages.forEach(img => {
      const charId = img.character_id || "general";
      const ts = new Date(img.created_at || 0).getTime() || 0;
      const match = batches.find(b =>
        b.charId === charId &&
        b.items.length < MAX_PER_POST &&
        Math.abs(b.anchorTs - ts) <= WINDOW_MS
      );
      if (match) match.items.push(img);
      else batches.push({ charId, anchorTs: ts, createdAt: img.created_at || "", items: [img] });
    });

    const posts = batches.map((batch, idx) => {
      const ch = charById.get(batch.charId);
      const charName = ch?.name || batch.items[0]?.character_name || "Archive Drop";
      const firstCaption = String(batch.items.find(i => i.caption)?.caption || "").trim();
      const dateStr = formatPostDate(batch.createdAt);
      const title = firstCaption || `${charName}${dateStr ? ` · ${dateStr}` : " Set"}`;
      const isNsfw = batch.items.some(mediaPostIsMature);
      const tags = [...new Set([
        charName,
        ...batch.items.flatMap(i => Array.isArray(i.image_tags) ? i.image_tags : [])
      ])].filter(Boolean).slice(0, 6);

      const totalVotes = batch.items.reduce((sum, img) => {
        const v = State.imageVotes?.[img.id];
        return sum + (v && Number.isFinite(v.score) ? Number(v.score) : 0);
      }, 0);

      const ageMs = batch.anchorTs ? (nowMs - batch.anchorTs) : Infinity;
      const isNew = ageMs <= sevenDaysMs || idx < 2;

      return {
        id: `mp-${batch.charId}-${batch.anchorTs || idx}-${idx}`,
        isBackend: false,
        title,
        caption: "",
        charName,
        date: dateStr || "Recent",
        isNew,
        isNsfw,
        hasVideo: false,
        tierLabel: isNsfw ? "Resident Licker+" : "Free Access",
        tierFree: !isNsfw,
        cardLayout: (batch.items.length >= 5 && idx % 2 === 1) ? "layout-collage-5" : "layout-lead-2",
        tags,
        likes: Math.max(0, totalVotes),
        commentCount: 0,
        items: batch.items.map((img, i) => ({
          id: img.id || `item-${idx}-${i}`,
          type: "image",
          locked: false,
          accessMode: "public",
          src: homeSafeMediaUrl(img.image_url),
          thumb: homeThumbnailUrl(img.image_url, 720),
          ratio: 0.75,
          label: img.caption || `${charName} #${i + 1}`,
          isNsfw: mediaPostIsMature(img)
        }))
      };
    });

    MediaStreamState.posts = posts;
    return posts;
  }

  /* Compact Split Column / Feed Card */
  function homeMediaPostCard(post) {
    const ui = getPostUI(post.id);
    const shouldBlur = post.isNsfw && mediaPostCanViewMature() && !State.showR18;
    const visibleCount = post.cardLayout === "layout-collage-5" ? 5 : 3;
    const shown = post.items.slice(0, visibleCount);
    const remaining = Math.max(0, post.items.length - visibleCount);
    const vidCount = post.items.filter(i => i.type === "video").length;
    const imgCount = post.items.filter(i => i.type === "image").length;
    const summaryText = vidCount
      ? `${vidCount} Video${imgCount ? ` · ${imgCount} Stills` : ""}`
      : `${imgCount} ${imgCount === 1 ? "Image" : "Stills"}`;
    const displayLikes = post.isBackend ? post.likes : (post.likes + (ui.liked ? 1 : 0));

    const cells = shown.map((item, i) => {
      const isLastWithMore = (i === shown.length - 1 && remaining > 0);
      if (item.locked && (item.accessMode === "hard_lock" || !item.blurThumb)) {
        return `
          <div class="mp-m-cell mp-cell-locked">
            <div class="mp-lock-mini">🔒<span>${esc(item.requiredTierName || "Locked")}</span></div>
            ${isLastWithMore ? `<div class="mp-m-more">+${remaining} more<small>attachments</small></div>` : ""}
          </div>`;
      }
      const src = item.locked
        ? item.blurThumb
        : (item.type === "video" ? (item.poster || item.blurThumb) : (item.thumb || item.src));
      return `
        <div class="mp-m-cell ${item.isNsfw && !item.locked ? "mp-mature" : ""} ${item.locked ? "is-locked-teaser" : ""}">
          ${src ? `<img src="${esc(src)}" data-full-src="${!item.locked && src !== item.src ? esc(item.src) : ""}" alt="${esc(item.label)}" loading="lazy" decoding="async" onerror="homeThumbnailFailed(this)">` : ""}
          ${item.type === "video" && !item.locked ? `<div class="mp-play-badge"><div class="mp-play-circle">▶</div></div>` : ""}
          ${item.locked ? `<span class="mp-lock-pill">🔒</span>` : ""}
          ${isLastWithMore ? `<div class="mp-m-more">+${remaining} more<small>attachments</small></div>` : ""}
        </div>`;
    }).join("");

    return `
      <article class="mp-card ${shouldBlur ? "nsfw-blurred" : ""}" data-act="open-media-post" data-post-id="${esc(post.id)}" tabindex="0" role="button" aria-label="Open ${esc(post.title)}">
        ${post.isNew ? `<span class="mp-new-stamp">NEW</span>` : ""}
        <div class="mp-mosaic ${post.cardLayout}">${cells}</div>
        <div class="mp-foot">
          <div class="mp-foot-left">
            <div class="mp-title">${esc(post.title)}</div>
            <div class="mp-sub">
              <span class="mp-tier-tag ${post.tierFree ? "free" : ""}">${esc(post.tierLabel)}</span>
              <span>${summaryText}</span>
              <span>· ${esc(post.date)}</span>
            </div>
          </div>
          <div class="mp-stats">
            ${post.isBackend ? `<span class="mp-stat">💬 ${post.commentCount}</span>` : ""}
            <span class="mp-stat heart">${I.heart || "♥"} ${displayLikes}</span>
          </div>
        </div>
      </article>`;
  }

  /* Organic Uncropped In-Place Masonry Solver */
  const solveOrganicMasonry = window.MediaLayout.solveOrganicMasonry;

  function layoutStreamPostCanvas(postId, instant = false) {
    const post = MediaStreamState.posts.find(p => p.id === postId);
    const section = document.querySelector(`[data-stream-post="${CSS.escape(postId)}"]`);
    if (!post || !section) return;
    const canvas = section.querySelector(".mp-media-canvas");
    if (!canvas) return;
    const W = canvas.clientWidth;
    if (!W) return;

    const ui = getPostUI(postId);
    ui.lastCanvasW = W;

    const { rects, nextCols, totalH } = solveOrganicMasonry(post.items, ui.activeIndex, ui.lastTileCol, W, 10);
    canvas.style.height = `${totalH}px`;

    canvas.querySelectorAll(".mp-media-tile").forEach((el, idx) => {
      const r = rects.get(idx);
      if (!r) return;
      if (instant) el.classList.add("no-anim");
      el.style.left = `${r.x}px`;
      el.style.top = `${r.y}px`;
      el.style.width = `${r.w}px`;
      el.style.height = `${r.h}px`;
      el.classList.toggle("is-active", idx === ui.activeIndex);
      if (instant) {
        el.getBoundingClientRect();
        el.classList.remove("no-anim");
      }
    });

    ui.lastTileCol = nextCols;
    const fBtn = section.querySelector('[data-mp-mode="focus"]');
    const oBtn = section.querySelector('[data-mp-mode="overview"]');
    if (fBtn) fBtn.classList.toggle("active", ui.activeIndex >= 0);
    if (oBtn) oBtn.classList.toggle("active", ui.activeIndex < 0);
    syncStreamPostVideos(postId, false);
  }

  function syncStreamPostVideos(postId, forcePause = false) {
    const post = MediaStreamState.posts.find(p => p.id === postId);
    const section = document.querySelector(`[data-stream-post="${CSS.escape(postId)}"]`);
    if (!post || !section) return;
    const ui = getPostUI(postId);

    post.items.forEach((item, idx) => {
      if (item.type !== "video" || item.locked) return;
      const vid = section.querySelector(`video[data-mp-vid="${CSS.escape(item.id)}"]`);
      const badge = section.querySelector(`[data-mp-vbadge="${CSS.escape(item.id)}"]`);
      const playBtn = section.querySelector(`[data-mp-toggle-vid="${CSS.escape(item.id)}"]`);
      if (!vid) return;

      if (!forcePause && idx === ui.activeIndex) {
        vid.play().catch(() => {});
        if (playBtn) playBtn.textContent = "❚❚";
        if (badge) badge.textContent = `▶ Playing · ${fmtMediaTime(vid.currentTime)}`;
      } else {
        if (!vid.paused) vid.pause();
        if (playBtn) playBtn.textContent = "▶";
        if (badge) badge.textContent = `❚❚ Paused · ${fmtMediaTime(vid.currentTime)}`;
      }
    });
  }

  function filteredMediaPosts() {
    const posts = buildHomeMediaPosts(null, true);
    if (MediaStreamState.filter === "video") return posts.filter(p => p.hasVideo);
    if (MediaStreamState.filter === "mature") return posts.filter(p => p.isNsfw);
    if (MediaStreamState.filter === "free") return posts.filter(p => p.freeToGuests ?? !p.isNsfw);
    return posts;
  }

  function renderTileInner(post, item, i) {
    if (item.locked) {
      if (item.accessMode === "hard_lock" || !item.blurThumb) {
        return `
          <div class="mp-tile-hard-lock">
            <div class="mp-lock-icon">🔒</div>
            <strong>Locked ${item.type === "video" ? "Video" : "Artwork"}</strong>
            <span>Available for ${esc(item.requiredTierName || "Subscribers")}</span>
            <button type="button" class="btn sm primary" data-sheet="persona">Unlock Access</button>
          </div>`;
      }
      // blur_teaser: server only sends pre-baked blurThumb, never media_url!
      return `
        <span class="mp-tile-badge">🔒 ${esc(item.requiredTierName || "Subscriber Teaser")}</span>
        ${item.blurThumb ? `<img class="mp-tile-media mp-teaser-img" src="${esc(item.blurThumb)}" alt="Locked teaser" loading="lazy">` : ""}
        <div class="mp-teaser-overlay">
          <div class="mp-lock-icon">🔒</div>
          <button type="button" class="btn sm primary" data-sheet="persona">${item.audience === "registered" ? "Sign in" : "Unlock " + esc(item.requiredTierName || "Access")}</button>
        </div>`;
    }

    const isVid = item.type === "video";
    return `
      <span class="mp-tile-badge ${isVid ? "video" : ""}" ${isVid ? `data-mp-vbadge="${esc(item.id)}"` : ""}>
        ${isVid ? "▶ Video" : `${i + 1} / ${post.items.length}`}
      </span>
      <div class="mp-tile-actions">
        <button type="button" class="mp-icon-chip" data-act="media-inspect" data-mp-post="${esc(post.id)}" data-mp-idx="${i}">⛶ Inspect</button>
      </div>
      <span class="mp-tile-expand-hint">Click to expand</span>
      ${isVid
        ? `<video class="mp-tile-media" data-mp-vid="${esc(item.id)}" src="${esc(item.src)}" ${item.poster ? `poster="${esc(item.poster)}"` : ""} loop muted playsinline preload="metadata"></video>
           <div class="mp-video-hud">
             <button type="button" class="mp-v-play" data-mp-toggle-vid="${esc(item.id)}">❚❚</button>
             <div class="mp-v-track" data-mp-scrub="${esc(item.id)}"><div class="mp-v-fill" data-mp-fill="${esc(item.id)}"></div></div>
             <span class="mp-v-time" data-mp-vtime="${esc(item.id)}">0:00 / 0:00</span>
           </div>`
        : `<img class="mp-tile-media" src="${esc(item.src)}" alt="${esc(item.label)}" loading="lazy" decoding="async">`
      }`;
  }

  /* Dedicated Unified Media Stream View (#/media) */
  VIEWS.media = function () {
    const posts = filteredMediaPosts();
    const visible = posts.slice(0, MediaStreamState.visibleCount);
    const canMature = mediaPostCanViewMature();
    const blurOn = canMature && !State.showR18;

    return `
      <div class="mp-stream-wrap">
        <div class="mp-stream-sticky-bar">
          <div class="mp-stream-left">
            <button type="button" class="btn sm ghost" data-act="media-back-home">← Back to Split</button>
            <span class="mp-stream-hint">Scroll naturally to browse full posts</span>
          </div>
          <div class="mp-stream-controls">
            <div class="mp-filter-chips">
              ${[
                ["all", "All Drops"],
                ["video", "With Video"],
                ["mature", "NSFW"],
                ["free", "Free Access"]
              ].map(([key, label]) => `
                <button type="button" class="mp-chip ${MediaStreamState.filter === key ? "active" : ""}" data-act="media-filter" data-mp-filter="${key}">${label}</button>
              `).join("")}
            </div>
            <button type="button" class="btn sm ghost" data-act="toggle-media-r18" aria-pressed="${canMature && !!State.showR18}">${canMature && State.showR18 ? "BLUR NSFW" : "SHOW NSFW"}</button>
          </div>
        </div>

        ${visible.length ? `
          <div class="mp-stream-list" id="mp-stream-list">
            ${visible.map(post => {
              const ui = getPostUI(post.id);
              const shouldBlur = post.isNsfw && blurOn;
              const vidCount = post.items.filter(i => i.type === "video").length;
              const imgCount = post.items.filter(i => i.type === "image").length;
              const summaryText = vidCount
                ? `${vidCount} Video${imgCount ? ` · ${imgCount} Stills` : ""}`
                : `${imgCount} ${imgCount === 1 ? "Image" : "Stills"}`;
              const displayLikes = post.isBackend ? post.likes : (post.likes + (ui.liked ? 1 : 0));

              return `
                <article class="mp-post-shell" data-stream-post="${esc(post.id)}">
                  <header class="mp-post-header">
                    <div class="mp-post-header-top">
                      <div class="mp-post-header-left">
                        <span class="mp-tier-tag ${post.tierFree ? "free" : ""}">${esc(post.tierLabel)}</span>
                        ${post.isNew ? `<span class="mp-tier-tag is-new">NEW</span>` : ""}
                        <span class="mp-post-meta-text">${esc(post.date)} · ${summaryText}</span>
                      </div>
                      <div class="mp-post-header-actions">
                        <div class="mp-seg">
                          <button type="button" class="${ui.activeIndex >= 0 ? "active" : ""}" data-mp-mode="focus" data-mp-post="${esc(post.id)}">Focus</button>
                          <button type="button" class="${ui.activeIndex < 0 ? "active" : ""}" data-mp-mode="overview" data-mp-post="${esc(post.id)}">Overview</button>
                        </div>
                        <button type="button" class="btn sm ghost" data-act="media-inspect-active" data-mp-post="${esc(post.id)}">⛶ Inspect</button>
                      </div>
                    </div>
                    <h2>${esc(post.title)}</h2>
                    ${post.caption ? `<p class="mp-post-caption">${esc(post.caption)}</p>` : ""}
                    ${post.tags.length ? `<div class="mp-tag-row">${post.tags.map(t => `<span class="mp-tag">#${esc(t)}</span>`).join("")}</div>` : ""}
                  </header>

                  <div class="mp-canvas-stage-row">
                    <div class="mp-media-canvas ${shouldBlur ? "nsfw-blurred" : ""}" data-canvas-post="${esc(post.id)}">
                      ${post.items.map((item, i) => `
                        <div class="mp-media-tile ${item.isNsfw && !item.locked ? "mp-mature" : ""} ${i === ui.activeIndex ? "is-active" : ""} ${item.locked ? "is-locked-tile" : ""}" data-mp-tile="${i}" data-mp-post="${esc(post.id)}">
                          ${renderTileInner(post, item, i)}
                        </div>
                      `).join("")}
                    </div>

                    <aside class="mp-dock-rail" aria-label="Post actions">
                      <div class="mp-glass-dock">
                        <button type="button" class="mp-dock-action ${ui.liked ? "liked" : ""}" data-act="media-like" data-mp-post="${esc(post.id)}" aria-label="Like post">
                          <span class="mp-heart-burst"></span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                          </svg>
                          <span data-mp-like-count="${esc(post.id)}">${displayLikes}</span>
                        </button>
                        <div class="mp-dock-divider"></div>
                        <button type="button" class="mp-dock-action" data-act="media-comments" data-mp-post="${esc(post.id)}" aria-label="Open comments">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                          </svg>
                          <span data-mp-comment-count="${esc(post.id)}">${post.commentCount || 0}</span>
                        </button>
                      </div>
                    </aside>
                  </div>
                </article>`;
            }).join("")}
          </div>
          ${posts.length > visible.length ? `
            <div class="mp-stream-more">
              <button type="button" class="btn ghost" data-act="media-load-more">Load older posts (${posts.length - visible.length} remaining)</button>
            </div>` : ""}
        ` : `
          <div class="rh-empty">
            <h3>No media posts yet</h3>
            <p>Published media posts will appear here.</p>
          </div>
        `}
      </div>

      <!-- Glassmorphic Comment Drawer -->
      <div class="mp-drawer-backdrop" id="mp-drawer-backdrop" data-act="media-close-comments"></div>
      <aside class="mp-comment-drawer" id="mp-comment-drawer" aria-label="Comments">
        <div class="mp-drawer-handle"></div>
        <div class="mp-drawer-head">
          <div>
            <h3>Comments <small id="mp-drawer-count"></small></h3>
            <div class="mp-drawer-sub" id="mp-drawer-post-title"></div>
          </div>
          <button type="button" class="btn sm ghost" data-act="media-close-comments">✕</button>
        </div>
        <div class="mp-comment-list" id="mp-comment-list"></div>
        <form class="mp-comment-form" id="mp-comment-form">
          <input id="mp-comment-input" type="text" placeholder="Add a comment…" autocomplete="off">
          <button type="submit" class="btn sm primary">Post</button>
        </form>
      </aside>

      <!-- Fullscreen Inspector -->
      <div class="mp-fs-modal" id="mp-fs-modal">
        <div class="mp-fs-top">
          <div id="mp-fs-caption"></div>
          <button type="button" class="btn sm ghost" data-act="media-close-fs">✕ Close (Esc)</button>
        </div>
        <div class="mp-fs-stage" id="mp-fs-stage"></div>
      </div>
    `;
  };

  function setupMediaStream() {
    if (MediaStreamState.widthObserver) {
      MediaStreamState.widthObserver.disconnect();
      MediaStreamState.widthObserver = null;
    }
    if (MediaStreamState.visibleObserver) {
      MediaStreamState.visibleObserver.disconnect();
      MediaStreamState.visibleObserver = null;
    }

    const list = document.getElementById("mp-stream-list");
    if (!list) return;

    if (typeof ResizeObserver !== "undefined") {
      MediaStreamState.widthObserver = new ResizeObserver((entries) => {
        entries.forEach(entry => {
          const pid = entry.target.dataset.canvasPost;
          if (!pid) return;
          const ui = getPostUI(pid);
          const W = entry.target.clientWidth;
          if (W && Math.abs(W - ui.lastCanvasW) >= 2) layoutStreamPostCanvas(pid, true);
        });
      });
    }

    if (typeof IntersectionObserver !== "undefined") {
      MediaStreamState.visibleObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const pid = entry.target.dataset.streamPost;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            MediaStreamState.currentVisiblePostId = pid;
            syncStreamPostVideos(pid, false);
          } else if (!entry.isIntersecting) {
            syncStreamPostVideos(pid, true);
          }
        });
      }, { threshold: [0, 0.35] });
    }

    list.querySelectorAll(".mp-media-canvas").forEach(canvas => {
      const pid = canvas.dataset.canvasPost;
      if (MediaStreamState.widthObserver) MediaStreamState.widthObserver.observe(canvas);
      layoutStreamPostCanvas(pid, true);

      canvas.querySelectorAll(".mp-media-tile").forEach(tile => {
        const idx = Number(tile.dataset.mpTile);
        const img = tile.querySelector("img");
        const vid = tile.querySelector("video");
        if (img) {
          const onRatio = () => {
            if (img.naturalWidth && img.naturalHeight) {
              const post = MediaStreamState.posts.find(p => p.id === pid);
              const item = post?.items?.[idx];
              if (item) {
                const realRatio = img.naturalWidth / img.naturalHeight;
                if (Math.abs(realRatio - item.ratio) > 0.02) {
                  item.ratio = realRatio;
                  layoutStreamPostCanvas(pid, false);
                }
              }
            }
          };
          if (img.complete) onRatio();
          else img.addEventListener("load", onRatio, { once: true });
        }
        if (vid) {
          const itemId = vid.dataset.mpVid;
          vid.addEventListener("loadedmetadata", () => {
            if (vid.videoWidth && vid.videoHeight) {
              const post = MediaStreamState.posts.find(p => p.id === pid);
              const item = post?.items?.[idx];
              if (item) {
                item.ratio = vid.videoWidth / vid.videoHeight;
                layoutStreamPostCanvas(pid, false);
              }
            }
          });
          vid.addEventListener("timeupdate", () => {
            const fill = tile.querySelector(`[data-mp-fill="${CSS.escape(itemId)}"]`);
            const timeEl = tile.querySelector(`[data-mp-vtime="${CSS.escape(itemId)}"]`);
            const badge = tile.querySelector(`[data-mp-vbadge="${CSS.escape(itemId)}"]`);
            if (fill && vid.duration) fill.style.width = `${(vid.currentTime / vid.duration) * 100}%`;
            if (timeEl) timeEl.textContent = `${fmtMediaTime(vid.currentTime)} / ${fmtMediaTime(vid.duration)}`;
            if (badge && getPostUI(pid).activeIndex === idx) {
              badge.textContent = vid.paused ? `❚❚ Paused · ${fmtMediaTime(vid.currentTime)}` : `▶ Playing · ${fmtMediaTime(vid.currentTime)}`;
            }
          });
        }
      });
    });

    list.querySelectorAll(".mp-post-shell").forEach(sec => {
      if (MediaStreamState.visibleObserver) MediaStreamState.visibleObserver.observe(sec);
    });

    if (MediaStreamState.pendingEnterAnim) {
      const { postId } = MediaStreamState.pendingEnterAnim;
      MediaStreamState.pendingEnterAnim = null;
      const target = list.querySelector(`[data-stream-post="${CSS.escape(postId)}"]`);
      if (target) {
        MediaStreamState.currentVisiblePostId = postId;
        window._mediaSkipScrollReset = true;
        const topOffset = target.getBoundingClientRect().top + window.scrollY - 88;
        window.scrollTo(0, Math.max(0, topOffset));
        if (typeof document.startViewTransition === "function" && !prefersReducedMotion()) {
          target.style.viewTransitionName = "mp-active-hero";
        }
      }
    }
  }

  function applyHomeReturnAnim() {
    if (!MediaStreamState.pendingReturnAnim) return;
    const { postId } = MediaStreamState.pendingReturnAnim;
    MediaStreamState.pendingReturnAnim = null;
    const targetCard = document.querySelector(`#home-gallery-panel [data-post-id="${CSS.escape(postId)}"]`);
    if (!targetCard) return;
    window._mediaSkipScrollReset = true;
    targetCard.scrollIntoView({ block: "center", behavior: "instant" });
    if (typeof document.startViewTransition === "function" && !prefersReducedMotion()) {
      targetCard.style.viewTransitionName = "mp-active-hero";
    }
  }

  function openMediaStreamFromCard(postId, sourceEl) {
    if (sourceEl && typeof document.startViewTransition === "function" && !prefersReducedMotion()) {
      document.querySelectorAll('[style*="mp-active-hero"]').forEach(el => { el.style.viewTransitionName = ""; });
      sourceEl.style.viewTransitionName = "mp-active-hero";
    }
    if (postId) {
      MediaStreamState.pendingEnterAnim = { postId };
      MediaStreamState.currentVisiblePostId = postId;
    }
    nav("/media");
  }

  function backFromMediaStream() {
    closeMediaComments();
    const pid = MediaStreamState.currentVisiblePostId || MediaStreamState.posts[0]?.id;
    const activeSec = pid ? document.querySelector(`[data-stream-post="${CSS.escape(pid)}"]`) : null;
    if (pid && activeSec) {
      if (typeof document.startViewTransition === "function" && !prefersReducedMotion()) {
        document.querySelectorAll('[style*="mp-active-hero"]').forEach(el => { el.style.viewTransitionName = ""; });
        activeSec.style.viewTransitionName = "mp-active-hero";
      }
      MediaStreamState.pendingReturnAnim = { postId: pid };
    }
    nav("/");
  }

  async function renderDrawerComments(post) {
    const listEl = document.getElementById("mp-comment-list");
    const countEl = document.getElementById("mp-drawer-count");
    const formEl = document.getElementById("mp-comment-form");
    if (!listEl || !post) return;

    if (!post.isBackend) {
      if (countEl) countEl.textContent = "";
      if (formEl) formEl.style.display = "none";
      listEl.innerHTML = `
        <div class="mp-drawer-wip">
          <div class="mp-wip-badge">Auto-Grouped Archive</div>
          <h4>Publish via Media Studio for Live Comments</h4>
          <p>This set is auto-grouped from Character Gallery images. Posts published in <code>media-studio.html</code> support live comments &amp; likes.</p>
        </div>`;
      return;
    }

    if (formEl) formEl.style.display = "flex";
    listEl.innerHTML = `<div style="padding:18px;font-size:12.5px;color:var(--text-faint)">Loading comments…</div>`;
    try {
      const comments = await loadMediaPostComments(post.id);
      MediaStreamState.commentsCache.set(post.id, comments);
      post.commentCount = comments.length;
      if (countEl) countEl.textContent = String(comments.length);
      const dockCnt = document.querySelector(`[data-mp-comment-count="${CSS.escape(post.id)}"]`);
      if (dockCnt) dockCnt.textContent = String(comments.length);

      listEl.innerHTML = comments.length
        ? comments.map(c => `
            <div class="mp-comment-item">
              <div class="mp-comment-author">
                <strong>${esc(c.author)}${c.source === "discord" ? ` <span class="mp-discord-tag">Discord</span>` : ""}</strong>
                <span>${esc(formatPostDate(c.created_at))}</span>
              </div>
              <div class="mp-comment-text">${esc(c.text)}</div>
            </div>`).join("")
        : `<div style="padding:18px;font-size:12.5px;color:var(--text-faint)">No comments yet. Start the thread!</div>`;
    } catch (err) {
      listEl.innerHTML = `<div style="padding:18px;font-size:12.5px;color:var(--bad)">Could not load comments: ${esc(err.message || "Try again")}</div>`;
    }
  }

  function openMediaComments(postId) {
    MediaStreamState.drawerPostId = postId;
    const post = MediaStreamState.posts.find(p => p.id === postId);
    const drawer = document.getElementById("mp-comment-drawer");
    const backdrop = document.getElementById("mp-drawer-backdrop");
    const titleEl = document.getElementById("mp-drawer-post-title");
    if (titleEl && post) titleEl.textContent = post.title;
    if (drawer) drawer.classList.add("open");
    if (backdrop) backdrop.classList.add("open");
    if (post) renderDrawerComments(post);
  }

  function closeMediaComments() {
    document.getElementById("mp-comment-drawer")?.classList.remove("open");
    document.getElementById("mp-drawer-backdrop")?.classList.remove("open");
  }

  async function submitMediaComment(text) {
    const post = MediaStreamState.posts.find(p => p.id === MediaStreamState.drawerPostId);
    if (!post || !post.isBackend) return;
    await postMediaPostComment(post.id, text);
    await renderDrawerComments(post);
  }

  function openMediaFullscreen(postId, idx) {
    const post = MediaStreamState.posts.find(p => p.id === postId);
    const item = post?.items?.[Math.max(0, idx)];
    const modal = document.getElementById("mp-fs-modal");
    const stage = document.getElementById("mp-fs-stage");
    const cap = document.getElementById("mp-fs-caption");
    if (!item || item.locked || !modal || !stage) return;
    if (item.isNsfw && !State.showR18) {
      toast("NSFW artwork is blurred", "Use Show NSFW before opening the full-size view.", {icon:"info"});
      return;
    }
    if (cap) cap.textContent = `${post.title} — ${item.label}`;
    stage.innerHTML = item.type === "video"
      ? `<video src="${esc(item.src)}" ${item.poster ? `poster="${esc(item.poster)}"` : ""} controls autoplay loop muted playsinline></video>`
      : `<img src="${esc(item.src)}" alt="${esc(item.label)}">`;
    modal.classList.add("open");
  }

  function closeMediaFullscreen() {
    document.getElementById("mp-fs-modal")?.classList.remove("open");
    const stage = document.getElementById("mp-fs-stage");
    if (stage) stage.innerHTML = "";
  }

  function handleMediaStreamClick(e) {
    if (route.name !== "media") return false;
    const modeBtn = e.target.closest("[data-mp-mode]");
    if (modeBtn) {
      const pid = modeBtn.dataset.mpPost;
      const ui = getPostUI(pid);
      ui.activeIndex = modeBtn.dataset.mpMode === "overview" ? -1 : 0;
      layoutStreamPostCanvas(pid, false);
      return true;
    }
    const vidBtn = e.target.closest("[data-mp-toggle-vid]");
    if (vidBtn) {
      const vid = document.querySelector(`video[data-mp-vid="${CSS.escape(vidBtn.dataset.mpToggleVid)}"]`);
      if (vid) {
        if (vid.paused) { vid.play().catch(() => {}); vidBtn.textContent = "❚❚"; }
        else { vid.pause(); vidBtn.textContent = "▶"; }
      }
      return true;
    }
    const scrub = e.target.closest("[data-mp-scrub]");
    if (scrub) {
      const vid = document.querySelector(`video[data-mp-vid="${CSS.escape(scrub.dataset.mpScrub)}"]`);
      if (vid && vid.duration) {
        const rect = scrub.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        vid.currentTime = pct * vid.duration;
      }
      return true;
    }
    const tile = e.target.closest(".mp-media-tile");
    if (tile && !e.target.closest("[data-act='media-inspect']") && !e.target.closest(".mp-video-hud") && !e.target.closest("[data-sheet]")) {
      const pid = tile.dataset.mpPost;
      const idx = Number(tile.dataset.mpTile);
      const ui = getPostUI(pid);
      ui.activeIndex = (ui.activeIndex === idx) ? -1 : idx;
      layoutStreamPostCanvas(pid, false);
      return true;
    }
    return false;
  }

  window.resetMediaStreamData = function (accountChanged) {
    MediaStreamState.posts = [];
    if (accountChanged) {
      MediaStreamState.postUI.clear();
      closeMediaFullscreen();
      closeMediaComments();
      document.querySelectorAll(".mp-card, .mp-media-canvas, .mp-inspector").forEach(el => el.replaceChildren());
    }
  };
  window.MediaStreamState = MediaStreamState;
  window.buildHomeMediaPosts = buildHomeMediaPosts;
  window.homeMediaPostCard = homeMediaPostCard;
  window.setupMediaStream = setupMediaStream;
  window.applyHomeReturnAnim = applyHomeReturnAnim;
  window.openMediaStreamFromCard = openMediaStreamFromCard;
  window.backFromMediaStream = backFromMediaStream;
  window.openMediaComments = openMediaComments;
  window.closeMediaComments = closeMediaComments;
  window.submitMediaComment = submitMediaComment;
  window.openMediaFullscreen = openMediaFullscreen;
  window.closeMediaFullscreen = closeMediaFullscreen;
  window.handleMediaStreamClick = handleMediaStreamClick;
  window.getMediaPostUI = getPostUI;
  window.mediaPostCanViewMature = mediaPostCanViewMature;
})();
