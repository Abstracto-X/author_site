// Contract checks against the active inline Writer methods; no browser or database required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'writer.html'), 'utf8');

test('all inline Writer scripts parse', () => {
    let count = 0;
    for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
        new vm.Script(match[1], { filename: `writer-inline-${++count}.js` });
    }
    assert.ok(count >= 3);
});

function methodsBetween(start, end) {
    const from = html.indexOf(start);
    const to = html.indexOf(end, from);
    assert.ok(from >= 0 && to > from, `Could not locate ${start}`);
    return html.slice(from, to);
}

function harness({ published = false } = {}) {
    let currentText = 'First revision';
    const saves = [];
    const scheduled = new Map();
    const status = { innerHTML: '', textContent: '', removeAttribute() {}, classList: { add() {}, remove() {} } };
    const elements = {
        'ed-save-status': status,
        'ed-last-saved': { textContent: '' },
        'ed-title': { value: 'Chapter 1' }
    };
    const state = {
        activeStoryId: 'story', activeChapterId: 'chapter', activeScratchpadId: null,
        activeTabType: 'chapter', unsavedChanges: true, editRevision: 1,
        autosaveTimer: null, saveInFlight: null, isHydratingEditor: false
    };
    const chapters = [{ id: 'chapter', is_published: published, content: 'Original' }];
    const context = {
        State: state,
        MockDB: { chapters, scratchpads: [] },
        DB: {
            saveChapter: (id, record) => new Promise(resolve => saves.push({ record, resolve }))
        },
        Dashboard: { render() {}, renderSidebarChapters() {}, renderEditorTabs() {} },
        UI: { showToast() {} },
        document: { getElementById: id => elements[id] || null },
        clearTimeout: id => scheduled.delete(id),
        setTimeout: callback => { const id = scheduled.size + 1; scheduled.set(id, callback); return id; }
    };
    vm.createContext(context);
    const editor = methodsBetween('            markUnsaved() {', '\n        };').trim().replace(/,$/, '');
    const app = methodsBetween('            async flushPendingEdits() {', '            async publishChapter() {').trim().replace(/,$/, '');
    vm.runInContext(`Editor = {${editor}, updateMeta(){}, getPlainText(){return ''}, normalizeForSave(){return ''}};
        App = {${app}, getEditorData(){return {title:'Chapter 1', content: currentText}}};`,
    Object.assign(context, { currentText }));
    return { context, state, saves, chapters, scheduled, setText(value) { context.currentText = value; } };
}

test('older save cannot mark newer edits saved or cancel their autosave', async () => {
    const h = harness();
    const first = h.context.App.saveDraft({ silent: true });
    assert.equal(h.saves.length, 1);
    h.setText('Second revision');
    h.context.Editor.markUnsaved();
    assert.equal(h.scheduled.size, 1);
    h.saves[0].resolve({ id: 'chapter', ...h.saves[0].record, updated_at: new Date().toISOString() });
    await first;
    assert.equal(h.state.unsavedChanges, true);
    assert.equal(h.scheduled.size, 1);
    const second = h.context.App.saveDraft({ silent: true });
    assert.equal(h.saves.length, 2);
    h.saves[1].resolve({ id: 'chapter', ...h.saves[1].record, updated_at: new Date().toISOString() });
    await second;
    assert.equal(h.chapters[0].content, 'Second revision');
    assert.equal(h.state.unsavedChanges, false);
});

test('published chapters do not autosave, but explicit save updates live content', async () => {
    const h = harness({ published: true });
    h.context.Editor.markUnsaved();
    assert.equal(h.scheduled.size, 0);
    assert.equal(await h.context.App.saveDraft({ silent: true }), false);
    assert.equal(h.saves.length, 0);
    const save = h.context.App.saveDraft();
    assert.equal(h.saves.length, 1);
    h.saves[0].resolve({ id: 'chapter', ...h.saves[0].record, updated_at: new Date().toISOString() });
    assert.equal(await save, true);
    assert.equal(h.chapters[0].is_published, true);
});

test('a transition flushes edits made during the first save before allowing navigation', async () => {
    const h = harness();
    const transition = h.context.App.flushPendingEdits();
    h.setText('Second revision');
    h.context.Editor.markUnsaved();
    h.saves[0].resolve({ id: 'chapter', ...h.saves[0].record, updated_at: new Date().toISOString() });
    for (let i = 0; i < 10 && h.saves.length < 2; i += 1) await Promise.resolve();
    assert.equal(h.saves.length, 2);
    h.saves[1].resolve({ id: 'chapter', ...h.saves[1].record, updated_at: new Date().toISOString() });
    assert.equal(await transition, true);
    assert.equal(h.chapters[0].content, 'Second revision');
});

test('unresponsive Writer reads have a bounded failure instead of waiting forever', async () => {
    const source = methodsBetween('        function withWriterDeadline(', '\n        const DB = {');
    const context = { Promise, setTimeout, clearTimeout, Error };
    vm.createContext(context);
    vm.runInContext(`${source}\nthis.deadline = withWriterDeadline;`, context);
    await assert.rejects(context.deadline(new Promise(() => {}), 'Test read', 5), /timed out/);
});

test('an older Summary Manager story read cannot replace a newer story', async () => {
    const pending = [];
    const context = {
        withWriterDeadline: promise => promise,
        supabaseClient: {
            from(table) {
                let resolve;
                const promise = new Promise(done => { resolve = done; });
                const query = {
                    select() { return this; }, eq() { return this; }, in() { return this; }, order() { return this; },
                    then(done, fail) { return promise.then(done, fail); }
                };
                pending.push({ table, resolve });
                return query;
            }
        }
    };
    vm.createContext(context);
    vm.runInContext(`${fs.readFileSync(path.join(__dirname, '..', 'js', 'writer-summary-manager.js'), 'utf8')}
        this.manager = SummaryManager;`, context);
    const manager = context.manager;
    manager.newSummary = () => {};
    manager.setStatus = () => {};
    manager.render = () => {};
    const oldLoad = manager.loadStory('old-story');
    const newLoad = manager.loadStory('new-story');
    assert.equal(pending.length, 4);
    pending[2].resolve({ data: [{ id: 'new-summary' }], error: null });
    pending[3].resolve({ data: [], error: null });
    await newLoad;
    pending[0].resolve({ data: [{ id: 'old-summary' }], error: null });
    pending[1].resolve({ data: [], error: null });
    await oldLoad;
    assert.equal(manager.storyId, 'new-story');
    assert.equal(manager.blocks[0].id, 'new-summary');
});

test('rapid chapter switches run in request order and never overlap', async () => {
    const pending = [];
    const state = { activeStoryId: 'story', editorTransitionInFlight: null };
    const wrapper = methodsBetween('            async openEditorForChapter(id) {', '            async openEditorForChapterOnce(id) {').trim().replace(/,$/, '');
    const context = { State: state, pending };
    vm.createContext(context);
    vm.runInContext(`App = {${wrapper}, openEditorForChapterOnce(id) {
        return new Promise(resolve => pending.push({id, resolve}));
    }};`, context);
    const first = context.App.openEditorForChapter('one');
    const second = context.App.openEditorForChapter('two');
    assert.deepEqual(pending.map(item => item.id), ['one']);
    pending[0].resolve();
    await first;
    for (let i = 0; i < 10 && pending.length < 2; i += 1) await Promise.resolve();
    assert.deepEqual(pending.map(item => item.id), ['one', 'two']);
    pending[1].resolve();
    await second;
    assert.equal(state.editorTransitionInFlight, null);
});

test('publishing waits for an in-flight draft save before writing', async () => {
    const state = { saveInFlight: null, unsavedChanges: true };
    const saveWrapper = methodsBetween('            async saveDraft(options = {}) {', '            async saveDraftOnce(options = {}) {').trim().replace(/,$/, '');
    const publishWrapper = methodsBetween('            async publishChapter() {', '            async publishChapterOnce() {').trim().replace(/,$/, '');
    let resolveSave;
    let publishCalls = 0;
    const context = { State: state };
    vm.createContext(context);
    vm.runInContext(`App = {${saveWrapper}, ${publishWrapper},
        saveDraftOnce(){ return new Promise(resolve => { resolveSave = resolve; }); },
        publishChapterOnce(){ publishCalls += 1; return Promise.resolve(true); }
    };`, Object.assign(context, {
        get resolveSave() { return resolveSave; },
        set resolveSave(value) { resolveSave = value; },
        get publishCalls() { return publishCalls; },
        set publishCalls(value) { publishCalls = value; }
    }));
    const save = context.App.saveDraft();
    const publish = context.App.publishChapter();
    assert.equal(context.publishCalls, 0);
    context.resolveSave(true);
    await save;
    await publish;
    assert.equal(context.publishCalls, 1);
});

test('stopping Summary generation clears its busy state without applying a late result', async () => {
    let status = '';
    const context = {
        AbortController, setTimeout, clearTimeout,
        withWriterDeadline: promise => promise,
        SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'test',
        supabaseClient: { auth: { getSession: async () => ({ data: { session: { access_token: 'test' } } }) } },
        fetch: (_url, options) => new Promise((_, reject) => {
            options.signal.addEventListener('abort', () => reject(new Error('aborted')));
        })
    };
    vm.createContext(context);
    vm.runInContext(`${fs.readFileSync(path.join(__dirname, '..', 'js', 'writer-summary-manager.js'), 'utf8')}
        this.manager = SummaryManager;`, context);
    const manager = context.manager;
    manager.requestPayload = () => ({ source_ids: ['chapter'], model_id: 'test' });
    manager.renderActions = () => {};
    manager.setStatus = value => { status = value; };
    const generation = manager.generate();
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
    manager.cancelGeneration();
    await generation;
    assert.equal(manager.generating, false);
    assert.equal(manager.generated, null);
    assert.match(status, /stopped/i);
});

test('a timed-out write is reported as unconfirmed, not safely retryable', async () => {
    const source = methodsBetween('        function withWriterDeadline(', '\n        const DB = {');
    const context = { AbortController, Promise, Error, setTimeout, clearTimeout };
    vm.createContext(context);
    vm.runInContext(`${source}\nthis.mutate = runWriterMutation;`, context);
    const query = {
        abortSignal(signal) {
            return new Promise((_, reject) => {
                signal.addEventListener('abort', () => reject(new Error('Aborted')));
            });
        }
    };
    await assert.rejects(context.mutate(query, 'Chapter save', 5), error => {
        assert.equal(error.code, 'writer_save_uncertain');
        assert.match(error.message, /verify the row before retrying/i);
        return true;
    });
});

test('an unconfirmed write blocks autosave and further writes until verification', async () => {
    const h = harness();
    h.context.Editor.markSaveFailed({ code: 'writer_save_uncertain', message: 'Verify before retrying.' });
    h.context.Editor.markUnsaved();
    assert.equal(h.state.saveOutcomeUncertain, true);
    assert.equal(h.scheduled.size, 0);
    assert.equal(await h.context.App.saveDraft(), false);
    assert.equal(h.saves.length, 0);
});

test('a later save acknowledgement cannot clear an unconfirmed write', () => {
    const h = harness();
    h.context.Editor.markSaveFailed({ code: 'writer_save_uncertain', message: 'Verify before retrying.' });
    h.context.Editor.markSaved(new Date().toISOString());
    assert.equal(h.state.unsavedChanges, true);
    assert.equal(h.state.saveOutcomeUncertain, true);
    assert.match(h.context.document.getElementById('ed-save-status').textContent, /unconfirmed/i);
});

test('a separate definite failure cannot clear an earlier unconfirmed write', () => {
    const h = harness();
    h.context.Editor.markSaveFailed({ code: 'writer_save_uncertain', message: 'Verify before retrying.' });
    h.context.Editor.markSaveFailed(new Error('Permission denied'));
    assert.equal(h.state.saveOutcomeUncertain, true);
    assert.match(h.context.document.getElementById('ed-save-status').textContent, /unconfirmed/i);
});

test('chapter-note edits made during a save stay visibly unsaved', async () => {
    const source = methodsBetween('        const ChapterNotes = {', '        // ==========================================\n        // LONG-STORY CONTEXT WORKSPACE');
    let resolveSave;
    const elements = {
        'chapter-note-id': { value: 'note' },
        'chapter-note-chapter-id': { value: 'chapter' },
        'chapter-note-title': { value: 'Note title' },
        'chapter-note-content': { innerHTML: 'First revision' },
        'chapter-note-delete': { classList: { remove() {} } },
        'chapter-note-status': { textContent: '' }
    };
    const context = {
        State: { saveOutcomeUncertain: false },
        MockDB: { scratchpads: [{ id: 'note', chapter_id: 'chapter', content: 'Old' }] },
        DB: { saveScratchpad: () => new Promise(resolve => { resolveSave = resolve; }) },
        document: { getElementById: id => elements[id] || null },
        Dashboard: { render() {} }, ContextWorkspace: { render() {}, plain: value => value, wordCount: () => 2 },
        UI: { showToast() {} }
    };
    vm.createContext(context);
    vm.runInContext(`${source}\nthis.notes = ChapterNotes;`, context);
    context.notes.renderForChapter = () => {};
    const save = context.notes.save();
    context.notes.markDirty();
    elements['chapter-note-content'].innerHTML = 'Second revision';
    resolveSave({ id: 'note', chapter_id: 'chapter', content: 'First revision' });
    await save;
    assert.equal(context.notes.dirty, true);
    assert.match(elements['chapter-note-status'].textContent, /Unsaved newer edits/);
    assert.equal(context.MockDB.scratchpads[0].content, 'First revision');
});

test('repeated new-chapter clicks cannot create duplicate drafts', async () => {
    const source = methodsBetween('            async createNewChapter() {', '            async createScratchpadForChapter(chapterId) {').trim().replace(/,$/, '');
    let resolveCreate;
    let createCalls = 0;
    const state = { activeStoryId: 'story', activeChapterId: null, unsavedChanges: false, saveInFlight: null };
    const context = {
        State: state, ChapterNotes: { dirty: false, saveInFlight: false },
        MockDB: { chapters: [] },
        DB: { saveChapter: () => { createCalls += 1; return new Promise(resolve => { resolveCreate = resolve; }); } },
        Dashboard: { render() {} }, UI: { showToast() {} }, Editor: { markSaveFailed() {} }
    };
    vm.createContext(context);
    vm.runInContext(`App = {${source}, async openEditorForChapter(id) { State.activeChapterId = id; }};`, context);
    const first = context.App.createNewChapter();
    await context.App.createNewChapter();
    assert.equal(createCalls, 1);
    resolveCreate({ id: 'new-chapter', story_id: 'story', chapter_order: 1 });
    await first;
    assert.equal(context.MockDB.chapters.length, 1);
    assert.equal(state.activeChapterId, 'new-chapter');
});

test('rapid access changes cannot race and overwrite the latest tier', async () => {
    const source = methodsBetween('            async quickSetChapterTier(id, tierId) {', '            async deleteChapter(id) {').trim().replace(/,$/, '');
    let resolveUpdate;
    let updateCalls = 0;
    const state = { activeChapterId: null, unsavedChanges: false, saveInFlight: null, tierUpdateInFlight: false };
    const context = {
        State: state,
        MockDB: { chapters: [{ id: 'chapter', required_tier_id: null }], tiers: [{ id: 'tier-a', name: 'Tier A' }] },
        DB: { updateChapterFields: () => { updateCalls += 1; return new Promise(resolve => { resolveUpdate = resolve; }); } },
        Dashboard: { render() {} }, UI: { showToast() {} }, Editor: { markSaveFailed() {} },
        document: { getElementById: () => null }
    };
    vm.createContext(context);
    vm.runInContext(`App = {${source}};`, context);
    const first = context.App.quickSetChapterTier('chapter', 'tier-a');
    assert.ok(state.saveInFlight);
    await context.App.quickSetChapterTier('chapter', null);
    assert.equal(updateCalls, 1);
    resolveUpdate({ id: 'chapter', required_tier_id: 'tier-a' });
    await first;
    assert.equal(state.tierUpdateInFlight, false);
    assert.equal(state.saveInFlight, null);
    assert.equal(context.MockDB.chapters[0].required_tier_id, 'tier-a');
});

test('context block edits made during a save stay open and unsaved', async () => {
    const source = methodsBetween('        const ContextWorkspace = {', '        // ==========================================\n        // SAFETY GUARD');
    let resolveSave;
    const elements = {
        'context-block-id': { value: 'block' },
        'context-block-type': { value: 'outline' },
        'context-block-title': { value: 'Outline' },
        'context-block-content': { innerHTML: 'First revision', innerText: 'First revision' },
        'context-block-save-status': { textContent: '' },
        'context-block-delete': { classList: { remove() {} } },
        'context-block-copy': { classList: { remove() {} } }
    };
    const query = { update() { return this; }, eq() { return this; }, select() { return this; }, single() { return this; } };
    const context = {
        State: { activeStoryId: 'story', saveOutcomeUncertain: false },
        supabaseClient: { from: () => query },
        runWriterMutation: () => new Promise(resolve => { resolveSave = resolve; }),
        document: { getElementById: id => elements[id] || null },
        UI: { showToast() {} }, Editor: { markSaveFailed() {} },
        localStorage: { getItem: () => null }
    };
    vm.createContext(context);
    vm.runInContext(`${source}\nthis.workspace = ContextWorkspace;`, context);
    const workspace = context.workspace;
    workspace.updateBlockEditorCount = () => {};
    workspace.render = () => {};
    let closed = false;
    workspace.closeBlockEditor = () => { closed = true; };
    const save = workspace.saveBlock({ preventDefault() {} });
    workspace.markBlockDirty();
    elements['context-block-content'].innerHTML = 'Second revision';
    resolveSave({ data: { id: 'block', content: 'First revision' }, error: null });
    await save;
    assert.equal(workspace.blockEditorDirty, true);
    assert.equal(closed, false);
    assert.match(elements['context-block-save-status'].textContent, /Unsaved newer edits/);
});

test('definite preset RPC failure leaves the old displayed selection untouched', async () => {
    const source = methodsBetween('        const ContextWorkspace = {', '        // ==========================================\n        // SAFETY GUARD');
    const calls = [];
    const query = { single() { return this; } };
    const context = {
        State: { activeStoryId: 'story', saveOutcomeUncertain: false },
        supabaseClient: { rpc: (name, args) => { calls.push({ name, args }); return query; }, from: () => { throw new Error('Unexpected direct table write'); } },
        runWriterMutation: async (_query, label) => {
            assert.equal(label, 'Preset save');
            return { data: null, error: new Error('Invalid item') };
        },
        UI: { showToast() {} }, Editor: { markSaveFailed() {} },
        localStorage: { getItem: () => null }
    };
    vm.createContext(context);
    vm.runInContext(`${source}\nthis.workspace = ContextWorkspace;`, context);
    const workspace = context.workspace;
    workspace.available = true;
    workspace.activePresetId = 'preset';
    workspace.presets = [{ id: 'preset', name: 'Saved preset' }];
    workspace.presetItems = [{ id: 'old-item', preset_id: 'preset' }];
    workspace.selectedItemsInOrder = () => [{ itemType: 'chapter', id: 'chapter' }];
    await workspace.savePreset(false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, 'save_writer_context_preset');
    assert.equal(calls[0].args.p_preset_id, 'preset');
    assert.equal(workspace.presetItems[0].id, 'old-item');
});

function presetRpcHarness({ refreshAvailable = true } = {}) {
    const source = methodsBetween('        const ContextWorkspace = {', '        // ==========================================\n        // SAFETY GUARD');
    const calls = [];
    const messages = [];
    const context = {
        State: { activeStoryId: 'story', saveOutcomeUncertain: false },
        supabaseClient: {
            rpc: (name, args) => { calls.push({ name, args }); return { single() { return this; } }; },
            from: () => { throw new Error('Unexpected direct table write'); }
        },
        runWriterMutation: async () => ({ data: { id: 'new-preset' }, error: null }),
        UI: { showToast: message => messages.push(message) },
        Editor: { markSaveFailed() {} },
        localStorage: { getItem: () => null },
        prompt: () => 'Preset Copy'
    };
    vm.createContext(context);
    vm.runInContext(`${source}\nthis.workspace = ContextWorkspace;`, context);
    const workspace = context.workspace;
    workspace.available = true;
    workspace.activePresetId = 'preset';
    workspace.presets = [{ id: 'preset', story_id: 'story', name: 'Saved preset', mode: 'advanced', section_order: ['chapter'], token_budget: 32000, active_section: 'chapter' }];
    workspace.presetItems = [
        { id: 'second', preset_id: 'preset', item_type: 'chapter', chapter_id: 'chapter-2', position: 1 },
        { id: 'first', preset_id: 'preset', item_type: 'chapter', chapter_id: 'chapter-1', position: 0 }
    ];
    workspace.selectedItemsInOrder = () => [
        { itemType: 'chapter', id: 'chapter-2' },
        { itemType: 'chapter_note', id: 'note-1' }
    ];
    workspace.load = async () => {
        workspace.available = refreshAvailable;
        if (refreshAvailable) workspace.presets.push({ id: 'new-preset' });
    };
    workspace.loadPreset = id => { workspace.activePresetId = id; };
    return { workspace, calls, messages, context };
}

test('saving a preset uses one RPC and preserves selected item order', async () => {
    const h = presetRpcHarness();
    await h.workspace.savePreset(false);
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].name, 'save_writer_context_preset');
    assert.equal(h.calls[0].args.p_preset_id, 'preset');
    assert.deepEqual(Array.from(h.calls[0].args.p_items, item => item.item_type), ['chapter', 'scratchpad']);
    assert.deepEqual(Array.from(h.calls[0].args.p_items, item => item.chapter_id || item.scratchpad_id), ['chapter-2', 'note-1']);
    assert.equal(h.workspace.activePresetId, 'new-preset');
    assert.equal(h.workspace.presetSaveInFlight, false);
});

test('duplicating a preset uses one RPC with its saved item order', async () => {
    const h = presetRpcHarness();
    await h.workspace.duplicatePreset();
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].name, 'save_writer_context_preset');
    assert.equal(h.calls[0].args.p_preset_id, null);
    assert.deepEqual(Array.from(h.calls[0].args.p_items, item => item.chapter_id), ['chapter-1', 'chapter-2']);
    assert.equal(h.workspace.activePresetId, 'new-preset');
    assert.equal(h.workspace.presetSaveInFlight, false);
});

test('saving an empty preset still sends one RPC with an empty item array', async () => {
    const h = presetRpcHarness();
    h.workspace.selectedItemsInOrder = () => [];
    await h.workspace.savePreset(false);
    assert.equal(h.calls.length, 1);
    assert.deepEqual(Array.from(h.calls[0].args.p_items), []);
});

test('preset duplication is single-flight', async () => {
    const h = presetRpcHarness();
    let finish;
    h.context.runWriterMutation = () => new Promise(resolve => { finish = resolve; });
    const first = h.workspace.duplicatePreset();
    await h.workspace.duplicatePreset();
    assert.equal(h.calls.length, 1);
    finish({ data: { id: 'new-preset' }, error: null });
    await first;
    assert.equal(h.workspace.presetSaveInFlight, false);
});

test('successful preset RPC with failed refresh reports refresh failure, not save failure', async () => {
    const h = presetRpcHarness({ refreshAvailable: false });
    await h.workspace.savePreset(false);
    assert.equal(h.calls.length, 1);
    assert.match(h.messages.at(-1), /saved, but the display could not refresh/i);
});

test('chapter note deletion is blocked while its save is in flight', async () => {
    const source = methodsBetween('        const ChapterNotes = {', '        // ==========================================\n        // LONG-STORY CONTEXT WORKSPACE');
    let deleteCalls = 0;
    const messages = [];
    const context = {
        State: { saveOutcomeUncertain: false },
        MockDB: { scratchpads: [{ id: 'note', chapter_id: 'chapter' }] },
        DB: { deleteScratchpad: async () => { deleteCalls += 1; } },
        UI: { showToast: message => messages.push(message) },
        confirm: () => true
    };
    vm.createContext(context);
    vm.runInContext(`${source}\nthis.notes = ChapterNotes;`, context);
    context.notes.saveInFlight = true;
    await context.notes.delete('note');
    assert.equal(deleteCalls, 0);
    assert.match(messages.at(-1), /wait for the chapter note save/i);
});

test('Context chapter Open stays in Context and chapter Copy uses original content', async () => {
    const source = methodsBetween('        const ContextWorkspace = {', '        // ==========================================\n        // SAFETY GUARD');
    const context = {
        State: { activeStoryId: 'story' },
        MockDB: { chapters: [{ id: 'chapter', title: 'Chapter 7', content: '<p>Original text</p>', chapter_order: 7 }], tiers: [], scratchpads: [] },
        localStorage: { getItem: () => null },
        App: { openEditorForChapter() { throw new Error('Context Open must not navigate to Writer'); } }
    };
    vm.createContext(context);
    vm.runInContext(`${source}\nthis.workspace = ContextWorkspace;`, context);
    const workspace = context.workspace;
    workspace.openItemPreview = key => { workspace.activeItemKey = key; };
    let copied = null;
    workspace.copyRichContent = (html, label) => { copied = { html, label }; };
    await workspace.editItem('chapter:chapter');
    await workspace.copyItem('chapter:chapter');
    assert.equal(workspace.activeItemKey, 'chapter:chapter');
    assert.deepEqual(copied, { html: '<p>Original text</p>', label: 'Chapter 7' });
    assert.doesNotMatch(workspace.itemActionsHtml({ key: 'chapter:chapter', itemType: 'chapter' }), /duplicateItem/);
});

test('Context item inventory defers Markdown conversion until content is opened', () => {
    const source = methodsBetween('        const ContextWorkspace = {', '        // ==========================================\n        // SAFETY GUARD');
    const context = {
        State: { activeStoryId: 'story' },
        MockDB: { chapters: [{ id: 'chapter', title: 'Chapter 7', content: '<p>Original text</p>', chapter_order: 7, word_count: 2 }], tiers: [], scratchpads: [] },
        localStorage: { getItem: () => null }
    };
    vm.createContext(context);
    vm.runInContext(`${source}\nthis.workspace = ContextWorkspace;`, context);
    let conversions = 0;
    context.workspace.markdown = value => { conversions += 1; return value; };
    const items = context.workspace.allItems();
    assert.equal(conversions, 0);
    assert.equal(items[0].content, '<p>Original text</p>');
    assert.equal(items[0].content, '<p>Original text</p>');
    assert.equal(conversions, 1);
});

test('the pinned Supabase mutation builder supports cancellation', () => {
    const sdk = fs.readFileSync(path.join(__dirname, '..', 'vendor', 'supabase', 'supabase-2.111.0.min.js'), 'utf8');
    const context = {
        URL, Headers, TextEncoder, TextDecoder, AbortController,
        fetch: async () => ({}), setTimeout, clearTimeout, setInterval, clearInterval,
        WebSocket: class {}, crypto: globalThis.crypto
    };
    vm.createContext(context);
    vm.runInContext(sdk, context);
    const client = context.supabase.createClient('https://example.supabase.co', 'anon-key', {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    });
    const query = client.from('chapters').update({ title: 'test' }).eq('id', 'test').select().single();
    assert.equal(typeof query.abortSignal, 'function');
    assert.match(html, /<script src="vendor\/supabase\/supabase-2\.111\.0\.min\.js"><\/script>/);
});
