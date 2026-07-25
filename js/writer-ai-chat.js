'use strict';

const AIChat = {
    threads: [],
    messages: [],
    activeThreadId: '',
    storyId: '',
    searchQuery: '',
    nextSequence: 0,
    chatElement: null,
    abortController: null,
    isStreaming: false,
    initialized: false,
    modelCacheKey: 'ea-writer-ai-openrouter-models',
    drawerStateKey: 'ea-writer-ai-drawer-state',
    saveSettingsTimer: null,

    async init() {
        if (this.initialized) return;
        this.initialized = true;
        this.bindEvents();
        this.restoreDrawerState();
        await this.loadModels();
        await this.loadStory(State.activeStoryId);
    },

    bindEvents() {
        document.getElementById('writer-ai-search')?.addEventListener('input', event => {
            this.searchQuery = event.target.value.trim().toLowerCase();
            this.renderThreads();
        });

        ['writer-ai-model', 'writer-ai-temperature', 'writer-ai-max-tokens'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.queueSettingsSave());
        });

        document.getElementById('writer-ai-resize')?.addEventListener('pointerdown', event => {
            if (window.innerWidth <= 760) return;
            event.preventDefault();
            const handle = event.currentTarget;
            handle.setPointerCapture(event.pointerId);
            handle.classList.add('is-dragging');
            document.body.classList.add('writer-ai-resizing');

            const onMove = moveEvent => {
                const width = Math.max(420, Math.min(window.innerWidth - 80, window.innerWidth - moveEvent.clientX));
                document.documentElement.style.setProperty('--writer-ai-drawer-width', `${width}px`);
            };
            const onUp = upEvent => {
                handle.releasePointerCapture(upEvent.pointerId);
                handle.classList.remove('is-dragging');
                document.body.classList.remove('writer-ai-resizing');
                handle.removeEventListener('pointermove', onMove);
                handle.removeEventListener('pointerup', onUp);
                this.persistDrawerState();
            };
            handle.addEventListener('pointermove', onMove);
            handle.addEventListener('pointerup', onUp);
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && this.isOpen()) this.close();
        });
    },

    isOpen() {
        return document.getElementById('writer-ai-drawer')?.classList.contains('is-open') || false;
    },

    async toggle() {
        if (this.isOpen()) {
            this.close();
        } else {
            await this.open();
        }
    },

    async open() {
        const drawer = document.getElementById('writer-ai-drawer');
        const toggle = document.getElementById('writer-ai-toggle');
        drawer?.classList.add('is-open');
        drawer?.setAttribute('aria-hidden', 'false');
        toggle?.setAttribute('aria-expanded', 'true');
        this.persistDrawerState();

        if (!this.activeThreadId && this.storyId) {
            if (this.threads.length) {
                await this.openThread(this.threads[0].id);
            } else {
                await this.createThread();
            }
        }
        setTimeout(() => this.chatElement?.focusInput?.(), 80);
    },

    close() {
        const drawer = document.getElementById('writer-ai-drawer');
        const toggle = document.getElementById('writer-ai-toggle');
        drawer?.classList.remove('is-open');
        drawer?.setAttribute('aria-hidden', 'true');
        toggle?.setAttribute('aria-expanded', 'false');
        this.persistDrawerState();
    },

    restoreDrawerState() {
        try {
            const saved = JSON.parse(localStorage.getItem(this.drawerStateKey) || '{}');
            const width = Math.max(420, Math.min(window.innerWidth - 80, Number(saved.width) || 760));
            if (window.innerWidth > 760) {
                document.documentElement.style.setProperty('--writer-ai-drawer-width', `${width}px`);
            }
            if (saved.open) {
                document.getElementById('writer-ai-drawer')?.classList.add('is-open');
                document.getElementById('writer-ai-drawer')?.setAttribute('aria-hidden', 'false');
                document.getElementById('writer-ai-toggle')?.setAttribute('aria-expanded', 'true');
            }
        } catch (_error) {
            localStorage.removeItem(this.drawerStateKey);
        }
    },

    persistDrawerState() {
        const drawer = document.getElementById('writer-ai-drawer');
        localStorage.setItem(this.drawerStateKey, JSON.stringify({
            open: this.isOpen(),
            width: drawer?.getBoundingClientRect().width || 760
        }));
    },

    activeThreadKey(storyId = this.storyId) {
        return `ea-writer-ai-active-thread:${storyId || 'none'}`;
    },

    async loadStory(storyId) {
        this.stopStream();
        this.storyId = storyId || '';
        this.threads = [];
        this.messages = [];
        this.activeThreadId = '';
        this.nextSequence = 0;
        this.destroyChat();
        this.renderThreads();
        this.renderHeader();

        if (!this.storyId) {
            this.renderEmpty('Choose a story before starting an AI chat.');
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from('writer_ai_chat_threads')
                .select('*')
                .eq('story_id', this.storyId)
                .order('updated_at', { ascending: false });
            if (error) throw error;
            this.threads = data || [];
            this.renderThreads();

            const savedId = localStorage.getItem(this.activeThreadKey());
            const target = this.threads.find(thread => thread.id === savedId) || this.threads[0];
            if (target) {
                await this.openThread(target.id);
            } else {
                this.renderEmpty('No chats for this story yet.', 'Create a chat to start a manual conversation.');
            }
            this.setStatus('Chat history is private, story-scoped, and stored in Supabase.');
        } catch (error) {
            this.setStatus(error.message || 'Writer AI chat schema is unavailable.', true);
            this.renderEmpty('Writer AI is unavailable.', 'Apply the Writer AI chat migration and reload.');
        }
    },

    async createThread() {
        if (!this.storyId) return UI.showToast('Choose a story first.', 'error');
        try {
            const { data, error } = await supabaseClient
                .from('writer_ai_chat_threads')
                .insert({
                    story_id: this.storyId,
                    title: 'New chat',
                    model_id: 'openrouter/auto',
                    settings: { temperature: 0.7, max_tokens: 4096 }
                })
                .select()
                .single();
            if (error) throw error;
            this.threads.unshift(data);
            this.renderThreads();
            await this.openThread(data.id);
            this.chatElement?.focusInput?.();
        } catch (error) {
            UI.showToast(error.message || 'Could not create chat.', 'error');
        }
    },

    async openThread(id) {
        if (!id || id === this.activeThreadId && this.chatElement) return;
        if (this.isStreaming) this.stopStream();
        const thread = this.threads.find(item => item.id === id);
        if (!thread) return;

        this.activeThreadId = id;
        localStorage.setItem(this.activeThreadKey(), id);
        this.renderThreads();
        this.renderHeader();
        this.setStatus('Loading conversation…');

        try {
            const { data, error } = await supabaseClient
                .from('writer_ai_chat_messages')
                .select('*')
                .eq('thread_id', id)
                .order('sequence', { ascending: true });
            if (error) throw error;
            this.messages = data || [];
            this.nextSequence = this.messages.reduce((max, message) => Math.max(max, Number(message.sequence) + 1), 0);
            await this.mountChat(thread, this.messages);
            this.setStatus(`${this.messages.length} saved message${this.messages.length === 1 ? '' : 's'} · Context is never inserted automatically.`);
            this.syncActionState();
        } catch (error) {
            this.setStatus(error.message || 'Could not load conversation.', true);
            this.renderEmpty('Could not load this chat.');
        }
    },

    async renameThread(id = this.activeThreadId) {
        const thread = this.threads.find(item => item.id === id);
        if (!thread) return;
        const title = prompt('Chat title:', thread.title || 'New chat')?.trim();
        if (!title || title === thread.title) return;
        try {
            const { data, error } = await supabaseClient
                .from('writer_ai_chat_threads')
                .update({ title: title.slice(0, 160), updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            this.threads = this.threads.map(item => item.id === id ? data : item);
            this.renderThreads();
            this.renderHeader();
        } catch (error) {
            UI.showToast(error.message || 'Could not rename chat.', 'error');
        }
    },

    async deleteThread(id = this.activeThreadId) {
        const thread = this.threads.find(item => item.id === id);
        if (!thread || !confirm(`Delete chat "${thread.title}" and all of its messages?`)) return;
        if (id === this.activeThreadId) this.stopStream();
        try {
            const { error } = await supabaseClient.from('writer_ai_chat_threads').delete().eq('id', id);
            if (error) throw error;
            this.threads = this.threads.filter(item => item.id !== id);
            if (id === this.activeThreadId) {
                this.activeThreadId = '';
                this.messages = [];
                localStorage.removeItem(this.activeThreadKey());
                this.destroyChat();
                const next = this.threads[0];
                if (next) await this.openThread(next.id);
                else this.renderEmpty('No chats for this story yet.', 'Create a chat to start a manual conversation.');
            }
            this.renderThreads();
            this.renderHeader();
            UI.showToast('Chat deleted.', 'success');
        } catch (error) {
            UI.showToast(error.message || 'Could not delete chat.', 'error');
        }
    },

    threadMenu(event, id) {
        event.stopPropagation();
        const action = prompt('Type R to rename or D to delete this chat:')?.trim().toLowerCase();
        if (action === 'r') this.renameThread(id);
        if (action === 'd') this.deleteThread(id);
    },

    renderThreads() {
        const root = document.getElementById('writer-ai-thread-list');
        if (!root) return;
        const filtered = this.threads.filter(thread => !this.searchQuery
            || String(thread.title || '').toLowerCase().includes(this.searchQuery)
            || String(thread.model_id || '').toLowerCase().includes(this.searchQuery));
        root.innerHTML = filtered.map(thread => `
            <button type="button" class="writer-ai-thread ${thread.id === this.activeThreadId ? 'is-active' : ''}" onclick="AIChat.openThread('${thread.id}')">
                <span class="min-w-0">
                    <span class="writer-ai-thread-title">${UI.escapeHtml(thread.title || 'New chat')}</span>
                    <span class="writer-ai-thread-meta">${UI.escapeHtml(thread.model_id || 'No model')}</span>
                </span>
                <span class="writer-ai-thread-menu" onclick="AIChat.threadMenu(event,'${thread.id}')" title="Chat actions"><i class="fa-solid fa-ellipsis"></i></span>
            </button>
        `).join('') || '<p class="p-3 text-[11px] text-zinc-600">No matching chats.</p>';
    },

    renderHeader() {
        const thread = this.threads.find(item => item.id === this.activeThreadId);
        const title = document.getElementById('writer-ai-title');
        if (title) title.textContent = thread?.title || 'Writer AI';
        const model = document.getElementById('writer-ai-model');
        const temperature = document.getElementById('writer-ai-temperature');
        const maxTokens = document.getElementById('writer-ai-max-tokens');
        if (model) model.value = thread?.model_id || 'openrouter/auto';
        if (temperature) temperature.value = String(thread?.settings?.temperature ?? 0.7);
        if (maxTokens) maxTokens.value = String(thread?.settings?.max_tokens ?? 4096);
        document.getElementById('writer-ai-rename')?.toggleAttribute('disabled', !thread);
        document.getElementById('writer-ai-delete')?.toggleAttribute('disabled', !thread);
    },

    queueSettingsSave() {
        clearTimeout(this.saveSettingsTimer);
        this.saveSettingsTimer = setTimeout(() => this.saveThreadSettings(), 350);
    },

    async saveThreadSettings() {
        const thread = this.threads.find(item => item.id === this.activeThreadId);
        if (!thread) return;
        const modelId = document.getElementById('writer-ai-model')?.value.trim() || 'openrouter/auto';
        const temperature = Math.max(0, Math.min(2, Number(document.getElementById('writer-ai-temperature')?.value) || 0.7));
        const maxTokens = Math.max(1, Math.min(32768, Number(document.getElementById('writer-ai-max-tokens')?.value) || 4096));
        const record = {
            model_id: modelId.slice(0, 200),
            settings: { ...(thread.settings || {}), temperature, max_tokens: Math.floor(maxTokens) },
            updated_at: new Date().toISOString()
        };
        try {
            const { data, error } = await supabaseClient
                .from('writer_ai_chat_threads')
                .update(record)
                .eq('id', thread.id)
                .select()
                .single();
            if (error) throw error;
            this.threads = this.threads.map(item => item.id === data.id ? data : item);
            this.renderThreads();
            this.renderHeader();
        } catch (error) {
            this.setStatus(error.message || 'Could not save model settings.', true);
        }
    },

    async loadModels() {
        let models = [];
        try {
            const cached = JSON.parse(localStorage.getItem(this.modelCacheKey) || 'null');
            if (cached?.savedAt > Date.now() - 24 * 60 * 60 * 1000 && Array.isArray(cached.models)) {
                models = cached.models;
            } else {
                const response = await fetch('https://openrouter.ai/api/v1/models?output_modalities=text');
                if (!response.ok) throw new Error('Model catalog unavailable.');
                const payload = await response.json();
                models = (payload.data || [])
                    .filter(model => model?.id)
                    .map(model => ({ id: model.id, name: model.name || model.id }))
                    .sort((a, b) => a.name.localeCompare(b.name));
                localStorage.setItem(this.modelCacheKey, JSON.stringify({ savedAt: Date.now(), models }));
            }
        } catch (_error) {
            models = [
                { id: 'openrouter/auto', name: 'OpenRouter Auto' },
                { id: 'openrouter/free', name: 'OpenRouter Free Router' }
            ];
        }
        const list = document.getElementById('writer-ai-models');
        if (list) list.innerHTML = models.map(model => `<option value="${UI.escapeHtml(model.id)}">${UI.escapeHtml(model.name)}</option>`).join('');
    },

    async mountChat(thread, messages) {
        this.destroyChat();
        const host = document.getElementById('writer-ai-chat-host');
        if (!host) return;
        try {
            await Promise.race([
                customElements.whenDefined('deep-chat'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Deep Chat did not load.')), 8000))
            ]);
        } catch (error) {
            this.setStatus(error.message, true);
            return this.renderEmpty('Chat component failed to load.');
        }

        const chat = document.createElement('deep-chat');
        const threadId = thread.id;
        chat.history = messages.map(message => ({
            role: message.role === 'assistant' ? 'ai' : message.role,
            text: message.content
        }));
        chat.chatStyle = {
            width: '100%',
            height: '100%',
            border: '0',
            borderRadius: '10px',
            backgroundColor: '#0d0d10',
            fontFamily: 'Inter, sans-serif'
        };
        chat.messageStyles = {
            default: {
                shared: { bubble: { maxWidth: '86%', fontSize: '13px', lineHeight: '1.55' } },
                user: { bubble: { backgroundColor: '#4f46e5', color: '#ffffff' } },
                ai: { bubble: { backgroundColor: '#202024', color: '#e4e4e7' } }
            }
        };
        chat.textInput = { placeholder: { text: 'Paste context or write a message…' } };
        chat.submitButtonStyles = { submit: { container: { default: { backgroundColor: '#4f46e5' } } } };
        chat.names = { ai: { name: 'Assistant' }, user: { name: 'You' } };
        chat.requestBodyLimits = { maxMessages: 120, totalMessagesMaxCharLength: 500000 };
        chat.auxiliaryStyle = `
            #chat-view { background: #0d0d10 !important; }
            #messages { scrollbar-color: #3f3f46 transparent; }
            #input { color: #e4e4e7 !important; }
            .input-button { filter: saturate(.85); }
        `;
        chat.onMessage = body => {
            const message = body?.message;
            if (body?.isHistory || message?.role !== 'user' || !message?.text?.trim()) return;
            this.persistUserMessage(threadId, message.text.trim());
        };
        chat.connect = {
            stream: true,
            handler: (body, signals) => this.handleRequest(threadId, body, signals)
        };
        host.replaceChildren(chat);
        this.chatElement = chat;
    },

    destroyChat() {
        this.chatElement?.remove();
        this.chatElement = null;
        const host = document.getElementById('writer-ai-chat-host');
        if (host) host.replaceChildren();
    },

    renderEmpty(title, detail = '') {
        this.destroyChat();
        const host = document.getElementById('writer-ai-chat-host');
        if (host) {
            host.innerHTML = `<div class="writer-ai-empty"><div><strong>${UI.escapeHtml(title)}</strong>${detail ? `<span>${UI.escapeHtml(detail)}</span>` : ''}</div></div>`;
        }
        this.syncActionState();
    },

    async persistUserMessage(threadId, content) {
        const sequence = this.nextSequence++;
        try {
            const saved = await this.persistMessage(threadId, 'user', content, sequence);
            this.messages.push(saved);
            this.messages.sort((a, b) => a.sequence - b.sequence);
            await this.autoTitleThread(threadId, content);
            this.syncActionState();
        } catch (error) {
            this.setStatus(`Message sent, but history could not be saved: ${error.message}`, true);
        }
    },

    async persistMessage(threadId, role, content, sequence, metadata = {}) {
        const thread = this.threads.find(item => item.id === threadId);
        const { data, error } = await supabaseClient
            .from('writer_ai_chat_messages')
            .insert({
                thread_id: threadId,
                role,
                content,
                sequence,
                model_id: role === 'assistant' ? thread?.model_id || null : null,
                metadata
            })
            .select()
            .single();
        if (error) throw error;
        await supabaseClient
            .from('writer_ai_chat_threads')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', threadId);
        return data;
    },

    async autoTitleThread(threadId, content) {
        const thread = this.threads.find(item => item.id === threadId);
        if (!thread || String(thread.title).toLowerCase() !== 'new chat') return;
        const title = content.replace(/\s+/g, ' ').trim().slice(0, 72) || 'New chat';
        const { data, error } = await supabaseClient
            .from('writer_ai_chat_threads')
            .update({ title, updated_at: new Date().toISOString() })
            .eq('id', threadId)
            .select()
            .single();
        if (!error && data) {
            this.threads = this.threads.map(item => item.id === threadId ? data : item);
            this.renderThreads();
            this.renderHeader();
        }
    },

    providerMessages(body) {
        return (Array.isArray(body?.messages) ? body.messages : [])
            .map(message => ({
                role: message.role === 'ai' ? 'assistant' : message.role,
                content: String(message.text || '').trim()
            }))
            .filter(message => ['system', 'user', 'assistant'].includes(message.role) && message.content);
    },

    async handleRequest(threadId, body, signals) {
        const thread = this.threads.find(item => item.id === threadId);
        if (!thread) {
            await signals.onResponse({ error: 'The selected chat no longer exists.' });
            signals.onClose();
            return;
        }

        const messages = this.providerMessages(body);
        if (!messages.length) {
            await signals.onResponse({ error: 'Enter a message before sending.' });
            signals.onClose();
            return;
        }

        const controller = new AbortController();
        this.abortController = controller;
        this.isStreaming = true;
        this.syncActionState();
        this.setStatus(`Streaming from ${thread.model_id}…`);
        signals.stopClicked.listener = () => controller.abort();
        const assistantSequence = this.nextSequence++;
        let assistantText = '';
        let generationId = '';

        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session?.access_token) throw new Error('Your Writer session expired. Sign in again.');
            const response = await fetch(`${SUPABASE_URL}/functions/v1/writer-openrouter-chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: thread.model_id,
                    messages,
                    temperature: thread.settings?.temperature ?? 0.7,
                    max_tokens: thread.settings?.max_tokens ?? 4096
                }),
                signal: controller.signal
            });

            generationId = response.headers.get('X-Generation-Id') || '';
            if (!response.ok || !response.body) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || `Writer AI request failed (${response.status}).`);
            }

            signals.onOpen();
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let done = false;

            while (!done) {
                const chunk = await reader.read();
                done = chunk.done;
                buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !done });
                const events = buffer.split(/\r?\n\r?\n/);
                buffer = events.pop() || '';

                for (const eventText of events) {
                    const data = eventText
                        .split(/\r?\n/)
                        .filter(line => line.startsWith('data:'))
                        .map(line => line.slice(5).trim())
                        .join('\n');
                    if (!data || data === '[DONE]') continue;
                    const payload = JSON.parse(data);
                    if (payload.error) throw new Error(payload.error.message || payload.error);
                    const delta = payload.choices?.[0]?.delta?.content;
                    if (typeof delta === 'string' && delta) {
                        assistantText += delta;
                        await signals.onResponse({ text: delta });
                    }
                }
            }

            if (assistantText.trim()) {
                const saved = await this.persistMessage(
                    threadId,
                    'assistant',
                    assistantText.trim(),
                    assistantSequence,
                    { generation_id: generationId || null }
                );
                this.messages.push(saved);
                this.messages.sort((a, b) => a.sequence - b.sequence);
            }
            signals.onClose();
            this.setStatus('Response complete and saved to Supabase.');
        } catch (error) {
            if (error.name === 'AbortError') {
                if (assistantText.trim()) {
                    try {
                        const saved = await this.persistMessage(
                            threadId,
                            'assistant',
                            assistantText.trim(),
                            assistantSequence,
                            { stopped: true, generation_id: generationId || null }
                        );
                        this.messages.push(saved);
                        this.messages.sort((a, b) => a.sequence - b.sequence);
                    } catch (saveError) {
                        this.setStatus(`Stopped response could not be saved: ${saveError.message}`, true);
                    }
                }
                signals.onClose();
                this.setStatus('Response stopped.');
            } else {
                await signals.onResponse({ error: error.message || 'Writer AI request failed.' });
                signals.onClose();
                this.setStatus(error.message || 'Writer AI request failed.', true);
            }
        } finally {
            if (this.abortController === controller) this.abortController = null;
            this.isStreaming = false;
            this.syncActionState();
            this.refreshThreadOrder(threadId);
        }
    },

    stopStream() {
        this.abortController?.abort();
    },

    refreshThreadOrder(threadId) {
        const thread = this.threads.find(item => item.id === threadId);
        if (!thread) return;
        thread.updated_at = new Date().toISOString();
        this.threads.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        this.renderThreads();
    },

    latestMessage(role) {
        return [...this.messages].reverse().find(message => message.role === role && message.content);
    },

    async copyLatest() {
        const message = this.latestMessage('assistant');
        if (!message) return UI.showToast('There is no assistant response to copy.', 'error');
        try {
            await navigator.clipboard.writeText(message.content);
            UI.showToast('Latest response copied.', 'success');
        } catch (_error) {
            UI.showToast('Clipboard access denied.', 'error');
        }
    },

    async saveLatestToScratchpad(role) {
        const message = this.latestMessage(role);
        if (!message) return UI.showToast(`There is no ${role} message to save.`, 'error');
        const suggested = role === 'assistant' ? 'AI Response' : 'AI Input';
        const title = prompt('Scratchpad title:', suggested)?.trim();
        if (!title) return;
        const content = `<p>${UI.escapeHtml(message.content).replace(/\n/g, '<br>')}</p>`;
        try {
            const { data, error } = await supabaseClient
                .from('writer_context_blocks')
                .insert({
                    story_id: this.storyId,
                    block_type: 'scratchpad',
                    title,
                    content,
                    sort_order: ContextWorkspace.blocks.filter(block => block.block_type === 'scratchpad').length,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
            if (error) throw error;
            ContextWorkspace.blocks.push(data);
            ContextWorkspace.render();
            UI.showToast(`${role === 'assistant' ? 'Response' : 'Input'} saved as an independent Scratchpad.`, 'success');
        } catch (error) {
            UI.showToast(error.message || 'Could not save Scratchpad.', 'error');
        }
    },

    async copyContextAndOpen() {
        const output = ContextWorkspace.outputForFormat('markdown');
        if (!output) return UI.showToast('Select some context first.', 'error');
        try {
            await navigator.clipboard.writeText(output);
            await this.open();
            UI.showToast('Context copied. Paste it into chat when you are ready.', 'success');
        } catch (_error) {
            UI.showToast('Clipboard access denied.', 'error');
        }
    },

    setStatus(message, isError = false) {
        const status = document.getElementById('writer-ai-status');
        if (!status) return;
        status.textContent = message || '';
        status.classList.toggle('is-error', Boolean(isError));
    },

    syncActionState() {
        const latestAssistant = Boolean(this.latestMessage('assistant'));
        const latestUser = Boolean(this.latestMessage('user'));
        document.getElementById('writer-ai-copy-latest')?.toggleAttribute('disabled', !latestAssistant);
        document.getElementById('writer-ai-save-response')?.toggleAttribute('disabled', !latestAssistant);
        document.getElementById('writer-ai-save-input')?.toggleAttribute('disabled', !latestUser);
    }
};
