// 3.20: the live spreadsheet's sync function (functions/mirror.js) against a fake Sheets API, no Google needed.
// Checks: the first sync makes every sheet (Brief first, Chart data hidden), writes every row with its key in the
// hidden column A and a Coach notes column at the end, formats, frozen panes, the filter, conditional formats, a
// SPARKLINE and a chart per data sheet; a second sync with one changed sheet rewrites only that sheet; the coach's notes
// survive a rewrite and follow their row when rows move (a note on a row that is gone is dropped); column widths and
// charts are set once (the chart's ranges updated, never a second chart); formulas and ranges shift into place; the
// content parts join and incomplete sets are skipped; the rate limit (one sync a minute) and the lock in index.js's
// terms. Fake names only.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const M = require('../functions/mirror.js');
let n = 0, bad = 0;
const ok = (name, cond, extra = '') => { n++; if (!cond) bad++; console.log((cond ? '  ok   ' : '  FAIL ') + name + (extra !== '' ? '  [' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) + ']' : '')); };

// ---- a fake Sheets API: sheets with grids, charts, conditional formats and filters; every request kept ----
function fakeApi() {
  const ss = { properties: { title: 'Mustangs XC' }, sheets: [{ properties: { sheetId: 0, title: 'Sheet1', index: 0, gridProperties: { rowCount: 1000, columnCount: 26 } }, charts: [], conditionalFormats: [], merges: [] }] };
  const grids = { 0: {} }, calls = [], widths = {}; let nextId = 100, nextChart = 500;
  const sheetOf = (sid) => ss.sheets.find((s) => s.properties.sheetId === sid);
  const api = {
    calls, ss, grids, widths,
    get: async () => JSON.parse(JSON.stringify(ss)),
    values: async (id, range) => { const m = range.match(/^'(.*)'!A1:([A-Z]+)(\d+)$/), sh = ss.sheets.find((s) => s.properties.title === m[1].replace(/''/g, "'")), g = grids[sh.properties.sheetId] || {}, W = M.colIdx(m[2]) + 1, out = [];
      for (let r = 0; r < Number(m[3]); r++) { const row = []; for (let c = 0; c < W; c++) { const v = g[r + ',' + c]; row.push(v == null ? '' : v); } out.push(row); } while (out.length && out[out.length - 1].every((v) => v === '')) out.pop(); return out; },
    batchUpdate: async (id, requests) => { const replies = []; calls.push(requests);
      for (const q of requests) { const k = Object.keys(q)[0], o = q[k]; let rep = {};
        if (k === 'addSheet') { const p = { index: ss.sheets.length, hidden: false, gridProperties: { rowCount: 1000, columnCount: 26 }, ...o.properties, sheetId: nextId++ }; ss.sheets.push({ properties: p, charts: [], conditionalFormats: [], merges: [] }); grids[p.sheetId] = {}; rep = { addSheet: { properties: p } }; }
        else if (k === 'updateSheetProperties') { const s = sheetOf(o.properties.sheetId); if (o.properties.gridProperties) Object.assign(s.properties.gridProperties, o.properties.gridProperties); if ('hidden' in o.properties) s.properties.hidden = o.properties.hidden; }
        else if (k === 'updateCells') { const g = grids[(o.range || o.start).sheetId]; if (!o.rows) { const r = o.range; Object.keys(g).forEach((key) => { const [rr, cc] = key.split(',').map(Number); if ((r.startRowIndex == null || (rr >= r.startRowIndex && rr < r.endRowIndex)) && (r.startColumnIndex == null || (cc >= r.startColumnIndex && cc < r.endColumnIndex))) delete g[key]; }); }
          else o.rows.forEach((row, i) => (row.values || []).forEach((cell, j) => { const v = cell.userEnteredValue; if (!v) return; g[(o.start.rowIndex + i) + ',' + (o.start.columnIndex + j)] = v.formulaValue != null ? v.formulaValue : v.numberValue != null ? v.numberValue : v.stringValue; })); }
        else if (k === 'addChart') { const c = { chartId: nextChart++, spec: o.chart.spec, position: o.chart.position }; sheetOf(o.chart.position.overlayPosition.anchorCell.sheetId).charts.push(c); rep = { addChart: { chart: JSON.parse(JSON.stringify(c)) } }; }
        else if (k === 'updateChartSpec') { const c = ss.sheets.flatMap((s) => s.charts).find((c) => c.chartId === o.chartId); if (!c) throw new Error('no chart ' + o.chartId); c.spec = o.spec; }
        else if (k === 'addConditionalFormatRule') { const s = sheetOf(o.rule.ranges[0].sheetId); s.conditionalFormats.splice(o.index, 0, o.rule); }
        else if (k === 'deleteConditionalFormatRule') { sheetOf(o.sheetId).conditionalFormats.splice(o.index, 1); }
        else if (k === 'setBasicFilter') { sheetOf(o.filter.range.sheetId).basicFilter = o.filter; }
        else if (k === 'clearBasicFilter') { delete sheetOf(o.sheetId).basicFilter; }
        else if (k === 'updateDimensionProperties') { if (o.range.dimension === 'COLUMNS') for (let c = o.range.startIndex; c < o.range.endIndex; c++) widths[o.range.sheetId + ':' + c] = o.properties; }
        else if (k === 'mergeCells' || k === 'unmergeCells') { /* kept simple */ }
        else throw new Error('fake api: unknown request ' + k);
        replies.push(rep); }
      return replies; }
  };
  return api;
}
// ---- content like the app's (small): the Brief and two data sheets with keys, a formula, a filter, a colour scale, a sparkline and a chart ----
const STYLES = { h: { b: true, color: 'FFFFFF', fill: '13294B', border: 'bottom' }, b: { b: true }, t1: { fmt: '[m]:ss.0' }, sec: { fmt: '+0.0" s"' }, d: { fmt: 'yyyy-mm-dd' }, note: { i: true, color: '5B6675' }, bt: { b: true, sz: 14, color: 'FFFFFF', fill: '13294B' }, box: { b: true, fill: 'BFE3F7' } };
const DXF = { fast: { fill: 'C6EFCE', color: '006100' } };
const kr = (k, r) => { r.k = k; return r; };
function brief() { const rows = [[{ v: 'Coach’s Brief', s: 'bt' }], [{ v: 'Coaches only.', s: 'note' }], [{ v: 'Your notes', s: 'box' }], kr('note|1', [{ v: 'Note 1', s: 'b' }]), kr('note|2', [{ v: 'Note 2', s: 'b' }]), [], [{ v: '1. Celebrate', s: 'box' }], ['Runner', 'Team', 'What'].map((v) => ({ v, s: 'h' })), kr('cel|a1', [{ v: 'Ada Lovelace', s: 'b' }, 'Girls', 'New 5K PR'])];
  return { name: 'Coach’s Brief', order: 0, rows, keys: rows.map((r) => r.k || null), cols: [26, 8, 26], freeze: { r: 1, c: 0 }, filter: null, cf: [], merges: [], heights: { 0: 28 }, tab: 'B8247F', chart: null, spark: [], styles: STYLES, dxfs: DXF }; }
function board(order, people) { const rows = [['Runner', 'Team', 'Season best', 'Opener → best'].map((v) => ({ v, s: 'h' }))];
  people.forEach(([id, name, g, t, arc]) => rows.push(kr('r|' + id, [{ v: name, s: 'b' }, g, { v: t / 86400, s: 't1' }, { v: arc, s: 'sec' }])));
  const n = rows.length; rows.push([], [{ v: 'A note row.', s: 'note' }]);
  return { name: 'Season board', order, rows, keys: rows.map((r) => r.k || null), cols: [26, 8, 12, 13], freeze: { r: 1, c: 1 }, filter: `A1:D${n}`, cf: [{ ref: `D2:D${n}`, scale: [['min', null, 'F8B4B4'], ['num', 0, 'FFFFFF'], ['max', null, '7CCB98']] }], merges: [], heights: { 0: 32 }, tab: '13294B', spark: [],
    chart: { type: 'bar', title: 'Team ladder: season best per runner (minutes)', x: 'Runner', y: 'Minutes', cats: people.map((p) => p[1]), series: [{ name: 'Girls', color: 'B8247F', vals: people.map((p) => (p[2] === 'Girls' ? p[3] / 60 : null)) }, { name: 'Boys', color: '0A6E94', vals: people.map((p) => (p[2] === 'Boys' ? p[3] / 60 : null)) }] }, styles: STYLES, dxfs: DXF }; }
function grid(order) { const rows = [['Meet', '', '', 'Opener', 'Invite'].map((v) => ({ v, s: 'h' })), kr('r|a1', [{ v: 'Ada Lovelace', s: 'b' }, 'Girls', { v: 0.0139, f: 'IF(COUNT(D2:E2)>0,AVERAGE(D2:E2),"")', s: 't1' }, { v: 0.014, s: 't1' }, { v: 0.0138, s: 't1' }])];
  return { name: 'Meet grid', order, rows, keys: rows.map((r) => r.k || null), cols: [26, 8, 12, 14, 14], freeze: { r: 1, c: 3 }, filter: null, cf: [{ ref: 'D2:E2', expr: 'AND(ISNUMBER(D2),ISNUMBER($C2),D2<$C2*0.99)', dxf: 'fast' }], merges: [], heights: {}, tab: '4B9CD3', spark: [{ src: 'D2:E2', at: 'F2' }],
    chart: { type: 'line', title: 'Season trend by runner', x: 'Meet', y: 'Minutes', cats: ['Opener', 'Invite'], series: [{ name: 'Ada Lovelace', color: 'B8247F', vals: [20.2, 19.9] }] }, styles: STYLES, dxfs: DXF }; }
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h.toString(16); };
const withHash = (sh) => ({ ...sh, key: sh.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').replace(/^coach-s-/, ''), hash: hash(JSON.stringify([sh.rows, sh.keys, sh.chart])) });
const P1 = [['a1', 'Ada Lovelace', 'Girls', 1212.3, 14.2], ['a2', 'Bea Short', 'Girls', 1235.0, -3.1], ['b1', 'Cal Long', 'Boys', 1101.5, 22.0]];

// ---- helpers over the fake ----
const sheetNamed = (api, t) => api.ss.sheets.find((s) => s.properties.title === t);
const cell = (api, t, r, c) => api.grids[sheetNamed(api, t).properties.sheetId][r + ',' + c];
const reqKinds = (api, from) => api.calls.slice(from).flat().map((q) => Object.keys(q)[0]);

(async () => {
  console.log('1. pure helpers');
  ok('shiftFormula moves rows and columns and leaves function names alone', M.shiftFormula('IF(COUNT(D2:E2)>0,ROUND(AVERAGE($C2:E$2)*86400,1),"")', 12, 1) === 'IF(COUNT(E14:F14)>0,ROUND(AVERAGE($D14:F$14)*86400,1),"")', M.shiftFormula('IF(COUNT(D2:E2)>0,ROUND(AVERAGE($C2:E$2)*86400,1),"")', 12, 1));
  ok('gridRange shifts a range', JSON.stringify(M.gridRange('D2:E9', 7, 12, 1)) === JSON.stringify({ sheetId: 7, startRowIndex: 13, endRowIndex: 21, startColumnIndex: 4, endColumnIndex: 6 }));
  ok('a time style becomes a number format, a date style a date format', M.formatOf(STYLES.t1).numberFormat.type === 'NUMBER' && M.formatOf(STYLES.t1).numberFormat.pattern === '[m]:ss.0' && M.formatOf(STYLES.d).numberFormat.type === 'DATE');
  ok('a header style has bold white text on navy with a bottom border', (() => { const f = M.formatOf(STYLES.h); return f.textFormat.bold && f.textFormat.foregroundColorStyle.rgbColor.red === 1 && f.backgroundColorStyle.rgbColor.blue > 0.29 && f.borders.bottom.style === 'SOLID'; })());
  ok('assemble joins parts in order and skips an incomplete set', (() => { const a = M.assemble([{ id: 'c-x-1', key: 'x', hash: 'h', part: 1, parts: 2, data: '"b":2}' }, { id: 'c-x', key: 'x', hash: 'h', part: 0, parts: 2, data: '{"order":3,"a":1,' }, { id: 'c-y', key: 'y', hash: 'g', part: 0, parts: 2, data: '{' }, { id: 'state' }]); return a.length === 1 && a[0].key === 'x' && a[0].a === 1 && a[0].b === 2 && a[0].order === 3; })());
  ok('assemble puts the Brief (order 0) first', (() => { const a = M.assemble([{ id: 'c-season-board', key: 'season-board', hash: '1', part: 0, parts: 1, data: '{"order":1}' }, { id: 'c-brief', key: 'brief', hash: '2', part: 0, parts: 1, data: '{"order":0}' }]); return a.map((x) => x.key).join() === 'brief,season-board'; })());

  console.log('2. the first sync: every sheet, keys, notes column, formats, chart');
  const api = fakeApi(), content = [withHash(brief()), withHash(board(1, P1)), withHash(grid(2))];
  const r1 = await M.sync({ api, id: 'sheet1', content, status: {}, now: Date.UTC(2026, 9, 30, 15, 0), tz: 'America/Chicago' });
  const titles = api.ss.sheets.filter((s) => !s.properties.hidden).map((s) => s.properties.title);
  ok('sheets made in the app’s order, Brief first; Sheet1 and Chart data hidden', titles.join('|') === 'Coach’s Brief|Season board|Meet grid' && sheetNamed(api, 'Chart data').properties.hidden === true, titles);
  ok('every sheet rewritten and reported', r1.changed.join() === 'brief,season-board,meet-grid' && Object.keys(r1.applied).length === 3 && r1.url.endsWith('/sheet1') && r1.title === 'Mustangs XC');
  const top = M.CHART_ROWS;
  ok('a data sheet: the title and the updated line above the chart rows, the header at row TOP', cell(api, 'Season board', 0, 1) === 'Season board' && /^Updated from Mustang Splits .* chart: Team ladder/.test(cell(api, 'Season board', 1, 1)) && cell(api, 'Season board', top, 1) === 'Runner', cell(api, 'Season board', 1, 1));
  ok('the updated line names the local time', /Oct 30, 10:00 AM/.test(cell(api, 'Season board', 1, 1)), cell(api, 'Season board', 1, 1));
  ok('each data row has its key in column A (hidden) and its cells one column right', cell(api, 'Season board', top + 1, 0) === 'r|a1' && cell(api, 'Season board', top + 1, 1) === 'Ada Lovelace' && cell(api, 'Season board', top + 3, 0) === 'r|b1');
  const W = sheetNamed(api, 'Season board').properties.sheetId, nc = M.notesCol(board(1, P1));
  ok('column A hidden and 40 px; widths from the content; the notes column 260 px', api.widths[W + ':0'].hiddenByUser === true && api.widths[W + ':1'].pixelSize === Math.round(26 * 7.2 + 14) && api.widths[W + ':' + nc].pixelSize === 260);
  ok('a Coach notes header on the header row, empty note cells on data rows', cell(api, 'Season board', top, nc) === 'Coach notes' && cell(api, 'Season board', top + 1, nc) === undefined);
  ok('a formula shifted into place', cell(api, 'Meet grid', top + 1, 3) === '=IF(COUNT(E14:F14)>0,AVERAGE(E14:F14),"")', cell(api, 'Meet grid', top + 1, 3));
  ok('a SPARKLINE formula where the Excel sparkline was', /^=IFERROR\(SPARKLINE\(E14:F14,/.test(cell(api, 'Meet grid', top + 1, 6) || ''), cell(api, 'Meet grid', top + 1, 6));
  const sb = sheetNamed(api, 'Season board'), mg = sheetNamed(api, 'Meet grid');
  ok('frozen panes: the header rows (below the chart) and the key column plus the name column', sb.properties.gridProperties.frozenRowCount === top + 1 && sb.properties.gridProperties.frozenColumnCount === 2 && mg.properties.gridProperties.frozenColumnCount === 4);
  ok('the filter over the data (shifted)', sb.basicFilter && sb.basicFilter.range.startRowIndex === top && sb.basicFilter.range.endRowIndex === top + 4 && sb.basicFilter.range.startColumnIndex === 1 && sb.basicFilter.range.endColumnIndex === 5, sb.basicFilter && sb.basicFilter.range);
  ok('a colour scale on Opener → best, a formula rule on the grid (shifted)', sb.conditionalFormats.length === 1 && sb.conditionalFormats[0].gradientRule.midpoint.value === '0' && sb.conditionalFormats[0].ranges[0].startColumnIndex === 4 && mg.conditionalFormats.length === 1 && mg.conditionalFormats[0].booleanRule.condition.values[0].userEnteredValue === '=AND(ISNUMBER(E14),ISNUMBER($D14),E14<$D14*0.99)', mg.conditionalFormats[0] && mg.conditionalFormats[0].booleanRule.condition.values[0].userEnteredValue);
  ok('one chart per data sheet, none on the Brief, anchored at row 3 of column B', sb.charts.length === 1 && mg.charts.length === 1 && sheetNamed(api, 'Coach’s Brief').charts.length === 0 && sb.charts[0].position.overlayPosition.anchorCell.rowIndex === 2 && sb.charts[0].position.overlayPosition.anchorCell.columnIndex === 1);
  const spec = sb.charts[0].spec;
  ok('the ladder is a bar chart with Girls and Boys series in team colours, the title says what to look for', spec.basicChart.chartType === 'BAR' && spec.basicChart.series.length === 2 && spec.title.startsWith('Team ladder') && Math.round(spec.basicChart.series[0].colorStyle.rgbColor.red * 255) === 0xB8 && spec.basicChart.axis[1].title === 'Runner');
  ok('the trend is a line chart with a left axis in minutes', mg.charts[0].spec.basicChart.chartType === 'LINE' && mg.charts[0].spec.basicChart.axis[1].title === 'Minutes');
  ok('the chart’s numbers on the Chart data sheet, one block per sheet', cell(api, 'Chart data', 100, 0) === 'Runner' && cell(api, 'Chart data', 101, 0) === 'Ada Lovelace' && Math.abs(cell(api, 'Chart data', 101, 1) - 1212.3 / 60) < 1e-9 && cell(api, 'Chart data', 101, 2) === undefined && cell(api, 'Chart data', 200, 0) === 'Meet');
  ok('the chart reads its block', spec.basicChart.domains[0].domain.sourceRange.sources[0].startRowIndex === 100 && spec.basicChart.series[1].series.sourceRange.sources[0].startColumnIndex === 2 && spec.basicChart.series[1].series.sourceRange.sources[0].endRowIndex === 104);
  ok('the Brief: no chart rows, the updated line then the content; note rows keyed', cell(api, 'Coach’s Brief', 0, 1).startsWith('Updated from Mustang Splits') && cell(api, 'Coach’s Brief', 1, 1) === 'Coach’s Brief' && cell(api, 'Coach’s Brief', 4, 0) === 'note|1' && cell(api, 'Coach’s Brief', 9, 0) === 'cel|a1');

  console.log('3. the coach types notes; a sync with one changed sheet rewrites only that sheet and keeps the notes');
  const sbId = sb.properties.sheetId, briefId = sheetNamed(api, 'Coach’s Brief').properties.sheetId;
  api.grids[sbId][(top + 1) + ',' + nc] = 'Ada: moved up to varsity'; api.grids[sbId][(top + 3) + ',' + nc] = 'Cal: watch the start';
  api.grids[briefId]['4,' + M.notesCol(brief())] = 'Bus leaves 2:15'; api.grids[briefId]['9,' + M.notesCol(brief())] = 'Tell the team';
  const status1 = { applied: r1.applied, charts: r1.charts, sheetIds: r1.sheetIds }, calls1 = api.calls.length;
  const P2 = [['b1', 'Cal Long', 'Boys', 1099.0, 24.5], ['a2', 'Bea Short', 'Girls', 1235.0, -3.1], ['a1', 'Ada Lovelace', 'Girls', 1212.3, 14.2], ['a3', 'Dot New', 'Girls', 1300.0, 0]]; // Cal first now, Dot new
  const content2 = [content[0], withHash(board(1, P2)), content[2]];
  const r2 = await M.sync({ api, id: 'sheet1', content: content2, status: status1, now: Date.UTC(2026, 9, 31, 1, 30), tz: 'America/Chicago' });
  ok('only the changed sheet was rewritten', r2.changed.join() === 'season-board', r2.changed);
  const kinds = reqKinds(api, calls1);
  ok('no request touched the Brief or the Meet grid', !api.calls.slice(calls1).flat().some((q) => JSON.stringify(q).includes('"sheetId":' + briefId) || JSON.stringify(q).includes('"sheetId":' + mg.properties.sheetId)));
  ok('no column widths set again, no second chart: the chart’s ranges updated', !kinds.includes('updateDimensionProperties') || !api.calls.slice(calls1).flat().some((q) => q.updateDimensionProperties && q.updateDimensionProperties.range.dimension === 'COLUMNS'), kinds.filter((k) => k === 'updateDimensionProperties').length);
  ok('one chart still, its ranges grown to four runners', sb.charts.length === 1 && sb.charts[0].chartId === r1.charts['season-board'] && sb.charts[0].spec.basicChart.domains[0].domain.sourceRange.sources[0].endRowIndex === 105 && kinds.includes('updateChartSpec') && !kinds.includes('addChart'));
  ok('rows in their new order', cell(api, 'Season board', top + 1, 1) === 'Cal Long' && cell(api, 'Season board', top + 3, 1) === 'Ada Lovelace' && cell(api, 'Season board', top + 4, 1) === 'Dot New');
  ok('the notes followed their rows', cell(api, 'Season board', top + 1, nc) === 'Cal: watch the start' && cell(api, 'Season board', top + 3, nc) === 'Ada: moved up to varsity' && cell(api, 'Season board', top + 2, nc) === undefined && cell(api, 'Season board', top + 4, nc) === undefined);
  ok('the Brief’s notes untouched', api.grids[briefId]['4,' + M.notesCol(brief())] === 'Bus leaves 2:15' && api.grids[briefId]['9,' + M.notesCol(brief())] === 'Tell the team');
  ok('the old conditional format replaced, not stacked; the filter spans the new rows', sb.conditionalFormats.length === 1 && sb.basicFilter.range.endRowIndex === top + 5);
  ok('every chart id in the report is a number (Google answers addChart with the whole chart)', Object.keys(r1.charts).length === 2 && Object.values(r1.charts).every((v) => Number.isInteger(v)) && r2.charts['season-board'] === r1.charts['season-board'], JSON.stringify(r1.charts));

  console.log('3b. the report of a run was lost (the first real sync did that): the next run adopts the charts already on the sheets, never a second one');
  const callsL = api.calls.length, rL = await M.sync({ api, id: 'sheet1', content: content2, status: {}, now: Date.UTC(2026, 9, 31, 2, 0), tz: 'America/Chicago' });
  ok('every sheet rewritten (nothing known as applied), still one chart each', rL.changed.length === 3 && sb.charts.length === 1 && mg.charts.length === 1 && !reqKinds(api, callsL).includes('addChart'), rL.changed);
  ok('the existing charts adopted into the report', rL.charts["season-board"] === sb.charts[0].chartId && rL.charts["meet-grid"] === mg.charts[0].chartId, JSON.stringify(rL.charts));
  ok('the notes survived that too', cell(api, 'Season board', top + 1, nc) === 'Cal: watch the start' && api.grids[briefId]['4,' + M.notesCol(brief())] === 'Bus leaves 2:15');
  ok('applied hashes carried for the unchanged sheets', r2.applied.brief === r1.applied.brief && r2.applied['meet-grid'] === r1.applied['meet-grid'] && r2.applied['season-board'] !== r1.applied['season-board']);

  console.log('4. a Brief rewrite keeps its notes; a note on a row that is gone is dropped');
  const b2 = brief(); b2.rows.splice(8, 1); b2.keys = b2.rows.map((r) => r.k || null); // Ada's celebrate row gone
  const content3 = [withHash(b2), content2[1], content2[2]];
  const r3 = await M.sync({ api, id: 'sheet1', content: content3, status: { applied: r2.applied, charts: r2.charts, sheetIds: r2.sheetIds }, now: Date.now(), tz: 'America/Chicago' });
  ok('only the Brief rewritten', r3.changed.join() === 'brief');
  ok('the note on Note 1 kept; the note on the vanished row gone', api.grids[briefId]['4,' + M.notesCol(brief())] === 'Bus leaves 2:15' && !Object.values(api.grids[briefId]).includes('Tell the team'));

  console.log('5. nothing changed: no sheet touched');
  const calls4 = api.calls.length;
  const r4 = await M.sync({ api, id: 'sheet1', content: content3, status: { applied: r3.applied, charts: r3.charts, sheetIds: r3.sheetIds }, now: Date.now(), tz: 'America/Chicago' });
  ok('no requests at all', r4.changed.length === 0 && api.calls.length === calls4);

  console.log('6. a big sheet: rows in chunks, the grid grown, the chart’s block capped');
  const many = Array.from({ length: 950 }, (_, i) => ['p' + i, 'Runner ' + i, i % 2 ? 'Girls' : 'Boys', 1100 + i, i % 7]);
  const api2 = fakeApi(), big = [withHash(brief()), withHash(board(1, many))];
  await M.sync({ api: api2, id: 'x', content: big, status: {}, now: Date.now(), tz: 'America/Chicago' });
  const s2 = sheetNamed(api2, 'Season board'), q2 = api2.calls.flat();
  ok('the grid grew to hold every row', s2.properties.gridProperties.rowCount >= top + 953 + 20, s2.properties.gridProperties.rowCount);
  ok('rows written in chunks of 400', q2.filter((q) => q.updateCells && q.updateCells.rows && q.updateCells.start && q.updateCells.start.sheetId === s2.properties.sheetId).length >= 3);
  ok('the last row landed', cell(api2, 'Season board', top + 950, 1) === 'Runner 949');
  ok('the chart’s block stops at 99 runners (the block is 100 rows)', s2.charts[0].spec.basicChart.domains[0].domain.sourceRange.sources[0].endRowIndex === 100 + 100);

  console.log('7. the rate limit and the lock, as index.js computes them');
  const MIN_GAP = 60000, wait = (last, now) => Math.max(0, last + MIN_GAP - now);
  ok('a sync right after another waits the rest of the minute', wait(1000000, 1020000) === 40000 && wait(1000000, 1070000) === 0);
  const LOCK = 8 * 60000, locked = (lockAt, now) => !!lockAt && now - lockAt < LOCK;
  ok('a run holds the lock for at most 8 minutes', locked(1000000, 1000000 + 60000) && !locked(1000000, 1000000 + LOCK + 1) && !locked(0, 5));

  console.log(`\n${n - bad}/${n} passed`); process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(1); });
