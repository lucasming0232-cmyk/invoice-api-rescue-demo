# Commit story

The original repository history, one line per step (before -> failing test -> fix). Uploaded as a single snapshot.

- 7181ecb  App as received: invoice API (happy path works)
- ebe5d17  Add failing test reproducing 'customers billed twice' on retry
- 19709ef  Add reproduction, diagnosis and proposed fix (before changing code)
- d02cd2c  Refine migration plan: never delete automatically; report suspected duplicates
- 42f3616  Fix duplicate invoices: unique idempotency key, idempotent insert, safe migration, tests
- 7355390  Case 2 as received: payments and invoice report endpoint (correct, but slow on large lists)
- bde6252  Add failing test: report issues one SQL query per invoice (N+1)
- b2607b1  Fix slow report: single LEFT JOIN query and index on payments.invoice_id; add diagnosis, benchmark, result
