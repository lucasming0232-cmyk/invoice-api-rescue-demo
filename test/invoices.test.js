const test = require("node:test");
const assert = require("node:assert");
const { start, post } = require("./helpers");

test("creates an invoice", async (t) => {
  const s = await start(t);
  const r = await post(s.base, { client: "Acme", amount_cents: 12000 });
  assert.equal(r.status, 201);
  assert.equal((await r.json()).client, "Acme");
});

test("rejects invalid input", async (t) => {
  const s = await start(t);
  assert.equal((await post(s.base, { client: "", amount_cents: 100 })).status, 400);
  assert.equal((await post(s.base, { client: "A", amount_cents: -5 })).status, 400);
});

// Reported bug: "customers are being billed twice". A client retries the same request after a timeout.
test("retrying the same request (same Idempotency-Key) must not create a second invoice", async (t) => {
  const s = await start(t);
  const key = { "idempotency-key": "order-1001" };
  const first = await post(s.base, { client: "Acme", amount_cents: 12000 }, key);
  const retry = await post(s.base, { client: "Acme", amount_cents: 12000 }, key);
  const list = await (await fetch(s.base + "/invoices")).json();
  assert.equal(list.length, 1, `expected 1 invoice, found ${list.length}`);
  assert.equal((await first.json()).id, (await retry.json()).id, "retry should return the original invoice");
});

test("first request returns 201, the retry returns 200", async (t) => {
  const s = await start(t);
  const h = { "idempotency-key": "k1" };
  assert.equal((await post(s.base, { client: "Acme", amount_cents: 100 }, h)).status, 201);
  assert.equal((await post(s.base, { client: "Acme", amount_cents: 100 }, h)).status, 200);
});

test("different keys create different invoices", async (t) => {
  const s = await start(t);
  await post(s.base, { client: "Acme", amount_cents: 100 }, { "idempotency-key": "a" });
  await post(s.base, { client: "Acme", amount_cents: 100 }, { "idempotency-key": "b" });
  assert.equal((await (await fetch(s.base + "/invoices")).json()).length, 2);
});

test("requests without a key behave as before", async (t) => {
  const s = await start(t);
  await post(s.base, { client: "Acme", amount_cents: 100 });
  await post(s.base, { client: "Acme", amount_cents: 100 });
  assert.equal((await (await fetch(s.base + "/invoices")).json()).length, 2);
});

test("same key with a different payload is rejected, not silently accepted", async (t) => {
  const s = await start(t);
  const h = { "idempotency-key": "k2" };
  await post(s.base, { client: "Acme", amount_cents: 100 }, h);
  assert.equal((await post(s.base, { client: "Acme", amount_cents: 999 }, h)).status, 422);
});

test("many parallel retries of one request still produce one invoice", async (t) => {
  const s = await start(t);
  const h = { "idempotency-key": "burst" };
  await Promise.all(Array.from({ length: 20 }, () => post(s.base, { client: "Acme", amount_cents: 500 }, h)));
  assert.equal((await (await fetch(s.base + "/invoices")).json()).length, 1);
});
