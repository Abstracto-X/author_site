/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ Supabase story/catalog bridge ============ */
const backendState = { loaded:false, loading:false, error:null, usingFixtures:false };
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
    const nodes = Array.from(container.querySelectorAll("p, li, blockquote, h1, h2, h3, h4, h5, h6"));
    const blocks = nodes.map(node => ({ t:"p", v: esc(node.textContent || "") })).filter(b => b.v.trim());
    if (blocks.length) return blocks;
    const text = (container.textContent || "").trim();
    return text ? text.split(/\n{2,}/).map(part => ({ t:"p", v: esc(part.trim()) })).filter(b=>b.v) : [];
  }
  return withoutImports.split(/\n{2,}|\r?\n/).map(part => ({ t:"p", v: esc(part.trim()) })).filter(b => b.v);
}
function normalizeBackendChapter(row, story){
  const state = backendStateToAether(row);
  const preview = row.preview_text ? textToBlocks(row.preview_text) : [];
  return {
    id: row.id,
    backend: true,
    story_id: row.story_id || story.id,
    n: Number(row.chapter_order || row.order_index || row.chapter_number || 0) || (story.chapters.length + 1),
    arc: row.arc || story.arc || "Member archive",
    title: row.title || "Untitled chapter",
    state,
    tier: row.required_tier_name || row.required_tier_slug || "Aether Member",
    required_tier_id: row.required_tier_id || null,
    required_tier_name: row.required_tier_name || "",
    publicDate: row.public_release_at || row.public_release_date || "",
    readTime: estimateReadTime(row),
    excerpt: row.preview_text || "",
    preview,
    content: null,
    can_read_backend: !!row.can_read,
    access_state_backend: row.access_state || state,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
function buildBackendUpdates(stories){
  const rows = [];
  stories.forEach(story => (story.chapters || []).forEach(ch => {
    rows.push({
      id:`be-${ch.id}`,
      when: ch.publicDate ? fmtDate(ch.publicDate) : "Latest",
      kind: ch.state === "free" ? "public-unlock" : ch.state === "early" ? "early" : ch.state === "preview" ? "member-drop" : "note",
      story: story.slug,
      chapter: ch.id,
      title: ch.title,
      note: ch.state === "free" ? "Published for all readers." : ch.state === "unlocked" ? "Available through your current access." : "Member access required."
    });
  }));
  return rows.slice(-12).reverse();
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
    const { data: storyRows, error: storyError } = await client
      .from("stories")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending:false });
    if (storyError) throw storyError;
    const stories = (storyRows || []).map(normalizeBackendStory);
    for (const story of stories) {
      const { data, error } = await client.rpc("get_chapter_catalog", { target_story_id: story.id });
      if (error) throw error;
      story.chapters = (data || []).map(row => normalizeBackendChapter(row, story));
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
    if (!row || !row.can_read || !row.content) throw new Error("This chapter is still locked for this account.");
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
