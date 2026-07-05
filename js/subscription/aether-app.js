/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ init ============ */
function init(){
  // containers
  if(!document.querySelector(".scrim")){ const d=document.createElement("div"); d.className="scrim"; document.body.appendChild(d); }
  if(!document.querySelector(".toasts")){ const d=document.createElement("div"); d.className="toasts"; document.body.appendChild(d); }
  document.querySelector(".scrim").addEventListener("click",()=>closeSheet());
  delegate();
  window.addEventListener("hashchange", render);
  render();
  initAuth().then(async ()=>{ await loadBackendLibrary(); saveStore(); render(); if (authState.passwordRecovery && authState.user) setTimeout(() => openSheet(sheetUpdatePassword), 0); }).catch(err=>console.error("Auth bridge init failed", err));
  // welcome toast for first bridge load
  if(!LS.getItem("aether-welcomed")){ LS.setItem("aether-welcomed","1"); setTimeout(()=>toast(`Welcome to ${SITE_NAME}`,"Loading the published member library.",{icon:"spark",ms:6500}),900); }
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init); else init();
