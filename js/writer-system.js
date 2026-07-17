(function () {
  "use strict";

  const Core = () => window.AetherSystemCore;
  const state = {
    ctx: null, system: null, versions: [], checkpoints: [],
    selectedVersionId: null, selectedPageId: null, selectedChapterId: null,
    checkpointState: { values: {} }, previousState: { values: {} }, checkpointVersion: null
  };

  function esc(value) { return Core().escapeHtml(value); }
  function root() { return document.getElementById("writer-system-root"); }
  function drawer() { return document.getElementById("writer-system-drawer"); }
  function chapters() { return state.ctx?.getChapters?.() || []; }
  function toast(message, type) { state.ctx?.toast?.(message, type); }
  function activeVersion() { return state.versions.find(v => v.id === state.selectedVersionId) || state.versions[0]; }
  function activeDefinition() { return Core().clone(activeVersion()?.definition || { startPageId: "status", pages: [] }); }
  function chapterOptions(includeBaseline) {
    return `${includeBaseline ? '<option value="">Before Chapter 1 baseline</option>' : ""}${chapters().slice().sort((a,b)=>a.chapter_order-b.chapter_order).map(ch => `<option value="${esc(ch.id)}">Ch. ${esc(ch.chapter_order)} · ${esc(ch.title)}</option>`).join("")}`;
  }
  function starterDefinition() {
    return { startPageId: "status", pages: [{ id: "status", title: "Status Screen", fields: [{ id: "name", label: "Name", type: "text" }] }] };
  }

  async function load() {
    const client = state.ctx.client;
    const storyId = state.ctx.getStoryId();
    state.system = null; state.versions = []; state.checkpoints = [];
    if (!storyId) return;
    const { data: systems, error } = await client.from("story_systems").select("*").eq("story_id", storyId).limit(1);
    if (error) throw error;
    state.system = systems?.[0] || null;
    if (!state.system) return;
    const [{ data: versions, error: versionError }, { data: checkpoints, error: checkpointError }] = await Promise.all([
      client.from("story_system_versions").select("*").eq("system_id", state.system.id).order("version_number"),
      client.from("story_system_checkpoints").select("*").eq("system_id", state.system.id).in("status", ["draft", "published"]).order("created_at")
    ]);
    if (versionError) throw versionError;
    if (checkpointError) throw checkpointError;
    state.versions = versions || [];
    state.checkpoints = checkpoints || [];
    if (!state.versions.some(v => v.id === state.selectedVersionId)) state.selectedVersionId = state.versions[0]?.id || null;
    const definition = activeDefinition();
    if (!definition.pages.some(page => page.id === state.selectedPageId)) state.selectedPageId = definition.startPageId || definition.pages[0]?.id;
  }

  async function createSystem() {
    const client = state.ctx.client;
    const storyId = state.ctx.getStoryId();
    if (!storyId) return;
    const { data: system, error } = await client.from("story_systems").insert({ story_id: storyId, name: "System" }).select().single();
    if (error) throw error;
    const { error: versionError } = await client.from("story_system_versions").insert({
      system_id: system.id, version_number: 1, name: "Version 1", definition: starterDefinition()
    });
    if (versionError) throw versionError;
    await load(); renderBuilder();
  }

  function builderHtml() {
    if (!state.system) return `<div class="p-10 text-center"><i class="fa-solid fa-microchip text-5xl text-zinc-700"></i><h2 class="text-2xl font-bold mt-5">No system configured</h2><p class="text-zinc-500 mt-2">Create a structured, chapter-versioned system for this story.</p><button data-wsystem-action="create-system" class="mt-5 px-5 py-2 rounded-lg bg-primary-600 text-white">Create System</button></div>`;
    const version = activeVersion();
    const definition = activeDefinition();
    const page = definition.pages.find(item => item.id === state.selectedPageId) || definition.pages[0];
    const appearance = state.system.appearance || {};
    const pageAppearance = Object.assign({}, appearance.default || {}, appearance.pages?.[page?.id] || {});
    return `<div class="h-full flex flex-col overflow-hidden">
      <header class="px-7 py-5 border-b border-zinc-800 flex items-center justify-between"><div><h2 class="text-2xl font-bold">System Builder</h2><p class="text-sm text-zinc-500">Structure is versioned by chapter boundary; appearance restyles every checkpoint.</p></div><button data-wsystem-action="open-checkpoint" class="px-4 py-2 rounded-lg bg-primary-600 text-white"><i class="fa-solid fa-sliders mr-2"></i>Chapter Update</button></header>
      <div class="flex-1 min-h-0 grid grid-cols-[250px_1fr_360px]">
        <aside class="border-r border-zinc-800 p-4 overflow-auto">
          <label class="text-[10px] uppercase tracking-widest text-zinc-500">Version</label>
          <select data-wsystem-role="version-select" class="mt-2 w-full bg-zinc-900 border border-zinc-700 rounded p-2">${state.versions.map(v => `<option value="${esc(v.id)}" ${v.id===version?.id?"selected":""}>V${v.version_number} · ${esc(v.name)}${v.is_locked?" · locked":""}</option>`).join("")}</select>
          <label class="text-[10px] uppercase tracking-widest text-zinc-500 mt-4 block">Activates after</label>
          <select data-wsystem-role="activation" class="mt-2 w-full bg-zinc-900 border border-zinc-700 rounded p-2" ${version?.is_locked?"disabled":""}><option value="">Story beginning</option>${chapters().map(ch=>`<option value="${esc(ch.id)}" ${version?.activation_after_chapter_id===ch.id?"selected":""}>Ch. ${esc(ch.chapter_order)} · ${esc(ch.title)}</option>`).join("")}</select>
          <button data-wsystem-action="clone-version" class="mt-3 w-full px-3 py-2 border border-zinc-700 rounded text-sm"><i class="fa-solid fa-code-branch mr-2"></i>New version from this</button>
          <div class="mt-7 flex items-center justify-between"><label class="text-[10px] uppercase tracking-widest text-zinc-500">Pages</label><button data-wsystem-action="add-page" class="text-primary-400"><i class="fa-solid fa-plus"></i></button></div>
          <div class="mt-2 space-y-1">${definition.pages.map(item=>`<button data-wsystem-page="${esc(item.id)}" class="w-full text-left px-3 py-2 rounded ${item.id===page?.id?"bg-primary-500/15 text-primary-300":"text-zinc-400 hover:bg-zinc-900"}">${esc(item.title)}</button>`).join("")}</div>
        </aside>
        <main class="p-6 overflow-auto">
          ${page ? `<div class="flex gap-3"><input data-wsystem-role="page-title" value="${esc(page.title)}" class="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-lg font-bold"><button data-wsystem-action="delete-page" class="px-3 text-rose-400 border border-rose-500/20 rounded-lg" title="Archive page"><i class="fa-solid fa-trash"></i></button></div>
          <div class="mt-5 flex items-center justify-between"><h3 class="font-semibold">Structured fields</h3><button data-wsystem-action="add-field" class="px-3 py-2 rounded bg-zinc-800"><i class="fa-solid fa-plus mr-2"></i>Add field</button></div>
          <div class="mt-3 space-y-3">${(page.fields||[]).map((field,index)=>fieldEditor(field,index,definition)).join("") || '<p class="text-zinc-600 py-8 text-center">No fields on this page.</p>'}</div>
          <button data-wsystem-action="save-definition" class="mt-5 px-5 py-2 rounded-lg bg-primary-600 text-white" ${version?.is_locked?"disabled title=\"Clone a new version before editing\"":""}>Save Version Structure</button>` : '<p>No page selected.</p>'}
        </main>
        <aside class="border-l border-zinc-800 p-5 overflow-auto">
          <h3 class="font-semibold">Screen appearance</h3><p class="text-xs text-amber-300/80 mt-1">Appearance changes apply to all historical checkpoints.</p>
          <label class="block text-xs text-zinc-500 mt-4">Frame preset</label><select data-wsystem-role="preset" class="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded p-2">${["circuit","terminal","arcane","glass"].map(p=>`<option ${pageAppearance.preset===p?"selected":""}>${p}</option>`).join("")}</select>
          <label class="block text-xs text-zinc-500 mt-3">Accent</label><input data-wsystem-role="accent" type="color" value="${esc(pageAppearance.accent||"#5ee7ff")}" class="mt-1 w-full h-10 bg-zinc-900 border border-zinc-700 rounded">
          <label class="block text-xs text-zinc-500 mt-3">Font</label><select data-wsystem-role="font" class="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded p-2">${["tech","mono","serif","clean"].map(p=>`<option ${pageAppearance.font===p?"selected":""}>${p}</option>`).join("")}</select>
          <button data-wsystem-action="save-appearance" class="mt-4 w-full px-4 py-2 rounded bg-zinc-800">Save Appearance</button>
          <div class="mt-6" data-wsystem-preview>${Core().render({name:state.system.name,definition,appearance:state.system.appearance,state:{values:{}}},{pageId:page?.id})}</div>
        </aside>
      </div>
    </div>`;
  }

  function fieldEditor(field, index, definition) {
    const types = ["text","badge","number","percent","reference_single","reference_multi","catalog","derived_number","page_links"];
    return `<div class="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40" data-wsystem-field-row data-field-id="${esc(field.id)}">
      <div class="grid grid-cols-[1fr_180px_auto] gap-2"><input data-field-prop="label" value="${esc(field.label)}" class="bg-zinc-950 border border-zinc-700 rounded px-2 py-1"><select data-field-prop="type" class="bg-zinc-950 border border-zinc-700 rounded px-2 py-1">${types.map(type=>`<option ${field.type===type?"selected":""}>${type}</option>`).join("")}</select><button data-wsystem-action="delete-field" class="text-rose-400 px-2"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="grid grid-cols-3 gap-2 mt-2"><select data-field-prop="linkPageId" class="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs"><option value="">No detail page</option>${definition.pages.map(page=>`<option value="${esc(page.id)}" ${field.linkPageId===page.id?"selected":""}>Link: ${esc(page.title)}</option>`).join("")}</select><input data-field-prop="sourceFieldId" value="${esc(field.sourceFieldId||"")}" placeholder="Source catalog field ID" class="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs"><input data-field-prop="maxFromFieldId" value="${esc(field.maxFromFieldId||"")}" placeholder="Max from numeric field ID" class="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs"></div>
    </div>`;
  }

  function renderBuilder() { if (root()) root().innerHTML = builderHtml(); }

  async function saveDefinition() {
    const version = activeVersion();
    if (!version || version.is_locked) return toast("Clone a new version before changing locked structure.", "error");
    const definition = activeDefinition();
    const page = definition.pages.find(item => item.id === state.selectedPageId);
    page.title = root().querySelector('[data-wsystem-role="page-title"]').value.trim() || page.title;
    page.fields = Array.from(root().querySelectorAll("[data-wsystem-field-row]")).map(row => {
      const original = (page.fields || []).find(field => field.id === row.dataset.fieldId) || { id: row.dataset.fieldId };
      const next = Object.assign({}, original);
      row.querySelectorAll("[data-field-prop]").forEach(input => {
        if (input.value) next[input.dataset.fieldProp] = input.value; else delete next[input.dataset.fieldProp];
      });
      if (next.type === "page_links" && !next.pageIds) next.pageIds = definition.pages.filter(item=>item.id!==page.id).map(item=>item.id);
      return next;
    });
    const activation = root().querySelector('[data-wsystem-role="activation"]').value || null;
    const { error } = await state.ctx.client.from("story_system_versions").update({ definition, activation_after_chapter_id: activation, updated_at: new Date().toISOString() }).eq("id", version.id);
    if (error) throw error;
    await load(); renderBuilder(); toast("System structure saved.", "success");
  }

  async function cloneVersion() {
    const source = activeVersion();
    if (!source) return;
    const nextNumber = Math.max(0, ...state.versions.map(v=>Number(v.version_number)||0)) + 1;
    const suggested = chapters().at(-1)?.chapter_order || "";
    const boundaryOrder = prompt("New structure activates after which chapter number?", suggested);
    if (boundaryOrder === null) return;
    const boundary = chapters().find(ch => Number(ch.chapter_order) === Number(boundaryOrder));
    if (!boundary) return toast("Choose an existing chapter number for the version boundary.", "error");
    const activation = boundary.id;
    const { data, error } = await state.ctx.client.from("story_system_versions").insert({ system_id: state.system.id, version_number: nextNumber, name: `Version ${nextNumber}`, activation_after_chapter_id: activation, definition: source.definition }).select().single();
    if (error) throw error;
    await load(); state.selectedVersionId = data.id; state.selectedPageId = data.definition.startPageId; renderBuilder();
  }

  async function saveAppearance() {
    const pageId = state.selectedPageId;
    const appearance = Core().clone(state.system.appearance || { default: {}, pages: {} });
    appearance.pages = appearance.pages || {};
    appearance.pages[pageId] = {
      preset: root().querySelector('[data-wsystem-role="preset"]').value,
      accent: root().querySelector('[data-wsystem-role="accent"]').value,
      font: root().querySelector('[data-wsystem-role="font"]').value
    };
    const { error } = await state.ctx.client.from("story_systems").update({ appearance, updated_at:new Date().toISOString() }).eq("id",state.system.id);
    if (error) throw error;
    state.system.appearance = appearance; renderBuilder(); toast("Appearance saved globally.", "success");
  }

  function effectiveVersion(chapterId) {
    const target = chapters().find(ch => ch.id === chapterId);
    const targetOrder = target ? Number(target.chapter_order) : -Infinity;
    return state.versions.slice().sort((a,b)=>a.version_number-b.version_number).reduce((chosen, version) => {
      if (!version.activation_after_chapter_id) return chosen || version;
      const boundary = chapters().find(ch => ch.id === version.activation_after_chapter_id);
      return boundary && Number(boundary.chapter_order) <= targetOrder ? version : chosen;
    }, null) || state.versions[0];
  }
  function checkpointFor(chapterId, status) { return state.checkpoints.find(cp => cp.status === status && String(cp.chapter_id||"") === String(chapterId||"")); }
  function previousPublished(chapterId) {
    const target = chapters().find(ch => ch.id === chapterId);
    const order = target ? Number(target.chapter_order) : -Infinity;
    const candidates = state.checkpoints.filter(cp => cp.status === "published" && (!cp.chapter_id || Number(chapters().find(ch=>ch.id===cp.chapter_id)?.chapter_order) < order));
    return candidates.sort((a,b)=>(Number(chapters().find(ch=>ch.id===b.chapter_id)?.chapter_order)||-1)-(Number(chapters().find(ch=>ch.id===a.chapter_id)?.chapter_order)||-1))[0] || checkpointFor(null,"draft") || null;
  }
  function prepareCheckpoint(chapterId) {
    state.selectedChapterId = chapterId || null;
    const version = effectiveVersion(chapterId);
    const own = checkpointFor(chapterId,"draft") || checkpointFor(chapterId,"published");
    const previous = previousPublished(chapterId);
    state.checkpointVersion = state.versions.find(v=>v.id===own?.version_id) || version;
    state.previousState = Core().clone(previous?.state || {values:{}});
    state.checkpointState = Core().clone(own?.state || previous?.state || checkpointFor(null,"draft")?.state || {values:{}});
    if (!state.checkpointState.values) state.checkpointState.values = {};
  }
  function checkpointEditorHtml(inDrawer) {
    const version = state.checkpointVersion || effectiveVersion(state.selectedChapterId);
    const definition = version?.definition || starterDefinition();
    const values = state.checkpointState.values || {};
    return `<div class="${inDrawer?"h-full":""} flex flex-col bg-zinc-950">
      <header class="px-5 py-4 border-b border-zinc-800 flex items-center justify-between"><div><h2 class="text-xl font-bold">Chapter System Update</h2><p class="text-xs text-zinc-500">Full state using V${esc(version?.version_number||1)}. Readers see it after this chapter.</p></div>${inDrawer?'<button data-wsystem-action="close-drawer" class="text-zinc-400"><i class="fa-solid fa-xmark text-xl"></i></button>':""}</header>
      <div class="px-5 pt-4 flex gap-3"><select data-wsystem-role="checkpoint-chapter" class="flex-1 bg-zinc-900 border border-zinc-700 rounded p-2">${chapterOptions(true)}</select><button data-wsystem-action="refresh-checkpoint" class="px-3 border border-zinc-700 rounded">Refresh selections</button></div>
      <div class="flex-1 overflow-auto p-5 space-y-6">${definition.pages.map(page=>`<section class="border border-zinc-800 rounded-xl p-4"><h3 class="font-bold text-primary-300 mb-3">${esc(page.title)}</h3><div class="space-y-3">${(page.fields||[]).map(field=>checkpointInput(definition,field,values)).join("")}</div></section>`).join("")}</div>
      <footer class="p-4 border-t border-zinc-800 flex gap-3"><button data-wsystem-action="save-checkpoint" class="px-4 py-2 rounded bg-zinc-800">Save System Draft</button><button data-wsystem-action="publish-checkpoint" class="px-4 py-2 rounded bg-primary-600 text-white">Publish System Update</button></footer>
    </div>`;
  }
  function checkpointInput(definition, field, values) {
    const value = values[field.id];
    if (field.type === "derived_number" || field.type === "page_links") return `<div class="grid grid-cols-[220px_1fr] gap-3"><label class="text-sm text-zinc-400">${esc(field.label)}</label><span class="text-zinc-500">Calculated / navigation field</span></div>`;
    if (field.type === "catalog") {
      const lines = (Array.isArray(value)?value:[]).map(item=>[item.name||"",item.description||"",item.meta||""].join(" | ")).join("\n");
      return `<label class="block"><span class="text-sm text-zinc-400">${esc(field.label)} <small>· one item per line: Name | Description | Meta</small></span><textarea data-checkpoint-field="${esc(field.id)}" data-value-type="catalog" rows="5" class="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded p-2">${esc(lines)}</textarea></label>`;
    }
    if (field.type === "reference_single" || field.type === "reference_multi") {
      const items = Array.isArray(values[field.sourceFieldId]) ? values[field.sourceFieldId] : [];
      const selected = new Set(Array.isArray(value)?value:[value].filter(Boolean));
      return `<label class="block"><span class="text-sm text-zinc-400">${esc(field.label)}${field.maxFromFieldId?` · max from ${esc(field.maxFromFieldId)}`:""}</span><select data-checkpoint-field="${esc(field.id)}" data-value-type="${field.type}" ${field.type==="reference_multi"?"multiple size=4":""} class="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded p-2">${field.type==="reference_single"?'<option value="">None</option>':""}${items.map(item=>`<option value="${esc(item.id)}" ${selected.has(item.id)?"selected":""}>${esc(item.name)}</option>`).join("")}</select></label>`;
    }
    const type = field.type === "number" || field.type === "percent" ? "number" : "text";
    return `<label class="grid grid-cols-[220px_1fr] gap-3 items-center"><span class="text-sm text-zinc-400">${esc(field.label)}</span><input data-checkpoint-field="${esc(field.id)}" data-value-type="${esc(field.type)}" type="${type}" value="${esc(value??"")}" ${field.type==="percent"?'min="0" max="100"':""} class="bg-zinc-900 border border-zinc-700 rounded p-2"></label>`;
  }
  function collectCheckpointState(container) {
    const values = Core().clone(state.checkpointState.values || {});
    container.querySelectorAll("[data-checkpoint-field]").forEach(input => {
      const id=input.dataset.checkpointField, type=input.dataset.valueType;
      if(type==="catalog") values[id]=input.value.split(/\n/).map(line=>line.trim()).filter(Boolean).map(line=>{const [name,description,meta]=line.split("|").map(v=>v.trim());return {id:Core().slug(name),name,description:description||"",meta:meta||""};});
      else if(type==="reference_multi") values[id]=Array.from(input.selectedOptions).map(option=>option.value);
      else if(type==="reference_single") values[id]=input.value||null;
      else if(type==="number"||type==="percent") values[id]=input.value===""?null:Number(input.value);
      else values[id]=input.value;
    });
    const definition = state.checkpointVersion?.definition || starterDefinition();
    for(const page of definition.pages||[]) for(const field of page.fields||[]) if(field.type==="reference_multi"&&field.maxFromFieldId){
      const max=Number(values[field.maxFromFieldId]||0); if(max>=0&&(values[field.id]||[]).length>max) throw new Error(`${field.label} exceeds the ${max} slot limit.`);
    }
    return {values};
  }
  async function saveCheckpoint(publish) {
    const container = drawer()?.classList.contains("hidden") ? root() : drawer();
    const nextState = collectCheckpointState(container);
    const chapterId = state.selectedChapterId || null;
    const version = state.checkpointVersion || effectiveVersion(chapterId);
    const changes = Core().diff(state.previousState,nextState).map(fieldId=>({fieldId}));
    if (publish) {
      const { error } = await state.ctx.client.rpc("publish_story_system_checkpoint", { target_system_id:state.system.id,target_chapter_id:chapterId,target_version_id:version.id,target_state:nextState,target_change_set:changes });
      if(error) throw error;
    } else {
      const existing = checkpointFor(chapterId,"draft");
      const record={system_id:state.system.id,chapter_id:chapterId,version_id:version.id,status:"draft",state:nextState,change_set:changes,updated_at:new Date().toISOString()};
      const result=existing?await state.ctx.client.from("story_system_checkpoints").update(record).eq("id",existing.id):await state.ctx.client.from("story_system_checkpoints").insert(record);
      if(result.error) throw result.error;
    }
    await load(); prepareCheckpoint(chapterId); renderDrawer(); toast(publish?"System update published.":"System draft saved.","success");
  }
  function renderDrawer() { if(!drawer())return; drawer().innerHTML=`<div class="absolute inset-0 bg-black/65" data-wsystem-action="close-drawer"></div><div class="absolute right-0 top-0 bottom-0 w-full max-w-3xl shadow-2xl border-l border-zinc-800">${checkpointEditorHtml(true)}</div>`; const select=drawer().querySelector('[data-wsystem-role="checkpoint-chapter"]');if(select)select.value=state.selectedChapterId||""; }

  async function handleClick(event) {
    const pageButton=event.target.closest("[data-wsystem-page]"); if(pageButton){state.selectedPageId=pageButton.dataset.wsystemPage;renderBuilder();return;}
    const button=event.target.closest("[data-wsystem-action]"); if(!button)return;
    const action=button.dataset.wsystemAction;
    try {
      if(action==="create-system")await createSystem();
      else if(action==="save-definition")await saveDefinition();
      else if(action==="clone-version")await cloneVersion();
      else if(action==="save-appearance")await saveAppearance();
      else if(action==="add-page"){const title=prompt("Page title");if(!title)return;const v=activeVersion();if(v.is_locked)return toast("Clone a new version first.","error");const d=activeDefinition();const id=Core().slug(title)+"-"+Date.now().toString(36);d.pages.push({id,title,fields:[]});await state.ctx.client.from("story_system_versions").update({definition:d}).eq("id",v.id);await load();state.selectedPageId=id;renderBuilder();}
      else if(action==="delete-page"){const v=activeVersion();if(v.is_locked)return toast("Clone a new version first.","error");const d=activeDefinition();if(d.pages.length<=1)return toast("A system needs at least one page.","error");d.pages=d.pages.filter(p=>p.id!==state.selectedPageId);d.startPageId=d.pages[0].id;await state.ctx.client.from("story_system_versions").update({definition:d}).eq("id",v.id);await load();state.selectedPageId=d.startPageId;renderBuilder();}
      else if(action==="add-field"){const v=activeVersion();if(v.is_locked)return toast("Clone a new version first.","error");const d=activeDefinition(),p=d.pages.find(x=>x.id===state.selectedPageId);const label=prompt("Field label");if(!label)return;p.fields=p.fields||[];p.fields.push({id:Core().slug(label)+"-"+Date.now().toString(36),label,type:"text"});await state.ctx.client.from("story_system_versions").update({definition:d}).eq("id",v.id);await load();renderBuilder();}
      else if(action==="delete-field"){button.closest("[data-wsystem-field-row]").remove();}
      else if(action==="open-checkpoint")openCheckpoint(state.ctx.getActiveChapterId?.() || chapters()[0]?.id || null);
      else if(action==="close-drawer")closeDrawer();
      else if(action==="refresh-checkpoint"){state.checkpointState=collectCheckpointState(drawer());renderDrawer();}
      else if(action==="save-checkpoint")await saveCheckpoint(false);
      else if(action==="publish-checkpoint")await saveCheckpoint(true);
    } catch(error){toast(error.message||"System action failed.","error");}
  }
  async function handleChange(event) {
    const versionSelect=event.target.closest('[data-wsystem-role="version-select"]');if(versionSelect){state.selectedVersionId=versionSelect.value;const d=activeDefinition();state.selectedPageId=d.startPageId||d.pages[0]?.id;renderBuilder();return;}
    const chapterSelect=event.target.closest('[data-wsystem-role="checkpoint-chapter"]');if(chapterSelect){prepareCheckpoint(chapterSelect.value||null);renderDrawer();}
  }
  function openCheckpoint(chapterId) { prepareCheckpoint(chapterId || null); drawer().classList.remove("hidden"); renderDrawer(); }
  function closeDrawer(){drawer()?.classList.add("hidden");if(drawer())drawer().innerHTML="";}

  async function open() { await load(); renderBuilder(); }
  async function storyChanged() { closeDrawer(); await load(); renderBuilder(); }
  async function init(ctx) {
    state.ctx=ctx; Core().injectStyles();
    root()?.addEventListener("click",handleClick);root()?.addEventListener("change",handleChange);
    drawer()?.addEventListener("click",handleClick);drawer()?.addEventListener("change",handleChange);
    await load();
  }
  window.WriterSystem={init,open,openCheckpoint,storyChanged};
})();
