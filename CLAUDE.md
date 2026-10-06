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
- `index.html`: page shell, nav bar (3.0), bottom tab bar, the four views (Stopwatches, Workouts, Team, Data (called Results before 2.10; its id is still `results`)), plus the Race Mode screen (`#v-race`, not a tab).
- `styles.css`: design tokens on `:root` (light and dark), components, phone rules. School colors: Carolina blue `#4b9cd3`, navy `#13294b`, sky `#bfe3f7`.
- `app.js`: all logic in one IIFE. Sections are marked with `/* ---------- name ---------- */` comments. Works fully without `sync.js`.
- `sync.js`: team sync (ES module, loaded after `app.js`). Firebase Auth + Firestore. Talks to `app.js` only through `window.MSApp` (defined in app.js's "team sync bridge" section) and the API object it hands to `MSApp.syncReady()`.
- `firestore.rules`: the Firestore security rules. Not deployed by Vercel; the coach pastes them into the Firebase console.
- `sw.js`: service worker. Network-first for the app's own files with a 3 s timeout, then cache. Fonts and the pinned Firebase SDK cache-first. Firestore/Auth traffic is never cached.
- `manifest.webmanifest`, `icons/`: install metadata and icons.
- `version.json`: the version the running app compares itself against; a newer one installs by itself (auto-update, 2.9).
- `vercel.json`: cache headers for `sw.js` and `version.json`.

## Rules for every change
1. Bump the version in BOTH `app.js` (`APP_VERSION`) and `version.json`. They must match. Patch for fixes (1.0.1), minor for features (1.1.0). This is what makes the Update banner appear on the phone.
2. Never rename the localStorage key `mustang-splits:v1`. It holds the coach's rosters, workouts and running clocks; renaming it wipes them. If the saved data shape changes, migrate old data inside `migrate()` instead (`load()` and Restore both run saved data through it).
3. If you change caching logic in `sw.js`, bump `CACHE` (for example `mustang-splits-shell-v2`). If you add a new file the app needs offline, add it to `SHELL`.
4. Read the timing engine before touching it (see below). Do a read-only review of `ACT.split`, the rest handling in `tick()`, and `updateLive()` first, and explain the plan before editing.
5. Phone rules: tap targets at least 44 px, inputs and selects at least 16 px font (smaller makes iOS zoom), respect safe areas (`env(safe-area-inset-*)`). Stop needs two taps wherever it appears outside a menu (the `ARM` guard in the grid click handler); inside the card's ⋯ menu it is one tap, because opening the menu is the safeguard.
6. Keep `MAX = 30` stopwatches unless asked.
7. **Data safety (permanent, since 2.6). Every change must keep these:**
   - **No hard deletes.** Removing anything (runner, workout, course, meet, PR, race, mark, history entry, race on this phone, stopwatch with times, checkpoint with times) puts a copy in the trash (`trashPut()`) and, in a team, soft-deletes the Firestore doc (`deleted`, `deletedAt`, `deletedBy`; content kept). Recently deleted restores it (`trashRestore()` → `restoreKind()`). firestore.rules refuse client deletes; the only exception is an admin's "Delete permanently" (purge) for one runner.
   - **Append-only corrections.** A recorded time is never overwritten: `markChange()` appends a version to `m.hist`; saved results get versions in `h.edits` (applied by `modelOf()`). Restore = a new version equal to an old one.
   - **Undo toast instead of confirm** for anything recoverable (`removedSnack()`, at least 6 s, 44 px). Confirms only for bulk/account actions (Clear all times, Clear finished, Stop all, Restore backup/snapshot, Leave team, Stop being admin, Delete permanently).
   - **Snapshot before bulk actions** (`takeSnapshot(reason)`): bulk clears, team create/join/merge, Leave, backup or snapshot restore, purge (and Start a new season in 2.7). Last 10 kept.
   - **Trash, snapshots and the race archive never go in the `mustang-splits:v1` entry** (they live in IndexedDB), and **a save never fails silently** (`saveNow()`: retry lean, then `mustang-splits:race-rescue`, plus the red banner).
   - **A refused Firestore write is never retried in a loop**: `refused()` in sync.js checks membership first; only an invalid membership rejoins.
8. **Pushing on a meet day is allowed** (since 2.8.1, at the coach's request; it used to be forbidden). Never push with a failing suite. `tests/meetday.sh` still reports whether today is a meet day, for information.
9. **Publishing rules:** when firestore.rules change in a way older phones can't follow (2.6 did), push, wait until Settings > Team says every phone is on the new version, then publish. (2.7 was the other case: its rules only add optional fields and collections, so they were published first, then the phones updated.)
   The first line of `firestore.rules` is `// Mustang Splits rules X.Y.Z`: set it to the app version in every push that changes the rules, so the Firebase console shows which rules are published.
10. **REQUESTS.md** lists every request from 2.4.0 on with its status (Live with version and where, Built but not pushed, Planned, Missed). Update it in the same commit as every push, checking the code, not memory.
11. **Rollback-safe data (since 2.13).** Never make a data change an older version can't read. Add fields; never remove, rename or repurpose one. If a change is unavoidable, keep the old fields alongside the new ones, filled in. Before each phase, push a `before-X.Y.Z` tag of the live version (see How to roll back).

## How to roll back
Before every phase a tag of the live version is pushed: `before-2.13.0` (= 2.12.0), `before-2.14.0` (= 2.13.0), `before-3.0.0` (= 2.14.0). `git tag -l 'before-*'` lists them.

To return the live app to a tag (from the repo folder on the Mac):
1. `git checkout main && git pull`
2. `git restore --source=before-2.14.0 --staged --worktree -- .` (any tag; it also removes files the tag doesn't have)
3. **Give the old code a NEW, higher version number.** Phones only install a version newer than theirs (`verLt(APP_VERSION, version.json)`), so set `APP_VERSION` in app.js and `version.json` to one patch above the version that's live now (live 2.14.0 → `2.14.1`). Leave the version.json/APP_VERSION pair matching.
4. `tests/run.sh` (the old suites match the old code), then `git commit -am "Roll back to before-2.14.0 as 2.14.1" && git push`. Vercel deploys in about a minute; phones install it the next time nothing is timing (auto-update, 2.9).
5. Rules: leave the published Firestore rules alone. Every rules version only adds what's allowed, so older app versions keep working under newer rules.
6. If a team minimum version (Settings > Team, `minVersion`) is above the rolled-back number, an admin turns it off or sets it to the new number first.
To undo the rollback: the same steps with the newer tag or commit, again with a higher version number.

**Saved data stays readable both ways.** The localStorage key never changes, and no version removes or renames a field it saved before: new fields are added beside the old ones, and older versions ignore fields they don't know (their `migrate()` keeps the rest). Rule 11 below makes this permanent. Specifics:
- 2.13 shows Varsity/JV races as one Girls or Boys list without changing saved races; the stored division codes (`GV`/`BV`/`GJV`/`BJV`/`OPEN`) and the imported division text stay, so 2.12 still shows its Varsity/JV views. Race Mode saves Girls as `GV`, Boys as `BV`, Both as `OPEN` (the codes 2.12 and the rules know).
- A workout part with an effort and a distance but no time works as effort-based in 2.13; 2.12 shows it as "needs a distance and target time" (nothing is lost).
- 2.14 workout plans and 3.0 settings are new fields next to the old ones (see those sections).

## Timing engine (the delicate part)
- A stopwatch's time is `Date.now() - startAt` while running, or `pausedT` while stopped. Never count with intervals; the phone can sleep and timers drift.
- Plan progress lives in `w.run`: `rep`, `cp` (index of the next check-in), `phase` (`run`, `rest`, `done`), `repStartT` and `restEndT` (both in stopwatch milliseconds), `splits[]`, `laps[]`.
- `compile(workout)` turns a workout into `segs` and `cps` (check-ins with cumulative distance `d` and expected rep time `t` in seconds). Results are cached in `CC`; clear it when workouts change.
- Plan copy: `ACT.start` saves `w.plan = planCopy(workout)` on the stopwatch (saved with it in localStorage). `planOf(w)` returns that copy whenever the stopwatch isn't idle, so a running, paused or finished stopwatch keeps the plan it started with through workout edits (local or from another coach) and app reloads (iOS often reloads home screen apps mid-rep). `ACT.reset` and Clear track drop it; idle stopwatches follow the current workout. `migrate()` gives already-started stopwatches from older saves a copy of their current workout. The engine (`ACT.split`, rest in `tick()`, `updateLive()`) only ever reads the plan through `planOf()`.
- **Effort-based parts (2.11):** a segment with `mode:'effort'` (`paceRef` cv|threshold|interval|repetition|5k|mile|easy|pct, `pct` = % of 5K speed) gets its seconds from a runner context: `segSeconds(s, ctx)` / `compile(wk, ctx)`. `ctx = watchCtx(w, wk)` is the stopwatch's runner, or a group's middle runner by VDOT, plus the remembered adjustment. `planOf()` builds it for a waiting stopwatch, and `ACT.start` saves it in the plan copy (`planCopy(wk, w)`), so a running stopwatch never changes. `ACT.split`, rest in `tick()` and `updateLive()` were not touched.
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
- `S.roster = [{id, name, group, gender}]` (`load()` adds `[]` to old saves). Since 2.12 the Team tab doesn't show or edit `group` (it stays in the data and in Firestore so older phones keep working); groups are made in the workout flow instead (see 2.12). "Paste a list" takes `Name, Girls` (or `Name, Group, Girls`, the group ignored) per line and skips names already on the team.
- Stopwatches have `athleteIds[]`, `athleteNames[]` (a copy of the names taken when linked) and `autoName` (the name the app generated). Empty `athleteIds` means an unlinked stopwatch.
- Who is on the track is never stored on the athlete: `heldBy()` works it out from the current stopwatches every time. Idle, running and paused stopwatches hold their athletes; finished ones release them (their results stay). Deleting a stopwatch returns its athletes to the bench.
- `openBench(o)` is one sheet with two modes: add stopwatches (`{workoutId, after}`; no button opens this mode since the 2.3 workout flow) or change one idle stopwatch's members (`{watch}`, from the members line on the card). It respects `MAX`. Runners are listed by Girls / Boys (`genderSecs()`, 2.12), like the workout flow and race setup.
- Group stopwatch names: the shared group, otherwise "Maya + 2". `refreshIdle()` pushes roster renames to idle stopwatches only, and renames a stopwatch only while `name === autoName`. Deleting an athlete never changes a stopwatch; the saved names keep showing.
- "Clear finished stopwatches" in Settings (called "Clear track" before 2.3) removes idle and finished stopwatches, plus stopped (paused) stopwatch-only cards that have laps, since Stop is their end (`clearable()`); the confirm names those stopped cards. Running stopwatches and stopped workout cards stay. Results and the CSV list members from `athleteNames`.
- `modal()` reuses `#modal`: attach listeners to elements inside the new HTML, never to `#modal` itself, or they pile up across openings.

## iPhone layout: safe areas and keyboard
- No `apple-mobile-web-app-status-bar-style` meta (black-translucent caused a top blur and a bottom gap on iOS 26). `viewport-fit=cover` plus `theme-color` (3.0: #f2f2f7 light, #000 dark, matching the nav bar; before 3.0 navy) paints the status bar; the header keeps `padding-top: env(safe-area-inset-top)`.
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
adminKeys/{hash}                {teamId, adminVersion}         get by id, members only; never listable (2.1)
teams/{teamId}                  {name, pwVersion, hasAdmin, adminVersion, createdAt}
teams/{teamId}/members/{uid}    {pwVersion, key, adminVersion?, adminKey?}   only readable by that uid
teams/{teamId}/athletes/{id}    {name, group, updatedAt, updatedBy}
teams/{teamId}/workouts/{id}    {name, reps, rest, restUnit, segments[], updatedAt, updatedBy}
teams/{teamId}/history/{id}     {date, savedAtMs, savedBy, watches:[{name, members[], workout, reps, total, splits[], laps[]}], kind?, race?}
teams/{teamId}/courses/{id}     {name, checkpoints:[{id,name,dist,unit}], updatedAt, updatedBy}   saved courses (2.5)
teams/{teamId}/prs/{athleteId}  {list:[{dist, t}], updatedAt, updatedBy}   PRs per runner (2.5)
teams/{teamId}/races/{raceId}   {name, status, gun, checkpoints[], runners[], courseId?, goalSrc?, updatedAt, updatedBy}   status setup|running|done|discarded
teams/{teamId}/races/{raceId}/marks/{id}     {cp, local, off, runnerId, by, byName?, deleted?, chosen?, hist?, updatedAt, updatedBy}   one per tap; hist = every version (2.6)
teams/{teamId}/races/{raceId}/coaches/{uid}  {cp, name, ver, at}   presence (2.4)
teams/{teamId}/devices/{uid}    {ver, name, seen}   each coach phone's app version (2.6)
teams/{teamId}/series/{id}      {name}   links a meet across years (2.7)
teams/{teamId}/meets/{id}       {seriesId, courseId, date, time, kind, levels, season}   the schedule (2.7)
teams/{teamId}/purges/{athleteId} {at, by}         admin "Delete permanently" record (2.6)
teams/{teamId}/official/{id}    {importId, part, parts, importedAt, by, byName, format, source, generated, results[], matches{}}   imported career history (2.9), admin writes
teams/{teamId}.minVersion       '' or 'x.y.z': the team's minimum app version (2.9, admin)
Every team document above except presence, devices and purges may carry deleted/deletedAt/deletedBy (soft delete, 2.6).
clock/{uid}                     {at}   clock offset measurement
```
Athlete and workout ids are the same as the local ids, so stopwatches keep pointing at them.

### This phone's sync state
localStorage `mustang-splits:sync` (never the app key): `{teamId, teamName, key, pwVersion, out, pendingMerge, shadow:{athletes:{}, workouts:{}}, adminKey, adminVersion, teamHasAdmin, teamAdminVersion}`.
- `shadow[id]` = JSON of the item as last seen on / written to the server. Local differs from shadow → push. Shadow id missing locally → delete. A remote change is applied unless this phone has an unsent edit to that item. Last write wins per athlete/workout.
- The first full comparison waits for a server snapshot (not cache), so an empty cache is never read as "everything was deleted".
- Remote workout edits are always applied to `S.workouts`; they only affect idle stopwatches, because started ones run on their own plan copy (see Timing engine). `applyRemote` can still return ids to skip (they keep their old shadow), but skips none today.
- `pendingMerge`: set by create/join/restore; the app asks "Add mine / Use the team's only" before `SYNC.start()`. "Add mine" keeps full names (2.11.1), merges athletes with the same name+group and workouts with the same name and content, renames a same-named different workout "Name (2)", and remaps stopwatches to the team's ids.

### Password scheme
- Nothing stores the password. `hash = PBKDF2-SHA256(normalize(password), salt "mustang-splits/team-password/v1", 210000 iterations)` → 64 hex chars, used as the `teamKeys` document id. `normalize` = NFKC, trim, collapse spaces, lowercase (so autocapitalize and stray spaces don't matter).
- The salt is fixed app-wide on purpose: the password alone must find the team. Never change `SALT` or `ITERATIONS`; every team would become unreachable.
- Minimum 12 characters; the UI suggests a 3–4 word passphrase ("gravel otter lantern 44").
- Known limit: the hash works like a key to the team, and someone who writes code could try guessing passwords via `teamKeys` reads. The slow hash and length make that expensive. App Check was deliberately skipped for now.
- Accounts: silent Firebase Anonymous Auth, one per phone (`signIn()` never runs twice at once; two parallel calls create two accounts). The phone keeps the hash (`cfg.key`) so if iOS resets the anonymous account it quietly rejoins, as long as the password hasn't changed.
- Create: check `teamKeys/{hash}` doesn't exist, then one batch writes the team (`pwVersion 1`), the key and this phone's membership.
- Join: read `teamKeys/{hash}` → `{teamId, pwVersion}`, write `members/{uid} = {pwVersion, key}`.
- Change password (admin only, needs the current one): one batch deletes the old key, creates the new key at `v+1`, bumps the team to `v+1`, and updates this phone's membership. Every other phone's membership is now stale: its listeners fail or see the new version, the quiet rejoin fails (old key gone), and it shows "Signed out: the team password changed" until someone enters the new password. Its local data stays.
- Leave: stop listening, delete own membership, clear `mustang-splits:sync`; the roster and workouts stay on the phone.

### Security rules (`firestore.rules`)
- A member = membership doc exists and its `pwVersion` equals the team's. Only members read/write a team's athletes, workouts and history, or get the team doc.
- `teamKeys`: get by id when signed in; never list; create only for a brand-new team (same batch) or by a member bumping the version by exactly 1; delete only by a member (needs the old hash).
- Memberships: create/update only for your own uid, with a key that points at this team at its current version. Read/delete only your own.
- Admin-only (2.1): creating a new password key, deleting a password key, changing the team's `pwVersion` or `name`, and changing `adminVersion`. The one exception: while `hasAdmin` is false, any member may set the first admin (`hasAdmin` false→true, `adminVersion` +1, nothing else).
- Field checks: athlete names ≤ 30 chars, groups ≤ 30, `updatedBy` must be the caller, history can't be edited.
- Tested with the Firestore emulator (292 cases in 2.9.2, adding merges; 283 cases in 2.9.1, adding admin Varsity/JV edits on official results; 277 cases in 2.9: minimum version on the team doc, admin-only official results with soft delete; 253 cases in 2.7, adding series, meets, Girls/Boys, race meet/division and meet links; 223 cases in 2.6: no hard deletes anywhere, soft delete/restore, append-only mark versions and history edits, discard/restore, purge, devices; 155 cases in 2.5, adding courses, PRs and race course/goal fields; 130 cases in 2.4, adding coach names on marks, presence, discard tombstones and offline revival; 101 cases in 2.2, incl. races, marks, clock and race history; 74 in 2.1: create/join/change/rejoin, admin set/become/change/drop, legacy teams, console recovery, plus attacks: listing, forged team/admin keys, stale versions, extra fields, non-admin password/rename/admin changes, cross-team access).

### Settings, Team tab, Results
- Settings > Team: Create / Join when local; "Enter new password" when signed out. When joined: team name, status line (Synced, Syncing…, Offline with changes waiting, error), then by role: admin ("Admin" badge; Change team password, Change admin passphrase, Rename team, Stop being admin on this device, Leave), member of a team with an admin ("Ask your team admin to change the password."; I'm the admin, Leave), member of a team with no admin (Set admin passphrase, Leave). A dot on the gear icon shows waiting (amber) or error/signed out (red).
- Runners have full names (first and last) since 2.11.1, at the coach's request. Names are edited on the Team tab. (Before 2.11.1, team mode saved first name + last initial; that rule is gone.)
- Clear track in team mode also saves a history entry (only stopwatches with times, including stopped stopwatch-only laps) through the offline queue. Results shows "Team history" (latest 30); any member can delete an entry after a confirm.

### Team admin (2.1)
Goal: only the head coach changes the team password. Enforced by `firestore.rules`; the UI only hides the options.
- Second secret, the admin passphrase: `adminHash = PBKDF2-SHA256(normalize(p), "mustang-splits/admin-passphrase/v1/" + teamId, 210000)`. The salt includes the team id, so the same phrase gives a different hash per team and can't collide with a team password key. Minimum 12 characters and must differ from the team password (checked in the app; rules can't compare secrets). Never change `ADMIN_SALT`.
- `adminKeys/{adminHash}` = `{teamId, adminVersion}`. A get needs team membership (and the exact hash), so outsiders can't even guess.
- A device is admin when its membership has `adminVersion` equal to the team's and the team has `hasAdmin: true`. The rules accept `adminVersion`/`adminKey` on a membership only if `adminKey` names an `adminKeys` doc for this team at that version.
- `adminVersion` only ever goes up. Changing the admin passphrase (admin only, needs the current one) swaps the key and bumps it, so other admin devices become plain members until the new passphrase is entered there.
- Admin devices keep `cfg.adminKey`/`adminVersion` and write them again on a quiet rejoin (new anonymous account) and when rejoining with a new team password (`writeMember()` in sync.js). If the saved proof is stale, the device joins as a member and forgets it.
- First admin: in a team with `hasAdmin` false (all 2.0 teams), any member sees "Set admin passphrase". One batch writes the key, sets `hasAdmin: true` + `adminVersion` +1 and marks this device admin; a second attempt fails because the key rule checks the team's state before the batch. New teams get an admin during Create a team.
- "Stop being admin on this device" rewrites this membership without admin fields and forgets the local proof. The team keeps its passphrase.
- The team listener tracks `hasAdmin`/`adminVersion`; if this device no longer matches, it drops local admin and tells the user.

### How to recover
- **Forgotten admin passphrase:** Firebase console > Firestore Database > `teams` > your team document > edit `hasAdmin` to `false` (leave `adminVersion` alone). Optionally delete the old key in `adminKeys` (the document whose `teamId` is your team). Every coach now sees "Set admin passphrase": set a new one right away from your phone, then use "I'm the admin" on your Mac. Because `adminVersion` only goes up, old admin devices never regain admin.
- **Admin device lost or borrowed:** from another admin device, Change admin passphrase (removes admin from every other device), or on the borrowed device use "Stop being admin on this device".
- **Lost team password:** an admin device still joined can use Settings > Change team password, but it needs the current one. If nobody knows it, a coach creates a new team (new password) and uses "Add mine" to upload that phone's roster and workouts. The old team's history stays in Firestore; the project owner can see or delete it in the Firebase console.
- **A phone stuck out of the team:** Settings > Team > "Enter new password" with the current password. If that fails, Leave team (keeps local data) and Join again. If it says "No team uses that password", the password was changed again or mistyped.
- **Status stuck on an error:** open the app with signal, check the Firebase console > Authentication > Authorized domains includes the domain the app is served from, and that the rules are published.
- **Re-publishing rules:** Firebase console > Firestore Database > Rules, paste all of `firestore.rules`, Publish. Do this after any change to that file (Vercel doesn't deploy it).
- **Testing locally with the emulators:** `tests/run.sh` does it all (see Testing). By hand: from `tests/`, `npx firebase emulators:exec --project mustang-splits --only firestore,auth` (Firestore on port 8181, Auth on 9099) and open `http://localhost:PORT/?emu`. The `?emu` switch only works on localhost. firebase-tools is a dev dependency of `tests/` only (its node_modules are git-ignored), never of the app.

### Phase 2 idea (not built): live stopwatch board
- Each phone would write its stopwatches to `teams/{t}/boards/{deviceId}` only on start, split, stop, reset and rest transitions (never per tick). Other phones derive the live time from `startAt`, as the local app already does, so nothing ticks over the network.
- Needs: a rules block for `boards` (members only, writer = own device), handling clock differences between phones (store a server-time offset from `serverTimestamp`), and a read-only board view. Nothing in Phase 1 blocks this: watch ids are unique, athlete ids are shared.

## Race Mode (2.2)
Its own screen (`#v-race`, opened by the Race button or the race banner on the Stopwatches tab) and its own data (`S.race`). The recording screen was rebuilt in 2.4; see the next section. It never uses the stopwatch timing engine.
- `S.race` = `{id, name, status:'setup'|'running'|'done', gun:{local, off, by}, checkpoints:[{id,name,dist}], runners:[{id,name,group,goal}], marks:[{id, cp, local, off, runnerId|null, by}]}`. `migrate()` adds `race: null`. Default checkpoints Mile 1 (1 mi), Mile 2 (2 mi), Finish (5K); distance is optional per checkpoint.
- Times are timestamps, never counted: `srv(ev) = ev.local + (ev.off ?? CLOCK.off ?? 0)`; race time = `srv(mark) - srv(gun)`. Reloads (iOS often reloads home screen apps) can't drift.
- Clock offset (`CLOCK`, localStorage `mustang-splits:clock`): `sync.js` `measureClock()` writes `clock/{uid} = serverTimestamp()` four times, reads it back, and keeps the shortest round trip: `off = serverTime - (t0+t1)/2` (error ≤ half the round trip). Measured on opening the race screen, at the gun, and when team sync starts with a race running. Events store the offset known at the time; events saved with `off: null` (no offset yet) get this device's offset filled in once measured. One phone offline: gun and taps share one clock, so times are exact.
- `DEVICE` (localStorage `mustang-splits:device`) marks which phone made each event (`by`).
- Official time at a checkpoint = earliest mark for that runner there; two or more marks → ⚠ in the table, and the cell editor offers "Keep this one" / Clear / edit time.
- Results (`raceModel()` → `raceTable()`): time, team place, pace per mile since the previous checkpoint with a distance, and goal compare at even pace (`goal × dist / finish dist`): within 1% on pace (ok), faster (fast), up to 3% slow, beyond that well behind (bad). `raceText()` / `raceCSV()` for Copy and Export. End race saves `raceHistory()` (`kind: 'race'`, the model) to Team history.
- Gun is one tap with a 10 s Undo; "Restart clock" (moves the gun to now, with Undo) shows until the first mark.
- Taps show an Undo bar (`snack()`, tappable, unlike `toast()`); in Race Mode it sits at the top so it never covers name buttons, and opening any sheet hides it. The race clock is sticky. A running race keeps the screen on.
- Team sync (`sync.js`): `teams/{t}/races/{raceId}` (name, status, gun, checkpoints, runners) and one doc per tap in `races/{raceId}/marks` (shadow kind `marks`). The phone mirrors one race (`cfg.raceId`) = the one in `S.race` (`ensureRace()`). Other coaches see active races (status setup/running) as a banner and `openRace()` it. One race at a time: starting another offers Open it, or End it and start a new one (`endRace()` saves its history, then sets status done). Race docs are never deleted (see Discard below).

## Race Mode recording screen (2.4)
Goal: a tap can never land on the wrong runner. (In 2.3 a tapped runner moved to a "Passed" list, so every name after it slid one slot; remote marks and the clock offset also re-rendered the whole screen.)
- **Order:** `S.race.runners` order is the grid order, shared through the race doc. Setup auto-sorts by expected finish (`sortByGoal()`: the goal, else the runner's PR at the race's finish distance, fastest first; then first name; PR fallback since 2.6.1) when runners are added and when leaving the goal list (only `#ordList` is redrawn, so focus stays); dragging ☰ (`.ord-row .drag`, window pointer listeners, autoscroll near the edges) sets `manualOrder` for that race on this phone, after which only "Sort by goal" re-sorts. The Gun sorts once more unless manual; from then on the order is fixed.
- **Columns:** `S.settings.raceCols` (2 or 3, per phone, chosen in setup). Buttons have a fixed height (66 px, 60 px in 3 columns under 600 px wide) so a time or a coach name appearing never makes a row taller.
- **Never rebuild while racing:** `renderRace()` builds the running grid only when `runKey()` changes (race, checkpoint, columns, Tidy up). Everything else goes through `patchRace()`, which updates buttons, the "Time now" strip, the status line, Tidy up and results in place. A rebuild sets `gridGuard` (taps ignored for `GUARD` = 400 ms). A button whose state another coach changed gets `btnGuard[id]` for 400 ms; this phone's own changes (`localTouch`) never block anything, so a pack can be tapped as fast as it comes. An ignored tap shakes the button (`nope()`).
- **Fixed layout above the grid:** "I'm at" bar, one status line (`#raceStatus`, fixed height: 1 line, 2 in a team), and the "Time now, name later" row (fixed height; the chips scroll sideways; the first-time hint, `mustang-splits:markhint`, lives in the strip). Everything below the grid sits in `#raceBelow`, whose min-height only grows during a race, so a shorter page can never pull the scroll position (and the grid) up. The screen scrolls to the top when the grid first appears (Gun is at the bottom of setup). The Update and Install banners are hidden while the race screen is open (`body.race-open`), since they sit in the page flow above everything.
- **Recorded runner:** stays in place, `.rec` (grayed, dashed), shows "✓ time" and, if another phone recorded it, the coach name (`whoBy()`: `byName`, else "another coach"). Taps on it only toast "Already recorded. Press and hold to remove it." Press and hold (600 ms, `removeTime()`) removes every mark for that runner at that checkpoint at once (2.6: as new versions, no confirm), with an Undo toast at the top naming the time and who recorded it. The click that follows the hold is swallowed (`swallowUntil`).
- **Tidy up (n passed):** a button, not a switch: hides the runners passed so far at this checkpoint (`tidied`, in memory only); later ones stay grayed in place. "Show all" undoes it. Both are rebuilds (guarded).
- **Coach name and presence:** `S.settings.coachName`, asked once (`askCoachName()`, team mode, `coachAsked`) and editable in Settings. Marks carry `byName` (`null` from phones older than 2.4). While a race runs, `sync.js` `pushPresence()` writes `races/{raceId}/coaches/{uid}` = `{cp, name, ver: APP_VERSION, at}` only when one of them changes. `raceStatusText()` shows "2 coaches at Finish", "Coach Jen needs to update" (presence `ver` older than ours, or marks without `byName` from another phone), "Now tap the runner for that time.", and the clock-sync note.
- **End race** (`endRaceSheet()`): Save to team history (local: Save results) / Discard / Keep racing. Since 2.6 Discard is instant with Undo and recoverable (see Data safety): the race doc keeps everything with status `discarded`; the rules refuse any write to a discarded race except a restore (`restoredBy` = caller), so a phone that was offline can't revive it (its refused write goes to `deniedRace()`, which closes the race there). Other phones' race listeners see `discarded` and call `MSApp.raceDiscarded()`, which puts it in their Recently deleted.
- Browser test `e2e8.js` (outside the repo, see Testing): taps at fixed positions while remote marks arrive (one phone with injected marks, and two phones tapping at once) and checks every tap recorded the runner under the finger and no button moved by a pixel.

## Race Mode results, distances, goals (2.5)
- **Distances** are meters; `checkpoint.unit` ('mi'|'m') is only how it was typed. `distField()` + `bindDistFields()` = decimal keypad with an "mi | m" toggle (like `timeField`). `cpEditorHTML()`/`bindCpEditor()` is one editor used in setup and in the "Edit checkpoints" sheet during a race (`cpSheet()`): rename, ↑↓, ×, add (max 12), quick buttons (`QUICK_DISTS`: Mile 1, Mile 2, 2 mi, 3200m, 4K, 5K; they also rename a placeholder name), and a warning when distances don't increase. Removing a checkpoint with times confirms and deletes its marks. Paces are always derived, so a distance change recalculates everything. `sameDist()` = within 5 m (3200m and 2 mi differ).
- **Split changes** (`splitsOf()`): split since the runner's previous recorded checkpoint; pace per mile when both ends have distances; change from the previous segment by pace when both segments have one (basis 'pace', "+12s/mi"), else raw split ("+12s split"). Within 1% of the previous segment = `even` (gray), slower = orange, faster = green. `raceCalc(M)` computes everything once for `raceTable()` (cards + wide table), `raceText()` and `raceCSV()`.
- **Results layout:** `raceTable()` returns per-runner cards (`.race-cards`, phones under 640 px) and the wide table (`.race-wide`, landscape/bigger); CSS picks. CSV keeps the 2.2 columns first and appends split, split pace, change, basis per checkpoint, then New PR, Season best.
- **Courses:** `S.courses` (synced, kind `courses`). Setup: pick a course (copies its checkpoints with new ids, sets `race.courseId`), Save as course / Update course, Delete.
- **PRs:** `S.prs = {athleteId: [{dist, t}]}` (synced, kind `prs`, one doc per runner in its own collection so an older phone rewriting an athlete doc can't wipe them). Team tab: a PR button per runner opens `prSheet()` (5K, 2 mi, 4K, 3200m, plus custom distances). `setPR()`.
- **Compare to** (`race.goalSrc`: custom, last, sb, pr, course, none) fills goals with `fillGoals()` from `goalFor()`: Team history races (`SYNC.fetchRaceHistory()`, cached a minute), `teamHistory`, and `S.raceLog`, matched by runner id then name, at the finish distance (`finishOf()`). Season = since August 1. Typed goals still win. At the Gun `stampBests()` saves each runner's `pr`/`sb` on the race, so "New PR!" / "Season best!" compare against what stood before (both badges show when both apply, since 2.6.1). After Save, `offerPRs()` offers to update PRs (beat a PR: checked; no PR yet: unchecked); the done screen keeps an "Update PRs" button.
- **Race log:** every saved race is also kept in `S.raceLog` (60 max, `uploaded` flag). Results shows "Races on this phone" (all in local mode, not-yet-uploaded ones in a team). After the first-join merge, `offerUpload()` offers to upload races saved before joining.
- **Save status:** `sync.js` `info().race` = saved / saving / offline from pending commits, the push debounce and the marks snapshot metadata. The race status line shows "Saved to team ✓", "Saving to team…" or "Offline, saving when connected"; the done screen shows it too.
- In setup the race clock isn't sticky (it covered fields). Grid items in `#raceBody` have `min-width:0` so nothing scrolls sideways on a phone.
- **What Firestore holds for a race:** during: the race doc, one mark per tap (with its versions once changed), one presence doc per coach, `clock/{uid}`; after Save: a Team history entry with the full results model including every mark (corrections appended in `edits`), and the race doc (done) and its marks stay; after Discard: everything stays with status `discarded` (restorable). Local-only phones store nothing in Firestore.

## Data safety (2.6)
See rule 7 above for the permanent rules. How it works:
- **Trash** (`TRASH`, IndexedDB store `trash`): `{key, kind, id, label, item, extra, deletedAt, deletedBy, deletedByName, synced}`. Kinds: athlete, workout, course, pr, watch, racelog, history, race, checkpoint, marks (grouped per race in Recently deleted). A remote soft delete lands here too (`synced: true`). In a team the phone keeps 90 days / 300 items of synced entries (`pruneTrash()`, run when team sync is ready and when an old remote soft delete arrives; before 2.6.1 it only ran at load, before sync was ready, so it never pruned); "Show older" loads the rest from Firestore (`SYNC.fetchDeleted()`, `restoreOlder()`). Local mode keeps everything.
- **IndexedDB** (`mustang-splits` database: `trash`, `snapshots`, `races`) via `storeAll/storePut/storeDel`; localStorage fallback keys `mustang-splits:store:*` if IndexedDB is missing. `RACELOG` = every race saved on this phone (`raceLog()`, `logPut()`); `S.raceLog` keeps only the latest 5 for a quick start. `STORE_READY` resolves after loading.
- **Workouts:** deleting one never touches running, paused or finished stopwatches (they run on their plan copy); idle ones switch to stopwatch-only and `extra.idleWatchIds` reconnects them on restore (also when another coach deletes/restores).
- **Stopwatches:** `trashWatch()` copies a card with times before Remove, Start over, Change workout, Clear finished, Clear all times, and "Give every waiting stopwatch this workout". Undo of Start over puts the times back on the same card.
- **Marks** (`markChange()`): a fresh tap has no `hist` (the 2.4 shape, so taps still work under older rules). The first change adds the original as version 0. `liveMarks()` and `counts()` skip deleted marks; `counts()` prefers the mark with `chosen`. sync.js sends new versions with `arrayUnion`, so two coaches' corrections both land.
- **Saved results:** from 2.6 `raceModel()` stores every mark (`marks: [{id, ci, rid, t, dev, byName, at, chosen, deleted, hist}]`) and `withCells()` derives the cells. `modelOf(h)` applies `h.edits` (and turns pre-2.6 entries' cells into marks with `legacy: true`). A finished race's corrections go to its saved copy (`r.saved = {where, id}`, `savedSrc()`).
- **Results editor** (`timeSheet(src, rid, ci)`, src `{live: race}` or `{entry, where}`): every time with coach and tap clock time; This one counts; Correct or move (m:ss.t keypad = `timeField` with `data-tenths`, `microwaveT()`); Add a missing time; Remove; History with Restore; preview (`previewHTML()`) before Save; every action has Undo. Tapping any time in the race screen, Team history or Races on this phone opens it.
- **Discard** keeps the race and its marks (status `discarded`, `discardedFrom`); `SYNC.restoreRace()` restores it for everyone (with `restoredBy/At`) and opens it. Races discarded by 2.4/2.5 (empty tombstones) can't be restored.
- **Snapshots** (IndexedDB `snapshots`): `takeSnapshot(reason)`, `snapshotSheet()` (Settings > Restore a snapshot). Restoring merges trash and races (never shrinks them) and, in a team, asks the merge question again.
- **Storage:** Settings shows live-data size (`liveSize`, about 5 MB limit, warning at 50%, gear dot at 75%) and `navigator.storage.estimate()`. `navigator.storage.persist()` is requested.
- **Refusals** (sync.js): `commitOps()` → on permission-denied `refused()` checks `stillMember()`; still a member → the refused change(s) are found one by one, set aside in `cfg.refused` (retried once per app open) and reported in the team status; not a member → `lostAccess()`. Listeners use `listenerRefused()`. `MSApp.syncStats()` exposes counts for tests.
- **Coach phones** (`teams/{t}/devices/{uid}` = `{ver, name, seen}`, written on start and at most every 30 min): Settings > Team lists them with versions ("All phones on 2.6.0 — safe to publish rules" / "2 phones need to update"). Phones on 2.5 or older don't report.
- **Delete permanently** (admin, `purgeSheet()`, typed name; from Recently deleted on a removed runner, or since 2.6.1 from the Team tab: on an admin device the runner's × offers Remove or Delete permanently): snapshot first, then `SYNC.purgeRunner()` deletes the athlete and PR docs and the runner's marks, rewrites race runner lists and history entries (`scrubEntry()`, `purgedFor`), and writes `purges/{id}` (no name). Every phone applies `purgeLocal()` once (`cfg.purged`), including snapshots and trash. Exported backup files can't be reached.

## Meets and goals (2.7)
- **Model:** Course (place + checkpoints) → Meet (`S.meets`: `{id, seriesId, courseId, date 'YYYY-MM-DD'|'', time, kind, levels ['V','JV'], season}`) → Race (`race.meetId`, `race.division`: GV, BV, GJV, BJV, OPEN). `S.series` = `[{id, name}]` is what links a meet across years; renaming a series never breaks a link. Season = Aug 1 to Jul 31 (`seasonOf()`, `meetSeason()`; undated meets keep `season`). All synced (kinds `series`, `meets`) with soft delete; trash kinds `meet`, `series`.
- **Year to year** goes by `seriesId` + `division` (+ `courseId` for "Last time on this course"), never by typed names. Saved results (`raceModel()`) carry `meetId`, `seriesId`, `division`; an older race gets them from a link edit (`{op:'link', …}` in `h.edits`, applied by `modelOf()`; Undo appends an unlink).
- **Race setup:** `newRace()` picks today's meet, else the next one in the same season (`defaultMeet()`); `applyMeet()` loads its course and checkpoints and names the race; the division buttons (`divsOf()`, `applyDivision()`) preselect runners only when none are picked: who ran that division at the last meet (`preselectFor()`), else for a first race the runners marked Girls/Boys. The name follows meet + division until typed (`autoName()`, `nameAuto`).
- **Goals** (`fillGoals()` / `goalFor()`): Compare to = Season best (default), PR, Last race at this distance, Last time on this course, Last year at this meet, Custom, None. Each runner gets the chosen source, else season best, else PR, else blank, with `goalTag` SB / PR / Last / Course / Meet; typing a goal sets Custom. History = Team history + races on this phone, corrections applied, soft-deleted entries skipped (`pastRaces()`). Grid order uses the goal, else the PR (`sortByGoal()`).
- **Girls/Boys:** `athlete.gender` 'G'/'B' (blank = unknown, left out of Firestore). Team tab G/B button cycles – → G → B; Paste a list takes a third column (Girls/Boys/G/B); Add runner has Girls/Boys buttons.
- **Meets screen** (`meetsSheet()`, from Settings > Meets and the Meets button in race setup): by season; tap a meet to edit (`meetEditSheet()`: series or new series, rename series, course or new course, date, time, kind, levels, Delete with Undo). "Load the 2026 schedule" (`seed2026()`, `SEED_2026`: fixed ids `c-…`, `s-…`, `m26-…`, so two coaches loading it at once still get one schedule; an existing course with the same name is reused). "Start a new season" (`newSeason()`: confirm + snapshot, copies the latest season's meets with blank dates). "Link past races" (`linkSheet()`: saved races without a meet, suggested by date).
- **Meet days:** `tests/meetday.sh` still lists the 2026 dates; keep it in step with the Meets screen.

## Race-day UX (2.7.1)
- **Stopwatches tab:** no stopwatches → only the three choice cards (plus a help link); otherwise only "+ New" (`renderGrid()` hides `.new-row`). Never both.
- **Tab bar and race chrome** (`raceChrome()`, called from `renderRace()` and `updateRaceBanner()`):
  - `body.race-live` (live recording screen or the Ready screen) hides the tab bar; setup and finished results keep it.
  - `#raceClose` is "Exit race view", shown only while live; it leaves the race running.
  - While this phone's race is live and another tab is showing, `#liveBar` ("Race running · name · clock · tap to return", clock from `raceFrame()`) sits fixed above the tab bar. `body.has-livebar` adds bottom padding to `main` and lifts the toast and Undo bar.
  - Tapping it reopens the race with the 400 ms tap guard. The Stopwatches-tab race banner now only covers a race in setup or another coach's race.
- **Ready for the gun:** in setup, `#readyBar` is fixed above the tab bar (`body.race-setup` pads `main`). It opens the Ready screen (`raceReady`, `readyHTML()`) with one huge Gun. Undo gun returns to the Ready screen. Setup itself has no Gun button.
- **Faster editing:**
  - Result cells carry `data-rcid="rid:ci"`. `noteEdited()` + `flashEdited()` flash the edited cells when the editor closes.
  - Team history and Races on this phone keep their open races through redraws (`openIds()`/`reopenIds()`).
  - The editor has Save & next runner (results order) and Save & next checkpoint (`timeSheet(src,rid,ci,auto)` opens straight into editing and keeps the previous save's Undo).
  - `timeWarnings()`: out of order vs the runner's previous or next checkpoint, or a segment pace outside 4:00–15:00/mi (`PACE_MIN`/`PACE_MAX`). Warnings never block. A version saved anyway carries `warn` (kept in mark `hist` and history edits, shown in the editor's history).
- **Edit times** (`editTimesSheet(src)`, an "Edit times" button on every results view):
  - On an upright phone (`portraitPhone()`): one checkpoint at a time (picker + one field per runner, in results order, so the keyboard arrows go runner to runner).
  - Sideways and on wider screens: the full grid. Turning the phone re-lays it out.
  - Unsaved changes (`st.pend`) survive switching checkpoint or orientation.
  - Changed fields are highlighted. "Save all" runs `timeWarnings()` (Fix / Save anyway), then one `applyVersions()` (one batch, append-only versions with the coach name) and one Undo.
  - A ⚠ cell (two times) opens the single editor to choose. Clearing a field removes that time.
- m:ss.t fields (`data-tenths`) keep their tenth when tidied on blur ("19:10.0"), so more digits still fill from the right.

## Results views, runner cards, trends, tags (2.8)
Read-only views over saved races; nothing on the timing or race path changed. All in the app.js section "results views, runner cards, trends, context tags (2.8)".
- **Data:** `allRaces()` = every saved race, newest first, one copy each (by `raceId`): Team history (the live listener, latest 30) plus `teamRaces` (the full `fetchRaceHistory()`, refreshed when Results opens, 60 s cache) plus Races on this phone. Corrections, links and tags come from `modelOf()`. `teamEntry(id)` finds a team entry in either list; use it instead of `teamHistory.find`. `resultsFor(a)` = one runner's finishes (by id, else name) with pace, team place and tags.
- **Results switch** Meets | Runners | Team (`showResultsView()`, `S.settings.resView`, per phone).
  - **Meets:** `renderHistory()` groups team races by season, then meet (newest first), then division; then "Not linked to a meet" (with Link past races), then Practice history. Races on this phone, Today's stopwatches and Text to paste follow.
  - **Runners:** list grouped Girls / Boys / not marked, then group, with a search box (`rvQuery`), latest race, SB and trend chip. The card (`renderRunnerCard()`) has PR and SB per distance (PR = best of the PR list and races), this season's races (pace, team place, vs SB at the time, badges, tag line; tap → `openRaceAt()` opens it in Meets and flashes `.rcard[data-rrow]`), the season chart, pacing (`pacingOf()`, 2+ races with splits) and last year at the same series and division.
  - **Team:** `teamRows()` per meet this season for `G`/`B` (2.13: any race; before, `S.settings.teamLevel` V/JV): top-5 average and the #1–#5 spread. Table plus `teamChart()`.
- **Course factors** (`courseFactors()`): pace log-ratios for runners who raced two courses within `PAIR_DAYS` (21) days in the same season (never across Aug 1, since 2.9.1), one result per runner per day (official preferred); median per runner, then across runners; an edge needs `OVERLAP_MIN` (4) runners; chained by BFS from Winagamie GC (the course named like "winagamie"; otherwise the most-raced course). Adjusted pace = pace / factor ("Winagamie GC equivalent"). Courses without a factor say "Not enough runners have raced both X and Winagamie GC yet." `MSApp.courseFactors()` exists for tests.
- **Trend** (`trendOf()`): the last 3–4 untagged races at the latest race's distance. It uses adjusted pace when 3+ have a factor, else raw pace on the latest race's course. The straight-line fit's first-to-last change below −1.5% is Improving, above +1.5% Slowing, otherwise Steady. Fewer than 3: "Not enough races yet".
- **Context tags:** append-only history edits `{op:'tag', rid|null, tags, note, uid, dev, byName, at}`; the newest per runner (or race, `rid:null`) wins in `modelOf()` (`M.tags[rid]`, `M.raceTags`). Runner tags `TAGS_RUNNER`, race tags `TAGS_RACE`, note ≤ 60 chars ("No medical details"). Set from the Tag / Race tags buttons on saved races (Team history, Races on this phone, and the live race since 2.8.1: live tags sit in `race.tagEdits` on that phone and become edits at End race, or are appended when another coach's save arrives), `tagSheet(src, rid)` → `tagEdit()` (team: `SYNC.appendHistoryEdits`, local: `logPut`), Undo appends the previous tags, the sheet lists the history. A 2.7.x phone doesn't show them, and they change no time there (they have no `mid`, so they match no cell). Delete permanently drops them (`scrubEntry` filters by `rid`).
- **"Leave tagged results out of trends"** (`S.settings.excludeTagged`, on unless false): leaves tagged results (any runner tag, or a race tag) out of trends, course factors and the team view. Results, PRs and season bests never change.
- **Charts:** inline SVG, one axis (2.8–2.11: faster is higher; since 2.12 smaller times lower on line charts, see 2.12), colours `--series-1` (Girls / the runner) and `--series-2` (Boys) defined for light and dark (palette validated with the dataviz script against `#ffffff` and `#0f2034`). Lines 2 px, points 4.5 px radius with a surface ring, 24 px hit circles, tooltip in `figcaption.viz-tip` via `textContent`, legend plus direct labels, tagged races hollow. A table sits next to each chart.
- 2.8.1: raw numbers show under course-adjusted ones in the Team view; the runner chart has an adjusted PR line and the race list adjusted paces; practice history sits after Races on this phone (`#practiceList`).
- Fixed in 2.8: `purgeLocal()` now also rewrites the newest 5 stored races in IndexedDB (they're the same objects as `S.raceLog`, so they used to be scrubbed in memory only).

## Auto-update (2.9)
- The PWA section of app.js: `checkVersion(force, why)` fetches `version.json` on open (`'open'`), on return to the app (`'return'`), every 10 minutes (`'timer'`) and when the clocks stop (`'stopped'`). A newer version goes to `autoUpdate(why)`.
- **Never reloads during timing:** `timingNow()` = a running stopwatch or a live race (gun fired, status running) on this phone. While timing, the banner says it installs when the clocks stop; a 5 s check notices the stop.
- Not while the phone is in use (`inUse()`: a sheet open, a text field focused, a tap in the last 30 s), except right at open/return or the Settings "Check for updates" button.
- `applyUpdate()` asks the service worker to download every app file first (`{type:'refresh'}` message, sw.js `CACHE` v3), then `saveNow()` and reload; `sessionStorage['mustang-splits:updated']` makes the new version say "Updated to x.y.z". No loop: `mustang-splits:autoupd` allows 2 tries per version per 30 min.
- **Minimum version:** admin-only `minVersion` on the team doc (Settings > Team: "Require x.y.z" = this phone's version, or Turn off; `SYNC.setMinVersion`). A phone below it shows the full-screen `#forceUpd` "Updating…" and updates as soon as nothing is timing; with a clock running it shows a banner instead. If the new version can't arrive (offline, not on the server), it says so with Try again and "Use this version for now".
- Settings > Team lists each phone's coach name ("Coach (no name set)" if none; a name change is sent at once, `SYNC.touchDevice`), version and last seen; "All phones current — safe to publish rules" when none is older.
- Tests: `tests/e2e14.js` (fakes `version.json` and the app version per phone).

## Suggested training paces (2.11)
- **Pace math:** Jack Daniels' VDOT formulas (`vdotOf()`, `velAt()`, `raceTimeAt()`, `pacesFor()`):
  - easy 62–70% of VDOT, threshold 88%, interval 97.5%, repetition 105%
  - CV = the pace for about 30 minutes; 5K and mile = predicted race times
  - `tests/e2e20.js` checks them against Daniels' tables (VDOT 50 and 60, within 1–3 s).
- **`paceProfile(a)`:** the runner's best performance by VDOT this season (any result 1500m or longer: hand-timed, official, or a dated typed result), else a race in the last 120 days. Never an undated or old PR, and Injury/Illness-tagged results are left out. Shows a basis line ("Based on 5K season best 18:32.6, 9/19").
- **Runner card:** "Suggested training paces" (`paceTableHTML()`): every effort per 100, 200, 400, 800, 1000 and mile, labeled estimates.
- **Workouts:** a part's "Pace given as: By effort" (CV, threshold, interval, repetition, 5K pace, mile pace, easy, custom % of 5K speed). Each stopwatch gets its runner's own targets.
  - Group stopwatches use the middle runner and warn when the group's 5K paces differ by more than 3% (card, Targets sheet).
- **⋯ > Targets…** (`targetsSheet()`): shows the targets and adjusts them in 2 s/mile steps. Remembered in `S.paceAdj['<sorted runner ids>|<workoutId>']` (this phone).

## Team tab, typed results, Data charts, selected states (2.10)
- **Team tab** (`renderTeam()`): sections Girls, Boys, then "No Girls/Boys yet" (with Girls/Boys buttons). "+ Add to Girls/Boys" (`addRunnerSheet(g)`) sets the setting; groups are optional labels inside a section. The G/B tag button is gone. Paste a list takes "Name, Girls" or "Name, Group, Girls".
  - `convertGenderGroups()` runs once per phone (`S.settings.genderGroups2100`): groups named like Girls/Boys become the setting ("Girls JV" → Girls + group "JV"). A runner already marked the other way is kept. It shows what changed, with Undo.
- **Typed race results** replace typed PRs: `resultSheet(a)` ("+ Result" on each row) adds `{id, dist, t, date ('' = unknown), meet, src 'official'|'hand'}` to the old PR list `S.prs[id]` (synced as `prs/{id}`; `prData()` keeps the new fields). A pre-2.10 typed PR `{dist, t}` is a result with an unknown date. Removing one is a soft delete (trash kind `result`).
  - **PRs are always computed:** `prOf()` = fastest typed result; `careerBest()` = fastest of typed results, hand-timed races and official results (Compare to PR, the "New PR!" stamp, the 5K PR on each Team row). Season best includes dated typed results.
  - `resultsFor()` lists typed results (`where 'typed'`, no race to open). The "Update PRs?" offer after a race is gone.
- **Data tab** (was Results): inline SVG charts, no libraries; every runner dot or line has `data-goto` (opens the runner; Enter/Space too).
  - **Meets:** `meetCharts()` per meet: strip chart (Girls/Boys strips, ring = JV), this year vs last year (slope lines by series), pace through checkpoints for hand-timed races with splits.
  - **Runners:** season chart (● official, ■ hand-timed), each 5K vs season best (`vsSbBars()`), compare up to 3 runners (`compareChart()`, `rvCompare`), grade-by-grade bars (`gradeBars()`), and the career PR step line.
  - **Team:** ladder of 5K season bests (`teamLadder()`), top seven at each meet with the 1–5 and 1–7 gaps (`packChart()`, from `teamRows().pack`), top-5 average, and an improvement leaderboard (`improvementBoard()`).
- **Selected states:** one style app-wide (end of styles.css): selected = `--sel-bg` fill + `--sel-ring` ring + bold, plus a ✓ on choices (tabs, segmented controls, Race Mode checkpoints, chips, Varsity/JV, Girls/Boys).
  - Pressed = `brightness(.86)` at once (plus a small press, never on race name buttons). Disabled = faded and dashed.
  - Control edges use `--ctl-line`, and primary buttons `--btn-primary` (a darker team blue: white on Carolina blue is 2.9:1).
  - `tests/e2e19.js` checks contrast in light and dark (text ≥ 4.5:1, fills, rings and edges ≥ 3:1) and saves `tests/screenshots/sel-*.png`.

## Data organization (2.11.1)
- **Real data never goes in the repo** (the repo is public): no backups, history files or screenshots with real names. Tests use fake names. (The first name + last initial rule is gone: runners have full names.)
- **One race per division per meet:** Data > Meets shows each meet as one item (`meetHTML()`, header = meet name + date) with at most one race per division (`meetDivisions()` → `combineDiv()`; order GV, GJV, BV, BJV).
  - The hand-timed race and the official results for that meet and division become one race. Each runner has one row: the official finish is the result, hand-timed splits stay attached (the last split runs to the official finish), and a differing hand finish shows as "hand 16:40.0" (`cell.handT`).
  - Race rows show only the division, with badges Official / Splits.
  - Results without a level show as "Boys · level not set" and are listed in Data health.
  - Lists that can't be combined (another distance or checkpoints) stay in `extra` and are listed too.
  - Copy and CSV of a combined race use the combined model (`comboCache`).
  - Official cells aren't editable (toast). Hand-timed cells open the editor by runner id (`data-rcid`).
  - Charts sit inside the meet.
- **Seasons** are labeled by the fall year ("2026 season"; `seasonLabel()`); a race sorts by its date (Aug 1 to Jul 31).
- **A hand-timed race not linked to a meet,** on the date of exactly one scheduled meet, belongs to that meet (`attachMeet()` in `allRaces0()`). With no division, it takes one from its runners' Girls/Boys and the race name ("JV", "Varsity") or the meet's single level.
- **Official levels** (`offLevel()`): a coach's level edit, else the file's label, else the level of that runner's hand-timed race that day (`handLevels()`), else Sectional/State = Varsity. Otherwise none (Data health).
  - A label printed for the other gender is ignored. This was the Ben bug: the file labeled his 2026 results "Girls Varsity", so after the merge they became "Boys Varsity" while his unlabeled teammates were plain "Boys", leaving him in a one-runner race at each meet.
  - `parseDiv()` reads cut-off labels ("Junior", "Junior V", "Junior Varsi", "Jr" = JV; "Varsity -", "Varsity D2/3", "Varsi" = V).
- **Re-import updates** (`planUpdates()`): Varsity/JV levels from the file, runner links (`{op:'link', k, aid}` edits on the import record, applied in `offEntries()`), and full names for roster runners whose name is a short form (`fullNameFor()`: "Ben T." → "Ben Tollefsrud", a made-up example).
  - Previewed with counts, applied together with one Undo, and nothing is ever added twice.
- **Data health** (`healthIssues()`, `healthSheet()`; Settings and Data, badge on the Data tab) lists, each with a one-tap fix:
  - runners with no Girls/Boys
  - suspected duplicates (same first name or nickname with a matching last name or short form → Merge…)
  - results with no level or division
  - meets with more than one race for a division
  - meets filed under the wrong season
  - results from runners not on the roster (Link to a runner / Add as a runner)
- **Race Mode name buttons** (`fitNames()`): full names wrap to two lines and shrink only as much as needed, never cut off, fitted once when the grid is built with room for the time and coach lines. Buttons keep their fixed height.

## Merge runners and Girls/Boys (2.9.2)
- **Matcher** (`rosterCands()`): a candidate needs the same first name (or a `NICK` nickname). Last name scores:
  - 4 = full last name matches
  - 3 = an abbreviation that begins the file's last name ("Ben To." for T.)
  - 2 = same initial only, or any nickname match
  - 1 = the roster has no last name

  A Girls/Boys difference never hides a candidate (it's shown; 2.9.0 hid "Ben T." because of a stray "Girls" label and created "Ben To."). Automatic only when remembered (through merges, `mergedTo()`) or one full-name match with no other candidate. Every other plausible match is asked, and Save stays disabled ("Confirm n matches first", or "Confirm all suggested matches").
- **Girls/Boys:** `offGender()` = the linked runner's Team tab setting (never a guess, never a default to Girls). Results not linked to a runner keep the label printed in the file. No setting = "Unassigned" (official list with Girls/Boys buttons, `unassignedHTML()`; a Team view note). The file's gender only seeds a new runner when every label agrees. A level printed without Girls/Boys is kept as `r.lv`. Everything is derived when shown, so a merge or a gender change re-sorts at once.
- **Merge runners** (admin / no team; Team tab): `mergeSheet()` → `doMerge(dup, real)`.
  - Takes a snapshot first, then adds a merge record `S.merges` (`{id: dup, to, at, byName}`, synced kind `merges`, rules admin-only, soft delete).
  - Saved results are never rewritten: `mapModel()` (in `allRaces()` and `pastRaces()`) and `offEntries()` map the duplicate's id (rows, marks, tags; both in one race → the faster time).
  - Moved for real: this phone's stopwatch links and the live race (`mergeLocal()`, marks as append-only versions; other phones do the same when the record arrives), and PRs (faster per distance). The real runner gets the duplicate's Girls/Boys only if it had none.
  - The duplicate goes to the trash (kind `merge`). Undo / Restore (`undoMerge()`) reverses all of it.
  - Remembered import matches follow merges.

## Charts, Team tab, Data health, groups (2.12)
- **Chart kit** (app.js, start of the Data charts block): every chart uses it.
  - `timeScale(lo,hi,max)`: round ticks (multiples of 5 s, 10 s … 1 h, `T_STEPS`) on a range fitted to the data with ~6% padding.
  - Time direction: line and trend charts put smaller times lower (`vTime()`, "faster ↓"); the team ladder is a ranking, fastest at the top ("faster ↑"); horizontal charts put faster on the left (`hTime()`, "← faster").
  - Labels are measured (`textW()`, canvas, +8% for a fallback font) and never cut: `nameLines()` = full name, else first / last on two lines, else first / last / time on three, and only then "First L."; `wrapWords()` for meet names; `spreadY()` spreads labels vertically, joined to their dot by a leader line (`.lead`).
  - Dots that would touch get a lane offset (`place()`, as many lanes as needed; rows grow to fit).
  - Shapes as well as colours (`SHAPE`, `markSVG()`): Girls / series 1 = circle, Boys / series 2 = square (a polygon: the stopwatch `.dot` CSS rule's width/height would resize a `<rect>`), series 3 = triangle, no Girls/Boys = diamond.
  - Keys: `keyHTML(K)` draws the key from the same series list the chart draws; every mark carries `data-key` (space-separated keys allowed) and the key has exactly those keys.
- **Team view** (Data > Team): `teamRows()` keeps meets with fewer than 5 finishers (`short`, `n`): the table says "4 runners, no top-5", the pack chart shows the dots with that note, the top-5 chart skips them. The table is two rows per meet (Girls / Boys) so it fits an upright phone. Pack chart: filled #1–#5, ring #6–#7, solid #1–#5 gap, dashed #1–#7 gap in the team colour, gap text on its own line under each meet. Compare chart: this season and last, x = race order (each race day an even slot).
- **Team tab** (`renderTeam()`): one line per runner (full name, `gradeNow()` from official results, `seasonAvg()`), tap = the runner sheet (`resultSheet()`: name, Girls/Boys, results, Remove runner via `removeRunnerAsk()`). Collapsible sections (`S.settings.teamShut`), search (`#teamSearch`, outside `#teamList` so typing never loses focus), sort switch.
- **Season average** (`seasonAvg(a)`): this season's 5K results, each course-adjusted when its course has a factor (plain otherwise; "adj." when any is), official preferred (as `resultsFor()`), Injury/Illness left out (`hurt()`). **Sort** (`S.settings.rosterSort`: avg default, sb, name; `sortRunners()`, shared by Data > Runners and the Team tab): no 5K this season = last.
- **Groups** (`openWorkoutFlow()`, step 2 "Make groups"): `suggestGroups()` sorts runners by their pace for the workout's first effort part (`paceOfFor()`, 5K pace when none) and starts a new group when a runner is more than 2.9% slower than the group's fastest (so the 3% spread warning never fires); runners with no pace yet go last together. Each runner has a group picker (or New group); groups renumber. Group stopwatches are named "Group 1"…, singletons by the runner.
- **Data health** (2.12 additions): duplicates have one-tap "Merge into X" in both directions (`quickMerge()`: snapshot, merge, Undo bar; the sheet closes so the bar shows) plus "Merge into…" (the sheet); official results of a runner in Recently deleted are offered as a merge (`mergeOff()` adds only the merge record; Undo removes it; `likelySame()` suggests the runner); `blocked`: this phone's merges are refused by the team's published rules (`SYNC.info().mergesBlocked`); `short`: runners with results whose name is "First L." (re-import fills the last name).
- **Name matching:** `splitName()` reads a hyphenated last name as one name ("Ivy D." = Ivy Delacroix-Moss). `normName()` is unchanged (it feeds `nameHash()`; changing it would break remembered matches).
- **Fixed in 2.12:** `allRaces0()` had its de-duplication commented out by an inline comment since 2.9.2 (each Team history race counted twice); Add runner's empty-name check likewise since 2.11.1. Never put a `//` comment in the middle of a one-line function.
- Tests: `tests/e2e22.js` (fake team `tests/fixtures/fake-team-history.json`, made by `tests/tools/make-fake-team.js`, loaded by `tests/tools/fake-team.js`); `lib.js chartProblems()` checks every visible chart (labels vs labels/dots/lines, cut off, key = plotted keys, distinct swatches, round ticks, dots apart). Screenshots: `node tools/shots212.js <label> [url]` → `tests/screenshots/team-<label>-*.png`.

## Simplify and fix (2.13)
- **No Varsity/JV.** `gkey(division)` → 'G'/'B'; `divName()` shows only Girls / Boys / Both. Data > Meets groups each meet by gender (`divKey()` = G, B or U): every hand-timed and official list of one gender and distance is one race (`combineDiv()` merges all official lists; a hand-timed "Both" race is split by each runner's Girls/Boys). Nothing saved is rewritten; a one-time snapshot (`S.settings.oneList2130`) marks the switch. `teamRows(g)` takes each team's fastest five (and seven) at a meet from every race that day (a runner once, their fastest; official lists win over hand-timed for that day and team). Removed: the Varsity/JV switch, the level warnings, Data health's level checks, the meet editor's Levels, level updates on re-import (`planUpdates().levels` is always empty), the "Varsity / JV…" buttons. `levelSheet()`/`offLevel()` stay in the code unused. Race Mode setup: Girls / Boys / Both (`divsOf()`), saved as `GV`/`BV`/`OPEN` because the rules only accept those codes.
- **Effort parts without a time** (`segEffort(s)`): a part with an effort (Fast/Tempo/CV/Race pace/Easy/Jog) and a distance but no time is effort-based like "By effort": `EFF_REF` maps CV → cv, Tempo → threshold, Fast → interval, Race pace → 5k, Easy/Jog → easy (`segRef()`). Everything that asked `s.mode==='effort'` asks `segEffort(s)`.
- **Two functions were named `autoName`:** the race one (2.7) silently replaced the stopwatch one, so stopwatches made from runners had no name ("Unnamed"). The race one is now `raceAutoName(r)`; `migrate()` names saved nameless stopwatches after their runners.
- **Tiles** (`cardHTML()`): title (`tileName()`), ⋯, the time, one small line (rep, next target), the last split vs target with colour, shape and a word (`SHAPE_OF`: ▲ behind, ▼ too fast, ● on pace), then Lap (primary, `big-btn`) + Stop. Stop asks on the tile ("Tap again to stop", 3 s, the `ARM` guard). Undo stays on the tile: ↶ for a lap, Keep timing after Stop, a `.t-undo` strip after Start over (`tileUndo()`, `TUNDO`, 8 s), and a removed tile stays as "Removed X · Undo" for 8 s. Gone from the tile: the lane graphic, rep dots, workout name, basis line (it's in ⋯ > Targets), "No workout (just a stopwatch)". `updateLive()`'s timing math is unchanged; only its text changed.
- **Picker bar** (`pickBar()`, `pickIds()`): Select all, Girls, Boys, Clear (+ Suggest pace groups in the workout flow and the Bench) at the top of the workout flow, the Bench and race setup. Only free runners are picked.
- **Keyboard** (`keepVisible()`): the focused field is kept between the header and the top of the keyboard (visualViewport), inside its sheet first, then the page; checked on focus (300 and 700 ms) and whenever the visual viewport resizes. **Steppers** (`stepper()`, `[data-step]`): − and + beside the workout's reps and rest (15 s steps).
- **Team ladder** (`teamLadder()`): two stacked ranked lists (`ol.ladder`), Girls then Boys, rows = rank, full name, a dot on one shared time axis, the time; a row is a button that opens the runner.
- Tests: `tests/e2e23.js`, `tests/tools/tiles.js` (tile heights and a screenshot, before/after: `node tools/tiles.js <label> [url]`).

## Workouts that plan themselves (2.14)
- The Workouts tab starts with "What's today's goal?" (`todayHTML()` in `#wkToday`, above the workout list): seven goals (`GOALS`), the schedule line (`schedule()`: the next meet, today included, and the last one before today, in days), the goal the schedule suggests (`suggestedGoal()`: race day / 1 day before → Pre-meet; 1 day after → Recovery; 2 days before → Race sharpening; 2 days after → Aerobic base; ≤4 days before → Threshold/CV; otherwise Speed), and 2–3 suggestions for the chosen goal (`suggestionsFor()`, `WK_TPL`), each with a reason from the schedule (`whyFor()`; hard sessions within 2 days of a meet or 1 day after one are flagged, listed last).
- Templates are established high school XC sessions with effort parts only (`P_()`): Daniels VDOT easy / threshold / interval / repetition, Tom Schwartz CV, 5K and mile pace (from VDOT). `PACE_SYS` gives each its standard name ("Interval (I), Daniels VDOT").
- Flow: Use this → `tplSheet(t)` (parts by pace name; steppers for reps and rest) → Choose runners → `wkFromTpl()` saves (or reuses) an ordinary workout → `openWorkoutFlow({workoutId})` (picker bar; step 2 lists each runner's target and basis, `targetsList()`) → Start. Runners with no race this season are flagged with **Time trial** (`timeTrialSheet()`: Mile / 3200m / 5K + time → a dated hand-timed typed result "Time trial", which `paceProfile()` uses like a race) or **Run with a group** (the group maker; they run on their group's middle runner).
- **Rollback-safe:** a saved suggestion is a plain workout (no new top-level fields: the workouts rules only allow name/reps/rest/restUnit/segments); its template id rides inside each part as `tpl`. Older versions read it as an effort workout.
- Tests: `tests/e2e24.js`; `tests/tools/today.js [date] [label]` screenshots the tab.

## 3.0: Apple Human Interface Guidelines redesign
Spec, audit and the feature inventory: `docs/design-3.0.md`. Before/after screenshots of every main screen (fake names): `docs/screenshots-3.0/` (`node tests/tools/shots30.js <before|after> [url]`). 3.0 is presentation only: no data, sync or timing-engine change, so a rollback to `before-3.0.0` reads everything.
- **Nav bar** (`header.top`, sticky): left `#navLeft` (e.g. "‹ Runners" `[data-rvback]` on a runner card), a small centered title `#navSmall`, right the per-tab `.nav-for[data-for]` actions, then `#openSettings` with `#gearBadge`. The large title `#navTitle` sits right after the header and scrolls away under it; an IntersectionObserver sets `body.title-gone`, which shows the small title (iOS's collapsing large title). Race Mode hides the large title. `navBar()` sets the title and which actions show; `showTab()` and the Data views call it. Per tab: Stopwatches `#newBtn` (only with stopwatches; the empty state has the three choices), Workouts `#newWk`, Team `#addAth` + `#teamMore` (action sheet: `#pasteAth` → `pasteSheet()`, `#mergeAth`), Data `#seasonPick` (`seasonPicker()`; sets `tvSeason`; in Meets it jumps to that season; it keeps the `data-tvseason` attribute).
- **Theme:** `theme-color` follows light/dark (#f2f2f7 / #000) now that the nav bar is light.
- **Type:** `--font-ui` (the system font) everywhere; `--font-clock` (Barlow Condensed) only for clock digits (`.big`, race clock, live bar). All font sizes are rem; `html{font:-apple-system-body}` makes 1rem follow the phone's text size.
- **Tab bar:** tint colour on the selected icon and label, no pill. The Data health badge moved to the gear and Settings > Data > Data health (`updateHealthBadge()`).
- **Sheets** (`modal(html,onMount,kind)`): bottom sheets with a grab handle (`.grab`, appended last because many sheets read `box.firstElementChild`; `dragToClose()`); `kind 'action'` = an action sheet (`.as-group`, `.as-btn`, `.destructive`, `.as-cancel`). `confirmBox()` is an action sheet (same promise, `[data-x=yes]`/`[data-x=no]`; pass `safe` for a non-red choice); `actionSheet(title, items)` for menus. End race is an action sheet.
- **Swipe rows** (`.swipe` > `.sw-front` + `.sw-lead` / `.sw-trail`; one document-level handler; `closeSwipes()`): workouts (leading Use / Edit, trailing Duplicate / Delete; tapping a workout opens the same choices), runners (trailing Remove → `removeRunnerAsk()`). **Press and hold** (`longPress(sel, fn, skip)`, 550 ms): a tile (its ⋯ menu, never on its buttons), a runner (Edit / Add a race result / Remove), a workout.
- **Workouts:** the list is a grouped list; the editor (`#wkEditor`) is a large sheet while `body.wk-editing` (renderEditor toggles it).
- **Settings** (`openSettings()`): grouped inset sections (Stopwatches, Race Mode, Team, Data, Stopwatch tools, Backup, Clear, Help, About); `.ios-sec`, `.ios-group`, `.ios-row`, `.ios-nav`, `.ios-foot`. "Leave tagged results out of trends" (`#exTagged`) lives only here now. Help: `#helpBtn` (How to read a stopwatch card), `#showTour`.
- **Data:** no top toolbar. Each exported view has a Share button (`[data-share]`, an action sheet that clicks the view's own hidden `.share-acts` buttons; today's stopwatches: `#shareToday` → `#copyRes` / `#dlRes`). Import history, Recently deleted, Data health: Settings > Data (`#openImport`, `#openDeleted`, `#openHealth`).
- **Undo bar and toasts** stay above the tab bar (a top position covered each screen's first controls; Race Mode keeps its top bar).
- Tests: `tests/e2e25.js` walks the feature inventory (F01–F75), times a new coach starting a workout for the whole team (6 taps), and checks every main screen at a large text size. `tests/e2e19.js` checks the 3.0 states (tint tab, raised segment with a ≥3:1 edge, ≥4.5:1 text).

## Keep screen on (2.9.1)
- `applyWake()`: wanted when Settings "Keep screen on" is set, a stopwatch is running, or a race is live (`wantWake()`, any tab). Screen Wake Lock first.
- iOS before 18.4 refuses the wake lock in home-screen apps, and Safari refuses a request without a tap ("This device blocked it" in 2.9.0). So the app re-checks after every tap (a document `click` listener, after the tap's own action), on return, and every 3 s.
- If the lock is still refused, it plays a 1 px silent looping video (`wakeVideo()`, NoSleep.js media, MIT, inlined as data URIs). Settings says "iPhone backup method"; "Tap anywhere to keep the screen on" if even that needs a tap.
- `MSApp.wakeState()` for tests.

## Official results and career history (2.9)
- **Import** (admin only in a team; any phone without one): Settings > Import history file, or Results > Import history. File format `mustang-splits-history/v1` (`{format, generated, source, notes, athletes:[{name, aliases, school, results:[{season, grade, level HS|MS, distance, distance_m, date, time, time_s, place, flag, meet, division, meet_name_cut_off, possible_duplicate_of}]}]}`). These files hold minors' full names: `*.history.json` and `data/` are git-ignored, and the repo is public. Tests use `tests/fixtures/fake-history-fixture.json` (fake names).
- `importPlan()` (nothing saved) → `previewSheet()` → `saveImport()`. Runner matching `rosterCands()`: full name 4, first + initial 3, nickname (`NICK` groups, e.g. Benjamin = Ben, Isabella = Izzy) 2, first only 1; certain = one candidate scoring 3+, else the coach confirms; aliases count as names; gender must agree when both are known. A confirmed match is remembered as `matches[nameHash] = athleteId` (`nameHash()` = SHA-256 of the normalized full name, salted); new runners get their full name (`storeName()`, 2.11.1). Missing runners are offered as new unless graduated (grade projected from the last result).
- Meet names: `meetKey()` normalizes (years, "44th", "Annual", Invitational → Invite, cut-off names by prefix); `MEET_ALIASES` maps every known variant to the 2026 series ids with official names; unknown names that share all their words group together (`groupMeetNames()`); middle school meets never fold into a high school series. The coach can change any series in the preview. Past meets: id `mh-<date>-<series>`, the series' current course (`KNOWN_COURSE`), levels from divisions; MS results get no meet.
- This season's series got their official names by a `migrate()` rename keyed by id (`SERIES_RENAME`; only if still the 2.7 seed name). The seed keeps its 2.7 ids.
- Duplicates: entries with `possible_duplicate_of` on the same day, distance and within 2 s: keep the one with a division. Every result has a key `nameHash|date|meters|time`, so a re-import adds nothing.
- Storage: one record per import part (`OFF_PART` = 600 results) in IndexedDB `official` (DB version 2) and in a team `teams/{t}/official/{id}`. Results: `{k, aid|null, name (short), g, season, grade, level, dist, date, t, place, meet, seriesId, meetId, courseId, division}` (division `GV`… or `GMS`/`BMS`, '' if the level is unknown). Snapshot before saving. Undo / Remove = soft delete of the whole import plus the runners, series, courses and meets it created (`undoImport()`, trash kind `import`, restore `restoreImport()`). Delete permanently scrubs official results (`scrubOfficialDoc()`, and sync.js `purgeRunner`). Not in backup files (re-import the file instead).
- **Views:** `offEntries()` turns official results into read-only race models (`h.official`, one per day, meet, division and distance; memoized by `offGen`), so `allRaces()` (HS; `allRaces(true)` adds MS), `pastRaces()` (goals), `courseFactors()` and the team view use them. `resultsFor()` merges an official and a hand-timed result for the same runner, day and distance into one (official time, `x.hand` beside it). Course factors count a runner once per day (official preferred). PR = `careerBest()` (PR list or fastest official result; hand-timed races don't override a typed PR there; the file's PR flags are ignored); `stampBests()` and Compare to PR use it. `memoize()` caches heavy view data for one render.
- Results > Meets: official lists sit in their season and meet with an Official badge and the hand-timed column when the team timed it too (`officialHTML()`); middle school in its own group; on a phone without a team the section is titled "Official results".
- Runner card career (`careerHTML()`, high school 5K by default): 5K PR progression (`stepChart()` step line), season by season with grade, the same meet year over year (by series), early / mid / late season arc (`arcOf()`: to Sep 10, Sep 11–Oct 5, Oct 6 on; best pace per mile), official vs hand-timed, and middle school in its own section.
- Team view: a season picker, Girls and Boys top-5 average and 1–5 spread per meet (5K), official results when they exist for that day and division (else hand-timed), a season-by-season table.
- 2.9.1:
  - **Backups** carry `official` (all records) and a restore (or a snapshot) merges them in without ever removing (`mergeOfficial()`).
  - **Sectional/State** (`PLACE_SERIES`): the course comes from the place in the printed name (`placeOf()`: "WIAA D2 Sectional - Kiel", "Sectional 4 - Waupaca", "@ Wisconsin Rapids"; `courseByPlace()` finds "Kiel HS" or creates "New London"). `fixPlaceCourses()` moves meets that 2.9.0 imported (`mh-` ids only) on an admin / no-team phone. Official models take the course from their meet.
  - **Varsity/JV:** `offLevel()` = an admin's level edit (append-only `{op:'level', k, level}` in the record's `edits`, newest wins, '' clears), else the file's division, else the schedule (`levelGuess()`: a this-season meet in the series with one level). `parseDiv()` reads more forms (Frosh/Soph, open, reserve = JV; championship, gold = V).
  - `levelSheet()` (Team view note "n official results have no Varsity or JV level", or "Varsity / JV…" on an official list) sets them with Undo. Re-importing a file adds levels to results already imported (`plan.levelFix`). Rules: admin `appended('edits')` on `official`.
- Tests: `tests/e2e15.js` (importer, re-import, Undo/restore, team sync, purge, 600-result performance), `tests/e2e16.js` (a real 2.8.1 phone and a 2.9.0 phone together under the current rules; offline).

## Testing
All tests live in `tests/` (since 2.6.1) and nowhere else. One-time `tests/setup.sh` (npm packages; a Java runtime in `tests/.jdk` if the Mac has none). **Run every suite: `tests/run.sh`** (about 18 min; one suite: `tests/run.sh e2e8.js`). It serves the repo on :8765, starts the emulators with the repo's current `firestore.rules`, clears them between suites, and ends with "ALL SUITES PASSED" or the failures (logs in `tests/out/`). Push only when every suite passes (meet days are fine since 2.8.1). Suites are listed in `tests/README.md`; new tests go there too. `tests/retired/` holds superseded scripts that aren't run.

## Simple first-run UI (2.3)
Goal: a coach who has never seen the app can use it. The timing engine is unchanged (only label strings inside `updateLive()` changed).
- Stopwatches tab: one big **+ New** button and a **?** button. `updateToolbar()` shows "Start all n waiting" / "Stop all n running" only when 2+ are waiting/running. No color legend (the ? sheet, `helpSheet()`, explains the dashed ring, the dot and the colors).
- + New (`newSheet()`) and the empty state (`renderGrid()` with no stopwatches) show the same three cards (`choicesHTML()`, `NEW_CHOICES`): Quick stopwatch (`quickStopwatch()`: "Runner n", starts timing now), Workout (`openWorkoutFlow()`), Race (`raceEntry()`).
- Card face: the name is a button (tap to rename), a ⋯ button (`cardMenu()`), the workout name as text (no dropdown), and one big button by state: Start → Lap / "Tap at 400m" → "Start next rep now" during rest → a calm "✓ Done · time" or "✓ Stopped · time" status. A small ↶ undo stays next to it. The runners line shows only when it adds something (a group, or a renamed card).
- ⋯ menu shows only what fits the state: Stop (one tap), Keep timing, Start over (confirms if there are times), Undo last tap, Change workout (`planSheet()`), Change runners (Bench, waiting cards), Rename (`renameSheet()`), Remove stopwatch. All actions go through `runAct()` → the existing `ACT` functions.
- Workout flow: step 1 pick runners (chips, group headings select the whole group, busy runners dimmed), step 2 pick a workout (or none), One stopwatch each / One for the group, then **Start now** (all start at the same instant) or **Set up, start later**. "Use this workout" on the Workouts tab opens it with that workout picked.
- Quick tour (`showTour()`, 3 cards, Skip): shown automatically only on a phone with no saved data (`LOADED` is null); stored in localStorage `mustang-splits:tour`. Reopen from Settings or the ? sheet.
- Wording: "runner" on screen (data still says athletes). Workout cards and the ? sheet say "Too fast" for purple (faster than plan is something to fix); Race Mode keeps its own goal wording. CSV column headings did not change, so existing spreadsheets still line up.

## Handoff
When continuing work, ask the coach what changed on his phone since the last session and read this file first. Update this file when architecture or rules change.
