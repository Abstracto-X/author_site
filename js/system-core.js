(function () {
  "use strict";

  const PRESETS = {
    circuit: '<svg viewBox="0 0 1000 600" preserveAspectRatio="none"><path d="M24 2h880l72 72v452l-72 72H24L2 576V24z"/><path d="M78 2v18H28v50H2M922 598v-18h50v-50h26"/></svg>',
    terminal: '<svg viewBox="0 0 1000 600" preserveAspectRatio="none"><rect x="2" y="2" width="996" height="596" rx="16"/><path d="M2 72h996M44 37h110M846 37h110M40 558h920"/></svg>',
    arcane: '<svg viewBox="0 0 1000 600" preserveAspectRatio="none"><path d="M90 2h820l88 88v420l-88 88H90L2 510V90z"/><path d="M2 170h32l38-68 38 68h780l38-68 38 68h32M2 430h32l38 68 38-68h780l38 68 38-68h32"/></svg>',
    glass: '<svg viewBox="0 0 1000 600" preserveAspectRatio="none"><rect x="2" y="2" width="996" height="596" rx="42"/><path d="M70 2h260M670 598h260"/></svg>'
  };

  const FONT_MAP = {
    tech: 'Inter, system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    serif: 'Georgia, "Times New Roman", serif',
    clean: 'system-ui, sans-serif'
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? {} : value)); }
  function slug(value) {
    return String(value || "item").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
  }
  function definitionPages(definition) { return Array.isArray(definition?.pages) ? definition.pages : []; }
  function findField(definition, fieldId) {
    for (const page of definitionPages(definition)) {
      const field = (page.fields || []).find(item => item.id === fieldId);
      if (field) return field;
    }
    return null;
  }
  function itemsFor(definition, state, sourceFieldId) {
    const value = state?.values?.[sourceFieldId];
    return Array.isArray(value) ? value : [];
  }
  function selectedItems(definition, state, field, multiple) {
    const catalog = itemsFor(definition, state, field.sourceFieldId);
    const selected = state?.values?.[field.id];
    const ids = multiple ? (Array.isArray(selected) ? selected : []) : [selected];
    return ids.filter(Boolean).map(id => catalog.find(item => String(item.id) === String(id)) || { id, name: id });
  }
  function derivedValue(field, state) {
    const values = state?.values || {};
    if (field.operation === "subtract") {
      return Number(values[field.fromFieldId] || 0) - Number(values[field.subtractFieldId] || 0);
    }
    return values[field.id] ?? "";
  }
  function pageById(definition, id) {
    const pages = definitionPages(definition);
    return pages.find(page => page.id === id) || pages[0] || null;
  }
  function pageTheme(appearance, pageId) {
    return Object.assign(
      { preset: "circuit", accent: "#5ee7ff", font: "tech" },
      appearance?.default || {}, appearance?.pages?.[pageId] || {}
    );
  }
  function frameSvg(preset) { return PRESETS[preset] || PRESETS.circuit; }
  function formatNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString() : escapeHtml(value);
  }
  function renderCatalog(items) {
    if (!items.length) return '<div class="aether-system-empty">No entries revealed yet.</div>';
    return `<div class="aether-system-catalog">${items.map(item => `
      <details class="aether-system-item">
        <summary><span>${escapeHtml(item.name || item.id)}</span>${item.meta ? `<small>${escapeHtml(item.meta)}</small>` : ""}</summary>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : '<p class="aether-system-muted">No additional information recorded.</p>'}
      </details>`).join("")}</div>`;
  }
  function renderReference(definition, state, field, multiple) {
    const items = selectedItems(definition, state, field, multiple);
    const chips = items.length
      ? items.map(item => `<span class="aether-system-chip" title="${escapeHtml(item.description || "")}">${escapeHtml(item.name || item.id)}${item.meta ? `<small>${escapeHtml(item.meta)}</small>` : ""}</span>`).join("")
      : '<span class="aether-system-muted">None</span>';
    const link = field.linkPageId
      ? `<button type="button" class="aether-system-detail-link" data-system-page="${escapeHtml(field.linkPageId)}">Detailed view</button>` : "";
    return `<div class="aether-system-reference"><div>${chips}</div>${link}</div>`;
  }
  function renderField(definition, state, field) {
    const value = state?.values?.[field.id];
    if (field.type === "page_links") {
      return `<div class="aether-system-page-links">${(field.pageIds || []).map(id => {
        const page = pageById(definition, id);
        return page ? `<button type="button" data-system-page="${escapeHtml(id)}">${escapeHtml(page.title)}</button>` : "";
      }).join("")}</div>`;
    }
    if (field.type === "catalog") return `<section class="aether-system-field aether-system-field-catalog"><h3>${escapeHtml(field.label)}</h3>${renderCatalog(Array.isArray(value) ? value : [])}</section>`;
    if (field.type === "reference_multi") return `<div class="aether-system-field"><span class="aether-system-label">${escapeHtml(field.label)}</span>${renderReference(definition, state, field, true)}</div>`;
    if (field.type === "reference_single") return `<div class="aether-system-field"><span class="aether-system-label">${escapeHtml(field.label)}</span>${renderReference(definition, state, field, false)}</div>`;
    if (field.type === "percent") {
      const number = Math.max(0, Math.min(100, Number(value || 0)));
      return `<div class="aether-system-field"><span class="aether-system-label">${escapeHtml(field.label)}</span><strong>${number}%</strong><div class="aether-system-meter"><i style="width:${number}%"></i></div></div>`;
    }
    if (field.type === "derived_number") return `<div class="aether-system-field"><span class="aether-system-label">${escapeHtml(field.label)}</span><strong>${formatNumber(derivedValue(field, state))}</strong></div>`;
    if (field.type === "number") return `<div class="aether-system-field"><span class="aether-system-label">${escapeHtml(field.label)}</span><strong>${formatNumber(value)}</strong></div>`;
    if (field.type === "badge") return `<div class="aether-system-field"><span class="aether-system-label">${escapeHtml(field.label)}</span><strong class="aether-system-badge">${escapeHtml(value || "—")}</strong></div>`;
    return `<div class="aether-system-field"><span class="aether-system-label">${escapeHtml(field.label)}</span><strong>${escapeHtml(value || "—")}</strong></div>`;
  }
  function render(payload, options) {
    injectStyles();
    const definition = payload?.definition || { pages: [] };
    const state = payload?.checkpoint?.state || payload?.state || { values: {} };
    const page = pageById(definition, options?.pageId || definition.startPageId);
    if (!page) return '<div class="aether-system-empty">System structure is not configured.</div>';
    const theme = pageTheme(payload?.appearance || {}, page.id);
    const changed = new Set((payload?.checkpoint?.changes || []).map(item => typeof item === "string" ? item : item?.fieldId));
    return `<section class="aether-system-frame preset-${escapeHtml(theme.preset)}" data-system-current-page="${escapeHtml(page.id)}" style="--system-accent:${escapeHtml(theme.accent)};--system-font:${escapeHtml(FONT_MAP[theme.font] || FONT_MAP.tech)}">
      <div class="aether-system-frame-art">${frameSvg(theme.preset)}</div>
      <header><div><small>${escapeHtml(payload?.name || "System")}${payload?.version ? ` · V${escapeHtml(payload.version)}` : ""}</small><h2>${escapeHtml(page.title)}</h2></div></header>
      <nav>${definitionPages(definition).map(item => `<button type="button" data-system-page="${escapeHtml(item.id)}" class="${item.id === page.id ? "active" : ""}">${escapeHtml(item.title)}</button>`).join("")}</nav>
      <div class="aether-system-fields">${(page.fields || []).map(field => `<div class="${changed.has(field.id) ? "aether-system-changed" : ""}">${renderField(definition, state, field)}</div>`).join("")}</div>
    </section>`;
  }
  function diff(previous, next) {
    const before = previous?.values || {};
    const after = next?.values || {};
    return Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
      .filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  }
  function injectStyles() {
    if (document.getElementById("aether-system-core-style")) return;
    const style = document.createElement("style");
    style.id = "aether-system-core-style";
    style.textContent = `
      .aether-system-frame{--system-accent:#5ee7ff;position:relative;isolation:isolate;color:#edfaff;background:linear-gradient(145deg,rgba(4,12,20,.98),rgba(8,17,29,.94));padding:1.4rem;font-family:var(--system-font);min-height:18rem;overflow:hidden}
      .aether-system-frame-art{position:absolute;inset:0;z-index:-1;color:var(--system-accent);opacity:.72;pointer-events:none}.aether-system-frame-art svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:3;vector-effect:non-scaling-stroke}
      .aether-system-frame:before{content:"";position:absolute;inset:0;z-index:-2;background:radial-gradient(circle at top right,color-mix(in srgb,var(--system-accent) 22%,transparent),transparent 42%)}
      .aether-system-frame header{display:flex;justify-content:space-between;gap:1rem;margin-bottom:1rem}.aether-system-frame header small{color:var(--system-accent);text-transform:uppercase;letter-spacing:.16em}.aether-system-frame h2{margin:.2rem 0 0;font-size:1.5rem}
      .aether-system-frame nav,.aether-system-page-links{display:flex;gap:.45rem;flex-wrap:wrap;margin-bottom:1rem}.aether-system-frame nav button,.aether-system-page-links button,.aether-system-detail-link{border:1px solid color-mix(in srgb,var(--system-accent) 42%,transparent);background:rgba(0,0,0,.28);color:inherit;border-radius:.45rem;padding:.42rem .68rem;cursor:pointer}.aether-system-frame nav button.active{background:color-mix(in srgb,var(--system-accent) 25%,transparent);color:var(--system-accent)}
      .aether-system-fields{display:grid;gap:.55rem}.aether-system-field{display:grid;grid-template-columns:minmax(10rem,.7fr) 1.3fr;gap:.75rem;align-items:start;padding:.72rem .8rem;border-bottom:1px solid color-mix(in srgb,var(--system-accent) 18%,transparent)}.aether-system-label{color:#a9bdc9}.aether-system-badge{color:var(--system-accent);text-transform:uppercase;letter-spacing:.08em}
      .aether-system-meter{grid-column:2;height:.35rem;background:rgba(255,255,255,.1);border-radius:999px;overflow:hidden}.aether-system-meter i{display:block;height:100%;background:var(--system-accent);box-shadow:0 0 12px var(--system-accent)}
      .aether-system-reference>div{display:flex;flex-wrap:wrap;gap:.35rem}.aether-system-chip{display:inline-flex;gap:.35rem;align-items:center;padding:.25rem .5rem;border:1px solid color-mix(in srgb,var(--system-accent) 36%,transparent);border-radius:999px;background:rgba(255,255,255,.04)}.aether-system-chip small{color:var(--system-accent)}
      .aether-system-detail-link{margin-top:.5rem;font-size:.78rem;color:var(--system-accent)}.aether-system-field-catalog{display:block}.aether-system-field-catalog h3{margin:0 0 .7rem}.aether-system-catalog{display:grid;gap:.55rem}.aether-system-item{border:1px solid color-mix(in srgb,var(--system-accent) 25%,transparent);border-radius:.55rem;padding:.65rem;background:rgba(0,0,0,.2)}.aether-system-item summary{display:flex;justify-content:space-between;cursor:pointer}.aether-system-item p{margin:.6rem 0 0;color:#bfd0da;line-height:1.55}.aether-system-muted,.aether-system-empty{color:#82939e}.aether-system-changed{animation:systemChanged 1.4s ease}.aether-system-changed>.aether-system-field{background:color-mix(in srgb,var(--system-accent) 10%,transparent)}
      @keyframes systemChanged{0%,100%{filter:none}45%{filter:drop-shadow(0 0 8px var(--system-accent))}}
      @media(max-width:640px){.aether-system-frame{padding:1rem}.aether-system-field{grid-template-columns:1fr}.aether-system-meter{grid-column:1}.aether-system-frame nav{overflow:auto;flex-wrap:nowrap;padding-bottom:.25rem}.aether-system-frame nav button{white-space:nowrap}}
      @media(prefers-reduced-motion:reduce){.aether-system-changed{animation:none}}
      .reader-system-message.system-themed{--sys-accent:#38bdf8!important;border:2px solid var(--sys-accent)!important;border-image:none!important;color:color-mix(in srgb,var(--sys-accent) 38%,white)!important;box-shadow:0 0 28px color-mix(in srgb,var(--sys-accent) 22%,transparent)!important;background:linear-gradient(145deg,color-mix(in srgb,var(--sys-accent) 12%,#030712),#030712)!important}.reader-system-message.system-themed.preset-terminal{border-radius:4px!important;background-image:repeating-linear-gradient(0deg,transparent 0 8px,rgba(255,255,255,.025) 9px)!important}.reader-system-message.system-themed.preset-arcane{clip-path:polygon(4% 0,96% 0,100% 18%,100% 82%,96% 100%,4% 100%,0 82%,0 18%)}.reader-system-message.system-themed.preset-glass{border-radius:22px!important;backdrop-filter:blur(12px)}.reader-system-message.font-tech{font-family:${FONT_MAP.tech}!important}.reader-system-message.font-mono{font-family:${FONT_MAP.mono}!important}.reader-system-message.font-serif{font-family:${FONT_MAP.serif}!important}.reader-system-message.font-clean{font-family:${FONT_MAP.clean}!important}
    `;
    document.head.appendChild(style);
  }

  window.AetherSystemCore = { PRESETS, FONT_MAP, escapeHtml, clone, slug, findField, itemsFor, selectedItems, pageById, pageTheme, render, diff, injectStyles };
})();
