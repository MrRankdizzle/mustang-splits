# Timing engine

The stopwatch timing engine: `ACT.split`, rest in `tick()`, `updateLive()`, `planOf()`, `compile()`. Rule 4 in CLAUDE.md: read this and do a read-only review before touching it.

Moved out of CLAUDE.md on 2026-10-29 with its wording unchanged; the version tags in headings say when each part was built (the full old file is `docs/archive/CLAUDE-before-split.md`, and version-by-version history is in REQUESTS.md). "See X" in the text names a section heading; the index in CLAUDE.md says which file holds each one. See also: `docs/stopwatches.md`.

## Timing engine (the delicate part)
- A stopwatch's time is `Date.now() - startAt` while running, or `pausedT` while stopped. Never count with intervals; the phone can sleep and timers drift.
- Plan progress lives in `w.run`: `rep`, `cp` (index of the next check-in), `phase` (`run`, `rest`, `done`), `repStartT` and `restEndT` (both in stopwatch milliseconds), `splits[]`, `laps[]`.
- `compile(workout)` turns a workout into `segs` and `cps` (check-ins with cumulative distance `d` and expected rep time `t` in seconds). Results are cached in `CC`; clear it when workouts change.
- Plan copy: `ACT.start` saves `w.plan = planCopy(workout)` on the stopwatch (saved with it in localStorage). `planOf(w)` returns that copy whenever the stopwatch isn't idle, so a running, paused or finished stopwatch keeps the plan it started with through workout edits (local or from another coach) and app reloads (iOS often reloads home screen apps mid-rep). `ACT.reset` and Clear track drop it; idle stopwatches follow the current workout. `migrate()` gives already-started stopwatches from older saves a copy of their current workout. The engine (`ACT.split`, rest in `tick()`, `updateLive()`) only ever reads the plan through `planOf()`.
- **Effort-based parts (2.11):** a segment with `mode:'effort'` (`paceRef` cv|threshold|interval|repetition|5k|mile|easy|pct, `pct` = % of 5K speed) gets its seconds from a runner context: `segSeconds(s, ctx)` / `compile(wk, ctx)`. `ctx = watchCtx(w, wk)` is the stopwatch's runner, or a group's middle runner by VDOT, plus the remembered adjustment. `planOf()` builds it for a waiting stopwatch, and `ACT.start` saves it in the plan copy (`planCopy(wk, w)`), so a running stopwatch never changes. `ACT.split`, rest in `tick()` and `updateLive()` were not touched.
- `ACT.split` records `{rep, cpi, d, exp, act, delta, lap, lapExp, lapD, t}`. Positive `delta` means behind target.
- **3.3:** the engine reads time through `nowMs()` (`el()`, `ACT.resume`), which is `Date.now()` except while a shared stopwatch is replayed (`VNOW`, see Shared stopwatches); `beep()`/`buzz()` are silent during a replay (`REPLAY`). Nothing else in `ACT.split`, rest in `tick()` or `updateLive()` changed.
- When a rep's last check-in is split, rest starts; `tick()` starts the next rep exactly at `restEndT` even if the phone was asleep.
- Undo uses an in-memory snapshot stack (`HIST`); after a reload it falls back to popping the last split.
- Colors come from `cls(delta)` and the on-pace window `S.settings.tol`.
