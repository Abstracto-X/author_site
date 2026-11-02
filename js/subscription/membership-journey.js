/* Reader membership welcome flow. The decorations below are intentionally not access data. */
"use strict";

const MEMBERSHIP_WELCOME_KEY = "aether-membership-welcome-v1";
let membershipEmailMode = "signin";
const MEMBERSHIP_TIERS = [
  { name:"Resident Licker", className:"licker", mark:"I" },
  { name:"Resident Tyrant", className:"tyrant", mark:"II" },
  { name:"Resident Nemesis", className:"nemesis", mark:"III" },
  { name:"Resident Evil", className:"evil", mark:"IV" }
];
const PROFILE_FRAMES = [
  { id:"licker", label:"Resident Licker", tierIndex:0 },
  { id:"tyrant", label:"Resident Tyrant", tierIndex:1 },
  { id:"nemesis", label:"Resident Nemesis", tierIndex:2 },
  { id:"evil-crimson", label:"Resident Evil · Crimson Crest", tierIndex:3 },
  { id:"evil-haunting", label:"Resident Evil · Haunted Estate", tierIndex:3 }
];
const profileFrameImages = new Map();
const PROFILE_FRAME_ART = {
  licker:{ src:"assets/profile-frames/member-tiers.png", slice:0 },
  tyrant:{ src:"assets/profile-frames/member-tiers.png", slice:1 },
  nemesis:{ src:"assets/profile-frames/member-tiers.png", slice:2 },
  "evil-crimson":{ src:"assets/profile-frames/resident-evil-crimson.png" },
  "evil-haunting":{ src:"assets/profile-frames/resident-evil-haunting.png" }
};

function loadProfileFrameArt(src){
  if (!profileFrameImages.has(src)) {
    profileFrameImages.set(src, new Promise((resolve,reject)=>{
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => { profileFrameImages.delete(src); reject(new Error("Profile frame unavailable")); };
      image.src = src;
    }));
  }
  return profileFrameImages.get(src);
}
async function renderProfileFrame(canvas, frameId){
  const art = PROFILE_FRAME_ART[frameId];
  if (!canvas || !art) return;
  const cssSize = canvas.clientWidth; // Layout width, unaffected by the sheet's opening transform.
  if (!cssSize) return;
  const pixelSize = Math.round(cssSize * Math.min(window.devicePixelRatio || 1, 3));
  if (canvas.dataset.rendered === frameId && canvas.width === pixelSize && canvas.height === pixelSize) return;
  if (canvas.dataset.rendered !== frameId) {
    canvas.width = canvas.width; // Clear the previous selection while the new source loads.
    delete canvas.dataset.rendered;
  }
  try {
    const image = await loadProfileFrameArt(art.src);
    if (!canvas.isConnected || canvas.closest("[data-frame]")?.dataset.frame !== frameId) return;
    canvas.width = pixelSize;
    canvas.height = pixelSize;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const sourceWidth = art.slice == null ? image.naturalWidth : image.naturalWidth / 3;
    context.drawImage(image, (art.slice || 0) * sourceWidth, 0, sourceWidth, image.naturalHeight, 0, 0, pixelSize, pixelSize);
    canvas.dataset.rendered = frameId;
  } catch (_) { /* The CSS image remains as a fallback if canvas rendering fails. */ }
}

function membershipTier(name){
  const value = String(name || "").toLowerCase();
  return MEMBERSHIP_TIERS.find(tier => value.includes(tier.name.toLowerCase())) || null;
}
function membershipTierCards(){
  return MEMBERSHIP_TIERS.map(tier => `<div class="membership-tier ${tier.className}"><span class="membership-tier-art" aria-hidden="true">${tier.mark}</span><div><strong>${tier.name}</strong><small>Explore this tier on the membership page</small></div></div>`).join("");
}
function availableProfileFrames(){
  if (!authState.user) return [];
  const tierIndex = Math.max(-1, ...activeEntitlements().map(entitlement =>
    MEMBERSHIP_TIERS.indexOf(membershipTier(entitlement.tier_name || entitlement.name || entitlement.tier))));
  return tierIndex < 0 ? [] : PROFILE_FRAMES.filter(frame => frame.tierIndex <= tierIndex);
}
function profileFrameStorageKey(){ return `aether-profile-frame-v1:${authState.user?.id || ""}`; }
function selectedProfileFrame(frames = availableProfileFrames()){
  if (!frames.length) return null;
  const saved = LS.getItem(profileFrameStorageKey());
  return frames.find(frame => frame.id === saved) || frames.find(frame => frame.tierIndex === frames[frames.length - 1].tierIndex) || frames[0];
}
function shiftProfileFrame(direction){
  const frames = availableProfileFrames();
  if (!frames.length) return null;
  const index = Math.max(0, frames.findIndex(frame => frame.id === selectedProfileFrame(frames)?.id));
  const next = frames[(index + (direction < 0 ? -1 : 1) + frames.length) % frames.length];
  LS.setItem(profileFrameStorageKey(), next.id);
  return next;
}
function membershipProfileBanner(){
  if (!authState.user) return "";
  const best = [...activeEntitlements()].sort((a,b)=>Number(b.tier_rank||0)-Number(a.tier_rank||0))[0];
  if (best) {
    const name = best.tier_name || best.name || "Member access";
    const tier = membershipTier(name);
    const provider = String(best.provider || best.source || "").toLowerCase();
    const source = provider === "patreon" ? "Patreon" : provider === "boosty_discord" ? "Boosty" : provider === "access_key" ? "access key" : "your account";
    return `<section class="profile-tier ${tier?.className || "member"}" aria-label="Membership status"><span class="profile-tier-state">Membership active</span><strong>${esc(name)}</strong><p>Connected through ${esc(source)}. Chapters included with your tier are available to read.</p><button class="profile-tier-link" data-nav="/vault">View your access ${I.chevR}</button></section>`;
  }
  if (isAdmin()) return `<section class="profile-tier admin" aria-label="Reading access"><span class="profile-tier-state">Reader access</span><strong>All published chapters</strong><p>Your account can read published chapters.</p></section>`;
  const connected = providerIsConnected("patreon") || providerIsConnected("boosty_discord");
  return `<section class="profile-tier no-tier" aria-label="Membership status"><span class="profile-tier-state">Membership</span><strong>${connected ? "Connection needs attention" : "No membership connected"}</strong><p>${connected ? "We could not confirm an active tier for this account." : "Free chapters are ready to read."}</p><button class="profile-tier-link" data-nav="/vault">${connected ? "Check your access" : "Connect a membership"} ${I.chevR}</button></section>`;
}
function sheetMembershipJourney(){
  const mode = membershipEmailMode;
  return `<div class="membership-journey"><button type="button" class="close-x" data-act="close-sheet" aria-label="Close">${I.x}</button><header class="membership-intro"><h2>Make the archive yours.</h2><p>Sign in once. Keep your reading access together.</p></header>
    <section class="membership-step" aria-label="Sign in or create an account"><h3>Reader account</h3><p>Use your email, or continue with Google.</p><div class="membership-auth"><form data-auth-form="${mode}"><label>Email<input class="pill-input" name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label><label>Password<input class="pill-input" name="password" type="password" autocomplete="${mode==="signup"?"new-password":"current-password"}" required placeholder="${mode==="signup"?"Create a password":"Your password"}"></label><div data-auth-status class="membership-form-status" role="status"></div><button class="btn story block" type="submit">${mode==="signup"?"Create account":"Sign in"}</button></form><div class="membership-auth-switch"><button type="button" data-act="membership-email-mode" data-mode="${mode==="signup"?"signin":"signup"}">${mode==="signup"?"Already have an account? Sign in":"Create an account"}</button>${mode==="signin"?`<button type="button" data-sheet="forgot-password">Forgot password?</button>`:""}</div>${googleEnabled()?`<div class="membership-or"><span>or</span></div><button class="btn ghost block" data-act="membership-google">Continue with Google ${I.external}</button>`:""}</div></section>
    <section class="membership-step membership-step-locked" aria-label="Connect membership"><h3>Already a member?</h3><p>After signing in, connect the service where you subscribe.</p><div class="membership-provider-actions"><button class="btn ghost" data-act="membership-patreon" disabled>Patreon</button><button class="btn ghost" data-act="membership-boosty" disabled>Boosty via Discord</button></div></section>
    <div class="membership-foot"><button class="membership-guest" data-act="membership-guest">Continue as guest</button><button class="membership-guest" data-act="membership-subscribe">Explore memberships</button></div></div>`;
}
function openMembershipJourney(){
  if (route.name === "read" && currentChapter && !isReadable(chapterResolved(currentChapter.ch))) rememberReturn();
  if (authState.user) { openSheet(sheetConnectProvider); return; }
  LS.setItem(MEMBERSHIP_WELCOME_KEY,"1");
  openSheet(sheetMembershipJourney);
  document.querySelector(".sheet")?.classList.add("membership-sheet");
  document.body.classList.add("has-membership-sheet");
}
function refreshMembershipJourney(){
  if (currentSheet?.builder !== sheetMembershipJourney) return;
  if (authState.user) { closeSheet(); return; }
  openMembershipJourney();
}
function updateMembershipWidget(){
  let widget = document.getElementById("membership-widget");
  if (!widget) {
    widget = document.createElement("button"); widget.id="membership-widget";
    widget.type="button"; widget.setAttribute("data-act","open-membership");
    document.body.appendChild(widget);
  }
  widget.innerHTML = `<span aria-hidden="true">${I.user}</span>`;
  widget.setAttribute("aria-label","Sign in or connect your membership");
  widget.setAttribute("title","Sign in");
  widget.hidden = !authState.ready || !!authState.authPending || !!authState.user || !!currentSheet || !!authState.passwordRecovery;
}
function maybeShowMembershipWelcome(){
  updateMembershipWidget();
  if (!authState.ready || authState.authPending) return;
  if (authState.passwordRecovery) return;
  if (authState.user) { store.membershipJourneyPending = false; saveStore(); return; }
  if (backendSetupRequired()) return;
  if (store.membershipJourneyPending || !LS.getItem(MEMBERSHIP_WELCOME_KEY)) {
    store.membershipJourneyPending = false; saveStore();
    openMembershipJourney();
  }
}
function showMembershipGuestNotice(){
  openSheet(() => `<div class="membership-guest-notice"><button type="button" class="close-x" data-act="close-sheet" aria-label="Close">${I.x}</button><div class="membership-notice-mark" aria-hidden="true">✦</div><h2>Explore at your own pace</h2><p>Free chapters are open to everyone. Sign in whenever you want to connect a membership, unlock eligible chapters, or keep your account-linked activity together.</p><button class="btn story block" data-act="membership-guest-done">Continue browsing</button><button class="btn ghost block" data-act="open-membership">Sign in instead</button></div>`);
  document.querySelector(".sheet")?.classList.add("membership-sheet");
  document.body.classList.add("has-membership-sheet");
}
function openMembershipSubscribe(){
  openSheet(sheetMembershipSubscribe);
  document.querySelector(".sheet")?.classList.add("membership-sheet");
  document.body.classList.add("has-membership-sheet");
}
function sheetMembershipSubscribe(){
  return `<div class="membership-subscribe"><button type="button" class="close-x" data-act="close-sheet" aria-label="Close">${I.x}</button><span class="membership-overline">Choose your path</span><h2>Become a member</h2><p class="sheet-sub">Explore the available tiers on the provider that works best for you. After subscribing, return here to connect that account.</p><div class="membership-tier-list">${membershipTierCards()}</div><div class="membership-subscribe-actions">${PATREON_URL?`<button class="btn story block" data-act="membership-open-patreon">Explore on Patreon ${I.external}</button>`:""}${BOOSTY_URL?`<button class="btn ghost block" data-act="membership-open-boosty">Explore on Boosty ${I.external}</button>`:""}</div><p class="membership-provider-note">Patreon is recommended for its posts and updates. If Patreon or its payment options are unavailable where you live, including for some readers in Russia, Boosty is another option. Boosty members connect through Discord here.</p><button class="membership-guest" data-act="open-membership">Already subscribed? Connect your membership</button></div>`;
}
