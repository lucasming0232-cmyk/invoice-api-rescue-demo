# Proposed fix (written before the change)

1. Store the key: add `idempotency_key TEXT` to `invoices` with a UNIQUE index (NULLs allowed, so old clients without a key behave as before).
2. Make the insert idempotent: `INSERT ... ON CONFLICT(idempotency_key) DO NOTHING`, then return the existing row. First request → 201, repeat → 200 with the same invoice.
3. Migration for existing data: old rows have no key, so nothing can be matched to a key. The migration adds the column and the index (a UNIQUE index allows many NULLs, so it succeeds even though duplicates already exist) and never deletes. It also produces a list of suspected duplicates (same client and amount within 10 minutes) for a human to review.
4. Tests: retry returns the same invoice; different keys create different invoices; no key keeps old behaviour; migration on a database that already has duplicates succeeds and reports what it left alone.

Out of scope for this fix (stated so nobody assumes it): payment-provider webhooks, concurrent-request load tests, key expiry.
