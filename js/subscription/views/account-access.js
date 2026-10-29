/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ UPDATES FEED ============ */
VIEWS.updates = function(){
  const groups={};
  D.UPDATES.forEach(u=>{ (groups[u.when]=groups[u.when]||[]).push(u); });
  const rendered = Object.entries(groups).map(([g,items])=>`<div class="section"><div class="section-head"><h2>${esc(g)}</h2></div><div class="rh-chapter-grid rh-updates-grid">${items.map(curatedUpdateCard).join("")}</div></div>`).join("");
  return `<h1 class="page-title">Updates</h1><p class="page-sub">Everything new across the archive, access-aware.</p>
  
  ${rendered || `<div class="empty"><div class="em">${I.feed}</div><h3>No updates yet</h3><p>New chapter and access updates will appear here when they are posted.</p></div>`}`;
};

function curatedUpdateCard(update,index){
  const found=update.chapter?byId(update.chapter):null;
  if (!found?.ch) return updateRow(update);
  return homeReferenceChapterCard({chapter:found.ch},index,{storyTitle:found.story.title,note:update.note});
}

/* ============ CALENDAR ============ */
VIEWS.calendar = function(){
  return `<h1 class="page-title">Release Calendar</h1><p class="page-sub">Upcoming public and member releases.</p>
  <div class="empty"><div class="em">${I.calendar}</div><h3>No calendar entries</h3><p>A release calendar is not available. Find published chapters in Updates.</p></div>`;
};

/* ============ COLLECTIONS ============ */
VIEWS.collection = VIEWS.collections = function(){ return `<h1 class="page-title">Collections</h1><p class="page-sub">Curated story groups.</p><div class="empty"><div class="em">${I.layers}</div><h3>No collections</h3><p>Collections are not available. Browse the Library for all published stories.</p><button class="btn story" data-nav="/library">${I.library}Open Library</button></div>`; };

/* ============ VAULT ============ */
function readerAccessSummary(P=persona()){
  const state=P.admin?"admin":!P.signedIn?"guest":P.expired?"expired":P.pending?"pending":P.level>0?"active":"none";
  const labels={admin:"Admin access",guest:"Guest reader",expired:"Access expired",pending:"Checking access",active:"Membership active",none:"Free reader"};
  return {state,label:labels[state]};
}
function providerVerificationText(provider){
  const check=providerAccessStatus(provider);
  if(check?.state==="checking") return "Checking membership…";
  if(check?.state==="reconnect") return "Reconnect to verify your membership.";
  if(check?.state==="unavailable") return "Verification is unavailable. We will retry automatically.";
  const stamp=providerConnection(provider)?.last_synced_at;
  const date=stamp?new Date(stamp):null;
  return date && Number.isFinite(date.getTime()) ? "Last checked "+date.toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"}) : "No verification time available.";
}
VIEWS.vault = function(){
  const P=persona(), access=readerAccessSummary(P);
  const readable=countReadable();
  const locked=D.STORIES.reduce((n,s)=>n+s.chapters.filter(c=>!isReadable(chapterResolved(c))&&c.state!=="unavailable").length,0);
  const story=D.STORIES.find(s=>s.slug===D.PRIMARY_SLUG)||D.STORIES[0];
  const cover=story?homeSafeMediaUrl(story.cover_image_url||story.cover):"";
  const title=P.admin?"The archive is yours to explore." : P.level>0 ? (P.tier||"Member access") : P.pending ? "Finding your membership." : "There is more to the story.";
  const description=P.admin?"Your admin profile can read all published chapters. This is separate from a paid membership."
    : P.level>0 ? "Your membership is connected. Explore the chapters available to you, or manage your connections here."
    : P.pending?"Your provider is being checked. Your chapter access will update when verification finishes."
    : P.expired?"Your previous access has ended. Reconnect your membership to check whether it has renewed."
    : P.signedIn?"Read free chapters now. Connect a membership or use an access key to unlock more."
    : "Free chapters are open to everyone. Sign in to connect your membership or redeem an access key.";
  const providers=[["Patreon","patreon",patreonEnabled()],["Boosty via Discord","boosty_discord",boostyDiscordEnabled()]].filter(x=>x[2]);
  return `<div class="reader-workspace vault-page">
    ${readerPageHeading("The Vault","Your reading access, in one place.",`<a class="btn ghost" href="#/library" data-nav="/library">Explore the library ${I.chevR}</a>`)}
    <div class="vault-layout">
      <section class="vault-membership" aria-labelledby="vault-membership-title">
        <div class="vault-membership-body"><span class="reader-status" data-state="${access.state}">${access.state==='active'||access.state==='admin'?I.checkCirc:I.book}${esc(access.label)}</span>
          <h2 id="vault-membership-title">${esc(title)}</h2><p>${esc(description)}</p>
          ${P.signedIn?`<button class="btn ghost" data-sheet="persona">${I.user}Your account</button>`:`<button class="btn primary" data-sheet="persona">${I.user}Sign in to connect</button>`}
        </div>
        ${cover?`<figure class="vault-cover"><img src="${esc(cover)}" alt="${esc(story.title)}" loading="lazy"><figcaption>${esc(story.title)}</figcaption></figure>`:''}
        <dl class="vault-counts"><div><dt>Chapters you can read</dt><dd>${readable}</dd></div><div><dt>Member chapters locked</dt><dd>${locked}</dd></div></dl>
      </section>
      <section class="reader-panel vault-connections" aria-labelledby="vault-connections-title"><h2 id="vault-connections-title">Your connections</h2><p class="reader-note">Connect the account that holds your membership. Access is checked automatically.</p>
        <div class="provider-list">${providers.map(([name,key])=>providerCard(name,key,providerIsConnected(key),activeProviderTier(key),null,"Not connected")).join("")||'<p>No membership providers are currently available.</p>'}</div>
        <a class="reader-text-link" href="#/support/check-access" data-nav="/support/check-access">Check an access problem ${I.chevR}</a>
      </section>
      ${accessKeysEnabled()?`<section class="reader-panel vault-key" aria-labelledby="vault-key-title"><span class="reader-section-icon" aria-hidden="true">${I.key}</span><div><h2 id="vault-key-title">An invitation to read</h2><p class="reader-note">Have an access key? Redeem it securely to add its access to your account.</p><button class="btn ghost" data-sheet="redeem">Redeem a key ${I.chevR}</button></div></section>`:''}
      <aside class="vault-help"><h2>A little help?</h2><p class="reader-note">Already a member, but a chapter is still locked?</p><a href="#/support/wrong-account" data-nav="/support/wrong-account">Find the right account ${I.chevR}</a><a href="#/help" data-nav="/help">Read the access guide ${I.chevR}</a></aside>
      ${store.redeemedKeys.length?`<section class="reader-panel vault-records"><h2>Key redemption history</h2><p class="reader-note">A redemption record is not a guarantee of current access. Chapter availability reflects your verified access.</p><ul>${store.redeemedKeys.map(k=>`<li><span>${esc(k.label||"Access key")}<small>${esc(maskKey(String(k.code||"")))}</small></span><time>${esc(k.when||"Redeemed")}</time></li>`).join("")}</ul></section>`:''}
    </div>
  </div>`;
};
function activeProviderTier(provider){
  const key=String(provider||"").toLowerCase();
  const rows=activeEntitlements().filter(row=>String(row?.provider||row?.source||"").toLowerCase()===key).sort((a,b)=>Number(b.tier_rank||0)-Number(a.tier_rank||0));
  return rows[0]?.tier_name||rows[0]?.name||null;
}
function providerCard(name, key, connected, tier, since, note){
  const sheet=key==='patreon'?'connect-patreon':'connect-boosty';
  const syncAction=key==='patreon'?'resync':'resync-boosty';
  const verification=providerAccessStatus(key);
  const reconnect=verification?.state==='reconnect';
  return `<article class="reader-provider"><div class="reader-provider-heading"><span class="provider-monogram" aria-hidden="true">${key==='patreon'?'P':'B'}</span><div><h3>${esc(name)}</h3><span class="provider-state">${connected?'Connected':'Not connected'}</span></div></div>
    <p>${esc(connected?(tier||"Connected, no active site tier"):(note||"Connect your membership account."))}</p>
    ${connected||verification?`<p class="provider-verification">${esc(providerVerificationText(key))}</p>`:''}
    ${reconnect?`<button class="btn sm story" data-sheet="${sheet}">Reconnect ${esc(name)}</button>`:connected?`<button class="btn sm ghost" data-act="${syncAction}" ${verification?.state==='checking'?'disabled':''}>${I.sync}${verification?.state==='checking'?'Checking…':'Check membership'}</button>`:`<button class="btn sm story" data-sheet="${sheet}">Connect ${esc(name)} ${I.chevR}</button>`}
  </article>`;
}
function maskKey(c){ if(c.length<=4) return c; return "••••-••••-••••-"+c.slice(-4); }

/* ============ MY SHELF ============ */
VIEWS.shelf = function(){
  const reads=activeReads();
  return `<h1 class="page-title">My Shelf</h1><p class="page-sub">Your threads, saved things, and reader preferences.</p>
  <div class="section"><div class="section-head"><h2>Continue your threads</h2></div><div class="lane">${reads.map(({ch,story,prog})=>`<button class="card" style="width:210px;text-align:left;${storyAccentVars(story)}" data-read="${ch.id}"><div class="faint" style="font-size:.68rem;text-transform:uppercase">${story.title}</div><div style="font-family:var(--serif);font-weight:600;margin:2px 0 8px">${ch.title}</div>${progressBar(prog.pct)}<div class="faint" style="font-size:.7rem;margin-top:6px">Resume at: ${prog.scene}</div></button>`).join("")}</div></div>
  <div class="section"><div class="section-head"><h2>Followed</h2></div><div class="lane">${store.followed.map(id=>{const s=D.STORIES.find(story=>story.id===id)||bySlug(id);return s?storyCard(s):"";}).join("")}</div></div>
  <div class="quicklinks" style="margin:14px 0">
    <a data-nav="/bookmarks">${I.bookmark}<span>Bookmarks</span><small>${store.bookmarks.length} saved</small></a>
    <a data-nav="/quotes">${I.quote}<span>Saved quotes</span><small>${store.quotes.length} lines</small></a>
    <a data-nav="/history">${I.clock}<span>History</span><small>Recently read</small></a>
    <a href="#/settings" data-nav="/settings">${I.cog}<span>Settings</span><small>Site &amp; notifications</small></a>
  </div>
  <div class="section"><div class="section-head"><h2>Preview trail</h2></div>
    <div class="card"><p class="muted" style="font-size:.84rem;margin:0 0 10px">Chapters you've previewed but not yet unlocked.</p>${store.history.filter(h=>h.kind==="preview").map(h=>{const f=byId(h.chapterId);return f?`<div class="between" style="padding:6px 0;border-bottom:1px solid var(--border)"><div><div style="font-size:.86rem;font-weight:600">${h.title}</div><div class="faint" style="font-size:.72rem">${f.story.title}</div></div><button class="btn sm" data-lock="${h.chapterId}">${I.lockOpen}Unlock</button></div>`:"";}).join("")||`<p class="faint" style="font-size:.8rem">No active previews.</p>`}</div>
  </div>

  `;
};
VIEWS.bookmarks = function(){ return `<h1 class="page-title">Bookmarks</h1><p class="page-sub">${store.bookmarks.length} saved places across your reading.</p><div class="col-flex stagger">${store.bookmarks.map(b=>{const f=byId(b.chapterId);return `<div class="card" style="display:flex;gap:13px;align-items:center;${f?storyAccentVars(f.story):''}"><span class="ax unlocked" style="font-size:1.2rem"><span class="ic" style="width:22px;height:22px">${I.bookmarkFill}</span></span><div style="flex:1;min-width:0"><div style="font-family:var(--serif);font-style:italic">"${b.label}"</div><div class="faint" style="font-size:.74rem">${f?f.story.title+" · "+f.ch.title:""} · ${b.when}</div></div>${f?`<button class="btn sm story" data-read="${b.chapterId}">${I.play}Open</button>`:""}</div>`;}).join("")||emptyState("bookmark","No bookmarks yet","Save a place while reading with the bookmark button.")}</div>`; };
VIEWS.quotes = function(){ return `<h1 class="page-title">Saved Quotes</h1><p class="page-sub">${store.quotes.length} lines worth keeping.</p><div class="col-flex stagger">${store.quotes.map(q=>{const f=byId(q.chapterId);return `<div class="card tinted" style="${f?storyAccentVars(f.story):''}"><div style="display:flex;gap:10px"><span style="font-size:1.6rem;color:var(--s);line-height:.8">${I.quote}</span><div><p style="font-family:var(--serif);font-size:1rem;line-height:1.6;margin:0">${q.text}</p><div class="faint" style="font-size:.74rem;margin-top:8px">${f?f.story.title:""} · saved ${q.when}</div></div></div><div style="display:flex;gap:8px;margin-top:10px"><button class="btn sm ghost" data-copy="${esc(q.text)}">${I.copy}Copy</button></div></div>`;}).join("")||emptyState("quote","No quotes saved","Highlight text while reading to save a line.")}</div>`; };
VIEWS.history = function(){ return `<h1 class="page-title">Reading History</h1><p class="page-sub">Your private chronicle.</p><div class="timeline">${[...store.history].map(h=>{const f=byId(h.chapterId);return `<div class="tl-item"><div class="when">${h.when}</div><div class="what">${h.kind==='preview'?'Previewed':h.kind==='completed'?'Completed':'Read'}: ${h.title}</div><div class="faint" style="font-size:.78rem">${f?f.story.title:""}</div></div>`;}).join("")}</div>`; };

/* ============ NOTIFICATIONS ============ */
VIEWS.notifications = function(){
  const items=store.notifs;
  const kIcon={access:I.vault,chapter:I.bell};
  return `<div class="between"><div><h1 class="page-title">Notifications</h1><p class="page-sub">${items.filter(n=>!n.read).length} unread</p></div><button class="btn sm ghost" data-act="notif-prefs">${I.cog}Preferences</button></div>
  <div class="chips scroll" style="margin:8px 0 16px"><button class="btn sm ghost" data-act="refresh-notifications">${I.sync}Refresh</button><button class="btn sm ghost" data-act="mark-all-read">Mark all read</button></div>
  <div class="col-flex stagger">${items.length?items.map(n=>`<div class="card notification-card" style="${n.read?'opacity:.65':''}"><span class="notification-icon">${kIcon[n.k]||I.bell}</span><div class="notification-copy"><div class="notification-title">${esc(n.t)}</div><div class="faint notification-body">${esc(n.d)}</div><div class="faint notification-time">${esc(n.time)}</div></div><div class="notification-actions">${n.chapter||n.url?`<button class="btn sm" data-act="open-notification" data-notification-id="${n.id}" data-chapter-id="${n.chapter||''}" data-notification-url="${esc(n.url||'')}">Open</button>`:""}<button class="tb-btn" data-dismiss="${n.id}" aria-label="Dismiss">${I.x}</button></div></div>`).join(""):`<div class="empty"><div class="em">${I.bell}</div><h3>Nothing new</h3><p>New chapter alerts for your access tier will appear here.</p></div>`}</div>`;
};

/* ============ BENEFITS ============ */
VIEWS.benefits = function(){
  const b=[{i:"book",t:"Member chapters",d:"Read the chapters included in your current access tier."},{i:"spark",t:"The visual archive",d:"Explore published artwork, with mature collections available to eligible members."},{i:"eye",t:"Read your way",d:"Choose your chapter colors, text size and reading width."}];
  return `<h1 class="page-title">Membership Benefits</h1><p class="page-sub">What member access unlocks.</p>
  <div class="grid-stories" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-top:14px">${b.map(x=>`<div class="benefit-card"><span class="ic">${I[x.i]}</span><div><h4>${x.t}</h4><p>${x.d}</p></div></div>`).join("")}</div>
  <div class="card tinted" style="text-align:center"><div style="font-family:var(--serif);font-size:1.05rem;margin-bottom:8px">Want to unlock the archive?</div><button class="btn primary" data-sheet="connect-provider">${I.vault}Connect provider</button></div>`;
};

/* ============ ONBOARDING ============ */
VIEWS.onboarding = function(){
  return `<h1 class="page-title">Welcome to ${esc(SITE_NAME)}</h1><p class="page-sub">A quiet reading lounge for members of the archive.</p>
  <div class="section"><div class="section-head"><h2>Choose your first door</h2></div>
    <div class="quicklinks">
      <a data-nav="/library">${I.library}<span>Browse Library</span><small>All available stories</small></a>
      <a data-nav="/vault">${I.vault}<span>Check access</span><small>Memberships and keys</small></a>
      <a data-nav="/updates">${I.feed}<span>Latest updates</span><small>New chapters</small></a>
      <a data-nav="/help">${I.info}<span>Need help?</span><small>Access guide</small></a>
    </div>
  </div>
  <div class="section"><div class="section-head"><h2>How it works</h2></div>
    <div class="col-flex">
      ${[[I.library,"Browse the Library","Free chapters and previews, no account needed."],[I.book,"Read comfortably","Adjust type, theme & layout to your taste."],[I.vault,"Activate access","Sign in or redeem a key to unlock more."],[I.shelf,"Continue anywhere","Return to your saved place, bookmarks and quotes in this browser."]].map(([ic,t,d])=>`<div class="card" style="display:flex;gap:13px;align-items:center"><span class="ax unlocked" style="font-size:1.3rem"><span class="ic" style="width:24px;height:24px">${ic}</span></span><div><div style="font-weight:600">${t}</div><div class="faint" style="font-size:.78rem">${d}</div></div></div>`).join("")}
    </div>
  </div>
  <button class="btn primary block" data-nav="/">Enter the archive</button>`;
};
