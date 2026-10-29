# Admin CMS and Standalone Writer: pre-redesign source audit

Date: 2026-10-29 Asia/Kolkata
Scope: source inspection only; no authenticated browser verification, runtime edits, DB query/write, uploads, publishing, or destructive operations. The parent audit owns browser screenshots and reference-kit review. Initial working tree was clean. Line references below describe the current source, not older generated index lines.

## Important distinction

The public reader, Admin CMS, and Writer Studio are three separate visual systems. Admin is black/gold glass with Cinzel/Montserrat, while Writer is zinc/indigo with Inter. Writer already uses a desktop multi-pane workspace; it is not simply a phone page stretched wide. The redesign question is coherence, hierarchy, density, and workflow preservation—not mechanically making every surface wider.

`PROJECT_STATE.md:151` records a deferred Studio rebuild proposal in `docs/STUDIO_REBUILD_PLAN.md`; it is planning only. This audit does not revive that plan, replace Quill, add a framework, or authorize schema changes.

## Access and capture limits

- Admin: `admin.html:1968-2048`, especially role check at 2019. Guest receives email/password login (`1074`). All content views require a real Supabase session with `profiles.role = admin`. Admin RLS remains authoritative.
- Writer: `writer.html:2613-2621` requires the same real admin session; absent session reports “Admin sign-in required. Open admin.html, sign in, then return to writer.html.” Startup failure stays in the shell and offers Retry Writer (`2882-2918`), rather than a dedicated sign-in form.
- Capture authenticated views only using an existing owner-authorized session; do not substitute fake data or bypass these checks for screenshots. Signed-out screenshots cannot establish what populated admin views look like.
- Avoid author mutations while photographing: New Chapter inserts a real draft; Save, Publish, grant/revoke, uploads, recalculation, deletes, preset writes, AI generation/messages, and summary acceptance are not harmless navigation.

## Admin inventory: 17 content views + login state

Navigation is view-state/localStorage driven (`State.currentView`, `Views.render`), not a separate pathname for each CMS screen. Core dispatch is `admin.html:4062-4096`; extensions override it at `5265-5278`. Primary nav markup is `1120-1137`. “Writer / Chapters” is the embedded CMS editor, not a redirect to standalone Writer.

| View | Source anchor | Contents / secondary states |
|---|---:|---|
| Dashboard | 4098 | Statistics, quick actions, recent-stories table, View Site |
| Stories | 4192 | Covers/title/slug/genre/status/access/actions table; Story CRUD dialog |
| Writer / Chapters | 5280 (active override) | Story selection, collapsible chapter rail, empty/selected/new chapter, Write / Access / Teaser tabs; rich editor; local autosave indicator; Save Draft/Save Changes/Publish |
| Rolling Access | 5466 | Story selector, per-tier windows, enable switch, live chapter/access matrix; Save & Recalculate / Recalculate now |
| Readers / CRM | 5493 | Four tabs: Readers & Grants, Provider Links, Key Redemptions, Audit Log; shared search; profile focus; manual grant/revoke |
| Community | 5534 | Recent comments and reaction totals, reader/chapter links; essentially long data tables |
| Access Tools | 4891 | Access tiers, keys, manual/provider entitlements, provider mappings stacked as four major tables; migration-required state |
| Site Settings | 5004 | Reader identity, subscription behavior, background/system-dialogue options, provider status display, raw settings table/JSON |
| Story Extras | 5549 | Seven navigation cards to Characters, Gallery, Lore, Maps, Timeline, Wallpapers, Map Requests |
| Author Profile | 5142 | Profile information/image/bio and social links; edit-profile/link dialogs |
| Characters | 4314 | Story selector, image/name/role table, character CRUD |
| Character Gallery | 4376 | Story/character/search filters; published vs hidden-pool views, tag/image controls and gallery cards; image/batch upload CRUD |
| Wallpapers | 4606 | Story selector, image cards and wallpaper CRUD |
| Lore Encyclopedia | 4655 | Story selector, image/title/category table, lore CRUD |
| Timeline | 4717 | Story selector, ordered date/era/title table, event CRUD |
| Maps | 4779 | Story selector, preview/name/primary-state table, map CRUD |
| Map Requests | 4841 | Date/contributor/title/map/status/action table; request detail, approve/merge/reject/delete workflows |

### Admin modal/form inventory

One shared modal scaffold (`313-341`, `1166-1168`, `1935-1965`) holds: confirmation; map-request detail/review (`2660`); Story (`2752`); Access Tier (`3099`); Access Key (`3141`); Manual Grant (`3193`); Provider Mapping (`3236`); Character (`3274`); Gallery Image(s) (`3352`); Wallpaper (`3522`); Lore (`3599`); Timeline Event (`3683`); Map (`3797`); Setting (`3869`); Author Link (`3985`); Profile (`5210` region). Old Chapter dialog code at `2904` is superseded by the `Forms.chapterForm` override following the embedded editor and should not be counted as a separate active editor route.

### Admin design findings (source-based; visual validation pending)

1. **Disconnected visual language.** Gold glowing logo, serif display headings, animated particle canvas, heavily blurred cards, shadows, and all-black layers (`11-163`) differ from both the newer reader and Writer. Repeated equal-weight glass boxes make configuration and content operations compete visually.
2. **Small/low-contrast chrome.** Sidebar section title is `.6rem` / `#444`, subtitle `.65rem` / `#555`, idle nav `#666`, and page subtitle `#555` on dark surfaces (`62-76`, `138`). These deserve measured contrast/readability review, not only cosmetic restyling.
3. **Desktop width exists but information architecture is uneven.** Fixed 260px sidebar and main padding already use PC width (`41-51`, `124`). Access Tools stacks four full data sets (`4938-4999`); settings mixes curated configuration with raw JSON; Story Extras requires another navigation hop. Opportunity: use a cohesive desktop master/detail or task-based layout rather than more cards.
4. **Double navigation cost in embedded editor.** 260px CMS rail + 320–360px chapter rail + gutters (`229-230`) consume substantial laptop width before the manuscript. The child rail collapses, but the parent CMS nav only hides below 900px. The embedded writer flips to a single-column stack below 980px (`292`), creating a sharp intermediate-width transition.
5. **Nested scrolling and uneven table treatment.** CMS has viewport sidebar, sticky child writer rail, large modal scroll area, and table/card scroll wrappers. CRM explicitly wraps tables at 760px (`175-181`, `5513`), while many older table pages rely on generic overflow only below 640px (`806-823`). Inspect laptop/tablet widths, not only 390px and 1440px.
6. **Accessibility semantics need careful review.** Primary CMS navigation and Story Extras cards are clickable `div`s (`1120`, `5551`). Shared modal code swaps innerHTML and display but does not show the Writer's shared focus-restoration/trapping pattern (`1935-1965`). Preserve functionality while moving toward keyboard-operable controls.
7. **Not all forms are read-only.** Recalculate changes access; direct grants/revokes change real reader permissions; publishing and image/pool visibility change public content. A redesign must make these action classes distinct.

## Standalone Writer inventory

Writer routes are `writer.html#dashboard`, `#editor`, `#context` (`2847-2879`). Main shells: dashboard `1733`, context `1807`, editor `1899`. Primary sidebar begins `1640` and includes story switch, route navigation, Summary Manager and a scrollable chapter list.

| Surface / state | Source anchor | Audit/capture states |
|---|---:|---|
| Chapter Index | 1733 / Dashboard 3232 | Search + four sorts, story stats, seven-column chapter table; tier-colored rows, access dropdown, published-row selection/Copy access list; empty and populated |
| Active Editor | 1899 / App 4565 | Empty selection vs chapter open; title/order, status/save command group, closable chapter tabs, live/draft banner, Quill toolbar/editor, saved/failed/unconfirmed status |
| Editor right rail | 2121 | Chapter access/tier and release time, external/NSFW toggle/URL, cover/media, metadata/preview controls and delete; open/collapsed states |
| Export menu | 1973-2039 | Markdown / plain / rich copy, censorship preset, dictionary management; menu must not obscure primary Save/Publish actions |
| Media Library modal | 1378 | Existing image grid, upload/URL insertion and modal actions |
| Censorship Dictionary modal | 1433 | Preset sidebar, dictionary entries/search/replacement and preset membership; table/editor controls |
| Context Workspace | 1807 / ContextWorkspace 5986 | Six library tabs: Writing Style, Long Summary, Chapter Summary, Chapters, Outlines, Scratchpads; Simple vs Advanced ordering; search/selection; Prompt Preview vs Item Content central tabs; preset/order rail |
| Context block editor | 1558 / integrated host 1864 | Rich item editing inside central canvas; explicit Save, duplicate/delete, dirty state; historical “modal” ID does not mean it is a normal overlay now |
| Chapter Note drawer | 1604 / ChapterNotes 5797 | Chapter-linked rich note, explicit Save, status, delete; separate from manuscript tabs |
| Writer AI drawer | 2245 / js/writer-ai-chat.js | Resizable thread library + model/temperature/token controls + chat; empty/loading/history/streaming/error states; explicit copy/save-to-scratchpad |
| Summary Manager | 2297 / js/writer-summary-manager.js | Summary library, Short vs Long Summary tabs, exact source selection/range, style reference/instructions, generation/stop, review output, Save Draft/Accept/Archive |
| Startup/dependency recovery | 61-90 / 2882 | Missing external resource notice vs sign-in/profile/workspace error and Retry Writer |

### Writer design findings (source-based; visual validation pending)

1. **Already desktop-oriented.** Left chapter navigation, manuscript, 20rem settings rail, three-column Context, two-column AI, and multi-panel Summary Manager are PC patterns. Preserve focused workspaces rather than turning Writer into a generic content site.
2. **Too many competing layers can consume the canvas.** Main navigation + chapter rail + editor settings; Context 290px/480px-min/280px (`1306`); AI drawer defaults to 760px with a 210px thread rail (`styles/writer-ai-chat.css:2,39-42`); Summary Manager has a 250px library plus two main panes (`styles/writer-summary-manager.css:24,174`). Viewports with multiple drawers need explicit priority/occlusion tests.
3. **Readability and density are inconsistent.** Many labels/actions are 10–11px, with the Export preset status at 8px (`2020`). Context six equal-size tabs in a 290px rail truncate labels (`1312-1317`). Different scales for heavy page headers, tiny metadata, pill controls, and full-width manuscript text should be rationalized.
4. **Responsive changes are abrupt.** Context becomes a long vertical stack at 1050px and retains a 420px library and 560px minimum preview (`1366-1367`). Editor rail becomes overlay at 900px (`1045-1064`); phone table still has 46rem minimum width (`1187`). This is deliberate containment but needs owner browser evaluation at 1024/1280 widths.
5. **Manuscript line length can become excessive when rails collapse.** `.ql-editor` is full width with `max-width:none` (`748-751`). The desktop redesign should make comfortable text measure a user choice while retaining usable image/system-box width, not simply fill every pixel with prose.
6. **Three visual systems across adjacent work.** Writer's zinc/indigo aesthetic differs from gold CMS and the newer reader. A shared typography/token/action language can unite them while keeping editorial manuscript, operational CMS, and reader immersion distinct.
7. **Status visibility is safety-critical.** At <=640px the editor status cluster is hidden (`1212-1215`). A future responsive design should keep unsaved/failed/unconfirmed state readable even if secondary metadata is condensed. Do not reduce this to transient toast-only feedback.

## Functional contracts a visual redesign must preserve

- No fake chapter/CRM/artwork data; real empty/error/setup states remain honest.
- Admin stays monolithic unless explicitly authorized; no new framework, build step, runtime dependency, or CDN script.
- Keep admin access checks/RLS boundaries, established Supabase fields/RPC contracts, storage bucket/path behavior, and real tier meanings. No DB migration is implied by this audit.
- Writer unpublished chapters autosave to Supabase; published chapters do not autosave. **Save Live Changes writes live immediately**, not a private revision. Chapter Notes and Context blocks have explicit Save. Current backend has no private published revision workflow.
- Preserve serialized writes/tab/story transitions, dirty-state guards, uncertain timeout warnings, async stale-response guards, caret/scroll restoration, focus trapping/return, and reduced-motion support.
- Preserve Quill `sys-msg-box` HTML, bracket-source editing, bulk formatting/unwrapping, system-message paste normalization, images, scene breaks, and Markdown/rich/plain clipboard contracts.
- Index tier changes share the save lock; New Chapter is single-flight; access-list copy is clipboard-only and excludes drafts.
- Context named presets use atomic `save_writer_context_preset`; per-story local sessions are distinct from database presets. Context images are omitted from prompt exports. Chapter previews remain read-only unless explicitly opened in Writer.
- AI context remains manual copy/open only; do not auto-paste/send. Summary drafts do not become reusable Context until accepted, and Summary Manager never writes chapters.
- Keep localStorage keys, Writer hashes, admin view names, DOM hooks/global method names unless intentionally migrated with tests.

## Recommended next inspection sequence

1. Owner-authorized desktop session: screenshot each CMS view plus the four CRM tabs and gallery published/hidden states; capture form types read-only without clicking submission actions.
2. Writer: Chapter Index, saved draft editor, live editor (no typing), rails open/closed, Export, Media, Censorship, Context with each library/canvas state, Chapter Note, AI, Summary Manager. Avoid buttons that create rows or send paid generation requests.
3. Repeat representative dense states at 1440px, 1280px, 1024px and 390px; check zoom, keyboard focus, contrast, scroll ownership, empty/loading/error states.
4. Review current `docs/WRITER_MANUAL_QA.md` and the deferred Studio plan before deciding whether next phase is visual restyling or a separately approved workflow rebuild.

## Existing project memory relevant to next phase

Current `PROJECT_STATE.md` has pending signed-in Writer checks for AI Studio system-message paste (line 5), Patreon access-list rich paste (27), chapter links (214), Context canvas/version design (236), atomic preset browser behavior (265), and repair/rail responsiveness (322,1160). Some older investigation entries describe bugs already repaired; use the latest entries and source, not their historical bug list, as current behavior.
