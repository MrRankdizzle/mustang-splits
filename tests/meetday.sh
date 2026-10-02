#!/bin/bash
# Exit 1 if today is a meet day (never push on a meet day). Keep this list in step with the meet schedule.
MEETS="2026-08-28 2026-09-03 2026-09-11 2026-09-19 2026-09-24 2026-10-01 2026-10-08 2026-10-10 2026-10-16 2026-10-23 2026-10-31"
today=$(date +%F)
for d in $MEETS; do [ "$d" = "$today" ] && { echo "MEET DAY ($today): do not push today."; exit 1; }; done
echo "Not a meet day ($today)."
