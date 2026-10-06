# Mustang Splits 3.0: design spec

Following Apple's Human Interface Guidelines for an iPhone web app (installed to the Home Screen). Written from an audit of every screen in 2.14.0 (screenshots: `docs/screenshots-3.0/before-*.png`, fake names). The after screenshots are `after-*.png` in the same folder.

**Goal:** a coach who has never seen the app can start a workout for the whole team in under a minute.

**Principles:** clear hierarchy, consistency, progressive disclosure (only what's needed now; secondary actions in menus or Settings), no redundant controls, every feature kept but placed where it makes sense.

## 1. Problems found (audit of 2.14.0)

### Everywhere
1. **No screen titles.** Every tab shares one "Mustang Splits" brand bar, so you can't tell where you are from the top of the screen. iOS puts a large title of the current screen there.
2. **Tab bar.** The selected tab is a large dark pill. iOS shows the selected tab with the tint colour on its icon and label, on a plain translucent bar. The Data badge sits on the pill's corner instead of on the icon.
3. **Typeface.** Barlow for everything. iOS uses the system font (SF Pro). The condensed face belongs on clock digits only. Text sizes are fixed pixels, so the phone's Larger Text setting does nothing.
4. **Buttons are all outlined boxes of one weight.** Primary, secondary and plain actions look alike, and the "selected" style (dark fill + ✓) is used for segmented controls, toggles and choices alike. iOS segmented controls are a grey track with a raised white segment.
5. **Sheets** have no grab handle and open at one height. The Done button sits at the bottom of long sheets.
6. **Destructive actions** (Clear all times, Clear finished stopwatches, Leave team) are red buttons sitting in the middle of Settings next to safe ones. iOS asks with an action sheet.
7. **No swipe actions or long-press menus.** Every row needs its own buttons (Use, Edit, Duplicate, Delete on each workout), which makes lists long and noisy.
8. **The Undo toast covers content** at the bottom centre (and once covered the Use this button on the Workouts tab).

### Stopwatches
9. "+ New", "?" and "Stop all" take three rows above the first tile. "?" (help) is used once.
10. The empty state is good (three choices), but the link "How to read a stopwatch card" competes with them.

### Workouts
11. One long page: today's goal, 2–3 suggestions, "Build your own", "+ New workout", every saved workout with four buttons each, then the editor inline at the bottom (on a phone you scroll past everything to edit).
12. In the editor, "How many times" and "Rest between" share one row: two steppers and the m:ss | sec toggle are squeezed.

### Team
13. Three toolbar buttons (Add runner, Paste a list, Merge runners) above the search and sort. Paste and Merge are occasional.

### Data
14. **Five buttons above the content** (Copy results, Save as spreadsheet (CSV), Recently deleted, Import history, Data health) before the Meets | Runners | Team switch. Copy and CSV export *today's stopwatches*, which are far down the page.
15. **Nested cards:** a meet card holds a race card that holds runner cards (three borders deep).
16. **"Leave tagged results out of trends"** appears on the Runners list, on every runner card and on the Team view: three copies of one setting.
17. The season picker is only in the Team view, in the content.
18. "‹ All runners" is a button inside the content instead of a back button.

### Settings
19. One long sheet with no sections: pace window, switches, your name, Team, "Nothing is ever lost" text, five data buttons, give-every-stopwatch-a-workout, two red buttons, Backup, tour, version.

### Race Mode
20. Works well (stable grid, big targets). Only style changes: system font, iOS buttons, End race as an action sheet.

## 2. The new layout

### Global
- **Navigation bar** on every tab: the large title of the screen ("Stopwatches", "Workouts", "Team", "Data") under the bar, the screen's actions as icon buttons on the right, then Settings (gear). The bar stays at the top; the large title scrolls under it and a small title appears in the bar, as on iOS. Safe area respected.
- **Tab bar:** standard iOS: icon + label, tint colour on the selected tab, grey otherwise, no pill. It sits on the bottom safe area. Badges are red circles on the icon's top-right.
- **Type:** the system font (`-apple-system`, SF Pro) for all text, with sizes in rem from `-apple-system-body`, so the phone's text size setting scales the app. Barlow Condensed only for clock digits (stopwatch times, the race clock).
- **Controls:**
  - Buttons: filled (tint) for the one primary action, grey-filled for secondary, plain tint text for tertiary.
  - Segmented controls: grey track, raised white segment.
  - Switches: iOS green.
  - Grouped inset lists (like iOS Settings).
  - Every touch target at least 44 pt. Pressed = a darker shade at once.
- **Sheets:**
  - Bottom sheets with a grab handle.
  - Two heights: *medium* (menus, short forms) and *large* (forms, lists). Drag the handle down, or tap outside, to close.
  - The title row has Cancel/Done like iOS.
- **Action sheets** for destructive choices: the destructive option in red, Cancel separate at the bottom. Used for Clear all times, Clear finished stopwatches, Stop all, Restore backup/snapshot, Leave team, Stop being admin, Delete permanently, End race.
- **Swipe actions** on list rows (workouts, runners), with Undo: swipe left to reveal Delete (red) and the secondary action.
- **Context menus:** press and hold a stopwatch tile, a runner or a workout to get its menu (the same actions as its ⋯ or row tap).
- **Undo** sits on the tile itself for stopwatch actions (2.13). Other Undo bars and toasts stay just above the tab bar (Race Mode: at the top). A top position was tried and dropped: it covered the first controls of each screen (the Data switch) for 8 seconds.

### Stopwatches
- Nav bar: **+** (New: Quick stopwatch / Workout / Race), Settings.
- No stopwatches: the three choices as a grouped list; the help moves to Settings > Help.
- With stopwatches: tiles (2.13). "Start all n" / "Stop all n" as one plain toolbar button when 2+ are waiting or running (Stop all asks with an action sheet). The ? button is gone (Settings > Help).

### Workouts
- **Today's goal** first (2.14): goals, the schedule, 2–3 suggestions.
- **Your workouts:** a grouped list. Tap a row for its actions (Use, Edit, Duplicate, Delete); swipe left for Delete / Duplicate; press and hold for the same menu.
- **+** in the nav bar = new workout. The editor opens as a large sheet. Reps and rest each get their own row.

### Team
- Nav bar: **+** (Add runner), **⋯** (Paste a list, Merge runners), Settings.
- Search field and the Average | Season best | Name segmented control, then Girls / Boys / No Girls/Boys sections as grouped lists.
- Tap a runner to edit; swipe left to Remove (Undo); press and hold for Edit / Add a result / Remove.

### Data
- Nav bar: the **season** picker (applies to Meets and Team), Settings (with a badge when Data health needs attention).
- The Meets | Runners | Team segmented control, then the content.
- **Share** button (square-and-arrow-up) on each view that exports: on each race (Copy results / Save as spreadsheet), and on Today's stopwatches. The top button row is gone.
- Import history, Recently deleted and Data health live in **Settings > Data** (with the badge).
- One level of cards: a meet is a list section; a race is a row that opens its results.
- "Leave tagged results out of trends" is one switch in Settings > Data.
- Runner card: a back button "‹ Runners" in the navigation bar position.

### Settings (large sheet, grouped inset sections)
1. **Stopwatches:** On-pace window (stepper), Smaller cards, Show times as they come in, Beep before each rep, Keep screen on.
2. **Race Mode:** Your name.
3. **Team:** as before (create/join, coaches' phones, admin).
4. **Data:** Meets, Import history file, Data health (badge), Recently deleted, Restore a snapshot, Leave tagged results out of trends, storage line.
5. **Stopwatch tools:** Give every waiting stopwatch a workout.
6. **Backup:** Back up, Restore.
7. **Clear:** Clear finished stopwatches, Clear all times (both ask with an action sheet).
8. **Help:** Show the quick tour, How to read a stopwatch card.
9. **About:** version, Check for updates.

### Race Mode
Same structure. System font, iOS buttons, End race as an action sheet (Save / Discard (red) / Keep racing).

## 3. Feature inventory

Every feature in 2.14.0, where it lives now, and where it lives in 3.0. `tests/e2e25.js` walks this list: for each feature it follows the 3.0 path from a fresh screen and checks the control is there and visible.

| # | Feature | 2.14.0 | 3.0 |
|---|---|---|---|
| F01 | New quick stopwatch | Stopwatches > + New > Quick stopwatch | Stopwatches > nav + > Quick stopwatch |
| F02 | New workout stopwatches (pick runners) | + New > Workout | Stopwatches > nav + > Workout |
| F03 | New race | + New > Race | Stopwatches > nav + > Race |
| F04 | Picker: Select all / Girls / Boys / Clear | Runner pickers | Runner pickers (unchanged) |
| F05 | Suggest pace groups | Runner pickers, step 2 | Runner pickers, step 2 (unchanged) |
| F06 | Start all waiting | Toolbar (2+ waiting) | Toolbar (2+ waiting) |
| F07 | Stop all running | Toolbar (2+ running) | Toolbar, asks with an action sheet |
| F08 | How to read a card (help) | Stopwatches > ? | Settings > Help |
| F09 | Tile: Lap / Stop (tap again) / Undo | Tile | Tile |
| F10 | Tile menu (⋯): Stop, Keep timing, Start over, Undo, Change workout, Change runners, Targets, Rename, Remove | Tile ⋯ | Tile ⋯, or press and hold the tile |
| F11 | Rename a stopwatch | Tile name | Tile name |
| F12 | Targets ± per runner | ⋯ > Targets | ⋯ > Targets |
| F13 | Splits list on the tile | Tile | Tile |
| F14 | Today's goal and suggestions | Workouts (top) | Workouts (top) |
| F15 | Use a suggestion (steppers) | Workouts > Use this | Workouts > Use this |
| F16 | Build your own workout | Workouts > link / + New workout | Workouts > nav + |
| F17 | Use a saved workout | Workouts > Use this workout | Workouts > tap a workout > Use |
| F18 | Edit a workout | Workouts > Edit (inline editor) | Workouts > tap > Edit (sheet) |
| F19 | Duplicate a workout | Workouts > Duplicate | Workouts > tap > Duplicate, or swipe |
| F20 | Delete a workout (Undo) | Workouts > Delete | Workouts > swipe left > Delete, or tap > Delete |
| F21 | Workout editor: parts, effort, pace given as, tap points, reps, rest | Inline editor | Editor sheet |
| F22 | Add a runner | Team > + Add runner | Team > nav + |
| F23 | Add to Girls / Boys | Team > section button | Team > section button |
| F24 | Paste a list | Team > Paste a list | Team > nav ⋯ > Paste a list |
| F25 | Merge runners | Team > Merge runners | Team > nav ⋯ > Merge runners |
| F26 | Search runners | Team > search | Team > search |
| F27 | Sort: Average / Season best / Name | Team, Data > Runners | Team, Data > Runners |
| F28 | Collapse Girls / Boys | Team | Team |
| F29 | Runner sheet: name, Girls/Boys, results, PRs | Team > tap runner | Team > tap runner |
| F30 | Remove a runner (Undo) / Delete permanently | Runner sheet > Remove runner | Team > swipe left > Remove, or runner sheet |
| F31 | Girls / Boys quick buttons (unset runners) | Team row | Team row |
| F32 | Meets / Runners / Team views | Data switch | Data switch |
| F33 | Season picker | Data > Team (content) | Data > nav bar |
| F34 | Meets list, race results, hand + official combined | Data > Meets | Data > Meets |
| F35 | Copy results / CSV for a race | Race > two buttons | Race > Share |
| F36 | Copy results / CSV for today's stopwatches | Data top buttons | Data > Today's stopwatches > Share |
| F37 | Edit hand times | Race > Edit hand times | Race > Edit hand times |
| F38 | Race tags / runner tags | Race > Race tags / Tag | Race > Race tags / Tag |
| F39 | Delete a saved race (Undo) | Race > Delete | Race > Delete (action sheet) |
| F40 | Races on this phone | Data > Meets (bottom) | Data > Meets (bottom) |
| F41 | Practice history | Data > Meets (bottom) | Data > Meets (bottom) |
| F42 | Meet charts (strip, year over year, pacing) | Data > a meet | Data > a meet |
| F43 | Runners list (averages, trend) | Data > Runners | Data > Runners |
| F44 | Runner card: PRs, charts, compare, races, pacing, paces, career | Data > Runners > a runner | Data > Runners > a runner (back in the nav bar) |
| F45 | Raw / Adjusted (Course-adjusted before 3.1) | Runner card, Team view | Runner card, Team view |
| F46 | Leave tagged results out of trends | Runners, runner card, Team view (3 copies) | Settings > Data (one) |
| F47 | Team view: ladder, top-5 chart and table, packs, improvement, seasons | Data > Team | Data > Team |
| F48 | Import history file | Data top button; Settings | Settings > Data |
| F49 | Recently deleted (restore) | Data top button; Settings | Settings > Data |
| F50 | Data health (badge, one-tap fixes) | Data top button; Settings | Settings > Data (badge on the gear and the row) |
| F51 | Restore a snapshot | Settings | Settings > Data |
| F52 | Meets screen (schedule, edit, new season, link past races) | Settings > Meets; Race setup > Meets | Settings > Data > Meets; Race setup > Meets |
| F53 | On-pace window | Settings | Settings > Stopwatches (stepper) |
| F54 | Smaller cards | Settings | Settings > Stopwatches |
| F55 | Show times as they come in | Settings | Settings > Stopwatches |
| F56 | Beep before each rep | Settings | Settings > Stopwatches |
| F57 | Keep screen on | Settings | Settings > Stopwatches |
| F58 | Your name in Race Mode | Settings | Settings > Race Mode |
| F59 | Team: create / join / password / admin / leave / phones / minimum version | Settings > Team | Settings > Team |
| F60 | Give every waiting stopwatch a workout | Settings | Settings > Stopwatch tools |
| F61 | Clear finished stopwatches | Settings (red button) | Settings > Clear (action sheet) |
| F62 | Clear all times | Settings (red button) | Settings > Clear (action sheet) |
| F63 | Back up / Restore | Settings | Settings > Backup |
| F64 | Quick tour | Settings; ? sheet | Settings > Help |
| F65 | Version, Check for updates | Settings | Settings > About |
| F66 | Storage line | Settings | Settings > Data |
| F67 | Race setup: meet, Girls/Boys/Both, name, runners, order/goals, columns, course/checkpoints, Compare to | Race screen | Race screen |
| F68 | Ready for the gun / Gun / Undo gun | Race screen | Race screen |
| F69 | Recording: I'm at, Time now name later, tidy up, hold to remove, edit checkpoints | Race screen | Race screen |
| F70 | End race: Save / Discard / Keep racing | Race > End race sheet | Race > End race (action sheet) |
| F71 | Race results editor (single, Edit times grid) | Race results | Race results |
| F72 | Exit race view / Race running bar | Race screen / bottom bar | Race screen / bottom bar |
| F73 | Update banner / minimum version | Top banner | Top banner |
| F74 | Install banner | Top banner | Top banner |
| F75 | Data tab badge (health) | Data tab | Settings gear and Settings > Data > Data health |

## 4. How it's built
- `styles.css` gets an "iOS 3.0" layer at the end: system font, rem sizes, tokens for grouped backgrounds, separators and tint (light and dark), the tab bar, nav bar, segmented controls, buttons, grouped lists, sheets with a grab handle, action sheets, swipe rows.
- `app.js`: the header shows the current tab's title and actions (`navBar()`); `actionSheet()` replaces `confirmBox()` for destructive choices (same promise interface); `swipeRow()` and `longPress()` attach to list rows and tiles; Settings is rebuilt as grouped sections; the Data top buttons move (Share buttons per view, Settings > Data).
- Nothing in the timing engine or saved data changes (CLAUDE.md rule 11): 3.0 is presentation only, so a rollback to 2.14 reads everything.
