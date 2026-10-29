# UI reference inventory and redesign implications

Audit date: 2026-10-29, Asia/Kolkata. Source review only; root audit owns browser screenshots. No runtime, dependency, schema, or production-data changes.

## What actually exists in `reference/`

| Source | Contents | Useful desktop patterns | Limits |
| --- | --- | --- | --- |
| `reference/abstracto_redesign_sample(1) - Copy.html` | Standalone story-home visual prototype, 35,460 bytes. | 78px persistent rail; compact top bar; 3-part cover/story/status hero; side-by-side chapter index and artwork; chapter-tier accents; compact control groups; quick-link destinations. | Mostly a visual demo, not real app behavior. Filter/mode buttons only toggle classes. Contains static chapters/stats and Picsum images. |
| `reference/abstracto_full_gallery - Copy.html` | Standalone visual-archive prototype, 33,348 bytes. | Character masthead with an explicit statistics column; collection switcher; sticky search/sort/view toolbar; gallery/deck modes; wide lightbox image canvas plus 350px metadata rail. | Generates 40 local sample artwork records and fake scores; local vote counters; hardcoded discussion comments. These are not production features/data. |
| `reference/aether-ui-starter.zip` | Aether UI 0.1.0 React/TypeScript presentation library, 32,622 compressed bytes. | Semantic visual tokens, reusable panels/buttons/topbar, cover-plus-details story hero, secondary story navigation, character header, artwork controls, archive feature. | No account, membership, shelf, notification, help, form, chapter-reader, Admin, or Writer layout system. Not a whole-site redesign kit. |

There are no reference raster screenshots or photographs in the folder. The zip's nine images are original placeholder SVGs: background, cover, portrait, and art-1 through art-6. The HTML references fetch Picsum placeholder photography and Google Fonts. Screenshot appearances can therefore depend on network/font availability and should be labelled as reference demos rather than production data.

## Starter inventory

Zip paths have the `aether-ui/` prefix:

- Documentation: `README.md`, `NOTICE.md`, `docs/MIGRATION_MAP.md`.
- Foundation: `src/tokens.css`, `src/styles.css`, `src/index.ts`.
- 13 components: `AetherTheme`, `GlassPanel`, `Button`, `IconButton`, `AetherTopBar`, `CinematicBackground`, `StoryHero`, `WorldHubBar`, `CharacterHeader`, `GalleryToolbar`, `ArtworkCard`, `MasonryGallery`, `ArchiveFeature`; plus `utils.ts`.
- Four Storybook stories: Foundation, StoryHub, Gallery, ArchiveFeature.
- Two plain-HTML examples: `examples/story-hub.html`, `examples/character-gallery.html`. These can preview the CSS without React if extracted alongside `src/` and `public/demo/`.
- Tooling: React/ReactDOM peers `>=18`; development versions React 19.1.1, Storybook 8.6.14, Vite 6.1.0, TypeScript 5.9.3. No lockfile or built `dist/` is included.

No installation is necessary or appropriate for this audit. Do not transplant React, Vite, Storybook, or a new build system into the static application. Adapt the useful visual conventions to the existing classic-script renderers, delegated `data-*` actions, and CSS tokens instead.

## Design language, with important differences

1. **Home HTML** uses Cinzel display + Manrope/Inter UI, dark blue-green backgrounds, muted mint/gold/sky/tier accents, and large 26/18/14px radii. Its desktop shell is capped at 1500px with outer margins. Hero is `220px minmax(0,1.1fr) minmax(300px,.9fr)`; archive is roughly 52/48. This is the most direct model for the already-redesigned home.
2. **Gallery HTML** uses Cinzel + Lora + Montserrat, a 1520px outer shell and 1180px archive body, smaller 14/9/8px component radii, and a 168px portrait / flexible profile / 230px stats masthead. Its wide image-plus-sidebar lightbox is more valuable than decorative deck tilt.
3. **Starter** is the earlier, more restrained cinematic system: gold default accent, black translucent surfaces, Cinzel/Lora/Montserrat tokens, 4/6/8/12px radii. `StoryHero` is capped within an 850px story stack; character/tool/gallery sections cap at 1000px. It is not inherently a full-width desktop design.

**Conclusion:** these are related references, not one consistent finished design system. Blindly mixing them would preserve the current visual inconsistency. The current approved home is the strongest source of truth, with its newer selective square-corner geometry, full-width edge rail, actual masonry and semantic tier accents. Derive a shared system from that, then design each remaining page around its task.

## High-value adaptations for the upcoming redesign

- Persistent desktop navigation and a stable page toolbar, rather than phone-first floating controls or repeated oversized card headings.
- Explicit page compositions: main activity plus contextual side rail for account/access/help; multi-column browsable shelves/collections; dense scan-friendly chapter indexes; a proper calendar grid; image-plus-metadata artwork viewing.
- Reuse a consistent title/action/filter hierarchy, surface and border levels, button sizes, input focus, empty-state treatment, spacing scale, and only meaningful tier/status colors.
- Use horizontal space for additional information or meaningful parallel tasks, not merely stretching a mobile card to 1400px or adding empty columns.
- Preserve the current chapter-prose readability constraint. A desktop-friendly shell does not imply wider prose lines. Reader preferences and reading content already have a distinct design contract.
- Keep Supabase/auth/access, mature-artwork policy, stored preferences, routes, and keyboard behavior independent of presentation.

## Do not carry forward

- Demo chapters, invented stats, local sample artwork, fake votes/discussions, or copied placeholder images as production content.
- CSS-column masonry inside the height-limited home panel. Its horizontal column-flow problem was already corrected by measured row-span grid masonry in the current implementation.
- The reference's original 1500px inset shell or universally rounded cards. The owner has already moved toward an edge-to-edge shell and selective editorial geometry.
- Feature wish-list links without actual destinations or data. `WorldHubBar`'s Timelines/Maps/Lore and artwork discussion callbacks are generic presentation examples, not proof that this site supports them.
- Dramatic glass/blur/noise, hover transformations and ornamental card overlays everywhere. Keep functional dense pages calmer than Home/Gallery.
- The starter's hardcoded white/black colors without mapping them to existing light/dark semantic tokens. It contains no complete light-mode theme and no reduced-motion/reduced-transparency rule.

## Accessibility and integration caveats from source review

- Starter `Button`/`IconButton` include useful focus-visible styling and labels, but a link-style Button ignores `disabled`; custom HTML must not inherit that false disabled affordance.
- Starter `CharacterHeader` prints its name in a `div`, not a heading. Use real heading structure in production.
- Starter tag selection exposes `data-active`, not `aria-pressed`; keyboard/screen-reader state needs a real semantic counterpart.
- Starter search/select styles remove outlines without a replacement focus treatment on those controls.
- Gallery demo provides Escape/arrow behavior but no implemented modal focus trap/restoration or inert background. The production gallery already has those protections; preserve them.
- `ArtworkCard`'s `mature` prop only renders a badge; it is not an entitlement check or blur implementation. Existing production mature-content filtering remains authoritative.

## Source/asset provenance

The starter's `package.json` declares `CC0-1.0`; README and NOTICE credit `Abstracto-X/abstracto_tales` and explicitly exclude third-party character imagery. No separate LICENSE file is present in the zip. Treat the included notice as declared provenance, not evidence of rights to franchise art, remote photos, or fonts. Keep the notice if adapting code. The current `docs/READER_REDESIGN.md` already records this attribution and the no-React/plain-browser adaptation.

## Existing project context that constrains the next phase

- `docs/READER_REDESIGN.md` records an earlier broad reader-surface redesign scope, even though many routes received only shared skinning. It explicitly excludes Admin/Writer/chapter-reader structure from that prior work.
- `PROJECT_STATE.md` records the 2026-10-14 homepage editorial geometry trial: 3px panels, 5px reading/quick-link cards, 3px filters/tier labels, 4px primary controls, square artwork/index numbers; original shell pills/rail controls preserved.
- `docs/STUDIO_REBUILD_PLAN.md` is a separate deferred Writer/Admin plan. Do not silently merge a reader desktop refresh into that higher-risk editor/database rebuild.
- The remaining audit must distinguish **public author/reader website** from **standalone Writer workspace**, and guest-observed pages from authenticated/admin-only surfaces.

## Suggested decision after screenshot review

Agree the shared desktop shell/component language and tackle the remaining reader routes by family: (1) story/catalog/library, (2) account/access/shelf/settings, (3) updates/calendar/help/support. Review each family against the existing home instead of redesigning Home again. Keep Admin/Writer and chapter-reading changes as explicitly separate scope decisions.

Validation: inventory of all three reference sources; read zip README/NOTICE/migration map/tokens/styles/all component files and both HTML examples; reviewed both reference HTML source structures, breakpoints, external assets and demo interaction code; read project overview, relevant reader context and current redesign state. Initial `git status --short` was clean. No reference files extracted or installed, no browser or production writes performed by this subtask.
