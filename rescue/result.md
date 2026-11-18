# Result

- Root cause fixed at the database layer (unique idempotency key + idempotent insert), not by hiding duplicates in the UI.
- 9 tests pass: the original failing retry test, status codes (201 first / 200 retry), different keys, no-key behaviour, key reuse with a different payload (422), 20 parallel retries, and a migration run on a database that already contains duplicates.
- The migration deletes nothing. It lists suspected duplicates for a human; in the test, the 7-second repeat is flagged and a genuine repeat order weeks later is not.

## Not covered (stated so it is not assumed)
- Payment-provider webhooks, real concurrency across multiple server processes, key expiry/cleanup, authentication.
- This demo uses invented data and a single small bug. A real rescue starts with a read-only copy of the client's repository and an agreed list of problems.
