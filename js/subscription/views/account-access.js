/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ UPDATES FEED ============ */
VIEWS.updates = function(){
  const groups={};
  D.UPDATES.forEach(u=>{ (groups[u.when]=groups[u.when]||[]).push(u); });
  const rendered = Object.entries(groups).map(([g,items])=>`<div class="section"><div class="section-head"><h2>${g}</h2></div><div class="col-flex">${items.map(updateRow).join("")}</div></div>`).join("");
  return `<h1 class="page-title">Updates</h1><p class="page-sub">Everything new across the archive, access-aware.</p>
  <div class="chips scroll" style="margin:8px 0 18px"><a class="chip active">${I.feed}<span>All</span></a><a class="chip" data-nav="/calendar">${I.calendar}<span>Calendar</span></a></div>
  ${rendered || `<div class="empty"><div class="em">${I.feed}</div><h3>No updates yet</h3><p>New chapter and access updates will appear here when they are posted.</p></div>`}`;
};

/* ============ CALENDAR ============ */
VIEWS.calendar = function(){
  return `<h1 class="page-title">Release Calendar</h1><p class="page-sub">Upcoming public and member releases.</p>
  <div class="empty"><div class="em">${I.calendar}</div><h3>No calendar entries</h3><p>No release dates have been posted yet.</p></div>`;
};

/* ============ COLLECTIONS ============ */
VIEWS.collections = function(){ return `<h1 class="page-title">Collections</h1><p class="page-sub">Curated story groups.</p><div class="empty"><div class="em">${I.layers}</div><h3>No collections</h3><p>Collections have not been posted yet. Browse the Library for all available stories.</p><button class="btn story" data-nav="/library">${I.library}Open Library</button></div>`; };

/* ============ VAULT ============ */
VIEWS.vault = function(){
  const P=persona();
  const readable=countReadable();
  const early=D.STORIES.reduce((n,s)=>n+s.chapters.filter(c=>c.state==="early").length,0);
  const locked=D.STORIES.reduce((n,s)=>n+s.chapters.filter(c=>!isReadable(chapterResolved(c))&&c.state!=="unavailable").length,0);
  const state = P.admin?"admin":P.expired?"expired":P.pending?"pending":P.noTier?"none":P.level>0?"active":"none";
  const stateLabel={admin:"Admin access",active:"Active",expired:"Expired",pending:"Syncing",none:"No access"}[state];
  const providerConnected = P.provider && !P.admin && !P.expired && !P.pending && !P.noTier;
  const statusIcon = state==="active" || state==="admin" ? I.checkCirc : state==="expired" ? I.lock : state==="pending" ? I.sync : I.lock;
  return `
  <h1 class="page-title">The Vault</h1>
  <p class="page-sub">One place for every kind of access: Patreon memberships, access keys, and direct grants.</p>
  <div class="card tinted" style="margin:14px 0;display:flex;gap:14px;align-items:center">
    <span class="ax ${state==='active'||state==='admin'?'unlocked':state==='expired'?'expired':state==='pending'?'pending':'locked'}" style="font-size:1.6rem"><span class="ic" style="width:30px;height:30px">${statusIcon}</span></span>
    <div style="flex:1"><div class="eyebrow">Current access</div><div style="font-family:var(--serif);font-size:1.3rem;font-weight:700">${stateLabel}</div><div class="faint" style="font-size:.8rem">${P.admin?"Admin override &middot; Full published-reader access":P.tier?("via "+P.provider+" &middot; "+P.tier):P.signedIn?"Signed in, no active access":"Browsing as guest"}</div></div>
  </div>

  <div class="section"><div class="section-head"><h2>What your access unlocks</h2></div>
    <div class="stat-grid"><div class="stat"><div class="n">${readable}</div><div class="l">Readable chapters</div></div><div class="stat"><div class="n">${early}</div><div class="l">Early access</div></div><div class="stat"><div class="n">${D.STORIES.reduce((n,s)=>n+s.chapters.filter(c=>hasImages(c)).length,0)}</div><div class="l">Illustrated</div></div><div class="stat"><div class="n">${locked}</div><div class="l">Still locked</div></div></div>
  </div>

  <div class="section"><div class="section-head"><h2>Providers</h2></div>
    <div class="col-flex">
      ${P.admin?`<div class="card" style="display:flex;gap:13px;align-items:center"><span style="width:42px;height:42px;border-radius:11px;display:grid;place-items:center;background:var(--surface-2);color:var(--accent)">${I.shield}</span><div style="flex:1;min-width:0"><div style="font-weight:600">Admin override</div><div class="faint" style="font-size:.76rem">This profile can read every published subscription chapter without a member entitlement.</div></div><span class="badge free">${I.check}Active</span></div>`:""}
      ${patreonEnabled()?providerCard("Patreon","patreon",providerConnected,P.tier||null,P.since):`<div class="empty"><div class="em">${I.vault}</div><h3>No providers enabled</h3><p>Use an access key or contact support if you expected member access.</p></div>`}
    </div>
  </div>

  <div class="section"><div class="section-head"><h2>Redeem an access key</h2></div>
    <div class="card">
      <p class="muted" style="font-size:.84rem;margin:0 0 12px">Beta readers, reviewers, gifts &amp; campaigns use keys. Enter one to attach access to your account.</p>
      <div style="display:flex;gap:9px"><input id="key-input" class="pill-input" style="text-align:left;flex:1" placeholder="XXXX-XXXX-XXXX-XXXX"><button class="btn story" data-sheet="redeem">${I.key}Redeem</button></div>

    </div>
    ${store.redeemedKeys.length?`<div class="card" style="margin-top:12px"><div class="eyebrow" style="margin-bottom:8px">Redeemed keys</div>${store.redeemedKeys.map(k=>`<div class="between" style="padding:6px 0;border-bottom:1px solid var(--border)"><div><div style="font-size:.86rem;font-weight:600">${k.label}</div><div class="faint" style="font-size:.72rem;font-family:var(--ui);letter-spacing:.08em">${maskKey(k.code)}</div></div><span class="badge key">${I.key}Active</span></div>`).join("")}</div>`:""}
  </div>

  <div class="section"><div class="section-head"><h2>Access timeline</h2></div>
    <div class="card"><div class="timeline">
      ${store.redeemedKeys.length?store.redeemedKeys.map(k=>`<div class="tl-item"><div class="when">${esc(k.when || "Redeemed")}</div><div class="what">Access key redeemed${k.label?`: ${esc(k.label)}`:""}</div></div>`).join(""):`<p class="faint" style="font-size:.82rem;margin:0">No access events have been recorded for this account yet.</p>`}
    </div></div>
  </div>

  <div class="section"><div class="section-head"><h2>Troubleshoot &amp; verify</h2></div>
    <div class="quicklinks">
      <a data-nav="/support/check-access">${I.shield}<span>Health Check</span><small>Verify your access</small></a>
      <a data-nav="/support/wrong-account">${I.user}<span>Wrong account?</span><small>Recovery assistant</small></a>
      <a data-nav="/benefits">${I.spark}<span>Benefits</span><small>What's included</small></a>
      <a data-nav="/help">${I.info}<span>Help Center</span><small>Access glossary</small></a>
    </div>
  </div>
  <div class="card" style="display:flex;gap:11px;align-items:center;margin-top:8px"><span class="faint">${I.cog}</span><div style="flex:1"><div style="font-weight:600;font-size:.86rem">Account access</div><div class="faint" style="font-size:.74rem">If something looks wrong, run the access health check or reconnect Patreon.</div></div><button class="btn sm" data-nav="/support/check-access">Health check</button></div>
  `;
};
function providerCard(name, key, connected, tier, since, note){
  return `<div class="card" style="display:flex;gap:13px;align-items:center">
    <span style="width:42px;height:42px;border-radius:11px;display:grid;place-items:center;background:var(--surface-2);font-weight:700;font-size:.7rem;letter-spacing:.04em">${name.slice(0,2)}</span>
    <div style="flex:1;min-width:0"><div style="font-weight:600">${name}</div><div class="faint" style="font-size:.76rem">${connected?(tier||"Connected")+(since?" · since "+fmtDate(since):""):(note||"Not connected")}</div></div>
    ${connected?`<span class="badge free">${I.check}Connected</span>`:`<button class="btn sm ${key==='patreon'?'story':''}" ${key==='patreon'?'data-sheet="connect-patreon"':'disabled'}>${note?'Soon':'Connect'}</button>`}
  </div>`;
}
function maskKey(c){ if(c.length<=4) return c; return "••••-••••-••••-"+c.slice(-4); }

/* ============ MY SHELF ============ */
VIEWS.shelf = function(){
  const reads=activeReads();
  return `<h1 class="page-title">My Shelf</h1><p class="page-sub">Your threads, saved things, and reader preferences.</p>
  <div class="section"><div class="section-head"><h2>Continue your threads</h2></div><div class="lane">${reads.map(({ch,story,prog})=>`<button class="card" style="width:210px;text-align:left;${storyAccentVars(story)}" data-read="${ch.id}"><div class="faint" style="font-size:.68rem;text-transform:uppercase">${story.title}</div><div style="font-family:var(--serif);font-weight:600;margin:2px 0 8px">${ch.title}</div>${progressBar(prog.pct)}<div class="faint" style="font-size:.7rem;margin-top:6px">Resume at: ${prog.scene}</div></button>`).join("")}</div></div>
  <div class="section"><div class="section-head"><h2>Followed</h2></div><div class="lane">${store.followed.map(id=>{const s=bySlug(id);return s?storyCard(s):"";}).join("")}</div></div>
  <div class="quicklinks" style="margin:14px 0">
    <a data-nav="/bookmarks">${I.bookmark}<span>Bookmarks</span><small>${store.bookmarks.length} saved</small></a>
    <a data-nav="/quotes">${I.quote}<span>Saved quotes</span><small>${store.quotes.length} lines</small></a>
    <a data-nav="/history">${I.clock}<span>History</span><small>Recently read</small></a>
    <a data-sheet="settings">${I.aa}<span>Preferences</span><small>Reader settings</small></a>
  </div>
  <div class="section"><div class="section-head"><h2>Preview trail</h2></div>
    <div class="card"><p class="muted" style="font-size:.84rem;margin:0 0 10px">Chapters you've previewed but not yet unlocked.</p>${store.history.filter(h=>h.kind==="preview").map(h=>{const f=byId(h.chapterId);return f?`<div class="between" style="padding:6px 0;border-bottom:1px solid var(--border)"><div><div style="font-size:.86rem;font-weight:600">${h.title}</div><div class="faint" style="font-size:.72rem">${f.story.title}</div></div><button class="btn sm" data-lock="${h.chapterId}">${I.lockOpen}Unlock</button></div>`:"";}).join("")||`<p class="faint" style="font-size:.8rem">No active previews.</p>`}</div>
  </div>
  <div class="card" style="display:flex;gap:11px;align-items:center"><span class="faint">${I.download}</span><div style="flex:1"><div style="font-weight:600;font-size:.86rem">Offline queue</div><div class="faint" style="font-size:.74rem">Save chapters for transit reading while your access is active. Expires with access.</div></div><button class="btn sm ghost" data-act="offline-queue">Manage</button></div>
  `;
};
VIEWS.bookmarks = function(){ return `<h1 class="page-title">Bookmarks</h1><p class="page-sub">${store.bookmarks.length} saved places across your reading.</p><div class="col-flex stagger">${store.bookmarks.map(b=>{const f=byId(b.chapterId);return `<div class="card" style="display:flex;gap:13px;align-items:center;${f?storyAccentVars(f.story):''}"><span class="ax unlocked" style="font-size:1.2rem"><span class="ic" style="width:22px;height:22px">${I.bookmarkFill}</span></span><div style="flex:1;min-width:0"><div style="font-family:var(--serif);font-style:italic">"${b.label}"</div><div class="faint" style="font-size:.74rem">${f?f.story.title+" · "+f.ch.title:""} · ${b.when}</div></div>${f?`<button class="btn sm story" data-read="${b.chapterId}">${I.play}Open</button>`:""}</div>`;}).join("")||emptyState("bookmark","No bookmarks yet","Save a place while reading with the bookmark button.")}</div>`; };
VIEWS.quotes = function(){ return `<h1 class="page-title">Saved Quotes</h1><p class="page-sub">${store.quotes.length} lines worth keeping.</p><div class="col-flex stagger">${store.quotes.map(q=>{const f=byId(q.chapterId);return `<div class="card tinted" style="${f?storyAccentVars(f.story):''}"><div style="display:flex;gap:10px"><span style="font-size:1.6rem;color:var(--s);line-height:.8">${I.quote}</span><div><p style="font-family:var(--serif);font-size:1rem;line-height:1.6;margin:0">${q.text}</p><div class="faint" style="font-size:.74rem;margin-top:8px">${f?f.story.title:""} · saved ${q.when}</div></div></div><div style="display:flex;gap:8px;margin-top:10px"><button class="btn sm ghost" data-copy="${esc(q.text)}">${I.copy}Copy</button><button class="btn sm ghost" data-quote-card="${q.id}">${I.spark}Share card</button></div></div>`;}).join("")||emptyState("quote","No quotes saved","Highlight text while reading to save a line.")}</div>`; };
VIEWS.history = function(){ return `<h1 class="page-title">Reading History</h1><p class="page-sub">Your private chronicle.</p><div class="timeline">${[...store.history].map(h=>{const f=byId(h.chapterId);return `<div class="tl-item"><div class="when">${h.when}</div><div class="what">${h.kind==='preview'?'Previewed':h.kind==='completed'?'Completed':'Read'}: ${h.title}</div><div class="faint" style="font-size:.78rem">${f?f.story.title:""}</div></div>`;}).join("")}</div>`; };

/* ============ NOTIFICATIONS ============ */
VIEWS.notifications = function(){
  const items=store.notifs;
  const kIcon={access:I.vault,chapter:I.bell};
  return `<div class="between"><div><h1 class="page-title">Notifications</h1><p class="page-sub">${items.filter(n=>!n.read).length} unread</p></div><button class="btn sm ghost" data-act="notif-prefs">${I.cog}Preferences</button></div>
  <div class="chips scroll" style="margin:8px 0 16px"><button class="btn sm ghost" data-act="mark-all-read">Mark all read</button></div>
  <div class="col-flex stagger">${items.map(n=>`<div class="card" style="display:flex;gap:12px;align-items:flex-start;${n.read?'opacity:.65':''}"><span style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--surface-2);color:var(--accent)">${kIcon[n.k]||I.bell}</span><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:.9rem">${n.t}</div><div class="faint" style="font-size:.8rem;margin-top:1px">${n.d}</div><div class="faint" style="font-size:.7rem;margin-top:4px">${n.time}</div></div><div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">${n.chapter?`<button class="btn sm" data-read="${n.chapter}">Open</button>`:""}<button class="tb-btn" style="width:30px;height:30px" data-dismiss="${n.id}" aria-label="Dismiss">${I.x}</button></div></div>`).join("")}</div>`;
};

/* ============ BENEFITS ============ */
VIEWS.benefits = function(){
  const b=[{i:"hourglass",t:"Early access",d:"Read new chapters before public release."},{i:"book",t:"Member chapters",d:"Exclusive chapters not available on the public archive."},{i:"spark",t:"Bonus materials",d:"Author notes, deleted scenes, lore & art drops."},{i:"layers",t:"Complete seasons",d:"Binge finished stories start to end."},{i:"eye",t:"Previews",d:"Sample locked chapters before deciding."},{i:"msg",t:"Supporter notes",d:"Author notes attached to releases."}];
  return `<h1 class="page-title">Membership Benefits</h1><p class="page-sub">What member access unlocks.</p>
  <div class="grid-stories" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-top:14px">${b.map(x=>`<div class="benefit-card"><span class="ic">${I[x.i]}</span><div><h4>${x.t}</h4><p>${x.d}</p></div></div>`).join("")}</div>
  <div class="section"><div class="section-head"><h2>Your milestones</h2></div><div class="col-flex">${D.MILESTONES.length?D.MILESTONES.map(m=>`<div class="card" style="display:flex;gap:12px;align-items:center;${m.held?'':'opacity:.5'}"><span class="ax ${m.held?'unlocked':'locked'}" style="font-size:1.2rem"><span class="ic" style="width:22px;height:22px">${m.held?I.checkCirc:I.lock}</span></span><div style="flex:1"><div style="font-family:var(--serif);font-weight:600">${m.t}</div><div class="faint" style="font-size:.76rem">${m.d}</div></div>${m.held?badge("gold","Earned"):badge("","Locked")}</div>`).join(""):`<div class="empty"><div class="em">${I.spark}</div><h3>No milestones yet</h3><p>Milestones will appear as your account history grows.</p></div>`}</div></div>
  <div class="card tinted" style="text-align:center"><div style="font-family:var(--serif);font-size:1.05rem;margin-bottom:8px">Want to unlock the archive?</div><button class="btn primary" data-sheet="connect-patreon">${I.vault}Connect provider</button></div>`;
};

/* ============ ONBOARDING ============ */
VIEWS.onboarding = function(){
  return `<h1 class="page-title">Welcome to ${esc(SITE_NAME)}</h1><p class="page-sub">A quiet reading lounge for members of the archive.</p>
  <div class="section"><div class="section-head"><h2>Choose your first door</h2></div>
    <div class="quicklinks">
      <a data-nav="/library">${I.library}<span>Browse Library</span><small>All available stories</small></a>
      <a data-nav="/vault">${I.vault}<span>Check access</span><small>Patreon and keys</small></a>
      <a data-nav="/updates">${I.feed}<span>Latest updates</span><small>New chapters</small></a>
      <a data-nav="/help">${I.info}<span>Need help?</span><small>Access guide</small></a>
    </div>
  </div>
  <div class="section"><div class="section-head"><h2>How it works</h2></div>
    <div class="col-flex">
      ${[[I.library,"Browse the Library","Free chapters and previews, no account needed."],[I.book,"Read comfortably","Adjust type, theme & layout to your taste."],[I.vault,"Activate access","Sign in or redeem a key to unlock more."],[I.shelf,"Continue anywhere","Your place, bookmarks & quotes follow you."]].map(([ic,t,d])=>`<div class="card" style="display:flex;gap:13px;align-items:center"><span class="ax unlocked" style="font-size:1.3rem"><span class="ic" style="width:24px;height:24px">${ic}</span></span><div><div style="font-weight:600">${t}</div><div class="faint" style="font-size:.78rem">${d}</div></div></div>`).join("")}
    </div>
  </div>
  <button class="btn primary block" data-nav="/">Enter the archive</button>`;
};

