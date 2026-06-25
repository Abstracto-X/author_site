# TODO For The New Independent Subscription Site

## P0 - Required before public launch

- [ ] Create new Supabase project.
- [ ] Run `database/sql/2026-06-23_reader_subscription_access.sql`.
- [ ] Run `database/sql/2026-06-24_provider_oauth_tokens.sql` if Patreon is enabled.
- [ ] Run `database/sql/999_check_subscription_install.sql` and confirm required objects exist.
- [ ] Create real config from `site/js/subscription/site-config.template.js`.
- [ ] Replace hardcoded Supabase URL/key in `site/js/subscription/aether-app.js`.
- [ ] Replace hardcoded Supabase URL/key in `site/admin.html` or remove admin until replaced.
- [ ] Replace/remove Abstracto-specific branding.
- [ ] Disable or implement `external-archive` actions.
- [ ] Disable `#/studio` preview unless intentionally keeping it.
- [ ] Disable production fixture fallback.
- [ ] Enable Supabase Auth email/password.
- [ ] Enable Google OAuth if using it.
- [ ] Add redirect allow-list URLs for new domain.
- [ ] Seed at least one story and chapter.
- [ ] Create at least one access tier.
- [ ] Test free chapter read.
- [ ] Test locked chapter gate.
- [ ] Test access-key redemption.
- [ ] Test Google OAuth return.
- [ ] Verify locked chapter content is not returned to unauthorized users.

## P1 - Strongly recommended

- [ ] Decide whether to keep full `admin.html` temporarily or build a minimal subscription admin.
- [ ] Create UI copy for no backend/maintenance state.
- [ ] Add provider mapping helper text for Patreon tier IDs.
- [ ] Add entitlement audit/log viewer.
- [ ] Add account page display for tier, provider, expiry, last sync time.
- [ ] Wire support/contact/Discord links to real destinations or hide them.
- [ ] QA desktop/tablet/mobile layouts.
- [ ] QA all background modes with real artwork.

## P2 - Later

- [ ] Split `aether-app.js` into maintainable modules.
- [ ] Persist reading progress to Supabase.
- [ ] Persist bookmarks/quotes if desired.
- [ ] Add comments/reactions tables if desired.
- [ ] Add Ko-fi adapter.
- [ ] Add PayPal adapter.
- [ ] Add Discord role adapter.
- [ ] Add analytics dashboard or remove demo analytics.
