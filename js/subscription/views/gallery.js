/* Unified reader artwork browser. Plain classic script; backend contracts unchanged. */
"use strict";
function isMatureTag(tag) {
  return ["r18","mature","nsfw","18+"].includes(String(tag || "").toLowerCase().trim());
}
function galleryMatureBlurClass(image) {
  return homeIsMatureGalleryImage(image) && homeCanViewMatureGallery() && !State.showR18 ? "nsfw-blurred" : "";
}
function matureArtworkAccessSheet() {
  return `<button class="close-x" data-act="close-sheet" aria-label="Close">${I.x}</button><div class="empty"><div class="em">${I.lock}</div><h3>Subscription required</h3><p>Active member access is required to view NSFW artwork.</p><button class="btn primary" data-nav="/benefits">Explore membership</button><button class="btn ghost" data-nav="/vault">Manage access</button></div>`;
}
function filterGalleryImages(images) {
  const query = String(State.gallerySearch || "").toLowerCase().trim();
  const tag = State.filterTag || "All";
  const mature = homeCanViewMatureGallery();
  return (images || []).filter(img => {
    const tags = Array.isArray(img.image_tags) ? img.image_tags : [];
    if (tags.some(isMatureTag) && !mature) return false;
    if (!homeSafeMediaUrl(img.image_url)) return false;
    if (tag!=="All" && !tags.includes(tag)) return false;
    const char = img.character || D.CHARACTERS.find(c=>c.id===img.character_id);
    return [img.caption,char?.name,...tags].join(" ").toLowerCase().includes(query);
  });
}
function sortGalleryImages(images) {
  const sorted = [...images];
  if (State.gallerySort==="newest") sorted.sort((a,b)=>homeFeedDate(b.created_at)-homeFeedDate(a.created_at));
  else if (State.gallerySort==="top") sorted.sort((a,b)=>(State.imageVotes[b.id]?.score || 0)-(State.imageVotes[a.id]?.score || 0));
  else if (State.gallerySort==="shuffle") {
    const positions = new Map((State.galleryShuffleIds || []).map((id,i)=>[id,i]));
    sorted.sort((a,b)=>(positions.get(a.id) ?? Infinity)-(positions.get(b.id) ?? Infinity));
  } else sorted.sort((a,b)=>Number(a.sort_order || 0)-Number(b.sort_order || 0));
  return sorted;
}
function galleryTone(img) {
  const colors = ["#f3cf69","#7ec8ff","#ad8cff","#72e5c5","#ff837d"];
  const seed = String(img.character_id || img.id).split("").reduce((sum,c)=>sum+c.charCodeAt(0),0);
  return colors[seed%colors.length];
}
function galleryVoteControls(img) {
  const vote = State.imageVotes[img.id] || {score:0,userVote:0};
  return `<div class="rg-votes" aria-label="Artwork votes"><button data-act="vote-image" data-img-id="${esc(img.id)}" data-val="1" aria-label="Upvote artwork" aria-pressed="${vote.userVote===1}" ${galleryPendingVotes.has(img.id)?"disabled":""}>${I.chevU || "↑"}</button><span aria-label="Artwork score">${Number(vote.score) || 0}</span><button data-act="vote-image" data-img-id="${esc(img.id)}" data-val="-1" aria-label="Downvote artwork" aria-pressed="${vote.userVote===-1}" ${galleryPendingVotes.has(img.id)?"disabled":""}>${I.chevD || "↓"}</button></div>`;
}
function renderGalleryCard(img,index) {
  const char = img.character || D.CHARACTERS.find(c=>c.id===img.character_id) || {};
  const caption = img.caption || `${char.name || "Archive"} artwork`;
  const url = homeSafeMediaUrl(img.image_url);
  const thumb = homeThumbnailUrl(url,800);
  const tags = (img.image_tags || []).filter(t=>!isMatureTag(t));
  const blurred = galleryMatureBlurClass(img);
  return `<article class="rg-art ${blurred}" style="--art-tone:${galleryTone(img)}">
    <button class="rg-art-open" data-act="open-lightbox" data-img-id="${esc(img.id)}" data-img-index="${index}" aria-label="View ${esc(caption)}">
      <img src="${esc(thumb)}" data-full-src="${thumb!==url?esc(url):""}" alt="${esc(caption)}" loading="lazy" decoding="async" onerror="galleryImageFailed(this)">
      <span class="rg-art-top"><span>${esc(char.name || "Archive")}</span>${tags[0]?`<span>${esc(tags[0])}</span>`:""}</span>
      <span class="rg-art-caption"><small>${esc(char.name || "Artwork")}</small><strong>${esc(caption)}</strong></span>
    </button>${galleryVoteControls(img)}
  </article>`;
}
function renderGalleryDecks(images) {
  const groups = new Map();
  images.forEach((img,index)=>{
    const key = (img.image_tags || []).find(tag=>!isMatureTag(tag)) || "Archive";
    if (!groups.has(key)) groups.set(key,[]);
    groups.get(key).push({img,index});
  });
  return [...groups].map(([tag,rows])=>`<button class="rg-deck" data-act="open-lightbox" data-img-id="${esc(rows[0].img.id)}" data-img-index="${rows[0].index}" aria-label="Open ${esc(tag)} collection, ${rows.length} artworks"><span class="rg-deck-stack">${rows.slice(0,3).map(({img})=>`<span class="rg-deck-card ${galleryMatureBlurClass(img)}"><img src="${esc(homeThumbnailUrl(img.image_url,540))}" data-full-src="${esc(homeSafeMediaUrl(img.image_url))}" alt="" loading="lazy" decoding="async" onerror="galleryImageFailed(this)"></span>`).join("")}</span><span class="rg-deck-title"><small>${rows.length} artworks</small><strong>${esc(tag)} collection</strong></span></button>`).join("");
}
function galleryImageFailed(image) {
  if (homeThumbnailFailed(image)) return;
  const card = image.closest(".rg-art-open,.rg-deck-card,.rg-portrait,.rg-lb-stage");
  if (card && !card.querySelector(".rg-image-unavailable")) {
    const message = document.createElement("span"); message.className = "rg-image-unavailable";
    message.textContent = "Image unavailable"; card.appendChild(message);
  }
}
function galleryResultMarkup() {
  const all = sortGalleryImages(filterGalleryImages(State.currentGalleryImages || []));
  const visible = all.slice(0,Math.max(24,Number(State.galleryLimit || 24)));
  State.galleryResults = all;
  State.latestGalleryImages = visible;
  return {all,visible,html: visible.length ? (State.galleryViewMode==="deck" ? renderGalleryDecks(visible) : visible.map(renderGalleryCard).join("")) : '<div class="rh-empty"><h3>No artwork found</h3><p>No published artwork matches this selection.</p></div>'};
}
function refreshGalleryResults() {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;
  const results = galleryResultMarkup();
  grid.className = State.galleryViewMode==="deck" ? "rg-deck-grid" : "rg-masonry";
  grid.innerHTML = results.html;
  const count = document.querySelector(".gallery-count-label");
  if (count) count.textContent = results.all.length+" artworks";
  const more = document.querySelector('[data-act="gallery-load-more"]');
  if (more) more.hidden = results.visible.length>=results.all.length;
}
function renderUnifiedGallery(charId) {
  const selected = charId ? D.CHARACTERS.find(c=>c.id===charId) : null;
  if (charId && !selected) return `<div class="rh-empty"><h1>Character not found</h1><p>This character archive is unavailable.</p><button class="btn primary" data-nav="/gallery">Back to archive</button></div>`;
  const story = bySlug(route.params.slug) || D.STORIES.find(s=>s.id===selected?.story_id) || D.STORIES[0];
  if (!story) return `<div class="rh-empty"><h1>Visual Archive</h1><p>No story or artwork has been published yet.</p></div>`;
  const chars = D.CHARACTERS.filter(c=>c.story_id===story.id);
  const storyImages = D.GALLERY_IMAGES.filter(img=>img.story_id===story.id || chars.some(c=>c.id===img.character_id));
  State.currentStory = story; State.currentChars = chars;
  const contextKey = story.id+":"+(charId || "all");
  if (State.galleryContextKey!==contextKey) { State.galleryContextKey=contextKey; State.galleryLimit=24; State.filterTag="All"; }
  State.currentGalleryImages = selected ? storyImages.filter(img=>img.character_id===charId) : storyImages;
  const allowed = State.currentGalleryImages.filter(img=>!homeIsMatureGalleryImage(img) || homeCanViewMatureGallery());
  const featured = selected || chars.find(c=>homeSafeMediaUrl(c.profile_image_url)) || chars[0];
  const portrait = homeSafeMediaUrl(featured?.profile_image_url || story.cover_image_url);
  const tags = [...new Set(allowed.flatMap(img=>(img.image_tags || []).filter(t=>!isMatureTag(t))))];
  if (State.filterTag!=="All" && !tags.includes(State.filterTag)) State.filterTag="All";
  const results = galleryResultMarkup();
  const newest = Math.max(0,...allowed.map(img=>homeFeedDate(img.created_at)));
  const canMature = homeCanViewMatureGallery();
  const heading = selected?.name || "Visual Archive";
  return `<section class="rg-browser">
    <div class="rg-routebar"><a href="#/" data-nav="/">${I.chevL} Story hub</a><span>${esc(story.title)}</span><button class="btn sm ${canMature && State.showR18?"danger":"ghost"}" data-act="toggle-r18" aria-pressed="${canMature && !!State.showR18}">${canMature && State.showR18?"BLUR NSFW":"SHOW NSFW"}</button></div>
    <section class="rg-masthead">
      <div class="rg-portrait">${portrait?`<img src="${esc(homeThumbnailUrl(portrait,540))}" data-full-src="${esc(portrait)}" alt="${esc(featured?.name || story.title)}" decoding="async" onerror="galleryImageFailed(this)">`:`<span class="rg-portrait-empty">${I.user}</span>`}</div>
      <div class="rg-profile"><div class="rh-kicker">${allowed.length} published artworks</div><h1 tabindex="-1">${esc(heading)}</h1><div class="rg-role">${esc(selected?.role_title || "Character visual archive")}</div><p class="rg-bio">${esc(selected?.biography || selected?.bio || "Explore character portraits, visual studies, and artwork from this story. Select a collection below or browse the complete archive.")}</p></div>
      <div class="rg-stats"><div><strong>${allowed.length}</strong><span>Artworks</span></div><div><strong>${selected?tags.length:chars.length}</strong><span>${selected?"Tags":"Characters"}</span></div><div><strong>${newest?esc(fmtDate(new Date(newest).toISOString())):"—"}</strong><span>Latest artwork</span></div></div>
    </section>
    ${canMature?"":`<aside class="rg-access-banner">${I.lock}<span>Sign in with active member access to view mature artwork.</span><button class="btn sm ghost" data-nav="/vault">View access</button></aside>`}
    <nav class="rg-collections" aria-label="Character collections"><a class="${selected?"":"active"}" href="#/gallery/${esc(story.slug)}" data-act="select-gallery-character" data-slug="${esc(story.slug)}" data-char-id="" ${selected?"":'aria-current="page"'}>${I.grid}<span>All archive</span></a>${chars.map(c=>`<a href="#/gallery/${esc(story.slug)}/${esc(c.id)}" data-act="select-gallery-character" data-slug="${esc(story.slug)}" data-char-id="${esc(c.id)}" class="${selected?.id===c.id?"active":""}" ${selected?.id===c.id?'aria-current="page"':""}>${homeSafeMediaUrl(c.profile_image_url)?`<img src="${esc(homeThumbnailUrl(c.profile_image_url,240))}" alt="" loading="lazy" onerror="this.hidden=true">`:I.user}<span>${esc(c.name)}</span></a>`).join("")}</nav>
    <section class="rg-toolbar">
      <label class="rg-search">${I.search}<input id="gallery-search-input" type="search" aria-label="Search gallery" placeholder="Search captions or tags" value="${esc(State.gallerySearch || "")}"></label>
      <label class="rg-sort">Sort <select id="gallery-sort-select" aria-label="Sort gallery">${[["curated","Curated"],["newest","Newest"],["top","Top rated"],["shuffle","Shuffled"]].map(([value,label])=>`<option value="${value}" ${(State.gallerySort || "curated")===value?"selected":""}>${label}</option>`).join("")}</select></label>
      <button class="btn sm ghost" data-act="toggle-viewmode">${State.galleryViewMode==="deck"?I.grid:I.book}<span>${State.galleryViewMode==="deck"?"Switch to grid":"Switch to decks"}</span></button>
      <span class="gallery-count-label" aria-live="polite">${results.all.length} artworks</span>
    </section>
    <div class="rg-tags" role="group" aria-label="Artwork tags">${["All",...tags].map(tag=>`<button data-act="filter-gallery-tag" data-tag="${esc(tag)}" class="${State.filterTag===tag?"active":""}" aria-pressed="${State.filterTag===tag}">${esc(tag)}</button>`).join("")}<button data-act="shuffle-gallery" aria-label="Shuffle artwork">${I.sync}</button></div>
    <div id="gallery-grid" class="${State.galleryViewMode==="deck"?"rg-deck-grid":"rg-masonry"}">${results.html}</div>
    <button class="rh-panel-link rg-load-more" data-act="gallery-load-more" ${results.visible.length>=results.all.length?"hidden":""}>Load more artwork ${I.chevD}</button>
    <button class="rg-to-top" data-act="archive-to-top" aria-label="Back to top">${I.chevU || "↑"}</button>
  </section>`;
}
VIEWS.gallery = () => renderUnifiedGallery();
VIEWS.galleryChar = () => renderUnifiedGallery(route.params.charId);
function galleryLightboxImages() {
  return sortGalleryImages(filterGalleryImages(State.currentGalleryImages || []));
}
function renderGalleryLightbox(index) {
  const images = galleryLightboxImages();
  if (index<0 || index>=images.length) return "";
  State.lightboxIndex=index; State.lightboxImageId=images[index].id;
  const img=images[index];
  const char=img.character || D.CHARACTERS.find(c=>c.id===img.character_id) || {};
  const caption=img.caption || `${char.name || "Archive"} artwork`;
  return `<div class="rg-lightbox" id="gallery-lightbox" role="dialog" aria-modal="true" aria-labelledby="gallery-lightbox-title">
    <div class="rg-lb-backdrop" data-act="close-lightbox"></div>
    <div class="rg-lb-body"><div class="rg-lb-stage ${galleryMatureBlurClass(img)}">
      <button class="rg-lb-prev" data-act="lightbox-prev" aria-label="Previous artwork" ${index===0?"disabled":""}>${I.chevL}</button>
      <img src="${esc(homeSafeMediaUrl(img.image_url))}" alt="${esc(caption)}" onerror="galleryImageFailed(this)">
      <button class="rg-lb-next" data-act="lightbox-next" aria-label="Next artwork" ${index===images.length-1?"disabled":""}>${I.chevR}</button>
      <span class="rg-lb-counter">${index+1} / ${images.length}</span></div>
      <aside class="rg-lb-side"><button class="rg-lb-close" data-act="close-lightbox" aria-label="Close artwork viewer">${I.x}</button>
        <div class="rh-kicker">${esc(char.name || "Archive")}</div><h2 id="gallery-lightbox-title">${esc(caption)}</h2>
        ${char.role_title?`<p class="rg-role">${esc(char.role_title)}</p>`:""}
        <div class="rg-lb-tags">${(img.image_tags || []).map(tag=>`<span>${esc(tag)}</span>`).join("")}</div>
        ${galleryVoteControls(img)}${authState.user?"":'<p class="rg-vote-note">Sign in to vote on artwork.</p>'}
      </aside></div></div>`;
}
let galleryLightboxReturnFocus = null;
const galleryPendingVotes = new Set();
function openGalleryLightbox(index) {
  const old=document.getElementById("gallery-lightbox");
  const active=document.activeElement;
  const action=old && old.contains(active) ? active?.dataset?.act : null;
  const value=old && old.contains(active) ? active?.dataset?.val : null;
  const html=renderGalleryLightbox(index);
  if (!html) return;
  if (!old) galleryLightboxReturnFocus=active;
  if(old) old.remove();
  const holder=document.createElement("div"); holder.innerHTML=html;
  const box=holder.firstElementChild; document.body.appendChild(box);
  document.body.classList.add("lightbox-open");
  const app=document.getElementById("app"); if(app) app.inert=true;
  box.addEventListener("keydown",e=>{
    if(e.key!=="Tab") return;
    const controls=[...box.querySelectorAll("button:not(:disabled)")];
    const first=controls[0],last=controls[controls.length-1];
    if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
  });
  const restore=action ? box.querySelector(`button[data-act="${action}"]${value?`[data-val="${value}"]`:""}:not(:disabled)`) : null;
  (restore || box.querySelector(".rg-lb-close")).focus();
}
function closeGalleryLightbox() {
  const box=document.getElementById("gallery-lightbox");
  if(box) box.remove();
  document.body.classList.remove("lightbox-open");
  const app=document.getElementById("app"); if(app) app.inert=false;
  State.lightboxIndex=-1; State.lightboxImageId=null;
  if(galleryLightboxReturnFocus?.isConnected) galleryLightboxReturnFocus.focus();
  galleryLightboxReturnFocus=null;
}
function shuffleGalleryArtwork() {
  const ids=(State.currentGalleryImages || []).map(img=>img.id);
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  State.galleryShuffleIds=ids; State.gallerySort="shuffle"; State.galleryLimit=24;
  render({preserveScroll:true});
}
async function voteGalleryArtwork(imgId,value) {
  if(galleryPendingVotes.has(imgId)) return;
  if(!authState.user){closeGalleryLightbox();openSheet(sheetPersona);toast("Sign in to vote",null,{icon:"user"});return;}
  galleryPendingVotes.add(imgId);
  document.querySelectorAll('[data-act="vote-image"]').forEach(btn=>{if(btn.dataset.imgId===imgId)btn.disabled=true;});
  try {
    await submitGalleryVote(imgId,value);
    // Closing/navigating while a write is in flight must never reopen the overlay.
    galleryPendingVotes.delete(imgId);
    if(State.lightboxIndex>=0 && document.getElementById("gallery-lightbox")) {
      const index=galleryLightboxImages().findIndex(img=>img.id===State.lightboxImageId);
      if(index>=0) openGalleryLightbox(index); else closeGalleryLightbox();
    }
    if(route.name==="gallery" || route.name==="galleryChar") refreshGalleryResults();
  } catch(err) { toast("Vote failed",err.message || "Please try again.",{kind:"bad",icon:"alert"}); }
  finally {
    galleryPendingVotes.delete(imgId);
    document.querySelectorAll('[data-act="vote-image"]').forEach(btn=>{if(btn.dataset.imgId===imgId)btn.disabled=false;});
  }
}
