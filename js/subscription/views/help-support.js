/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ HELP ============ */
VIEWS.help = function(){
  const q=[["Stuck on a loading screen?","Wait for the recovery buttons, then choose Try again. If that fails, Repair & reload clears site asset caches and requests a fresh copy while preserving your sign-in and reader preferences. If you were offline, reconnect first; the reader also retries automatically when the connection returns."],["Should I clear cookies?","Usually no. Clearing cookies or site storage can sign you out and erase reader preferences without fixing a network problem. Use Repair & reload first; sign out and back in only when Check access indicates an account problem."],["Why are chapters locked?","Some chapters are member-only, early-access, or key-locked. Free chapters are always open."],["How does provider sync work?","Patreon verifies membership directly. Boosty access is verified through the subscriber role that Boosty assigns to your connected Discord account."],["Why might a key fail?","Keys can be expired, already redeemed, at max use, or mistyped. Each has a clear message."],["What does expired access mean?","Your membership, verified role, or key is no longer active. Renew or sync to restore the chapters it unlocked."],["Wrong account?","If you signed in differently before, access may be on another reader or provider account. Use the Wrong Account assistant."]];
  return `<div class="reader-workspace help-page">
    ${readerPageHeading("Help Center", "Self-service recovery & explanations.", `<a class="btn ghost" href="#/support/check-access" data-nav="/support/check-access">${I.shield}Check access</a>`)}
    <div class="help-layout">
      <div class="help-main">
        <section class="reader-panel">
          <h2>Common questions</h2>
          <div class="reader-faq-list">
            ${q.map(([t,a])=>`<details class="reader-faq-item"><summary><span>${t}</span>${I.chevR}</summary><p class="reader-note">${a}</p></details>`).join("")}
          </div>
        </section>
        <section class="reader-panel">
          <h2>Features explained</h2>
          <div class="reader-support-grid">
            <div class="reader-feature-item"><h3>${I.eye} Previews</h3><p class="reader-note">Previews show real opening text. The rest of the chapter is never sent to your browser until access is verified.</p></div>
            <div class="reader-feature-item"><h3>${I.msg} Paragraph &amp; chapter comments</h3><p class="reader-note">Tap a paragraph chip to note a specific line, or leave a chapter note at the end. Chapter notes are available at the end of each chapter.</p></div>
            <div class="reader-feature-item"><h3>${I.spark} Illustrated chapters</h3><p class="reader-note">Some chapters include inline figures. Open a figure to view it in more detail.</p></div>
            <div class="reader-feature-item"><h3>${I.alert} Unavailable chapters</h3><p class="reader-note">A temporary connection, account-check, or server error can interrupt a chapter request. Use Try again, verify your connection, then use Check access if the problem continues.</p></div>
          </div>
        </section>
      </div>
      <aside class="help-aside">
        <section class="reader-panel">
          <h2>Self-service tools</h2>
          <div class="shelf-shortcut-list">
            <a href="#/support/check-access" data-nav="/support/check-access"><span class="shelf-shortcut-label">${I.shield}<span>Access Check</span></span><small>Diagnose now</small></a>
            <a href="#/support/wrong-account" data-nav="/support/wrong-account"><span class="shelf-shortcut-label">${I.user}<span>Wrong account?</span></span><small>Recovery flow</small></a>
            <a href="#/support/contact" data-nav="/support/contact"><span class="shelf-shortcut-label">${I.mail}<span>Contact support</span></span><small>Access details</small></a>
          </div>
        </section>
        <section class="reader-panel">
          <h2>Access-state glossary</h2>
          <div class="reader-glossary-list">
            ${D.GLOSSARY_STATES.map(g=>`<div class="reader-glossary-row"><span class="ax ${g.color==='good'?'free':g.color}">${I[g.icon]}</span><div><h3>${g.label}</h3><p class="reader-note">${g.d}</p></div></div>`).join("")}
          </div>
        </section>
      </aside>
    </div>
  </div>`;
};

/* ============ SUPPORT ============ */
VIEWS.checkAccess = function(){
  const P=persona(), access=readerAccessSummary(P);
  const providers=[["Patreon","patreon"],["Boosty via Discord","boosty_discord"]].filter(([,key])=>providerConnection(key));
  return `<div class="reader-workspace">${readerPageHeading("Check your access","A snapshot of your account and its latest recorded membership checks.")}
    <div class="reader-support-grid"><section class="reader-panel"><h2>Your reader account</h2><p class="reader-note">${esc(P.signedIn?store.email:"You are browsing without signing in.")}</p><span class="reader-status" data-state="${access.state}">${I.user}${esc(access.label)}</span><p>${esc(P.admin?"Admin reader override":P.tier||"Free chapters remain available.")}</p><button class="btn ghost" data-sheet="persona">${P.signedIn?'View account':'Sign in'}</button></section>
    <section class="reader-panel"><h2>Membership checks</h2>${providers.length?providers.map(([name,key])=>`<div class="reader-check-row"><h3>${name}</h3><p>${esc(providerIsConnected(key)?'Connected':'Not currently connected')}</p><p class="reader-note">${esc(providerVerificationText(key))}</p></div>`).join(""):'<p class="reader-note">No provider connection is recorded for this account.</p>'}<a class="btn ghost" href="#/vault" data-nav="/vault">Manage connections ${I.chevR}</a></section></div>
    <p class="reader-note">This page does not run a new verification or guarantee that a provider is reachable. Use your connection in the Vault to check again.</p>
    <a class="reader-text-link" href="#/support/wrong-account" data-nav="/support/wrong-account">Not seeing your membership? ${I.chevR}</a></div>`;
};
VIEWS.wrongAccount = function(){
  const steps=["Are you signed into the same reader account you used before? Check your email in the Vault.","For Patreon, connect the Patreon account that owns the membership.","For Boosty, connect the same Discord account in both Boosty and EvilArchives, and confirm Boosty assigned its subscriber role.","Access keys are tied to the account that redeemed them. Check that account before trying a different one.","Still stuck? Copy your access details and share them privately with the author."];
  return `<div class="reader-workspace">
    <nav class="reader-subnav" aria-label="Support navigation">
      <a class="reader-back-link" href="#/help" data-nav="/help">${I.chevL}<span>Help Center</span></a>
    </nav>
    ${readerPageHeading("Wrong Account Assistant", "Access on a different account? Follow these steps to recover it.")}
    <div class="reader-support-grid">
      <section class="reader-panel">
        <h2>Recovery checklist</h2>
        <div class="timeline">${steps.map((s,i)=>`<div class="tl-item"><div class="when">Step ${i+1}</div><div class="what">${s}</div></div>`).join("")}</div>
      </section>
      <section class="reader-panel">
        <h2>Reconnect or verify</h2>
        <p class="reader-note">Use the same provider or key account that originally unlocked your chapters.</p>
        <div class="col-flex" style="margin-top:16px">
          ${patreonEnabled()?`<button class="btn story" data-sheet="connect-patreon">${I.vault}Reconnect Patreon</button>`:""}
          ${boostyDiscordEnabled()?`<button class="btn story" data-sheet="connect-boosty">${I.msg}Reconnect Boosty through Discord</button>`:""}
          <button class="btn ghost" data-sheet="redeem">${I.key}Redeem key</button>
          <a class="btn ghost" href="#/support/contact" data-nav="/support/contact">${I.mail}Get support details</a>
        </div>
      </section>
    </div>
  </div>`;
};
VIEWS.contact = function(){
  const P=persona(), access=readerAccessSummary(P);
  const packet=["Account: "+(P.signedIn?store.email:"Not signed in"),"Access: "+access.label,"Tier: "+(P.tier||"None"),"Provider: "+(P.provider||"None")];
  for(const [name,key] of [["Patreon","patreon"],["Boosty","boosty_discord"]]) if(providerConnection(key)) packet.push(name+": "+providerVerificationText(key));
  return `<div class="reader-workspace">${readerPageHeading("Get help with access","Useful details to share privately with the author.")}
    <div class="reader-support-grid"><section class="reader-panel"><h2>Before you get in touch</h2><p>There is no support inbox on this site. Use the author's contact channel on your membership platform. Nothing is sent from this page.</p><p class="reader-note">The details include your account email. Review them before copying and share them only in a private message, never a public comment.</p><a class="reader-text-link" href="#/support/check-access" data-nav="/support/check-access">Check your account first ${I.chevR}</a></section>
    <section class="reader-panel"><h2>Your access details</h2><pre class="reader-support-packet">${esc(packet.join("\n"))}</pre><button class="btn ghost" data-copy="${esc(packet.join("\n"))}">${I.copy}Copy details</button></section></div></div>`;
};

function notFound(what){ return `<div class="reader-workspace">${readerEmptyState("shield", `${esc(what)} not found`, "This may have moved or been archived.", `<a class="btn ghost" href="#/" data-nav="/">Back home</a>`)}</div>`; }
function emptyState(ic,title,sub){ return readerEmptyState({bookmark:"bookmark",quote:"quote"}[ic]||"book", title, sub); }

