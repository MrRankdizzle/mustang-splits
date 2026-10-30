# Setting up the live Google Sheet (3.20)

The live spreadsheet is a Google Sheet in your Drive that a small Firebase Cloud Function keeps up to date from the team's data. The function runs in the `mustang-splits` Firebase project, so it works from any coach phone and needs no app open. Set it up once from the Mac; after that any coach phone can connect (or disconnect) the sheet in **Settings › Data › Spreadsheet**. Design and what's in each sheet: `docs/spreadsheet-sync.md`.

Costs: the function runs a few times a day for a few seconds. That is far inside Firebase's free allowance, but Cloud Functions need the **Blaze (pay as you go)** plan, so step 1 sets a spending cap so a mistake can never cost more than you choose.

## 1. Firebase: Blaze plan with a spending cap
1. Open the [Firebase console](https://console.firebase.google.com/) › project **mustang-splits** › the gear › **Usage and billing** › **Details & settings** › **Modify plan** › **Blaze**. It asks for a Google Cloud billing account (a card). Create one if you have none.
2. Set a cap: in the same place, **Set a budget alert** (or [Google Cloud console › Billing › Budgets & alerts](https://console.cloud.google.com/billing/budgets)): a budget of **$5 a month** with alerts at 50%, 90% and 100%. Google emails you if spending reaches those amounts (it won't for this; the function's normal use is $0).
3. Optional hard stop: in Google Cloud › Billing › Budgets, "Connect a Pub/Sub topic" lets a budget disable billing automatically; the $5 alert is enough for this project.

## 2. Google Cloud: enable the Sheets API
The function talks to Google Sheets through the Sheets API; it is off until you turn it on.
1. [Google Cloud console](https://console.cloud.google.com/) › pick the project **mustang-splits** (top left).
2. **APIs & Services › Library** › search **Google Sheets API** › **Enable**.
3. Also enable **Cloud Scheduler API** and **Cloud Build API** if the deploy in step 3 asks for them (the deploy usually enables them itself and tells you).
No Drive API and no OAuth screen are needed: the function never browses your Drive; you share one sheet with it (step 4).

## 3. Deploy the function (once, from the Mac)
From the repo folder (`~/Documents/mustang-splits`), with the tests' node modules installed (`tests/setup.sh` once):
```
cd functions && npm install && cd ..
tests/node_modules/.bin/firebase login            # the first time only: opens the browser, sign in as the Firebase project owner
tests/node_modules/.bin/firebase deploy --only functions --project mustang-splits
```
The deploy takes two or three minutes and ends with `✔ Deploy complete!` listing `sheetSync` and `sheetDaily`. If it says an API must be enabled, it gives the link; enable it and run the deploy again. Deploy again whenever `functions/` changes (REQUESTS.md says so under the version).

What the first deploy did (Fri 10/30): it turned on the APIs it needs by itself (Cloud Functions, Cloud Build, Artifact Registry, Cloud Run, Eventarc, Pub/Sub, Cloud Scheduler). The very first time, it can fail with "Permission denied while using the Eventarc Service Agent": Google's permissions take a few minutes to propagate; run the same command again. Add `--force` once so it sets a cleanup policy for old container images (otherwise it warns about a small monthly bill). The function runs on Node 22 (`firebase.json`; Google retired Node 20 on 2026-10-30). When Google retires a runtime, the deploy says so: raise the version in `firebase.json` and `functions/package.json` together and deploy again.

**Firestore rules 3.20.0 must be published** (Firebase console › Firestore Database › Rules, paste `firestore.rules`, Publish) before phones can write the spreadsheet documents: until then the Spreadsheet page says the rules need publishing. These rules only add the `sheet` collection, so publishing them first is safe for older phones.

## 4. Authorize Drive access: share one sheet with the function
The function has its own Google account (a service account) and can only touch sheets shared with it.
1. On a phone that is on the team: **Settings › Data › Spreadsheet › Set up**. Within a minute the page shows the function's address (it looks like `…@appspot.gserviceaccount.com` or `…-compute@developer.gserviceaccount.com`). Tap **Copy the address**. (If it keeps saying "Waiting for the sync function", the deploy or the Sheets API is missing: steps 2 and 3.)
2. In Google Drive, **New › Google Sheets**: a blank sheet, private to your account. Name it, for example *Mustangs XC 2026*.
3. **Share** › paste the address › **Editor** › turn off "Notify people" › **Share**.
4. Copy the sheet's link (the address bar) and paste it into the Spreadsheet page › **Connect**.
Within a minute the page says *Connected: Mustangs XC 2026* with the time of the last sync, and the sheet fills in: the Coach's Brief first, then Season board, Meet grid, Splits, Progress, Team, Training paces, Weather and Raw data. Google's own empty "Sheet1" is hidden, not deleted.

## 5. Keep it coaches only
The Coach's Brief names next steps, readiness and award standings. The sheet is private to your account and shared with the function only. **Share it only with coaches.** A sheet for parents or runners is a different thing: the banquet book, social graphics and the coach's workbook (Data › Highlights › Share) hold celebrations and results only.

## What happens after that
- The sheet updates by itself after a race is saved, official results are pasted, a history import, a correction or tag change, roster, schedule or awards changes, and every morning at 5:30 Central; at most once a minute. The Spreadsheet page shows the last sync and has **Sync now**.
- Only sheets whose data changed are rewritten. Your notes in the yellow **Coach notes** column stay and follow their row when rows move. Everything else in a sheet is rewritten: type notes in that column, not elsewhere.
- Column widths and the chart at the top of each data sheet are set when the sheet is first made and left alone after that; widen a column and it stays.
- **Disconnect** on the Spreadsheet page stops the updates (the sheet stays as it is). Connecting a different sheet: Disconnect, then Set up again with the new link.

## If something goes wrong
- *Can't open the sheet yet*: the sheet isn't shared with the function's address as Editor, or the link is wrong. Share it, then **Sync now**.
- *Waiting for the sync function* for more than a minute after Set up: the function isn't deployed (step 3), or the Sheets API is off (step 2). The Firebase console › Functions › Logs show the error.
- *Sync failed* with a message: the message is Google's. The function's logs (Firebase console › Functions › `sheetSync` › Logs) have the details.
- Rolling the app back below 3.20 doesn't remove the function; it simply stops being asked. `firebase functions:delete sheetSync sheetDaily --project mustang-splits` removes it.

## First-time checklist
1. Blaze plan on, $5 budget alert set.
2. Google Sheets API enabled for `mustang-splits`.
3. `firestore.rules` 3.20.0 published.
4. `cd functions && npm install && cd ..`, then `tests/node_modules/.bin/firebase deploy --only functions --project mustang-splits`: *Deploy complete* with `sheetSync` and `sheetDaily`.
5. On a team phone: Settings › Data › Spreadsheet › Set up › the address appears › Copy.
6. A blank Google Sheet in your Drive, shared with that address as Editor.
7. Paste the sheet's link › Connect › *Connected* within a minute; the nine tabs appear.
8. Open the Coach's Brief: if the Awards tracker is blank, set Varsity or JV for the race days it names (Data › Highlights › Season › Awards) and it fills in on the next sync.
9. Type a note in a yellow Coach notes cell, tap Sync now, and check that the note is still there.
