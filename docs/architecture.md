# App plumbing: updates, screen wake, storage

Auto-update and the team minimum version, Keep screen on, and where the app keeps its data.

Moved out of CLAUDE.md on 2026-10-29 with its wording unchanged; the version tags in headings say when each part was built (the full old file is `docs/archive/CLAUDE-before-split.md`, and version-by-version history is in REQUESTS.md). "See X" in the text names a section heading; the index in CLAUDE.md says which file holds each one. See also: CLAUDE.md (Files, Stack and deploy), `docs/data-safety.md`.

## Where the app keeps its data (summary, checked against the code on 2026-10-29)
- **localStorage `mustang-splits:v1`:** the live data `S` (rosters, workouts, stopwatches with running clocks, settings, race). Never renamed (rule 2); never holds trash, snapshots or the race archive (rule 7).
- **Other localStorage keys** (never the app key): `mustang-splits:sync` (this phone's team sync state, see docs/sync-and-rules.md), `:clock` (clock offset), `:device` (this phone's id for events), `:race-rescue` (a race saved when the normal save failed), `:synclog` (Sync log), `:autoupd` (auto-update tries), `:tour`, `:markhint`, `:install-dismissed`, `:wxsug` (place suggestions), `:imp-created:<importId>` (what an import created, for its Undo), `:store:*` (fallback when IndexedDB is missing); tests only: `:test-flat-settings`, `:test-keep-brillion`.
- **sessionStorage:** `mustang-splits:updated` ("Updated to x.y.z"), `mustang-splits:restored`.
- **IndexedDB** database `mustang-splits` (version 2), stores `trash`, `snapshots`, `races`, `official` (docs/data-safety.md, docs/import.md).
- **Service worker** cache `mustang-splits-shell-v3` (`CACHE` in sw.js; bump it when caching logic changes, rule 3).

## Auto-update (2.9)
- The PWA section of app.js: `checkVersion(force, why)` fetches `version.json` on open (`'open'`), on return to the app (`'return'`), every 10 minutes (`'timer'`) and when the clocks stop (`'stopped'`). A newer version goes to `autoUpdate(why)`.
- **Never reloads during timing:** `timingNow()` = a running stopwatch or a live race (gun fired, status running) on this phone. While timing, the banner says it installs when the clocks stop; a 5 s check notices the stop.
- Not while the phone is in use (`inUse()`: a sheet open, a text field focused, a tap in the last 30 s), except right at open/return or the Settings "Check for updates" button.
- `applyUpdate()` asks the service worker to download every app file first (`{type:'refresh'}` message, sw.js `CACHE` v3), then `saveNow()` and reload; `sessionStorage['mustang-splits:updated']` makes the new version say "Updated to x.y.z". No loop: `mustang-splits:autoupd` allows 2 tries per version per 30 min.
- **Minimum version:** admin-only `minVersion` on the team doc (Settings > Team: "Require x.y.z" = this phone's version, or Turn off; `SYNC.setMinVersion`). A phone below it shows the full-screen `#forceUpd` "Updating…" and updates as soon as nothing is timing; with a clock running it shows a banner instead. If the new version can't arrive (offline, not on the server), it says so with Try again and "Use this version for now".
- Settings > Team lists each phone's coach name ("Coach (no name set)" if none; a name change is sent at once, `SYNC.touchDevice`), version and last seen; "All phones current — safe to publish rules" when none is older.
- Tests: `tests/e2e14.js` (fakes `version.json` and the app version per phone).

## Keep screen on (2.9.1)
- `applyWake()`: wanted when Settings "Keep screen on" is set, a stopwatch is running, or a race is live (`wantWake()`, any tab). Screen Wake Lock first.
- iOS before 18.4 refuses the wake lock in home-screen apps, and Safari refuses a request without a tap ("This device blocked it" in 2.9.0). So the app re-checks after every tap (a document `click` listener, after the tap's own action), on return, and every 3 s.
- If the lock is still refused, it plays a 1 px silent looping video (`wakeVideo()`, NoSleep.js media, MIT, inlined as data URIs). Settings says "iPhone backup method"; "Tap anywhere to keep the screen on" if even that needs a tap.
- `MSApp.wakeState()` for tests.
