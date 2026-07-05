/* Modular reader guide overlay. Classic browser script; load after events.js and before aether-app.js. */
"use strict";

(function(){
  const GUIDE_KEY = "evilarchives-reader-guide-v1";
  const SEL = [
    {
      id: "access",
      routes: ["home","library","vault"],
      selector: ".access-chip, .bottomnav [data-nav='/vault'], .sidenav [data-nav='/vault']",
      title: "Check your access here",
      body: "Sign in, connect Patreon, or redeem a key from the Vault when a chapter asks for access."
    },
    {
      id: "library",
      routes: ["home","library"],
      selector: "[data-nav^='/story/'], .story-card",
      title: "Pick a story",
      body: "Open any story card to see its chapter catalog, unlock state, and progress."
    },
    {
      id: "story",
      routes: ["story"],
      selector: ".primary-cta-wrap .btn, .story-actions-group .btn",
      title: "Start or continue",
      body: "Use the large reading button first. The story hub also shows latest chapters, cast, and glossary."
    },
    {
      id: "reader",
      routes: ["read"],
      selector: ".reader-bar",
      title: "Reader tools live here",
      body: "Open settings, move chapters, bookmark, and jump to reader notes from the bottom toolbar."
    },
    {
      id: "comments",
      routes: ["read"],
      selector: "#cmtblock",
      title: "Leave a reader note",
      body: "Signed-in readers post with their profile name automatically. Notes are synced to Supabase."
    }
  ];

  let active = false;
  let idx = 0;
  let currentTarget = null;

  function enabled(){
    return typeof feature === "function" && feature("enableReaderGuides", true);
  }
  function dismissed(){
    try { return LS.getItem(GUIDE_KEY) === "dismissed"; } catch(e){ return true; }
  }
  function routeName(){
    return (typeof route === "object" && route && route.name) || "home";
  }
  function visible(el){
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  }
  function targetFor(step){
    return Array.from(document.querySelectorAll(step.selector)).find(visible) || null;
  }
  function stepsForRoute(){
    const name = routeName();
    return SEL.filter(step => step.routes.includes(name)).filter(step => targetFor(step));
  }
  function clear(){
    document.querySelectorAll(".guide-highlight").forEach(el => el.classList.remove("guide-highlight"));
    document.querySelector(".reader-guide")?.remove();
    currentTarget = null;
  }
  function dismiss(){
    try { LS.setItem(GUIDE_KEY, "dismissed"); } catch(e){}
    active = false;
    clear();
  }
  function renderStep(){
    clear();
    if (!enabled() || dismissed()) return;
    const steps = stepsForRoute();
    if (!steps.length) return;
    idx = Math.min(idx, steps.length - 1);
    const step = steps[idx];
    const target = targetFor(step);
    if (!target) return;
    currentTarget = target;
    target.classList.add("guide-highlight");
    target.scrollIntoView({ block:"nearest", inline:"nearest" });

    const box = document.createElement("div");
    box.className = "reader-guide";
    box.innerHTML = `
      <div class="guide-kicker">Reader guide ${idx + 1}/${steps.length}</div>
      <h3>${esc(step.title)}</h3>
      <p>${esc(step.body)}</p>
      <div class="guide-actions">
        <button class="btn sm ghost" type="button" data-guide-dismiss>Hide guide</button>
        <button class="btn sm story" type="button" data-guide-next>${idx + 1 >= steps.length ? "Done" : "Next"}</button>
      </div>`;
    document.body.appendChild(box);
  }
  function start(){
    if (!enabled()) return;
    active = true;
    idx = 0;
    renderStep();
  }
  function afterRender(){
    if (!enabled()) { clear(); return; }
    if (!active && !dismissed()) active = true;
    if (active) setTimeout(renderStep, 0);
  }

  document.addEventListener("click", evt => {
    if (evt.target.closest("[data-guide-dismiss]")) { evt.preventDefault(); dismiss(); }
    if (evt.target.closest("[data-guide-next]")) {
      evt.preventDefault();
      const steps = stepsForRoute();
      if (idx + 1 >= steps.length) dismiss();
      else { idx += 1; renderStep(); }
    }
  });

  window.ReaderGuides = { start, dismiss, afterRender };
})();
