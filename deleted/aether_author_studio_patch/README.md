# Aether Author Studio Patch

This package adds a writer-first Author Studio to the split subscription reader without introducing frameworks, bundlers, or runtime dependencies.

It targets the refactored static-site structure where subscription code is split into files like:

- `js/subscription/router.js`
- `js/subscription/events.js`
- `js/subscription/views/studio-preview.js`
- `js/subscription/aether-app.js`

The old single-file IIFE monolith keeps its router/views private, so this patch intentionally stops if it detects that structure.

## What it adds

- `js/subscription/author-studio.js`
- A script tag in `index.html`, loaded before `aether-app.js`
- Author Studio CSS appended to root `styles.css`
- The homepage Author Studio button now routes to `#/studio/write`

## Features

- `#/studio/write` writer dashboard
- Slash command menu using `/` or `\`
- Rich blocks: paragraphs, headings, quotes, dividers, callouts, spoilers, lore cards, links, CTA buttons, polls
- Image insertion from URL
- Supabase Storage image upload using bucket `CONFIG.authorStudio.imageBucket`, `CONFIG.storage.authorImagesBucket`, or `xyz`
- Local browser autosave under the existing reader store
- Draft queue, duplicate, delete, copy reader-safe HTML
- Guarded Supabase save bridge for the existing `chapters` table
- Studio dashboard overview and media view overrides

## Apply

From your repo root:

```bash
node path/to/aether_author_studio_patch/tools/apply-author-studio-patch.mjs
```

Dry run:

```bash
node path/to/aether_author_studio_patch/tools/apply-author-studio-patch.mjs --dry-run
```

Apply to an explicit repo path:

```bash
node path/to/aether_author_studio_patch/tools/apply-author-studio-patch.mjs /path/to/repo
```

## Optional config

In `js/subscription/site-config.js`, you can set:

```js
window.SUBSCRIPTION_SITE_CONFIG = {
  // existing config...
  authorStudio: {
    imageBucket: "xyz"
  }
};
```

If omitted, uploads use bucket `xyz`.

## Validation

Run:

```bash
node --check js/subscription/author-studio.js
node --check js/subscription/router.js js/subscription/events.js js/subscription/aether-app.js
```

Manual smoke test:

1. Open `index.html`.
2. Sign in as an admin profile.
3. Click the homepage `Author Studio` button.
4. Confirm it lands on `#/studio/write`.
5. Type `/` or `\` in the editor and insert blocks.
6. Add an image by URL.
7. Upload an image after confirming bucket `xyz` exists.
8. Copy HTML.
9. Use Save to Supabase only after your `chapters` table fields match the payload.

## Supabase save payload

The save bridge uses existing-looking chapter fields only:

```js
{
  story_id,
  title,
  content,
  preview_text,
  chapter_order,
  word_count,
  status,
  is_published,
  public_release_at,
  updated_at
}
```

If your schema differs, Supabase returns the schema error and no mock/sample fallback is used.
