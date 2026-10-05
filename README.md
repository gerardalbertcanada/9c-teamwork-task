# Teamwork Team Tasks Dashboard

Shows every open Teamwork task assigned to the team (the same 11-person roster as the hours dashboard) plus unassigned tasks, and puts the ones that need attention first. Same stack as the other dashboards: React + Recharts frontend, Vercel serverless proxy to the Teamwork API.

## What it flags

| Flag | Rule |
|---|---|
| Overdue | Due date is before today |
| Due soon | Due today, tomorrow, or the day after |
| Stale | No change to the task in N days (3 / 5 / 7 / 14 / 30, picked in the page; default 7) |
| Unassigned | No one is assigned |
| No due date | No due date set (shown on its own tile, not counted in "Needs attention") |

"Needs attention" = overdue, due soon, stale, or unassigned. The list is sorted worst-first: most days overdue at the top.

Every count tile is a filter. Click a bar in the people chart or a row in the projects list to narrow everything to that person or project; click it again to clear.

## Staff roster

Edit `const STAFF` in `index.html` (same format as the hours dashboard). Tasks assigned only to people outside the roster are hidden; the footer says how many.

## Deploy to Vercel

1. Put these files at the **root** of a new GitHub repo.
2. Vercel → **Add New… → Project** → pick the repo.
3. **Settings → Environment Variables**: add `TEAMWORK_API_KEY` (your Teamwork API key). The proxy has no key in the code and will refuse to run without it.
4. Deploy.

## Security

- The proxy only allows `tasks.json`, `people.json`, `projects.json` and `time_entries.json`, GET only. Anything else is refused.
- The dashboard URL is still readable by anyone who has it. Turn on Vercel's Deployment Protection for this project so only your team can open it.
- The same `api/teamwork.js` works for the hours dashboard (it allows `time_entries.json`), so you can drop it into that repo too.

## First-run check

This was tested against mock data shaped like Teamwork's v1 `tasks.json`, not your live account. After deploying, open:

```
your-site.vercel.app/api/teamwork?endpoint=tasks.json&pageSize=1
```

The dashboard reads these fields from each item in `todo-items`: `id`, `content`, `project-id`, `project-name`, `company-name`, `todo-list-name`, `responsible-party-ids`, `due-date` (YYYYMMDD), `last-changed-on`, `completed`, and `boardColumn.name` if present. If any are named differently, update `normalise()` in `index.html`. The page also shows a yellow warning if assignees or dates all come back empty.

## Paging

Teamwork returns 250 tasks per page with paging info in response headers. The proxy copies those into `_pagination`, and the page fetches every page (5 at a time), so 500+ tasks load in full.
