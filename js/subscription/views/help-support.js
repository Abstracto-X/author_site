/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ HELP ============ */
VIEWS.help = function(){
  const q=[["Why are chapters locked?","Some chapters are member-only, early-access, or key-locked. Free chapters are always open."],["How does Provider sync work?","When you connect Patreon, we verify your membership. This usually takes a moment; the app checks automatically."],["Why might a key fail?","Keys can be expired, already redeemed, at max use, or mistyped. Each has a clear message."],["What does expired access mean?","Your membership or key is no longer active. Renew to restore the chapters it unlocked."],["Wrong account?","If you signed in differently before, access may be on another account. Use the Wrong Account assistant."]];
  return `<h1 class="page-title">Help Center</h1><p class="page-sub">Self-service recovery & explanations.</p>
  <div class="quicklinks" style="margin:14px 0">
    <a data-nav="/support/check-access">${I.shield}<span>Access Check</span><small>Diagnose now</small></a>
    <a data-nav="/support/wrong-account">${I.user}<span>Wrong account?</span><small>Recovery flow</small></a>
    <a data-nav="/support/contact">${I.mail}<span>Contact support</span><small>With context packet</small></a>
  </div>
  <div class="section"><div class="section-head"><h2>Access-state glossary</h2></div><div class="col-flex">${D.GLOSSARY_STATES.map(g=>`<div class="card" style="display:flex;gap:12px;align-items:center"><span class="ax ${g.color==='good'?'free':g.color}" style="font-size:1.2rem"><span class="ic" style="width:22px;height:22px">${I[g.icon]}</span></span><div style="flex:1"><div style="font-weight:600;font-size:.9rem">${g.label}</div><div class="faint" style="font-size:.78rem">${g.d}</div></div></div>`).join("")}</div></div>
  <div class="section"><div class="section-head"><h2>Common questions</h2></div><div class="col-flex">${q.map(([t,a])=>`<details class="card" style="padding:0"><summary style="padding:14px 16px;cursor:pointer;font-weight:600;font-size:.9rem;list-style:none;display:flex;justify-content:space-between;align-items:center">${t}${I.chevR}</summary><div style="padding:0 16px 14px" class="muted" >${a}</div></details>`).join("")}</div></div>
  <div class="section"><div class="section-head"><h2>Features explained</h2></div><div class="col-flex">
    <div class="card"><div style="font-weight:600;margin-bottom:4px">${I.eye} Previews</div><p class="muted" style="font-size:.82rem;margin:0">Previews show real opening text. The rest of the chapter is never sent to your browser until access is verified — no fake blur.</p></div>
    <div class="card"><div style="font-weight:600;margin-bottom:4px">${I.msg} Paragraph &amp; chapter comments</div><p class="muted" style="font-size:.82rem;margin:0">Tap a paragraph chip to note a specific line, or leave a chapter note at the end. Toggle chips in reader settings.</p></div>
    <div class="card"><div style="font-weight:600;margin-bottom:4px">${I.spark} Illustrated chapters</div><p class="muted" style="font-size:.82rem;margin:0">Some chapters include inline figures. Hide them in reader settings if you prefer pure text.</p></div>
    <div class="card"><div style="font-weight:600;margin-bottom:4px">${I.alert} Unavailable chapters</div><p class="muted" style="font-size:.82rem;margin:0">Occasionally a chapter is being revised. It returns — try again later, or contact support.</p></div>
  </div></div>`;
};

/* ============ SUPPORT ============ */
VIEWS.checkAccess = function(){
  const P=persona();
  return `<a class="section-link" data-nav="/help" style="color:var(--text-dim);display:inline-flex;gap:4px;align-items:center">${I.chevL}Help</a>
  <h1 class="page-title">Access Health Check</h1><p class="page-sub">A guided check of your access — no jargon.</p>
  <div class="card tinted" style="margin:14px 0"><div class="between"><div><div class="eyebrow">Signed-in account</div><div style="font-family:var(--serif);font-weight:600">${P.signedIn?store.email:"Not signed in"}</div></div>${P.signedIn?badge("free",I.check+"Verified"):badge("","Guest")}</div></div>
  <div class="timeline">
    <div class="tl-item"><div class="when">Step 1</div><div class="what">Account verified</div><div class="faint" style="font-size:.78rem">${P.signedIn?"You're signed in.":"Sign in to continue."}</div></div>
    <div class="tl-item ${P.provider?'':'warn'}"><div class="when">Step 2</div><div class="what">Provider: ${P.provider||"none connected"}</div><div class="faint" style="font-size:.78rem">${P.provider?"Connected.":"Connect provider or redeem a key."}</div></div>
    <div class="tl-item ${P.pending?'warn':''}"><div class="when">Step 3</div><div class="what">${P.pending?"Sync in progress":"Last sync: just now"}</div><div class="faint" style="font-size:.78rem">${P.pending?"Verifying your tier — automatic.":"Access is up to date."}</div></div>
    <div class="tl-item ${P.level>0||store.grantedKey?'':'bad'}"><div class="when">Step 4</div><div class="what">${P.tier||"Tier"} ${P.noTier?"(not qualifying)":""}</div><div class="faint" style="font-size:.78rem">${P.level>0?"Qualifies for Aether Pages.":P.noTier?"This tier doesn't include access.":"No active tier."}</div></div>
  </div>
  <div class="col-flex" style="margin-top:14px">
    ${P.provider?`<button class="btn ghost" data-act="resync">${I.sync}Re-run sync</button>`:`<button class="btn story" data-sheet="connect-patreon">${I.vault}Connect provider</button>`}
    <button class="btn ghost" data-sheet="redeem">${I.key}Try a key instead</button>
    <button class="btn ghost" data-nav="/support/wrong-account">${I.user}Not seeing your access?</button>
  </div>`;
};
VIEWS.wrongAccount = function(){
  const steps=["Are you signed into the same Aether Pages account you used before? Check your email in the Vault.","Is your connected Patreon the right one? Patreon links via the Patreon API, not by matching emails.","Try reconnecting Patreon from the Vault.","Or redeem your access key again — it binds to this account.","Still stuck? Send a support packet with one tap."];
  return `<a class="section-link" data-nav="/help" style="color:var(--text-dim);display:inline-flex;gap:4px;align-items:center">${I.chevL}Help</a>
  <h1 class="page-title">Wrong Account Assistant</h1><p class="page-sub">Access on a different account? Let's recover it.</p>
  <div class="timeline">${steps.map((s,i)=>`<div class="tl-item"><div class="when">Step ${i+1}</div><div class="what">${s}</div></div>`).join("")}</div>
  <div class="col-flex" style="margin-top:14px"><button class="btn story" data-sheet="connect-patreon">${I.vault}Reconnect Patreon</button><button class="btn ghost" data-sheet="redeem">${I.key}Redeem key</button><button class="btn ghost" data-nav="/support/contact">${I.mail}Send support packet</button></div>`;
};
VIEWS.contact = function(){
  const P=persona();
  const pkt=["Account: "+(P.signedIn?store.email:"(not signed in)"),"Access: "+(P.tier||P.expired?"expired":P.pending?"sync pending":P.noTier?"no qualifying tier":"none"),"Provider: "+(P.provider||"none"),"Last sync: just now","Masked key suffix: "+(store.redeemedKeys[0]?"…"+store.redeemedKeys[0].code.slice(-4):"none")];
  return `<a class="section-link" data-nav="/help" style="color:var(--text-dim);display:inline-flex;gap:4px;align-items:center">${I.chevL}Help</a>
  <h1 class="page-title">Contact Support</h1><p class="page-sub">We'll attach a context packet so you don't have to explain everything.</p>
  <div class="card" style="margin:14px 0"><div class="eyebrow" style="margin-bottom:8px">Auto-attached packet (no secrets)</div><div style="font-family:var(--ui);font-size:.78rem;line-height:1.8">${pkt.map(p=>`<div>${esc(p)}</div>`).join("")}</div></div>
  <form data-contact-form><div class="col-flex"><input class="pill-input" style="text-align:left" name="subject" placeholder="Subject"><textarea name="msg" rows="4" style="background:var(--surface);border:1px solid var(--border-2);border-radius:var(--radius-sm);padding:13px;font-size:.9rem" placeholder="What's going on?"></textarea><button class="btn story" type="submit">${I.mail}Send to support</button></div></form>
  <div class="card" style="margin-top:14px;display:flex;gap:11px;align-items:center"><span class="faint">${I.msg}</span><div style="flex:1"><div style="font-weight:600;font-size:.86rem">Prefer real-time?</div><div class="faint" style="font-size:.74rem">The archive Discord has a #aether-pages-help channel.</div></div><button class="btn sm ghost" data-act="external-discord">${I.external}</button></div>`;
};

function notFound(what){ return `<div class="empty" style="padding-top:80px"><div class="em">🛡️</div><h3>${what} not found</h3><p>This may have moved or been archived.</p><button class="btn" data-nav="/">Back home</button></div>`; }
function emptyState(ic,title,sub){ return `<div class="empty"><div class="em">${ {bookmark:"🔖",quote:"❝"}[ic]||"📭" }</div><h3>${title}</h3><p>${sub}</p></div>`; }
