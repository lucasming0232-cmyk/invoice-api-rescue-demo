const { DatabaseSync } = require("node:sqlite");

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client TEXT NOT NULL,
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id),
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0)
    );
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id)");
  const cols = db.prepare("PRAGMA table_info(invoices)").all().map((c) => c.name);
  if (!cols.includes("idempotency_key")) db.exec("ALTER TABLE invoices ADD COLUMN idempotency_key TEXT");
  // UNIQUE index permits many NULLs, so existing rows (no key) do not block it and are never touched.
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_idempotency_key ON invoices(idempotency_key)");
}

function open(file = ":memory:") {
  const db = new DatabaseSync(file);
  migrate(db);
  return db;
}

// Returns { invoice, created }. With a key, a repeat returns the original invoice (created=false).
// Same key with a different payload is a client error, reported as { conflict: true }.
function createInvoice(db, { client, amount_cents }, key = null) {
  if (!key) {
    const r = db.prepare("INSERT INTO invoices (client, amount_cents) VALUES (?, ?)").run(client, amount_cents);
    return { invoice: db.prepare("SELECT * FROM invoices WHERE id = ?").get(Number(r.lastInsertRowid)), created: true };
  }
  const r = db.prepare("INSERT INTO invoices (client, amount_cents, idempotency_key) VALUES (?, ?, ?) ON CONFLICT(idempotency_key) DO NOTHING").run(client, amount_cents, key);
  const invoice = db.prepare("SELECT * FROM invoices WHERE idempotency_key = ?").get(key);
  if (r.changes === 0 && (invoice.client !== client || invoice.amount_cents !== amount_cents)) return { conflict: true };
  return { invoice, created: r.changes === 1 };
}

function listInvoices(db) {
  return db.prepare("SELECT * FROM invoices ORDER BY id").all();
}

function addPayment(db, invoiceId, amount_cents) {
  db.prepare("INSERT INTO payments (invoice_id, amount_cents) VALUES (?, ?)").run(invoiceId, amount_cents);
}

// Each invoice with how much has been paid and what is still owed.
// One statement for the whole list; LEFT JOIN keeps invoices that have no payments yet.
function invoiceReport(db) {
  return db.prepare(`
    SELECT i.*, COALESCE(SUM(p.amount_cents), 0) AS paid_cents,
           i.amount_cents - COALESCE(SUM(p.amount_cents), 0) AS balance_cents
    FROM invoices i LEFT JOIN payments p ON p.invoice_id = i.id
    GROUP BY i.id ORDER BY i.id`).all();
}

// For human review only: pre-fix rows that look like repeats. Never used to delete anything.
function suspectedDuplicates(db, minutes = 10) {
  return db.prepare(`
    SELECT a.id AS id, b.id AS repeat_of, a.client, a.amount_cents
    FROM invoices a JOIN invoices b
      ON a.client = b.client AND a.amount_cents = b.amount_cents AND a.id > b.id
     AND (julianday(a.created_at) - julianday(b.created_at)) * 1440 <= ?
    WHERE a.idempotency_key IS NULL AND b.idempotency_key IS NULL
    ORDER BY a.id`).all(minutes);
}

module.exports = { open, migrate, createInvoice, listInvoices, addPayment, invoiceReport, suspectedDuplicates };
