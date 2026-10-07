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
| Traditional chapter index + artwork archive | Reference split layout, card/compact/focus display controls |
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
