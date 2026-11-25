/* Author Studio UI Interaction Layer:
   - Collapsible sidebar with persistent state
   - Sliding segmented pill controls synced to native <select> controls
   - Custom popover menus for floating bottom bulk pill
   - Grid density switcher on All Posts
   - Quick Look (Space / double-click) & Keyboard shortcuts (Ctrl+S, Esc, Delete) */
(function () {
  'use strict';

  const LS_RAIL = 'ea-studio-rail-expanded';
  const LS_DENSITY = 'ea-studio-grid-density';

  /* 1. Collapsible Left Rail */
  const railBtn = document.getElementById('rail-collapse-btn');
  if (localStorage.getItem(LS_RAIL) === '1') document.body.classList.add('rail-expanded');
  if (railBtn) {
    railBtn.addEventListener('click', () => {
      const expanded = document.body.classList.toggle('rail-expanded');
      railBtn.dataset.tip = expanded ? 'Collapse sidebar' : 'Expand sidebar';
      try { localStorage.setItem(LS_RAIL, expanded ? '1' : '0'); } catch (_) {}
      window.dispatchEvent(new Event('resize'));
    });
  }

  /* 2. Sliding Segmented Controls synced to native <select> */
  function positionSegThumb(seg) {
    const thumb = seg.querySelector('.seg-thumb');
    const active = seg.querySelector('button.is-active');
    if (!thumb || !active) return;
    const segRect = seg.getBoundingClientRect();
    const btnRect = active.getBoundingClientRect();
    if (!btnRect.width) return;
    thumb.style.width = `${btnRect.width}px`;
    thumb.style.transform = `translateX(${btnRect.left - segRect.left - (seg.classList.contains('compact') ? 2 : 3)}px)`;
  }

  function syncSegFromSelect(seg) {
    const selId = seg.dataset.syncSelect;
    const sel = document.getElementById(selId);
    if (!sel) return;
    const val = sel.value;
    seg.querySelectorAll('button[data-value]').forEach(btn => {
      const match = btn.dataset.value === val;
      btn.classList.toggle('is-active', match);
      if (btn.getAttribute('role') === 'tab') btn.setAttribute('aria-selected', String(match));
    });
    positionSegThumb(seg);
  }

  const allSegs = Array.from(document.querySelectorAll('.studio-seg[data-sync-select]'));
  allSegs.forEach(seg => {
    const sel = document.getElementById(seg.dataset.syncSelect);
    if (!sel) return;

    seg.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-value]');
      if (!btn) return;
      if (sel.value !== btn.dataset.value) {
        sel.value = btn.dataset.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
      syncSegFromSelect(seg);
    });

    sel.addEventListener('change', () => syncSegFromSelect(seg));
  });

  // Reposition sliding thumbs when panes switch or window resizes
  const resyncThumbs = () => requestAnimationFrame(() => allSegs.forEach(syncSegFromSelect));
  window.addEventListener('resize', resyncThumbs);
  window.addEventListener('hashchange', () => setTimeout(resyncThumbs, 60));
  new MutationObserver(resyncThumbs).observe(document.getElementById('studio-main'), {
    attributes: true, subtree: true, attributeFilter: ['hidden']
  });
  resyncThumbs();

  /* 3. Grid Density Switcher */
  const densityGroup = document.getElementById('grid-density');
  const postGrid = document.getElementById('post-grid');
  function applyDensity(mode) {
    if (!postGrid || !densityGroup) return;
    const safe = ['compact', 'medium', 'large'].includes(mode) ? mode : 'medium';
    postGrid.dataset.density = safe;
    densityGroup.querySelectorAll('button[data-density]').forEach(b => {
      const on = b.dataset.density === safe;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    try { localStorage.setItem(LS_DENSITY, safe); } catch (_) {}
  }
  if (densityGroup) {
    applyDensity(localStorage.getItem(LS_DENSITY) || 'medium');
    densityGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-density]');
      if (btn) applyDensity(btn.dataset.density);
    });
  }

  /* 4. Custom Popover Menus inside Floating Bulk Bar */
  function closePopovers() {
    document.querySelectorAll('.studio-popover.is-open').forEach(p => p.classList.remove('is-open'));
  }
  document.addEventListener('click', (e) => {
    const trig = e.target.closest('[data-popover]');
    if (trig) {
      e.stopPropagation();
      const target = document.getElementById(trig.dataset.popover);
      const wasOpen = target?.classList.contains('is-open');
      closePopovers();
      if (target && !wasOpen) target.classList.add('is-open');
      return;
    }
    const popBtn = e.target.closest('.studio-popover button[data-value]');
    if (popBtn) {
      const pop = popBtn.closest('.studio-popover');
      const sel = document.getElementById(pop.dataset.syncAction);
      if (sel) {
        sel.value = popBtn.dataset.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
      closePopovers();
      return;
    }
    if (!e.target.closest('.studio-popover')) closePopovers();
  });

  /* 5. Quick Look (Space or Double-Click on a canvas tile) */
  const qlModal = document.getElementById('studio-quicklook');
  const qlStage = document.getElementById('ql-stage');
  const qlCap = document.getElementById('ql-caption');
  function openQuickLookFromTile(tile) {
    if (!tile || !qlModal || !qlStage) return;
    const img = tile.querySelector('img');
    const vid = tile.querySelector('video');
    const badge = tile.querySelector('.studio-badge')?.textContent || tile.getAttribute('aria-label') || 'Preview';
    qlStage.replaceChildren();
    if (vid && vid.src) {
      const v = document.createElement('video');
      v.src = vid.src; v.controls = true; v.autoplay = true; v.loop = true; v.playsInline = true;
      qlStage.append(v);
    } else if (img && img.src) {
      const im = document.createElement('img');
      im.src = img.src; im.alt = badge;
      qlStage.append(im);
    } else {
      return;
    }
    if (qlCap) qlCap.textContent = badge;
    qlModal.hidden = false;
  }
  function closeQuickLook() {
    if (!qlModal || qlModal.hidden) return;
    qlModal.hidden = true;
    qlStage.replaceChildren();
  }
  document.getElementById('ql-close')?.addEventListener('click', closeQuickLook);
  qlModal?.addEventListener('click', (e) => { if (e.target === qlModal || e.target === qlStage) closeQuickLook(); });

  const canvasEl = document.getElementById('studio-canvas');
  canvasEl?.addEventListener('dblclick', (e) => {
    const tile = e.target.closest('.studio-tile');
    if (tile) openQuickLookFromTile(tile);
  });

  /* 7. Glassmorphic Right-Click Context Menu + Sticky Multi-Select Mode */
  const ctxMenu = document.getElementById('studio-ctx-menu');
  const ctxMultiLabel = document.getElementById('ctx-multi-label');
  const ctxPlayBtn = document.getElementById('ctx-play-video');
  let ctxTargetTile = null;

  function closeContextMenu() {
    if (ctxMenu && !ctxMenu.hidden) ctxMenu.hidden = true;
    ctxTargetTile = null;
  }

  window.openStudioTileContextMenu = function (e, item, selCount) {
    if (!ctxMenu) return;
    ctxTargetTile = e.target.closest('.studio-tile');
    const multiOn = !!window._studioMultiSelectMode;
    if (ctxMultiLabel) {
      ctxMultiLabel.textContent = multiOn ? 'Exit multi-select mode' : 'Select & Multi-select mode';
      ctxMultiLabel.closest('button')?.classList.toggle('is-active', multiOn);
    }
    const playEl = document.getElementById('play-selected');
    if (ctxPlayBtn) ctxPlayBtn.hidden = !playEl || playEl.hidden;

    ctxMenu.hidden = false;
    const rect = ctxMenu.getBoundingClientRect();
    const x = Math.min(e.clientX, window.innerWidth - rect.width - 12);
    const y = Math.min(e.clientY, window.innerHeight - rect.height - 12);
    ctxMenu.style.left = `${Math.max(8, x)}px`;
    ctxMenu.style.top = `${Math.max(8, y)}px`;
  };

  ctxMenu?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-ctx]');
    if (!btn) return;
    const action = btn.dataset.ctx;
    if (action === 'toggle-multi') {
      window._studioMultiSelectMode = !window._studioMultiSelectMode;
      const selCountEl = document.getElementById('selected-count');
      if (selCountEl) {
        selCountEl.dataset.multi = window._studioMultiSelectMode ? '1' : '';
      }
    } else if (action === 'quicklook') {
      if (ctxTargetTile) openQuickLookFromTile(ctxTargetTile);
    } else if (action === 'play-video') {
      document.getElementById('play-selected')?.click();
    } else if (action === 'label') {
      const sel = document.getElementById('bulk-label');
      if (sel) { sel.value = btn.dataset.val; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    } else if (action === 'audience') {
      const sel = document.getElementById('bulk-audience');
      if (sel) { sel.value = btn.dataset.val; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    } else if (action === 'remove') {
      document.getElementById('remove-media')?.click();
    }
    closeContextMenu();
  });

  document.addEventListener('click', (e) => {
    if (ctxMenu && !ctxMenu.hidden && !e.target.closest('#studio-ctx-menu')) closeContextMenu();
  });
  window.addEventListener('scroll', closeContextMenu, { passive: true });
  window.addEventListener('blur', closeContextMenu);

  // Also exit multi-select mode when Clear is clicked or Esc is pressed
  document.getElementById('clear-selection')?.addEventListener('click', () => {
    window._studioMultiSelectMode = false;
  });

  /* 6. Keyboard Shortcuts (Ctrl+S, Esc, Space Quick Look, Delete) */
  window.addEventListener('keydown', (e) => {
    const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      const editor = document.getElementById('studio-editor');
      if (editor && !editor.hidden) {
        e.preventDefault();
        const saveDraft = document.getElementById('save-draft');
        const saveLive = document.getElementById('save-live');
        if (saveDraft && !saveDraft.hidden && !saveDraft.disabled) saveDraft.click();
        else if (saveLive && !saveLive.disabled) saveLive.click();
      }
      return;
    }

    if (e.key === 'Escape') {
      if (ctxMenu && !ctxMenu.hidden) { e.preventDefault(); closeContextMenu(); return; }
      if (qlModal && !qlModal.hidden) { e.preventDefault(); closeQuickLook(); return; }
      if (document.querySelector('.studio-popover.is-open')) { closePopovers(); return; }
      if (window._studioMultiSelectMode) { window._studioMultiSelectMode = false; }
      const clearBtn = document.getElementById('clear-selection');
      if (clearBtn && !clearBtn.hidden) { clearBtn.click(); return; }
      const settings = document.getElementById('post-settings');
      if (settings && !settings.hidden) { document.getElementById('close-settings')?.click(); }
      return;
    }

    if (inInput) return;

    if (e.key === ' ') {
      const editor = document.getElementById('studio-editor');
      if (editor && !editor.hidden) {
        if (qlModal && !qlModal.hidden) { e.preventDefault(); closeQuickLook(); return; }
        const selTile = canvasEl?.querySelector('.studio-tile[aria-pressed="true"]');
        if (selTile) { e.preventDefault(); openQuickLookFromTile(selTile); }
      }
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const rm = document.getElementById('remove-media');
      if (rm && !rm.hidden && !rm.disabled) {
        e.preventDefault();
        rm.click();
      }
    }
  });
})();
