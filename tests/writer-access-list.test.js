const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'writer.html'), 'utf8');
const from = html.indexOf('function rankOf(');
const to = html.indexOf('function wordCountFromHtml(', from);
assert.ok(from >= 0 && to > from, 'Writer access-list formatter exists');
const formatterSource = html.slice(from, to);
const format = (chapters, tiers) => {
    const context = vm.createContext({ URL, chapters, tiers, baseUrl: 'https://cornyshitler.pages.dev/index.html' });
    vm.runInContext(formatterSource, context);
    return vm.runInContext('chapterAccessListText(chapterAccessListEntries(chapters, tiers, baseUrl))', context);
};

test('selected chapters copy grouped by tier (highest first) with descending chapters', () => {
    const tiers = [
        { id: 'l', slug: 'resident-licker', name: 'Resident Licker', tier_rank: 10 },
        { id: 't', slug: 'resident-tyrant', name: 'Resident Tyrant', tier_rank: 20 },
        { id: 'n', slug: 'resident-nemesis', name: 'Resident Nemesis', tier_rank: 30 },
        { id: 'e', slug: 'resident-evil', name: 'Resident Evil', tier_rank: 40 }
    ];
    const chapters = [
        { id: 'licker-id', chapter_order: 78, title: 'Oral Complications I (R18)', required_tier_id: 'l' },
        { id: 'nemesis-id-1', chapter_order: 82, title: 'Chapter 82: First Contact', required_tier_id: 'n' },
        { id: 'nemesis-id-2', chapter_order: 83, title: 'Chapter 83: A Way Out', required_tier_id: 'n' },
        { id: 'tyrant-id', chapter_order: 81, title: 'Chapter 81: Legendary Pull', required_tier_id: 't' },
        { id: 'free-id', chapter_order: 5, title: 'Prologue', required_tier_id: null }
    ];
    assert.equal(format(chapters, tiers), [
        'Unlocked for Resident Nemesis and higher tiers:',
        '- [Chapter 83: A Way Out](https://cornyshitler.pages.dev/index.html#/read/nemesis-id-2)',
        '- [Chapter 82: First Contact](https://cornyshitler.pages.dev/index.html#/read/nemesis-id-1)',
        '',
        'Unlocked for Resident Tyrant and higher tiers:',
        '- [Chapter 81: Legendary Pull](https://cornyshitler.pages.dev/index.html#/read/tyrant-id)',
        '',
        'Unlocked for Resident Licker and higher tiers:',
        '- [Chapter 78: Oral Complications I (R18)](https://cornyshitler.pages.dev/index.html#/read/licker-id)',
        '',
        'Unlocked for everyone:',
        '- [Chapter 5: Prologue](https://cornyshitler.pages.dev/index.html#/read/free-id)'
    ].join('\n'));
});

test('free chapters and Markdown-sensitive titles remain copyable', () => {
    const result = format([{ id: 'free-id', chapter_order: 5, title: 'A [Strange] Escape', required_tier_id: null }], []);
    assert.equal(result, [
        'Unlocked for everyone:',
        '- [Chapter 5: A \\[Strange\\] Escape](https://cornyshitler.pages.dev/index.html#/read/free-id)'
    ].join('\n'));
});

test('rich clipboard HTML contains grouped bullet lists with safe anchor links', () => {
    const chapters = [
        { id: 'chapter-1', chapter_order: 80, title: 'Symbiotic <Bonding>', required_tier_id: 'l' },
        { id: 'chapter-2', chapter_order: 81, title: 'Next Step', required_tier_id: 'l' }
    ];
    const tiers = [{ id: 'l', slug: 'resident-licker', name: 'Resident Licker', tier_rank: 10 }];
    const context = vm.createContext({ URL, chapters, tiers, baseUrl: 'https://cornyshitler.pages.dev/index.html' });
    vm.runInContext(formatterSource, context);
    const result = vm.runInContext('chapterAccessListHtml(chapterAccessListEntries(chapters, tiers, baseUrl))', context);
    assert.equal(result, '<p><strong>Unlocked for Resident Licker:</strong></p><ul><li><a href="https://cornyshitler.pages.dev/index.html#/read/chapter-2">Chapter 81: Next Step</a></li><li><a href="https://cornyshitler.pages.dev/index.html#/read/chapter-1">Chapter 80: Symbiotic &lt;Bonding&gt;</a></li></ul>');
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
        CONFIG: { publicBaseUrl: 'https://second.example/fiction/' },
        State: { activeStoryId: 'story', accessListChapterIds: new Set(['live', 'draft', 'other']), tierUpdateInFlight: false },
        MockDB: {
            chapters: [
                { id: 'live', story_id: 'story', is_published: true, chapter_order: 3, title: 'A Way Out', required_tier_id: 't' },
                { id: 'draft', story_id: 'story', is_published: false, chapter_order: 4, title: 'Draft', required_tier_id: 't' },
                { id: 'other', story_id: 'other', is_published: true, chapter_order: 5, title: 'Other Story', required_tier_id: 't' }
            ],
            tiers: [{ id: 't', slug: 'resident-tyrant', name: 'Resident Tyrant', tier_rank: 20 }]
        },
        Dashboard: { updateAccessListButton() {} },
        UI: { showToast() {} },
        Blob,
        ClipboardItem: ClipboardItemStub,
        navigator: { clipboard: { async write(items) { writes.push(items); } } },
        window: { ClipboardItem: ClipboardItemStub, location: { href: 'https://cornyshitler.pages.dev/writer.html' } }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/subscription/site-settings.js'), 'utf8'), context);
    vm.runInContext(formatterSource, context);
    vm.runInContext(`const App = { ${html.slice(start, end)} async deleteChapter() {} };`, context);
    await vm.runInContext('App.copyAccessList()', context);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].length, 1);
    const data = writes[0][0].data;
    assert.equal(await data['text/plain'].text(),
        'Unlocked for Resident Tyrant:\n- [Chapter 3: A Way Out](https://second.example/fiction/index.html#/read/live)');
    assert.equal(await data['text/html'].text(),
        '<p><strong>Unlocked for Resident Tyrant:</strong></p><ul><li><a href="https://second.example/fiction/index.html#/read/live">Chapter 3: A Way Out</a></li></ul>');
});

test('audience copy follows real tier rank rather than source slugs or array position', () => {
    const chapters = [{ id: 'x', chapter_order: 1, title: 'Start', required_tier_id: 'pilot' }];
    const tiers = [{ id: 'captain', name: 'Sky Captain', tier_rank: 50 }, { id: 'pilot', name: 'Star Pilot', tier_rank: 5 }];
    assert.match(format(chapters, tiers), /^Unlocked for Star Pilot and higher tiers:/);
    tiers[0].is_active = false;
    assert.match(format(chapters, tiers), /^Unlocked for Star Pilot:/);
    tiers[1].name = 'Renamed Crew';
    assert.match(format(chapters, tiers), /^Unlocked for Renamed Crew:/);
});
