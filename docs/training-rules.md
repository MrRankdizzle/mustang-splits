# Training rules behind "Start workout" (3.16)

The Training tab's **Team training paces** has a **Start workout** button. It turns the selection ("800 m at CV pace")
into a session with suggested reps and rest. The suggestions follow established rules of thumb for each kind of
training, set for **high school** runners. They are a starting point: the coach changes reps and rest with the
steppers, and the app remembers the coach's own numbers for that distance and effort.

The paces themselves come from each runner's best race this season (Jack Daniels' VDOT; CV = the pace held for about
30 minutes), as everywhere else in the app.

## The rules

| Effort | Usual rep | Rest | Most in one session (high school) | Source |
|---|---|---|---|---|
| Repetition (R) | 200–400 m | full recovery: 2.5 × the rep time (1:00 to 5:00), or a 200 m jog | 2.4 km | Daniels: R bouts up to about 2 min, recovery 2–3 × the work; R volume up to the lesser of 8 km and 5% of weekly mileage |
| Interval (I, VO2max) | 600–1200 m (2–5 min) | about equal to the rep time (1:00 to 5:00), or a 400 m jog | 4 km | Daniels: I bouts 3–5 min, recovery about equal to (or a little less than) the work; I volume up to the lesser of 10 km and 8% of weekly mileage |
| CV (critical velocity) | 800–2000 m | 45 s (≤ 1000 m), 60 s (≤ 1200 m), 75 s (≤ 1600 m), 90 s (longer) | 3 miles (4.83 km) | Tom Schwartz ("Tinman"): CV reps of roughly 800 m to 2 km at about 30-minute race pace with short rests |
| Threshold (T) | 1000–2000 m, usually a mile | 1 min per 5 min of running (at least 0:45); 2 miles or more: one continuous tempo run | 3 miles (4.83 km) | Daniels: cruise intervals with 1 min rest per 5 min of running; tempo runs about 20 min; T volume up to 10% of weekly mileage |
| 5K / Goal 5K pace | 1000 m to a mile | 2:00 (under 1200 m), else 3:00 | 3 miles (4.83 km) | Race-pace repeats at goal pace with 2–3 min rest (common high school practice) |
| 2-mile pace | 1000 m to a mile | 2:00 (under 1200 m), else 3:00 | 2 miles (3.22 km) | as above, scaled to the race |
| Mile pace | 1000 m to a mile | 3:00 | 2.4 km | as above, scaled to the race |
| Easy | one continuous run | none | 3–10 km (5 km when the chosen distance is outside that) | Daniels: E running, conversational |
| Long run | one continuous run at easy pace | none | 8–16 km (10 km when the chosen distance is outside that) | Daniels: L run up to about 25% of weekly mileage |

**How many reps:** the most in one session ÷ the rep length, rounded down, at most 12 (Repetition), 8 (Interval, CV),
5 (Threshold), 6 (5K / Goal 5K), 4 (2-mile) or 3 (Mile). The session limit always wins: when one rep is already
longer than it (a mile at repetition pace), the suggestion is one rep.

**High school adjustment:** the volume limits are Daniels' percentages applied to a high school runner at about 30
miles a week (5% ≈ 2.4 km of R, 8% ≈ 4 km of I, 10% ≈ 3 miles of T), and CV and race-pace sessions are kept to about
3 miles of fast running.

**Rest times** use the rep time of the team's middle runner for that effort (from the list). A jog rest is timed at
that runner's easy pace and ends by itself, like any rest; tap the row when they go.

**Outside the usual range** (for example 200 m at interval pace, or a mile at repetition pace) the app still suggests
reps and rest by the same rules and says so in the reason ("200 m is short for interval"). Rest for Repetition and
Interval never goes past 5:00 (Daniels keeps R bouts to about 2 minutes and I bouts to about 5, so their recoveries
stay under that), and the session limit keeps long reps to one or two.

Time options (1, 2, 3, 5 min) show distances in the list but can't start a workout: a stopwatch times a rep at a
distance.

## Worked examples (checked by tests/e2e45.js)

Rep time = the middle runner's time for one rep, used for rest. Rest in seconds; 0 = one continuous run.

| Effort | Distance | Rep time (s) | Reps | Rest (s) |
|---|---|---|---|---|
| repetition | 200 | 40 | 12 | 105 |
| repetition | 300 | 60 | 8 | 150 |
| repetition | 400 | 80 | 6 | 195 |
| interval | 600 | 125 | 6 | 120 |
| interval | 800 | 170 | 5 | 165 |
| interval | 1000 | 215 | 4 | 210 |
| interval | 1200 | 260 | 3 | 255 |
| interval | 200 | 40 | 8 | 60 |
| cv | 800 | 170 | 6 | 45 |
| cv | 1000 | 215 | 4 | 45 |
| cv | 1200 | 260 | 4 | 60 |
| cv | mile | 350 | 3 | 90 |
| cv | 2000 | 440 | 2 | 90 |
| threshold | 1000 | 230 | 4 | 45 |
| threshold | mile | 360 | 3 | 75 |
| threshold | 2mi | 720 | 1 | 0 |
| 5k | 1000 | 225 | 4 | 120 |
| 5k | 1200 | 270 | 4 | 180 |
| 5k | mile | 365 | 3 | 180 |
| goal | mile | 360 | 3 | 180 |
| 2mi | 1000 | 215 | 3 | 120 |
| 2mi | mile | 350 | 2 | 180 |
| mile | 1200 | 240 | 2 | 180 |
| mile | mile | 330 | 1 | 180 |
| easy | 2mi | 0 | 1 | 0 |
| easy | 400 | 0 | 1 | 0 |
| long | mile | 0 | 1 | 0 |
| repetition | 1000 | 200 | 2 | 300 |
| repetition | mile | 330 | 1 | 300 |
| interval | 2mi | 760 | 1 | 300 |
| cv | 2mi | 700 | 1 | 90 |
| 5k | 2mi | 735 | 1 | 180 |

## Sources

- Jack Daniels, *Daniels' Running Formula*, 3rd edition (Human Kinetics, 2014): the training intensities E, T, I and R,
  their rep lengths, recoveries and weekly volume limits.
- Tom Schwartz ("Tinman"), coach: critical velocity (CV) training, reps at about the pace held for 30 minutes with short
  recoveries, as described in his coaching writing.
- The app's pace engine (VDOT and CV) is described in CLAUDE.md, "Suggested training paces (2.11)".
