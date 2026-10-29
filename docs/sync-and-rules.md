# Team sync and Firestore rules

Team sync (sync.js), the Firestore data model, the password and admin schemes, the security rules, and how to recover a team.

Moved out of CLAUDE.md on 2026-10-29 with its wording unchanged; the version tags in headings say when each part was built (the full old file is `docs/archive/CLAUDE-before-split.md`, and version-by-version history is in REQUESTS.md). "See X" in the text names a section heading; the index in CLAUDE.md says which file holds each one. See also: `docs/stopwatches.md` (Shared stopwatches (3.3)), `docs/race-mode.md` (race sync), `docs/data-safety.md` (soft deletes, refusals).

## Team sync (2.0, Phase 1)
Goal: coaches on the same team share the roster, workouts and results history, and (since 3.3) every stopwatch, live (see Shared stopwatches).

### Principles
- Local first. `S` in localStorage stays the source the UI renders from. Firestore is a mirror with an offline queue (`persistentLocalCache`).
- Nothing on the timing path waits for the network (3.3: shared stopwatch taps are written in the background and replayed locally at once): start, split, stop and rest never wait, and nothing is written per tick. `save()` calls `SYNC.localChanged()`, which is debounced (800 ms) and only writes athletes/workouts whose content changed.
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
teams/{teamId}/places/{id}      {name, lat, lon, label, src, confirmed, confirmedBy}   race locations (3.2); id = course id or 'n-…'
teams/{teamId}/watches/{id}     {name, workoutId, athleteIds, athleteNames, autoName, day, ep, from?, hid?}   shared stopwatches (3.3; from/hid 3.6)
teams/{teamId}/wevents/{id}     {w, day, ep, type, at, off, by, byName, plan?, ids?, deleted?, chosen?, hist?}   stopwatch taps, append-only (3.3; leave/join + ids 3.6)
teams/{teamId}/weather/{id}     {date, place, raceId, lat, lon, start, end, src, status, wx{t,at,dp,rh,ws,wg,pr,pr48,cc}, at, dismissed[]}   race-day weather (3.2)
teams/{teamId}/awards/{id}     {season, k:'s'|'r'|'v'|'m', aid?, date?, meetId?, set?, recip?, captain?, standing?, hs?, grade?, var?, champ?}   the coaches' awards decisions (3.18, never deleted; docs/season-and-awards.md)
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
- Tested with the Firestore emulator (3.18 adds 16 awards cases: member read/write, outsiders, no notes field, yes/no standing, grade range, settings, recipients, Varsity/JV, Championship, no deletes; 351 cases in 3.6, adding split taps and headers; 342 cases in 3.5, adding meet notAttending; 338 cases in 3.3, adding shared stopwatches; 313 cases in 3.2, adding race locations and weather; 292 cases in 2.9.2, adding merges; 283 cases in 2.9.1, adding admin Varsity/JV edits on official results; 277 cases in 2.9: minimum version on the team doc, admin-only official results with soft delete; 253 cases in 2.7, adding series, meets, Girls/Boys, race meet/division and meet links; 223 cases in 2.6: no hard deletes anywhere, soft delete/restore, append-only mark versions and history edits, discard/restore, purge, devices; 155 cases in 2.5, adding courses, PRs and race course/goal fields; 130 cases in 2.4, adding coach names on marks, presence, discard tombstones and offline revival; 101 cases in 2.2, incl. races, marks, clock and race history; 74 in 2.1: create/join/change/rejoin, admin set/become/change/drop, legacy teams, console recovery, plus attacks: listing, forged team/admin keys, stale versions, extra fields, non-admin password/rename/admin changes, cross-team access).

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
