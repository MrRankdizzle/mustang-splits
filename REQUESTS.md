# Requests and status

Every request from 2.4.0 on, checked against the code, `git log`, `version.json` and CLAUDE.md (not memory).
**Updated with every push.** Last update: Thu 2026-10-29, the CLAUDE.md split (docs only; the live app is still 3.17.0).

**Live on Vercel:** 3.17.0 (`version.json` and `APP_VERSION` say 3.17.0). **Rules file:** 3.6.0 (first line of `firestore.rules`): 3.2.0 plus shared stopwatches (3.3.0), meet `notAttending` (3.5.0), and split taps and headers (3.6.0). Published: 3.2.0 (Tue 10/6). **Publish 3.3.0 once Settings > Team shows every phone on 3.3.0** (until then each 3.3.0 phone times on its own, as before; reopen the app on each phone after publishing).

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
| 3.3.0 | Tue 10/6, 7:36 PM | `45e9d73` |
| 3.3.1 | Tue 10/6, 8:11 PM | `839a8ad` |
| 3.4.0 | Tue 10/6, 11:07 PM | `5773663` |
| 3.5.0 | Wed 10/7, 5:56 AM | `01b5d24` |
| 3.6.0 | Wed 10/7, 9:54 AM | `b9ce5ac` |
| 3.6.1 | Wed 10/7, 1:23 PM | `e85bdb0` |
| 3.7.0 | Sun 10/11, 4:06 PM | `e3b83f6` |
| 3.8.0 | Sun 10/11, 4:46 PM | `8974a8b` |
| 3.9.0 | Sun 10/11, 5:27 PM | `7023f36` |
| 3.10.0 | Sun 10/11, 7:33 PM | `c960147` |
| 3.11.0 | Sat 10/17, 4:05 PM | `83a03f4` |
| 3.12.0 | Sat 10/17, 4:54 PM | `60fa44d` |
| 3.13.0 | Sat 10/17, 9:13 PM | `cbc2502` |
| 3.14.0 | Wed 10/21, 6:16 AM | `ec78816` |
| 3.15.0 | Wed 10/21, 12:56 PM | `56a7e22` |
| 3.16.0 | Wed 10/21, 2:51 PM | `2b686a5` |
| 3.17.0 | Wed 10/21, 9:36 PM | `0314361` |

**Status key:**
- ✅ Live (version, and where it is in the app)
- 🟡 Live with a gap (the gap is described)
- 🔧 Built but not pushed
- ⏳ Planned (waiting for your go-ahead)
- ❌ Missed

Nothing is 🔧 Built but not pushed: the working tree matches the live version, except the uncommitted plan files (`plan-2.6-2.7.md`, `plan-2.7.1.md`, `plan-2.8.0.md`).

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

**Technical notes (Tiles (2.13)), moved from CLAUDE.md on 2026-10-29; later versions replaced this design:**
- **Tiles** (`cardHTML()`): title (`tileName()`), ⋯, the time, one small line (rep, next target), the last split vs target with colour, shape and a word (`SHAPE_OF`: ▲ behind, ▼ too fast, ● on pace), then Lap (primary, `big-btn`) + Stop. Stop asks on the tile ("Tap again to stop", 3 s, the `ARM` guard). Undo stays on the tile: ↶ for a lap, Keep timing after Stop, a `.t-undo` strip after Start over (`tileUndo()`, `TUNDO`, 8 s), and a removed tile stays as "Removed X · Undo" for 8 s. Gone from the tile: the lane graphic, rep dots, workout name, basis line (it's in ⋯ > Targets), "No workout (just a stopwatch)". `updateLive()`'s timing math is unchanged; only its text changed.

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

## Docs: CLAUDE.md split into docs/ (Thu 10/29)
No app change and no version bump: `app.js`, `version.json` and every other app file are untouched, so phones see nothing new (a bump would only show the Update banner for nothing).

1. ✅ docs only. **CLAUDE.md is short again** (about 24k characters, was 161k, over the size limit): what the app is, stack and deploy, the files and a map of `app.js` / `sync.js` sections, every permanent rule word for word (Rules for every change 1–12, How to roll back, Testing), the other standing rules (real data never in the repo, salts, timing, HIG and phone rules) and an index of the reference files with when to read each.
2. ✅ docs only. **Everything else moved word for word** into 14 files in `docs/`: timing-engine, stopwatches, race-mode, sync-and-rules, data-safety, training-and-paces, roster, data-and-charts, import, meets-and-schedule, weather, ui, architecture, testing.
3. ✅ docs only. **Designs that later versions replaced** (the 2.13 tiles, the 3.6 fixed tiles, the 3.6.1 tiles) moved into this file under those versions as "Technical notes".
4. ✅ docs only. **Nothing lost:** the old file is kept at `docs/archive/CLAUDE-before-split.md`, and `docs/archive/split-map.md` lists every part of it and where it lives now (a script checked that every line of the old file is in the new files).

## 3.17.0: Stopwatches rebuilt around one labeled action button per row (Wed 10/21)
Rollback tag before this: `before-3.17.0` (= 3.16.0). **No rules change** (nothing to publish). Nothing saved changes shape: new per-phone settings `compactRows` and `lastPick`; the 3.6–3.16 `compact` (two columns) stays in the data, unused, so a rollback to 3.16 reads everything (it would show one column until two columns is switched on again).

**Cause of the clipped time** (your screenshot, "0:04.6" losing the bottom of its digits): a 3.15/3.16 row had a fixed height in rem, but its padding and gaps were in px, and its lines sat in a flex column where the time's line hid its overflow. When the lines added up to more than the row (two columns at the smaller iOS text sizes, a name wrapping onto a second line), flexbox shrank the time's line and cut the bottom off the digits (measured: 2.2 px at 14 px text in two columns, plus 39–95 other names and status lines cut off with "…" in that build). Since 3.17 no line can shrink: each line has its own fixed height, the row's height comes from its lines, nothing around the time clips, and every text is fitted to its width instead of being cut.

1. ✅ 3.17.0. **Rows** (*Stopwatches tab*): one column, full width, at least 72 pt (98 pt at the default text size). Each row: the team colour bar (pink Girls, blue Boys, both for a mixed group), the name (a group: "Group 1 · 3"), the large time with the rep count beside it ("Rep 2 of 4"), and one status line ("400m target 1:12 · due in 0:08", "+3.9 past target", after a lap "Rep 2 · 400m · 1:12.4 · −0.6"). **Compact rows** (Settings > Display and sound, about 58 pt: name and time on one line) replaces "Two columns".
2. ✅ 3.17.0. **The action button**: on the right of every row, a third of its width and its full height, always labeled: **Start**, **Lap** ("at 400m" under it), **Go now** (during rest, "rest 0:45" under it; rest still ends by itself), **Done** (and **Stopped**) with an off look. Only this button records times: the touch-down time, committed on lift if the finger moved under 10 px, a second tap on the same button within 1.5 s ignored ("Double tap ignored" in the status line). No other tap guards.
3. ✅ 3.17.0. **The rest of the row opens its sheet**: Undo, Stop / Keep timing / Start over, Assign a runner… or Change runner…, Change workout, Targets…, Send runners now… and Split runners… (groups), Rejoin group, Share with coaches, Rename, Remove, and every lap. **Swipe left** for Stop and Remove, each with Undo in the row.
4. ✅ 3.17.0. **Undo**: after each lap a small **Undo** link at the left end of the status line for 6 s (186 px from the action button at 390 pt), with a 44 pt touch area; also after Stop, Start over, a split or a rejoin (8 s); always in the row's sheet.
5. ✅ 3.17.0. **+ opens a runner picker first**: search, Girls and Boys with Select all, tap to select (iOS check circles; runners already on a stopwatch dimmed), One per runner / One group, an optional workout, Share with coaches, **Start N stopwatches** or **Add without starting**. "Same runners as last time (n)". Below it, small: Quick stopwatch (no runner) (now "Stopwatch 1", not "Runner 1"), Workout with pace groups…, Race…. Any stopwatch without a runner gets **Assign a runner…** in its sheet (it takes the runner's name and keeps timing). The empty tab has "Choose runners".
6. ✅ 3.17.0. **Header**: "Workout name · 9 stopwatches", then small buttons on one line: End workout, Show: All, and on the right Start all n waiting (or Stop all n when nothing is waiting). Shorter words at large text sizes.
7. ✅ 3.17.0. **Nothing clipped**, with a test that fails if any text is larger than its box, spills out of it, or has glyphs outside its line box or any clipping box: every row state (waiting, running, due, late, resting, stopped, done, split-off, long name, long mark, Undo showing, Edit mode, swiped), text sizes 14, 17, 21, 23 and 28 px, regular and Compact rows, 390 × 844, in WebKit and Chrome (`tests/e2e46.js`). Run against 3.16 it finds the cut time.
8. ✅ 3.17.0. **Tests**: `tests/e2e44.js` (real touch input, two coach phones): a tap storm across 10 rows while the other coach laps 10 times a second (60 taps, every one a lap on its own row at its touch-down time, within 1.3 ms in the final run), scrolling and sideways swipes record nothing, double taps record once, the Undo link, no row moves or resizes through laps, rest, Go now, remote taps and a split. `tests/e2e46.js` also checks the button, Undo, the sheet, swipe Stop / Remove with Undo, and the runner picker (named stopwatches, "Group 1", Same runners, Quick stopwatch, Assign a runner). Updated: e2e7, e2e10, e2e23, e2e25, e2e28, e2e29, e2e30, e2e32, e2e33, `tools/tilestates.js`, `tools/phones.js`; e2e34 (3.6.1 tiles) retired.
9. ✅ 3.17.0. **Screenshots** (fake names): `docs/screenshots-stopwatch-v2/` before (3.16: rows, two columns, 14 px, 23 px, the ⋯ menu, + New) and after (every row state light and dark, Compact rows, 14 px and 23 px, the row's sheet running and resting, a swiped row, the picker empty, Girls selected, One group, with busy runners).
10. ✅ Checked on your 10/5 backup (in the scratchpad, never committed): all 14 runners picked with Select all and started as 14 named rows at 17 and 23 px, regular and Compact: nothing cut off in the picker or the rows, one row height each, no page errors; one name shows as "First L." at 23 px in Compact rows.

### Decisions (3.17.0)
- **The rep count sits beside the large time**, not in the status line: at 390 pt the status line holds about 24 characters, so "Rep 2 of 4 · 400m target 1:12 · due in 0:08" can't fit; the mark is also on the button ("at 400m"). In Compact rows it leads the status line.
- **Text is fitted, never cut**: the longest wording that fits, then a slightly smaller font (to 80%), then the shortest wording as small as it takes. Runner names shorten to "Maya L." then "Maya"; other names lose words from the end with "…" ("Waiting group…").
- **Stopped** is a fifth button state (off look, records nothing), like Done; Keep timing is in the sheet.
- **Remove works while running** (sheet or swipe), with Undo: the row stays as "Removed … · Undo" for 8 s; its times go to Recently deleted.
- **Stop from the sheet or swipe has its own Undo** that takes the stop back as if it never happened (shared stopwatches: the stop tap gets a removal version, append-only).
- **No press and hold** any more (the sheet is one tap away); the swipe shows Stop (running only) and Remove.
- **One bulk button**: Start all n waiting, or Stop all n when nothing is waiting (never both), so the header stays one line.
- **Groups from the picker are "Group 1", "Group 2"…**; one per runner is named after the runner.
- **Quick stopwatch is "Stopwatch n"** (it has no runner); assigning a runner renames it.
- **Compact rows is a new setting** (`compactRows`), so the old two-column setting stays as it was for a rollback.

### Known issues (3.17.0)
- A very long name a coach typed (not a runner's) loses words at the largest text sizes ("Waiting group…"); the full name is in its sheet's title.
- Phones on 3.16 show the same shared stopwatches with the old rows until they update; taps from either version land the same way.
- Headless browsers can't reproduce iOS fonts exactly; the fit test runs in WebKit and Chrome with 1–2 px of margin. Check one row at your text size on the phone.

### 10-minute practice drill (3.17.0)
1. **Picker (1 min):** + → search a name, then Girls Select all, then One per runner → Start. Every row is named after its runner with a pink bar. + again → "Same runners as last time" is there only after they're cleared.
2. **Lap and double tap (2 min):** tap Lap on one row: one lap, the status line shows it with its difference, and Undo appears at the left. Tap Lap twice quickly: one lap and "Double tap ignored". Scroll the list by dragging on a Lap button: no lap.
3. **Undo (1 min):** after a lap, tap Undo at the left of that row: the lap is gone. Wait 6 s after another lap: Undo is gone and the spot opens the row's sheet.
4. **Rest (2 min):** start a group on a workout with rest: the button says Go now with the countdown. Let one rest end by itself, and tap Go now early on the next. Swipe the group left: Stop and Remove; tap away to close.
5. **Sheet (2 min):** tap the name area of a row: the laps, Undo, Stop. Stop it, then Undo in the row: it keeps running from the same time. In a group's sheet during rest, Send runners now.
6. **Quick stopwatch (1 min):** + → Quick stopwatch (no runner): "Stopwatch 1" starts. Tap its row → Assign a runner… → pick one: it takes the name and keeps timing.
7. **Text size (1 min):** Settings > Display and sound > Compact rows, then iPhone Settings > Display & Brightness > Text Size one step bigger: nothing is cut off, every row the same height. End workout.

## 3.16.0: Paces menus, Start workout from the paces, private stopwatches (Wed 10/21)
Rollback tag before this: `before-3.16.0` (= 3.15.0). **No rules change** (nothing to publish): a private stopwatch is simply never sent to the team, so the 3.6 rules already cover everything. Nothing saved changes shape: new fields `w.share` on a stopwatch, and per-phone settings `shareWatches` and `wkMine`; older versions ignore them. The 3.15 stopwatch rows (one-tap rows, touch-down time, double-tap rule) are unchanged; 3.15 was already pushed, so nothing was left to finish.

1. ✅ 3.16.0. **Team training paces: two pull-down menus instead of the chip rows** (*Training tab*). "Distance: 400 m ⌄" and "Effort: 5K ⌄" side by side (stacked at very large text), iOS pull-down menus with section headers and a ✓ on the current choice, both remembered.
   - **Distance:** Short (100, 150, 200, 300), Middle (400, 500, 600, 800), Long (1000, 1200, Mile, 2000, 2 miles), Time (1, 2, 3, 5 min), Custom… (the stepper).
   - **Effort, slowest to fastest:** Aerobic (Easy, Long run), Steady (Threshold, CV), Fast (Interval (VO2max), Repetition), Race paces (5K, 2-mile, Mile, Goal 5K).
   - **No sideways scrolling anywhere on the Training tab**, tested at 320 and 390 pt and at two large text sizes. That also fixed two older overflows at the largest text size: the "today's goal" buttons and "Show all", and the tab bar labels.
2. ✅ 3.16.0. **Start workout from the paces screen.** A **Start workout** button under the title opens one sheet: the suggested reps and rest for that distance and effort ("6 × 800 m at CV pace, 0:45 rest"), a one-line reason ("CV: 800–2000 m, 45–90 s rest, up to 3 miles in all (Schwartz)"), steppers for reps and rest, rest as **Time** or **Jog** (meters), the total, and the Share switch. **Choose runners** opens the runner step (Select all, Girls, Boys) and then the groups step with the list's pace groups already suggested (Girls and Boys separately). **Start now** gives every stopwatch its runner's own target per rep from the engine (a group runs on its middle runner, as before).
   - **The rules** (Daniels for R, I, T and E; Tom Schwartz for CV; set for high school) and their sources are in `docs/training-rules.md`, with 32 worked examples that `tests/e2e45.js` checks against the app.
   - **Your own numbers are remembered** per distance and effort on this phone ("Your own numbers (remembered)", with "Back to the suggestion").
   - On your 10/5 backup: every distance × effort (130) gives a sheet equal to the rule, no sideways scroll in any of 600 selections at normal and large text, 14 runners → 9 stopwatches for 800 m at CV, every target equal to the engine.
3. ✅ 3.16.0. **Sharing training stopwatches is opt-in.**
   - **Private by default:** a new stopwatch stays on this phone.
   - **"Share with coaches"** switch (remembered) on + New, the empty Stopwatches tab, the workout flow's last step and the Start sheet; ⋯ > **Share with coaches** shares one later, with its laps so far.
   - **Shared workouts** show at the top of every coach's Stopwatches tab under "Shared workouts" (with "On this phone" above the rest), within a second (0.3 s on the emulator; tested under 2 s), with no joining step. Any coach can start one and tap laps, with the same clock, the double-tap rule and offline behavior as before. Private stopwatches never leave the phone (tested: started and lapped, never on the other phone).
   - **Already shared stays shared** until ended: every stopwatch shared under 3.15 and any shared one, even after the switch is turned off or the app reloads.

**Decisions made (3.16.0):**
- **Pull-down menus, not a picker wheel or a sheet:** the iOS pattern for "choose one of a short grouped list" from a button; one tap to open, one to choose. They close on a tap outside, a scroll, a sheet or a tab change.
- **Start workout is off for Time choices (1–5 min)** and says why: a stopwatch's rep needs a distance.
- **High school limits:** Daniels' weekly percentages for a runner at about 30 miles a week (R ≈ 2.4 km, I ≈ 4 km, T ≈ 3 miles), CV and race-pace sessions about 3 miles of fast running. **The session limit wins:** a distance longer than the limit gets one rep (a mile at repetition pace = 1 × mile). **Repetition and Interval rest stay within 1:00–5:00.** Easy and Long run are one continuous run (5 km / 10 km unless the chosen distance is in their range); Threshold at 2 miles or more is one continuous tempo. A distance outside an effort's usual range still gets a suggestion, and the reason says it is short or long for that effort.
- **Rest times use the middle runner of the list** (by that effort's pace). A **jog rest** is timed at that runner's easy pace and ends by itself like any rest; tap the row ("next rep now") when they go.
- **Only numbers that differ from the suggestion are remembered**, so improved suggestions still reach unchanged combinations.
- **The started workout is an ordinary workout** (reused when the same one exists), so it shows in the workout list and older versions read it.
- **Practice history still goes to the team** when a workout is ended on a team (as since 2.0), private stopwatches included: the history is the coaching record; "private" is about the Stopwatches tab. End workout now asks "End for all coaches?" only when shared stopwatches are on the phone, and says which ones it clears everywhere.
- **Another coach's new shared workout waits** until nobody has touched the screen for 1.5 s, then slides in above "On this phone", so no row moves under a finger.

**Known issues (3.16.0):**
- **Phones still on 3.15 share every stopwatch they make** until they update (they do by themselves when no clock runs). Their stopwatches show under Shared workouts on 3.16 phones.
- A **Goal 5K pace** workout uses each phone's own goals (goals are per phone since 3.14); a 3.15 phone shows such a workout without targets (stopwatch only).
- A jog rest's length is an estimate for the middle runner; faster and slower groups still start the next rep when the coach taps.

**Phone checklist (3.16.0):**
1. Training tab > Team training paces: tap **Distance** and **Effort**; the menus open under the buttons with their headers, a ✓ on the current choice, and nothing scrolls sideways (also with a larger text size: iPhone Settings > Display & Brightness > Text Size).
2. Pick 800 m and CV, tap **Start workout**: "6 × 800 m at CV pace, 0:45 rest". Change reps to 5 and rest to 1:30, Choose runners, Cancel. Start workout again: 5 × 800 m, 1:30 is back with "Back to the suggestion".
3. Choose runners > Select all > Next: pace groups are suggested (girls and boys apart). Start now: each row's target matches that runner's 800 m at CV pace in the list.
4. **Two coaches** (both phones on 3.16, Settings > About): on phone A, Start workout with **Share with coaches off**: phone B's Stopwatches tab shows nothing new. On phone A, + New > Quick stopwatch with **Share with coaches on**: within a second phone B shows it under **Shared workouts**. Tap it on phone B to start, lap on A, then lap on B more than 2 s later: both laps show on both phones with the coach's name. Turn the switch off on A and lap again: it still reaches B. End workout on A: "End for all coaches?" names the shared one.

## 3.15.0: Stopwatch rows: one tap always does the right thing (Wed 10/21)
Rollback tag before this: `before-3.15.0` (= 3.14.0). **No rules change.** Nothing saved changes shape (new per-phone settings only: Click on each tap). Shared stopwatches, splits, effort targets and the data-safety rules work as before; the timing engine (`ACT.split`, rest in `tick()`) is unchanged: a lap now just carries the touch-down time.

**What made taps fail at the track (found in the 3.14 code before changing anything):**
1. **Small targets and decoys.** Only the Lap/Start button timed anything; most of the tile did nothing (the clock, the status line) or something else (the name opened Rename, the lap list opened a sheet, ⋯ the menu). A tap a little off the button was lost, or it opened a sheet that then took the next taps.
2. **Two-tap Stop next to Lap.** A thumb on Stop cost the lap and armed "Tap again to stop"; a second stray tap stopped the clock.
3. **Buttons rebuilt under the finger.** Every update rebuilt the tile: your own lap, the lap note ending after 4 s, Undo ending after 8 s, another coach's tap, the rest ending. The protection covered one finger, lapsed after 2 s, and released just before iOS delivered the tap, and iOS then delivers the tap to whatever is under the finger by then:
   - the rest ending by itself turned "Next rep now" into "Lap" under the finger (a lap at the start of the rep);
   - the last lap of a rep turned Lap into "Next rep now" in the same spot (a double tap at the line skipped the rest);
   - during a group's rest the lap area turned into runner-name buttons (a tap meant for the laps split a runner off).
4. **Tap guards.** Every tile that moved (a split, another coach adding or removing a stopwatch) ignored taps for 0.4 s.
5. **Tap vs scroll.** Actions waited for the browser's click: iOS sends no click for a tap that stops a scroll, or when the finger drifts a little; buttons also shrink while pressed, so a touch at the edge could lift outside.
6. **Late timestamps.** The lap time was taken at the click, 0.1–0.3 s after the finger touched (more on a busy phone).
7. **Things covering or pushing the tiles.** The Undo bar covered the bottom tiles; a mis-tapped sheet covered the grid; Edit mode turned taps into selections; and (found while testing 3.15) the bar above the tiles changed height when "Start all" appeared or went, and the Update, Install and race banners could appear above the tiles, moving every tile down mid-workout.
8. **Double taps** recorded two laps.

1. ✅ 3.15.0. **One tap always does the right thing** (*Stopwatches tab*).
   - **Each stopwatch is a full-width row** (about 105 pt tall) and the whole row is the tap target: waiting → start; running → lap; resting → start the next rep now (rest still ends by itself); finished or stopped → its details (the lap list, Keep timing, Start over). **Two columns** (Settings > Display and sound) keeps the same whole-tile tap.
   - **The time is taken the moment the finger touches**, and the lap is recorded when it lifts, unless it moved more than about 10 pt (then it was a scroll: nothing is recorded).
   - **No tap guards and no two-tap Stop on this screen.** A second tap on the same row within 1.5 s is an accidental double tap: ignored, and the row says "Double tap ignored".
   - **Instant feedback:** a brief flash on the row, the status line ("Lap 3 · 1:12.4", "Rep 2 · 400m · 1:12.4 · −0.6"), and an optional click (Settings > Display and sound > Click on each tap).
   - **Nothing moves or changes under a finger:** updates (the clock, another coach's taps, rest starting and ending) change text in place; rows never reorder or resize; a new stopwatch (also a runner split off from a group, or one another coach adds) goes at the end; a removed one keeps its place until nobody has touched the screen for a moment; the bar above the rows has a fixed height; the race banner sits below the rows; the Update and Install banners wait on other tabs.
2. ✅ 3.15.0. **Rows that help you anticipate.** Name (a group with its runner count, "Group 1 · 3"), the large time of the current rep, the rep and its target ("Rep 2/4 · 200m · target 0:40": each runner's own target from the effort engine), and a pill with an icon and words: "tap to start", "due in 0:08" (highlighted in the last 10 s), "+3.9 past target", "resting 0:45", "stopped", "done". Resting rows say "Tap when they go". Another coach's lap shows on the row with their name.
3. ✅ 3.15.0. **Secondary actions out of the way.** After each lap an **Undo** zone at the right end of the row for 6 s (8 s after Start over, a split or a rejoin), visually separate; otherwise that end is part of the row. **Press and hold** a row (or swipe it sideways) for Stop (one tap there), Keep timing, Start over, Undo, **Send runners now…** (big name buttons, one tap each, for runners leaving the rest early), Split runners…, Rejoin group, **Lap list**, Change workout / runners / Targets, Rename, Remove. Top of the screen: the workout's name, "Start all n waiting", End workout, Show.
4. ✅ 3.15.0. **Reliability tests** (`tests/e2e44.js`, real touch input, two coach phones): a tap storm (10 rows, the other coach lapping 10 times a second, taps in bursts at 20 a second: every tap one lap on its own row, timed at the touch-down frame within 1 ms, no row replaced, moved or resized); swipes across rows record nothing; a sideways swipe or a hold opens the menu; double taps record one lap; the Undo zone; the layout through a rep, rest, an early start, another coach's taps and a split; two coaches on different rows and the same row.
5. ✅ 3.15.0. **A 10-minute drill for two coaches** (below).

**Decisions made (3.15.0):**
- **Stop moved into the press-and-hold menu** (one tap there: opening the menu is the safeguard). A stopped row's tap opens its details with Keep timing, so a stray tap never restarts a clock.
- **Split-off runners appear at the end of the list** (3.6–3.14: right after their group), so no row ever moves under a finger. The new row says "Split from Group 1".
- **A removed row keeps its place** ("Removed … · Undo" for 8 s, or empty when another coach removed it) and closes up only after 1.5 s without a touch.
- **The double-tap rule applies to touches** (phones and tablets); a mouse click on a computer always counts.
- **The action is the one the row showed at touch-down.** If the row changed before the finger lifted (the rest ended by itself, another coach finished the rep), the tap records nothing and the row says why ("Rest ended: the next rep already started").
- **The trailing Undo zone is always there but only live after a tap**, so the row's layout never changes when it appears.
- **No lap list on the row** (the latest lap is on the status line; the whole list is in the menu), and no runner-name buttons on the row during rest (Send runners now is in the menu): both were decoys next to the main target.
- **During rest the large time shows the rep just finished**; the rest countdown is in the pill ("resting 0:45").
- **In two columns the pill uses the same words, shorter** ("due 0:08", "late +3.9", "rest 0:45"). The live Undo zone overlays the tile's empty right edge there (a narrow tile has no room to keep a strip free), and the fonts follow the tile's width. At large iOS text sizes a full-width row puts its pill under the name, so the name keeps its room.
- **The Update and Install banners don't appear on the Stopwatches tab while it has stopwatches** (they would push every row down); updates still install by themselves when nothing is timing.

**Known issues (3.15.0):**
- Headless Chrome and Safari's engine on a Mac aren't an iPhone: momentum scrolling and the exact moment iOS decides a touch is a scroll can only be checked on the phone (the drill does).
- A tap that lands within about 0.1 s of a rest ending by itself is not recorded (the row says so); tap again.
- Press and hold needs about half a second without moving; a slower, wobbly press is treated as a scroll.

**10-minute drill for two coaches at practice** (both phones on the team, Stopwatches tab; 5 runners, Coach A and Coach B):
1. **0:00 Set up (A).** + New > Workout: three runners together as one stopwatch (Group 1) and two alone, on a 4 × 200 with 30 s rest; Set up, start later. + New > Quick stopwatch for a jogger (it starts timing at once; press and hold it > Rename > "Jogger"). *Check:* B shows the same four rows; the three workout rows say "tap to start"; Jogger is running.
2. **0:30 Start.** A taps "Start all 3 waiting". B taps the Jogger row once (a lap). *Check:* the workout pills turn to "due in 0:40" on both phones; Jogger shows "Lap 1 · …" on both.
3. **0:40 Rep 1, the line.** A taps the Group 1 row as the group finishes; B taps each single runner's row as they finish. B **double-taps** one runner on purpose. *Check:* each row flashes and shows "Rep 1 · 200m · 0:38.4 · −1.6"; the double-tapped row says "Double tap ignored" and has one lap; every row is "resting 0:29" and says "Tap when they go".
4. **1:10 Rest.** Let Group 1's rest end by itself (its next rep starts at 0:00 with a beep). B taps one single runner's row 10 s early ("Rep 2 started"). *Check:* both phones agree.
5. **1:30 Scrolling while timing.** During rep 2, A drags the list up and down several times, starting the drag on a row each time. *Check:* no lap appears on any row (lap counts unchanged).
6. **1:50 Two coaches, one group.** At the end of rep 2, A **and** B both tap Group 1 within a second. *Check:* one lap on both phones; press and hold Group 1 > Lap list shows the other coach's tap as "also Coach B (+0.4 s) · use this".
7. **2:30 Undo.** B taps a runner's row too early (before the line), then taps **Undo** at the right end of that row within 6 s; then taps again at the line. *Check:* one lap, at the line.
8. **3:00 Sending a runner early.** During the rest after rep 2, A presses and holds Group 1 > Send runners now… and taps one runner's name as they leave. *Check:* a new row "Runner X · Split from Group 1" appears **at the end** (nothing else moves) already in rep 3; Group 1 keeps resting with two runners; when the others go, A taps the Group 1 row.
9. **4:00 Late.** Let one runner jog a rep: watch the pill go from "due in 0:05" to "+3.9 past target" (red, with a warning icon).
10. **5:00 Stop, details, Keep timing.** B presses and holds Jogger > Stop. *Check:* the row says "stopped"; a tap opens its details; Keep timing picks up where it stopped.
11. **6:00–9:00 Finish.** Run reps 3 and 4 with both coaches tapping (mix rows). Optional: press and hold the split-off row > Rejoin group. *Check:* every lap lands on the row tapped; nothing jumped; rows end "done" and a tap shows the lap list.
12. **9:30 End workout** (A) > confirm. *Check:* Data > Meets > Practice history has the session, with each runner's own splits ("By runner").
*Report:* anything that didn't record, recorded twice, landed on another row, or moved under a finger; the phone model and iOS version; and Settings > Data > Sync log > Share log from both phones.

## 3.14.0: Team training paces as one list (Wed 10/21)
Rollback tag before this: `before-3.14.0` (= 3.13.0). **No rules change.** Nothing saved changes shape: the selection and goal 5K times are new per-phone settings that older versions ignore.

1. ✅ 3.14.0. **Team training paces redesigned** (*Training tab, at the bottom*). The table that scrolled sideways and cut values off ("5–2:29") is gone.
   - **Two chip rows** (scroll sideways, one selected in each, the iOS selected look): **Distance or time:** 100, 150, 200, 300, 400, 500, 600, 800, 1000, 1200, Mile, 2000, 2 miles, 1 min, 2 min, 3 min, 5 min, and **Custom…** (a stepper in meters, miles or minutes). **Effort:** Easy (a range), Long run, Threshold, CV, Interval (VO2max), Repetition, 5K race pace, 2-mile race pace, Mile race pace, Goal 5K pace. The last choice is remembered.
   - **A plain-language title:** "800 m at CV pace", "3 min at threshold pace", "1.5 miles at threshold pace".
   - **One list:** full name and one time per runner (a range for Easy), right-aligned and never cut off, all m:ss; Girls ● and Boys ■ sections in the team colours, fastest first; with a time chosen, how far each runner goes ("705 m", or miles once anyone covers 3000 m). Runners without enough race data last, "Needs a race".
   - **Pace groups:** runners within about 3% of each other share a group: one card per group with its number on every row, and "Girls 6 · 4 pace groups" in the heading. The same rule and the same groups as Suggest pace groups in the workout flow (tested at every effort).
   - **Tap a runner:** the basis ("Based on 5K season best 19:55.0, 10/3 · VDOT 50.0"), this selection's time, and their profile; for Needs a race, the reason and **Add a time trial**.
   - **Share:** this view as an image, or **Full pace chart**: a printable PDF (US Letter), one page per effort, every runner at 200, 400, 600, 800, 1000, 1200 and the mile.
   - **The same numbers everywhere:** the existing Daniels VDOT and CV engine (each runner's best race this season of 1500m or longer, else the last 120 days), so every value equals the runner's profile pace table and their workout targets. Tested for every distance × effort (2,040 values) and against the profile and workouts; nothing cut off at 320, 390 and 768 pt and at large text sizes. On your 10/5 backup: 14 runners with paces (7 girls, 7 boys), no cut-off value in any of the 170 choices at normal or large text, every value equal to the engine and the workouts.

**Decisions made (3.14.0):**
- **Long run = the middle of the Easy range** (66% of VDOT): Daniels runs long runs at Easy pace; one time is easier to read than a second range.
- **Goal 5K pace = the goal you set for a runner** (tap them, choose Goal 5K pace, type the goal), **else 1% faster than their predicted 5K**. The goal is saved on this phone only: sharing it with the team would need a new field in the team's data and a rules change.
- **2-mile race pace** comes from the same VDOT (the predicted 2-mile time ÷ 2), like 5K and mile pace.
- **Times at 200 m and under show tenths** ("0:43.5"), as the runner's profile does; longer distances whole seconds. Every value stays m:ss.
- **Time options show distance:** meters (to the nearest 5 m), or miles with two decimals once anyone in the list covers 3000 m, so one list never mixes units.
- **Pace groups are cards, not headings:** one heading per group took a line for every runner who runs alone. Each group is a card; the group number sits beside each name.
- **The old Per mile / Per 400 / Per 200 switch is gone:** pick the distance instead (Mile, 400, 200).
- **Sorted fastest first by the selected effort** (for Easy: the middle of the range; for Goal 5K: the goal).

**Known issues (3.14.0):**
- Goal 5K times are per phone (see above).
- Runners not marked Girls or Boys get their own section at the end (as before).
- The PDF is images of the tables (no library in the app), so its text can't be selected; it prints sharply.
- Test fix, not an app change: `tests/e2e8.js` (race setup, drag ☰) failed about half the time, on 3.13.0 too. The app keeps a focused text field in view (it checks 300 and 700 ms after focus), and the test started its drag about 400 ms after typing in the race name, so the page sometimes scrolled under the mouse. The test now leaves the field and waits first (6 of 6 passes).

## 3.13.0: SVG icons and badges, Highlights with numbers (Sat 10/17, evening)
Rollback tag before this: `before-3.13.0` (= 3.12.0). **No rules change.** Nothing saved changes shape: the icons, badges and the new Highlights are drawn from the same data. One new file, `icons.js` (in the offline list).

7. ✅ 3.13.0. **Icons instead of emoji and symbols** (*every screen*). An open-source set close to SF Symbols: **Lucide 0.460.0** (ISC License), 29 icons bundled inside the app (`icons.js`, 6 KB), so they work offline. Credited in *Settings > About > Icons: Lucide (ISC License)*, which shows the license.
   - **Badges, always an icon and a word:** PR = medal (gold), Season best = trending-up arrow (green), Course best = map pin, Milestone = flag (Sub-20, First 5K), Comeback = heart, Team = people (Up 2, Top finish, Most even). Two more in the same style: pacing = gauge (Neg split, Faster finish, More even) and best adjusted race = sparkles (Best race).
   - **Race Mode name buttons:** the medal "PR" or trending-up "SB" badge replaces ★ / ▲, at checkpoints (on PR / season-best pace) and at the finish (a new PR / SB); VoiceOver still says "on PR pace", "new season best". It fits the space the old mark had: measured, no button moves or changes size in 2 or 3 columns, and every time line fits. Live results say "PR pace" / "SB pace".
   - **Results and runner profiles:** "New PR!" / "Season best!" became the PR and SB badges (read aloud as "New PR", "Season best").
   - **Also replaced:** the Settings category emoji (a white icon on a coloured square, like iOS Settings), the three New choices (timer, footprints, flag), favorites ☆ / ★ (star icon), the tag ⚑ (tag icon), ⚠ (warning triangle), ⓘ (info), ⛔ in the Sync log (the word "refused"), and the weather emoji (flame, sun, snowflake, wind, droplets; sun / cloud / rain on the weather tag), including the weather bands and keys in charts.
8. ✅ 3.13.0. **Highlights redesigned: numbers over sentences** (*Data > Highlights*).
   - **Header:** the meet name and date, Share at the right.
   - **Team:** a Girls card (pink) and a Boys card (sky blue) side by side: PR and SB count badges, top-5 average with its change since the last meet, 1–5 spread with its change. No sentences. (They stack at large text sizes.)
   - **Runners:** one row per runner on one line: full name, up to two badges and one stat ("−22.7s vs last"), the time at the right, a chevron. When a row is too narrow, the stat goes first, then the second badge, then the first: nothing is ever cut in half, and a name never breaks inside a word (at very large text it wraps between words).
   - **A runner's page** (tap a row; *‹ Highlights* returns to the same place, tapping Data also goes back): the time large with its badges; one line with pace, team place, overall place (when official) and Official / Hand-timed; a 2 × 2 grid of signed comparisons (vs old PR, vs last race, vs opener, vs last year here, or the final segment, the first four that exist); a small splits chart (pace per segment, the average dashed, faster to the left); at most four short highlights; then the **Next step** in its own card with a lock: coaches only, never in shared text (pacing, a next target, the growth-focus pattern with its check-in and workouts as list rows); then the runner's profile.
   - **Copy:** short phrases and numbers, every difference signed the same way ("−22.7s", "+1:04.2", "−8s/mi"; minus = faster). Adjusted numbers carry a small **adj** mark; tapping it explains it (no more "(adjusted for course and weather)" repeated).
   - **Same rules as 3.12.0:** every highlight type and what counts are unchanged (checked on your 10/5 backup: 14 runners and 12 with highlights at Waupaca, exactly as 3.12.0).

**Decisions made (3.13.0):**
- **Lucide rather than Phosphor:** its 2 px rounded line is the closest to SF Symbols' regular weight, and the ISC license only asks to keep the notice (it's in `icons.js` and in About). Version 0.460.0 is pinned; only the 29 icons the app uses are bundled, inlined as SVG (no icon font, no extra request), so they draw at once and offline.
- **Kept as text on purpose:** ✓ check marks, ⋯, ↶, ☰, the Girls ● / Boys ■ shape key, and the stopwatch tiles' ▲ / ▼ / ● pace shapes (behind / too fast / on pace). Those are shapes, not emoji, and the tiles weren't in this request. Say the word and they become icons too.
- **The shared text keeps its 🎉 heading:** it's plain text for a team chat, where icons can't go. No screen in the app shows an emoji.
- **On a name button the badge word is always "PR" or "SB"** (also for PR / SB pace at a checkpoint), so it fits the fixed space; the results say "PR pace" / "SB pace", and VoiceOver says the full meaning.
- **A row's stat is the most notable number:** the gain behind the top badge (vs PR, vs SB, on course), else vs last race, vs opener, vs last year. Rows show gains only; the runner's page shows every comparison, faster or slower.
- **Team card changes:** the top-5 average change is adjusted when both meets have a race-day rating (marked adj), raw when both were on the same course, otherwise not shown; the spread change is raw (as in 3.12).
- **The runner's page is pushed inside Data** (like Runners), with the Data sections hidden while it's open; leaving Highlights closes it.

**Known issues (3.13.0):**
- Lucide is close to SF Symbols but not identical (SF Symbols' license doesn't allow it in a web app).
- The splits chart appears only for races with checkpoint splits (hand-timed, or an official result with hand-timed splits).
- At the largest text sizes a long name can take two lines in its row (it breaks only between words).
- Test fix, not an app change: Settings > Data > Sync log lists the team's open races in Firestore's id order, and race ids are random, so a planted leftover race can be listed first; `tests/e2e39.js` assumed it never was and failed once in the 3.13 run. It now looks for the race anywhere in the list.

## 3.12.0: Paste official results, Highlights per runner (Sat 10/17, after the race-day version)
Rollback tag before this: `before-3.12.0` (= 3.11.0). **No rules change.** Nothing saved changes shape: pasted official results are new versions in a saved race's existing `edits` list (3.11 and older show them as a chosen corrected time); the school name is a per-phone setting.

5. ✅ 3.12.0. **Paste official results** (*a finished race on the race screen; Data > Meets inside each meet; Team history; Races on this phone*). In Safari open the results page, Select All, Copy, then paste (or tap Paste). The app reads the text itself: it never visits a results site.
   - Only lines naming your school (Little Chute, also "HS"/"High School"; the school name is editable and remembered). Other schools, team scores and headings are ignored. Reads tab-separated tables, Hy-Tek fixed-width text ("Fern, Ada  11  Little Chute  19:54.61"), single-spaced lines with a pace column, and phone layouts that copy one cell per line.
   - Names are matched to the race's runners first, then the roster. A sure match is set; anything uncertain (a spelling difference, two candidates, someone who wasn't hand-timed) waits for you to pick the runner or Skip, and Save says "Confirm 1 match first". A runner from the other team's race on the same page is skipped and says why.
   - The preview shows each official time with the hand time and the difference, and who has no official time (their hand time stays).
   - **Save:** a snapshot first; the official finish becomes the result for each runner (the hand time shows beside it: "hand 19:55.0"); every hand-timed checkpoint split stays, so the last split now runs to the official finish; the race gets the Official badge. All of it is added as new versions (nothing replaced), with one Undo that puts the hand times back. Official cells aren't editable; Undo the paste or paste again.
   - Also: a finished race another coach saved now shows that saved copy's corrections and official times on every phone's race screen (before, only the phone that saved it did).
6. ✅ 3.12.0. **Highlights: one card per runner** (*Data > Highlights*). **Team** highlights first (PR and season-best counts, tighter top-5 spread, faster top-5 average), then **a card for every runner who raced**, collapsed to one line with their top highlights ("Ada Fern: ★ PR, first sub-20"). Tap a card for everything: all their growth at this meet, this race (time, pace, team place, overall place when official, splits), this season, last year at this meet, and a **Next step** (coaches only, never shared) written from their own data: their pacing (went out fast / strong finish / steady, with the actual mile paces), a next target 1% under their best adjusted pace this season, the 3.8 growth-focus pattern with its check-in and linked workouts when there is one, or a check-in after an Injury/Illness-tagged race. The separate Growth focus section is folded into these cards.
   - **Celebrated** (each only when the numbers show it): PR, season best, course best, milestones (first sub-20 …), first 5K, faster than the last race and than the season opener (at least 1% and 5 s, adjusted for course and weather when both days are rated), best race of the season once adjusted, faster than this meet last year, a faster last segment and more even pacing than their last race with splits, a negative split, moving up in team order (among runners who ran both meets, so someone's absence never moves you up), a strong return after an Injury/Illness tag, fastest finish and most even pacing on the team (a tie names nobody).
   - **Never invented:** a runner whose numbers show no growth gets no highlight (their card still shows the race and a next step). On your 10/5 backup's latest meet (Waupaca, 10/1): 14 cards, 12 with highlights.
   - **Share** has the celebrations only: the heading, team highlights, one bullet per runner with highlights; never a next step, target, check-in or health reason.

**Decisions made (3.12.0):**
- **Pushed the same day as 3.11.0, before the Sectional,** so the mock race at practice runs on exactly the code used on Friday (and the paste is ready for the Sectional's official results). If anything looks wrong at the mock race, `before-3.12.0` (= 3.11.0) rolls back in one step (CLAUDE.md, How to roll back).
- **Pasted official results are corrections to the hand-timed race**, not a separate imported list, so the splits stay attached and everything that reads that race (goals, PRs, Highlights, Data) uses the official finish at once.
- **The finish is the longest time on a line** (never a pace, a split or a "+gap"), and a line needs a first and a last name.
- **Anyone who wasn't in the hand-timed race is added only when you confirm it**; the other team's runners on the same page are skipped by default.
- **"Faster than…" needs at least 1% and 5 seconds** (3.8 needed 2% and 8 s for "a big step"), and uses the race-day ratings when the courses differ; a smaller gain isn't claimed.
- **Team order counts only runners who ran both meets.**
- **A tie for "most even pacing" or "fastest finish" names nobody** (3.8 named whoever sorted first).
- **Cards start collapsed**, so a next step isn't on screen when a runner looks over a coach's shoulder.

**Known issues (3.12.0):**
- Results pages differ; tested with fake text in four layouts. If a paste finds nobody, the sheet says so (check the school name, or copy the whole page).
- Overall place is shown when the pasted line has one; team scores from the page are not kept.

## 3.11.0: race-day fixes for the WIAA Sectional (Sat 10/17)
Rollback tag before this: `before-3.11.0` (= 3.10.0). **No rules change.** New saved data: `S.race.made` (local only, which phone set a race up) and the sync log under its own localStorage key; older versions ignore both.

**The exact cause of the race setup sync bug (item 1).** Reproduced on three emulator phones (`tests/e2e39.js`, and the exploration before it). The app had one race per team but nothing made the other phones *follow* it:
- a coach who tapped Race while your race was set up was told "A race is already running … One race at a time per team" with **End it and start a new race**. Choosing it (the natural choice when you want to set up "the boys") set your race to finished: on your phone it turned into an empty "Finished" race, and from then on every phone showed only theirs. That is exactly "when I set up a race, other coaches didn't see it; when another coach set one up, everyone did";
- other phones only ever got a banner on the Stopwatches tab, and a phone that had its own set-up race (even an old one) always opened that one and could never reach yours;
- the banner showed whichever open race came first, leftovers from earlier days included;
- and nothing on the race screen said whether your race was actually on the team's server.

What I could not check: your phone's team membership and the team's race documents in Firebase. Reading them from this Mac's Firebase login was refused by the permission system, so I didn't. The new Sync log (below) checks your phone's membership against the server in one tap, and its export shows every write and the team's answer, so this can be confirmed on your phone. In the emulator a phone's writes were never refused: the race really was on the server, and the other phones simply weren't on it.

1. ✅ 3.11.0. **Every coach's setup, edits, Gun and taps reach every phone within 2 seconds** (*Race*). Measured on the emulator: other phones have a new race in 0.2 s without tapping anything, picks in 0.1 s, a typed name 1.1 s after the last key, both Guns and taps 0.1 s.
   - One race per team, and every phone follows it by itself: a phone with no race of its own in progress opens the team's race as soon as it appears (it waits while a sheet is open, while you type, or while you read a finished race's results; that screen shows "Coach Ben has a race set up … Open it").
   - Tapping Race (or + New > Race, or the banner) opens the team's race. The "End it and start a new race" choice is gone; a race is ended only with End race.
   - **Girls and boys share one race, each with its own Gun** (3.7's separate starts). "All girls" / "All boys" now *add* that team and keep the other, so a second coach adds the boys without touching your girls.
   - Two coaches who set up at the same moment: an empty one joins the other by itself; if both picked runners, the setup screen says so with "Join that race and add my n runners".
   - Old leftovers (set up but untouched for a day, or running for 6 hours) are never followed and never get in the way.
   - Race taps, picks, the Gun, Restart and corrections are sent at once (before: after a 1-second pause).
   - **Sync log** (*Settings > Data > Sync log*): every change the phone sends (race, taps, runners, workouts, stopwatch taps…), the time, and whether the team accepted it (with how long it took) or refused it and why; membership checks; every error. **Check membership** asks the server whether this phone is a member with the current password; the team's open races are listed. **Share log** / **Copy** export it as text. Runners appear as first name and last initial.
   - **A race never stays on one phone silently** (*top of race setup, the Ready screen and results; the status line while racing*): "Shared with the team ✓ · Coach Ben has it open", "Sending to the team…", "⚠ Not shared yet: no connection. Saved on this phone…", "⚠ Not shared: the team refused this race (reason)", "Not shared: this phone hasn't finished joining the team", or signed out. Tapping it opens the Sync log.
2. ✅ 3.11.0. **The Gun is instant** (*Ready screen, and Gun · Boys at the top of the race screen*). Its time is taken from the touch event itself on the first touch (pointerdown), so even a busy phone records when your finger landed. Only the time, the button's "fired" look and a rescue copy happen in the touch; sorting, saving, the redraw and sending come after that frame. Nothing afterwards (another coach's update, a redraw) can delay or drop it, and the gun is never blocked by the tap guard. The click iOS sends when you lift your finger is swallowed (by then a name button is under your finger) and plays the gun sound (iOS starts sound only on a click). Undo gun and Restart clock are unchanged. **Test:** the touch is sent while the phone is busy for 180 ms and another coach's updates arrive every 120 ms: the gun time is 0 ms from the touch (the limit is one frame, 17 ms), and the lift recorded no time on a name.
3. ✅ 3.11.0. **Race screen scrolling, no reloads, every error caught** (*race screen*).
   - **Scrolling (findings):** each arriving tap from another coach saved the whole app state, had sync.js compare every runner, workout and meet, and rebuilt the entire results list (30 runners × 3 checkpoints), and the open results list fired a `toggle` event on every redraw that forced the next redraw too. Measured (CPU slowed 4×, an older iPhone): **28 ms of main-thread time per arriving tap, 5.9 ms of it layout** (3.10.0) → **15 ms, 1.6 ms layout** (3.11.0); the rest is Firestore's own work. Now an arriving tap patches only the name buttons it changes in the next frame; the results list redraws at most once a second for other coaches' taps and never while you're scrolling (your own taps: at once); result cards off screen skip layout; the save and the sync bookkeeping wait a moment; the scroll listener is passive.
   - **No reload during setup or a live race:** auto-update, a team minimum version, Update, Restore backup and Restore snapshot all wait while a race is set up or running on this phone, or the race screen is open ("installs by itself after the race").
   - **Errors:** every error (and every failed promise) is caught and logged to the Sync log with where it happened; the race is saved before any redraw, so an error can't lose it. During testing the log pinpointed a mistake of mine in the name-button fitting ("fs is not defined") on the first run.
   - **Performance test** `tests/e2e40.js`: 30 runners (separate starts), another coach's taps arriving 5 per second, continuous scrolling, CPU 4× slower: longest frame 17 ms (none over 50 ms), no long task, no error; plus the per-tap budget above (3.10.0 fails it).
4. ✅ 3.11.0. **PR and season-best marks during races** (*name buttons and live results*): at each checkpoint with a distance, the runner's time against even pace for the PR and season best stamped at the Gun: **★ on PR pace** (gold) or **▲ on season-best pace** (green), nothing otherwise; at the finish **★ PR** or **▲ SB** for a new one. Beside the recorded time on the name button (one line, fixed space; in 3 columns the ✓ gives way), and in the results cards, table and finish list. Always a symbol and words (VoiceOver reads "on PR pace"), never colour alone; 4.5:1 or better.

**Decisions made (3.11.0):**
- **One race per team, followed by every phone**, rather than several races at once: girls and boys already share one race with two Guns (3.7), and one race means every coach always sees the same names.
- **"End it and start a new race" is removed**, not reworded: the only way a race ends is End race (Save or Discard), on the race screen.
- **Auto-follow never yanks a screen you're using:** it waits while a sheet is open, a race field has focus, or you're reading a finished race's results.
- **A day without changes makes a set-up race a leftover** (6 hours after the gun for a running one), so a race set up the evening before is still followed in the morning.
- **The share line counts "shared" only when the server has this exact version** (the race and every tap), from the server's own answer or its copy.
- **The Sync log keeps the newest 600 entries on the phone**, never in the app's data key, and repeats fold together (×n).
- **The keyboard can still fire the Gun** (a click with no touch), for accessibility.
- **Name buttons keep their recorded look on a mark**: the mark is added to the time line, so no button changes size.

**Known issues (3.11.0):**
- Phones still on 3.10 show the old "End it and start a new race" choice until they update. **Update every coach phone before the mock race**, or set the team minimum to 3.11.0 (Settings > Team, admin).
- Headless Chrome and WebKit on a Mac are much faster than an iPhone; check scrolling on the phone during the mock race.
- In the Firestore emulator, a race document written straight into the database (a test-only leftover) made one phone's race listener end on a false "doesn't exist" event; the share line now also uses the server's answer to this phone's own write, and the app ignores such events.

## 3.10.0: Data sections, Team sort fix, Raw vs Adjusted, profiles from the Team tab, team training paces (Sun 10/11)
Rollback tag before this: `before-3.10.0` (= 3.9.0). No rules change. New saved fields are per-phone settings only (`resView` gains `high`, `hlSeen`, `adjusted`, `paceUnit`); older versions ignore them (3.9 shows Meets for an unknown section).

1. ✅ 3.10.0. **Data tab sections: Meets, Team, Runners, Highlights** (*Data, segmented control*). The celebrations (Latest meet, with Share) and Growth focus moved out of the top of the Data tab into **Highlights**: celebrations first, then Growth focus in its own section marked "Coaches only, never in shared text" (it's never in the Share text, as before). **The Data tab remembers the last section** (also after a reload). **A small dot on Highlights** after a meet with new highlights, until Highlights is opened (per phone).
2. ✅ 3.10.0. **Team tab sorting bug fixed** (*Team tab, Average / Season best / Name*). **Cause:** the row always showed the season *average* (adjusted for race-day difficulty), but **Season best** sorted by the raw season best, which wasn't on screen, so the list looked out of order (on the 10/5 backup in 3.9.0: Bryn H. "23:53.5 adj." listed above Aubrey R. "23:45.0 adj.", because Bryn's season best, 22:08.1, is faster). And the Average column was always the *adjusted* average while every other time in the app is raw, so by the times you know it looked wrong too: 3.9.0 listed Kara J. (24:38.7 adj.; raw 24:39.0) above Cadence H. (24:39.4 adj.; raw 24:29.6). It was not a text comparison: times were already numbers. **Fix:** every sort uses the value shown in its column, as a number rounded to the tenth shown (equal-looking times are ties, alphabetical), fastest first within Girls and within Boys, runners without a time last. Rows now show both **Avg 5K** and **SB 5K**, the sorted column in bold, each labeled Raw or Adjusted. Times must be real numbers (a race cell without a time can never count as 0:00). **Test** `tests/e2e38.js`: typed times 9:58.0, 9:59.5, 16:05, 18:59.9, 19:00.0 (ties), 19:59.9, 20:00.0, 20:00.5, 24:30–25:30, 31:02.4 and runners without a 5K, every sort option, Girls and Boys, checked against an order worked out in the test (not by the app), plus Adjusted on a planted season. Checked on the 10/5 backup: Average and Season best in order in both modes.
3. ✅ 3.10.0. **Raw by default everywhere; one app-wide Raw / Adjusted switch** (*Team tab, Data > Runners, each runner profile, Data > Team*), remembered, shared (switch it on the Team tab and Data follows). "adj." is gone: it says **Adjusted** in full, with an **ⓘ** that shows "Adjusted times remove how hard each course and day was, so you can compare across meets." Every view says which kind is showing ("Showing Raw times (as run)" / "Showing Adjusted times (an average race day)", column headings, "Raw pace (as run)" on the season chart, "PR and season best: Raw times", "Raw times (as run)" at the top of Meets). Adjusted is off with its reason until some race day has a rating.
4. ✅ 3.10.0. **Tapping a runner on the Team tab opens their profile** (the same page as Data > Runners: races, charts, PRs, season bests, suggested training paces, practice, career) inside the Team tab, with **‹ Team** on the left and **Edit** on the right (name and Girls/Boys, plus typed results and Remove, as the old runner sheet). Tapping the Team tab again goes back to the list (iOS behavior). Press and hold a runner still offers Edit / Add a race result / Remove; swipe still removes.
5. ✅ 3.10.0. **Team training paces on the Training tab** (*bottom of Training*): Girls, then Boys (then runners not marked), fastest first; columns Easy (a range), Threshold, CV, Interval (VO2max), Repetition, 5K pace, from the existing Daniels VDOT and CV engine and the same basis as each runner's profile (best race this season of 1500m or longer, else the last 120 days). **Per mile / Per 400 / Per 200** switch (remembered). Names stay pinned while the pace columns scroll sideways; every time is m:ss and never cut off. Runners without enough race data say **"Needs a race"** and are listed last in their group. Tapping a runner opens their profile (‹ Training). **Share** → Image (PNG) or PDF (one page, US Letter, landscape when wide).

**Decisions made (3.10.0):**
- **Section order Meets, Team, Runners, Highlights**, as listed in the request. Opening a runner from a Highlights card or chart still goes to Data > Runners.
- **Season bests are always raw**, also when Adjusted is on (they're records, like PRs); the column says "Raw". Adjusted affects averages, the season chart, race-list paces and the Data > Team top-5 views.
- **In Adjusted mode a race day without a rating counts as run** in a runner's average (as if it were an average day), so the number of races in an average doesn't change with the switch. The season chart leaves unrated days out, as in 3.1 (said under it).
- **Trend chips and Growth focus stay course-adjusted** (they were already labeled that way and they're about direction, not times).
- **Edit opens the existing runner sheet** (name and Girls/Boys at the top, then typed results and Remove), so nothing that sheet did was lost.
- **The profile is pushed inside the tab you're on** (Team or Training), not a jump to the Data tab, so ‹ back returns where you were. Open race from a profile still goes to Data > Meets.
- **The Highlights dot is per phone** and lights for the latest meet already in your data the first time you open 3.10 (the section is new).
- **Shared image/PDF is drawn in light colors** whatever the phone's theme, so it prints and reads well in a team chat. The PDF is made in the app (no library, nothing sent anywhere).
- **Ties are judged at the tenth shown**, so two runners showing 20:00.0 sort by name even if their averages differ in the hundredths.

**Known issues (3.10.0):**
- Headless Chrome can't open the iOS share sheet; check Share (Image and PDF) on the phone.
- The four-segment control is tight at the largest iOS text sizes ("Highlights" is the longest label).
- A runner profile opened on the Team tab stays open when you switch tabs and come back (like iOS); tap Team again to go back to the list.

## 3.9.0: the Training tab (Sun 10/11)
Rollback tag before this: `before-3.9.0` (= 3.8.0). No rules change. A saved suggestion is still a plain workout (the fields every version reads); favorites are a list of workout ids in this phone's settings.

7. ✅ 3.9.0. **"Workouts" is now "Training" everywhere** (*tab bar, the title, Settings > Training and paces*). Workouts inside it are still called workouts.
8. ✅ 3.9.0. **A bigger library: six training types, 5–7 established high school cross country sessions each** (*Training > What's today's goal?*), every one effort-based so each runner gets their own targets from the existing Daniels VDOT and CV engine:
   - **Aerobic base** (6): easy run 6 km + strides, long run 12 km, progression run (3 km easy, 2 km CV), steady fartlek (6 × 800 at 85% of 5K speed, 1 min easy), hill strides (8 × 80 m), long run with a threshold finish.
   - **Threshold / CV** (7): CV 5 × 1000, 6 × 800, 4 × 1600; tempo run (~20 min); cruise intervals (3 × mile); broken tempo (2 × 2 km); CV ladder (400–800–1200–800–400 with 200 floats).
   - **VO2max** (6): 5 × 1000, 6 × 800, 4 × 1200, 12 × 400 at interval pace; long hill repeats (6 × 400 m); 30-30s (12 × 200 fast / 100 float).
   - **Speed / repetition** (6): 8 × 200, 6 × 300 at repetition pace; 6 × 400 at mile pace; strides; flying 100s; short hill sprints (8 × 60 m).
   - **Race sharpening** (5): goal-pace miles (3 × mile at 5K pace), cutdown (2 × 1600: 400 T, CV, 5K, I), race-pace 1000s, 6 × 600 at 5K pace, hill repeats.
   - **Recovery / pre-meet** (5): pre-meet shakeout with strides, easy short run, recovery run, relaxed 200s, pre-meet tune-up (2 × 400).
   - **Each option shows a short why** (what it builds), its pace system and **its volume** ("4.8 km at pace", or "3.6 km at pace (4.4 km in all)"). Volumes are high-school sized; reps and rest adjust with − / + before starting, and the volume follows.
   - **Schedule-aware suggestions kept:** the type the schedule suggests ("3 days before NEC Championship: a controlled threshold or CV session"), each option's schedule reason, and hard sessions flagged within 2 days of a meet or 1 day after. The first 3 options show; "Show all n" shows the rest.
   - **Favorites:** "☆ Save to favorites" on any suggestion saves it as your workout; Favorite / Unfavorite on any of your own workouts (tap it, or swipe left). **★ Favorites** sit at the top of the Training tab.
   - Growth focus (3.8) now links to the new sessions: fades → goal-pace miles, cutdown, progression; slows late → 4 × 1600 at CV, cruise intervals; across the board → recovery run, easy run with strides, relaxed 200s.

**Decisions made (3.9.0):**
- **Six types instead of seven goals:** Long run is part of Aerobic base and Pre-meet is part of Recovery / pre-meet; the schedule suggests Recovery / pre-meet on race day, the day before and the day after.
- **Threshold / CV has 7 options** (every format you listed); the others 5–6.
- **Time-based sessions are written by distance** so every runner gets a target: 30-30s as 200 m fast / 100 m float, the fartlek as 800s at a steady % of 5K speed, strides and hill work as short distances ("targets are a guide only" where the hill sets the pace).
- **Favorites are per phone** (each coach keeps their own); the Firestore rules for workouts only allow the workout's own fields, so a favorite flag can't travel with it.
- **Every older suggestion id is kept** (some renamed, e.g. "Tempo run"), so workouts saved from 2.14 suggestions still know their template.

**Known issues (3.9.0):**
- Strides, flying 100s and hill work show targets per distance, which can look precise for running that's really by feel; the note says so.

## 3.8.0: Latest meet celebrations and Growth focus (Data tab) (Sun 10/11)
Rollback tag before this: `before-3.8.0` (= 3.7.0). No rules change. Nothing saved changes: everything is worked out from saved results when the Data tab opens.

5. ✅ 3.8.0. **"Latest meet" at the top of the Data tab** (*above Meets / Runners / Team*): the newest race day (girls and boys), a card per runner worth celebrating with their time and the reasons, best reason first:
   - New PR · season best · best time on that course · milestones (first 5K under 30, 28, 27 … 16, 15 minutes)
   - a big step forward vs their last race and vs this meet last year (course-adjusted with the race-day ratings; raw only when both races were on the same course)
   - moving up in team order (2+ places, or into the top 5 / top 7) · negative split · fastest final segment on the girls/boys team · most even pacing on the girls/boys team (from checkpoint splits)
   - a strong first race back after an Injury/Illness-tagged result
   - **team wins** (🏆): tighter top-5 spread, faster top-5 average, vs the previous meet this season.
   - **Share:** "Copy for the team chat" (and the iPhone share sheet): a bold heading with an emoji, then one bullet per runner and per team win. Example: `**🎉 Waupaca Invitational highlights**` / `• Name: new 5K PR, 23:42.2, first sub-24 5K`.
   - The first 6 cards show; "Show all n" shows the rest. A name opens the runner's card.
6. ✅ 3.8.0. **Growth focus** (*same section, collapsed, "coaches only, never in shared text"*): runners whose course-adjusted times have drifted off their season-best pace across at least 3 races this season.
   - Injury/Illness-tagged races are left out; a dip only on weather-flagged days (heat, wind, mud, cold) doesn't count, and flagged races are noted.
   - Positive words only: "Ready for a breakthrough", the pattern ("Goes out fast, then gives time back late" / "the last mile is where time slips" / "a little off season-best pace across the whole race"), and **Next target: back to season-best pace** (per mile and as a 5K on an average race day).
   - Suggestions: 1. always a check-in with the runner (sleep, stress, illness, training load); then by pattern: fades → even-pace and negative-split workouts; slows in the last mile → CV / threshold; across the board → more easy days and recovery. Each workout suggestion has **Open workout ›**, which opens it on the Workouts (Training) tab.

**Decisions made (3.8.0):**
- **"Latest meet" = the newest race day with saved or imported results**, up to today; all races that day (girls and boys, official and hand-timed) count. Each runner's result is the one closest to 5K that day; official wins over hand-timed (as everywhere in Data).
- **Thresholds:** a big step = at least 2% faster pace and 8 s over the race; last year = at least 5 s faster; team order = up 2+ places or into the top 5/7; negative split = last segment at least 1% faster than the first; even pacing = splits within 4%; team spread = 3 s tighter; team average = 2 s faster.
- **A PR shows as the PR only** (not also as a season best); a milestone needs an earlier 5K (a first-ever race isn't a "first sub-20").
- **The shared text never names a health reason:** a comeback shares as "strong return to racing". Growth focus is never in the shared text.
- **Bold in chat:** the heading uses `**…**`, which shows bold in apps that read Markdown (Slack, Discord, WhatsApp-style apps show the stars); plain-text apps show the stars.
- **Growth focus pattern:** the last 3–4 rated races trend at least 1.5% slower (a straight-line fit) and the latest is at least 2% off season-best pace. "Fades" = 2+ of those races with the first segment 2% faster than race pace and the last 2% slower; "slows late" = 2+ with the last segment 3% slower; otherwise "across the board".
- **Growth focus starts collapsed** so it isn't on screen when a runner looks over a coach's shoulder.

**Known issues (3.8.0):**
- Course-adjusted comparisons need race-day ratings (5 runners with 2 other races that season); early in a season fewer reasons appear.
- Fastest final segment and even pacing need hand-timed checkpoint splits (official results are finish-only).

## 3.7.0: race setup by who is picked, separate starts, no zoom, checkpoints line, m:ss everywhere (Sun 10/11)
Rollback tag before this: `before-3.7.0` (= 3.6.1). No rules change (3.6.0 stays the file to publish). Includes the new app icons that were waiting in the working tree as 3.6.2 (PNG favicon, new home-screen icons, light manifest colors).

1. ✅ 3.7.0. **No Team selector in Race Mode setup** (*Race > setup*): the Girls / Boys / Both buttons are gone. The picker offers **Everyone**, **All girls**, **All boys**, Clear and every name. The race's team comes from who is picked (all girls = a Girls race, all boys = Boys, both = Girls & Boys).
   - **Girls and boys picked = separate starts by default:** the Ready screen has **Gun · Girls** and **Gun · Boys**. After the first Gun the other one waits at the top of the race screen; its runners show "Waiting for the gun" (a tap on them is ignored and says why). The clock shows both races ("Girls 21:04.2 · Boys 3:12.0"), every time runs from the runner's own Gun, and results list Girls and Boys separately with their own places. Each Gun has its own Undo; Restart clock works per start until that start's first time.
   - **"One start together"** (under Starts, only when both are picked) gives one Gun for everyone, as before.
   - A runner with no Girls/Boys setting is asked which start they go with.
2. ✅ 3.7.0. **No zoom when typing** (*every screen and sheet*): every text field, number field, picker and text area is at least 16 pt, also at a smaller iPhone text size. Pinch to zoom still works (no zoom lock; swipe rows allow pinch too). New automated test fails if any field renders under 16 pt (`tests/e2e35.js`).
3. ✅ 3.7.0. **Checkpoints as one line** (*Race setup > Course and checkpoints*): "Mile 1 · Mile 2 · Finish (5K)" with **Edit**. Edit opens a simple list: rename, ↑ ↓ to reorder, × to remove, and Add (Mile 1, Mile 2, 2 mi, 3200m, 4K, 5K or Other). A saved course still fills in its own checkpoints. The same list is "Edit checkpoints" during a race.
4. ✅ 3.7.0. **m:ss everywhere** (*every time field*): the m:ss | sec toggle is gone; digits fill from the right (1, 8, 3, 2 → 18:32; results with tenths 2, 8, 5, 9, 9 → 28:59.9). A workout saved in seconds shows in m:ss (160 → 2:40) and is saved as m:ss when edited. Goal and time fields are wide enough for 28:59.9 (tested). Differences of a minute or more show as m:ss too (+1:15, +1:05/mi).

**Decisions made (3.7.0):**
- **Two starts are one race, not two:** each runner carries their start and each start's Gun is stored inside the race's existing gun record, so the published rules need nothing new and every coach phone shares both Guns. Saved results are one race marked Girls & Boys; Data already shows it as a Girls race and a Boys race at that meet.
- **The name grid groups the starts:** girls first, then boys, each by expected finish (fixed at the first Gun, as before). The second Gun's bar disappears when it's tapped, so the grid moves up once at that moment, with the usual 400 ms tap guard.
- **No more preselecting "who ran this division last time":** it belonged to the Girls/Boys/Both buttons. All girls / All boys pick everyone marked that way.
- **"Last year at this meet" goals no longer need a division:** they use each runner's own result at that meet last year.
- **Small differences stay in seconds** (▲ 3.2 s late, +12s/mi): that's how coaches say them. Times, targets, rest and any difference of a minute or more are m:ss.
- **A time saved in seconds by an older version** is shown and re-saved as m:ss; older versions read m:ss fine.

**Known issues (3.7.0):**
- A coach phone still on 3.6 that edits a two-start race in setup drops the starts (it doesn't know them); phones update by themselves when nothing is timing.
- Headless Chrome can't show the iOS zoom itself; the test checks the 16 pt rule that causes it. Check one field on the phone.

## 3.6.1: no clipped or overlapping tile content (Wed 10/7)
Rollback tag before this: `before-3.6.1` (= 3.6.0). No rules change (3.6.0 stays the file to publish).

**Cause of the "Stopped · 1:10.5 / Keep timing" tiles with running clocks (item 5):** not a status the split carried over. 3.6.0 holds back a tile's redraw while a finger is down on it (so another coach's tap can't swallow yours) and released it only when iOS reported the finger lifting (`pointerup`/`pointercancel`). When iOS didn't report it, the tile kept its old buttons ("Stopped · 1:10.5", "Keep timing", "Undo early start of rep 2") while the clock above, which updates every frame, kept running. Reproduced on 3.6.0 in WebKit: a touch with no lift, then Stop: the stopwatch is stopped but the tile still shows Lap and Stop (and the reverse after Keep timing). A split itself sets the right status: a three-phone check (split, other phone, reloads on both) showed running everywhere. Fixed: the clock loop releases held redraws as soon as no finger is down, and redraws any tile whose face doesn't match its stopwatch's state, within a second.

1. ✅ 3.6.1. **Nothing clipped:** "Stopped · 1:10.5" + "Keep timing" (which was cut to "R") is now Keep timing across the whole button row, "Stopped" on the status line and "Rep 2/4 · total 1:10.5" under the clock; the compact Lap and Stop fit; every row is sized for its fullest content. Measured in WebKit (Safari's engine) at iPhone size: the 3.6.0 tile squeezed the name and the runners line into one 46 pt row, which cut both at iOS's default text size.
2. ✅ 3.6.1. **Edit mode like iOS:** the selection circle is in its own column on the left and the tile's content moves right to make room (names end in "…"); the tile keeps its size.
3. ✅ 3.6.1. **The runners line has its own row** under the name, so the big time can't cover it.
4. ✅ 3.6.1. **The Edit toolbar replaces the tab bar:** "Select All" on the left, "n Selected" in the middle, "Remove (n)" on the right (off until something is selected); the page gets room below the last tile so it scrolls fully above the toolbar.
5. ✅ 3.6.1. **Sized for the fullest state** (longest name, runners line, two laps, Undo, rest countdown, Edit mode at once): 366 × 304 pt regular, 179 × 308 pt compact at iOS's default text size; still one fixed size per layout. Text sizes inside follow the tile's width, so iOS's larger text sizes fit (the text grows until the tile is full, then stops).
6. ✅ 3.6.1. **Test** `tests/e2e34.js` in WebKit: every tile state (waiting, running with laps and Undo, a group resting with its names, stopped, finished, a split-off, a running group with long names) and Edit mode with two selected, both layouts, at iOS text sizes 17 (default), 19, 21 and 23 px: no element outside its tile or cut by its row, no overlaps, buttons and times never cut short, text cut only with an ellipsis, 44 pt targets, all tiles the same size; plus the toolbar, Remove off with nothing selected, and a tile's face following its state when a finger-lift is lost. **Screenshots:** `docs/screenshots-tiles/` (`before-*` = 3.6.0, `after-*` = 3.6.1; each state on its own, regular and compact, 17 and 23 px, Edit mode top and bottom).

**Decisions made (3.6.1):**
- **The tests use WebKit** (Playwright's build of Safari's engine), not only Chrome: the clipping didn't show in Chrome at 16 px and did in WebKit at iOS's 17 px. `tests/setup.sh` installs it; it's a test-only dependency.
- **The runners line is plain text** (it was a small button on waiting tiles that opened Change runners): a one-line row can't be a 44 pt target, and Change runners is in ⋯. The name button fills the whole 44 pt name row.
- **Undo's label may end in "…"** in narrow tiles ("Undo lap 3 (0:0…"); everything else on a button is whole. Compact tiles say "Undo".
- **Stopped tiles:** Keep timing gets the whole row (the coach's main action); Start over stays in ⋯.
- **The lap area gives way in narrow tiles:** first the coach's name, then the mark and the "too fast" word, then "All n ›"; the times stay. Tapping it still shows everything. In compact Edit mode the lap total and "All n" hide too.
- **Tiles are 304 pt at iOS's default text size** (288 at 16 px; 3.6.0 was 264 at 16 px) to give the runners line its own row; the 2.13 size check (Chrome, 16 px) is now "under 300 pt and all the same size".
- **iOS text sizes are tested as 17, 19, 21 and 23 px** (Large = default, xLarge, xxLarge, xxxLarge); the accessibility sizes above them aren't covered.

**Known issues (3.6.1):**
- WebKit on a Mac is close to, but not exactly, the iPhone: check the tiles on the phone at your text size.
- At the accessibility text sizes (above xxxLarge) the tile text stops growing at the tile's width instead of getting bigger.

**Technical notes (Tiles without clipping (3.6.1)), moved from CLAUDE.md on 2026-10-29; later versions replaced this design:**
- **Six fixed rows** (styles.css "3.6 / 3.6.1 tiles", every rule under `#grid` so the older `.watch` and `body.compact` rules can't win): the name row (`.w-head`: name button filling the row's 44 pt, ⋯), the info line (`.w-meta`, its own row now: runners, plan note or pace warning; plain text, Change runners is in ⋯), the clock, the status line with Undo, the lap area, the buttons. `--tile-h` = rows + gaps + padding. Sized for the fullest state; text ends in an ellipsis, buttons and times never do (only the Undo label may).
- **Font sizes follow the tile's width:** the tile is a size container (`container-type:inline-size`) and each font is `min(X rem, X×10.56 cqi)`, which never binds at the default 17 px in a 179 pt compact tile and only shrinks text at larger iOS text sizes. The lap area drops its least useful parts as the tile narrows (`@container` on the tile: coach name, then mark and word, then "All n", then the delta), all of it still in the lap sheet. Don't put `container-type` on an inner element: its fonts would follow that element's width.
- **Lap area** = `.lrs` (the rows) and `.more` ("All n ›") side by side. Each row: mark (`.lr-k`), time (`.lr-t`), delta or total (`.lr-d`), word (`.lr-w`), coach (`.lr-by`).
- **Stopped:** Keep timing gets the whole button row; the status line says "Stopped"; the line under the clock says "Rep 2/4 · total 1:10.5" (the big clock shows the rep, so the total is named).
- **Edit mode (iOS):** the circle is a real element (`.w-sel`, a direct child of the tile, absolute at the left) and every other row moves right by a margin (32 pt, 28 compact), so the tile and its fonts keep their size and names end in an ellipsis. In compact Edit mode the lap total and "All n" hide. The toolbar `#editBar` takes the tab bar's place (`body.w-editing .tabbar{display:none}`): "Select All"/"Deselect All" on the left, "n Selected" (`#edCount`) in the middle, "Remove (n)" on the right, off until something is selected; `main` gets the toolbar's height plus 24 pt so the last tile scrolls clear. A redraw keeps the selection (`sel` in `renderCard`).
- **A face never shows a stale state:** `tick()` releases redraws that were waiting for a finger to lift once no finger is down (`PEND`, `PEND_GRID`), and redraws any tile whose class (`st-<status>`) doesn't match its stopwatch. Cause of the 3.6.0 "Stopped · Keep timing next to a running clock" tiles: a redraw held back during a touch (3.6, `PRESS`) was only released by `pointerup`/`pointercancel`; when iOS didn't deliver one, the tile kept its old buttons while `tick()` kept updating its clock.
- Tests: `tests/e2e34.js` (WebKit through Playwright, `tests/tools/tilestates.js` builds every state); screenshots `tests/tools/shots361.js` → `docs/screenshots-tiles/`. `tests/setup.sh` installs WebKit (`npx playwright-core install webkit`).

## 3.6.0: stable stopwatch layout, splitting runners out of a group (Wed 10/7)
Rollback tag before this: `before-3.6.0` (= 3.5.0). **Rules 3.6.0** (first line of `firestore.rules`): 3.5.0 plus two optional stopwatch header fields (`from`, `hid`) and two tap kinds (`leave`, `join`, with `ids`). Only adds, so publish it now, before the phones update (3.5 phones never write these). Splitting on a team needs it: until it's published, a split stays on the phone that made it (it says the rules are needed), and everything else keeps syncing. It also carries the 3.3.0 shared-stopwatch rules.

1. ✅ 3.6.0. **Every tile has one fixed size** in each layout (366 × 264 pt regular, 179 × 267 pt compact on a 390-pt-wide phone at the default text size; it follows the phone's text size). Five reserved rows: name + ⋯ (with one small info line under the name: runners, a plan note or a pace warning); the time; one status line with Undo at its right end (a new message replaces the old one: "Lap 3 recorded · 1:20.3 · Undo lap 3", "Tap a name to send them now", the next target or "late"); the lap area (latest one or two laps or splits, colored with ▲ ▼ ●, with the coach who tapped; tap for all of them in a sheet, which replaces the expanding list and keeps every column, coach names and "use this" for a second coach's tap); Lap and Stop.
2. ✅ 3.6.0. **Tiles never move** because of laps, timers, rest, Stop, Keep timing, Start over, or another coach's taps. Adding or removing a stopwatch slides the others (240 ms) and puts a 400 ms tap guard on every tile that moved (a tap during it is ignored with a small shake); a new tile fades in. A redraw caused by another coach waits until your finger lifts, so it can't swallow your tap. **Test** `tests/e2e32.js` records every tile's position and size on two phones, regular and compact, after each action (lap, undo, rest start and end, both Stop taps, Keep timing, Start over, the lap sheet, the other phone's taps) and fails on any change.
3. ✅ 3.6.0. **Splitting runners out of a group:** during rest the group tile shows its runners' names; tapping one gives that runner their own stopwatch right after the group, starting their next rep at that moment, while the group keeps resting. It carries the group's reps, laps and splits, the same workout, and from then on that runner's own targets. Names tapped within 2 s of each other leave together as a new small group (if that would be everyone, the whole group just starts its next rep).
4. ✅ 3.6.0. **⋯ > Split runners…** (any time on a running or stopped group: one stopwatch each or together; they keep the group's place) and, on a split-off stopwatch, **⋯ > Rejoin group** (it stops at that moment and folds back into its group; its laps stay saved as that runner's). One-tap Undo on the tiles for every split and rejoin (8 s).
5. ✅ 3.6.0. **On other coaches' phones** the new stopwatch appears right after its group within 2 s (0.4 s on three phones in the emulator test), with the slide and tap guard; rejoin and Undo the same.
6. ✅ 3.6.0. **Attribution:** practice history records who was on each stopwatch when, so each runner's splits are theirs whether they ran in a group, alone, or both: practice history entries have "By runner", and Data > Runners > a runner has "Practice" (latest 8 sessions). **Test** `tests/e2e33.js`: split during rest and during a rep, two names together, Undo, Rejoin and its Undo, three phones, history attribution (each split once, from the right stopwatch), layout during splits, and a phone without a team.

**Decisions made (3.6.0):**
- **Fixed rows instead of a growing tile.** Empty rows keep their space, so a tile never changes height. Tiles are 264 pt (a running 3.5 tile was about 200 pt and grew with each lap): the 2.13 "under 220 pt" check is now "under 280 pt and all the same size". To keep them short, the info line sits under the name and Undo sits at the end of the status line (exactly "Lap 3 recorded · Undo").
- **The tap guard is on tiles that moved,** not on a brand-new tile (you just added it; guarding it made the first tap on it fail).
- **The lap list became a sheet.** The tile shows the latest two; everything else (the full table, Target/Split columns, coach names, "use this") is one tap away. "Show times as they come in" off = the tile shows only the count.
- **Compact tiles use short button labels** ("Go now", "Resume", "Lap") so nothing is cut off; the full words are the buttons' accessible labels.
- **Name taps send now; ⋯ > Split runners… keeps the group's place.** The name buttons are for the moment a runner is ready early; the menu is for regrouping at any time without changing anyone's clock.
- **Two names within 2 s:** the first split is quietly undone and both leave together at the first tap's time (one new small group, targets for the two of them).
- **The new stopwatch's past splits are compared with the runner's own targets** (the group's times, re-scored), because the plan is the runner's from then on. The group's own entry keeps the group's targets.
- **Rejoin hides the split-off stopwatch instead of deleting it**, so its laps stay in practice history as that runner's. Clear finished and End workout remove it.
- **Split writes that the published rules refuse don't stop sharing** (a separate "splits blocked" state), unlike 3.3's all-or-nothing.

**Known issues (3.6.0):**
- A phone still on 3.5 shows a rejoined stopwatch as a stopped tile (it doesn't know it's hidden) and puts a split-off at the end instead of after its group; if a 3.5 phone renames a split-off, "Rejoin group" disappears for it.
- Hidden (rejoined) stopwatches count toward the 30-stopwatch limit until End workout or Clear finished.
- Headless Chrome can't reproduce finger swipes, the iOS text size, or a sideways scroll of many name buttons; check a group of 6+ on the phone.

**Technical notes (Stable tiles (3.6)), moved from CLAUDE.md on 2026-10-29; later versions replaced this design:**
- **Fixed tiles** (`cardHTML()`, styles.css "3.6 tiles"): every tile is a grid of five fixed rows (`--t-head`, `--t-clock`, `--t-stat`, `--t-laps`, `--t-ctl`; `--tile-h` is their sum plus gaps and padding, also the height of a removed "Undo" tile; compact pins its own padding and gap because older `body.compact .watch` rules set them). Rows: name + ⋯, with one small info line under the name (`.w-meta`: a plan note, else the pace warning, else the runners); the clock; one status line (`tileMsg()`: the newest of "Lap 3 recorded · …" (`LAPNOTE`, 4 s) and a split note (`SPLITNOTE`), else during a group's rest "Tap a name to send them now", else the next target `[data-r=next]` from `updateLive()`) with Undo at its right end (the `TUNDO` message + Undo, or the labeled Undo; compact shows "Undo"); the lap area (`lapAreaHTML()`, see Card lap/split list; rows show the coach who tapped on shared stopwatches; during a group's rest its runners as `[data-act=send]` buttons); Lap / Stop (compact uses short labels from `data-sm` via CSS, so the text content stays the same). Everything is clipped to its row (one line, ellipsis), so nothing can grow a tile.
- **Tiles only move when stopwatches are added or removed:** `renderGrid()` records every tile's rect, rebuilds, and slides each moved tile from its old place (FLIP, `flipTiles()`, 240 ms; a new tile fades in), setting `node._guard` = now + 400 ms (`TILE_GUARD`) on tiles that moved (not on a new tile); the grid's click handler ignores and shakes (`nope()`) a guarded tile. `layoutChange(fn)` wraps several changes in one slide (splits, rejoins, remote headers in `watchRemote`, a removed tile's own Undo). A removed tile keeps its place through a rebuild for its 8 s. While a finger is down on a tile (`PRESS`, grid pointerdown), `renderCard`/`renderGrid` of it wait until the finger lifts (`PEND`, `PEND_GRID`), so another coach's tap never swallows yours.

## 3.5.0: Boys sky blue, Schedule page, next season's schedule (Wed 10/7)
Rollback tag before this: `before-3.5.0` (= 3.4.0). **Rules 3.5.0** (first line of `firestore.rules`): 3.3.0 plus an optional `notAttending` true/false on meets. Only adds, so it can be published any time; it also carries the 3.3.0 shared-stopwatch rules (publish once every phone is on 3.3.0 or newer, as before).

1. ✅ 3.5.0. **Boys color is the school's sky blue** (light #8fd0f5, dark #bfe3f7 = the school sky #bfe3f7) as the fill of squares, bars and lines. In light mode a deeper sky shade (#0a6e94) is the outline of every Boys square and line and the color of Boys text (headings, ■), because sky blue on white is only 1.7:1. Girls stay pink circles. Checked (`tests/e2e29.js`): Boys text shade 5.7:1 on white, 12.6:1 dark; sky is hue 201–202° (sky) and 3.4:1 (light) / 4.3:1 (dark) against the button blue, so they don't look alike; every chart still passes the chart checks.
2. ✅ 3.5.0. **Schedule page** for the current season (season picker for others), from Data > Meets (a "Schedule" row showing the next meet), race setup (the "Meets" button is now "Schedule") and Settings > Data > Schedule. "+ Add meet" at the top. Each meet is an iOS swipe row: swipe right for Edit; swipe left for Not attending (or Attending) and Delete (Undo). Tapping a meet edits it.
3. ✅ 3.5.0. **"Not attending this year"**: the meet stays (series, course, links to past years) but drops out of the next meet everywhere (race setup's default, Data's "Next", the Workouts goal line). Race setup still lists it as "(not attending)". Reversible from the swipe, the meet editor's switch, or Undo. **Brillion 10/8 is marked not attending** on each phone once (checked on the 10/5 backup: Brillion 10/8 not attending, next meet Albany Baertschi Invite 10/10).
4. ✅ 3.5.0. **Editing a meet's date, time or course** redraws every view (Schedule, Data's next meet, the Workouts goal line, race setup's default and list, combined race views).
5. ✅ 3.5.0. **Start a new season** is on the Schedule page (copies this season's meets to the next with dates blank, same series and course; every copy starts as attending).
6. ✅ 3.5.0. **Import schedule (CSV)**: columns date, meet, levels, location, start time; anything else ignored. A preview lists each meet with its series (same name, "matched: check" for a known alias, or new) and course (by location, or new), each with a picker to change it; meets already on the schedule are skipped. Add creates the series and courses it needs, takes a snapshot first, and one Undo removes the whole import (to Recently deleted). Template: `docs/schedule-template.csv` (the team's own 2027 meet names; checked against the 10/5 backup: all five match the existing series and courses).

**Decisions made (3.5.0):**
- **Sky blue is a fill, never text in light mode.** The deeper sky shade (#0a6e94) carries the readable parts (outline, text). In dark mode the sky itself is readable (12.6:1), so it does both.
- **Not attending is a flag on the meet, not a deletion,** so the series keeps its history and the meet comes back with one tap. It isn't copied to the next season.
- **Brillion is marked by a one-time step on each phone** (only until 10/8, and never again on that phone, so changing it back sticks). On a team, the first phone to run it sends it to the others.
- **The swipe goes Edit (right) and Not attending + Delete (left)**, like Mail's flag/trash; a tap on a meet is Edit (the most common action).
- **CSV dates:** YYYY-MM-DD or M/D/YYYY; a date with no year is next fall; a row whose date can't be read is added as TBA (said in the preview). Levels "JV", "Varsity", "V", "JV / V"; blank = JV and V.
- **Series matching** uses the same rules as the history importer (full name first, then the known name variants); a variant match is shown as "matched: check" so you confirm it.
- **"Meets" became "Schedule"** in race setup and Settings > Data.

**Known issues (3.5.0):**
- The tests swipe with a mouse drag in headless Chrome; check a finger swipe on the meet rows on the phone.
- The CSV import doesn't edit meets already on the schedule (same series and date are skipped); edit those on the Schedule page.
- A phone that hasn't opened 3.5.0 before 10/8 won't mark Brillion itself; on a team it gets the mark from the others.

## 3.4.0: Settings, density and polish (Tue 10/6)
Rollback tag before this: `before-3.4.0` (= 3.3.1). No rules change (3.3.0 stays the file to publish).

1. ✅ 3.4.0. **"Fill in weather now" looked dead.** Cause: the tap worked, but with no confirmed race locations (24 on the 10/5 backup) there was nothing it was allowed to look up, so it finished at once and the status line didn't change. Its row also wrapped to 109 pt because the long status sat inside it. Now: without confirmed locations it says so under it ("Confirm your race locations first (24 to confirm)…") and the button goes to Race locations; offline it says the weather fills in when the signal is back; after a run it says what happened (filled in n days, nothing new, or the weather service didn't answer). **Every other button checked:** disabled buttons now say why (Bench: "Pick runners first…"; Edit mode: "Tap stopwatches to select"; Edit times and Levels: "No changes yet"; Merge: "Pick both runners first."; steppers: "Lowest: 0.1″"; Adjusted switch: the reason under it), and result rows that can't be edited are plain rows, not dead buttons. **New test** `tests/e2e30.js` taps every visible button on 16 screens (423 buttons) and fails if one does nothing, or is off without a reason.
2. ✅ 3.4.0. **Settings like the iOS Settings app:** a short list (Team, Weather, Workouts and paces, Race Mode, Data, Display and sound, About), each its own page with "‹ Settings". Every setting kept: Team (your name, team status, coach phones and versions, password, admin, minimum version, leave), Weather (race locations, fill in weather, the five flag thresholds), Workouts and paces (on-pace window, give every waiting stopwatch a workout, clear finished / clear all times), Race Mode (name button columns, phone location at the gun), Data (meets, import history, Data health, Recently deleted, back up, restore, snapshots, leave tagged results out of trends, storage), Display and sound (smaller cards, times as they come in, keep screen on, beep before each rep), About (version, check for updates, help, credits incl. "Weather data by Open-Meteo.com"). Badges only when something needs attention (Team: sync error or signed out; Weather: locations to confirm; Data: Data health).
3. ✅ 3.4.0. **Number settings are value rows** ("Hot flag  150 ›"); a tap opens a stepper sheet (big value, − / +, saved as it changes, Done goes back; it says "Lowest/Highest" at the ends). Every Settings row is one line, at least 44 pt; explanations moved under each group. The old number fields (and their line-height problem) are gone.
4. ✅ 3.4.0. **Data page density** (see the list below).
5. ✅ 3.4.0. **Every screen audited** (list below).
6. ✅ 3.4.0. Before/after phone screenshots (fake names, made-up weather): `docs/screenshots-3.4/` (`before-NN-*` = 3.3.1, `after-NN-*` = 3.4.0): Settings and each Settings page, Data (Meets, an open meet, an open race, Runners, a runner card and chart, Team and its chart), new workout, Stopwatches, Workouts, Team, runner sheet, race setup. `node tests/tools/shots34.js <before|after>`.

**Density changes (each one):**
- Data > Meets: each meet is one row: name with the date under it, and a compact weather tag on the right ("☀️ 78° · Warm", or "⛅ 64° · dew 50" without a flag); tap it for the full weather, the flags (dismiss) and the credit. The flag chips' own line is gone, and "· 2 races" (repeated inside) is gone.
- Inside a meet: the race-day rating is one line ("Race day: 0:08 harder  High confidence  ⓘ"); the ± range, runners and the weather/course split are behind the tap. The separate weather block (3 lines + chip + credit) is gone from the meet (it's the header tag).
- Girls / Boys rows inside a meet are 44 pt list rows instead of tall cards.
- Finish-only results: one row per runner (place, name, time, pace under it) instead of a 4-line card each; the "Official" badge on every time is gone (the race row already says Official).
- The adjusted-times note and the Open-Meteo credit share one small line at the top of Meets; the note shows once per runner card (it was twice) and no longer under the Raw/Adjusted switch.
- Charts: a chart's key moves into its title line when it fits; weather keys are just the icon and word (the rule is in the tooltip), so the runner chart key is 2 lines instead of 4.
- Runner card: the header line no longer starts with a stray "·" and no longer repeats the trend word ("Girls · last 4 races −0.3% (adjusted)" next to the Steady chip).
- Team ladder: names get more room (one line for most), the dot track is narrower.
- Data > Team table: Girls ● / Boys ■ in their team colors.
- Stopwatches: End workout, Show and Start all / Stop all are one toolbar row ("Stop all 7", "Start all 3"), not two.
- Team tab: the "14 runners" line moved into the search field ("Find a runner (14)"); the column header "Season avg 5K" (2 lines) is "Avg 5K".
- Race setup: the big 0:00.0 clock is hidden until the gun (it showed nothing); the Girls/Boys/Both row is labeled "Team" (it said "Runners", the same as the runner list below it).
- Settings: one-line rows, explanations under groups, team actions as iOS action rows, coach phones as a grouped list.

**Decisions made (3.4.0):**
- **Seven categories, not more:** Team, Weather, Workouts and paces, Race Mode, Data, Display and sound, About (as suggested; Beep before each rep sits with the display settings, the stopwatch-wide actions and Clear with Workouts and paces).
- **"Your name" lives on the Team page** (it's how other coaches see you, in races and on laps); Race Mode's page says where it is.
- **Race Mode's columns and phone-location switch are in Settings too** (same settings as race setup; changing either place changes both).
- **The meet row's weather tag is short** ("☀️ 78° · Warm", or the dew point when there's no flag), so meet names keep their full width; everything else is one tap away.
- **The Open-Meteo credit shows once on the Meets screen** (with the adjusted-times note) and in every weather sheet, chart and runner card, instead of under every block.
- **Start all / Stop all say "Start all 3" / "Stop all 7"** so the toolbar fits one row.
- **A curly apostrophe in "I’m the admin"**, like the rest of the app.
- **Older tests use a flat Settings view** (a localStorage flag only tests set); the new suite and the screenshots use the real pages.

**Known issues (3.4.0):**
- The stepper sheet replaces the Settings sheet while it's open (Done goes back); iOS would push it inside the same sheet.
- Very long meet names still take two lines next to a weather tag.
- Headless Chrome can't show iOS Dynamic Type exactly; check Settings at a large text size on the phone.

## 3.3.1: Undo with words, End workout, Edit mode, team colors (Tue 10/6)
Rollback tag before this: `before-3.3.1` (= 3.3.0). No rules change.

10. ✅ 3.3.1. **Undo says what it undoes:** the tile's ↶ is now a labeled button, "Undo lap 3 (2:24.1)" or "Undo rep 2 · 800m (2:24.1)" (also in ⋯). After each lap the tile shows "Lap 3 recorded · 2:24.1 · Undo" for 4 seconds. **Start over** stays its own action in ⋯ (when stopped or done), separate from Undo, with its own Undo on the tile.
11. ✅ 3.3.1. **End workout** at the top of the Stopwatches tab: saves every stopwatch's laps and splits to practice history (Data > Meets > Practice history; on a phone without a team too, new), then clears every tile, with one Undo (the tiles, the clocks and the entry all come back; a running clock never stops). On a team it asks "End for all coaches?" and clears every coach's phone. **Edit** in the nav bar (iOS style): tap tiles to select them, then Remove n, with one Undo.
12. ✅ 3.3.1. **Team colors everywhere:** Girls pink (circles), Boys blue (squares) in charts, keys, Team tab headings, the runner lists, and runner chips (workout flow, Bench, race setup). A boy's own charts on his runner card are blue; the Compare runners chart uses neutral colors (gold, teal, slate), since it compares people, not teams. Light: pink #b8247f, blue #3a4fc9; dark: #f47fcf, #8c9bff. Contrast 5.2–8.8:1 in both themes; the pink sits about 40° of hue from the "well behind" red, and the blue (indigo) about 25° from the button blue.

**Decisions made (3.3.1):**
- **Idle stopwatches from before joining stay on that phone** until one is started (found while testing 3.3.0: a new phone joining would otherwise drop its three demo cards on every coach). Recorded under 3.3.0 too.
- **The lap note shows for 4 s,** then the labeled Undo returns; both undo the same tap.
- **End workout stops running clocks at that moment** and saves them with what they had; Undo removes those stop taps, so the clocks continue as if never stopped.
- **Practice history without a team** keeps the latest 30 workouts on the phone (removing one has Undo). With a team it's Team history, as before.
- **Edit mode taps select; they never start or stop a clock.** Leaving the tab ends Edit mode.
- **Compare runners isn't in team colors,** so a boy compared with a girl is never shown in the other team's color.

**Known issues (3.3.1):**
- Headless Chrome can't show the iOS look of the selection circles exactly; check Edit mode on the phone.

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
- ✅ Rollback tags before each phase (`before-2.13.0`, `before-2.14.0`, `before-3.0.0`, … `before-3.10.0`) and data that older versions can read (CLAUDE.md rule 11, How to roll back), since 2.13.0.
- ✅ Pushing on a meet day is allowed since 2.8.1 (CLAUDE.md rule 8); `tests/meetday.sh` only reports it.
- ✅ Every suite in `tests/` passes before any push (`tests/run.sh`, CLAUDE.md "Testing").

## Missed or partial (summary)

As of 2.9.0, nothing is ❌ Missed. Remaining 🟡:
1. **2.4.0 and 2.5.0 were pushed on a meet day** (Thu 10/1 evening). That's allowed now (since 2.8.1).
2. **Publishing the rules file (2.9.2) is your step** (2.9.0 is published). It's safe any time (it only adds Varsity/JV edits and merged runners), and it's needed for merges to reach every phone (the "Ben To." cause, 2.12.0).
3. 2.8.0 gaps 3 (raw beside adjusted), 4 (tagging during a live race, tag history in the time editor) and 5 (badge test) were closed in 2.8.1.
