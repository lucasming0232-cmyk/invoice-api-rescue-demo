const http = require("node:http");
const { open, createInvoice, listInvoices, invoiceReport } = require("./db");

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
  });
}

function createServer(db = open()) {
  return http.createServer(async (req, res) => {
    const send = (code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
    try {
      if (req.method === "POST" && req.url === "/invoices") {
        const body = await readJson(req);
        if (!body.client || !Number.isInteger(body.amount_cents) || body.amount_cents <= 0) return send(400, { error: "client and positive integer amount_cents required" });
        const key = req.headers["idempotency-key"] || null;
        const r = createInvoice(db, body, key);
        if (r.conflict) return send(422, { error: "Idempotency-Key was already used with a different request" });
        return send(r.created ? 201 : 200, r.invoice);
      }
      if (req.method === "GET" && req.url === "/invoices") return send(200, listInvoices(db));
      if (req.method === "GET" && req.url === "/invoices/report") return send(200, invoiceReport(db));
      send(404, { error: "not found" });
    } catch (e) { send(400, { error: "bad request" }); }
  });
}

if (require.main === module) createServer(open("invoices.db")).listen(3000, () => console.log("listening on 3000"));
module.exports = { createServer };
