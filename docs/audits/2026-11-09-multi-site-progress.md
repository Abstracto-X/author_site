# Multi-site implementation progress audit

Not a completion certificate. Reviewed current code, current 150-test suite and plan register on 2026-11-09. Live target checks explicitly deferred by owner; manual browser gates are not covered by Node tests.

| Plan findings | Current evidence / remaining work |
|---|---|
| F01–F04 | Settings resolver/bootstrap precede all clients; explicit pairing, repo identity/links/provider flags, neutral HTML. Bootstrap does not yet provide a full-screen setup gate when dependencies themselves fail. |
| F05–F06, F27 | ID-scoped colors/banners/frame definitions/allowed IDs, actual tier catalog, current entitlement checks, neutral unknown tiers. Tests cover rename, unknown, alternate profile, unsafe values. Live downgrade/expiry/browser proof still required. |
| F07–F08 | Repo assets and story-scoped ornate allowlist; source chapter70 behavior tested. Source decorative CSS/resources remain shared assets rather than a complete optional per-site CSS resource loader. Need appearance/resource audit before claiming complete portability. |
| F09–F10 | Explicit real primary/featured selection, documented newest-created fallback. Shared gallery shuffle/bounds preserved. |
| F11, F29 | Hardcoded author support names removed; core route/actions retained. Provider-specific instruction composition/optional local copy registry remains incomplete. |
| F12–F13 | Site/backend/account namespaces, deliberate guest migration, private author legacy export, stale response guards. Recent guest provider continuation now transfers once. Reader preference preservation and complete author pending-write/stream lifecycle still require work/verification. |
| F14–F16 | Validated public roots/reader links, same-origin auth callbacks, generic rank audience, opt-in source test tool. Target allowlists/RPC deployment unverified. |
| F17–F19 | Historical/source-specific migrations preserved and excluded by runbook, inactive system UI not restored. Target schema/RLS/Storage/Edge/provider reconciliation deferred, not implemented or verified. |
| F20–F21 | Neutral email brand fallback; complete directly referenced Edge environment-variable names documented in ENV.example, supported summary model retained. Real sender/Auth template/scheduler/AI configuration pending per deployment. No Edge redeployment performed. |
| F22 | Offline preflight and deployment runbook exist; source backup automation still source-specific. Independent target operational setup required; do not run source backup against target. |
| F23 | Existing tests retained/updated for intentional contracts; alternate identities, tier counts and account races added. Not a full two-deployment browser/system test. |
| F24–F26 | No DB code/CSS execution, sanitization preserved, trusted-only UI roles, Admin appearance marked repo-owned. Content/admin workflows preserved. Live backend policy/access certification pending. |
| F28 | Rank summary and nonbackend explicit-rank gate, no magic-name access or fabricated dates. Legacy internal persona IDs remain for compatibility, not actual grants. |
| F30 | Neutral new-story loader. Remaining styling-only Admin story fields/resource ownership need explicit classification; no framework/build/dependencies added. |

## Next work in priority order

1. Fix remaining configuration dependency/setup gates and complete provider-copy/resource boundaries.
2. Audit author pending writes/streams on account changes and preference migration without assigning unowned private data.
3. Finish owner-facing deployment/backup target inputs and requirement-level acceptance evidence.
4. Once owner supplies target connection/config, perform deferred compatibility/migration review and manual two-site auth/access/visual rollout matrix. Never infer completion from offline tests.
