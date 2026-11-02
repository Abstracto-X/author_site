const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "js/subscription/membership-journey.js"), "utf8");
function journey({ user = null, entitlements = [], connected = false } = {}) {
  const context = {
    authState: { user, profile: null, passwordRecovery: false, ready:true, authPending:false },
    activeEntitlements: () => entitlements,
    providerIsConnected: () => connected,
    isAdmin: () => false,
    providerAccessStatus: () => null,
    profileAvatar: () => "",
    accountLabel: () => user?.email || "Guest",
    persona: () => ({ tier: entitlements[0]?.tier_name || "" }),
    patreonEnabled: () => true,
    boostyDiscordEnabled: () => true,
    accessKeysEnabled: () => true,
    googleEnabled: () => true,
    backendSetupRequired: () => false,
    PATREON_URL: "https://www.patreon.com/cw/HornyShitler",
    BOOSTY_URL: "https://boosty.to/hornyshitler",
    I: { x:"x", check:"✓", user:"u", chevR:"›", external:"↗", book:"b", spark:"✦" },
    esc: value => String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"),
    store: { providerPending:false },
    LS: { getItem:()=>null, setItem:()=>{} },
    saveStore:()=>{},
    document: { body:{ appendChild:()=>{} }, getElementById:()=>null, createElement:()=>({setAttribute:()=>{}}) },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

test("guest journey offers account creation and visibly gates membership connection", () => {
  const html = journey().sheetMembershipJourney();
  assert.match(html, /data-auth-form="signin"/);
  assert.match(html, /Continue with Google/);
  assert.match(html, /Create an account/);
  assert.match(html, /After signing in, connect the service/);
  assert.match(html, /data-act="membership-patreon" disabled/);
  assert.match(html, /Continue as guest/);
});

test("signed-in tier display lives in profile and comes only from an active entitlement", () => {
  const instance = journey({ user:{ email:"reader@example.com" }, entitlements:[{ tier_name:"Resident Nemesis", tier_rank:3, provider:"patreon" }] });
  const html = instance.membershipProfileBanner();
  assert.match(html, /Resident Nemesis/);
  assert.match(html, /Membership active/);
  assert.match(html, /profile-tier nemesis/);
  assert.doesNotMatch(instance.sheetMembershipJourney(), /Resident Nemesis/);
});

test("profile frames stop at the reader's highest verified tier and default to it", () => {
  const user = { id:"reader-1", email:"reader@example.com" };
  const nemesis = journey({ user, entitlements:[{ tier_name:"Resident Nemesis", tier_rank:3 }] });
  assert.deepEqual(Array.from(nemesis.availableProfileFrames(), frame=>frame.id), ["licker","tyrant","nemesis"]);
  assert.equal(nemesis.selectedProfileFrame().id,"nemesis");
  const evil = journey({ user, entitlements:[{ tier_name:"Resident Evil", tier_rank:4 }] });
  assert.deepEqual(Array.from(evil.availableProfileFrames(), frame=>frame.id), ["licker","tyrant","nemesis","evil-crimson","evil-haunting"]);
  assert.equal(evil.selectedProfileFrame().id,"evil-crimson");
  assert.equal(journey({ user }).availableProfileFrames().length,0);
});

test("saved frame selection is per account and never exceeds current access", () => {
  const instance = journey({ user:{ id:"reader-1" }, entitlements:[{ tier_name:"Resident Tyrant" }] });
  const values = new Map();
  instance.LS.getItem = key => values.get(key) || null;
  instance.LS.setItem = (key,value) => values.set(key,value);
  assert.equal(instance.selectedProfileFrame().id,"tyrant");
  assert.equal(instance.shiftProfileFrame(-1).id,"licker");
  assert.equal(instance.selectedProfileFrame().id,"licker");
  assert.match([...values.keys()][0],/reader-1$/);
  values.set([...values.keys()][0],"evil-haunting");
  assert.equal(instance.selectedProfileFrame().id,"tyrant");
});

test("all supplied transparent frame assets are wired to their tier styles", () => {
  const css = fs.readFileSync(path.join(root, "styles/membership-journey.css"), "utf8");
  for (const asset of ["member-tiers.png", "resident-evil-crimson.png", "resident-evil-haunting.png"]) {
    assert.ok(fs.statSync(path.join(root, "assets/profile-frames", asset)).size > 100_000);
    assert.ok(css.includes(`../assets/profile-frames/${asset}`));
  }
  for (const id of ["licker", "tyrant", "nemesis", "evil-crimson", "evil-haunting"]) {
    assert.ok(css.includes(`data-frame="${id}"`));
  }
});

test("portrait frames render without the old softening filter at a responsive display size", () => {
  const css = fs.readFileSync(path.join(root, "styles/membership-journey.css"), "utf8");
  const sheets = fs.readFileSync(path.join(root, "js/subscription/sheets.js"), "utf8");
  assert.match(css, /\.reader-profile-avatar-wrap\.has-frame\{[^}]*clamp\(128px,38vw,148px\)/);
  assert.doesNotMatch(css, /\.reader-profile-frame-art[^}]*filter:/);
  assert.match(css, /\.reader-profile-frame-art\[data-rendered\]\{background-image:none!important\}/);
  assert.match(sheets, /<canvas class="reader-profile-frame-art" aria-hidden="true"><\/canvas>/);
});

test("each frame's photo opening is filled without the former visible gap", () => {
  const css = fs.readFileSync(path.join(root, "styles/membership-journey.css"), "utf8");
  for (const [frame, size] of [["licker",75],["nemesis",62],["evil-crimson",67],["evil-haunting",60]]) {
    assert.match(css, new RegExp(`\\.reader-profile-avatar-wrap\\[data-frame="${frame}"\\] \\.profile-avatar\\{width:${size}%;height:${size}%\\}`));
  }
  assert.match(css, /\.reader-profile-avatar-wrap\.has-frame \.profile-avatar\{[^}]*width:70%;height:70%/);
});

test("profile frame canvas crops the sprite and downsamples with high quality", async () => {
  const instance = journey();
  instance.window = { devicePixelRatio:1 };
  instance.Image = class {
    naturalWidth = 2172;
    naturalHeight = 724;
    set src(value){ this.loadedSrc = value; this.onload(); }
  };
  const draws = [];
  const canvas = {
    width:300, height:150, clientWidth:148, dataset:{}, isConnected:true,
    closest:()=>({ dataset:{ frame:"tyrant" } }),
    getContext:()=>({ drawImage:(...args)=>draws.push(args) })
  };
  await instance.renderProfileFrame(canvas,"tyrant");
  assert.deepEqual(draws[0].slice(1),[724,0,724,724,0,0,148,148]);
  assert.equal(draws[0][0].loadedSrc,"assets/profile-frames/member-tiers.png");
  assert.equal(canvas.dataset.rendered,"tyrant");
  assert.equal(canvas.width,148);
});

test("connected without a grant is not shown as an unlocked tier", () => {
  const html = journey({ user:{ email:"reader@example.com" }, connected:true }).membershipProfileBanner();
  assert.match(html, /Connection needs attention/);
  assert.doesNotMatch(html, /Membership active/);
});

test("signed-in startup never opens onboarding", () => {
  const instance = journey({ user:{ email:"reader@example.com" } });
  instance.store.membershipJourneyPending = true;
  instance.openMembershipJourney = () => { throw new Error("onboarding should not open"); };
  instance.maybeShowMembershipWelcome();
  assert.equal(instance.store.membershipJourneyPending, false);
});

test("account shortcuts remain available in signed-in Profile", () => {
  const sheets = fs.readFileSync(path.join(root, "js/subscription/sheets.js"), "utf8");
  const profile = sheets.slice(sheets.indexOf("function sheetProfile(){"), sheets.indexOf("function sheetWhatsNew(){"));
  for (const route of ["/vault", "/notifications", "/my-shelf", "/settings"]) {
    assert.match(profile, new RegExp(`data-nav="${route}"`));
  }
  assert.match(profile, /href="writer\.html"/);
  assert.match(profile, /href="admin\.html"/);
  assert.match(profile, /data-act="profile-edit-name"/);
  assert.match(profile, /data-act="profile-pick-avatar"/);
  assert.doesNotMatch(profile, /name="username"/);
});

test("editing only the display name preserves the stored username and avatar", async () => {
  const authSource = fs.readFileSync(path.join(root, "js/subscription/auth.js"), "utf8");
  const fn = authSource.slice(authSource.indexOf("async function updateReaderProfile("), authSource.indexOf("const OAUTH_URL_KEYS"));
  let saved;
  const context = {
    authState:{ user:{ id:"reader-1" }, profile:{ username:"existing-handle", display_name:"Old", avatar_url:"https://example.test/avatar.jpg" } },
    getSupabase:()=>({ from:()=>({ upsert:record=>{ saved=record; return { select:()=>({ single:async()=>({ data:record, error:null }) }) }; } }) }),
    uploadReaderAvatar:async()=>{ throw new Error("unexpected upload"); }
  };
  const update = vm.runInNewContext(`${fn}\nupdateReaderProfile`, context);
  await update({ displayName:"New name" });
  assert.equal(saved.username,"existing-handle");
  assert.equal(saved.avatar_url,"https://example.test/avatar.jpg");
  assert.equal(saved.display_name,"New name");
});

test("editing only the avatar preserves name and username", async () => {
  const authSource = fs.readFileSync(path.join(root, "js/subscription/auth.js"), "utf8");
  const fn = authSource.slice(authSource.indexOf("async function updateReaderProfile("), authSource.indexOf("const OAUTH_URL_KEYS"));
  let saved;
  const context = {
    authState:{ user:{ id:"reader-1" }, profile:{ username:"existing-handle", display_name:"Existing name", avatar_url:"old.jpg" } },
    getSupabase:()=>({ from:()=>({ upsert:record=>{ saved=record; return { select:()=>({ single:async()=>({ data:record, error:null }) }) }; } }) }),
    uploadReaderAvatar:async()=>"new.jpg"
  };
  const update = vm.runInNewContext(`${fn}\nupdateReaderProfile`, context);
  await update({ avatarFile:{ name:"photo.jpg" } });
  assert.equal(saved.username,"existing-handle");
  assert.equal(saved.display_name,"Existing name");
  assert.equal(saved.avatar_url,"new.jpg");
});

test("account prompt waits for session verification", () => {
  const instance = journey();
  instance.authState.authPending = true;
  instance.openMembershipJourney = () => { throw new Error("onboarding should wait for auth"); };
  instance.maybeShowMembershipWelcome();
});

test("subscription choices use configured provider links", () => {
  const html = journey().sheetMembershipSubscribe();
  assert.match(html, /Explore on Patreon/);
  assert.match(html, /Explore on Boosty/);
  assert.match(html, /payment options are unavailable/);
});

test("membership sheet has one vertical anchor on desktop and mobile", () => {
  const css = fs.readFileSync(path.join(root, "styles/membership-journey.css"), "utf8");
  assert.match(css, /\.membership-sheet\.sheet\s*\{[^}]*top:50%;\s*bottom:auto;/);
  assert.match(css, /@media\(max-width:700px\)[\s\S]*\.membership-sheet\.sheet\s*\{[^}]*top:auto;\s*bottom:0;/);
  assert.match(css, /\.membership-sheet\.sheet\s*\{[^}]*z-index:115;/);
});
