# Whole-site UI audit — before the redesign

**Date:** 2026-10-29, Asia/Kolkata  
**Status:** Investigation and screenshot baseline; no production implementation changes.  
**Design read:** Preserve the current Home's author/archive identity; give the remaining reader pages deliberate desktop compositions, while keeping mobile usable and separating the higher-risk CMS/Writer work.

## 1. Executive assessment

The mismatch is real, but it is not simply “every page is mobile-only.” Home and Gallery have purpose-built compositions; many secondary reader screens received new colors, typography and corners without new layouts. Their old stacked cards now stretch across a full-width desktop shell. Story Hub, Chapter Catalog, Admin and Writer already have desktop structures, but their hierarchy, density and visual language diverge.

The next phase should not redesign Home again or install the starter's framework. Establish the shared component rules from Home, then redesign page families around their actual tasks. Some visible problems are functional/trust defects, not styling; record and resolve those explicitly rather than making unsupported actions look more convincing.

### Evidence boundaries

- **Browser-confirmed:** observations explicitly identified below and linked in the screenshot section when completed.
- **Source-confirmed:** active HTML/JS/CSS behavior or structure inspected directly; not a claim that every runtime/auth state was exercised.
- **Source concern:** plausible defect requiring browser reproduction, marked as such.
- Browser session currently has a real signed-in **Resident Nemesis** entitlement; that does **not** establish admin privileges. No auth or entitlement was fabricated.
- Admin/Writer populated surfaces are source-audited unless a later capture explicitly establishes an authorized admin session.
- No production data changes, publishing, grant/revoke, uploads, redemption, votes, support submissions, AI generation or schema work were requested or performed as audit actions.

## 2. Browser findings established during this audit

| Finding | Evidence / scope | Interpretation |
|---|---|---|
| Calendar empty-state icon overwhelms the page | Browser measured **1262 × 1262 CSS px** at a **1440 × 1000** viewport | A genuine component sizing defect, not a subjective dislike of whitespace |
| Library has a mostly empty wide canvas with a small story card | Initial desktop browser inspection | Small real catalog needs intentional composition; do not invent stories to fill it |
| Vault is a long, full-width vertical stack | Initial desktop browser inspection plus source | Desktop width is available but not organized into meaningful parallel tasks |
| Collections shows a similarly oversized empty-state graphic | Initial desktop visual observation; exact bounds not yet measured | Shares the Calendar source mechanism; retain separate verification status |

**Calendar mechanism (source-confirmed):** `account-access.js:23` inserts `I.calendar` into `.empty > .em`. The icon registry in `utils.js` provides a `viewBox` without width/height. `styles.css:243` only sets `svg` to block/max-width, and `.empty .em` at `1131` supplies font-size rather than SVG dimensions. The full-width `#main` in `reader-redesign.css:38–43` leaves the icon unbounded. Other raw SVG empty states need an audit, not a Calendar-only patch.

## 3. Reference folder review

| Reference | Useful material | What it does not supply |
|---|---|---|
| `reference/abstracto_redesign_sample(1) - Copy.html` | Edge rail, compact top bar, cover/story/status hero, chapter/artwork split | Production behavior; chapters/stats and images are demo content |
| `reference/abstracto_full_gallery - Copy.html` | Character masthead, sticky controls, image-plus-metadata lightbox | Real votes, discussions or entitlement checks; records and scores are fabricated demo data |
| `reference/aether-ui-starter.zip` | Semantic tokens, 13 presentation components, four Storybook examples, two HTML examples | A whole-site account/help/settings/CMS/Writer design system |

The starter is React/TypeScript with React, Storybook and Vite tooling. **Adapt its visual conventions to the existing HTML/CSS/classic scripts; do not import its runtime or build setup.** Its components cover theme, panels, buttons, top bar, background, story hero/navigation, character header, gallery controls/cards/masonry and archive features.

The references themselves disagree on shell widths, radii and typography. Current Home is the working baseline, but its 2026-10-14 selective square-corner trial remains formally pending owner acceptance. Do not silently spread that trial or restore older inset shell/masonry behavior.

Keep the starter's declared CC0/source notice when adapting code. It does not establish rights to third-party artwork, remote photos or fonts. No sample chapters, stats, votes, discussions or placeholder images may become production data.

## 4. Reader page inventory

Paths append to `index.html#`. This is the active router inventory: **24 destination families, 25 registered view names** because the two gallery names share one renderer. Snapshot state matters as much as the URL.

| Route | Current surface / important variants |
|---|---|
| `/` | Home; Split archive / persisted Multigrid, mobile chapter/artwork tabs |
| `/library` | Search, story grid, pinned/followed lane |
| `/updates` | Real chapter/update feed; shared Curated chapter cards |
| `/calendar` | Release Calendar; unconditional empty state |
| `/collections` | Collections; unconditional empty state |
| `/vault` | Access status, metrics, providers, redemption, timeline, troubleshooting |
| `/my-shelf` | Resume/followed lanes, saved-item shortcuts, preview trail, offline card |
| `/bookmarks` | Saved places or empty state |
| `/quotes` | Saved quotes or empty state |
| `/history` | Reading history; blank timeline when empty |
| `/notifications` | Alerts, refresh, read/dismiss controls, preferences |
| `/benefits` | Membership explanation, milestones/empty state, provider CTA |
| `/onboarding` | Welcome links and setup steps |
| `/help` | Glossary, FAQ accordions, recovery links and explanations |
| `/support/check-access` | Access Health Check and recovery actions |
| `/support/wrong-account` | Account recovery guidance |
| `/support/contact` | Context packet and support form; see trust defect below |
| `/gallery` | Unified artwork browser; collection, grid/decks, filter/search/sort/shuffle |
| `/story/<slug>` | Cover/sidebar, synopsis, reading actions, progress, chapters, cast/glossary |
| `/story/<slug>/chapters` | Access-aware chapter grid and order controls |
| `/story/<slug>/recap` | Safe premise; no detailed recap implementation |
| `/story/<slug>/extras` | Bonus Materials; no configured backend feed |
| `/story/<slug>/updates` | Story-specific release timeline |
| `/read/<chapter-id>` | Readable / preview / gated / external-only / unavailable chapter states |

### Aliases, redirects and incomplete routes

- `/gallery/<slug>` selects a story; `/gallery/<slug>/<character-id>` selects a collection. Legacy `/gallery/<character-id>` depends on the character already being loaded.
- `/collections/<slug>` parses to missing `VIEWS.collection`, then silently renders Home. Unknown first segments also fall back to Home.
- `/studio/write` redirects to `writer.html`; `/studio/chapters` goes to `admin.html?view=chapters`; other `/studio/*` paths go to `admin.html`. Some older docs incorrectly describe the chapters redirect.
- Archived `author-studio.js` and `studio-preview.js` are not active destinations. `home-library.js` has three Home assignments; only the last one is active.
- Every ordinary route, including Help, is currently behind the library loading/recovery gate. Failure-state review must account for that.

### Reader overlays and component states

- Account: guest sign-in, signup, forgot password; signed-in account/profile; recovery-only password update; What's New.
- Access: provider chooser, Patreon/Boosty connection instructions, redemption, automatic access-check/lock states.
- Settings: site appearance/notifications; separate chapter-only Reader Preferences rail/drawer; do not merge the two preference systems.
- Reading: context/More, paragraph notes, chapter images, end-of-chapter notes/reactions, selection quote tools.
- Artwork: Home image sheet, Gallery lightbox, mature-access prompt, eligible blur/reveal, keyboard navigation and votes.
- Sheets become **centered max-520px dialogs at desktop widths**; their stacked content can remain cramped, but they are not literally desktop bottom drawers.

## 5. Admin CMS and Writer inventory — source-audited

These are separate admin-only applications, not reader subpages. Their populated states require a genuine `profiles.role = admin` session. Do not bypass access or seed fake data for screenshots.

### Admin: 17 content views plus login

| Family | Views / secondary states |
|---|---|
| Overview and content | Dashboard; Stories; Writer / Chapters; Rolling Access |
| Reader operations | Readers / CRM; Community; Access Tools |
| Configuration | Site Settings; Author Profile; Story Extras |
| World/media content | Characters; Character Gallery; Wallpapers; Lore Encyclopedia; Timeline; Maps; Map Requests |

- CMS view selection is internal/local-storage state, not a distinct pathname per screen (`admin.html:4062–4096`, active extensions `5265–5278`).
- Embedded Writer / Chapters has Write / Access / Teaser tabs. It is not the same surface as standalone Writer.
- CRM has Readers & Grants, Provider Links, Key Redemptions and Audit Log tabs. Gallery has published/hidden-pool variants.
- Shared forms cover story, tier, key, manual grant, provider mapping, character, artwork/upload, wallpaper, lore, timeline, map/request review, raw setting, author link and profile. Recalculate, grant/revoke and publish are real consequential operations.

### Standalone Writer

| Surface | Secondary views / interaction states |
|---|---|
| `writer.html#dashboard` | Chapter Index, search/sort, tier editing, published selection and Copy access list |
| `writer.html#editor` | Empty/open draft/live chapter, tabs, Quill, saved/failed/unconfirmed state, collapsed/open rails |
| `writer.html#context` | Six libraries, Simple/Advanced order, Prompt Preview/Item Content, presets, central block editor |
| Auxiliary tools | Export menu; Media Library; Censorship Dictionary; Chapter Note drawer; resizable AI drawer; Summary Manager |
| Recovery | Missing dependency notice, admin-sign-in/profile error, Retry Writer |

**Source findings:** Admin already has a 260px desktop sidebar, but low-contrast tiny navigation, stacked configuration tables and mixed form conventions. Writer is already a multi-pane desktop workspace; its risks are competing rails, 8–11px labels, abrupt Context stacking at 1050px, hidden small-screen save status, and excessive manuscript width when rails collapse. These require visual verification, not an assumption that everything should become wider.

The separate deferred `docs/STUDIO_REBUILD_PLAN.md` is planning only. This audit does not restart it, replace Quill, add revisions, or authorize a database/editor rebuild.

## 6. Source-based layout diagnosis

1. **Shell versus content:** full-width `#main` surrounds inherited `.col-flex` lists. Vault/help/support/saved-content screens need task-oriented composition, not another global card skin.
2. **Navigation:** the 78px rail hides labels and exposes five primary destinations. Shelf/history/benefits/help depend on secondary entry points; many secondary pages have no visible active destination.
3. **Shelf:** fixed-width resume cards and horizontally scrolling lanes keep swipe assumptions on desktop; empty lanes leave headings without useful guidance.
4. **Story/catalog:** existing two-column hub and auto-fill catalog are desktop-aware. Improve action hierarchy, duplicated progress and archive navigation rather than simply adding columns.
5. **Forms/settings:** repeated full-width buttons and single-column 520px dialogs compress account/configuration work; distinguish quick dialogs from sustained tasks.
6. **Incomplete features:** Calendar, Collections, Extras and detailed Recap need honest availability decisions. Do not fill them with starter examples or design controls for nonexistent backend features.
7. **Visual consistency:** Home's newer geometry, older 18px cards, pill controls, Gallery typography, gold CMS and indigo Writer lack a common role-based component system.

## 7. Functional/trust issues uncovered — not fixed

| Issue | Evidence and verification status |
|---|---|
| Support form claims delivery without sending | **Source-confirmed:** `events.js:425` only resets the form and toasts success; no send/backend call |
| Quote Share card claims copied output without creating it | **Source-confirmed:** `events.js:304` only shows a toast |
| Offline queue promises unsupported downloads | **Source-confirmed:** Shelf copy advertises saved transit reading; `events.js:537` reports unavailable |
| Health Check claims freshness without checking it | **Source-confirmed:** `help-support.js:34` hardcodes “Last sync: just now” / “Access is up to date” |
| Support packet access label can misclassify an active tier | **Source-confirmed expression:** `help-support.js:54` groups `P.tier || P.expired` as the “expired” condition |
| Chapter sort buttons may be inert | **Source concern:** `data-chapter-sort` handler exists but is absent from delegated `closest` selector (`events.js:275,292`); browser reproduction pending |
| Help describes retired reader toggles | **Source-confirmed:** hide-images/paragraph-chip guidance conflicts with current Reader Preferences |
| Collection detail silently becomes Home | **Source-confirmed:** router parses `collection` but no renderer is registered |

These are separate from the visual redesign. Agree whether to fix them first or remove unsupported affordances; never disguise them with success styling.

## 8. Recommended sequencing after review

| Stage | Scope | Review gate |
|---|---|---|
| 0. Baseline and trust | Final screenshot manifest, empty-icon containment, unsupported controls/status audit | Owner agrees findings and what is actually supported |
| 1. Shared desktop system | Page title/actions, navigation orientation, spacing, density, forms, tables, dialogs, empty/loading/error states | Approve one representative secondary-page composition beside Home |
| 2. Reading/discovery | Library, Story Hub, Chapter Catalog, Updates; retain Gallery/Home strengths | Real small/large catalogs, access states, desktop/laptop/mobile |
| 3. Reader workspace | Shelf, saved items, notifications, Vault, account/settings, benefits | Real signed-in states and persistence checks |
| 4. Help and incomplete destinations | Support flows, FAQ, Calendar/Collections/Extras availability decisions | Honest copy/actions; no invented backend functionality |
| 5. Separate author scope | CMS and Writer visual/workflow review only if expressly selected | Admin session, save safety matrix, separate approval for any editor/schema rebuild |

## 9. Preservation checklist

- Keep static HTML/CSS/classic JS, script order, routes/deep links, delegated `data-*` hooks and storage compatibility.
- Keep Supabase/RPC access authoritative; preserve guest/member/admin boundaries and real empty/error states.
- Preserve provider linking/rechecks, pending/reconnect/failure distinctions, access keys and notification/profile contracts.
- Keep read/preview/lock/external/retry states, tier semantics, sharing, progress, bookmarks, quotes, comments and reactions.
- Keep site appearance separate from reader color/brightness/typography; preserve comfortable prose measure, italics, Dyslexia mode and system-message rendering.
- Preserve real artwork ordering, maturity entitlement filtering/default blur/reveal, filtered lightbox indices, voting and focus/keyboard behavior.
- Preserve Admin RLS and bucket paths; new data contracts require reviewed schema-first work, not incidental UI edits.
- Writer drafts autosave; published chapters do not. **Save Live Changes writes live immediately**, not a private revision.
- Preserve Writer serialized writes/transitions, dirty guards, failed/unconfirmed statuses, Quill system blocks, clipboard and atomic Context presets.
- AI context stays manual copy/open; never auto-send. Summary output remains draft until accepted and never writes chapters.

## 10. Screenshot evidence — baseline captured; selected states remain open

The local clickable index is `design/ui-audit-2026-10-29/index.html`; route labels and local paths are listed in `screenshots.json`. The manifest contains **32 images**: 24 reader destinations/states (01–24), two overlays (25–26), two CMS/Writer access gates (27–28), two phone captures (29–30), and two static reference demos. Captures are viewport-only, not full-page; the reader session was signed in as Resident Nemesis. `screenshots/01–23` cover home/library/updates/calendar/collections/vault/shelf/saved content/notifications/benefits/onboarding/help/support/story hub/catalog/recap/extras/story updates/gallery. `24-reader` is the free Chapter 1 opening; `25-reader-preferences` shows the reader rail and `26-site-settings` the site settings dialog. The requested mobile comparison is Home and Vault at 390 × 844; saved image dimensions are 380 × 822, so the report records both the requested override and the actual returned image size.

Do not assume a single output pixel size across the set: inspection shows 1270 × 714 images for reader screenshots 01, 03, 14–23; 1440 × 1000 for 02, 07–10, 13, 27–28; 1430 × 993 for 04–06, 11–12, 24–26; 380 × 822 for mobile 29–30; and 1265 × 712 for the two reference images. These are the actual saved bitmap dimensions, distinct from intended CSS viewport settings. The reference captures are local static demos, not authenticated production views.

The screenshot compositor returned stale page bytes during the initial sequence. Screenshots 01, 03, and 14–23 were re-navigated and verified; 02–13 had previously been corrected. All four original contact sheets were reviewed after regeneration; a fifth supplementary contact sheet covers settings, auth gates, mobile views, and reference demos. Contact/support account screenshots (15–17), reader prose screenshots (24–25), and chapter body are omitted from thumbnail previews; originals remain local/private. The local index links private images with text-only entries.

**Admin/Writer gate findings:** `admin.html` displays its access-denied/login gate to this non-admin account. `writer.html` shows its denied/recovery shell; the sidebar still says “Admin Session” despite the denial, a potentially misleading status. This is not an authorized view of CMS/Writer internals. Their populated states remain source-audited only; access checks were not bypassed.

**Limits and side effects:** No deliberate CMS/admin/content writes, preference changes, voting, following, support submissions, key redemption, or publishing actions were performed. Opening the free reader route may have caused ordinary application-side reading-history/progress effects; those were not inspected or reversed. Do not claim no user-data effects. The screenshots do not verify backend correctness, persistence, all auth/data states, or responsive behavior beyond the two saved mobile views. Alternate Home/Gallery modes, other overlays, gated/unavailable chapter states, and authenticated admin-only internals remain untested.

## 11. Deliverable and handoff

This report consolidates `.tmp/ui-audit-reader-notes.md`, `.tmp/ui-audit-reference-notes.md` and `.tmp/ui-audit-cms-writer-notes.md`. Those files retain detailed anchors and component inventories. No redesign implementation, dependency installation, schema migration or production-data edit is part of this deliverable.

Next decision: confirm the desktop composition and page-family order, using Home as the visual reference. Keep reader work and any author-workspace rebuild explicitly separate. `PROJECT_STATE.md` records remaining screenshot/auth/owner-review work; no implementation changelog entry is warranted for this investigation alone.
