# Team roster, Bench and the Team tab

Runners (`S.roster`), who holds whom, the Bench, the picker bar, the Team tab and typed results.

Moved out of CLAUDE.md on 2026-10-29 with its wording unchanged; the version tags in headings say when each part was built (the full old file is `docs/archive/CLAUDE-before-split.md`, and version-by-version history is in REQUESTS.md). "See X" in the text names a section heading; the index in CLAUDE.md says which file holds each one. See also: `docs/import.md` (merging runners), `docs/data-and-charts.md`.

## Team roster and Bench
- `S.roster = [{id, name, group, gender}]` (`load()` adds `[]` to old saves). Since 2.12 the Team tab doesn't show or edit `group` (it stays in the data and in Firestore so older phones keep working); groups are made in the workout flow instead (see 2.12). "Paste a list" takes `Name, Girls` (or `Name, Group, Girls`, the group ignored) per line and skips names already on the team.
- Stopwatches have `athleteIds[]`, `athleteNames[]` (a copy of the names taken when linked) and `autoName` (the name the app generated). Empty `athleteIds` means an unlinked stopwatch.
- Who is on the track is never stored on the athlete: `heldBy()` works it out from the current stopwatches every time. Idle, running and paused stopwatches hold their athletes; finished ones release them (their results stay). Deleting a stopwatch returns its athletes to the bench.
- `openBench(o)` is one sheet with two modes: add stopwatches (`{workoutId, after}`; no button opens this mode since the 2.3 workout flow) or change one idle stopwatch's members (`{watch}`, from the members line on the card). It respects `MAX`. Runners are listed by Girls / Boys (`genderSecs()`, 2.12), like the workout flow and race setup.
- Group stopwatch names: the shared group, otherwise "Maya + 2". `refreshIdle()` pushes roster renames to idle stopwatches only, and renames a stopwatch only while `name === autoName`. Deleting an athlete never changes a stopwatch; the saved names keep showing.
- "Clear finished stopwatches" in Settings (called "Clear track" before 2.3) removes idle and finished stopwatches, plus stopped (paused) stopwatch-only cards that have laps, since Stop is their end (`clearable()`); the confirm names those stopped cards. Running stopwatches and stopped workout cards stay. Results and the CSV list members from `athleteNames`.
- `modal()` reuses `#modal`: attach listeners to elements inside the new HTML, never to `#modal` itself, or they pile up across openings.

## Team tab and typed results (2.10)
- **Team tab** (`renderTeam()`): sections Girls, Boys, then "No Girls/Boys yet" (with Girls/Boys buttons). "+ Add to Girls/Boys" (`addRunnerSheet(g)`) sets the setting; groups are optional labels inside a section. The G/B tag button is gone. Paste a list takes "Name, Girls" or "Name, Group, Girls".
  - `convertGenderGroups()` runs once per phone (`S.settings.genderGroups2100`): groups named like Girls/Boys become the setting ("Girls JV" → Girls + group "JV"). A runner already marked the other way is kept. It shows what changed, with Undo.
- **Typed race results** replace typed PRs: `resultSheet(a)` ("+ Result" on each row) adds `{id, dist, t, date ('' = unknown), meet, src 'official'|'hand'}` to the old PR list `S.prs[id]` (synced as `prs/{id}`; `prData()` keeps the new fields). A pre-2.10 typed PR `{dist, t}` is a result with an unknown date. Removing one is a soft delete (trash kind `result`).
  - **PRs are always computed:** `prOf()` = fastest typed result; `careerBest()` = fastest of typed results, hand-timed races and official results (Compare to PR, the "New PR!" stamp, the 5K PR on each Team row). Season best includes dated typed results.
  - `resultsFor()` lists typed results (`where 'typed'`, no race to open). The "Update PRs?" offer after a race is gone.

## Team tab (2.12)
- **Team tab** (`renderTeam()`): one line per runner (full name, `gradeNow()` from official results, `seasonAvg()`), tap = the runner sheet (`resultSheet()`: name, Girls/Boys, results, Remove runner via `removeRunnerAsk()`). Collapsible sections (`S.settings.teamShut`), search (`#teamSearch`, outside `#teamList` so typing never loses focus), sort switch.

## Picker bar (2.13)
- **Picker bar** (`pickBar()`, `pickIds()`): Select all, Girls, Boys, Clear (+ Suggest pace groups in the workout flow and the Bench) at the top of the workout flow, the Bench and race setup. Only free runners are picked.
