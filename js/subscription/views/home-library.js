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
  if (P.expired) banner = accessBanner("expired","Your Aether Member access has expired","Some chapters are now locked. Renew to continue reading — a short grace window may still apply.","/vault","Renew access");
  else if (P.pending) banner = accessBanner("pending","We're verifying your access","Your Provider connection is syncing. This usually takes a moment — we'll update automatically.","/support/check-access","Check status");
  else if (P.noTier) banner = accessBanner("none","Your provider tier doesn't include access","You're connected, but your current tier doesn't unlock Aether Pages.","/benefits","See what unlocks");
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
          <div class="faint" style="font-size:.78rem;margin-bottom:8px">${tonights.ch.readTime-2} min left · you stopped near “${tonights.prog.scene}”</div>
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
    ${memberArchivePanel()}
    <div class="section">
      <div class="section-head"><h2>Newly available to you</h2></div>
      <div class="card" style="padding:14px">
        ${D.UPDATES.filter(u=>u.kind==="newly-available"||u.kind==="public-unlock").map(u=>`<div class="between" style="padding:6px 0"><div><div style="font-size:.86rem;font-weight:600">${u.title}</div><div class="faint" style="font-size:.72rem">${u.note}</div></div>${u.chapter?`<button class="btn sm story" data-read="${u.chapter}">Read</button>`:""}</div>`).join("")}
      </div>
    </div>
    <div class="section">
      <div class="section-head"><h2>Because you read…</h2></div>
      <div class="col-flex">
        ${D.STORIES.slice(1, 3).map(storyCardWide).join("") || `<p class="faint" style="font-size:.8rem">More recommendations will appear as the backend library grows.</p>`}
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
function memberArchivePanel(){
  const P=persona();
  const illus = D.STORIES.reduce((n,s)=>n+s.chapters.filter(hasImages).length,0);
  return `<div class="card tinted" style="margin-bottom:6px">
    <div class="between" style="margin-bottom:12px"><div class="eyebrow">Member Archive</div>${P.signedIn?badge("gold",P.tier||"Signed in"):badge("", "Guest")}</div>
    <div class="stat-grid">
      <div class="stat"><div class="n">${countReadable()}</div><div class="l">Readable now</div></div>
      <div class="stat"><div class="n">${totalComments()}</div><div class="l">Reader notes</div></div>
      <div class="stat"><div class="n">${illus}</div><div class="l">Illustrated</div></div>
      <div class="stat"><div class="n">${store.followed.length}</div><div class="l">Following</div></div>
    </div>
    <div class="quicklinks" style="margin-top:14px">
      <a data-nav="/my-shelf">${I.shelf}<span>My Shelf</span><small>Threads &amp; quotes</small></a>
      <a data-nav="/benefits">${I.spark}<span>Benefits</span><small>What access unlocks</small></a>
      <a data-nav="/support/check-access">${I.shield}<span>Access Check</span><small>Verify access</small></a>
      <a data-nav="/calendar">${I.calendar}<span>This Week</span><small>Releases</small></a>
    </div>
  </div>`;
}
function updateRow(u){
  const s=bySlug(u.story); if(!s) return "";
  const kindLabel={early:"Early access","public-unlock":"Public release","newly-available":"Newly unlocked","member-drop":"Member drop",note:"Author note",schedule:"Schedule",campaign:"Key campaign"}[u.kind]||"Update";
  const kColor={early:"early","public-unlock":"free","newly-available":"gold","member-drop":"key",note:"",schedule:"",campaign:"key"}[u.kind]||"";
  return `<div class="row" ${u.chapter?`data-read="${u.chapter}"`:`data-nav="/story/${s.slug}/updates"`}>
    <span class="ic-col" style="color:var(--${kColor||'text-dim'})">${u.chapter?I.feed:I.msg}</span>
    <span class="body"><span class="t"><span class="tt">${u.title}</span>${badge(kColor,kindLabel)}</span>
    <span class="sub">${meta([`<i>${I.clock}</i>${u.when}`,s.title,u.note])}</span></span>
    <span class="cta">${u.chapter?`<button class="btn sm" data-read="${u.chapter}">Read</button>`:`<span class="faint">${I.chevR}</span>`}</span>
  </div>`;
}

/* ============ LIBRARY ============ */
VIEWS.library = function(){
  const q=store.filters.q||""; const chips=store.filters.chips||[];
  const timeFilters=[["under10","Under 10 min"],["10-20","10–20 min"],["binge","Bingeable"]];
  const stateFilters=[["readable","Readable now"],["free","Free starts"],["preview","Previews"],["early","Early access"],["member","Member"],["key","Key content"]];
  const statusFilters=[["ongoing","Ongoing"],["completed","Completed"]];
  function matches(s){
    if(q){ const t=(s.title+" "+s.author+" "+s.genre+" "+s.tags.join(" ")).toLowerCase(); if(!t.includes(q.toLowerCase())) return false; }
    if(chips.includes("ongoing")&&s.status!=="ongoing") return false;
    if(chips.includes("completed")&&s.status!=="completed") return false;
    if(chips.includes("free")&&!s.chapters.some(c=>c.state==="free")) return false;
    if(chips.includes("member")&&!s.chapters.some(c=>c.tier)) return false;
    if(chips.includes("early")&&!s.chapters.some(c=>c.state==="early")) return false;
    if(chips.includes("preview")&&!s.chapters.some(c=>c.state==="preview")) return false;
    if(chips.includes("key")&&!s.chapters.some(c=>c.state==="key")) return false;
    if(chips.includes("readable")&&!s.chapters.some(c=>isReadable(chapterResolved(c)))) return false;
    if(chips.includes("under10")&&!s.chapters.some(c=>c.readTime<10)) return false;
    if(chips.includes("10-20")&&!s.chapters.some(c=>c.readTime>=10&&c.readTime<=20)) return false;
    return true;
  }
  const list=D.STORIES.filter(matches);
  return `
  <h1 class="page-title">The Library</h1>
  <p class="page-sub">${D.STORIES.length} stories across fantasy, gothic, and the far future.</p>
  <div style="position:relative;margin:6px 0 14px">
    <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-faint);display:flex">${I.search}</span>
    <input id="lib-search" class="pill-input" style="text-align:left;padding-left:42px" placeholder="Search stories, authors, genres…" value="${esc(q)}">
  </div>
  <div class="chips scroll" style="margin-bottom:8px">${stateFilters.map(([k,l])=>chip(l,"filter="+k,chips.includes(k))).join("")}${statusFilters.map(([k,l])=>chip(l,"filter="+k,chips.includes(k))).join("")}</div>
  <div class="chips scroll" style="margin-bottom:18px">${timeFilters.map(([k,l])=>chip(l,"filter="+k,chips.includes(k))).join("")}<a class="chip" data-nav="/collections">${I.layers}<span>Collections</span></a></div>
  <div class="section-head"><h2>${chips.length||q?"Results":"All stories"}</h2><span class="faint" style="font-size:.78rem">${list.length} shown</span></div>
  ${list.length?`<div class="grid-stories stagger">${list.map(storyCard).join("")}</div>`:`<div class="empty"><div class="em">📚</div><h3>No stories match</h3><p>Try clearing a filter or searching for something broader.</p><button class="btn" data-act="clear-filters">Clear filters</button></div>`}
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
  if (P.expired) banner = accessBanner("expired","Your Aether Member access has expired","Some chapters are now locked. Renew to continue reading.","/vault","Renew access");
  else if (P.pending) banner = accessBanner("pending","We're verifying your access","Your Provider connection is syncing — we'll update automatically.","/support/check-access","Check status");
  else if (P.noTier) banner = accessBanner("none","Your provider tier doesn't include access","You're connected, but your tier doesn't unlock Aether Pages.","/benefits","See what unlocks");
  else if (!P.signedIn) banner = accessBanner("anon","Browsing as a guest","Read free chapters and previews. Sign in or redeem a key to unlock more.","/vault","Activate access");
  const lastRead = activeReads().find(x=>x.story.id===primary.id);
  const pRead = primary.chapters.filter(c=>store.readMarked[c.id]||(store.progress[c.id]&&store.progress[c.id].pct>=100)).length;
  const pPct = primary.chapters.length ? Math.round(pRead/primary.chapters.length*100) : 0;
  const latestCh = primary.chapters[primary.chapters.length-1] || null;
  const startCh = lastRead?.ch.id || primary.chapters.find(c=>c.state==="free")?.id || primary.chapters[0]?.id || null;
  return `
  ${announcement()}
  ${banner}
  <div class="area-switch" style="margin:0 0 14px"><button class="active">${I.book}Reader</button>${isAdmin()?`<button data-nav="/studio/write">${I.overview}Author Studio</button><a class="btn sm ghost" href="admin.html">${I.shield}Admin CMS</a>`:""}</div>
  ${bookHero(primary, { startCh, lastRead, pPct, pRead, latestCh })}
  <div class="home-cols">
   <div style="min-width:0">
    <div class="section"><div class="section-head"><h2>What's new — ${primary.title}</h2><a class="section-link" data-nav="/story/${primary.slug}/updates">All ${I.chevR}</a></div><div class="feed stagger">${buildBookFeed(primary)}</div></div>
    ${reads.length?`<div class="section"><div class="section-head"><h2>Continue reading</h2><a class="section-link" data-nav="/my-shelf">My shelf ${I.chevR}</a></div><div class="lane stagger">${reads.slice(0,6).map(({ch,story,prog})=>{const next=story.chapters[story.chapters.indexOf(ch)+1];const nr=next?chapterResolved(next):null;return `<button class="card" style="width:220px;text-align:left;${storyAccentVars(story)}" data-read="${ch.id}"><div class="faint" style="font-size:.68rem;text-transform:uppercase;letter-spacing:.08em">${story.title}</div><div style="font-family:var(--serif);font-weight:600;margin:2px 0 6px">${ch.title}</div>${progressBar(prog.pct)}<div class="between" style="margin-top:8px"><span class="faint" style="font-size:.72rem">${prog.pct<100?prog.pct+'%':'Done'}</span>${nr?`<span class="faint" style="font-size:.68rem">Next: ${accessTag(nr)[1]}</span>`:""}</div></button>`;}).join("")}</div></div>`:""}
   </div>
   <div style="min-width:0">
    ${secondary?`<div class="section"><div class="section-head"><h2>Also reading</h2></div><a class="card tinted" data-nav="/story/${secondary.slug}" style="${storyAccentVars(secondary)};display:block"><div style="display:flex;gap:13px;align-items:center"><div style="width:58px;height:78px;border-radius:9px;overflow:hidden;flex:0 0 auto;border:1px solid var(--border)">${coverArt(secondary)}</div><div style="min-width:0;flex:1"><div style="font-family:var(--serif);font-weight:600;font-size:1.05rem">${secondary.title}</div><div class="faint" style="font-size:.76rem;margin-top:2px">${secondary.author} · ${secondary.genre}</div><div class="faint" style="font-size:.74rem;margin-top:6px">${secondary.tagline}</div></div></div><button class="btn sm story" style="margin-top:12px;width:100%">${I.book}Open story</button></a></div>`:""}
    ${memberArchivePanel()}
    <div class="section"><div class="section-head"><h2>Shorter works</h2></div><p class="faint" style="font-size:.76rem;margin:-4px 0 8px">Novellas, prequels &amp; bonus pieces beyond the main serials.</p><div class="lane">${shorter.map(storyCard).join("")}</div></div>
   </div>
  </div>
  <p class="faint center" style="font-size:.74rem;margin-top:18px">Deep lore, maps &amp; galleries live in the main author archive. <button class="btn sm ghost" data-act="main-archive" style="margin-left:6px">${I.external}Open the configured archive</button></p>`;
};
function bookHero(s, o){
  const hasChapters = !!o.latestCh;
  const r = hasChapters ? chapterResolved(o.latestCh) : null;
  return `<div class="book-hero" style="${storyAccentVars(s)}"><div class="bg">${coverArt(s)}</div><div class="grad"></div><div class="inner"><div class="top"><div class="cover">${coverArt(s)}</div><div class="htxt"><div class="eyebrow">${s.genre} &middot; ${s.status} &middot; ${s.arc}</div><h1>${s.title}</h1><div class="author">by ${s.author}</div></div></div><div class="progress-line"><div class="between" style="margin-bottom:6px"><span class="faint" style="font-size:.76rem">${o.pRead} / ${s.chapters.length} chapters read</span><span class="faint" style="font-size:.76rem">${o.pPct}%</span></div>${progressBar(o.pPct)}</div><div class="cta-row">${hasChapters?`<button class="btn primary" data-read="${o.startCh}">${o.lastRead?I.play+"Continue &mdash; "+o.lastRead.ch.title:I.play+"Start reading"}</button>`:`<button class="btn primary" data-nav="/story/${s.slug}/chapters">${I.book}Chapters coming soon</button>`}<a class="btn ghost sm" data-nav="/story/${s.slug}/chapters">${I.list}Shelf</a><a class="btn ghost sm" data-nav="/story/${s.slug}/recap">${I.info}Recap</a><a class="btn ghost sm" data-nav="/story/${s.slug}/extras">${I.spark}Extras</a></div>${hasChapters?`<div class="between" style="margin-top:12px"><span class="faint" style="font-size:.74rem">Latest: <b style="color:var(--text)">${o.latestCh.title}</b> &middot; ${axInline(r)}</span>${o.latestCh.publicDate?`<span class="badge early">${I.hourglass}Public ${fmtDate(o.latestCh.publicDate)}</span>`:""}</div>`:`<div class="faint" style="font-size:.78rem;margin-top:12px">This story is published. No chapters are published yet.</div>`}</div></div>`;
}
function buildBookFeed(s){
  const items = [];
  s.chapters.slice(-3).reverse().forEach(c=>{const r=chapterResolved(c);items.push({icon:I.play,color:"var(--accent)",tone:"accent",title:`New chapter — ${c.title}`,desc:`Chapter ${c.n} · ${c.readTime} min${c.state==='early'?' · early access for members':''}`,meta:[c.arc,isReadable(r)?"Readable now":accessTag(r)[1]],act:`data-read="${c.id}"`,cta:isReadable(r)?"Read":accessTag(r)[3]});});
  return items.map(it=>`<button class="feed-item" ${it.act||""}>${it.thumb?`<span class="fthumb">${D.FIG[it.thumb]||""}</span>`:`<span class="fico" style="background:color-mix(in srgb,${it.color} 16%, transparent);color:${it.color}">${it.icon}</span>`}<span class="fbody"><span class="ftop"><span class="ft">${it.title}</span></span><span class="fd">${it.desc}</span><span class="fmeta">${(it.meta||[]).map(m=>`<span>${m}</span>`).join("")}</span></span><span class="btn sm ${it.tone==='accent'?'story':''}" style="flex:0 0 auto">${it.cta}</span></button>`).join("");
}

function themeSwatches(){
  return `<div class="theme-swatches">${THEMES.map(t=>`<button class="swatch ${store.theme===t.id?'active':''}" data-site-theme="${t.id}"><span class="dot" style="background:${t.dot}"></span><span class="nm">${t.name}</span><span class="ck">${I.check}</span></button>`).join("")}</div>`;
}
