# Diagnosis

**Root cause.** `POST /invoices` always inserts a new row. The client sends an `Idempotency-Key` header on retries, but the server never reads it, and the table has no column or constraint that could reject a repeat. A retry after a timeout is therefore indistinguishable from a new order.

**Where.** `src/server.js` (route ignores the header) and `src/db.js` (`createInvoice` is a bare INSERT; the schema has no uniqueness rule).

**Why deleting the duplicate rows in the admin screen is not a fix.** It removes symptoms only; the next retry creates a new duplicate, and a deleted invoice may already have been sent to the customer.

**Risk ranking**
1. High — duplicates keep appearing for every retried request (customers billed twice).
2. Medium — existing duplicate rows in production must be collapsed before a unique index can be added, otherwise the migration fails.
3. Low — no test covered retries, so this was invisible until reported.

**Evidence:** failing test in `test/invoices.test.js`; `reproduction.md`.
