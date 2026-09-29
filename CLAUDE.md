# Mustang Splits: guide for Claude Code

Cross country pace board PWA for Coach Rankin (Little Chute Mustangs). Used live at practice on an iPhone, often with weak or no signal. Up to 30 named stopwatches; each can follow a workout plan (sections with distance, target, check-in marks, repeats, rest) and shows expected vs actual position.

## Stack and deploy
- Plain HTML, CSS and JavaScript. No framework, no build step, no npm. Keep it that way unless the coach asks.
- Hosting: Vercel, connected to the GitHub repo. Pushing to `main` deploys automatically. Do not use the Vercel CLI.
- The coach verifies changes on his iPhone after the deploy finishes. For bigger features, work on a branch and push it: Vercel builds a preview URL he can test before merging.
- Rescue if a deploy breaks the app: `git revert HEAD --no-edit && git push`

## Files
- `index.html`: page shell, header, bottom tab bar, the four views (Stopwatches, Workouts, Team, Results).
- `styles.css`: design tokens on `:root` (light and dark), components, phone rules. School colors: Carolina blue `#4b9cd3`, navy `#13294b`, sky `#bfe3f7`.
- `app.js`: all logic in one IIFE. Sections are marked with `/* ---------- name ---------- */` comments.
- `sw.js`: service worker. Network-first for the app's own files with a 3 s timeout, then cache. Fonts cache-first.
- `manifest.webmanifest`, `icons/`: install metadata and icons.
- `version.json`: the version the running app compares itself against to show the Update banner.
- `vercel.json`: cache headers for `sw.js` and `version.json`.

## Rules for every change
1. Bump the version in BOTH `app.js` (`APP_VERSION`) and `version.json`. They must match. Patch for fixes (1.0.1), minor for features (1.1.0). This is what makes the Update banner appear on the phone.
2. Never rename the localStorage key `mustang-splits:v1`. It holds the coach's rosters, workouts and running clocks; renaming it wipes them. If the saved data shape changes, migrate old data inside `migrate()` instead (`load()` and Restore both run saved data through it).
3. If you change caching logic in `sw.js`, bump `CACHE` (for example `mustang-splits-shell-v2`). If you add a new file the app needs offline, add it to `SHELL`.
4. Read the timing engine before touching it (see below). Do a read-only review of `ACT.split`, the rest handling in `tick()`, and `updateLive()` first, and explain the plan before editing.
5. Phone rules: tap targets at least 44 px, inputs and selects at least 16 px font (smaller makes iOS zoom), respect safe areas (`env(safe-area-inset-*)`), keep the Stop two-tap guard.
6. Keep `MAX = 30` stopwatches unless asked.

## Timing engine (the delicate part)
- A stopwatch's time is `Date.now() - startAt` while running, or `pausedT` while stopped. Never count with intervals; the phone can sleep and timers drift.
- Plan progress lives in `w.run`: `rep`, `cp` (index of the next check-in), `phase` (`run`, `rest`, `done`), `repStartT` and `restEndT` (both in stopwatch milliseconds), `splits[]`, `laps[]`.
- `compile(workout)` turns a workout into `segs` and `cps` (check-ins with cumulative distance `d` and expected rep time `t` in seconds). Results are cached in `CC`; clear it when workouts change.
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
- `S.roster = [{id, name, group}]` (group optional; `load()` adds `[]` to old saves). The Team tab edits it: groups sorted with numbers in order, "No group" last; tapping a group heading renames the whole group; "Paste a list" takes `Name, Group` (or a tab) per line and skips duplicates.
- Stopwatches have `athleteIds[]`, `athleteNames[]` (a copy of the names taken when linked) and `autoName` (the name the app generated). Empty `athleteIds` means an unlinked stopwatch.
- Who is on the track is never stored on the athlete: `heldBy()` works it out from the current stopwatches every time. Idle, running and paused stopwatches hold their athletes; finished ones release them (their results stay). Deleting a stopwatch returns its athletes to the bench.
- `openBench(o)` is one sheet with two modes: add stopwatches (`{workoutId, after}`, from the Bench button or "Send athletes" on a workout) or change one idle stopwatch's members (`{watch}`, from the members line on the card). It respects `MAX`.
- Group stopwatch names: the shared group, otherwise "Maya + 2". `refreshIdle()` pushes roster renames to idle stopwatches only, and renames a stopwatch only while `name === autoName`. Deleting an athlete never changes a stopwatch; the saved names keep showing.
- "Clear track" in Settings removes idle and finished stopwatches; running and paused stay. Results and the CSV list members from `athleteNames`.
- `modal()` reuses `#modal`: attach listeners to elements inside the new HTML, never to `#modal` itself, or they pile up across openings.

## iPhone layout: safe areas and keyboard
- No `apple-mobile-web-app-status-bar-style` meta (black-translucent caused a top blur and a bottom gap on iOS 26). `viewport-fit=cover` plus `theme-color` #13294b paints the status bar navy; the header keeps `padding-top: env(safe-area-inset-top)`.
- The tab bar's bottom padding is `--tab-pb` (`max(8px, safe-area-bottom - 14px)`); `main` and the toast are offset from it. If a bottom gap ever returns in the installed app, the planned fallback is `html{height:100lvh}` under `@media (display-mode: standalone)`.
- Keyboard: a visualViewport listener sets `--kb` (keyboard height) and `body.kb-open` (above 80px). While open, the tab bar hides and `main`, `.overlay` and the toast move up by `--kb`. On touch devices, focusing a text field scrolls it to the center after 300 ms.
- The toast has `pointer-events:none` so it never blocks a tap on a sheet button.
- Headless Chrome can't reproduce safe areas or the iOS keyboard; check these on the phone.

## Backup and Restore (Settings)
- Back up shares (or downloads) `mustang-splits-backup-YYYY-MM-DD.json` (local date): `{app, version, savedAt, state: S}`. `shareFile()` is shared with the CSV export.
- Restore reads a file from the hidden `#restoreFile` input, accepts the wrapper or a bare state, runs it through `migrate()`, confirms with counts, replaces `S`, saves and reloads. Running clocks keep their wall-clock `startAt`.

## Handoff
When continuing work, ask the coach what changed on his phone since the last session and read this file first. Update this file when architecture or rules change.
