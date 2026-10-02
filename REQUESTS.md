# Requests and status

Every request from 2.4.0 on, checked against the code, `git log`, `version.json` and CLAUDE.md (not memory).
**Updated with every push.** Last update: Fri 2026-10-02, with 2.7.0.

**Live on Vercel:** 2.7.0 (`version.json`, `APP_VERSION`, and https://mustang-splits.vercel.app/version.json all say 2.7.0). **Rules file:** 2.7.0 (first line of `firestore.rules`; it shows in the Firebase console once published).

| Version | Pushed | Commit |
|---|---|---|
| 2.4.0 | Thu 10/1, 10:12 PM | `8b9ef78` |
| 2.5.0 | Thu 10/1, 11:26 PM | `60e5621` |
| 2.6.0 | Fri 10/2, 8:20 AM | `e8d9bc1` |
| 2.6.1 | Fri 10/2, 9:20 AM | `ddc4744` |
| 2.7.0 | Fri 10/2, 12:07 PM | `a354d19` |

**Status key:**
- ✅ Live (version, and where it is in the app)
- 🟡 Live with a gap (the gap is described)
- 🔧 Built but not pushed
- ⏳ Planned (waiting for your go-ahead)
- ❌ Missed

Nothing is 🔧 Built but not pushed: the working tree matches 2.7.0, except the uncommitted `plan-2.6-2.7.md`.

---

## 2.4.0: Race Mode recording (Push A)

**Item 3: Stable name grid**
- ✅ 2.4.0. Name buttons never move during a race. *Race screen after Gun.*
- ✅ 2.4.0, PR fallback added in 2.6.1. Grid order: the goal, else the runner's PR at the race distance, fastest first, then first name. Fixed at the gun. *Race setup > Order and goals.*
- ✅ 2.4.0. The order shows in setup, and dragging ☰ adjusts it. *Race setup > Order and goals.*
- ✅ 2.4.0. 2 or 3 columns, remembered per phone. Buttons are 60 px tall in 3 columns (66 px in 2), and 15 runners fit without scrolling. *Race setup > Name buttons.*
- ✅ 2.4.0. A tapped runner stays in place, grays out, shows "✓ time" and ignores taps at that checkpoint.
- ✅ 2.4.0, changed in 2.6.0 at your request. Press and hold removes a time. 2.4 asked "Remove Maya's Finish time?". Since 2.6 it removes at once with an Undo bar at the top (your decision 1).
- ✅ 2.4.0. A time another coach recorded grays out on every phone and shows that coach's name.
- ✅ 2.4.0. "Tidy up (n passed)" button (one-time tidy) and "Show all". *Below the grid.*
- ✅ 2.4.0. Taps are ignored for 400 ms after the grid changes. As approved, your own taps never block other buttons, and another coach's change blocks only that one button.
- ✅ 2.4.0. "2 coaches at Finish". *Status line under "I'm at".*
- ✅ 2.4.0. Coach name, asked once on the race screen. *Settings > Your name in Race Mode.*
- ✅ 2.4.0. Version check: "Coach Jen needs to update". *Status line.*
- ✅ Browser test: fast taps while remote marks arrive, never the wrong runner (`tests/e2e8.js`, in the repo since 2.6.1).

**Item 4: Time now, name later**
- ✅ 2.4.0. Renamed "Time now, name later", made secondary (outlined, smaller), with a one-time hint. *Race screen, the row above the names.*

**Item 5: End race**
- ✅ 2.4.0, changed in 2.6.0 at your request. End race offers Save to team history / Save results, Discard, or Keep racing.
  - 2.4's Discard confirmed, then deleted the marks.
  - Since 2.6, Discard is instant with Undo, keeps everything, and can be restored (your item 1).

**Rules, tests, docs, clipboard**
- ✅ Rules for coach names, presence and discard (2.4). Emulator tests passed. Rules were put on your clipboard.
- ✅ CLAUDE.md updated.
- 🟡 Pushed on Thu 10/1 at 10:12 PM. That was the Waupaca Invite day, before the "never on a meet day" rule existed.

## 2.5.0: Results, checkpoints, cloud, goals (Push B)

**Item 1: Split changes**
- ✅ 2.5.0. Change from the previous segment, by pace per mile when both segments have distances, otherwise by raw split ("+12s split").
- ✅ 2.5.0. Within 1% of the previous pace shows gray. Larger slowing is orange, larger speeding up is green.
- ✅ 2.5.0. Shown in the results table, the cards, Copy results and CSV (new CSV columns at the end of each row).

**Item 2: Checkpoints**
- ✅ 2.5.0. Free distance entry with an mi | m toggle and the decimal keypad. Quick buttons: Mile 1, Mile 2, 2 mi, 3200m, 4K, 5K. *Race setup > Course and checkpoints.*
- ✅ 2.5.0. Add, rename, move or change a distance during a running race. Paces recalculate. *Race screen > Edit checkpoints.*
- ✅ 2.5.0. Saved courses, synced to the team, picked in setup. *Race setup > Save as course, and the course picker.*

**Item 6: Cloud safekeeping**
- ✅ What Firestore stores during and after a race: in the plan and in CLAUDE.md (updated for 2.6).
- ✅ 2.5.0. "Saved to team ✓", "Saving to team…" or "Offline, saving when connected". *Race status line, and the finished screen.*
- ✅ 2.5.0. After joining a team, offer to upload races saved only on this phone. *Appears after the join question. Also Results > Races on this phone > Upload.*

**Item 7: Goals from history**
- ✅ 2.5.0. PRs per runner per distance (5K, 2 mi, 4K, 3200m, plus custom), typed with the m:ss keypad. *Team tab > PR button on each runner.*
- ✅ 2.5.0. Compare to: Custom (default in 2.5 and 2.6), Last race at this distance, Season best, PR, Last time on this course, None. Goals stay editable. *Race setup.*
- ✅ 2.5.0. Results compare at each checkpoint (even-pace targets) and highlight "New PR!".
- ✅ 2.5.0. After saving, an offer to update PRs. *Also the "Update PRs" button on the finished screen.*
- ✅ 2.5.0. "Season best at this distance" option (since August 1).
- ✅ 2.5.0, both together since 2.6.1. "Season best!" shows alongside "New PR!" when both apply (cards, table, Copy).

**Changes you added for Push B**
- ✅ 2.5.0. Results on a phone: one card per runner. The wide table stays for landscape, larger screens, Copy and CSV.
- ✅ 2.4.0 / 2.5.0. Minimal recording screen: name buttons show only the name, the time, and who recorded it.

**Rules, tests, docs, clipboard**
- ✅ Rules for courses, PRs and race fields. Emulator tests passed. CLAUDE.md updated. Rules on your clipboard.
- 🟡 Pushed on Thu 10/1 at 11:26 PM, a meet day, before the rule existed.

## 2.6.0: Data safety and editing results (Push C)

**Item 1: Data is never permanently lost**
- ✅ 2.6.0. Soft delete for races, marks, history entries, runners, workouts, courses, PRs, stopwatches with times, checkpoints with times, and races on this phone. (Meets don't exist until 2.7.)
- ✅ 2.6.0. The rules refuse client hard deletes of team data. The only exception is an admin purge. Presence, devices, clock and membership docs stay deletable because they aren't team data.
- ✅ 2.6.0. Discard is recoverable: the race and its marks are kept with status `discarded`, and Restore brings them back for every coach. *Recently deleted.*
- ✅ 2.6.0. Append-only corrections: every change is a new version (value, who, when; the previous one is kept). *Results editor > History.*
- ✅ 2.6.0. An Undo toast (at least 6 s, 44 px) replaces confirms for recoverable actions. Confirms stay for Clear all times, Clear finished stopwatches, Stop all, Restore backup or snapshot, Leave team, Stop being admin, and Delete permanently.
- ✅ 2.6.0. Recently deleted, newest first, with Restore. Nothing expires. *Settings > Recently deleted, and Results > Recently deleted.*
- ✅ 2.6.0, Team tab added in 2.6.1. Admin "Delete permanently" with the runner's name typed. *Settings > Recently deleted, or on an admin device the runner's × on the Team tab (Remove or Delete permanently).*
- ✅ 2.6.0, last one added in 2.6.1. Automatic snapshots (last 10) before Clear all times, Clear finished, Stop all, "Give every waiting stopwatch this workout", team create/join/merge, Leave team, restoring a backup or snapshot, and Delete permanently. *Settings > Restore a snapshot.*
- ✅ Tests: the rules refuse hard deletes; a discarded race restores with all its marks; corrections keep their full history. Every soft delete is restored in a browser test: runner, PR, workout (with stopwatches), stopwatch, Start over, cards cleared by Clear finished, course, checkpoint with times, race on this phone, history entry, race, times, and "Show older". Copy and CSV after corrections are checked (gaps closed in 2.6.1).

**Item 2: Edit times in Results**
- ✅ 2.6.0. Tapping a time opens a sheet with every recorded time, coach name and tap time. *Live race, finished race, Team history, and Races on this phone.*
- ✅ 2.6.0. Choose which time counts (clears ⚠). Correct a time with the m:ss.t keypad. Add a missing time. Move a time to another runner or checkpoint. History with Restore.
- ✅ 2.6.0. Preview of time, split, pace and change before saving.
- ✅ 2.6.0. Corrections sync to every coach and flow into Copy, CSV and Team history. They are append-only.

**Changes you added when approving 2.6**
- ✅ 2.6.0. Deleting a workout never touches running or paused stopwatches. Idle ones switch to stopwatch-only, and restoring the workout reconnects them. Finished stopwatches keep their results; that fixed a bug that wiped them.
- ✅ 2.6.0. Storage: trash, snapshots and the race archive moved to IndexedDB. In a team, the phone keeps 90 days or 300 items, and Firestore keeps everything ("Show older"). A Settings warning shows at 50%, and the gear dot at 75%. A live race never fails to save (rescue copy plus red banner).
- ✅ 2.6.0. Refused writes never loop: membership is checked, only that change is set aside and reported, and it's retried once per app open. The test passes (`e2e10.js`).
- ✅ 2.6.0. Coach phones with app version and last seen: "All phones on 2.6.0 — safe to publish rules" or "N phones need to update". *Settings > Team.*
- ✅ Decisions:
  - (1) Hold to remove a time is instant, with Undo.
  - (2) Purge scope.
  - (6) Undone taps go to Recently deleted, grouped per race.
  - (7) 90 days or 300 items kept on the phone.
  - (8) The last 5 saved races stay in live data; all of them are in IndexedDB.
- ✅ CLAUDE.md: the data-safety rules are permanent (rule 7), plus never push on a meet day (rule 8) and rules publishing order (rule 9). Rules on your clipboard with the publishing-order reminder.
- 🟡 **Your step:** publishing the 2.6 rules (the 2.6.1 file is the same rules plus a version line). I can't see the Firebase console, so I can't confirm whether the 2.4, 2.5 or 2.6 rules were published. Until 2.6 rules are published, removals, corrections and discards in a team are refused and retried each time the app opens.

## 2.6.1: Patch (tests in the repo, rules version line, partial items fixed)

- ✅ 2.6.1. Every test suite moved into `tests/` in the repo, with one command, `tests/run.sh`, documented in CLAUDE.md and `tests/README.md`.
  - **Suites:** rules, team-tab.js, e2e1–e2e10. The 2.0–2.2 era suites e2e1–e2e3 were brought back and updated for 2.6.
  - **Also there:** `tests/setup.sh` for one-time setup, `tests/meetday.sh` as the meet-day check, screenshot tools in `tests/tools/`, and superseded scripts in `tests/retired/` (not run).
  - From now on, tests live only in the repo.
- ✅ 2.6.1. First line of `firestore.rules`: `// Mustang Splits rules 2.6.1`. It's kept updated by CLAUDE.md rule 9. The rules themselves did not change in this patch.
- ✅ 2.6.1. Partial items 1–5 fixed: the PR fallback in grid order, both badges together, Delete permanently from the Team tab, a snapshot before "Give every waiting stopwatch this workout", and the missing browser tests.
- ✅ 2.6.1. Two bugs found while fixing these:
  - In a team, the phone never trimmed its trash to 90 days / 300 items. It only checked at load, before team sync was ready.
  - After removing the last race on this phone, its list was hidden but not cleared.
- ✅ REQUESTS.md updated (this file).

## 2.7.0: Goals and meets (Push D)

**Item 3: Goals filled in automatically**
- ✅ 2.7.0. Compare to defaults to Season best at this distance. A season runs Aug 1 to Jul 31. It uses saved results with corrections applied and skips soft-deleted ones. *Race setup > Compare to.*
- ✅ 2.7.0. Fallback per runner: the chosen source, then season best, then PR, then blank.
- ✅ 2.7.0. Source tag on each goal: SB, PR, Course, Meet, Custom, plus Last for "Last race at this distance". *Race setup > Order and goals, results cards and table.*
- ✅ 2.7.0. Dropdown, in your order: Season best (default), PR, Last race at this distance, Last time on this course, Last year at this meet, Custom, None. Any goal can be typed over, and a typed goal is tagged Custom.

**Item 4: Meets and year-to-year tracking**
- ✅ 2.7.0. Course → Meet (series + date) → Race (division: Girls Varsity, Boys Varsity, Girls JV, Boys JV, Open). Synced, soft delete.
- ✅ 2.7.0. Race setup picks today's meet, or the next one this season. Choosing the division then:
  - loads the course and its checkpoints,
  - names the race,
  - preselects who ran that division at the last meet (or, for a first race, the runners marked Girls/Boys),
  - fills goals.

  *Race setup > Meet, Division.*
- ✅ 2.7.0. Meets screen: view and edit the schedule, soft delete with Undo, and "Start a new season" (snapshot first; dates left blank). *Settings > Meets, or the Meets button in race setup.*
- ✅ 2.7.0. One-time "Link past races", suggested by date. Each link is an append-only edit, and Undo unlinks. *Meets > Link past races.*
- ✅ 2.7.0. Year-to-year comparisons match by series id, division and course id, never by typed names. Renaming a series keeps the links.
- ✅ 2.7.0. 2026 season seed: 11 meets and 10 courses (Winagamie GC shared), with the approved series names. Fixed ids, so two coaches loading it at once still get one schedule. *Meets > Load the 2026 schedule.*
- ✅ 2.7.0. Girls/Boys field on each runner, synced and optional (your answer 5). *Team tab: the G/B button, Paste a list (third column), Add runner.*
- ✅ 2.7.0. Rules for series, meets, Girls/Boys, race meet/division and meet links, with emulator tests (253 cases). CLAUDE.md "Meets and goals (2.7)". Browser suite `tests/e2e11.js`. Rules on your clipboard with the version line `// Mustang Splits rules 2.7.0`.

## 2.6.2 (race-day UX) — ⏳ Planned, waiting for your OK

Requested on Fri 10/2. The plan recommends shipping it as **2.7.1**, not 2.6.2, since 2.7.0 is already live (decision 1 in `plan-2.7.1.md`).

- ⏳ **Item 4:** the three big cards show only when there are no stopwatches; otherwise only "+ New". Never both.
- ⏳ **Item 5:** the bottom tab bar stays visible during race setup and on results. It's hidden only on the live recording screen after the gun. That screen gets an "Exit race view" button that leaves the race running, and every tab shows a "Race running, tap to return" banner while a race is live.
- ⏳ **Item 6:** setup gets a "Ready for the gun" bar fixed at the bottom (never scrolled away). It opens a Ready screen: race name, runner count, and one huge Gun button filling most of the screen. Single tap, Undo gun, and Restart clock until the first tap all stay.
- ⏳ **Item 3: faster editing.**
  - After saving, return to the same race and scroll position, and briefly highlight the edited cell. Back never resets to the top.
  - "Save & next runner" and "Save & next checkpoint" in the edit sheet.
  - An "Edit times" mode: results become typeable fields, changed cells are highlighted, and one "Save all" applies them with one Undo.
  - Every change stays an append-only version with the coach's name.
  - Warn on impossible times: a checkpoint faster than the one before it, or an implausible pace.

## 2.8.0 (results views, trends, context tags) — ⏳ Design recorded, not planned yet

To come after 2.7.0. Recorded here as the design; the detailed plan comes later.

- ⏳ **Results gets three views:** Meets, Runners, Team.
- ⏳ **Runner cards:**
  - PR and season best per distance
  - every race this season: meet, time, pace per mile, team place, vs season best, badges
  - a season chart
  - pacing pattern (how they split races)
  - last year at this meet
  - tapping a race opens it with the runner highlighted
- ⏳ **Trends with course-adjusted times:**
  - Course difficulty is learned from runners who ran both courses. Raw times show too, and it says when there isn't enough overlap yet.
  - Individual trend label (Improving, Steady, Slowing) over the last 3–4 races.
  - Girls and Boys team views: top-5 average and the 1–5 spread, meet to meet.
- ⏳ **Context tags:**
  - On a runner's race result: Injury, Illness, Fell, Shoe issue, Heavy training week, Course long/short, plus an optional short note.
  - On a whole race: Heat, Mud, Wind.
  - Tagged results show an icon, and a switch excludes them from trends.
  - Tags stay general: no medical detail fields.

## Standing rules (from your requests)
- ✅ Never push on a meet day (`tests/meetday.sh`, CLAUDE.md rule 8).
- ✅ Every suite in `tests/` passes before any push (`tests/run.sh`, CLAUDE.md "Testing").

## Missed or partial (summary)

As of 2.6.1, nothing is ❌ Missed. Remaining 🟡:
1. **2.4.0 and 2.5.0 were pushed on a meet day** (Thu 10/1 evening), before the rule existed. Since then `tests/meetday.sh` is checked before every push.
2. **Publishing the rules is your step: this time, publish first.** The 2.7.0 rules only add optional fields and new collections, so 2.6 phones keep working under them (checked by the rules tests, which include every 2.6 case). A 2.7 phone under the 2.6 rules, though, has its race setups, meets and Girls/Boys changes refused, and other coaches don't see its race. Publish right away, then update the phones, before the 10/8 meet. The console's Rules tab then shows `// Mustang Splits rules 2.7.0`.
