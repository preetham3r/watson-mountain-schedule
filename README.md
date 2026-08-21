# Watson Mountain Middle School — Grade 6 Planner (2026–2027)

[![Pages](https://img.shields.io/github/deployments/preetham3r/watson-mountain-schedule/github-pages?label=site&logo=github)](https://preetham3r.github.io/watson-mountain-schedule/)
[![Last commit](https://img.shields.io/github/last-commit/preetham3r/watson-mountain-schedule?label=updated)](https://github.com/preetham3r/watson-mountain-schedule/commits/main)

**Live:** https://preetham3r.github.io/watson-mountain-schedule/

One page reference for Adithi's schedule at Watson Mountain Middle School.

## What it shows

- Today and tomorrow with the rotation letter, full class list, rooms and what to carry
- Live marker on the current period during school hours
- A / B / C / D day tabs, plus bell schedules for delays, testing and early release
- Coursework split into Tests and Assignments, with the last class meeting before each due date
- Announcements pulled from school email, with links back to the source message
- Quarter and semester dates, closures, merged supply list, per class late work and retake rules, contacts
- Print stylesheet that collapses to a single landscape page

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole page. No build step, no dependencies. |
| `updates.json` | Data written by the scheduled email scans. |

## updates.json

| Key | Holds |
|---|---|
| `coursework` | Tests and assignments. `type`, `cls`, `date`, `title`, `detail`, `source`, `url` |
| `items` | Everything else. `date`, `type` (deadline / event / notice), `title`, `detail`, `source`, `url` |
| `closures` | Unplanned closures. `date`, `reason`. Shifts every rotation letter after it. |
| `bellOverride` | Same day delay or early release. `date`, `schedule` (`d1` / `d2` / `early`), `reason` |
| `scans` | Log of each run. `at`, `summary`. Most recent 10. |

Editing `updates.json` never touches the page itself, so a bad scan cannot break the site.

## Notes

The rotation is anchored to 17 August 2026 being an A day. It advances one letter per school day and skips every closure on the LCPS calendar. Works offline once loaded, apart from the announcements feed.
