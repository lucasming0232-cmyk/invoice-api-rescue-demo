const { createServer } = require("../src/server");
const { open } = require("../src/db");
// Registers cleanup with the test context so a failing assertion never leaves the server running.
async function start(t, db = open()) {
  const server = createServer(db);
  await new Promise((r) => server.listen(0, r));
  t.after(() => new Promise((r) => { server.closeAllConnections(); server.close(r); }));
  return { base: `http://127.0.0.1:${server.address().port}`, db };
}
const post = (base, body, headers = {}) => fetch(base + "/invoices", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
module.exports = { start, post };
