const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'writer.html'), 'utf8');
const from = html.indexOf('function chapterAccessListEntries(');
const to = html.indexOf('function wordCountFromHtml(', from);
assert.ok(from >= 0 && to > from, 'Writer access-list formatter exists');
const formatterSource = html.slice(from, to);
const format = (chapters, tiers) => {
    const context = vm.createContext({ URL, chapters, tiers, baseUrl: 'https://cornyshitler.pages.dev/index.html' });
    vm.runInContext(formatterSource, context);
    return vm.runInContext('chapterAccessListText(chapterAccessListEntries(chapters, tiers, baseUrl))', context);
};

test('selected chapters copy as descending linked unlock lines using real tier names', () => {
    const tiers = [
        { id: 'l', slug: 'resident-licker', name: 'Resident Licker' },
        { id: 't', slug: 'resident-tyrant', name: 'Resident Tyrant' },
        { id: 'n', slug: 'resident-nemesis', name: 'Resident Nemesis' },
        { id: 'e', slug: 'resident-evil', name: 'Resident Evil' }
    ];
    const chapters = [
        { id: 'licker-id', chapter_order: 78, title: 'Oral Complications I (R18)', required_tier_id: 'l' },
        { id: 'nemesis-id', chapter_order: 83, title: 'Chapter 83: A Way Out', required_tier_id: 'n' },
        { id: 'tyrant-id', chapter_order: 81, title: 'Chapter 81: Legendary Pull', required_tier_id: 't' }
    ];
    assert.equal(format(chapters, tiers), [
        '[Chapter 83: A Way Out](https://cornyshitler.pages.dev/index.html#/read/nemesis-id) unlocked for Resident Nemesis and Resident Evil',
        '[Chapter 81: Legendary Pull](https://cornyshitler.pages.dev/index.html#/read/tyrant-id) unlocked for Resident Tyrant',
        '[Chapter 78: Oral Complications I (R18)](https://cornyshitler.pages.dev/index.html#/read/licker-id) unlocked for Resident Licker'
    ].join('\n'));
});

test('free chapters and Markdown-sensitive titles remain copyable', () => {
    const result = format([{ id: 'free-id', chapter_order: 5, title: 'A [Strange] Escape', required_tier_id: null }], []);
    assert.equal(result, '[Chapter 5: A \\[Strange\\] Escape](https://cornyshitler.pages.dev/index.html#/read/free-id) unlocked for everyone');
});

test('rich clipboard HTML contains actual safe anchor links, not literal Markdown', () => {
    const chapters = [{ id: 'chapter-id', chapter_order: 80, title: 'Symbiotic <Bonding>', required_tier_id: 'l' }];
    const tiers = [{ id: 'l', slug: 'resident-licker', name: 'Resident Licker' }];
    const context = vm.createContext({ URL, chapters, tiers, baseUrl: 'https://cornyshitler.pages.dev/index.html' });
    vm.runInContext(formatterSource, context);
    const result = vm.runInContext('chapterAccessListHtml(chapterAccessListEntries(chapters, tiers, baseUrl))', context);
    assert.equal(result, '<p><a href="https://cornyshitler.pages.dev/index.html#/read/chapter-id">[Chapter 80: Symbiotic &lt;Bonding&gt;]</a> unlocked for Resident Licker</p>');
});

test('Writer selection is restricted to published chapters and stays inside the dashboard', () => {
    assert.match(html, /id="dash-copy-access-list"[\s\S]*?onclick="App\.copyAccessList\(\)"/);
    assert.match(html, /chapter\.is_published && State\.accessListChapterIds\.has\(chapter\.id\)/);
    assert.match(html, /\$\{isPublished \? '' : 'disabled'\}/);
    assert.match(html, /State\.accessListChapterIds\.clear\(\);\s*Dashboard\.render\(\);/);
});

test('Copy access list writes rich links for only checked published chapters', async () => {
    const start = html.indexOf('async copyAccessList()');
    const end = html.indexOf('async deleteChapter(id)', start);
    assert.ok(start >= 0 && end > start);
    const writes = [];
    class ClipboardItemStub {
        constructor(data) { this.data = data; }
    }
    const context = vm.createContext({
        URL,
        State: { activeStoryId: 'story', accessListChapterIds: new Set(['live', 'draft', 'other']), tierUpdateInFlight: false },
        MockDB: {
            chapters: [
                { id: 'live', story_id: 'story', is_published: true, chapter_order: 3, title: 'A Way Out', required_tier_id: 't' },
                { id: 'draft', story_id: 'story', is_published: false, chapter_order: 4, title: 'Draft', required_tier_id: 't' },
                { id: 'other', story_id: 'other', is_published: true, chapter_order: 5, title: 'Other Story', required_tier_id: 't' }
            ],
            tiers: [{ id: 't', slug: 'resident-tyrant', name: 'Resident Tyrant' }]
        },
        Dashboard: { updateAccessListButton() {} },
        UI: { showToast() {} },
        Blob,
        ClipboardItem: ClipboardItemStub,
        navigator: { clipboard: { async write(items) { writes.push(items); } } },
        window: { ClipboardItem: ClipboardItemStub, location: { href: 'https://cornyshitler.pages.dev/writer.html' } }
    });
    vm.runInContext(formatterSource, context);
    vm.runInContext(`const App = { ${html.slice(start, end)} async deleteChapter() {} };`, context);
    await vm.runInContext('App.copyAccessList()', context);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].length, 1);
    const data = writes[0][0].data;
    assert.equal(await data['text/plain'].text(),
        '[Chapter 3: A Way Out](https://cornyshitler.pages.dev/index.html#/read/live) unlocked for Resident Tyrant');
    assert.equal(await data['text/html'].text(),
        '<p><a href="https://cornyshitler.pages.dev/index.html#/read/live">[Chapter 3: A Way Out]</a> unlocked for Resident Tyrant</p>');
});
