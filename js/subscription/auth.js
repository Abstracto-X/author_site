/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ Supabase auth bridge (temporary until full module split) ============ */
const SUPABASE_URL = (CONFIG.supabase && CONFIG.supabase.url) || "";
const SUPABASE_ANON_KEY = (CONFIG.supabase && CONFIG.supabase.anonKey) || "";
let sbClient = null;
const authState = { user:null, session:null, profile:null, entitlements:[], providerConnections:[], ready:false, error:null, passwordRecovery:false };
function getSupabase(){
  if (sbClient) return sbClient;
  if (!configuredSupabase()) return null;
  if (!window.supabase || !window.supabase.createClient) return null;
  sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "pkce" }
  });
  return sbClient;
}
function activeEntitlements(){
  const now = Date.now();
  return (authState.entitlements || []).filter(e => e && e.status === "active"
    && (e.is_active === undefined || e.is_active === null || e.is_active === true)
    && (!e.valid_from || new Date(e.valid_from).getTime() <= now)
    && (!e.valid_until || new Date(e.valid_until).getTime() > now));
}
function entitlementLevel(){
  const active = activeEntitlements();
  if (!active.length) return 0;
  const names = active.map(e => String(e.tier_name || e.name || e.tier || e.required_tier_name || "").toLowerCase());
  if (names.some(n => n.includes("archivist"))) return 2;
  return 1;
}
function accountLabel(){
  return authState.profile?.display_name || authState.profile?.username || authState.user?.email || store.email || "Guest";
}
function profileAvatar(){
  return authState.profile?.avatar_url || authState.user?.user_metadata?.avatar_url || "";
}
function isAdmin(){
  const profileRole = String(authState.profile?.role || "").trim().toLowerCase();
  const metadataRole = String(authState.user?.app_metadata?.role || authState.user?.user_metadata?.role || "").trim().toLowerCase();
  return profileRole === "admin" || metadataRole === "admin";
}
async function refreshProfile(){
  const client = getSupabase();
  if (!client || !authState.user) { authState.profile = null; return null; }
  const userId = authState.user.id;
  try {
    const data = await runBackendRequest("reader profile", () => client.from("profiles").select("id, username, display_name, avatar_url, role").eq("id", userId).single(), { retries:0 });
    if (authState.user?.id !== userId) return null;
    authState.profile = data || null;
  } catch (err) {
    console.warn("Unable to load reader profile", err);
    if (authState.user?.id === userId) authState.error = err;
  }
  return authState.profile;
}
function persona(){
  if (!authState.user) return Object.assign({}, PERSONA_ACCESS.anon);
  if (isAdmin()) {
    return {
      level: 999,
      signedIn: true,
      admin: true,
      provider: "Admin",
      tier: "Admin reader override",
      tierRank: 999,
      tierSlug: "admin-reader-override",
      validUntil: null,
      since: authState.profile?.created_at || ""
    };
  }
  const active = activeEntitlements();
  if (active.length > 0) {
    // Sort active entitlements by tier_rank descending to get the best tier
    const sorted = [...active].sort((a, b) => {
      const rA = Number(a.tier_rank || 0);
      const rB = Number(b.tier_rank || 0);
      return rB - rA;
    });
    const best = sorted[0];
    return {
      level: best.tier_rank || 1,
      signedIn: true,
      provider: best.provider || "Supabase",
      tier: best.tier_name || "Member access",
      tierRank: best.tier_rank || 10,
      tierSlug: best.tier_slug || "member-access",
      validUntil: best.valid_until || null,
      since: best.created_at || ""
    };
  }
  if (store.grantedKey) return Object.assign({}, PERSONA_ACCESS["key-holder"], { signedIn:true });
  if (store.providerPending) return Object.assign({}, PERSONA_ACCESS.pending, { signedIn:true });
  return Object.assign({}, PERSONA_ACCESS["no-access"], { signedIn:true });
}
async function refreshEntitlements(){
  const client = getSupabase();
  if (!client || !authState.user) { authState.entitlements = []; return []; }
  const userId = authState.user.id;
  try {
    const data = await runBackendRequest("membership access", () => client.rpc("get_my_entitlements"), { retries:0 });
    if (authState.user?.id !== userId) return [];
    authState.entitlements = Array.isArray(data) ? data : [];
  } catch (err) {
    if (authState.user?.id !== userId) return [];
    // A temporary outage must not turn a known membership into "no access".
    if (!["PGRST202", "42883"].includes(err.code)) { authState.error = err; return authState.entitlements; }
    try {
      const data = await runBackendRequest("membership access", () => client.from("user_entitlements").select("*, reader_access_tiers(name, slug, tier_rank)").eq("user_id", userId), { retries:0 });
      if (authState.user?.id !== userId) return [];
      authState.entitlements = (data || []).map(row => ({
        ...row,
        tier_name: row.reader_access_tiers?.name || row.tier_name,
        tier_slug: row.reader_access_tiers?.slug || row.tier_slug,
        tier_rank: row.reader_access_tiers?.tier_rank || row.tier_rank
      }));
    } catch (fallbackErr) {
      if (authState.user?.id === userId) authState.error = fallbackErr;
    }
  }
  return authState.entitlements;
}
async function refreshProviderConnections(){
  const client = getSupabase();
  if (!client || !authState.user) { authState.providerConnections = []; return []; }
  const userId = authState.user.id;
  try {
    const data = await runBackendRequest("membership connection", () => client
      .from("provider_connections")
      .select("provider, provider_account_label, status, last_synced_at, created_at, updated_at")
      .eq("user_id", userId), { retries:0 });
    if (authState.user?.id !== userId) return [];
    authState.providerConnections = Array.isArray(data) ? data : [];
  } catch (err) {
    if (authState.user?.id === userId) authState.error = err;
  }
  return authState.providerConnections;
}
function providerConnection(provider){
  const key = String(provider || "").toLowerCase();
  return (authState.providerConnections || []).find(connection => String(connection?.provider || "").toLowerCase() === key) || null;
}
function providerIsConnected(provider){
  return String(providerConnection(provider)?.status || "").toLowerCase() === "active";
}
const PATREON_CALLBACK_STATUSES = new Set([
  "linked", "no_matching_tier", "cancelled", "expired_state", "invalid_state",
  "missing_parameters", "token_exchange_failed", "sync_failed", "provider_error", "callback_failed"
]);
function readPatreonCallbackResult(){
  const params = oauthCallbackParams();
  const status = String(params.get("patreon") || "").trim();
  if (!PATREON_CALLBACK_STATUSES.has(status)) return null;
  const grants = Math.max(0, Number.parseInt(params.get("grants") || "0", 10) || 0);
  return { status, grants };
}
function cleanPatreonCallbackUrl(){
  const url = new URL(window.location.href);
  url.searchParams.delete("patreon");
  url.searchParams.delete("grants");
  url.hash = cleanHashRoute(url.hash, "vault");
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}
function showPatreonCallbackResult(result){
  const messages = {
    linked: ["Patreon connected", result.grants ? "Your access was updated." : "Your Patreon account was linked."],
    no_matching_tier: ["Patreon connected", "No active paid site tier was found for this Patreon account."],
    cancelled: ["Patreon connection cancelled", "No changes were made. You can try again whenever you are ready."],
    expired_state: ["Patreon session expired", "Please start the connection again from the Vault."],
    invalid_state: ["Patreon connection could not be verified", "Please start the connection again from the Vault."],
    missing_parameters: ["Patreon connection incomplete", "Please start the connection again from the Vault."],
    token_exchange_failed: ["Patreon connection failed", "Patreon did not complete the handoff. Please try again."],
    sync_failed: ["Patreon connected, but sync failed", "Please try syncing again from the Vault."],
    provider_error: ["Patreon connection failed", "Patreon returned an error. Please try again."],
    callback_failed: ["Patreon connection failed", "Please try again from the Vault."],
  };
  const [title, detail] = messages[result.status] || messages.callback_failed;
  toast(title, detail, { icon: result.status === "linked" || result.status === "no_matching_tier" ? "checkCirc" : "alert", kind: result.status === "linked" || result.status === "no_matching_tier" ? "good" : "bad", ms:7000 });
}
const BOOSTY_CALLBACK_STATUSES = new Set([
  "linked", "no_matching_role", "not_in_server", "cancelled", "expired_state", "invalid_state",
  "missing_parameters", "token_exchange_failed", "sync_failed", "provider_error", "callback_failed"
]);
function readBoostyCallbackResult(){
  const params = oauthCallbackParams();
  const status = String(params.get("boosty") || "").trim();
  if (!BOOSTY_CALLBACK_STATUSES.has(status)) return null;
  const grants = Math.max(0, Number.parseInt(params.get("grants") || "0", 10) || 0);
  return { status, grants };
}
function cleanBoostyCallbackUrl(){
  const url = new URL(window.location.href);
  url.searchParams.delete("boosty");
  url.searchParams.delete("grants");
  url.hash = cleanHashRoute(url.hash, "vault");
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}
function showBoostyCallbackResult(result){
  const messages = {
    linked: ["Boosty access connected", "Your Discord subscription role was verified and your reader access was updated."],
    no_matching_role: ["Discord connected", "No mapped Boosty subscriber role was found. Confirm that Boosty assigned your Discord role, then sync again."],
    not_in_server: ["Discord connected", "Join the EvilArchives Discord server and let Boosty assign your subscriber role, then sync again."],
    cancelled: ["Boosty connection cancelled", "No changes were made. You can try again whenever you are ready."],
    expired_state: ["Discord session expired", "Please start the Boosty connection again from the Vault."],
    invalid_state: ["Discord connection could not be verified", "Please start the Boosty connection again from the Vault."],
    missing_parameters: ["Discord connection incomplete", "Please start the Boosty connection again from the Vault."],
    token_exchange_failed: ["Discord connection failed", "Discord did not complete the handoff. Please try again."],
    sync_failed: ["Discord connected, but Boosty sync failed", "Please try syncing again from the Vault."],
    provider_error: ["Discord connection failed", "Discord returned an error. Please try again."],
    callback_failed: ["Boosty connection failed", "Please try again from the Vault."],
  };
  const [title, detail] = messages[result.status] || messages.callback_failed;
  const good = result.status === "linked";
  const neutral = result.status === "no_matching_role" || result.status === "not_in_server";
  toast(title, detail, { icon: good ? "checkCirc" : neutral ? "info" : "alert", kind: good ? "good" : neutral ? "warn" : "bad", ms:8000 });
}
async function uploadReaderAvatar(file){
  const client = getSupabase();
  if (!client || !authState.user) throw new Error("Sign in before changing your avatar.");
  if (!file) return "";
  if (!/^image\/(png|jpe?g|gif|webp)$/i.test(file.type || "")) throw new Error("Avatar must be a PNG, JPG, GIF, or WebP image.");
  if (file.size > 3 * 1024 * 1024) throw new Error("Avatar image must be under 3 MB.");
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${authState.user.id}/profile/avatar-${Date.now()}.${ext}`;
  const { error } = await client.storage.from("Reader").upload(path, file, { upsert:true, contentType:file.type || "image/png" });
  if (error) throw error;
  const { data } = client.storage.from("Reader").getPublicUrl(path);
  return data?.publicUrl || "";
}
async function updateReaderProfile({ username, displayName, avatarFile, avatarUrl }){
  const client = getSupabase();
  if (!client || !authState.user) throw new Error("Sign in before editing your profile.");
  const cleanUsername = String(username || "").trim().replace(/^@+/, "").replace(/\s+/g, "-").toLowerCase();
  if (cleanUsername && !/^[a-z0-9_.-]{3,32}$/.test(cleanUsername)) throw new Error("Username must be 3-32 characters using letters, numbers, dot, underscore, or dash.");
  let finalAvatar = String(avatarUrl || authState.profile?.avatar_url || "").trim();
  if (avatarFile) finalAvatar = await uploadReaderAvatar(avatarFile);
  const record = {
    id: authState.user.id,
    username: cleanUsername || null,
    display_name: String(displayName || "").trim() || null,
    avatar_url: finalAvatar || null,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await client.from("profiles").upsert(record, { onConflict:"id" }).select("id, username, display_name, avatar_url, role").single();
  if (error) throw error;
  authState.profile = data || record;
  return authState.profile;
}
const OAUTH_URL_KEYS = [
  "code", "state", "type", "error", "error_code", "error_description", "sub_auth", "sub_route",
  "access_token", "refresh_token", "expires_at", "expires_in", "provider_token", "provider_refresh_token", "token_type"
];
function authRedirectUrl(){
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  return url.toString();
}
function mergeOAuthParams(target, raw){
  if (!raw) return;
  const cleaned = raw.replace(/^[/#?&]+/, "");
  if (!cleaned || !/[=&]/.test(cleaned)) return;
  const parsed = new URLSearchParams(cleaned);
  for (const [key, value] of parsed.entries()) {
    if (!target.has(key)) target.set(key, value);
  }
}
function oauthCallbackParams(){
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  if (!url.hash) return params;
  const rawHash = url.hash.slice(1);
  if (rawHash.includes("?")) mergeOAuthParams(params, rawHash.slice(rawHash.indexOf("?") + 1));
  if (rawHash.includes("#")) mergeOAuthParams(params, rawHash.slice(rawHash.lastIndexOf("#") + 1));
  const marker = rawHash.match(/(?:^|[?#&])(code|access_token|refresh_token|type|error|error_code|error_description|sub_auth|sub_route)=/);
  if (marker) mergeOAuthParams(params, rawHash.slice(marker.index).replace(/^[?#&]/, ""));
  return params;
}
function cleanHashRoute(hash, fallbackRoute = "vault"){
  const fallback = `#/${String(fallbackRoute || "vault").replace(/^\/?#?\/?/, "")}`;
  if (!hash || hash === "#") return fallback;
  let raw = hash.slice(1);
  const marker = raw.match(/(?:^|[?#&])(code|access_token|refresh_token|type|expires_at|expires_in|provider_token|provider_refresh_token|token_type|state|error|error_code|error_description|sub_auth|sub_route)=/);
  const cutPoints = [raw.indexOf("?"), raw.indexOf("#"), marker ? marker.index : -1].filter(index => index >= 0);
  if (cutPoints.length) raw = raw.slice(0, Math.min(...cutPoints));
  raw = raw.replace(/[?#&]+$/, "");
  if (!raw || OAUTH_URL_KEYS.some(key => raw.startsWith(`${key}=`))) return fallback;
  return raw.startsWith("#") ? raw : `#${raw.startsWith("/") ? raw : `/${raw}`}`;
}
function cleanOAuthCallbackUrl(){
  const url = new URL(window.location.href);
  const routeTarget = url.searchParams.get("sub_route") || oauthCallbackParams().get("sub_route") || "vault";
  OAUTH_URL_KEYS.forEach(key => url.searchParams.delete(key));
  url.hash = cleanHashRoute(url.hash, routeTarget);
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}
async function consumeOAuthCallback(client){
  const params = oauthCallbackParams();
  authState.passwordRecovery = params.get("type") === "recovery";
  const callbackError = params.get("error_description") || params.get("error") || params.get("error_code");
  if (callbackError) {
    cleanOAuthCallbackUrl();
    throw new Error(callbackError);
  }
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken && client.auth.setSession) {
    const { data, error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    cleanOAuthCallbackUrl();
    return data?.session || null;
  }
  const code = params.get("code");
  if (!code) return null;
  if (!client.auth.exchangeCodeForSession) return null;
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error) throw error;
  cleanOAuthCallbackUrl();
  return data?.session || null;
}
async function refreshReaderAccountState(options = {}){
  await Promise.all([
    refreshProfile(),
    refreshEntitlements(),
    refreshProviderConnections(),
    authState.user && typeof loadNotificationPreferences === "function" ? loadNotificationPreferences() : Promise.resolve(),
    authState.user && typeof loadReaderNotifications === "function" ? loadReaderNotifications() : Promise.resolve()
  ]);
  await refreshConnectedProviderAccess({ syncBoosty:options.syncBoosty });
}
let readerAuthRevision = 0;
async function initAuth(){
  const client = getSupabase();
  if (!client) { authState.ready = true; authState.error = new Error("Supabase setup required: set supabase.url and supabase.anonKey in js/subscription/site-config.js."); return; }
  try {
    const patreonCallback = readPatreonCallbackResult();
    const boostyCallback = readBoostyCallbackResult();
    const callbackSession = await consumeOAuthCallback(client);
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    authState.session = callbackSession || data?.session || null;
    authState.user = authState.session?.user || null;
    if (!authState.user) authState.passwordRecovery = false;
    store.email = authState.user?.email || "";
    await refreshReaderAccountState();
    if (patreonCallback) {
      store.providerPending = false;
      saveStore();
      if (authState.user && typeof loadBackendLibrary === "function") await loadBackendLibrary({ force:true });
      cleanPatreonCallbackUrl();
      setTimeout(() => showPatreonCallbackResult(patreonCallback), 0);
    }
    if (boostyCallback) {
      store.providerPending = false;
      saveStore();
      if (authState.user && typeof loadBackendLibrary === "function") await loadBackendLibrary({ force:true });
      cleanBoostyCallbackUrl();
      setTimeout(() => showBoostyCallbackResult(boostyCallback), 0);
    }
    if (authState.user && ["connect-patreon", "connect-boosty-discord"].includes(store.pendingAuthAction)) {
      const pendingAction = store.pendingAuthAction;
      store.pendingAuthAction = "";
      saveStore();
      setTimeout(() => pendingAction === "connect-patreon" ? connectPatreonGo() : connectBoostyDiscordGo(), 450);
    }
    client.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        authState.session = session || authState.session;
        authState.user = authState.session?.user || null;
        store.email = authState.user?.email || "";
        return;
      }
      const sameSession = authState.session?.access_token && authState.session.access_token === session?.access_token;
      if (event === "SIGNED_IN" && sameSession) return;
      const revision = ++readerAuthRevision;
      const previousUserId = authState.user?.id;
      authState.session = session || null;
      authState.user = session?.user || null;
      if (previousUserId !== authState.user?.id) {
        authState.profile = null;
        authState.entitlements = [];
        authState.providerConnections = [];
        if (typeof D !== "undefined") (D.STORIES || []).forEach(story => story.chapters.forEach(ch => {
          if (!ch.backend) return;
          ch.content = null;
          ch.contentError = null;
          ch.can_read_backend = ch.access_state_backend === "free";
          ch.state = ch.can_read_backend ? "free" : "locked";
        }));
      }
      if (!authState.user) authState.passwordRecovery = false;
      store.email = authState.user?.email || "";
      // Supabase callbacks run inside the auth lock. Network work must start
      // after this synchronous callback returns, or reads can deadlock.
      window.setTimeout(() => (async () => {
        if (readerAuthRevision !== revision) return;
        render({ preserveScroll:true });
        await refreshReaderAccountState();
        if (readerAuthRevision !== revision) return;
        if (typeof loadBackendLibrary === "function") await loadBackendLibrary({ force:true });
        if (readerAuthRevision !== revision) return;
        const pendingAction = authState.user ? store.pendingAuthAction : "";
        if (["connect-patreon", "connect-boosty-discord"].includes(pendingAction)) store.pendingAuthAction = "";
        saveStore();
        render();
        if (pendingAction === "connect-patreon") setTimeout(() => connectPatreonGo(), 450);
        if (pendingAction === "connect-boosty-discord") setTimeout(() => connectBoostyDiscordGo(), 450);
      })().catch(err => { authState.error = err; console.warn("Reader session refresh failed", err.code || "reader_request_failed"); }), 0);
    });
  } catch (err) {
    authState.error = err;
    console.error("Reader auth bridge failed:", err);
    console.dir(err);
    const details = err.message || (typeof err === "object" ? JSON.stringify(err) : String(err)) || "Unknown auth error";
    toast("Authentication failed", details, {kind:"bad", icon:"alert", ms:10000});
  } finally {
    authState.ready = true;
  }
}
async function signInWithPassword(email, password){
  if (!emailPasswordEnabled()) throw new Error("Email/password sign-in is disabled for this site.");
  const client = getSupabase();
  if (!client) throw new Error("Supabase client unavailable.");
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  authState.session = data?.session || null;
  authState.user = data?.user || authState.session?.user || null;
  authState.passwordRecovery = false;
  store.email = authState.user?.email || email;
  await refreshReaderAccountState();
  if (typeof loadBackendLibrary === "function") await loadBackendLibrary({ force:true });
  saveStore();
  return authState.user;
}
async function signUpWithPassword(email, password){
  if (!emailPasswordEnabled()) throw new Error("Email/password sign-up is disabled for this site.");
  const client = getSupabase();
  if (!client) throw new Error("Supabase client unavailable.");
  const redirect = authRedirectUrl();
  const { data, error } = await client.auth.signUp({ email, password, options:{ emailRedirectTo: redirect } });
  if (error) throw error;
  authState.user = data?.user || null;
  authState.passwordRecovery = false;
  store.email = email;
  saveStore();
  return data;
}
async function sendPasswordReset(email){
  if (!emailPasswordEnabled()) throw new Error("Email/password recovery is disabled for this site.");
  const client = getSupabase();
  if (!client) throw new Error("Supabase client unavailable.");
  const { data, error } = await client.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
  if (error) throw error;
  return data;
}
async function updateReaderPassword(password){
  const client = getSupabase();
  if (!client) throw new Error("Supabase client unavailable.");
  const { data, error } = await client.auth.updateUser({ password });
  if (error) throw error;
  authState.passwordRecovery = false;
  authState.user = data?.user || authState.user;
  await refreshProfile();
  await refreshEntitlements();
  saveStore();
  return data;
}
function subscriptionRedirectTo(){
  if (!window.location.origin || window.location.origin === "null" || window.location.protocol === "file:") {
    throw new Error("Google sign-in needs the page served over http/https, not opened as a file.");
  }
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  if (!/\/index\.html$/i.test(url.pathname) && !url.pathname.endsWith("/")) {
    const base = url.pathname.endsWith("/") ? url.pathname : url.pathname.replace(/\/[^/]*$/, "/");
    url.pathname = `${base}index.html`;
  }
  url.searchParams.set("sub_auth", "google");
  url.searchParams.set("sub_route", AUTH_CONFIG.oauthReturnRoute || "vault");
  return url.toString();
}
async function signInWithGoogle(nextAction = ""){
  if (!googleEnabled()) throw new Error("Google sign-in is disabled for this site.");
  const client = getSupabase();
  if (!client) throw new Error("Supabase client unavailable.");
  if (nextAction) store.pendingAuthAction = nextAction;
  store.pendingAuthReturn = "subscription";
  const redirectTo = subscriptionRedirectTo();
  saveStore();
  toast("Opening Google sign-in", "Redirecting through Supabase Auth...", {icon:"external", ms:2200});
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: { prompt: "select_account" }
    }
  });
  if (error) {
    store.pendingAuthAction = "";
    saveStore();
    throw error;
  }
  if (data?.url) window.location.assign(data.url);
  return data;
}
async function signOutReader(){
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) throw error;
  authState.user = null;
  authState.session = null;
  authState.entitlements = [];
  authState.providerConnections = [];
  authState.profile = null;
  authState.passwordRecovery = false;
  store.email = "";
  store.providerPending = false;
  store.pendingAuthAction = "";
  store.pendingAuthReturn = "";
  saveStore();
}
const providerSyncRequests = new Map();
const providerAccessChecks = new Map();
const PROVIDER_ACCESS_FRESH_MS = 15 * 60 * 1000;
const PROVIDER_ACCESS_RETRY_MS = 60 * 1000;
function providerAccessStatus(provider){
  return providerAccessChecks.get(`${authState.user?.id}:${provider}`) || null;
}
async function refreshConnectedProviderAccess(options = {}){
  const userId = authState.user?.id;
  if (!userId || (typeof navigator !== "undefined" && navigator.onLine === false)) return false;
  const providers = [patreonEnabled() ? "patreon" : "", options.syncBoosty !== false && boostyDiscordEnabled() ? "boosty_discord" : ""].filter(Boolean);
  let refreshed = false;
  await Promise.all(providers.map(async provider => {
    if (!providerIsConnected(provider)) return;
    const key = `${userId}:${provider}`;
    const check = providerAccessChecks.get(key);
    const lastSync = Date.parse(providerConnection(provider)?.last_synced_at || "") || 0;
    const now = Date.now();
    const expiredSinceSync = (authState.entitlements || []).some(e => e.provider === provider && e.status === "active" && e.valid_until && Date.parse(e.valid_until) <= now && Date.parse(e.valid_until) > lastSync);
    if (check?.state === "reconnect" && lastSync <= check.attemptedAt && !options.force) return;
    if (check && check.state !== "checking" && now - check.attemptedAt < PROVIDER_ACCESS_RETRY_MS * (check.state === "unavailable" ? 5 : 1)) return;
    if (!options.force && !expiredSinceSync && now - lastSync < PROVIDER_ACCESS_FRESH_MS) return;
    providerAccessChecks.set(key, { attemptedAt:now, state:"checking" });
    try {
      await syncProviderEntitlements(provider, { refreshLibrary:false });
      if (authState.user?.id !== userId) return;
      providerAccessChecks.set(key, { attemptedAt:now, state:"verified" });
      refreshed = true;
    } catch (err) {
      if (authState.user?.id !== userId) return;
      providerAccessChecks.set(key, { attemptedAt:now, state:err.code === "connect_required" ? "reconnect" : "unavailable" });
      console.warn("Automatic membership verification did not complete", provider, err.code || "provider_unavailable");
    }
  }));
  return refreshed;
}
let readerAccessRefreshTimer = null;
let readerAccessRefreshBound = false;
let readerAccessRefreshRequest = null;
const readerAccessSignatures = new Map();
async function refreshReaderAccessInBackground(){
  if (readerAccessRefreshRequest) return readerAccessRefreshRequest;
  if (!authState.ready || !authState.user || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
  const userId = authState.user.id;
  readerAccessRefreshRequest = (async () => {
    const before = readerAccessSignatures.get(userId) ?? JSON.stringify(activeEntitlements());
    await Promise.all([refreshEntitlements(), refreshProviderConnections()]);
    if (authState.user?.id !== userId) return;
    const refreshed = await refreshConnectedProviderAccess();
    if (authState.user?.id !== userId) return;
    const after = JSON.stringify(activeEntitlements());
    if (refreshed || before !== after) {
      const changed = await refreshBackendChapterAccess();
      if (changed === null) return; // Library load is busy; retry next tick.
      readerAccessSignatures.set(userId, after);
      const readingLoadedText = typeof route !== "undefined" && route.name === "read" && typeof currentChapter !== "undefined" && currentChapter?.ch?.content && currentChapter.ch.can_read_backend;
      if (authState.user?.id === userId && !readingLoadedText && (changed || route.name === "vault")) render({ preserveScroll:true });
    }
  })().catch(err => console.warn("Automatic reader access refresh unavailable", err.code || "reader_request_failed"))
    .finally(() => { readerAccessRefreshRequest = null; });
  return readerAccessRefreshRequest;
}
function startReaderAccessRefresh(){
  if (authState.user) readerAccessSignatures.set(authState.user.id, JSON.stringify(activeEntitlements()));
  if (readerAccessRefreshTimer) window.clearInterval(readerAccessRefreshTimer);
  readerAccessRefreshTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") refreshReaderAccessInBackground();
  }, PROVIDER_ACCESS_RETRY_MS);
  if (!readerAccessRefreshBound) {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshReaderAccessInBackground();
    });
    window.addEventListener("online", () => refreshReaderAccessInBackground());
    readerAccessRefreshBound = true;
  }
}
async function syncProviderEntitlements(provider = "patreon", options = {}){
  const providerKey = String(provider || "patreon").toLowerCase();
  if (providerKey === "patreon" && !patreonEnabled()) throw new Error("Patreon sync is disabled for this site.");
  if (providerKey === "boosty_discord" && !boostyDiscordEnabled()) throw new Error("Boosty Discord sync is disabled for this site.");
  const client = getSupabase();
  if (!client) throw new Error("Supabase client unavailable.");
  if (!authState.user) throw new Error("Sign in before syncing access.");
  const userId = authState.user.id;
  const key = `${userId}:${providerKey}`;
  let request = providerSyncRequests.get(key);
  if (!request) {
    request = (async () => {
      const { data, error } = await client.functions.invoke("sync-provider-entitlements", { body:{ provider:providerKey }, timeout:10000 });
      if (error || data?.error) {
        let body = data;
        if (error?.context?.clone) { try { body = await error.context.clone().json(); } catch (_) {} }
        const failure = new Error(body?.status === "connect_required" ? "Reconnect your membership account to continue automatic verification." : "Membership verification is temporarily unavailable. We will retry automatically.");
        failure.code = body?.status === "connect_required" ? "connect_required" : "provider_unavailable";
        if (authState.user?.id === userId) providerAccessChecks.set(key, { attemptedAt:Date.now(), state:failure.code === "connect_required" ? "reconnect" : "unavailable" });
        throw failure;
      }
      if (authState.user?.id === userId) {
        store.providerPending = false;
        await Promise.all([refreshEntitlements(), refreshProviderConnections()]);
      }
      return data;
    })().finally(() => providerSyncRequests.delete(key));
    providerSyncRequests.set(key, request);
  }
  const data = await request;
  if (authState.user?.id !== userId) return data;
  providerAccessChecks.set(key, { attemptedAt:Date.now(), state:"verified" });
  if (options.refreshLibrary !== false && typeof loadBackendLibrary === "function") await loadBackendLibrary({ force:true });
  saveStore();
  return data;
}
async function requestPatreonOAuth(){
  if (!patreonEnabled()) throw new Error("Provider connection is disabled for this site.");
  const client = getSupabase();
  if (!client) throw new Error("Supabase client unavailable.");
  const { data, error } = await client.functions.invoke("patreon-oauth-start", { body:{} });
  if (error) throw error;
  const url = data?.url || data?.authorization_url || data?.redirect_url;
  if (!url) throw new Error(data?.message || "Provider connection is not configured yet.");
  window.location.href = url;
}
async function requestBoostyDiscordOAuth(){
  if (!boostyDiscordEnabled()) throw new Error("Boosty Discord connection is disabled for this site.");
  const client = getSupabase();
  if (!client) throw new Error("Supabase client unavailable.");
  const { data, error } = await client.functions.invoke("discord-oauth-start", { body:{} });
  if (error) throw error;
  const url = data?.url || data?.authorization_url || data?.redirect_url;
  if (!url) throw new Error(data?.message || "Discord OAuth is not configured yet.");
  window.location.href = url;
}
