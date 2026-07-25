'use strict';

const SummaryManager = {
    storyId: '',
    blocks: [],
    details: new Map(),
    kind: 'short',
    selectedSources: new Set(),
    activeBlockId: '',
    generated: null,
    generatedSignature: '',
    dirty: false,
    generating: false,
    initialized: false,
    filter: '',

    async init() {
        if (this.initialized) return;
        this.initialized = true;
        document.getElementById('summary-manager-filter')?.addEventListener('input', event => {
            this.filter = event.target.value.trim().toLowerCase();
            this.renderRecords();
        });
        document.getElementById('summary-start')?.addEventListener('change', () => this.rangeChanged());
        document.getElementById('summary-end')?.addEventListener('change', () => this.rangeChanged());
        ['summary-title', 'summary-model', 'summary-style-reference', 'summary-instructions', 'summary-output', 'summary-supersedes'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.markDirty());
            document.getElementById(id)?.addEventListener('change', () => this.markDirty());
        });
        await this.loadStory(State.activeStoryId);
    },

    async loadStory(storyId) {
        this.storyId = storyId || '';
        this.blocks = [];
        this.details = new Map();
        this.activeBlockId = '';
        this.generated = null;
        this.generatedSignature = '';
        this.selectedSources = new Set();
        this.dirty = false;
        if (!this.storyId) return this.render();

        try {
            const [{ data: blocks, error: blockError }, { data: details, error: detailError }] = await Promise.all([
                supabaseClient
                    .from('writer_context_blocks')
                    .select('*')
                    .eq('story_id', this.storyId)
                    .in('block_type', ['chapter_summary', 'long_summary'])
                    .order('updated_at', { ascending: false }),
                supabaseClient
                    .from('writer_summary_details')
                    .select('*')
                    .order('updated_at', { ascending: false })
            ]);
            if (blockError) throw blockError;
            if (detailError) throw detailError;
            this.blocks = blocks || [];
            const validIds = new Set(this.blocks.map(block => block.id));
            this.details = new Map((details || [])
                .filter(detail => validIds.has(detail.context_block_id))
                .map(detail => [detail.context_block_id, detail]));
            this.newSummary(this.kind, false);
            this.setStatus('Drafts remain private until explicitly accepted.');
        } catch (error) {
            this.setStatus(error.message || 'Summary Manager schema is unavailable.', true);
            this.render();
        }
    },

    isOpen() {
        return document.getElementById('summary-manager')?.classList.contains('is-open') || false;
    },

    open() {
        document.getElementById('summary-manager')?.classList.add('is-open');
        document.getElementById('summary-manager')?.setAttribute('aria-hidden', 'false');
        this.render();
    },

    close(force = false) {
        if (!force && (this.dirty || this.generating) && !confirm('Close Summary Manager and discard unsaved review changes?')) return;
        document.getElementById('summary-manager')?.classList.remove('is-open');
        document.getElementById('summary-manager')?.setAttribute('aria-hidden', 'true');
    },

    detailFor(blockId) {
        return this.details.get(blockId) || null;
    },

    kindForBlock(block) {
        return block?.block_type === 'long_summary' ? 'long' : 'short';
    },

    statusFor(block) {
        if (!block) return '';
        return this.detailFor(block.id)?.status || 'accepted';
    },

    acceptedBlocks(kind = this.kind) {
        return this.blocks.filter(block => this.kindForBlock(block) === kind && this.statusFor(block) === 'accepted');
    },

    newSummary(kind = this.kind, confirmDirty = true) {
        if (confirmDirty && this.dirty && !confirm('Discard unsaved summary changes?')) return;
        this.kind = kind === 'long' ? 'long' : 'short';
        this.activeBlockId = '';
        this.generated = null;
        this.generatedSignature = '';
        this.selectedSources = new Set();
        this.dirty = false;

        const chapters = this.chapters();
        const start = Number(chapters[0]?.chapter_order) || 1;
        const end = Number(chapters[Math.min(chapters.length - 1, 4)]?.chapter_order) || start;
        this.setValue('summary-start', start);
        this.setValue('summary-end', end);
        this.setValue('summary-title', this.defaultTitle(start, end));
        this.setValue('summary-model', 'gemma-4-26b-a4b-it');
        this.setValue('summary-instructions', '');
        this.setValue('summary-output', '');
        this.preselectRange();
        this.render();
        this.setStatus(`${this.kind === 'short' ? 'Short' : 'Long'} Summary draft setup.`);
    },

    setKind(kind) {
        if (kind === this.kind && !this.activeBlockId) return;
        this.newSummary(kind, true);
    },

    chapters() {
        return MockDB.chapters
            .filter(chapter => chapter.story_id === this.storyId)
            .slice()
            .sort((a, b) => Number(a.chapter_order) - Number(b.chapter_order));
    },

    startChapter() {
        return Math.max(1, Number(document.getElementById('summary-start')?.value) || 1);
    },

    endChapter() {
        return Math.max(this.startChapter(), Number(document.getElementById('summary-end')?.value) || this.startChapter());
    },

    rangeChanged() {
        const start = this.startChapter();
        const end = this.endChapter();
        if (!this.activeBlockId || !document.getElementById('summary-title')?.value.trim()) {
            this.setValue('summary-title', this.defaultTitle(start, end));
        }
        this.preselectRange();
        this.markDirty();
    },

    defaultTitle(start, end) {
        return `${this.kind === 'short' ? 'Short' : 'Long'} Summary — Chapters ${start}–${end}`;
    },

    preselectRange() {
        const start = this.startChapter();
        const end = this.endChapter();
        if (this.kind === 'short') {
            this.selectedSources = new Set(this.chapters()
                .filter(chapter => Number(chapter.chapter_order) >= start && Number(chapter.chapter_order) <= end)
                .map(chapter => chapter.id));
        } else {
            this.selectedSources = new Set(this.acceptedBlocks('short')
                .filter(block => {
                    const detail = this.detailFor(block.id);
                    if (!detail?.start_chapter || !detail?.end_chapter) return false;
                    return detail.end_chapter >= start && detail.start_chapter <= end;
                })
                .map(block => block.id));
        }
        this.renderSources();
        this.renderWarnings();
    },

    toggleSource(id, checked) {
        if (checked) this.selectedSources.add(id);
        else this.selectedSources.delete(id);
        this.markDirty();
        this.renderSources();
        this.renderWarnings();
    },

    sourceItems() {
        if (this.kind === 'short') {
            return this.chapters().map(chapter => ({
                id: chapter.id,
                title: `Chapter ${chapter.chapter_order} — ${chapter.title || 'Untitled'}`,
                meta: `${Number(chapter.word_count || 0).toLocaleString()} words · saved ${this.formatDate(chapter.updated_at)}`,
                order: Number(chapter.chapter_order) || 0
            }));
        }
        return this.acceptedBlocks('short').map(block => {
            const detail = this.detailFor(block.id);
            return {
                id: block.id,
                title: block.title,
                meta: detail?.start_chapter
                    ? `Chapters ${detail.start_chapter}–${detail.end_chapter}${detail.status ? ` · ${detail.status}` : ''}`
                    : 'Legacy accepted summary · coverage metadata missing',
                order: Number(detail?.start_chapter) || 0
            };
        }).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    },

    render() {
        this.renderKind();
        this.renderRecords();
        this.renderSources();
        this.renderReferences();
        this.renderWarnings();
        this.renderActions();
    },

    renderKind() {
        ['short', 'long'].forEach(kind => {
            document.getElementById(`summary-kind-${kind}`)?.classList.toggle('is-active', this.kind === kind);
        });
        const sourceTitle = document.getElementById('summary-source-title');
        if (sourceTitle) sourceTitle.textContent = this.kind === 'short' ? 'Exact source chapters' : 'Exact accepted Short Summaries';
    },

    renderRecords() {
        const root = document.getElementById('summary-manager-list');
        if (!root) return;
        const records = this.blocks.filter(block => {
            const haystack = `${block.title} ${this.kindForBlock(block)} ${this.statusFor(block)}`.toLowerCase();
            return !this.filter || haystack.includes(this.filter);
        });
        root.innerHTML = records.map(block => {
            const detail = this.detailFor(block.id);
            const status = this.statusFor(block);
            const range = detail?.start_chapter ? `Ch. ${detail.start_chapter}–${detail.end_chapter}` : 'Coverage not indexed';
            return `<button type="button" class="summary-record ${block.id === this.activeBlockId ? 'is-active' : ''}" onclick="SummaryManager.selectRecord('${block.id}')">
                <strong>${UI.escapeHtml(block.title)}</strong>
                <span>${this.kindForBlock(block) === 'short' ? 'Short Summary' : 'Long Summary'} · ${UI.escapeHtml(range)}</span>
                <span class="summary-status ${status}">${UI.escapeHtml(status)}</span>
            </button>`;
        }).join('') || '<p class="p-3 text-[11px] text-zinc-600">No matching summaries.</p>';
    },

    renderSources() {
        const root = document.getElementById('summary-source-list');
        if (!root) return;
        const items = this.sourceItems();
        root.innerHTML = items.map(item => `<label class="summary-source">
            <input type="checkbox" ${this.selectedSources.has(item.id) ? 'checked' : ''} onchange="SummaryManager.toggleSource('${item.id}',this.checked)">
            <span><strong>${UI.escapeHtml(item.title)}</strong><span>${UI.escapeHtml(item.meta)}</span></span>
        </label>`).join('') || `<p class="p-3 text-xs text-zinc-600">${this.kind === 'long' ? 'Accept a Short Summary before generating a Long Summary.' : 'No saved chapters are available.'}</p>`;
        const count = document.getElementById('summary-source-count');
        if (count) count.textContent = `${this.selectedSources.size} selected`;
    },

    renderReferences() {
        const style = document.getElementById('summary-style-reference');
        const supersedes = document.getElementById('summary-supersedes');
        if (!style || !supersedes) return;
        const currentStyle = style.value;
        const currentSupersedes = supersedes.value;
        const options = this.acceptedBlocks(this.kind)
            .filter(block => block.id !== this.activeBlockId)
            .map(block => `<option value="${block.id}">${UI.escapeHtml(block.title)}</option>`)
            .join('');
        style.innerHTML = `<option value="">No style reference</option>${options}`;
        supersedes.innerHTML = `<option value="">Do not supersede another summary</option>${options}`;
        if ([...style.options].some(option => option.value === currentStyle)) style.value = currentStyle;
        if ([...supersedes.options].some(option => option.value === currentSupersedes)) supersedes.value = currentSupersedes;
    },

    renderWarnings() {
        const root = document.getElementById('summary-warnings');
        if (!root) return;
        const warnings = [];
        const start = this.startChapter();
        const end = this.endChapter();
        if (State.unsavedChanges) warnings.push('The active manuscript has unsaved changes. Generation uses only the saved chapter version.');
        if (!this.selectedSources.size) warnings.push('Select at least one factual source.');

        if (this.kind === 'short') {
            const selected = this.chapters().filter(chapter => this.selectedSources.has(chapter.id));
            const outside = selected.filter(chapter => Number(chapter.chapter_order) < start || Number(chapter.chapter_order) > end);
            if (outside.length) warnings.push(`${outside.length} selected chapter(s) fall outside the stated range.`);
            const selectedOrders = new Set(selected.map(chapter => Number(chapter.chapter_order)));
            const gaps = [];
            for (let order = start; order <= end; order += 1) {
                if (!selectedOrders.has(order)) gaps.push(order);
            }
            if (gaps.length) warnings.push(`Range gaps: chapter${gaps.length === 1 ? '' : 's'} ${gaps.join(', ')} are not selected or do not exist.`);
        } else {
            const selected = this.acceptedBlocks('short')
                .filter(block => this.selectedSources.has(block.id))
                .map(block => ({ block, detail: this.detailFor(block.id) }))
                .sort((a, b) => Number(a.detail?.start_chapter || 0) - Number(b.detail?.start_chapter || 0));
            if (selected.some(item => !item.detail?.start_chapter)) warnings.push('At least one legacy Short Summary has no structured range; gap and overlap checks are incomplete.');
            for (let index = 1; index < selected.length; index += 1) {
                const previous = selected[index - 1].detail;
                const current = selected[index].detail;
                if (!previous?.end_chapter || !current?.start_chapter) continue;
                if (current.start_chapter <= previous.end_chapter) warnings.push(`Overlap: ${selected[index - 1].block.title} and ${selected[index].block.title}.`);
                if (current.start_chapter > previous.end_chapter + 1) warnings.push(`Gap between chapters ${previous.end_chapter} and ${current.start_chapter}.`);
            }
        }

        const activeDetail = this.detailFor(this.activeBlockId);
        if (activeDetail?.source_snapshot?.length) {
            const stale = activeDetail.source_snapshot.filter(snapshot => {
                if (snapshot.source_type === 'chapter') {
                    const current = MockDB.chapters.find(chapter => chapter.id === snapshot.id);
                    return !current || new Date(current.updated_at).getTime() > new Date(snapshot.updated_at).getTime();
                }
                const current = this.blocks.find(block => block.id === snapshot.id);
                return !current || new Date(current.updated_at).getTime() > new Date(snapshot.updated_at).getTime();
            });
            if (stale.length) warnings.push(`${stale.length} saved source(s) changed after this summary was generated; consider regenerating.`);
        }

        if (this.generatedSignature && this.generatedSignature !== this.requestSignature()) {
            warnings.push('Sources or generation settings changed after generation. Regenerate before saving this draft.');
        }
        root.innerHTML = warnings.map(warning => `<div class="summary-warning">${UI.escapeHtml(warning)}</div>`).join('');
    },

    renderActions() {
        const status = this.activeBlockId ? this.statusFor(this.blocks.find(block => block.id === this.activeBlockId)) : '';
        document.getElementById('summary-generate')?.toggleAttribute('disabled', this.generating);
        document.getElementById('summary-save-draft')?.toggleAttribute('disabled', this.generating);
        document.getElementById('summary-accept')?.toggleAttribute('disabled', this.generating || status === 'accepted');
        document.getElementById('summary-archive')?.toggleAttribute('disabled', !this.activeBlockId || status === 'archived' || this.generating);
        const output = document.getElementById('summary-output');
        const words = String(output?.value || '').trim().split(/\s+/).filter(Boolean).length;
        const counter = document.getElementById('summary-output-count');
        if (counter) counter.textContent = `${words.toLocaleString()} words`;
    },

    selectRecord(id) {
        if (this.dirty && !confirm('Discard unsaved summary changes?')) return;
        const block = this.blocks.find(item => item.id === id);
        if (!block) return;
        const detail = this.detailFor(id);
        this.activeBlockId = id;
        this.kind = this.kindForBlock(block);
        this.selectedSources = new Set(this.kind === 'short'
            ? detail?.source_chapter_ids || []
            : detail?.source_summary_ids || []);
        this.setValue('summary-start', detail?.start_chapter || 1);
        this.setValue('summary-end', detail?.end_chapter || detail?.start_chapter || 1);
        this.setValue('summary-title', block.title);
        this.setValue('summary-model', detail?.model_id || 'gemma-4-26b-a4b-it');
        this.setValue('summary-instructions', detail?.generation_instructions || '');
        this.setValue('summary-output', ContextWorkspace.plain(block.content));
        this.generated = detail ? {
            provider: detail.provider,
            model_id: detail.model_id,
            prompt_template_version: detail.prompt_template_version,
            generated_at: detail.generated_at,
            source_snapshot: detail.source_snapshot || [],
            generation_meta: detail.generation_meta || {}
        } : null;
        this.render();
        this.setValue('summary-style-reference', detail?.style_reference_id || '');
        this.setValue('summary-supersedes', detail?.supersedes_summary_id || '');
        this.generatedSignature = detail ? this.requestSignature() : '';
        this.dirty = false;
        this.renderWarnings();
        this.renderActions();
        this.setStatus(`${this.statusFor(block)} ${this.kind === 'short' ? 'Short' : 'Long'} Summary loaded.`);
    },

    requestPayload() {
        const items = this.sourceItems();
        const order = new Map(items.map((item, index) => [item.id, index]));
        const sourceIds = [...this.selectedSources].sort((a, b) => (order.get(a) ?? 9999) - (order.get(b) ?? 9999));
        return {
            story_id: this.storyId,
            summary_type: this.kind,
            start_chapter: this.startChapter(),
            end_chapter: this.endChapter(),
            source_ids: sourceIds,
            style_reference_id: document.getElementById('summary-style-reference')?.value || null,
            instructions: document.getElementById('summary-instructions')?.value.trim() || '',
            model_id: document.getElementById('summary-model')?.value || 'gemma-4-26b-a4b-it'
        };
    },

    requestSignature() {
        const payload = this.requestPayload();
        return JSON.stringify(payload);
    },

    async generate() {
        const payload = this.requestPayload();
        if (!payload.source_ids.length) return UI.showToast('Select at least one factual source.', 'error');
        this.generating = true;
        this.renderActions();
        this.setStatus(`Generating ${this.kind === 'short' ? 'Short' : 'Long'} Summary with ${payload.model_id}…`);
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session?.access_token) throw new Error('Your Writer session expired. Sign in again.');
            const response = await fetch(`${SUPABASE_URL}/functions/v1/writer-generate-summary`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || `Summary generation failed (${response.status}).`);
            if (this.activeBlockId && this.statusFor(this.blocks.find(block => block.id === this.activeBlockId)) === 'accepted') {
                this.activeBlockId = '';
            }
            this.generated = result;
            this.generatedSignature = JSON.stringify(payload);
            this.setValue('summary-output', result.text || '');
            if (!document.getElementById('summary-title')?.value.trim()) {
                this.setValue('summary-title', this.defaultTitle(payload.start_chapter, payload.end_chapter));
            }
            this.dirty = true;
            this.renderRecords();
            this.renderWarnings();
            this.setStatus('Generated draft ready for review. Edit, regenerate, save draft, or explicitly accept.');
        } catch (error) {
            this.setStatus(error.message || 'Summary generation failed.', true);
        } finally {
            this.generating = false;
            this.renderActions();
        }
    },

    async saveDraft(showToast = true) {
        const output = document.getElementById('summary-output')?.value.trim() || '';
        if (!output) {
            UI.showToast('Generate or enter summary text first.', 'error');
            return null;
        }
        if (this.generatedSignature && this.generatedSignature !== this.requestSignature()) {
            UI.showToast('Regenerate after changing sources or generation settings.', 'error');
            return null;
        }
        const existingBlock = this.blocks.find(block => block.id === this.activeBlockId);
        const existingStatus = existingBlock ? this.statusFor(existingBlock) : '';
        if (!this.generated && existingStatus !== 'draft') {
            UI.showToast('Generate a draft before saving.', 'error');
            return null;
        }

        const payload = this.requestPayload();
        const title = document.getElementById('summary-title')?.value.trim() || this.defaultTitle(payload.start_chapter, payload.end_chapter);
        const blockRecord = {
            story_id: this.storyId,
            block_type: this.kind === 'short' ? 'chapter_summary' : 'long_summary',
            title,
            content: this.plainToHtml(output),
            updated_at: new Date().toISOString()
        };

        try {
            let savedBlock;
            if (existingBlock && existingStatus === 'draft') {
                const { data, error } = await supabaseClient
                    .from('writer_context_blocks')
                    .update(blockRecord)
                    .eq('id', existingBlock.id)
                    .select()
                    .single();
                if (error) throw error;
                savedBlock = data;
            } else {
                blockRecord.sort_order = this.blocks.filter(block => block.block_type === blockRecord.block_type).length;
                const { data, error } = await supabaseClient
                    .from('writer_context_blocks')
                    .insert(blockRecord)
                    .select()
                    .single();
                if (error) throw error;
                savedBlock = data;
            }

            const previousDetail = existingStatus === 'draft' ? this.detailFor(existingBlock.id) : null;
            const generation = this.generated || previousDetail || {};
            const detailRecord = {
                context_block_id: savedBlock.id,
                summary_kind: this.kind,
                status: 'draft',
                start_chapter: payload.start_chapter,
                end_chapter: payload.end_chapter,
                source_chapter_ids: this.kind === 'short' ? payload.source_ids : [],
                source_summary_ids: this.kind === 'long' ? payload.source_ids : [],
                style_reference_id: payload.style_reference_id,
                provider: generation.provider || 'google',
                model_id: generation.model_id || payload.model_id,
                prompt_template_version: generation.prompt_template_version || 'writer-summary-v1',
                generation_instructions: payload.instructions,
                source_snapshot: generation.source_snapshot || [],
                generation_meta: generation.generation_meta || {},
                generated_at: generation.generated_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            const { error: detailError } = await supabaseClient
                .from('writer_summary_details')
                .upsert(detailRecord, { onConflict: 'context_block_id' });
            if (detailError) throw detailError;

            const savedId = savedBlock.id;
            await this.loadStory(this.storyId);
            this.selectRecord(savedId);
            this.dirty = false;
            if (showToast) UI.showToast('Summary draft saved privately.', 'success');
            return savedId;
        } catch (error) {
            UI.showToast(error.message || 'Could not save summary draft.', 'error');
            return null;
        }
    },

    async accept() {
        let blockId = this.activeBlockId;
        const supersedesId = document.getElementById('summary-supersedes')?.value || null;
        const block = this.blocks.find(item => item.id === blockId);
        if (!block || this.statusFor(block) !== 'draft' || this.dirty) {
            blockId = await this.saveDraft(false);
        }
        if (!blockId) return;
        if (!confirm('Accept this reviewed summary and make it available as reusable Context?')) return;
        const now = new Date().toISOString();
        try {
            if (supersedesId && supersedesId !== blockId) {
                await this.setRecordStatus(supersedesId, 'archived', { archived_at: now });
            }
            const { error } = await supabaseClient
                .from('writer_summary_details')
                .update({
                    status: 'accepted',
                    accepted_at: now,
                    archived_at: null,
                    supersedes_summary_id: supersedesId,
                    updated_at: now
                })
                .eq('context_block_id', blockId);
            if (error) throw error;
            await this.loadStory(this.storyId);
            this.selectRecord(blockId);
            await ContextWorkspace.load(this.storyId);
            UI.showToast('Summary accepted and added to reusable Context.', 'success');
        } catch (error) {
            UI.showToast(error.message || 'Could not accept summary.', 'error');
        }
    },

    async archive() {
        const block = this.blocks.find(item => item.id === this.activeBlockId);
        if (!block || !confirm(`Archive summary "${block.title}"?`)) return;
        try {
            await this.setRecordStatus(block.id, 'archived', { archived_at: new Date().toISOString() });
            await this.loadStory(this.storyId);
            await ContextWorkspace.load(this.storyId);
            UI.showToast('Summary archived.', 'success');
        } catch (error) {
            UI.showToast(error.message || 'Could not archive summary.', 'error');
        }
    },

    async setRecordStatus(blockId, status, extra = {}) {
        const block = this.blocks.find(item => item.id === blockId);
        const detail = this.detailFor(blockId);
        if (detail) {
            const { error } = await supabaseClient
                .from('writer_summary_details')
                .update({ status, ...extra, updated_at: new Date().toISOString() })
                .eq('context_block_id', blockId);
            if (error) throw error;
            return;
        }
        const { error } = await supabaseClient.from('writer_summary_details').insert({
            context_block_id: blockId,
            summary_kind: this.kindForBlock(block),
            status,
            provider: 'legacy',
            model_id: 'legacy-import',
            prompt_template_version: 'legacy',
            source_snapshot: [],
            generation_meta: { legacy: true },
            ...extra
        });
        if (error) throw error;
    },

    cancelReview() {
        this.newSummary(this.kind, true);
    },

    markDirty() {
        this.dirty = true;
        this.renderWarnings();
        this.renderActions();
    },

    setValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value ?? '';
    },

    plainToHtml(value) {
        return String(value || '')
            .split(/\n{2,}/)
            .map(paragraph => `<p>${UI.escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
            .join('');
    },

    formatDate(value) {
        if (!value) return 'unknown date';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? 'unknown date' : date.toLocaleDateString();
    },

    setStatus(message, isError = false) {
        const status = document.getElementById('summary-manager-status');
        if (!status) return;
        status.textContent = message || '';
        status.classList.toggle('is-error', Boolean(isError));
    }
};
