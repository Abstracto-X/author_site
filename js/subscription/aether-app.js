/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ init ============ */
async function bootstrapReaderData(){
  let authTimedOut = false;
  const authPromise = Promise.resolve().then(()=>initAuth()).catch(err=>{
    authState.ready = true;
    authState.error = err;
    console.error("Auth initialization failed; continuing with the public library.", err);
  });
  await Promise.race([
    authPromise,
    new Promise(resolve => window.setTimeout(() => {
      if (authState.ready) return resolve();
      authTimedOut = true;
      authState.ready = true;
      const error = new Error("Account verification took too long. The public library will load while sign-in recovery continues.");
      error.code = "reader_auth_timeout";
      authState.error = error;
      resolve();
    }, 12000))
  ]);
  await loadBackendLibrary();
  if (typeof startReaderNotificationPolling === "function") startReaderNotificationPolling();
  saveStore();
  render();
  if (authState.passwordRecovery && authState.user) setTimeout(() => openSheet(sheetUpdatePassword), 0);
  if (authTimedOut) {
    authPromise.then(async () => {
      if (authState.error?.code === "reader_auth_timeout") authState.error = null;
      await loadBackendLibrary({ force:true });
      saveStore();
      render();
    }).catch(err => console.error("Delayed auth recovery failed", err));
  }
}
function init(){
  // containers
  if(!document.querySelector(".scrim")){ const d=document.createElement("div"); d.className="scrim"; document.body.appendChild(d); }
  if(!document.querySelector(".toasts")){ const d=document.createElement("div"); d.className="toasts"; document.body.appendChild(d); }
  document.querySelector(".scrim").addEventListener("click",()=>closeSheet());
  delegate();
  window.addEventListener("hashchange", render);
  render();
  bootstrapReaderData().catch(err=>{
    console.error("Reader data bootstrap failed", err);
    backendState.error = err;
    backendState.loaded = false;
    render();
  });
  // welcome toast for first bridge load
  if(!LS.getItem("aether-welcomed")){ LS.setItem("aether-welcomed","1"); setTimeout(()=>toast(`Welcome to ${SITE_NAME}`,"Loading the published member library.",{icon:"spark",ms:6500}),900); }
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init); else init();
