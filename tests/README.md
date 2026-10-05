# Tests

All of Mustang Splits' tests live here (since 2.6.1). None of this is part of the app or deployed behavior.

- **One-time setup:** `./setup.sh` (installs npm packages; downloads a Java runtime into `.jdk/` if the Mac has none). Needs Node, Python 3 and Google Chrome (`CHROME=/path/to/chrome` to use another).
- **Run everything:** `./run.sh` (about 18 minutes). One or more suites: `./run.sh e2e8.js e2e10.js`. Logs and screenshots go to `out/` (git ignores it).
- **Before pushing:** every suite must pass. Pushing on a meet day is allowed since 2.8.1 (`./meetday.sh` is informational).

| Suite | What it covers |
|---|---|
| `rules.test.mjs` | Firestore security rules (emulator): teams, passwords, admin, races, courses, PRs, data safety (no hard deletes, soft delete/restore, append-only versions, discard/restore, purge, devices), meets and series |
| `team-tab.js` | Team tab: regrouping while typing, Clear track |
| `e2e1.js` | Team sync smoke test: create, join, merge, live edits, history, leave |
| `e2e2.js` | Without the Firebase SDK; plan copy per run; service worker and offline reopen |
| `e2e3.js` | Restoring a backup in a team never overwrites the team |
| `e2e4.js` | Team sync of runners, workouts and history |
| `e2e5.js` | Team admin: create, become, change passphrase, rename, drop, legacy teams |
| `e2e6.js` | Race Mode on one phone and three (shared clock, merged taps, offline, editing) |
| `e2e7.js` | 2.3 simple UI: tour, + New, cards, menus, workout flow |
| `e2e8.js` | 2.4 recording screen: stable grid (tap storms), Time now, tidy, hold to remove, presence, discard/restore |
| `e2e9.js` | 2.5 results: split changes, distances, courses, Compare to, PRs, cards, race log, save status |
| `e2e10.js` | 2.6/2.6.1 data safety and the results editor, snapshots, storage, refusals, purge, coach phones |
| `e2e12.js` | 2.7.1 race-day UX: + New vs the cards, tab bar, Exit race view, Race running bar, Ready screen, Save & next, warnings, Edit times (upright and sideways), keeping your place |
| `e2e13.js` | 2.8 results views: Meets grouping, Runners list and card (PR, SB, vs SB, pacing, last year, open race), course factors (21-day window, 4-runner minimum), trend thresholds, team top-5 and spread, context tags (append-only, Undo, history, exclude switch, sync, purge), charts light/dark |
| `e2e11.js` | 2.7 meets: 2026 seed (and two phones seeding at once), seasons, divisions and preselection, Girls/Boys, goals with fallback and tags, Last year at this meet, Link past races |

`lib.js` has shared helpers (`patchClick`: a click scrolls an element clear of the fixed bars only when it's covered). `tools/` has the screenshot scripts used for visual checks (`node tools/shots26.js` while `run.sh` isn't serving; they expect the app on :8765). `retired/` keeps the 2.0–2.2 era scripts that newer suites replaced; they no longer match the app and are not run (see `retired/README.md`).
