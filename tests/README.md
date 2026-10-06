# Tests

All of Mustang Splits' tests live here (since 2.6.1). None of this is part of the app or deployed behavior.

- **One-time setup:** `./setup.sh` (installs npm packages; downloads a Java runtime into `.jdk/` if the Mac has none). Needs Node, Python 3 and Google Chrome (`CHROME=/path/to/chrome` to use another).
- **Run everything:** `./run.sh` (about 18 minutes). One or more suites: `./run.sh e2e8.js e2e10.js`. Logs and screenshots go to `out/` (git ignores it).
- **Before pushing:** every suite must pass. Pushing on a meet day is allowed since 2.8.1 (`./meetday.sh` is informational).

| Suite | What it covers |
|---|---|
| `rules.test.mjs` | Firestore security rules (emulator): teams, passwords, admin, races, courses, PRs, data safety (no hard deletes, soft delete/restore, append-only versions, discard/restore, purge, devices), meets and series |
| `team-tab.js` | Team tab (2.12): one line per runner, no Group field, search, collapsible sections, sort switch, runner sheet (rename, remove with Undo), Clear track |
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
| `e2e14.js` | 2.9 auto-update: never during a running clock or live race, waits while in use, no reload loop, "Updated to", minimum app version (full screen, banner while timing, can't-arrive case), coach phones list |
| `e2e15.js` | 2.9 career history import (fake-name fixture): preview, matching, duplicates, meet-name series, names never stored in full, Meets/Runners/career/Team views, re-import, Undo/restore, team sync (admin only), purge, 600 results performance |
| `e2e16.js` | 2.9 mixed versions: the real 2.8.1 code (git archive served on :8766) and 2.9.0 in one team under the current rules: roster, two-coach race, live tag, correction, import, minimum version; offline |
| `e2e17.js` | 2.9.1 fixes: keep screen on (iOS refusal → silent video, on while timing), course factors within one season, official results in backups/restores, Sectional/State courses by place, Varsity/JV inference and the level sheet (Undo, re-import, team sync), coach names in Settings > Team |
| `e2e18.js` | 2.9.2: the matcher asks about every plausible match (abbreviated names, stray Girls labels), Girls/Boys from the Team tab with Unassigned, Merge runners (results, hand-timed races, tags, PRs, stopwatches; Undo; team sync; admin only) |
| `e2e19.js` | 2.10: Team tab Girls/Boys sections and the one-time group conversion, typed race results (PRs computed), Data tab charts (taps open runners), selected/pressed/disabled states with contrast checks in light and dark (screenshots `screenshots/sel-*`) |
| `e2e20.js` | 2.11 training paces: VDOT math vs Daniels' tables, basis (season best, never old PRs, no Injury/Illness), pace table, effort-based workouts per runner, groups (middle runner, >3% warning), adjustments remembered, targets fixed at Start |
| `e2e21.js` | 2.11.1 data organization (fake names recreating the coach's backup): the Ben bug (label for the other gender + merge), one race per division per meet (hand-timed + official combined), same-day meet attach, naming, seasons, re-import updates with one Undo, Data health fixes, full names, long names on Race Mode buttons |
| `e2e22.js` | 2.12: every chart at phone width in light and dark (no label overlaps a label, dot or line; nothing cut off; key = plotted series; distinct shapes; round ticks; dots apart), the team ladder, top-5 chart and table ("4 runners, no top-5"), pack charts, Data health (one-tap merges with Undo, a removed runner's results, short names, merges refused by the 2.9.0 rules in the emulator), sort by season average, groups in the workout flow (fake team: `fixtures/fake-team-history.json`) |
| `e2e23.js` | 2.13: effort-based parts with no time typed (regression), compact tiles (names, Lap + Stop, tap-again Stop, Undo on the tile, height), the picker bar (Select all / Girls / Boys / Clear / Suggest pace groups), no Varsity/JV anywhere (one Girls and one Boys list, team top-5 from any race, Girls/Boys/Both), the stacked team ladder, steppers, and a faked 320 px keyboard on every field of the main sheets |
| `e2e24.js` | 2.14: today's goal from the schedule (five dates), 2–3 sessions per goal with reasons and standard pace names, hard sessions flagged near meets, the flow (steppers → runners → per-runner targets with basis → Start), time trial and run-with-a-group for runners without race data, Build your own, saved workouts without new top-level fields |
| `e2e11.js` | 2.7 meets: 2026 seed (and two phones seeding at once), seasons, divisions and preselection, Girls/Boys, goals with fallback and tags, Last year at this meet, Link past races |

`lib.js` has shared helpers (`patchClick`: a click scrolls an element clear of the fixed bars only when it's covered). `tools/` has the screenshot scripts used for visual checks (`node tools/shots26.js` while `run.sh` isn't serving; they expect the app on :8765). `fixtures/` holds the fake-name history file. `tools/shots29.js` takes phone-size screenshots of every main screen into `screenshots/` (fake names only). `tools/tiles.js <label> [url]` measures and screenshots stopwatch tiles (2.13). `tools/shots212.js <label> [url]` screenshots the Data > Team charts with the fake team (`tools/fake-team.js`, fixture made by `tools/make-fake-team.js`); `lib.js` `chartProblems()` is the chart checker. `retired/` keeps the 2.0–2.2 era scripts that newer suites replaced; they no longer match the app and are not run (see `retired/README.md`).
