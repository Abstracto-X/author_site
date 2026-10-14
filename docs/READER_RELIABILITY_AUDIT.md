# Reader reliability hardening — 2026-10-14

Status: first access-lifecycle pass implemented locally; **not a completed whole-reader audit or production verification**.

## UX contract

- Readers should sign in and read. Routine membership refresh, stale-state reconciliation, and recoverable network errors belong to the site, not to a troubleshooting checklist.
- Chapter labels and actual delivery must agree. Supabase remains the authority; a transient failure must not be described as a canceled subscription.
- Reconnect is appropriate only when provider authorization actually needs renewal. Do not automatically redirect people through OAuth or extend access without provider evidence.
- Background work must not reset reading position, discard a comment draft, or reopen a dismissed recovery dialog.
- No application can eliminate provider outages, revoked authorization, or every edge case. Those cases need bounded recovery and clear, actionable outcomes rather than indefinite spinners or contradictory labels.

## Confirmed findings and local fixes

| Finding | Evidence | Local change |
|---|---|---|
| Expired rows still looked active | `activeEntitlements()` previously accepted stored `status = active` despite an RPC `is_active = false` and expired validity | Check the RPC flag and validity dates. |
| Any paid tier looked sufficient for every chapter | `chapterResolved()` compared persona rank 10/20/30 to legacy requirements 1/2 | Backend chapters now use catalog `can_read`. |
| Patreon required reader-initiated sync after linking | Startup refreshed Boosty/Discord but not Patreon | Both connected providers are automatically verified when their snapshot is stale (15 minutes) or an entitlement expired after the last sync. |
| An open tab retained stale access | Only notification polling/visibility refresh existed | Minute lifecycle check, plus tab-return and connectivity recovery; compare last-known entitlement signatures to catch expiry even when no provider grant is renewed. |
| Auth callbacks could hang reads | Async Supabase queries were awaited inside `onAuthStateChange` | Synchronous callback, deferred network work, auth-event revision guards. Supabase documents this [deadlock risk](https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0). |
| Transient account-read failure erased known access | Entitlement/connection error paths reset arrays | Bound reads, retain prior known state on temporary errors, reject late cross-account responses. Date checks and server chapter authorization still apply. |
| Recovery exposed technical errors / repeated work | Provider invocation had no client deadline or single-flight gate | 10-second invocation timeout supported by the pinned SDK, per-user/provider coalescing, freshness/cooldown checks, and sanitized unavailable/reconnect outcomes. Failed automatic checks back off five minutes. |
| Attempting a locked chapter immediately sent the reader to connection options | Delegated `data-lock` handler opened the gate without rechecking membership | Check connected membership first; open automatically if the catalog grants access. A dismissible checking sheet owns the completion so cancellation/navigation prevents late auto-navigation. |

Access-only catalog refresh fetches all existing story catalogs before updating their chapters in place. It preserves loaded authorized text and only clears newly denied/unpublished text, without replacing the library or resetting reader scroll. A secure chapter fetch denied after an earlier grant gets one automatic provider recovery attempt; server denial then updates the chapter's label instead of leaving it unlocked.

## Remaining risks / next audit work

These are not asserted to be the cause of every reader complaint. They require focused inspection or runtime reproduction.

1. **Provider backend lifecycle (high priority).** Native Patreon webhook handling and scheduled reconciliation remain unfinished in existing project state. Page visits now trigger refresh locally, but users who never return do not get automatic server reconciliation. Review and deploy a backend-owned renewal/revoke pipeline, with per-user/provider serialization to avoid cross-tab token-refresh races. The browser coalescing gate only covers one page.
2. **Provider authorization classification (high priority).** The current Edge Function reports many refresh/identity failures as HTTP 500; only explicit `connect_required` can be accurately distinguished client-side. Add safe machine-readable codes for invalid/revoked refresh tokens versus network/rate-limit errors, and retry an expired access token once after refresh even if the stored expiration is misleading. This requires an Edge Function rollout, not just a reader deploy.
3. **Full library refresh concurrency/error preservation.** `loadBackendLibrary()` returns early while another load is running and clears existing library data on a core failure. Inspect sign-in/sign-out, auth-timeout recovery, manual refresh, and offline transitions for discarded refresh requests or temporary disappearance of usable public data. A cached grant must never override a current server denial.
4. **Account-owned local state.** Reading progress/bookmarks/quotes and several flags use one browser storage key rather than a per-account namespace. Notification preferences/notification reads and other account writes need the same late-response/account-switch audit as entitlement reads. Preserve compatibility while designing any migration.
5. **Gated gallery refresh.** Access-only catalog reconciliation does not reload mature gallery rows that RLS excluded before a membership renewal. New eligibility may require a library refresh. Audit this independently without interrupting lightboxes or ongoing reading.
6. **Reader rendering/content paths.** Audit direct links, unpublished/empty chapters, NSFW/external URLs, malformed rich-text blocks, comments/reactions, progress/history recording on loading/locked routes, and pending-write dismissal. Do not claim a support/health-check route can diagnose issues until its real checks are verified.
7. **Misleading affordances and copy.** The Shelf advertises an offline queue although its action reports offline reading unavailable; some recovery actions point to generic sheets. Inventory and remove unsupported promises instead of leaving attractive dead-end controls.
8. **Auth authority and mobile continuation.** Review frontend admin-role inference against the backend profile check; audit Google-to-provider continuation across mobile browser/app handoffs and lost local state. Backend RLS must remain authoritative.

## Release/verification gates

- Automated: current regression tests cover expiry, lower/higher tier labels, automatic stale checks, freshness/cooldowns, in-flight coalescing, provider outages, missing token outcomes, account-switch responses, lifecycle event bindings, callback scheduling, access-only content preservation, and recovery cancellation. Fixture tests do not verify Patreon billing or deployed Edge Functions.
- Owner-led signed-in checks: current patron with stale snapshot; renewed previously expired patron; canceled paid-through patron before/after expiry; upgrade/downgrade; connected free patron; expired/revoked OAuth token; wrong site account; sign-out/account switch while requests are pending.
- Reader checks: direct latest-chapter link, Home/catalog/reader label agreement, tab return, reconnect after offline, slow provider/429/500, canceled checking sheet, same chapter on two tabs, comments and scroll remaining intact during background verification.
- Confirm deployed assets use the new query versions and inspect actual sync/chapter outcomes. This local pass performs no privileged resync, entitlement extension, production schema change, or deployment.
