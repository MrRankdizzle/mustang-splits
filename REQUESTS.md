# Requests and status

Every request from 2.4.0 on, checked against the code, `git log`, `version.json` and CLAUDE.md (not memory).
**Updated with every push.** Last audit: Fri 2026-10-02, after 2.6.0.

**Live on Vercel:** 2.6.0 (`version.json`, `APP_VERSION`, and https://mustang-splits.vercel.app/version.json all say 2.6.0).

| Version | Pushed | Commit |
|---|---|---|
| 2.4.0 | Thu 10/1, 10:12 PM | `8b9ef78` |
| 2.5.0 | Thu 10/1, 11:26 PM | `60e5621` |
| 2.6.0 | Fri 10/2, 8:20 AM | `e8d9bc1` |

**Status key:**
- ✅ Live (version, and where it is in the app)
- 🟡 Live with a gap (the gap is described)
- 🔧 Built but not pushed
- ⏳ Planned (waiting for your go-ahead)
- ❌ Missed

Nothing is 🔧 Built but not pushed: the working tree matches 2.6.0, except the uncommitted `plan-2.6-2.7.md`.

---

## 2.4.0: Race Mode recording (Push A)

**Item 3: Stable name grid**
- ✅ 2.4.0. Name buttons never move during a race. *Race screen after Gun.*
- 🟡 2.4.0. Grid order is by expected finish, fastest first, then first name, and fixed at the gun. **Gap:** the order uses the typed (or filled-in) goal only. A runner with a PR but no goal sorts with the no-goal runners, unless Compare to is set to PR. *Race setup > Order and goals.*
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
- 🟡 Browser test: fast taps while remote marks arrive, never the wrong runner (`e2e8.js`). **Gap:** the test suites are kept outside the repo (see Missed or partial, item 6).

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
- 🟡 2.5.0. "Season best!" alongside "New PR!". **Gap:** a runner gets one badge. "New PR!" replaces "Season best!" when both apply, so both never show together.

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
- 🟡 2.6.0. Admin "Delete permanently" with the runner's name typed. **Gap:** the approved plan said it would start from Recently deleted *or the Team tab*. It only starts from Recently deleted: remove the runner with × first.
- 🟡 2.6.0. Automatic snapshots (last 10) before Clear all times, Clear finished, Stop all, team create/join/merge, Leave team, restoring a backup or snapshot, and Delete permanently. *Settings > Restore a snapshot.* **Gap:** "Give every waiting stopwatch this workout" (Settings) is a bulk action with no snapshot. Its stopwatch times do go to Recently deleted.
- 🟡 Tests: the rules refuse hard deletes; a discarded race restores with all its marks; corrections keep their full history; restores were tested for runner, PR, workout (with stopwatches), stopwatch, Start over, history entry, race and times. **Gap:** no browser test yet for restoring a course, a checkpoint with times, a race on this phone, the cards cleared by Clear finished stopwatches, or "Show older". CSV after a correction isn't checked either (Copy is).

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
- 🟡 **Your step:** publishing the 2.6 rules. I can't see the Firebase console, so I can't confirm whether the 2.4, 2.5 or 2.6 rules were published. Until 2.6 rules are published, removals, corrections and discards in a team are refused and retried each time the app opens.

## 2.7.0: Goals and meets (Push D) — ⏳ Planned, waiting for your go-ahead

**Item 3: Goals filled in automatically**
- ⏳ Default Compare to = Season best (Aug 1 to Jul 31), with a fallback of season best, then PR, then blank.
- ⏳ Source tag on each goal: SB, PR, Course, Meet, Custom.
- ⏳ Dropdown order (your answer 4): Season best (default), PR, Last race at this distance, Last time on this course, Last year at this meet, Custom, None.

**Item 4: Meets**
- ⏳ Model: Course → Meet (series, date) → Race (division).
- ⏳ Race setup: meet (today's or the next one) and division. Load the course's checkpoints, preselect runners, fill goals.
- ⏳ Meets screen in Settings and race setup (decision 9). Soft delete. "Start a new season".
- ⏳ One-time "Link past races".
- ⏳ Year-to-year comparisons by series id and course id.
- ⏳ 2026 seed: 11 meets, 10 courses, Winagamie GC shared. Suggested series names accepted (answer 3).
- ⏳ Girls/Boys field on each runner, synced and optional, for preselecting a division by gender (answer 5). Moved from 2.6 to here.
- ⏳ Rules, emulator tests and CLAUDE.md for series, meets and race fields.

---

## Missed or partial (summary)

None are ❌ Missed outright. Partial:
1. **Grid order ignores PRs** unless Compare to is PR (2.4 item 3). Planned fix in 2.7: goals fill from season best, then PR, by default.
2. **"Season best!" and "New PR!" never show together** (2.5).
3. **Delete permanently only starts from Recently deleted**, not the Team tab (2.6 plan).
4. **No snapshot before "Give every waiting stopwatch this workout"** (2.6 item 1). The times are still in Recently deleted.
5. **Missing browser tests:** restoring a course, a checkpoint with times, a race on this phone, stopwatches cleared by Clear finished, "Show older", and CSV after a correction.
6. **The test suites aren't in the repo.** They live in a temporary folder on this Mac and could be lost. CLAUDE.md says how to rebuild them.
7. **2.4.0 and 2.5.0 were pushed on a meet day** (Thu 10/1 evening), before the rule existed.
8. **Publishing the rules is your step.** I can't verify whether it has happened.
