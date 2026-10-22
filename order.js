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
    startWatch();
    if (location.hash === "#chat" && !window._nxChatScrolled) {
      window._nxChatScrolled = true;
      setTimeout(() => { document.querySelector(".chat").scrollIntoView({ behavior: "smooth" }); $("#chatInput").focus(); }, 300);
    }
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
  const auto = o.payMethod === "usdt_bep20";
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const card = auto && cardInfo.enabled && Number(o.total) >= ((typeof CARD_PAY !== "undefined" && CARD_PAY.minUsd) || 0);
  box.innerHTML = `
    <h3 class="panel-title">💳 Complete your payment</h3>
    <div class="pay-amount">
      <span>Send exactly</span>
      <strong>${o.cryptoAmount} ${o.cryptoSymbol}</strong>
      <button class="copy-btn" data-copy="${o.cryptoAmount}">${copySvg} Copy</button>
    </div>
    ${auto ? `<p class="pay-exact">Send this <b>exact</b> amount (with the last digits) — that's how we find and confirm your payment automatically.</p>` : ""}
    <div class="pay-warn">⚠ Network: <strong>${esc(o.payNetwork)}</strong> only. Sending on another network will lose your funds.</div>

    ${auto ? `
    <div class="pay-quick">
      ${window.ethereum ? `<button class="btn btn-wallet" id="walletBtn"><span class="wl-ic">🦊</span> Pay with wallet <small>MetaMask · Trust Wallet</small></button>`
        : mobile ? `<a class="btn btn-wallet" href="https://metamask.app.link/dapp/${location.host}${location.pathname}${location.search}"><span class="wl-ic">🦊</span> Pay in MetaMask</a>
                    <a class="btn btn-wallet" href="https://link.trustwallet.com/open_url?coin_id=20000714&url=${encodeURIComponent(location.href)}"><span class="wl-ic">🛡</span> Pay in Trust Wallet</a>` : ""}
      ${card ? `<button class="btn btn-card" id="cardBtn"><span class="wl-ic">💳</span> Pay with Card${cardInfo.test ? ` <em class="test-tag">TEST</em>` : ""} <small>Visa · Apple Pay · Google Pay</small></button>` : ""}
    </div>
    ${card ? `<p class="pay-note">Card payments are handled by Transak: you buy USDT with your card and it's sent straight to us. Transak charges its own fee (about 3–5%) and asks for a one-time ID check.</p>` : ""}` : ""}

    <div class="pay-addr-wrap">
      <div class="qr" id="payQr"></div>
      <div class="pay-addr">
        <span>Wallet address</span>
        <code id="payAddr">${esc(o.payAddress)}</code>
        <button class="copy-btn" data-copy="${esc(o.payAddress)}">${copySvg} Copy address</button>
      </div>
    </div>

    ${auto ? `
    <details class="pay-help">
      <summary>How to pay from Binance</summary>
      <ol>
        <li>Open Binance → <b>Wallet</b> → <b>Withdraw</b> → <b>USDT</b>.</li>
        <li>Paste our address and choose the network <b>BNB Smart Chain (BEP20)</b>.</li>
        <li>Enter the amount so that <b>you receive exactly ${o.cryptoAmount} USDT</b> (Binance adds its fee on top — check the "Receive amount").</li>
        <li>Confirm. That's it — this page updates by itself when the payment arrives.</li>
      </ol>
    </details>
    <div class="pay-live" id="payLive"><span class="pl-dot"></span><span id="payLiveText">Waiting for your payment — we check the blockchain automatically.</span></div>` : ""}

    <form class="tx-form" id="txForm">
      <label>${auto ? "Paid but not detected after a few minutes? Paste your transaction hash (TXID)" : "After paying, paste your transaction hash (TXID)"}
        <input type="text" id="txInput" maxlength="190" placeholder="e.g. 0x8f2a…" autocomplete="off" required>
      </label>
      <p class="tx-msg" id="txMsg" hidden></p>
      <button class="btn ${auto ? "btn-ghost" : "btn-primary"} btn-block btn-pay" type="submit">${auto ? "Check my payment" : "I've paid"}</button>
    </form>
    <button class="link-btn cancel-link" id="cancelBtn">Cancel order</button>`;
  try {
    if (window.QRCode) new QRCode($("#payQr"), { text: o.payAddress, width: 132, height: 132, colorDark: "#000", colorLight: "#fff" });
    else $("#payQr").hidden = true;
  } catch { $("#payQr").hidden = true; }
}

/* ---------- automatic payment check (server checks the blockchain) ---------- */
let watchTimer = null, watchStarted = 0, pendingTx = "", checking = false, autoOff = false;
function liveText(t, cls = "") {
  const el = $("#payLive"); if (!el) return;
  el.className = "pay-live " + cls; $("#payLiveText").textContent = t;
}
async function verifyNow(tx) {
  if (checking) return null;
  checking = true;
  try {
    const r = await fetch("/api/verify", { method: "POST", headers: { "content-type": "application/json" },
                                          body: JSON.stringify({ orderId: order.id, txHash: tx || pendingTx || undefined }) });
    if (!r.ok && r.status !== 400) throw new Error("http " + r.status);
    return await r.json();
  } catch (e) { return { state: "unavailable" }; }
  finally { checking = false; }
}
function paidNotify(res) {
  const k = "nx_paid_notified_" + order.id;
  if (store(k, false)) return; save(k, true);
  toast("✅ Payment confirmed! We're delivering your order now.");
  NX.notifyOwner(`💰 PAID (auto-confirmed) — order #${shortId(order.id)} — $${order.total}`, {
    Order: "#" + shortId(order.id), Customer: order.buyerEmail,
    Amount: `${res.amount || order.cryptoAmount} USDT (BEP20) — $${order.total}`,
    TXID: res.txHash || "", Check: "https://bscscan.com/tx/" + (res.txHash || ""),
    Items: order.items.map(i => `${i.qty} × ${i.label} — ${i.gameName}`).join(" | "),
    Account: (order.fields || []).map(f => `${f.label}: ${f.value}`).join(" | "),
  });
}
async function tick() {
  if (order && order.autoVerified && order.status === "processing") { paidNotify({ txHash: order.txHash, amount: order.paidAmount }); return stopWatch(); }
  if (!order || order.payMethod !== "usdt_bep20" || !["awaiting_payment", "payment_submitted"].includes(order.status)) return stopWatch();
  if (Date.now() - watchStarted > 3 * 3600e3) return stopWatch();
  const res = await verifyNow();
  if (!res) return;
  if (res.state === "paid") { paidNotify(res); return stopWatch(); }
  if (res.state === "manual") { liveText(res.message || "We'll check your payment by hand.", "pl-manual"); return stopWatch(); }
  if (res.state === "unavailable") { autoOff = true; liveText("Waiting for your payment. After paying, paste your TXID below so we can confirm it.", "pl-off"); return; }
  if (res.state === "pending") liveText(res.message || "Payment found — waiting for confirmations…", "pl-found");
  else if (pendingTx && (res.state === "error" || res.state === "notfound")) { pendingTx = ""; txMsg(res.message, true); }
  else if (res.state === "waiting") liveText("Waiting for your payment — we check the blockchain automatically.");
}
function startWatch() {
  if (watchTimer || !order || order.payMethod !== "usdt_bep20") return;
  if (!["awaiting_payment", "payment_submitted"].includes(order.status)) return;
  watchStarted = Date.now();
  tick();
  watchTimer = setInterval(tick, 12000);
}
function stopWatch() { if (watchTimer) clearInterval(watchTimer); watchTimer = null; }
function txMsg(t, bad) { const m = $("#txMsg"); if (!m) return; m.hidden = !t; m.textContent = t || ""; m.classList.toggle("bad", !!bad); }

/* pay with MetaMask / Trust Wallet (browser wallet) — exact amount, no typing */
const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";
async function payWithWallet(btn) {
  const eth = window.ethereum;
  btn.disabled = true;
  try {
    const [from] = await eth.request({ method: "eth_requestAccounts" });
    try { await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] }); }
    catch (e) {
      if (e && e.code === 4902) await eth.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x38", chainName: "BNB Smart Chain",
        nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }, rpcUrls: ["https://bsc-dataseed.bnbchain.org"], blockExplorerUrls: ["https://bscscan.com"] }] });
      else throw e;
    }
    const amt = BigInt(Math.round(Number(order.cryptoAmount) * 1e4)) * 10n ** 14n;
    const data = "0xa9059cbb" + order.payAddress.slice(2).toLowerCase().padStart(64, "0") + amt.toString(16).padStart(64, "0");
    const hash = await eth.request({ method: "eth_sendTransaction", params: [{ from, to: USDT_BSC, data }] });
    pendingTx = hash;
    liveText("Payment sent from your wallet — confirming on the blockchain…", "pl-found");
    startWatch(); setTimeout(tick, 4000);
  } catch (e) {
    console.error(e);
    toast(e && e.code === 4001 ? "Payment cancelled in your wallet." : "Wallet payment didn't go through — you need USDT and a little BNB (for gas) on BNB Smart Chain.");
  } finally { btn.disabled = false; }
}

/* is card payment set up on the server? */
let cardInfo = { enabled: false, test: false };
fetch("/api/card").then(r => r.ok ? r.json() : {}).then(j => {
  if (!j || !j.enabled) return;
  cardInfo = { enabled: true, test: !!j.test };
  const box = $("#payBox"); if (box) box.dataset.for = "";
  if (order) renderPayBox();
}).catch(() => {});

async function openCardPay(btn) {
  const win = window.open("", "_blank");            // open now (popup blockers), fill in when the link is ready
  if (win) { try { win.document.write("<p style='font-family:sans-serif;padding:24px'>Opening secure card payment…</p>"); } catch {} }
  btn.disabled = true;
  try {
    const r = await fetch("/api/card", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: order.id }) });
    const j = await r.json();
    if (!j.ok || !j.url) throw new Error(j.message || "unavailable");
    if (win) { win.opener = null; win.location.href = j.url; } else location.href = j.url;
    liveText("Finish the card payment in the Transak window — this page updates by itself when the USDT arrives.", "pl-found");
  } catch (e) {
    if (win) win.close();
    toast(e.message && e.message.length > 12 ? e.message : "Card payment is unavailable right now — please pay with crypto.");
  } finally { btn.disabled = false; }
}

function renderAction() {
  const o = order, box = $("#odAction");
  const keep = $("#disputeText") ? { text: $("#disputeText").value, r: ($("input[name=dr]:checked") || {}).value } : null;
  if (o.status !== "delivered") disputeFormOpen = false;
  const reviewed = remoteReviews.some(r => r.id === o.id && !r.auto);   // an automatic review can still be replaced
  const msgs = {
    payment_submitted: `<h3 class="panel-title">🔎 Verifying your payment</h3>
      <p class="panel-sub">We're checking your transaction. This usually takes a few minutes — you'll see the status change here.</p>`,
    processing: `<h3 class="panel-title">⚡ Payment confirmed${o.autoVerified ? " automatically" : ""} — delivering</h3>
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
        ${c.from === "admin" && !mine ? `<img src="${typeof LOGO_SRC !== 'undefined' ? LOGO_SRC : 'images/logo.png'}" alt="" class="msg-av">` : ""}
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
  if (e.target.closest("#walletBtn")) { payWithWallet(e.target.closest("#walletBtn")); return; }
  if (e.target.closest("#cardBtn")) { openCardPay(e.target.closest("#cardBtn")); return; }
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
  const btn = e.target.querySelector("button"), label = btn.textContent;
  btn.disabled = true; btn.textContent = "Checking…"; txMsg("");

  /* 1) automatic check on the blockchain */
  const res = order.payMethod === "usdt_bep20" ? await verifyNow(tx) : { state: "unavailable" };
  if (res && res.state === "paid") { paidNotify(res); btn.disabled = false; btn.textContent = label; return; }
  if (res && res.state === "manual") { txMsg(res.message); stopWatch(); btn.disabled = false; btn.textContent = label; return; }
  if (res && res.state === "pending") { pendingTx = tx; txMsg(res.message || "Found it — waiting for confirmations…"); startWatch(); btn.disabled = false; btn.textContent = label; return; }
  if (res && (res.state === "error" || res.state === "notfound")) { txMsg(res.message, true); btn.disabled = false; btn.textContent = label; return; }
  if (res && res.state !== "unavailable") { pendingTx = tx; txMsg("Checking your transaction…"); startWatch(); btn.disabled = false; btn.textContent = label; return; }

  /* 2) automatic check not available → send it to the admin to check by hand (as before) */
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
    btn.disabled = false; btn.textContent = label;
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
