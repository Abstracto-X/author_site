# Admin CMS Function Index

Generated from the current codebase. One-line descriptions are intentionally concise so agents can quickly locate ownership before editing.

## `admin.html`

| Line | Function | Purpose |
|---:|---|---|
| n/a | `Utils.htmlToPlainText(html)` | Extracts text for editor word counts and previews. |
| n/a | `Utils.markdownInlineToHtml(text)` | Converts safe inline Markdown emphasis/code markers into editor HTML. |
| n/a | `Utils.markdownToChapterHtml(markdown)` | Converts pasted/plain Markdown chapter input into sanitized chapter HTML with paragraphs, breaks, headings, quotes, lists, and scene breaks. |
| n/a | `Utils.sanitizeChapterHtml(html)` | Whitelists safe chapter formatting before saving/rendering. |
| n/a | `Utils.removeExtraChapterBreaks(html)` | Removes empty paragraph/break filler from chapter HTML and converts standalone `--` markers to scene breaks. |
| n/a | `Utils.normalizeEditorHtml(html)` | Normalizes editor HTML or plain/Markdown text before displaying or saving chapter content. |
| n/a | `Utils.makePreviewFromHtml(html, max = 340)` | Builds a teaser from rich chapter HTML. |
| n/a | `DB.getStoryAccessPolicy(storyId)` | Loads a story rolling-access policy. |
| n/a | `DB.getStoryAccessPolicies()` | Loads rolling-access policies for the Admin cockpit. |
| n/a | `DB.saveStoryAccessPolicy(storyId, rules, enabled = true)` | Persists per-story rolling-access rules. |
| n/a | `DB.recalculateStoryAccess(storyId)` | Applies rolling tier windows to published non-NSFW chapters. |
| n/a | `DB.getReaderProfiles()` | Loads reader profiles for CRM. |
| n/a | `DB.getProviderConnections()` | Loads provider connection visibility for CRM. |
| n/a | `DB.getAccessRedemptions()` | Loads access key redemption history. |
| n/a | `DB.getEntitlementAuditLog()` | Loads entitlement audit events. |
| n/a | `DB.getCommunityComments()` | Loads recent reader comments for moderation/read view. |
| n/a | `DB.getReactionTotals()` | Loads chapter reaction rows for aggregate display. |
| n/a | `Forms.editorCommand(cmd)` | Runs rich editor inline formatting commands. |
| n/a | `Forms.editorBlock(tag)` | Applies rich editor block styles. |
| n/a | `Forms.insertSceneBreak()` | Inserts a scene break into the rich chapter editor. |
| n/a | `Forms.removeExtraLineBreaks()` | Cleans the active chapter editor by removing blank lines between paragraphs. |
| n/a | `Forms.clearEditorFormatting()` | Removes rich editor inline formatting. |
| n/a | `Forms.handleEditorPaste(event)` | Handles chapter editor paste, preserving rich HTML or converting plain Markdown/text into safe chapter HTML. |
| n/a | `Forms.normalizeEditorNow()` | Normalizes the active chapter editor to safe HTML immediately before save. |
| n/a | `Forms.isMeaningfulEditorHtml(html)` | Detects whether editor/autosave content contains real text instead of only browser filler like non-breaking spaces. |
| n/a | `Forms.convertMarkdownEditor()` | Converts the current editor text from Markdown into safe chapter HTML on demand. |
| n/a | `Forms.showWriterPanel(panel = 'write')` | Switches Writer / Chapters between focused Write, Access, and Teaser panels without re-rendering. |
| n/a | `Forms.saveRollingPolicy()` | Saves and applies rolling-access policy inputs. |
| n/a | `Forms.recalculateRollingNow()` | Reapplies the selected story rolling-access policy. |
| n/a | `Forms.saveReaderBehavior()` | Persists reader guide/provider/external fallback behavior defaults plus reader background image URL/toggle under `site_settings.reader_behavior`. |
| n/a | `Forms.saveInlineChapter(id, publishOverride = null)` | Saves the inline/fullscreen Writer / Chapters editor and triggers rolling access recalculation. |
| n/a | `Forms.chapterForm(id = null)` | Redirects legacy chapter form calls into the inline/fullscreen Writer / Chapters editor. |
| n/a | `Views.rollingAccess(container)` | Renders per-story tier window editor and chapter access matrix. |
| n/a | `Views.readers(container)` | Renders reader CRM, provider, redemption, and audit data. |
| n/a | `Views.community(container)` | Renders comments and reaction totals. |
| n/a | `Views.storyExtras(container)` | Renders secondary links for world-building/extras tools. |
| n/a | `Views.chapters(container)` | Rebuilt Writer / Chapters view with story selector, collapsible tier-aware chapter rail, focused manuscript editor with inline chapter index, and Access/Teaser panels. |
| 1142 | `escapeHtml(unsafe)` | Escapes or normalizes unsafe/display text. |
| 1151 | `escapeAttr(unsafe)` | Escapes or normalizes unsafe/display text. |
| 1158 | `formatRelativeDate(dateString)` | Formats a value for display. |
| 1168 | `isGalleryImagePublished(image)` | Handles image preview/upload/storage URL behavior. |
| 1169 | `isGalleryImageNsfw(image)` | Handles image preview/upload/storage URL behavior. |
| 1170 | `normalizeAccessKey(value)` | Admin CMS helper used by the single-file admin app. |
| 1171 | `generateAccessCode()` | Admin CMS helper used by the single-file admin app. |
| 1178 | `sha256Hex(value)` | Admin CMS helper used by the single-file admin app. |
| 1183 | `getImageUploadPayload(file, options = {})` | Loads fresh data/state from Supabase or local runtime state. |
| 1232 | `uploadImage(file, bucketName, folderPath = '', options = {})` | Loads fresh data/state from Supabase or local runtime state. |
| 1263 | `imageUploadField(id, label, currentValue, bucketName, multiple = false)` | Loads fresh data/state from Supabase or local runtime state. |
| 1289 | `handleFileSelection(input, listId, urlInputId)` | Handles a delegated event, route, or async workflow. |
| 1310 | `handleUrlInput(input, listId)` | Handles a delegated event, route, or async workflow. |
| 1329 | `clearPreviews(listId, urlInputId)` | Admin CMS helper used by the single-file admin app. |
| 1341 | `initDragAndDrop(id)` | Admin CMS helper used by the single-file admin app. |
| 1375 | `initTagComponent(elementId, initialTags = [])` | Admin CMS helper used by the single-file admin app. |
| 1402 | `renderChips()` | Builds and returns or injects the HTML for this UI section. |
| 1459 | `initTagAutocomplete(containerId, initialTags = [])` | Admin CMS helper used by the single-file admin app. |
| 1469 | `render()` | Builds and returns or injects the HTML for this UI section. |
| 1573 | `highlightItem(items)` | Admin CMS helper used by the single-file admin app. |
| 1582 | `addTag(tag)` | Admin CMS helper used by the single-file admin app. |
| 1616 | `getTagValues(containerId)` | Admin CMS helper used by the single-file admin app. |
| 1638 | `showLoading()` | Loads fresh data/state from Supabase or local runtime state. |
| 1639 | `hideLoading()` | Loads fresh data/state from Supabase or local runtime state. |
| 1640 | `showToast(message, type = 'success')` | Displays a transient status message. |
| 1650 | `setAdminWallpaper(url)` | Admin CMS helper used by the single-file admin app. |
| 1656 | `applyAdminWallpaper()` | Admin CMS helper used by the single-file admin app. |
| 1676 | `open(title, bodyHtml, footerHtml = '')` | Opens the related modal, sheet, route, or external flow. |
| 1688 | `close()` | Closes the related modal, sheet, or transient UI. |
| 1692 | `confirm(message)` | Admin CMS helper used by the single-file admin app. |
| 1708 | `init()` | Initializes this module or application surface. |
| 1742 | `loadProfile()` | Loads fresh data/state from Supabase or local runtime state. |
| 1778 | `showLoginView()` | Admin CMS helper used by the single-file admin app. |
| 1783 | `showAdminView()` | Admin CMS helper used by the single-file admin app. |
| 1789 | `login(email, password)` | Admin CMS helper used by the single-file admin app. |
| 1806 | `logout()` | Admin CMS helper used by the single-file admin app. |
| 1819 | `getStories()` | Admin CMS helper used by the single-file admin app. |
| 1823 | `getStory(id)` | Handles story data or story-facing UI behavior. |
| 1828 | `saveStory(id, record)` | Persists changes to Supabase or updates local state. |
| 1840 | `deleteStory(id)` | Deletes/removes the selected item or UI state. |
| 1847 | `getChapters(storyId)` | Handles chapter catalog, reader, or chapter form behavior. |
| 1851 | `getChapter(id)` | Handles chapter catalog, reader, or chapter form behavior. |
| 1856 | `saveChapter(id, record)` | Persists changes to Supabase or updates local state. |
| 1871 | `deleteChapter(id)` | Deletes/removes the selected item or UI state. |
| 1878 | `getCharacters(storyId)` | Admin CMS helper used by the single-file admin app. |
| 1882 | `getCharacter(id)` | Admin CMS helper used by the single-file admin app. |
| 1887 | `saveCharacter(id, record)` | Persists changes to Supabase or updates local state. |
| 1899 | `deleteCharacter(id)` | Deletes/removes the selected item or UI state. |
| 1906 | `getGalleryImages(characterId)` | Handles image preview/upload/storage URL behavior. |
| 1910 | `getStoryGalleryImages(storyId)` | Handles story data or story-facing UI behavior. |
| 1922 | `saveGalleryImage(id, record)` | Persists changes to Supabase or updates local state. |
| 1934 | `deleteGalleryImage(id)` | Deletes/removes the selected item or UI state. |
| 1941 | `getWallpapers(storyId)` | Admin CMS helper used by the single-file admin app. |
| 1945 | `saveWallpaper(id, record)` | Persists changes to Supabase or updates local state. |
| 1957 | `deleteWallpaper(id)` | Deletes/removes the selected item or UI state. |
| 1964 | `getLoreCategories(storyId)` | Admin CMS helper used by the single-file admin app. |
| 1968 | `getLoreEntries(storyId)` | Admin CMS helper used by the single-file admin app. |
| 1973 | `saveLoreEntry(id, record, categoryName, storyId)` | Persists changes to Supabase or updates local state. |
| 2011 | `deleteLoreEntry(id)` | Deletes/removes the selected item or UI state. |
| 2017 | `cleanOrphanedCategories()` | Admin CMS helper used by the single-file admin app. |
| 2033 | `getTimelineEvents(storyId)` | Admin CMS helper used by the single-file admin app. |
| 2037 | `saveTimelineEvent(id, record)` | Persists changes to Supabase or updates local state. |
| 2049 | `deleteTimelineEvent(id)` | Deletes/removes the selected item or UI state. |
| 2056 | `getMaps(storyId)` | Admin CMS helper used by the single-file admin app. |
| 2060 | `saveMap(id, record)` | Persists changes to Supabase or updates local state. |
| 2072 | `deleteMap(id)` | Deletes/removes the selected item or UI state. |
| 2079 | `getMapRequests()` | Admin CMS helper used by the single-file admin app. |
| 2086 | `getRequestItems(reqId)` | Admin CMS helper used by the single-file admin app. |
| 2094 | `updateRequestStatus(reqId, status, feedback = '')` | Persists changes to Supabase or updates local state. |
| 2102 | `deleteMapRequest(reqId)` | Deletes/removes the selected item or UI state. |
| 2107 | `approveMapRequest(reqId)` | Admin CMS helper used by the single-file admin app. |
| 2145 | `getAccessTiers()` | Admin CMS helper used by the single-file admin app. |
| 2150 | `saveAccessTier(id, record)` | Persists changes to Supabase or updates local state. |
| 2160 | `deleteAccessTier(id)` | Deletes/removes the selected item or UI state. |
| 2164 | `getAccessKeys()` | Admin CMS helper used by the single-file admin app. |
| 2172 | `saveAccessKey(record)` | Persists changes to Supabase or updates local state. |
| 2177 | `updateAccessKey(id, record)` | Persists changes to Supabase or updates local state. |
| 2182 | `getEntitlements()` | Admin CMS helper used by the single-file admin app. |
| 2190 | `saveEntitlement(record)` | Persists changes to Supabase or updates local state. |
| 2195 | `updateEntitlement(id, record)` | Persists changes to Supabase or updates local state. |
| 2200 | `findProfileForAccess(query)` | Admin CMS helper used by the single-file admin app. |
| 2213 | `getProviderMappings()` | Admin CMS helper used by the single-file admin app. |
| 2222 | `saveProviderMapping(id, record)` | Persists changes to Supabase or updates local state. |
| 2234 | `getSettings()` | Admin CMS helper used by the single-file admin app. |
| 2238 | `saveSetting(id, record)` | Persists changes to Supabase or updates local state. |
| 2250 | `upsertSettingByKey(key, value)` | Persists a named site setting without creating duplicate keys. |
| 2249 | `deleteSetting(id)` | Deletes/removes the selected item or UI state. |
| 2255 | `getAuthorProfile()` | Coordinates authentication/session behavior. |
| 2262 | `saveAuthorProfile(id, record)` | Persists changes to Supabase or updates local state. |
| 2268 | `saveAuthorLink(id, record)` | Persists changes to Supabase or updates local state. |
| 2280 | `deleteAuthorLink(id)` | Deletes/removes the selected item or UI state. |
| 2287 | `getStats()` | Admin CMS helper used by the single-file admin app. |
| 2308 | `viewMapRequest(reqId)` | Admin CMS helper used by the single-file admin app. |
| 2366 | `approveMapRequest(reqId)` | Admin CMS helper used by the single-file admin app. |
| 2376 | `rejectMapRequest(reqId)` | Admin CMS helper used by the single-file admin app. |
| 2387 | `deleteMapRequest(reqId)` | Deletes/removes the selected item or UI state. |
| 2399 | `storyForm(id = null)` | Handles story data or story-facing UI behavior. |
| 2477 | `saveStory(id)` | Persists changes to Supabase or updates local state. |
| 2519 | `deleteStory(id)` | Deletes/removes the selected item or UI state. |
| 2551 | `chapterForm(id = null)` | Handles chapter catalog, reader, or chapter form behavior. |
| 2612 | `saveChapter(id)` | Persists changes to Supabase or updates local state. |
| 2646 | `deleteChapter(id)` | Deletes/removes the selected item or UI state. |
| 2663 | `accessTierForm(id = null)` | Admin CMS helper used by the single-file admin app. |
| 2677 | `saveAccessTier(id)` | Persists changes to Supabase or updates local state. |
| 2697 | `deleteAccessTier(id)` | Deletes/removes the selected item or UI state. |
| 2704 | `accessKeyForm()` | Admin CMS helper used by the single-file admin app. |
| 2724 | `saveAccessKey()` | Persists changes to Supabase or updates local state. |
| 2749 | `revokeAccessKey(id)` | Admin CMS helper used by the single-file admin app. |
| 2756 | `manualGrantForm()` | Admin CMS helper used by the single-file admin app. |
| 2771 | `saveManualGrant()` | Persists changes to Supabase or updates local state. |
| 2792 | `revokeEntitlement(id)` | Admin CMS helper used by the single-file admin app. |
| 2799 | `providerMappingForm(id = null)` | Admin CMS helper used by the single-file admin app. |
| 2817 | `saveProviderMapping(id)` | Persists changes to Supabase or updates local state. |
| 2838 | `characterForm(id = null)` | Admin CMS helper used by the single-file admin app. |
| 2870 | `saveCharacter(id)` | Persists changes to Supabase or updates local state. |
| 2895 | `deleteCharacter(id)` | Deletes/removes the selected item or UI state. |
| 2912 | `galleryImageForm(id = null, defaultPublished = true)` | Handles image preview/upload/storage URL behavior. |
| 2987 | `saveGalleryImage(id)` | Persists changes to Supabase or updates local state. |
| 3048 | `setGalleryImagePublished(id, isPublished)` | Handles image preview/upload/storage URL behavior. |
| 3061 | `deleteGalleryImage(id)` | Deletes/removes the selected item or UI state. |
| 3078 | `wallpaperForm(id = null)` | Admin CMS helper used by the single-file admin app. |
| 3103 | `saveWallpaper(id)` | Persists changes to Supabase or updates local state. |
| 3138 | `deleteWallpaper(id)` | Deletes/removes the selected item or UI state. |
| 3155 | `loreForm(id = null)` | Admin CMS helper used by the single-file admin app. |
| 3194 | `saveLoreEntry(id)` | Persists changes to Supabase or updates local state. |
| 3222 | `deleteLoreEntry(id)` | Deletes/removes the selected item or UI state. |
| 3239 | `timelineForm(id = null)` | Admin CMS helper used by the single-file admin app. |
| 3296 | `saveTimelineEvent(id)` | Persists changes to Supabase or updates local state. |
| 3336 | `deleteTimelineEvent(id)` | Deletes/removes the selected item or UI state. |
| 3353 | `mapForm(id = null)` | Admin CMS helper used by the single-file admin app. |
| 3384 | `saveMap(id)` | Persists changes to Supabase or updates local state. |
| 3408 | `deleteMap(id)` | Deletes/removes the selected item or UI state. |
| 3425 | `settingForm(id = null)` | Admin CMS helper used by the single-file admin app. |
| 3452 | `saveSetting(id)` | Persists changes to Supabase or updates local state. |
| 3496 | `saveSiteIdentity()` | Persists the production reader name/tagline/meta settings. |
| 3477 | `deleteSetting(id)` | Deletes/removes the selected item or UI state. |
| 3494 | `authorLinkForm(profileId, id = null)` | Coordinates authentication/session behavior. |
| 3526 | `saveAuthorLink(profileId, id)` | Persists changes to Supabase or updates local state. |
| 3551 | `deleteAuthorLink(id)` | Deletes/removes the selected item or UI state. |
| 3572 | `render(viewName)` | Builds and returns or injects the HTML for this UI section. |
| 3606 | `dashboard(container)` | Admin CMS helper used by the single-file admin app. |
| 3700 | `stories(container)` | Admin CMS helper used by the single-file admin app. |
| 3750 | `chapters(container)` | Handles chapter catalog, reader, or chapter form behavior. |
| 3819 | `characters(container)` | Admin CMS helper used by the single-file admin app. |
| 3881 | `gallery(container)` | Admin CMS helper used by the single-file admin app. |
| 3950 | `renderGalleryCards(images, isHiddenPool = false)` | Builds and returns or injects the HTML for this UI section. |
| 4111 | `wallpapers(container)` | Admin CMS helper used by the single-file admin app. |
| 4160 | `lore(container)` | Admin CMS helper used by the single-file admin app. |
| 4222 | `timeline(container)` | Admin CMS helper used by the single-file admin app. |
| 4284 | `maps(container)` | Admin CMS helper used by the single-file admin app. |
| 4346 | `mapRequests(container)` | Admin CMS helper used by the single-file admin app. |
| 4396 | `access(container)` | Admin CMS helper used by the single-file admin app. |
| 4509 | `settings(container)` | Admin CMS helper used by the single-file admin app. |
| 4549 | `profile(container)` | Admin CMS helper used by the single-file admin app. |
| 4622 | `editProfile(id)` | Admin CMS helper used by the single-file admin app. |
| 4646 | `saveProfile(id)` | Persists changes to Supabase or updates local state. |
| 4698 | `openSidebar()` | Opens the related modal, sheet, route, or external flow. |
| 4703 | `closeSidebar()` | Closes the related modal, sheet, or transient UI. |
| 4729 | `init()` | Initializes this module or application surface. |
| 4735 | `resize()` | Admin CMS helper used by the single-file admin app. |
| 4737 | `constructor()` | Admin CMS helper used by the single-file admin app. |
| 4738 | `reset()` | Admin CMS helper used by the single-file admin app. |
| 4739 | `update()` | Persists changes to Supabase or updates local state. |
| 4740 | `draw()` | Admin CMS helper used by the single-file admin app. |
| 4744 | `animate()` | Admin CMS helper used by the single-file admin app. |


## 2026-07-06 01:53 Asia/Kolkata - Standalone Writer handoff

- Admin sidebar `Writer / Chapters` opens the embedded Admin CMS chapter workspace; the standalone `writer.html` remains available from reader/admin cross-links.
- `Views.chapters` in `admin.html` renders the embedded Writer / Chapters workspace instead of redirecting, so stale `ea-admin-last-view = chapters` localStorage does not bounce `admin.html` into `writer.html`.
- `writer.html` is now the active Supabase-backed Writer surface; its current Quill/editor logic is inline in that file, while `js/admin-writer.js` remains an alternate/legacy helper unless the page explicitly loads it.

## 2026-07-07 00:00 Asia/Kolkata - Writer mock removal and Supabase binding

- `writer.html` now loads `js/subscription/site-config.js` plus Supabase JS, requires a signed-in admin profile, loads real `stories`, `chapters`, and `reader_access_tiers`, and writes chapter drafts/published updates to `public.chapters`.
- Demo `MockDB` seed content was removed; the in-page store is now only a runtime cache of Supabase rows.
- Quill system-message blocks continue to save as `div.sys-msg-box` in chapter HTML.

## 2026-07-08 01:08 Asia/Kolkata - Standalone Writer linked system captions

- `writer.html` adds `updateSystemMessageVariants()` to mark Quill system-message boxes containing links as `sys-msg-caption` during edits, hydration, cleanup, and save serialization.
- Linked system-message boxes render as red caption dialogs in the Writer editor; unlinked system-message boxes retain the existing blue system styling.

## 2026-07-08 14:01 Asia/Kolkata - Reader CRM sub-tabs

- `Views.readers(container)` now renders an internal CRM console with sub-tabs for Readers & Grants, Provider Links, Key Redemptions, and Audit Log instead of stacking all CRM tables in one long page.
- Reader CRM tables use scroll-safe wrappers and shared search filtering across reader IDs, profile names, provider fields, access key data, and audit details.

## 2026-07-16 05:52 Asia/Kolkata - Standalone Writer chapter navigation and management

- `DB.updateChapterFields(id, fields)` updates index-level chapter fields without rewriting manuscript content; `DB.deleteChapter(id)` permanently deletes an admin-selected chapter through Supabase/RLS.
- `Dashboard.renderSidebarChapters()` fills the persistent, scrollable left chapter rail and `Dashboard.renderEditorTabs()` renders the currently open chapter tabs.
- `Dashboard.render()` applies the persisted `State.dashboardSort` choice for chapter order, reversed chapter order, newest updated, or oldest updated.
- `App.openEditorForChapter(id)` now adds/switches tabs and saves dirty content before switching; `App.closeChapterTab(id)` closes a tab without deleting its chapter.
- `App.createNewChapter()` saves a dirty active tab first, creates the next `chapter_order` draft, and opens it from the editor tab-strip plus control.
- `App.quickSetChapterTier(id, tierId)` changes access directly from the chapter index; `tierRowVisual(tierId)` gives each tier a stable row tint/accent while Free Access stays green; `App.deleteChapter(id)` confirms and deletes from either the index or editor settings.
- `Editor.deleteCurrentSystemMessage()` deletes the system-message block containing the current cursor.
- `App.copyAsMarkdown()` exports conventional LLM-friendly Markdown: `*` emphasis, `**` strong text, `-` bullets, fenced code, blockquoted system messages, and `---` scene dividers.

## 2026-07-17 10:41 Asia/Kolkata - Structured system integration status

- `writer.html` does not currently load or expose the structured system builder. The initial frontend prototype was detached pending visual approval.
- `js/writer-system.js` remains an inactive implementation reference for version/checkpoint workflows; do not treat its functions as active Writer routes.
- The approved implementation must edit chapter values directly inside the system dialogue and provide a Reader Preview in chapter context.
- Standalone visual concepts live under `design/system-panels/` and deliberately have no Writer or reader dependencies.
