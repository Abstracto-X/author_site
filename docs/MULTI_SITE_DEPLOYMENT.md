# Multi-site deployment and verification

Status: implementation in progress. Abstracto Tales live connection/compatibility work is explicitly deferred by owner; placeholders are intentional. No second backend has been modified or deployed.

## One release, independent connections

Keep the same Reader/Admin/Writer application files in both deployments. Each deployment supplies its own reviewed js/subscription/site-config.js. For the second identity start from site-config.abstracto.template.js, NOT a copy of the source author's populated profile. Do not replace the Abstracto legacy homepage or delete legacy files without the separate reviewed routing/cutover step.

Configure siteKey and its siteProfiles entry; independently set the profile expected backendUrl and supabase.url to the same intended project, plus that project's public anon/publishable key. Never put service-role, provider or AI secrets here. Set publicBaseUrl to the deployed reader directory (trailing slash recommended); branding and provider links belong to that identity. Templates intentionally fail preflight until configured.

Optional profile resources: tierPresentation keyed by real target tier IDs, profileFrames with explicit allowed/default frame IDs, appearance (including ornateStoryIds), library primary/featured real story IDs. Omitted mappings must stay neutral. Do not copy source tier/story IDs, test account tools, private content or reader accounts. writerTestAccount is disabled unless explicitly configured and requires its independent server guard; the source fixed-account migration is excluded from generic setup.

## Local release gate

Run node scripts/check-site-config.js (or pass the reviewed target config path). It validates public shape/pairing/roots, local frame/banner files and entrypoint script order; it does not connect to a backend. Run all Node tests by enumerating tests/*.test.js paths in PowerShell, and syntax checks for changed JS. Never treat a green preflight as backend/deployment approval.

## Deferred target-backend gate

Provision target-specific restricted ai_editor access using scripts/database/query-ai-db.ps1 -EnvironmentFile <target-env-file>. Do not use source credentials against the target, obtain privileged credentials, or log secret values. Before applying anything compare required tables/columns, RPC signatures/returns, RLS, Storage buckets/policies, triggers and Edge versions to docs/DATABASE_CONTEXT.md and active call sites. Existing-schema changes require timestamped idempotent migrations, NOTIFY pgrst reload schema, owner review/manual execution and live verification. Do not replay source seed/provider/test-account migrations wholesale. Preserve existing content and historical migration records.

Configure each project's Auth Site URL and redirect allowlist, Google sign-in, email confirmation/recovery, Patreon campaign/return URLs, Discord guild/roles/callbacks, provider mapping rows, email queue/sender/scheduler and AI secrets/models independently. Check allowed CORS origins, Storage public/private paths and owner-write RLS. Secrets stay server-side. Existing source-specific backup job must not be silently reused for a second project; configure independent backup targets and retention, including a separate Storage object backup if desired. No backend rollout is automatic.

## Browser and cutover gate

Owner-led QA: both identities, guest/free/paid/expired/admin; renamed/new/disabled tiers; multiple stories; draft/publish/upload/Context/AI workflows; same-origin and cross-domain paths; signout/account changes during pending reads/writes; failed/missing config/assets/offline requests. Confirm no source provider destinations, source tiers/art, private progress, draft or chat state appears on target. Verify real callback emails/provider connections and network destinations. Node tests do not replace these checks.

Old unscoped author drafts are retained, not assigned an account automatically. Source Admin Settings can download their private JSON backup for owner review/manual restoration; never publish an export automatically. Guest legacy reader state is not claimed by a signed-in account. Confirm account preferences and synced backend progress before rollout.

Deploy a reviewed release plus the intended public config and retain previous release/config for rollback. Do not roll back or delete content/DB rows as an application rollback. Only cut over Abstracto routing/homepage after its explicit verification and owner review.
