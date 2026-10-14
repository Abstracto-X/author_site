# Reader redesign — implementation and verification contract

## Approved scope

- Match `reference/abstracto_redesign_sample(1) - Copy.html` and `reference/abstracto_full_gallery - Copy.html` closely, adapting the CSS/visual patterns in `reference/aether-ui-starter.zip` into plain browser code.
- Redesign all reader-facing discovery/account/support surfaces, with a unified artwork browser. Do not change Admin, Writer, chapter prose, reader controls/preferences, or system-dialogue frames.
- Keep Supabase data/query/auth/access contracts unchanged. No schema changes, new backend features, sample production data, or artwork discussions.
- Preserve the mature-artwork entitlement gate: non-subscribers see only normal images; entitled/admin readers see mature images blurred until hover or the shared Show NSFW reveal toggle.
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
| Gallery/Home mature filtering, entitlement gate | Shared Show NSFW reveal toggle, default blur for entitled readers, subscription prompt for others, existing access checks |
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

## Artwork column clarification — 2026-10-07

Retain two side-by-side tiles at normal desktop/mobile widths and three at wide widths. The fix is the scroll *axis*: CSS grid rows flow downward in a height-limited panel with `overflow-y: auto` and `overflow-x: hidden`; the browser must never add columns sideways. The earlier single-column interpretation was incorrect. At tablet widths the full-width panel displays three tiles across and scrolls with the page.

## Actual masonry correction — 2026-10-07

The previous equal-row grid was not masonry. Homepage Artwork now uses small grid tracks with per-tile row spans computed from each loaded image's natural aspect ratio and rendered width. Tiles keep their varied heights and dense staggered placement in two columns (three when wide). Image load and container-width changes recalculate spans; the artwork panel still scrolls only vertically. Multigrid sizing remains separate. 20 isolated tests pass, including a portrait-vs-landscape span test. Browser visual QA is still needed because the in-app browser timed out in the previous pass.

## Shared NSFW artwork preview — 2026-10-07

Both Home Artwork (Split and Multigrid) and the unified Gallery show a Show NSFW control. Guests and signed-in readers without active entitlement see only normal published artwork; clicking the control opens a subscription-required sheet linking to Membership and Vault. Active-entitlement/admin readers see all artwork returned by Supabase, including mature-tagged rows, but those images are blurred by default in tiles, gallery decks, and full-size viewers. Hover temporarily clears blur on devices with hover; the shared Show NSFW state clears all blur across Home and Gallery, and Blur NSFW restores it. The state is session-local and never changes Supabase access, RLS, storage, or media data. Touch users use the toggle rather than hover.

22 isolated tests cover the eligibility filter, default blur/reveal classes in Home/Gallery/decks/lightbox, safe guest images and the subscription prompt. Signed-in visual and entitlement checks remain owner-led QA. The prior in-app browser connection has timed out repeatedly, so this pass does not claim browser verification.

## Gallery ordering follow-up — 2026-10-10

Selecting Shuffled in the sort dropdown now generates a Fisher-Yates order instead of retaining curated order. Switching story/character collections while Shuffled is selected generates a new order for that collection. On Home, eligible readers see up to four newest mature artwork rows promoted to the front of the artwork list, ahead of newer safe rows, so they are present in the initial split-gallery batch when at least four exist. If fewer exist, all available mature rows are promoted; guest/non-entitled filtering remains unchanged. Mature artwork stays blurred until hover or the shared reveal toggle. The home mixed feed continues to cap artwork at six; it consumes the same reordered list.
