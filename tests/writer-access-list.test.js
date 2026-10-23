const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'writer.html'), 'utf8');
const from = html.indexOf('function chapterAccessListText(');
const to = html.indexOf('function wordCountFromHtml(', from);
assert.ok(from >= 0 && to > from, 'Writer access-list formatter exists');
const formatterSource = html.slice(from, to);
const format = (chapters, tiers) => {
    const context = vm.createContext({ URL, chapters, tiers, baseUrl: 'https://cornyshitler.pages.dev/index.html' });
    vm.runInContext(formatterSource, context);
    return vm.runInContext('chapterAccessListText(chapters, tiers, baseUrl)', context);
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

test('Writer selection is restricted to published chapters and stays inside the dashboard', () => {
    assert.match(html, /id="dash-copy-access-list"[\s\S]*?onclick="App\.copyAccessList\(\)"/);
    assert.match(html, /chapter\.is_published && State\.accessListChapterIds\.has\(chapter\.id\)/);
    assert.match(html, /\$\{isPublished \? '' : 'disabled'\}/);
    assert.match(html, /State\.accessListChapterIds\.clear\(\);\s*Dashboard\.render\(\);/);
});

test('Copy access list writes only checked published chapters to the clipboard', async () => {
    const start = html.indexOf('async copyAccessList()');
    const end = html.indexOf('async deleteChapter(id)', start);
    assert.ok(start >= 0 && end > start);
    const writes = [];
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
        navigator: { clipboard: { async writeText(text) { writes.push(text); } } },
        window: { location: { href: 'https://cornyshitler.pages.dev/writer.html' } }
    });
    vm.runInContext(formatterSource, context);
    vm.runInContext(`const App = { ${html.slice(start, end)} async deleteChapter() {} };`, context);
    await vm.runInContext('App.copyAccessList()', context);
    assert.deepEqual(writes, [
        '[Chapter 3: A Way Out](https://cornyshitler.pages.dev/index.html#/read/live) unlocked for Resident Tyrant'
    ]);
});
