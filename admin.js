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
  startSupport();
  loadPriceOverrides();
  stopAll = NX.watchAllOrders(list => {
    const before = new Map(all.map(o => [o.id, o]));
    const fresh = all.length && list.filter(o => !before.has(o.id));
    const newDisputes = all.length && list.filter(o => o.status === "disputed" && (before.get(o.id) || {}).status !== "disputed");
    all = list;
    if (fresh && fresh.length) toast(`🛒 ${fresh.length} new order${fresh.length > 1 ? "s" : ""}!`);
    if (newDisputes && newDisputes.length) toast(`⚠ New dispute on #${shortId(newDisputes[0].id)}!`);
    render();
    autoComplete();
    syncStats();
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
  all.filter(o => COUNTED.includes(o.status)).forEach(o => {
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
  for (const o of due) { try { await NX.updateOrder(o.id, { status: "completed", completedAt: Date.now(), autoCompleted: true }); o.status = "completed"; } catch (e) { console.error(e); } }

  /* بعد AUTO_COMPLETE_DAYS من التسليم: أي أوردر مكتمل العميل معملوش ريفيو بياخد ريفيو تلقائي 5 نجوم */
  try {
    const reviewed = new Set((await NX.loadReviews()).map(r => r.id));
    const noReview = all.filter(o => o.status === "completed" && o.deliveredAt && !reviewed.has(o.id)
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

$$(".adm-view").forEach(b => b.addEventListener("click", () => {
  $$(".adm-view").forEach(x => x.classList.toggle("active", x === b));
  $("#admOrders").hidden = b.dataset.view !== "orders";
  $("#admSupport").hidden = b.dataset.view !== "support";
  $("#admPrices").hidden = b.dataset.view !== "prices";
  if (b.dataset.view === "prices") renderPrices();
}));

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
  try { await NX.setTicketStatus(supSel, b.dataset.tkact === "close" ? "closed" : "open"); toast("✅ Updated"); } catch { toast("Couldn't update"); }
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
    try { await NX.savePrices(next); priceOv = next; applyPrices(priceOv); prDirty = false; renderPrices(); render(); toast("✅ Prices saved — live now"); }
    catch (err) { console.error(err); toast("Couldn't save — check the Firestore rules are published."); }
    e.target.disabled = false;
  }
  if (e.target.id === "prReset") {
    if (!confirm("Reset this game to the default prices from data.js?")) return;
    const next = { ...priceOv }; delete next[prGame];
    try { await NX.savePrices(next); priceOv = next; applyPrices(priceOv); prDirty = false; renderPrices(); render(); toast("↩ Back to default prices"); }
    catch (err) { console.error(err); toast("Couldn't reset."); }
  }
});
