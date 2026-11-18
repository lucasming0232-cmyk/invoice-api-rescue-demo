const test = require("node:test");
const assert = require("node:assert");
const { start, post } = require("./helpers");
const { open, addPayment } = require("../src/db");

// Counts how many SQL statements are prepared while `fn` runs.
async function countQueries(db, fn) {
  const original = db.prepare.bind(db);
  let n = 0;
  db.prepare = (sql) => { n += 1; return original(sql); };
  try { await fn(); } finally { db.prepare = original; }
  return n;
}

async function seed(db, count) {
  const { createInvoice } = require("../src/db");
  for (let i = 1; i <= count; i++) {
    const { invoice } = createInvoice(db, { client: `Client ${i}`, amount_cents: 10000 + i });
    if (i % 2 === 0) addPayment(db, invoice.id, 2500);
    if (i % 4 === 0) addPayment(db, invoice.id, 1000);
  }
}

test("report shows paid and balance, including invoices with no payments", async (t) => {
  const db = open();
  const s = await start(t, db);
  await seed(db, 4);
  const rows = await (await fetch(s.base + "/invoices/report")).json();
  assert.deepEqual(rows.map((r) => [r.paid_cents, r.balance_cents]), [[0, 10001], [2500, 7502], [0, 10003], [3500, 6504]]);
});

// Reported problem: "the report page gets slower with every invoice we add".
test("report cost does not grow with the number of invoices", async (t) => {
  const db = open();
  const s = await start(t, db);
  await seed(db, 60);
  const queries = await countQueries(db, async () => { await (await fetch(s.base + "/invoices/report")).json(); });
  assert.ok(queries <= 2, `expected at most 2 SQL statements for 60 invoices, got ${queries}`);
});
