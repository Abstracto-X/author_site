/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ HOME ============ */
VIEWS.home = function(){
  const P = persona();
  const reads = activeReads();
  const tonights = reads.find(r=>r.prog.pct>0 && r.prog.pct<100) || reads[0];
  const hour = new Date().getHours();
  const greet = hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
  const name = P.signedIn? "reader" : "traveller";

  // access banner
  let banner = "";
  if (P.expired) banner = accessBanner("expired","Your member access has expired","Some chapters are now locked. Renew to continue reading — a short grace window may still apply.","/vault","Renew access");
  else if (P.pending) banner = accessBanner("pending","We're verifying your access","Your Provider connection is syncing. This usually takes a moment — we'll update automatically.","/support/check-access","Check status");
  else if (P.noTier) banner = accessBanner("none","Your provider tier doesn't include access","You're connected, but your current tier doesn't unlock this library.","/benefits","See what unlocks");
  else if (!P.signedIn) banner = accessBanner("anon","Browsing as a guest","Read free chapters and previews freely. Sign in or redeem a key to unlock the rest.","/vault","Activate access");

  return `
  ${announcement()}
  ${banner}
  <div class="between" style="margin-bottom:6px">
    <div><h1 class="page-title">${greet}, ${name}.</h1><p class="page-sub">The archive is quiet tonight. ${countReadable()} chapters await you.</p></div>
  </div>

  <div class="home-cols">
   <div>
    ${tonights?`<div class="section">
      <div class="section-head"><div><div class="eyebrow">Tonight's Reading</div></div></div>
      <div class="card tinted" style="${storyAccentVars(tonights.story)};display:flex;gap:14px;align-items:center">
        <div style="width:62px;height:84px;border-radius:9px;overflow:hidden;flex:0 0 auto;border:1px solid var(--border)">${coverArt(tonights.story)}</div>
        <div style="flex:1;min-width:0">
          <div class="faint" style="font-size:.7rem;letter-spacing:.1em;text-transform:uppercase">Continue · ${tonights.story.title}</div>
          <div style="font-family:var(--serif);font-weight:600;font-size:1.05rem;margin:2px 0">${tonights.ch.title}</div>
          <div class="faint" style="font-size:.78rem;margin-bottom:8px">${tonights.ch.wordCount || (tonights.ch.readTime * 220)} words &middot; you stopped near &ldquo;${tonights.prog.scene}&rdquo;</div>
          ${progressBar(tonights.prog.pct)}
        </div>
        <button class="btn story sm" data-read="${tonights.ch.id}">${I.play}Resume</button>
      </div>
    </div>`:""}

    <div class="section">
      <div class="section-head"><h2>Continue your threads</h2><a class="section-link" data-nav="/my-shelf">My shelf ${I.chevR}</a></div>
      <div class="lane stagger">
        ${reads.slice(0,6).map(({ch,story,prog})=>{
          const r=chapterResolved(ch); const next = story.chapters[story.chapters.indexOf(ch)+1]; const nr = next?chapterResolved(next):null;
          return `<button class="card" style="width:230px;text-align:left;${storyAccentVars(story)}" data-read="${ch.id}">
            <div class="faint" style="font-size:.68rem;text-transform:uppercase;letter-spacing:.08em">${story.title}</div>
            <div style="font-family:var(--serif);font-weight:600;margin:2px 0 6px">${ch.title}</div>
            ${progressBar(prog.pct)}
            <div class="between" style="margin-top:8px"><span class="faint" style="font-size:.72rem">${prog.pct<100?prog.pct+'%':'Completed'}</span>${nr?`<span class="faint" style="font-size:.68rem">Next: ${accessTag(nr)[1]}</span>`:""}</div>
          </button>`;
        }).join("")}
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Latest in the archive</h2><a class="section-link" data-nav="/updates">All updates ${I.chevR}</a></div>
      <div class="col-flex">
        ${D.UPDATES.slice(0,4).map(u=>updateRow(u)).join("")}
      </div>
    </div>
   </div>

   <div>
    <div class="section">
      <div class="section-head"><h2>Newly available to you</h2></div>
      <div class="card" style="padding:14px">
        ${D.UPDATES.filter(u=>u.kind==="newly-available"||u.kind==="public-unlock").map(u=>`<div class="between" style="padding:6px 0"><div><div style="font-size:.86rem;font-weight:600">${u.title}</div><div class="faint" style="font-size:.72rem">${u.note}</div></div>${u.chapter?`<button class="btn sm story" data-read="${u.chapter}">Read</button>`:""}</div>`).join("")}
      </div>
    </div>
    <div class="section">
      <div class="section-head"><h2>Because you read…</h2></div>
      <div class="col-flex">
        ${D.STORIES.slice(1, 3).map(storyCardWide).join("") || `<p class="faint" style="font-size:.8rem">More recommendations will appear as the library grows.</p>`}
      </div>

    </div>
   </div>
  </div>

  `;
};
function accessBanner(kind,title,sub,link,label){
  const col = {expired:"bad",pending:"warn",none:"muted",anon:"info"}[kind];
  return `<div class="card" style="margin-bottom:14px;display:flex;gap:13px;align-items:center;border-color:color-mix(in srgb,var(--${col==='bad'?'bad':col==='warn'?'warn':col==='info'?'info':'text-faint'}) 30%,var(--border));background:linear-gradient(160deg,color-mix(in srgb,var(--${col==='bad'?'bad':col==='warn'?'warn':col==='info'?'info':'text-faint'}) 8%,var(--surface)),var(--surface))">
    <span class="ax ${col==='bad'?'expired':col==='warn'?'pending':col==='info'?'preview':'locked'}" style="font-size:1.4rem"><span class="ic" style="width:26px;height:26px">${kind==='expired'?I.lock:kind==='pending'?I.sync:kind==='anon'?I.info:I.alert}</span></span>
    <div style="flex:1;min-width:0"><div style="font-weight:700;font-family:var(--serif)">${title}</div><div class="faint" style="font-size:.8rem;margin-top:1px">${sub}</div></div>
    <button class="btn sm" data-nav="${link}">${label}</button>
  </div>`;
}
function updateRow(u){
  const s=bySlug(u.story); if(!s) return "";
  const found=u.chapter?byId(u.chapter):null;
  const ch=found?.ch || null;
  const tierLabel=ch?(!ch.required_tier_id ? "Free Access" : (ch.required_tier_name || ch.tier || "Member Access")):"";
  const kindLabel=tierLabel || {early:"Early access","public-unlock":"Public release","newly-available":"Newly unlocked",note:"Author note",schedule:"Schedule",campaign:"Key campaign"}[u.kind]||"Update";
  const kColor={early:"early","public-unlock":"free","newly-available":"gold","member-drop":"key",note:"",schedule:"",campaign:"key"}[u.kind]||"";
  const tierStyle=ch && typeof chapterTierStyle==="function" ? chapterTierStyle(ch) : "";
  return `<div class="row home-update-row ${ch?'chapter-access-coded':''}" style="${tierStyle}" ${u.chapter?`data-read="${u.chapter}"`:`data-nav="/story/${s.slug}/updates"`}>
    <span class="ic-col" style="color:var(--${kColor||'text-dim'})">${u.chapter?I.feed:I.msg}</span>
    <span class="body"><span class="t"><span class="tt">${u.title}</span></span>
    <span class="sub">${meta([`<i>${I.clock}</i>${u.when}`,s.title,u.note])}</span></span>
    <span class="update-tier-slot">${badge(ch?'chapter-tier-badge':kColor,kindLabel)}</span>
    <span class="cta">${u.chapter?`<button class="btn sm" data-read="${u.chapter}">Read</button>`:`<span class="faint">${I.chevR}</span>`}</span>
  </div>`;
}

function homeChapterAccessRow(ch, story){
  const r=chapterResolved(ch);
  const readable=isReadable(r);
  const progress = Number(store.progress[ch.id]?.pct || 0);
  const isRead = store.readMarked[ch.id] || progress >= 100;
  const readClass = isRead ? "is-read" : "is-unread";
  const tierName=!ch.required_tier_id ? "Free Access" : (ch.required_tier_name || ch.tier || "Member Access");
  const accessLabel=isRead ? "Read ✓" : readable ? "Available" : r.state==="preview" ? "Preview" : r.state==="unavailable" ? "Unavailable" : "Locked";
  const accessIcon=isRead ? I.check : readable ? I.checkCirc : r.state==="preview" ? I.eye : I.lock;
  const action=readable || r.state==="preview" ? `data-read="${ch.id}"` : `data-lock="${ch.id}"`;
  const tierStyle=typeof chapterTierStyle==="function" ? chapterTierStyle(ch) : "";
  const displayTitle=/^chapter\b/i.test(ch.title || "") ? ch.title : `Chapter ${ch.n}: ${ch.title}`;
  return `<div class="home-chapter-row chapter-access-coded ${readClass}" style="${tierStyle}">
    <button class="home-chapter-title" ${action} aria-label="Open ${esc(displayTitle)}">
      <span class="chapter-tier-dot"></span><span class="home-chapter-copy"><b>${esc(displayTitle)}</b><small>${ch.wordCount || (ch.readTime * 220) || 0} words</small></span>
    </button>
    <span class="badge chapter-tier-badge home-tier-pill" title="Required access: ${esc(tierName)}">${esc(tierName)}</span>
    <button class="home-access-state ${readable?'is-readable':r.state==='preview'?'is-preview':'is-locked'}" ${action} title="${esc(accessLabel)}">${accessIcon}<span>${accessLabel}</span></button>
  </div>`;
}

/* ============ LIBRARY ============ */
VIEWS.library = function(){
  const q=store.filters.q||"";
  function matches(s){
    if(q){ const t=(s.title+" "+s.author+" "+s.genre+" "+s.tags.join(" ")).toLowerCase(); if(!t.includes(q.toLowerCase())) return false; }
    return true;
  }
  const list=D.STORIES.filter(matches);
  return `
  <h1 class="page-title">The Library</h1>
  <p class="page-sub">${D.STORIES.length} stories across fantasy, gothic, and the far future.</p>
  <div style="position:relative;margin:6px 0 18px">
    <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-faint);display:flex">${I.search}</span>
    <input id="lib-search" class="pill-input" style="text-align:left;padding-left:42px" placeholder="Search stories, authors, genres…" value="${esc(q)}">
  </div>
  <div class="section-head"><h2>${q?"Results":"All stories"}</h2><span class="faint" style="font-size:.78rem">${list.length} shown</span></div>
  ${list.length?`<div class="grid-stories stagger">${list.map(storyCard).join("")}</div>`:`<div class="empty"><div class="em">📚</div><h3>No stories match</h3><p>Try searching for something broader.</p></div>`}
  <div class="section"><div class="section-head"><h2>Pinned to My Shelf</h2></div><div class="lane">${store.followed.map(id=>{const s=bySlug(id);return s?storyCard(s):"";}).join("")}</div></div>
  `;
};

/* ============ HOME (override: book-centered living feed) ============ */
VIEWS.home = function(){
  const P = persona();
  const reads = activeReads();
  const primary = bySlug(D.PRIMARY_SLUG) || D.STORIES[0];
  if (!primary) return backendSetupView();
  const secondary = D.FEATURED_SLUGS.map(bySlug).filter(s=>s && s.slug!==primary.slug)[0];
  const shorter = D.STORIES.filter(s=>!D.FEATURED_SLUGS.includes(s.slug));
  
  let banner = "";
  if (P.expired) banner = accessBanner("expired","Your member access has expired","Some chapters are now locked. Renew to continue reading.","/vault","Renew access");
  else if (P.pending) banner = accessBanner("pending","We're verifying your access","Your Provider connection is syncing — we'll update automatically.","/support/check-access","Check status");
  else if (P.noTier) banner = accessBanner("none","Your provider tier doesn't include access","You're connected, but your tier doesn't unlock this library.","/benefits","See what unlocks");
  else if (!P.signedIn) banner = accessBanner("anon","Browsing as a guest","Read free chapters and previews. Sign in or redeem a key to unlock more.","/vault","Activate access");

  // Continue Reading fallback logic:
  // 1. Use active/last-read chapter if one exists.
  // 2. Else use first readable chapter.
  // 3. Else use first previewable/locked chapter and open lock sheet.
  // 4. Else link to story page.
  let resolvedChapterId = null;
  let continueLabel = "Start reading";
  const lastRead = activeReads().find(x=>x.story.id===primary.id);
  if (lastRead && lastRead.ch) {
    resolvedChapterId = lastRead.ch.id;
    continueLabel = `Resume — ${lastRead.ch.title}`;
  } else if (primary.chapters && primary.chapters.length > 0) {
    const firstReadable = primary.chapters.find(c => isReadable(chapterResolved(c)));
    if (firstReadable) {
      resolvedChapterId = firstReadable.id;
      continueLabel = "Start reading";
    } else {
      const firstLocked = primary.chapters[0];
      if (firstLocked) {
        resolvedChapterId = firstLocked.id;
        continueLabel = "Unlock chapters";
      }
    }
  }

  // Resolve chapter counts
  const unlockedCount = primary.chapters.filter(c => isReadable(chapterResolved(c))).length;
  const lockedCount = primary.chapters.filter(c => !isReadable(chapterResolved(c)) && c.state !== "unavailable").length;

  // Resolve reading progress/status
  const pRead = primary.chapters.filter(c => store.readMarked[c.id] || (store.progress[c.id] && store.progress[c.id].pct >= 100)).length;
  const pPct = primary.chapters.length ? Math.round(pRead / primary.chapters.length * 100) : 0;

  // Resolve current tier details
  const tierName = P.admin ? "Admin reader override" : (P.tier || "Guest (No active tier)");
  let expirationInfo = "Sign in or connect to unlock access";
  if (P.signedIn) {
    if (P.validUntil) {
      expirationInfo = `Expires on ${fmtDate(P.validUntil)}`;
    } else if (P.provider === "patreon" || P.provider === "Patreon") {
      expirationInfo = "Auto-renewed via Patreon";
    } else if (P.hasKey) {
      expirationInfo = "Access via key grant";
    } else if (P.admin) {
      expirationInfo = "Full published-reader access";
    } else if (P.level > 0) {
      expirationInfo = "Active member access";
    } else {
      expirationInfo = "No active entitlements";
    }
  }

  const updatesHtml = D.UPDATES.length
    ? D.UPDATES.slice(0, 10).map(updateRow).join("")
    : `<div class="empty-state-card" style="text-align:center;padding:32px 16px"><span style="font-size:2rem;display:block;margin-bottom:8px">🔔</span><p class="faint" style="margin:0">No updates in the archive yet.</p></div>`;
  const latestChapters = [...primary.chapters].sort((a,b)=>{
    const dateDelta=new Date(b.updated_at || b.created_at || 0)-new Date(a.updated_at || a.created_at || 0);
    return dateDelta || (Number(b.n)||0)-(Number(a.n)||0);
  }).slice(0,10);

  return `
  ${announcement()}
  ${banner}
  <div class="area-switch" style="margin:0 0 14px"><button class="active">${I.book}Reader</button>${isAdmin()?`<a class="btn sm ghost" href="writer.html">${I.book}Writer</a><a class="btn sm ghost" href="admin.html">${I.shield}Admin CMS</a>`:""}</div>
  
  <div class="home-grid" style="${storyAccentVars(primary)}">
    <!-- Left Column: Book & Tier Status -->
    <div class="home-sidebar-col">
      <!-- Book Cover Card (Full Card Cover) -->
      <div class="card book-cover-card" style="padding: 0; overflow: hidden; position: relative; aspect-ratio: 2 / 3; width: 100%; max-width: 220px; margin: 0 auto 16px; border-radius: 12px; border: 1px solid var(--border-2); box-shadow: 0 10px 25px rgba(0,0,0,0.45), 0 0 15px var(--s-soft);">
        ${coverArt(primary)}
      </div>

      <!-- Book Info and Reading Status Under Card -->
      <div class="book-info-under" style="margin-bottom: 16px;">
        <h3 style="font-family: var(--serif); font-size: 1.22rem; font-weight: 700; margin: 0 0 4px; color: var(--text); text-align: center; line-height: 1.25;">${primary.title}</h3>
        <div class="author-label" style="font-size: 0.8rem; color: var(--text-dim); text-align: center; margin-bottom: 12px;">by ${primary.author}</div>
        
        <!-- Reading Status / Progress Bar -->
        <div class="reading-status" style="margin-bottom: 14px; background: var(--surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); box-shadow: var(--shadow-sm);">
          <div class="between" style="margin-bottom:6px; font-size:.74rem;">
            <span class="faint">Reading Status</span>
            <span class="faint" style="font-weight: 600; color: var(--accent);">${pPct}% read (${pRead}/${primary.chapters.length} ch)</span>
          </div>
          ${progressBar(pPct)}
        </div>
        
        <div class="faint" style="font-size:0.74rem; text-align: center; margin-bottom: 12px;">${primary.genre} &middot; ${primary.status}</div>
      </div>

      <!-- Book Actions -->
      <div class="book-actions" style="margin-bottom: 18px;">
        <a class="btn ghost sm" href="#/story/${primary.slug}">${I.book}Book Page</a>
        ${resolvedChapterId 
          ? `<button class="btn primary sm" data-read="${resolvedChapterId}">${I.play}${continueLabel}</button>`
          : `<button class="btn sm" disabled>${I.lock}No chapters</button>`
        }
      </div>

      <!-- Current Tier Panel -->
      <div class="card tier-status-card">
        <div class="between" style="align-items: center; margin-bottom: 8px;">
          <div class="eyebrow" style="margin:0">Current Tier</div>
          <button class="btn sm ghost" data-sheet="connect-patreon" style="padding: 0 10px; height: 26px; font-size: 0.72rem;">
            ${P.admin ? "Admin" : P.level > 0 ? "Upgrade" : "Get Access"}
          </button>
        </div>
        <div class="tier-name">${tierName}</div>
        <div class="faint" style="font-size:0.76rem;margin-top:4px">${expirationInfo}</div>
      </div>

      <!-- Benefits / Access Stats Card -->
      <div class="card benefits-list-card">
        <div class="eyebrow" style="margin-bottom: 12px">Access Statistics</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div class="stat-row">
            <span class="stat-badge green">${I.checkCirc}</span>
            <div class="stat-detail">
              <div class="stat-title">Chapters Available</div>
              <div class="stat-value">${unlockedCount} unlocked</div>
            </div>
          </div>
          <div class="stat-row">
            <span class="stat-badge orange">${I.lock}</span>
            <div class="stat-detail">
              <div class="stat-title">Chapters Locked</div>
              <div class="stat-value">${lockedCount} remaining</div>
            </div>
          </div>
        </div>
        <div class="provider-status-bar" style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 0.74rem; display: flex; align-items: center; justify-content: space-between;">
          <span class="faint">Provider connection:</span>
          <span class="status-val" style="font-weight: 600; color: ${P.provider ? 'var(--good)' : 'var(--text-faint)'}">
            ${P.provider ? P.provider : 'None linked'}
          </span>
        </div>
      </div>
    </div>

    <!-- Right Column: Latest Updates -->
    <div class="home-main-col">
      <div class="card home-chapter-access-card">
        <div class="section-head">
          <div><h2>Chapter Access</h2><p class="faint home-section-note">Tier colors and availability for your current access.</p></div>
          <button class="btn ghost sm" data-nav="/story/${primary.slug}/chapters">All chapters ${I.chevR}</button>
        </div>
        <div class="home-chapter-list">
          ${latestChapters.length ? latestChapters.map(ch=>homeChapterAccessRow(ch,primary)).join("") : `<div class="empty"><p>No published chapters yet.</p></div>`}
        </div>
      </div>
      <div class="card updates-list-card">
        <div class="section-head">
          <h2>Latest Updates</h2>
          <button class="btn ghost sm" data-nav="/updates" style="height: 28px; padding: 0 10px; font-size: 0.72rem; border-radius: 99px;">All updates ${I.chevR}</button>
        </div>
        <div class="updates-scroller col-flex" style="gap:10px">
          ${updatesHtml}
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom Row: Announcement & Access Tools -->
  <div class="home-bottom-row" style="${storyAccentVars(primary)}">
    <!-- Latest Announcement Card -->
    <div class="card announcement-card">
      <div class="eyebrow" style="margin-bottom:12px">Latest Announcement</div>
      <div class="empty-announcement">
        <span class="empty-icon">${I.msg}</span>
        <p>No author announcements yet.</p>
      </div>
    </div>

    <!-- Access & Account Tools -->
    <div class="card access-account-card">
      <div class="eyebrow" style="margin-bottom:12px">Access & Account</div>
      <div class="account-summary" style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <span class="user-avatar" style="width:40px;height:40px;border-radius:50%;background:var(--surface-2);display:grid;place-items:center;font-weight:700;color:var(--accent);border:1px solid var(--border)">
          ${accountLabel().slice(0,2).toUpperCase()}
        </span>
        <div style="min-width:0;flex:1">
          <div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.92rem">${accountLabel()}</div>
          <div class="faint" style="font-size:.76rem">${P.signedIn ? 'Signed in' : 'Guest reader'}</div>
        </div>
      </div>
      <div class="quicklinks" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <a data-sheet="redeem" style="padding:10px;font-size:0.8rem;cursor:pointer">${I.key}<span style="margin-top:4px">Redeem Key</span></a>
        <a data-act="resync" style="padding:10px;font-size:0.8rem;cursor:pointer">${I.sync}<span style="margin-top:4px">Sync Patreon</span></a>
        <a data-sheet="settings" style="padding:10px;font-size:0.8rem;cursor:pointer">${I.aa}<span style="margin-top:4px">Preferences</span></a>
        ${P.signedIn
          ? `<a data-act="reader-signout" style="padding:10px;font-size:0.8rem;cursor:pointer;color:var(--bad)">${I.x}<span style="margin-top:4px">Sign Out</span></a>`
          : `<a data-sheet="persona" style="padding:10px;font-size:0.8rem;cursor:pointer;color:var(--accent)">${I.user}<span style="margin-top:4px">Sign In</span></a>`
        }
      </div>
    </div>
  </div>

  ${mainArchiveEnabled()?`<p class="faint center" style="font-size:.74rem;margin-top:18px">Deep lore, maps &amp; galleries live in the main author archive. <button class="btn sm ghost" data-act="main-archive" style="margin-left:6px">${I.external}Open archive</button></p>`:""}`;
};

/* ============ HOME (story masthead + mixed archive feed) ============ */
function homeSafeMediaUrl(value){
  const raw = String(value || "").trim();
  if (!raw || /^(undefined|null)$/i.test(raw)) return "";
  try {
    const url = new URL(raw, location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch (_) {
    return "";
  }
}
function homeThumbnailUrl(value, width = 720){
  const fullUrl = homeSafeMediaUrl(value);
  if (!fullUrl) return "";
  try {
    const url = new URL(fullUrl);
    const objectPath = "/storage/v1/object/public/";
    if (!url.pathname.includes(objectPath)) return fullUrl;
    url.pathname = url.pathname.replace(objectPath, "/storage/v1/render/image/public/");
    url.searchParams.set("width", String(Math.max(240, Math.min(1200, Number(width) || 720))));
    url.searchParams.set("quality", "72");
    url.searchParams.set("resize", "contain");
    return url.href;
  } catch (_) {
    return fullUrl;
  }
}
function homeThumbnailFailed(image){
  const fallback = homeSafeMediaUrl(image?.dataset?.fullSrc);
  if (fallback && image.src !== fallback) {
    image.dataset.fullSrc = "";
    image.src = fallback;
    return true;
  }
  if (image) image.hidden = true;
  return false;
}
function homeCanViewMatureGallery(){
  return isAdmin() || activeEntitlements().length > 0;
}
function homeIsMatureGalleryImage(image){
  const mature = new Set(["r18", "mature", "nsfw", "18+"]);
  return (image.image_tags || []).some(tag => mature.has(String(tag || "").toLowerCase().trim()));
}
function homeFeedDate(value){
  const stamp = new Date(value || 0).getTime();
  return Number.isFinite(stamp) ? stamp : 0;
}
function homeGalleryItems(story){
  const canViewMature = homeCanViewMatureGallery();
  const galleryItems = (D.GALLERY_IMAGES || [])
    .filter(image => image.story_id === story.id && (canViewMature || !homeIsMatureGalleryImage(image)))
    .map(image => ({
      id:`gallery-${image.id}`,
      type:"gallery",
      date:image.created_at || "",
      image,
      story
    }));
  const characterArt = (D.CHARACTERS || [])
    .filter(character => character.story_id === story.id && character.profile_image_url)
    .map(character => ({
      id:`gallery-char-${character.id}`,
      type:"gallery",
      date:character.created_at || "",
      image:{
        id:`char-${character.id}`,
        image_url:character.profile_image_url,
        caption:character.bio || `${character.name} profile illustration`,
        character_name:character.name,
        story_id:story.id
      },
      story
    }));
  return [...galleryItems, ...characterArt]
    .sort((a,b) => homeFeedDate(b.date) - homeFeedDate(a.date));
}
function homeFeedItems(story){
  // 1. All published chapters for this story, sorted strictly by chapter index `n` descending (Chapter 46, 45, 44, 43, 42, 41...)
  const chapterItems = (story.chapters || [])
    .slice()
    .sort((a,b) => Number(b.n || 0) - Number(a.n || 0))
    .map(chapter => ({
      id:`chapter-${chapter.id}`,
      type:"chapter",
      date:chapter.updated_at || chapter.created_at || chapter.publicDate || "",
      chapter,
      story
    }));

  // Combine gallery items up to max 6 images
  const maxImages = 6;
  const galleryPool = homeGalleryItems(story).slice(0, maxImages);

  // Intersperse gallery artwork items cleanly between chapter cards
  // Chapters ALWAYS remain in strict descending index order (46, 45, 44, 43, 42...)
  const result = [];
  let galIdx = 0;

  chapterItems.forEach((chItem, idx) => {
    result.push(chItem);
    // Insert an artwork card after every 3 chapters if available, up to maxImages
    if ((idx === 0 || (idx + 1) % 3 === 0) && galIdx < galleryPool.length) {
      result.push(galleryPool[galIdx]);
      galIdx++;
    }
  });

  // Append any remaining gallery images up to max 6
  while (galIdx < galleryPool.length) {
    result.push(galleryPool[galIdx]);
    galIdx++;
  }

  return result;
}
function homeFeedFilterLabel(value){
  if (value === "chapters") return "Chapters";
  if (value === "gallery") return "Gallery";
  if (value.startsWith("character:")) {
    const id = value.slice("character:".length);
    return (D.CHARACTERS || []).find(character => character.id === id)?.name || "Character";
  }
  return "All";
}
function homeFeedLayoutClass(index, type, hasArtwork){
  const slot = Math.max(0, Math.min(Number(index) || 0, 9));
  if (hasArtwork || type === "gallery") {
    return `feed-media-${slot % 5}${slot === 0 ? " feed-media-lead" : ""}`;
  }
  return `feed-text-${slot % 4}`;
}
function homeFeedChapterCard(item, index){
  const ch = item.chapter;
  const resolved = chapterResolved(ch);
  const readable = isReadable(resolved);
  const action = readable || resolved.state === "preview" ? `data-read="${ch.id}"` : `data-lock="${ch.id}"`;
  const tierName = !ch.required_tier_id ? "Free Access" : (ch.required_tier_name || ch.tier || "Member Access");
  const accessLabel = readable ? "Available" : resolved.state === "preview" ? "Preview" : "Locked";
  const rawTitle = String(ch.title || "").trim();
  const hasChapterPrefix = /^chapter\b/i.test(rawTitle);
  const displayTitle = hasChapterPrefix ? rawTitle : (ch.n ? `Chapter ${ch.n}: ${rawTitle}` : rawTitle);
  const cleanArc = ch.arc && !/member\s*archive/i.test(ch.arc) ? ch.arc : "";
  const kickerSub = cleanArc || (hasChapterPrefix ? "" : (ch.n ? `Chapter ${ch.n}` : ""));
  const excerpt = String(ch.excerpt || "").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,150);
  const feedImage = (ch.feed_images || []).find(image => homeSafeMediaUrl(image.image_url));
  // Chapter media is intentionally public in this feed: it is a visual index, not gated prose.
  const artUrl = homeSafeMediaUrl(feedImage?.image_url);
  const artThumbnailUrl = homeThumbnailUrl(artUrl, 960);
  const progress = Number(store.progress[ch.id]?.pct || 0);
  const isRead = store.readMarked[ch.id] || progress >= 100;
  const unread = !isRead && progress <= 0;
  const readClass = isRead ? "is-read" : "is-unread";
  const leadClass = artUrl && index === 0 ? "is-featured" : "";
  const layoutClass = `${homeFeedLayoutClass(index, "chapter", !!artUrl)} ${leadClass} ${artUrl?"has-art":""} ${readClass}`;
  return `<button class="archive-feed-card archive-chapter-card ${layoutClass} chapter-access-coded" style="${chapterTierStyle(ch)}--unread-delay:-${(index%5)*1.1}s" ${action} data-feed-image-count="${(ch.feed_images || []).length}" aria-label="${esc(accessLabel)}: ${esc(displayTitle)}">
    ${artUrl?`<img class="archive-chapter-art" src="${esc(artThumbnailUrl)}" data-full-src="${artThumbnailUrl!==artUrl?esc(artUrl):""}" alt="" loading="${index===0?"eager":"lazy"}" decoding="async" onerror="homeFeedImageFailed(this)"><div class="archive-chapter-shade"></div>`:""}
    <div class="archive-card-glow"></div>
    <div class="archive-card-body">
      <div class="archive-chapter-copy">
        ${kickerSub?`<div class="archive-chapter-number">${esc(kickerSub)}</div>`:""}
        <h3>${esc(displayTitle)}</h3>
        ${excerpt?`<p>${esc(excerpt)}</p>`:""}
      </div>
      <div class="archive-card-footer">
        <div class="archive-footer-meta">
          <strong>${Number(ch.wordCount || (ch.readTime * 220) || 0).toLocaleString()} words</strong>
          <span class="archive-tier-pill">${esc(tierName)}</span>
        </div>
      </div>
    </div>
  </button>`;
}
function homeFeedImageFailed(image){
  if (homeThumbnailFailed(image)) return;
  const card = image.closest(".archive-chapter-card");
  if (!card) return;
  const mediaClass = [...card.classList].find(name => name.startsWith("feed-media-"));
  if (mediaClass) {
    card.classList.remove(mediaClass);
    card.classList.add(`feed-text-${mediaClass.replace("feed-media-", "")}`);
  }
  card.classList.remove("has-art", "is-featured");
  image.remove();
  card.querySelector(".archive-chapter-shade")?.remove();
}
function homeFeedGalleryCard(item, index){
  const image = item.image;
  const url = homeSafeMediaUrl(image.image_url);
  if (!url) return "";
  const character = image.character?.name || "Gallery";
  const caption = image.caption || `${character} artwork`;
  const thumbnailUrl = homeThumbnailUrl(url, 800);
  const tagLine = image.image_tags?.length ? image.image_tags.slice(0,2).join(" · ") : "New artwork";
  return `<article class="archive-feed-card archive-gallery-card ${homeFeedLayoutClass(index, "gallery", true)}">
    <button class="archive-gallery-open" data-act="open-home-gallery" data-gallery-url="${esc(url)}" data-gallery-caption="${esc(caption)}" data-gallery-character="${esc(character)}" aria-label="View ${esc(caption)}">
      <img class="archive-gallery-image" src="${esc(thumbnailUrl)}" data-full-src="${thumbnailUrl!==url?esc(url):""}" alt="${esc(caption)}" loading="lazy" decoding="async" onerror="homeThumbnailFailed(this)">
      <span class="archive-image-shade"></span>
      <span class="archive-card-badge">${I.spark} Gallery</span>
      <span class="archive-gallery-copy"><small>${esc(tagLine)}</small><strong>${esc(caption)}</strong><span>${esc(character)}</span></span>
      <span class="archive-gallery-zoom">${I.grid}</span>
    </button>
  </article>`;
}
function homeTraditionalChapterRow(item){
  const ch = item.chapter;
  const resolved = chapterResolved(ch);
  const readable = isReadable(resolved);
  const action = readable || resolved.state === "preview" ? `data-read="${ch.id}"` : `data-lock="${ch.id}"`;
  const tierName = !ch.required_tier_id ? "Free Access" : (ch.required_tier_name || ch.tier || "Member Access");
  const accessLabel = readable ? "Read" : resolved.state === "preview" ? "Preview" : "Locked";
  const rawTitle = String(ch.title || "").trim();
  const displayTitle = /^chapter\b/i.test(rawTitle) ? rawTitle : (ch.n ? `Chapter ${ch.n}: ${rawTitle}` : rawTitle);
  const wordCount = Number(ch.wordCount || (ch.readTime * 220) || 0);
  const progress = Number(store.progress[ch.id]?.pct || 0);
  const isRead = store.readMarked[ch.id] || progress >= 100;
  const releaseDate = ch.publicDate || ch.updated_at || ch.created_at;
  return `<article class="traditional-chapter-row chapter-access-coded ${isRead?"is-read":"is-unread"}" style="${chapterTierStyle(ch)}">
    <button class="traditional-chapter-open" ${action} aria-label="${esc(accessLabel)}: ${esc(displayTitle)}">
      <span class="traditional-chapter-index">${ch.n ? String(ch.n).padStart(2,"0") : I.book}</span>
      <span class="traditional-chapter-main">
        <span class="traditional-chapter-title">${esc(displayTitle)}</span>
        <span class="traditional-chapter-meta">
          ${releaseDate?`<span>${I.clock}${esc(fmtDate(releaseDate))}</span>`:""}
          <span>${I.feed}${wordCount.toLocaleString()} words</span>
          ${ch.readTime?`<span>${I.book}${esc(ch.readTime)} min</span>`:""}
        </span>
      </span>
      <span class="traditional-chapter-access">
        <span class="traditional-tier-pill">${esc(tierName)}</span>
        <span class="traditional-access-state">${readable?I.play:resolved.state==="preview"?I.eye:I.lock}${isRead?"Read":accessLabel}</span>
      </span>
    </button>
  </article>`;
}
function homeTraditionalGalleryCard(item){
  const image = item.image;
  const url = homeSafeMediaUrl(image.image_url);
  if (!url) return "";
  const character = image.character?.name || image.character_name || "Gallery";
  const caption = image.caption || `${character} artwork`;
  const thumbnailUrl = homeThumbnailUrl(url, 560);
  return `<article class="traditional-gallery-card">
    <button data-act="open-home-gallery" data-gallery-url="${esc(url)}" data-gallery-caption="${esc(caption)}" data-gallery-character="${esc(character)}" aria-label="View ${esc(caption)}">
      <img src="${esc(thumbnailUrl)}" data-full-src="${thumbnailUrl!==url?esc(url):""}" alt="${esc(caption)}" loading="lazy" decoding="async" onerror="homeThumbnailFailed(this)">
      <span class="traditional-gallery-overlay"><small>${esc(character)}</small><strong>${esc(caption)}</strong></span>
    </button>
  </article>`;
}
function sizeHomeGalleryTiles(){
  document.querySelectorAll(".archive-gallery-card").forEach(card => {
    const image = card.querySelector(".archive-gallery-image");
    if (!image) return;
    const applySize = () => {
      if (!image.naturalWidth || !image.naturalHeight || !card.clientWidth) return;
      const rowHeight = window.innerWidth <= 760 ? 270 : 245;
      const gap = window.innerWidth <= 760 ? 10 : 10;
      const desiredHeight = card.clientWidth * (image.naturalHeight / image.naturalWidth);
      const span = Math.max(1, Math.min(5, Math.ceil((desiredHeight + gap) / (rowHeight + gap))));
      card.style.gridRowEnd = `span ${span}`;
    };
    if (image.complete) applySize();
    else image.addEventListener("load", applySize, { once:true });
  });
}
function homeGalleryImageSheet(url, caption, character){
  const safeUrl = homeSafeMediaUrl(url);
  if (!safeUrl) return `<span class="close-x" data-act="close-sheet">${I.x}</span><div class="empty"><h3>Image unavailable</h3><p>This gallery image could not be opened.</p></div>`;
  return `<span class="close-x" data-act="close-sheet">${I.x}</span>
    <div class="home-gallery-sheet">
      <img src="${esc(safeUrl)}" alt="${esc(caption || character || "Gallery image")}">
      <div><div class="eyebrow">${esc(character || "Gallery")}</div><h3>${esc(caption || "Untitled artwork")}</h3></div>
    </div>`;
}
VIEWS.home = function(){
  const P = persona();
  const primary = bySlug(D.PRIMARY_SLUG) || D.STORIES[0];
  if (!primary) return backendSetupView();

  let banner = "";
  if (P.expired) banner = accessBanner("expired","Your member access has expired","Some chapters are now locked. Renew to continue reading.","/vault","Renew access");
  else if (P.pending) banner = accessBanner("pending","We're verifying your access","Your provider connection is syncing — we'll update automatically.","/support/check-access","Check status");
  else if (P.noTier) banner = accessBanner("none","Your provider tier doesn't include access","You're connected, but your tier doesn't unlock this library.","/benefits","See what unlocks");
  else if (!P.signedIn) banner = accessBanner("anon","Browsing as a guest","Read free chapters and previews. Sign in or redeem a key to unlock more.","/vault","Activate access");

  const lastRead = activeReads().find(item => item.story.id === primary.id);
  const firstReadable = primary.chapters.find(ch => isReadable(chapterResolved(ch)));
  const continueChapter = lastRead?.ch || firstReadable || primary.chapters[0] || null;
  const continueResolved = continueChapter ? chapterResolved(continueChapter) : null;
  const continueAction = continueChapter
    ? (isReadable(continueResolved) || continueResolved.state === "preview" ? `data-read="${continueChapter.id}"` : `data-lock="${continueChapter.id}"`)
    : `data-nav="/story/${primary.slug}/chapters"`;
  const continueLabel = lastRead?.ch ? "Continue Reading" : firstReadable ? "Start Reading" : continueChapter ? "Unlock Chapters" : "Browse Chapters";
  const readCount = primary.chapters.filter(ch => store.readMarked[ch.id] || Number(store.progress[ch.id]?.pct || 0) >= 100).length;
  const readPercent = primary.chapters.length ? Math.round(readCount / primary.chapters.length * 100) : 0;
  const primaryCharacter = (D.CHARACTERS || []).find(character => character.story_id === primary.id && character.profile_image_url);
  const heroArtUrl = homeSafeMediaUrl(primaryCharacter?.profile_image_url || primary.background_image_url);
  const heroThumbnailUrl = homeThumbnailUrl(heroArtUrl, 960);
  const heroSummary = String(primary.premise || primary.tagline || "A premium serial fiction archive.")
    .replace(/<[^>]*>/g," ")
    .replace(/\s+/g," ")
    .trim()
    .slice(0,230);
  const totalWords = primary.chapters.reduce((sum,ch) => sum + Number(ch.wordCount || (ch.readTime * 220) || 0), 0);
  const adultChapters = primary.chapters.filter(ch => ch.is_nsfw).length;

  const allItems = homeFeedItems(primary);
  const traditionalChapters = allItems.filter(item => item.type === "chapter");
  const traditionalGallery = homeGalleryItems(primary);
  const availableCharacters = (D.CHARACTERS || []).filter(character =>
    character.story_id === primary.id && allItems.some(item => item.type === "gallery" && item.image.character_id === character.id)
  );
  const selectedFilter = store.filters.homeFeed || "all";
  const filteredItems = allItems.filter(item => {
    if (selectedFilter === "chapters") return item.type === "chapter";
    if (selectedFilter === "gallery") return item.type === "gallery";
    if (selectedFilter.startsWith("character:")) return item.type === "gallery" && item.image.character_id === selectedFilter.slice(10);
    return true;
  });
  const filterButtons = [
    ["all","All",I.grid],
    ["chapters","Chapters",I.book],
    ["gallery","Gallery",I.spark],
    ...availableCharacters.slice(0,4).map(character => [`character:${character.id}`,character.name,I.user])
  ];

  const feedLimit = Number(store.homeFeedLimit || 10);
  const visibleItems = filteredItems.slice(0, feedLimit);
  const hasMoreFeed = filteredItems.length > feedLimit;
  const homeLayout = store.homeLayout === "traditional" ? "traditional" : "multigrid";
  const traditionalGalleryLimit = Math.max(18, Number(State.homeGalleryLimit || 18));
  const visibleTraditionalGallery = traditionalGallery.slice(0, traditionalGalleryLimit);
  const hasMoreTraditionalGallery = traditionalGallery.length > traditionalGalleryLimit;
  const traditionalContent = `<div class="traditional-home-split">
    <section class="traditional-chapters-panel">
      <div class="traditional-panel-head"><div><span class="eyebrow">Story index</span><h2>Latest Chapters</h2></div><span>${traditionalChapters.length} total</span></div>
      <div class="traditional-chapter-list">
        ${traditionalChapters.length ? traditionalChapters.map(homeTraditionalChapterRow).join("") : `<div class="archive-feed-empty">${I.book}<h3>No chapters yet</h3><p>Published chapters will appear here automatically.</p></div>`}
      </div>
      <button class="traditional-panel-link" data-nav="/story/${primary.slug}/chapters">Browse the complete chapter shelf ${I.chevR}</button>
    </section>
    <section class="traditional-gallery-panel">
      <div class="traditional-panel-head"><div><span class="eyebrow">Visual archive</span><h2>Artwork</h2></div><span>${traditionalGallery.length} images</span></div>
      ${traditionalGallery.length
        ? `<div class="traditional-masonry">${visibleTraditionalGallery.map(homeTraditionalGalleryCard).join("")}</div>
           ${hasMoreTraditionalGallery ? `<button class="traditional-panel-link" data-act="home-gallery-load-more">Load more artwork (${traditionalGallery.length - traditionalGalleryLimit} remaining) ${I.chevR}</button>` : ""}`
        : `<div class="archive-feed-empty">${I.spark}<h3>No artwork yet</h3><p>Published gallery images will appear here automatically.</p></div>`}
    </section>
  </div>`;

  return `
    ${announcement()}
    ${banner}
    <section class="archive-home" data-indexed-chapter-images="${(D.CHAPTER_FEED_IMAGES || []).length}" style="${storyAccentVars(primary)}">
      <div class="archive-home-hero">
        <div class="archive-hero-story">
          <div class="archive-hero-cover">${coverArt(primary)}</div>
          <div class="archive-hero-copy">
            <h1>${esc(primary.title)}</h1>
            <div class="archive-hero-author">by ${esc(primary.author)}</div>
            <div class="archive-reading-progress">
              <div><span>Reading Progress</span><strong>${readPercent}% read (${readCount}/${primary.chapters.length} chapters)</strong></div>
              ${progressBar(readPercent)}
            </div>
            <div class="archive-hero-actions">
              <button class="btn primary" ${continueAction}>${I.play}${continueLabel}</button>
              <button class="btn ghost" data-nav="/story/${primary.slug}/chapters">Browse Every Chapter ${I.chevR}</button>
            </div>
          </div>
        </div>
        <div class="archive-hero-art ${heroArtUrl?"has-image":""}">
          ${heroArtUrl?`<img src="${esc(heroThumbnailUrl)}" data-full-src="${heroThumbnailUrl!==heroArtUrl?esc(heroArtUrl):""}" alt="" loading="eager" decoding="async" onerror="homeThumbnailFailed(this)">`:""}
        </div>
        <div class="archive-hero-details">
          <p>${esc(heroSummary)}${heroSummary.length>=230?"…":""}</p>
          <div class="archive-hero-stats">
            <div>${I.book}<strong>${primary.chapters.length}</strong><span>Chapters</span></div>
            <div>${I.feed}<strong>${totalWords>=1000?Math.round(totalWords/1000)+"K+":totalWords}</strong><span>Total Words</span></div>
            <div>${I.shield}<strong>${adultChapters || "18+"}</strong><span>${adultChapters?"Adult Chapters":"Adult Content"}</span></div>
          </div>
        </div>
      </div>

      <div class="archive-feed-toolbar">
        ${homeLayout==="multigrid"
          ? `<div class="archive-feed-filters">${filterButtons.map(([value,label,icon]) => `<button class="${selectedFilter===value?"active":""}" data-act="home-feed-filter" data-feed-filter="${esc(value)}">${icon}${esc(label)}</button>`).join("")}</div>`
          : `<div class="archive-feed-context"><strong>Chapter index + visual archive</strong><span>Latest chapters first</span></div>`}
        <div class="home-layout-switch" role="group" aria-label="Home archive layout">
          <button class="${homeLayout==="multigrid"?"active":""}" data-act="home-layout" data-home-layout="multigrid" aria-pressed="${homeLayout==="multigrid"}">${I.grid}<span>Multigrid</span></button>
          <button class="${homeLayout==="traditional"?"active":""}" data-act="home-layout" data-home-layout="traditional" aria-pressed="${homeLayout==="traditional"}">${I.list}<span>Traditional</span></button>
        </div>
      </div>

      ${homeLayout==="traditional" ? traditionalContent : ""}
      <div class="home-multigrid-content" ${homeLayout==="traditional"?"hidden":""}>
      <div class="archive-feed-heading">
        <div><h2>Latest from the Archive</h2><p>New chapters, gallery releases, and visual discoveries.</p></div>
        ${selectedFilter!=="all"?`<span>${esc(homeFeedFilterLabel(selectedFilter))} · ${filteredItems.length}</span>`:""}
      </div>

      ${homeLayout==="multigrid" && visibleItems.length
        ? `<div class="archive-feed-grid">${visibleItems.map((item,index) => item.type === "gallery" ? homeFeedGalleryCard(item,index) : homeFeedChapterCard(item,index)).join("")}</div>
           ${hasMoreFeed ? `
             <div class="archive-feed-loadmore">
               <button class="btn primary" data-act="home-feed-load-more">
                 Load More Chapters &amp; Artwork (${filteredItems.length - feedLimit} remaining) ${I.chevR}
               </button>
             </div>
           ` : ""}`
        : `<div class="archive-feed-empty">${I.spark}<h3>Nothing published here yet</h3><p>This filter will fill automatically when matching Supabase content is published.</p><button class="btn ghost sm" data-act="home-feed-filter" data-feed-filter="all">Show everything</button></div>`}
      </div>

      <div class="archive-home-links">
        <a data-nav="/story/${primary.slug}/chapters">${I.book}<span><strong>All Chapters</strong><small>Browse the full story archive.</small></span>${I.chevR}</a>
        <a data-nav="/story/${primary.slug}/extras">${I.spark}<span><strong>Story Extras</strong><small>Characters, artwork, and lore.</small></span>${I.chevR}</a>
        <a data-nav="/benefits">${I.key}<span><strong>Membership</strong><small>Manage your tier and access.</small></span>${I.chevR}</a>
        <a data-sheet="persona">${I.user}<span><strong>Account</strong><small>Profile, preferences, and security.</small></span>${I.chevR}</a>
      </div>
    </section>`;
};

function bookHero(s, o){
  const hasChapters = !!o.latestCh;
  const r = hasChapters ? chapterResolved(o.latestCh) : null;
  return `<div class="book-hero" style="${storyAccentVars(s)}"><div class="bg">${coverArt(s)}</div><div class="grad"></div><div class="inner"><div class="top"><div class="cover">${coverArt(s)}</div><div class="htxt"><div class="eyebrow">${s.genre} &middot; ${s.status} &middot; ${s.arc}</div><h1>${s.title}</h1><div class="author">by ${s.author}</div></div></div><div class="progress-line"><div class="between" style="margin-bottom:6px"><span class="faint" style="font-size:.76rem">${o.pRead} / ${s.chapters.length} chapters read</span><span class="faint" style="font-size:.76rem">${o.pPct}%</span></div>${progressBar(o.pPct)}</div><div class="cta-row">${hasChapters?`<button class="btn primary" data-read="${o.startCh}">${o.lastRead?I.play+"Continue &mdash; "+o.lastRead.ch.title:I.play+"Start reading"}</button>`:`<button class="btn primary" data-nav="/story/${s.slug}/chapters">${I.book}Chapters coming soon</button>`}<a class="btn ghost sm" data-nav="/story/${s.slug}/chapters">${I.list}Shelf</a><a class="btn ghost sm" data-nav="/story/${s.slug}/recap">${I.info}Recap</a><a class="btn ghost sm" data-nav="/story/${s.slug}/extras">${I.spark}Extras</a></div>${hasChapters?`<div class="between" style="margin-top:12px"><span class="faint" style="font-size:.74rem">Latest: <b style="color:var(--text)">${o.latestCh.title}</b> &middot; ${axInline(r)}</span>${o.latestCh.publicDate?`<span class="badge early">${I.hourglass}Public ${fmtDate(o.latestCh.publicDate)}</span>`:""}</div>`:`<div class="faint" style="font-size:.78rem;margin-top:12px">This story is published. No chapters are published yet.</div>`}</div></div>`;
}
function buildBookFeed(s){
  const items = [];
  s.chapters.slice(-3).reverse().forEach(c=>{const r=chapterResolved(c);items.push({icon:I.play,color:"var(--accent)",tone:"accent",title:`New chapter — ${c.title}`,desc:`Chapter ${c.n} · ${c.wordCount || (c.readTime * 220)} words${c.state==='early'?' · early access for members':''}`,meta:[c.arc,isReadable(r)?"Readable now":accessTag(r)[1]],act:`data-read="${c.id}"`,cta:isReadable(r)?"Read":accessTag(r)[3]});});
  return items.map(it=>`<button class="feed-item" ${it.act||""}>${it.thumb?`<span class="fthumb">${D.FIG[it.thumb]||""}</span>`:`<span class="fico" style="background:color-mix(in srgb,${it.color} 16%, transparent);color:${it.color}">${it.icon}</span>`}<span class="fbody"><span class="ftop"><span class="ft">${it.title}</span></span><span class="fd">${it.desc}</span><span class="fmeta">${(it.meta||[]).map(m=>`<span>${m}</span>`).join("")}</span></span><span class="btn sm ${it.tone==='accent'?'story':''}" style="flex:0 0 auto">${it.cta}</span></button>`).join("");
}

function themeSwatches(){
  return `<div class="theme-swatches">${THEMES.map(t=>`<button class="swatch ${store.theme===t.id?'active':''}" data-site-theme="${t.id}"><span class="dot" style="background:${t.dot}"></span><span class="nm">${t.name}</span><span class="ck">${I.check}</span></button>`).join("")}</div>`;
}
