/* ================= NILORIX — order page (order.html?id=...) ================= */

const orderId = new URLSearchParams(location.search).get("id");
let order = null, stopOrder = null, stopChat = null, chatMsgs = [], disputeFormOpen = false;
const STEPS = [
  ["awaiting_payment", "Placed"],
  ["payment_submitted", "Paid"],
  ["processing", "Processing"],
  ["delivered", "Delivered"],
  ["completed", "Completed"],
];
const stepIndex = (s) => STEPS.findIndex(x => x[0] === s);
const copySvg = `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`;

function gate(title, text, showBtn = true) {
  $("#odWrap").hidden = true;
  $("#odGate").hidden = false;
  $("#odGateTitle").textContent = title;
  $("#odGateText").textContent = text;
  $("#odGateBtn").hidden = !showBtn;
}
$("#odGateBtn").addEventListener("click", () => openLogin("in", "Sign in to see your order."));

window.onAuthChange = (user) => {
  if (stopOrder) { stopOrder(); stopOrder = null; }
  if (stopChat) { stopChat(); stopChat = null; }
  if (!orderId) return gate("Order not found", "This link is missing the order number.", false);
  if (!NX.enabled) return gate("Store not connected", "The store isn't set up yet.", false);
  if (!user) return gate("Sign in to see this order", "This order belongs to an account.");

  stopOrder = NX.watchOrder(orderId, o => {
    if (!o) return gate("Order not found", "This order doesn't exist.", false);
    order = o;
    $("#odGate").hidden = true;
    $("#odWrap").hidden = false;
    renderOrder();
    autoCompleteIfDue();
  }, () => gate("Order not found", "You don't have access to this order.", false));

  stopChat = NX.watchMessages(orderId, list => { chatMsgs = list; renderChat(); });
};

/* ---------- render ---------- */
function renderOrder() {
  const o = order, m = PAY_METHODS[o.payMethod] || {};
  document.title = `Order #${shortId(o.id)} — NILORIX`;
  $("#crumbId").textContent = "#" + shortId(o.id);
  $("#odTitle").textContent = `Order #${shortId(o.id)}`;
  $("#odDate").textContent = `Placed ${new Date(o.createdAt).toLocaleString()}`;
  $("#odStatus").innerHTML = statusPill(o.status);

  /* progress steps */
  const cur = stepIndex(o.status === "disputed" ? "delivered" : o.status);
  $("#odSteps").innerHTML = o.status === "cancelled"
    ? `<div class="od-cancel">✕ This order was cancelled${o.cancelReason ? ": " + esc(o.cancelReason) : ""}.</div>`
    : STEPS.map(([k, label], i) => `
        <div class="od-step ${i < cur ? "done" : i === cur ? "now" : ""}">
          <span class="od-dot">${i < cur ? "✓" : i + 1}</span><span>${label}</span>
        </div>`).join('<span class="od-line"></span>');

  /* items + payment info */
  $("#odItems").innerHTML = o.items.map(i => {
    const g = byId(i.gid);
    return `
      <div class="co-item">
        ${g ? tile(g) : `<span class="mini-tile">#</span>`}
        <div class="co-item-info"><strong>${i.qty > 1 ? i.qty + " × " : ""}${esc(i.label)}</strong>
          <small>${esc(i.gameName)}${i.optLabel ? " · " + esc(i.optLabel) : ""}</small></div>
        <span class="co-item-price">$${(i.price * i.qty).toFixed(2)}</span>
      </div>`;
  }).join("");
  $("#odTotal").textContent = `$${o.total.toFixed(2)}`;
  $("#odPayInfo").innerHTML = `
    <div><span>Payment</span><strong>${m.name || o.cryptoSymbol} · ${esc(o.payNetwork)}</strong></div>
    <div><span>Amount</span><strong>${o.cryptoAmount} ${o.cryptoSymbol}</strong></div>
    ${o.txHash ? `<div><span>TXID</span><a class="tx-link" href="${m.explorer || "#"}${encodeURIComponent(o.txHash)}" target="_blank" rel="noopener">${esc(o.txHash.slice(0, 10))}…${esc(o.txHash.slice(-6))}</a></div>` : ""}`;
  $("#odFields").innerHTML = (o.fields || []).map(f =>
    `<div><span>${esc(f.label)}</span><strong>${esc(f.value)}</strong></div>`).join("") || `<p class="panel-sub">—</p>`;

  renderPayBox();
  renderAction();
}

function renderPayBox() {
  const o = order, box = $("#payBox");
  if (o.status !== "awaiting_payment") { box.hidden = true; box.dataset.for = ""; return; }
  box.hidden = false;
  if (box.dataset.for === o.id) return;   // don't wipe what the buyer is typing
  box.dataset.for = o.id;
  const m = PAY_METHODS[o.payMethod] || {};
  box.innerHTML = `
    <h3 class="panel-title">💳 Complete your payment</h3>
    <div class="pay-amount">
      <span>Send exactly</span>
      <strong>${o.cryptoAmount} ${o.cryptoSymbol}</strong>
      <button class="copy-btn" data-copy="${o.cryptoAmount}">${copySvg} Copy</button>
    </div>
    <div class="pay-warn">⚠ Network: <strong>${esc(o.payNetwork)}</strong> only. Sending on another network will lose your funds.</div>
    <div class="pay-addr-wrap">
      <div class="qr" id="payQr"></div>
      <div class="pay-addr">
        <span>Wallet address</span>
        <code id="payAddr">${esc(o.payAddress)}</code>
        <button class="copy-btn" data-copy="${esc(o.payAddress)}">${copySvg} Copy address</button>
      </div>
    </div>
    <form class="tx-form" id="txForm">
      <label>After paying, paste your transaction hash (TXID)
        <input type="text" id="txInput" maxlength="190" placeholder="e.g. 0x8f2a… or a1b2c3…" autocomplete="off" required>
      </label>
      <button class="btn btn-primary btn-block btn-pay" type="submit">I've paid</button>
    </form>
    <button class="link-btn cancel-link" id="cancelBtn">Cancel order</button>`;
  try {
    if (window.QRCode) new QRCode($("#payQr"), { text: o.payAddress, width: 132, height: 132, colorDark: "#000", colorLight: "#fff" });
    else $("#payQr").hidden = true;
  } catch { $("#payQr").hidden = true; }
}

function renderAction() {
  const o = order, box = $("#odAction");
  const keep = $("#disputeText") ? { text: $("#disputeText").value, r: ($("input[name=dr]:checked") || {}).value } : null;
  if (o.status !== "delivered") disputeFormOpen = false;
  const reviewed = remoteReviews.some(r => r.id === o.id);
  const msgs = {
    payment_submitted: `<h3 class="panel-title">🔎 Verifying your payment</h3>
      <p class="panel-sub">We're checking your transaction. This usually takes a few minutes — you'll see the status change here.</p>`,
    processing: `<h3 class="panel-title">⚡ Payment confirmed — delivering</h3>
      <p class="panel-sub">Your order is on its way. Estimated delivery: <strong>${DELIVERY_TIME}</strong>. We'll message you here if we need anything.</p>`,
    delivered: `<h3 class="panel-title">📦 Your order was delivered</h3>
      <p class="panel-sub">Please check your game account. If everything arrived, confirm below.
        If you don't confirm within ${AUTO_COMPLETE_DAYS} days, the order is marked as received automatically.</p>
      <button class="btn btn-primary btn-block btn-pay" id="receivedBtn">✓ I received my order</button>
      ${disputeFormOpen ? `
        <form class="dispute-form" id="disputeForm">
          <h4>⚠ Open a dispute</h4>
          <p class="panel-sub">Tell us what went wrong. We'll check it and reply in the chat below.</p>
          <div class="dispute-reasons">
            ${DISPUTE_REASONS.map((r, i) => `<label class="dr"><input type="radio" name="dr" value="${esc(r)}" ${i === 0 ? "checked" : ""}><span>${esc(r)}</span></label>`).join("")}
          </div>
          <textarea id="disputeText" maxlength="1000" rows="3" placeholder="Details (what you received, when you checked, etc.)" required></textarea>
          <div class="dispute-btns">
            <button class="btn btn-danger" type="submit">Submit dispute</button>
            <button class="btn btn-ghost" type="button" id="disputeCancel">Back</button>
          </div>
        </form>`
      : `<button class="dispute-link" id="disputeBtn">⚠ I didn't receive it — open a dispute</button>`}`,
    disputed: `<h3 class="panel-title">⚠ Dispute open</h3>
      <div class="dispute-box"><span>Your report</span><p>${esc(o.disputeReason || "")}</p></div>
      <p class="panel-sub" style="margin-top:12px">We got your dispute and we're checking it now. We'll reply in the chat below —
        your order stays protected until it's solved.</p>
      <button class="btn btn-ghost btn-block" id="receivedBtn" style="margin-top:14px">✓ I received it now — close dispute</button>`,
    completed: `<h3 class="panel-title">✅ Order completed</h3>
      <p class="panel-sub">Thanks for shopping with Nilorix!</p>
      ${reviewed ? `<p class="panel-sub">⭐ You reviewed this order.</p>` : `<button class="btn btn-ghost" id="reviewBtn">⭐ Leave a review</button>`}`,
  };
  box.hidden = !msgs[o.status];
  box.innerHTML = msgs[o.status] || "";
  if (keep && $("#disputeText")) {
    $("#disputeText").value = keep.text;
    $$("input[name=dr]").forEach(i => { i.checked = i.value === keep.r; });
  }
}

/* chat */
function renderChat() {
  const meIsAdmin = order && NX.isAdmin() && order.uid !== (NX.user && NX.user.uid);
  const list = $("#chatList");
  const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
  list.innerHTML = chatMsgs.length ? chatMsgs.map(c => {
    const mine = meIsAdmin ? c.from === "admin" : c.from === "buyer";
    return `
      <div class="msg ${mine ? "mine" : "theirs"}">
        ${c.from === "admin" && !mine ? `<img src="images/logo.png" alt="" class="msg-av">` : ""}
        <div class="bubble"><p>${esc(c.text)}</p><small>${c.from === "admin" ? "Nilorix · " : ""}${timeAgo(c.createdAt)}</small></div>
      </div>`;
  }).join("") : `<p class="chat-empty">Need help with this order? Send us a message — we usually reply within minutes.</p>`;
  if (atBottom || chatMsgs.length < 4) list.scrollTop = list.scrollHeight;
}

/* auto-complete after AUTO_COMPLETE_DAYS once delivered */
async function autoCompleteIfDue() {
  const o = order;
  if (o.status === "delivered" && o.deliveredAt && o.uid === NX.user.uid
      && Date.now() - o.deliveredAt > AUTO_COMPLETE_DAYS * 864e5) {
    try { await NX.markReceived(o.id); } catch (e) { console.error(e); }
  }
}

/* ---------- events ---------- */
document.addEventListener("click", async e => {
  const c = e.target.closest(".copy-btn");
  if (c) {
    try { await navigator.clipboard.writeText(c.dataset.copy); toast("📋 Copied"); }
    catch { toast("Couldn't copy — select and copy manually"); }
    return;
  }
  if (e.target.closest("#receivedBtn")) {
    const b = e.target.closest("#receivedBtn"); b.disabled = true;
    try { await NX.markReceived(order.id); openReview({ ...order, status: "completed" }); }
    catch (err) { console.error(err); toast("Couldn't update the order — try again."); b.disabled = false; }
    return;
  }
  if (e.target.closest("#reviewBtn")) { openReview(order); return; }
  if (e.target.closest("#disputeBtn")) { disputeFormOpen = true; renderAction(); $("#disputeText").focus(); return; }
  if (e.target.closest("#disputeCancel")) { disputeFormOpen = false; renderAction(); return; }
  if (e.target.closest("#cancelBtn")) {
    if (!confirm("Cancel this order? Only cancel if you haven't sent any payment.")) return;
    try { await NX.cancelOrder(order.id); toast("Order cancelled"); } catch { toast("Couldn't cancel — try again."); }
  }
});

document.addEventListener("submit", async e => {
  if (e.target.id !== "disputeForm") return;
  e.preventDefault();
  const reason = ($("input[name=dr]:checked") || {}).value || "Other";
  const details = $("#disputeText").value.trim();
  if (!details) return toast("Please describe the problem.");
  const full = `${reason} — ${details}`;
  const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Sending…";
  try {
    await NX.openDispute(order.id, full);
    try { await NX.sendMessage(order.id, `⚠ Dispute: ${full}`, "buyer"); } catch {}
    NX.notifyOwner(`⚠ DISPUTE on order #${shortId(order.id)} — $${order.total}`, {
      Order: "#" + shortId(order.id),
      Customer: `${order.buyerName || ""} <${order.buyerEmail}>`,
      Items: order.items.map(i => `${i.qty} × ${i.label} — ${i.gameName}`).join(" | "),
      Account: (order.fields || []).map(f => `${f.label}: ${f.value}`).join(" | "),
      Problem: full,
    });
    disputeFormOpen = false;
    toast("⚠ Dispute sent — we'll reply in the chat.");
  } catch (err) {
    console.error(err); toast("Couldn't send the dispute — try again.");
    btn.disabled = false; btn.textContent = "Submit dispute";
  }
});

document.addEventListener("submit", async e => {
  if (e.target.id !== "txForm") return;
  e.preventDefault();
  const tx = $("#txInput").value.trim();
  if (tx.length < 12 || /\s/.test(tx)) return toast("That doesn't look like a transaction hash.");
  const btn = e.target.querySelector("button"); btn.disabled = true; btn.textContent = "Sending…";
  try {
    await NX.submitPayment(order.id, tx);
    NX.notifyOwner(`💰 Payment sent for order #${shortId(order.id)}`, {
      Order: "#" + shortId(order.id),
      Customer: order.buyerEmail,
      Amount: `${order.cryptoAmount} ${order.cryptoSymbol} (${order.payNetwork}) — $${order.total}`,
      TXID: tx,
      Check: (PAY_METHODS[order.payMethod] || {}).explorer + tx,
    });
    toast("✅ Thanks! We're verifying your payment.");
  } catch (err) {
    console.error(err); toast("Couldn't submit — try again.");
    btn.disabled = false; btn.textContent = "I've paid";
  }
});

$("#chatForm").addEventListener("submit", async e => {
  e.preventDefault();
  const text = $("#chatInput").value.trim();
  if (!text || !order) return;
  const asAdmin = NX.isAdmin() && order.uid !== NX.user.uid;
  $("#chatInput").value = "";
  try {
    await NX.sendMessage(order.id, text, asAdmin ? "admin" : "buyer");
    /* email the shop at most every 10 min per order */
    const k = "nx_chatmail_" + order.id;
    if (!asAdmin && Date.now() - store(k, 0) > 10 * 60000) {
      save(k, Date.now());
      NX.notifyOwner(`💬 New message on order #${shortId(order.id)}`, { Order: "#" + shortId(order.id), From: order.buyerEmail, Message: text });
    }
  } catch (err) { console.error(err); toast("Message not sent — try again."); $("#chatInput").value = text; }
});

window.pageRender = () => { if (order) renderOrder(); };
if (!NX.enabled) window.onAuthChange(null);
