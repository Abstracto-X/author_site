# Multi-site configuration survey and implementation plan

Survey: 2026-11-07. Revised: 2026-11-09 Asia/Kolkata.
Status: IMPLEMENTATION IN PROGRESS. Application changes are landing in staged commits; no schema, policy or deployment changes made. Target live checks deferred by owner; see PROJECT_STATE.md and docs/MULTI_SITE_DEPLOYMENT.md.
Companion: `docs/audits/2026-11-07-multi-site-inventory.json` is the original static evidence snapshot, not a regenerated live/deployed inventory.

## 1. Plain-English goal and agreed boundaries

One product should run for two author identities and any number of their stories without one identity's names, membership artwork, author data or settings showing up in the other. The shared application should not know that a particular membership is called Tyrant or that a particular story uses ornate system messages.

Owner decisions (2026-11-09):

- Website appearance is ALWAYS managed through repository files and agent-assisted releases, not Admin or database styling editors.
- Keep Admin as the publishing/content/access management tool. Do not move ordinary author work into configuration files merely to make the code generic.
- Local settings are a practical starting source for a clean settings interface, not the product goal and not permission to create a second hardcoded application.
- Evaluate local profiles as one implementation detail, not a mandate that every setting belongs in a profile or a database.

Recommended deployment baseline remains one repository, two deployments and two separate Supabase projects (the currently independent identity backends). Shared-database multi-tenancy is not part of this change. Separate projects alone do not prevent incorrect local copy/asset/storage fallback; the shared application also needs cleanup. Nothing authorizes deleting Abstracto Tales' legacy site; preserving its homepage and routing into the shared product is the discussed target.

### Who owns what?

| Kind of change | Owner and storage | Examples |
|---|---|---|
| Application behavior | Shared versioned code | Reading/editor tools, renderers, supported layouts, escaping, access checks, routing |
| Site presentation | Repository files/config/assets | Site name/logo, CSS, decorative banners, fonts, frame artwork, help copy, cosmetic theme definitions |
| Published content and membership business data | Connected backend, edited in Admin/Writer | Stories, chapters, covers, gallery uploads, character/lore content, tier names/ranks, keys, provider mappings, rolling access |
| Reader/author personal state | Correctly scoped browser state and existing private DB tables | Progress/preferences, author drafts, Context presets, private AI chats |
| Operations/secrets | Per-deployment/server environment | Backend URL/public key selection, private provider/AI credentials, callback allowlists, email/scheduler/backups |

A story cover/gallery upload is CONTENT, not a website theme. Preserve its current author upload workflow. Decorative UI banners/frames are PRESENTATION and remain in the repo. A story-specific rendering decoration can have a scoped local rule without hardcoding that rule into every story's renderer.

### What changed from the November 7 proposal?

The factual survey below remains useful, but its destinations have been revised. The previous DB-managed appearance/public-config bundle, tier-presentation tables, CSS publication service and Admin theme editor are superseded. Do not implement them as prerequisites. No general DB-code execution and no universal local/remote switch for accounts, chapters or access.

## 2. Survey coverage and limits

- Derived the dependency set from all three HTML entry points: 27 non-vendor JS/CSS assets plus three HTML files. Scanned every such file, then read the relevant configuration, branding, auth, rendering, persistence, settings/write and link-generation areas.
- Scanned all 12 TypeScript sources for the nine Edge Functions and their three shared helpers; inventoried environment-variable names, not secret values.
- Scanned all 28 SQL files under `database/sql/` and 26 under `supabase/migrations/`, including hotfixes and inactive system groundwork. These are two overlapping histories, not 54 independent features or a verified clean-install sequence.
- Reviewed all seven test-file surfaces for source-site assumptions; inspected operational scripts, `ENV.example`, ignore rules and local asset groups. Entry-referenced vendor bundles were dependency-inventoried, not security-audited internally.
- Classified the remaining seven JS files as template/legacy/inactive using current boot references and architecture docs. `deleted/`, `reference/`, `design/`, CSS backups, ZIPs and screenshots are not production porting inputs. No files were removed.
- This is a whole-runtime portability survey, not a line-by-line correctness/security audit. No live database queries, browser tests, credentials inspection, production mutation or deployment. Docs may not represent deployed policies; verify before schema implementation. Source line anchors can change; the companion hashes identify this snapshot.

## 3. Findings register (revised ownership)

Priorities describe sequencing/risk, not proof of a production exploit. Source anchors are from the November 7 survey. The recommendation column reflects the current plan, not implemented behavior.

| ID | Priority | Evidence / current assumption | Recommended action / owner |
|---|---|---|---|
| F01 | P0 | `site-config.js:1-44`; Reader `auth.js:5-16`, Admin `admin.html:1180-1187`, Writer `writer.html:2472-2476` already share URL/public key.  Keep minimal deployment connection/site identity and base paths in repository/deployment configuration. Select a validated local settings source before creating clients; backend ID matching chooses presentation, never permissions. |
| F02 | P1 | `config.js:63-100`, `backend.js:337-352`: DB identity/behavior exists, but only five setting keys are fetched. Name/link/provider constants are captured at script load.  Separate appearance from operational settings. A shared settings accessor returns a normalized snapshot from local files initially. Retain existing DB content/access contracts. Do not introduce a remote appearance service or silently merge all DB keys into local presentation. |
| F03 | P1 | `index.html:7-8,27`; `admin.html:6,1077,1114,3926-3929,5007-5038`; `writer.html:6` retain brand copy. Admin save updates its logo/title, but that is not a universal startup loader.  Repository-managed identity/title/logo/copy consumed consistently at startup by Reader, Admin and Writer. Use neutral loading/setup/noscript copy, or explicitly generated per-deployment HTML metadata if wanted. Existing database appearance values must not override the chosen local source. |
| F04 | P1 | `site-config.js:auth/providers/links/features`; `config.js:10-14,66-68,113-119`.  Repository-managed supported-provider presentation, links and feature visibility; real credentials, provider availability and verification remain backend-owned. Local selection never grants access or implements an unsupported adapter. |
| F05 | P1 | `membership-journey.js:6-25,65-80`; `chrome.js:7-19`: four Resident tiers, display-name matching, duplicated banner registry and array-order frame ladder.  Tier definitions/names/ranks remain in the connected DB and editable in Admin. Repository maps scoped stable tier IDs to artwork/visual treatment, without duplicating authoritative tier names. Unknown real tiers render their real name and neutral visuals, not another identity's tier. |
| F06 | P1 | `membership-journey.js:availableProfileFrames/profileHasEvilTheme`; `utils.js:5-37`; Settings `reader-settings.js:9`; `events.js:218,556`; `chrome.js:42`.  Repository theme/frame definitions and cosmetic eligibility references use actual tier IDs/ranks. Verify against current backend entitlements. Never infer grants from profile file, tier-name substring, array position or selected theme. |
| F07 | P1 | `assets/profile-frames/` (11 files), `assets/evil-theme/` (4); `membership-journey.css:58-62`; `reader-foundation.css:306,358-475`.  Keep decorative assets/styles/definitions in repository files separated by identity. Do not upload them to DB/Storage for routine agent edits. Story covers and gallery artwork remain author-managed content. Repository assets are public, not protected membership content. |
| F08 | P1 | `config.js:15-23`; `story-reader.js:356-366`; `styles.css:900`: ornate system dialogue defaults to after chapter 70 with fixed ornament images.  Use repository-owned default and optional site/story-scoped ornament policies and assets. Preserve chapter-70 behavior only for its intended source context; otherwise use a neutral default. Saved chapter text remains content, never executable configuration. |
| F09 | P2 | `backend.js:381-386,492-493`: newest-created published story becomes primary, first two become featured.  Make the generic default explicit and optional pinned/featured overrides site/story-scoped. Resolve only actual published stories from the connected backend; never import source-story names/content. Do not require DB migration merely to improve a default. |
| F10 | P2 | `home-library.js:460-480`: balanced mature/safe randomization is an application policy; initial page sizes and a 500-row gallery cap are fixed.  Keep rendering/shuffle algorithms and bounds in shared code; optional visual/feed defaults in local settings. Mature access remains server-owned. Configuration is not a reason to move every numeric literal into a database. |
| F11 | P1 | `auth.js:195`, `sheets.js:237-238`, `help-support.js:58`, `onboarding.js:6-40`: author/server/provider-specific instructional copy and fixed provider mentions.  Repository copy defaults and site/provider-specific text overrides through a shared accessor. Compose instructions from supported enabled providers; keep escaping and no executable templates. |
| F12 | P0 | `state.js:52,78`; `onboarding.js:5`; `membership-journey.js:4,83`; `events.js:680-689`: fixed browser-storage namespaces.  Site/backend-aware browser-storage helper and account isolation where appropriate. One-time migration only on the existing identity; preserve auth and reader preferences, never import another identity's state. |
| F13 | P0 | Admin `1198-1235,1912-1918,2994-2996,5385-5396`; Writer persistence throughout `2724-3158,Context.stateKey`; `writer-ai-chat.js:14-15,activeThreadKey()`.  Apply the same scope to author draft backups, last selection, Context workspace and chat state. Validate saved IDs against the current backend. Model catalog cache may be deliberately provider-wide, not private author content. |
| F14 | P0 | `auth.js:466-480`, `router.js:38,91`, Writer `5233,5253`, reader/author links throughout. `publicBaseUrl` is declared but has no active consumer found.  One URL resolver uses validated deployment roots; verify root/subdirectory layouts and current direct links. Callback allowlists remain server-side. No automatic switching of backend or profile from a reader-supplied query parameter. |
| F15 | P1 | Writer `2481-2500`: access-list copy special-cases Resident Nemesis/Evil slugs.  Writer copies actual backend tier names. Compute any cumulative audience through generic rank rules or a clearly scoped presentation rule; remove special-casing of source slugs from shared behavior. |
| F16 | P0 | Writer `1699-1712,3350-3428`; `20261103043000_writer_test_account_tier_override.sql` targets one fixed account and four source tier slugs; staged/unapplied per project state.  Keep source-only test tooling explicitly disabled outside its intended identity and uninstalled by generic provisioning. UI flags are not server authorization. Do not apply the staged fixed-account SQL to another backend. |
| F17 | P0 | Resident tier-ladder, Patreon-campaign and Boosty-Discord-role SQL files in both folders.  Preserve historical applied migrations. Separate portable schema requirements from per-site tiers/provider seeds and reconcile target schema only when needed. Do not copy source campaign/role/tier IDs blindly. |
| F18 | P1 | `20260717080000_story_systems.sql:272-275` seeds an unpublished source-story system for `a-zombie-tale`; system JS is not loaded.  Exclude inactive story-system seed/UI from the first portability implementation. An unpublished source-specific story seed is not generic site configuration. |
| F19 | P0 | Patreon/Discord helpers and OAuth functions use project env credentials, campaign/guild, signed state and return URLs.  Keep credentials, trusted callback URLs and actual campaign verification in per-backend environment. Continue Admin-managed DB provider mappings; display links/copy are local presentation. No credentials in profile files. |
| F20 | P1 | Email function `send-reader-email-queue/index.ts:14` defaults to source brand; sender/key/queue secret are env-based. Auth email branding/URLs are outside these static files.  Email delivery/Auth templates and sender branding need per-deployment operations configuration. Keep sender/API/queue secrets server-side. Sync repository-owned brand identity through an explicit deployment setting, not a new public DB appearance service. |
| F21 | P2 | Writer AI/summary files and functions have model menus/defaults, prompt templates and fixed provider endpoints; summaries use a bounded model allowlist. `ENV.example` omits email/AI variable groups used in code.  Preserve current DB-backed author AI preferences/presets. Keep application prompts/support limits versioned and keys/cost limits server-side; local defaults may select only implemented models/adapters. Complete deployment templates/checklists separately. |
| F22 | P0 | `backup-supabase.ps1:3-24` pins one project, host, credential/log/temp names and backup roots; query helper defaults to repository `.env`. No checked-in multi-target workflow found.  Explicit independent operations targets, credential/log/backup paths and migration records outside public presentation settings. Keep restricted AI queries and owner review boundaries. Do not run operations merely to change an image. |
| F23 | P1 | Tests assert source tiers/domains/perks/test account; see `writer-access-list.test.js`, `reader-membership-journey.test.js`, `writer-safety.test.js`.  Retain existing-site compatibility tests and add a second identity with different names/tier count/assets/provider choices. Test source selection and complete absence of wrong-identity fallback. Never weaken access tests to support local configuration. |
| F24 | P1 | No active DB CSS/JS execution loader found. `backend.js:126` strips script/style/iframe from chapter HTML. Entry pages contain inline code/styles/handlers; no entry meta CSP found.  No DB CSS/JS execution or remote stylesheet publishing. Shared base styles plus repo-owned per-site styles loaded only through reviewed local resource definitions. Preserve chapter sanitization, user preferences and accessible base recovery. |
| F25 | P0 | `auth.js:32-36` reader admin inference includes `user_metadata.role`; backend/admin checks use profile/RLS.  Align frontend admin presentation with trusted backend roles as a narrow existing risk review, without moving permissions into settings. User-editable metadata/local profile never grants admin access. Static finding is not proof of an RLS bypass. |
| F26 | P1 | `site_settings` documented public SELECT policy (`DATABASE_CONTEXT.md:754-755`); generic Admin JSON editor writes settings.  Existing broadly public site_settings is not a secret store. Preserve unrelated operational settings and content workflows. Appearance fields become explicitly repository-managed; do not add generic remote-config tables, publish workflows or silent ignored Save buttons. |
| F27 | P1 | `story-reader.js:172-200` matches Licker/Tyrant/Nemesis/Evil name fragments for chapter lock classes/colors.  Use the same local tier-ID presentation registry for chapter colors, topbar and profile. Backend remains authoritative for tier names and access. Unknown tier gets a neutral fallback, not source tier text. |
| F28 | P1 | `auth.js:24-29` treats names containing Archivist as level 2 and all other memberships as level 1; `state.js:5-13` and `utils.js:89` retain legacy personas.  Replace legacy name-based level summaries with actual DB ranks/capabilities. Preserve secure backend catalog authority; do not revive non-backend personas as production entitlement or fallback data. |
| F29 | P2 | Navigation/story subnav, Benefits cards, onboarding steps and update-popup text are fixed product copy in `chrome.js`, `story-reader.js`, `account-access.js`, `onboarding.js` and `sheets.js`; update version is fixed in `events.js:680`.  Shared route/action registry with local optional copy/order/visibility. Keep core help/account/recovery routes available and do not turn labels into fetched selectors, handlers or HTML templates. |
| F30 | P2 | HTML entries load fixed font/CDN/editor dependencies; Admin story defaults include `loader_theme: 'lightsaber'` and gold accent. Shared styles define typography, spacing and animation behavior.  Shared supported dependencies/base algorithms stay in code; local settings own UI fonts/colors/loader defaults. Preserve stored content media fields; flag styling-only legacy Admin fields as repository-managed rather than silently allowing conflicting writes. |

## 4. Admin assessment: mostly already story-independent

The owner is substantially correct: the core Admin was built to manage multiple stories. It does not need a rewrite or a new per-story Admin application.

Confirmed source patterns on November 9:

- `admin.html:2084-2129`: story updates target the selected story ID; chapter lists filter by story ID and chapter records carry their parent story.
- `admin.html:2407-2423`: membership tiers are fetched/edited in `reader_access_tiers`; the Admin tier list itself is not a hardcoded four-Resident-tier selector.
- `admin.html:2584-2620,5463-5489`: rolling access is stored per story and its form is generated from real tiers. Keep this in Admin/DB, not local presentation files.
- Story/character/gallery/lore/map forms are ordinary database-backed content workflows. Reader CRM, manual grants, access keys and provider mappings are backend-wide author operations; this is appropriate when each identity has its own backend.
- Private Writer notes, Context presets, summaries and chats remain with their story/backend; they are not part of a public site profile.

Actual exceptions / portability work:

1. Admin name/title and fallback branding still reference the existing identity. They must use the same repository-owned identity settings as Reader/Writer.
2. Site Settings currently offers editable identity, app background and decorative system-dialog defaults (`saveSiteIdentity` / `saveReaderBehavior`). Those overlap the newly agreed repository ownership. Mark the appearance controls explicitly repository-managed/read-only or retire them deliberately during implementation, preserving old values. Do not leave a Save action that silently has no effect. Review remaining operational reader-behavior fields individually rather than disabling the entire Settings workspace.
3. The story form defaults to gold and `lightsaber` loader (`admin.html:2753,2793`). These are presentation/legacy defaults, not story-content management requirements. Resolve them through generic/local presentation rules, preserve stored values and determine actual consumers before removing fields. Story cover/background artwork uploads remain content management; they do not authorize Admin edits to shared CSS/layout/perk artwork.
4. Last-selected story/chapter and local drafts use browser keys without site identity. That can cause wrong selections or stale drafts across paths/backends. Namespace and validate them; a shared browser is not a shared author workspace.
5. The fixed testing account and tier choices are in the standalone Writer, not evidence that the normal Admin tier manager is story-specific.
6. Source-specific SQL seeds/provider deployment configuration are a setup risk, not proof that Admin's ordinary forms are hardcoded to one story.

Conclusion: preserve core Admin content/access workflows. Fix its presentation, persisted selection boundaries and conflicting appearance controls. No audit finding justifies moving all its existing controls into source files or rebuilding the CMS.

## 5. Settings boundary and local source

Introduce a small normalized settings interface used by Reader, Admin and Writer. Exact function/file names are implementation choices, not approved APIs yet. Its purpose is to stop renderers reaching into scattered hardcoded brand/tier strings or fetching random DB settings themselves.

- Initially read repository-owned public settings; a JSON-like plain browser configuration file is sufficient. No local database server, new framework, new build step or production story fixtures are required.
- Select settings using an explicit deployment site key and expected connected backend. A registry may map known project IDs to site settings; this is a routing/consistency check, not authentication. Validate the pair before data-dependent work. Do not guess another identity when a match is missing.
- Keep local settings and real backend data as distinct inputs. Do not pretend that tier names, accounts or chapters are local just because presentation is local.
- Renderers use the normalized snapshot, not conditionals such as 'if this is EvilArchives' scattered throughout shared code. Known site-specific cases live in scoped data/resource definitions or supported local components.
- If a different source is needed later for a legitimately source-switchable setting, implement another adapter returning the same versioned shape. Switching is simple only AFTER that adapter, schema and validation exist. It is not a promise that all application data or repository-managed appearance can be switched to a remote database by magic.
- Remote appearance is not on the implementation roadmap. Appearance remains repo-managed under the owner's current decision; an interchangeable interface should not create unused database infrastructure.
- No automatic live backend switching inside an authenticated page. Changing deployment target requires reload and correct state/session scoping.

### Example: a membership banner

1. The connected DB says a real tier has ID T, name 'Star Wanderer' and rank 20; it also determines whether this account has active access.
2. The current identity's local presentation settings optionally associate T with a banner file and color.
3. Shared components render the DB name and selected local artwork.
4. If a new tier is created in Admin without an artwork mapping, show its real DB name with neutral styling. Do not display Resident Tyrant just because it is the second tier, or grant access because a banner exists.
5. Renaming a tier does not break its artwork mapping. Unknown/deleted/disabled tier references do not manufacture a tier, entitlement or benefit.

Prefer stable DB tier IDs inside a site-scoped mapping; a stable unique slug may be used only with explicit validation/migration. Never map globally by substring or array position. Rank-based cosmetic rules must still refer to real active tiers and valid backend entitlements. Story-specific overrides must similarly be scoped to the selected site/backend and real story ID.

### Authority and fallback rules

| Field | Authority | If missing / conflicting |
|---|---|---|
| Name/logo/CSS/banner/help copy/decorative theme | Repository settings/release | Neutral same-site default; never another identity. DB appearance values do not silently override it. |
| Actual tier name/rank/access, story/chapter content and publication | Connected backend | Honest empty/error/locked state as appropriate; no sample or other-site fallback. |
| Cosmetic eligibility | Repository rule evaluated against current backend entitlement | No perk if not eligible; base appearance stays usable. Never changes server access. |
| Reader appearance choice | Reader preference among supported themes | Preserve readable typography/colors; unsupported choice migrates to a safe base. |
| Provider verification, roles, secrets and signed return URLs | Trusted backend/server operations | Local UI flags cannot authorize or bypass missing server setup. |
| Local state/cache | Site + backend + account scope as appropriate | Migrate only known old-source state; validate selected IDs. Do not clear sign-in globally. |

Do not blanket-merge all repository and DB settings. Classify each existing `site_identity` / `reader_behavior` field and establish one owner. Keep operational controls and content workflows intact. Preserve old rows; no cleanup deletion is authorized. New DB features or extra columns still require schema-first review, but the first local presentation refactor must not require a production DB migration.

## 6. Resource loading and isolation

- Shared base CSS/components and optional per-site CSS/assets stay in the repo. Load the selected site's reviewed local resources; public database text is not a script or stylesheet loader.
- Decorative resources can be public. Do not put private drafts, paid chapter text, reader data, OAuth credentials or provider/AI secrets into repo profiles/assets.
- The objective is no accidental cross-identity display/data use, NOT secrecy that the same software/assets exist. Public paths in one repo can be discovered. Membership artwork is not an access boundary.
- Keep shared access logic, supported dependencies, escaping/sanitization and mandatory safety bounds versioned in application/server code.
- Preserve separate backend credentials/projects, provider callbacks/mappings, queues, storage ownership and operational targets. Matching a project ID does not replace any of those protections.
- Recovery handles missing settings or missing CSS without loading the other brand. Unknown deployment/backend pair should stop with a neutral setup message, not silently choose the current author's profile or create a backend client for a guessed target.
- Source-specific test tooling stays opt-in/scoped and server-guarded. Existing unapplied fixed-account SQL remains excluded from generic setup.

## 7. Implementation stages and gates

### Stage 0: lock ownership and compatibility baseline
- Use the owner decisions in section 1; no further broad question about Admin-vs-repo appearance is outstanding.
- Record current-site compatibility fixtures/visual sign-off and choose the minimal settings shape; list every appearance/operational field's owner.
- Record deployment roots and known backend/site pairings. Actual final domains are a deployment input, not a reason to overbuild configuration now.
- Preserve original survey evidence and current application behavior. No schema migration is required merely to plan/localize appearance.
- Exit: agreed scoped contract and a source compatibility/rollback checklist, not an invented generalized configuration platform.

### Stage 1: local settings, shared consumers and isolation foundation
- Implement a local normalized settings source consumed by Reader/Admin/Writer, neutral startup and consistent identity display.
- Add deployment-pair validation and URL resolution; preserve current direct links/root paths and test subdirectories.
- Add site/backend/account-scoped storage with deliberate existing-site migration; validate selections and guard stale account/story responses.
- Maintain plain classic browser JS, script order, documented globals and monolithic Admin/Writer structure. No new runtime dependencies or framework/build requirement.
- Exit: current site still works, second presentation fixture can be selected without editing shared renderers, and wrong pair/missing settings cannot leak the source identity.

### Stage 2: remove business-name assumptions from shared UI
- Replace duplicate banner registries and tier-name color/perk matching with local tier-ID presentation mappings and generic entitlement/rank evaluation.
- Make frame/theme/ornament/source-special cases scoped; support no tiers, more than four tiers and Admin tier renames.
- Fix Writer access-list audiences generically; isolate source-only test tools.
- Exit: a second identity with unrelated tier names/stories renders its own real data; adding a tier without local artwork is functional and neutral. Existing identity preserves its intended perks/visuals.

### Stage 3: align Admin and story behavior without rebuilding content management
- Preserve story/chapter/media/tier/key/grant/provider/rolling-access tools.
- Make repo-owned appearance controls read-only/clearly labelled or deliberately retire them, without silently ignoring saves or deleting stored values. Preserve operational Settings fields after classifying them.
- Apply site/story-scoped ornaments/defaults and documented primary-story selection. Fix only relevant stale selection/story-switch issues, not a broad unrelated CMS refactor.
- Exit: author publishing remains unchanged and no Admin appearance setting secretly competes with the repository.

### Stage 4: second backend compatibility and repeatable deployment
- Read target schema/RPC/RLS/function versions using restricted approved access; do not assume the old Abstracto backend supports all current features.
- Reconcile only required feature contracts. Separate portable schema from identity-specific tier/provider/test/system seeds; preserve applied history.
- Produce timestamped idempotent migrations with `NOTIFY pgrst, 'reload schema';` when required. Existing-schema/destructive changes stop for owner review/manual execution and live verification. Do not blindly apply the source migration history or obtain privileged credentials.
- Configure each backend's Auth/Edge secrets/callbacks/email/queues/storage/backup targets. No copying readers, paid grants or content across identities by default.
- Deploy the same shared application release with independent reviewed identity resources/connection settings. Preserve the Abstracto homepage/redirect decisions without deletion unless separately authorized.
- Exit: two independently configured real sites run one product with verified free/paid/admin access and no wrong-identity content/provider/state.

## 8. Validation and acceptance criteria

Future automated checks:
- Settings shape/source errors, unknown backend/profile pair, wrong/unsupported asset reference, no cross-identity fallback and no DB appearance override.
- Existing-site state migration; two paths on one origin; selected story/chapter belongs to current backend; account switch/stale responses do not apply old state.
- Tier rename/reorder/disable; fewer/more than four tiers; real unknown tier gets neutral art; rank/expiry/downgrade; no presentation-to-access escalation.
- Writer audience/direct URLs and existing export compatibility. Local settings must not change backend catalog decisions.
- Existing production reader tests plus deliberately different identity fixtures. Local test content stays in tests/explicit non-production preview, never a fallback for Supabase failure.

Owner-led manual checks after implementation (not performed for this plan):
1. Reader, Admin and Writer on both deployments show the right names/copy/assets/provider links, including loading/error/help/login screens.
2. Create/edit stories and chapters, switch between stories, upload covers/artwork, change tier names and rolling windows. Verify normal author workflows stay DB-backed and target the selected story.
3. Guest/free/paid/expired/renewed/admin secure access and provider callbacks use only the connected backend; mature gallery and appearance perks remain distinct from chapter authorization.
4. Add a tier with no custom artwork; verify its real name and neutral styling, never a source-tier substitute. Verify membership decline/sign-out removes cosmetic perks appropriately.
5. Same browser across both domains or same-origin paths: progress, drafts, Context/chat, last selections and dismissals remain scoped; current source preferences/auth are preserved.
6. Missing local settings/CSS/asset, mismatch backend pairing, slow/offline DB, saved deleted story ID and old source cache: neutral honest recovery, no fabricated content or other identity's fallback.
7. Desktop/mobile, keyboard/focus, dark/light/custom chapter colors, reduced motion and Writer state/save guarantees remain intact.
8. Admin appearance controls are explicitly repo-managed, not functional-looking dead saves. Remaining content/access/operational controls still work.
9. Verify real Auth/notification emails, scheduler/backups and provider mappings against intended identity; secrets/private content never appear in frontend resources/logs.
10. Compare both sites' network requests and copied chapter URLs for accidental source project/domain references.

Success means: one application implementation, separate real content/accounts/access, repository-owned appearance, no name-based source assumptions, and no new DB dependency for a routine UI/banner edit. It does not mean a shared multi-tenant backend, a local mock production database, an arbitrary plugin engine or an Admin design system.

## 9. Current status and remaining work

Repository-side implementation has landed in reviewed batches documented in CHANGELOG.md, current architecture/function docs and PROJECT_STATE.md. Source configuration/preflight and 171 Node tests pass; all seven inline scripts and 25 active application scripts parse. See docs/MULTI_SITE_ACCEPTANCE.md for the requirement-level acceptance ledger and docs/MULTI_SITE_DEPLOYMENT.md for rollout steps. This plan is not a declaration that two live sites are ready.

The owner explicitly requested placeholder Abstracto configuration and deferred live target compatibility, then explicitly deferred source browser verification too. Remaining gates require those external inputs/checks: target connection/public settings, schema/RPC/RLS/Storage/Edge comparison and reviewed migrations only if needed, deployment-specific Auth/provider/email/AI/backup setup, actual deployments and browser/access/network matrix. No target DB access, SQL migration, provider changes or deployment has been performed. No privileged backup or credential workflow was run.

Original inventory and mid-implementation audit are historical evidence, not the current runtime manifest. Live/browser verification remains unproven. Do not mark the full objective complete until the deferred gates are performed and failures, if any, are resolved.
