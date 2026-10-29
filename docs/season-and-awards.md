# Season summaries and awards (3.18)

Data > Highlights > Season (celebrations, shareable) and Awards (coaches only, never shared). All in app.js "season summaries and awards (3.18)", right after the latest-meet section; sync.js `awardData()` and the `awards` kind; firestore.rules `awardOk()` and `match /awards/{docId}`. See also: `docs/data-and-charts.md` (Highlights, race-day ratings, `teamRows()`), `docs/import.md` (official results, `offLevel()`), `docs/meets-and-schedule.md` (the Schedule and the meet editor).

## Placement
- Data > Highlights has a segmented switch **Latest meet | Season** (`hlModeHTML()`, `[data-hlm]`, `S.settings.hlMode`, per phone, remembered; Latest meet is the default, so the 3.8–3.13 page is unchanged). `renderLatest()` draws the switch and the chosen mode; the switch hides while a pushed page (a runner's latest-meet page `hlRunner`, a runner's season page `ssRunner`, or Awards `ssAwards`) is open. `navBar()` shows ‹ Highlights and the runner's name (or "Awards"); `hlBack()`, a tap on the Data tab and leaving Highlights close all three.
- The season is the one picked in the nav bar's season picker (`ssSeason()` = `tvSeason` or the current season); changing it redraws Season.

## Season (celebrations, shareable)
- `seasonRes(a, Y)`: one result per runner per race day of the season (high school, 3000 m and up, official preferred, from `resultsFor()`); `teamOrder(Y, g)`: team order on each race day within Girls / Boys by pace.
- `seasonStory(a, Y)` (memoized): at 5K when the runner raced one, else their most common distance:
  - **arc**: opener → season best (raw), and `arcAdj` course- and weather-adjusted (`adjPace()`, both race days rated);
  - **PRs** and **season bests** set during the season (a race faster than every earlier result at that distance, the 3.12 rule), **milestones** (first 5K under N:00, `MILESTONE_MIN`);
  - **best adjusted race** (lowest adjusted pace, 2+ rated races);
  - **season over season**: last season's best vs this one (`sos`), the same meets a year apart (by series), the career PR by season (`career`);
  - **championship meets** (`isChamp()`), **team place** on each race day, **consistency** (races within 3% of the season-best pace, adjusted when every race is rated);
  - badges `hl` (PR count, Sub-N, arc, vs last season, Championship, Consistent) and a one-sentence **story** built from the numbers with the runner's first name (never a pronoun).
- `ssTeam(Y, g)`: Girls and Boys cards: the mean top-5 average and 1–5 spread over the season's full meets (`teamRows()` raw), the best and tightest meet, the first-to-last change (adjusted when rated, else raw on one course), total PRs and season bests.
- Screen: team cards, then Girls / Boys sections of rows (alphabetical, so no implicit ranking): name, two badges, "−1:12.4 since the opener", the season best. A row opens `ssDetailHTML()` (story, comparison cells, the season arc list with SB / best race / championship badges and team place, highlights, best adjusted race, team place, season over season, Share, the profile link). The Awards entry (lock icon) is at the bottom.
- **Share** (`ssShare()`, Copy / Share…): `ssTeamText(Y, g)` for the team (the Share button at the top) and `ssRunnerText(st)` per runner (on the runner's page). **Celebrations only**: never a coach note, a health reason, an award, a recipient, a Captain, good standing or varsity status. No emoji. `tests/e2e47.js` checks every recap against a list of coach-only words.

## Awards (coaches only, lock icon, never shared)
`awardsHTML(Y)` from `awData(Y, team)` (memoized; team 'G', 'B', or 'A' when Girls and Boys are together). The page says "Coaches only · never shared" with a lock; nothing on it reaches any share text.
- **Varsity or JV per result** (`resLevel(a, x)`): a coach's choice for that race day (`v-<date>` doc), else the official result's division from the results file (the parsed division text, `offLevel()` sources `file` and `set` only), else WIAA Sectional / State (varsity-only). Hand-timed races, and official results whose file has no division, are **unknown until a coach confirms them** in **Varsity at each meet** (`awVarSheet()`: every race day with its runners, Varsity / JV per runner, All Varsity / All JV per race, where each level came from). The derived division is shown only there, never on everyday screens.
- **Season's meets** (`total`, Awards settings): "Meets with a varsity race" (default: race days where this team had a confirmed varsity runner) or "Varsity meets on the schedule" (scheduled with a Varsity level, attending, up to today).
- **Most Valuable Runner** (`mvrCalc(rows, total, thr)`, pure, `MSApp.mvrCalc`): each runner's place among our varsity runners in each varsity race (by pace, within Girls / Boys), the average, eligible at `thr`% (default 80) of `total`; ranked lowest average first, the math shown ("2,1,3,1,2,2,2,3 = 16 (2.0)"; `mvrAvgTxt()`), equal averages flagged "Tie: coaches decide", runners under the threshold listed apart, and a note when a race has more than 7 runners marked varsity.
- **Varsity Letter** (checklist per runner): varsity races vs the season's meets (majority?), varsity at a Championship meet (Conference, Sectionals, State), senior (grade 12) with 3–4 high school seasons, good standing confirmed yes / no. Tapping a runner opens `awRunnerSheet()`: Captain this season, good standing Yes / No / Not set (only the yes or no is stored: no notes, nothing academic), grade and high school seasons (steppers; "Use the history" clears a coach's value).
  - Grade: a coach's value, else `gradeNow()` from the official results moved back to that season. Seasons out (`hsSeasons()`): a coach's value, else the number of seasons with high school results up to this one (this one counted).
- **Most Improved Runner**: evidence only, top five each: season-long (opener → season best, adjusted; raw only when every race was on one course), season over season (last season's best → this season's), biggest PR drops (best before Aug 1 → this season's best). Note: "Practice approach and academics are the coaches' call." Nothing academic is stored.
- **Rookie of the Year**: runners in their first high school season (`hsSeasons() === 1`, from the history or set to 1), with varsity races, team places and opener-to-best improvement. Note: "Practice participation and enthusiasm are the coaches' call."
- **Mustang Award**: coaches' choice; lists every runner who isn't a Captain or marked for MVR or Most Improved, with their season best and highlights, so no one is overlooked.
- **Recipients**: a Mark button on each candidate (`awToggle()`, Undo bar); marked names show under each award's heading and in the worksheet.
- **Awards settings** (`awSetSheet()`, the same for every coach): Girls and Boys separately (default on), the MVR threshold (50–100%, steps of 5, default 80), what counts as the season's meets.
- **Awards worksheet** (`awWorksheetCanvases()` → `pdfPages()`, `awExport()` → `shareFile()`): letter-size pages, one section per award per team with the math, the checklists, the evidence, the notes and "Recipient: ____" lines (or the marked names). The footer of every page says "Coaches only, never shared".

## Championship meets
- `isChamp(meet)`: a coach's choice (`m-<meet id>` doc), else the default: the NEC Conference, WIAA Sectional and WIAA State series (`CHAMP_SERIES`) or a meet kind naming Conference / Sectional / State meet.
- The meet editor (Schedule) has a "Championship meet" switch; untouched, it follows the series (choosing a series updates it), and only a touched switch is saved. Schedule rows show a Championship badge (trophy).
- Kept with the awards rather than on the meet document, so the meets rules (and older phones) don't change.

## Data (synced kind `awards`, `S.awards`)
One small document each, so two coaches rarely change the same one (last write wins per document; an arriving document replaces the local one whole, so a field unset on another phone is unset here):
- `s-<season>` `{k:'s', season, set:{split, thr, total}, recip:{'G.mvr':[ids], 'B.letter':[…], 'A.mustang':[…]}}`
- `r-<season>-<runner>` `{k:'r', season, aid, captain?, standing?:'yes'|'no', hs?, grade?}`
- `v-<date>` `{k:'v', season, date, var:{runner: 'V'|'JV'}}`
- `m-<meet id>` `{k:'m', season, meetId, champ}`

`awPut(id, base, patch)` creates or changes one (undefined removes a field) and saves. Never deleted (unmarking is an edit; sync.js `noDelete`). `migrate()` adds `awards: []`; older versions ignore it. Backups carry it with the rest of `S`.

**Rules (3.18.0):** `teams/{t}/awards/{id}`: any member reads and writes; only the fields above with their types (`awardOk()`); no deletes. Before the 3.18 rules are published, the awards listener is refused and the phone keeps its awards decisions to itself, quietly (`quietKinds`, like places and weather in 3.2); after publishing, reopening the app sends them.

## Tests and hooks
`tests/e2e47.js`; rules cases in `tests/rules.test.mjs` ("3.18:"). Hooks: `MSApp.mvrCalc(rows, total, thr)`, `seasonStory(id, Y)`, `seasonTeam(Y, g)`, `seasonShare(Y, id?)`, `awards(Y, team)`, `awPut(id, base, patch)`, `awardsPdf(Y)`, `isChamp(meetId)`, `getAwards()`.
