// Usage: node rescue/bench.js [invoices]. Times invoiceReport on an in-memory database. Numbers vary by machine.
const { open, createInvoice, addPayment, invoiceReport } = require("../src/db");
const n = Number(process.argv[2] || 5000);
const db = open();
for (let i = 1; i <= n; i++) {
  const { invoice } = createInvoice(db, { client: `Client ${i}`, amount_cents: 10000 + i });
  if (i % 2 === 0) addPayment(db, invoice.id, 2500);
}
invoiceReport(db); // warm up
const runs = 5; let best = Infinity;
for (let r = 0; r < runs; r++) { const t = process.hrtime.bigint(); invoiceReport(db); best = Math.min(best, Number(process.hrtime.bigint() - t) / 1e6); }
console.log(`${n} invoices: best of ${runs} = ${best.toFixed(1)} ms`);
