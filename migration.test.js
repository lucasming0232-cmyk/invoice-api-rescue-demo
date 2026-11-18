const test = require("node:test");
const assert = require("node:assert");
const { DatabaseSync } = require("node:sqlite");
const { migrate, listInvoices, suspectedDuplicates } = require("../src/db");

test("migrating a database that already contains duplicates succeeds, deletes nothing, and reports suspects", () => {
  const db = new DatabaseSync(":memory:");
  // Schema as shipped before the fix, with the damage already done.
  db.exec(`CREATE TABLE invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, client TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK (amount_cents > 0), created_at TEXT NOT NULL DEFAULT (datetime('now')));`);
  const ins = db.prepare("INSERT INTO invoices (client, amount_cents, created_at) VALUES (?, ?, ?)");
  ins.run("Acme", 12000, "2026-11-01 10:00:00");
  ins.run("Acme", 12000, "2026-11-01 10:00:07"); // retry 7 s later
  ins.run("Acme", 12000, "2026-11-20 09:00:00"); // a genuine repeat order weeks later
  ins.run("Beta", 500, "2026-11-02 08:00:00");
  migrate(db);
  assert.equal(listInvoices(db).length, 4, "no rows may be deleted by the migration");
  assert.deepEqual(suspectedDuplicates(db).map((r) => [r.id, r.repeat_of]), [[2, 1]], "only the 7-second repeat is suspected");
  migrate(db); // running it twice is safe
  assert.equal(listInvoices(db).length, 4);
});
