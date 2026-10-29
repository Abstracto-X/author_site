# Reader UI audit — 2026-10-29 Asia/Kolkata

Audit only. No runtime, schema, production-data, or formal documentation changes. This is a source-based companion to the parent agent's browser screenshots; visual observations must be confirmed from those captures. Read CODEBASE_OVERVIEW, PROJECT_STATE and SUBSCRIPTION_FUNCTION_INDEX before inspecting the active implementation. Working tree was clean at inspection start.

## Scope and current baseline

- Active reader entry: `index.html`, `styles.css`, `styles/reader-redesign.css`, classic scripts under `js/subscription/`.
- Home and Gallery already have deliberate route-level compositions. Updates reuses Home's Curated chapter cards. Other discovery/account/help pages largely retain their old markup and vertical stacks with a shared cosmetic theme overlay.
- The 2026-10-14 homepage-only editorial geometry trial is explicitly pending owner acceptance and must not be silently rolled out elsewhere. PROJECT_STATE also tracks authenticated provider, access, gallery, progress and preference QA.
- Chapter reader is intentionally excluded from `reader-redesign.css`; preserving that isolation is important. Its narrower prose measure is a reading/accessibility decision, not by itself evidence of a mobile-only defect.

## Complete reader route inventory

Hash paths below append to `index.html#`. This is based on `router.js:6–37`, not the historical function index (which has stale route information).

| Path | View / screenshot purpose |
|---|---|
| `/` | Home; default Split archive, persisted Multigrid alternate; chapter/artwork tabs on mobile |
| `/library` | Library search, story grid, pinned/followed lane |
| `/updates` | Archive updates grouped by date; Curated chapter cards |
| `/calendar` | Release Calendar, currently unconditional honest empty state |
| `/collections` | Collections, currently unconditional honest empty state |
| `/vault` | Access summary, metrics, provider cards, redemption, timeline, troubleshooting |
| `/my-shelf` | Resume lane, followed lane, bookmark/quote/history/settings shortcuts, preview trail, offline card |
| `/bookmarks` | Saved places or empty state |
| `/quotes` | Saved quotes or empty state |
| `/history` | Reading history timeline; no explicit empty-state copy when empty |
| `/notifications` | Alerts, refresh, mark-all-read, preferences; guest/empty and authenticated populated differ |
| `/benefits` | Static membership benefits, backend milestones or empty state, connect CTA |
| `/onboarding` | Welcome/action links and setup steps |
| `/help` | Recovery shortcuts, access glossary, FAQ accordions, feature explanations |
| `/support/check-access` | Access Health Check steps and provider/redeem actions |
| `/support/wrong-account` | Wrong Account Assistant steps and reconnect actions |
| `/support/contact` | Support packet, subject/message form, community CTA |
| `/gallery` | Unified gallery for primary story; grid/deck, filters/search/sort/shuffle |
| `/story/<slug>` | Story hub: cover sidebar, synopsis, actions, progress, latest chapters, cast/glossary |
| `/story/<slug>/chapters` | Full chapter catalog, access-aware cards, ascending/newest controls |
| `/story/<slug>/recap` | Safe premise and no-detailed-recap state |
| `/story/<slug>/extras` | Bonus Materials, currently no backend feed configured |
| `/story/<slug>/updates` | Story-specific release timeline |
| `/read/<chapter-id>` | Dedicated chapter reader; readable/preview/locked/external/unavailable variants |

Additional aliases/variants:
- `/gallery/<slug>` selects story; `/gallery/<slug>/<character-id>` selects a collection.
- Legacy `/gallery/<character-id>` is recognized only if that ID is already in `D.CHARACTERS`; otherwise the segment is interpreted as a story slug.
- Gallery and GalleryChar are registered separately but share `renderUnifiedGallery()` (`gallery.js:136–137`).
- `/collections/<slug>` parses to `collection`, but `VIEWS.collection` does not exist. It falls back to Home silently; do not imply collection-detail functionality exists.
- Unknown first path segments silently resolve to Home. Unknown story subpaths resolve to Story hub; unknown support subpaths resolve to Help.
- Invalid story/chapter IDs render not-found; invalid gallery character IDs render Character not found.
- `/studio/write` redirects to `writer.html`; `/studio/chapters` redirects to `admin.html?view=chapters`; other `/studio/*` paths redirect to `admin.html`. Some docs incorrectly say the chapters route goes to Writer.
- Archived `studio-preview.js`/`author-studio.js` are not loaded. Their views are not additional active reader pages.
- All ordinary routes are currently gated by backend library load/recovery before their view is rendered (`router.js:59`); even Help depends on this gate.

There are 25 registered active reader view names including the two unified-gallery names, corresponding to 24 top-level screenshot destinations above before data/state variants.

## Overlay / component screenshot inventory

Normal click paths; do not submit forms or trigger production writes during visual auditing.

| Surface | Entry / required state |
|---|---|
| Account (`persona`) | Topbar Account; guest auth form versus signed-in profile/actions |
| Profile | Signed-in Account > Edit; avatar, display name, username |
| Sign up | Guest Account > Sign up when email/password enabled |
| Forgot password | Guest Account > Forgot password |
| Update password | Recovery-session flow only; do not fabricate recovery/auth state |
| Overall Settings | Topbar cog or Shelf shortcut; site appearance and notifications, not reading typography |
| Notification preferences | Notifications > Preferences or Account What's New |
| What's New | Signed-in/version-triggered sheet |
| Connect provider chooser | Benefits CTA / access-related flows |
| Connect Patreon | Vault provider card; explanatory/auth continuation sheet |
| Connect Boosty via Discord | Vault provider card; role prerequisites/continuation sheet |
| Redeem key | Vault > Redeem; authenticated redemption is a real write |
| Access gate / lock | Locked chapter click; may run automatic membership recovery before opening |
| Reader Preferences | Chapter Aa; nonmodal desktop rail/mobile drawer; independent page color/typography |
| Reader context / More | Chapter toolbar; chapter context actions |
| Paragraph notes | Chapter paragraph note chip; sign-in required to write |
| Chapter image viewer | Inline chapter figure |
| Home artwork viewer | Home artwork tile |
| Gallery lightbox | Gallery artwork; keyboard navigation/focus trap/votes |
| Mature artwork prompt | Guest Show NSFW; do not forge entitlement |
| Walkthrough | Feature-enabled contextual onboarding guide |
| Toast/error/recovery | Genuine actions/loading failures only; do not stage fake success |

Dispatched named sheet builders are enumerated at `events.js:285`; sheet source is `sheets.js`. All normal sheets become centered max-520px dialogs on desktop (`styles.css:1595–1613`), not literally bottom drawers at desktop. The compact inner stacked composition is the remaining phone-like aspect.

## Source-supported desktop weaknesses to validate in screenshots

1. **Full-width shell, single-column internals.** The redesign removes `#main` width constraints (`reader-redesign.css:38–43`), but Vault, Help, support, bookmarks and quotes retain vertical `.col-flex` content (`styles.css:1117`). Buttons and inputs stretch across desktop without a task-oriented workspace grid. New paint does not restructure these screens.
2. **Vault is one long checklist.** Status, four metrics, providers, key form, access timeline and help links are sequential sections (`account-access.js:30–97`). It lacks a persistent access summary or side-by-side main/secondary tasks; long desktop text rows are mostly empty horizontal space.
3. **Support is phone-form composition at desktop.** Health check and Wrong Account use full-width timelines followed by full-width stacked buttons; Contact places the context packet above the form rather than alongside it (`help-support.js:24–59`). Help stacks glossary, FAQ and explanations end to end.
4. **Shelf keeps horizontal swiping assumptions.** Resume cards are fixed 210px width; followed stories remain `.lane` horizontal scroll/snap containers (`account-access.js:123–124`, `styles.css:424`). Empty Resume/Followed sections still display headings and blank lanes. The reading workspace is fragmented among Shelf, Bookmarks, Quotes and History without a shared secondary navigation.
5. **Desktop discoverability remains icon-first.** The 78px rail hides text labels (`reader-redesign.css:54–62`); only Home/Library/Gallery/Updates/Vault are primary. Shelf, benefits, history and support are nested in account or secondary pages, and most secondary routes show no active rail destination (`router.js:99`). Tooltips/ARIA exist, but visual orientation is weak.
6. **Library stretches search across the workspace.** It has one broad search box, a card grid, then a horizontal pinned lane (`home-library.js:132–150`). With a small real story inventory it can feel empty rather than intentionally curated. No need to invent books to fill space.
7. **Story hub is already desktop-aware, but stylistically older.** It uses a 280–340px sticky cover rail plus fluid main column at 900px (`styles.css:3342–3354`). Repeated Start/Continue/Chapter 1 actions and duplicated progress summaries compete (`story-reader.js:99–135`); this is hierarchy/cohesion work, not simply adding columns.
8. **Catalog is already a real grid.** `repeat(auto-fill,minmax(260px,1fr))` at `styles.css:3522`. Large archive navigation/search/density and consistency with Home Curated cards deserve review, rather than labeling all of it mobile-only.
9. **Notifications and saved content remain undifferentiated lists.** Shared card/row restyling changes radius/color but not information architecture (`reader-redesign.css:371–400`). Empty History gives a nearly blank bordered timeline.
10. **Settings/account are constrained modals for large tasks.** Max 520px desktop modal covers the underlying page even for multi-section settings/account/provider tasks. The dedicated Reader Preferences rail is a useful existing exception to preserve.
11. **Several destinations are genuine incomplete feature shells.** Calendar, Collections and Extras are unconditional empty views; Recap lacks detailed metadata. Good visual design should explain availability and route to useful live content, not populate starter-kit examples.
12. **Mixed geometry and type systems.** Home-only trial uses 3–5px radii, while retained cards use 18px, dialogs 24px and older pills remain inline-styled. Gallery uses Montserrat, shared chrome Manrope/Cinzel, chapter prose Georgia. Preserve deliberate reading typography, rationalize accidental differences later.

## Existing nonvisual traps discovered during audit (not changed)

These should be explicit in redesign planning so a polished surface does not make unsupported promises stronger:

- Contact Support submit only prevents default, resets the form, and toasts “Support message sent”; no backend/send call (`events.js:425`). The Discord CTA says unavailable while the page advertises a specific help channel (`help-support.js:59`, `events.js:541`).
- Quote “Share card” only emits a success toast; no card generation or clipboard action (`events.js:304`).
- Shelf says readers can save chapters for transit/offline reading, while Manage reports offline reading unavailable (`account-access.js:134`, `events.js:537`).
- Health Check prints “Last sync: just now” and “Access is up to date” without checking actual verification timestamp/state (`help-support.js:34`). Contact packet repeats this and its access-label expression can mark a nonempty active tier as expired (`help-support.js:54`).
- Chapter sort buttons carry `data-chapter-sort`; handler exists, but the delegation `closest(...)` selector omits `[data-chapter-sort]` (`events.js:275,292`), so standalone sort-button clicks appear inert from source inspection. Browser-confirm before filing as reproduced.
- Help still suggests hiding illustration and paragraph chips in reader settings even though those visibility toggles were retired (`help-support.js:17–18`, current Reader Preferences contract).
- `home-library.js` defines `VIEWS.home` three times; only the last assignment (line 666) is active. Audits/redesign edits must target the active implementation, not obsolete early templates.

## Preservation boundaries for a future redesign

- No framework/build/CDN additions; starter kits are visual references, not authorization to change stack.
- Real Supabase catalog/content/access remains authoritative; no sample books, mocked milestones, fake notifications or fake progress.
- Preserve classic script order, shared globals, route names/deep links, `data-*` delegation, and local/session storage compatibility unless explicitly migrating.
- Preserve public/signed-in/member/admin boundaries; no fake logged-in mode or entitlement for screenshots.
- Retain automatic membership rechecks, pending/error/reconnect distinctions and late-response guards; visual state is not authorization.
- Chapter states must remain distinct: readable, preview, gated, external-only, unavailable, retry. Keep tier names/colors, share links, read/progress, bookmark/quote/comment/reaction controls.
- Site dark/light mode and chapter dark/light/parchment/custom settings are independent; do not collapse them. Keep brightness, line spacing, width, Dyslexia mode, prose italics, system-message frames and accessible contrast.
- Preserve Gallery/Home safe-vs-mature filtering, entitled default blur, hover/global reveal, true newest-first order, filtered lightbox indices, votes, keyboard navigation and focus restoration.
- Preserve account/profile/avatar, provider linking, key redemption, notification settings/read/dismiss state and honest empty/error states.
- Avoid changing database/RPC/storage contracts as a side effect of UI redesign. If a new feature requires schema, migration/restricted-role procedure comes first.

## Verification and follow-up

Source inspection only in this subtask; parent owns browser captures. No runtime tests needed for a notes-only file. Parent should record screenshot viewport/auth/theme and distinguish visually inspected pages from source-only authenticated variants. Follow-ups require owner design choices and signed-in manual checks, not a blanket “every state tested” claim.
