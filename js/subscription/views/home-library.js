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
function libraryStoryCard(s){
  const chapters = s.chapters || [];
  const readableCount = chapters.filter(c=>isReadable(chapterResolved(c))).length;
  const readCount = chapters.filter(c=>store.readMarked[c.id] || Number(store.progress[c.id]?.pct || 0) >= 100).length;
  const pct = chapters.length ? Math.round(readCount / chapters.length * 100) : 0;
  const followed = store.followed.includes(s.id) || store.followed.includes(s.slug);
  const summary = String(s.premise || s.tagline || "").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
  return `<article class="reader-panel library-story-card" style="${storyAccentVars(s)}">
    <a class="library-story-cover" href="#/story/${esc(s.slug)}" data-nav="/story/${esc(s.slug)}">${coverArt(s)}</a>
    <div class="library-story-body">
      <div class="rh-kicker">${esc([s.genre,s.status].filter(Boolean).join(" · "))}</div>
      <h3><a href="#/story/${esc(s.slug)}" data-nav="/story/${esc(s.slug)}">${esc(s.title)}</a></h3>
      <div class="library-story-author">by ${esc(s.author)}</div>
      ${summary?`<p class="reader-note">${esc(summary.slice(0,260))}${summary.length>260?"…":""}</p>`:""}
      <div class="library-story-stats">
        <span><b>${chapters.length}</b> chapter${chapters.length===1?"":"s"}</span>
        <span><b>${readableCount}</b> available to read</span>
        <span><b>${pct}%</b> completed</span>
      </div>
      ${progressBar(pct)}
      <div class="library-story-actions">
        <a class="btn story sm" href="#/story/${esc(s.slug)}" data-nav="/story/${esc(s.slug)}">${I.book}Open story</a>
        <a class="btn ghost sm" href="#/story/${esc(s.slug)}/chapters" data-nav="/story/${esc(s.slug)}/chapters">${I.list}Chapters</a>
        <button type="button" class="btn ghost sm" data-follow="${esc(s.id)}">${followed?I.checkCirc+"Following":I.plus+"Follow"}</button>
      </div>
    </div>
  </article>`;
}
VIEWS.library = function(){
  const q=store.filters.q||"";
  function matches(s){
    if(q){ const t=(s.title+" "+s.author+" "+s.genre+" "+(s.tags||[]).join(" ")).toLowerCase(); if(!t.includes(q.toLowerCase())) return false; }
    return true;
  }
  const list=D.STORIES.filter(matches);
  const pinned=store.followed.map(id=>D.STORIES.find(story=>story.id===id)||bySlug(id)).filter(Boolean);
  return `<div class="reader-workspace library-page">
    ${readerPageHeading("The Library",`${D.STORIES.length} published ${D.STORIES.length===1?"story":"stories"} in the archive.`,`<a class="btn ghost" href="#/updates" data-nav="/updates">Latest updates ${I.chevR}</a>`)}
    <div class="library-toolbar">
      <div class="library-search">
        <span class="library-search-icon" aria-hidden="true">${I.search}</span>
        <input id="lib-search" class="pill-input" placeholder="Search stories, authors, genres…" value="${esc(q)}" aria-label="Search library">
      </div>
      <span class="reader-note">${list.length} ${list.length===1?"story":"stories"} shown</span>
    </div>
    <section class="library-section" aria-labelledby="library-stories-heading">
      <div class="section-head"><h2 id="library-stories-heading">${q?"Matching stories":"All stories"}</h2></div>
      ${list.length?`<div class="library-showcase-grid">${list.map(libraryStoryCard).join("")}</div>`:readerEmptyState("library","No stories match","Try searching for a broader title, author, or genre.")}
    </section>
    <section class="library-section reader-panel" aria-labelledby="library-pinned-heading">
      <div class="section-head"><h2 id="library-pinned-heading">Pinned to My Shelf</h2><a class="reader-text-link" href="#/my-shelf" data-nav="/my-shelf">Open My Shelf ${I.chevR}</a></div>
      ${pinned.length?`<div class="grid-stories library-pinned-grid">${pinned.map(storyCard).join("")}</div>`:`<p class="reader-note">Follow a story to pin it to your shelf for quick access.</p>`}
    </section>
  </div>`;
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
          <button class="btn sm ghost" data-sheet="connect-provider" style="padding: 0 10px; height: 26px; font-size: 0.72rem;">
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
        ${patreonEnabled()?`<a data-act="resync" style="padding:10px;font-size:0.8rem;cursor:pointer">${I.sync}<span style="margin-top:4px">Sync Patreon</span></a>`:""}
        ${boostyDiscordEnabled()?`<a data-act="resync-boosty" style="padding:10px;font-size:0.8rem;cursor:pointer">${I.sync}<span style="margin-top:4px">Sync Boosty</span></a>`:""}
        <a data-sheet="settings" style="padding:10px;font-size:0.8rem;cursor:pointer">${I.cog}<span style="margin-top:4px">Settings</span></a>
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
  return `<article class="archive-feed-card archive-gallery-card ${homeFeedLayoutClass(index, "gallery", true)} ${galleryMatureBlurClass(image)}">
    <button class="archive-gallery-open" data-act="open-home-gallery" data-gallery-url="${esc(url)}" data-gallery-caption="${esc(caption)}" data-gallery-character="${esc(character)}" data-gallery-nsfw="${homeIsMatureGalleryImage(image)}" aria-label="View ${esc(caption)}">
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
  return `<article class="traditional-gallery-card ${galleryMatureBlurClass(image)}">
    <button data-act="open-home-gallery" data-gallery-url="${esc(url)}" data-gallery-caption="${esc(caption)}" data-gallery-character="${esc(character)}" data-gallery-nsfw="${homeIsMatureGalleryImage(image)}" aria-label="View ${esc(caption)}">
      <img src="${esc(thumbnailUrl)}" data-full-src="${thumbnailUrl!==url?esc(url):""}" alt="${esc(caption)}" loading="lazy" decoding="async" onerror="homeThumbnailFailed(this)">
    </button>
  </article>`;
}
let homeMasonryObserver = null;
function homeMasonrySpan(tileWidth, imageWidth, imageHeight){
  if (!(tileWidth > 0 && imageWidth > 0 && imageHeight > 0)) return 1;
  return Math.max(1, Math.ceil((tileWidth * imageHeight / imageWidth + 6) / 14));
}
function sizeHomeGalleryTiles(){
  if (homeMasonryObserver) { homeMasonryObserver.disconnect(); homeMasonryObserver = null; }
  document.querySelectorAll(".archive-gallery-card").forEach(card => {
    const image = card.querySelector(".archive-gallery-image");
    if (!image) return;
    const applySize = () => {
      if (!image.naturalWidth || !image.naturalHeight || !card.clientWidth) return;
      const rowHeight = window.innerWidth <= 760 ? 270 : 245;
      const desiredHeight = card.clientWidth * (image.naturalHeight / image.naturalWidth);
      const span = Math.max(1, Math.min(5, Math.ceil((desiredHeight + 10) / (rowHeight + 10))));
      card.style.gridRowEnd = `span ${span}`;
    };
    if (image.complete) applySize();
    else image.addEventListener("load", applySize, { once:true });
  });
  const masonry = document.querySelector(".rh-masonry");
  if (!masonry) return;
  const cards = [...masonry.querySelectorAll(".traditional-gallery-card")];
  const sizeCards = () => cards.forEach(card => {
    const image = card.querySelector("img");
    if (image?.naturalWidth && image.naturalHeight)
      card.style.gridRowEnd = `span ${homeMasonrySpan(card.clientWidth, image.naturalWidth, image.naturalHeight)}`;
  });
  cards.forEach(card => {
    const image = card.querySelector("img");
    if (image?.complete) sizeCards();
    else image?.addEventListener("load", sizeCards, {once:true});
  });
  if (typeof ResizeObserver !== "undefined") {
    let width = masonry.clientWidth;
    homeMasonryObserver = new ResizeObserver(() => {
      if (masonry.clientWidth !== width) { width = masonry.clientWidth; sizeCards(); }
    });
    homeMasonryObserver.observe(masonry);
  }
}
function homeGalleryImageSheet(url, caption, character, mature){
  const safeUrl = homeSafeMediaUrl(url);
  if (!safeUrl) return `<button type="button" class="close-x" data-act="close-sheet" aria-label="Close">${I.x}</button><div class="empty"><h3>Image unavailable</h3><p>This gallery image could not be opened.</p></div>`;
  return `<button type="button" class="close-x" data-act="close-sheet" aria-label="Close">${I.x}</button>
    <div class="home-gallery-sheet ${mature && homeCanViewMatureGallery() && !State.showR18?"nsfw-blurred":""}">
      <img src="${esc(safeUrl)}" alt="${esc(caption || character || "Gallery image")}">
      <div><div class="eyebrow">${esc(character || "Gallery")}</div><h3>${esc(caption || "Untitled artwork")}</h3></div>
    </div>`;
}
VIEWS.home = function(){
  const P = persona();
  const primary = bySlug(D.PRIMARY_SLUG) || D.STORIES[0];
  if (!primary) return backendSetupView();
  let banner = "";
  if (P.expired) banner = accessBanner("expired","Your member access has expired","Renew to continue reading member chapters.","/vault","Renew access");
  else if (P.pending) banner = accessBanner("pending","We're verifying your access","Your provider connection is syncing — we'll update automatically.","/support/check-access","Check status");
  else if (P.noTier) banner = accessBanner("none","Your provider tier doesn't include access","See which membership unlocks this library.","/benefits","See what unlocks");
  else if (!P.signedIn) banner = accessBanner("anon","Browsing as a guest","Read free chapters and previews. Sign in or redeem a key to unlock more.","/vault","Activate access");
  const lastRead = activeReads().find(item => item.story.id === primary.id);
  const firstReadable = primary.chapters.find(ch => isReadable(chapterResolved(ch)));
  const nextChapter = lastRead?.ch || firstReadable || primary.chapters[0];
  const nextAction = nextChapter ? (isReadable(chapterResolved(nextChapter)) || chapterResolved(nextChapter).state === "preview" ? `data-read="${esc(nextChapter.id)}"` : `data-lock="${esc(nextChapter.id)}"`) : `data-nav="/story/${esc(primary.slug)}/chapters"`;
  const readCount = primary.chapters.filter(ch => store.readMarked[ch.id] || Number(store.progress[ch.id]?.pct || 0) >= 100).length;
  const readPercent = primary.chapters.length ? Math.round(readCount / primary.chapters.length * 100) : 0;
  const words = primary.chapters.reduce((sum,ch) => sum + Number(ch.wordCount || ch.readTime * 220 || 0),0);
  const adultCount = primary.chapters.filter(ch => ch.is_nsfw).length;
  const summary = String(primary.premise || primary.tagline || "").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
  const gallery = homeGalleryItems(primary);
  const chapterItems = homeFeedItems(primary).filter(item => item.type === "chapter");
  const tierMap = new Map();
  chapterItems.forEach(({chapter:ch}) => tierMap.set(ch.required_tier_id || "free", !ch.required_tier_id ? "Free access" : (ch.required_tier_name || ch.tier || "Member access")));
  const tier = store.filters.homeTier || "all";
  const chapters = chapterItems.filter(({chapter:ch}) => tier === "all" || (ch.required_tier_id || "free") === tier);
  const layout = store.homeLayout === "multigrid" ? "multigrid" : "traditional";
  const mobileTab = State.homeMobileTab === "gallery" ? "gallery" : "chapters";
  const limit = Math.max(8,Number(store.homeFeedLimit || 8));
  const galleryLimit = Math.max(18,Number(State.homeGalleryLimit || 18));
  const mixed = homeFeedItems(primary);
  const filter = store.filters.homeFeed || "all";
  const mixedFiltered = mixed.filter(item => filter === "chapters" ? item.type === "chapter" : filter === "gallery" ? item.type === "gallery" : filter.startsWith("character:") ? item.type === "gallery" && item.image.character_id === filter.slice(10) : true);
  const characters = (D.CHARACTERS || []).filter(c => c.story_id === primary.id);
  const mixedFilters = [["all","All"],["chapters","Chapters"],["gallery","Gallery"],...characters.map(c => [`character:${c.id}`,c.name])];
  const followed = store.followed.includes(primary.id);
  return `${banner}<section class="rh-home" data-home-mobile="${mobileTab}">
    <section class="rh-hero">
      <div class="rh-cover">${coverArt(primary)}</div>
      <div class="rh-hero-copy">
        <div class="rh-kicker">${esc([primary.genre,primary.status].filter(Boolean).join(" · "))}</div>
        <h1>${esc(primary.title)}</h1>
        <div class="rh-author">by <strong>${esc(primary.author)}</strong></div>
        ${summary ? `<p>${esc(summary.slice(0,360))}${summary.length>360?"…":""}</p>` : ""}
        <div class="rh-actions">
          <button class="btn primary" ${nextAction}>${I.play}${lastRead?"Continue Reading":firstReadable?"Start Reading":nextChapter?"Unlock Chapters":"Browse Chapters"}</button>
          <button class="btn ghost" data-nav="/story/${esc(primary.slug)}/chapters">Browse Chapters</button>
          <button class="btn ghost" data-follow="${esc(primary.id)}">${followed?I.checkCirc:I.plus}${followed?"Following":"Follow Story"}</button>
        </div>
      </div>
      <aside class="rh-hero-aside">
        <div class="rh-kicker">Your reading journey</div>
        <div class="rh-progress-label"><strong>${readPercent}% read</strong><span>${readCount} / ${primary.chapters.length} chapters</span></div>
        ${progressBar(readPercent)}
        <div class="rh-stats"><div><b>${primary.chapters.length}</b><span>Chapters</span></div><div><b>${words>=1000?Math.round(words/1000).toLocaleString()+"K+":words.toLocaleString()}</b><span>Total words</span></div><div><b>${gallery.length}</b><span>Artworks</span></div></div>
        ${adultCount?`<small class="rh-content-note">${I.shield}${adultCount} adult chapter${adultCount===1?"":"s"} · existing access rules apply</small>`:""}
      </aside>
    </section>
    <div class="rh-switcher">
      <div><div class="rh-kicker">Story index + visual archive</div><h2>Continue exploring</h2></div>
      <div class="rh-switch-controls">
        <div class="rh-segmented" role="group" aria-label="Home archive layout">${[["traditional","Split archive"],["multigrid","Multigrid"]].map(([value,label])=>`<button data-act="home-layout" data-home-layout="${value}" aria-pressed="${layout===value}" class="${layout===value?"active":""}">${label}</button>`).join("")}</div>
      </div>
    </div>
    ${layout==="traditional"?`
      <div class="rh-mobile-tabs" role="group" aria-label="Home panels">${["chapters","gallery"].map(value=>`<button data-act="home-mobile-tab" data-home-tab="${value}" aria-pressed="${mobileTab===value}" class="${mobileTab===value?"active":""}">${value==="chapters"?"Chapters":"Gallery"}</button>`).join("")}</div>
      <div class="rh-split">
        <section class="rh-panel rh-chapters" id="home-chapters-panel">
          <header class="rh-panel-head"><div><div class="rh-kicker">Story index</div><h2>Latest Chapters</h2></div><span>${chapters.length} chapters</span></header>
          <div class="rh-filters" role="group" aria-label="Chapter access tier"><button data-act="home-tier" data-home-tier="all" class="${tier==="all"?"active":""}" aria-pressed="${tier==="all"}">All tiers</button>${[...tierMap].map(([id,name])=>`<button data-act="home-tier" data-home-tier="${esc(id)}" class="${tier===id?"active":""}" aria-pressed="${tier===id}">${esc(name)}</button>`).join("")}</div>
          <div class="rh-chapter-grid">${chapters.slice(0,limit).map((item,index)=>homeReferenceChapterCard(item,index)).join("") || `<div class="rh-empty"><h3>No matching chapters</h3><p>Published chapters for this tier will appear here.</p></div>`}</div>
          ${chapters.length>limit?`<button class="rh-panel-link" data-act="home-feed-load-more">Load more chapters (${chapters.length-limit} remaining) ${I.chevR}</button>`:""}
          <button class="rh-panel-link" data-nav="/story/${esc(primary.slug)}/chapters">Browse every chapter ${I.chevR}</button>
        </section>
        <section class="rh-panel rh-gallery" id="home-gallery-panel">
          <header class="rh-panel-head"><div><div class="rh-kicker">Visual archive</div><h2>Artwork</h2></div><span>${gallery.length} images</span></header>
          <div class="rh-gallery-alert"><button class="btn ghost" data-act="toggle-r18" aria-pressed="${homeCanViewMatureGallery() && !!State.showR18}">${homeCanViewMatureGallery() && State.showR18?"BLUR NSFW":"SHOW NSFW"}</button><button class="btn primary" data-nav="/gallery/${esc(primary.slug)}">Open Gallery ${I.external}</button></div>
          <div class="rh-masonry">${gallery.slice(0,galleryLimit).map(homeTraditionalGalleryCard).join("") || `<div class="rh-empty"><h3>No artwork yet</h3><p>Published artwork will appear here.</p></div>`}</div>
          ${gallery.length>galleryLimit?`<button class="rh-panel-link" data-act="home-gallery-load-more">Load more artwork (${gallery.length-galleryLimit} remaining) ${I.chevR}</button>`:""}
        </section>
      </div>`:`
      <div class="rh-filters" role="group" aria-label="Mixed feed filter"><button data-act="toggle-r18" aria-pressed="${homeCanViewMatureGallery() && !!State.showR18}">${homeCanViewMatureGallery() && State.showR18?"BLUR NSFW":"SHOW NSFW"}</button>${mixedFilters.map(([value,label])=>`<button data-act="home-feed-filter" data-feed-filter="${esc(value)}" class="${filter===value?"active":""}" aria-pressed="${filter===value}">${esc(label)}</button>`).join("")}</div>
      <div class="archive-feed-grid">${mixedFiltered.slice(0,limit).map((item,index)=>item.type==="gallery"?homeFeedGalleryCard(item,index):homeFeedChapterCard(item,index)).join("") || `<div class="rh-empty"><h3>Nothing published here yet</h3><p>No published content matches this filter.</p></div>`}</div>
      ${mixedFiltered.length>limit?`<button class="rh-panel-link" data-act="home-feed-load-more">Load more chapters &amp; artwork (${mixedFiltered.length-limit} remaining) ${I.chevR}</button>`:""}`}
    <nav class="rh-quick-links" aria-label="Story quick links">
      ${[["chapters","All Chapters","Browse the full story archive",I.book],["extras","Story Extras","Characters, artwork and lore",I.spark]].map(([path,title,desc,icon])=>`<a href="#/story/${esc(primary.slug)}/${path}" data-nav="/story/${esc(primary.slug)}/${path}"><span class="rh-qicon">${icon}</span><span><strong>${title}</strong><small>${desc}</small></span></a>`).join("")}
      <a href="#/benefits" data-nav="/benefits"><span class="rh-qicon">${I.key}</span><span><strong>Membership</strong><small>Support this archive</small></span></a>
      <button data-sheet="persona"><span class="rh-qicon">${I.user}</span><span><strong>Account</strong><small>Profile and reading history</small></span></button>
    </nav>
  </section>`;
};
function homeReferenceChapterCard(item,index,context){
  const ch = item.chapter;
  const access = chapterResolved(ch);
  const readable = isReadable(access);
  const pct = Math.min(100,Math.max(0,Number(store.progress[ch.id]?.pct || 0)));
  const read = !!store.readMarked[ch.id] || pct>=100;
  const status = read ? "Read" : pct>0 ? `Continue · ${Math.round(pct)}%` : "Unread";
  const tier = !ch.required_tier_id ? "Free access" : (ch.required_tier_name || ch.tier || "Member access");
  const numbered = String(ch.title || "").match(/^chapter\s+(\d+(?:\s*\+\s*\d+)?)\s*[:.\-–—]?\s*/i);
  const title = numbered ? String(ch.title).slice(numbered[0].length) || ch.title : ch.title;
  const displayNumber = numbered ? numbered[1].replace(/\s/g,"") : ch.n || "—";
  const action = readable || access.state==="preview" ? `data-read="${esc(ch.id)}"` : `data-lock="${esc(ch.id)}"`;
  const date = ch.publicDate || ch.updated_at || ch.created_at;
  return `<button class="rh-chapter ${read?"is-read":pct>0?"in-progress":"is-unread"} ${index===0?"is-featured":""}" style="${chapterTierStyle(ch)}" ${action} aria-label="${esc(ch.title)} — ${esc(readable?"Available":access.state==="preview"?"Preview":"Locked")}">
    <span class="rh-chapter-top"><span class="rh-chapter-num">${esc(displayNumber)}</span><span class="rh-chapter-labels"><span class="rh-tier">${esc(tier)}</span><span class="rh-read-state">${read?I.check:""}${esc(status)}</span></span></span>
    ${context?`<span class="rh-update-context">${esc(context.storyTitle)}</span>`:""}
    <h3>${esc(title)}</h3>${context?.note?`<span class="rh-update-note">${esc(context.note)}</span>`:""}<span class="rh-chapter-meta">${date?`<span>${I.clock}${esc(fmtDate(date))}</span>`:""}<span>${Number(ch.wordCount || ch.readTime*220 || 0).toLocaleString()} words</span>${ch.readTime?`<span>${ch.readTime} min</span>`:""}<span>${readable?I.play:access.state==="preview"?I.eye:I.lock}${readable?"Available":access.state==="preview"?"Preview":"Locked"}</span></span>
    <span class="rh-chapter-progress"><i style="width:${read?100:pct}%"></i></span></button>`;
}
let homePanelObserver = null;
function setupHomeArchive(){
  if (homePanelObserver) { homePanelObserver.disconnect(); homePanelObserver = null; }
  const chapters = document.getElementById("home-chapters-panel");
  const gallery = document.getElementById("home-gallery-panel");
  if (!chapters || !gallery) return;
  const sync = () => { gallery.style.height = window.innerWidth>920 ? chapters.getBoundingClientRect().height+"px" : ""; };
  sync();
  if (typeof ResizeObserver !== "undefined") { homePanelObserver = new ResizeObserver(sync); homePanelObserver.observe(chapters); }
}

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
