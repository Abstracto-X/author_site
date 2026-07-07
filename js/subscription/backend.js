/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ Supabase story/catalog bridge ============ */
const backendState = { loaded:false, loading:false, error:null, usingFixtures:false };
const communityState = { commentsLoaded:{}, reactionsLoaded:{} };
function estimateReadTime(row){
  const words = Number(row.word_count || row.words || 0);
  return Math.max(1, Math.round(words / 220)) || 6;
}
function colorPair(row, index){
  const accents = ["#c75b6b", "#d4b06a", "#5bb8c9", "#9a7ed1", "#8fb98a", "#e08a4a"];
  const accent = row.theme_color || row.accent_color || row.accent || accents[index % accents.length];
  return { accent, accent2: row.secondary_color || row.accent2 || accent };
}
function normalizeBackendStory(row, index){
  const colors = colorPair(row, index);
  return {
    id: row.id,
    slug: row.slug || row.id,
    title: row.title || "Untitled story",
    author: row.author || row.author_name || SITE_NAME,
    tagline: row.short_description || row.tagline || row.subtitle || "Open the member chapter shelf.",
    premise: row.synopsis || row.description || row.short_description || "",
    recapSafe: row.short_description || row.synopsis || "",
    genre: row.genre || row.category || "Serial fiction",
    status: row.status || "ongoing",
    motif: row.motif || "arcs",
    tags: Array.isArray(row.tags) ? row.tags : [],
    arc: row.arc || "Member archive",
    cover_image_url: row.cover_image_url || row.cover_url || "",
    background_image_url: row.background_image_url || "",
    accent: colors.accent,
    accent2: colors.accent2,
    cast: [],
    glossary: [],
    chapters: [],
    backend: true
  };
}
function backendStateToAether(row){
  if (row.can_read && row.access_state !== "free") return "unlocked";
  if (row.access_state === "free") return "free";
  if (row.access_state === "early_access") return row.preview_text ? "preview" : "early";
  if (row.access_state === "key_locked") return "key";
  if (row.preview_text) return "preview";
  return "locked";
}
function textToBlocks(value){
  const raw = String(value || "").trim();
  if (!raw) return [];
  const withoutImports = raw.replace(/<!--([\s\S]*?)-->/g, "");
  if (/<\/?(p|div|br|h[1-6]|li|blockquote)\b/i.test(withoutImports)) {
    const container = document.createElement("div");
    container.innerHTML = withoutImports;
    container.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach(node => node.remove());
    container.querySelectorAll("*").forEach(node => {
      if (!["P","DIV","BR","STRONG","B","EM","I","BLOCKQUOTE","H2","H3","H4","HR","UL","OL","LI"].includes(node.tagName)) {
        const frag = document.createDocumentFragment();
        while (node.firstChild) frag.appendChild(node.firstChild);
        node.replaceWith(frag);
        return;
      }
      const isSystemMessage = node.tagName === "DIV" && node.classList.contains("sys-msg-box");
      const bracketSystem = ["P","DIV"].includes(node.tagName) && /^\[[\s\S]+\]$/.test((node.textContent || "").trim());
      [...node.attributes].forEach(attr => node.removeAttribute(attr.name));
      if (isSystemMessage || bracketSystem) node.dataset.systemMessage = "true";
    });
    const nodes = Array.from(container.children);
    const blocks = nodes.map(node => {
      if (node.tagName === "HR") return { t:"scene" };
      if (["P","DIV"].includes(node.tagName) && (node.textContent || "").replace(/\u00a0/g, " ").trim() === "--") return { t:"scene" };
      if (node.dataset.systemMessage === "true") {
        const text = (node.textContent || "").trim();
        const bracket = text.match(/^\[([\s\S]+)\]$/);
        return { t:"system", v: bracket ? esc(bracket[1].trim()).replace(/\n/g, "<br>") : (node.innerHTML || esc(text)) };
      }
      if (["H2","H3","H4"].includes(node.tagName)) return { t:"html", tag:node.tagName.toLowerCase(), v:node.innerHTML };
      if (node.tagName === "BLOCKQUOTE") return { t:"html", tag:"blockquote", v:node.innerHTML };
      return { t:"p", v:node.innerHTML || esc(node.textContent || "") };
    }).filter(b => b.t === "scene" || String(b.v || "").trim());
    if (blocks.length) return blocks;
    const text = (container.textContent || "").trim();
    return text ? text.split(/\n{2,}/).map(part => {
      const trimmed = part.trim();
      const bracket = trimmed.match(/^\[([\s\S]+)\]$/);
      if (trimmed === "--") return { t:"scene" };
      return bracket ? { t:"system", v: esc(bracket[1].trim()).replace(/\n/g, "<br>") } : { t:"p", v: esc(trimmed) };
    }).filter(b=>b.v) : [];
  }
  return withoutImports.split(/\n{2,}|\r?\n/).map(part => {
    const trimmed = part.trim();
    const bracket = trimmed.match(/^\[([\s\S]+)\]$/);
    if (trimmed === "--") return { t:"scene" };
    return bracket ? { t:"system", v: esc(bracket[1].trim()).replace(/\n/g, "<br>") } : { t:"p", v: esc(trimmed) };
  }).filter(b => b.v);
}
function normalizeBackendChapter(row, story){
  const state = backendStateToAether(row);
  const preview = row.preview_text ? textToBlocks(row.preview_text) : [];
  const wordCount = Number(row.word_count || row.words || 0);
  return {
    id: row.id,
    backend: true,
    story_id: row.story_id || story.id,
    n: Number(row.chapter_order || row.order_index || row.chapter_number || 0) || (story.chapters.length + 1),
    arc: row.arc || story.arc || "Member archive",
    title: row.title || "Untitled chapter",
    state,
    tier: row.required_tier_name || row.required_tier_slug || "member access",
    required_tier_id: row.required_tier_id || null,
    required_tier_name: row.required_tier_name || "",
    publicDate: row.public_release_at || row.public_release_date || "",
    readTime: estimateReadTime(row),
    wordCount,
    excerpt: row.preview_text || "",
    preview,
    content: null,
    is_nsfw: !!row.is_nsfw,
    external_url: row.external_url || "",
    can_read_backend: !!row.can_read,
    access_state_backend: row.access_state || state,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function buildBackendUpdates(stories){
  const rows = [];
  stories.forEach(story => (story.chapters || []).forEach(ch => {
    const rawState = ch.access_state_backend || ch.state;
    const isFree = rawState === "free";
    const isEarly = rawState === "early_access" || rawState === "early" || ch.state === "early";
    const isUnlocked = rawState === "unlocked";
    
    rows.push({
      id:`be-${ch.id}`,
      when: ch.publicDate ? fmtDate(ch.publicDate) : "Latest",
      kind: isFree ? "public-unlock" : isEarly ? "early" : "member-drop",
      story: story.slug,
      chapter: ch.id,
      title: ch.title,
      note: isFree ? "Published for all readers." : isUnlocked ? "Available through your current access." : "Member access required."
    });
  }));
  return rows.slice(-12).reverse();
}
function relativeTime(iso){
  if (!iso) return "just now";
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 60000) return "just now";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return fmtDate(iso);
}
function normalizeBackendComment(row){
  const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const name = meta.display_name || meta.name || meta.username || "Reader";
  const color = meta.color || "#d4b06a";
  const para = Number.isFinite(Number(meta.para)) ? Number(meta.para) : null;
  return {
    id: row.id,
    backend: true,
    para,
    name,
    text: row.content || "",
    time: relativeTime(row.created_at),
    color,
    avatar: meta.avatar_url || ""
  };
}
function applyReactionRows(chapterId, rows){
  const counts = {};
  let picked = null;
  (rows || []).forEach(row => {
    const key = row.reaction;
    if (!key) return;
    counts[key] = (counts[key] || 0) + 1;
    if (authState.user && row.user_id === authState.user.id) picked = key;
  });
  store.reactions[chapterId] = { picked, counts };
}
async function loadChapterCommunity(chapterId, options = {}){
  const client = getSupabase();
  if (!client || !chapterId) return false;
  if (!options.force && communityState.commentsLoaded[chapterId] && communityState.reactionsLoaded[chapterId]) return true;
  try {
    const [{ data: comments, error: commentError }, reactionResult] = await Promise.all([
      client.from("comments")
        .select("id,user_id,target_id,target_type,content,metadata,created_at")
        .eq("target_type", "chapter")
        .eq("target_id", chapterId)
        .order("created_at", { ascending:true }),
      client.from("chapter_reactions")
        .select("user_id,chapter_id,reaction")
        .eq("chapter_id", chapterId)
    ]);
    if (commentError) throw commentError;
    store.comments[chapterId] = (comments || []).map(normalizeBackendComment);
    communityState.commentsLoaded[chapterId] = true;
    if (!reactionResult.error) {
      applyReactionRows(chapterId, reactionResult.data || []);
    } else {
      console.warn("Chapter reactions are not available yet.", reactionResult.error);
    }
    communityState.reactionsLoaded[chapterId] = true;
    saveStore();
    return true;
  } catch (err) {
    console.warn("Unable to load reader notes from Supabase.", err);
    return false;
  }
}
async function postChapterComment(chapterId, text, para){
  const client = getSupabase();
  if (!client || !authState.user) throw new Error("Sign in before posting a reader note.");
  const profile = authState.profile || {};
  const display = accountLabel();
  const metadata = {
    display_name: display,
    username: profile.username || "",
    avatar_url: profile.avatar_url || "",
    para: Number.isFinite(Number(para)) ? Number(para) : null,
    color: "#d4b06a"
  };
  const { error } = await client.from("comments").insert({
    user_id: authState.user.id,
    target_type: "chapter",
    target_id: chapterId,
    content: text,
    metadata
  });
  if (error) throw error;
  communityState.commentsLoaded[chapterId] = false;
  await loadChapterCommunity(chapterId, { force:true });
}
async function saveChapterReaction(chapterId, reaction){
  const client = getSupabase();
  if (!client || !authState.user) throw new Error("Sign in before reacting.");
  const current = store.reactions[chapterId]?.picked || null;
  if (current === reaction) {
    const { error } = await client.from("chapter_reactions").delete().eq("chapter_id", chapterId).eq("user_id", authState.user.id);
    if (error) throw error;
  } else {
    const { error } = await client.from("chapter_reactions").upsert({
      chapter_id: chapterId,
      user_id: authState.user.id,
      reaction,
      updated_at: new Date().toISOString()
    }, { onConflict:"user_id,chapter_id" });
    if (error) throw error;
  }
  communityState.reactionsLoaded[chapterId] = false;
  await loadChapterCommunity(chapterId, { force:true });
}
async function loadSiteSettings(){
  const client = getSupabase();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from("site_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["site_identity", "reader_behavior", "site_name", "site_tagline", "meta_description"]);
    if (error) throw error;
    applySiteSettings(data || []);
    return data || [];
  } catch (err) {
    console.warn("Unable to load site settings; using local site-config.js values.", err);
    return [];
  }
}
async function loadBackendLibrary(options = {}){
  const client = getSupabase();
  if (!client || backendState.loading) {
    if (!client) { backendState.error = new Error("Supabase is not configured. Add your project URL and anon/publishable key to js/subscription/site-config.js."); backendState.usingFixtures = false; }
    return false;
  }
  if (options.force) backendState.loaded = false;
  backendState.loading = true;
  backendState.error = null;
  try {
    await loadSiteSettings();
    const { data: storyRows, error: storyError } = await client
      .from("stories")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending:false });
    if (storyError) throw storyError;

    // Load characters (cast)
    let castRows = [];
    try {
      const { data, error } = await client
        .from("characters")
        .select("id, story_id, name, role_title, profile_image_url")
        .order("sort_order", { ascending: true });
      if (!error) castRows = data || [];
    } catch (e) {
      console.warn("Could not load characters:", e);
    }

    // Load glossary (lore entries)
    let loreRows = [];
    try {
      const { data, error } = await client
        .from("lore_entries")
        .select("id, story_id, title, description, slug")
        .order("title", { ascending: true });
      if (!error) loreRows = data || [];
    } catch (e) {
      console.warn("Could not load lore entries:", e);
    }

    const stories = (storyRows || []).map(normalizeBackendStory);
    for (const story of stories) {
      const { data, error } = await client.rpc("get_chapter_catalog", { target_story_id: story.id });
      if (error) throw error;
      story.chapters = (data || []).map(row => normalizeBackendChapter(row, story));
      
      story.cast = castRows
        .filter(c => c.story_id === story.id)
        .map(c => ({ id: c.id, n: c.name, r: c.role_title || "", img: c.profile_image_url || "" }));
        
      story.glossary = loreRows
        .filter(l => l.story_id === story.id)
        .map(l => ({ id: l.id, t: l.title, d: l.description || "", slug: l.slug || "" }));
    }
    if (stories.length) {
      D.STORIES = stories;
      D.UPDATES = buildBackendUpdates(stories);
      D.PRIMARY_SLUG = stories[0].slug;
      D.FEATURED_SLUGS = stories.slice(0, 2).map(story => story.slug);
      backendState.usingFixtures = false;
      backendState.loaded = true;
      backendState.error = stories.some(story => story.chapters.length) ? null : new Error("Published stories were found, but no published chapters exist yet.");
  return true;
}

function normalizeNotification(row){
  return {
    id: row.id,
    k: row.notification_type || "chapter",
    t: row.title || "Reader update",
    d: row.body || "",
    time: row.created_at ? relativeTime(row.created_at) : "just now",
    chapter: row.chapter_id || null,
    url: row.url || "",
    read: !!row.read_at,
    dismissed: !!row.dismissed_at,
    created_at: row.created_at || ""
  };
}
async function loadNotificationPreferences(){
  const client = getSupabase();
  if (!client || !authState.user) return null;
  try {
    const { data, error } = await client
      .from("reader_notification_preferences")
      .select("*")
      .eq("user_id", authState.user.id)
      .maybeSingle();
    if (error) throw error;
    store.notificationPrefs = data || {
      user_id: authState.user.id,
      browser_enabled: !!store.settings.browserNotifications,
      email_enabled: store.settings.emailNotifications !== false,
      new_chapters_enabled: store.settings.chapterNotifications !== false,
      minimum_tier_rank: 0
    };
    store.settings.browserNotifications = !!store.notificationPrefs.browser_enabled;
    store.settings.emailNotifications = store.notificationPrefs.email_enabled !== false;
    store.settings.chapterNotifications = store.notificationPrefs.new_chapters_enabled !== false;
    saveStore();
    return store.notificationPrefs;
  } catch (err) {
    console.warn("Notification preferences unavailable", err);
    return null;
  }
}
async function saveNotificationPreferences(prefs){
  const client = getSupabase();
  if (!client || !authState.user) throw new Error("Sign in before changing notification preferences.");
  const record = {
    user_id: authState.user.id,
    browser_enabled: !!prefs.browser_enabled,
    email_enabled: !!prefs.email_enabled,
    new_chapters_enabled: prefs.new_chapters_enabled !== false,
    minimum_tier_rank: Math.max(0, Number(prefs.minimum_tier_rank || 0))
  };
  const { data, error } = await client
    .from("reader_notification_preferences")
    .upsert(record, { onConflict:"user_id" })
    .select()
    .single();
  if (error) throw error;
  store.notificationPrefs = data || record;
  store.settings.browserNotifications = !!record.browser_enabled;
  store.settings.emailNotifications = !!record.email_enabled;
  store.settings.chapterNotifications = record.new_chapters_enabled !== false;
  saveStore();
  return store.notificationPrefs;
}
async function loadReaderNotifications(options = {}){
  const client = getSupabase();
  if (!client || !authState.user) return [];
  try {
    const { data, error } = await client
      .from("reader_notifications")
      .select("*")
      .is("dismissed_at", null)
      .order("created_at", { ascending:false })
      .limit(40);
    if (error) throw error;
    const remote = (data || []).map(normalizeNotification).filter(n => !store.dismissedNotifs.includes(n.id));
    const local = (store.notifs || []).filter(n => !n.id || !String(n.id).match(/^[0-9a-f-]{36}$/i));
    store.notifs = [...remote, ...local].slice(0, 50);
    saveStore();
    if (options.browser !== false) maybeShowBrowserNotifications(remote);
    return remote;
  } catch (err) {
    console.warn("Reader notifications unavailable", err);
    return [];
  }
}
async function markReaderNotificationsRead(ids){
  const client = getSupabase();
  if (!client || !authState.user || !ids.length) return false;
  const { error } = await client.from("reader_notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
  if (error) throw error;
  return true;
}
async function dismissReaderNotification(id){
  const client = getSupabase();
  if (client && authState.user && String(id).match(/^[0-9a-f-]{36}$/i)) {
    await client.from("reader_notifications").update({ dismissed_at: new Date().toISOString() }).eq("id", id);
  }
  if (!store.dismissedNotifs.includes(id)) store.dismissedNotifs.push(id);
  store.notifs = store.notifs.filter(n => n.id !== id);
  saveStore();
}
function maybeShowBrowserNotifications(items){
  if (!store.settings.browserNotifications || !store.settings.chapterNotifications) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const lastKey = `ea-last-browser-notification:${authState.user?.id || "anon"}`;
  const lastSeen = Number(LS.getItem(lastKey) || 0);
  const fresh = (items || []).filter(n => !n.read && new Date(n.created_at || 0).getTime() > lastSeen).slice(0, 3);
  fresh.forEach(n => {
    try {
      const notice = new Notification(n.t, { body: n.d, tag: n.id, icon: profileAvatar() || undefined });
      notice.onclick = () => { window.focus(); if (n.chapter) nav("/read/" + n.chapter); };
    } catch (_) {}
  });
  if (fresh.length) LS.setItem(lastKey, String(Date.now()));
}
async function requestBrowserNotifications(){
  if (!("Notification" in window)) throw new Error("This browser does not support notifications.");
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") throw new Error("Browser notification permission was not granted.");
  store.settings.browserNotifications = true;
  if (store.notificationPrefs) store.notificationPrefs.browser_enabled = true;
  saveStore();
  return permission;
}
    backendState.error = new Error("No published backend stories were found.");
    backendState.usingFixtures = false;
    D.STORIES = [];
    D.UPDATES = [];
    return false;
  } catch (err) {
    backendState.error = err;
    console.error("Subscription backend library load failed; no local content fallback will be used.", err);
    backendState.usingFixtures = false;
    D.STORIES = [];
    D.UPDATES = [];
    return false;
  } finally {
    backendState.loading = false;
  }
}
async function loadReaderChapterFromBackend(chapterId){
  const client = getSupabase();
  const found = byId(chapterId);
  if (!client || !found || !found.ch.backend) return false;
  if (found.ch.content || found.ch.contentLoading) return !!found.ch.content;
  found.ch.contentLoading = true;
  found.ch.contentError = null;
  try {
    const { data, error } = await client.rpc("get_reader_chapter", { target_chapter_id: chapterId });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.can_read) throw new Error("This chapter is still locked for this account.");
    found.ch.is_nsfw = !!row.is_nsfw;
    found.ch.external_url = row.external_url || found.ch.external_url || "";
    if (found.ch.is_nsfw) {
      found.ch.content = [];
      found.ch.state = row.access_state === "free" ? "free" : "unlocked";
      found.ch.can_read_backend = true;
      return true;
    }
    if (!row.content) throw new Error("This chapter is still locked for this account.");
    found.ch.content = textToBlocks(row.content);
    found.ch.state = row.access_state === "free" ? "free" : "unlocked";
    found.ch.can_read_backend = true;
    return true;
  } catch (err) {
    const message = err?.message || "Unable to load chapter content.";
    found.ch.contentError = message;
    return false;
  } finally {
    found.ch.contentLoading = false;
  }
}
