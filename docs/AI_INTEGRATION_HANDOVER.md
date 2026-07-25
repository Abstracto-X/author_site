# Writer AI Integration Handover

Prepared: 2026-07-25 Asia/Kolkata  
Status: Writer AI chat and separate Summary Manager implemented on 2026-07-25; provider secrets and authenticated QA remain  
Repository at handover: `C:\Users\admis\OneDrive\Documents\GitHub\author_site`  
Branch / observed HEAD: `main` / `640a5b8`

## Implementation update — 2026-07-25

The recommended first chat slice and the separate Summary Manager slice are now present:

- Deep Chat 2.5.0 is vendored under `vendor/deep-chat/` with its MIT license.
- `writer_ai_chat_threads` and `writer_ai_chat_messages` are applied to the linked Supabase project with admin-only RLS.
- `writer-openrouter-chat` is deployed as the authenticated OpenRouter streaming proxy.
- `writer.html`, `js/writer-ai-chat.js`, and `styles/writer-ai-chat.css` provide the persistent drawer, story-scoped thread management, streaming/Stop, Supabase history, copy actions, and independent-Scratchpad saves.
- **Copy context & open AI** copies and opens only; it does not paste or send.
- `writer.html`, `js/writer-summary-manager.js`, and `styles/writer-summary-manager.css` provide exact-source Short/Long Summary generation with separate style references and private draft/review/accept/archive/supersede lifecycle.
- `writer_summary_details` is applied with admin-only RLS, and only accepted managed summaries appear in reusable Context.
- `writer-generate-summary` is deployed as an authenticated admin-only Google Gemma proxy with no summary or chapter write path.

Operational follow-up:

- Configure the `OPENROUTER_API_KEY` Edge Function secret.
- Configure the `GEMINI_API_KEY` Edge Function secret.
- Complete authenticated end-to-end QA.
- Verify both provider workflows and the Summary Manager acceptance boundary before treating the AI integration as production-ready.

## 1. Purpose

This document is the implementation handover for adding AI capabilities to the Writer without turning the Context Workspace into an agentic editor or importing a large second chat application.

The intended product has three deliberately separate systems:

1. **Context Workspace** — constructs, orders, previews, copies, and downloads reusable story context.
2. **AI Chat drawer** — a conventional chat interface using OpenRouter. Context is pasted by the user; it is not automatically injected or sent.
3. **Summary Manager** — a specialized, review-first workflow that generates indexed Short and Long Summaries using a Google model/API.

The separation is a core requirement, not merely an implementation detail.

## 2. Mandatory first steps for the next chat

The codebase changed after the AI discussion began. Treat the repository as authoritative and this document as design intent.

Before editing:

1. Read `AGENTS.md`.
2. Read:
   - `docs/CODEBASE_OVERVIEW.md`
   - `PROJECT_STATE.md`
   - `docs/ADMIN_FUNCTION_INDEX.md`
   - `docs/DATABASE_CONTEXT.md`
   - this document
3. Run `git status --short`.
4. Inspect the current `writer.html`, current migrations, and current Supabase schema.
5. Locate the exact current functions and DOM regions before patching.
6. Do not reset, checkout, overwrite, or “clean up” existing uncommitted work.
7. Before schema or data work, take a fresh backup if any operation could touch chapters or existing context data.

At the time this handover was written, these files were already modified:

```text
M CHANGELOG.md
M PROJECT_STATE.md
M docs/ADMIN_FUNCTION_INDEX.md
M docs/CODEBASE_OVERVIEW.md
M docs/DATABASE_CONTEXT.md
M styles.css
M writer.html
```

Those changes predate this handover and must be preserved.

## 3. Current Writer and Context Workspace

The Writer is a plain HTML/JavaScript, Supabase-backed admin surface implemented primarily in the monolithic `writer.html`. Do not introduce React, Vue, Next.js, a bundler, or a new application server.

### Existing Context Workspace behavior

`ContextWorkspace` currently provides:

- Six switchable, equal-size browser/property-style tabs arranged as a 3×2 grid:
  - Writing Style
  - Long Summaries
  - Chapter Summaries
  - Chapters
  - Outlines
  - Scratchpads
- Whole-card colored selection rather than checkboxes as the primary selection indicator.
- Search.
- Simple section ordering.
- Advanced cross-section item ordering with drag/drop and movement controls.
- Prompt preview with word, character, estimated-token, and budget information.
- Clipboard export as Markdown, plain text, and ChatGPT JSON.
- File downloads.
- Preset create, update, Save As, rename, duplicate, load, and delete.
- Per-story local restoration of:
  - selected items
  - selected-item order
  - simple/advanced mode
  - active section
  - active preset
  - token budget
  - search
  - library/preview scroll positions
- Complete create/edit/duplicate/delete actions for reusable blocks.

Important current symbols are under `ContextWorkspace` in `writer.html`, beginning around the current line 4863. Line numbers will move; search by symbol.

### Scratchpads and Chapter Notes

There are two distinct concepts:

1. **Independent Scratchpads**
   - Story-level reusable context blocks.
   - Stored in `public.writer_context_blocks` with `block_type = 'scratchpad'`.
   - These are the destination for explicitly saving useful AI inputs or responses.

2. **Chapter Notes**
   - Notes attached to a specific chapter.
   - Physically remain in the legacy `public.scratchpads` table for compatibility.
   - Presented in the Writer as Chapter Notes.
   - Open in an in-screen side drawer through `ChapterNotes`; they do not open as manuscript tabs.
   - May be shown or hidden in the Context Workspace Scratchpads tab.

Do not accidentally save general AI chat output into the legacy chapter-linked `scratchpads` table. The default AI destination is an independent Scratchpad in `writer_context_blocks`.

### Existing context schema

Current migrations:

- `supabase/migrations/20260723170000_add_writer_context_workspace.sql`
- `supabase/migrations/20260723173000_add_context_preset_active_section.sql`

Current tables:

- `public.writer_context_blocks`
- `public.writer_context_presets`
- `public.writer_context_preset_items`

Current reusable block types:

```text
writing_style
long_summary
chapter_summary
outline
scratchpad
```

Chapters and Chapter Notes are referenced directly by presets and are not duplicated as context-block rows.

## 4. Existing story data and non-destructive guardrails

The active imported story is:

- Title: `Resident Evil: A Zombie Tale`
- Slug: `a-zombie-tale`
- ID: `d8c87bf8-94c9-4c6e-8826-d6f3be25d419`

Desktop context was imported from:

`A:\Novels\Dead Must Breed`

The desktop chapters were deliberately **not** migrated because the web chapters are newer.

A verified backup exists at:

`C:\Users\admis\Documents\author_site_backups\resident_evil_20260724_131801`

The post-import verification confirmed all 40 web chapters were unchanged, with fingerprint:

`67224898120399e09bb574564dd72894ffc8aeeed7d46a0eea054fc25558aa67`

The AI and summary implementation must never:

- import the desktop chapters;
- replace chapter content;
- reorder chapters;
- publish or unpublish chapters;
- silently write generated text into chapters;
- treat an AI response as canonical without user acceptance.

Summarization is read-only with respect to chapters.

## 5. Product decisions already made

### Required separation

The Context Workspace ends at:

```text
Select context → order context → review preview → copy/download
```

The user then opens AI Chat and pastes whatever they want. There must be no hidden bridge that automatically:

- injects the current context;
- creates a chat message;
- sends a request;
- chooses a model;
- edits the manuscript.

A convenience action may copy the assembled context and open the chat drawer, but it must stop before pasting or sending.

### Explicitly rejected direction

Do not build:

- line-by-line manuscript diffs;
- insert-at-cursor or replace-selection AI editing;
- automatic chapter rewriting;
- agentic “update canon” behavior;
- automatic conversion of chats into persistent story memory;
- a chat assistant embedded inside the Context prompt preview;
- a single tangled UI combining context selection, chat, and summarization.

The user wants a normal chat interface, not an autonomous manuscript editor.

### Explicitly rejected chat platforms

Open WebUI, LibreChat, and SillyTavern were judged too operationally heavy for this application because they introduce combinations of:

- their own backend;
- their own authentication;
- their own database;
- containers or additional hosting;
- a second full application lifecycle.

They should not be introduced unless the user reverses this decision.

## 6. AI Chat experience

### Intended presentation

Add a persistent AI control on the side of the Writer. It opens a large, full-height chat drawer/widget without replacing the current Writer surface.

Recommended behavior:

- Resizable drawer.
- Can expand to near-full-screen.
- Restores open/closed state and width.
- Restores the most recent thread and selected model.
- Does not destroy the current Context Workspace, editor, selection, or scroll state.
- Works from Context, Dashboard, and Editor surfaces.
- Uses the same visual language as the Writer.

The chat is separate from the Context Workspace even when both are visible side by side.

### Expected conventional chat features

The goal is a lightweight but typical chat experience:

- thread list;
- new thread;
- rename;
- delete with confirmation;
- search/filter;
- model selection;
- persisted per-thread model/settings;
- streaming assistant responses;
- stop/cancel;
- clear error states and retry;
- Markdown and code rendering;
- copy message;
- regenerate the latest response;
- edit/resend a user message where practical;
- reload and resume;
- explicit save of an input or response to an independent Scratchpad.

Avoid prematurely adding:

- tools/agents;
- RAG;
- web search;
- voice;
- image generation;
- complex file pipelines;
- multi-user collaboration;
- elaborate branching trees.

Attachments can be a later phase because persistence, storage, model capabilities, and cost handling make them more than a cosmetic button.

### Manual Context-to-Chat flow

Preferred flow:

1. User builds context in the existing Context Workspace.
2. User reviews the existing prompt preview.
3. User clicks **Copy context**.
4. User opens AI Chat.
5. User pastes and edits the context.
6. User selects the OpenRouter model.
7. User sends manually.

Optional convenience:

```text
Copy context and open chat
```

That action must only copy and open. It must not populate or submit the chat composer.

### Chat-to-Scratchpad flow

Useful explicit actions:

- Save this input to Scratchpad.
- Save this response to Scratchpad.
- Save selected messages to Scratchpad.
- Save conversation as Markdown to Scratchpad, if later desired.

The action should ask for or propose a title and then create:

```text
writer_context_blocks.block_type = 'scratchpad'
```

It must not create a Chapter Note unless a separate, clearly labeled action is intentionally added later.

## 7. Selected lightweight chat component: Deep Chat

Repository:

`https://github.com/OvidijusParsiunas/deep-chat`

Audited clone:

`C:\Users\admis\Documents\codex_sources\deep-chat`

Audited commit:

`5dca527bea93`

Package version observed:

`2.5.0`

License:

MIT; preserve the license notice when vendoring.

### Consumption decision

Recommended:

- Vendor a pinned published Deep Chat browser/ESM bundle into this repository.
- Vendor its MIT license.
- Configure it externally from Writer JavaScript.
- Do not commit the entire cloned repository.
- Do not copy its source into `writer.html`.
- Do not fork initially.
- Do not add a new build step merely to consume it.

A pinned CDN URL is technically possible but vendoring is preferred for deterministic availability, CSP control, and protection from upstream changes.

### Important audited Deep Chat files

Public component and properties:

`C:\Users\admis\Documents\codex_sources\deep-chat\component\src\deepChat.ts`

Connection types:

`C:\Users\admis\Documents\codex_sources\deep-chat\component\src\types\connect.ts`

Custom handler and streaming/cancellation behavior:

`C:\Users\admis\Documents\codex_sources\deep-chat\component\src\utils\HTTP\customHandler.ts`

History types:

`C:\Users\admis\Documents\codex_sources\deep-chat\component\src\types\history.ts`

History implementation:

`C:\Users\admis\Documents\codex_sources\deep-chat\component\src\views\chat\messages\history\history.ts`

Message events:

`C:\Users\admis\Documents\codex_sources\deep-chat\component\src\utils\events\fireEvents.ts`

Message API wiring:

`C:\Users\admis\Documents\codex_sources\deep-chat\component\src\views\chat\messages\messages.ts`

Styling helpers:

`C:\Users\admis\Documents\codex_sources\deep-chat\component\src\utils\webComponent\webComponentStyleUtils.ts`

Possible future fork points for inline per-message actions:

- `component/src/views/chat/messages/messagesBase.ts`
- `component/src/views/chat/messages/utils/messageUtils.ts`

### Supported integration points

Embed directly:

```html
<deep-chat></deep-chat>
```

Set its host to fill the drawer:

```text
width: 100%
height: 100%
```

Configure through supported properties:

- `chatStyle`
- `inputAreaStyle`
- `textInput`
- `messageStyles`
- `submitButtonStyles`
- `avatars`
- `names`
- `auxiliaryStyle`

The component uses an open Shadow DOM, but do not rely on arbitrary Shadow DOM manipulation. Use supported properties. `auxiliaryStyle` is the supported escape hatch, although internal selectors should be treated as version-pinned.

### OpenRouter request handler

Use:

```javascript
connect = {
    stream: true,
    handler(body, signals) {
        // fetch Supabase Edge Function
    }
};
```

The handler should:

1. Create an `AbortController`.
2. Attach cancellation to Deep Chat’s stop signal.
3. Call the authenticated Supabase Edge Function.
4. Parse the returned OpenRouter SSE stream.
5. Call `signals.onOpen()`.
6. Feed text deltas through `signals.onResponse({ text: chunk })`.
7. Call `signals.onClose()` when complete.
8. Surface structured errors without leaving a permanently “streaming” message.

Do not use Deep Chat’s direct provider connection in deployed production because it exposes the provider key in the browser.

### Supabase history integration

Do not enable Deep Chat `browserStorage` for canonical chat history.

Use:

- `history`
- `loadHistory`
- `getMessages`
- `addMessage`
- `updateMessage`
- `clearMessages`
- `onMessage` / message events

Recommended:

- Supabase is the source of truth.
- Local storage remembers UI state only, such as open thread, drawer width, and model selection.
- On thread switch, destroy/recreate the `<deep-chat>` element with the new thread’s history and request handler. This is safer than dynamically mutating a live connection.
- Store stable message IDs and sequence values in Supabase; Deep Chat does not require stable database IDs.
- Verify the vendored release’s exact event behavior during streaming.
- Safest assistant persistence is to accumulate the final response in our handler and persist it when the stream closes, instead of assuming every `onMessage` event represents one final assistant message.

### Known Deep Chat limitation

Deep Chat does not expose a generic built-in toolbar hook on every normal Markdown message.

For the first implementation, put actions in the surrounding shell for:

- latest response;
- selected message;
- selected transcript text;
- whole conversation.

Do not poke buttons into its Shadow DOM.

Only if inline actions under every bubble become mandatory should a tiny maintained fork be considered around:

- `messagesBase.ts`
- `messageUtils.ts`

This is the only currently identified reason to fork.

### Alternatives considered

- **QuikChat** — smaller and zero-dependency, but would require more work for a polished conventional interface.
- **NLUX** — capable vanilla core, but more adapter/ecosystem-oriented and less direct for this plain HTML/OpenRouter use case.

Deep Chat remains the recommended first prototype.

## 8. Chat storage and backend plan

Schema must be created through idempotent migrations before frontend queries are added. Apply matching SQL to both required migration/documented SQL locations according to repository conventions, enable RLS, and finish schema migrations with:

```sql
NOTIFY pgrst, 'reload schema';
```

### Suggested minimal tables

Names may be adjusted to current conventions after live-schema inspection.

#### `writer_ai_chat_threads`

Suggested fields:

```text
id uuid primary key
story_id uuid references stories on delete cascade
created_by uuid references auth.users
title text
model_id text
settings jsonb
created_at timestamptz
updated_at timestamptz
```

Recommended initial behavior:

- Chats are story-scoped to prevent accidental cross-story leakage.
- The chat feature remains operationally separate from Context despite this organizational relationship.
- RLS should be admin-only, consistent with Writer access.
- If global chats are later required, make `story_id` nullable in a deliberate migration rather than silently mixing scopes.

#### `writer_ai_chat_messages`

Suggested fields:

```text
id uuid primary key
thread_id uuid references writer_ai_chat_threads on delete cascade
role text check in ('system', 'user', 'assistant')
content text
sequence integer
model_id text nullable
metadata jsonb
created_at timestamptz
```

Recommended constraints/indexes:

- unique `(thread_id, sequence)`;
- index `(thread_id, sequence)`;
- role check;
- content not null;
- admin-only RLS.

Do not design an elaborate branch graph unless the actual chosen edit/regenerate UX requires it. A lightweight first version can support regenerate-last and limited edit/resend without pretending to be a complete conversation-tree system.

### Edge Function: OpenRouter chat

Suggested responsibility:

```text
Authenticated Writer → Supabase Edge Function → OpenRouter
```

The function should:

- require a valid Supabase JWT;
- confirm Writer/admin authorization;
- read the OpenRouter key from Edge Function secrets;
- accept model, messages, and bounded settings;
- validate model/settings/payload size;
- forward the request with streaming enabled;
- stream OpenRouter’s response back;
- avoid logging private story content;
- normalize provider errors;
- never expose the provider key.

This is not a dedicated application backend. It is a small proxy using the project’s existing Supabase infrastructure.

Optional later alternative:

- BYOK stored only in the user’s browser.

This should not be the default deployed configuration because browser-side keys are exposed to the browser environment.

## 9. Summary Manager

Summarization is a separate subsystem from chat because its inputs, model choice, review requirements, and persistence semantics are different.

### Summary terminology

#### Short Summary

The current database/UI concept `chapter_summary` should be presented to users as **Short Summary**.

A Short Summary:

- is not necessarily one summary per chapter;
- covers a user-defined range such as chapters 20–25;
- contains a relatively detailed event log;
- may overlap another range intentionally;
- is generated from selected raw chapters;
- may use the preceding accepted Short Summary as a style reference.

Retain the physical `chapter_summary` block type initially for migration and preset compatibility unless a deliberate schema migration is justified.

#### Long Summary

A Long Summary:

- covers a broad range such as chapters 1–20;
- is more compressed and high-level;
- is normally generated from selected accepted Short Summaries;
- may use a previous accepted Long Summary as a style reference.

### Required summary workflow

The Summary Manager should be a dedicated drawer/sub-window, not part of the general AI chat transcript.

#### Generate Short Summary

User chooses:

- start chapter number;
- end chapter number;
- exact source chapters, preselected from the range but manually adjustable;
- an optional previous Short Summary used as a style reference;
- optional generation instructions.

The system supplies:

- precise summarization instructions;
- the style reference, clearly labeled as style-only;
- selected chapter content as the factual source;
- requested coverage range.

The prompt must explicitly prevent the model from copying facts from the style reference into the new summary merely because they appear in the reference.

#### Generate Long Summary

User chooses:

- start/end range;
- exact accepted Short Summaries;
- optional previous Long Summary as a style reference;
- optional generation instructions.

The model compresses the selected Short Summaries into a broader narrative record.

### Review and acceptance

Every generated result is a draft.

Required actions:

- edit generated text;
- regenerate with the same sources;
- regenerate with additional instructions;
- save draft;
- accept;
- archive or supersede an older accepted summary when appropriate;
- cancel without changing context.

Only explicit acceptance makes a generated summary an accepted reusable context block.

The Summary Manager must never:

- silently overwrite an accepted summary;
- silently add a draft to an active context preset;
- modify source chapters;
- treat a model response as canonical before acceptance.

### Range/indexing requirements

Both Short and Long Summaries need structured coverage metadata rather than chapter numbers embedded only in titles.

At minimum track:

```text
summary kind
start chapter
end chapter
exact selected source IDs
style-reference ID
draft / accepted / archived status
model/provider
prompt-template version
generation timestamp
acceptance timestamp
superseded summary ID, if applicable
```

The UI should be able to detect and display:

- gaps;
- overlaps;
- selected sources outside the stated range;
- missing chapters;
- use of draft rather than accepted source summaries;
- summaries that may be stale because a source chapter changed after generation.

Warnings should normally be reviewable rather than absolute blockers because intentional overlaps and selective summaries are valid.

### Schema direction for summary metadata

Do not overload summary titles as the data model.

Before implementation, choose the narrowest schema that supports exact indexing. Two reasonable approaches:

1. Add nullable summary-specific fields and a `generation_meta jsonb` column to `writer_context_blocks`.
2. Add a one-to-one summary-details table keyed to `writer_context_blocks.id`.

The second approach keeps generic context blocks clean; the first is simpler. Inspect current and anticipated query patterns before deciding.

Whichever approach is chosen should preserve existing `long_summary` and `chapter_summary` block IDs and preset references.

Exact source chapter/summary IDs should be retained, not just range numbers. If JSON metadata is used, also store chapter-order snapshots so later reordering can be detected.

### Google summarization provider

The user intends to use Google’s free API/model offering, specifically referring to Gemma 4, for summarization. The general chat continues to use OpenRouter.

Do not hard-code a remembered model identifier or assume free limits remain unchanged. At implementation time:

- verify the current official Google API model identifier;
- verify regional availability;
- verify free-tier quotas and maximum input/output limits;
- make the model configurable;
- provide clear quota/rate-limit errors;
- keep the Google API key in Edge Function secrets.

### Edge Function: summarization

Recommended request:

- summary type;
- selected chapter IDs or selected accepted summary IDs;
- style-reference block ID;
- requested coverage;
- optional instructions;
- prompt-template version.

Recommended server behavior:

1. Authenticate the Writer/admin.
2. Load authoritative saved sources under the authenticated user’s access.
3. Validate all sources belong to the same story.
4. Build a deterministic prompt.
5. Call the configured Google model.
6. Return a generated draft and generation metadata.
7. Do not write the draft into accepted context automatically.

Prefer sending source IDs and loading saved content in the function. If unsaved editor content is ever allowed, label it explicitly and do not confuse it with the saved chapter version.

## 10. Suggested implementation phases

Do not attempt chat, summary schema, both provider integrations, and all polishing in one giant patch.

### Phase A — Reconfirm current baseline

- Read current docs and status.
- Inspect current `writer.html`.
- Verify current Supabase schema.
- Preserve all existing uncommitted work.
- Confirm current Context and Chapter Note behavior in an authenticated browser.

### Phase B — Isolated Deep Chat proof

- Vendor the pinned Deep Chat bundle and license.
- Create a production-detached local design/proof surface if useful.
- Verify:
  - bundle loads without a framework/build step;
  - full-height sizing;
  - Writer-compatible theming;
  - Markdown;
  - mock/local handler streaming only in the detached proof.
- Do not add fake/mock data fallbacks to the production Writer.

### Phase C — Chat schema and OpenRouter proxy

- Add idempotent migrations.
- Apply and verify schema before frontend calls.
- Add admin RLS.
- Add the authenticated streaming Edge Function.
- Verify the function independently with a narrow request.

### Phase D — Writer chat drawer

- Add the drawer and persisted drawer UI state.
- Add thread CRUD/search.
- Add model/settings controls.
- Integrate Deep Chat handler, streaming, stop, and error recovery.
- Load/persist messages through Supabase.
- Add copy and explicit Save to Independent Scratchpad.
- Do not connect Context selection directly to request submission.

### Phase E — Summary schema

- Decide metadata structure.
- Add status/range/source/version data without breaking current presets.
- Update UI terminology from Chapter Summary to Short Summary where appropriate while retaining compatibility.
- Apply and verify schema.

### Phase F — Summary generation

- Add Google summarization Edge Function.
- Add Short Summary generation/review/accept flow.
- Add Long Summary generation from accepted Short Summaries.
- Add warnings for gaps, overlaps, stale sources, and invalid scope.
- Verify acceptance creates/updates only summary context records.

### Phase G — QA and documentation

- Authenticated desktop and narrow-width browser testing.
- Refresh/resume tests.
- Story isolation tests.
- Streaming cancellation and provider-error tests.
- RLS tests.
- Confirm no chapter rows changed.
- Update:
  - `docs/CODEBASE_OVERVIEW.md`
  - `docs/ADMIN_FUNCTION_INDEX.md`
  - `docs/DATABASE_CONTEXT.md`
  - `CHANGELOG.md`
  - `PROJECT_STATE.md`

## 11. Acceptance criteria

### AI Chat

- Opens as a full-height Writer drawer/widget.
- Does not replace or reset the active Writer surface.
- Context is copied and pasted manually.
- No request is sent merely by selecting or copying context.
- Thread history persists in Supabase.
- Model/settings persist per thread.
- Streaming and Stop work.
- Refresh restores the drawer/thread state without losing saved messages.
- Story-scoped chats do not leak across stories.
- Copy works.
- Saving an input/response creates an independent Scratchpad.
- No provider key is present in client source.

### Summary Manager

- User can generate a Short Summary from an exact, reviewable set of chapters.
- User can generate a Long Summary from exact accepted Short Summaries.
- Both summary types store structured chapter coverage.
- Style reference is distinct from factual sources.
- Draft can be edited and regenerated.
- Nothing becomes accepted without explicit confirmation.
- Existing accepted summaries are not silently overwritten.
- Existing context presets remain valid.
- No chapter row is inserted, updated, deleted, reordered, published, or unpublished.

## 12. Verification checklist

### Static/code checks

- Extract inline Writer scripts and run `node --check`.
- Check duplicate DOM IDs.
- Run `git diff --check`.
- Inspect the final diff for accidental chapter/editor changes.
- Confirm vendored license and pinned bundle version.

### Database checks

- Confirm new tables/columns through `information_schema`.
- Confirm policies through `pg_policies`.
- Directly select inserted test threads/messages.
- Verify cross-user/admin behavior according to Writer access requirements.
- Confirm schema cache reload.

### Manual browser checks

- Open/close/resize drawer.
- Reload on every Writer surface.
- Switch threads during and after streaming.
- Stop a response.
- Simulate provider failure and quota failure.
- Rename/delete threads.
- Switch stories.
- Save user and assistant text to independent Scratchpads.
- Generate/edit/regenerate/accept both summary types.
- Verify range warnings.
- Verify context tabs, preset ordering, prompt preview, Chapter Notes, and editor behavior remain intact.

### Chapter safety check

Before and after implementation or summary testing, compare chapter IDs and all chapter content/order/publication fields. A successful AI integration must produce no unexplained chapter diff.

## 13. Open decisions for the next implementation chat

These require a deliberate choice after inspecting the current code; they are not permission to redesign the product:

1. Whether chats are always story-scoped or may also be global. Recommended initial default: story-scoped.
2. Exact table names after checking current naming conventions.
3. Whether summary metadata belongs on `writer_context_blocks` or in a one-to-one details table.
4. Whether editing an older chat message truncates later messages, clones the thread, or is postponed. Avoid a complex branch tree initially.
5. Whether response actions live in the drawer shell or require a tiny Deep Chat fork. Recommended initial default: drawer shell.
6. Exact current Google model identifier and quota.
7. Whether the OpenRouter model list is live-fetched, configured as favorites, or both. Recommended: live list plus user favorites/cache.
8. Whether unsaved active-chapter content is ever eligible for summarization. Recommended initial default: saved chapters only, with a warning if the editor is dirty.

## 14. Non-goals and “do not do this” list

- Do not auto-send Context Workspace content.
- Do not silently paste into the chat composer.
- Do not build manuscript diff/replace tools.
- Do not let AI responses edit chapters.
- Do not merge Chat and Summary Manager into one modal.
- Do not store OpenRouter or Google keys in `writer.html`, local source, or Supabase public tables.
- Do not add Docker, MongoDB, a framework, or another full chat application.
- Do not fork Deep Chat before a real unsupported requirement appears.
- Do not use Deep Chat `browserStorage` as canonical history when Supabase persistence exists.
- Do not rerun the desktop chapter import.
- Do not overwrite the current uncommitted Writer/Context work.

## 15. Recommended first implementation slice

The smallest useful, low-risk slice is:

1. Vendor Deep Chat bundle/license.
2. Add schema for story-scoped threads/messages.
3. Add a minimal authenticated OpenRouter streaming Edge Function.
4. Add a full-height Writer chat drawer with:
   - thread list;
   - model selector;
   - streaming/stop;
   - Supabase persistence;
   - copy;
   - Save latest response to independent Scratchpad.
5. Add only **Copy context and open chat**, with no automatic paste/send.
6. Validate thoroughly before starting the Summary Manager.

This slice proves the selected component and provider architecture without risking the manuscript or prematurely committing to summary metadata.
