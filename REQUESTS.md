# Requests and status

Every request from 2.4.0 on, checked against the code, `git log`, `version.json` and CLAUDE.md (not memory).
**Updated with every push.** Last update: Mon 2026-10-05, with 2.10.0.

**Live on Vercel:** 2.10.0 (`version.json` and `APP_VERSION` say 2.10.0). **Rules file:** 2.9.2 (unchanged in 2.10.0) (first line of `firestore.rules`). Published: 2.9.0 (Mon 10/5). The 2.9.1 file was on your clipboard Mon 10/5; 2.9.2 adds merges (see 2.9.2).

| Version | Pushed | Commit |
|---|---|---|
| 2.4.0 | Thu 10/1, 10:12 PM | `8b9ef78` |
| 2.5.0 | Thu 10/1, 11:26 PM | `60e5621` |
| 2.6.0 | Fri 10/2, 8:20 AM | `e8d9bc1` |
| 2.6.1 | Fri 10/2, 9:20 AM | `ddc4744` |
| 2.7.0 | Fri 10/2, 12:07 PM | `a354d19` |
| 2.7.1 | Fri 10/2, 1:36 PM | `941cba1` |
| 2.8.0 | Fri 10/2, 3:44 PM | `f039518` |
| 2.8.1 | Sun 10/4, 8:42 PM | `72a8d61` |
| 2.9.0 | Sun 10/4, 9:46 PM | `66aa530` |
| 2.9.1 | Mon 10/5, 9:11 AM | `41b27b8` |
| 2.9.2 | Mon 10/5, 9:37 AM | `6232df0` |
| 2.10.0 | Mon 10/5, 1:32 PM | `86966ea` |

**Status key:**
- ✅ Live (version, and where it is in the app)
- 🟡 Live with a gap (the gap is described)
- 🔧 Built but not pushed
- ⏳ Planned (waiting for your go-ahead)
- ❌ Missed

Nothing is 🔧 Built but not pushed: the working tree matches 2.9.1, except the uncommitted plan files (`plan-2.6-2.7.md`, `plan-2.7.1.md`, `plan-2.8.0.md`).

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

## 2.7.1: Race-day UX (requested as 2.6.2)

Your answers when approving: (1) ship as 2.7.1; (2) the Race running bar above the tab bar, with bottom padding on every tab; (3) pace warnings outside 4:00–15:00 per mile, warnings only; (4) Edit times one checkpoint at a time on an upright phone, the full grid sideways or on wider screens; (5) Undo gun returns to the Ready screen.

- ✅ 2.7.1. **Item 4:** with no stopwatches, only the three cards (plus a help link); otherwise only "+ New". Never both. *Stopwatches tab.*
- ✅ 2.7.1. **Item 5:** the tab bar shows in race setup and on results; it hides only on the live recording screen (and the Ready screen).
  - The live screen has **Exit race view**, which leaves the race running.
  - On every other tab, a **"Race running · name · clock · tap to return"** bar sits fixed above the tab bar, and every tab has bottom padding so it covers nothing.
- ✅ 2.7.1. **Item 6:** a "Ready for the gun · n runners" bar fixed at the bottom of setup. It opens the Ready screen: race name, meet and division, runner count, and one huge Gun. Single tap, Undo gun (back to Ready), and Restart clock until the first tap all stay.
- ✅ 2.7.1. **Item 3: faster editing.**
  - **Your place:** after saving, back in the same race and scroll position, and the edited cell flashes. Saved races stay open through redraws.
  - **Save & next:** Save & next runner and Save & next checkpoint, each keeping its Undo.
  - **Edit times:** a button on every results view. On an upright phone, a checkpoint picker plus one field per runner, so the keyboard arrows go to the next runner. Sideways or on wider screens, the full grid. Changes are kept across checkpoints and rotation. Changed cells are highlighted, and Save all applies everything with one Undo.
  - Every change is an append-only version with the coach's name.
  - **Warnings** for out-of-order times and paces outside 4:00–15:00 per mile, with Fix or Save anyway. A time saved anyway shows the warning in its history.
- ✅ Tests: new `tests/e2e12.js`, and all suites updated for the Ready screen and Exit race view. No rules change (the rules file stays `2.7.0`).

## 2.8.0: Results views, runner cards, trends, context tags

Your answers when approving: (1) practice results stay in Meets, after the races; (2) Team views show Varsity by default with a JV switch; (3) adjusted times are "Winagamie GC equivalent"; (4) the season chart plots pace per mile; (5) the exclude switch leaves out every tag; (6) push as soon as every suite passes and it isn't a meet day.

- ✅ 2.8.0. **Results has three views: Meets, Runners, Team.** It remembers the last one on this phone. *Results tab, switch at the top.*
  - **Meets:** Team history grouped by season, then meet, then Girls/Boys Varsity/JV. Then "Not linked to a meet" with a Link past races shortcut, then Practice history, Races on this phone, and today's stopwatches. Every saved race shows, not only the latest 30.
- ✅ 2.8.0. **Runner cards** (*Results > Runners*, a searchable list by Girls / Boys and group, with the latest race, season best and trend):
  - PR and season best per distance, with the meet and date
  - every race this season, newest first: time, pace per mile, team place, vs season best at the time, badges, tag icon
  - season chart of pace per mile, Raw or Course-adjusted, with season-best and PR lines; tagged races hollow
  - pacing pattern (2+ races with splits)
  - last year at these meets (same meet and division)
  - tapping a race opens it in Meets, scrolled to the runner's card, which flashes
- ✅ 2.8.0. **Trends with course-adjusted times:**
  - Course factors come from runners who raced both courses within 21 days, and need at least 4 such runners. They're chained through other courses when needed.
  - Courses without one say "Not enough runners have raced both X and Winagamie GC yet." Raw times always show.
  - Trend label over the last 3–4 untagged races at one distance: Improving / Steady / Slowing at ±1.5%.
- 🟡 2.8.0. **Team view** (*Results > Team*): Girls and Boys top-5 average and #1–#5 spread at each meet this season. Varsity by default, JV on a switch. Shown as a table plus a chart with a spread band.
  - **Raw or Course-adjusted, one at a time:** a Raw | Course-adjusted switch, Raw by default (`renderTeamView()`, `teamRows()`). In Course-adjusted, both the average and the spread are Winagamie GC equivalents, and meets on a course without a factor drop out.
  - **Gap:** the plan said raw times always show next to adjusted ones. In Course-adjusted the table shows only the adjusted numbers, so you have to flip the switch to compare.
- 🟡 2.8.0. **Context tags:**
  - On each runner's card in a saved race, a Tag button: Injury, Illness, Fell, Shoe issue, Heavy training week, Course long/short, plus a 60-character note ("No medical details").
  - On each saved race, a Race tags button: Heat, Mud, Wind. Not available while a race is live; once it's saved, they work from the race screen too.
  - Saved as append-only edits shared with every coach, with Undo and a history in the tag sheet. Delete permanently removes them.
  - A ⚑ icon shows in results, runner cards and charts.
  - "Leave tagged results out of trends" (on by default, *Runners and Team views*) applies to trends, course factors and the team view. Results, PRs and season bests never change.
  - **Gaps vs the plan:**
    - You can't tag while a race is live, only once it's saved (the plan said "live or saved").
    - Tag changes are listed in the tag sheet's own History, not in the time editor's History.
- ✅ Fixed along the way: Delete permanently now also removes the runner from the stored copy of this phone's 5 newest races (it was only removed in memory before).
- ✅ Tests: new `tests/e2e13.js`; every suite passes. No rules change (the rules file stays `2.7.0`).

**Checked against the code, Fri 10/2 (after the 2.8.0 push):**
- **Each race on a runner's card** (`renderRunnerCard()`) shows meet and date, time, pace per mile, team place ("1st on the team"), and vs season best at the time. It also shows "New PR!" / "Season best!" badges and the tag icon and line.
  - The badges come from the PR and season best stamped at the gun, so races saved before 2.5 don't show them.
  - **Not tested yet:** e2e13's seeded races carry no stamped PR or season best, so no test checks the badges on the card.
- **PR and season best are per distance:** one row per distance raced or in the PR list, and PR = the better of the PR list and race results.
- **Team view:** the top-5 average and the 1–5 gap use raw times by default. Course-adjusted is on the switch, with the gaps above.

**Smaller differences from the plan (not done):**
- In Course-adjusted mode the runner's season chart has no PR line, and the race list under it shows raw times only.
- Meets view order: Team history (meets, then unlinked races, then practices) comes before Races on this phone. The plan put practices after Races on this phone.

## 2.8.1: closing the 2.8.0 gaps (Phase 1 of the Sun 10/4 request)
- ✅ 2.8.1. **Team view:** in Course-adjusted mode the raw top-5 average and spread show under each adjusted number (closes 2.8.0 gap 3). *Results > Team, Course-adjusted.*
- ✅ 2.8.1. **Runner card, Course-adjusted:** a PR line (the fastest adjusted race) on the chart, and the race list shows adjusted paces too. *Results > Runners > a runner.*
- ✅ 2.8.1. **Meets view order:** Practice history now comes after Races on this phone, as the 2.8 plan said.
- ✅ 2.8.1. **Tags during a live race** (closes 2.8.0 gap 4, first half). Tag and Race tags work on the live results. The tags stay on that phone and are saved with the results at End race (or added to the saved race when another coach ends it). No rules change.
- ✅ 2.8.1. **Tag history in the time editor** (closes 2.8.0 gap 4, second half). Tap a time and open History: that runner's tag changes are listed.
- ✅ 2.8.1. **Test:** e2e13 checks the "New PR!" / "Season best!" badges on a runner card (closes 2.8.0 gap 5).
- ✅ 2.8.1. **Pushing on a meet day is allowed** (CLAUDE.md rule 8). Never with a failing suite.
- ✅ 2.8.1. `.gitignore`: `*.history.json` and `data/`.
- ✅ Every suite passed before the push. e2e3 and e2e4 were fixed for the new practice-history position and run again.

## 2.9.0: auto-update, career history import, career and team views (Phases 2–5)

**Phase 2: auto-update (the last manual update)**
- ✅ 2.9.0. The app checks for a new version on open, on return to the app, every 10 minutes and when the clocks stop.
  - With no stopwatch running and no live race on this phone, it installs by itself (new files downloaded first, then a reload) and says **"Updated to x.y.z"**.
  - While a clock runs or a race is live, it never reloads: the banner says "It installs by itself when the clocks stop."
  - It also waits while the phone is in use (a sheet open, typing, or a tap in the last 30 seconds), except right when the app opens or comes back.
  - It never loops: at most 2 tries per version per 30 minutes.
- ✅ 2.9.0. **Minimum app version** (admin, stored on the team).
  - *Settings > Team > Minimum app version: Require 2.9.0 / Turn off.* The admin can only require their own phone's version, so the version always exists.
  - A phone below it shows a full-screen **"Updating…"** and updates as soon as no clock is running. With a clock running it shows a banner instead.
  - If the new version can't arrive (no signal), it says so, with Try again and "Use this version for now".
  - Works from 2.9.0 on: phones on 2.8.1 or older can't see it.
- ✅ 2.9.0. Settings > Team keeps listing each coach phone with its version and last-seen time, and says **"All phones current — safe to publish rules"** when none is older.
- ✅ Rules: an admin-only `minVersion` field on the team document. Older phones never write it, so it's backward compatible.

**Phase 3: career history import**
- ✅ 2.9.0. **Admin-only "Import history file"** (*Settings > Import history file*, or *Results > Import history*; on a phone without a team, anyone).
  - Preview before saving: runners, new results per runner, duplicates skipped, already imported, new meet series and past meets, and the meet-name mapping.
  - Then Save, with Undo.
- ✅ 2.9.0. **Runner matching.**
  - Matched by name and aliases: full name, first name + last initial, or a nickname (Benjamin = Ben, Isabella = Izzy, and about 90 more pairs).
  - Uncertain matches (a nickname, or two possible runners) need your pick.
  - Missing runners are offered as new runners. Graduated ones are not added unless you choose to.
  - New names are first name + last initial (a second letter only if two would clash), never full last names.
  - Confirmed matches are remembered (as a scrambled code of the name, never the name), so the next import matches them automatically.
- ✅ 2.9.0. **Meets and official names.**
  - Past seasons' meets, series and courses are created as needed.
  - This season's series now have the official names (see the mapping below). They keep their ids, so every link stays.
  - Name variants go to one series. Middle school meets keep their own series. You can change any series in the preview.
- ✅ 2.9.0. **Duplicates:** for entries with `possible_duplicate_of` (same day, distance, within 2 s), the one with a division label is imported and the other skipped.
- ✅ 2.9.0. **Official results, separate from hand-timed.**
  - Stored as their own records, with an "Official" badge.
  - When the team also timed the race, both times show: an Official / Hand-timed column in Meets, and "(hand-timed …)" on runner cards.
  - PRs and season bests are worked out from the times; the file's flags are ignored.
  - MS results stay at MS level. High school 5K is the default view.
- ✅ 2.9.0. **Data safety.**
  - A snapshot is taken before an import.
  - The whole import is undoable as one action: Undo or Remove takes it all away (results plus the runners, meets, series and courses it created), and Recently deleted brings it back.
  - Re-importing the same file adds nothing.
  - Delete permanently also removes that runner's official results.

**Phase 4: career displays**
- ✅ 2.9.0. **Runner card career section** (*Results > Runners > a runner*):
  - 5K PR progression as a step line, plus the list of new PRs
  - every season with grade, races, 5K best and the change from the year before
  - the same meet year over year (by series)
  - each season's early / mid / late arc (best pace per mile: to Sep 10, Sep 11–Oct 5, Oct 6 on)
  - official vs hand-timed where both exist
  - middle school in its own section
- ✅ 2.9.0. **Team view** (*Results > Team*):
  - a season picker; Girls and Boys top-5 average and 1–5 spread per meet (5K), using official times when they exist for that day and division
  - a season-by-season table
  - course-adjusted comparisons learned from all the data, counting each runner once per day
- ✅ Readable on an upright phone. The PR list was rebuilt as two columns after checking the screenshots, and the page never scrolls sideways (tested).

**Phase 5: tests and screenshots**
- ✅ New suites, all passing:
  - `tests/e2e14.js`: auto-update, minimum version, never during a running clock or live race
  - `tests/e2e15.js`: importer with the fake-name fixture, re-import, undo/restore, team sync, purge, 600-result performance
  - `tests/e2e16.js`: a real 2.8.1 phone and a 2.9.0 phone together under the 2.9.0 rules (roster, two-coach race, live tag, correction, import, minimum version), plus offline use
  - The rules tests went from 253 to 277 cases.
  - Two-coach races are also covered by e2e6 and e2e8.
- ✅ Screenshots of every main screen, light and dark, phone size: `tests/screenshots/` (46 images, fake names only, so they're committed; Vercel doesn't deploy `tests/`). Made with `tests/tools/shots29.js`.

### Meet-name mapping (2.9.0)
This season's series, renamed by id (only if a coach hadn't renamed them by hand):

| Date | Was (2.7 seed) | Now (official) | Name variants that import into it |
|---|---|---|---|
| 8/28 Winagamie | Winagamie Invite | Appleton West Terror Invite | Terror Invite, Appleton West Invite, Appleton West Terror Inv(…) |
| 9/3 | Kiel Invite | Kiel Raiders Invite | Kiel Invite, Kiel Invitational, Kiel Raider(s) Invite |
| 9/11 Winagamie | Winagamie Meet | Nightfall Classic | Nightfall, Nightfall Invite |
| 9/19 | Wausau East Invite | Smiley Invitational | Smiley Invite, Bill Smiley Invite, Smiley |
| 9/24 Mishicot | Mishicot Invite | Jim Bremser Memorial | Bremser Memorial, Jim Bremser Memorial Invite |
| 10/1 | Waupaca Invite | Waupaca Invitational | Waupaca Invite, Waupaca |
| 10/8 | Brillion Invite | Brillion Invite (unchanged) | Brillion |
| 10/10 | Albany Invite | Albany Baertschi Invite | Baertschi Invitational, Baertschi Invite, Albany Invite |
| 10/16 | NEC Conference | NEC Championship | NEC, NEC Conference (Championship), North Eastern Conference |
| 10/23 | WIAA Sectional | WIAA Sectional | any name containing "Sectional" |
| 10/31 | WIAA State | WIAA State | any name containing "State" |
| (past seasons) | — | Red Raider Invite (new series) | Red Raider(s) Invite, 44th Annual Red Raider Invitational |

How names are compared:
- Years, "44th", "Annual" and "High School" are ignored, and "Invitational" counts as "Invite".
- A cut-off name matches by its start.
- Any other name becomes its own series. Names with all the same words go together ("Bill Smiley Invite" with "Smiley Invite").
- I didn't have your real file, so this was checked with the fake fixture. The preview shows the actual mapping for your file before anything is saved.

### Decisions made (Sun 10/4)
1. **2.8.1 didn't exist anywhere** (not in the repo or the last session, which ended asking which 2.8.0 gaps to fix). I defined 2.8.1 as those gaps and shipped it first.
2. **Phases 2–4 shipped together as 2.9.0.** They were built in one pass through the same files, and splitting them would have meant an untested in-between version. Your coaches' manual update installs 2.9.0; every update after that is automatic.
3. **Auto-update also waits while the phone is in use** (30 s without a tap, no sheet open, no typing), so it never reloads under your thumb. Right at open and on return it updates right away.
4. **"Use this version for now"** on the full-screen Updating… screen, only when the update can't arrive (no signal). Blocking a coach at a course without signal would be worse than letting them keep timing.
5. **The admin can only require their own phone's version** as the minimum, so a phone is never asked for a version that doesn't exist.
6. **Official results live in their own collection** (`teams/{t}/official`, admin-only writes), separate from Team history. Older phones ignore them, and goals and PRs still use them.
7. **Remembered matches are stored as a scrambled code of the full name** (SHA-256 with a fixed salt), never the name.
8. **Graduated runners** (projected grade above 12) are imported unlinked by default rather than added to the roster. Their results still count in the Team view, and you can add them in the preview.
9. **Middle school meets never merge into a high school series by similarity.** "Kiel Middle School Invite" is its own series. MS results get no meet in the schedule.
10. **Past meets get the course this season's meet in that series uses** (for example, past Kiel Raiders Invites use Kiel HS). Sectional and State locations change by year, so edit those in Meets if needed.
11. **"Same-day overlap only"** I read as: when a runner has an official and a hand-timed time on the same day, it counts once (the official one), in course factors, the Team view and runner cards. The 21-day / 4-runner rules for course factors stay.
12. **PR = the PR list or the fastest official result**, whichever is faster (`careerBest()`), for Compare to PR and the "New PR!" stamp at the gun. Hand-timed races still don't override a typed PR there (as approved in 2.5/2.7; the tests check it). Runner cards show the fastest of all three, as in 2.8.
13. **This season's series renamed by a data migration keyed by id**, only if the name is still the 2.7 seed name. Every phone does it the same way, so they agree.
14. **Screenshots are committed** (fake names only; `tests/` isn't deployed).

### Known issues (logged, not fixed)
- **Import and Minimum app version need the 2.9.0 rules published.** Before that, the team refuses them: the import is saved on the admin phone and shows in Results there, and Settings > Team reports a refused change. It's tried again once each time the app opens and goes through after you publish.
- Results whose division has no level (for example just "Girls") stay out of the Varsity/JV Team view. They still show in Meets and on runner cards.
- Official results aren't in Back up files. Re-import the history file after a restore (it adds only what's missing).
- Tags added during a live race stay on that phone until the race is saved.
- A runner's grade in seasons with only hand-timed races is worked out from the grades in the official results.
- Phones on 2.8.1 or older need this one manual update. They don't know about the minimum version, so they keep working until they update.

### Rules to publish (2.9.0)
The 2.9.0 rules only add things:
- an admin-only `minVersion` field on the team
- a new `official` collection, admin-only writes, soft delete only

Phones on 2.6–2.8.1 keep working under them. The e2e16 test runs the real 2.8.1 app against these rules, and the rules tests keep every older case. **Safe to publish any time**, before or after your coaches update. Publish before you import the history file or set a minimum version.

How:
1. Firebase console > Firestore Database > Rules.
2. Select everything and paste the whole `firestore.rules` file. Its first line is `// Mustang Splits rules 2.9.0`.
3. Publish.

## 2.9.1: fixes after the 2.9.0 rollout (Mon 10/5)
Your context: every coach is on 2.9.0, you published the 2.9.0 rules, required 2.9.0, and imported the history file.

1. ✅ 2.9.1. **Keep screen on.**
   - **Why it failed:** your installed app said "This device blocked it" for two reasons:
     - iOS versions before 18.4 refuse the Screen Wake Lock in home-screen apps (a WebKit bug).
     - Safari also refuses a request made without a tap, and the app asked at launch and on return to the app.
   - **Fix:**
     - The app asks again after every tap, on return, and every 3 seconds.
     - If iOS still says no, it plays a 1-pixel silent looping video, the standard iPhone method (NoSleep.js), which keeps the screen awake.
     - Settings shows "Screen will stay on (iPhone backup method)".
   - **New:** the screen stays on whenever a stopwatch runs or a race is live, on any tab, even with the setting off. *Settings > Keep screen on.*
2. ✅ 2.9.1. **Course adjustment learns only within one season.** It uses runners who raced both courses within 21 days of the same season; a pair across Aug 1 no longer counts. Official-over-hand-timed for the same runner on the same day stays.
3. ✅ 2.9.1. **Back up and Restore include official results.**
   - Back up saves every import record.
   - Restore (and Restore a snapshot) adds the records the phone doesn't have and never removes any; restoring the same file twice adds nothing.
   - The restore question counts them ("30 official results").
4. ✅ 2.9.1. **Past Sectional and State courses come from the printed name.**
   - "WIAA D2 Sectional - Kiel" → Kiel HS, "- New London" → a new New London course, "Sectional 4 - Waupaca" → Waupaca, "State @ Wisconsin Rapids" → Wisconsin Rapids. New courses are created as needed.
   - The meets your 2.9.0 import created are moved to the right course the first time your admin phone opens 2.9.1, and the change syncs to every coach. This season's schedule is never touched.
5. ✅ 2.9.1. **Varsity / JV for every result.**
   - **Inferred** from the division text where possible (Frosh/Soph, Open, Reserve, Sub-varsity = JV; Championship, Gold = Varsity), else from the schedule (Sectional, State and Nightfall are Varsity-only meets, Brillion JV-only).
   - **Your import:** it didn't keep the original division text, so re-import the same file once. It adds no results but fills in levels the new parsing finds ("n results already imported get a Varsity/JV level").
   - **Set any result by hand** (admin): *Results > Team* shows "n official results have no Varsity or JV level … Set Varsity / JV". In *Results > Meets*, every official list has "Varsity / JV…" to change any result: per runner, or All Varsity / All JV for a race. Undo works, and changes reach every coach.
   - Saved as append-only changes on the import record. Rules: admin only.
6. ✅ 2.9.1. **Coach names in Settings > Team.** Each phone shows its coach's name (from Settings > Your name in Race Mode, sent as soon as it's typed). A phone with no name set shows "Coach (no name set)". Each row keeps the version and last-seen time.
- ✅ Tests: new `tests/e2e17.js` covers all six. The rules tests went to 283 cases. Every suite passed before the push.

**Decisions made (2.9.1):**
- (1) The silent video is used only when the wake lock is refused.
- (2) "Never across seasons" applies to every pair the course factors learn from, official and hand-timed alike.
- (3) Backup Restore never deletes or un-deletes an import record (same as the trash and saved races).
- (4) Only meets the import created (ids `mh-…`) are moved, only Sectional and State, and only on an admin phone (or a phone without a team).
- (5) Non-varsity races (Frosh/Soph, Open, Reserve) count as JV.
- (5) Setting levels is admin-only, like the import.
- (5) A level set by hand beats the file and the schedule.
- (6) A coach's name also fills in from the race screen when the phone's record has none.

**Known issues (2.9.1):**
- The iPhone backup method plays a silent video. On some iPhones this may pause music playing from another app while a clock runs or a race is live. I couldn't check that on a real iPhone; if a coach notices it, tell me and I'll add a switch for it.
- Re-importing the file is needed once to fill in levels from division text for results imported by 2.9.0.

**Rules to publish (2.9.1):** one addition: an admin may append Varsity/JV changes to official results. Older phones never use it, so publish any time. Until then, levels you set stay on your phone and the team refuses them (Settings > Team says so). They go through after you publish. How: Firebase console > Firestore Database > Rules, paste the whole `firestore.rules` file (first line `// Mustang Splits rules 2.9.1`), Publish.

## 2.9.2: data fixes (Mon 10/5)
1. ✅ 2.9.2. **"Ben To." instead of "Ben T." (Ben Toeppler): cause and fix.**
   - **Cause:** the importer guessed each file runner's Girls/Boys from their division labels. A tie, or a stray "Girls Varsity" line, made the guess Girls (a tie went to Girls). The matcher then hid every roster runner marked the other way, so "Ben T." (Boys) was never offered. Ben counted as "not on the roster", and the new runner got a second letter because "Ben T." was taken.
   - **Fix:**
     - A Girls/Boys difference never hides a candidate (it's shown as "(marked Boys)").
     - Abbreviated names are matched ("Ben To." for Toeppler).
     - Anyone with the same first name (or a nickname) and the same last initial, or a known alias, is always offered and must be confirmed. Save stays disabled until every match is confirmed (one by one, or "Confirm all suggested matches").
     - A new runner is only created when you choose "Add as a new runner" or when nobody plausible exists (listed in the preview).
     - Automatic matches: only remembered ones, or one runner whose full last name matches.
2. ✅ 2.9.2. **Merge runners** (admin; *Team tab > Merge runners*). Choose the duplicate and the real runner; the sheet says what moves.
   - Every official and hand-timed result, race time, tag, PR and stopwatch link moves to the real runner, and the duplicate goes to Recently deleted.
   - One Undo (or Restore in Recently deleted) reverses the whole merge.
   - Every coach's phone follows. Future imports matched to the duplicate go to the real runner.
   - A snapshot is taken first. Tests: `tests/e2e18.js`.
3. ✅ 2.9.2. **No Girls default; divisions come from the Team tab.**
   - Official results take the linked runner's Girls/Boys setting. Runners without one are "Unassigned": the official list says so and has Girls / Boys buttons, and the Team view shows how many.
   - Changing a runner's setting or merging re-sorts their results at once (nothing to re-import).
   - A Varsity/JV label printed without Girls/Boys is now kept too.

**Decisions made (2.9.2):**
- (1) A nickname match counts as "plausible" at most, so it's always asked.
- (1) Same first name + same last initial is asked even when the roster has a different full last name.
- (2) Merging doesn't rewrite any saved result or import record. Every view reads the duplicate as the real runner (append-only, like corrections). What lives only on a phone (stopwatches, the live race, PRs) is moved for real.
- (2) If both runners ran the same race, the faster time counts.
- (2) The real runner keeps its own Girls/Boys; it takes the duplicate's only if it had none.
- (3) Results not linked to a runner (graduates you didn't add) keep the Girls/Boys printed in the file.

**For your data:**
1. Merge "Ben To." into "Ben T." (*Team tab > Merge runners*).
2. Mark Girls/Boys for any runner the Team view says is Unassigned.

**Rules to publish (2.9.2):** adds `merges` (admin only, soft delete). Older phones never use it. Until it's published, a merge works on your phone but other coaches don't get it, and Settings > Team reports the refusal.

## 2.10.0: Team tab, Data tab and clear selected states (Mon 10/5)
- ✅ 2.10.0. **Team tab in Girls and Boys sections.**
  - Each section has "+ Add to Girls" / "+ Add to Boys", which sets the runner's Girls/Boys; there's no separate G/B button any more.
  - Runners without a setting sit in "No Girls/Boys yet", with Girls / Boys buttons.
  - Groups stay as optional labels inside a section (pace groups, JV).
  - Paste a list takes "Name, Girls" or "Name, Group, Girls".
- ✅ 2.10.0. **Groups named like Girls/Boys are converted once**, on the first phone that opens 2.10. "Girls" becomes Girls with no group, "Boys JV" becomes Boys with group "JV", "Varsity Boys" becomes Boys with group "Varsity".
  - A runner already marked the other way is kept and listed.
  - A sheet shows every change, with Undo.
  - Your actual conversions show on your phone. I can't see your roster, so I can't list them here.
- ✅ 2.10.0. **"+ Result" replaces the PR button** (*Team tab, each runner*).
  - Add a race result: date (or "Date unknown"), meet, distance (5K, 2 mi, 4K, 3200m or any), time (m:ss.t), Official or Hand-timed. The sheet also sets Girls/Boys.
  - **PRs and season bests are always worked out from results**: typed, hand-timed races and official.
  - **Every typed PR was kept** as a result dated "unknown" ("typed as a PR before 2.10"). Nothing was rewritten or lost.
  - Each Team row shows the runner's computed 5K PR. The "Update PRs?" offer after a race is gone, since a race result counts by itself.
- ✅ 2.10.0. **Results is now "Data".**
- ✅ 2.10.0. **Data > Meets:** each meet has a Charts section:
  - a strip chart of every runner's time (Girls and Boys in different colors, ring = JV)
  - this year vs last year at the same meet (each runner's two times linked)
  - pace through the checkpoints for races with splits
- ✅ 2.10.0. **Data > Runners:**
  - season chart with official (●) and hand-timed (■) results
  - career 5K PR step line
  - grade-by-grade bars
  - each 5K vs the season best so far
  - "Compare runners" (2–3 runners on one chart)
- ✅ 2.10.0. **Data > Team:**
  - team ladder: every runner's 5K season best on one scale, Girls and Boys
  - pack chart: the top seven at each meet, with the 1–5 and 1–7 gaps
  - top-5 average across the season
  - improvement leaderboard: vs last season's best, or vs the first 5K this season for new runners
- ✅ 2.10.0. **Every dot or line opens that runner** (also by keyboard).
  - The charts are drawn by the app itself, with no chart library, so they work offline.
  - Light and dark, and an upright phone with no sideways scroll (tested).
- ✅ 2.10.0. **Selected and pressed states app-wide.**
  - **One selected style:** a filled background, a ring, a bold label, and a ✓ on choices. Never color alone. It covers tabs, Meets/Runners/Team, Varsity/JV, Raw/Adjusted, Girls/Boys, distances, Race Mode checkpoints, chips and switches.
  - **Pressed:** instant darken while held, with a small press on everything except race name buttons.
  - **Disabled:** faded with a dashed edge.
  - **ARIA:** `aria-selected` (tabs) and `aria-pressed` (toggles), checked by the tests.
  - **Automated contrast checks** in light and dark (`tests/e2e19.js`): text ≥ 4.5:1, selected fills, rings, switch-on and control edges ≥ 3:1.
  - **Screenshots** of every selected state: `tests/screenshots/sel-*-light.png` and `-dark.png`.

**Decisions made (2.10.0):**
- **Team colors:** white on Carolina blue (#4b9cd3) is only 2.9:1. Primary buttons and the selected style use a darker team blue (light mode #1f6aa3, navy #13294b for selected). Carolina blue stays for accents.
- **Typed results live in the old PR list** (same synced documents, new fields), so no rules change was needed. Phones on 2.9.x would drop the new fields if they edited a PR. Set the minimum app version to 2.10.0 once everyone updates.
- **"PR" now includes hand-timed races**, as you asked ("always computed from actual results"). In 2.9 a typed PR beat a faster hand-timed race; now the fastest result counts.
- **Charts use 5K** unless a meet's main distance differs (meet strip chart).
- **Improvement leaderboard:** last season's best vs this season's best; new runners use their first 5K this season.
- The Data tab keeps its internal id `results`, so older links and tests still work.

**Known issues (2.10.0):**
- **The team ladder gets tall** when one gender has many runners. Labels are spaced so they never overlap, which can stretch the column.
- **Typed results with "Date unknown"** count for PRs, but not for season bests or any dated chart.

## Standing rules (from your requests)
- ✅ Pushing on a meet day is allowed since 2.8.1 (CLAUDE.md rule 8); `tests/meetday.sh` only reports it.
- ✅ Every suite in `tests/` passes before any push (`tests/run.sh`, CLAUDE.md "Testing").

## Missed or partial (summary)

As of 2.9.0, nothing is ❌ Missed. Remaining 🟡:
1. **2.4.0 and 2.5.0 were pushed on a meet day** (Thu 10/1 evening). That's allowed now (since 2.8.1).
2. **Publishing the 2.9.1 rules is your step** (2.9.0 is published). It's safe any time: it only adds Varsity/JV changes on official results.
3. 2.8.0 gaps 3 (raw beside adjusted), 4 (tagging during a live race, tag history in the time editor) and 5 (badge test) were closed in 2.8.1.
