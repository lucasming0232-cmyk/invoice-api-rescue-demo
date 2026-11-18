# Case 2 — "The report page gets slower with every invoice we add"

## What was reported
`GET /invoices/report` returns each invoice with paid and balance amounts. It was fine at launch and now takes noticeably longer every month.

## Reproduction
1. Create N invoices, half of them with a payment.
2. Call `GET /invoices/report` and count SQL statements (`test/report.test.js`) or time it (`node rescue/bench.js 5000`).
3. Result before the fix: 1 + N statements (60 invoices -> 61), and time grows faster than the invoice count.

## Two causes, both visible in the code
1. **One query per invoice (N+1).** `invoiceReport` loaded the list, then ran a separate `SELECT SUM(...) FROM payments WHERE invoice_id = ?` inside the loop.
2. **No index on `payments.invoice_id`.** Each of those queries scanned the whole payments table, so cost grew with invoices x payments, not just invoices.

## Fix (kept deliberately small)
- One `LEFT JOIN ... GROUP BY` statement for the whole report. `LEFT JOIN` keeps invoices without payments (paid = 0); `GROUP BY` stops several payments on one invoice from multiplying rows.
- `CREATE INDEX IF NOT EXISTS idx_payments_invoice_id`. It is created in the migration, is safe to run repeatedly, and does not touch existing rows.
- Output shape unchanged, so callers need no changes. A test checks the numbers, including invoices with no payments.

## Risk
Low. Read-only query change plus an additive index. Rollback: revert the commit; the index can stay or be dropped with `DROP INDEX idx_payments_invoice_id`.
