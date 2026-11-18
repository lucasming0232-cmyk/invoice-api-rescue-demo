# Case 2 result

Tests: before the fix 10 passed / 1 failed (the new query-count test); after the fix 11 passed / 0 failed.

Timing on my machine, in-memory SQLite, best of 5 runs (`node rescue/bench.js N`). Numbers vary by machine; the shape is what matters.

| Invoices | Before | After |
|---|---|---|
| 1,000 | 18.6 ms | 1.0 ms |
| 5,000 | 352.4 ms | 4.4 ms |

SQL statements per request: 1 + N before, 1 after.

This is a demonstration project with invented data, not client work.
