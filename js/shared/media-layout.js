(function () {
  'use strict';
  function solveOrganicMasonry(items, focusIdx, lastTileCol, W, gap) {
    const rects = new Map();
    const nextCols = new Map();
    const n = items.length;
    if (n === 0 || W <= 0) return { rects, nextCols, totalH: 0 };

    const cols = W >= 900 ? 4 : (W >= 580 ? 3 : 2);
    const colW = (W - gap * (cols - 1)) / cols;
    const colY = new Array(cols).fill(0);

    const placeSingle = (idx, preferredCol = -1) => {
      const ar = Math.max(0.45, Math.min(2.2, items[idx].ratio || 0.75));
      let c = preferredCol;
      if (c < 0 || c >= cols) {
        c = 0;
        for (let j = 1; j < cols; j++) if (colY[j] < colY[c] - 2) c = j;
      }
      const x = Math.round(c * (colW + gap));
      const w = Math.round(colW);
      const h = Math.round(w / ar);
      const y = colY[c];
      rects.set(idx, { x, y, w, h });
      nextCols.set(idx, c);
      colY[c] = y + h + gap;
    };

    if (focusIdx < 0 || focusIdx >= n) {
      for (let i = 0; i < n; i++) placeSingle(i);
      return { rects, nextCols, totalH: Math.max(0, Math.max(...colY) - gap) };
    }

    const spanCols = Math.min(2, cols);
    const prevCol = lastTileCol.has(focusIdx) ? lastTileCol.get(focusIdx) : (focusIdx % cols);
    let spanCol = Math.min(prevCol, cols - spanCols);
    if (prevCol >= cols - 1) spanCol = cols - spanCols;

    const placed = new Set();
    const takeNext = (startIdx) => {
      for (let j = startIdx; j < n; j++) {
        if (j !== focusIdx && !placed.has(j)) return j;
      }
      return -1;
    };

    for (let i = 0; i < focusIdx; i++) {
      if (placed.has(i)) continue;
      placeSingle(i);
      placed.add(i);
    }

    if (spanCols >= 2) {
      const cA = spanCol, cB = spanCol + 1;
      if (Math.abs(colY[cA] - colY[cB]) > 150) {
        const shorter = colY[cA] < colY[cB] ? cA : cB;
        const filler = takeNext(focusIdx + 1);
        if (filler !== -1) {
          placeSingle(filler, shorter);
          placed.add(filler);
        }
      }
    }

    const fAr = Math.max(0.55, Math.min(2.2, items[focusIdx].ratio || 0.75));
    const spanW = Math.round(colW * spanCols + gap * (spanCols - 1));
    const spanH = Math.round(spanW / fAr);
    const spanX = Math.round(spanCol * (colW + gap));
    let spanY = colY[spanCol];
    for (let c = spanCol + 1; c < spanCol + spanCols; c++) spanY = Math.max(spanY, colY[c]);

    rects.set(focusIdx, { x: spanX, y: spanY, w: spanW, h: spanH });
    nextCols.set(focusIdx, spanCol);
    for (let c = spanCol; c < spanCol + spanCols; c++) colY[c] = spanY + spanH + gap;
    placed.add(focusIdx);

    for (let i = 0; i < n; i++) {
      if (placed.has(i)) continue;
      placeSingle(i);
      placed.add(i);
    }

    return { rects, nextCols, totalH: Math.max(0, Math.max(...colY) - gap) };
  }

  function compactMosaic(count,index) {
    const wide=count>=5 && index%2===1;
    return {className:wide?'layout-collage-5':'layout-lead-2',visibleCount:wide?5:3};
  }
  window.MediaLayout={solveOrganicMasonry,compactMosaic};
}());
