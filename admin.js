/* ================= NILORIX — Admin panel ================= */

let all = [], tab = "todo", query = "", selId = null, stopAll = null, stopMsgs = null, msgs = [];

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2600);
}
const money = (n) => "$" + Number(n || 0).toFixed(2);
const pill = (s) => { const st = ORDER_STATUS[s] || { label: s, cls: "" }; return `<span class="status ${st.cls}">${st.label}</span>`; };
const copySvg = `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`;

/* expected price from the catalog (to catch tampered prices) */
function expectedTotal(o) {
  let sum = 0, unknown = false;
  o.items.forEach(i => {
    const g = byId(i.gid), pk = g && pkgFor(g, i.p, i.amount);
    if (!pk) unknown = true; else sum += pk.price * i.qty;
  });
  return unknown ? null : Math.round(sum * 100) / 100;
}

/* ---------- auth / access ---------- */
function show(id) { ["#admLogin", "#admDenied", "#admMain"].forEach(s => $(s).hidden = s !== id); }

NX.onAuth(user => {
  if (stopAll) { stopAll(); stopAll = null; }
  $("#admOut").hidden = !user;
  $("#admUser").textContent = user ? user.email : "";
  if (!NX.enabled) {
    show("#admDenied");
    $("#admDeniedTitle").textContent = "Store not connected";
    $("#admDeniedText").textContent = "Fill in config.js (Firebase settings) first — see README.md.";
    return;
  }
  if (!user) return show("#admLogin");
  if (!user.emailVerified && (NX.isAdminEmail() || !NX.isAdmin())) {
    show("#admDenied");
    $("#admDeniedTitle").textContent = "Verify your email first";
    $("#admDeniedText").innerHTML = `For security, the admin email must be verified. Sign in with Google, or
      <button class="link-btn" id="admVerify">send a verification email</button> to ${esc(user.email)} and then
      <button class="link-btn" id="admReload">click here after verifying</button>.`;
    return;
  }
  if (!NX.isAdmin()) {
    show("#admDenied");
    $("#admDeniedTitle").textContent = "Not authorized";
    $("#admDeniedText").textContent = `${user.email} isn't on the admin team. Ask an owner to add you in the Team tab.`;
    return;
  }
  show("#admMain");
  setupViews();
  try { const k = "nx_admin_login_" + user.email; if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, "1"); NX.logActivity("admin.login", {}); } } catch {}
  if (NX.can("support")) startSupport();
  loadPriceOverrides();
  if (NX.isOwner()) { startTeam(); startCustomers(); }
  if (!(NX.can("orders") || NX.can("payments") || NX.can("reviews"))) return;
  stopAll = NX.watchAllOrders(list => {
    const before = new Map(all.map(o => [o.id, o]));
    const fresh = all.length && list.filter(o => !before.has(o.id));
    const newDisputes = all.length && list.filter(o => o.status === "disputed" && (before.get(o.id) || {}).status !== "disputed");
    const autoPaid = all.length && list.filter(o => o.autoVerified && o.status === "processing" && !(before.get(o.id) || {}).autoVerified);
    if (autoPaid && autoPaid.length) toast(`💰 Payment confirmed automatically on #${shortId(autoPaid[0].id)} — deliver it!`);
    all = list;
    if (fresh && fresh.length) toast(`🛒 ${fresh.length} new order${fresh.length > 1 ? "s" : ""}!`);
    if (newDisputes && newDisputes.length) toast(`⚠ New dispute on #${shortId(newDisputes[0].id)}!`);
    render();
    if (custStarted) renderCustomers();
    if (NX.can("orders") || NX.can("payments")) { autoComplete(); syncStats(); }
    if (NX.can("payments")) checkOpenPayments();
  }, err => {
    show("#admDenied");
    $("#admDeniedTitle").textContent = "Can't read orders";
    $("#admDeniedText").textContent = "Check that your email is in firestore.rules and the rules are published.";
  });
});

$("#admLoginForm").addEventListener("submit", async e => {
  e.preventDefault();
  try { await NX.signIn($("#admEmail").value.trim(), $("#admPass").value); }
  catch (err) { $("#admErr").textContent = NX.errText(err); $("#admErr").hidden = false; }
});
$("#admGoogle").addEventListener("click", async () => {
  try { await NX.signInGoogle(); } catch (err) { $("#admErr").textContent = NX.errText(err); $("#admErr").hidden = false; }
});
$("#admOut").addEventListener("click", () => NX.signOut());
$("#admDenied").addEventListener("click", async e => {
  if (e.target.id === "admVerify") { try { await NX.sendVerification(); toast("📧 Verification email sent"); } catch (err) { toast(NX.errText(err)); } }
  if (e.target.id === "admReload") { await NX.reloadUser(); if (!NX.isAdmin()) toast("Not verified yet — open the link in the email first."); }
});

/* ---------- public store numbers (same as this panel) ----------
   عدد الأوردرات اللي بيظهر للعملاء = الأوردرات المدفوعة (Processing / Delivered / Disputed / Completed).
   الأوردرات اللي لسه متدفعتش أو اتلغت مش بتتحسب. */
const COUNTED = ["processing", "delivered", "disputed", "completed"];
let lastStats = "";
async function syncStats() {
  const stats = { _orders: 0 };
  all.filter(o => COUNTED.includes(o.status) && !o.hideFromStats).forEach(o => {
    stats._orders++;
    o.items.forEach(i => { stats[i.gid] = (stats[i.gid] || 0) + (i.qty || 1); });
  });
  const key = JSON.stringify(stats);
  if (key === lastStats) return;
  lastStats = key;
  try { await NX.setStats(stats); } catch (e) { console.error(e); lastStats = ""; }
}

/* ---------- list ---------- */
const TABS = [
  ["todo", "To do", o => ["payment_submitted", "processing", "disputed"].includes(o.status)],
  ["disputed", "Disputes", o => o.status === "disputed"],
  ["payment_submitted", "Verify payment", o => o.status === "payment_submitted"],
  ["processing", "To deliver", o => o.status === "processing"],
  ["awaiting_payment", "Unpaid", o => o.status === "awaiting_payment"],
  ["delivered", "Delivered", o => o.status === "delivered"],
  ["completed", "Completed", o => o.status === "completed"],
  ["cancelled", "Cancelled", o => o.status === "cancelled"],
  ["all", "All", () => true],
];

function render() {
  /* stats */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const done = all.filter(o => ["processing", "delivered", "completed"].includes(o.status));
  const revenueToday = done.filter(o => o.createdAt >= today.getTime()).reduce((s, o) => s + o.total, 0);
  const revenueAll = done.reduce((s, o) => s + o.total, 0);
  const n = (s) => all.filter(o => o.status === s).length;
  $("#admStats").innerHTML = `
    <div class="adm-stat ${n("disputed") ? "danger" : ""}"><small>Disputes</small><strong>${n("disputed")}</strong></div>
    <div class="adm-stat hot"><small>Verify payment</small><strong>${n("payment_submitted")}</strong></div>
    <div class="adm-stat"><small>To deliver</small><strong>${n("processing")}</strong></div>
    <div class="adm-stat"><small>Unpaid</small><strong>${n("awaiting_payment")}</strong></div>
    <div class="adm-stat"><small>Revenue today</small><strong>${money(revenueToday)}</strong></div>
    <div class="adm-stat"><small>Revenue (all)</small><strong>${money(revenueAll)}</strong></div>`;

  const todo = n("payment_submitted") + n("processing") + n("disputed");
  document.title = (todo ? `(${todo}) ` : "") + "Admin — NILORIX";

  /* tabs */
  $("#admTabs").innerHTML = TABS.map(([k, label, f]) => {
    const c = all.filter(f).length;
    return `<button class="filter ${k === tab ? "active" : ""}" data-tab="${k}">${label}${k !== "all" ? ` <b>${c}</b>` : ""}</button>`;
  }).join("");

  /* list */
  const f = TABS.find(t => t[0] === tab)[2];
  const q = query.toLowerCase();
  const list = all.filter(f).filter(o => !q || [o.id, shortId(o.id), o.buyerEmail, o.buyerName, o.txHash]
    .some(v => v && String(v).toLowerCase().includes(q)));
  $("#admList").innerHTML = list.length ? list.map(o => {
    const first = o.items[0], g = byId(first.gid), exp = expectedTotal(o);
    const bad = exp != null && Math.abs(exp - o.total) > 0.01;
    return `
      <button class="adm-row ${o.id === selId ? "sel" : ""}" data-id="${o.id}">
        ${g ? `<span class="mini-tile" style="--g:${g.g}">${gameImg(g)}</span>` : `<span class="mini-tile">#</span>`}
        <span class="adm-row-info">
          <strong>#${shortId(o.id)} · ${esc(first.label)}${o.items.length > 1 ? ` +${o.items.length - 1}` : ""}</strong>
          <small>${esc(o.buyerEmail || "")} · ${timeAgo(o.createdAt)}</small>
        </span>
        ${bad ? `<span class="adm-flag" title="Price doesn't match the catalog">⚠</span>` : ""}
        ${pill(o.status)}
        <span class="or-total">${money(o.total)}</span>
      </button>`;
  }).join("") : `<div class="pop-empty">📭<p>No orders here</p></div>`;

  renderDetail();
}

/* tiny version of gameImg/letter (admin page has no common.js) */
function gameImg(g) {
  return g.img ? `<img src="${asset(g.img)}" alt="" onerror="this.replaceWith(document.createTextNode('${letter(g)}'))">` : letter(g);
}

/* ---------- detail ---------- */
function renderDetail() {
  const o = all.find(x => x.id === selId), box = $("#admDetail");
  if (!o) { box.innerHTML = `<p class="panel-sub">Select an order to see the details.</p>`; return; }
  const m = PAY_METHODS[o.payMethod] || {}, exp = expectedTotal(o);
  const bad = exp != null && Math.abs(exp - o.total) > 0.01;

  const P = NX.can("payments"), OR = NX.can("orders") || P;
  const actions = !OR ? {} : {
    awaiting_payment: !P ? `<p class="panel-sub">🔒 Payments are handled by the payments team.</p>` : `
      <button class="btn btn-primary" data-act="paid">✓ Mark as paid</button>
      <button class="btn btn-ghost" data-act="cancel">✕ Cancel</button>`,
    payment_submitted: !P ? `<p class="panel-sub">🔒 Payments are handled by the payments team.</p>` : `
      <button class="btn btn-primary" data-act="confirm">✓ Payment received</button>
      <button class="btn btn-ghost" data-act="reject">↩ Payment not found</button>
      <button class="btn btn-ghost" data-act="cancel">✕ Cancel</button>`,
    processing: `
      <button class="btn btn-primary" data-act="deliver">📦 Mark as delivered</button>
      <button class="btn btn-ghost" data-act="cancel">✕ Cancel (refund)</button>`,
    delivered: `<button class="btn btn-ghost" data-act="complete">✓ Mark completed</button>`,
    disputed: `
      <button class="btn btn-primary" data-act="redeliver">📦 Re-delivered</button>
      <button class="btn btn-ghost" data-act="complete">✓ Resolved — complete</button>
      <button class="btn btn-ghost" data-act="cancel">✕ Refund & cancel</button>`,
    completed: ``, cancelled: ``,
  };

  const keepChat = box.dataset.for === o.id ? $("#admChatInput") && $("#admChatInput").value : "";
  box.dataset.for = o.id;
  box.innerHTML = `
    <div class="adm-d-head">
      <div><h3>Order #${shortId(o.id)}</h3><small class="muted-inline">${new Date(o.createdAt).toLocaleString()}</small></div>
      ${pill(o.status)}
    </div>
    ${blockWarn(o)}
    ${o.status === "disputed" ? `<div class="dispute-box adm"><span>⚠ Customer dispute · ${timeAgo(o.disputedAt || o.updatedAt)}</span><p>${esc(o.disputeReason || "")}</p></div>` : ""}
    <div class="adm-actions">${actions[o.status] || ""}</div>

    <h4 class="adm-h">Customer</h4>
    <div class="od-kv">
      <div><span>Name</span><strong>${esc(o.buyerName || "—")}</strong></div>
      <div><span>Email</span><strong>${esc(o.buyerEmail || "—")}</strong></div>
    </div>

    <h4 class="adm-h">Deliver to</h4>
    <div class="od-kv">
      ${(o.fields || []).map(f => `<div><span>${esc(f.label)}</span><strong>${esc(f.value)} <button class="copy-btn mini" data-copy="${esc(f.value)}">${copySvg}</button></strong></div>`).join("")}
    </div>

    <h4 class="adm-h">Items</h4>
    <div class="co-items">
      ${o.items.map(i => `<div class="co-item"><div class="co-item-info"><strong>${i.qty} × ${esc(i.label)}</strong>
        <small>${esc(i.gameName)}${i.optLabel ? " · " + esc(i.optLabel) : ""}</small></div><span class="co-item-price">${money(i.price * i.qty)}</span></div>`).join("")}
    </div>
    <div class="total-row"><span>Total</span><strong>${money(o.total)}</strong></div>
    ${bad ? `<div class="pay-warn">⚠ Catalog price is ${money(exp)} — this order says ${money(o.total)}. Check before delivering.</div>` : ""}

    <h4 class="adm-h">Payment</h4>
    <div class="od-kv">
      <div><span>Method</span><strong>${m.name || o.cryptoSymbol} · ${esc(o.payNetwork || "")}</strong></div>
      <div><span>Expected</span><strong>${o.cryptoAmount} ${o.cryptoSymbol}${o.ltcRate ? ` <small class="muted-inline">(LTC @ $${o.ltcRate})</small>` : ""}</strong></div>
      <div><span>To address</span><strong class="mono">${esc(o.payAddress || "")}</strong></div>
      <div><span>TXID</span><strong>${o.txHash
        ? `<a class="tx-link" href="${m.explorer || "#"}${encodeURIComponent(o.txHash)}" target="_blank" rel="noopener">${esc(o.txHash.slice(0, 14))}… ↗</a>`
        : "—"}</strong></div>
      ${o.autoVerified && ["processing", "delivered", "completed", "disputed"].includes(o.status) ? `<div><span>Verified</span><strong class="ok-txt">✅ Automatically on the blockchain${o.paidAmount ? ` — received ${esc(o.paidAmount)} USDT` : ""}</strong></div>` : ""}
    </div>
    ${o.verifyNote && !o.autoVerified ? `<div class="pay-warn">🔎 Auto-check: ${esc(o.verifyNote)}</div>` : ""}
    ${o.txHash ? `<p class="panel-sub">Open the TXID and check: the network, the receiving address, and the amount.</p>` : ""}

    <h4 class="adm-h">Store page</h4>
    <div class="rv-flags">
      <span>${COUNTED.includes(o.status) ? (o.hideFromStats ? "🚫 Not counted in the store's order count" : "✅ Counted in the store's order count") : "— Not counted (not paid)"}</span>
      ${COUNTED.includes(o.status) ? `<button class="btn btn-ghost btn-sm" data-act="togglestats">${o.hideFromStats ? "Count it again" : "Remove from count"}</button>` : ""}
      ${o.reviewDeleted ? `<span class="muted-inline">⭐ Review deleted by admin</span>` : ""}
    </div>

    ${orderHistory(o.id)}

    <h4 class="adm-h">Chat</h4>
    <div class="chat-list adm-chat" id="admChat"></div>
    <form class="chat-form" id="admChatForm">
      <input type="text" id="admChatInput" maxlength="1000" placeholder="Reply to the customer…" autocomplete="off">
      <button class="btn btn-primary" type="submit">Send</button>
    </form>
    <a class="link-btn" href="order.html?id=${o.id}" target="_blank" rel="noopener" style="display:inline-block;margin-top:10px">Open customer view ↗</a>`;
  if (keepChat) $("#admChatInput").value = keepChat;
  renderMsgs();
}

function renderMsgs() {
  const el = $("#admChat");
  if (!el) return;
  el.innerHTML = msgs.length ? msgs.map(c => `
    <div class="msg ${c.from === "admin" ? "mine" : "theirs"}">
      <div class="bubble"><p>${esc(c.text)}</p><small>${c.from === "admin" ? "You" : "Customer"} · ${timeAgo(c.createdAt)}</small></div>
    </div>`).join("") : `<p class="chat-empty">No messages yet.</p>`;
  el.scrollTop = el.scrollHeight;
}

function select(id) {
  selId = id;
  if (stopMsgs) { stopMsgs(); stopMsgs = null; }
  msgs = [];
  stopMsgs = NX.watchMessages(id, list => { msgs = list; renderMsgs(); });
  render();
  if (window.innerWidth < 980) $("#admDetail").scrollIntoView({ behavior: "smooth" });
}

/* ask the server to check the blockchain for open orders (in case the buyer closed the page) */
let lastPayCheck = 0;
async function checkOpenPayments() {
  if (Date.now() - lastPayCheck < 90e3) return;
  lastPayCheck = Date.now();
  const open = all.filter(o => o.payMethod === "usdt_bep20" && Date.now() - o.createdAt < 2 * 864e5
    && (o.status === "awaiting_payment" || (o.status === "payment_submitted" && !o.verifyNote)));
  for (const o of open) {
    try { await fetch("/api/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: o.id }) }); }
    catch (e) { break; }
  }
}
setInterval(() => { if (all.length) checkOpenPayments(); }, 120e3);

/* ---------- Reviews manager: delete a review (and optionally the order from the store count) ---------- */
let adminReviews = [], deletedReviews = [], rvTab = "all";
async function loadAdminReviews() {
  $("#rvList").innerHTML = `<p class="panel-sub">Loading…</p>`;
  [adminReviews, deletedReviews] = await Promise.all([NX.loadReviews(), NX.loadDeletedReviews()]);
  renderAdminReviews();
}
const rvDate = (t) => t ? new Date(t).toISOString().slice(0, 10) : "";
function renderAdminReviews() {
  const T = [["all", "All", () => true], ["real", "Written by customers", r => !r.auto], ["auto", "Automatic", r => r.auto],
             ["low", "3★ or less", r => r.stars <= 3], ["deleted", "🗑 Deleted", null]];
  $("#admViewReviews").textContent = adminReviews.length || "";
  $("#rvTabs").innerHTML = T.map(([k, l, f]) => `<button class="filter ${k === rvTab ? "active" : ""} ${k === "deleted" ? "rv-del-tab" : ""}" data-rv="${k}">${l} <b>${f ? adminReviews.filter(f).length : deletedReviews.length}</b></button>`).join("");
  const del = rvTab === "deleted";
  const list = del ? deletedReviews : adminReviews.filter(T.find(x => x[0] === rvTab)[2]);
  $("#rvList").innerHTML = list.length ? list.map(r => {
    const o = all.find(x => x.id === r.id);
    return `
    <div class="panel rv-card ${del ? "rv-deleted" : ""}">
      <div class="rv-top">
        <strong>${esc(r.name || "Customer")}</strong>
        <span class="rv-stars">${"★".repeat(r.stars)}<i>${"★".repeat(5 - r.stars)}</i></span>
        <small>${rvDate(r.createdAt)}</small>
        ${r.auto ? `<span class="rv-badge">Automatic</span>` : ""}
        ${del ? `<span class="rv-badge rv-badge-del">Deleted ${rvDate(r.deletedAt)}</span>` : ""}
      </div>
      <p class="rv-text">${r.auto ? "<em>Automatic 5-star rating (no comment)</em>" : esc(r.text || "")}</p>
      <small class="muted-inline">${esc(r.item || "")} · Order <a href="#" data-openorder="${r.id}">#${shortId(r.id)}</a>${o && o.hideFromStats ? " · 🚫 not counted in store orders" : o ? " · ✅ counted in store orders" : ""}</small>
      <div class="rv-actions">${del
        ? `<button class="btn btn-ghost btn-sm" data-restorerev="${r.id}">↩ Restore review</button>`
        : `<button class="btn btn-danger btn-sm" data-delrev="${r.id}">🗑 Delete review</button>`}</div>
    </div>`;
  }).join("") : `<p class="panel-sub">${del ? "No deleted reviews." : "No reviews here."}</p>`;
}
document.addEventListener("click", async e => {
  const t = e.target.closest("[data-rv]");
  if (t) { rvTab = t.dataset.rv; renderAdminReviews(); return; }
  const op = e.target.closest("[data-openorder]");
  if (op) {
    e.preventDefault();
    $$(".adm-view").forEach(x => { if (x.dataset.view === "orders") x.click(); });
    tab = "all"; render(); select(op.dataset.openorder); return;
  }

  /* delete → moved to the "Deleted" list (gone from the site) */
  const d = e.target.closest("[data-delrev]");
  if (d) {
    const r = adminReviews.find(x => x.id === d.dataset.delrev), o = all.find(x => x.id === r.id);
    if (!confirm("Delete this review? It will disappear from the store page and the game page (you can still find it under \"Deleted\").")) return;
    const alsoCount = o && COUNTED.includes(o.status) && !o.hideFromStats
      && confirm("Also remove this order from the store's order count?\n\nOK = remove it from the count\nCancel = keep counting it");
    d.disabled = true;
    try {
      await NX.deleteReview(r);
      if (o) await NX.updateOrder(r.id, alsoCount ? { reviewDeleted: true, hideFromStats: true } : { reviewDeleted: true });
      adminReviews = adminReviews.filter(x => x.id !== r.id);
      deletedReviews.unshift({ ...r, deletedAt: Date.now() });
      renderAdminReviews();
      NX.logActivity("review.deleted", { target: "review", targetId: r.id,
        summary: `${r.stars}★ by ${r.name || "Customer"}: "${(r.auto ? "automatic rating" : r.text || "").slice(0, 80)}" — Order #${shortId(r.id)}`,
        details: { stars: r.stars, text: r.text || "", name: r.name || "", removedFromCount: !!alsoCount } });
      toast(alsoCount ? "🗑 Review deleted and order removed from the count" : "🗑 Review deleted");
    } catch (err) { console.error(err); toast("Couldn't delete — check that the latest firestore rules are published."); d.disabled = false; }
    return;
  }

  /* restore → back on the site */
  const rs = e.target.closest("[data-restorerev]");
  if (rs) {
    const r = deletedReviews.find(x => x.id === rs.dataset.restorerev), o = all.find(x => x.id === r.id);
    if (!confirm("Restore this review? It will show on the site again.")) return;
    const countAgain = o && o.hideFromStats && confirm("Count this order in the store's order count again?");
    rs.disabled = true;
    try {
      await NX.restoreReview(r);
      if (o) await NX.updateOrder(r.id, countAgain ? { reviewDeleted: false, hideFromStats: false } : { reviewDeleted: false });
      deletedReviews = deletedReviews.filter(x => x.id !== r.id);
      const { deletedAt, ...back } = r; adminReviews.unshift(back);
      renderAdminReviews();
      NX.logActivity("review.restored", { target: "review", targetId: r.id,
        summary: `${r.stars}★ by ${r.name || "Customer"} — Order #${shortId(r.id)}`, details: { countedAgain: !!countAgain } });
      toast("↩ Review restored");
    } catch (err) { console.error(err); toast("Couldn't restore — check that the latest firestore rules are published."); rs.disabled = false; }
  }
});

/* ---------- 🧑 Customers + blocking (owners only) ---------- */
const PAID_ST = ["processing", "delivered", "disputed", "completed"];
let users = [], blocked = [], custStarted = false, cuTab = "all", cuQ = "", cuSel = null, cuNote = { uid: null, text: "" };
const blockedRec = (uid) => blocked.find(b => b.id === "uid_" + uid);
const blockedKeys = () => new Set(((blocked.find(b => b.id === "accounts") || {}).keys) || []);
const orderKeys = (o) => o.accountKeys || (o.fields || []).map(f => accountKey(f.gid, f.value));
function blockWarn(o) {
  if (!NX.isOwner() || !custStarted) return "";
  const bk = blockedKeys(), hit = orderKeys(o).filter(k => bk.has(k));
  if (blockedRec(o.uid)) return `<div class="pay-warn">🚫 This customer is <b>blocked</b>. Check before delivering.</div>`;
  if (hit.length) return `<div class="pay-warn">🚫 Blocked game account: <b>${esc(hit.join(", "))}</b>. Check before delivering.</div>`;
  return "";
}
function startCustomers() {
  if (custStarted) return renderCustomers();
  custStarted = true;
  NX.loadUsers().then(u => { users = u; renderCustomers(); });
  NX.watchBlocked(b => { blocked = b; renderCustomers(); if (selId) renderDetail(); });
}
function customerList() {
  const map = new Map();
  users.forEach(u => map.set(u.uid, { uid: u.uid, name: u.name || "", email: u.email || "", photo: u.photo || "", joined: u.createdAt || 0, orders: [] }));
  all.forEach(o => {
    if (!map.has(o.uid)) map.set(o.uid, { uid: o.uid, name: o.buyerName || "", email: o.buyerEmail || "", photo: "", joined: 0, orders: [] });
    const c = map.get(o.uid); c.orders.push(o);
    if (!c.name && o.buyerName) c.name = o.buyerName; if (!c.email && o.buyerEmail) c.email = o.buyerEmail;
  });
  /* who else used the same game account? */
  const keyOwners = new Map();
  all.forEach(o => orderKeys(o).forEach(k => { if (!keyOwners.has(k)) keyOwners.set(k, new Set()); keyOwners.get(k).add(o.uid); }));
  const day = 864e5, now = Date.now();
  const owners = ADMIN_EMAILS.map(e => e.toLowerCase());
  return [...map.values()].filter(c => !owners.includes((c.email || "").toLowerCase())).map(c => {
    const paid = c.orders.filter(o => PAID_ST.includes(o.status));
    c.paidTotal = paid.reduce((s, o) => s + (Number(o.total) || 0), 0);
    c.paidCount = paid.length;
    c.completed = c.orders.filter(o => o.status === "completed").length;
    c.cancelled = c.orders.filter(o => o.status === "cancelled").length;
    c.unpaid = c.orders.filter(o => o.status === "awaiting_payment").length;
    c.disputes = c.orders.filter(o => o.disputedAt || o.status === "disputed").length;
    c.rejected = c.orders.filter(o => o.rejectedAt).length;
    c.first = c.orders.length ? Math.min(...c.orders.map(o => o.createdAt)) : 0;
    c.last = c.orders.length ? Math.max(...c.orders.map(o => o.createdAt)) : 0;
    c.keys = [...new Set(c.orders.flatMap(orderKeys))];
    c.shared = c.keys.filter(k => (keyOwners.get(k) || new Set()).size > 1);
    c.blocked = blockedRec(c.uid);
    const flags = [];
    if (c.disputes) flags.push(`⚠️ ${c.disputes} dispute${c.disputes > 1 ? "s" : ""}`);
    if (c.rejected >= 2) flags.push(`⚠️ ${c.rejected} rejected payments`);
    if (c.unpaid + c.cancelled >= 3) flags.push(`⚠️ ${c.unpaid + c.cancelled} unpaid/cancelled`);
    if (c.orders.filter(o => now - o.createdAt < day).length >= 5) flags.push("⚠️ 5+ orders in 24h");
    if (c.first && now - c.first < day && c.paidTotal >= 100) flags.push("⚠️ New & big spender");
    if (c.shared.length) flags.push("⚠️ Game account used by another customer");
    if (c.orders.some(o => { const e = expectedTotal(o); return e != null && Math.abs(e - o.total) > 0.01; })) flags.push("⚠️ Price mismatch");
    c.flags = flags;
    return c;
  });
}
function renderCustomers() {
  if (!custStarted) return;
  const list0 = customerList();
  const T = [["all", "All", () => true], ["buyers", "Buyers", c => c.paidCount > 0], ["flag", "⚠️ Flagged", c => c.flags.length && !c.blocked],
             ["top", "💰 Top spenders", c => c.paidTotal > 0], ["blocked", "🚫 Blocked", c => !!c.blocked]];
  const nFlag = list0.filter(c => c.flags.length && !c.blocked).length;
  $("#admViewCust").textContent = nFlag || ""; $("#admViewCust").classList.toggle("hot", nFlag > 0);
  $("#cuTabs").innerHTML = T.map(([k, l, f]) => `<button class="filter ${k === cuTab ? "active" : ""}" data-cu="${k}">${l} <b>${list0.filter(f).length}</b></button>`).join("");
  const q = cuQ.toLowerCase();
  let list = list0.filter(T.find(x => x[0] === cuTab)[2])
    .filter(c => !q || [c.name, c.email, c.uid, ...c.keys].join(" ").toLowerCase().includes(q));
  list.sort(cuTab === "top" ? (a, b) => b.paidTotal - a.paidTotal : (a, b) => (b.last || b.joined) - (a.last || a.joined));
  $("#cuList").innerHTML = list.length ? list.map(c => `
    <button class="adm-row ${c.uid === cuSel ? "sel" : ""}" data-cuid="${c.uid}">
      <span class="cu-av">${c.photo ? `<img src="${esc(c.photo)}" alt="">` : esc((c.name || c.email || "?").charAt(0).toUpperCase())}</span>
      <span class="adm-row-txt"><strong>${esc(c.name || "—")} ${c.blocked ? `<span class="cu-badge cu-bl">🚫 Blocked</span>` : ""}${c.flags.length && !c.blocked ? `<span class="cu-badge">⚠️ ${c.flags.length}</span>` : ""}</strong>
        <small>${esc(c.email)} · ${c.orders.length} order${c.orders.length === 1 ? "" : "s"}</small></span>
      <span class="cu-paid">${money(c.paidTotal)}</span>
    </button>`).join("") : `<p class="panel-sub">No customers here.</p>`;
  renderCustomerDetail(list0);
}
async function renderCustomerDetail(list0) {
  const box = $("#cuDetail"), c = (list0 || customerList()).find(x => x.uid === cuSel);
  if (!c) { box.innerHTML = `<p class="panel-sub">Select a customer.</p>`; return; }
  if (cuNote.uid !== c.uid) { cuNote = { uid: c.uid, text: "…" }; NX.loadCustomerNote(c.uid).then(t => { cuNote = { uid: c.uid, text: t }; if (cuSel === c.uid) renderCustomerDetail(); }); }
  const bk = blockedKeys(), d = (t) => t ? new Date(t).toLocaleDateString() : "—";
  box.innerHTML = `
    <div class="adm-d-head">
      <div class="cu-head"><span class="cu-av lg">${c.photo ? `<img src="${esc(c.photo)}" alt="">` : esc((c.name || c.email || "?").charAt(0).toUpperCase())}</span>
        <div><h3>${esc(c.name || "—")}</h3><small class="muted-inline">${esc(c.email)}</small></div></div>
      ${c.blocked ? `<span class="status st-bad">🚫 Blocked</span>` : ""}
    </div>
    ${c.blocked ? `<div class="pay-warn">Blocked ${new Date(c.blocked.at).toLocaleString()} by ${esc(c.blocked.by)}${c.blocked.reason ? ` — “${esc(c.blocked.reason)}”` : ""}</div>` : ""}
    ${c.flags.length ? `<div class="cu-flags">${c.flags.map(f => `<span>${esc(f)}</span>`).join("")}</div>` : ""}
    <div class="cu-stats">
      <div><small>Paid total</small><strong>${money(c.paidTotal)}</strong></div>
      <div><small>Paid orders</small><strong>${c.paidCount}</strong></div>
      <div><small>Completed</small><strong>${c.completed}</strong></div>
      <div><small>Cancelled</small><strong>${c.cancelled}</strong></div>
      <div><small>Unpaid</small><strong>${c.unpaid}</strong></div>
      <div><small>Disputes</small><strong>${c.disputes}</strong></div>
    </div>
    <div class="od-kv">
      <div><span>Joined</span><strong>${d(c.joined)}</strong></div>
      <div><span>First order</span><strong>${d(c.first)}</strong></div>
      <div><span>Last order</span><strong>${d(c.last)}</strong></div>
      <div><span>Avg. order</span><strong>${c.paidCount ? money(c.paidTotal / c.paidCount) : "—"}</strong></div>
    </div>
    <h4 class="adm-h">Game accounts</h4>
    ${c.keys.length ? `<div class="cu-keys">${c.keys.map(k => `<span class="${bk.has(k) ? "kb" : ""} ${c.shared.includes(k) ? "ks" : ""}">${esc(k)}${bk.has(k) ? " 🚫" : ""}${c.shared.includes(k) ? " ⚠️ shared" : ""}</span>`).join("")}</div>` : `<p class="panel-sub">—</p>`}
    <h4 class="adm-h">Private note (owners only)</h4>
    <textarea id="cuNoteTxt" rows="2" maxlength="1000" placeholder="e.g. good customer / paid late / suspicious…">${esc(cuNote.text === "…" ? "" : cuNote.text)}</textarea>
    <button class="btn btn-ghost btn-sm" data-cuact="note">Save note</button>
    <h4 class="adm-h">Orders</h4>
    <div class="cu-orders">${c.orders.slice().sort((a, b) => b.createdAt - a.createdAt).map(o => `
      <a href="#" data-openorder="${o.id}"><span>#${shortId(o.id)} · ${new Date(o.createdAt).toLocaleDateString()}</span>${pill(o.status)}<b>${money(o.total)}</b></a>`).join("") || `<p class="panel-sub">No orders yet.</p>`}</div>
    <div class="adm-actions" style="margin-top:16px">
      ${c.blocked ? `<button class="btn btn-ghost" data-cuact="unblock">✅ Unblock customer</button>`
                  : `<button class="btn btn-danger" data-cuact="block">🚫 Block customer</button>`}
    </div>`;
}
document.addEventListener("click", async e => {
  const t = e.target.closest("[data-cu]"); if (t) { cuTab = t.dataset.cu; renderCustomers(); return; }
  const r = e.target.closest("[data-cuid]"); if (r) { cuSel = r.dataset.cuid; renderCustomers(); return; }
  const a = e.target.closest("[data-cuact]"); if (!a) return;
  const c = customerList().find(x => x.uid === cuSel); if (!c) return;
  const who = `${c.name || "—"} <${c.email}>`;
  a.disabled = true;
  try {
    if (a.dataset.cuact === "note") {
      const text = $("#cuNoteTxt").value.trim(); await NX.saveCustomerNote(c.uid, text); cuNote = { uid: c.uid, text };
      NX.logActivity("customer.note", { target: "customer", targetId: c.uid, summary: `${who}: ${text.slice(0, 80)}` }); toast("📝 Note saved");
    }
    if (a.dataset.cuact === "block") {
      const reason = prompt(`Block ${who}?\n\nThey won't be able to place new orders (account, email and their game accounts are blocked).\nReason (only you will see it):`, "");
      if (reason === null) { a.disabled = false; return; }
      await NX.blockCustomer(c, reason, c.keys);
      NX.logActivity("customer.blocked", { target: "customer", targetId: c.uid, summary: who, details: { reason, accounts: c.keys } });
      toast("🚫 Customer blocked");
    }
    if (a.dataset.cuact === "unblock") {
      if (!confirm(`Unblock ${who}?`)) { a.disabled = false; return; }
      await NX.unblockCustomer(c.blocked);
      NX.logActivity("customer.unblocked", { target: "customer", targetId: c.uid, summary: who });
      toast("✅ Customer unblocked");
    }
  } catch (err) { console.error(err); toast("Couldn't update — check the latest firestore rules are published."); }
  a.disabled = false;
});
document.addEventListener("input", e => { if (e.target.id === "cuSearch") { cuQ = e.target.value.trim(); renderCustomers(); } });

/* ---------- 👥 Team (owners only) ---------- */
const PERM_LABEL = { payments: "💰 Payments (confirm / reject / cancel unpaid)", orders: "🛒 Orders (deliver, disputes, complete)",
                     support: "💬 Support", prices: "💲 Prices", reviews: "⭐ Reviews" };
let team = [], teamStarted = false;
function startTeam() { if (teamStarted) return; teamStarted = true; NX.watchStaff(list => { team = list; renderTeam(); }); }
function renderTeam() {
  $("#teamOwners").innerHTML = ADMIN_EMAILS.map(e => `<div class="tm-row"><strong>${esc(e)}</strong><span class="rv-badge">👑 Owner — everything</span></div>`).join("");
  $("#teamList").innerHTML = team.length ? team.map(m => `
    <div class="tm-row" data-tm="${esc(m.email)}">
      <strong>${esc(m.email)}</strong>
      <div class="tm-perms">${NX.PERMS.map(p => `<label class="tm-perm"><input type="checkbox" data-perm="${p}" ${(m.perms || []).includes(p) ? "checked" : ""}> ${PERM_LABEL[p]}</label>`).join("")}</div>
      <div class="tm-btns"><button class="btn btn-ghost btn-sm" data-tmsave>Save</button><button class="btn btn-danger btn-sm" data-tmdel>Remove</button></div>
    </div>`).join("") : `<p class="panel-sub">No team members yet.</p>`;
}
const tmPerms = (row) => [...row.querySelectorAll("[data-perm]")].filter(i => i.checked).map(i => i.dataset.perm);
document.addEventListener("click", async e => {
  if (e.target.id === "tmAdd") {
    const email = $("#tmEmail").value.trim().toLowerCase(), perms = tmPerms($("#tmNew"));
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast("Enter a valid email");
    if (ADMIN_EMAILS.map(x => x.toLowerCase()).includes(email)) return toast("That email is already an owner");
    if (!perms.length) return toast("Choose at least one permission");
    try {
      await NX.setStaff(email, { perms, addedAt: Date.now() });
      NX.logActivity("team.added", { target: "team", targetId: email, summary: `${email} — ${perms.join(", ")}`, details: { perms } });
      $("#tmEmail").value = ""; $$("#tmNew [data-perm]").forEach(i => i.checked = false); toast("✅ Team member added");
    } catch (err) { console.error(err); toast("Couldn't add — check the firestore rules are published."); }
    return;
  }
  const row = e.target.closest("[data-tm]"); if (!row) return;
  const email = row.dataset.tm, old = (team.find(m => m.email === email) || {}).perms || [];
  if (e.target.closest("[data-tmsave]")) {
    const perms = tmPerms(row); if (!perms.length) return toast("Choose at least one permission (or remove the member)");
    try { await NX.setStaff(email, { perms }); NX.logActivity("team.permissions_changed", { target: "team", targetId: email, summary: `${email}: ${old.join(", ") || "—"} → ${perms.join(", ")}`, details: { from: old, to: perms } }); toast("✅ Saved"); }
    catch (err) { console.error(err); toast("Couldn't save"); }
  }
  if (e.target.closest("[data-tmdel]")) {
    if (!confirm(`Remove ${email} from the team? They will lose access right away.`)) return;
    try { await NX.removeStaff(email); NX.logActivity("team.removed", { target: "team", targetId: email, summary: email, details: { perms: old } }); toast("🗑 Removed"); }
    catch (err) { console.error(err); toast("Couldn't remove"); }
  }
});

/* ---------- 📜 Activity log (owners only) ---------- */
const ACT_LABEL = {
  "admin.login": "🔑 Opened the admin panel", "order.mark_paid": "💰 Marked as paid", "order.payment_confirmed": "✅ Confirmed payment",
  "order.payment_rejected": "↩ Rejected payment", "order.payment_auto_confirmed": "🤖 Payment auto-confirmed (blockchain)",
  "order.delivered": "📦 Delivered order", "order.redelivered": "📦 Re-delivered order", "order.completed": "✓ Completed order",
  "order.cancelled": "✕ Cancelled order", "order.remove_from_count": "🚫 Removed order from store count", "order.count_again": "✅ Counted order again",
  "review.deleted": "🗑 Deleted review", "review.restored": "↩ Restored review", "prices.changed": "💲 Changed prices", "prices.reset": "💲 Reset prices",
  "support.closed": "💬 Closed conversation", "support.reopened": "💬 Reopened conversation",
  "customer.blocked": "🚫 Blocked customer", "customer.unblocked": "✅ Unblocked customer", "customer.note": "📝 Customer note",
  "team.added": "👥 Added team member", "team.permissions_changed": "👥 Changed permissions", "team.removed": "👥 Removed team member",
};
let acts = [], actStarted = false, actWho = "all", actKind = "all", actQ = "";
function startActivity() { if (actStarted) return renderActivity(); actStarted = true; NX.watchActivity(list => { acts = list; renderActivity(); }); }
function renderActivity() {
  const people = [...new Set(acts.map(a => a.by))];
  $("#actWho").innerHTML = `<option value="all">Everyone</option>` + people.map(p => `<option ${p === actWho ? "selected" : ""}>${esc(p)}</option>`).join("");
  const kinds = [["all", "All actions"], ["order", "Orders"], ["review", "Reviews"], ["prices", "Prices"], ["support", "Support"], ["customer", "Customers"], ["team", "Team"], ["admin", "Logins"]];
  $("#actKind").innerHTML = kinds.map(([k, l]) => `<option value="${k}" ${k === actKind ? "selected" : ""}>${l}</option>`).join("");
  const q = actQ.toLowerCase();
  const list = acts.filter(a => (actWho === "all" || a.by === actWho) && (actKind === "all" || a.action.startsWith(actKind + "."))
    && (!q || [a.summary, a.targetId, a.by, shortId(a.targetId || "")].join(" ").toLowerCase().includes(q)));
  $("#actList").innerHTML = list.length ? list.map(a => {
    const d = a.details || {}, extra = [];
    if (d.reason) extra.push(`Reason: ${esc(d.reason)}`);
    if (d.changes) extra.push(d.changes.map(esc).join("<br>"));
    if (d.text) extra.push(`"${esc(d.text)}"`);
    return `<div class="act-row">
      <small class="act-time">${new Date(a.at).toLocaleString()}</small>
      <span class="act-by">${esc(a.by === "system" ? "🤖 system" : a.by)}</span>
      <div class="act-what"><strong>${ACT_LABEL[a.action] || esc(a.action)}</strong> <span>${esc(a.summary || "")}</span>
        ${a.target === "order" ? ` <a href="#" data-openorder="${esc(a.targetId)}">open</a>` : ""}
        ${extra.length ? `<div class="act-extra">${extra.join("<br>")}</div>` : ""}</div>
    </div>`;
  }).join("") : `<p class="panel-sub">Nothing here yet.</p>`;
}
document.addEventListener("change", e => {
  if (e.target.id === "actWho") { actWho = e.target.value; renderActivity(); }
  if (e.target.id === "actKind") { actKind = e.target.value; renderActivity(); }
});
document.addEventListener("input", e => { if (e.target.id === "actQ") { actQ = e.target.value.trim(); renderActivity(); } });
/* order page: its history (owners) */
function orderHistory(id) {
  if (!NX.isOwner()) return "";
  if (!actStarted) { actStarted = true; NX.watchActivity(list => { acts = list; renderActivity(); if (selId) renderDetail(); }); }
  const h = acts.filter(a => a.targetId === id && a.target === "order").reverse();
  return `<h4 class="adm-h">History</h4>` + (h.length ? `<div class="act-mini">${h.map(a =>
    `<div><small>${new Date(a.at).toLocaleString()}</small> · <b>${esc(a.by === "system" ? "🤖 system" : a.by)}</b> — ${ACT_LABEL[a.action] || esc(a.action)}${a.details && a.details.reason ? ` (${esc(a.details.reason)})` : ""}</div>`).join("")}</div>`
    : `<p class="panel-sub">No admin actions yet.</p>`);
}

/* auto-complete orders delivered more than AUTO_COMPLETE_DAYS ago */
let autoRan = false;
async function autoComplete() {
  if (autoRan) return; autoRan = true;
  const due = all.filter(o => o.status === "delivered" && o.deliveredAt && Date.now() - o.deliveredAt > AUTO_COMPLETE_DAYS * 864e5);
  for (const o of due) { try { await NX.updateOrder(o.id, { status: "completed", completedAt: Date.now(), autoCompleted: true }); o.status = "completed"; } catch (e) { console.error(e); } }

  /* بعد AUTO_COMPLETE_DAYS من التسليم: أي أوردر مكتمل العميل معملوش ريفيو بياخد ريفيو تلقائي 5 نجوم */
  try {
    const reviewed = new Set((await NX.loadReviews()).map(r => r.id));
    const noReview = all.filter(o => o.status === "completed" && o.deliveredAt && !reviewed.has(o.id) && !o.reviewDeleted
                                  && Date.now() - o.deliveredAt > AUTO_COMPLETE_DAYS * 864e5);
    for (const o of noReview) { try { await NX.addAutoReview(o); } catch (e) { console.error(e); } }
  } catch (e) { console.error(e); }
}

/* ---------- events ---------- */
$("#admTabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) { tab = b.dataset.tab; render(); } });
$("#admSearch").addEventListener("input", e => { query = e.target.value.trim(); render(); });
$("#admList").addEventListener("click", e => { const b = e.target.closest(".adm-row"); if (b) select(b.dataset.id); });

$("#admDetail").addEventListener("click", async e => {
  const c = e.target.closest(".copy-btn");
  if (c) { try { await navigator.clipboard.writeText(c.dataset.copy); toast("📋 Copied"); } catch {} return; }
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const o = all.find(x => x.id === selId); if (!o) return;
  const act = b.dataset.act;
  b.disabled = true;
  try {
    const LOG = { togglestats: o.hideFromStats ? "order.count_again" : "order.remove_from_count", paid: "order.mark_paid", confirm: "order.payment_confirmed",
                  reject: "order.payment_rejected", deliver: "order.delivered", redeliver: "order.redelivered", complete: "order.completed", cancel: "order.cancelled" };
    const orderInfo = (extra = {}) => ({ target: "order", targetId: o.id,
      summary: `Order #${shortId(o.id)} — $${Number(o.total).toFixed(2)} — ${o.buyerEmail || ""}`, details: { from: o.status, ...extra } });
    window._nxLog = () => NX.logActivity(LOG[act], orderInfo(window._nxLogExtra || {}));
    window._nxLogExtra = {};
    if (act === "togglestats") {
      await NX.updateOrder(o.id, { hideFromStats: !o.hideFromStats });
      toast(o.hideFromStats ? "✅ Order counted again" : "🚫 Order removed from the store's count");
    }
    if (act === "paid" || act === "confirm") {
      await NX.updateOrder(o.id, { status: "processing", confirmedAt: Date.now() });
      await NX.sendMessage(o.id, `✅ Payment confirmed! Your order is being delivered now (about ${DELIVERY_TIME}).`, "admin");
    }
    if (act === "reject") {
      const why = prompt("What's wrong with the payment? (the customer will see this)", "We couldn't find your payment on the blockchain. Please check the TXID and network.");
      if (why === null) { b.disabled = false; return; }
      await NX.updateOrder(o.id, { status: "awaiting_payment", txHash: "", verifyNote: "", rejectedAt: Date.now() });
      window._nxLogExtra = { reason: why, txHash: o.txHash || "" };
      await NX.sendMessage(o.id, `⚠ ${why}`, "admin");
    }
    if (act === "deliver") {
      if (!confirm("Mark this order as delivered?")) { b.disabled = false; return; }
      await NX.updateOrder(o.id, { status: "delivered", deliveredAt: Date.now() });
      await NX.sendMessage(o.id, `📦 Your order has been delivered! Please check your account and press "I received my order".`, "admin");

    }
    if (act === "redeliver") {
      const note = prompt("Message to the customer:", "We've re-sent your order — please check your account again.");
      if (note === null) { b.disabled = false; return; }
      await NX.updateOrder(o.id, { status: "delivered", deliveredAt: Date.now(), disputeResolvedAt: Date.now() });
      if (note) await NX.sendMessage(o.id, `📦 ${note}`, "admin");
    }
    if (act === "complete") {
      await NX.updateOrder(o.id, { status: "completed", completedAt: Date.now(), ...(o.status === "disputed" ? { disputeResolvedAt: Date.now() } : {}) });
      if (o.status === "disputed") await NX.sendMessage(o.id, "✅ Dispute resolved — your order is now completed. Thanks for your patience!", "admin");
    }
    if (act === "cancel") {
      const why = prompt("Reason for cancelling (the customer will see this):", "");
      if (why === null) { b.disabled = false; return; }
      await NX.updateOrder(o.id, { status: "cancelled", cancelledBy: "admin", cancelReason: why });
      window._nxLogExtra = { reason: why };
      if (why) await NX.sendMessage(o.id, `✕ Order cancelled: ${why}`, "admin");
    }
    if (LOG[act]) window._nxLog();
    toast("✅ Updated");
  } catch (err) { console.error(err); toast("Couldn't update — you may not have permission for this."); b.disabled = false; }
});

$("#admDetail").addEventListener("submit", async e => {
  if (e.target.id !== "admChatForm") return;
  e.preventDefault();
  const inp = $("#admChatInput"), text = inp.value.trim();
  if (!text || !selId) return;
  inp.value = "";
  try { await NX.sendMessage(selId, text, "admin"); } catch (err) { console.error(err); toast("Not sent"); inp.value = text; }
});


/* =========================================================
   💬 Support inbox (tickets from the chat widget)
   ========================================================= */
const SUP_REASONS = { order: "📦 Problem with an order", payment: "💳 Payment question", product: "🎮 Question about a product", account: "👤 Account & sign in", other: "💬 Something else" };
let tks = [], supTab = "waiting", supSel = null, supStopAll = null, supStopMsgs = null, supMsgs = [];
const waiting = (t) => t.status === "open" && t.lastFrom === "buyer";

function startSupport() {
  if (supStopAll) return;
  supStopAll = NX.watchAllTickets(list => {
    const before = new Map(tks.map(t => [t.id, t]));
    const fresh = tks.length ? list.filter(t => waiting(t) && (!before.has(t.id) || before.get(t.id).updatedAt !== t.updatedAt)) : [];
    tks = list;
    if (fresh.length) toast(`💬 New support message from ${fresh[0].buyerName || fresh[0].buyerEmail}`);
    renderSupport();
  }, () => {});
}

const VIEW_ALLOWED = {
  orders: () => NX.can("orders") || NX.can("payments"), support: () => NX.can("support"), prices: () => NX.can("prices"),
  reviews: () => NX.can("reviews"), customers: () => NX.isOwner(), team: () => NX.isOwner(), activity: () => NX.isOwner(),
};
const VIEW_BOX = { orders: "#admOrders", support: "#admSupport", prices: "#admPrices", reviews: "#admReviews", customers: "#admCustomers", team: "#admTeam", activity: "#admActivity" };
function openView(v) {
  $$(".adm-view").forEach(x => x.classList.toggle("active", x.dataset.view === v));
  Object.entries(VIEW_BOX).forEach(([k, sel]) => { $(sel).hidden = k !== v; });
  if (v === "prices") renderPrices();
  if (v === "reviews") loadAdminReviews();
  if (v === "activity") startActivity();
  if (v === "customers") startCustomers();
}
function setupViews() {
  $$(".adm-view").forEach(b => { b.hidden = !VIEW_ALLOWED[b.dataset.view](); });
  $("#admRole").textContent = NX.isOwner() ? "Owner" : "Team · " + ((NX.staff && NX.staff.perms) || []).join(", ");
  const first = Object.keys(VIEW_ALLOWED).find(v => VIEW_ALLOWED[v]());
  if (first) openView(first);
}
$$(".adm-view").forEach(b => b.addEventListener("click", () => openView(b.dataset.view)));

function renderSupport() {
  const nWait = tks.filter(waiting).length;
  $("#admViewSupport").textContent = nWait || "";
  $("#admViewSupport").classList.toggle("hot", nWait > 0);
  const T = [["waiting", "Needs reply", waiting], ["open", "Open", t => t.status === "open"], ["closed", "Closed", t => t.status === "closed"], ["all", "All", () => true]];
  $("#supTabs").innerHTML = T.map(([k, l, f]) => `<button class="filter ${k === supTab ? "active" : ""}" data-sup="${k}">${l} <b>${tks.filter(f).length}</b></button>`).join("");
  const list = tks.filter(T.find(x => x[0] === supTab)[2]);
  $("#supList").innerHTML = list.length ? list.map(t => `
    <button class="adm-row ${t.id === supSel ? "sel" : ""}" data-tk="${t.id}">
      <span class="sw-conv-ic">${(SUP_REASONS[t.reason] || "💬").split(" ")[0]}</span>
      <span class="adm-row-info">
        <strong>${esc(t.buyerName || t.buyerEmail || "Customer")} · ${esc((SUP_REASONS[t.reason] || t.reason).replace(/^\S+\s/, ""))}</strong>
        <small>${t.lastFrom === "admin" ? "You: " : ""}${esc(t.lastText || "")}</small>
      </span>
      ${waiting(t) ? `<span class="status st-wait">Needs reply</span>` : t.status === "closed" ? `<span class="status st-cancel">Closed</span>` : `<span class="status st-done">Answered</span>`}
      <small class="sw-time">${timeAgo(t.updatedAt)}</small>
    </button>`).join("") : `<div class="pop-empty">📭<p>No conversations here</p></div>`;
  renderSupDetail();
}

function renderSupDetail() {
  const t = tks.find(x => x.id === supSel), box = $("#supDetail");
  if (!t) { box.innerHTML = `<p class="panel-sub">Select a conversation.</p>`; return; }
  const keep = $("#supInput") ? $("#supInput").value : "";
  box.innerHTML = `
    <div class="adm-d-head">
      <div><h3>${esc(SUP_REASONS[t.reason] || t.reason)}</h3><small class="muted-inline">${esc(t.buyerName || "")} · ${esc(t.buyerEmail || "")}</small></div>
      ${t.status === "closed" ? `<button class="btn btn-ghost adm-small" data-tkact="open">Reopen</button>` : `<button class="btn btn-ghost adm-small" data-tkact="close">✓ Close</button>`}
    </div>
    <div class="chat-list adm-chat" id="supChat" style="max-height:420px">
      ${supMsgs.map(m => `<div class="msg ${m.from === "admin" ? "mine" : "theirs"}"><div class="bubble"><p>${esc(m.text)}</p><small>${m.from === "admin" ? "You" : "Customer"} · ${timeAgo(m.createdAt)}</small></div></div>`).join("") || `<p class="chat-empty">Loading…</p>`}
    </div>
    <form class="chat-form" id="supForm">
      <input type="text" id="supInput" maxlength="1000" placeholder="Reply to the customer…" autocomplete="off">
      <button class="btn btn-primary" type="submit">Send</button>
    </form>
    <p class="panel-sub" style="margin-top:8px">The customer sees your reply in the chat bubble on the site (with a red badge).</p>`;
  if (keep) $("#supInput").value = keep;
  const c = $("#supChat"); c.scrollTop = c.scrollHeight;
}

$("#supTabs").addEventListener("click", e => { const b = e.target.closest("[data-sup]"); if (b) { supTab = b.dataset.sup; renderSupport(); } });
$("#supList").addEventListener("click", e => {
  const b = e.target.closest("[data-tk]"); if (!b) return;
  supSel = b.dataset.tk; supMsgs = [];
  if (supStopMsgs) supStopMsgs();
  supStopMsgs = NX.watchTicketMessages(supSel, l => { supMsgs = l; renderSupDetail(); });
  renderSupport();
});
$("#supDetail").addEventListener("click", async e => {
  const b = e.target.closest("[data-tkact]"); if (!b || !supSel) return;
  try {
    await NX.setTicketStatus(supSel, b.dataset.tkact === "close" ? "closed" : "open"); toast("✅ Updated");
    const t = tks.find(x => x.id === supSel) || {};
    NX.logActivity(b.dataset.tkact === "close" ? "support.closed" : "support.reopened", { target: "ticket", targetId: supSel, summary: `${t.reason || "Conversation"} — ${t.buyerEmail || ""}` });
  } catch { toast("Couldn't update"); }
});
$("#supDetail").addEventListener("submit", async e => {
  if (e.target.id !== "supForm") return;
  e.preventDefault();
  const inp = $("#supInput"), text = inp.value.trim();
  if (!text || !supSel) return;
  inp.value = "";
  try { await NX.sendTicketMessage(supSel, text, "admin"); } catch (err) { console.error(err); toast("Not sent"); inp.value = text; }
});


/* =========================================================
   💲 Prices — change prices without uploading files
   (saved in Firebase: config/prices — the store reads it on every page)
   ========================================================= */
let priceOv = {}, prGame = games[0].id, prDirty = false;
async function loadPriceOverrides() {
  priceOv = await NX.loadPrices();
  applyPrices(priceOv);
  if (!$("#admPrices").hidden) renderPrices();
  render();
}
const money2 = (n) => (n == null || n === "" ? "" : (+n).toFixed(n < 0.1 ? 4 : 2));

function renderPrices() {
  $("#prGames").innerHTML = games.map(g => `
    <button class="pr-game ${g.id === prGame ? "active" : ""}" data-pg="${g.id}">
      <span class="mini-tile" style="--g:${g.g}">${gameImg(g)}</span>
      <span><strong>${esc(g.name)}</strong><small>${priceOv[g.id] ? "Custom prices" : "Default prices"}</small></span>
    </button>`).join("");
  const g = byId(prGame), def = DEFAULT_PRICES.find(x => x.id === g.id);
  let rows;
  if (g.custom) {
    rows = `
      <p class="panel-sub">Customers type any amount. Price = amount × price per ${g.custom.suffix ? "1" + g.custom.suffix : "1"} ${esc(g.unit)}.</p>
      <div class="pr-row pr-custom">
        <label>Price per ${g.custom.suffix ? "1" + g.custom.suffix : "1"} ${esc(g.unit)} ($)<input type="number" step="0.0001" min="0" data-c="perUnit" value="${g.custom.perUnit}"><small>Default: ${def.custom.perUnit}</small></label>
        <label>Minimum${g.custom.suffix ? " (" + g.custom.suffix + ")" : ""}<input type="number" step="1" min="1" data-c="min" value="${g.custom.min}"><small>Default: ${def.custom.min}</small></label>
        <label>Maximum${g.custom.suffix ? " (" + g.custom.suffix + ")" : ""}<input type="number" step="1" min="1" data-c="max" value="${g.custom.max}"><small>Default: ${def.custom.max}</small></label>
      </div>`;
  } else {
    rows = `
      <div class="pr-head"><span>Package</span><span>Price ($)</span><span>Old price ($)</span><span>Badge</span><span>Show</span></div>
      ${g.packages.map((p, i) => `
        <div class="pr-row ${p.hidden ? "off" : ""}" data-i="${i}">
          <span class="pr-name">${esc(pkgLabel(g, p))}<small>Default ${money(def.packages[i].price)}</small></span>
          <input type="number" step="0.01" min="0" data-f="price" value="${money2(p.price)}">
          <input type="number" step="0.01" min="0" data-f="old" value="${p.old ? money2(p.old) : ""}" placeholder="—">
          <select data-f="badge">
            <option value="" ${!p.badge ? "selected" : ""}>None</option>
            <option value="popular" ${p.badge === "popular" ? "selected" : ""}>★ Popular</option>
            <option value="best" ${p.badge === "best" ? "selected" : ""}>Best Value</option>
          </select>
          <label class="pr-toggle"><input type="checkbox" data-f="show" ${p.hidden ? "" : "checked"}><i></i></label>
        </div>`).join("")}`;
  }
  $("#prEditor").innerHTML = `
    <div class="adm-d-head">
      <div><h3>${esc(g.name)}</h3><small class="muted-inline">Changes go live for everyone right after you save.</small></div>
      <a class="btn btn-ghost adm-small" href="${gameUrl(g)}" target="_blank" rel="noopener">View page ↗</a>
    </div>
    <div class="pr-rows">${rows}</div>
    <div class="pr-actions">
      <button class="btn btn-primary" id="prSave">Save prices</button>
      <button class="btn btn-ghost" id="prReset">Reset to default</button>
      <span class="pr-dirty" id="prDirty" ${prDirty ? "" : "hidden"}>● Unsaved changes</span>
    </div>`;
}

function readEditor() {
  const g = byId(prGame), out = {};
  if (g.custom) {
    const v = (k) => +$(`#prEditor [data-c="${k}"]`).value;
    out.custom = { perUnit: v("perUnit"), min: Math.round(v("min")), max: Math.round(v("max")) };
    if (!(out.custom.perUnit > 0) || !(out.custom.min >= 1) || !(out.custom.max >= out.custom.min)) throw new Error("Check the numbers: price must be above 0 and max ≥ min.");
  } else {
    out.packages = [...$$("#prEditor .pr-row")].map(row => {
      const q = (f) => row.querySelector(`[data-f="${f}"]`);
      const price = +q("price").value, old = q("old").value === "" ? null : +q("old").value;
      if (!(price > 0)) throw new Error("Every package needs a price above 0.");
      return { price: Math.round(price * 100) / 100, old: old ? Math.round(old * 100) / 100 : null, badge: q("badge").value || null, hidden: !q("show").checked };
    });
    if (out.packages.every(p => p.hidden)) throw new Error("At least one package has to stay visible.");
  }
  return out;
}

$("#prGames").addEventListener("click", e => {
  const b = e.target.closest("[data-pg]"); if (!b) return;
  if (prDirty && !confirm("You have unsaved changes. Leave without saving?")) return;
  prGame = b.dataset.pg; prDirty = false; renderPrices();
});
$("#prEditor").addEventListener("input", e => {
  prDirty = true; $("#prDirty").hidden = false;
  const row = e.target.closest(".pr-row"); if (row && e.target.dataset.f === "show") row.classList.toggle("off", !e.target.checked);
});
$("#prEditor").addEventListener("click", async e => {
  if (e.target.id === "prSave") {
    let data;
    try { data = readEditor(); } catch (err) { return toast("⚠ " + err.message); }
    const next = { ...priceOv, [prGame]: data };
    e.target.disabled = true;
    const snap = () => { const g = byId(prGame); return g.custom ? [`per ${g.custom.suffix || "unit"}: $${g.custom.perUnit}`]
      : g.packages.map(p => `${pkgLabel(g, p)}: ${p.hidden ? "hidden" : "$" + p.price}`); };
    const before = snap();
    try {
      await NX.savePrices(next); priceOv = next; applyPrices(priceOv);
      const after = snap(), changes = after.map((x, i) => x !== before[i] ? `${before[i]} → ${x.split(": ")[1]}` : null).filter(Boolean);
      if (changes.length) NX.logActivity("prices.changed", { target: "game", targetId: prGame, summary: `${byId(prGame).name}: ${changes.length} change${changes.length > 1 ? "s" : ""}`, details: { changes } });
      prDirty = false; renderPrices(); render(); toast("✅ Prices saved — live now");
    }
    catch (err) { console.error(err); toast("Couldn't save — check the Firestore rules are published."); }
    e.target.disabled = false;
  }
  if (e.target.id === "prReset") {
    if (!confirm("Reset this game to the default prices from data.js?")) return;
    const next = { ...priceOv }; delete next[prGame];
    try { await NX.savePrices(next); priceOv = next; applyPrices(priceOv); prDirty = false; renderPrices(); render(); toast("↩ Back to default prices");
      NX.logActivity("prices.reset", { target: "game", targetId: prGame, summary: `${byId(prGame).name}: back to default prices` }); }
    catch (err) { console.error(err); toast("Couldn't reset."); }
  }
});
