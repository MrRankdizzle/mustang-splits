# Data and Awards navigation redesign (3.27)

**Goal:** a brand-new assistant coach finds any runner's season chart in under 10 seconds without being told where to look. This file is the audit of the Data tab and Awards as they were in 3.26.0, the new structure, and the inventory the tests walk (`tests/e2e56.js`). Area details stay in docs/data-and-charts.md, docs/season-and-awards.md and docs/banquet-and-exports.md.

## 1. Problems found (audit of 3.26.0)

### The Data tab
1. **A four-way segmented control is the whole navigation.** Meets · Team · Runners · Highlights at the top of the tab, remembered between visits (3.10), so the tab opens on whatever was last used. A new coach lands on Team or Highlights with no sign that Runners exists above the fold once the page has scrolled. Segmented controls are for views of one thing, not for destinations.
2. **"Team" twice.** A Team tab in the tab bar (the roster) and a Team section inside Data (top-5 averages). Both open a runner's profile with the season chart, by different paths (Team tab › row; Data › Runners › row), with different back labels.
3. **Highlights hides four screens behind two levels of segmented controls.** Highlights › (Latest meet | Season | Share), and Season holds the Awards as a small "Coaches only" row at the very bottom of a long page. Finding Awards is Data › Highlights › Season › scroll › Awards: three levels, two of them segmented controls.
4. **Nested controls everywhere.** Runners has a sort segmented control (Average | Season best | Name) and the Raw | Adjusted switch; Team has a season `<select>` in the nav bar and Raw | Adjusted; Awards has Girls | Boys; Highlights has its three-way switch. Several screens therefore start with two or three rows of controls before any content.
5. **Meets is an accordion pile.** The Schedule row, then "Team history" (hand-timed and official results as `<details>` entries, newest *saved* first, not newest meet first), "Races on this phone", "Practice history", then "Today's stopwatches" with a Share button and a read-only text box to paste. Opening an entry expands it in place, so the list jumps; nothing is searchable; a meet with a Girls race and a Boys race is two entries.
6. **Back is inconsistent.** A runner opened from Data › Runners shows "‹ Runners"; from Highlights "‹ Highlights"; a section itself has no back at all (the segmented control is the only way out), and tapping the Data tab again pops to the top, which nothing on screen says.
7. **The nav bar changes shape by section.** The season `<select>` appears in the bar on Team and Meets only; on Runners and Highlights the bar is empty.
8. **Exports and pastes live in two places.** "Today's stopwatches › Text to paste" is a raw export inside Data; the banquet book, graphics and workbook are under Highlights › Share and again under Settings › Data › Export. The Data tab badge counts Data health problems, but Data health itself is in Settings.
9. **No search.** Neither a runner nor a meet can be typed; Runners has a filter field but only inside that section.
10. **Dense rows.** A Runners row reads "Avg 21:03.4 Raw · 5 races · SB 20:40.0 · Last: Mustang Invite 21:36.0" in one small line; the default sort is the season average, which a new coach wouldn't call "fastest".
11. **Awards is one long page.** MVR, Varsity Letter (every runner with a four-line checklist), Most Improved, Rookie, Mustang Award, one after the other, Girls or Boys at a time, with the review flags, Varsity / JV by meet, settings, the worksheet, Share awards, Awards announced and the evidence buttons mixed in at the top. Nothing says what to do first or where you are.

**Time to a runner's season chart, before:** Data tab → (if the remembered section isn't Runners) Runners → scroll or type → tap the runner → scroll to the chart. Two to three taps once you know, but the first tap depends on knowing "Runners" is a segment inside Data and not the Team tab.

## 2. The new structure

```
Data  (home: large cards; a search field on top; "New" highlights card for 7 days after a meet)
├─ Meets       every meet and race, newest first            → Meet (its races, results, Edit Varsity/JV, times)
├─ Runners     every runner, fastest first, searchable      → Runner (season chart, races, PRs, trends)
├─ Team        top-5 averages and spread by meet, seasons
├─ Highlights  After a meet · Season                        → each ends in Share
├─ Awards      the guided flow: 1 Review JV tags … 8 Summary
├─ Schedule    the season's meets, next up
└─ Share       banquet book · social graphics · coach's workbook
```

**Navigation rules**
- Standard iOS push navigation. The home has the large title "Data". A pushed screen shows its own title and a back button labeled with the screen it came from ("‹ Data", "‹ Runners", "‹ Meets", "‹ Highlights", "‹ Awards"). Tapping the Data tab again pops to the home.
- One level of lists only: home → list → item. No segmented control chooses a destination; the only controls left on a list are view settings (Raw | Adjusted, Sort as a menu, the season as a menu), never a second row of tabs.
- Every list is a plain list of rows with a chevron: Meets newest first within each season (one row per meet with its races inside; a race not linked to a meet is its own row, Girls or Boys named; "Races on this phone" a group of its own), Runners fastest first (season best 5K; a Sort menu for Season average and Name), Schedule by date (its sheet).
- Search at the top of the home finds any runner or meet by name as you type; a result row opens that screen.
- Settings-like things stay out of Data: Import, Data health, Recently deleted, Sync log, Spreadsheet, Backups and the raw exports are in Settings › Data (they already were); "Today's stopwatches" (the practice grid and its text to paste) moves to Meets › Today's stopwatches, since it is results, not a setting.

**Home cards** (icon, name, one line): Meets "Every meet and race, newest first" · Runners "Season charts, PRs and trends for each runner" · Team "Top-5 averages and spread, meet by meet" · Highlights "Celebrations after a meet and for the season" · Awards "MVR, Most Improved, Rookie, Mustang Award, Letters, Captains" · Schedule "Next: Mustang Invite · Sat 10/3" · Share "Banquet book, social graphics, workbook". Awards is coaches only and says so.

**Highlights by moment.** The Highlights screen is two rows, **After a meet** (the latest meet's celebrations, the runner pages, Share the recap) and **Season** (team cards, each runner's season page, Share the season recap), with a Share row under them. Each screen ends with the same Share row, which opens the share hub.

**Awards as a guided flow.** A progress indicator (1–8) at the top, one step a screen, Next at the bottom, any step reachable from the indicator; the step reached is saved per season on this phone so the flow reopens where it stopped:
1. **Review JV tags** (the more-than-7 flags with Review, Varsity / JV by meet)
2. **MVR** 3. **Most Improved** 4. **Rookie of the Year** 5. **Mustang Award** 6. **Varsity Letters** 7. **Captains**
8. **Summary** (the recipients per award, Share awards, the Evidence slides, the banquet book, the worksheet, Awards announced).
Each award step shows the criteria in the coach's wording, the evidence table and tap-to-choose recipients for Girls and Boys (two sections on one screen, no Girls | Boys control), the Evidence slide button once a recipient is marked, then Next. Awards settings sit in the Summary.

**Smart defaults.** The Data tab reopens where it was left (the screen and, for a runner or meet, which one). For 7 days after a meet with highlights, the home shows that meet's highlights card first with a "New" marker until it is opened.

## 3. Feature inventory (old place → new place)
Walked by `tests/e2e56.js` (every item reachable, by the selectors noted in the test).

| # | Feature | 3.26 place | 3.27 place |
|---|---|---|---|
| D01 | Schedule (next meet, the season's meets, import) | Data › Meets › Schedule row | Data › Schedule |
| D02 | Team history / official results | Data › Meets › Team history (accordion) | Data › Meets (rows, newest first; the accordion still draws underneath and a meet's screen shows one entry of it) › Meet |
| D03 | A race's results, tap a time to edit, Edit Varsity/JV | Meets › entry (expanded) | Meets › Meet › race |
| D04 | Races on this phone (not saved to the team) | Data › Meets › Races on this phone | Data › Meets (marked "this phone") |
| D05 | Practice history (End workout) | Data › Meets › Practice history | Data › Meets › Practice history row |
| D06 | Today's stopwatches: grid, Share, text to paste | Data › Meets (bottom) | Data › Meets › Today's stopwatches |
| D07 | Season picker | nav bar `<select>` on Meets and Team | Team › Season menu (and Meets groups by season) |
| D08 | Find a runner | Data › Runners › filter field | Data home search (and Runners › search) |
| D09 | Sort runners (Average, Season best, Name) | Runners › segmented control | Runners › Sort menu (fastest first by default) |
| D10 | Raw / Adjusted | Runners, Team, runner card | the same screens (a switch, not navigation) |
| D11 | Runner row → runner card: PRs and SBs per distance, the season chart, every race, trends and tags, Edit in the nav bar | Data › Runners › row | Data › Runners › row (also from the home search) |
| D12 | Open a race from the runner card | card › race row | the same |
| D13 | Team: seasons at a glance, top-5 averages and spread per meet, the ladder | Data › Team | Data › Team |
| D14 | Latest meet celebrations, a runner's highlights page, Share the recap | Data › Highlights › Latest meet | Data › Highlights › After a meet |
| D15 | Next step and growth focus (coaches only) | runner highlights page | the same page |
| D16 | Season: team cards, runner rows → season page, Share the season recap | Data › Highlights › Season | Data › Highlights › Season |
| D17 | Share hub: banquet book, social graphics, coach's workbook | Data › Highlights › Share; Settings › Data › Export | Data › Share (and the Share row on Highlights and at the end of After a meet and Season; Settings › Data › Export stays) |
| D18 | The "new highlights" marker | a dot on the Highlights segment | the New card on the home |
| D19 | Awards: review flags and Review | Awards (top) | Awards › 1 Review JV tags |
| D20 | Varsity / JV by meet | Awards › row | Awards › 1 Review JV tags |
| D21 | MVR standings and Mark | Awards › MVR, Girls or Boys | Awards › 2 MVR (Girls and Boys) |
| D22 | Most Improved list and Mark | Awards › Most Improved | Awards › 3 Most Improved |
| D23 | Rookie of the Year list and Mark | Awards › Rookie | Awards › 4 Rookie of the Year |
| D24 | Mustang Award list, Mark, the citation | Awards › Mustang Award | Awards › 5 Mustang Award |
| D25 | Varsity Letter checklist, Mark, a runner's sheet (grade, seasons, standing) | Awards › Varsity Letter | Awards › 6 Varsity Letters |
| D26 | Captain per runner | the runner's sheet in the Letter list | Awards › 7 Captains (switches; still in the runner's sheet too) |
| D27 | Evidence slide per award | each award section | each step once a recipient is marked, and the Summary |
| D28 | Share awards (the studio), Awards announced, the worksheet PDF, Awards settings | Awards (top rows) | Awards › 8 Summary |
| D29 | Back buttons and the Data tab popping to the top | partly | every pushed screen; the tab pops to the home |
| D30 | Remembered place | the segment | the screen and its item |

## 4. Time to task
`tests/e2e56.js` scripts a new coach's path to a runner's season chart from the Data tab and fails if it takes more than 3 taps: Data tab → Runners → the runner (the chart is on the card without scrolling past anything but the header). The search path is also 3 taps or fewer: Data tab → the search field → the runner's result row.

## 5. What does not change
The data, the sync kinds, every sheet (results editing, Edit Varsity/JV, the runner's awards sheet, the studio, the book), the Team and Training tabs' runner profiles, Settings › Data. The old `data-rv` section containers and ids stay in the markup so every earlier test and the Team tab's "open a race" path keep working.
