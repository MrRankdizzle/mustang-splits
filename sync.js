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
   - Admin devices keep cfg.adminKey/adminVersion so they stay admin through quiet rejoins and password changes.

   Race Mode (2.2)
   - teams/{t}/races/{raceId} holds the race (name, status, gun, checkpoints, runners); each tap is its own doc
     in races/{raceId}/marks, mirrored with the same shadow approach (kind 'marks'). One race is mirrored at a
     time (cfg.raceId). Writes happen on setup edits, the gun, taps and edits; never per tick.
   - measureClock() writes clock/{uid} = serverTimestamp() a few times and keeps the sample with the shortest
     round trip: offset = server time - midpoint. app.js stores it (CLOCK.off) and adds it to every race event.
   Race Mode 2.4
   - Each coach in a running race writes races/{raceId}/coaches/{uid} = {cp, name, ver, at}, only when it changes
     (checkpoint picked, name edited). app.js shows "2 coaches at Finish" and "Coach Jen needs to update" from it.
   - Discard deletes every mark and presence doc and overwrites the race with an empty tombstone
     {status:'discarded'}. The rules refuse any later write to it, so a phone that was offline can't bring it back.
   2.5
   - teams/{t}/courses/{id} (saved courses: name + checkpoints) and teams/{t}/prs/{athleteId} ({list:[{dist, t}]})
     are mirrored like workouts (kinds 'courses' and 'prs'). PRs live in their own collection so a phone on an
     older version that rewrites an athlete document can never wipe them.
   - 2.7: teams/{t}/series/{id} ({name}) and teams/{t}/meets/{id} ({seriesId, courseId, date, time, kind, levels,
     season}) are mirrored like courses (soft delete). Athletes may carry gender ('G'/'B'); races carry meetId and division.
   - info().race tells the race screen whether its taps are on the server ('saved'), on their way ('saving'),
     or waiting for signal ('offline').
   Data safety (2.6)
   - Nothing is deleted. A removal is {deleted:true, deletedAt, deletedBy} on the same document (content kept);
     the shadow for such an id is '~' + its JSON. Restore writes the item again. Mark corrections append versions
     to m.hist with arrayUnion; history corrections append to h.edits. firestore.rules enforce all of this.
   - A refused write is never retried in a loop: refused() checks whether this phone is still a member. Only an
     invalid membership means "password changed"; otherwise that one change is reported, set aside, and tried
     again once the next time the app opens (e.g. after new rules are published). */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator,
  doc, collection, query, orderBy, limit, onSnapshot, writeBatch, setDoc, updateDoc, deleteDoc,
  getDoc, getDocs, getDocFromServer, getDocsFromServer, serverTimestamp, where, arrayUnion
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
const racesCol = (t) => collection(db, 'teams', t, 'races');
const raceRef = (t, id) => doc(db, 'teams', t, 'races', id);
const marksCol = (t, id) => collection(db, 'teams', t, 'races', id, 'marks');
const coachesCol = (t, id) => collection(db, 'teams', t, 'races', id, 'coaches');
const coursesCol = (t) => collection(db, 'teams', t, 'courses');
const seriesCol = (t) => collection(db, 'teams', t, 'series');
const meetsCol = (t) => collection(db, 'teams', t, 'meets');
const mergesCol = (t) => collection(db, 'teams', t, 'merges'); // merged runners (2.9.2, admin writes)
const prsCol = (t) => collection(db, 'teams', t, 'prs');
const placesCol = (t) => collection(db, 'teams', t, 'places'); // race locations (3.2)
const weatherCol = (t) => collection(db, 'teams', t, 'weather'); // race-day weather from Open-Meteo (3.2)
const clockRef = (u) => doc(db, 'clock', u);
const devicesCol = (t) => collection(db, 'teams', t, 'devices');
const purgesCol = (t) => collection(db, 'teams', t, 'purges');
const officialCol = (t) => collection(db, 'teams', t, 'official'); // imported career history (2.9, admin-only writes)

/* ---------- saved sync settings (this phone) ---------- */
// {teamId, teamName, key, pwVersion, out, pendingMerge, shadow:{athletes:{}, workouts:{}}}
function emptyShadow() { return { athletes: {}, workouts: {}, courses: {}, prs: {}, series: {}, meets: {}, merges: {}, places: {}, weather: {}, marks: {}, race: null, presence: null }; }
function loadCfg() {
  try {
    const c = JSON.parse(localStorage.getItem(CFG_KEY) || '{}') || {};
    if (!c.shadow) c.shadow = emptyShadow();
    ['marks', 'courses', 'prs', 'series', 'meets', 'merges', 'places', 'weather'].forEach((k) => { if (!c.shadow[k]) c.shadow[k] = {}; });
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
  const d = { name: String(a.name || '').trim().slice(0, 30), group: String(a.group || '').trim().slice(0, 30) };
  if (a.gender === 'G' || a.gender === 'B') d.gender = a.gender; // 2.7: Girls/Boys (blank is left out)
  return d;
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
function markData(m) {
  // byName (2.4): the recording coach's name. null = sent by a phone older than 2.4.
  const d = { cp: String(m.cp), local: Number(m.local), off: m.off == null ? null : Number(m.off), runnerId: m.runnerId || null, by: String(m.by || ''),
    byName: m.byName == null ? null : String(m.byName).slice(0, 30) };
  // A mark that has been changed carries every version (2.6). A fresh tap has none: the shape older rules accept.
  if (Array.isArray(m.hist) && m.hist.length) {
    d.deleted = !!m.deleted; d.chosen = !!m.chosen;
    d.hist = m.hist.map((v) => ({ cp: String(v.cp), runnerId: v.runnerId || null, local: Number(v.local), off: v.off == null ? null : Number(v.off),
      deleted: !!v.deleted, chosen: !!v.chosen, uid: String(v.uid || ''), dev: String(v.dev || ''), byName: String(v.byName || '').slice(0, 30), at: Number(v.at) || 0,
      ...(v.warn ? { warn: String(v.warn).slice(0, 40) } : {}) })); // warn: saved despite a warning (2.7.1)
  }
  return d;
}
const numOrNull = (v) => (v == null || v === '' || !isFinite(+v) ? null : Number(v));
function raceData(r) {
  return {
    name: String(r.name || '').slice(0, 60), status: r.status,
    gun: r.gun ? { local: Number(r.gun.local), off: r.gun.off == null ? null : Number(r.gun.off), by: String(r.gun.by || '') } : null,
    checkpoints: (r.checkpoints || []).map((c) => ({ id: c.id, name: String(c.name || '').slice(0, 20), dist: numOrNull(c.dist), unit: c.unit === 'm' ? 'm' : 'mi' })),
    runners: (r.runners || []).map((x) => ({ id: x.id, name: String(x.name || ''), group: x.group || '', goal: numOrNull(x.goal), goalTag: x.goalTag ? String(x.goalTag).slice(0, 8) : null, pr: numOrNull(x.pr), sb: numOrNull(x.sb) })),
    courseId: r.courseId || null, goalSrc: String(r.goalSrc || 'custom').slice(0, 10), // 2.5
    meetId: r.meetId || null, division: String(r.division || '').slice(0, 4) // 2.7
  };
}
function courseData(c) {
  return { name: String(c.name || '').slice(0, 40), checkpoints: (c.checkpoints || []).slice(0, 12).map((x) => ({ id: String(x.id || ''), name: String(x.name || '').slice(0, 20), dist: numOrNull(x.dist), unit: x.unit === 'm' ? 'm' : 'mi' })) };
}
function seriesData(x) { return { name: String(x.name || '').slice(0, 40) }; }
function meetData(m) { // 2.7
  return { seriesId: String(m.seriesId || ''), courseId: m.courseId || '', date: /^\d{4}-\d\d-\d\d$/.test(m.date || '') ? m.date : '',
    time: String(m.time || '').slice(0, 12), kind: String(m.kind || '').slice(0, 30), levels: (m.levels || []).filter((l) => l === 'V' || l === 'JV'), season: Number(m.season) || 0 };
}
// 3.2: a race location and a race day's weather. A phone's own retry counters (tries, next) stay on that phone.
const numIn = (v, lo, hi) => (typeof v === 'number' && isFinite(v) && v >= lo && v <= hi ? Math.round(v * 1e4) / 1e4 : null);
function placeData(p) {
  return { name: String(p.name || '').slice(0, 40), lat: numIn(p.lat, -90, 90), lon: numIn(p.lon, -180, 180), label: String(p.label || '').slice(0, 60),
    src: String(p.src || '').slice(0, 10), confirmed: p.confirmed === true, confirmedBy: String(p.confirmedBy || '').slice(0, 30) };
}
const WX_KEYS = ['t', 'at', 'dp', 'rh', 'ws', 'wg', 'pr', 'pr48', 'cc'];
function weatherData(w) {
  const wx = w.wx && typeof w.wx === 'object' ? Object.fromEntries(WX_KEYS.map((k) => [k, numIn(w.wx[k], -100, 200)])) : null;
  return { date: /^\d{4}-\d\d-\d\d$/.test(w.date || '') ? w.date : '', place: String(w.place || '').slice(0, 60), raceId: String(w.raceId || '').slice(0, 40),
    lat: numIn(w.lat, -90, 90), lon: numIn(w.lon, -180, 180), start: Number(w.start) || 0, end: Number(w.end) || 0, src: String(w.src || '').slice(0, 10),
    status: w.status === 'ok' ? 'ok' : 'pending', wx: w.status === 'ok' ? wx : null, at: Number(w.at) || 0,
    dismissed: (w.dismissed || []).filter((k) => ['hot', 'warm', 'cold', 'windy', 'mud'].includes(k)).slice(0, 5) };
}
function mergeData(m) { return { to: String(m.to || ''), at: Number(m.at) || 0, byName: String(m.byName || '').slice(0, 30) }; } // 2.9.2
function prData(p) { // deleted entries stay in the list (2.6)
  // 2.10: an entry is a typed race result {id, dist, t, date, meet, src}; a PR typed before 2.10 is just {dist, t}
  const extra = (x) => (x.id ? { id: String(x.id).slice(0, 40), date: /^\d{4}-\d\d-\d\d$/.test(x.date || '') ? x.date : '', meet: String(x.meet || '').slice(0, 60), src: x.src === 'official' ? 'official' : 'hand' } : {});
  return { list: (p.list || []).slice(0, 60).map((x) => (x.deleted ? { dist: Number(x.dist), t: Number(x.t), ...extra(x), deleted: true, deletedAt: Number(x.deletedAt) || 0, deletedBy: String(x.deletedBy || '') } : { dist: Number(x.dist), t: Number(x.t), ...extra(x) })) };
}
// The race this phone mirrors is the one on screen (S.race) once adopted as cfg.raceId.
const raceMirrored = () => { const r = MSApp.getRace(); return !!(cfg.raceId && r && r.id === cfg.raceId); };
const KINDS = {
  athletes: { data: athleteData, local: () => MSApp.getRoster(), col: athletesCol, pushable: (a) => !!String(a.name || '').trim() },
  workouts: { data: workoutData, local: () => MSApp.getWorkouts(), col: workoutsCol, pushable: () => true },
  courses: { data: courseData, local: () => MSApp.getCourses(), col: coursesCol, pushable: (c) => !!String(c.name || '').trim() },
  prs: { data: prData, local: () => MSApp.getPrs(), col: prsCol, pushable: (p) => !!(p.list && p.list.length), noDelete: true },
  series: { data: seriesData, local: () => MSApp.getSeries(), col: seriesCol, pushable: (x) => !!String(x.name || '').trim() },
  meets: { data: meetData, local: () => MSApp.getMeets(), col: meetsCol, pushable: (m) => !!m.seriesId },
  merges: { data: mergeData, local: () => (MSApp.getMerges ? MSApp.getMerges() : []), col: mergesCol, pushable: (m) => !!m.to },
  places: { data: placeData, local: () => (MSApp.getPlaces ? MSApp.getPlaces() : []), col: placesCol, pushable: (p) => !!p.id }, // 3.2
  weather: { data: weatherData, local: () => (MSApp.getWeather ? MSApp.getWeather() : []), col: weatherCol, pushable: (w) => !!w.date }, // 3.2
  marks: { data: markData, local: () => (raceMirrored() ? MSApp.getMarks() : []), col: (t) => marksCol(t, cfg.raceId), pushable: () => true, raceOnly: true, noDelete: true }
};
const ser = (kind, item) => JSON.stringify(KINDS[kind].data(item));
function fromRemote(kind, snap) {
  const d = snap.data(), dm = d.deleted === true ? { deleted: true, deletedAt: d.deletedAt && d.deletedAt.toMillis ? d.deletedAt.toMillis() : Date.now(), deletedBy: d.deletedBy || '' } : null;
  const item = fromRemoteData(kind, snap.id, d);
  return dm && kind !== 'marks' ? { ...item, _del: dm } : item;
}
function fromRemoteData(kind, id, d) {
  const snap = { id, data: () => d };
  if (kind === 'athletes') return { id: snap.id, name: d.name || '', group: d.group || '', gender: d.gender === 'G' || d.gender === 'B' ? d.gender : '' };
  if (kind === 'series') return { id: snap.id, ...seriesData(d) };
  if (kind === 'meets') return { id: snap.id, ...meetData(d) };
  if (kind === 'merges') return { id: snap.id, ...mergeData(d) };
  if (kind === 'places') return { id: snap.id, ...placeData(d) };
  if (kind === 'weather') return { id: snap.id, ...weatherData(d) };
  if (kind === 'marks') return { id: snap.id, ...markData(d) };
  if (kind === 'courses') return { id: snap.id, ...courseData(d) };
  if (kind === 'prs') return { id: snap.id, ...prData(d) };
  return { id: snap.id, ...workoutData(d) };
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
const meta = { athletes: null, workouts: null, courses: null, prs: null, series: null, meets: null, merges: null, places: null, weather: null, marks: null };
const quietKinds = new Set(); // 3.2: places/weather refused by rules published before 3.2: not pushed, not an error   // latest snapshot metadata per collection
let mergesRefused = false; // the merges listener was refused: the published rules are older than 2.9.2 (2.12)
const synced = { athletes: false, workouts: false, courses: false, prs: false, series: false, meets: false, merges: false, places: false, weather: false, marks: false }; // got a server (not cache) snapshot yet
let pendingCommits = 0;
let lastError = null;
function info() {
  const m = mode();
  const offline = !navigator.onLine || (meta.athletes && meta.athletes.fromCache);
  const pending = pendingCommits > 0 || (meta.athletes && meta.athletes.hasPendingWrites) || (meta.workouts && meta.workouts.hasPendingWrites) || (meta.marks && meta.marks.hasPendingWrites);
  let code = 'ok', text = 'Synced';
  if (m === 'local') { code = ''; text = ''; }
  else if (m === 'out') { code = 'error'; text = 'Signed out: the team password changed. Enter the new one to rejoin.'; }
  else if (lastError) { code = 'error'; text = 'Sync error: ' + lastError; }
  else if (!synced.athletes || !synced.workouts) { code = offline ? 'waiting' : 'busy'; text = offline ? 'Offline. Will sync when there is signal.' : 'Connecting…'; }
  else if (pending) { code = offline ? 'waiting' : 'busy'; text = offline ? 'Offline, changes waiting' : 'Syncing…'; }
  else if (offline) { code = 'ok'; text = 'Offline, no changes waiting'; }
  return { mode: m, teamName: cfg.teamName || '', code, text, pendingMerge: !!cfg.pendingMerge, signedIn: !!uid(),
    isAdmin: isAdminHere(), teamHasAdmin: !!cfg.teamHasAdmin, minVersion: m === 'joined' ? cfg.minVersion || '' : '', race: raceSaveState(), refused: Object.keys(cfg.refused || {}).length,
    mergesBlocked: m === 'joined' && (mergesRefused || Object.keys(cfg.refused || {}).some((k) => k.startsWith('merges:'))) }; // 2.12: the team's published rules predate merges (2.9.2)
}
// The race on screen: 'saved' (everything on the server), 'saving', 'offline' (waiting for signal), or ''.
function raceSaveState() {
  if (mode() !== 'joined' || !cfg.raceId || !raceMirrored()) return '';
  const offline = !navigator.onLine || !meta.marks || meta.marks.fromCache;
  const pending = pendingCommits > 0 || pushWaiting || (meta.marks && meta.marks.hasPendingWrites) || !synced.marks;
  return pending ? (offline ? 'offline' : 'saving') : 'saved';
}
function emit() { try { MSApp.syncStatus(info()); } catch (e) {} }
window.addEventListener('online', () => {
  signIn();
  if (mode() === 'joined' && !cfg.pendingMerge && !unsubs.length) ensureUser().then(start, () => emit());
  emit();
});
window.addEventListener('offline', emit);

/* ---------- pushing local changes ---------- */
let pushTimer = null, pushWaiting = false;
function localChanged() {
  if (mode() !== 'joined' || cfg.pendingMerge) return;
  clearTimeout(pushTimer);
  if (!pushWaiting) { pushWaiting = true; emit(); }
  pushTimer = setTimeout(pushLocal, PUSH_DELAY_MS);
}
// Writes every athlete/workout whose JSON differs from the shadow, deletes shadow ids gone locally.
function pushLocal() {
  pushWaiting = false;
  if (mode() !== 'joined' || cfg.pendingMerge || !uid()) { emit(); return; }
  const t = cfg.teamId, me = uid(), ops = [];
  ensureRace();
  pushRaceDoc(t, me);
  pushPresence(t, me);
  const refusedNow = cfg.refused || {};
  for (const kind of Object.keys(KINDS)) {
    const K = KINDS[kind], sh = cfg.shadow[kind], seen = new Set();
    if (K.raceOnly && !raceMirrored()) continue; // never touch a race's marks unless that race is the one on screen
    if (quietKinds.has(kind) || !synced[kind] && (kind === 'places' || kind === 'weather')) continue; // 3.2: only once the team's rules allow them
    for (const item of K.local()) {
      seen.add(item.id);
      if (!K.pushable(item)) continue;
      const s = ser(kind, item), prev = sh[item.id];
      if (prev === s || refusedNow[kind + ':' + item.id] === s) continue; // unchanged, or this exact change was refused
      const ref = doc(K.col(t), item.id), data = K.data(item);
      let op;
      if (kind === 'marks' && data.hist && prev && prev[0] !== '~') {
        // a correction: send only the new versions (arrayUnion), so two coaches' corrections both land
        // (also the first correction: the original version is identical on every phone, so it merges)
        const had = (JSON.parse(prev).hist || []).length, rest = { ...data }; delete rest.hist;
        op = (bt) => bt.update(ref, { ...rest, hist: arrayUnion(...data.hist.slice(had)), updatedAt: serverTimestamp(), updatedBy: me });
      } else op = (bt) => bt.set(ref, { ...data, updatedAt: serverTimestamp(), updatedBy: me }); // new, edited, or restored
      sh[item.id] = s; ops.push({ kind, id: item.id, prev, now: s, op });
    }
    if (K.noDelete) continue; // marks and PR lists are never removed as documents
    for (const id of Object.keys(sh)) {
      if (seen.has(id) || sh[id][0] === '~') continue;
      // removed on this phone: a soft delete. The document keeps its content; Recently deleted can restore it.
      const prev = sh[id], now = '~' + prev, ref = doc(K.col(t), id);
      if (refusedNow[kind + ':' + id] === now) continue;
      sh[id] = now;
      ops.push({ kind, id, prev, now, op: (bt) => bt.update(ref, { deleted: true, deletedAt: serverTimestamp(), deletedBy: me, updatedAt: serverTimestamp(), updatedBy: me }) });
    }
  }
  if (!ops.length) { emit(); return; }
  saveCfg();
  for (let i = 0; i < ops.length; i += 400) commitOps(ops.slice(i, i + 400)); // Firestore batches hold 500 writes
  emit();
}
function undoShadow(list) {
  for (const o of list) { if (cfg.shadow[o.kind][o.id] === o.now) { if (o.prev === undefined) delete cfg.shadow[o.kind][o.id]; else cfg.shadow[o.kind][o.id] = o.prev; } }
  saveCfg();
}
function commitOps(list) {
  const b = writeBatch(db); list.forEach((o) => o.op(b));
  track(b.commit()).then(() => { list.forEach((o) => { if (o.now[0] === '~') MSApp.softDeleted(o.kind, o.id); }); })
    .catch((e) => {
      undoShadow(list); // so these edits are sent again later instead of being overwritten
      if (e && e.code === 'not-found') return; // soft delete of something the server never had: nothing to do
      if (e && e.code === 'permission-denied') refused(list, e); else { lastError = friendly(e); emit(); }
    });
}
/* ---------- refused writes (2.6): never a loop ---------- */
// Is this phone still a member with the current password? true / false / null (can't tell: offline).
async function stillMember() {
  if (!uid()) return null;
  try {
    const m = await withTimeout(getDocFromServer(memberRef(cfg.teamId, uid())), 10000);
    if (!m.exists()) return false;
    const t = await withTimeout(getDocFromServer(teamRef(cfg.teamId)), 10000);
    return t.exists() && t.data().pwVersion === m.data().pwVersion;
  } catch (e) { return e && e.code === 'permission-denied' ? false : null; }
}
const stats = { refusals: 0, rejoins: 0 };
let refusing = false;
// A batch was refused. Membership invalid -> rejoin (password changed / account reset). Still a member -> find
// which change(s) the team refused, one by one, set exactly those aside and say so. Never retried in a loop.
async function refused(list, e, label) {
  const ok = await stillMember();
  if (ok === false) { lostAccess(); return; }
  if (ok === null) { lastError = friendly(e); emit(); return; } // offline: sent again later as usual
  if (!cfg.refused) cfg.refused = {};
  const bad = [];
  for (const o of (list || [])) {
    if (list.length > 1) {
      try { const b = writeBatch(db); o.op(b); await withTimeout(b.commit(), 15000); if (cfg.shadow[o.kind]) cfg.shadow[o.kind][o.id] = o.now; continue; }
      catch (e2) { if (!e2 || e2.code !== 'permission-denied') continue; }
    }
    cfg.refused[o.kind + ':' + o.id] = o.now; bad.push(o); stats.refusals++;
  }
  if (!list) stats.refusals++;
  saveCfg();
  const n = list ? bad.length : 1;
  if (n) { lastError = `${n} change${n === 1 ? ' was' : 's were'} refused by the team${label ? ' (' + label + ')' : ''}. ${n === 1 ? 'It' : 'They'}'ll be tried again next time the app opens.`; emit(); }
}
// Listener refused: same check, never a loop.
async function listenerRefused(e, what) {
  const ok = await stillMember();
  if (ok === false) lostAccess(); else { lastError = ok === null ? friendly(e) : `The team refused to share ${what}.`; emit(); }
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
  const l = local ? ser(kind, local) : undefined;
  if (remote && remote._del) { // soft-deleted on the server (by any coach)
    const rr = '~' + ser(kind, remote);
    if (l !== undefined && s !== undefined && s[0] !== '~' && l !== s) return; // edited here since: keep it; pushLocal restores it
    if (l !== undefined) { plan.push({ kind, op: 'trash', item: remote, s: rr }); return; }
    if (s !== rr) plan.push({ kind, op: 'trash', item: remote, s: rr, quiet: s !== undefined && s[0] === '~' });
    return;
  }
  const r = remote ? ser(kind, remote) : undefined;
  if (r !== undefined && l !== undefined) {
    if (l === r) sh[id] = r;
    else if (s !== undefined && s[0] !== '~' && l !== s) { /* unsent edit here: keep it, pushLocal sends it */ }
    else plan.push({ kind, op: 'upsert', item: remote, s: r });
  } else if (r !== undefined) {
    if (s === undefined || s[0] === '~') plan.push({ kind, op: 'upsert', item: remote, s: r }); // new there, or restored there
    // else: removed here, soft delete not sent yet
  } else if (l !== undefined) {
    if (s !== undefined && s[0] !== '~' && l === s) plan.push({ kind, op: 'remove', id }); // gone from the server: only an admin purge does that
    else if (s !== undefined) delete sh[id];
  } else delete sh[id];
}
function applyPlan(plan) {
  if (!plan.length) return;
  const ch = {}; Object.keys(KINDS).forEach((k) => { ch[k] = { upsert: [], remove: [], trash: [] }; });
  plan.forEach((p) => (p.op === 'upsert' ? ch[p.kind].upsert.push(p.item) : p.op === 'trash' ? ch[p.kind].trash.push(p.item) : ch[p.kind].remove.push(p.id)));
  const skipped = new Set((MSApp.applyRemote(ch) || {}).skipped || []);
  plan.forEach((p) => {
    const id = p.op === 'remove' ? p.id : p.item.id;
    if (skipped.has(p.kind + ':' + id)) return;
    if (p.op === 'remove') delete cfg.shadow[p.kind][id]; else cfg.shadow[p.kind][id] = p.s;
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
  stopRace();
  meta.athletes = meta.workouts = meta.courses = meta.prs = meta.series = meta.meets = meta.merges = meta.places = meta.weather = null; synced.athletes = synced.workouts = synced.courses = synced.prs = synced.series = synced.meets = synced.merges = synced.places = synced.weather = false;
}
function start() {
  stop();
  if (mode() !== 'joined') return;
  cfg.pendingMerge = false; cfg.refused = {}; saveCfg(); // refused changes are tried again once each time the app opens
  lastError = null;
  const t = cfg.teamId, opts = { includeMetadataChanges: true }; mergesRefused = false;
  const fail = (what) => (e) => { if (e && e.code === 'permission-denied') listenerRefused(e, what); else { lastError = friendly(e); emit(); } };
  writeDevice(true);
  unsubs.push(onSnapshot(purgesCol(t), (s) => { // admin "Delete permanently": scrub this phone's copies once
    const done = new Set(cfg.purged || []);
    s.docs.forEach((d) => { if (!done.has(d.id)) { MSApp.purgeRunner(d.id); done.add(d.id); delete cfg.shadow.athletes[d.id]; delete cfg.shadow.prs[d.id]; } });
    cfg.purged = [...done]; saveCfg();
  }, () => {}));
  unsubs.push(onSnapshot(teamRef(t), opts, (s) => {
    if (!s.exists() || s.metadata.fromCache || s.metadata.hasPendingWrites) return;
    const d = s.data();
    if (d.pwVersion !== cfg.pwVersion) { lostAccess(); return; }
    if (d.name !== cfg.teamName) cfg.teamName = d.name;
    cfg.minVersion = typeof d.minVersion === 'string' ? d.minVersion : ''; // 2.9.0: the team's minimum app version (admin setting)
    const was = isAdminHere();
    cfg.teamHasAdmin = d.hasAdmin === true; cfg.teamAdminVersion = d.adminVersion || 0;
    if (cfg.adminKey && (!cfg.teamHasAdmin || cfg.adminVersion !== cfg.teamAdminVersion)) {
      dropLocalAdmin();
      if (was) MSApp.notify(cfg.teamHasAdmin ? 'The admin passphrase changed. Enter it again in Settings to be admin on this device.' : 'This team has no admin now. Set an admin passphrase in Settings.');
    }
    saveCfg(); emit();
  }, fail('the team')));
  unsubs.push(onSnapshot(athletesCol(t), opts, (s) => onCollection('athletes', s), fail('runners')));
  unsubs.push(onSnapshot(workoutsCol(t), opts, (s) => onCollection('workouts', s), fail('workouts')));
  unsubs.push(onSnapshot(coursesCol(t), opts, (s) => onCollection('courses', s), fail('courses')));
  unsubs.push(onSnapshot(prsCol(t), opts, (s) => onCollection('prs', s), fail('PRs')));
  unsubs.push(onSnapshot(seriesCol(t), opts, (s) => onCollection('series', s), fail('meet series')));
  unsubs.push(onSnapshot(meetsCol(t), opts, (s) => onCollection('meets', s), fail('meets')));
  unsubs.push(onSnapshot(mergesCol(t), opts, (s) => onCollection('merges', s), (e) => { if (e && e.code === 'permission-denied') { mergesRefused = true; emit(); } else fail('merged runners')(e); })); // quiet before the 2.9.2 rules, but Data health says so (2.12)
  for (const [k, col] of [['places', placesCol], ['weather', weatherCol]]) { // 3.2: quiet before the 3.2 rules are published
    quietKinds.delete(k);
    unsubs.push(onSnapshot(col(t), opts, (s) => onCollection(k, s), (e) => { if (e && e.code === 'permission-denied') { quietKinds.add(k); emit(); } else fail(k === 'places' ? 'race locations' : 'weather')(e); }));
  }
  unsubs.push(onSnapshot(query(historyCol(t), orderBy('savedAtMs', 'desc'), limit(30)), (s) => {
    MSApp.teamHistory(s.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, fail('history')));
  // Official results (2.9): every import record. This phone's records not on the server yet go up once per app open.
  let offFirst = true;
  unsubs.push(onSnapshot(officialCol(t), (s) => {
    MSApp.officialRemote(s.docs.map((d) => ({ id: d.id, ...officialFrom(d.data()) })));
    if (offFirst && !s.metadata.fromCache) { offFirst = false; MSApp.pendingOfficial().forEach((d) => saveOfficial(d)); }
  }, (e) => { if (!e || e.code !== 'permission-denied') fail('official results')(e); })); // optional: before the 2.9.0 rules are published the team refuses it; stay quiet (other listeners catch a lost membership)
  // Races other coaches have set up or started (one at a time per team).
  unsubs.push(onSnapshot(query(racesCol(t), where('status', 'in', ['setup', 'running'])), (s) => {
    MSApp.activeRaces(s.docs.map((d) => ({ id: d.id, name: d.data().name || '', status: d.data().status })));
  }, fail('races')));
  ensureRace();
  const r = MSApp.getRace();
  if (r && r.status === 'running') measureClock();
  emit();
}

/* ---------- Race Mode ---------- */
let raceUnsubs = [];
function stopRace() {
  raceUnsubs.forEach((u) => u()); raceUnsubs = [];
  meta.marks = null; synced.marks = false;
  try { MSApp.racePresence([]); } catch (e) {}
}
function startRace() {
  stopRace();
  if (mode() !== 'joined' || !raceMirrored()) return;
  const t = cfg.teamId, id = cfg.raceId, opts = { includeMetadataChanges: true };
  const fail = (e) => { if (e && e.code === 'permission-denied') listenerRefused(e, 'the race'); else { lastError = friendly(e); emit(); } };
  raceUnsubs.push(onSnapshot(raceRef(t, id), opts, (s) => {
    if (!s.exists() || s.metadata.hasPendingWrites || !raceMirrored() || cfg.raceId !== id) return;
    if (s.data().status === 'discarded') { forgetRace(); MSApp.raceDiscarded(id); return; }
    const d = raceData(s.data()), rs = JSON.stringify(d), l = JSON.stringify(raceData(MSApp.getRace()));
    if (l === rs) { cfg.shadow.race = rs; saveCfg(); return; }
    if (cfg.shadow.race != null && l !== cfg.shadow.race) return; // unsent edit here wins (pushRaceDoc sends it)
    MSApp.applyRemoteRace(id, d); cfg.shadow.race = rs; saveCfg();
    localChanged(); // e.g. another coach fired the gun: this phone now has a checkpoint to announce
  }, fail));
  raceUnsubs.push(onSnapshot(marksCol(t, id), opts, (s) => { if (cfg.raceId === id) onCollection('marks', s); }, fail));
  raceUnsubs.push(onSnapshot(coachesCol(t, id), (s) => {
    if (cfg.raceId !== id) return;
    const me = uid();
    MSApp.racePresence(s.docs.map((d) => { const x = d.data(); return { uid: d.id, me: d.id === me, cp: x.cp || '', name: x.name || '', ver: x.ver || '', at: x.at && x.at.toMillis ? x.at.toMillis() : 0 }; }));
  }, fail));
}
function forgetRace() {
  stopRace(); cfg.raceId = null; cfg.shadow.race = null; cfg.shadow.marks = {}; cfg.shadow.presence = null; saveCfg();
}
// A race or mark write was refused. If the race was discarded meanwhile (this phone was offline), close it here;
// otherwise it really is lost access (password changed or account reset).
async function deniedRace(e0) {
  const id = cfg.raceId;
  if (id && mode() === 'joined') {
    try {
      const s = await getDocFromServer(raceRef(cfg.teamId, id));
      if (s.exists() && s.data().status === 'discarded') { forgetRace(); MSApp.raceDiscarded(id); return; }
    } catch (e) { /* permission-denied here too: fall through */ }
  }
  refused(null, e0, 'the race setup');
}
// This coach's checkpoint, name and app version, written only when one of them changes.
function pushPresence(t, me) {
  if (!raceMirrored()) return;
  const p = MSApp.getPresence();
  if (!p) return;
  const s = JSON.stringify([cfg.raceId, me, p.cp, p.name, p.ver]);
  if (cfg.shadow.presence === s) return;
  cfg.shadow.presence = s; saveCfg();
  setDoc(doc(coachesCol(t, cfg.raceId), me), { cp: String(p.cp).slice(0, 40), name: String(p.name).slice(0, 30), ver: String(p.ver).slice(0, 20), at: serverTimestamp() })
    .catch(() => { if (cfg.shadow.presence === s) { cfg.shadow.presence = null; saveCfg(); } });
}
// Follows the race on screen: a new local race becomes the mirrored one; listeners run while it exists.
function ensureRace() {
  if (mode() !== 'joined' || cfg.pendingMerge) return;
  const r = MSApp.getRace();
  if (!r) { stopRace(); return; }
  if (r.id !== cfg.raceId) {
    if (r.status === 'done') { stopRace(); return; } // a finished race from before joining: not shared
    stopRace(); cfg.raceId = r.id; cfg.shadow.race = null; cfg.shadow.marks = {}; cfg.shadow.presence = null; saveCfg();
  }
  if (!raceUnsubs.length) startRace();
}
function pushRaceDoc(t, me) {
  if (!raceMirrored()) return;
  const r = MSApp.getRace(), d = raceData(r), s = JSON.stringify(d);
  if (cfg.shadow.race === s || (cfg.refused || {})['race:' + r.id] === s) return;
  const prev = cfg.shadow.race; cfg.shadow.race = s; saveCfg();
  track(setDoc(raceRef(t, r.id), { ...d, updatedAt: serverTimestamp(), updatedBy: me })).catch((e) => {
    if (cfg.shadow.race === s) { cfg.shadow.race = prev; saveCfg(); }
    if (e && e.code === 'permission-denied') { if (!cfg.refused) cfg.refused = {}; cfg.refused['race:' + r.id] = s; saveCfg(); deniedRace(e); } else { lastError = friendly(e); emit(); }
  });
}
async function fetchRace(id) {
  const t = cfg.teamId;
  const [rs, ms] = await withTimeout(Promise.all([getDoc(raceRef(t, id)), getDocs(marksCol(t, id))]), 15000); // cache if offline
  if (!rs.exists() || rs.data().status === 'discarded') throw new Error('That race was discarded. Recently deleted (Settings) can restore it.');
  return { race: raceData(rs.data()), marks: ms.docs.map((x) => fromRemote('marks', x)) };
}
// Open another coach's race on this phone.
async function openRace(id) {
  if (mode() !== 'joined') throw new Error('Join the team first.');
  const { race, marks } = await fetchRace(id);
  stopRace();
  cfg.raceId = id; cfg.shadow.race = JSON.stringify(race); cfg.shadow.presence = null;
  cfg.shadow.marks = Object.fromEntries(marks.map((m) => [m.id, ser('marks', m)])); saveCfg();
  MSApp.setRace({ id, createdAt: Date.now(), ...race, marks });
  startRace(); measureClock(); localChanged();
}
// End a race (e.g. one another coach left running): save its results to history, then mark it done.
async function endRace(id, toHistory) {
  if (mode() !== 'joined') throw new Error('Join the team first.');
  const { race, marks } = await fetchRace(id);
  if (toHistory && race.gun && marks.length) saveHistory(toHistory({ id, ...race, marks }));
  await withTimeout(updateDoc(raceRef(cfg.teamId, id), { status: 'done', updatedAt: serverTimestamp(), updatedBy: uid() }), 15000);
}
// Discard a race for every coach: delete its marks and presence docs, leave an empty tombstone (see the top).
// markIds: the marks this phone knows; any others on the server (or in the offline cache) are found here too.
// Discard (2.6): the race and every mark are kept; only the status changes. Recently deleted restores it.
function discardRace(id, from) {
  if (mode() !== 'joined' || !id || !uid()) return;
  const t = cfg.teamId, me = uid();
  if (cfg.raceId === id) forgetRace();
  track(updateDoc(raceRef(t, id), { status: 'discarded', discardedFrom: from || 'setup', deletedAt: serverTimestamp(), deletedBy: me, updatedAt: serverTimestamp(), updatedBy: me }))
    .catch((e) => { if (e && e.code === 'not-found') return; if (e && e.code === 'permission-denied') refused(null, e, 'discarding the race'); else { lastError = friendly(e); emit(); } });
}
// Restore a discarded race for every coach and open it here. local: this phone's copy, used if offline.
async function restoreRace(id, local) {
  if (mode() !== 'joined' || !uid()) return;
  const t = cfg.teamId, me = uid();
  let from = (local && local.status !== 'discarded' && local.status) || 'setup';
  try { const s = await withTimeout(getDocFromServer(raceRef(t, id)), 6000); if (s.exists() && s.data().discardedFrom) from = s.data().discardedFrom; } catch (e) {}
  const w = updateDoc(raceRef(t, id), { status: from, restoredAt: serverTimestamp(), restoredBy: me, updatedAt: serverTimestamp(), updatedBy: me });
  track(w).catch((e) => { if (e && e.code === 'permission-denied') refused(null, e, 'restoring the race'); else { lastError = friendly(e); emit(); } });
  try { await withTimeout(w, 8000); await openRace(id); return; } catch (e) { /* offline: use this phone's copy */ }
  if (!local) return;
  const r = { ...local, status: from };
  stopRace(); cfg.raceId = id; cfg.shadow.race = JSON.stringify(raceData(r)); cfg.shadow.presence = null;
  cfg.shadow.marks = Object.fromEntries((r.marks || []).map((m) => [m.id, ser('marks', m)])); saveCfg();
  MSApp.setRace(r); startRace();
}
// Clock offset vs Firestore server time (needs signal). Keeps the sample with the shortest round trip.
let measuring = null;
function measureClock() {
  if (measuring) return measuring;
  if (mode() !== 'joined' || !uid() || !navigator.onLine) return Promise.resolve();
  measuring = (async () => {
    let best = null;
    for (let i = 0; i < 4; i++) {
      const t0 = Date.now();
      await withTimeout(setDoc(clockRef(uid()), { at: serverTimestamp() }), 8000);
      const t1 = Date.now();
      const snap = await withTimeout(getDocFromServer(clockRef(uid())), 8000);
      const at = snap.data().at.toMillis(), rtt = t1 - t0;
      if (!best || rtt < best.rtt) best = { off: at - (t0 + t1) / 2, rtt };
    }
    MSApp.clockOffset(Math.round(best.off), best.rtt);
  })().catch(() => {}).finally(() => { measuring = null; });
  return measuring;
}

/* ---------- losing access (password changed, or this phone's account was reset) ---------- */
let rejoining = false;
async function lostAccess() {
  if (rejoining || mode() !== 'joined') return;
  rejoining = true; stop(); stats.rejoins++;
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
    else if (!unsubs.length) start(); else writeDevice(false);
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
// Minimum app version (2.9.0, admin only; firestore.rules check it). '' turns it off. Phones below it update as
// soon as no clock is running. Only ever set to a version that exists (the admin phone's own).
async function setMinVersion(v) {
  if (!isAdminHere()) throw new Error('Only the team admin can do this.');
  v = String(v || '');
  if (v && !/^\d+\.\d+\.\d+$/.test(v)) throw new Error('Not a version number.');
  await withTimeout(updateDoc(teamRef(cfg.teamId), { minVersion: v }), 15000);
  cfg.minVersion = v; saveCfg(); emit();
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
  const data = { date: rec.date, savedAtMs: rec.savedAtMs, savedBy: uid(), watches: rec.watches };
  if (rec.kind === 'race') { data.kind = 'race'; data.race = rec.race; data.edits = rec.edits || []; }
  track(setDoc(ref, data))
    .catch((e) => { if (e && e.code === 'permission-denied') refused(null, e, 'a saved result'); else { lastError = friendly(e); emit(); } });
  return ref.id; // queued; offline it goes out later
}
// Every race in Team history (for goals: last race, season best, last time on this course). Cache if offline.
async function fetchRaceHistory() {
  if (mode() !== 'joined') return [];
  const s = await withTimeout(getDocs(query(historyCol(cfg.teamId), where('kind', '==', 'race'))), 8000);
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}
const histWrite = (id, data, what) => { if (mode() !== 'joined') return;
  track(updateDoc(doc(historyCol(cfg.teamId), id), data)).catch((e) => { if (e && e.code === 'permission-denied') refused(null, e, what); else { lastError = friendly(e); emit(); } }); };
function deleteHistory(id) { histWrite(id, { deleted: true, deletedAt: serverTimestamp(), deletedBy: uid() }, 'removing a history entry'); }      // soft
function restoreHistory(id) { histWrite(id, { deleted: false, restoredAt: serverTimestamp(), restoredBy: uid() }, 'restoring a history entry'); }
// Corrections to a saved race: appended, never rewritten (2.6).
function appendHistoryEdits(id, versions) { if (versions.length) histWrite(id, { edits: arrayUnion(...versions.map((v) => ({ ...v, uid: uid() || v.uid }))) }, 'a correction'); }
// Older deleted items, kept by the team (Recently deleted > Show older).
async function fetchDeleted() {
  if (mode() !== 'joined') return [];
  const t = cfg.teamId, out = [], ms = (x) => (x && x.toMillis ? x.toMillis() : 0);
  const kinds = [['athlete', athletesCol(t), (d) => d.name], ['workout', workoutsCol(t), (d) => d.name || 'Untitled workout'], ['course', coursesCol(t), (d) => d.name],
    ['meet', meetsCol(t), (d) => (d.date || 'undated') + ' meet'], ['series', seriesCol(t), (d) => d.name]];
  for (const [k, col, lab] of kinds) {
    const s = await withTimeout(getDocs(query(col, where('deleted', '==', true))), 10000);
    s.docs.forEach((d) => out.push({ kind: k, id: d.id, label: lab(d.data()) || '', deletedAt: ms(d.data().deletedAt) }));
  }
  const h = await withTimeout(getDocs(query(historyCol(t), where('deleted', '==', true))), 10000);
  h.docs.forEach((d) => { const x = d.data(); out.push({ kind: 'history', id: d.id, label: x.kind === 'race' && x.race ? (x.race.name || 'Race') + ' (' + x.date + ')' : 'Practice ' + x.date, deletedAt: ms(x.deletedAt) }); });
  const r = await withTimeout(getDocs(query(racesCol(t), where('status', '==', 'discarded'))), 10000);
  r.docs.forEach((d) => { const x = d.data(); if ((x.runners || []).length || x.name) out.push({ kind: 'race', id: d.id, label: x.name || 'Race', deletedAt: ms(x.deletedAt) }); });
  return out.sort((a, b) => b.deletedAt - a.deletedAt);
}
async function restoreOlder(kind, id) {
  const t = cfg.teamId, me = uid();
  if (kind === 'history') return restoreHistory(id);
  if (kind === 'race') return restoreRace(id, null);
  const col = { athlete: athletesCol(t), workout: workoutsCol(t), course: coursesCol(t), meet: meetsCol(t), series: seriesCol(t) }[kind];
  await withTimeout(updateDoc(doc(col, id), { deleted: false, restoredAt: serverTimestamp(), restoredBy: me, updatedAt: serverTimestamp(), updatedBy: me }), 10000);
}
/* ---------- official results (2.9): imported career history ---------- */
// One document per import part: {importId, part, parts, importedAt, by, byName, format, source, generated, results[], matches{}}.
// results hold first name + last initial only; matches map a hash of a file name to a runner id. Admin-only writes.
const officialFrom = (d) => ({ importId: d.importId || '', part: d.part || 0, parts: d.parts || 1, importedAt: d.importedAt || 0, by: d.by || '', byName: d.byName || '',
  format: d.format || '', source: d.source || '', generated: d.generated || '', results: Array.isArray(d.results) ? d.results : [], matches: d.matches || {}, edits: Array.isArray(d.edits) ? d.edits : [], deleted: d.deleted === true }); // edits: Varsity/JV (2.9.1)
const clean = (x) => JSON.parse(JSON.stringify(x)); // drops undefined, which Firestore rejects
function saveOfficial(d) {
  if (mode() !== 'joined' || !uid()) return;
  const data = clean({ importId: d.importId, part: d.part || 0, parts: d.parts || 1, importedAt: d.importedAt, by: uid(), byName: String(d.byName || '').slice(0, 30),
    format: d.format || '', source: d.source || '', generated: d.generated || '', results: d.results, matches: d.matches || {}, updatedAt: null, updatedBy: uid() });
  data.updatedAt = serverTimestamp();
  track(setDoc(doc(officialCol(cfg.teamId), d.id), data)).then(() => MSApp.officialSynced(d.id))
    .catch((e) => { if (e && e.code === 'permission-denied') refused(null, e, 'an imported history file'); else { lastError = friendly(e); emit(); } });
}
// Varsity / JV set on official results (2.9.1): appended, never rewritten (admin only, firestore.rules).
function officialEdits(id, versions) {
  if (mode() !== 'joined' || !uid() || !versions.length) return;
  track(updateDoc(doc(officialCol(cfg.teamId), id), { edits: arrayUnion(...versions.map((v) => clean({ ...v, uid: uid() }))) }))
    .catch((e) => { if (e && e.code === 'permission-denied') refused(null, e, 'a Varsity/JV level'); else { lastError = friendly(e); emit(); } });
}
// Undo of a whole import (soft delete, content kept) or its restore.
function officialFlag(ids, deleted) {
  if (mode() !== 'joined' || !uid()) return;
  const me = uid();
  ids.forEach((id) => {
    const f = deleted ? { deleted: true, deletedAt: serverTimestamp(), deletedBy: me, updatedAt: serverTimestamp(), updatedBy: me }
      : { deleted: false, restoredAt: serverTimestamp(), restoredBy: me, updatedAt: serverTimestamp(), updatedBy: me };
    track(updateDoc(doc(officialCol(cfg.teamId), id), f)).catch((e) => { if (e && e.code === 'not-found') return; if (e && e.code === 'permission-denied') refused(null, e, 'undoing an import'); else { lastError = friendly(e); emit(); } });
  });
}
/* ---------- coach phones and their versions (Settings > Team) ---------- */
let deviceAt = 0;
function writeDevice(force) {
  if (mode() !== 'joined' || !uid() || (!force && Date.now() - deviceAt < 30 * 60000)) return;
  deviceAt = Date.now();
  setDoc(doc(devicesCol(cfg.teamId), uid()), { ver: MSApp.version(), name: String(MSApp.coachName() || '').slice(0, 30), seen: serverTimestamp() }).catch(() => {});
}
async function fetchDevices() {
  if (mode() !== 'joined') return [];
  const s = await withTimeout(getDocs(devicesCol(cfg.teamId)), 10000);
  return s.docs.map((d) => ({ uid: d.id, me: d.id === uid(), ver: d.data().ver || '', name: d.data().name || '', seen: d.data().seen && d.data().seen.toMillis ? d.data().seen.toMillis() : 0 }));
}
/* ---------- Delete permanently (admin only, privacy requests) ---------- */
// Removes one runner's data from the team: athlete and PR docs, every mark that is or was theirs, their row in
// race docs and saved results, and their name in practice history. A purges/{id} record (no name) tells every
// phone to scrub its own copies. Only an admin can; firestore.rules check the purge record.
async function purgeRunner(aid, name) {
  if (!isAdminHere()) throw new Error('Only the team admin can do this.');
  const t = cfg.teamId, me = uid(), ops = [], pr = doc(purgesCol(t), aid);
  ops.push((b) => b.set(pr, { at: serverTimestamp(), by: me }));
  ops.push((b) => b.delete(doc(athletesCol(t), aid)));
  ops.push((b) => b.delete(doc(prsCol(t), aid)));
  const races = await withTimeout(getDocs(racesCol(t)), 15000);
  for (const rd of races.docs) {
    const r = rd.data();
    if ((r.runners || []).some((x) => x.id === aid)) ops.push((b) => b.update(rd.ref, { runners: r.runners.filter((x) => x.id !== aid), updatedAt: serverTimestamp(), updatedBy: me }));
    const ms = await withTimeout(getDocs(marksCol(t, rd.id)), 15000);
    ms.docs.forEach((m) => { const d = m.data();
      if (d.runnerId === aid) ops.push((b) => b.delete(m.ref));
      else if ((d.hist || []).some((v) => v.runnerId === aid)) ops.push((b) => b.update(m.ref, { hist: d.hist.map((v) => (v.runnerId === aid ? { ...v, runnerId: null } : v)), purgedFor: aid, updatedAt: serverTimestamp(), updatedBy: me }));
    });
  }
  const os = await withTimeout(getDocs(officialCol(t)), 15000); // imported official results (2.9)
  os.docs.forEach((o) => { const sc = MSApp.scrubOfficial(o.data(), aid, name); if (sc) ops.push((b) => b.update(o.ref, { ...sc, purgedFor: aid })); });
  const hs = await withTimeout(getDocs(historyCol(t)), 15000);
  hs.docs.forEach((h) => { const x = h.data(), sc = MSApp.scrubHistory(x, aid, name); if (sc) ops.push((b) => b.update(h.ref, { ...sc, purgedFor: aid })); });
  for (let i = 0; i < ops.length; i += 400) { const b = writeBatch(db); ops.slice(i, i + 400).forEach((op) => op(b)); await withTimeout(b.commit(), 20000); }
  delete cfg.shadow.athletes[aid]; delete cfg.shadow.prs[aid]; (cfg.purged = cfg.purged || []).push(aid); saveCfg();
}

/* ---------- boot ---------- */
MSApp.syncReady({
  info, localChanged, start, createTeam, joinTeam, fetchRemote, changePassword, leave, markRestored,
  setAdmin, becomeAdmin, changeAdmin, renameTeam, dropAdmin, setMinVersion,
  openRace, endRace, discardRace, measureClock,
  saveHistory, deleteHistory, restoreHistory, appendHistoryEdits, fetchRaceHistory, fetchDeleted, restoreOlder,
  restoreRace, purgeRunner, fetchDevices, saveOfficial, officialFlag, officialEdits, touchDevice: () => writeDevice(true), uid, stats: () => ({ ...stats }), minPassword: MIN_PASSWORD
});
signIn();
if (mode() === 'joined' && !cfg.pendingMerge) ensureUser().then(start, () => emit());
emit();
