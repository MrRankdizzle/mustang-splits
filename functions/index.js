'use strict';
// Mustang Splits 3.20: the Cloud Function that keeps the coach's Google Sheet up to date. One-way: the app is the
// source of truth; this only mirrors what the phones wrote to teams/{t}/sheet/* into the sheet (mirror.js) and reports
// in teams/{t}/sheet/status (the only writer of that document). Set-up steps: docs/sheet-sync-setup.md.
//   sheetSync   runs when anything under teams/{t}/sheet changes (content written, a sheet connected, hello, off)
//   sheetDaily  the daily refresh at 5:30 in the morning, Central time, for every connected team
// At most one sync a minute per team (the phones wait a minute between pushes too); one run at a time per team (a
// lock in status); a run checks for content that arrived while it worked and goes again.
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const mirror = require('./mirror.js');

admin.initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 3, memory: '512MiB', timeoutSeconds: 300 });
const db = admin.firestore(), { Timestamp, FieldValue } = admin.firestore;
db.settings({ ignoreUndefinedProperties: true }); // a status report never fails over a missing value
const MIN_GAP = 60000, SETTLE = 4000, LOCK_MS = 8 * 60000, TZ = 'America/Chicago';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ms = (t) => (t && t.toMillis ? t.toMillis() : Number(t) || 0);

// The Sheets API as mirror.js wants it, and this function's own address (the one the coach shares the sheet with).
async function sheetsApi() {
  const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const client = await auth.getClient(), sheets = google.sheets({ version: 'v4', auth: client });
  let email = '';
  try { email = (await auth.getCredentials()).client_email || ''; } catch (e) { /* not a service-account credential */ }
  if (!email) { try { const r = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email', { headers: { 'Metadata-Flavor': 'Google' } }); email = (await r.text()).trim(); } catch (e) { /* not on Google Cloud */ } }
  const api = {
    get: async (id) => (await sheets.spreadsheets.get({ spreadsheetId: id, fields: 'properties.title,sheets(properties,charts(chartId),conditionalFormats(ranges),merges,basicFilter(range))' })).data,
    batchUpdate: async (id, requests) => (await sheets.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests } })).data.replies || [],
    values: async (id, range) => (await sheets.spreadsheets.values.get({ spreadsheetId: id, range, valueRenderOption: 'FORMATTED_VALUE' })).data.values || []
  };
  return { email, api };
}

async function runTeam(t, why) {
  const statusRef = db.doc(`teams/${t}/sheet/status`), stateRef = db.doc(`teams/${t}/sheet/state`);
  const got = await db.runTransaction(async (tx) => { const s = (await tx.get(statusRef)).data() || {}; if (s.lockAt && Date.now() - ms(s.lockAt) < LOCK_MS) return false; tx.set(statusRef, { lockAt: Timestamp.now() }, { merge: true }); return true; });
  if (!got) { logger.info(`sheet ${t}: another run has it (${why})`); return; }
  try { for (let i = 0; i < 4; i++) { if (!(await runOnce(t, why, stateRef, statusRef))) break; why = 'again'; } }
  catch (e) { logger.error(`sheet ${t}: ${e.message}`); try { await statusRef.set({ status: 'error', error: String(e.message || e).slice(0, 300), updatedAt: Timestamp.now() }, { merge: true }); } catch (e2) { /* nothing more to do */ } }
  finally { await statusRef.set({ lockAt: FieldValue.delete() }, { merge: true }); }
}
// One sync. Returns true when more content arrived meanwhile (the caller goes again).
async function runOnce(t, why, stateRef, statusRef) {
  let state = (await stateRef.get()).data() || {};
  const status = (await statusRef.get()).data() || {}, { email, api } = await sheetsApi();
  const put = (o) => statusRef.set({ ...o, saEmail: email, updatedAt: Timestamp.now() }, { merge: true });
  if (state.off || !state.sheetId) { await put({ status: state.hello ? 'needs-sheet' : 'off', error: '' }); return false; }
  const wait = Math.max(0, ms(status.lastSyncAt) + MIN_GAP - Date.now());
  if (wait) { logger.info(`sheet ${t}: waiting ${Math.round(wait / 1000)} s (one sync a minute)`); await sleep(wait); }
  await sleep(SETTLE); // the rest of a push lands
  state = (await stateRef.get()).data() || state; const reqAt = ms(state.requestedAt);
  if (state.off || !state.sheetId) { await put({ status: 'off', error: '' }); return false; }
  const docs = (await db.collection(`teams/${t}/sheet`).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
  const content = mirror.assemble(docs);
  if (!content.length) { await put({ status: 'ok', error: '', note: 'Nothing to show yet: open the app on a phone that is on the team and tap Sync now.', lastSyncAt: Timestamp.now() }); return false; }
  try {
    const r = await mirror.sync({ api, id: state.sheetId, content, status, now: Date.now(), tz: TZ, log: (m) => logger.info(`sheet ${t}: ${m}`) });
    await put({ status: 'ok', error: '', note: '', lastSyncAt: Timestamp.now(), applied: r.applied, charts: r.charts, sheetIds: r.sheetIds, title: r.title, url: r.url, changed: r.changed, runs: (status.runs || 0) + 1, why });
  } catch (e) {
    const code = e.code || (e.response && e.response.status), msg = String(e.message || e);
    logger.warn(`sheet ${t}: ${code || ''} ${msg}`);
    await put({ status: code === 403 || code === 404 ? 'needs-share' : 'error', lastSyncAt: Timestamp.now(),
      error: code === 404 ? 'The sheet link doesn’t open. Check the link, and share the sheet with the address above as Editor.' : code === 403 ? 'No access to the sheet yet: share it with the address above as Editor, then Sync now.' : msg.slice(0, 300) });
    return false;
  }
  const after = (await stateRef.get()).data() || {};
  return ms(after.requestedAt) > reqAt;
}

exports.sheetSync = onDocumentWritten('teams/{t}/sheet/{docId}', async (event) => {
  if (event.params.docId === 'status') return; // our own report
  await runTeam(event.params.t, event.params.docId);
});
exports.sheetDaily = onSchedule({ schedule: 'every day 05:30', timeZone: TZ }, async () => {
  const teams = await db.collection('teams').get();
  for (const team of teams.docs) {
    const st = (await db.doc(`teams/${team.id}/sheet/state`).get()).data();
    if (st && st.sheetId && !st.off) await runTeam(team.id, 'daily');
  }
});
