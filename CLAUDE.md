# Mustang Splits: guide for Claude Code

Cross country pace board PWA for Coach Rankin (Little Chute Mustangs). Used live at practice on an iPhone, often with weak or no signal. Up to 30 named stopwatches; each can follow a workout plan (sections with distance, target, check-in marks, repeats, rest) and shows expected vs actual position.

## Stack and deploy
- Plain HTML, CSS and JavaScript. No framework, no build step, no npm. Keep it that way unless the coach asks.
- Hosting: Vercel, connected to the GitHub repo. Pushing to `main` deploys automatically. Do not use the Vercel CLI.
- The coach verifies changes on his iPhone after the deploy finishes. For bigger features, work on a branch and push it: Vercel builds a preview URL he can test before merging.
- Rescue if a deploy breaks the app: `git revert HEAD --no-edit && git push`

## Files
- `index.html`: page shell, header, bottom tab bar, the three views.
- `styles.css`: design tokens on `:root` (light and dark), components, phone rules. School colors: Carolina blue `#4b9cd3`, navy `#13294b`, sky `#bfe3f7`.
- `app.js`: all logic in one IIFE. Sections are marked with `/* ---------- name ---------- */` comments.
- `sw.js`: service worker. Network-first for the app's own files with a 3 s timeout, then cache. Fonts cache-first.
- `manifest.webmanifest`, `icons/`: install metadata and icons.
- `version.json`: the version the running app compares itself against to show the Update banner.
- `vercel.json`: cache headers for `sw.js` and `version.json`.

## Rules for every change
1. Bump the version in BOTH `app.js` (`APP_VERSION`) and `version.json`. They must match. Patch for fixes (1.0.1), minor for features (1.1.0). This is what makes the Update banner appear on the phone.
2. Never rename the localStorage key `mustang-splits:v1`. It holds the coach's rosters, workouts and running clocks; renaming it wipes them. If the saved data shape changes, migrate old data inside `load()` instead.
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

## Handoff
When continuing work, ask the coach what changed on his phone since the last session and read this file first. Update this file when architecture or rules change.
