const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'writer.html'), 'utf8');
const start = html.indexOf('function unwrapFencedSystemMessageHtml(');
const end = html.indexOf('function markdownToEditorHtml(', start);
assert.ok(start >= 0 && end > start, 'Writer paste normalizer exists');
const context = vm.createContext({});
vm.runInContext(html.slice(start, end), context);
const normalize = value => {
    context.value = value;
    return vm.runInContext('unwrapFencedSystemMessageHtml(value)', context);
};

test('AI Studio fenced system divs become live HTML blocks, not code text', () => {
    const input = 'Before.\n\n```html\n<div class="sys-msg-box">Current Form: Trilobite</div>\n<div class="sys-msg-box">Slots: 5</div>\n```\n\nAfter.';
    const result = normalize(input);
    assert.doesNotMatch(result, /```/);
    assert.match(result, /Before\.[\s\S]*<div class="sys-msg-box">Current Form: Trilobite<\/div>\n<div class="sys-msg-box">Slots: 5<\/div>[\s\S]*After\./);
});

test('unrelated code fences and mixed-content fences stay untouched', () => {
    for (const input of [
        '```html\n<p>Ordinary HTML</p>\n```',
        '```html\n<div class="sys-msg-box">System</div>\n<p>Other</p>\n```',
        '```js\n<div class="sys-msg-box">Example</div>\n```'
    ]) assert.equal(normalize(input), input);
});

test('paste prefers normalized Markdown over rich clipboard code wrappers', () => {
    assert.match(html, /normalizedText === text && html && richHtmlLooksUseful\(html\)/);
    assert.match(html, /markdownToEditorHtml\(normalizedText\)/);
});
