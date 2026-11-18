# Reproduction

Report received: "Some customers get two invoices for one order. It happens more on slow mobile connections."

## Steps (exact)
1. `npm test` — the test `retrying the same request (same Idempotency-Key) must not create a second invoice` fails with `expected 1 invoice, found 2`.
2. Or by hand: start the server (`node src/server.js`), then send the same request twice, as a client does after a timeout:
   ```
   curl -s -X POST localhost:3000/invoices -H 'content-type: application/json' -H 'idempotency-key: order-1001' -d '{"client":"Acme","amount_cents":12000}'
   curl -s -X POST localhost:3000/invoices -H 'content-type: application/json' -H 'idempotency-key: order-1001' -d '{"client":"Acme","amount_cents":12000}'
   curl -s localhost:3000/invoices
   ```
   Two rows come back.

## What this does NOT claim
- It reproduces the retry path only. I did not test concurrent requests or a real payment provider; this demo has neither.
