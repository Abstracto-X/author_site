# Studio Rebuild Plan

Status: **PROPOSED — planning only, nothing implemented.**
Created: 2026-10-13 Asia/Kolkata.
Owner decisions captured so far are marked **[DECIDED]**; open questions are marked **[OPEN]** and collected in §14.

This document is written so that each phase can be executed by a separate, short agent session. Every phase lists the files to read first, the exact deliverables, and exit criteria. Do not start a phase without reading §1–§3.

---

## 0. TL;DR

1. Build a new **`studio.html`** next to the existing `admin.html` / `writer.html` (parallel build, strangler pattern). The old pages keep working until each Studio section reaches parity, then they are frozen and archived.
2. Replace the Quill chapter editor with a **vendored, pre-built TipTap (ProseMirror) bundle** **[DECIDED]**. Chapters become a **structured JSON document**; the reader keeps receiving generated HTML, so `get_reader_chapter` and the reader contract do not change.
3. Square brackets stop meaning "system box". Bracketed text gets a **role**: `notification`, `status`, `label` (location / POV / time / continuation), or `caption` (character name under an image). Same typing gesture, different semantic block. **[DECIDED: differentiator, not new panels]**
4. Real block types are kept small: **System Notification**, **Status Screen**, **Meta Label**, **Figure** (image + optional linked character name with an inline bio dropdown), **Author Note**, **Scene Break**.
5. The `author_system_manager_v3_shop.html` prototype becomes the **System Tracker** section of Studio, moved from `localStorage` to Supabase, with data-driven modules instead of hard-coded biology modules. It stays freeform and separate from prose **[DECIDED]**. "Insert a status/shop screen from the tracker into a chapter" is a **future** item **[DECIDED]**.
6. Admin features are ported in order of how often you use them; every Supabase table ends up with exactly **one** owning Studio module. `admin.html` gets a feature freeze on day one.

---

## 1. Current state (why it feels like patchwork)

| Problem | Evidence | Consequence |
|---|---|---|
| Three authoring surfaces | `admin.html` (~5.6k lines, contains its own embedded Writer/Chapters view), `writer.html` (~7.1k lines, mostly one inline script), legacy `js/admin-writer.js` | Features land in one place, get copied to another, drift apart. |
| Flat editor model | Quill stores a document as a flat list of lines. System boxes are a line-level block format (`SystemMessageBlot`) plus `sys-msg-group-start/middle/end` classes, soft-break merging, bracket "source mode" and `mergeAdjacentSystemMessageBlocks()` | Anything nested (box with title + rows, image + caption) is a workaround. Every new feature fights the editor. |
| Brackets are overloaded | `[Status]`, `[Rebecca's POV]`, `[Raccoon City Police Department]`, `[To be Continued]`, and a character name under an image all become `div.sys-msg-box` | Reader can't style them differently; LLM export can't distinguish them; ornate frame applies to things that aren't system messages. |
| Presentation decided by parsing | Ornate frame chosen by parsing `Chapter 72` from the title vs. `reader_behavior` cutoff | Fragile; title edits change rendering. |
| System data disconnected | `story_systems` / versions / checkpoints exist but are unused; the real tracking lives in a local HTML prototype in `Downloads` using `localStorage` | Tracker data can be lost with browser storage; nothing links it to chapters. |
| All chapter bodies loaded | ~65 chapters / ~1.5 MB loaded at Writer start because Context + Summary read the cache | Slow cold start, grows forever. |
| No revision history | Published chapters save live; no private draft/revision table | Risky editing of live chapters. |

What is **good and must be preserved** (port, don't redesign):

- Save queue semantics: revision-aware, serialized, single-flight, 30 s write deadline, "unconfirmed" timeout state, transition flushing (see `docs/CODEBASE_OVERVIEW.md` §1 "Writer save contract").
- Context Workspace (presets RPC `save_writer_context_preset`, prompt preview, budgets, exports).
- AI drawer (`js/writer-ai-chat.js`) and Summary Manager (`js/writer-summary-manager.js`) — already separate files; they move almost unchanged.
- Chapter tabs, chapter index with tier colors, copy-link, quick tier edits.
- Rolling access, reader CRM, access keys, provider mappings — business logic is correct, only the UI moves.

---

## 2. Guardrails this plan respects

- **No framework, no runtime build step.** Studio is plain classic scripts like the reader. The only exception is a **one-time vendor build** of the editor bundle (§6.1), committed as a single file under `vendor/`, exactly like `vendor/supabase/`. **[DECIDED: vendoring a pre-built editor is acceptable]**
- **Schema first.** Every new column/table/RPC is an idempotent migration in `supabase/migrations/` + `database/sql/`, ending with `NOTIFY pgrst, 'reload schema';`, reviewed and run by the owner (the `ai_editor` role cannot DROP/DELETE).
- **No mock data.** The System Tracker prototype's `seedDB()` content is **imported once as real data** (it's your canon), never bundled as fallback.
- **Reader contract unchanged** during the editor migration: `chapters.content` stays HTML; `get_reader_chapter`, `get_chapter_catalog`, `chapter_feed_images` keep working.
- **Admin-only** everything in Studio via `public.is_admin()` RLS; no service keys in the browser.

---

## 3. Target architecture

### 3.1 One app: `studio.html`

```txt
studio.html                      # shell only: layout, script tags, no feature logic
styles/studio.css                # shell + shared component styles
styles/studio-editor.css         # editor + block styles (shared tokens with reader)
vendor/tiptap/tiptap-<ver>.min.js  # pre-built IIFE exposing window.TiptapBundle
js/studio/
  core/
    config.js        # reuses js/subscription/site-config.js values
    supabase.js      # client + auth guard (admin profile check)
    router.js        # hash routes: #/manuscript, #/codex/characters, #/systems/...
    store.js         # tiny observable state (current story, current chapter, dirty flags)
    save-queue.js    # PORTED from writer.html save contract (generic, per-entity)
    request.js       # deadlines, abort, retry, "unconfirmed" semantics
    uploads.js       # bucket uploads, unique paths, cacheControl
    ui.js            # toasts, dialogs (focus trap), confirm, inspector API
    shell.js         # left nav, inspector rail, command palette (Ctrl+K)
  data/              # ONE module per table group; the only place Supabase is called
    stories.js  chapters.js  revisions.js  characters.js  gallery.js  lore.js
    maps.js  timeline.js  access.js  readers.js  community.js  settings.js
    context.js  systems.js  media.js
  editor/
    editor.js        # creates TipTap instance, wires save-queue, word count
    schema/          # one file per custom node/mark (see §5)
      notification.js  status-screen.js  meta-label.js  figure.js
      author-note.js  scene-break.js  character-mention.js
    serializers/
      to-html.js     # doc -> reader HTML (the published contract, §7)
      to-markdown.js # doc -> LLM Markdown (replaces Turndown hacks)
      to-text.js     # doc -> plain text / word count
      to-richclip.js # doc -> clipboard rich text with per-line brackets
    import/
      legacy-html.js # existing chapter HTML -> doc (with bracket classifier)
      paste.js       # Docs/Word/LLM/Markdown paste -> doc
      bracket-classifier.js
    ui/
      slash-menu.js  bubble-toolbar.js  block-handle.js  role-chip.js
  sections/
    manuscript.js  codex.js  systems.js  context.js  publishing.js
    readers.js  settings.js  dashboard.js
js/writer-ai-chat.js            # moved/used as-is, mounted in Studio drawer
js/writer-summary-manager.js    # moved/used as-is
```

Rule: **sections never call Supabase directly**; they call `data/*`. Each table has exactly one `data/*` owner (§10 ownership table).

### 3.2 Layout

```txt
┌───────────┬──────────────────────────────────────────┬──────────────┐
│ Left rail │ Center                                   │ Inspector    │
│           │                                          │ (contextual) │
│ Sections  │ Manuscript: chapter tabs + editor        │ - nothing    │
│ ───────── │ Codex: list/grid + detail                │   selected → │
│ Story ▾   │ Systems: tracker modules                 │   chapter    │
│ Chapter   │ Context: prompt canvas                   │   settings   │
│ tree      │ ...                                      │ - block      │
│ (arcs →   │                                          │   selected → │
│ chapters) │                                          │   block props│
│           │                                          │ - tabs: Notes│
│           │                                          │   / AI / Sys │
└───────────┴──────────────────────────────────────────┴──────────────┘
```

- Left rail collapses to icons; chapter tree only shows in Manuscript.
- Inspector is one component with registered "panes"; editor blocks register their property pane (e.g. Figure → image, character, caption, mature flag).
- Command palette (Ctrl+K): jump to chapter, character, system entry, section; run commands (New chapter, Insert notification...). The System Tracker prototype already has one (`openPalette`) — generalize it.
- Mobile: rails become drawers; editing works but Studio is desktop-first.

### 3.3 Sections and what they replace

| Studio section | Contents | Replaces |
|---|---|---|
| **Dashboard** | Recent chapters, drafts with unsaved revisions, publish queue, continuity flags from System Tracker, quick stats | `admin.html` dashboard |
| **Manuscript** | Chapter tree, tabs, editor, Chapter Notes, revisions, chapter settings (tier, NSFW, external URL, cover, teaser) | `writer.html` editor, admin Writer/Chapters, admin Teaser/Access panels |
| **Codex** | Characters (+ reader bio), Gallery, Lore, Maps, Wallpapers, Timeline, Map Requests, Author Profile | admin Story Extras, Profile |
| **Systems** | System Tracker (from prototype) | `Downloads/author_system_manager_v3_shop.html`, dormant `story_systems` UI |
| **Context & AI** | Context Workspace, Summary Manager, AI threads | `writer.html` Context surface |
| **Publishing** | Stories metadata, rolling access policies + matrix, release schedule | admin Stories, Rolling Access |
| **Readers** | CRM, providers, redemptions, entitlement audit, community comments/reactions, access keys, tiers, manual grants, provider mappings | admin Readers, Community, Access Tools |
| **Settings** | Site identity, reader behavior, block style settings (ornate frame etc.), Studio preferences | admin Settings |

---

## 4. Bracket semantics: one gesture, four roles

**[DECIDED]** These are not new panels — they are a **differentiator** on bracketed text.

### 4.1 Roles

| Role | Examples | Editor look | Reader render | Markdown export |
|---|---|---|---|---|
| `notification` | `[You have gained 500 EP]` | System box | System box (legacy or ornate frame) | `[…]` |
| `status` | Status screen | Structured panel (§5.2) | Status panel | Bracketed, rows as lines |
| `label` | `[Raccoon City Police Department]`, `[Rebecca's POV]`, `[3 hours later]`, `[To be Continued]` | Small-caps centered tag with subtype icon | Centered scene label; **no** system frame | `[…]` (configurable) |
| `caption` | Character name under an image | Part of the Figure block (§5.4) | Name under image; clickable bio dropdown if linked | `[Name]` after image line |

`label` subtypes: `location`, `pov`, `time`, `continuation`, `generic`. Subtype only changes the icon/style token (e.g. pin, eye, clock, ellipsis), not the structure.

### 4.2 Authoring flow

1. Type `[` at the start of an empty paragraph → bracket mode (same muscle memory as today).
2. On closing `]` or Enter, the **bracket classifier** guesses a role:
   - previous block is an image → `caption` (merged into that Figure)
   - matches `/\bPOV\b/i` → `label/pov`
   - matches `/^to be continued|^end of chapter|^continued/i` → `label/continuation`
   - matches time phrases (`later`, `earlier`, `hours`, `days`, `morning`, `night`, dates) and is short → `label/time`
   - short (≤ 7 words), no sentence punctuation, title-case → `label/location`
   - contains `Status`, or ≥ 2 `Key: Value` lines → `status`
   - otherwise → `notification`
3. A small **role chip** appears at the block's left edge (`SYS ▾`, `LOC ▾`, `POV ▾`…). One click changes role; `Ctrl+Shift+[` cycles roles. Wrong guesses cost one click.
4. The editor never shows raw `[ ]` in render mode; a "show source" toggle shows brackets for all blocks (replaces the current global eye toggle and per-block source mode).

### 4.3 Why this matters downstream

- Reader can style labels distinctly (and they stop getting the ornate system frame).
- LLM/Context Markdown can be told what each bracket is (`[POV: Rebecca]` option), improving summaries.
- Word count can optionally exclude labels/system text.
- Migration (§8) can classify all 65 existing chapters automatically with a review screen.

---

## 5. Block catalogue

Kept deliberately small. Each block is defined once in `js/studio/editor/schema/<block>.js` with:

```js
// shape of a block definition (conceptual)
{
  name: 'notification',
  tiptap: Node.create({...}),        // schema, attrs, parse/render rules, keyboard
  nodeView(props) { /* plain DOM */ },
  inspector: { fields: [...] },      // inspector pane definition
  toHTML(node, ctx) {...},           // reader contract (§7)
  toMarkdown(node, ctx) {...},
  toText(node) {...},
  fromLegacy: { match(el), convert(el) },  // migration hooks
  slash: { title: 'System notification', keywords: ['sys','notify'] }
}
```

### 5.1 System Notification (`notification`)

- Content: rich inline text, multiple paragraphs allowed (real nested content — no soft-break hacks).
- Attrs: `title?` (optional header line), `tone` (`default | reward | warning | error | quest`), `frame` (`auto | legacy | ornate`).
- `frame: auto` resolves from **story setting** + optional chapter override — replaces chapter-title parsing. Migration sets chapter override to `legacy` for chapters ≤ the current cutoff so nothing visually changes.
- Linked text inside (current `sys-msg-caption` behavior) is just a link mark — style comes from the block.

### 5.2 Status Screen (`status`)

You described "various status screens". Make it **one block type with a flexible row model**, not many templates:

- Attrs: `title`, `subtitle?`, `frame`, `layout` (`list | two-column`).
- Children: ordered **rows**, each one of:
  - `field` — label + value (`Current Form: Cerberus / MA-129`)
  - `bar` — label + value% (+ optional caption) (`Evolution: 80%`)
  - `list` — label + bullet items (`Active Mutations: …`)
  - `section` — sub-header
  - `text` — free rich paragraph
- Editing is **in place** (WYSIWYG): click a value to edit; Tab moves to next field; Enter on last row adds a row; row type changed from a small handle menu. This matches the earlier visual-approval requirement in `docs/CODEBASE_OVERVIEW.md` (in-dialogue value editing + chapter-context preview).
- **Saved templates**: "Save as template" stores the row skeleton (labels only) in `writer_block_templates` (§9) so "MES Status" is one click next time.
- **Future [DECIDED future]**: "Fill from System Tracker at chapter N" — copies a snapshot into the rows and stores `source: {systemId, chapterId, snapshotAt}`. It is a **copy**, never a live link, so published chapters never change when the tracker changes. An explicit "Refresh from tracker" button shows a diff first.
- Shop/lottery screens later reuse the same row model (`list` rows with price columns) or get their own block when the tracker integration happens. Not in v1.

### 5.3 Meta Label (`label`)

- Attrs: `subtype` (`location | pov | time | continuation | generic`), text inline content.
- Reader render: centered, small-caps, subtle rule lines; continuation labels get end-of-chapter spacing.
- No frame options; never ornate.

### 5.4 Figure (`figure`)

- Attrs: `assetId?`, `src`, `alt`, `width` (`full | wide | inline`), `align`, `isMature`, `characterId?`, `caption` (inline content), `showBio` (bool, default true when `characterId` set).
- Caption = the old "bracket name under image". If `characterId` is set, the caption name is a link to the character.
- **Reader behavior (new):** clicking the name opens an **inline disclosure** under the figure (not a modal) with the character's portrait thumb, short bio, and a "View in gallery" link. Content comes from a **reader-safe bio field** (§9: `characters.reader_bio`), loaded lazily by the reader the first time a disclosure is opened.
- **Spoiler control [OPEN]**: a character's bio at chapter 70 may spoil chapter 20. Options: (a) one reader bio, author keeps it spoiler-safe; (b) per-figure bio override text stored in the block; (c) bio "as of chapter N" versions. Recommendation: (a)+(b) in v1, (c) later if needed.
- Multiple images side by side: `figure-row` wrapper containing 2–3 figures (v1.1, optional).
- Upload flow: drop/paste image → uploads to `chapter-images` via `core/uploads.js` → optional `media_assets` row (§9) → figure inserted at the drop position bound to the **chapter id at upload start** (fixes the current wrong-chapter-insert risk class by design).

### 5.5 Author Note (`authorNote`)

Two distinct things; don't merge them:

| Kind | Visible to readers? | Use |
|---|---|---|
| `public` | Yes | "Author's note: thanks for 1000 patrons…" styled block, usually top/bottom of chapter |
| `private` | **No — stripped by `toHTML`** | Inline reminders while drafting ("check EP math here") |

- Attrs: `kind`, `placement` hint for public notes (`top | bottom | inline`).
- Private notes are also **excluded from LLM Markdown by default** (toggle in Context export).
- Private notes are different from Chapter Notes (the `scratchpads` side documents), which stay as they are.

### 5.6 Scene Break (`sceneBreak`)

- Same as today (`---` / `--` shortcut). Attr `style` (`rule | ornament | space`) for future.

### 5.7 Inline marks

- Standard: bold, italic, underline, strike, link, (maybe) small-caps.
- `characterMention` (optional, v1.1): `@Rebecca` links prose to a Codex character — enables "chapters where X appears" in Codex and better Context selection. Reader renders plain text (or a subtle link if enabled).

### 5.8 Explicitly out of scope for v1

Chat/phone message logs, letters/documents, tables, footnotes, collaborative editing, comments threads. The registry makes each of these a single new file later.

---

## 6. Editor engine and integration

### 6.1 Vendoring TipTap without a runtime build

- One-time, documented vendor build in `tools/vendor-build/tiptap/` (a `package.json` + `entry.js` + `build.ps1` using `esbuild`), output a single IIFE `vendor/tiptap/tiptap-<ver>.min.js` exposing `window.TiptapBundle = { Editor, Node, Mark, Extension, StarterKit, Link, Underline, Placeholder, CharacterCount, Suggestion, ... }`, plus `LICENSE` files (MIT).
- `node_modules` is **not** committed and **not** needed to run the site; only to rebuild the vendor file. Document this in `vendor/tiptap/README.md` (version, exact package list, rebuild command, SHA-256 of output).
- Pin versions; record in `docs/CODEBASE_OVERVIEW.md` dependency list.
- No React: all node views are plain DOM (`addNodeView` returning `{ dom, contentDOM, update, destroy }`).

Packages (initial): `@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-underline`, `@tiptap/extension-placeholder`, `@tiptap/extension-character-count`, `@tiptap/suggestion` (slash menu), `@tiptap/extension-dropcursor`, `@tiptap/extension-gapcursor`, `@tiptap/extension-history` (via StarterKit). Optional: `@tiptap/extension-drag-handle` (or a small custom block handle).

### 6.2 Editor UX

- **Slash menu** (`/`): Notification, Status Screen, Label (Location/POV/Time/Continuation), Image, Character Image, Author Note (public/private), Scene Break, Template… (status templates).
- **Bubble toolbar** on text selection: B / I / U / S / link / clear / "wrap in Notification" / "convert to Label".
- **Block handle** (hover left gutter): drag to reorder, duplicate, delete, change role/type.
- **Markdown shortcuts**: `**bold**`, `*italic*`, `---` scene break, `[` bracket mode.
- **Keyboard**: Backspace at block start unwraps the block to paragraphs (current behavior preserved); `Ctrl+S` explicit save/version; `Ctrl+Enter` publish **only** when the editor has focus (scoping fix already established).
- **Focus mode**: hide rails, typewriter scrolling (optional).
- **Reader preview toggle**: renders the current doc through `toHTML` inside a sandboxed container using the **reader's actual CSS** (`styles.css` block section), with a chapter-number context so frame resolution is honest. This is the "Reader Preview" required by the earlier system-panel approval gate.

### 6.3 Paste and import

- Paste from Google Docs / Word: normalize via TipTap's parse rules, strip junk spans, then run `bracket-classifier` on paragraphs that are fully bracketed.
- Paste Markdown/LLM output: detect Markdown, convert, classify brackets.
- "Import chapter from .docx/.md" (v1.1): same pipeline.
- Every classification can be reviewed: after a big paste, a non-blocking banner "12 brackets converted: 7 notifications, 3 labels, 2 captions — Review" highlights them.

### 6.4 Save contract (port, then extend)

- Port `writer.html` save queue logic into `core/save-queue.js` generically: entity key, revision counter, serialized writes, single-flight, deadline, unconfirmed state, flush-on-transition. Write Node tests first by porting `tests/writer-safety.test.js` scenarios.
- Extended with revisions (§9):
  - **Autosave** (debounced) → upserts the chapter's single **working draft** revision. Works for published chapters too — published content is no longer edited live.
  - **Save version** (`Ctrl+S`) → inserts an immutable named/timestamped revision.
  - **Publish** → generates HTML from the chosen revision, writes `chapters.content` + metadata, sets `published_revision_id`. "Update live" = publish current draft.
  - **Restore** → copies an old revision into the working draft (never overwrites history).
- This resolves the open item in `PROJECT_STATE.md` (2026-10-01 "chapter version design": autosave = recoverable working draft, explicit Save = timestamped version).

### 6.5 Loading strategy

- Chapter list: metadata only (`id, title, chapter_order, is_published, required_tier_id, word_count, updated_at`).
- Chapter body: loaded when a tab opens; LRU cache of ~10 docs.
- Context/Summary: request bodies on demand by id (adapt their loaders to an async `getChapterText(id)`); cache Markdown per revision id.

---

## 7. Published HTML contract (doc → reader)

Goal: reader needs only **CSS + one small JS enhancement**; RPCs unchanged.

```html
<div class="chapter-doc" data-doc-version="2">
  <p>Prose…</p>

  <aside class="blk blk-notification" data-tone="reward" data-frame="ornate">
    <div class="blk-title">System</div>
    <p>You have gained <strong>500 EP</strong>.</p>
  </aside>

  <aside class="blk blk-status" data-frame="legacy">
    <div class="blk-title">Status</div>
    <dl class="blk-rows">
      <div class="row row-field"><dt>Current Form</dt><dd>Cerberus / MA-129</dd></div>
      <div class="row row-bar" style="--v:80"><dt>Evolution</dt><dd>80%</dd></div>
      <div class="row row-list"><dt>Active Mutations</dt><dd><ul><li>Chitinous Armor Plating</li></ul></dd></div>
    </dl>
  </aside>

  <p class="blk blk-label" data-subtype="pov">Rebecca's POV</p>

  <figure class="blk blk-figure" data-width="wide" data-mature="false">
    <img src="…" alt="…" loading="lazy">
    <figcaption>
      <button class="char-link" data-character-id="uuid" aria-expanded="false">Rebecca Chambers</button>
    </figcaption>
  </figure>

  <aside class="blk blk-author-note" data-placement="bottom"><p>…</p></aside>
  <hr class="blk blk-scene-break">
</div>
```

Rules:

- `data-doc-version="2"` lets the reader keep legacy CSS for v1 HTML (`div.sys-msg-box`) indefinitely.
- Accessibility: `aside` with `aria-label` per role; bars expose text value; `char-link` is a real button.
- Private author notes and editor-only attrs never appear.
- Sanitization: `toHTML` is the only producer; the reader's existing sanitize path must allowlist the new classes/attrs (check `views/story-reader.js` rendering path before Phase 5).
- `chapter_feed_images` keeps working because images remain `<img src>` in `content` (verify trigger regex handles `<figure>`).
- Copy-as-rich-text/Markdown for LLMs keeps the bracket convention: notification/status → `[…]` per box; label → `[…]` (or `[POV: …]` option); caption → `[Name]` on the line after the image.

Reader work (small, Phase 5): CSS for `.blk-*` (reusing reader-scoped system tokens so custom reader colors still work), `char-link` disclosure JS in `story-reader.js` (lazy fetch from public `characters` columns), label styling, author note styling, ornate frame keyed by `data-frame` instead of chapter number for v2 docs.

---

## 8. Migrating the existing chapters

1. **Dry-run converter** (`import/legacy-html.js`, runnable in Node over an exported JSON of chapters via `scripts/database/query-ai-db.ps1` SELECT):
   - `p`, `strong/em/u/s/a`, `hr`/scene markers → native nodes.
   - `img` + following `sys-msg-box` with short text → `figure` with `caption` (character auto-match by name against `characters.name`, case-insensitive, alias list).
   - other `sys-msg-box` → bracket classifier (§4.2) → `notification | status | label`.
   - Unknown/odd markup → kept as a `legacyHtml` atom block (read-only, flagged) — **never dropped**.
2. **Report**: per chapter, counts by role, low-confidence items, unmatched character names, legacy atoms. Saved as a scratch artifact for review.
3. **Round-trip check**: for each chapter, `toText(doc)` must equal normalized text of the old HTML (no lost words). Fail = chapter stays on legacy.
4. **Review screen in Studio** (Manuscript → "Migration review"): list of flagged blocks with one-click role change.
5. **Commit per chapter**: write a `legacy-import` revision holding the original HTML + the converted doc as working draft. `chapters.content` is **not** touched until you publish that chapter from Studio. Unconverted chapters stay editable in the old Writer until done.
6. Frame preservation: chapters ≤ current `reader_behavior` cutoff get chapter-level `frame: legacy`; later ones `ornate`; the cutoff setting is then retired.

---

## 9. Database plan (migrations, owner-reviewed)

All idempotent, admin-only RLS via `is_admin()` unless stated. Names are proposals.

### 9.1 Chapters and revisions (Phase 2)

```sql
-- chapters: additive columns
alter table public.chapters add column if not exists content_doc jsonb;          -- current working doc (nullable for legacy)
alter table public.chapters add column if not exists doc_version int not null default 1;
alter table public.chapters add column if not exists published_revision_id uuid;
alter table public.chapters add column if not exists frame_override text check (frame_override in ('legacy','ornate'));

create table if not exists public.chapter_revisions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  kind text not null check (kind in ('draft','version','published','legacy-import')),
  label text,
  doc jsonb,                -- null for pure legacy html snapshots
  html text,                -- generated (published) or original (legacy-import)
  doc_version int not null default 2,
  word_count int,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create unique index if not exists chapter_revisions_one_draft
  on public.chapter_revisions(chapter_id) where kind = 'draft';
```

- RPC `publish_chapter_revision(chapter_id, revision_id, html, word_count, preview_text)` — admin-only, transactional: inserts `published` revision copy, updates `chapters.content/word_count/is_published/published_revision_id`. Existing triggers (`sync_chapter_feed_images`, publish notifications) still fire on `chapters`.
- Retention: keep all `version`/`published`; one `draft` per chapter (upsert). Consider pruning later — pruning needs owner (DELETE).
- **Reader RLS unchanged**; `chapter_revisions` is never readable by readers.

### 9.2 Blocks, media, characters (Phase 2/4)

```sql
create table if not exists public.writer_block_templates (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories(id) on delete cascade,
  block_type text not null,            -- 'status' initially
  name text not null,
  skeleton jsonb not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.media_assets (       -- optional, Phase 4
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories(id) on delete set null,
  bucket text not null, path text not null, public_url text not null,
  width int, height int, alt text, tags text[] not null default '{}',
  is_mature boolean not null default false,
  character_id uuid references public.characters(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.characters add column if not exists reader_bio text;          -- spoiler-safe, public-readable
alter table public.characters add column if not exists aliases text[] not null default '{}';
```

Verify existing `characters` columns and public SELECT policy first (`docs/DATABASE_CONTEXT.md` §`public.characters`); only expose `reader_bio` through the existing public read path.

### 9.3 System Tracker (Phase 6)

Map the prototype's in-memory model to tables. Prefer **generic entries + data-driven modules** over one table per biology module.

| Prototype collection | Table | Notes |
|---|---|---|
| `systems` | reuse **`story_systems`** (add `short_name`, `owner_label`, `version_label`, `currency_name`, `theme`) | Check whether the existing one-system-per-story constraint should be relaxed **[OPEN]** |
| `MODULE_META` / `GROUPS` / `MODULE_COLORS` (hard-coded) | `system_modules` (`system_id, key, label, icon, color, group_label, sort_order, field_schema jsonb, kind`) | `kind`: `entries` (generic), `inventory`, `shop`, `lottery`, `ledger`, `history`, `updates`. Biology modules become data, so a second story's system can have different modules. |
| `entries` | `system_entries` (`system_id, module_key, name, author_status canon/future/archived, subtype, rarity, origin, first_chapter_id?, chapter_label, description, notes, owned, equipped, price, progress, data jsonb, sort_order`) | `data` validated against the module's `field_schema` → schema-driven form instead of raw JSON textarea. |
| `relations` | `system_relations` (`from_entry_id, to_entry_id, type`) | |
| `inventory` | `system_inventory` (`item_entry_id, qty, status, notes`) | |
| `transactions` | `system_ledger` (`amount, chapter_id?, chapter_label, reason, notes, occurred_order`) | Balance = SUM; view `system_ledger_balance`. |
| `events` | `system_events` (`chapter_id?, chapter_label, type, title, details, entry_id?`) | Auto-written on edits (as prototype does). |
| `shopSources` / `shopMutationOffers` / `shopOffers` | `system_shop_sources`, `system_shop_offers` | |
| `lotteryWheels` | `system_wheels` (+ later `system_wheel_rewards`) | |
| `updates` | `system_updates` (`version, chapter_id?, title, changes text[]`) | |
| `continuityIssues` | `system_continuity_flags` (`severity, title, details, resolved_at`) | |

- Chapter references: prototype uses free text (`'Train arc'`, `'66'`). Keep `chapter_label` text **and** an optional `chapter_id` FK; Studio offers a chapter picker but accepts free text for arcs/unknowns. A later "Link labels to chapters" helper resolves numeric labels automatically.
- Existing `story_system_versions`, `story_system_checkpoints`, `reader_system_progress`, and inactive `js/system-core.js`, `js/writer-system.js`, `js/subscription/system-panel.js`: **park**, don't build on them. They model a reader-facing progressive system page, which is a different feature. Decide later whether to archive (owner migration) **[OPEN]**.
- Import: the prototype has `exportDB()` → JSON. Phase 6 includes a one-time "Import prototype JSON" tool that writes your real data to these tables (dry-run preview first). Export a backup from the prototype **before** anything else; its data lives only in that browser's `localStorage`.

---

## 10. Porting admin.html: what moves, what stays, what dies

The question "should they still exist separately after porting?" — answer: **no long-term duplicates.** Every function ends in exactly one of these buckets:

| Bucket | Meaning | What |
|---|---|---|
| **A. Absorb & retire** | Rebuilt in Studio with improvements; old code archived | Writer/Chapters (both admin embedded + `writer.html`), Stories, Teaser/Access panels, Rolling Access UI |
| **B. Straight port** | Same behavior and queries, new shell; minimal redesign | Readers CRM, Community, Access Tools (tiers, keys, grants, provider mappings), Site Settings, Profile, Story Extras (characters, gallery, lore, maps, wallpapers, timeline, map requests) |
| **C. Shared core** | Duplicated helpers become one module | `escapeHtml`, uploads (`uploadImage`, `getImageUploadPayload`), tag inputs, drag-drop, modal/confirm/toast, sanitize/markdown utils, `sha256Hex`/access code gen |
| **D. Delete** | Superseded | Admin rich editor commands (`Forms.editor*`), `Utils.markdownToChapterHtml` & friends (replaced by editor import/serializers), `js/admin-writer.js`, Quill system-message code |

Process rules:

1. **Feature freeze** `admin.html` and `writer.html` at Phase 1 start: bug fixes only.
2. Port per section; when a Studio section passes its parity checklist, the old section shows a banner "Moved to Studio →" (still usable for a grace period).
3. After all sections pass, move `admin.html`, `writer.html`, `js/admin-writer.js` to `deleted/` (documented), keep `/studio/*` reader redirects pointing to `studio.html`.
4. **Table ownership** (one `data/*` module writes each table):

| `data/` module | Tables |
|---|---|
| `stories.js` | `stories`, `story_access_policies` |
| `chapters.js` / `revisions.js` | `chapters`, `chapter_revisions` (+ `publish_chapter_revision`, `recalculate` RPC calls) |
| `characters.js` | `characters` |
| `gallery.js` | `character_gallery_images`, `image_votes` (read) |
| `lore.js` / `maps.js` / `timeline.js` | `lore_*`, `maps`, `map_request*`, `timeline_event*`, `story_wallpapers` |
| `access.js` | `reader_access_tiers`, `access_keys`, `user_entitlements` (manual grants), `provider_tier_mappings` |
| `readers.js` / `community.js` | `profiles`, `provider_connections`, `access_key_redemptions`, `entitlement_audit_log` (read), `comments`, `chapter_reactions` |
| `settings.js` | `site_settings`, `author_links` |
| `context.js` | `writer_context_*`, `scratchpads`, `writer_summary_details`, `writer_nodes/links` |
| `systems.js` | `story_systems`, `system_*` |
| `media.js` | `media_assets`, storage uploads |

Port order (by how often you use it, and dependencies): Manuscript → Codex/Characters (needed by Figure bios) → Systems → Context & AI → Publishing → Settings → Readers/Access (rarely used, high-risk, straight port last).

---

## 11. Phases (each sized for short sessions)

Each phase: read `AGENTS.md`, `docs/CODEBASE_OVERVIEW.md`, `PROJECT_STATE.md`, this plan, plus the phase's listed files. Update `PROJECT_STATE.md` at the end of each session; `CHANGELOG.md` when a phase lands.

### Phase 0 — Safety and decisions (owner, ~30 min)
- Export System Tracker prototype JSON (its Export button) and store it in `design/system-tracker/` (and a backup outside the repo).
- Copy the prototype HTML to `design/system-tracker/author_system_manager_v3_shop.html` as the reference.
- Answer the §14 open questions.
- **Exit:** decisions recorded in this file.

### Phase 1 — Editor spike (1–2 sessions) — *the go/no-go gate*
- Vendor build TipTap bundle (§6.1).
- `design/editor-spike/index.html`: standalone page, no Supabase writes. Implements `notification`, `label`, `figure` (caption only) + slash menu + bracket classifier.
- Load 3 real chapters (read-only SELECT export, including the messy Chapter 60 and one with image captions) through the legacy converter; display; run `toHTML` and `toText` round-trip.
- **Exit:** zero word loss on the 3 chapters; bracket gesture feels at least as fast as today; you sign off on the feel. If not, revisit engine choice before any schema work.

### Phase 2 — Schema (1 session + owner run)
- Migrations §9.1 + `writer_block_templates` + `characters.reader_bio/aliases`. Verify via `information_schema` and an RPC smoke call with a disposable chapter.
- **Exit:** owner applied; verified; `docs/DATABASE_CONTEXT.md` updated.

### Phase 3 — Studio shell + core (2 sessions)
- `studio.html`, `core/*` (auth guard, router, store, ui, request, save-queue with ported tests), `shell.js` with left rail / inspector / command palette, Dashboard stub with honest empty states.
- **Exit:** sign in as admin, navigate empty sections, Node tests for save-queue pass.

### Phase 4 — Manuscript (3–5 sessions)
- Chapter tree/tabs/index (tier colors, quick tier, copy link, delete), full block catalogue §5.1–5.6, inspector panes, revisions UI (draft/version/publish/restore), reader preview, uploads, Chapter Notes, paste pipeline, exports (Markdown/rich/plain).
- **Exit:** you write and publish one real new chapter entirely in Studio; reader shows it correctly (after Phase 5 CSS — do Phase 5 in parallel or before publishing).

### Phase 5 — Reader support for v2 HTML (1–2 sessions)
- `.blk-*` CSS using reader tokens, label/author-note styles, `data-frame` ornate logic, `char-link` disclosure, sanitizer allowlist, `chapter_feed_images` check.
- **Exit:** v1 and v2 chapters both render correctly in all reader themes and on mobile.

### Phase 6 — Legacy chapter migration (2 sessions + your review time)
- Dry-run report over all chapters, review screen, per-chapter commit as `legacy-import` revisions.
- **Exit:** all chapters have docs; flagged items reviewed; republished at your pace.

### Phase 7 — Codex (2–3 sessions)
- Characters (with `reader_bio`, aliases, portrait), Gallery, Lore, Maps, Wallpapers, Timeline, Map Requests, Author Profile — straight port + shared uploads/tag inputs.
- **Exit:** parity checklist vs admin Story Extras; admin sections show "Moved to Studio".

### Phase 8 — System Tracker (3–4 sessions)
- Migrations §9.3 (owner run), `data/systems.js`, Systems section porting the prototype's views: Overview (live state, continuity radar, recent changes), generic module views (cards/table/list, filters, canon/future/archived), entry drawer with relations, Inventory, Shop (sources → form + mutation offers), Lottery, EP Ledger, History, System Updates, Settings (module editor with field schemas).
- One-time prototype JSON import with preview.
- Improvements: chapter picker (FK + label), schema-driven custom-data forms, "state at chapter N" scrubber (derive from events/ledger order), inspector tab in Manuscript showing tracker events for the open chapter (read-only in v1).
- **Exit:** prototype data fully in Supabase; you stop using the local HTML.

### Phase 9 — Context & AI move (1–2 sessions)
- Mount `writer-ai-chat.js` + `writer-summary-manager.js` in Studio; Context Workspace ported, using on-demand chapter text and revision-cached Markdown; private author notes excluded by default.
- **Exit:** Context presets, AI threads and summaries work from Studio.

### Phase 10 — Publishing, Settings, Readers/Access (2–3 sessions)
- Straight ports with ownership table; block style settings (default frame) in Settings.
- **Exit:** parity checklists pass.

### Phase 11 — Retirement (1 session)
- Archive `admin.html`, `writer.html`, `js/admin-writer.js`, Quill code to `deleted/`; reader `/studio/*` redirects → `studio.html`; docs rewritten (`CODEBASE_OVERVIEW`, new `STUDIO_FUNCTION_INDEX.md` replacing `ADMIN_FUNCTION_INDEX.md`).

### Future (not scheduled)
- Insert Status/Shop screen from System Tracker snapshot (§5.2).
- Character mentions → "appears in chapters" in Codex; better Context auto-selection.
- Figure rows, chat-log block, letter block.
- Character bio versions by chapter.
- Revision diff view.

---

## 12. Testing strategy

- **Node contract tests** (no browser): serializers (`doc → html/markdown/text`), bracket classifier fixtures (list of real bracket strings from your chapters with expected roles), legacy converter word-preservation over exported chapters, save-queue scenarios ported from `tests/writer-safety.test.js`.
- **Fixture source**: a read-only export of chapter HTML via `scripts/database/query-ai-db.ps1` into `.tmp/` (git-ignored) — never committed if it contains paid content.
- **Manual QA checklists** per phase in `docs/STUDIO_MANUAL_QA.md` (mirrors `docs/WRITER_MANUAL_QA.md` style): caret behavior in blocks, paste, uploads during tab switches, publish/restore, reader rendering across themes/mobile.
- Owner-led browser verification (repo preference) — agents do not drive an admin browser.

---

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Editor engine doesn't feel right | Phase 1 is a hard gate before schema/UI investment. |
| Losing words during migration | Round-trip text equality check; legacy atoms instead of dropping; original HTML kept in `legacy-import` revision; `chapters.content` untouched until you publish. |
| Two writers in parallel confuse which is canonical | A chapter that has a v2 doc shows a lock banner in old `writer.html` ("Edit in Studio"). |
| Reader regressions | `data-doc-version` split; legacy CSS untouched; Phase 5 before publishing v2 chapters. |
| Vendor bundle supply chain | Pinned versions, recorded SHA-256, MIT licenses committed, rebuild script documented. |
| Prototype tracker data lost (localStorage) | Phase 0 export first; import tool has dry-run. |
| Character bio spoilers | Separate spoiler-safe `reader_bio`; per-figure override. |
| Quota / long project | Phases are small and self-contained; each ends with `PROJECT_STATE.md` update so any session can resume. |
| `ai_editor` cannot DROP/DELETE | All destructive steps are owner-run migrations; plan is additive until retirement. |

---

## 14. Open questions

1. **Parallel vs in-place** — Recommendation: **parallel `studio.html`** (you keep publishing weekly from the current Writer while Studio is built; nothing breaks mid-way; retirement is one clean step). Accept? *(You said you weren't sure; this is the default unless you object.)*
2. **Bio spoilers** — (a) single spoiler-safe reader bio + (b) optional per-figure override. OK?
3. **Labels in LLM export** — keep plain `[Rebecca's POV]` or emit typed `[POV: Rebecca]`?
4. **Word count** — include system/status/label text or prose only (or show both)?
5. **Multiple systems per story** — the prototype supports many systems; `story_systems` is one per story. Relax?
6. **Dormant reader-facing system tables** (`story_system_versions`, checkpoints, `reader_system_progress`) — park indefinitely or plan an archive migration?
7. **Status screen frames** — should status screens follow the same legacy/ornate frame rule as notifications, or have their own look?
8. **Public author notes** — do readers need to collapse them, or always shown?
9. **Mobile editing** — needed for real writing sessions, or desktop-only with mobile read/preview?

---

## 15. Glossary

- **Block** — a structured node in the chapter document (notification, status, label, figure, author note, scene break).
- **Role** — the semantic meaning of bracketed text (§4).
- **Doc** — the chapter's TipTap/ProseMirror JSON.
- **Revision** — an immutable or draft snapshot of a doc in `chapter_revisions`.
- **v1 / v2 HTML** — legacy Quill HTML vs generated block HTML (`data-doc-version="2"`).
- **System Tracker** — the author-private system database (from the prototype), separate from prose.
