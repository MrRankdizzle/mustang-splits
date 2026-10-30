'use strict';
// Mustang Splits 3.20: mirrors the app's sheet content into a Google Sheet. Pure: everything comes in as arguments
// (index.js wires it to Firebase and the Sheets API; tests/sheet-sync.test.mjs runs it against a fake API).
//   sync({api, id, content, status, now, tz}) -> {applied, charts, sheetIds, title, url, changed}
// Rules it keeps: only sheets whose hash changed are rewritten (the hash comes from the app); the coach's notes column
// (the last column, yellow) is read before a rewrite and put back by each row's key (column A, hidden), so it follows
// its row when rows move; sheet order, column widths and charts are set when a sheet is first made and left alone
// after that; a chart sits at the top of every data sheet, its numbers on a hidden "Chart data" sheet.
const KEYC = 1;                 // column A: the row's key (hidden); content starts in column B
const CHART_ROWS = 12;          // rows above the data on a sheet with a chart: the title, the updated line, the chart
const PLAIN_ROWS = 1;           // rows above the data on a sheet without one: the updated line
const CHART_SHEET = 'Chart data';
const CHART_BLOCK = 100;        // rows per chart on the Chart data sheet
const NOTES = 'Coach notes';

const col = (n) => { let s = ''; n += 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const colIdx = (s) => { let n = 0; for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
const rgb = (hex) => { const h = String(hex || '').replace('#', ''); return h.length === 6 ? { red: parseInt(h.slice(0, 2), 16) / 255, green: parseInt(h.slice(2, 4), 16) / 255, blue: parseInt(h.slice(4, 6), 16) / 255 } : null; };
const colorStyle = (hex) => { const c = rgb(hex); return c ? { rgbColor: c } : undefined; };

// Shifts every cell reference in a formula or a range by dr rows and dc columns (function names like ROUND( are left alone).
function shiftFormula(f, dr, dc) {
  return String(f).replace(/(?<![A-Za-z0-9_])(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\d(])/g, (m, d1, c, d2, r) => d1 + col(colIdx(c) + dc) + d2 + (Number(r) + dr));
}
// 'A1:N12' (or 'A1') -> a GridRange on sheetId, shifted
function gridRange(ref, sheetId, dr, dc) {
  const m = String(ref).replace(/\$/g, '').match(/^([A-Z]{1,3})(\d+)(?::([A-Z]{1,3})(\d+))?$/); if (!m) return null;
  const c0 = colIdx(m[1]) + dc, r0 = Number(m[2]) - 1 + dr, c1 = (m[3] ? colIdx(m[3]) : colIdx(m[1])) + dc, r1 = (m[4] ? Number(m[4]) : Number(m[2])) - 1 + dr;
  return { sheetId, startRowIndex: r0, endRowIndex: r1 + 1, startColumnIndex: c0, endColumnIndex: c1 + 1 };
}
// A named style (the app's WB_STYLES entry) -> a CellFormat
function formatOf(st) {
  if (!st) return null;
  const f = {}, tf = {};
  if (st.b) tf.bold = true; if (st.i) tf.italic = true; if (st.sz) tf.fontSize = st.sz; if (st.color) tf.foregroundColorStyle = colorStyle(st.color);
  if (Object.keys(tf).length) f.textFormat = tf;
  if (st.fill) f.backgroundColorStyle = colorStyle(st.fill);
  if (st.h) f.horizontalAlignment = st.h.toUpperCase();
  if (st.v) f.verticalAlignment = st.v === 'center' ? 'MIDDLE' : st.v.toUpperCase();
  if (st.wrap) f.wrapStrategy = 'WRAP';
  if (st.border === 'bottom') f.borders = { bottom: { style: 'SOLID' } }; else if (st.border === 'top') f.borders = { top: { style: 'SOLID' } }; else if (st.border === 'all') f.borders = { top: { style: 'SOLID' }, bottom: { style: 'SOLID' }, left: { style: 'SOLID' }, right: { style: 'SOLID' } };
  if (st.fmt) f.numberFormat = { type: /y|d{3}/.test(st.fmt) ? 'DATE' : 'NUMBER', pattern: st.fmt };
  return Object.keys(f).length ? f : null;
}
// One content cell (null | string | number | {v, s, f}) -> CellData, formulas shifted into place
function cellData(c, styles, dr, dc) {
  if (c == null || c === '') return {};
  let v = c, s = null, f = null; if (typeof c === 'object') { v = c.v; s = c.s; f = c.f; }
  const out = {};
  if (f) out.userEnteredValue = { formulaValue: '=' + shiftFormula(f, dr, dc) };
  else if (typeof v === 'number') out.userEnteredValue = { numberValue: v };
  else if (typeof v === 'boolean') out.userEnteredValue = { boolValue: v };
  else if (v != null && v !== '') out.userEnteredValue = { stringValue: String(v) };
  const fmt = formatOf(s && styles[s]); if (fmt) out.userEnteredFormat = fmt;
  return out;
}
const isHeader = (r) => !!(r && r[0] && typeof r[0] === 'object' && r[0].s === 'h');
const widthOf = (sh) => Math.max((sh.cols || []).length, ...sh.rows.map((r) => r.length), 1);
const topOf = (sh) => (sh.chart ? CHART_ROWS : PLAIN_ROWS);
const notesCol = (sh) => KEYC + widthOf(sh);
const when = (now, tz) => new Date(now).toLocaleString('en-US', { timeZone: tz || 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const NOTE_STYLES = { nb: { b: true, color: '7A5A00', fill: 'FFF4CC' }, ncell: { fill: 'FFFBEA' }, up: { i: true, color: '5B6675' }, name: { b: true, sz: 14, color: '13294B' } };

// The content documents (teams/{t}/sheet/c-*) -> the sheets, parts joined, Brief first (by `order`). Incomplete sets are skipped.
function assemble(docs) {
  const by = {};
  docs.filter((d) => d.id && d.id.startsWith('c-') && d.key).forEach((d) => { (by[d.key] || (by[d.key] = [])).push(d); });
  const out = [];
  Object.keys(by).forEach((key) => {
    const p0 = by[key].find((d) => d.part === 0); if (!p0) return;
    const parts = [];
    for (let i = 0; i < (p0.parts || 1); i++) { const d = by[key].find((x) => x.part === i && x.hash === p0.hash); if (!d) return; parts.push(d.data || ''); }
    try { const sh = JSON.parse(parts.join('')); out.push({ ...sh, key, hash: p0.hash, season: p0.season }); } catch (e) { /* a half-written sheet: next time */ }
  });
  return out.sort((a, b) => (a.order || 0) - (b.order || 0) || a.key.localeCompare(b.key));
}

// The rows of one sheet as written to the grid: the title rows, then the content with its key in column A and the
// notes column at the end (notes put back by key), plus the per-row formats.
function gridRows(sh, notes, now, tz) {
  const top = topOf(sh), W = widthOf(sh), nc = notesCol(sh), styles = sh.styles || {}, rows = [];
  const line = (cells) => rows.push({ values: cells });
  if (sh.chart) { line([{}, cellData({ v: sh.name, s: 'name' }, NOTE_STYLES, 0, 0)]); line([{}, cellData({ v: `Updated from Mustang Splits ${when(now, tz)} · chart: ${sh.chart.title}`, s: 'up' }, NOTE_STYLES, 0, 0)]); for (let i = 2; i < top; i++) line([]); }
  else line([{}, cellData({ v: `Updated from Mustang Splits ${when(now, tz)}`, s: 'up' }, NOTE_STYLES, 0, 0)]);
  sh.rows.forEach((r, i) => {
    const key = (sh.keys || [])[i] || null, cells = [key ? { userEnteredValue: { stringValue: key } } : {}];
    for (let c = 0; c < W; c++) cells.push(cellData(r[c], styles, top, KEYC));
    if (isHeader(r)) cells[nc] = cellData({ v: NOTES, s: 'nb' }, NOTE_STYLES, 0, 0);
    else if (key) cells[nc] = cellData({ v: notes[key] || '', s: 'ncell' }, NOTE_STYLES, 0, 0);
    line(cells);
  });
  return rows;
}
// The coach's notes on a sheet, by key: read before the rewrite (values as the sheet shows them)
function notesFrom(values, sh) {
  const top = topOf(sh), nc = notesCol(sh), out = {};
  (values || []).slice(top).forEach((row) => { const key = row && row[0], note = row && row[nc]; if (key && note != null && String(note) !== '') out[String(key)] = String(note); });
  return out;
}
// The chart's numbers as rows for the Chart data sheet: a header, then one row per category
function chartRows(ch) {
  const head = [ch.x || '', ...ch.series.map((s) => s.name)], rows = [head];
  ch.cats.forEach((c, i) => rows.push([c == null ? '' : c, ...ch.series.map((s) => (s.vals[i] == null ? null : s.vals[i]))]));
  return rows.map((r) => ({ values: r.map((v) => (v == null || v === '' ? {} : typeof v === 'number' ? { userEnteredValue: { numberValue: v } } : { userEnteredValue: { stringValue: String(v) } })) }));
}
function chartSpec(ch, dataSheetId, r0) {
  const n = ch.cats.length + 1, bar = ch.type === 'bar', src = (c) => ({ sourceRange: { sources: [{ sheetId: dataSheetId, startRowIndex: r0, endRowIndex: r0 + n, startColumnIndex: c, endColumnIndex: c + 1 }] } });
  const axis = bar ? [{ position: 'BOTTOM_AXIS', title: ch.y || '' }, { position: 'LEFT_AXIS', title: ch.x || '' }] : [{ position: 'BOTTOM_AXIS', title: ch.x || '' }, { position: 'LEFT_AXIS', title: ch.y || '' }];
  if (ch.y2 && !bar) axis.push({ position: 'RIGHT_AXIS', title: ch.y2 });
  return { title: ch.title, fontName: 'Arial', basicChart: { chartType: bar ? 'BAR' : ch.type === 'column' ? 'COLUMN' : 'LINE', legendPosition: ch.series.length > 6 ? 'NO_LEGEND' : 'BOTTOM_LEGEND', headerCount: 1, axis,
    domains: [{ domain: src(0) }], series: ch.series.map((s, i) => ({ series: src(1 + i), targetAxis: bar ? 'BOTTOM_AXIS' : s.right ? 'RIGHT_AXIS' : 'LEFT_AXIS', ...(colorStyle(s.color) ? { colorStyle: colorStyle(s.color) } : {}), ...(ch.type === 'line' ? { lineStyle: { width: 2 } } : {}) })) } };
}

async function sync({ api, id, content, status, now, tz, log }) {
  const say = log || (() => {});
  status = status || {}; const applied = { ...(status.applied || {}) }, charts = { ...(status.charts || {}) }, sheetIds = { ...(status.sheetIds || {}) }, changed = [];
  let ss = await api.get(id);
  const byTitle = () => Object.fromEntries(ss.sheets.map((s) => [s.properties.title, s]));
  // 1. Every sheet exists, in the app's order the first time (never reordered after that); Chart data last and hidden.
  const needChart = content.some((sh) => sh.chart), made = new Set(), adds = [];
  content.forEach((sh, i) => { if (!byTitle()[sh.name]) { adds.push({ addSheet: { properties: { title: sh.name, index: Math.min(i, ss.sheets.length + adds.length), hidden: false, ...(sh.tab && rgb(sh.tab) ? { tabColorStyle: colorStyle(sh.tab) } : {}), gridProperties: { rowCount: Math.max(200, sh.rows.length + topOf(sh) + 20), columnCount: Math.max(26, notesCol(sh) + 3) } } } }); made.add(sh.name); } });
  if (needChart && !byTitle()[CHART_SHEET]) adds.push({ addSheet: { properties: { title: CHART_SHEET, hidden: true, gridProperties: { rowCount: CHART_BLOCK * Math.max(1, content.length), columnCount: 64 } } } });
  if (adds.length) { await api.batchUpdate(id, adds); ss = await api.get(id); }
  const T = byTitle(), chartSheet = T[CHART_SHEET];
  // the first sheet Google made ("Sheet1"), empty and ours now: hide it so the Brief comes first
  const first = ss.sheets.find((s) => /^Sheet1$/.test(s.properties.title) && s.properties.index === 0 && content.length);
  if (first && !first.properties.hidden && ss.sheets.length > 1) { try { await api.batchUpdate(id, [{ updateSheetProperties: { properties: { sheetId: first.properties.sheetId, hidden: true }, fields: 'hidden' } }]); } catch (e) { say('could not hide Sheet1: ' + e.message); } }
  content.forEach((sh) => { sheetIds[sh.key] = T[sh.name].properties.sheetId; });
  // 2. Rewrite each sheet whose hash changed (or that was just made), keeping the coach's notes by key.
  for (const [ci, sh] of content.entries()) {
    const sheet = T[sh.name], sid = sheet.properties.sheetId, isNew = made.has(sh.name);
    if (!isNew && applied[sh.key] === sh.hash) continue;
    const top = topOf(sh), W = widthOf(sh), nc = notesCol(sh), nRows = top + sh.rows.length, nCols = nc + 1;
    const notes = isNew ? {} : notesFrom(await api.values(id, `'${sh.name.replace(/'/g, "''")}'!A1:${col(nc)}${Math.max(nRows, (sheet.properties.gridProperties || {}).rowCount || nRows)}`), sh);
    const req = [];
    // clear: values, formats, merges, filter and the old conditional formats (charts are not cells: they stay)
    req.push({ unmergeCells: { range: { sheetId: sid } } });
    if (sheet.basicFilter) req.push({ clearBasicFilter: { sheetId: sid } });
    for (let i = (sheet.conditionalFormats || []).length; i > 0; i--) req.push({ deleteConditionalFormatRule: { sheetId: sid, index: i - 1 } });
    req.push({ updateCells: { range: { sheetId: sid }, fields: 'userEnteredValue,userEnteredFormat' } });
    const gp = sheet.properties.gridProperties || {}, rowsWant = Math.max(gp.rowCount || 0, nRows + 20), colsWant = Math.max(gp.columnCount || 0, nCols + 2);
    if (rowsWant !== gp.rowCount || colsWant !== gp.columnCount) req.push({ updateSheetProperties: { properties: { sheetId: sid, gridProperties: { rowCount: rowsWant, columnCount: colsWant } }, fields: 'gridProperties.rowCount,gridProperties.columnCount' } });
    // the cells, in chunks of 400 rows
    const rows = gridRows(sh, notes, now, tz);
    for (let r = 0; r < rows.length; r += 400) req.push({ updateCells: { start: { sheetId: sid, rowIndex: r, columnIndex: 0 }, rows: rows.slice(r, r + 400), fields: 'userEnteredValue,userEnteredFormat' } });
    // layout set once: widths, the hidden key column; frozen panes and row heights every time (they follow the data)
    if (isNew) {
      req.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { hiddenByUser: true, pixelSize: 40 }, fields: 'hiddenByUser,pixelSize' } });
      (sh.cols || []).forEach((w, i) => req.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'COLUMNS', startIndex: KEYC + i, endIndex: KEYC + i + 1 }, properties: { pixelSize: Math.round(w * 7.2 + 14) }, fields: 'pixelSize' } }));
      req.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'COLUMNS', startIndex: nc, endIndex: nc + 1 }, properties: { pixelSize: 260 }, fields: 'pixelSize' } });
    }
    const fr = sh.freeze || { r: 0, c: 0 };
    req.push({ updateSheetProperties: { properties: { sheetId: sid, gridProperties: { frozenRowCount: fr.r ? top + fr.r : 0, frozenColumnCount: KEYC + (fr.c || 0) } }, fields: 'gridProperties.frozenRowCount,gridProperties.frozenColumnCount' } });
    Object.entries(sh.heights || {}).forEach(([r, pt]) => req.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'ROWS', startIndex: top + Number(r), endIndex: top + Number(r) + 1 }, properties: { pixelSize: Math.round(pt * 4 / 3) }, fields: 'pixelSize' } }));
    (sh.merges || []).forEach((m) => { const g = gridRange(m, sid, top, KEYC); if (g) req.push({ mergeCells: { range: g, mergeType: 'MERGE_ALL' } }); });
    if (sh.filter) { const g = gridRange(sh.filter, sid, top, KEYC); if (g) req.push({ setBasicFilter: { filter: { range: g } } }); }
    (sh.cf || []).forEach((cf) => { const g = gridRange(cf.ref, sid, top, KEYC); if (!g) return;
      if (cf.scale) { const pts = cf.scale, pt = (p) => ({ colorStyle: colorStyle(p[2]), type: p[0] === 'min' ? 'MIN' : p[0] === 'max' ? 'MAX' : 'NUMBER', ...(p[0] === 'num' ? { value: String(p[1]) } : {}) }), rule = { minpoint: pt(pts[0]), maxpoint: pt(pts[pts.length - 1]) }; if (pts.length === 3) rule.midpoint = pt(pts[1]);
        req.push({ addConditionalFormatRule: { rule: { ranges: [g], gradientRule: rule }, index: 0 } }); }
      else if (cf.expr) { const d = (sh.dxfs || {})[cf.dxf] || {}, format = {}; if (d.fill) format.backgroundColorStyle = colorStyle(d.fill); if (d.color || d.b) format.textFormat = { ...(d.color ? { foregroundColorStyle: colorStyle(d.color) } : {}), ...(d.b ? { bold: true } : {}) };
        req.push({ addConditionalFormatRule: { rule: { ranges: [g], booleanRule: { condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: '=' + shiftFormula(cf.expr, top, KEYC) }] }, format } }, index: 0 } }); } });
    // Excel sparklines become SPARKLINE formulas
    (sh.spark || []).forEach((sp) => { const at = gridRange(sp.at, sid, top, KEYC); if (!at) return;
      req.push({ updateCells: { start: { sheetId: sid, rowIndex: at.startRowIndex, columnIndex: at.startColumnIndex }, rows: [{ values: [{ userEnteredValue: { formulaValue: `=IFERROR(SPARKLINE(${shiftFormula(sp.src, top, KEYC)},{"charttype","line";"color","#13294b";"linewidth",2}),"")` } }] }], fields: 'userEnteredValue' } }); });
    // the chart: its numbers on the Chart data sheet (one block per sheet), the chart made once and its ranges updated after that
    if (sh.chart && chartSheet) {
      const csid = chartSheet.properties.sheetId, r0 = ci * CHART_BLOCK, crows = chartRows(sh.chart);
      req.push({ updateCells: { range: { sheetId: csid, startRowIndex: r0, endRowIndex: r0 + CHART_BLOCK }, fields: 'userEnteredValue' } });
      req.push({ updateCells: { start: { sheetId: csid, rowIndex: r0, columnIndex: 0 }, rows: crows.slice(0, CHART_BLOCK), fields: 'userEnteredValue' } });
      const spec = chartSpec({ ...sh.chart, cats: sh.chart.cats.slice(0, CHART_BLOCK - 1) }, csid, r0), have = charts[sh.key], exists = have != null && (sheet.charts || []).some((c) => c.chartId === have);
      if (exists) req.push({ updateChartSpec: { chartId: have, spec } });
      else req.push({ addChart: { chart: { spec, position: { overlayPosition: { anchorCell: { sheetId: sid, rowIndex: 2, columnIndex: KEYC }, offsetXPixels: 0, offsetYPixels: 4, widthPixels: 820, heightPixels: 196 } } } } });
    }
    const replies = await api.batchUpdate(id, req);
    const addRep = replies.find((r) => r && r.addChart); if (addRep) charts[sh.key] = addRep.addChart.chartId;
    applied[sh.key] = sh.hash; changed.push(sh.key); say(`rewrote ${sh.name} (${sh.rows.length} rows)`);
  }
  return { applied, charts, sheetIds, title: (ss.properties || {}).title || '', url: `https://docs.google.com/spreadsheets/d/${id}`, changed };
}

module.exports = { sync, assemble, shiftFormula, gridRange, formatOf, cellData, gridRows, notesFrom, chartRows, chartSpec, topOf, notesCol, widthOf, col, colIdx, KEYC, CHART_ROWS, PLAIN_ROWS, CHART_SHEET, NOTES };
