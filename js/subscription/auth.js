/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ Supabase auth bridge (temporary until full module split) ============ */
const SUPABASE_URL = (CONFIG.supabase && CONFIG.supabase.url) || "";
const SUPABASE_ANON_KEY = (CONFIG.supabase && CONFIG.supabase.anonKey) || "";
let sbClient = null;
const authState = { user:null, session:null, profile:null, entitlements:[], ready:false, error:null, passwordRecovery:false };
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
  return (authState.entitlements || []).filter(e => e && (e.status === "active" || e.is_active === true));
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
function isAdmin(){ return authState.profile?.role === "admin"; }
async function refreshProfile(){
  const client = getSupabase();
  if (!client || !authState.user) { authState.profile = null; return null; }
  try {
    const { data, error } = await client.from("profiles").select("id, username, display_name, avatar_url, role").eq("id", authState.user.id).single();
    if (error) throw error;
    authState.profile = data || null;
  } catch (err) {
    console.warn("Unable to load reader profile", err);
    authState.profile = null;
  }
  return authState.profile;
}
function persona(){
  if (!authState.user) return Object.assign({}, PERSONA_ACCESS.anon);
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
  try {
    const { data, error } = await client.rpc("get_my_entitlements");
    if (error) throw error;
    authState.entitlements = Array.isArray(data) ? data : [];
  } catch (err) {
    try {
      const { data, error } = await client.from("user_entitlements").select("*, reader_access_tiers(name, slug, tier_rank)").eq("user_id", authState.user.id);
      if (error) throw error;
      authState.entitlements = (data || []).map(row => ({
        ...row,
        tier_name: row.reader_access_tiers?.name || row.tier_name,
        tier_slug: row.reader_access_tiers?.slug || row.tier_slug,
        tier_rank: row.reader_access_tiers?.tier_rank || row.tier_rank
      }));
    } catch (fallbackErr) {
      authState.entitlements = [];
      authState.error = fallbackErr;
    }
  }
  return authState.entitlements;
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
async function initAuth(){
  const client = getSupabase();
  if (!client) { authState.ready = true; authState.error = new Error("Supabase setup required: set supabase.url and supabase.anonKey in js/subscription/site-config.js."); return; }
  try {
    const callbackSession = await consumeOAuthCallback(client);
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    authState.session = callbackSession || data?.session || null;
    authState.user = authState.session?.user || null;
    if (!authState.user) authState.passwordRecovery = false;
    store.email = authState.user?.email || "";
    await refreshProfile();
    await refreshEntitlements();
    if (authState.user && store.pendingAuthAction === "connect-patreon") {
      store.pendingAuthAction = "";
      saveStore();
      setTimeout(() => connectPatreonGo(), 450);
    }
    client.auth.onAuthStateChange(async (_event, session) => {
      authState.session = session || null;
      authState.user = session?.user || null;
      if (!authState.user) authState.passwordRecovery = false;
      store.email = authState.user?.email || "";
      await refreshProfile();
      await refreshEntitlements();
      const pendingAction = authState.user ? store.pendingAuthAction : "";
      if (pendingAction === "connect-patreon") store.pendingAuthAction = "";
      saveStore();
      render();
      if (pendingAction === "connect-patreon") setTimeout(() => connectPatreonGo(), 450);
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
  await refreshProfile();
  await refreshEntitlements();
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
  authState.profile = null;
  authState.passwordRecovery = false;
  store.email = "";
  store.providerPending = false;
  store.pendingAuthAction = "";
  store.pendingAuthReturn = "";
  saveStore();
}
async function syncProviderEntitlements(){
  if (!patreonEnabled()) throw new Error("Provider sync is disabled for this site.");
  const client = getSupabase();
  if (!client) throw new Error("Supabase client unavailable.");
  if (!authState.user) throw new Error("Sign in before syncing access.");
  const { data, error } = await client.functions.invoke("sync-provider-entitlements", { body:{ provider:"patreon" } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  store.providerPending = false;
  await refreshEntitlements();
  await loadBackendLibrary({ force:true });
  saveStore();
  return data;
}
async function requestPatreonOAuth(){
  if (!patreonEnabled()) throw new Error("Provider connection is disabled for this site.");
  const client = getSupabase();
  if (!client) throw new Error("Supabase client unavailable.");
  const returnTo = `${window.location.origin}${window.location.pathname}#/vault`;
  const { data, error } = await client.functions.invoke("patreon-oauth-start", { body:{ returnTo } });
  if (error) throw error;
  const url = data?.url || data?.authorization_url || data?.redirect_url;
  if (!url) throw new Error(data?.message || "Provider connection is not configured yet.");
  window.location.href = url;
}
