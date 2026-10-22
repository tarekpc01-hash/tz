/* =====================================================================
   NILORIX — automatic crypto payment checker  (Cloudflare Pages Function)
   URL: POST /api/verify   body: { orderId, txHash? }

   It checks the payment ON THE BLOCKCHAIN (never trusts the buyer) and only
   then moves the order to "processing":
     - the transfer is real USDT (official BEP20 contract) — fake tokens are ignored
     - it was sent to OUR wallet
     - the amount is enough (and the order price matches the real price list)
     - the transaction succeeded, has confirmations and is newer than the order
     - the same transaction was never used for another order
   Anything unclear → the order stays as it is for manual review.

   Needs one secret in Cloudflare Pages → Settings → Variables and Secrets:
     FIREBASE_SA = the Firebase service-account JSON (Project settings → Service accounts)
   Optional:  BSC_RPC = comma-separated BNB Smart Chain RPC URLs
   ===================================================================== */
import "../../config.js";
import "../../data.js";

const USDT_BEP20   = "0x55d398326f99059ff775485246999027b3197955";   // official USDT on BNB Smart Chain (18 decimals)
const TRANSFER     = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const CONFIRMATIONS = 3;
const DEFAULT_RPCS = [
  "https://bsc-rpc.publicnode.com", "https://bsc.drpc.org", "https://1rpc.io/bnb", "https://bsc.meowrpc.com",
  "https://bsc-mainnet.public.blastapi.io", "https://bsc-pokt.nodies.app", "https://binance.llamarpc.com",
  "https://bsc-dataseed.bnbchain.org", "https://bsc-dataseed1.defibit.io",
];
const LOG_CHUNK = 1000, MAX_CHUNKS = 10;   // small ranges — free public nodes limit eth_getLogs
const PAID = ["processing", "delivered", "completed", "disputed"];

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ state: "error", message: "Bad request." }, 400); }
  const orderId = String(body.orderId || "");
  const txIn = body.txHash ? String(body.txHash).trim() : "";
  if (!/^[A-Za-z0-9]{10,40}$/.test(orderId)) return json({ state: "error", message: "Bad order id." }, 400);
  if (!env.FIREBASE_SA) return json({ state: "unavailable", message: "Automatic checking isn't set up yet." });
  try {
    return json(await verify(env, orderId, txIn));
  } catch (e) {
    console.error(e && e.stack || e);
    return json({ state: "unavailable", message: "Couldn't reach the blockchain right now — we'll keep trying." });
  }
}
export async function onRequestGet({ request, env }) {
  if (new URL(request.url).searchParams.get("diag") !== "1") return json({ ok: true, service: "nilorix payment checker" });
  /* setup check — shows which part works (never shows any secret) */
  const out = {};
  try {
    const sa = typeof env.FIREBASE_SA === "string" ? JSON.parse(env.FIREBASE_SA) : env.FIREBASE_SA;
    out.firebaseKey = sa && sa.client_email && sa.private_key ? "ok (" + (sa.project_id || "?") + ")" : "missing fields";
  } catch (e) { out.firebaseKey = env.FIREBASE_SA ? "not valid JSON — paste the whole file again" : "missing"; }
  try { const fs = await firestore(env); await fs.get("config/prices"); out.database = "ok"; }
  catch (e) { out.database = "error: " + String(e.message || e).slice(0, 160); }
  const rpc = makeRpc(env);
  try { out.blockchain = "ok (block " + Number(await rpc("eth_blockNumber", [])) + ")"; }
  catch (e) { out.blockchain = "error: " + String(e.message || e).slice(0, 160); }
  try {
    const latest = Number(await rpc("eth_blockNumber", []));
    const wallet = String(NX_CONFIG.WALLETS.usdt_bep20 || "").toLowerCase();
    out.logsPerNode = await rpc.each("eth_getLogs", [{ address: USDT_BEP20, fromBlock: hex(latest - LOG_CHUNK), toBlock: hex(latest),
                                                        topics: [TRANSFER, null, pad32(wallet)] }]);
    out.logs = Object.values(out.logsPerNode).some(v => v.startsWith("ok")) ? "ok" : "error: no node allows it";
  } catch (e) { out.logs = "error: " + String(e.message || e).slice(0, 160); }
  return json(out);
}

/* ===================================================================== */
async function verify(env, orderId, txIn) {
  const fs = await firestore(env);
  const doc = await fs.get(`orders/${orderId}`);
  if (!doc) return { state: "error", message: "Order not found." };
  const o = doc.data;

  if (PAID.includes(o.status)) return { state: "paid", txHash: o.txHash || null };
  if (o.status === "cancelled") return { state: "error", message: "This order was cancelled." };
  if (!["awaiting_payment", "payment_submitted"].includes(o.status)) return { state: "manual" };
  if (o.payMethod !== "usdt_bep20") return { state: "manual" };
  if (o.status === "payment_submitted" && o.verifyNote) return { state: "manual", message: "We're checking your payment by hand — usually within a few minutes." };

  const wallet = String(NX_CONFIG.WALLETS.usdt_bep20 || "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(wallet)) return { state: "manual" };

  /* 1) the order price must match the real price list (stops price tampering in the browser) */
  const prices = await fs.get("config/prices");
  NX_DATA.applyPrices(prices ? prices.data : {});
  let real = 0;
  for (const it of o.items || []) {
    const g = NX_DATA.byId(it.gid), pk = NX_DATA.pkgFor(g, it.p, it.amount);
    const qty = Number(it.qty);
    if (!pk || !Number.isInteger(qty) || qty < 1 || qty > 100) return flagManual(fs, doc, "Unknown item or quantity in this order.");
    real += pk.price * qty;
  }
  real = Math.round(real * 100) / 100;
  const total = Number(o.total);
  if (!(total > 0) || total + 0.009 < real) return flagManual(fs, doc, `Order total $${total} is lower than the real price $${real}.`);

  const totalWei = usdtWei(total);
  /* every order gets its own amount (total + a few 0.0001s) — that's what ties a transfer to THIS order */
  const exact = Number(o.cryptoAmount);
  const exactWei = exact > total && exact - total < 0.1 ? usdtWei(exact) : null;
  const placedAt = doc.createTime;   // server time — the buyer can't fake it

  const rpc = makeRpc(env);
  const latest = Number(await rpc("eth_blockNumber", []));

  /* 2) buyer gave a TX hash (or saved one earlier) → check that exact transaction */
  const tx = txIn || (o.status === "payment_submitted" ? o.txHash : "");
  if (tx) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(tx)) return { state: "error", message: "That isn't a valid BEP20 transaction hash (it starts with 0x and has 66 characters)." };
    const r = await rpc("eth_getTransactionReceipt", [tx]);
    if (!r) {
      const t = await rpc("eth_getTransactionByHash", [tx]);
      return t ? { state: "pending", message: "Your transaction is still being confirmed…" }
               : { state: "notfound", message: "We can't find this transaction on BNB Smart Chain (BEP20). Check the hash and the network." };
    }
    if (r.status !== "0x1") return { state: "error", message: "This transaction failed on the blockchain." };
    const got = usdtTo(r.logs, wallet);
    if (got === 0n) return { state: "error", message: "This transaction didn't send USDT (BEP20) to our wallet." };
    const block = Number(r.blockNumber);
    if (latest - block < CONFIRMATIONS) return { state: "pending", message: "Payment found — waiting for confirmations…" };
    const b = await rpc("eth_getBlockByNumber", [r.blockNumber, false]);
    if (Number(b.timestamp) * 1000 < placedAt - 60e3) return { state: "error", message: "This transaction was made before your order was placed." };
    const used = await fs.get(`payments/${tx.toLowerCase()}`);
    if (used && used.data.orderId !== doc.id) return { state: "error", message: "This transaction was already used for another order." };
    if (got < totalWei) return { state: "error", message: `We received ${fmtUsdt(got)} USDT but this order needs ${fmtUsdt(exactWei || totalWei)} USDT. Please send the rest or contact support.` };
    /* only the exact unique amount is confirmed automatically — anything else is checked by hand
       (stops someone from claiming another buyer's transfer to our public wallet) */
    if (got !== exactWei) return toManualWithTx(fs, doc, tx, `Received ${fmtUsdt(got)} USDT (order amount ${exact} USDT) — check by hand.`);
    if (await sameAmountOpen(fs, exact)) return toManualWithTx(fs, doc, tx, "Another open order has the same amount — check by hand.");
    return markPaid(fs, doc, tx, got);
  }

  /* 3) no TX hash → look for a transfer of the EXACT unique amount to our wallet since the order was placed */
  if (!exactWei) return { state: "waiting" };
  const safeTop = latest - CONFIRMATIONS;
  let from = Number(o.scanBlock) || 0;
  if (!from) {
    const back = await rpc("eth_getBlockByNumber", ["0x" + (latest - 1000).toString(16), false]);
    const now = await rpc("eth_getBlockByNumber", ["0x" + latest.toString(16), false]);
    const msPerBlock = Math.max(200, (Number(now.timestamp) - Number(back.timestamp)) * 1000 / 1000);
    from = latest - Math.ceil((Date.now() - placedAt + 60e3) / msPerBlock);
  }
  from = Math.max(from, safeTop - LOG_CHUNK * MAX_CHUNKS * 4);
  let scanned = from - 1;
  for (let i = 0; i < MAX_CHUNKS && scanned < safeTop; i++) {
    const a = scanned + 1, z = Math.min(safeTop, a + LOG_CHUNK - 1);
    const logs = await rpc("eth_getLogs", [{ address: USDT_BEP20, fromBlock: hex(a), toBlock: hex(z),
                                            topics: [TRANSFER, null, pad32(wallet)] }]);
    for (const l of logs || []) {
      if (BigInt(l.data) !== exactWei || l.removed) continue;
      /* if two open orders have the same amount we can't tell them apart → manual */
      if (await sameAmountOpen(fs, exact)) return flagManual(fs, doc, "Another open order has the same amount — please check by hand.");
      const res = await markPaid(fs, doc, l.transactionHash, BigInt(l.data));
      if (res.state === "paid") return res;
    }
    scanned = z;
  }
  if (scanned >= from) await fs.patch(doc, { scanBlock: scanned + 1 }).catch(() => {});
  return { state: "waiting" };
}

async function markPaid(fs, doc, tx, value) {
  const key = tx.toLowerCase();
  const used = await fs.get(`payments/${key}`);
  if (used) return used.data.orderId === doc.id ? { state: "paid", txHash: key }
                                                : { state: "error", message: "This transaction was already used for another order." };
  const now = Date.now();
  const ok = await fs.commit([
    { update: { name: fs.name(`payments/${key}`), fields: enc({ orderId: doc.id, value: fmtUsdt(value), at: now }) },
      currentDocument: { exists: false } },
    { update: { name: fs.name(`orders/${doc.id}`),
                fields: enc({ status: "processing", txHash: key, paidAt: now, paidAmount: fmtUsdt(value), autoVerified: true, updatedAt: now }) },
      updateMask: { fieldPaths: ["status", "txHash", "paidAt", "paidAmount", "autoVerified", "updatedAt"] },
      currentDocument: { updateTime: doc.updateTime } },
    { update: { name: fs.name(`orders/${doc.id}/messages/autopay`),
                fields: enc({ uid: "system", from: "admin", createdAt: now,
                              text: `✅ Payment of ${fmtUsdt(value)} USDT received and confirmed automatically on the blockchain. Your order is being delivered now (about ${NX_DATA.DELIVERY_TIME || "20 minutes"}).` }) } },
  ]);
  if (!ok) return { state: "retry", message: "Almost there — checking again…" };
  return { state: "paid", txHash: key, amount: fmtUsdt(value) };
}

async function sameAmountOpen(fs, exact) {
  const same = await fs.query("orders", [["status", "awaiting_payment"], ["cryptoAmount", exact]]);
  const same2 = await fs.query("orders", [["status", "payment_submitted"], ["cryptoAmount", exact]]);
  return same.length + same2.length > 1;
}

/* real transfer but not something we confirm automatically → "Payment sent — verifying" for the admin */
async function toManualWithTx(fs, doc, tx, note) {
  const now = Date.now();
  const f = { verifyNote: note, txHash: tx.toLowerCase(), updatedAt: now };
  if (doc.data.status === "awaiting_payment") Object.assign(f, { status: "payment_submitted", paidAt: now });
  await fs.patch(doc, f).catch(e => console.error(e));
  return { state: "manual", message: "Payment received — we're checking it by hand, usually within a few minutes." };
}

async function flagManual(fs, doc, note) {
  if (doc.data.verifyNote !== note) await fs.patch(doc, { verifyNote: note }).catch(() => {});
  return { state: "manual", message: "We'll check this payment by hand — usually within a few minutes." };
}

/* ---------- USDT helpers ---------- */
const hex = (n) => "0x" + n.toString(16);
const pad32 = (addr) => "0x" + addr.replace(/^0x/, "").toLowerCase().padStart(64, "0");
function usdtWei(n) { return BigInt(Math.round(Number(n) * 1e4)) * 10n ** 14n; }   // 4 decimals is all we use
function fmtUsdt(wei) {
  const s = (wei / 10n ** 14n).toString().padStart(5, "0");
  return (s.slice(0, -4) + "." + s.slice(-4)).replace(/\.?0+$/, "");
}
function usdtTo(logs, wallet) {
  let sum = 0n;
  for (const l of logs || []) {
    if ((l.address || "").toLowerCase() !== USDT_BEP20) continue;          // fake "USDT" tokens are other contracts
    if (!l.topics || l.topics[0] !== TRANSFER || (l.topics[2] || "").toLowerCase() !== pad32(wallet)) continue;
    sum += BigInt(l.data);
  }
  return sum;
}

/* ---------- BNB Smart Chain JSON-RPC (tries several public nodes) ---------- */
const badFor = {};   // node → methods it failed (kept while the worker is warm)
function makeRpc(env) {
  const urls = [...new Set((env.BSC_RPC ? env.BSC_RPC.split(",").map(s => s.trim()).filter(Boolean) : []).concat(DEFAULT_RPCS))];
  let id = 0;
  const one = async (u, method, params) => {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(u, { method: "POST", headers: { "content-type": "application/json" }, signal: ctl.signal,
                                 body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }) });
      const txt = await r.text();
      let j; try { j = JSON.parse(txt); } catch { throw new Error("HTTP " + r.status + " " + txt.slice(0, 60)); }
      if (j.error) throw new Error(j.error.message || JSON.stringify(j.error));
      if (j.result === undefined) throw new Error("no result");
      return j.result;
    } finally { clearTimeout(t); }
  };
  async function rpc(method, params) {
    const errs = [];
    const order = urls.filter(u => !(badFor[u] || {})[method]).concat(urls.filter(u => (badFor[u] || {})[method]));
    for (const u of order) {
      try { return await one(u, method, params); }
      catch (e) { (badFor[u] = badFor[u] || {})[method] = true; errs.push(new URL(u).host + ": " + String(e.message || e).slice(0, 80)); }
    }
    throw new Error(method + " failed on all nodes — " + errs.join(" | "));
  }
  rpc.each = async (method, params) => {
    const out = {};
    await Promise.all(urls.map(async u => {
      try { const r = await one(u, method, params); out[new URL(u).host] = Array.isArray(r) ? "ok (" + r.length + ")" : "ok"; }
      catch (e) { out[new URL(u).host] = "error: " + String(e.message || e).slice(0, 70); }
    }));
    return out;
  };
  return rpc;
}

/* ---------- Firestore REST with the service account ---------- */
let tokenCache = null;
export async function firestore(env) {
  const sa = typeof env.FIREBASE_SA === "string" ? JSON.parse(env.FIREBASE_SA) : env.FIREBASE_SA;
  const project = sa.project_id || NX_CONFIG.FIREBASE_CONFIG.projectId;
  const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
  const name = (p) => `projects/${project}/databases/(default)/documents/${p}`;
  const token = await accessToken(sa);
  const call = async (url, opt = {}) => fetch(url, { ...opt, headers: { authorization: "Bearer " + token, "content-type": "application/json" } });
  const wrap = (d) => ({ id: d.name.split("/").pop(), name: d.name, updateTime: d.updateTime, createTime: Date.parse(d.createTime), data: dec({ mapValue: { fields: d.fields || {} } }) });
  return {
    name,
    async get(p) {
      const r = await call(`${base}/${p}`);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("firestore get " + r.status + " " + await r.text());
      return wrap(await r.json());
    },
    async patch(doc, obj) {
      const mask = Object.keys(obj).map(k => "updateMask.fieldPaths=" + encodeURIComponent(k)).join("&");
      const r = await call(`${base}/${doc.name.split("/documents/")[1]}?${mask}&currentDocument.exists=true`,
                           { method: "PATCH", body: JSON.stringify({ fields: enc(obj) }) });
      if (!r.ok) throw new Error("firestore patch " + r.status);
    },
    async commit(writes) {
      const r = await call(`${base}:commit`, { method: "POST", body: JSON.stringify({ writes }) });
      if (r.ok) return true;
      const t = await r.text();
      if (r.status === 409 || /FAILED_PRECONDITION|ALREADY_EXISTS/.test(t)) return false;
      throw new Error("firestore commit " + r.status + " " + t);
    },
    async query(col, eqs) {
      const where = { compositeFilter: { op: "AND", filters: eqs.map(([f, v]) => ({ fieldFilter: { field: { fieldPath: f }, op: "EQUAL", value: encVal(v) } })) } };
      const r = await call(`${base}:runQuery`, { method: "POST", body: JSON.stringify({ structuredQuery: { from: [{ collectionId: col }], where, limit: 5 } }) });
      if (!r.ok) throw new Error("firestore query " + r.status);
      return (await r.json()).filter(x => x.document).map(x => wrap(x.document));
    },
  };
}

async function accessToken(sa) {
  if (tokenCache && tokenCache.email === sa.client_email && tokenCache.exp > Date.now() + 60e3) return tokenCache.token;
  const now = Math.floor(Date.now() / 1000);
  const b64u = (s) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const head = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64u(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/datastore",
                                      aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(head + "." + claim)));
  const jwt = head + "." + claim + "." + b64u(String.fromCharCode(...sig));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" + jwt });
  const j = await r.json();
  if (!j.access_token) throw new Error("google token: " + JSON.stringify(j));
  tokenCache = { email: sa.client_email, token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return j.access_token;
}

/* Firestore value <-> JS */
function encVal(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encVal) } };
  return { mapValue: { fields: enc(v) } };
}
function enc(obj) { const f = {}; for (const [k, v] of Object.entries(obj)) f[k] = encVal(v); return f; }
function dec(v) {
  if ("nullValue" in v) return null;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("stringValue" in v) return v.stringValue;
  if ("timestampValue" in v) return Date.parse(v.timestampValue);
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(dec);
  if ("mapValue" in v) { const o = {}; for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = dec(x); return o; }
  return null;
}
