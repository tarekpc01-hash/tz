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
  if (NX.isAdminEmail() && !NX.isAdmin()) {
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
    $("#admDeniedText").textContent = `${user.email} isn't in ADMIN_EMAILS (config.js) and firestore.rules.`;
    return;
  }
  show("#admMain");
  stopAll = NX.watchAllOrders(list => {
    const before = new Set(all.map(o => o.id));
    const fresh = all.length && list.filter(o => !before.has(o.id));
    all = list;
    if (fresh && fresh.length) toast(`🛒 ${fresh.length} new order${fresh.length > 1 ? "s" : ""}!`);
    const newDisputes = all.length && list.filter(o => o.status === "disputed" && (all.find(x => x.id === o.id) || {}).status !== "disputed");
    if (newDisputes && newDisputes.length) toast(`⚠ New dispute on #${shortId(newDisputes[0].id)}!`);
    render();
    autoComplete();
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

  const actions = {
    awaiting_payment: `
      <button class="btn btn-primary" data-act="paid">✓ Mark as paid</button>
      <button class="btn btn-ghost" data-act="cancel">✕ Cancel</button>`,
    payment_submitted: `
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
    </div>
    ${o.txHash ? `<p class="panel-sub">Open the TXID and check: the network, the receiving address, and the amount.</p>` : ""}

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

/* auto-complete orders delivered more than AUTO_COMPLETE_DAYS ago */
let autoRan = false;
async function autoComplete() {
  if (autoRan) return; autoRan = true;
  const due = all.filter(o => o.status === "delivered" && o.deliveredAt && Date.now() - o.deliveredAt > AUTO_COMPLETE_DAYS * 864e5);
  for (const o of due) { try { await NX.updateOrder(o.id, { status: "completed", completedAt: Date.now(), autoCompleted: true }); } catch (e) { console.error(e); } }
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
    if (act === "paid" || act === "confirm") {
      await NX.updateOrder(o.id, { status: "processing", confirmedAt: Date.now() });
      await NX.sendMessage(o.id, `✅ Payment confirmed! Your order is being delivered now (about ${DELIVERY_TIME}).`, "admin");
    }
    if (act === "reject") {
      const why = prompt("What's wrong with the payment? (the customer will see this)", "We couldn't find your payment on the blockchain. Please check the TXID and network.");
      if (why === null) { b.disabled = false; return; }
      await NX.updateOrder(o.id, { status: "awaiting_payment", txHash: "", rejectedAt: Date.now() });
      await NX.sendMessage(o.id, `⚠ ${why}`, "admin");
    }
    if (act === "deliver") {
      if (!confirm("Mark this order as delivered?")) { b.disabled = false; return; }
      await NX.updateOrder(o.id, { status: "delivered", deliveredAt: Date.now() });
      await NX.sendMessage(o.id, `📦 Your order has been delivered! Please check your account and press "I received my order".`, "admin");
      const counts = {}; o.items.forEach(i => { counts[i.gid] = (counts[i.gid] || 0) + i.qty; });
      try { await NX.addSales(counts); } catch (err) { console.error(err); }
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
      if (why) await NX.sendMessage(o.id, `✕ Order cancelled: ${why}`, "admin");
    }
    toast("✅ Updated");
  } catch (err) { console.error(err); toast("Couldn't update — check your connection / rules."); b.disabled = false; }
});

$("#admDetail").addEventListener("submit", async e => {
  if (e.target.id !== "admChatForm") return;
  e.preventDefault();
  const inp = $("#admChatInput"), text = inp.value.trim();
  if (!text || !selId) return;
  inp.value = "";
  try { await NX.sendMessage(selId, text, "admin"); } catch (err) { console.error(err); toast("Not sent"); inp.value = text; }
});
