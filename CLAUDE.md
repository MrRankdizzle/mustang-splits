# Mustang Splits: guide for Claude Code

Cross country pace board PWA for Coach Rankin (Little Chute Mustangs). Used live at practice on an iPhone, often with weak or no signal. Up to 30 named stopwatches; each can follow a workout plan (sections with distance, target, check-in marks, repeats, rest) and shows expected vs actual position.

## Stack and deploy
- Plain HTML, CSS and JavaScript. No framework, no build step, no npm. Keep it that way unless the coach asks.
- Team sync uses the Firebase modular SDK loaded as ES modules straight from gstatic (pinned version, see `sync.js` imports and `SDK_VERSION` in `sw.js`; change both together). Firebase project: `mustang-splits` (separate from Believe Board).
- Hosting: Vercel, connected to the GitHub repo. Pushing to `main` deploys automatically. Do not use the Vercel CLI.
- The coach verifies changes on his iPhone after the deploy finishes. For bigger features, work on a branch and push it: Vercel builds a preview URL he can test before merging.
- Anonymous sign-in only works on Firebase **Authorized domains** (Firebase console > Authentication > Settings). Wildcards aren't allowed, so a branch preview needs its stable branch domain added there (`<project>-git-<branch>-<scope>.vercel.app`).
- Rescue if a deploy breaks the app: `git revert HEAD --no-edit && git push`

## Files
- `index.html`: page shell, header, bottom tab bar, the four views (Stopwatches, Workouts, Team, Results).
- `styles.css`: design tokens on `:root` (light and dark), components, phone rules. School colors: Carolina blue `#4b9cd3`, navy `#13294b`, sky `#bfe3f7`.
- `app.js`: all logic in one IIFE. Sections are marked with `/* ---------- name ---------- */` comments. Works fully without `sync.js`.
- `sync.js`: team sync (ES module, loaded after `app.js`). Firebase Auth + Firestore. Talks to `app.js` only through `window.MSApp` (defined in app.js's "team sync bridge" section) and the API object it hands to `MSApp.syncReady()`.
- `firestore.rules`: the Firestore security rules. Not deployed by Vercel; the coach pastes them into the Firebase console.
- `sw.js`: service worker. Network-first for the app's own files with a 3 s timeout, then cache. Fonts and the pinned Firebase SDK cache-first. Firestore/Auth traffic is never cached.
- `manifest.webmanifest`, `icons/`: install metadata and icons.
- `version.json`: the version the running app compares itself against to show the Update banner.
- `vercel.json`: cache headers for `sw.js` and `version.json`.

## Rules for every change
1. Bump the version in BOTH `app.js` (`APP_VERSION`) and `version.json`. They must match. Patch for fixes (1.0.1), minor for features (1.1.0). This is what makes the Update banner appear on the phone.
2. Never rename the localStorage key `mustang-splits:v1`. It holds the coach's rosters, workouts and running clocks; renaming it wipes them. If the saved data shape changes, migrate old data inside `migrate()` instead (`load()` and Restore both run saved data through it).
3. If you change caching logic in `sw.js`, bump `CACHE` (for example `mustang-splits-shell-v2`). If you add a new file the app needs offline, add it to `SHELL`.
4. Read the timing engine before touching it (see below). Do a read-only review of `ACT.split`, the rest handling in `tick()`, and `updateLive()` first, and explain the plan before editing.
5. Phone rules: tap targets at least 44 px, inputs and selects at least 16 px font (smaller makes iOS zoom), respect safe areas (`env(safe-area-inset-*)`), keep the Stop two-tap guard.
6. Keep `MAX = 30` stopwatches unless asked.

## Timing engine (the delicate part)
- A stopwatch's time is `Date.now() - startAt` while running, or `pausedT` while stopped. Never count with intervals; the phone can sleep and timers drift.
- Plan progress lives in `w.run`: `rep`, `cp` (index of the next check-in), `phase` (`run`, `rest`, `done`), `repStartT` and `restEndT` (both in stopwatch milliseconds), `splits[]`, `laps[]`.
- `compile(workout)` turns a workout into `segs` and `cps` (check-ins with cumulative distance `d` and expected rep time `t` in seconds). Results are cached in `CC`; clear it when workouts change.
- Plan copy: `ACT.start` saves `w.plan = planCopy(workout)` on the stopwatch (saved with it in localStorage). `planOf(w)` returns that copy whenever the stopwatch isn't idle, so a running, paused or finished stopwatch keeps the plan it started with through workout edits (local or from another coach) and app reloads (iOS often reloads home screen apps mid-rep). `ACT.reset` and Clear track drop it; idle stopwatches follow the current workout. `migrate()` gives already-started stopwatches from older saves a copy of their current workout. The engine (`ACT.split`, rest in `tick()`, `updateLive()`) only ever reads the plan through `planOf()`.
- `ACT.split` records `{rep, cpi, d, exp, act, delta, lap, lapExp, lapD, t}`. Positive `delta` means behind target.
- When a rep's last check-in is split, rest starts; `tick()` starts the next rep exactly at `restEndT` even if the phone was asleep.
- Undo uses an in-memory snapshot stack (`HIST`); after a reload it falls back to popping the last split.
- Colors come from `cls(delta)` and the on-pace window `S.settings.tol`.

## Card lap/split list
- `S.settings.liveLog` ("Show splits as you go", default on; `load()` fills it in for old saves). When on, the list opens at the first lap, shows newest first, and stays open unless collapsed (`SHUT[id]`, cleared when the list empties). When off, it stays collapsed unless opened (`OPEN[id]`).
- `splitTable`/`lapTable(…, newest)` are shared with the Results tab (which stays oldest first). Columns with class `c-x` (Target, Section, Total) are hidden on cards in compact view.

## Time fields (Workouts editor)
- `timeField()` renders an input plus an "m:ss | sec" toggle; `bindTimeFields(root)` wires it up. m:ss mode uses `inputmode="numeric"` and fills digits from the right (224 → 2:24); sec mode uses `inputmode="decimal"`. Blur normalizes (0:72 → 1:12).
- Values stay strings read by `parseTime`. The chosen unit is saved as `segment.timeUnit` and `workout.restUnit` (`'mss'` default when missing, so old workouts load unchanged).

## Team roster and Bench
- `S.roster = [{id, name, group}]` (group optional; `load()` adds `[]` to old saves). The Team tab edits it: groups sorted with numbers in order, "No group" last; tapping a group heading renames the whole group; "Paste a list" takes `Name, Group` (or a tab) per line and skips duplicates.
- Stopwatches have `athleteIds[]`, `athleteNames[]` (a copy of the names taken when linked) and `autoName` (the name the app generated). Empty `athleteIds` means an unlinked stopwatch.
- Who is on the track is never stored on the athlete: `heldBy()` works it out from the current stopwatches every time. Idle, running and paused stopwatches hold their athletes; finished ones release them (their results stay). Deleting a stopwatch returns its athletes to the bench.
- `openBench(o)` is one sheet with two modes: add stopwatches (`{workoutId, after}`, from the Bench button or "Send athletes" on a workout) or change one idle stopwatch's members (`{watch}`, from the members line on the card). It respects `MAX`.
- Group stopwatch names: the shared group, otherwise "Maya + 2". `refreshIdle()` pushes roster renames to idle stopwatches only, and renames a stopwatch only while `name === autoName`. Deleting an athlete never changes a stopwatch; the saved names keep showing.
- "Clear track" in Settings removes idle and finished stopwatches, plus stopped (paused) stopwatch-only cards that have laps, since Stop is their end (`clearable()`); the confirm names those stopped cards. Running stopwatches and stopped workout cards stay. Results and the CSV list members from `athleteNames`.
- `modal()` reuses `#modal`: attach listeners to elements inside the new HTML, never to `#modal` itself, or they pile up across openings.

## iPhone layout: safe areas and keyboard
- No `apple-mobile-web-app-status-bar-style` meta (black-translucent caused a top blur and a bottom gap on iOS 26). `viewport-fit=cover` plus `theme-color` #13294b paints the status bar navy; the header keeps `padding-top: env(safe-area-inset-top)`.
- The tab bar's bottom padding is `--tab-pb` (`max(8px, safe-area-bottom - 14px)`); `main` and the toast are offset from it. If a bottom gap ever returns in the installed app, the planned fallback is `html{height:100lvh}` under `@media (display-mode: standalone)`.
- Keyboard: a visualViewport listener sets `--kb` (keyboard height) and `body.kb-open` (above 80px). While open, the tab bar hides and `main`, `.overlay` and the toast move up by `--kb`. On touch devices, focusing a text field scrolls it to the center after 300 ms.
- The toast has `pointer-events:none` so it never blocks a tap on a sheet button.
- Headless Chrome can't reproduce safe areas or the iOS keyboard; check these on the phone.

## Backup and Restore (Settings)
- Back up shares (or downloads) `mustang-splits-backup-YYYY-MM-DD.json` (local date): `{app, version, savedAt, state: S}`. `shareFile()` is shared with the CSV export.
- Restore reads a file from the hidden `#restoreFile` input, accepts the wrapper or a bare state, runs it through `migrate()`, confirms with counts, replaces `S`, saves and reloads. Running clocks keep their wall-clock `startAt`.
- In a team, Restore calls `SYNC.markRestored()` first: the shadow is cleared and the first-join merge question is asked again after the reload, so a restore can never delete other coaches' athletes or workouts.

## Team sync (2.0, Phase 1)
Goal: coaches on the same team share the roster, workouts and results history. Stopwatches stay on each phone.

### Principles
- Local first. `S` in localStorage stays the source the UI renders from. Firestore is a mirror with an offline queue (`persistentLocalCache`).
- Nothing on the timing path touches the network: start, split, stop and rest never wait, and nothing is written per tick. `save()` calls `SYNC.localChanged()`, which is debounced (800 ms) and only writes athletes/workouts whose content changed.
- If `sync.js` or the SDK can't load, `SYNC` stays null and the app is exactly the local app.

### Firestore data model
```
teamKeys/{hash}                 {teamId, pwVersion}            get by id only; never listable
teams/{teamId}                  {name, pwVersion, createdAt}
teams/{teamId}/members/{uid}    {pwVersion, key}               only readable by that uid
teams/{teamId}/athletes/{id}    {name, group, updatedAt, updatedBy}
teams/{teamId}/workouts/{id}    {name, reps, rest, restUnit, segments[], updatedAt, updatedBy}
teams/{teamId}/history/{id}     {date, savedAtMs, savedBy, watches:[{name, members[], workout, reps, total, splits[], laps[]}]}
```
Athlete and workout ids are the same as the local ids, so stopwatches keep pointing at them.

### This phone's sync state
localStorage `mustang-splits:sync` (never the app key): `{teamId, teamName, key, pwVersion, out, pendingMerge, shadow:{athletes:{}, workouts:{}}}`.
- `shadow[id]` = JSON of the item as last seen on / written to the server. Local differs from shadow → push. Shadow id missing locally → delete. A remote change is applied unless this phone has an unsent edit to that item. Last write wins per athlete/workout.
- The first full comparison waits for a server snapshot (not cache), so an empty cache is never read as "everything was deleted".
- Remote workout edits are always applied to `S.workouts`; they only affect idle stopwatches, because started ones run on their own plan copy (see Timing engine). `applyRemote` can still return ids to skip (they keep their old shadow), but skips none today.
- `pendingMerge`: set by create/join/restore; the app asks "Add mine / Use the team's only" before `SYNC.start()`. "Add mine" shortens names (Maya Lopez → Maya L.), merges athletes with the same name+group and workouts with the same name and content, renames a same-named different workout "Name (2)", and remaps stopwatches to the team's ids.

### Password scheme
- Nothing stores the password. `hash = PBKDF2-SHA256(normalize(password), salt "mustang-splits/team-password/v1", 210000 iterations)` → 64 hex chars, used as the `teamKeys` document id. `normalize` = NFKC, trim, collapse spaces, lowercase (so autocapitalize and stray spaces don't matter).
- The salt is fixed app-wide on purpose: the password alone must find the team. Never change `SALT` or `ITERATIONS`; every team would become unreachable.
- Minimum 12 characters; the UI suggests a 3–4 word passphrase ("gravel otter lantern 44").
- Known limit: the hash works like a key to the team, and someone who writes code could try guessing passwords via `teamKeys` reads. The slow hash and length make that expensive. App Check was deliberately skipped for now.
- Accounts: silent Firebase Anonymous Auth, one per phone (`signIn()` never runs twice at once; two parallel calls create two accounts). The phone keeps the hash (`cfg.key`) so if iOS resets the anonymous account it quietly rejoins, as long as the password hasn't changed.
- Create: check `teamKeys/{hash}` doesn't exist, then one batch writes the team (`pwVersion 1`), the key and this phone's membership.
- Join: read `teamKeys/{hash}` → `{teamId, pwVersion}`, write `members/{uid} = {pwVersion, key}`.
- Change password (needs the current one): one batch deletes the old key, creates the new key at `v+1`, bumps the team to `v+1`, and updates this phone's membership. Every other phone's membership is now stale: its listeners fail or see the new version, the quiet rejoin fails (old key gone), and it shows "Signed out: the team password changed" until someone enters the new password. Its local data stays.
- Leave: stop listening, delete own membership, clear `mustang-splits:sync`; the roster and workouts stay on the phone.

### Security rules (`firestore.rules`)
- A member = membership doc exists and its `pwVersion` equals the team's. Only members read/write a team's athletes, workouts and history, or get the team doc.
- `teamKeys`: get by id when signed in; never list; create only for a brand-new team (same batch) or by a member bumping the version by exactly 1; delete only by a member (needs the old hash).
- Memberships: create/update only for your own uid, with a key that points at this team at its current version. Read/delete only your own.
- Field checks: athlete names ≤ 30 chars, groups ≤ 30, `updatedBy` must be the caller, history can't be edited.
- Tested with the Firestore emulator (create/join/change/rejoin plus attacks: listing, forged keys, stale versions, extra fields, cross-team access).

### Settings, Team tab, Results
- Settings > Team: Create / Join when local; team name, status line (Synced, Syncing…, Offline with changes waiting, error) and Change password / Leave when joined; "Enter new password" when signed out. A dot on the gear icon shows waiting (amber) or error/signed out (red).
- Team tab in team mode: new and pasted names are saved as first name + last initial (`shortName()`); editing a name on the Team tab overrides it.
- Clear track in team mode also saves a history entry (only stopwatches with times, including stopped stopwatch-only laps) through the offline queue. Results shows "Team history" (latest 30); any member can delete an entry after a confirm.

### How to recover
- **Lost team password:** any phone still joined can use Settings > Change team password only if it knows the current one. If nobody does, a coach creates a new team (new password) and uses "Add mine" to upload that phone's roster and workouts. The old team's history stays in Firestore; the project owner can see or delete it in the Firebase console.
- **A phone stuck out of the team:** Settings > Team > "Enter new password" with the current password. If that fails, Leave team (keeps local data) and Join again. If it says "No team uses that password", the password was changed again or mistyped.
- **Status stuck on an error:** open the app with signal, check the Firebase console > Authentication > Authorized domains includes the domain the app is served from, and that the rules are published.
- **Re-publishing rules:** Firebase console > Firestore Database > Rules, paste all of `firestore.rules`, Publish. Do this after any change to that file (Vercel doesn't deploy it).
- **Testing locally with the emulators:** `firebase emulators:exec --project mustang-splits --only firestore,auth` (Firestore on port 8181, Auth on 9099) and open `http://localhost:PORT/?emu`. The `?emu` switch only works on localhost. Keep firebase-tools out of the repo.

### Phase 2 idea (not built): live stopwatch board
- Each phone would write its stopwatches to `teams/{t}/boards/{deviceId}` only on start, split, stop, reset and rest transitions (never per tick). Other phones derive the live time from `startAt`, as the local app already does, so nothing ticks over the network.
- Needs: a rules block for `boards` (members only, writer = own device), handling clock differences between phones (store a server-time offset from `serverTimestamp`), and a read-only board view. Nothing in Phase 1 blocks this: watch ids are unique, athlete ids are shared.

## Handoff
When continuing work, ask the coach what changed on his phone since the last session and read this file first. Update this file when architecture or rules change.
