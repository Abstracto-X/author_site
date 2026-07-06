# Subscription Reader Function Index

Generated from the current codebase. One-line descriptions are intentionally concise so agents can quickly locate ownership before editing.

Recent CMS rebuild reader changes:

| File | Function | Purpose |
|---|---|---|
| `js/subscription/backend.js` | `textToBlocks(value)` | Preserves safe basic rich chapter HTML from Supabase while stripping scripts/styles/iframes and unsupported tags. |
| `js/subscription/config.js` | `applySiteSettings(rows)` | Applies Admin-authored `reader_behavior` so guide toggles and external fallback settings affect the reader runtime. |
| `js/subscription/views/story-reader.js` | `readerExternalChapter(ch, story, index, r)` | Renders NSFW/external-only chapters as an external-link prompt instead of local content. |
| `js/subscription/router.js` | `parseHash()` | Redirects `/studio/*` to `admin.html`; the reader-side Author Studio prototype is inactive. |

## `js/subscription/config.js`

| Line | Function | Purpose |
|---:|---|---|
| 5 | `MemStore(()` | Helper used by this module. |
| 6 | `getStore()` | Helper used by this module. |
| 55 | `settingText(value, fallback)` | Normalizes site setting values from JSON or strings. |
| 63 | `applySiteSettings(rows)` | Applies `site_settings` identity and `reader_behavior` values to the reader runtime. |
| n/a | `readerBehavior()` | Returns the currently applied reader behavior settings. |
| n/a | `readerExternalUrl(fallback)` | Returns the Admin-configured global external fallback URL when present. |
| 74 | `feature(name, fallback)` | Helper used by this module. |
| 75 | `providerEnabled(name)` | Helper used by this module. |
| 76 | `googleEnabled()` | Helper used by this module. |
| 77 | `emailPasswordEnabled()` | Coordinates authentication/session behavior. |
| 78 | `patreonEnabled()` | Helper used by this module. |
| 79 | `accessKeysEnabled()` | Helper used by this module. |
| 80 | `mainArchiveEnabled()` | Helper used by this module. |
| 81 | `configuredSupabase()` | Helper used by this module. |
| 62 | `byId(id)` | Returns a DOM element by id. |
| 64 | `now()` | Helper used by this module. |

## `js/subscription/state.js`

| Line | Function | Purpose |
|---:|---|---|
| 17 | `defaultStore()` | Helper used by this module. |
| 41 | `loadStore()` | Loads fresh data/state from Supabase or local runtime state. |
| 42 | `saveStore()` | Persists changes to Supabase or updates local state. |

## `js/subscription/auth.js`

| Line | Function | Purpose |
|---:|---|---|
| 9 | `getSupabase()` | Helper used by this module. |
| 18 | `activeEntitlements()` | Helper used by this module. |
| 21 | `entitlementLevel()` | Helper used by this module. |
| 28 | `accountLabel()` | Helper used by this module. |
| 31 | `isAdmin()` | Helper used by this module. |
| 32 | `refreshProfile()` | Loads fresh data/state from Supabase or local runtime state. |
| 45 | `persona()` | Helper used by this module. |
| 53 | `refreshEntitlements()` | Loads fresh data/state from Supabase or local runtime state. |
| 76 | `authRedirectUrl()` | Coordinates authentication/session behavior. |
| 82 | `mergeOAuthParams(target, raw)` | Coordinates authentication/session behavior. |
| 91 | `oauthCallbackParams()` | Coordinates authentication/session behavior. |
| 102 | `cleanHashRoute(hash, fallbackRoute = "vault")` | Coordinates navigation or route rendering. |
| 113 | `cleanOAuthCallbackUrl()` | Coordinates authentication/session behavior. |
| 120 | `consumeOAuthCallback(client)` | Coordinates authentication/session behavior. |
| 144 | `initAuth()` | Coordinates authentication/session behavior. |
| 185 | `signInWithPassword(email, password)` | Coordinates authentication/session behavior. |
| 200 | `signUpWithPassword(email, password)` | Coordinates authentication/session behavior. |
| 213 | `sendPasswordReset(email)` | Coordinates authentication/session behavior. |
| 221 | `updateReaderPassword(password)` | Persists changes to Supabase or updates local state. |
| 233 | `subscriptionRedirectTo()` | Helper used by this module. |
| 248 | `signInWithGoogle(nextAction = "")` | Coordinates authentication/session behavior. |
| 272 | `signOutReader()` | Helper used by this module. |
| 288 | `syncProviderEntitlements()` | Helper used by this module. |
| 302 | `requestPatreonOAuth()` | Coordinates authentication/session behavior. |

## `js/subscription/author-studio.js`

| Line | Function | Purpose |
|---:|---|---|
| 35 | `e(value)` | Helper used by this module. |
| 36 | `attr(value)` | Helper used by this module. |
| 37 | `ic(name)` | Helper used by this module. |
| 38 | `stamp()` | Helper used by this module. |
| 39 | `niceTime(iso)` | Helper used by this module. |
| 46 | `wordsFromText(text)` | Helper used by this module. |
| 49 | `textFromHtml(html)` | Helper used by this module. |
| 54 | `countWordsFromHtml(html)` | Helper used by this module. |
| 55 | `estimateReadMinutes(words)` | Helper used by this module. |
| 56 | `safeSlug(value)` | Helper used by this module. |
| 59 | `safeFileName(value)` | Helper used by this module. |
| 62 | `storyList()` | Handles story data or story-facing UI behavior. |
| 63 | `storyByDraft(draft)` | Handles story data or story-facing UI behavior. |
| 66 | `bucketName()` | Helper used by this module. |
| 71 | `ensureAuthorState()` | Coordinates authentication/session behavior. |
| 88 | `save()` | Persists changes to Supabase or updates local state. |
| 89 | `nextChapterOrder(story)` | Handles chapter catalog, reader, or chapter form behavior. |
| 94 | `makeDraft(seed)` | Helper used by this module. |
| 124 | `currentDraft()` | Helper used by this module. |
| 128 | `setActiveDraft(id)` | Helper used by this module. |
| 137 | `mutateDraft(fn, noSave)` | Helper used by this module. |
| 148 | `scheduleSave()` | Persists changes to Supabase or updates local state. |
| 159 | `sanitizeUrl(url)` | Escapes or normalizes unsafe/display text. |
| 165 | `sanitizeEditorHtml(html)` | Escapes or normalizes unsafe/display text. |
| 202 | `readerHtmlForDraft(draft)` | Helper used by this module. |
| 205 | `plainExcerpt(draft)` | Helper used by this module. |
| 209 | `patchRouter()` | Coordinates navigation or route rendering. |
| 217 | `name({ write:"studioWrite", chapters:"studioChapters", access:"studioAccess", announcements:"studioAnnouncements", media:"studioMedia", analytics:"studioAnalytics", settings:"studioSettings" })` | Helper used by this module. |
| 283 | `dashboardMetrics()` | Helper used by this module. |
| 291 | `kpi(label, value, detail, icon)` | Helper used by this module. |
| 294 | `draftStatusBadge(draft)` | Helper used by this module. |
| 299 | `draftRows(limit)` | Helper used by this module. |
| 311 | `studioDashboardView()` | Helper used by this module. |
| 357 | `storyOptions(draft)` | Handles story data or story-facing UI behavior. |
| 360 | `accessOptions(draft)` | Helper used by this module. |
| 371 | `statusOptions(draft)` | Helper used by this module. |
| 374 | `commandMenuHtml()` | Helper used by this module. |
| 377 | `studioWriteView()` | Helper used by this module. |
| 435 | `studioWorksView()` | Helper used by this module. |
| 450 | `studioMediaView()` | Helper used by this module. |
| 459 | `registerViews()` | Helper used by this module. |
| 467 | `afterStudioRender()` | Builds and returns or injects the HTML for this UI section. |
| 491 | `saveCurrentRange()` | Persists changes to Supabase or updates local state. |
| 498 | `restoreRange()` | Helper used by this module. |
| 510 | `onEditorPaste(evt)` | Helper used by this module. |
| 518 | `onEditorInput()` | Helper used by this module. |
| 521 | `onEditorKeydown(evt)` | Helper used by this module. |
| 544 | `moveMenu(delta)` | Helper used by this module. |
| 551 | `showCommandMenu()` | Helper used by this module. |
| 565 | `hideCommandMenu()` | Helper used by this module. |
| 570 | `caretRect()` | Helper used by this module. |
| 587 | `deleteSlashToken()` | Deletes/removes the selected item or UI state. |
| 603 | `insertHtmlAtCaret(html)` | Persists changes to Supabase or updates local state. |
| 620 | `runCommand(id)` | Helper used by this module. |
| 624 | `paragraph()` | Helper used by this module. |
| 625 | `heading()` | Helper used by this module. |
| 626 | `quote()` | Helper used by this module. |
| 627 | `divider()` | Helper used by this module. |
| 628 | `callout()` | Helper used by this module. |
| 631 | `link()` | Helper used by this module. |
| 632 | `poll()` | Helper used by this module. |
| 633 | `spoiler()` | Helper used by this module. |
| 634 | `lore()` | Helper used by this module. |
| 635 | `button()` | Helper used by this module. |
| 640 | `insertImage(url, caption)` | Persists changes to Supabase or updates local state. |
| 646 | `insertImageFromUrl()` | Persists changes to Supabase or updates local state. |
| 652 | `insertPoll()` | Persists changes to Supabase or updates local state. |
| 662 | `insertLink()` | Persists changes to Supabase or updates local state. |
| 672 | `insertButtonLink()` | Persists changes to Supabase or updates local state. |
| 680 | `openImagePicker()` | Opens the related modal, sheet, route, or external flow. |
| 684 | `uploadImage(file)` | Loads fresh data/state from Supabase or local runtime state. |
| 709 | `updateSaveStatus(text)` | Persists changes to Supabase or updates local state. |
| 717 | `refreshLiveStats(shouldSave = true)` | Loads fresh data/state from Supabase or local runtime state. |
| 738 | `onFieldInput(el)` | Helper used by this module. |
| 740 | `mutateDraft(draft => { if (field === "storyId")` | Helper used by this module. |
| 756 | `notify(title, sub, kind, iconName)` | Helper used by this module. |
| 759 | `saveDraftToSupabase()` | Persists changes to Supabase or updates local state. |
| 795 | `copyTextToClipboard(text)` | Helper used by this module. |
| 804 | `exportHtml()` | Helper used by this module. |
| 809 | `createNewDraft()` | Persists changes to Supabase or updates local state. |
| 816 | `duplicateDraft()` | Helper used by this module. |
| 825 | `deleteDraft()` | Deletes/removes the selected item or UI state. |
| 835 | `handleStudioAct(act, el)` | Handles a delegated event, route, or async workflow. |
| 844 | `handleAsAction(action, el)` | Handles a delegated event, route, or async workflow. |

## `js/subscription/backend.js`

| Line | Function | Purpose |
|---:|---|---|
| 6 | `estimateReadTime(row)` | Helper used by this module. |
| 10 | `colorPair(row, index)` | Helper used by this module. |
| 15 | `normalizeBackendStory(row, index)` | Handles story data or story-facing UI behavior. |
| 40 | `backendStateToAether(row)` | Helper used by this module. |
| 48 | `textToBlocks(value)` | Helper used by this module. |
| 63 | `normalizeBackendChapter(row, story)` | Handles chapter catalog, reader, or chapter form behavior. |
| 88 | `buildBackendUpdates(stories)` | Persists changes to Supabase or updates local state. |
| 110 | `relativeTime(iso)` | Formats comment timestamps for reader display. |
| 120 | `normalizeBackendComment(row)` | Normalizes Supabase comment rows into reader note objects. |
| 137 | `applyReactionRows(chapterId, rows)` | Aggregates Supabase chapter reaction rows into reader reaction counts. |
| 148 | `loadChapterCommunity(chapterId, options = {})` | Loads chapter comments and reaction totals from Supabase. |
| 187 | `postChapterComment(chapterId, text, para)` | Persists a signed-in reader note to Supabase comments. |
| 210 | `saveChapterReaction(chapterId, reaction)` | Persists or removes a signed-in reader chapter reaction. |
| 103 | `loadSiteSettings()` | Loads reader identity/settings from Supabase `site_settings`. |
| 119 | `loadBackendLibrary(options = {})` | Loads fresh data/state from Supabase or local runtime state. |
| 168 | `loadReaderChapterFromBackend(chapterId)` | Loads fresh data/state from Supabase or local runtime state. |

## `js/subscription/utils.js`

| Line | Function | Purpose |
|---:|---|---|
| 13 | `applyTheme()` | Helper used by this module. |
| 14 | `setTheme(id)` | Helper used by this module. |
| 18 | `chapterResolved(ch)` | Handles chapter catalog, reader, or chapter form behavior. |
| 43 | `gateDisplay(ch)` | Helper used by this module. |
| 50 | `reasonFor(ch, r)` | Helper used by this module. |
| 57 | `isReadable(r)` | Helper used by this module. |
| 58 | `hasImages(ch)` | Handles image preview/upload/storage URL behavior. |
| 120 | `icon(n, cls)` | Helper used by this module. |
| 123 | `coverArt(s)` | Helper used by this module. |
| 132 | `poly(cx,cy,r,n,fill,op)` | Helper used by this module. |
| 145 | `badge(kind, text)` | Helper used by this module. |
| 146 | `chip(label, act, active, svg)` | Helper used by this module. |
| 147 | `storyAccentVars(s)` | Handles story data or story-facing UI behavior. |
| 148 | `hexA(hex,a)` | Helper used by this module. |
| 150 | `accessTag(r)` | Helper used by this module. |
| 165 | `axInline(r)` | Helper used by this module. |
| 167 | `progressBar(pct)` | Helper used by this module. |
| 168 | `ring(pct)` | Helper used by this module. |
| 170 | `commentCount(chId)` | Helper used by this module. |
| 171 | `paraComments(chId, p)` | Helper used by this module. |
| 173 | `ctaFor(ch, r, story, opts)` | Helper used by this module. |
| 187 | `fmtDate(iso)` | Helper used by this module. |
| 188 | `daysUntil(iso)` | Helper used by this module. |
| 189 | `setStoryAccent(s)` | Handles story data or story-facing UI behavior. |
| 190 | `meta(items)` | Helper used by this module. |
| 191 | `countReadable()` | Helper used by this module. |
| 192 | `activeReads()` | Helper used by this module. |
| 193 | `totalComments()` | Helper used by this module. |
| 196 | `storyCard(s)` | Handles story data or story-facing UI behavior. |
| 207 | `storyCardWide(s)` | Handles story data or story-facing UI behavior. |

## `js/subscription/chrome.js`

| Line | Function | Purpose |
|---:|---|---|
| 5 | `brandMark()` | Helper used by this module. |
| 7 | `topbar()` | Helper used by this module. |
| 21 | `bottomnav(active)` | Coordinates navigation or route rendering. |
| 25 | `sidenav(active)` | Coordinates navigation or route rendering. |
| 29 | `announcement()` | Helper used by this module. |
| 32 | `toast(title, sub, opts)` | Displays a transient status message. |

## `js/subscription/router.js`

| Line | Function | Purpose |
|---:|---|---|
| 6 | `parseHash()` | Helper used by this module. |
| 32 | `nav(path)` | Coordinates navigation or route rendering. |
| 35 | `backendSetupRequired()` | Helper used by this module. |
| 36 | `backendSetupView()` | Helper used by this module. |
| 42 | `render()` | Builds and returns or injects the HTML for this UI section. |
| 51 | `apply()` | Helper used by this module. |
| 66 | `adminGate()` | Helper used by this module. |
| 69 | `prefersReducedMotion()` | Helper used by this module. |
| 72 | `ensureChrome()` | Helper used by this module. |
| 92 | `ensureStudioChrome()` | Helper used by this module. |
| 101 | `studioTop()` | Helper used by this module. |

## `js/subscription/views/home-library.js`

| Line | Function | Purpose |
|---:|---|---|
| 86 | `accessBanner(kind,title,sub,link,label)` | Helper used by this module. |
| 94 | `memberArchivePanel()` | Helper used by this module. |
| 113 | `updateRow(u)` | Persists changes to Supabase or updates local state. |
| 131 | `matches(s)` | Helper used by this module. |
| 197 | `bookHero(s, o)` | Helper used by this module. |
| 202 | `buildBookFeed(s)` | Helper used by this module. |
| 208 | `themeSwatches()` | Helper used by this module. |

## `js/subscription/views/story-reader.js`

| Line | Function | Purpose |
|---:|---|---|
| 211 | `getLockTierClass(ch)` | Helper to get CSS class name (`tier-tyrant`/`tier-licker`/`tier-standard`) based on chapter required access tier. |
| 218 | `getLockColor(ch)` | Helper to get border/shadow/icon color based on chapter required access tier. |
| 225 | `chapterGridCard(ch, story)` | Renders a premium card for the chapter catalog grid. |
| 264 | `chapterRow(ch, story)` | Renders a table row in the story hub chapter list. |
| 321 | `readerShell(themeClass, inner, settings)` | Renders the global layout/shell for the reader stage. |
| 335 | `readerBar()` | Renders the bottom navigation bar for settings/reactions/comments. |
| 348 | `renderBlocks(blocks, chId)` | Builds and returns or injects the HTML for the chapter blocks. |
| 359 | `readerNavButtons(ch, story, index)` | Renders standard next/previous/book navigation buttons at start/end of chapter. |
| 380 | `readerFull(ch, story, index, r)` | Renders full unlocked chapter contents and comments. |
| 401 | `readerPreview(ch, story, index, r)` | Renders chapter preview mode with preview-wall. |
| 429 | `readerLocked(ch, story, index, r)` | Renders lock fallback state when reader lacks tier access. |
| 447 | `endOfChapter(ch, story, next, nr)` | Renders comments/bookmarks/reactions footer under chapter content. |
| 468 | `commentsBlock(chId)` | Renders reader notes list and submission form. |
| 476 | `commentHTML(c)` | Renders individual reader note comment card. |

## `js/subscription/views/account-access.js`

| Line | Function | Purpose |
|---:|---|---|
| 79 | `providerCard(name, key, connected, tier, since, note)` | Helper used by this module. |
| 86 | `maskKey(c)` | Helper used by this module. |

## `js/subscription/views/help-support.js`

| Line | Function | Purpose |
|---:|---|---|
| 58 | `notFound(what)` | Helper used by this module. |
| 59 | `emptyState(ic,title,sub)` | Helper used by this module. |

## `js/subscription/sheets.js`

| Line | Function | Purpose |
|---:|---|---|
| 6 | `openSheet(builder, opts)` | Opens the related modal, sheet, route, or external flow. |
| 17 | `closeSheet(silent)` | Closes the related modal, sheet, or transient UI. |
| 26 | `sheetSettings()` | Builds or controls bottom-sheet/modal content. |
| 43 | `toggleRow(key,title,sub,on)` | Helper used by this module. |
| 45 | `sheetPersona()` | Builds or controls bottom-sheet/modal content. |
| 56 | `sheetSignup()` | Coordinates authentication/session behavior. |
| 61 | `sheetForgotPassword()` | Coordinates authentication/session behavior. |
| 65 | `sheetUpdatePassword()` | Persists changes to Supabase or updates local state. |
| 69 | `sheetLock(chId)` | Builds or controls bottom-sheet/modal content. |
| 82 | `sheetRedeem()` | Builds or controls bottom-sheet/modal content. |
| 86 | `sheetConnectPatreon()` | Builds or controls bottom-sheet/modal content. |
| 92 | `sheetContext()` | Builds or controls bottom-sheet/modal content. |
| 108 | `sheetParaComments(chId, p)` | Builds or controls bottom-sheet/modal content. |
| 114 | `sheetImage(fig, cap)` | Handles image preview/upload/storage URL behavior. |

## `js/subscription/events.js`

| Line | Function | Purpose |
|---:|---|---|
| 5 | `toggleFollow(id)` | Helper used by this module. |
| 6 | `setReaction(chId,k)` | Helper used by this module. |
| 7 | `toggleBookmark()` | Helper used by this module. |
| 8 | `toggleMarkRead()` | Helper used by this module. |
| 9 | `saveQuote()` | Persists changes to Supabase or updates local state. |
| 10 | `rememberReturn()` | Helper used by this module. |
| 11 | `connectPatreonGo()` | Helper used by this module. |
| 26 | `redeemKey(code)` | Helper used by this module. |
| 52 | `copyText(t)` | Helper used by this module. |
| 55 | `renderReaderOnly()` | Builds and returns or injects the HTML for this UI section. |
| 64 | `updateReaderBar()` | Persists changes to Supabase or updates local state. |
| 68 | `afterRender()` | Builds and returns or injects the HTML for this UI section. |
| 75 | `setupReader()` | Helper used by this module. |
| 84 | `onScroll()` | Helper used by this module. |
| 105 | `goReaderChapter(dir)` | Handles chapter catalog, reader, or chapter form behavior. |
| 112 | `handleAttr(el, name, val)` | Handles a delegated event, route, or async workflow. |
| 115 | `delegate()` | Helper used by this module. |
| 193 | `renderHeaderless()` | Builds and returns or injects the HTML for this UI section. |
| 196 | `ensureQuoteFab(show)` | Helper used by this module. |
| 198 | `handleAct(act, el)` | Handles a delegated event, route, or async workflow. |

## `js/subscription/onboarding.js`

| Line | Function | Purpose |
|---:|---|---|
| 44 | `enabled()` | Checks whether reader guide walkthroughs are feature-enabled. |
| 47 | `dismissed()` | Reads local dismiss state for the reader guide. |
| 50 | `routeName()` | Determines the current route for contextual guide steps. |
| 53 | `visible(el)` | Checks whether a potential guide target is currently visible. |
| 58 | `stepsForRoute()` | Selects guide steps relevant to the current route. |
| 62 | `clear()` | Removes guide highlight and overlay UI. |
| 67 | `dismiss()` | Dismisses the guide and persists that choice locally. |
| 72 | `renderStep()` | Renders the current highlighted guide step. |
| 97 | `start()` | Starts the reader guide walkthrough. |
| 103 | `afterRender()` | Repositions/renders the guide after route rendering. |

## `js/subscription/views/studio-preview.js`

| Line | Function | Purpose |
|---:|---|---|
| 4 | `studioAdminRedirect(title, body)` | Helper used by this module. |

## `js/subscription/aether-app.js`

| Line | Function | Purpose |
|---:|---|---|
| 5 | `init()` | Initializes this module or application surface. |


## 2026-07-06 01:53 Asia/Kolkata - Standalone Writer route bridge

- `js/subscription/router.js` redirects `/studio/write` and `/studio/chapters` to `writer.html`; other `/studio/*` paths continue to send users toward Admin CMS.
- Admin-only reader chrome/account/home links now expose `writer.html` as a direct Writer entry point while preserving normal reader separation.


## 2026-07-07 00:00 Asia/Kolkata - Reader system-message rendering

- `js/subscription/backend.js` preserves saved Writer `div.sys-msg-box` blocks as `system` chapter blocks instead of flattening them into normal paragraphs.
- `js/subscription/views/story-reader.js` renders `system` blocks as `.reader-system-message`; `styles.css` carries the same SVG system screen border concept from Writer into the reader.
