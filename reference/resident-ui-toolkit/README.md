# Resident UI Toolkit (Vanilla JavaScript)

A dependency-free, tier-aware visual toolkit for a dark literary membership site.

## Preview

Open `index.html` in a browser. For consistent local asset loading, serve the folder with:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Integrate

```html
<link rel="stylesheet" href="/resident-ui/resident-ui.css">
<div id="member-profile"></div>
<script src="/resident-ui/resident-ui.js"></script>
<script>
  const ui = ResidentUI.create({
    root: '#member-profile',
    tier: 'nemesis', // licker | tyrant | nemesis | evil
    assetBase: '/resident-ui/'
  });
  document.querySelector('#member-profile').innerHTML = ui.profile({
    name: 'Reader Name', handle: '@reader', photo: '/avatars/user.png'
  });
  // ui.setTier('evil') changes theme tokens on the root;
  // re-render component HTML to refresh avatar frame/banner content.
</script>
```

## API

`ResidentUI.create({ root, tier, assetBase })` returns:

- `setTier(tier)`: apply tier CSS variables, emit `residentui:tierchange` on the root.
- `avatar({src,size,alt})`: HTML string for framed avatar (`size:'small'` supported).
- `badge(label?)`: tier badge HTML string.
- `banner()`: banner HTML string.
- `profile({name,handle,photo,bio})`: profile card HTML string.
- `comment({name,photo,text,date})`: comment HTML string.
- `progress(value)`: ARIA progress bar HTML string.
- `initTabs(scope?)`: wire tab groups using `data-rui-tabs`.
- `tiers`: metadata for the four styles.

The UI functions return HTML strings (they do not inject them). Text is HTML-escaped. Image paths should come from trusted application data. Set the tier server-side based on a verified membership entitlement. Do not infer access rights from the user's chosen client theme.

## Theme tokens

`--rui-bg`, `--rui-panel`, `--rui-panel-alt`, `--rui-text`, `--rui-muted`, `--rui-line`, `--rui-accent`, `--rui-accent-rgb`, `--rui-banner`.

Set `data-rui-tier="licker|tyrant|nemesis|evil"` on an ancestor and use the `.rui-*` CSS classes. This can theme existing components without rewriting their markup.

## Design rules

- Licker: sinewy burgundy and curved accents.
- Tyrant: industrial steel and severe geometry.
- Nemesis: containment-warning gold and fractured edges.
- Resident Evil: crimson gothic highlights and a special red ornamental frame.

The art assets are transparent PNG overlays. The first three are extracted from the previously generated three-frame artwork; the fourth uses the generated red gothic variant. `assets/evil-alternate.png` and `assets/evil-red-ornate.png` are included as optional alternatives.

## Accessibility

Includes semantic buttons, ARIA attributes for progress and tabs, focus indicators, and `prefers-reduced-motion` support. Adjust the font sizes and contrast to suit the wider site and test keyboard/tab interactions in your actual app.
