# Requests and status

Every request from 2.4.0 on, checked against the code, `git log`, `version.json` and CLAUDE.md (not memory).
**Updated with every push.** Last update: Tue 2026-10-06, with 3.3.0.

**Live on Vercel:** 3.3.0 (`version.json` and `APP_VERSION` say 3.3.0). **Rules file:** 3.3.0 (first line of `firestore.rules`): 3.2.0 plus shared stopwatches. Published: 3.2.0 (Tue 10/6). **Publish 3.3.0 once Settings > Team shows every phone on 3.3.0** (until then each 3.3.0 phone times on its own, as before; reopen the app on each phone after publishing).

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
| 2.11.0 | Mon 10/5, 1:53 PM | `02932b9` |
| 2.11.1 | Mon 10/5, 3:50 PM | `82af326` |
| 2.12.0 | Mon 10/5, 8:30 PM | `36d38a3` |
| 2.13.0 | Tue 10/6, 4:06 AM | `fa60e9d` |
| 2.14.0 | Tue 10/6, 4:30 AM | `3d8b68c` |
| 3.0.0 | Tue 10/6, 5:46 AM | `ff88584` |
| 3.0.1 | Tue 10/6, 9:25 AM | `5da47b6` |
| 3.1.0 | Tue 10/6, 2:43 PM | `c40073d` |
| 3.2.0 | Tue 10/6, 5:20 PM | `57e82f6` |
| 3.3.0 | Tue 10/6 (see below) | (this push) |

**Status key:**
- ✅ Live (version, and where it is in the app)
- 🟡 Live with a gap (the gap is described)
- 🔧 Built but not pushed
- ⏳ Planned (waiting for your go-ahead)
- ❌ Missed

Nothing is 🔧 Built but not pushed: the working tree matches 3.0.0, except the uncommitted plan files (`plan-2.6-2.7.md`, `plan-2.7.1.md`, `plan-2.8.0.md`).

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
1. ✅ 2.9.2. **"Ben To." instead of "Ben T." (Ben T.): cause and fix.**
   - **Cause:** the importer guessed each file runner's Girls/Boys from their division labels. A tie, or a stray "Girls Varsity" line, made the guess Girls (a tie went to Girls). The matcher then hid every roster runner marked the other way, so "Ben T." (Boys) was never offered. Ben counted as "not on the roster", and the new runner got a second letter because "Ben T." was taken.
   - **Fix:**
     - A Girls/Boys difference never hides a candidate (it's shown as "(marked Boys)").
     - Abbreviated names are matched ("Ben To." for T.).
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

## 2.11.0: suggested training paces (Mon 10/5)
- ✅ 2.11.0. **Training paces from each runner's races, by Jack Daniels' VDOT method:** easy (a range), threshold, interval, repetition, plus CV pace (what they could hold for about 30 minutes, from their 5K), 5K pace and mile pace.
  - **Basis:** this season's best performance (any race 1500m or longer: hand-timed, official, or a typed result with a date), else a race in the last 120 days.
  - **Never** an old PR or a typed result with no date. Races tagged Injury or Illness are left out.
  - The basis is shown, e.g. "Based on 5K season best 18:32.6, 9/19".
- ✅ 2.11.0. **Pace table on each runner card** (*Data > Runners > a runner > Suggested training paces*): every effort per 100, 200, 400, 800, 1000 and mile. All labeled as estimates.
- ✅ 2.11.0. **Workouts by effort** (*Workouts > a part > "Pace given as: By effort"*): CV, threshold, interval, repetition, 5K pace, mile pace, easy, or a custom % of 5K pace.
  - When runners go on stopwatches, each gets their own targets for every rep. They're fixed at Start, so a running stopwatch never changes.
- ✅ 2.11.0. **Group stopwatches** use the group's middle runner (by VDOT) and warn when the group's paces differ by more than 3% (on the card and in Targets).
- ✅ 2.11.0. **Adjust any target** (*stopwatch ⋯ > Targets…*) in 2 s/mile steps, or go back to the estimate. Remembered for that runner (or group) and workout.
- ✅ Tests: `tests/e2e20.js`.
  - The pace math against Daniels' published tables: VDOT 50 and 60 threshold, interval and repetition within 1–3 s, easy range, 5K round trip.
  - Also: the basis rules, effort workouts, the 105% option, groups and the 3% warning, adjustments remembered across a reload, targets fixed at Start.

**Decisions made (2.11.0):**
- **Intensities:** easy 62–70% of VDOT, threshold 88%, interval 97.5%, repetition 105%. These reproduce Daniels' tables at VDOT 50 and 60; repetition is about 1 s per 400 slower at VDOT 60.
- **CV** = the pace for a 30-minute effort at the runner's VDOT (between threshold and 5K pace).
- **"Custom % of 5K pace"** means % of 5K *speed*: 105 = 5% faster than 5K pace. The editor says so.
- **The basis** is the single best performance by VDOT this season (any distance 1500m+), not an average. It's never an old PR or a result without a date.
- **Adjustments are kept on the phone** that made them (`S.paceAdj`), not shared with other coaches. That needed no rules change and keeps one coach's tweaks from moving another coach's targets.
- **An effort part with no basis** (no race this season) gives no target. The card says who needs a race, and that stopwatch runs as a plain stopwatch until fixed.

**Known issues (2.11.0):**
- **Effort-based workouts need 2.11.0 on every phone.** A phone on 2.10 or older sees those parts as having no target time. Set the minimum app version to 2.11.0.
- **Easy pace is a range,** so a part set to "Easy" uses the middle of it.

## 2.11.1: data organization (Mon 10/5)
Checked against your real backup (`mustang-splits-backup-2026-10-05 2.json`, read in place, never copied into the repo).
- **Not reproducible from it:** the backup holds the roster, schedule, merges and the 386 imported official results. It has no hand-timed races (they live in Team history on the server). So the hand-timed side of each bug was recreated with fake names in `tests/e2e21.js`.
- **Your history file isn't on this Mac**, so the re-import was tested with fake files that use your label styles.

1. ✅ 2.11.1. **One race per division per meet** (*Data > Meets*): at most Girls Varsity, Girls JV, Boys Varsity, Boys JV.
   - The hand-timed race and the official results for a meet and division are one race. Each runner has one row: the official finish is the result, the hand-timed splits stay attached, and the last split runs to the official finish.
   - When the hand and official finish differ, the hand time shows as a small note ("hand 16:40.0").
   - Waupaca 4 → 2 is recreated in e2e21; your backup alone already shows 2 there.
   - Nothing saved is rewritten: this is how the races are shown, copied and exported.
2. ✅ 2.11.1. **Ben stranded: the exact cause.**
   - Your history file labels Ben's 2026 results "Girls Varsity"; his teammates' results at the same meets have no label.
   - The 2.9.0 import stored Ben's results with division "GV". Since 2.9.2 Girls/Boys comes from the roster, so after "Ben To." was merged into "Ben T." his results became Boys. The level, though, still came from that label: Varsity. His unlabeled teammates had no level, and results are grouped by meet + division, so Ben's "Boys Varsity" stood alone at each meet.
   - The merge didn't move anything wrongly. It changed Girls to Boys and exposed a level his teammates didn't have.
   - **Fix:** a label printed for the other gender is no longer trusted, for gender or level. Ben's results then join his teammates' race.
   - Hand-timed rows also follow each runner's own Girls/Boys now, so a Girls/Boys change or a merge re-sorts every view (Meets, Runners, Team, charts) at once.
   - **Regression test:** e2e21 recreates it end to end (the file label, the duplicate, the merge).
3. ✅ 2.11.1. **Varsity and JV.**
   - The parser reads cut-off labels: "Junior", "Junior V", "Junior Varsi", "Jr", "JV" mean JV; "Varsity", "Varsity -", "Varsity D2/3", "Varsi" mean Varsity.
   - An official result with no label takes the level of that runner's hand-timed race the same day. This sorts Jim Bremser's Jacob and Lincoln into JV, when your coaches timed them in a JV race.
   - Results with no label at all (Albany Baertschi, NEC and others) are listed in Data health to set.
   - Past meets are no longer guessed from this season's schedule, except Sectional and State, which are always varsity-only.
4. ✅ 2.11.1. **One naming scheme.** A meet's header is the meet name and date. Race rows are just the division ("Boys Varsity") with badges: Official, Splits (or Hand-timed). No meet names in row titles, and no subtitles.
5. ✅ 2.11.1. **Meets and seasons.**
   - Each meet is one item you tap to open, with its races and charts inside. There are no "Charts" headings between meets any more.
   - Seasons are labeled by the fall year ("2026 season", Aug 1 to Jul 31), and every race sorts in by its date.
   - A hand-timed race not linked to a meet, on the date of a scheduled meet, belongs to that meet (e.g. 9/24 → the scheduled Mishicot meet, Jim Bremser Memorial).
   - With no division, it takes one from its runners' Girls/Boys and the race name ("JV", "Varsity") or the meet's single level.
6. ✅ 2.11.1. **Re-import updates.**
   - Re-importing the history file now finds updates for results already imported: Varsity/JV levels, runner links, and full names.
   - The preview shows "Updates for results already imported: n Varsity/JV levels · n runner links · n full names" and lists the name changes.
   - Everything applies together with one Undo, and nothing is ever added twice (tested).
7. ✅ 2.11.1. **Data health** (*Settings > Data health* and *Data > Data health*; a badge on the Data tab) lists, each with a one-tap fix:
   - runners with no Girls/Boys (Girls / Boys buttons)
   - suspected duplicate runners (Merge…)
   - results with no level or division (Set Varsity / JV)
   - meets split into more than one race per division (Open, Set Varsity / JV)
   - meets outside their season (Move to the right season, or Set a date)
   - results from runners not on the roster (Link to a runner / Add as a runner)

   It re-checks after every import, merge and change.
8. ✅ 2.11.1. **Full names.**
   - Runners keep their first and last name. Adding, pasting and joining a team no longer shorten names.
   - Re-import fills in last names for matched runners ("Ben T." → the full last name; the first name stays as your team uses it). It never creates duplicates.
   - Names are edited on the Team tab (tap a name).
   - CLAUDE.md no longer has the first name + last initial rule. The rule that real data never goes into the repo stays (the repo is public).
9. ✅ 2.11.1. **Race Mode name buttons.**
   - Full names wrap to two lines and shrink only as much as needed. The condensed team font kicks in before going small, and a name is never cut off.
   - Fitted once when the grid is built, so buttons never change size during a race.
   - Tested on an upright phone in 2 and 3 columns with long names (e.g. "Alexandrina Montgomery-Smith"), both before and after a runner is recorded with the time and coach lines. Screenshots: `tests/screenshots/race-long-names-*.png`.

**Before → after, from your backup (official results only):**

| Meet | Boys races before | Boys races after | Girls races before | Girls races after |
|---|---|---|---|---|
| Jim Bremser Memorial 9/24 | 2 ("Boys" + Ben's "Boys Varsity, 1 runner") | 1 (all 7 boys) | 1 | 1 |
| Smiley Invitational 9/19 | 2 | 1 | 1 | 1 |
| Kiel Raiders Invite 9/3 | 2 | 1 | 1 | 1 |
| Appleton West Terror Invite 8/28 | 2 | 1 | 1 | 1 |
| Waupaca Invitational 10/1 | 1 | 1 | 1 | 1 |

- **With your hand-timed races** (in Team history, not in the backup), each meet becomes at most Girls Varsity/JV and Boys Varsity/JV, e.g. Jim Bremser boys: Varsity and JV. Waupaca: 4 → 2 (hand-timed and official combined).
- **Data health on your backup:** 1 item, 154 official results with no Varsity/JV level (no label in the file and no hand-timed race to take it from). Re-importing the history file fills in the ones whose printout has a label.
- **Seasons:** 2026, 2025, 2024, 2023 season, then middle school.

**Decisions made (2.11.1):**
- **A label for the other gender is ignored** (gender and level), not just its gender. In your file it's wrong data, as Ben's case shows.
- **A runner's hand-timed race decides their official level that day** when the file has none. Coaches pick a race's division when they time it.
- **No more level guessing for past meets** from this season's schedule (2.9.1 did; you asked to set those yourself). Sectional and State stay Varsity.
- **Combining is display only:** saved hand-timed races and import records are never rewritten. Official times can't be edited (they're imported); hand-timed times still open the editor.
- **When the same runner is in two hand-timed races** for one division (two coaches saved a race each), the race with more runners is the base and the other's runners are added. Lists with another distance or other checkpoints aren't combined and show in Data health.
- **On a phone without a team,** its own races are combined into the meets too. They also still appear in "Races on this phone".
- **Full names on re-import:** only a roster name that is a short form of the file's name gets the last name ("Ben T.", "Ben"). A different name a coach typed is never changed. The first name stays as your team uses it ("Ben", not "Benjamin").
- **Results whose runner has no Girls/Boys** show as "Unassigned (no Girls/Boys)".

**Known issues (2.11.1):**
- The hand-timed parts of items 1, 3 and 5 couldn't be checked against your real data (not in the backup). They're covered by e2e21's fake-name recreation. Please check Waupaca and Jim Bremser on your phone (checklist below).
- In Data health, two runners with the very same full name are listed as possible duplicates even if they really are two runners. Merge only if they're the same.

## 2.12.0: charts, Ben To., full names, sort by average, Team tab, groups (Mon 10/5)
Checked against your real backup (`mustang-splits-backup-2026-10-05 2.json`) and your history file (`~/Documents/mustang-splits-history-:v1.json`), both read in place, never copied into the repo. Tests and screenshots use a fake team with the same shape (`tests/fixtures/fake-team-history.json`).

**Item 1: Team ladder** (*Data > Team > Team ladder*)
- ✅ 2.12.0. Girls labels sit outside on the left edge, Boys labels outside on the right, each joined to its dot by a thin leader line. Labels spread apart when times are close; none overlap.
- ✅ 2.12.0. One time axis in the middle, between the two columns, with round ticks (16:00, 18:00, 20:00…). Grid lines stop short of the tick labels.
- ✅ 2.12.0. Fastest at the top, labeled "faster ↑". Near-equal dots sit side by side instead of on top of each other.

**Item 2: Top-5 average, meet to meet**
- ✅ 2.12.0. Normal time axis: smaller times lower, "faster ↓", round ticks, the range fitted to the data with a little padding.
- ✅ 2.12.0. The key is drawn from the same settings as the chart: Girls line (circles), Boys line (squares), and a shaded #1–#5 band in each team's colour.
- ✅ 2.12.0. The table fits an upright phone: Girls and Boys are two rows under each meet.
- ✅ 2.12.0. Fewer than five runners: "4 runners, no top-5" instead of "–" (Kiel boys: 4 varsity).
- ✅ Jim Bremser boys: checked on your data. After re-importing your history file, the Boys Varsity race there has Ben T., Mason S., Henry V., Ben H. and Gavin B.: top-5 20:15.0, spread 4:48.7.

**Item 3: Girls and Boys pack at each meet**
- ✅ 2.12.0. Key made from the chart: filled = #1–#5, ring = #6–#7, solid line = #1–#5 gap, dashed line = #1–#7 gap, in the team's colour and shape.
- ✅ 2.12.0. Gap labels ("1–5 gap 4:32 · 1–7 gap 7:04") have their own line under each meet; they never touch dots, lines or the next meet.
- ✅ 2.12.0. Near-equal times fan out vertically (as many lanes as needed; the row grows to fit), so each runner is visible and tappable.
- ✅ 2.12.0. Meet names wrap to two lines (shortened words like "Invite" only if a name needs three); never cut off.
- ✅ 2.12.0. Round ticks, "← faster" under the axis.
- ✅ 2.12.0. Every meet appears; a team with fewer than five shows its dots and "4 runners, no top-5".

**Item 4: All charts**
- ✅ 2.12.0. One chart kit for every chart: round ticks, measured labels, key from the plotted series, shapes as well as colours (Girls ● circle, Boys ■ square, a third runner ▲ triangle, no Girls/Boys ◆ diamond).
- ✅ 2.12.0. All line and trend charts use the normal time axis (smaller lower, "faster ↓"): top-5 average, season chart, career PR, compare, this year vs last year, pace through the race. Horizontal charts say "← faster". The ladder is the only "faster ↑" chart.
- ✅ 2.12.0. The season chart's "season best" and "PR" labels moved into its key (they sat on top of the line).
- ✅ Automated test (`tests/lib.js chartProblems()`, run by `tests/e2e22.js`): on every chart at upright-phone width, in light and dark: no label overlaps another label, a dot or a line; no label outside the chart or shortened with "…"; the key has exactly the plotted series; no two key entries look alike; time ticks are round; no two dots overlap. 262 charts per mode on the fake team. Also run on your real data (341 charts, after the re-import): no problems.

**Item 5: "Ben To." and Ben T.**
- ✅ **Cause found.** The merge was done (your backup holds it: "Ben To." merged into "Ben T." by Rankin, Mon 10/5 1:44 PM), but it never reached the team:
  - Merged runners are stored in a Firestore collection added in 2.9.2. **The rules published in Firebase are still 2.9.0**, which have no such collection, so the team refused the merge record. It stayed on the phone that made it.
  - Removing "Ben To." from the roster did reach the team (2.9.0 allows that). So every other phone got "Ben To." in Recently deleted, but not the merge.
  - On those phones, his 51 official results pointed at a runner who was no longer on the roster and had no merge. Data health listed them ("51 official results for Ben To., who isn't on the roster"), and his 2026 results fell back to the file's wrong "Girls" label, so the boys were one varsity runner short at Jim Bremser ("–").
  - Reproduced with your backup: with the merge record, Data health has 1 item; without it, it has 3, including "51 official results for Ben To.". The other 2 on your phone are most likely from hand-timed races (not in the backup); a bug that counted every Team history race twice (since 2.9.2, fixed now) may have added one.
  - Data health was not counting runners in Recently deleted as duplicates. It was counting the *results* of a runner in Recently deleted.
- ✅ 2.12.0. **Fixes.**
  - Data health now says when this phone's merges can't reach the team ("the team's published rules are older than 2.9.2") and how to fix it.
  - Official results of a runner in Recently deleted are offered as a merge: "Probably Ben T." with a one-tap **Merge into Ben T.** (and "Merge into…" for any runner). One Undo removes it.
  - Every suspected duplicate gets one-tap **Merge into X** in both directions ("Merge into Ben T." / "Merge into Ben To."), which runs the full merge (snapshot first, Undo bar), plus "Merge into…" for anyone else.
  - Data health never counts soft-deleted runners as duplicates (tested).
  - **Your step:** publish `firestore.rules` (it's the 2.9.2 file, waiting since this morning). After that, the merge reaches every phone the next time the app on the merging phone opens.
- ✅ **Ben's races, checked on your data.**
  - With your backup alone (no re-import), he is never stranded: he's with all his teammates in Boys Varsity at Waupaca 10/1 and Nightfall 9/11 (varsity-only meets), and in "Boys · level not set" at the other four, because the imported 2026 results carry no level (his wrong "Girls" label is ignored). On your phone, hand-timed races also decide levels; those aren't in the backup.
  - After re-importing your history file (which prints "Varsity" for him at every 2026 meet), Ben T. is in **Boys Varsity at all six 2026 meets**: Appleton West 8/28, Kiel 9/3, Nightfall 9/11, Smiley 9/19, Jim Bremser 9/24 and Waupaca 10/1.
  - The team charts include him: ladder (16:32, fastest boy), top-5 averages (Jim Bremser 20:15.0 includes his 17:28.1), pack charts.
  - **Your step:** on an admin phone, Data > Import history file > your file > Apply. It previews 116 Varsity/JV levels and 14 full names, adds no results twice, and has one Undo.

**Item 6: Full names**
- ✅ 2.11.1's full-name work shipped and works: re-importing your history file fills in all 14 last names (for example "Ben T." gets his full last name; first names stay as your team uses them). Your phone still shows initials because the file hasn't been re-imported since 2.11.1.
- ✅ 2.12.0. Data health lists runners whose name is only "First L." with **Import the history file again** (or edit the name: tap the runner on the Team tab).
- ✅ 2.12.0. Charts use full names; a tight label wraps to first name / last name (and the time on a third line for a long name) before it ever falls back to an initial. Lists, runner cards and tooltips show full names.
- ✅ 2.12.0. Fixed: a hyphenated last name didn't match its initial ("Ivy D." vs "Ivy Delacroix-Moss" made a duplicate on import and wasn't flagged in Data health).

**Item 7: Sort by season average**
- ✅ 2.12.0. *Data > Runners* and the *Team tab* sort fastest first by season average 5K: each result course-adjusted when its course has a factor (plain otherwise, "adj." when any is), official times preferred, Injury/Illness-tagged results left out. The average is on each row. Runners with no 5K this season go last.
- ✅ 2.12.0. Sort switch: **Average** (default), **Season best**, **Name**. One setting for both places, remembered on the phone.

**Item 8: Team tab**
- ✅ 2.12.0. One line per runner: full name, grade, season average. Tap the row to edit (name, Girls/Boys, results, Remove runner with Undo).
- ✅ 2.12.0. Girls and Boys sections collapse (remembered on the phone), and a search box.
- ✅ 2.12.0. The Group field is gone. **Existing group values:** none. In your backup all 14 runners have an empty group, so nothing was lost. (Groups stay in the data for older phones; they're just not shown.)
- ✅ 2.12.0. **Groups move to stopwatch setup:** + New > Workout > pick runners > pick the workout > **Make groups**. Each runner has a group picker (or "New group"). Group stopwatches are named "Group 1", "Group 2"…
- ✅ 2.12.0. **Suggest pace groups:** uses each runner's training pace for the workout's effort (its first "by effort" part, else 5K pace) and groups runners within 3%. Runners with no race this season are grouped last and named. Adjust before starting. Group stopwatches keep using the middle runner and warn about spread, as before.
- ✅ The Bench, race setup and the workout flow list runners by Girls / Boys instead of the old group labels.

**Also fixed (found while testing):**
- Every Team history race was counted twice in the Data views since 2.9.2 (an inline comment had disabled the duplicate check). Runner cards, averages and season bests now count each race once.
- "Add runner" accepted an empty name since 2.11.1 (same cause).
- Hand-timed results on the season chart drew as wide bars, not squares (an old style for the stopwatch progress dots also applied to them).

**Tests:** `tests/e2e22.js` (new, 46 checks: every chart in light and dark, ladder, top-5 chart and table, pack charts, Data health incl. the 2.9.0 rules in the emulator, sort, Team tab, groups); `tests/team-tab.js` rewritten for the new Team tab; e2e1, e2e6, e2e7, e2e8, e2e9, e2e10, e2e11, e2e13, e2e19, e2e21 updated for the new Team tab and the Girls/Boys pickers.

**Screenshots (fake names):** before = `tests/screenshots/team-before-{ladder,top5,packG,packB}-{light,dark}.png` (2.11.1 code), after = `team-after-…`.

**Decisions made (2.12.0):**
- **Season average** adjusts each result on its own (adjusted when its course has a factor, plain otherwise) rather than all-or-nothing per runner, so one meet on a new course doesn't switch a runner's whole average to plain.
- **The table** stacks Girls and Boys as two rows per meet (your first option); no sideways scrolling.
- **Pack chart rows** grow taller when many runners finish close together, instead of letting dots overlap.
- **The compare chart** shows this season and last, with races evenly spaced in date order (four seasons of dates squeezed a whole fall into a few pixels). The career chart still shows every season.
- **Ladder labels** allow a third line (first name / last name / time) before falling back to an initial, so "Ivy Delacroix-Moss" stays whole.
- **One-tap merges** close Data health so the Undo bar is visible.
- **Groups are made per workout, not saved on the runner.** The old `group` field stays in the data and in Firestore (older phones still read it), but nothing shows or edits it.
- **Pace groups** start a new group when a runner is more than 2.9% slower than the group's fastest, so a suggested group never triggers the 3% spread warning.
- **No rules change** in 2.12.0. The rules file stays 2.9.2.

**Known issues (2.12.0):**
- **The merge and the levels need two steps from you** (above): publish the rules, then re-import the history file on an admin phone.
- **The ladder gets tall** with long names (up to three lines per label) when one gender has many runners.
- **Hand-timed parts** (levels from hand-timed races, your exact badge of 5) couldn't be checked against real data: they live in Team history, not in the backup.
- **Real last names were in the public repo** (earlier REQUESTS.md entries, two app comments and one test, from 2.9.2–2.11.1). They're removed from the files now (tests use the made-up "Ben Tollefsrud"), but older commits on GitHub still contain them. Making the repo private would hide those.
- `modal()` has an inline comment that disables focusing a sheet's first button. It has been that way since the first versions and every sheet is built around it, so it was left alone.

## 2.13.0: simplify and fix (Phase 1, Tue 10/6)
Rollback tag before this phase: `before-2.13.0` (= 2.12.0). See CLAUDE.md > How to roll back. The newest backup in `~/Documents/mustang-splits-data/` is still the Mon 10/5 2:07 PM one; it was used again, in place, never copied.

**Item 1: Varsity/JV removed everywhere**
- ✅ 2.13.0. Each meet has one Girls list and one Boys list (*Data > Meets*). Hand-timed and official lists of the same gender and distance are one race, Varsity and JV together. A hand-timed "Both" race splits by each runner's Girls/Boys.
- ✅ 2.13.0. Team charts and the table use each team's five (and seven) fastest at each meet, from whichever race they ran (a runner counts once, with their fastest time that day).
- ✅ 2.13.0. Gone: the Varsity/JV switch, the "no Varsity or JV level" notes, Data health's level checks, the meet editor's Levels, the "Varsity / JV…" buttons, level updates on re-import.
- ✅ 2.13.0. Race Mode setup offers Girls, Boys or Both (also without a meet).
- ✅ Each result keeps the division text from its file, and saved races keep their division codes (data safety; nothing is shown or grouped by them).
- **"Merge existing races (snapshot first, one Undo)":** done as a view, not a rewrite. Nothing saved changes, so there's nothing to undo; a one-time snapshot ("Before 2.13 showed Varsity and JV as one list") is taken anyway when 2.13 first opens. See decisions.

**Item 2: Effort-based workouts**
- ✅ 2.13.0. **Cause:** the editor has two settings that both look like "effort": the part's **Effort** (Fast / Tempo / CV / Race pace / Easy) and **Pace given as: By effort**. A part with Effort "CV" and no time typed was treated as a timed part with no time, so the tile said "This workout needs a distance and target time". (Set to "By effort", the same workout already worked; checked against your backup.)
- ✅ 2.13.0. **Fix:** a part with an effort and a distance but no time is effort-based, and each runner gets their own targets: CV → CV pace, Tempo → threshold, Fast → interval, Race pace → 5K pace, Easy/Jog → easy. The editor says so under the part.
- ✅ Regression test (`tests/e2e23.js`): a "CV, no time" workout started for two runners gives each their own targets, before Start, after Start, and after a reload.

**Item 3: Stopwatch tiles**
- ✅ 2.13.0. The title is the runner's name (or the group's). **Cause of "Unnamed" with the name underneath:** two functions had the same name (`autoName`), and the Race Mode one (added in 2.7) replaced the stopwatch one, so stopwatches made from runners got no name. Fixed, and saved nameless stopwatches get their runners' name when 2.13 opens. Quick stopwatches are "Runner 1" etc.
- ✅ 2.13.0. Only what matters: the time (large), the rep and next target (small), the last split vs target with colour **and** shape (▲ behind, ▼ too fast, ● on pace) and a word. Gone: the track graphic, rep dots, the workout name, "No workout (just a stopwatch)", "Ready to start". Where targets come from is in ⋯ > Targets.
- ✅ 2.13.0. Lap (primary) and Stop on the tile. Stop asks on the tile: "Tap again to stop" for 3 s.
- ✅ 2.13.0. Undo on the tile: ↶ for a lap, Keep timing after Stop, "Started over · Undo" after Start over, and a removed tile stays for 8 s as "Removed Runner 1 · Undo". No bars across the screen for these.
- ✅ 2.13.0. About half the height: a running tile is 190 px (2.12: 387 px) on an upright phone; buttons stay at least 44 pt. Screenshots: `tests/screenshots/tiles-before.png`, `tiles-after.png` (fake names).

**Item 4: Selecting runners**
- ✅ 2.13.0. Select all, Girls, Boys, Clear at the top of every runner picker (+ New > Workout, Change runners, Race setup), plus Suggest pace groups in the workout flow and the Bench.

**Item 5: Keyboard**
- ✅ 2.13.0. The focused field is kept between the header and the top of the keyboard, inside a sheet first and then the page, checked when it gets focus and again whenever the keyboard changes size (it animates in, and the suggestion bar comes and goes).
- ✅ Test: a faked 320 px keyboard in a browser, every field in Add runner, the workout editor, Settings and race setup: none hidden.
- ✅ 2.13.0. Steppers (− / +) for a workout's reps and rest (15 s steps). Phase 2 uses steppers throughout the new workout flow.

**Item 6: Team ladder**
- ✅ 2.13.0. Two stacked ranked lists, Girls then Boys. Each row: rank, full name, a dot on one time axis shared by both lists, the time; fastest at the top. Rows are list items, so they can't overlap. Tapping a row opens the runner.

**Tests:** `tests/e2e23.js` (new: effort regression, tiles, pickers, keyboard, ladder, no Varsity/JV, steppers). Updated for 2.13: e2e7, e2e10, e2e11, e2e12, e2e13, e2e17 (its Varsity/JV section now checks that levels are gone), e2e18, e2e19, e2e20, e2e21, e2e22. The fake team now has a meet where only Varsity + JV together make a top-5.

**Decisions made (2.13.0):**
- **Combining Varsity and JV is a view, not a rewrite.** Saved races and imports keep their codes, so 2.12 (and a rollback) still reads them. That needed no Undo; a one-time snapshot marks the switch.
- **Race Mode saves Girls / Boys / Both as `GV` / `BV` / `OPEN`.** The published rules only accept those codes, so this needs no rules change, and older phones show "Girls Varsity"/"Boys Varsity"/"Open".
- **The team top-5 takes official lists over hand-timed for that day and team**, as before, and a runner counts once (their fastest).
- **Effort mapping:** Tempo = threshold, Fast = interval (VO2max), Race pace = 5K pace.
- **The pace basis line moved off the tile** into ⋯ > Targets (the tile shows only what matters).
- **"Too fast"** stays the word for a split faster than plan (as the ? help has said since 2.3).

**Known issues (2.13.0):**
- A workout made in 2.13 with an effort and no time shows "needs a distance and target time" on a phone still on 2.12. Set the team's minimum version to 2.13.0 once every phone has updated.
- The keyboard test fakes the keyboard in a desktop browser; check a few sheets on the phone (checklist).

## 2.14.0: workouts that plan themselves (Phase 2, Tue 10/6)
Rollback tag before this phase: `before-2.14.0` (= 2.13.0).

**Item 7: "What's today's goal?"** (*Workouts tab, at the top*)
- ✅ 2.14.0. Seven goals: aerobic base, threshold/CV, speed (VO2max), race sharpening, recovery, pre-meet, long run.
- ✅ 2.14.0. The schedule decides the suggested goal, shown with its reason and the meets ("Next meet: Brillion Invite, Thu 10/8 (in 2 days) · last: Waupaca Invitational, 5 days ago"):
  - race day or 1 day before → Pre-meet
  - 1 day after a meet → Recovery
  - 2 days before → Race sharpening ("2 days before Brillion Invite: keep it short and sharp.")
  - 2 days after → Aerobic base
  - 3–4 days before → Threshold / CV
  - otherwise → Speed (VO2max)
- ✅ 2.14.0. 2–3 established high school XC sessions per goal, each with why it fits today:
  - Aerobic base: easy 6 km + strides; progression 3 km easy, 2 km at CV
  - Threshold / CV: 5 × 1000 at CV (1:00 rest); threshold run about 20 min (4000 m); 3 × 1 mile at threshold (cruise intervals)
  - Speed: 6 × 800, 5 × 1000, 12 × 400 at interval pace
  - Race sharpening: 8 × 200 at repetition (mile) pace; 3 × 1 mile at 5K pace; hill repeats 8 × 200 m
  - Recovery: 5 km easy; 4 km easy + strides
  - Pre-meet: shakeout 3 km easy + 4 × 100 strides; 2 × 400 at 5K pace
  - Long run: 12 km easy; 10 km with the last 2 km at threshold

  Hard sessions within 2 days of a meet (or the day after one) are listed last with a warning ("too hard this close to a meet").
- ✅ 2.14.0. Only recognized pace systems, each by its standard name: Easy (E), Threshold (T), Interval (I), Repetition (R) from Jack Daniels's VDOT, Critical velocity (CV) from Tom Schwartz, plus 5K and mile race pace from VDOT. Each runner's basis is shown ("Based on 5K season best 18:32.6, 9/19").
- ✅ 2.14.0. The flow:
  1. goal
  2. pick a suggestion (or **Build your own**: the workout editor)
  3. reps and rest with steppers
  4. runners: Select all / Girls / Boys / Clear / Suggest pace groups
  5. each runner's target and basis
  6. Start

  Every runner gets individual targets for every rep.
- ✅ 2.14.0. Runners without race data are flagged ("No race this season"), with **Time trial** (Mile, 3200m or 5K and a time: it counts like a race for their paces and is saved as a dated hand-timed result) or **Run with a group** (the group maker: they run on that group's targets).
- ✅ Suggestions are starting points: everything stays changeable (steppers, the workout editor, Targets ± per runner).
- ✅ Tests: `tests/e2e24.js` (5 schedule cases, every goal, the full flow, time trial, run with a group, Build your own).

**Decisions made (2.14.0):**
- **"About 20 min at threshold" is 4000 m.** Workouts are distance-based (targets per checkpoint), so a time-based session gets a typical distance and the name says "about 20 min".
- **Strides aren't timed parts.** "+ 6 × 20 s strides" is in the name and note; the easy run is the timed part.
- **A chosen suggestion is saved as an ordinary workout** ("6 × 1000 at CV"), reused if the same one exists, so it syncs and works on older versions. The template id rides inside its parts.
- **A time trial is saved as a typed result** (dated today, "Time trial", hand-timed). It sets paces like a race this season, and shows on the runner's card.
- **Interval (VO2max) = Daniels I pace; repetition = Daniels R pace (about mile race pace).**

**Known issues (2.14.0):**
- Hill repeats get repetition-pace targets as a guide only; the note says to run them by effort.
- The schedule uses the Meets list; a meet without a date isn't counted.

## 3.0.0: redesign following Apple's Human Interface Guidelines (Phase 3, Tue 10/6)
Rollback tag before this phase: `before-3.0.0` (= 2.14.0). 3.0 changes only how things look and where they are: no saved data, sync, rules or timing changes, so rolling back to 2.14 reads everything.

**Item 8: audit, spec, inventory, screenshots**
- ✅ Every screen audited: 20 problems found, written up in **`docs/design-3.0.md`** with the new layout of each screen and a **feature inventory of 75 features** (where each lives in 2.14 and where in 3.0).
- ✅ Built.
- ✅ Automated test (`tests/e2e25.js`): walks the inventory and confirms all 75 are still reachable in 3.0.
- ✅ Before/after phone-size screenshots of 24 main screens, light and dark (fake names): **`docs/screenshots-3.0/`** (`before-NN-*.png`, `after-NN-*.png`).

**Item 9: principles**
- ✅ Clear hierarchy: each tab has a large title, its actions in the nav bar, one primary action per screen.
- ✅ Progressive disclosure:
  - help, import, Recently deleted, Data health and the tagged-results switch moved to Settings
  - Paste a list / Merge runners into Team ⋯
  - workout actions into a tap (or swipe) per workout
  - the editor opens as a sheet
- ✅ No redundant controls: "Leave tagged results out of trends" had three copies (Runners, runner card, Team view) and now has one (Settings > Data); the ? button and the Data top buttons are gone.
- ✅ Every feature kept (the inventory test).
- ✅ **A new coach starts a workout for the whole team in 6 taps**, every button on screen without scrolling: Workouts → Use this (today's suggestion) → Choose runners → Select all → Next → Start now. With a saved workout it's 5 taps from the Stopwatches tab. (Tested; the test found and fixed Start now being below the fold with 14 runners.)

**Item 10: iPhone conventions**
- ✅ Standard tab bar: the selected tab is the tint colour on icon and label, with no pill. It respects the bottom safe area, nothing is cut off, and the health badge sits on the Settings gear.
- ✅ Controls:
  - iOS switches (green), segmented controls (grey track, raised segment)
  - grouped inset lists (Settings; workouts)
  - bottom sheets with a grab handle (drag down or tap outside to close)
  - action sheets for destructive choices: Clear all times, Clear finished, Stop all, Restore, Leave team, Stop being admin, End race (Discard in red); Delete permanently keeps its typed-name sheet
  - swipe actions with Undo (workouts: Use / Edit / Duplicate / Delete; runners: Remove)
  - press-and-hold menus (a stopwatch tile, a runner, a workout)
- ✅ The system font (SF Pro) for all text, with Barlow Condensed only on clock digits. Sizes follow the phone's text size; tested at a large size, with no sideways scroll and nothing clipped.
- ✅ Touch targets at least 44 pt, consistent spacing, light and dark mode. The contrast checks pass (`e2e19`, updated for the iOS look: tint tab and labels ≥4.5:1, the raised segment's edge ≥3:1 against its track).
- ✅ Native selected and pressed states (pressed darkens at once). Nothing clips or misaligns in the screenshots.

**Item 11: Data tab decluttered**
- ✅ Copy results and Save as spreadsheet (CSV) are in a **Share** button on the view they export: each race, and Today's stopwatches.
- ✅ Import history, Recently deleted and Data health are in **Settings > Data**, with a red badge on the gear and on Data health when something needs attention.
- ✅ The season picker sits in the nav bar (Data). It sets the Team view's season and jumps to that season in Meets.

**Tests:** `tests/e2e25.js` (new). Updated for the moved controls: e2e1, e2e6–e2e13, e2e15–e2e19, e2e21, e2e22, team-tab.js and `tests/tools/fake-team.js`.

**Decisions made (3.0.0):**
- **Presentation only.** No data change, so CLAUDE.md rule 11 holds trivially; a rollback to 2.14 is safe.
- **The nav bar's actions row stays put** while the large title scrolls away (like iOS's collapsing title), so Settings and + are always one tap away.
- **The empty Stopwatches tab shows the three choices, not a + button** (the 2.7.1 "never both" rule).
- **Segmented controls lost their ✓.** iOS doesn't use one; selected = the raised segment, bold, with an edge at ≥3:1 so it's never colour alone. Choice chips keep the filled tint style.
- **The status bar is light/black, not navy**, to match the light nav bar (`theme-color` per scheme).
- **Undo bars and toasts stay above the tab bar.** I tried them at the top; they covered each screen's first controls (the Data switch) for 8 seconds, so they went back. Stopwatch Undo is on the tile.
- **Race Mode keeps its layout** (it was built for speed and tested for "never the wrong runner"); only its style changed.

**Known issues (3.0.0):**
- Swipe actions and press-and-hold are tested in a desktop browser; check them on the phone (checklist).
- The large-text check uses a browser setting; the real Dynamic Type sizes are worth a look on the phone (Settings > Accessibility > Larger Text).
- Older coach phones (2.14 and earlier) keep the old look until they update; nothing they save differs.

## 3.0.1: logo, portrait only (Tue 10/6)
- ✅ 3.0.1. **Copy rules to the clipboard:** done (`firestore.rules` 2.9.2, unchanged).
- ✅ 3.0.1. **Your logo in the header** (*left end of the nav bar, every tab*): `icons/logo.png`, made from "mustang-splits logo.png" (white background made transparent, trimmed, 144 px for sharp display at 36 pt). It steps aside while "‹ Runners" shows on a runner card. Cached for offline use.
- ✅ 3.0.1. **"Mustang Splits" back in the header** (*right after the logo*; 3.0 had dropped it): the 2.x wordmark (bold condensed), "Mustang" in the logo's navy `#052257` and "Splits" in the logo's blue `#49a5f3`. In dark mode "Mustang" is white (navy can't be read on black), like the logo's white band.
- ✅ 3.0.1. **Portrait only:** the installed app's manifest already said portrait, and Android honors it (plus `screen.orientation.lock`). **iOS doesn't let a web app lock rotation**, so a phone held sideways shows "Turn your phone upright" over the app until it's turned back; clocks and races keep running underneath (they're timestamps). iPads and computers are unaffected.

**Decisions made (3.0.1):**
- **The original "mustang-splits logo.png" stays out of the repo** (1 MB, a space in the name); only the small `icons/logo.png` is committed.
- **The small centered title stays off while the logo and wordmark show** (on a phone they'd overlap); the large title still names each tab, and the tab bar shows where you are.
- **The wordmark is a logo, so it keeps the logo's exact blue** even though light blue on the light bar is below the 4.5:1 contrast used for text (logos are exempt); the navy word carries the name.
- **Sideways = a cover, not a rotated page.** Rotating the whole page by CSS breaks safe areas, the keyboard and Race Mode's fixed tap positions.

**Known issues (3.0.1):**
- On an iPhone the only true lock is Control Center > Portrait Orientation Lock. A phone tipped sideways mid-race shows the cover until it's upright again.
- "Edit times" in its sideways grid layout is no longer reachable on a phone (it still is on an iPad or computer); the upright one-checkpoint-at-a-time layout is unchanged.

## 3.1.0: race-day difficulty instead of course difficulty (Tue 10/6)
Why: Winagamie GC had a different layout at the Appleton West Terror Invite (8/28) and the Nightfall Classic (9/11), but 3.0 treated them as one course, and Winagamie was also the reference every other course was measured against. Layouts also change year to year. Checked against the newest backup (10/5, 2:07 PM; not in the repo).

1. ✅ 3.1.0. **Fitness is a smooth trend, not one race:** each runner's fitness at a race is a straight line through their *other* races that season, its slope pulled toward the team's typical slope, so one fast or slow meet can't dominate.
2. ✅ 3.1.0. **Each race day gets its own rating:** how much the team as a whole ran faster or slower than their trends predicted. The two Winagamie meets now get separate ratings (8/28: 0:12 harder; 9/11: 0:51 easier), as does every year's meet.
3. ✅ 3.1.0. **Adjusted time = actual time minus that day's rating**, measured against the season's average race day. There's no reference course any more ("Winagamie GC equivalent" is gone).
4. ✅ 3.1.0. **5-runner minimum:** a race day needs 5 runners who each have 2+ other races that season; otherwise it shows "Not enough data" (with how many qualified) and no adjusted time.
5. ✅ 3.1.0. **Confidence for every rating:** High / Medium / Low from how many runners and how consistent they were, with a ± range; Low is flagged ⚠ (*Data > Team > Race-day ratings; Data > Meets, top of each meet*).
6. ✅ 3.1.0. **Injury and Illness results never count** toward a rating (always, whatever the "Leave tagged results out" switch says).
7. ✅ 3.1.0. **The explanation** "Adjusted times remove how hard each race day was, so trends reflect fitness, not the course." at the top of Data > Meets, Runners, each runner card and Team.
8. ✅ 3.1.0. **Raw times stay the record everywhere:** PRs, season bests, results, Copy and CSV never use ratings. Only the Adjusted switch, trends, season averages and the Team view's Adjusted mode do. Nothing saved changed; ratings are computed when shown.

**Race-day ratings, 2026** (± = likely range; seconds are for that day's typical 5K time):

| Meet | Date | Rating | ± | % | Runners | Confidence |
|---|---|---|---|---|---|---|
| Appleton West Terror Invite (Winagamie GC) | 8/28 | 0:12 harder | 0:30 | +0.8% | 12 | Medium |
| Kiel Raiders Invite | 9/3 | 0:22 harder | 0:29 | +1.5% | 14 | Medium |
| Nightfall Classic (Winagamie GC) | 9/11 | 0:51 easier | 0:20 | −3.5% | 13 | Medium |
| Smiley Invitational | 9/19 | 0:16 easier | 0:13 | −1.1% | 14 | High |
| Jim Bremser Memorial | 9/24 | 0:29 harder | 0:29 | +2.1% | 13 | Medium |
| Waupaca Invitational | 10/1 | 0:04 harder | 0:20 | +0.3% | 14 | Medium |

No 2026 meet shows "Not enough data", and none is Low confidence.

**Top-5 average per meet, before and after** (Team view, Adjusted):

| Meet | Girls raw | Girls before (3.0) | Girls after (3.1) | Boys raw | Boys before | Boys after |
|---|---|---|---|---|---|---|
| Appleton West Terror Invite 8/28 | 26:03.1 | 26:03.1 | 25:50.1 | 20:11.7 | 20:11.7 | 20:01.6 |
| Kiel Raiders Invite 9/3 | 25:34.5 | 25:11.0 | 25:11.8 | 19:38.1 | 19:20.0 | 19:20.6 |
| Nightfall Classic 9/11 | 23:19.7 | 23:19.7 | 24:10.2 | 20:01.0 | 20:01.0 | 20:44.4 |
| Smiley Invitational 9/19 | 23:48.7 | 23:38.3 | 24:05.2 | 19:03.7 | 18:55.4 | 19:16.9 |
| Jim Bremser Memorial 9/24 | 23:54.7 | 23:06.3 | 23:25.1 | 20:15.0 | 19:34.1 | 19:49.9 |
| Waupaca Invitational 10/1 | 23:53.3 | 23:44.5 | 23:49.2 | 19:15.5 | 19:08.5 | 19:12.2 |

Before, both Winagamie meets were the reference (no change), so the slow 8/28 and the fast 9/11 looked like a 2:43 girls' improvement in two weeks; after, part of that is the day (8/28 a little harder, 9/11 much easier). Kiel barely moves (the old factor already said +1.6%). The Nightfall boys' adjusted average is slower than raw: boys individually ran 2.6% faster than their trends that night (girls 3.9%), and only 6 boys raced, so the raw top 5 was already missing a usual scorer.

**"Not enough data":** every 2023 and 2024 meet (the history files have only 1–4 of this team's runners per meet), and in 2025 the Brillion Invite (10/9) and WIAA State (11/1), with 1 runner each. 2025's other 8 meets are rated (2 High, 6 Medium).

**Decisions made (3.1.0):**
- **One rating per race day for the whole team** (girls and boys together), as asked. Girls and boys sometimes disagree (Jim Bremser: girls 2.3% faster than their trends, boys 4.4% slower; Kiel: girls 4.2% slower, boys 0.4%). That disagreement is what pulls those days to Medium confidence.
- **A rating is a percentage, applied in proportion** (adjusted = time ÷ e^rating), so a 17:00 runner and a 26:00 runner get the same share taken off. It's shown in seconds for that day's typical 5K time.
- **Season-long drift is removed from the ratings.** A team getting fitter all season and courses getting easier all season look identical in the data. Without this step the ratings soaked up the team's improvement (Appleton West +4.1%, Waupaca −2.8%), which would hide fitness, the opposite of the goal. So the trends carry the season-long change and the ratings carry the day-to-day bumps.
- **Early season is capped:** with only 3 rated race days in a season, every rating is Low confidence; with 4, at most Medium ("early season" in the line).
- **Other distances count** (3000–10000 m), converted to a 5K equivalent (Riegel exponent 1.06), so a 2-mile or 4K race still informs the trends and gets a rating.
- **Race tags (Heat, Mud, Wind) stay in the ratings,** since they're exactly what a rating measures; they still stay out of trends while "Leave tagged results out of trends" is on. Other runner tags (Fell, Shoe issue…) follow that switch, as before.
- **Two meets on one date stay separate** ratings; otherwise a date is one race day (official and hand-timed lists of that day together, official preferred per runner).

**Known issues (3.1.0):**
- Ratings move a little as each new meet is added (every day is rated against the whole season's trends). Early-season ratings are the least settled; the cap shows that.
- Most 2026 ratings are Medium: high school results vary 2.5–4% from race to race, so ±0:20–0:30 is honest for 12–14 runners.
- A 2.x/3.0 phone in the team still shows the old course-adjusted numbers until it updates; nothing saved differs.

## 3.2.0: race weather from Open-Meteo (Tue 10/6)
Weather data by Open-Meteo.com (free for non-commercial use, no key, CC BY 4.0; the attribution shows wherever weather does). CLAUDE.md rule 12: the no-fetching rule is about results sites (athletic.net and the like), not this public weather API. Checked against the newest backup (10/5, 2:07 PM; not in the repo).

**1. Course locations**
- ✅ 3.2.0. Every course (and every middle school meet without a course) gets a location once, in one sheet: **Settings > Weather > Race locations** (also Data health and the gear badge). Suggestions come from Open-Meteo's geocoding (town level, which is what weather needs), each with a Map link; Confirm, Confirm all, type a town, "I'm here" (this phone), or Skip. Shared with the team once the 3.2.0 rules are published.
- ✅ 3.2.0. Race Mode setup: "Weather: use this phone's location at the gun" (asks permission when switched on). At the gun the phone's position is saved for that race; the gun never waits for it.

**2. Weather for every race**
- ✅ 3.2.0. Hourly weather at the race's place, from the gun (a hand-timed race's taps), else the meet's scheduled time, else a typical start, averaged over the race (to the slowest finish). Stored: temperature, feels like, dew point, humidity, wind and gusts (highest), rain during the race, rain in the 48 hours before, cloud cover, in °F, mph and inches.
- ✅ 3.2.0. Backfill for every past race in the app, imported history back to middle school included (each place's races in one request per season).
- ✅ 3.2.0. New races fetch by themselves after the gun (once the race is over). With no signal the time and location are saved and the weather is filled in when the phone is back online.
- ✅ 3.2.0. Kept with the race for good (a past date never changes): works offline afterward, and shared with the team.

**3. Automatic flags** (icon + word, never colour alone)
- ✅ 3.2.0. Warm: temperature + dew point ≥ 130. Hot: ≥ 150. Cold: ≤ 35°F. Windy: sustained ≥ 15 mph. Likely muddy: ≥ 0.5″ of rain in the 48 hours before, or rain during the race. All adjustable in Settings > Weather.
- ✅ 3.2.0. On races, meet headers, runner cards (races and season chart) and the Team charts and tables.
- ✅ 3.2.0. Context only: never leave a result out of anything, separate from coach tags. Tap a flag to dismiss it for that race day (Undo; "n dismissed · show").

**4. Weather in comparisons**
- ✅ 3.2.0. Race-day difficulty = weather + course. The heat part follows the published temperature + dew point guide; wind, mud and cold costs are fitted to your race days. Each race day says "Weather explains 0:43 of it; course and everything else −0:07" (Data > Meets, top of the meet; Data > Team > Race-day ratings).
- ✅ 3.2.0. Same meet across years: "Weather at this meet, year by year", side by side with flags (inside each meet).
- ✅ 3.2.0. Data > Team: flags on the season chart (a band of icons above it, with the key) and in the meet table.

**5. Tests**
- ✅ 3.2.0. `tests/e2e27.js` (a fake Open-Meteo answers every request): locations, backfill (high school, middle school, forecast vs archive, a night meet, rain before), stored and never fetched twice, team sharing to a phone without the weather service, flags at each threshold and adjustable, dismiss and Undo, the attribution wherever weather shows, charts with flags, the weather's share of ratings, phone location at the gun, offline and failing fetches never blocking a race. Rules: 21 new cases (313 in all).

**2026 meets: weather and flags** (from the newest backup; the locations are the suggestions, so confirm them in the app):

| Meet | Place | Window | Weather | Flags |
|---|---|---|---|---|
| Appleton West Terror Invite 8/28 | Winagamie GC (Neenah) | 8:30–9:30 AM (schedule) | 69°F, feels 72°, dew 63° (131), 81%, wind 2 mph, gusts 5, no rain, 2% cloud | ☀️ Warm |
| Kiel Raiders Invite 9/3 | Kiel | 4:00–5:00 PM | 81°F, feels 89°, dew 71° (152), 73%, wind 1, gusts 5, no rain (0.02″ before), 25% cloud | 🔥 Hot |
| Nightfall Classic 9/11 | Winagamie GC (Neenah) | 7:45–8:43 PM | 69°F, feels 69°, dew 59° (128), 70%, wind 8, gusts 18, no rain, clear | none (128 is just under Warm) |
| Smiley Invitational 9/19 | Wausau | 8:00–9:00 AM | 57°F, feels 56°, dew 56° (113), 97%, wind 8, gusts 21, no rain (0.31″ before), overcast | none (0.31″ is under 0.5″) |
| Jim Bremser Memorial 9/24 | Mishicot | 4:30–5:28 PM | 66°F, feels 65°, dew 57° (122), 73%, wind 7, gusts 8, no rain, 9% cloud | none |
| Waupaca Invitational 10/1 | Waupaca | 5:00–6:00 PM | 65°F, feels 62°, dew 51° (115), 61%, wind 6, gusts 16, no rain (0.30″ before), 98% cloud | none |

Brillion (10/8) and later meets aren't in the 10/5 backup; they fill in after they're run.

**What the weather explains of each 2026 race-day rating** (weather explains 30% of how the 2026 ratings vary):

| Meet | Rating | Weather | Course and everything else |
|---|---|---|---|
| Appleton West 8/28 | 0:31 harder | +0:03 | +0:28 |
| Kiel 9/3 | 0:35 harder | +0:43 (the heat) | −0:07 |
| Nightfall 9/11 | 0:47 easier | −0:02 | −0:45 |
| Smiley 9/19 | 0:22 easier | −0:17 | −0:05 |
| Jim Bremser 9/24 | 0:18 harder | −0:10 | +0:28 |
| Waupaca 10/1 | 0:14 easier | −0:15 | +0:01 |

So the two Winagamie layouts really do differ: after the weather, Appleton West's course ran 0:28 hard and Nightfall's 0:45 easy. Kiel was hard because of the heat, not the course. (The ratings themselves moved from 3.1, since a hot or warm day now keeps its weather instead of having it treated as season-long fitness: Appleton West +0.8% → +2.2%, Waupaca +0.3% → −1.0%.)

**Couldn't be matched to a location** (no town in the name; type one in Race locations, or Skip):
- Red Raider Invite (HS): 9/28/2023, 10/3/2024
- Valley Bay conference meet (MS, rotating host): 10/7/2021, 10/6/2022, 10/10/2023, 10/15/2024, 10/7/2025
- Time trials (MS, one place for all; probably home): 9/14/2020, 8/30/2021, 10/2/2021, 8/29/2022, 10/11/2022, 8/28/2023, 10/4/2023, 9/3/2024, 10/16/2024, 9/4/2025
- Wisconsin Middle School Cross Country (MS state): 10/9/2021, 10/8/2022, 10/7/2023, 10/12/2024
- Check: Milwaukee River Invite (8/29/2024) was suggested as Milwaukee; the meet may be elsewhere.

**Decisions made (3.2.0):**
- **Town-level locations.** Open-Meteo's grid is a few miles wide, so the town is as good as the exact course, and town names can be looked up and checked on a map. A suggestion is never used until confirmed; Skip means no weather there.
- **Weather is a team collection** (`weather`, one record per race day and place) instead of edits on each saved race: official history can only be edited by an admin, and one record per day serves every race that day. Locations are their own collection too (`places`), since older phones rewrite course documents without unknown fields.
- **Start times:** the gun when the race was hand-timed, else the meet's scheduled time, else weekdays 4:30 PM / weekends 9 AM. A meet with several races after one scheduled start gets 30 more minutes.
- **Gusts are the highest during the race,** not the average; everything else is the average.
- **"Rain during the race"** = any measurable rain (0.01″ or more).
- **Heat follows the published temperature + dew point guide** (Mark Hadley: 130 → 2% slower, 150 → 4.5%) and isn't fitted, since a season has only a handful of hot days. Wind, mud and cold are fitted to your race days, pulled toward typical values (worth 6 race days).
- **The weather part isn't flattened across the season** (only the course part is), so a hot September and a cool October show as weather, not as fitness.
- **Dismissed flags are shared with the team** (stored with the weather record) and can be shown again.
- **Thresholds are per phone** (Settings), like the other display settings.
- **The phone-location switch is a switch-style button** (role="switch"); a checkbox there upset tapping in race setup in the test browser.

**Known issues (3.2.0):**
- **Open-Meteo's archive server (anything older than about 85 days) wasn't answering from this Mac today**, so only the 2026 meets have weather so far. The phone tries again by itself (with a growing wait, and at once when it comes back online); 2020–2025 fill in when the archive answers. Until then those races say "Weather: waiting…".
- The 2025 and earlier ratings don't use weather yet for the same reason.
- Until the 3.2.0 rules are published, locations and weather stay on the phone that confirmed or fetched them.
- Phones on 3.1 and earlier don't show weather.

## 3.3.0: shared live stopwatches across coach phones (Tue 10/6)
Rollback tag before this: `before-3.3.0` (= 3.2.0).

**Step 0: what happened at practice.** Shared stopwatches did **not exist** in 3.2.0 (or any earlier version): sync.js said "Stopwatches never touch the network", the rules had no collection for them, and CLAUDE.md listed a "live stopwatch board" as an idea not built. So the unpublished 3.2.0 rules were **not** the cause: each phone only ever showed its own stopwatches. They're built in 3.3.0.

1. ✅ 3.3.0. **Every stopwatch is shared on a team** (individual and group): start, laps, splits, reps, rest, Stop, Keep timing, Start over (and its Undo), Undo last tap, Remove (and its Undo), Start all, Stop all, Clear finished. On every coach's phone within about 2 seconds (in the test: under 2 s on the emulator).
2. ✅ 3.3.0. **Same clock on every phone:** times are kept in server time with the same clock-offset measurement Race Mode uses; each tap is corrected by the tapping phone's offset. A phone whose clock is 37 s wrong shows the same time (test: within 0.3 s).
3. ✅ 3.3.0. **Any coach can tap Lap**; each lap shows who tapped it. Two coaches within 2 s: one lap, the earlier counts; the lap list shows "also Coach Cal (+0.4 s) · use this" to choose the other.
4. ✅ 3.3.0. **Offline:** the phone keeps timing and its taps show at once; they sync on reconnect with the time they were tapped. Others see "Coach X offline" (a coach who tapped today and hasn't been heard from for 2½ minutes). A reload or auto-update mid-workout rebuilds every clock and lap.
5. ✅ 3.3.0. **Show** at the top of the Stopwatches tab: All, or chosen groups, runners and other stopwatches; this phone only, remembered.
6. ✅ 3.3.0. **Data safety:** taps are append-only (Undo and "use this" add versions; nothing is overwritten or deleted), a removed stopwatch is a soft delete with Undo and Recently deleted, Start over keeps the old taps (its Undo goes back to them). Writes happen only on taps, plus one "I'm here" a minute while a shared clock runs.
7. ✅ 3.3.0. **Rules changed:** `firestore.rules` 3.3.0 adds `watches` and `wevents` (25 new emulator cases, 338 in all). On your clipboard. **Publish only after Settings > Team says every phone is on 3.3.0.**
8. ✅ 3.3.0. `tests/e2e28.js`: three phones (C's clock 37 s fast): a start on A appears on B and C; laps from B and C everywhere, with names; taps 0.4 s apart merge, both kept, the other can be chosen; C offline keeps timing and syncs later; a reload mid-workout keeps everything; an 800 × 3 with rest runs the same on all three (the next rep starts by itself everywhere); Stop / Keep timing / Undo / Start over + Undo / Remove + Undo on every phone; times match within 0.3 s; "Coach Ben offline"; Show; nothing written while clocks just run.
9. ✅ **Three-phone check at practice (5 minutes):**
   1. After publishing the rules, all three coaches reopen the app. Settings > Team: everyone on 3.3.0, Synced.
   2. Coach A: + > Workout, pick 2–3 runners, the 800 workout, One for the group, Start now. Within 2 s the tile is running on B and C with the same time (hold the phones side by side).
   3. Coach B taps Lap, then Coach C taps Lap. Both laps on all three phones, each with the coach's name.
   4. B and C tap Lap at the same moment: one lap. Open the lap list: "also Coach … · use this".
   5. Coach C turns on Airplane mode, taps Lap twice (the clock keeps running), turns it off: the laps appear on A and B. A and B see "Coach C offline" after about 2½ minutes offline.
   6. Coach B force-quits and reopens the app: same clock, same laps.
   7. Coach A: ⋯ > Stop, then ⋯ > Start over: waiting on all three. Undo on the tile: the laps come back everywhere.
   8. On one phone: Show > pick one group: only that phone hides the others. Show > All.

**Decisions made (3.3.0):**
- **A stopwatch is its taps.** Each phone rebuilds it from the tap history through the same timing engine (a virtual clock), so all phones agree without anyone overwriting anyone; Undo and "use this" are new versions of a tap. The engine's math didn't change; it now reads the time through one function so a replay can use the tap's time.
- **Start over is a new epoch** (the old taps stay; Undo goes back to them), so another coach's late tap on the old run can't land in the new one.
- **Merging is only across coaches** (one coach's two quick taps both count), within 2 s, earlier counts.
- **"Coach X offline"** needs to know who's alive, so a phone with a running shared clock writes "I'm here" once a minute (the only write that isn't a tap). Offline = not heard from for 2½ minutes, and only for coaches who tapped today's stopwatches.
- **Only the last two days load** (field `day`), so a season of practices never slows the app; a stopwatch touched again moves to today.
- **Existing stopwatches join the team by themselves** (their times so far become taps), so a coach who joins mid-workout shares what's running. Idle stopwatches from before joining (like a new phone's three demo cards) stay on that phone until they're started, so joining never drops clutter on every coach; anything made after joining is shared at once.
- **Show is per phone** (what this coach is timing), never changes other phones.
- **Plans travel as text** inside the Start tap (Firestore can't store the plan's nested lists), so every phone runs the plan the starter saw, even effort-based ones.

**Known issues (3.3.0):**
- Until the 3.3.0 rules are published, each phone times on its own (as in 3.2); after publishing, reopen the app on each phone.
- Phones on 3.2 or older in the team don't see or send shared stopwatches.
- More than 30 stopwatches across all coaches: the 31st isn't added on a phone that already has 30.

## Standing rules (from your requests)
- ✅ Rollback tags before each phase (`before-2.13.0`, `before-2.14.0`, `before-3.0.0`) and data that older versions can read (CLAUDE.md rule 11, How to roll back), since 2.13.0.
- ✅ Pushing on a meet day is allowed since 2.8.1 (CLAUDE.md rule 8); `tests/meetday.sh` only reports it.
- ✅ Every suite in `tests/` passes before any push (`tests/run.sh`, CLAUDE.md "Testing").

## Missed or partial (summary)

As of 2.9.0, nothing is ❌ Missed. Remaining 🟡:
1. **2.4.0 and 2.5.0 were pushed on a meet day** (Thu 10/1 evening). That's allowed now (since 2.8.1).
2. **Publishing the rules file (2.9.2) is your step** (2.9.0 is published). It's safe any time (it only adds Varsity/JV edits and merged runners), and it's needed for merges to reach every phone (the "Ben To." cause, 2.12.0).
3. 2.8.0 gaps 3 (raw beside adjusted), 4 (tagging during a live race, tag history in the time editor) and 5 (badge test) were closed in 2.8.1.
