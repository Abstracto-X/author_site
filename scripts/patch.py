#!/usr/bin/env python3
from pathlib import Path
import sys


def replace_once(src: str, label: str, old: str, new: str) -> str:
    count = src.count(old)
    if count != 1:
        raise SystemExit(
            f"[ABORT] {label}: expected exactly 1 match, found {count}.\n"
            f"Your file may differ from the version this patch targets."
        )
    print(f"[OK] {label}")
    return src.replace(old, new, 1)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python patch-writer-editor.py path/to/writer.html")

    path = Path(sys.argv[1])
    if not path.exists():
        raise SystemExit(f"[ABORT] File not found: {path}")

    src = path.read_text(encoding="utf-8")
    original = src

    # 1. Add editor operation guards to State.
    src = replace_once(
        src,
        "State guards",
        """        const State = {
            activeStoryId: localStorage.getItem('ea-admin-last-story-id') || '',
            activeChapterId: null,
            unsavedChanges: false,
            quillInstance: null,
            autosaveTimer: null
        };""",
        """        const State = {
            activeStoryId: localStorage.getItem('ea-admin-last-story-id') || '',
            activeChapterId: null,
            unsavedChanges: false,
            quillInstance: null,
            autosaveTimer: null,
            commandRunning: false
        };"""
    )

    # 2. Add Markdown paste detection, rich paste insertion, and toolbar tooltip helpers.
    src = replace_once(
        src,
        "Markdown/helper functions",
        """        function markdownSceneBreaksToHtml(value) {
            return String(value || '').replace(/^\\s*--\\s*$/gm, '<hr>');
        }""",
        """        function markdownSceneBreaksToHtml(value) {
            return String(value || '').replace(/^\\s*--\\s*$/gm, '<hr>');
        }

        function looksLikeMarkdown(text) {
            return /(^#{1,6}\\s|[*_]{1,2}.+[*_]{1,2}|^\\s*[-*+]\\s+|^\\s*\\d+\\.\\s+|^\\s*>|```|^\\s*---\\s*$|^\\s*--\\s*$|^\\[.*\\]$)/m.test(text || '');
        }

        function pasteHtmlAtCursor(html) {
            const quill = State.quillInstance;
            if (!quill) return;

            const range = quill.getSelection(true);
            quill.clipboard.dangerouslyPasteHTML(range.index, html, 'user');
            quill.setSelection(range.index + 1, 0, 'silent');
        }

        function addQuillTooltips() {
            const labels = {
                '.ql-bold': 'Bold',
                '.ql-italic': 'Italic',
                '.ql-underline': 'Underline',
                '.ql-strike': 'Strikethrough',
                '.ql-blockquote': 'Blockquote',
                '.ql-code-block': 'Code block',
                '.ql-list[value="ordered"]': 'Numbered list',
                '.ql-list[value="bullet"]': 'Bullet list',
                '.ql-link': 'Insert link',
                '.ql-image': 'Insert image',
                '.ql-clean': 'Clear formatting'
            };

            Object.entries(labels).forEach(([selector, label]) => {
                document.querySelectorAll(selector).forEach(button => {
                    button.setAttribute('title', label);
                    button.setAttribute('aria-label', label);
                });
            });

            document.querySelectorAll('.ql-header').forEach(picker => {
                picker.setAttribute('title', 'Heading level');
                picker.setAttribute('aria-label', 'Heading level');
            });
        }"""
    )

    # 3. Replace the narrow Markdown-only paste handler.
    src = replace_once(
        src,
        "Paste handler",
        """                State.quillInstance.root.addEventListener('paste', event => {
                    const clipboard = event.clipboardData || event.originalEvent?.clipboardData;
                    const text = clipboard?.getData('text/plain') || '';

                    if (/(^#|\\*\\*|__|^[-*]\\s|^\\d+\\.\\s|^\\[.*\\]$|^\\s*--\\s*$)/m.test(text)) {
                        event.preventDefault();

                        let md = text.replace(/^\\[(.*?)\\]$/gm, (full, content) => {
                            return `<div class="sys-msg-box">${UI.escapeHtml(content)}</div>`;
                        });

                        const html = marked.parse(markdownSceneBreaksToHtml(md));
                        const range = State.quillInstance.getSelection(true);

                        State.quillInstance.clipboard.dangerouslyPasteHTML(range.index, html, 'user');
                        UI.showToast('Markdown detected and formatted.', 'success');
                    }
                });""",
        """                State.quillInstance.root.addEventListener('paste', event => {
                    const clipboard = event.clipboardData || event.originalEvent?.clipboardData;
                    if (!clipboard) return;

                    const html = clipboard.getData('text/html') || '';
                    const text = clipboard.getData('text/plain') || '';

                    // If plain text looks like Markdown or LLM Markdown, render it as rich text.
                    if (text && looksLikeMarkdown(text)) {
                        event.preventDefault();

                        const md = text.replace(/^\\[(.*?)\\]$/gm, (full, content) => {
                            return `<div class="sys-msg-box">${UI.escapeHtml(content)}</div>`;
                        });

                        pasteHtmlAtCursor(marked.parse(markdownSceneBreaksToHtml(md)));
                        UI.showToast('Markdown pasted as rich text.', 'success');
                        return;
                    }

                    // If the clipboard contains real rich HTML, let Quill keep it rich.
                    if (html) return;

                    // Plain text fallback: let Quill paste normally.
                });"""
    )

    # 4. Add toolbar labels after Quill has rendered the toolbar.
    src = replace_once(
        src,
        "Toolbar tooltip init",
        """                this.updateMeta();
            },

            isSystemLineAt(index) {""",
        """                addQuillTooltips();
                this.updateMeta();
            },

            isSystemLineAt(index) {"""
    )

    # 5. Replace fragile slash/system input handler with guarded version.
    src = replace_once(
        src,
        "handleCustomInputs",
        """            handleCustomInputs() {
                const quill = State.quillInstance;
                const range = quill.getSelection();

                if (!range) return;

                const [line] = quill.getLine(range.index);

                if (!line) return;

                if (line.domNode.classList.contains('sys-msg-box')) {
                    return;
                }

                const lineIndex = quill.getIndex(line);
                const lineLength = Math.max(line.length() - 1, 0);
                const rawLineText = quill.getText(lineIndex, lineLength);
                const text = rawLineText.trim();

                if (text === '--') {
                    quill.deleteText(lineIndex, lineLength, 'user');
                    this.insertSceneBreak();
                    return;
                }

                if (text === '/image' || text === '/scene' || text === '/clean') {
                    this.executeSlashCommand(text.slice(1));
                    return;
                }

                if (text.startsWith('[') && text.endsWith(']') && text.length > 2) {
                    const innerText = text.substring(1, text.length - 1);

                    quill.deleteText(lineIndex, lineLength, 'user');
                    quill.insertText(lineIndex, innerText, 'user');
                    quill.formatLine(lineIndex, Math.max(innerText.length, 1), 'system-message', true, 'user');
                    quill.setSelection(lineIndex + innerText.length, 0, 'silent');
                }
            },""",
        """            handleCustomInputs() {
                if (State.commandRunning) return;

                const quill = State.quillInstance;
                const range = quill.getSelection();
                if (!range) return;

                const [line] = quill.getLine(range.index);
                if (!line || line.domNode.classList.contains('sys-msg-box')) return;

                const lineIndex = quill.getIndex(line);
                const lineLength = Math.max(line.length() - 1, 0);
                const rawLineText = quill.getText(lineIndex, lineLength);
                const text = rawLineText.trim();

                if (text === '--') {
                    State.commandRunning = true;
                    quill.deleteText(lineIndex, lineLength, 'silent');
                    this.insertSceneBreak(lineIndex);
                    State.commandRunning = false;
                    return;
                }

                if (text === '/image' || text === '/scene' || text === '/clean') {
                    State.commandRunning = true;
                    this.executeSlashCommand(text.slice(1), { quill, range, line, lineIndex, lineLength, text });
                    State.commandRunning = false;
                    return;
                }

                if (text.startsWith('[') && text.endsWith(']') && text.length > 2) {
                    State.commandRunning = true;

                    const innerText = text.substring(1, text.length - 1);
                    quill.deleteText(lineIndex, lineLength, 'silent');
                    quill.insertText(lineIndex, innerText, 'user');
                    quill.formatLine(lineIndex, Math.max(innerText.length, 1), 'system-message', true, 'user');
                    quill.setSelection(lineIndex + innerText.length, 0, 'silent');

                    State.commandRunning = false;
                }
            },"""
    )

    # 6. Let scene break insertion use a known index, avoiding selection drift.
    src = replace_once(
        src,
        "insertSceneBreak",
        """            insertSceneBreak() {
                const quill = State.quillInstance;
                const range = quill.getSelection(true);
                quill.insertEmbed(range.index, 'break', true, 'user');
                quill.setSelection(range.index + 1, 0, 'silent');
                this.hideSlashMenu();
            },""",
        """            insertSceneBreak(index = null) {
                const quill = State.quillInstance;
                if (!quill) return;

                const range = quill.getSelection(true);
                const insertAt = Number.isInteger(index) ? index : range.index;

                quill.insertEmbed(insertAt, 'break', true, 'user');
                quill.setSelection(insertAt + 1, 0, 'silent');
                this.hideSlashMenu();
            },"""
    )

    # 7. Make normalizeForSave pure: no live editor clearing, no paste-back reload.
    src = replace_once(
        src,
        "normalizeForSave",
        """            normalizeForSave() {
                const quill = State.quillInstance;
                if (!quill) return '';
                const cleaned = cleanChapterEditorHtml(quill.root.innerHTML);
                quill.setText('', 'silent');
                quill.clipboard.dangerouslyPasteHTML(0, cleaned, 'silent');
                this.updateMeta();
                return quill.root.innerHTML;
            },""",
        """            normalizeForSave() {
                const quill = State.quillInstance;
                if (!quill) return '';

                // Clean a detached copy of the HTML. Never rewrite the live Quill editor during save.
                return cleanChapterEditorHtml(quill.root.innerHTML);
            },"""
    )

    # 8. Make slash command execution use the captured line info.
    src = replace_once(
        src,
        "executeSlashCommand",
        """            executeSlashCommand(command) {
                const info = this.clearCurrentLine();
                if (!info) return;
                if (command === 'scene') this.insertSceneBreak();
                else if (command === 'clean') this.removeExtraLineBreaks();
                else if (command === 'image') this.openMediaLibrary();
                this.hideSlashMenu();
            },""",
        """            executeSlashCommand(command, info = this.getCurrentLineInfo()) {
                if (!info) return;

                info.quill.deleteText(info.lineIndex, info.lineLength, 'silent');

                if (command === 'scene') {
                    this.insertSceneBreak(info.lineIndex);
                } else if (command === 'clean') {
                    this.removeExtraLineBreaks();
                } else if (command === 'image') {
                    this.openMediaLibrary();
                }

                this.markUnsaved();
                this.hideSlashMenu();
            },"""
    )

    if src == original:
        raise SystemExit("[ABORT] No changes made.")

    backup = path.with_suffix(path.suffix + ".bak")
    backup.write_text(original, encoding="utf-8")
    path.write_text(src, encoding="utf-8")

    print(f"\\nPatched: {path}")
    print(f"Backup:  {backup}")
    print("Done. Hard refresh the browser after deploying, preferably with cache disabled.")


if __name__ == "__main__":
    main()