"use strict";

const CONFIG = window.SUBSCRIPTION_SITE_CONFIG || {};
const SUPABASE_URL = (CONFIG.supabase && CONFIG.supabase.url) || "";
const SUPABASE_ANON_KEY = (CONFIG.supabase && CONFIG.supabase.anonKey) || "";
const CONFIGURED = SUPABASE_URL && SUPABASE_ANON_KEY && !/YOUR_PROJECT_REF|YOUR_SUPABASE|CHANGE_ME/i.test(`${SUPABASE_URL} ${SUPABASE_ANON_KEY}`);
const supabaseClient = CONFIGURED ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const State = {
  user: null,
  profile: null,
  stories: [],
  chapters: [],
  tiers: [],
  selectedStoryId: localStorage.getItem("ea-admin-last-story-id") || null,
  editingChapterId: localStorage.getItem("ea-writer-last-chapter-id") || localStorage.getItem("ea-admin-last-chapter-id") || null,
  railCollapsed: localStorage.getItem("ea-writer-rail-collapsed") === "true"
};

const $ = (id) => document.getElementById(id);
const esc = (value) => (value == null ? "" : String(value)).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
const attr = (value) => (value == null ? "" : String(value)).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

function showLoading(show = true){ $("loading")?.classList.toggle("hidden", !show); }
function toast(message, kind = "ok"){
  const box = document.createElement("div");
  box.innerHTML = `<strong style="color:${kind === "error" ? "#ff9ca2" : "var(--gold)"}">${kind === "error" ? "Problem" : "Saved"}</strong><br><span style="color:#bbb;font-size:.82rem">${esc(message)}</span>`;
  $("toast").appendChild(box);
  setTimeout(() => box.remove(), 4200);
}
function setPersisted(key, value){ if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); }
function formatDate(value){ if (!value) return "No release date"; const d = new Date(value); return Number.isNaN(d.getTime()) ? "Invalid date" : d.toLocaleString([], { year:"numeric", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }); }
function datetimeLocal(value){ if (!value) return ""; const d = new Date(value); return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16); }
function htmlToPlainText(html){
  const div = document.createElement("div");
  div.innerHTML = html || "";
  div.querySelectorAll("br").forEach(el => el.replaceWith("\n"));
  div.querySelectorAll("p,div,h2,h3,h4,blockquote,li").forEach(el => el.appendChild(document.createTextNode("\n")));
  div.querySelectorAll("hr").forEach(el => el.replaceWith("\n---\n"));
  return (div.textContent || div.innerText || "").trim();
}
function wordCount(html){ return htmlToPlainText(html).replace(/\u00a0/g, " ").trim().split(/\s+/).filter(Boolean).length; }
function makePreview(html, max = 340){ const text = htmlToPlainText(html).replace(/\s+/g, " ").trim(); return text.length > max ? text.slice(0, max).replace(/\s+\S*$/, "") + "…" : text; }
function markdownInlineToHtml(text){
  let out = esc(text || "");
  out = out.replace(/`([^`]+)`/g, "$1");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");
  return out;
}
function markdownToHtml(markdown){
  const lines = (markdown || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];
  const flush = () => { if (paragraph.length) blocks.push(`<p>${paragraph.map(markdownInlineToHtml).join("<br>")}</p>`); paragraph = []; };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) { flush(); continue; }
    if (/^(\*\s*){3,}$|^(-\s*){3,}$|^_{3,}$/.test(trimmed)) { flush(); blocks.push("<hr>"); continue; }
    const heading = trimmed.match(/^(#{2,4})\s+(.+)$/);
    if (heading) { flush(); blocks.push(`<h${heading[1].length}>${markdownInlineToHtml(heading[2])}</h${heading[1].length}>`); continue; }
    const quote = trimmed.match(/^>\s?(.+)$/);
    if (quote) { flush(); blocks.push(`<blockquote>${markdownInlineToHtml(quote[1])}</blockquote>`); continue; }
    paragraph.push(line);
  }
  flush();
  return sanitizeHtml(blocks.join(""));
}
function sanitizeHtml(html){
  const template = document.createElement("template");
  template.innerHTML = html || "";
  const allowed = new Set(["P","DIV","BR","STRONG","B","EM","I","BLOCKQUOTE","H2","H3","H4","HR","UL","OL","LI"]);
  const walk = (node) => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!allowed.has(child.tagName)) {
          const frag = document.createDocumentFragment();
          while (child.firstChild) frag.appendChild(child.firstChild);
          child.replaceWith(frag); walk(node); return;
        }
        [...child.attributes].forEach(a => child.removeAttribute(a.name));
        if (child.tagName === "B") child.outerHTML = `<strong>${child.innerHTML}</strong>`;
        if (child.tagName === "I") child.outerHTML = `<em>${child.innerHTML}</em>`;
        if (child.tagName === "DIV") { const p = document.createElement("p"); p.innerHTML = child.innerHTML || "<br>"; child.replaceWith(p); walk(p); return; }
      } else if (child.nodeType === Node.COMMENT_NODE) { child.remove(); return; }
      walk(child);
    });
  };
  walk(template.content);
  const output = template.innerHTML.trim();
  return output && !/<(p|h2|h3|h4|blockquote|ul|ol|hr|br)\b/i.test(output) ? `<p>${output}</p>` : output;
}
function normalizeHtml(html){
  const raw = html || "";
  const emptyish = raw.replace(/&nbsp;/gi, " ").replace(/\u00a0/g, " ").replace(/<br\s*\/?/gi, "").replace(/<\/?(p|div)[^>]*>/gi, "").trim();
  if (!emptyish) return "";
  return /<\/?[a-z][\s\S]*>/i.test(raw) ? sanitizeHtml(raw) : markdownToHtml(raw);
}

const DB = {
  async stories(){ const { data, error } = await supabaseClient.from("stories").select("*").order("sort_order"); if (error) throw error; return data || []; },
  async chapters(storyId){ const { data, error } = await supabaseClient.from("chapters").select("*").eq("story_id", storyId).order("chapter_order"); if (error) throw error; return data || []; },
  async tiers(){ const { data, error } = await supabaseClient.from("reader_access_tiers").select("*").order("tier_rank"); if (error) throw error; return data || []; },
  async saveChapter(id, record){
    record.word_count = wordCount(record.content || "");
    if (id) { const { data, error } = await supabaseClient.from("chapters").update(record).eq("id", id).select().single(); if (error) throw error; return data; }
    const { data, error } = await supabaseClient.from("chapters").insert(record).select().single(); if (error) throw error; return data;
  }
};

async function initAuth(){
  $("login-brand").textContent = (CONFIG.siteName || "EvilArchives").slice(0, 24);
  $("top-brand").textContent = (CONFIG.siteName || "EvilArchives").slice(0, 24);
  if (!supabaseClient) return showLogin("Admin setup required: configure js/subscription/site-config.js.");
  const { data:{ session } } = await supabaseClient.auth.getSession();
  if (!session) return showLogin("");
  State.user = session.user;
  try { await loadProfile(); showApp(); await loadWorkspace(); }
  catch (err) { showLogin(err.message); }
  supabaseClient.auth.onAuthStateChange(async (event, sessionNow) => {
    if (event === "SIGNED_IN" && sessionNow) { State.user = sessionNow.user; try { await loadProfile(); showApp(); await loadWorkspace(); } catch (err) { showLogin(err.message); } }
    if (event === "SIGNED_OUT") { State.user = null; State.profile = null; showLogin(""); }
  });
}
async function loadProfile(){
  const { data, error } = await supabaseClient.from("profiles").select("*").eq("id", State.user.id).single();
  if (error) throw error;
  if (data.role !== "admin") throw new Error("Access denied. Admin privileges required.");
  State.profile = data;
}
function showLogin(message){ $("login").classList.remove("hidden"); $("app").classList.add("hidden"); $("login-error").textContent = message || ""; }
function showApp(){ $("login").classList.add("hidden"); $("app").classList.remove("hidden"); }

async function loadWorkspace(){
  showLoading(true);
  try {
    const [stories, tiers] = await Promise.all([DB.stories(), DB.tiers().catch(() => [])]);
    State.stories = stories; State.tiers = tiers;
    if (!stories.length) { renderStorySelect(); renderEmpty("Create a story in Admin CMS first."); return; }
    if (!State.selectedStoryId || !stories.some(s => s.id === State.selectedStoryId)) State.selectedStoryId = stories[0].id;
    setPersisted("ea-admin-last-story-id", State.selectedStoryId);
    State.chapters = await DB.chapters(State.selectedStoryId);
    if (State.editingChapterId && State.editingChapterId !== "new" && !State.chapters.some(c => c.id === State.editingChapterId)) State.editingChapterId = State.chapters[0]?.id || null;
    if (!State.editingChapterId && State.chapters.length) State.editingChapterId = [...State.chapters].sort((a,b)=>(Number(b.chapter_order)||0)-(Number(a.chapter_order)||0))[0].id;
    render();
  } finally { showLoading(false); }
}
function tierLookup(){ return Object.fromEntries(State.tiers.map(t => [t.id, t])); }
function activeChapter(){
  if (State.editingChapterId === "new") return { id:null, title:"", content:"", chapter_order:(State.chapters.length ? Math.max(...State.chapters.map(c => Number(c.chapter_order)||0)) + 1 : 1), is_published:false, story_id:State.selectedStoryId, required_tier_id:null, public_release_at:"", preview_text:"", is_nsfw:false, external_url:"" };
  return State.chapters.find(c => c.id === State.editingChapterId) || null;
}
function render(){
  renderStorySelect(); renderRail(); renderDesk(); applyRail();
}
function renderStorySelect(){
  $("story-select").innerHTML = State.stories.map(s => `<option value="${attr(s.id)}" ${s.id === State.selectedStoryId ? "selected" : ""}>${esc(s.title)}</option>`).join("");
  const live = State.chapters.filter(c => c.is_published).length;
  $("story-stats").innerHTML = `<span class="pill gold"><i class="fas fa-book-open"></i>${State.chapters.length} chapters</span><span class="pill live"><i class="fas fa-signal"></i>${live} live</span><span class="pill"><i class="fas fa-layer-group"></i>${State.tiers.length} tiers</span>`;
}
function chapterTags(ch, lookup){
  const tier = ch.required_tier_id ? (lookup[ch.required_tier_id]?.name || "Unknown tier") : "Public / Free";
  return [
    `<span class="tag tier" title="Access tier: ${attr(tier)}"><i class="fas ${ch.required_tier_id ? "fa-lock" : "fa-lock-open"}"></i> ${esc(tier)}</span>`,
    ch.is_nsfw ? `<span class="tag nsfw"><i class="fas fa-triangle-exclamation"></i> NSFW</span>` : "",
    ch.external_url ? `<span class="tag ext" title="${attr(ch.external_url)}"><i class="fas fa-arrow-up-right-from-square"></i> External</span>` : "",
    ch.public_release_at ? `<span class="tag release" title="Public release"><i class="fas fa-calendar"></i> ${esc(formatDate(ch.public_release_at))}</span>` : ""
  ].join("");
}
function renderRail(){
  const lookup = tierLookup();
  const sorted = [...State.chapters].sort((a,b)=>(Number(b.chapter_order)||0)-(Number(a.chapter_order)||0));
  $("collapsed-count").textContent = String(sorted.length);
  $("chapter-list").innerHTML = sorted.map(ch => `
    <article class="chapter-card ${State.editingChapterId === ch.id ? "active" : ""}" data-chapter-id="${attr(ch.id)}">
      <div class="cc-top"><span class="cc-index">#${esc(ch.chapter_order ?? 0)}</span><div class="cc-title">${esc(ch.title || "Untitled chapter")}</div><span class="status ${ch.is_published ? "live" : "draft"}">${ch.is_published ? "Live" : "Draft"}</span></div>
      <div class="cc-meta"><span>${Number(ch.word_count || wordCount(ch.content || "")).toLocaleString()} words</span><div class="cc-tags">${chapterTags(ch, lookup)}</div></div>
    </article>`).join("") || `<div class="empty"><div><i class="fas fa-pen-nib" style="font-size:2rem;color:var(--gold)"></i><p>No chapters yet.</p><button class="btn primary" id="empty-new">New chapter</button></div></div>`;
}
function renderEmpty(message){ $("desk").innerHTML = `<div class="empty"><div><i class="fas fa-book" style="font-size:2rem;color:var(--gold)"></i><p>${esc(message)}</p><a class="btn primary" href="admin.html">Open Admin CMS</a></div></div>`; }
function renderDesk(){
  const ch = activeChapter();
  if (!ch) { renderEmpty("Select a chapter or create a new one."); return; }
  const lookup = tierLookup();
  const tier = ch.required_tier_id ? (lookup[ch.required_tier_id]?.name || "Unknown tier") : "Public / Free";
  const localKey = draftKey(ch.id);
  const draft = localStorage.getItem(localKey);
  const content = draft && htmlToPlainText(draft) ? normalizeHtml(draft) : normalizeHtml(ch.content || "");
  $("desk").innerHTML = `
    <div class="chapter-head">
      <div><h2>${ch.id ? "Editing chapter" : "New chapter"}</h2><div class="head-meta">#${esc(ch.chapter_order || 0)} · ${Number(ch.word_count || wordCount(content)).toLocaleString()} words · ${esc(tier)} · ${ch.is_published ? "Live" : "Draft"}${ch.is_nsfw ? " · NSFW" : ""}${ch.external_url ? " · External" : ""}</div></div>
      <div class="actions"><button class="btn sm" id="save-btn"><i class="fas fa-floppy-disk"></i> ${ch.is_published ? "Save Changes" : "Save Draft"}</button><button class="btn primary sm" id="publish-btn"><i class="fas fa-upload"></i> Publish</button></div>
    </div>
    <div class="workspace">
      <article class="page">
        <div class="title-row"><div class="field"><label class="label">Index</label><input class="input index-input" type="number" id="chapter-order" value="${attr(ch.chapter_order || 0)}"></div><input class="chapter-title-input" id="chapter-title" value="${attr(ch.title || "")}" placeholder="Chapter title"></div>
        <div class="toolbar"><button data-cmd="bold"><b>B</b></button><button data-cmd="italic"><i>I</i></button><button data-block="h2">H2</button><button data-block="h3">H3</button><button data-block="blockquote">Quote</button><button id="scene-btn">Scene break</button><button id="md-btn">Markdown → HTML</button><button id="clear-btn">Clear</button></div>
        <div class="editor" id="chapter-content" contenteditable="true" spellcheck="true">${content}</div>
        <div class="page-foot"><span id="word-count">0 words</span><span id="autosave-state">Local autosave armed</span></div>
      </article>
      <aside class="inspector">
        <section class="panel"><h3><i class="fas fa-lock"></i> Access</h3><div class="field"><label class="label">Tier access tag shown in rail</label><select class="select" id="required-tier"><option value="">Public / Free</option>${State.tiers.map(t => `<option value="${attr(t.id)}" ${ch.required_tier_id === t.id ? "selected" : ""}>${esc(t.name)} (rank ${esc(t.tier_rank)})</option>`).join("")}</select></div><div class="field"><label class="label">Public release date</label><input class="input" type="datetime-local" id="public-release" value="${attr(datetimeLocal(ch.public_release_at))}"></div><label class="check"><input type="checkbox" id="is-nsfw" ${ch.is_nsfw ? "checked" : ""}> NSFW / external-only chapter</label><div class="field"><label class="label">External URL</label><input class="input" id="external-url" type="url" value="${attr(ch.external_url || "")}" placeholder="https://..."></div></section>
        <section class="panel"><h3><i class="fas fa-wand-magic-sparkles"></i> Teaser</h3><textarea class="textarea" id="preview-text" placeholder="Optional locked preview text">${esc(ch.preview_text || "")}</textarea><button class="btn sm" id="generate-preview" style="margin-top:10px"><i class="fas fa-wand-magic-sparkles"></i> Generate from chapter</button></section>
        <section class="panel"><h3><i class="fas fa-circle-info"></i> Current chapter flags</h3><div class="stats" style="gap:7px">${chapterTags(ch, lookup)}<span class="pill ${ch.is_published ? "live" : "gold"}">${ch.is_published ? "Live" : "Draft"}</span></div></section>
      </aside>
    </div>`;
  wireEditor(ch);
}
function draftKey(id){ return `ea-chapter-draft:${id || "new"}:${State.selectedStoryId}`; }
function wireEditor(ch){
  const editor = $("chapter-content");
  const update = () => {
    const wc = wordCount(editor.innerHTML);
    $("word-count").textContent = `${wc.toLocaleString()} words`;
    const plain = htmlToPlainText(editor.innerHTML).replace(/\u00a0/g, " ").trim();
    if (plain) localStorage.setItem(draftKey(ch.id), editor.innerHTML); else localStorage.removeItem(draftKey(ch.id));
    $("autosave-state").textContent = `Local autosaved ${new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}`;
  };
  editor.addEventListener("paste", handlePaste);
  editor.addEventListener("input", update);
  document.querySelectorAll("[data-cmd]").forEach(btn => btn.addEventListener("click", () => { document.execCommand(btn.dataset.cmd, false, null); editor.focus(); update(); }));
  document.querySelectorAll("[data-block]").forEach(btn => btn.addEventListener("click", () => { document.execCommand("formatBlock", false, btn.dataset.block); editor.focus(); update(); }));
  $("scene-btn").addEventListener("click", () => { document.execCommand("insertHTML", false, "<hr><p><br></p>"); editor.focus(); update(); });
  $("md-btn").addEventListener("click", () => { editor.innerHTML = markdownToHtml(htmlToPlainText(editor.innerHTML)); update(); editor.focus(); });
  $("clear-btn").addEventListener("click", () => { document.execCommand("removeFormat", false, null); editor.focus(); update(); });
  $("generate-preview").addEventListener("click", () => { $("preview-text").value = makePreview(editor.innerHTML); });
  $("save-btn").addEventListener("click", () => saveChapter(ch.id, null));
  $("publish-btn").addEventListener("click", () => saveChapter(ch.id, true));
  update();
}
function handlePaste(event){
  const editor = $("chapter-content");
  const data = event.clipboardData;
  if (!data) return;
  const html = data.getData("text/html");
  const text = data.getData("text/plain");
  if (!html && !text) return;
  event.preventDefault();
  document.execCommand("insertHTML", false, html ? sanitizeHtml(html) : markdownToHtml(text));
  editor.dispatchEvent(new Event("input", { bubbles:true }));
}
async function saveChapter(id, publishOverride){
  showLoading(true);
  try {
    const orderValue = parseInt($("chapter-order").value, 10) || 0;
    const conflict = State.chapters.find(c => Number(c.chapter_order) === orderValue && c.id !== (id || null));
    if (conflict) throw new Error(`Chapter index ${orderValue} is already used by "${conflict.title}".`);
    const isNsfw = $("is-nsfw").checked;
    const externalUrl = $("external-url").value.trim() || null;
    if (isNsfw && !externalUrl) throw new Error("NSFW/external-only chapters need an external URL.");
    const existing = id ? State.chapters.find(c => c.id === id) : null;
    const publicReleaseValue = $("public-release").value || "";
    const content = normalizeHtml($("chapter-content").innerHTML);
    const record = {
      story_id: State.selectedStoryId,
      title: $("chapter-title").value.trim() || "Untitled chapter",
      content,
      chapter_order: orderValue,
      is_published: publishOverride === null ? !!existing?.is_published : !!publishOverride,
      required_tier_id: $("required-tier").value || null,
      public_release_at: publicReleaseValue ? new Date(publicReleaseValue).toISOString() : null,
      preview_text: $("preview-text").value || makePreview(content),
      is_nsfw: isNsfw,
      external_url: externalUrl
    };
    const saved = await DB.saveChapter(id || null, record);
    localStorage.removeItem(draftKey(id));
    State.editingChapterId = saved.id;
    setPersisted("ea-writer-last-chapter-id", saved.id);
    localStorage.setItem("ea-admin-last-chapter-id", saved.id);
    State.chapters = await DB.chapters(State.selectedStoryId);
    render();
    toast(record.is_published ? "Chapter published / changes saved." : "Draft saved without changing publish state.");
  } catch (err) { toast(err.message, "error"); }
  finally { showLoading(false); }
}
function applyRail(){
  $("main-shell").classList.toggle("rail-collapsed", State.railCollapsed);
  $("chapter-rail").classList.toggle("collapsed", State.railCollapsed);
  $("collapse-btn").innerHTML = `<i class="fas ${State.railCollapsed ? "fa-chevron-right" : "fa-chevron-left"}"></i>`;
}
function toggleRail(){ State.railCollapsed = !State.railCollapsed; localStorage.setItem("ea-writer-rail-collapsed", State.railCollapsed ? "true" : "false"); applyRail(); }

document.addEventListener("click", (event) => {
  const card = event.target.closest(".chapter-card[data-chapter-id]");
  if (card) { State.editingChapterId = card.dataset.chapterId; setPersisted("ea-writer-last-chapter-id", State.editingChapterId); localStorage.setItem("ea-admin-last-chapter-id", State.editingChapterId); render(); }
});
$("story-select").addEventListener("change", async (event) => { State.selectedStoryId = event.target.value; setPersisted("ea-admin-last-story-id", State.selectedStoryId); State.editingChapterId = null; await loadWorkspace(); });
$("new-btn").addEventListener("click", () => { State.editingChapterId = "new"; setPersisted("ea-writer-last-chapter-id", "new"); render(); });
$("collapse-btn").addEventListener("click", toggleRail);
$("expand-rail").addEventListener("click", toggleRail);
$("logout-btn").addEventListener("click", async () => { if (supabaseClient) await supabaseClient.auth.signOut(); });
$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) return showLogin("Supabase is not configured.");
  showLoading(true);
  const { error } = await supabaseClient.auth.signInWithPassword({ email: $("login-email").value, password: $("login-password").value });
  showLoading(false);
  if (error) showLogin(error.message);
});

initAuth().catch(err => showLogin(err.message));
