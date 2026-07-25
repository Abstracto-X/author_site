/* Extracted and adapted from Abstracto Tales handoff package and main application. */
"use strict";

/* ============ GALLERY VIEWS ============ */

function isMatureTag(tag) {
  if (!tag) return false;
  const lower = String(tag).toLowerCase().trim();
  return lower === "r18" || lower === "mature" || lower === "nsfw" || lower === "18+";
}

function filterGalleryImages(images) {
  const q = (State.gallerySearch || "").toLowerCase().trim();
  const filterTag = State.filterTag || "All";
  const canViewMature = isAdmin() || activeEntitlements().length > 0;
  const showR18 = canViewMature && !!State.showR18;

  return (images || []).filter(img => {
    // 1. Mature tag check
    const tags = Array.isArray(img.image_tags) ? img.image_tags : [];
    const hasMature = tags.some(isMatureTag);
    if (hasMature && !showR18) return false;

    // 2. Tag filter
    if (filterTag !== "All") {
      if (!tags.includes(filterTag)) return false;
    }

    // 3. Search query
    if (q) {
      const caption = (img.caption || "").toLowerCase();
      const charName = (img.character?.name || "").toLowerCase();
      const matchTag = tags.some(t => t.toLowerCase().includes(q));
      if (!caption.includes(q) && !charName.includes(q) && !matchTag) return false;
    }

    return true;
  });
}

function sortGalleryImages(images) {
  const sorted = [...images];
  const mode = State.gallerySort || "curated";

  if (mode === "newest") {
    sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  } else if (mode === "top") {
    sorted.sort((a, b) => {
      const voteA = (State.imageVotes[a.id]?.score || 0);
      const voteB = (State.imageVotes[b.id]?.score || 0);
      return voteB - voteA;
    });
  } else {
    // curated: sort_order ASC
    sorted.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }

  return sorted;
}

function renderGalleryCard(img, index, viewMode = "grid") {
  const char = img.character || D.CHARACTERS.find(c => c.id === img.character_id) || {};
  const tags = Array.isArray(img.image_tags) ? img.image_tags : [];
  const votes = State.imageVotes[img.id] || { score: 0, userVote: 0 };
  const escCap = esc(img.caption || char.name || "Gallery Artwork");
  const escChar = esc(char.name || "Character");
  const escUrl = esc(img.image_url || "");

  if (viewMode === "deck") {
    return `
      <div class="archive-deck-card glass" data-act="open-lightbox" data-img-id="${esc(img.id)}" data-img-index="${index}">
        <div class="deck-card-media">
          <img src="${escUrl}" alt="${escCap}" loading="lazy" decoding="async">
        </div>
        <div class="deck-card-body">
          <div class="deck-card-meta">
            <span class="deck-card-char"><i class="fas fa-user-astronaut"></i> ${escChar}</span>
            <span class="deck-card-vote ${votes.userVote > 0 ? 'voted-up' : ''}"><i class="fas fa-heart"></i> ${votes.score}</span>
          </div>
          ${img.caption ? `<div class="deck-card-caption">${escCap}</div>` : ''}
          ${tags.length ? `<div class="deck-card-tags">${tags.map(t => `<span class="deck-tag">${esc(t)}</span>`).join('')}</div>` : ''}
        </div>
      </div>
    `;
  }

  return `
    <div class="gallery-tile glass" data-act="open-lightbox" data-img-id="${esc(img.id)}" data-img-index="${index}">
      <img src="${escUrl}" alt="${escCap}" loading="lazy" decoding="async">
      <div class="gallery-tile-overlay">
        <div class="gallery-tile-title">${escCap}</div>
        <div class="gallery-tile-sub">
          <span>${escChar}</span>
          <span class="vote-badge"><i class="fas fa-heart"></i> ${votes.score}</span>
        </div>
      </div>
    </div>
  `;
}

/* ============ VISUAL ARCHIVE LANDING ============ */
VIEWS.gallery = function() {
  const slug = route.params.slug || D.PRIMARY_SLUG || (D.STORIES[0]?.slug || "");
  const story = D.STORIES.find(s => s.slug === slug) || D.STORIES[0] || {};
  const canViewMature = isAdmin() || activeEntitlements().length > 0;
  State.currentStory = story;

  const characters = D.CHARACTERS.filter(c => !story.id || c.story_id === story.id);
  State.currentChars = characters;

  const allImages = D.GALLERY_IMAGES.filter(img => !story.id || img.story_id === story.id || characters.some(c => c.id === img.character_id));
  State.currentGalleryImages = allImages;

  // Character-gallery search/tag controls are not present on the landing page,
  // so stale values from a previously opened character must not hide its feed.
  const visibleImages = allImages.filter(img => {
    const tags = Array.isArray(img.image_tags) ? img.image_tags : [];
    return (canViewMature && State.showR18) || !tags.some(isMatureTag);
  });
  const featured = characters.find(c => c.profile_image_url) || characters[0] || {};
  const featuredImages = allImages.filter(img => img.character_id === featured.id);

  const collectionMap = {};
  allImages.forEach(img => {
    if (!collectionMap[img.character_id]) collectionMap[img.character_id] = [];
    collectionMap[img.character_id].push(img);
  });

  const uniqueTags = new Set(allImages.flatMap(img => (img.image_tags || []).filter(t => !isMatureTag(t))));

  const collectionDecks = characters.map(c => {
    const charImgs = collectionMap[c.id] || [];
    const count = charImgs.length;
    return `
      <div class="archive-collection-deck glass ${c.id === featured.id ? 'is-active' : ''}"
        data-act="nav-gallery-char" data-char-id="${esc(c.id)}" data-slug="${esc(slug)}">
        <div class="archive-deck-stack">
          ${c.profile_image_url
            ? `<span class="archive-profile-card"><img src="${esc(c.profile_image_url)}" alt="${esc(c.name)}" loading="lazy"></span>`
            : `<span class="archive-deck-placeholder"><i class="fas fa-user-astronaut"></i></span>`}
        </div>
        <div class="archive-deck-copy">
          <strong>${esc(c.name)}</strong>
          <small>${esc(c.role_title || 'Archive Subject')}</small>
          <em>${count} ${count === 1 ? 'artwork' : 'artworks'}</em>
        </div>
      </div>
    `;
  }).join('');

  const recentGrid = visibleImages.slice(0, 12).map((img, idx) => renderGalleryCard(img, idx, 'grid')).join('');

  return `
    <div class="archive-landing-wrap">
      <header class="archive-titlebar glass">
        <div>
          <div class="gallery-eyebrow">${esc(story.title || 'Visual Archive')}</div>
          <h1 class="page-title">Visual Archive</h1>
          <p class="page-sub">Character collections, artwork dossiers, and recent submissions.</p>
        </div>
        <div class="titlebar-actions">
          ${canViewMature ? `
          <button class="btn sm ${State.showR18 ? 'danger' : 'secondary'}" data-act="toggle-r18" type="button">
            <i class="fas ${State.showR18 ? 'fa-eye' : 'fa-eye-slash'}"></i> ${State.showR18 ? 'R18 Active' : 'Show R18'}
          </button>
          ` : ''}
        </div>
      </header>

      ${canViewMature ? '' : `
        <aside class="gallery-subscription-banner glass">
          <i class="fas fa-lock"></i>
          <span><strong>Subscriber-only archive</strong> An active subscription is required to access NSFW artwork.</span>
          <button class="btn sm story" data-nav="/vault">View subscription access</button>
        </aside>
      `}

      <section class="archive-feature glass">
        <div class="archive-feature-portrait">
          <img src="${esc(featured.profile_image_url || story.cover_image_url || '')}" alt="${esc(featured.name || 'Featured')}" decoding="async">
        </div>
        <div class="archive-feature-copy">
          <div class="gallery-eyebrow"><i class="fas fa-star"></i> Featured Character</div>
          <h2>${esc(featured.name || 'Archive Roster')}</h2>
          <div class="archive-feature-role">${esc(featured.role_title || 'Character Collection')}</div>
          <p>${esc(featured.biography || story.synopsis || 'Explore the preserved visual records in this archive.')}</p>
          <div class="archive-feature-facts">
            <span><i class="fas fa-images"></i> <b>${featuredImages.length}</b> artworks</span>
            <span><i class="fas fa-tags"></i> <b>${new Set(featuredImages.flatMap(i => i.image_tags || [])).size}</b> tags</span>
          </div>
          ${featured.id ? `<button class="btn story" data-act="nav-gallery-char" data-char-id="${esc(featured.id)}" data-slug="${esc(slug)}">Open Character Gallery <i class="fas fa-arrow-right"></i></button>` : ''}
        </div>
        <aside class="archive-browser-panel">
          <div class="archive-stats">
            <span><b>${characters.length}</b> Roster</span>
            <span><b>${allImages.length}</b> Artworks</span>
            <span><b>${uniqueTags.size}</b> Collections</span>
          </div>
          <div class="archive-browser-heading"><span>Character Roster</span></div>
          <div class="archive-deck-grid">${collectionDecks || '<div class="empty">No character collections found.</div>'}</div>
        </aside>
      </section>

      ${allImages.length ? `
        <section class="gallery-recent-section">
          <div class="gallery-section-heading">
            <div>
              <span class="gallery-eyebrow">Fresh Transmissions</span>
              <h2>Recently Added</h2>
            </div>
            <p>Newly published artwork from across the roster.</p>
          </div>
          <div class="sub-gallery-grid" id="latest-gallery-grid">${recentGrid || '<div class="empty">No public artwork matches current filters.</div>'}</div>
        </section>
      ` : ''}
    </div>
  `;
};

/* ============ INDIVIDUAL CHARACTER GALLERY VIEWER ============ */
VIEWS.galleryChar = function() {
  const charId = route.params.charId;
  const character = D.CHARACTERS.find(c => c.id === charId);
  const canViewMature = isAdmin() || activeEntitlements().length > 0;

  if (!character) {
    return `<div class="empty" style="padding-top:90px"><div class="em"><i class="fas fa-user-slash"></i></div><h3>Character Not Found</h3><p>The requested character archive was not found.</p><button class="btn story" data-nav="/gallery">Back to Archive</button></div>`;
  }

  const slug = route.params.slug || (D.STORIES.find(s => s.id === character.story_id)?.slug) || D.PRIMARY_SLUG || "";
  const allCharImages = D.GALLERY_IMAGES.filter(img => img.character_id === charId);
  State.currentGalleryImages = allCharImages;

  const filtered = filterGalleryImages(allCharImages);
  const sorted = sortGalleryImages(filtered);

  // Collect tags
  const tagsSet = new Set(["All"]);
  allCharImages.forEach(img => {
    (img.image_tags || []).forEach(t => {
      if (!isMatureTag(t)) tagsSet.add(t);
    });
  });

  const tagChipsHtml = Array.from(tagsSet).map(t => {
    const active = t === State.filterTag ? 'active' : '';
    return `<button class="gallery-tag-chip ${active}" data-act="filter-gallery-tag" data-tag="${esc(t)}">${esc(t)}</button>`;
  }).join('');

  const gridHtml = sorted.length
    ? sorted.map((img, idx) => renderGalleryCard(img, idx, State.galleryViewMode)).join('')
    : `<div class="empty" style="grid-column:1/-1; padding:3rem;"><div class="em"><i class="fas fa-images"></i></div><h3>No artworks found</h3><p>No images match the active search/filters.</p></div>`;

  return `
    <div class="character-gallery-wrap">
      <header class="archive-titlebar glass">
        <div>
          <button class="btn ghost sm" data-act="nav-gallery" data-slug="${esc(slug)}"><i class="fas fa-chevron-left"></i> Back to Visual Archive</button>
          <h1 class="page-title" style="margin-top:6px">${esc(character.name)} Gallery</h1>
        </div>
        ${canViewMature ? `<button class="btn sm ${State.showR18 ? 'danger' : 'secondary'}" data-act="toggle-r18" type="button">
          <i class="fas ${State.showR18 ? 'fa-eye' : 'fa-eye-slash'}"></i> ${State.showR18 ? 'R18 Active' : 'Show R18'}
        </button>` : ''}
      </header>

      ${canViewMature ? '' : `
        <aside class="gallery-subscription-banner glass">
          <i class="fas fa-lock"></i>
          <span><strong>Subscriber-only archive</strong> An active subscription is required to access NSFW artwork.</span>
          <button class="btn sm story" data-nav="/vault">View subscription access</button>
        </aside>
      `}

      <div class="gallery-character-hero glass">
        <div class="hero-avatar">
          ${character.profile_image_url
            ? `<img src="${esc(character.profile_image_url)}" alt="${esc(character.name)}">`
            : `<div class="hero-avatar-ph"><i class="fas fa-user-astronaut"></i></div>`}
        </div>
        <div class="hero-details">
          <div class="hero-count"><i class="fas fa-images"></i> ${allCharImages.length} published artworks</div>
          <h2 class="hero-title">${esc(character.name)}</h2>
          ${character.role_title ? `<div class="hero-role">${esc(character.role_title)}</div>` : ''}
          ${character.biography ? `<div class="hero-bio">${esc(character.biography)}</div>` : ''}
        </div>
      </div>

      <section class="gallery-controls glass">
        <div class="control-group search-group">
          <i class="fas fa-search search-icon"></i>
          <input type="search" id="gallery-search-input" class="gallery-search-input" placeholder="Search captions or tags..." value="${esc(State.gallerySearch || '')}" data-act="search-gallery">
        </div>
        <div class="control-group sort-group">
          <label for="gallery-sort-select">Sort:</label>
          <select id="gallery-sort-select" class="gallery-sort-select" data-act="sort-gallery">
            <option value="curated" ${State.gallerySort === 'curated' ? 'selected' : ''}>Curated</option>
            <option value="newest" ${State.gallerySort === 'newest' ? 'selected' : ''}>Newest</option>
            <option value="top" ${State.gallerySort === 'top' ? 'selected' : ''}>Top Rated</option>
          </select>
        </div>
        <div class="control-group viewmode-group">
          <button class="btn sm secondary" data-act="toggle-viewmode">
            <i class="fas ${State.galleryViewMode === 'deck' ? 'fa-th' : 'fa-layer-group'}"></i>
            <span>${State.galleryViewMode === 'deck' ? 'Grid View' : 'Deck View'}</span>
          </button>
        </div>
        <div class="gallery-count-label">${sorted.length} artworks</div>
      </section>

      <div class="gallery-tags-bar">
        ${tagChipsHtml}
        <button class="gallery-tag-chip shuffle-btn" data-act="shuffle-gallery" title="Shuffle artwork"><i class="fas fa-random"></i></button>
      </div>

      <div class="${State.galleryViewMode === 'deck' ? 'decks-grid' : 'sub-gallery-grid'}" id="gallery-grid">
        ${gridHtml}
      </div>
    </div>
  `;
};

/* ============ LIGHTBOX OVERLAY RENDERER ============ */
function renderGalleryLightbox(imgIndex) {
  const images = sortGalleryImages(filterGalleryImages(State.currentGalleryImages || D.GALLERY_IMAGES));
  if (!images.length || imgIndex < 0 || imgIndex >= images.length) return '';

  State.lightboxIndex = imgIndex;
  const img = images[imgIndex];
  const char = img.character || D.CHARACTERS.find(c => c.id === img.character_id) || {};
  const tags = Array.isArray(img.image_tags) ? img.image_tags : [];
  const votes = State.imageVotes[img.id] || { score: 0, userVote: 0 };
  const escCap = esc(img.caption || char.name || "Gallery Artwork");
  const escChar = esc(char.name || "Character");
  const escUrl = esc(img.image_url || "");

  return `
    <div class="gallery-lightbox-overlay" id="gallery-lightbox">
      <div class="lightbox-backdrop" data-act="close-lightbox"></div>
      <div class="lightbox-content glass">
        <button class="lightbox-close-btn" data-act="close-lightbox" title="Close Lightbox"><i class="fas fa-times"></i></button>

        <button class="lightbox-nav-btn prev-btn" data-act="lightbox-prev" ${imgIndex === 0 ? 'disabled' : ''} title="Previous Artwork">
          <i class="fas fa-chevron-left"></i>
        </button>

        <div class="lightbox-stage">
          <img src="${escUrl}" alt="${escCap}" class="lightbox-image">
        </div>

        <button class="lightbox-nav-btn next-btn" data-act="lightbox-next" ${imgIndex === images.length - 1 ? 'disabled' : ''} title="Next Artwork">
          <i class="fas fa-chevron-right"></i>
        </button>

        <aside class="lightbox-sidebar">
          <div class="lightbox-header">
            <div class="lightbox-char-name"><i class="fas fa-user-astronaut"></i> ${escChar}</div>
            <div class="lightbox-index">${imgIndex + 1} of ${images.length}</div>
          </div>
          ${img.caption ? `<div class="lightbox-caption">${escCap}</div>` : ''}
          ${tags.length ? `<div class="lightbox-tags">${tags.map(t => `<span class="deck-tag">${esc(t)}</span>`).join('')}</div>` : ''}

          <div class="lightbox-actions">
            <div class="lightbox-vote-box">
              <button class="btn sm ${votes.userVote > 0 ? 'primary' : 'secondary'}" data-act="vote-image" data-img-id="${esc(img.id)}" data-val="1">
                <i class="fas fa-thumbs-up"></i> ${votes.score > 0 ? votes.score : ''}
              </button>
            </div>
            ${authState.user ? '' : '<span class="faint" style="font-size:0.75rem;">Sign in to vote</span>'}
          </div>
        </aside>
      </div>
    </div>
  `;
}

function openGalleryLightbox(imgIndex) {
  const existing = document.getElementById("gallery-lightbox");
  if (existing) existing.remove();

  const html = renderGalleryLightbox(imgIndex);
  if (!html) return;

  const holder = document.createElement("div");
  holder.innerHTML = html;
  document.body.appendChild(holder.firstElementChild);
  document.body.classList.add("lightbox-open");
}

function closeGalleryLightbox() {
  const el = document.getElementById("gallery-lightbox");
  if (el) el.remove();
  document.body.classList.remove("lightbox-open");
  State.lightboxIndex = -1;
}

// Attach views to global registry
VIEWS.gallery = VIEWS.gallery;
VIEWS.galleryChar = VIEWS.galleryChar;
