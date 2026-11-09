# Multi-site acceptance ledger

Status: NOT fully accepted. Code and offline checks are substantially implemented; live target compatibility and owner browser acceptance are deferred. Do not mark the goal complete from this document or test count alone.

## Current authoritative offline evidence

- 171 passing Node tests, including actual shared config/bootstrap/storage/auth/utils/chrome/membership modules for two identities on one origin using the same reader ID. Alternate identity has six unrelated tiers; source tier ID intentionally reused without local art mapping to prove mappings stay scoped. No source notes/progress/frame/theme/banner/provider URL appears in alternate rendered state. This is VM integration, not browser/Supabase integration.
- Source offline preflight passes configuration, pairing, local assets and script order. Abstracto placeholder intentionally fails until configured.
- Source restricted SELECTs verified tier IDs/ranks/active flags, story ID/color/loader and public tier-read policy metadata. reader_behavior query returned no source row: no persisted background/ornament behavior row was available to migrate. No database writes.
- PowerShell backup tests use ValidateOnly only; no credential, backup, retention/delete or network action.
- Reader loaded classic scripts and Writer inline scripts parse in tests; changed modules also receive narrow node --check checks. Edge email edit is a neutral fallback string; no Edge deployment or full Deno integration check.

## Stage gates

| Plan stage | Evidence | Acceptance remaining |
|---|---|---|
| 0 ownership/baseline | Repo presentation versus backend content/access documented; verified source IDs and appearance facts preserved in config | Source visual sign-off, real final target URLs/resources |
| 1 settings/isolation | Validated normalized profiles before clients; neutral setup; URL roots; site/backend/account storage; request guards and source recovery tested | Real Auth/session/storage/cross-path browser behavior and pending mutation/unload QA |
| 2 name-independent UI | Real tier catalog; ID-scoped art/colors/frames/theme; neutral unknowns; generic audiences; scoped test tool | Live rename/disable/expiry/downgrade and source/alternate visuals |
| 3 Admin/story ownership | Appearance controls explicit repo-owned; content writes preserved; source ornaments scoped; actual story-ID selection validated | Admin/Writer real create/edit/upload/publish/rolling access smoke test |
| 4 target/backend/rollout | Safe target placeholder, runbook, environment template, offline preflight and independent backup target inputs | Owner-deferred schema/RPC/RLS/Storage/Edge reconciliation, reviewed migrations if needed, Auth/provider/email/AI secrets, scheduler/backup setup and two deployments |

## Plan acceptance matrix — owner verification still required

1. Identity/copy/assets/providers on both deployments including errors/login/help: offline subsets tested; browser pending.
2. Multi-story content/tier rename/rolling/media workflows: existing tests preserved; signed-in backend workflow pending.
3. Guest/free/paid/expired/renewed/admin access/provider callbacks/mature content: code contracts tested, real RLS/callback verification pending.
4. New/unmapped/renamed tiers and cosmetic downgrade/signout: unit/integration subsets tested; live entitlement/visual matrix pending.
5. Same-browser paths/domains/accounts/progress/drafts/Context/chat: namespace and delayed response tests; real multi-tab/auth/private DB checks pending.
6. Missing settings/CSS/assets/offline/deleted IDs/legacy cache: VM/unit/preflight subsets; browser recovery pending.
7. Responsive/keyboard/focus/custom reader colors/reduced motion and Writer save guarantees: regression contracts only, visual/manual QA pending.
8. Admin repo appearance controls versus real content/operational saves: code reviewed/tested narrowly; actual DB-backed save smoke pending.
9. Email/Auth/scheduler/backups/provider targets/secrets: templates and validation-only checks; live operations pending.
10. Network destinations/copied URLs/source-reference absence: VM/clipboard tests; both deployed network audits pending.

## Rollback / preservation

All changes are committed in batches. Do not remove legacy raw/local draft records; use private source-only export for owner-reviewed restoration. Existing database content/appearance rows and migration history remain untouched. Roll back application/config as a reviewed pair, not by deleting backend data. Backend migration/restore work still requires owner review.

## Next action

Owner supplies final target public configuration and provisions restricted target access when ready, then the deferred compatibility/rollout gates can be completed. Owner-led browser QA may run first against the current source deployment preview. No target secrets should be pasted into chat. Remaining failures found by those gates must be fixed before final acceptance.
