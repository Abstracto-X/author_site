/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ STORY HUB ============ */
VIEWS.story = function(){
  const s=bySlug(route.params.slug); if(!s) return notFound("Story");
  setStoryAccent(s);
  const r=s.chapters.map(chapterResolved);
  const readCount=s.chapters.filter((c,i)=>store.readMarked[c.id]|| (store.progress[c.id]&&store.progress[c.id].pct>=100)).length;
  const total=s.chapters.length;
  if (!total) {
    const followed=store.followed.includes(s.id);
    return `
  <div class="hero" style="${storyAccentVars(s)}">
    <div class="bg">${coverArt(s)}</div><div class="grad"></div>
    <div class="inner">
      <div class="mini-cover">${coverArt(s)}</div>
      <div class="htxt"><div class="eyebrow">${s.genre} &middot; ${s.status}</div><h1>${s.title}</h1><div class="author">by ${s.author}</div></div>
    </div>
  </div>
  <p class="muted" style="font-family:var(--serif);font-size:1.02rem;line-height:1.6;margin:0 2px 16px">${s.tagline}</p>
  <div class="empty"><div class="em">${I.book}</div><h3>No chapters published yet</h3><p>This story is live in the backend, but its chapter shelf is empty. Publish a chapter in the admin CMS to make it readable here.</p></div>
  <div class="section"><div class="between"><div class="section-head" style="margin:0"><h2>Follow this story</h2></div><button class="btn sm ${followed?'':'story'}" data-follow="${s.id}">${followed?I.checkCirc+"Following":I.plus+"Follow"}</button></div></div>`;
  }
  const pct=Math.round(readCount/total*100);
  const nextUnread=s.chapters.find(c=>!(store.readMarked[c.id]||(store.progress[c.id]&&store.progress[c.id].pct>=100)));
  const latestEarly=s.chapters.find(c=>c.state==="early");
  const followed=store.followed.includes(s.id);
  const firstFree=s.chapters.find(c=>c.state==="free");
  const lastRead=activeReads().find(x=>x.story.id===s.id);
  const startCh = lastRead?.ch.id || (firstFree?.id) || s.chapters[0].id;
  const startR = chapterResolved(byId(startCh).ch);
  return `
  <div class="hero" style="${storyAccentVars(s)}">
    <div class="bg">${coverArt(s)}</div><div class="grad"></div>
    <div class="inner">
      <div class="mini-cover">${coverArt(s)}</div>
      <div class="htxt">
        <div class="eyebrow">${s.genre} Â· ${s.status}</div>
        <h1>${s.title}</h1>
        <div class="author">by ${s.author}</div>
        <div class="tags">${s.tags.map(t=>badge("",t)).join("")}</div>
      </div>
    </div>
  </div>
  <p class="muted" style="font-family:var(--serif);font-size:1.02rem;line-height:1.6;margin:0 2px 16px">${s.tagline}</p>

  <div class="sticky-cta"><button class="btn primary block" data-read="${startCh}">${lastRead?(I.play+"Continue â€” "+lastRead.ch.title):"Start reading"}</button></div>

  <div class="card tinted" style="margin-bottom:14px">
    <div class="between" style="margin-bottom:12px"><div><div class="eyebrow">Your progress</div><div style="font-family:var(--serif);font-size:1.1rem;font-weight:600;margin-top:2px">${readCount} / ${total} chapters read</div></div>${ring(pct)}</div>
    <div class="faint" style="font-size:.8rem;line-height:1.6">
      ${nextUnread?`Next unread: <b style="color:var(--text)">${nextUnread.title}</b> Â· `:""}${latestEarly?`Latest: <b style="color:var(--early)">${latestEarly.title}</b> (early access) Â· `:""}${s.chapters.filter(c=>!isReadable(chapterResolved(c))).length} locked for you.
    </div>
  </div>

  <div class="section-head"><h2>Where should I start?</h2></div>
  <div class="quicklinks" style="margin-bottom:18px">
    <a data-read="${firstFree?.id||s.chapters[0].id}">${I.play}<span>Chapter 1</span><small>From the beginning</small></a>
    <a data-read="${startCh}">${I.book}<span>Continue</span><small>${lastRead?lastRead.ch.title:"Where you left off"}</small></a>
    <a data-nav="/story/${s.slug}/recap">${I.list}<span>Recap</span><small>Catch up first</small></a>
    <a data-nav="/story/${s.slug}/extras">${I.spark}<span>Extras</span><small>Bonus materials</small></a>
  </div>

  <div class="section">
    <div class="section-head"><h2>Latest chapters</h2><a class="section-link" data-nav="/story/${s.slug}/chapters">Full shelf ${I.chevR}</a></div>
    <div class="col-flex">${s.chapters.slice(-3).reverse().map(c=>chapterRow(c,s)).join("")}</div>
  </div>

  <div class="section">
    <div class="between"><div class="section-head" style="margin:0"><h2>Follow this story</h2></div><button class="btn sm ${followed?'':'story'}" data-follow="${s.id}">${followed?I.checkCirc+"Following":I.plus+"Follow"}</button></div>
    <p class="faint" style="font-size:.78rem;margin-top:-4px">${followed?"We'll notify you when new chapters unlock for you.":"Get notified when new chapters unlock for your access."}</p>
  </div>

  <div class="section">
    <div class="section-head"><h2>Cast &amp; glossary</h2></div>
    <div class="card">
      ${s.cast.map(c=>`<div style="padding:7px 0;border-bottom:1px solid var(--border)"><span style="font-family:var(--serif);font-weight:600;color:var(--s2)">${c.n}</span> <span class="faint" style="font-size:.82rem">â€” ${c.r}</span></div>`).join("")}
      <dl class="dl" style="margin-top:12px">${s.glossary.map(g=>`<dt>${g.t}</dt><dd>${g.d}</dd>`).join("")}</dl>
    </div>
  </div>
  ${mainArchiveEnabled()?``:""}
  `;
};

/* ============ CHAPTER SHELF ============ */
VIEWS.chapters = function(){
  const s=bySlug(route.params.slug); if(!s) return notFound("Story");
  setStoryAccent(s);
  const view = store.filters.shelfView || "comfortable";
  if (!s.chapters.length) return `
  <div class="between" style="margin-bottom:6px"><a class="section-link" data-nav="/story/${s.slug}" style="display:inline-flex;align-items:center;gap:4px;color:var(--text-dim)">${I.chevL}<span>${s.title}</span></a></div>
  <h1 class="page-title">Chapter Shelf</h1>
  <p class="page-sub">0 chapters published.</p>
  <div class="empty"><div class="em">${I.book}</div><h3>No chapters yet</h3><p>The story is published, but no chapter rows are published for it yet.</p></div>`;
  // group by arc
  const arcs={}; s.chapters.forEach(c=>{ (arcs[c.arc]=arcs[c.arc]||[]).push(c); });
  const renderRow = c => chapterRow(c,s);
  return `
  <div class="between" style="margin-bottom:6px"><a class="section-link" data-nav="/story/${s.slug}" style="display:inline-flex;align-items:center;gap:4px;color:var(--text-dim)">${I.chevL}<span>${s.title}</span></a></div>
  <h1 class="page-title">Chapter Shelf</h1>
  <p class="page-sub">${s.chapters.length} chapters Â· ${s.chapters.filter(c=>isReadable(chapterResolved(c))).length} readable for you now</p>
  <div class="seg story" style="margin:6px 0 18px">
    <button class="${view==='comfortable'?'active':''}" data-shelf-view="comfortable">Comfortable</button>
    <button class="${view==='compact'?'active':''}" data-shelf-view="compact">Compact</button>
    <button class="${view==='arc'?'active':''}" data-shelf-view="arc">By arc</button>
  </div>
  ${view==="arc"? Object.entries(arcs).map(([arc,chs])=>{
    const rd=chs.filter(c=>store.readMarked[c.id]||(store.progress[c.id]&&store.progress[c.id].pct>=100)).length;
    const lk=chs.filter(c=>!isReadable(chapterResolved(c))).length;
    return `<div class="arc"><div class="arc-head"><h3>${arc}</h3><div class="arc-bar">${progressBar(rd/chs.length*100)}</div><span class="arc-meta">${rd}/${chs.length}${lk?` Â· ${lk} locked`:""}</span></div><div class="col-flex">${chs.map(renderRow).join("")}</div></div>`;
  }).join("") : `<div class="col-flex">${s.chapters.map(renderRow).join("")}</div>`}
  `;
};
function chapterRow(ch, story){
  const r=chapterResolved(ch);
  const prog=store.progress[ch.id];
  const read = store.readMarked[ch.id] || (prog&&prog.pct>=100);
  const now_ = prog && prog.pct>0 && prog.pct<100;
  const cmt = commentCount(ch.id);
  const illus = hasImages(ch);
  const tag=accessTag(r);
  const act = isReadable(r)?`data-read="${ch.id}"`:(r.state==='preview'?`data-preview="${ch.id}"`:`data-lock="${ch.id}"`);
  const compact = (store.filters.shelfView==="compact");
  return `<button class="row ${read?'read':''} ${now_?'now':''}" style="${story?storyAccentVars(story):''}" ${act}>
    <span class="num">${read?'<span style="color:var(--good)">'+I.check+'</span>':ch.n}</span>
    <span class="body">
      <span class="t"><span class="tt">${ch.title}</span>${r.isEarly?badge('early','Early'):''}${illus?badge('illus','Illus'):''}${ch.state==='key'?badge('key','Key'):''}</span>
      <span class="sub">${meta([axInline(r),`<i>${I.clock}</i>${ch.readTime} min`,cmt?`<i>${I.msg}</i>${cmt}`:"",ch.publicDate?`<i>${I.calendar}</i>Public ${fmtDate(ch.publicDate)}`:""])}</span>
      ${(!compact && reasonFor(ch,r))?`<span class="reason">${reasonFor(ch,r)}</span>`:""}
    </span>
    <span class="cta">${ctaFor(ch,r,story,{small:true})}</span>
  </button>`;
}

/* ============ READER ============ */
let currentChapter = null;
VIEWS.read = function(){
  const found = byId(route.params.id);
  if(!found) return notFound("Chapter");
  const {ch, story, index} = found; currentChapter = found;
  setStoryAccent(story);
  const r = chapterResolved(ch);
  if (r.state === "preview") return readerPreview(ch, story, index, r);
  if (!isReadable(r)) return readerLocked(ch, story, index, r);
  if (ch.backend && !ch.content) {
    if (!ch.contentLoading) loadReaderChapterFromBackend(ch.id).then(() => render());
    const message = ch.contentError || "Loading secure chapter text from Supabase...";
    return readerShell(`theme-${store.settings.readerTheme} preset-${store.settings.preset}`, `<div class="empty" style="padding-top:120px"><div class="em">${ch.contentError?I.alert:I.sync}</div><h3>${ch.contentError?"Chapter unavailable":"Opening secure chapter"}</h3><p>${esc(message)}</p>${ch.contentError?`<button class="btn story" data-lock="${ch.id}">${I.lockOpen}Check access</button>`:""}</div>`);
  }
  return readerFull(ch, story, index, r);
};
function readerShell(themeClass, inner, settings){
  const st = store.settings;
  const fs = (1.12*st.fontScale).toFixed(3)+"rem";
  return `<div class="reader ${themeClass}" id="reader" style="--fs:${fs};--lh:${st.lineHeight}">
    <div class="reader-progress"><i id="rprog" style="width:0%"></i></div>
    <header class="reader-top" id="rtop">
      <button class="rback" data-nav="/story/${currentChapter.story.slug}/chapters" aria-label="Back">${I.chevL}</button>
      <div class="ctx"><div class="s">${currentChapter.story.title} Â· Ch ${currentChapter.ch.n}</div><div class="c">${currentChapter.ch.title}</div></div>
      <button class="rset" data-sheet="settings" aria-label="Reader settings">${I.aa}</button>
    </header>
    <div class="reader-stage" id="rstage">${inner}</div>
    ${readerBar()}
  </div>`;
}
function readerBar(){
  const ch=currentChapter.ch; const id=ch.id;
  const bk = store.bookmarks.find(b=>b.chapterId===id);
  const cmt = commentCount(id);
  return `<div class="reader-bar" id="rbar">
    <button data-sheet="settings" aria-label="Settings">${I.aa}</button>
    <button data-act="reader-prev" aria-label="Previous">${I.chevL}</button>
    <button data-act="reader-next" aria-label="Next">${I.chevR}</button>
    <button data-act="reader-bookmark" class="${bk?'active':''}" aria-label="Bookmark">${bk?I.bookmarkFill:I.bookmark}</button>
    <button data-act="reader-comments" aria-label="Comments">${I.msg}${cmt?`<span class="mini">${cmt}</span>`:""}</button>
    <button data-sheet="context" aria-label="More">${I.list}</button>
  </div>`;
}
function renderBlocks(blocks, chId){
  return blocks.map((b,i)=>{
    if(b.t==="scene") return `<div class="scene">âœ¦ âœ¦ âœ¦</div>`;
    if(b.t==="img") return `<figure data-fig="${b.fig}" style="cursor:pointer">${D.FIG[b.fig]||""}<figcaption>${b.cap||""}</figcaption></figure>`;
    if(b.t==="p"){
      const pc = paraComments(chId,i);
      return `<p class="para" data-p="${i}">${b.v}<span class="pchip ${pc.length?'has':''}" data-para="${i}">${pc.length||'+'}</span></p>`;
    }
    return "";
  }).join("");
}
function readerFull(ch, story, index, r){
  const st=store.settings;
  const themeClass=`theme-${st.readerTheme} preset-${st.preset} ${st.showImages?'':'no-img'} ${st.showParaComments?'':'no-pchip'} ${st.focusMode?'focus':''}`;
  const blocks = ch.content || ch.preview || (ch.excerpt ? [{t:"p",v:ch.excerpt}] : [{t:"p",v:"The full text of this chapter will appear here once it is published."}]);
  const next = story.chapters[index+1];
  const nr = next?chapterResolved(next):null;
  return readerShell(themeClass, `
    <h1 class="ch-title">${ch.title}</h1>
    <div class="ch-by">${story.title} Â· Chapter ${ch.n} Â· ${ch.readTime} min Â· ${r.isEarly?'Early access until '+fmtDate(ch.publicDate):'Unlocked'}</div>
    ${ch.arc?`<div class="faint" style="font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;margin-bottom:24px">${ch.arc}</div>`:""}
    <div class="prose" id="prose">${renderBlocks(blocks, ch.id)}</div>
    ${endOfChapter(ch, story, next, nr)}
    ${commentsBlock(ch.id)}
  `);
}
function readerPreview(ch, story, index, r){
  const st=store.settings;
  const themeClass=`theme-${st.readerTheme} preset-${st.preset}`;
  return readerShell(themeClass, `
    <div class="badge preview" style="margin-bottom:14px">${I.eye}Preview</div>
    <h1 class="ch-title">${ch.title}</h1>
    <div class="ch-by">${story.title} Â· Chapter ${ch.n} Â· preview Â· ${ch.tier||"Aether Member"} to unlock full chapter</div>
    <div class="prose" id="prose">${renderBlocks(ch.preview||[], ch.id)}</div>
    <div class="preview-wall" style="${storyAccentVars(story)}">
      <div class="top"></div>
      <div class="inner">
        <h3>You've reached the end of the preview</h3>
        <p>Unlock the full chapter â€” and ${countReadable()} others â€” to continue ${story.title}. The complete text loads only after access is verified; nothing is hidden behind a blur.</p>
        <div class="col-flex" style="gap:9px;max-width:340px;margin:0 auto">
          <button class="btn story block" data-lock="${ch.id}">${I.lockOpen}Unlock with ${ch.tier||"Aether Member"}</button>
          <button class="btn ghost block" data-sheet="redeem">${I.key}Redeem an access key</button>
          ${ch.publicDate?`<div class="faint" style="font-size:.76rem">Or wait for the public release on <b style="color:var(--text)">${fmtDate(ch.publicDate)}</b> (in ${daysUntil(ch.publicDate)} days).</div>`:""}
        </div>
      </div>
    </div>
  `);
}
function readerLocked(ch, story, index, r){
  return `<div class="locked-fallback" style="${storyAccentVars(story)}">
    <div class="emblem" style="width:84px;height:84px">${r.state==='expired'?I.lockOpen:r.state==='pending'?I.sync:r.state==='key'?I.key:I.lock}</div>
    <h1>${ch.title}</h1>
    <div class="sub">${story.title} Â· Chapter ${ch.n}</div>
    <div class="card" style="max-width:420px;margin:0 auto 18px;text-align:left">
      <div class="ax ${accessTag(r)[0]}" style="font-size:1rem;margin-bottom:8px"><span class="ic" style="width:20px;height:20px">${accessTag(r)[2]}</span>${accessTag(r)[1]}</div>
      <p class="muted" style="font-size:.86rem;margin:0 0 4px">${reasonFor(ch,r)}</p>
      <p class="faint" style="font-size:.76rem;margin:0">The full text for this chapter is never sent to your browser until access is verified server-side.</p>
    </div>
    <div class="col-flex" style="gap:9px;max-width:340px;margin:0 auto">
      ${ch.state==='preview'?`<button class="btn story block" data-preview="${ch.id}">${I.eye}Read the preview</button>`:""}
      <button class="btn ${ch.state==='preview'?'ghost':'story'} block" data-lock="${ch.id}">${I.lockOpen}${r.state==='expired'?'Renew access':'Unlock options'}</button>
      <button class="btn ghost block" data-act="expected-access">${I.help}Expected this to be unlocked?</button>
      <button class="btn ghost" data-nav="/story/${story.slug}/chapters">${I.list}Back to shelf</button>
    </div>
  </div>`;
}
function endOfChapter(ch, story, next, nr){
  const st=store.settings;
  const reac = REACTIONS; const mine = store.reactions[ch.id]?.picked;
  return `<div class="eoc">
    <div class="done"><div class="orn">âœ¦</div><p>Chapter complete</p></div>
    ${st.showReactions?`<div class="faint center" style="font-size:.74rem;margin-bottom:10px">How did this chapter land?</div>
    <div class="reactions">${reac.map(rk=>{const n=(REACTION_SEED[ch.id]?.[rk.k]||0)+(mine===rk.k?1:0);return `<button class="react ${mine===rk.k?'picked':''}" data-react="${rk.k}"><span class="e">${rk.e}</span><span class="n">${n}</span></button>`;}).join("")}</div>`:""}
    <div class="between" style="max-width:420px;margin:0 auto 18px">
      <button class="btn sm ghost" data-act="reader-bookmark">${I.bookmark}Bookmark</button>
      <button class="btn sm ghost" data-act="reader-savequote">${I.quote}Save quote</button>
      <button class="btn sm ghost" data-act="reader-markread">${store.readMarked[ch.id]?I.check:'âœ“'}Mark read</button>
    </div>
    <div class="card tinted" style="max-width:440px;margin:0 auto">
      ${next?`<div class="between"><div style="min-width:0"><div class="faint" style="font-size:.7rem;text-transform:uppercase;letter-spacing:.1em">Next chapter</div><div style="font-family:var(--serif);font-weight:600;margin-top:2px">${next.title}</div><div class="faint" style="font-size:.74rem;margin-top:2px">${axInline(nr)} Â· ${next.readTime} min</div></div>${isReadable(nr)?`<button class="btn sm story" data-read="${next.id}">${I.play}Read</button>`:`<button class="btn sm" data-lock="${next.id}">${accessTag(nr)[3]}</button>`}</div>`
      :`<div class="center"><div class="faint" style="font-size:.74rem">You've reached the latest chapter.</div><button class="btn sm" data-nav="/story/${story.slug}/chapters" style="margin-top:8px">${I.list}Back to shelf</button></div>`}
    </div>
  </div>`;
}
const REACTIONS=[{k:"heart",e:"â¤ï¸",l:"Love"},{k:"gasp",e:"ðŸ˜®",l:"Gasp"},{k:"theory",e:"ðŸ’¡",l:"Theory"},{k:"tear",e:"ðŸ˜¢",l:"Tears"},{k:"next",e:"ðŸ”¥",l:"Need next"}];
const REACTION_SEED={};

function commentsBlock(chId){
  const list = (store.comments[chId]||[]).filter(c=>c.para===null||c.para===undefined);
  return `<div class="comments" id="cmtblock">
    <div class="section-head"><h2>Reader notes</h2><span class="faint" style="font-size:.74rem">${(store.comments[chId]||[]).length} total</span></div>
    <form class="cmt-form" data-cmt-form="${chId}"><input name="name" placeholder="Your name" style="max-width:130px"><input name="text" placeholder="Add a note about this chapterâ€¦" required><button class="btn sm story" type="submit">${I.msg}Post</button></form>
    <div>${list.slice().reverse().map(c=>commentHTML(c)).join("")||`<p class="faint" style="font-size:.82rem">Be the first to leave a note.</p>`}</div>
  </div>`;
}
function commentHTML(c){ return `<div class="cmt"><div class="ava" style="background:${c.color||'var(--accent)'}">${esc((c.name||"R").slice(0,1).toUpperCase())}</div><div class="body"><div class="who">${esc(c.name||"Reader")} <time>${esc(c.time||"just now")}</time></div><p>${esc(c.text)}</p></div></div>`; }

/* ============ RECAP ============ */
VIEWS.recap = function(){
  const s=bySlug(route.params.slug); if(!s) return notFound("Story"); setStoryAccent(s);
  if (!s.chapters.length) return `<a class="section-link" data-nav="/story/${s.slug}" style="color:var(--text-dim);display:inline-flex;gap:4px;align-items:center">${I.chevL}${s.title}</a><h1 class="page-title">Story Recap</h1><div class="empty"><div class="em">${I.info}</div><h3>No recap yet</h3><p>Publish chapters first, then the recap page will have chapter context.</p></div>`;
  return `<a class="section-link" data-nav="/story/${s.slug}" style="color:var(--text-dim);display:inline-flex;gap:4px;align-items:center">${I.chevL}${s.title}</a>
  <h1 class="page-title">Story Recap</h1>
  <p class="page-sub">Spoiler-controlled backend recap area.</p>
  <div class="card tinted" style="margin:14px 0"><div class="eyebrow">Spoiler-free premise</div><p class="muted" style="font-family:var(--serif);font-size:1rem;line-height:1.7;margin:8px 0 0">${esc(s.recapSafe || s.premise || "No public recap has been written yet.")}</p></div>
  <div class="empty"><div class="em">${I.list}</div><h3>No detailed recap yet</h3><p>Detailed recap text should come from backend-authored story/chapter metadata, not bundled sample prose.</p></div>
  <button class="btn story block" data-read="${s.chapters[0].id}">${I.play}Start / continue reading</button>`;
};

/* ============ EXTRAS ============ */
VIEWS.extras = function(){
  const s=bySlug(route.params.slug); if(!s) return notFound("Story"); setStoryAccent(s);
  return `<a class="section-link" data-nav="/story/${s.slug}" style="color:var(--text-dim);display:inline-flex;gap:4px;align-items:center">${I.chevL}${s.title}</a>
  <h1 class="page-title">Bonus Materials</h1>
  <p class="page-sub">Author notes, deleted scenes, lore, and art are backend-backed only.</p>
  <div class="empty"><div class="em">${I.spark}</div><h3>No extras yet</h3><p>No backend bonus-material feed is configured for this story yet.</p></div>`;
};

/* ============ STORY UPDATES ============ */
VIEWS.storyUpdates = function(){
  const s=bySlug(route.params.slug); if(!s) return notFound("Story"); setStoryAccent(s);
  const items=D.UPDATES.filter(u=>u.story===s.id);
  return `<a class="section-link" data-nav="/story/${s.slug}" style="color:var(--text-dim);display:inline-flex;gap:4px;align-items:center">${I.chevL}${s.title}</a>
  <h1 class="page-title">Story Updates</h1>
  <p class="page-sub">Releases, notes &amp; schedule for this story.</p>
  <div class="timeline">${items.map(u=>`<div class="tl-item"><div class="when">${u.when}</div><div class="what">${u.title}</div><div class="faint" style="font-size:.78rem">${u.note}</div></div>`).join("") || `<div class="empty"><div class="em">${I.feed}</div><h3>No story updates yet</h3><p>Updates will appear when this story has backend-backed release activity.</p></div>`}</div>`;
};
