/* =====================================================================
   AETHER AUTHOR STUDIO — writer dashboard + slash command editor
   Patch module. Classic browser script; load after events.js/studio-preview.js
   and before aether-app.js.
   ===================================================================== */
"use strict";
(function () {
  const PATCH_VERSION = "author-studio-v1";
  const DEFAULT_BUCKET = "xyz";
  const AUTO_SAVE_MS = 350;
  const COMMAND_TRIGGER_KEYS = ["/", "\\"];
  const AS = {
    activeMenuIndex: 0,
    menuOpen: false,
    saveTimer: null,
    lastRange: null,
    uploading: false
  };

  const commands = [
    { id:"paragraph", icon:"book", label:"Paragraph", hint:"Plain prose block" },
    { id:"heading", icon:"layers", label:"Heading", hint:"Scene or section heading" },
    { id:"quote", icon:"quote", label:"Quote", hint:"Pull quote / epigraph" },
    { id:"divider", icon:"spark", label:"Divider", hint:"Scene break" },
    { id:"callout", icon:"info", label:"Author note", hint:"Inline note box" },
    { id:"image-upload", icon:"download", label:"Upload image", hint:"Supabase Storage bucket" },
    { id:"image-url", icon:"external", label:"Image by URL", hint:"Embed remote image" },
    { id:"link", icon:"external", label:"Link", hint:"Reader-safe anchor" },
    { id:"poll", icon:"msg", label:"Poll", hint:"Question + choices" },
    { id:"spoiler", icon:"eye", label:"Spoiler box", hint:"Collapsed spoiler details" },
    { id:"lore", icon:"map", label:"Lore card", hint:"Worldbuilding aside" },
    { id:"button", icon:"open", label:"CTA button", hint:"Linked button" }
  ];

  function e(value){ return typeof esc === "function" ? esc(value) : String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function attr(value){ return e(value).replace(/`/g, "&#96;"); }
  function ic(name){ return typeof I !== "undefined" && I[name] ? I[name] : ""; }
  function stamp(){ return new Date().toISOString(); }
  function niceTime(iso){
    if (!iso) return "never";
    try {
      const d = new Date(iso);
      return d.toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
    } catch (_) { return "just now"; }
  }
  function wordsFromText(text){
    return String(text || "").trim().split(/\s+/).filter(Boolean).length;
  }
  function textFromHtml(html){
    const div = document.createElement("div");
    div.innerHTML = String(html || "");
    return (div.textContent || "").replace(/\s+/g, " ").trim();
  }
  function countWordsFromHtml(html){ return wordsFromText(textFromHtml(html)); }
  function estimateReadMinutes(words){ return Math.max(1, Math.round(Number(words || 0) / 220)); }
  function safeSlug(value){
    return String(value || "draft").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "draft";
  }
  function safeFileName(value){
    return String(value || "image").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "image";
  }
  function storyList(){ return typeof D !== "undefined" && Array.isArray(D?.STORIES) ? D.STORIES : []; }
  function storyByDraft(draft){
    return storyList().find(s => s.id === draft.storyId || s.slug === draft.storySlug) || storyList()[0] || null;
  }
  function bucketName(){
    const cfg = typeof CONFIG !== "undefined" ? CONFIG : {};
    return (cfg?.authorStudio?.imageBucket || cfg?.storage?.authorImagesBucket || DEFAULT_BUCKET).trim() || DEFAULT_BUCKET;
  }

  function ensureAuthorState(){
    if (!store.authorStudio || typeof store.authorStudio !== "object") {
      store.authorStudio = { activeDraftId:"", drafts:[], lastOpened:"", publishMode:"draft" };
    }
    if (!Array.isArray(store.authorStudio.drafts)) store.authorStudio.drafts = [];
    if (!store.authorStudio.drafts.length) {
      const draft = makeDraft();
      store.authorStudio.drafts.push(draft);
      store.authorStudio.activeDraftId = draft.id;
      save();
    }
    if (!store.authorStudio.activeDraftId || !store.authorStudio.drafts.some(d => d.id === store.authorStudio.activeDraftId)) {
      store.authorStudio.activeDraftId = store.authorStudio.drafts[0]?.id || "";
      save();
    }
    return store.authorStudio;
  }
  function save(){ if (typeof saveStore === "function") saveStore(); }
  function nextChapterOrder(story){
    const chapters = Array.isArray(story?.chapters) ? story.chapters : [];
    const max = chapters.reduce((n, ch) => Math.max(n, Number(ch.n || ch.chapter_order || ch.order_index || 0)), 0);
    return max + 1;
  }
  function makeDraft(seed){
    const stories = storyList();
    const story = stories[0] || { id:"", slug:"", title:"Untitled story" };
    const nowIso = stamp();
    const title = seed?.title || "Untitled chapter";
    return Object.assign({
      id: "draft-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      storyId: story.id || "",
      storySlug: story.slug || story.id || "",
      chapterId: "",
      title,
      subtitle: "",
      dek: "",
      chapterOrder: nextChapterOrder(story),
      accessState: "early_access",
      requiredTierName: "Member access",
      publicReleaseAt: "",
      status: "draft",
      wordGoal: 2500,
      contentHtml: `<p>Start writing <em>${e(title)}</em> here. Type <strong>/</strong> or <strong>\\</strong> for blocks, images, polls, links, dividers, and notes.</p>`,
      excerpt: "",
      notes: "",
      assets: [],
      pollCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      savedAt: nowIso,
      contentFormat: "aether-editor-html-v1"
    }, seed || {});
  }
  function currentDraft(){
    const s = ensureAuthorState();
    return s.drafts.find(d => d.id === s.activeDraftId) || s.drafts[0];
  }
  function setActiveDraft(id){
    const s = ensureAuthorState();
    if (s.drafts.some(d => d.id === id)) {
      s.activeDraftId = id;
      s.lastOpened = stamp();
      save();
      if (typeof render === "function") render();
    }
  }
  function mutateDraft(fn, noSave){
    const draft = currentDraft();
    if (!draft) return null;
    fn(draft);
    draft.updatedAt = stamp();
    if (!noSave) {
      draft.savedAt = stamp();
      save();
    }
    return draft;
  }
  function scheduleSave(){
    window.clearTimeout(AS.saveTimer);
    AS.saveTimer = window.setTimeout(() => {
      const draft = currentDraft();
      if (!draft) return;
      draft.savedAt = stamp();
      save();
      updateSaveStatus("Saved " + niceTime(draft.savedAt));
    }, AUTO_SAVE_MS);
  }

  function sanitizeUrl(url){
    const raw = String(url || "").trim();
    if (!raw) return "";
    if (/^(https?:|mailto:|tel:|#|\/)/i.test(raw)) return raw;
    return "";
  }
  function sanitizeEditorHtml(html){
    const template = document.createElement("template");
    template.innerHTML = String(html || "");
    const allowedTags = new Set("P BR DIV SPAN STRONG B EM I U S A IMG FIGURE FIGCAPTION BLOCKQUOTE HR H2 H3 H4 UL OL LI ASIDE SECTION DETAILS SUMMARY SMALL CODE MARK BUTTON".split(" "));
    const allowedAttrs = new Set("href src alt title class data-block data-poll data-options data-reader-poll data-reader-link target rel contenteditable".split(" "));
    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
    const remove = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!allowedTags.has(node.tagName)) { remove.push(node); continue; }
      Array.from(node.attributes).forEach(a => {
        const name = a.name.toLowerCase();
        if (name.startsWith("on") || !allowedAttrs.has(name)) node.removeAttribute(a.name);
      });
      if (node.tagName === "A") {
        const href = sanitizeUrl(node.getAttribute("href"));
        if (!href) node.removeAttribute("href");
        else {
          node.setAttribute("href", href);
          if (/^https?:/i.test(href)) {
            node.setAttribute("target", "_blank");
            node.setAttribute("rel", "noopener noreferrer");
          }
        }
      }
      if (node.tagName === "IMG") {
        const src = sanitizeUrl(node.getAttribute("src"));
        if (!src) remove.push(node);
        else {
          node.setAttribute("src", src);
          node.setAttribute("loading", "lazy");
        }
      }
    }
    remove.forEach(node => node.replaceWith(document.createTextNode(node.textContent || "")));
    return template.innerHTML.trim() || "<p><br></p>";
  }
  function readerHtmlForDraft(draft){
    return sanitizeEditorHtml(draft?.contentHtml || "<p><br></p>");
  }
  function plainExcerpt(draft){
    return (draft.excerpt || textFromHtml(draft.contentHtml).slice(0, 280)).trim();
  }

  function patchRouter(){
    if (typeof parseHash === "function" && !parseHash.__authorStudioPatched) {
      const baseParseHash = parseHash;
      parseHash = function(){
        const raw = location.hash.replace(/^#\/?/, "");
        const p = raw.split("/").filter(Boolean);
        if (p[0] === "studio") {
          return {
            name: ({
              write:"studioWrite",
              chapters:"studioChapters",
              access:"studioAccess",
              announcements:"studioAnnouncements",
              media:"studioMedia",
              analytics:"studioAnalytics",
              settings:"studioSettings"
            })[p[1]] || "studioOverview",
            params: { section:p[1] || "overview", id:p[2] || "" }
          };
        }
        return baseParseHash();
      };
      parseHash.__authorStudioPatched = true;
    }
    if (typeof studioTop === "function" && !studioTop.__authorStudioPatched) {
      studioTop = function(){
        const active = ({
          studioOverview:"",
          studioWrite:"write",
          studioChapters:"chapters",
          studioAccess:"access",
          studioAnnouncements:"announcements",
          studioMedia:"media",
          studioAnalytics:"analytics",
          studioSettings:"settings"
        })[route.name];
        const nav = [
          ["","Dashboard","overview"],
          ["write","Write","aa"],
          ["chapters","Works","book"],
          ["access","Access","vault"],
          ["announcements","Posts","msg"],
          ["media","Media","spark"],
          ["analytics","Stats","grid"],
          ["settings","Settings","cog"]
        ];
        return `<div class="studio-top author-studio-top">
          <div class="st-row">
            <a class="brand" href="#/studio" data-nav="/studio">${typeof brandMark === "function" ? brandMark() : ""}<span class="btxt"><span class="serif">Aether Studio</span><small>Writer desk + CMS bridge</small></span></a>
            <span class="exit"><button class="btn sm ghost" data-nav="/">${ic("chevL")}Exit to reader</button></span>
          </div>
          <nav class="studio-nav">${nav.map(([p,l,icon])=>`<a href="#/studio${p?"/"+p:""}" data-nav="/studio${p?"/"+p:""}" class="${active===p?"active":""}">${ic(icon)}<span>${l}</span></a>`).join("")}</nav>
        </div>`;
      };
      studioTop.__authorStudioPatched = true;
    }
    if (typeof afterRender === "function" && !afterRender.__authorStudioPatched) {
      const baseAfterRender = afterRender;
      afterRender = function(){
        baseAfterRender();
        if (typeof route !== "undefined" && /^studio/.test(route.name)) afterStudioRender();
      };
      afterRender.__authorStudioPatched = true;
    }
    if (typeof handleAct === "function" && !handleAct.__authorStudioPatched) {
      const baseHandleAct = handleAct;
      handleAct = function(act, el){
        if (handleStudioAct(act, el)) return;
        return baseHandleAct(act, el);
      };
      handleAct.__authorStudioPatched = true;
    }
  }

  function dashboardMetrics(){
    const s = ensureAuthorState();
    const drafts = s.drafts;
    const active = currentDraft();
    const words = drafts.reduce((sum, d) => sum + countWordsFromHtml(d.contentHtml), 0);
    const assets = drafts.reduce((sum, d) => sum + (Array.isArray(d.assets) ? d.assets.length : 0), 0);
    return { drafts, active, words, assets };
  }
  function kpi(label, value, detail, icon){
    return `<div class="as-kpi"><span class="as-kpi-icon">${ic(icon)}</span><div><div class="lbl">${e(label)}</div><div class="val">${e(value)}</div><div class="hint">${e(detail || "")}</div></div></div>`;
  }
  function draftStatusBadge(draft){
    const map = { draft:"Draft", review:"Review", scheduled:"Scheduled", published:"Published" };
    const cls = draft.status === "published" ? "free" : draft.status === "scheduled" ? "early" : draft.status === "review" ? "preview" : "";
    return typeof badge === "function" ? badge(cls, map[draft.status] || draft.status || "Draft") : `<span class="badge ${cls}">${e(map[draft.status] || draft.status || "Draft")}</span>`;
  }
  function draftRows(limit){
    const s = ensureAuthorState();
    return s.drafts.slice(0, limit || 99).map(d => {
      const story = storyByDraft(d);
      const words = countWordsFromHtml(d.contentHtml);
      return `<button class="as-draft-row ${s.activeDraftId===d.id?"active":""}" data-as-draft="${attr(d.id)}">
        <span class="as-draft-main"><b>${e(d.title || "Untitled chapter")}</b><small>${e(story?.title || "No story")} · ${words.toLocaleString()} words · ${niceTime(d.savedAt)}</small></span>
        <span class="as-draft-state">${draftStatusBadge(d)}</span>
      </button>`;
    }).join("");
  }

  function studioDashboardView(){
    ensureAuthorState();
    const m = dashboardMetrics();
    const draft = m.active;
    const story = storyByDraft(draft);
    const words = countWordsFromHtml(draft.contentHtml);
    const goalPct = Math.min(100, Math.round(words / Math.max(1, Number(draft.wordGoal || 2500)) * 100));
    return `<div class="author-studio as-dashboard" data-author-studio-root>
      <div class="as-hero card tinted">
        <div>
          <div class="eyebrow">Author dashboard</div>
          <h1 class="page-title">Write, package, and publish without leaving the reader shell.</h1>
          <p class="page-sub">A focused author desk with a slash command editor, image insertion, polls, links, Supabase Storage uploads, local autosave, and a guarded Supabase publish bridge.</p>
          <div class="as-hero-actions">
            <button class="btn story" data-nav="/studio/write">${ic("aa")}Open writer</button>
            <button class="btn ghost" data-as-action="new-draft">${ic("plus")}New draft</button>
            <a class="btn ghost" href="admin.html">${ic("shield")}Admin CMS</a>
          </div>
        </div>
        <div class="as-current-draft">
          <div class="as-current-top"><span>${ic("book")}</span><b>${e(draft.title || "Untitled chapter")}</b></div>
          <p>${e(story?.title || "Pick a story")} · Chapter ${e(draft.chapterOrder || "—")} · ${words.toLocaleString()} words</p>
          <div class="bar"><i style="width:${goalPct}%"></i></div>
          <small>${goalPct}% of ${Number(draft.wordGoal || 2500).toLocaleString()} word target · saved ${niceTime(draft.savedAt)}</small>
        </div>
      </div>
      <div class="as-kpi-grid">
        ${kpi("Drafts", m.drafts.length, "Browser autosaved", "book")}
        ${kpi("Total words", m.words.toLocaleString(), `${estimateReadMinutes(m.words)} min reader time`, "trending")}
        ${kpi("Assets", m.assets, `Bucket: ${bucketName()}`, "spark")}
        ${kpi("Publish bridge", typeof getSupabase === "function" && getSupabase() ? "Ready" : "Needs auth", "Uses existing chapters table", "sync")}
      </div>
      <div class="as-grid-2">
        <section class="card"><div class="section-head"><h2>Draft queue</h2><button class="btn sm ghost" data-as-action="new-draft">${ic("plus")}New</button></div><div class="as-draft-list">${draftRows(8)}</div></section>
        <section class="card"><div class="section-head"><h2>Writer workflow</h2></div>
          <div class="as-checklist">
            <div><span>${ic("checkCirc")}</span><b>Write</b><small>Use / or \ commands for rich blocks.</small></div>
            <div><span>${ic("download")}</span><b>Add art</b><small>Upload to Supabase Storage bucket <code>${e(bucketName())}</code>.</small></div>
            <div><span>${ic("eye")}</span><b>Preview</b><small>Reader-safe HTML preview stays beside the draft.</small></div>
            <div><span>${ic("sync")}</span><b>Publish</b><small>Guarded insert/update into the existing <code>chapters</code> table.</small></div>
          </div>
        </section>
      </div>
    </div>`;
  }

  function storyOptions(draft){
    return storyList().map(s => `<option value="${attr(s.id || s.slug)}" data-slug="${attr(s.slug || s.id)}" ${draft.storyId===(s.id||s.slug) || draft.storySlug===(s.slug||s.id) ? "selected" : ""}>${e(s.title || s.slug || "Untitled story")}</option>`).join("");
  }
  function accessOptions(draft){
    const values = [
      ["free", "Free"],
      ["early_access", "Early access"],
      ["member", "Member locked"],
      ["key_locked", "Access key"],
      ["preview", "Preview only"],
      ["unavailable", "Unavailable"]
    ];
    return values.map(([v,l]) => `<option value="${v}" ${draft.accessState===v?"selected":""}>${l}</option>`).join("");
  }
  function statusOptions(draft){
    return ["draft", "review", "scheduled", "published"].map(v => `<option value="${v}" ${draft.status===v?"selected":""}>${v[0].toUpperCase()+v.slice(1)}</option>`).join("");
  }
  function commandMenuHtml(){
    return `<div id="as-command-menu" class="as-command-menu" hidden>${commands.map((cmd, i) => `<button type="button" class="${i===0?"active":""}" data-as-command="${cmd.id}"><span>${ic(cmd.icon)}</span><b>${e(cmd.label)}</b><small>${e(cmd.hint)}</small></button>`).join("")}</div>`;
  }
  function studioWriteView(){
    const draft = currentDraft();
    const words = countWordsFromHtml(draft.contentHtml);
    const readMin = estimateReadMinutes(words);
    const goalPct = Math.min(100, Math.round(words / Math.max(1, Number(draft.wordGoal || 2500)) * 100));
    return `<div class="author-studio as-write" data-author-studio-root>
      <aside class="as-panel as-left-panel">
        <div class="as-panel-head"><div><div class="eyebrow">Manuscript</div><h2>${e(draft.title || "Untitled chapter")}</h2></div>${draftStatusBadge(draft)}</div>
        <label class="as-field"><span>Story</span><select data-as-field="storyId">${storyOptions(draft)}</select></label>
        <label class="as-field"><span>Chapter title</span><input data-as-field="title" value="${attr(draft.title)}" placeholder="Chapter title"></label>
        <label class="as-field"><span>Subtitle / deck</span><input data-as-field="dek" value="${attr(draft.dek || "")}" placeholder="Optional short hook"></label>
        <div class="as-row-fields">
          <label class="as-field"><span>Chapter #</span><input type="number" min="1" data-as-field="chapterOrder" value="${attr(draft.chapterOrder)}"></label>
          <label class="as-field"><span>Goal</span><input type="number" min="100" step="100" data-as-field="wordGoal" value="${attr(draft.wordGoal)}"></label>
        </div>
        <div class="as-row-fields">
          <label class="as-field"><span>Access</span><select data-as-field="accessState">${accessOptions(draft)}</select></label>
          <label class="as-field"><span>Status</span><select data-as-field="status">${statusOptions(draft)}</select></label>
        </div>
        <label class="as-field"><span>Public release</span><input type="datetime-local" data-as-field="publicReleaseAt" value="${attr((draft.publicReleaseAt || "").slice(0,16))}"></label>
        <label class="as-field"><span>Excerpt</span><textarea data-as-field="excerpt" rows="4" placeholder="Reader preview / catalog teaser">${e(draft.excerpt || "")}</textarea></label>
        <div class="as-stats-card">
          <div><b data-as-word-count>${words.toLocaleString()}</b><small>words</small></div>
          <div><b data-as-read-time>${readMin}</b><small>min read</small></div>
          <div><b data-as-asset-count>${(draft.assets || []).length}</b><small>assets</small></div>
        </div>
        <div class="bar as-goal"><i data-as-goal-bar style="width:${goalPct}%"></i></div>
        <small class="faint">Saved <span data-as-save-status>${niceTime(draft.savedAt)}</span></small>
      </aside>

      <section class="as-editor-shell card">
        <div class="as-toolbar">
          <div class="as-toolbar-group"><button class="btn sm ghost" data-as-action="command-menu">${ic("spark")}Blocks</button><button class="btn sm ghost" data-as-action="image-upload">${ic("download")}Image</button><button class="btn sm ghost" data-as-action="divider">${ic("spark")}Divider</button><button class="btn sm ghost" data-as-action="poll">${ic("msg")}Poll</button></div>
          <div class="as-toolbar-group"><button class="btn sm ghost" data-as-action="export-html">${ic("copy")}Copy HTML</button><button class="btn sm ghost" data-as-action="save-local">${ic("book")}Save</button><button class="btn sm story" data-as-action="db-save">${ic("sync")}Save to Supabase</button></div>
        </div>
        <input class="as-title-input" data-as-field="title" value="${attr(draft.title)}" placeholder="Untitled chapter">
        <div class="as-editor-wrap">
          <div id="as-editor" class="as-editor" contenteditable="true" spellcheck="true" data-placeholder="Write here. Type / or \\ for commands.">${readerHtmlForDraft(draft)}</div>
          ${commandMenuHtml()}
        </div>
        <input id="as-image-input" class="as-hidden-file" type="file" accept="image/*">
        <div class="as-editor-footer"><span>${ic("info")} Type <kbd>/</kbd> or <kbd>\\</kbd> to open commands.</span><span data-as-footer-status>${words.toLocaleString()} words · ${readMin} min read</span></div>
      </section>

      <aside class="as-panel as-right-panel">
        <div class="as-panel-head"><div><div class="eyebrow">Reader preview</div><h2>Live output</h2></div><button class="btn sm ghost" data-as-action="refresh-preview">${ic("eye")}Refresh</button></div>
        <div class="as-preview-card">
          <h1 data-as-preview-title>${e(draft.title || "Untitled chapter")}</h1>
          <p class="faint" data-as-preview-meta>${e(storyByDraft(draft)?.title || "No story")} · ${words.toLocaleString()} words · ${readMin} min</p>
          <div class="as-preview-prose" data-as-preview>${readerHtmlForDraft(draft)}</div>
        </div>
        <div class="section-head" style="margin-top:18px"><h2>Drafts</h2><button class="btn sm ghost" data-as-action="new-draft">${ic("plus")}New</button></div>
        <div class="as-draft-list small">${draftRows(6)}</div>
        <div class="as-danger-zone"><button class="btn sm ghost" data-as-action="duplicate-draft">${ic("copy")}Duplicate</button><button class="btn sm ghost" data-as-action="delete-draft">${ic("x")}Delete</button></div>
      </aside>
    </div>`;
  }

  function studioWorksView(){
    ensureAuthorState();
    const drafts = store.authorStudio.drafts;
    const backendChapters = storyList().flatMap(s => (s.chapters || []).map(c => ({ story:s, chapter:c })));
    return `<div class="author-studio" data-author-studio-root>
      <div class="between"><div><h1 class="page-title">Works</h1><p class="page-sub">Drafts, backend chapters, and publish state from one desk.</p></div><button class="btn story" data-nav="/studio/write">${ic("aa")}Write</button></div>
      <div class="as-grid-2">
        <section class="card"><div class="section-head"><h2>Local writer drafts</h2><button class="btn sm ghost" data-as-action="new-draft">${ic("plus")}New draft</button></div><div class="as-draft-list">${draftRows(99)}</div></section>
        <section class="card"><div class="section-head"><h2>Published catalog</h2><span class="faint" style="font-size:.78rem">${backendChapters.length} chapters</span></div>
          ${backendChapters.length ? backendChapters.map(({story, chapter}) => `<div class="mgr-row"><span class="mi-ic">${ic(chapter.state === "free" ? "open" : "lock")}</span><div class="mi-body"><div class="mi-t"><span>${e(chapter.title)}</span>${typeof badge === "function" ? badge(chapter.state === "free" ? "free" : "", chapter.state || "member") : ""}</div><div class="mi-s">${e(story.title)} · Ch ${e(chapter.n || "—")} · ${e(chapter.wordCount || (chapter.readTime * 220))} words</div></div><div class="mi-acts"><button class="btn sm ghost" data-as-action="draft-from-chapter" data-chapter-id="${attr(chapter.id)}">${ic("copy")}Draft copy</button></div></div>`).join("") : `<div class="empty"><div class="em">${ic("book")}</div><h3>No backend chapters yet</h3><p>Write a draft, then use the Supabase save bridge when your schema is ready.</p></div>`}
        </section>
      </div>
    </div>`;
  }

  function studioMediaView(){
    const draft = currentDraft();
    return `<div class="author-studio" data-author-studio-root>
      <div class="between"><div><h1 class="page-title">Media</h1><p class="page-sub">Uploads target the Supabase Storage bucket <code>${e(bucketName())}</code>.</p></div><button class="btn story" data-as-action="image-upload">${ic("download")}Upload image</button></div>
      <input id="as-image-input" class="as-hidden-file" type="file" accept="image/*">
      <div class="as-media-grid">${(draft.assets || []).length ? draft.assets.map(asset => `<figure class="as-media-card"><img src="${attr(asset.url)}" alt="${attr(asset.name || "Uploaded image")}"><figcaption><b>${e(asset.name || "Image")}</b><small>${e(asset.bucket || bucketName())}/${e(asset.path || "")}</small><button class="btn sm ghost" data-as-action="insert-asset" data-url="${attr(asset.url)}">${ic("plus")}Insert</button></figcaption></figure>`).join("") : `<div class="empty"><div class="em">${ic("spark")}</div><h3>No uploaded assets in this draft</h3><p>Upload from the writer or paste a web image URL through the slash command menu.</p></div>`}</div>
    </div>`;
  }

  function registerViews(){
    if (typeof VIEWS === "undefined") return;
    VIEWS.studioOverview = studioDashboardView;
    VIEWS.studioWrite = studioWriteView;
    VIEWS.studioChapters = studioWorksView;
    VIEWS.studioMedia = studioMediaView;
  }

  function afterStudioRender(){
    ensureAuthorState();
    const root = document.querySelector("[data-author-studio-root]");
    if (!root) return;
    const editor = document.getElementById("as-editor");
    if (editor && !editor.dataset.asMounted) {
      editor.dataset.asMounted = "1";
      editor.addEventListener("paste", onEditorPaste);
      editor.addEventListener("input", onEditorInput);
      editor.addEventListener("keydown", onEditorKeydown);
      editor.addEventListener("keyup", saveCurrentRange);
      editor.addEventListener("mouseup", saveCurrentRange);
    }
    const file = document.getElementById("as-image-input");
    if (file && !file.dataset.asMounted) {
      file.dataset.asMounted = "1";
      file.addEventListener("change", () => {
        const picked = Array.from(file.files || []);
        file.value = "";
        if (picked[0]) uploadImage(picked[0]).catch(err => notify("Image upload failed", err.message || "Supabase Storage rejected the file.", "bad", "alert"));
      });
    }
    refreshLiveStats(false);
  }
  function saveCurrentRange(){
    const editor = document.getElementById("as-editor");
    const sel = window.getSelection();
    if (!editor || !sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) AS.lastRange = range.cloneRange();
  }
  function restoreRange(){
    const editor = document.getElementById("as-editor");
    if (!editor) return false;
    const sel = window.getSelection();
    if (AS.lastRange && editor.contains(AS.lastRange.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(AS.lastRange);
      return true;
    }
    editor.focus();
    return true;
  }
  function onEditorPaste(evt){
    const text = evt.clipboardData?.getData("text/plain");
    if (!text) return;
    evt.preventDefault();
    const html = text.split(/\n{2,}/).map(part => `<p>${e(part).replace(/\n/g, "<br>")}</p>`).join("");
    insertHtmlAtCaret(html || `<p>${e(text)}</p>`);
    refreshLiveStats();
  }
  function onEditorInput(){
    refreshLiveStats();
  }
  function onEditorKeydown(evt){
    if (AS.menuOpen) {
      if (evt.key === "ArrowDown" || evt.key === "ArrowUp") {
        evt.preventDefault();
        moveMenu(evt.key === "ArrowDown" ? 1 : -1);
        return;
      }
      if (evt.key === "Enter") {
        evt.preventDefault();
        const cmd = commands[AS.activeMenuIndex];
        if (cmd) runCommand(cmd.id);
        return;
      }
      if (evt.key === "Escape") {
        evt.preventDefault();
        hideCommandMenu();
        return;
      }
    }
    if (COMMAND_TRIGGER_KEYS.includes(evt.key)) {
      window.setTimeout(() => showCommandMenu(), 0);
    }
  }
  function moveMenu(delta){
    AS.activeMenuIndex = (AS.activeMenuIndex + delta + commands.length) % commands.length;
    const menu = document.getElementById("as-command-menu");
    if (!menu) return;
    menu.querySelectorAll("button").forEach((btn, i) => btn.classList.toggle("active", i === AS.activeMenuIndex));
    menu.querySelector("button.active")?.scrollIntoView({ block:"nearest" });
  }
  function showCommandMenu(){
    const menu = document.getElementById("as-command-menu");
    const editor = document.getElementById("as-editor");
    if (!menu || !editor) return;
    saveCurrentRange();
    const rect = caretRect();
    const host = editor.getBoundingClientRect();
    menu.hidden = false;
    menu.style.left = Math.min(Math.max(12, rect.left - host.left), Math.max(12, host.width - 330)) + "px";
    menu.style.top = Math.min(Math.max(16, rect.bottom - host.top + 8), Math.max(16, host.height - 320)) + "px";
    AS.menuOpen = true;
    AS.activeMenuIndex = 0;
    moveMenu(0);
  }
  function hideCommandMenu(){
    const menu = document.getElementById("as-command-menu");
    if (menu) menu.hidden = true;
    AS.menuOpen = false;
  }
  function caretRect(){
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0).cloneRange();
      range.collapse(true);
      let rect = range.getBoundingClientRect();
      if (rect && rect.width + rect.height > 0) return rect;
      const span = document.createElement("span");
      span.textContent = "\u200b";
      range.insertNode(span);
      rect = span.getBoundingClientRect();
      span.remove();
      return rect;
    }
    const editor = document.getElementById("as-editor");
    return editor?.getBoundingClientRect() || { left:0, right:0, top:0, bottom:0 };
  }
  function deleteSlashToken(){
    restoreRange();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node && node.nodeType === Node.TEXT_NODE) {
      const offset = range.startOffset;
      const text = node.textContent || "";
      const slash = Math.max(text.lastIndexOf("/", offset - 1), text.lastIndexOf("\\", offset - 1));
      if (slash >= 0 && /^[\\/]\w*$/.test(text.slice(slash, offset))) {
        range.setStart(node, slash);
        range.deleteContents();
      }
    }
  }
  function insertHtmlAtCaret(html){
    restoreRange();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const frag = range.createContextualFragment(html);
    const last = frag.lastChild;
    range.insertNode(frag);
    if (last) {
      range.setStartAfter(last);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    saveCurrentRange();
  }
  function runCommand(id){
    hideCommandMenu();
    deleteSlashToken();
    const map = {
      paragraph: () => insertHtmlAtCaret(`<p>New paragraph...</p>`),
      heading: () => insertHtmlAtCaret(`<h2>Scene heading</h2><p><br></p>`),
      quote: () => insertHtmlAtCaret(`<blockquote data-block="quote"><p>Quoted line or epigraph...</p></blockquote><p><br></p>`),
      divider: () => insertHtmlAtCaret(`<hr data-block="divider"><p><br></p>`),
      callout: () => insertHtmlAtCaret(`<aside class="reader-callout" data-block="callout"><strong>Author note</strong><p>Write the note here.</p></aside><p><br></p>`),
      "image-upload": () => openImagePicker(),
      "image-url": () => insertImageFromUrl(),
      link: () => insertLink(),
      poll: () => insertPoll(),
      spoiler: () => insertHtmlAtCaret(`<details data-block="spoiler"><summary>Spoiler-safe note</summary><p>Hidden text goes here.</p></details><p><br></p>`),
      lore: () => insertHtmlAtCaret(`<aside class="reader-lore-card" data-block="lore"><strong>Lore card</strong><p>World detail, character note, or continuity reference.</p></aside><p><br></p>`),
      button: () => insertButtonLink()
    };
    (map[id] || map.paragraph)();
    refreshLiveStats();
  }
  function insertImage(url, caption){
    const safe = sanitizeUrl(url);
    if (!safe) return;
    insertHtmlAtCaret(`<figure data-block="image"><img src="${attr(safe)}" alt="${attr(caption || "Story image")}"><figcaption>${e(caption || "Caption")}</figcaption></figure><p><br></p>`);
    refreshLiveStats();
  }
  function insertImageFromUrl(){
    const url = window.prompt("Image URL", "https://");
    if (!url) return;
    const caption = window.prompt("Caption", "Illustration");
    insertImage(url, caption || "Illustration");
  }
  function insertPoll(){
    const q = window.prompt("Poll question", "What should readers vote on?");
    if (!q) return;
    const raw = window.prompt("Options, comma separated", "Option one, Option two");
    const options = String(raw || "").split(",").map(v => v.trim()).filter(Boolean).slice(0, 6);
    if (options.length < 2) return notify("Poll needs choices", "Add at least two options.", "bad", "alert");
    mutateDraft(d => { d.pollCount = Number(d.pollCount || 0) + 1; });
    insertHtmlAtCaret(`<section class="reader-poll" data-block="poll" data-reader-poll="poll-${Date.now()}" contenteditable="false"><strong>${e(q)}</strong>${options.map(o => `<button type="button">${e(o)}</button>`).join("")}</section><p><br></p>`);
    refreshLiveStats();
  }
  function insertLink(){
    const sel = window.getSelection();
    const picked = sel ? sel.toString().trim() : "";
    const label = window.prompt("Link text", picked || "Open link");
    if (!label) return;
    const url = sanitizeUrl(window.prompt("URL", "https://"));
    if (!url) return notify("Link blocked", "Use http, https, mailto, tel, #, or a relative path.", "bad", "alert");
    insertHtmlAtCaret(`<a href="${attr(url)}">${e(label)}</a>`);
    refreshLiveStats();
  }
  function insertButtonLink(){
    const label = window.prompt("Button label", "Open bonus material");
    if (!label) return;
    const url = sanitizeUrl(window.prompt("Button URL", "https://"));
    if (!url) return notify("Button blocked", "Use http, https, mailto, tel, #, or a relative path.", "bad", "alert");
    insertHtmlAtCaret(`<p><a class="reader-button" data-block="button" href="${attr(url)}">${e(label)}</a></p><p><br></p>`);
    refreshLiveStats();
  }
  function openImagePicker(){
    const file = document.getElementById("as-image-input");
    if (file) file.click();
  }
  async function uploadImage(file){
    if (!file || !file.type?.startsWith("image/")) throw new Error("Pick an image file.");
    if (typeof getSupabase !== "function") throw new Error("Supabase client helper is unavailable.");
    const client = getSupabase();
    if (!client) throw new Error("Supabase is not configured.");
    if (!authState?.user) throw new Error("Sign in as an admin before uploading.");
    AS.uploading = true;
    updateSaveStatus("Uploading image...");
    const bucket = bucketName();
    const path = `${authState.user.id}/${Date.now()}-${safeFileName(file.name)}`;
    const { error } = await client.storage.from(bucket).upload(path, file, { cacheControl:"3600", upsert:false });
    if (error) throw error;
    const publicResult = client.storage.from(bucket).getPublicUrl(path);
    const url = publicResult?.data?.publicUrl;
    if (!url) throw new Error("Upload succeeded, but no public URL was returned.");
    mutateDraft(d => {
      if (!Array.isArray(d.assets)) d.assets = [];
      d.assets.unshift({ type:"image", bucket, path, url, name:file.name, size:file.size, uploadedAt:stamp() });
    });
    insertImage(url, file.name.replace(/\.[^.]+$/, ""));
    notify("Image uploaded", `Stored in ${bucket}.`, "good", "checkCirc");
    AS.uploading = false;
    refreshLiveStats();
    return url;
  }
  function updateSaveStatus(text){
    document.querySelectorAll("[data-as-save-status]").forEach(el => { el.textContent = String(text || "saved"); });
    const footer = document.querySelector("[data-as-footer-status]");
    if (footer && currentDraft()) {
      const words = countWordsFromHtml(currentDraft().contentHtml);
      footer.textContent = `${words.toLocaleString()} words · ${estimateReadMinutes(words)} min read`;
    }
  }
  function refreshLiveStats(shouldSave = true){
    const editor = document.getElementById("as-editor");
    const draft = currentDraft();
    if (!draft) return;
    if (editor) {
      draft.contentHtml = sanitizeEditorHtml(editor.innerHTML);
      draft.updatedAt = stamp();
    }
    const words = countWordsFromHtml(draft.contentHtml);
    const readMin = estimateReadMinutes(words);
    const goalPct = Math.min(100, Math.round(words / Math.max(1, Number(draft.wordGoal || 2500)) * 100));
    document.querySelectorAll("[data-as-word-count]").forEach(el => { el.textContent = words.toLocaleString(); });
    document.querySelectorAll("[data-as-read-time]").forEach(el => { el.textContent = readMin; });
    document.querySelectorAll("[data-as-asset-count]").forEach(el => { el.textContent = (draft.assets || []).length; });
    document.querySelectorAll("[data-as-goal-bar]").forEach(el => { el.style.width = goalPct + "%"; });
    document.querySelectorAll("[data-as-preview-title]").forEach(el => { el.textContent = draft.title || "Untitled chapter"; });
    document.querySelectorAll("[data-as-preview-meta]").forEach(el => { el.textContent = `${storyByDraft(draft)?.title || "No story"} · ${words.toLocaleString()} words · ${readMin} min`; });
    document.querySelectorAll("[data-as-preview]").forEach(el => { el.innerHTML = readerHtmlForDraft(draft); });
    if (shouldSave) scheduleSave();
  }

  function onFieldInput(el){
    const field = el.dataset.asField;
    mutateDraft(draft => {
      if (field === "storyId") {
        const selected = storyList().find(s => (s.id || s.slug) === el.value);
        draft.storyId = selected?.id || el.value;
        draft.storySlug = selected?.slug || selected?.id || el.value;
      } else if (field === "chapterOrder" || field === "wordGoal") {
        draft[field] = Number(el.value || 0);
      } else {
        draft[field] = el.value;
      }
    }, true);
    document.querySelectorAll(`[data-as-field="${field}"]`).forEach(other => {
      if (other !== el && other.value !== el.value) other.value = el.value;
    });
    refreshLiveStats();
  }
  function notify(title, sub, kind, iconName){
    if (typeof toast === "function") toast(title, sub, { kind:kind === "bad" ? "bad" : "good", icon:iconName || (kind === "bad" ? "alert" : "checkCirc"), ms: kind === "bad" ? 6500 : 3600 });
  }
  async function saveDraftToSupabase(){
    const draft = currentDraft();
    if (!draft) return;
    if (typeof getSupabase !== "function") throw new Error("Supabase client helper is unavailable.");
    const client = getSupabase();
    if (!client) throw new Error("Supabase is not configured.");
    if (!authState?.user || (typeof isAdmin === "function" && !isAdmin())) throw new Error("Admin sign-in is required.");
    const story = storyByDraft(draft);
    if (!story?.id && !draft.storyId) throw new Error("Pick a story first.");
    const words = countWordsFromHtml(draft.contentHtml);
    const payload = {
      story_id: story?.id || draft.storyId,
      title: draft.title || "Untitled chapter",
      content: readerHtmlForDraft(draft),
      preview_text: plainExcerpt(draft),
      chapter_order: Number(draft.chapterOrder || 0) || null,
      word_count: words,
      status: draft.status || "draft",
      is_published: draft.status === "published",
      public_release_at: draft.publicReleaseAt || null,
      updated_at: stamp()
    };
    let result;
    if (draft.chapterId) {
      result = await client.from("chapters").update(payload).eq("id", draft.chapterId).select("id").single();
    } else {
      result = await client.from("chapters").insert(Object.assign({ created_at: stamp() }, payload)).select("id").single();
    }
    if (result.error) throw result.error;
    mutateDraft(d => {
      d.chapterId = result.data?.id || d.chapterId;
      d.savedAt = stamp();
    });
    if (typeof loadBackendLibrary === "function") loadBackendLibrary({ force:true }).then(() => typeof render === "function" && render()).catch(() => {});
    notify("Saved to Supabase", draft.status === "published" ? "Chapter is marked published." : "Draft was written to the chapters table.", "good", "sync");
  }
  async function copyTextToClipboard(text){
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  function exportHtml(){
    const draft = currentDraft();
    const html = readerHtmlForDraft(draft);
    copyTextToClipboard(html).then(() => notify("HTML copied", "Reader-safe chapter HTML is on your clipboard.", "good", "copy"));
  }
  function createNewDraft(){
    const draft = makeDraft({ title:"Untitled chapter" });
    ensureAuthorState().drafts.unshift(draft);
    store.authorStudio.activeDraftId = draft.id;
    save();
    if (typeof nav === "function") nav("/studio/write"); else if (typeof render === "function") render();
  }
  function duplicateDraft(){
    const old = currentDraft();
    if (!old) return;
    const copy = makeDraft(Object.assign({}, old, { id:undefined, chapterId:"", title:(old.title || "Untitled chapter") + " copy", status:"draft", createdAt:stamp(), updatedAt:stamp(), savedAt:stamp() }));
    ensureAuthorState().drafts.unshift(copy);
    store.authorStudio.activeDraftId = copy.id;
    save();
    render();
  }
  function deleteDraft(){
    const s = ensureAuthorState();
    if (s.drafts.length <= 1) return notify("Keep one draft", "Create another draft before deleting this one.", "bad", "alert");
    const draft = currentDraft();
    if (!window.confirm(`Delete “${draft.title || "Untitled chapter"}”?`)) return;
    s.drafts = s.drafts.filter(d => d.id !== draft.id);
    s.activeDraftId = s.drafts[0]?.id || "";
    save();
    render();
  }
  function handleStudioAct(act, el){
    const map = {
      "studio-new-chapter": () => { createNewDraft(); return true; },
      "studio-edit": () => { if (typeof nav === "function") nav("/studio/write"); return true; },
      "studio-upload": () => { openImagePicker(); return true; }
    };
    if (map[act]) return map[act]();
    return false;
  }
  function handleAsAction(action, el){
    switch (action) {
      case "new-draft": createNewDraft(); break;
      case "duplicate-draft": duplicateDraft(); break;
      case "delete-draft": deleteDraft(); break;
      case "save-local": mutateDraft(d => { d.savedAt = stamp(); }); notify("Draft saved", "Browser copy updated.", "good", "book"); refreshLiveStats(false); break;
      case "db-save": saveDraftToSupabase().catch(err => notify("Supabase save failed", err.message || "The existing schema rejected the payload.", "bad", "alert")); break;
      case "export-html": exportHtml(); break;
      case "command-menu": showCommandMenu(); break;
      case "image-upload": openImagePicker(); break;
      case "image-url": insertImageFromUrl(); break;
      case "divider": runCommand("divider"); break;
      case "poll": runCommand("poll"); break;
      case "refresh-preview": refreshLiveStats(false); notify("Preview refreshed", null, "good", "eye"); break;
      case "insert-asset": insertImage(el.dataset.url, "Illustration"); if (typeof nav === "function") nav("/studio/write"); break;
      case "draft-from-chapter": createNewDraft(); notify("Draft copy created", "Open the writer to paste or import chapter content.", "good", "copy"); break;
      default: return false;
    }
    return true;
  }

  document.addEventListener("click", evt => {
    const command = evt.target.closest("[data-as-command]");
    if (command) {
      evt.preventDefault();
      evt.stopPropagation();
      runCommand(command.dataset.asCommand);
      return;
    }
    const draftBtn = evt.target.closest("[data-as-draft]");
    if (draftBtn) {
      evt.preventDefault();
      evt.stopPropagation();
      setActiveDraft(draftBtn.dataset.asDraft);
      return;
    }
    const action = evt.target.closest("[data-as-action]");
    if (action) {
      evt.preventDefault();
      evt.stopPropagation();
      handleAsAction(action.dataset.asAction, action);
    }
  }, true);
  document.addEventListener("input", evt => {
    const field = evt.target.closest?.("[data-as-field]");
    if (!field) return;
    onFieldInput(field);
  }, true);
  document.addEventListener("selectionchange", () => {
    if (typeof route !== "undefined" && route?.name === "studioWrite") saveCurrentRange();
  });

  patchRouter();
  registerViews();
  ensureAuthorState();
  window.AetherAuthorStudio = {
    version: PATCH_VERSION,
    currentDraft,
    createNewDraft,
    exportHtml,
    saveDraftToSupabase,
    bucketName
  };
})();
