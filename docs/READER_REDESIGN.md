# Reader redesign — implementation and verification contract

## Approved scope

- Match `reference/abstracto_redesign_sample(1) - Copy.html` and `reference/abstracto_full_gallery - Copy.html` closely, adapting the CSS/visual patterns in `reference/aether-ui-starter.zip` into plain browser code.
- Redesign all reader-facing discovery/account/support surfaces, with a unified artwork browser. Do not change Admin, Writer, chapter prose, reader controls/preferences, or system-dialogue frames.
- Keep Supabase data/query/auth/access contracts unchanged. No schema changes, new backend features, sample production data, or artwork discussions.
- Preserve existing mature-artwork behavior: homepage visibility for entitled/admin readers; gallery explicit opt-in for those readers only.
- User authorized automated browser/visual checks and regular commits on `codex/reader-redesign`. Do not mutate production content for tests.

## Feature preservation map

| Existing feature | Redesign destination |
| --- | --- |
| Home Start/Continue, progress, synopsis, cover, chapter/word totals | Reference-style story hero |
| Home mixed feed, character/type filters, pagination | Restyled Multigrid option |
| Traditional chapter index + artwork archive | Reference split layout with Curated chapter cards |
| Library search, story follow, chapter tier/access state, sharing | Existing views/events with shared glass components |
| Gallery archive/character links | Unified browser; existing character deep links select a collection |
| Artwork search/tag/sort/shuffle/grid/deck/lightbox/votes | Unified gallery toolbar, collections, artwork and image-side metadata |
| Gallery mature filtering, entitlement gate | Explicit gallery toggle and existing access checks |
| Patreon/Boosty, access keys, sign-in/up/recovery/profile | Existing sheets/Vault/actions with the shared component theme |
| Shelf/bookmarks/quotes/history, notifications/preferences | Existing routes/actions; new shared theme |
| Updates/calendar/collections/extras/recap/help/support | Existing routes/content; new shared theme, honest empty states |
| Site dark/light, story wallpaper/background controls | Preserved stored settings and semantic design tokens |
| Chapter reader, Aa rail, comments/reactions/quote selection | Unchanged reader code/design; redesign CSS excludes `.in-reader` |

## Source attribution

Aether UI starter declares CC0-1.0 and credits `Abstracto-X/abstracto_tales`. Its CSS tokens and glass/panel/button/masthead/artwork patterns inform this plain-browser adaptation. No React/TypeScript/Vite/Storybook runtime or demo assets are imported. Reference fonts are loaded as a stylesheet, not a new JavaScript dependency. Actual artwork remains Supabase-backed.

## Verification checklist

- Parse touched JavaScript and run isolated reader contract tests.
- Compare desktop home/gallery with the references; inspect narrow mobile and tablet layouts, dark/light, reduced motion, overflow and image failure.
- Guest: free/preview/locked actions, account/access flows, gallery filtering/decks/loading/lightbox keyboard/focus; mature images excluded.
- Signed-in owner verification: providers/access keys/profile/notifications; votes persist; mature toggle only eligible; no reader regressions.
- Visit library/story/chapters/extras/recap/shelf/bookmarks/quotes/history/updates/calendar/collections/Vault/benefits/help/support and existing gallery deep links.
- Do not claim authenticated production writes are verified by fixture tests or a guest browser.

## Completed automated verification — 2026-10-07

- 16 fixture-only VM tests passed, including all loaded classic-script parsing, home modes/actions/tier gates, mature visibility, gallery filters/pagination/shuffle/deck indices/votes/URL escaping, followed ID compatibility and combined chapter numbering. Run from repository root: `Get-Content tests/reader-redesign.test.js -Raw | node` (stdin avoids sandbox parent-path EPERM).
- Live public Supabase data, guest session: 1440px desktop audit of Library, Updates, Calendar, Collections, Vault, Shelf, Bookmarks, Quotes, History, Notifications, Benefits, Onboarding, Help, all three Support views, Story, Catalog, Recap, Extras and Story Updates. All rendered expected headings without horizontal overflow.
- Responsive inspection at 390px, 800px, 1024px and 1440px; mobile Library/Vault/Shelf/Benefits/Help/Catalog/Extras/Gallery had no horizontal overflow. Inspected home mobile tabs and Compact/Curated modes, desktop split alignment, gallery mobile controls, dark/light styling.
- Gallery search empty/recovery, stacked decks, image navigation, Escape, opener-focus restoration and inert background verified. No browser console warnings/errors recorded. Actual artwork loaded; no bundled fallback content.
- Opened a real free chapter through the existing catalog and verified secure text hydration and unchanged reader-preference panel controls. Reader source/base styles, backend/auth, Admin and Writer were not modified (checked branch diff).
- Authenticated provider/access-key/profile/notification/vote/mature-toggle persistence must be verified by the owner before deployment. Browser QA made no production writes. Incremental loading and entitlement cases unavailable in the live guest data were covered by isolated fixtures, not claimed as live persistence checks.

## Follow-up simplification — 2026-10-07

Compact/Focus modes and their controls/handlers/CSS are removed. Old saved mode values are ignored: Split archive always renders Curated cards; Multigrid remains available. Homepage Artwork uses caption-free square-corner tiles with reduced padding/gaps, retaining alt text, accessible button names, image-sheet metadata and mature gates. Updates date groups reuse the Curated cards with story/note context and resolved read/preview/lock actions; non-chapter updates retain their original renderer.

18 isolated tests passed and JavaScript parsing/whitespace checks passed. Browser follow-up is pending: the localhost server was restarted, but the in-app browser timed out both on the existing tab and a fresh verification tab. Owner should refresh Home and Updates, inspect desktop/mobile tile edges/spacing and removed controls, and check a locked/free update action before deployment.

## Edge-to-edge shell and artwork scroll correction — 2026-10-07

The non-reader desktop shell now fills the viewport beside a 78px rail fixed flush to the left edge, without the centered 1500px cap or outer gutters. The mobile shell remains full width with bottom navigation. The homepage Artwork panel uses a single vertical flex stack; its own scroller is vertical-only while the panel height stays aligned with the chapter list on desktop. This replaces CSS multi-columns, which could generate horizontal overflow when height-constrained. Caption-free, square-corner tiles and existing opening/access behavior remain.

19 isolated tests passed, including CSS layout invariants. Fresh visual browser verification remains pending because the in-app browser's connection timed out while binding the preview tab; check default zoom at desktop and mobile, both axes of scroll, and rail alignment after refresh.
