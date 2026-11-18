# Invoice API — rescue demo

A deliberately small invoice API, written the way AI-assisted tools often write it: it works on the happy path and breaks under retries.
This repository shows a rescue from start to finish. Every step is a separate commit so you can see before and after.

- `HISTORY.md` — the story step by step: app as received, failing test that reproduces the report, the fix.
- `rescue/` — diagnosis, reproduction steps, proposed fix (written before the fix was made).

## Two cases
1. **Duplicate invoices on retry** — `rescue/diagnosis.md`, `rescue/result.md`.
2. **Report page slows down as data grows (N+1 query + missing index)** — `rescue/case-2-slow-report/`, `node rescue/bench.js 5000`.

Run: `npm test` (Node 22.5+, no dependencies).

This is a demonstration project with invented data. It is not client work.
