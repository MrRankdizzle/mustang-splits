/* Mustang Splits team sync, Phase 1 (roster, workouts, history).
   Loaded as an ES module after app.js. See CLAUDE.md "Team sync" before editing.

   Ground rules
   - Local first. app.js keeps running from localStorage exactly as before; this file only mirrors
     S.roster and S.workouts to Firestore and merges other coaches' changes back in.
   - Stopwatches never touch the network. Nothing here runs on the timing tick.
   - If this file or the Firebase SDK fails to load, app.js simply stays in local-only mode.

   How app.js and this file talk
   - app.js defines window.MSApp before this module runs. We call MSApp.syncReady(api) once,
     and app.js calls api.localChanged() after each save.
   - Remote changes go to MSApp.applyRemote(); status goes to MSApp.syncStatus().

   Change tracking ("shadow")
   - cfg.shadow holds, per athlete and workout id, the JSON we last saw on the server (or wrote).
   - Local item differs from shadow  -> edited on this phone: write it.
   - Shadow id missing locally       -> deleted on this phone: delete it.
   - Remote change arrives            -> apply it unless this phone has an unsent edit to the same item.
   Last write wins per athlete or workout.

   Passwords (never stored)
   - PBKDF2-SHA256(normalized password, fixed app salt) -> 64 hex chars = teamKeys document id.
   - The salt is fixed app-wide because a password alone must find its team.
   - This phone keeps the hash (cfg.key) so it can quietly rejoin if iOS resets its anonymous account.

   Team admin (2.1)
   - A second secret, the admin passphrase: PBKDF2 with a per-team salt (ADMIN_SALT + teamId) -> adminKeys doc id.
   - An admin device's membership carries {adminVersion, adminKey}; the rules accept them only with a valid key.
   - Only admins change the team password, change the admin passphrase, or rename the team (enforced by rules).
   - Admin devices keep cfg.adminKey/adminVersion so they stay admin through quiet rejoins and password changes. */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator,
  doc, collection, query, orderBy, limit, onSnapshot, writeBatch, setDoc, updateDoc, deleteDoc,
  getDocFromServer, getDocsFromServer, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const MSApp = window.MSApp;

// Safe to commit: security rules (firestore.rules) protect the data, not this config.
const firebaseConfig = {
  apiKey: 'AIzaSyD0K3-gEF3F93W14GP089ISnyB1G3D_HAg',
  authDomain: 'mustang-splits.firebaseapp.com',
  projectId: 'mustang-splits',
  storageBucket: 'mustang-splits.firebasestorage.app',
  messagingSenderId: '684343537974',
  appId: '1:684343537974:web:d46712882ce92d01174397'
};

const CFG_KEY = 'mustang-splits:sync';            // separate from the app's own key (never touch that one)
const SALT = 'mustang-splits/team-password/v1';   // changing this orphans every team: don't
const ADMIN_SALT = 'mustang-splits/admin-passphrase/v1/'; // + teamId. Same warning.
const ITERATIONS = 210000;
const MIN_PASSWORD = 12;
const PUSH_DELAY_MS = 800;

/* ---------- Firebase setup ---------- */
const fb = initializeApp(firebaseConfig);
const auth = getAuth(fb);
let db;
try {
  // Offline cache: edits made without signal are queued in IndexedDB and sent later.
  db = initializeFirestore(fb, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch (e) {
  db = getFirestore(fb); // IndexedDB unavailable (rare): memory cache, still works while open
}
// Local testing only: http://localhost:PORT/?emu uses the Firebase emulators instead of the real project.
if (['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).has('emu')) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8181);
}

const teamRef = (t) => doc(db, 'teams', t);
const memberRef = (t, uid) => doc(db, 'teams', t, 'members', uid);
const keyRef = (k) => doc(db, 'teamKeys', k);
const adminKeyRef = (k) => doc(db, 'adminKeys', k);
const athletesCol = (t) => collection(db, 'teams', t, 'athletes');
const workoutsCol = (t) => collection(db, 'teams', t, 'workouts');
const historyCol = (t) => collection(db, 'teams', t, 'history');

/* ---------- saved sync settings (this phone) ---------- */
// {teamId, teamName, key, pwVersion, out, pendingMerge, shadow:{athletes:{}, workouts:{}}}
function emptyShadow() { return { athletes: {}, workouts: {} }; }
function loadCfg() {
  try {
    const c = JSON.parse(localStorage.getItem(CFG_KEY) || '{}') || {};
    if (!c.shadow) c.shadow = emptyShadow();
    return c;
  } catch (e) { return { shadow: emptyShadow() }; }
}
let cfg = loadCfg();
function saveCfg() { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} }
const mode = () => (!cfg.teamId ? 'local' : cfg.out ? 'out' : 'joined');

/* ---------- small helpers ---------- */
function friendly(e) {
  const code = e && e.code;
  if (code === 'unavailable' || code === 'deadline-exceeded' || (e && e.message === 'timeout')) return 'No connection. This needs signal; try again when you have it.';
  if (code === 'permission-denied') return 'The team said no. The password may have just changed.';
  return (e && e.message) || 'Something went wrong.';
}
function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}
function normalizePassword(pw) {
  // Case and extra spaces don't matter, so "Gravel  Otter" from an autocapitalizing keyboard still works.
  return String(pw || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}
async function hashPassword(pw, salt = SALT) {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(normalizePassword(pw)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: ITERATIONS }, base, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const hashAdmin = (pw, teamId) => hashPassword(pw, ADMIN_SALT + teamId);
function checkPassword(pw) {
  if (normalizePassword(pw).length < MIN_PASSWORD) throw new Error(`Use at least ${MIN_PASSWORD} characters. A few words work well, like "gravel otter lantern 44".`);
}

/* ---------- auth: one silent anonymous account per phone ---------- */
// Always read the uid from auth.currentUser (what Firestore sends with each request), and never run two
// sign-ins at once: two parallel signInAnonymously calls on a fresh phone create two accounts.
let user = null;
let authWaiters = [];
let signingIn = null;
onAuthStateChanged(auth, (u) => {
  const changed = user && u && user.uid !== u.uid;
  user = u;
  if (u) { authWaiters.forEach((f) => f(u)); authWaiters = []; }
  if (changed && mode() === 'joined') lostAccess(); // new account: rejoin quietly with the saved key
  emit();
});
function signIn() {
  if (auth.currentUser || signingIn) return;
  signingIn = signInAnonymously(auth).catch(() => {}).finally(() => { signingIn = null; emit(); });
}
const uid = () => (auth.currentUser ? auth.currentUser.uid : null);
function ensureUser(ms = 12000) {
  if (user) return Promise.resolve(user);
  signIn();
  return withTimeout(new Promise((res) => authWaiters.push(res)), ms);
}

/* ---------- document shapes ---------- */
// What we store and compare. Keep key order stable: the JSON strings are compared directly.
function athleteData(a) {
  return { name: String(a.name || '').trim().slice(0, 30), group: String(a.group || '').trim().slice(0, 30) };
}
function workoutData(w) {
  return JSON.parse(JSON.stringify({ // drops undefined, which Firestore rejects
    name: String(w.name || '').slice(0, 80),
    reps: w.reps == null ? 1 : w.reps,
    rest: w.rest == null ? '' : w.rest,
    restUnit: w.restUnit || 'mss',
    segments: (w.segments || []).slice(0, 30)
  }));
}
const KINDS = {
  athletes: { data: athleteData, local: () => MSApp.getRoster(), col: athletesCol, pushable: (a) => !!String(a.name || '').trim() },
  workouts: { data: workoutData, local: () => MSApp.getWorkouts(), col: workoutsCol, pushable: () => true }
};
const ser = (kind, item) => JSON.stringify(KINDS[kind].data(item));
function fromRemote(kind, snap) {
  const d = snap.data();
  return kind === 'athletes'
    ? { id: snap.id, name: d.name || '', group: d.group || '' }
    : { id: snap.id, ...workoutData(d) };
}

/* ---------- admin state (this device) ---------- */
// cfg.adminKey/adminVersion: this device's admin proof. cfg.teamHasAdmin/teamAdminVersion: the team's, from its doc.
const isAdminHere = () => !!cfg.adminKey && !!cfg.teamHasAdmin && cfg.adminVersion === cfg.teamAdminVersion;
function adminFields() { return cfg.adminKey ? { adminVersion: cfg.adminVersion, adminKey: cfg.adminKey } : {}; }
function dropLocalAdmin() { cfg.adminKey = null; cfg.adminVersion = 0; saveCfg(); }
// Writes this device's membership. Keeps admin if the saved proof still works; otherwise joins as a member.
async function writeMember(teamId, pwVersion, key) {
  if (cfg.adminKey && cfg.teamId === teamId) {
    try { await withTimeout(setDoc(memberRef(teamId, uid()), { pwVersion, key, ...adminFields() }), 15000); return; }
    catch (e) { if (!e || e.code !== 'permission-denied') throw e; dropLocalAdmin(); } // admin passphrase changed meanwhile
  }
  await withTimeout(setDoc(memberRef(teamId, uid()), { pwVersion, key }), 15000);
}
function checkAdminDiffers(adminPw, teamPw) {
  checkPassword(adminPw);
  if (teamPw !== undefined && normalizePassword(adminPw) === normalizePassword(teamPw)) throw new Error('The admin passphrase must be different from the team password.');
}

/* ---------- status ---------- */
const meta = { athletes: null, workouts: null };   // latest snapshot metadata per collection
const synced = { athletes: false, workouts: false }; // got a server (not cache) snapshot yet
let pendingCommits = 0;
let lastError = null;
function info() {
  const m = mode();
  const offline = !navigator.onLine || (meta.athletes && meta.athletes.fromCache);
  const pending = pendingCommits > 0 || (meta.athletes && meta.athletes.hasPendingWrites) || (meta.workouts && meta.workouts.hasPendingWrites);
  let code = 'ok', text = 'Synced';
  if (m === 'local') { code = ''; text = ''; }
  else if (m === 'out') { code = 'error'; text = 'Signed out: the team password changed. Enter the new one to rejoin.'; }
  else if (lastError) { code = 'error'; text = 'Sync error: ' + lastError; }
  else if (!synced.athletes || !synced.workouts) { code = offline ? 'waiting' : 'busy'; text = offline ? 'Offline. Will sync when there is signal.' : 'Connecting…'; }
  else if (pending) { code = offline ? 'waiting' : 'busy'; text = offline ? 'Offline, changes waiting' : 'Syncing…'; }
  else if (offline) { code = 'ok'; text = 'Offline, no changes waiting'; }
  return { mode: m, teamName: cfg.teamName || '', code, text, pendingMerge: !!cfg.pendingMerge, signedIn: !!uid(),
    isAdmin: isAdminHere(), teamHasAdmin: !!cfg.teamHasAdmin };
}
function emit() { try { MSApp.syncStatus(info()); } catch (e) {} }
window.addEventListener('online', () => {
  signIn();
  if (mode() === 'joined' && !cfg.pendingMerge && !unsubs.length) ensureUser().then(start, () => emit());
  emit();
});
window.addEventListener('offline', emit);

/* ---------- pushing local changes ---------- */
let pushTimer = null;
function localChanged() {
  if (mode() !== 'joined' || cfg.pendingMerge) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushLocal, PUSH_DELAY_MS);
}
// Writes every athlete/workout whose JSON differs from the shadow, deletes shadow ids gone locally.
function pushLocal() {
  if (mode() !== 'joined' || cfg.pendingMerge || !uid()) return;
  const t = cfg.teamId, me = uid(), ops = [], undo = [];
  for (const kind of Object.keys(KINDS)) {
    const K = KINDS[kind], sh = cfg.shadow[kind], seen = new Set();
    for (const item of K.local()) {
      seen.add(item.id);
      if (!K.pushable(item)) continue;
      const s = ser(kind, item);
      if (sh[item.id] === s) continue;
      undo.push([kind, item.id, sh[item.id], s]); sh[item.id] = s;
      ops.push((b) => b.set(doc(K.col(t), item.id), { ...K.data(item), updatedAt: serverTimestamp(), updatedBy: me }));
    }
    for (const id of Object.keys(sh)) {
      if (seen.has(id)) continue;
      undo.push([kind, id, sh[id], undefined]); delete sh[id];
      ops.push((b) => b.delete(doc(K.col(t), id)));
    }
  }
  if (!ops.length) return;
  saveCfg();
  for (let i = 0; i < ops.length; i += 400) { // Firestore batches hold 500 writes
    const b = writeBatch(db); ops.slice(i, i + 400).forEach((op) => op(b));
    track(b.commit()).catch((e) => {
      // Put the shadow back so these edits are retried after a rejoin instead of being overwritten.
      for (const [kind, id, prev, now] of undo) {
        if (cfg.shadow[kind][id] === now) { if (prev === undefined) delete cfg.shadow[kind][id]; else cfg.shadow[kind][id] = prev; }
      }
      saveCfg();
      if (e && e.code === 'permission-denied') lostAccess(); else { lastError = friendly(e); emit(); }
    });
  }
  emit();
}
// A commit resolves only when the server confirms; offline it waits (queued in IndexedDB).
function track(p) {
  pendingCommits++; emit();
  return p.then((r) => { lastError = null; return r; }).finally(() => { pendingCommits--; emit(); });
}

/* ---------- receiving remote changes ---------- */
// Decides what to do with one id, given the remote item (or undefined if deleted there).
function reconcileOne(kind, id, remote, plan) {
  const local = KINDS[kind].local().find((x) => x.id === id);
  const sh = cfg.shadow[kind], s = sh[id];
  const l = local ? ser(kind, local) : undefined, r = remote ? ser(kind, remote) : undefined;
  if (r !== undefined && l !== undefined) {
    if (l === r) sh[id] = r;
    else if (s !== undefined && l !== s) { /* unsent edit here: keep it, pushLocal sends it */ }
    else plan.push({ kind, op: 'upsert', item: remote, s: r });
  } else if (r !== undefined) {
    if (s === undefined) plan.push({ kind, op: 'upsert', item: remote, s: r });
    // else: deleted here, delete not sent yet
  } else if (l !== undefined) {
    if (s !== undefined) {
      if (l === s) plan.push({ kind, op: 'remove', id });
      else delete sh[id]; // edited here after it was deleted there: keep it, it will be re-created
    }
    // else: new on this phone, pushLocal sends it
  } else delete sh[id];
}
function applyPlan(plan) {
  if (!plan.length) return;
  const ch = { athletes: { upsert: [], remove: [] }, workouts: { upsert: [], remove: [] } };
  plan.forEach((p) => (p.op === 'upsert' ? ch[p.kind].upsert.push(p.item) : ch[p.kind].remove.push(p.id)));
  // app.js may return ids it chose not to apply; those keep their old shadow and are compared again next time.
  // (It skips none today: started stopwatches run on their own plan copy.)
  const skipped = new Set((MSApp.applyRemote(ch) || {}).skipped || []);
  plan.forEach((p) => {
    const id = p.op === 'upsert' ? p.item.id : p.id;
    if (skipped.has(p.kind + ':' + id)) return;
    if (p.op === 'upsert') cfg.shadow[p.kind][id] = p.s; else delete cfg.shadow[p.kind][id];
  });
}
function onCollection(kind, snap) {
  meta[kind] = snap.metadata;
  const plan = [];
  if (!synced[kind]) {
    // Wait for the server's answer before a full comparison, so an empty or stale cache
    // is never mistaken for "everything was deleted".
    if (snap.metadata.fromCache) { emit(); return; }
    synced[kind] = true;
    const remote = new Map(snap.docs.map((d) => [d.id, fromRemote(kind, d)]));
    const ids = new Set([...remote.keys(), ...KINDS[kind].local().map((x) => x.id), ...Object.keys(cfg.shadow[kind])]);
    ids.forEach((id) => reconcileOne(kind, id, remote.get(id), plan));
  } else {
    snap.docChanges().forEach((c) => reconcileOne(kind, c.doc.id, c.type === 'removed' ? undefined : fromRemote(kind, c.doc), plan));
  }
  applyPlan(plan);
  saveCfg();
  pushLocal();
  emit();
}

/* ---------- listeners ---------- */
let unsubs = [];
function stop() {
  unsubs.forEach((u) => u()); unsubs = [];
  meta.athletes = meta.workouts = null; synced.athletes = synced.workouts = false;
}
function start() {
  stop();
  if (mode() !== 'joined') return;
  cfg.pendingMerge = false; saveCfg();
  lastError = null;
  const t = cfg.teamId, opts = { includeMetadataChanges: true };
  const fail = (e) => { if (e && e.code === 'permission-denied') lostAccess(); else { lastError = friendly(e); emit(); } };
  unsubs.push(onSnapshot(teamRef(t), opts, (s) => {
    if (!s.exists() || s.metadata.fromCache || s.metadata.hasPendingWrites) return;
    const d = s.data();
    if (d.pwVersion !== cfg.pwVersion) { lostAccess(); return; }
    if (d.name !== cfg.teamName) cfg.teamName = d.name;
    const was = isAdminHere();
    cfg.teamHasAdmin = d.hasAdmin === true; cfg.teamAdminVersion = d.adminVersion || 0;
    if (cfg.adminKey && (!cfg.teamHasAdmin || cfg.adminVersion !== cfg.teamAdminVersion)) {
      dropLocalAdmin();
      if (was) MSApp.notify(cfg.teamHasAdmin ? 'The admin passphrase changed. Enter it again in Settings to be admin on this device.' : 'This team has no admin now. Set an admin passphrase in Settings.');
    }
    saveCfg(); emit();
  }, fail));
  unsubs.push(onSnapshot(athletesCol(t), opts, (s) => onCollection('athletes', s), fail));
  unsubs.push(onSnapshot(workoutsCol(t), opts, (s) => onCollection('workouts', s), fail));
  unsubs.push(onSnapshot(query(historyCol(t), orderBy('savedAtMs', 'desc'), limit(30)), (s) => {
    MSApp.teamHistory(s.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, fail));
  emit();
}

/* ---------- losing access (password changed, or this phone's account was reset) ---------- */
let rejoining = false;
async function lostAccess() {
  if (rejoining || mode() !== 'joined') return;
  rejoining = true; stop();
  try {
    // Quiet rejoin with the saved hash. Works if only this phone's anonymous account changed.
    await ensureUser();
    const k = await getDocFromServer(keyRef(cfg.key));
    if (k.exists() && k.data().teamId === cfg.teamId) {
      await writeMember(cfg.teamId, k.data().pwVersion, cfg.key); // keeps admin if this device is admin
      cfg.pwVersion = k.data().pwVersion; saveCfg();
      rejoining = false; start(); return;
    }
    cfg.out = true; saveCfg(); MSApp.teamHistory([]);
    MSApp.notify(`The ${cfg.teamName || 'team'} password changed. Enter the new one in Settings to rejoin.`);
  } catch (e) {
    lastError = friendly(e); // probably offline: try again when back online
  }
  rejoining = false; emit();
}
// Coming back to the app: make sure this phone still belongs to the team.
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || mode() !== 'joined' || !navigator.onLine || !uid()) return;
  try {
    const s = await getDocFromServer(teamRef(cfg.teamId));
    if (!s.exists() || s.data().pwVersion !== cfg.pwVersion) lostAccess();
    else if (!unsubs.length) start();
  } catch (e) { if (e && e.code === 'permission-denied') lostAccess(); }
});

/* ---------- team actions (need signal) ---------- */
async function createTeam(name, password, adminPassword) {
  name = String(name || '').trim().slice(0, 40);
  if (!name) throw new Error('Give the team a name.');
  checkPassword(password);
  checkAdminDiffers(adminPassword, password);
  await ensureUser();
  const key = await hashPassword(password);
  if ((await withTimeout(getDocFromServer(keyRef(key)), 15000)).exists()) throw new Error('That password is already used by another team. Pick a different one.');
  const t = doc(collection(db, 'teams')).id;
  const adminKey = await hashAdmin(adminPassword, t);
  const b = writeBatch(db);
  b.set(teamRef(t), { name, pwVersion: 1, hasAdmin: true, adminVersion: 1, createdAt: serverTimestamp() });
  b.set(keyRef(key), { teamId: t, pwVersion: 1 });
  b.set(adminKeyRef(adminKey), { teamId: t, adminVersion: 1 });
  b.set(memberRef(t, uid()), { pwVersion: 1, key, adminVersion: 1, adminKey });
  await withTimeout(b.commit(), 15000);
  stop();
  cfg = { teamId: t, teamName: name, key, pwVersion: 1, out: false, pendingMerge: true, shadow: emptyShadow(),
    adminKey, adminVersion: 1, teamHasAdmin: true, teamAdminVersion: 1 };
  saveCfg(); emit();
  return { teamName: name, sameTeam: false };
}
async function joinTeam(password) {
  checkPassword(password);
  await ensureUser();
  const key = await hashPassword(password);
  const k = await withTimeout(getDocFromServer(keyRef(key)), 15000);
  if (!k.exists()) throw new Error('No team uses that password. Check it with your coaches and try again.');
  const { teamId, pwVersion } = k.data();
  const me = uid(), sameTeam = cfg.teamId === teamId;
  if (!sameTeam) dropLocalAdmin();
  await writeMember(teamId, pwVersion, key); // an admin device rejoining after a password change stays admin
  const team = await withTimeout(getDocFromServer(teamRef(teamId)), 15000);
  if (cfg.teamId && !sameTeam) deleteDoc(memberRef(cfg.teamId, me)).catch(() => {});
  stop();
  const td = team.data();
  cfg = { teamId, teamName: td.name, key, pwVersion, out: false, pendingMerge: !sameTeam, shadow: sameTeam ? cfg.shadow : emptyShadow(),
    adminKey: cfg.adminKey || null, adminVersion: cfg.adminVersion || 0, teamHasAdmin: td.hasAdmin === true, teamAdminVersion: td.adminVersion || 0 };
  saveCfg(); emit();
  if (sameTeam) start();
  return { teamName: cfg.teamName, sameTeam };
}
// The team's current athletes and workouts, for the first-join merge in app.js.
async function fetchRemote() {
  const t = cfg.teamId;
  const [a, w] = await withTimeout(Promise.all([getDocsFromServer(athletesCol(t)), getDocsFromServer(workoutsCol(t))]), 20000);
  return { athletes: a.docs.map((d) => fromRemote('athletes', d)), workouts: w.docs.map((d) => fromRemote('workouts', d)) };
}
async function changePassword(current, next) {
  checkPassword(next);
  if (mode() !== 'joined') throw new Error('Join the team first.');
  if (!isAdminHere()) throw new Error('Only the team admin can change the password.');
  await ensureUser();
  const oldKey = await hashPassword(current), newKey = await hashPassword(next);
  if ((await hashAdmin(next, cfg.teamId)) === cfg.adminKey) throw new Error('The team password must be different from the admin passphrase.');
  if (oldKey === newKey) throw new Error('The new password is the same as the current one.');
  const k = await withTimeout(getDocFromServer(keyRef(oldKey)), 15000);
  if (!k.exists() || k.data().teamId !== cfg.teamId) throw new Error('The current password isn’t right.');
  if ((await withTimeout(getDocFromServer(keyRef(newKey)), 15000)).exists()) throw new Error('That new password is already taken. Pick a different one.');
  const v = (await withTimeout(getDocFromServer(teamRef(cfg.teamId)), 15000)).data().pwVersion;
  const t = cfg.teamId, b = writeBatch(db);
  b.delete(keyRef(oldKey));
  b.set(keyRef(newKey), { teamId: t, pwVersion: v + 1 });
  b.update(teamRef(t), { pwVersion: v + 1 });
  b.set(memberRef(t, uid()), { pwVersion: v + 1, key: newKey, ...adminFields() });
  const prev = { key: cfg.key, pwVersion: cfg.pwVersion };
  cfg.key = newKey; cfg.pwVersion = v + 1; saveCfg(); // before commit, so our own listener doesn't lock us out
  try { await withTimeout(b.commit(), 15000); }
  catch (e) { Object.assign(cfg, prev); saveCfg(); throw e; }
  emit();
}
// Any member, while the team has no admin: the first device to do this becomes admin.
async function setAdmin(adminPassword) {
  if (mode() !== 'joined') throw new Error('Join the team first.');
  checkPassword(adminPassword);
  if ((await hashPassword(adminPassword)) === cfg.key) throw new Error('The admin passphrase must be different from the team password.');
  await ensureUser();
  const t = cfg.teamId, td = (await withTimeout(getDocFromServer(teamRef(t)), 15000)).data();
  if (td.hasAdmin === true) { cfg.teamHasAdmin = true; cfg.teamAdminVersion = td.adminVersion || 0; saveCfg(); emit(); throw new Error('This team already has an admin.'); }
  const v = (td.adminVersion || 0) + 1, adminKey = await hashAdmin(adminPassword, t);
  const b = writeBatch(db);
  b.set(adminKeyRef(adminKey), { teamId: t, adminVersion: v });
  b.update(teamRef(t), { hasAdmin: true, adminVersion: v });
  b.set(memberRef(t, uid()), { pwVersion: cfg.pwVersion, key: cfg.key, adminVersion: v, adminKey });
  const prev = { adminKey: cfg.adminKey, adminVersion: cfg.adminVersion, teamHasAdmin: cfg.teamHasAdmin, teamAdminVersion: cfg.teamAdminVersion };
  Object.assign(cfg, { adminKey, adminVersion: v, teamHasAdmin: true, teamAdminVersion: v }); saveCfg();
  try { await withTimeout(b.commit(), 15000); }
  catch (e) {
    Object.assign(cfg, prev); saveCfg();
    if (e && e.code === 'permission-denied') throw new Error('Another coach just set the admin passphrase first.');
    throw e;
  }
  emit();
}
// Enter the admin passphrase on another device (e.g. a Mac).
async function becomeAdmin(adminPassword) {
  if (mode() !== 'joined') throw new Error('Join the team first.');
  await ensureUser();
  const t = cfg.teamId, adminKey = await hashAdmin(adminPassword, t);
  let k = null;
  try { k = await withTimeout(getDocFromServer(adminKeyRef(adminKey)), 15000); }
  catch (e) { if (!e || e.code !== 'permission-denied') throw e; } // a wrong hash reads as "not allowed"
  if (!k || !k.exists() || k.data().teamId !== t) throw new Error('That isn\u2019t the admin passphrase.');
  const v = k.data().adminVersion;
  await withTimeout(setDoc(memberRef(t, uid()), { pwVersion: cfg.pwVersion, key: cfg.key, adminVersion: v, adminKey }), 15000);
  Object.assign(cfg, { adminKey, adminVersion: v, teamHasAdmin: true, teamAdminVersion: v }); saveCfg(); emit();
}
async function changeAdmin(current, next) {
  if (!isAdminHere()) throw new Error('Only the team admin can do this.');
  checkPassword(next);
  if ((await hashPassword(next)) === cfg.key) throw new Error('The admin passphrase must be different from the team password.');
  await ensureUser();
  const t = cfg.teamId, oldKey = await hashAdmin(current, t), newKey = await hashAdmin(next, t);
  if (oldKey !== cfg.adminKey) throw new Error('The current admin passphrase isn\u2019t right.');
  if (newKey === oldKey) throw new Error('The new admin passphrase is the same as the current one.');
  const v = (await withTimeout(getDocFromServer(teamRef(t)), 15000)).data().adminVersion || 0;
  const b = writeBatch(db);
  b.delete(adminKeyRef(oldKey));
  b.set(adminKeyRef(newKey), { teamId: t, adminVersion: v + 1 });
  b.update(teamRef(t), { adminVersion: v + 1 });
  b.set(memberRef(t, uid()), { pwVersion: cfg.pwVersion, key: cfg.key, adminVersion: v + 1, adminKey: newKey });
  const prev = { adminKey: cfg.adminKey, adminVersion: cfg.adminVersion, teamAdminVersion: cfg.teamAdminVersion };
  Object.assign(cfg, { adminKey: newKey, adminVersion: v + 1, teamAdminVersion: v + 1 }); saveCfg(); // before commit: our listener must not drop us
  try { await withTimeout(b.commit(), 15000); }
  catch (e) { Object.assign(cfg, prev); saveCfg(); throw e; }
  emit();
}
async function renameTeam(name) {
  if (!isAdminHere()) throw new Error('Only the team admin can rename the team.');
  name = String(name || '').trim().slice(0, 40);
  if (!name) throw new Error('Give the team a name.');
  await withTimeout(updateDoc(teamRef(cfg.teamId), { name }), 15000);
  cfg.teamName = name; saveCfg(); emit();
}
// "Stop being admin on this device" (e.g. a borrowed device). The team keeps its admin passphrase.
async function dropAdmin() {
  if (mode() !== 'joined') { dropLocalAdmin(); emit(); return; }
  await withTimeout(setDoc(memberRef(cfg.teamId, uid()), { pwVersion: cfg.pwVersion, key: cfg.key }), 15000);
  dropLocalAdmin(); emit();
}
function leave() {
  const t = cfg.teamId, me = uid();
  stop();
  if (t && me) deleteDoc(memberRef(t, me)).catch(() => {});
  cfg = { shadow: emptyShadow() }; saveCfg();
  MSApp.teamHistory([]); emit();
}

// Restore from a backup file while joined: don't treat the restored lists as edits (that could delete
// other coaches' athletes). Instead, forget the shadow and ask the merge question again after the reload.
function markRestored() {
  if (mode() === 'local') return;
  cfg.shadow = emptyShadow(); cfg.pendingMerge = true; saveCfg(); stop();
}

/* ---------- history (written by Clear track) ---------- */
function saveHistory(rec) {
  if (mode() !== 'joined' || !uid()) return false;
  const ref = doc(historyCol(cfg.teamId));
  track(setDoc(ref, { date: rec.date, savedAtMs: rec.savedAtMs, savedBy: uid(), watches: rec.watches }))
    .catch((e) => { lastError = friendly(e); emit(); });
  return true; // queued; offline it goes out later
}
function deleteHistory(id) {
  if (mode() !== 'joined') return;
  track(deleteDoc(doc(historyCol(cfg.teamId), id))).catch((e) => { lastError = friendly(e); emit(); });
}

/* ---------- boot ---------- */
MSApp.syncReady({
  info, localChanged, start, createTeam, joinTeam, fetchRemote, changePassword, leave, markRestored,
  setAdmin, becomeAdmin, changeAdmin, renameTeam, dropAdmin,
  saveHistory, deleteHistory, minPassword: MIN_PASSWORD
});
signIn();
if (mode() === 'joined' && !cfg.pendingMerge) ensureUser().then(start, () => emit());
emit();
