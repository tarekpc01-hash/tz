/* ================= NILORIX — checkout ================= */

let co = null;
try { co = JSON.parse(sessionStorage.getItem("nx_checkout") || "null"); } catch {}
const coItems = ((co && co.items) || [])
  .map(i => ({ ...i, g: byId(i.gid) }))
  .filter(i => i.g && i.g.packages[i.p] && i.qty > 0);

let payMethod = store("nx_paymethod", "usdt_trc20");
let ltcRate = null, ltcErr = false;

const walletReady = (m) => typeof WALLETS !== "undefined" && WALLETS[m] && !WALLETS[m].startsWith("PUT_");
const totalUsd = () => coItems.reduce((s, i) => s + i.g.packages[i.p].price * i.qty, 0);
const round2 = (n) => Math.round(n * 100) / 100;

function cryptoAmount(m) {
  const t = round2(totalUsd());
  if (m === "ltc") return ltcRate ? +(t / ltcRate).toFixed(6) : null;
  return t;   // USDT 1:1
}

/* ---------- render ---------- */
function renderCheckout() {
  if (!coItems.length) { $("#coGrid").hidden = true; $("#coEmpty").hidden = false; return; }

  /* setup warnings */
  const missing = [];
  if (!NX.enabled) missing.push("Firebase settings");
  if (!Object.keys(PAY_METHODS).some(walletReady)) missing.push("wallet addresses");
  $("#coSetup").hidden = !missing.length;
  if (missing.length) $("#coSetupText").textContent = `Fill in ${missing.join(" and ")} in config.js to start taking orders.`;

  /* items */
  $("#coItems").innerHTML = coItems.map(i => {
    const pk = i.g.packages[i.p], op = optLabel(i.g, i.opt);
    return `
      <div class="co-item">
        ${tile(i.g)}
        <div class="co-item-info">
          <strong>${i.qty > 1 ? i.qty + " × " : ""}${esc(pkgLabel(i.g, pk))}</strong>
          <small>${i.g.name}${op ? " · " + esc(op) : ""}</small>
        </div>
        <span class="co-item-price">${fmt(pk.price * i.qty)}</span>
      </div>`;
  }).join("");
  $("#coTotal").textContent = fmt(totalUsd());
  $("#coDelivery").textContent = DELIVERY_TIME;

  /* account fields — one block per game */
  if (!$("#coFields").dataset.built) {
    const gids = [...new Set(coItems.map(i => i.gid))];
    $("#coFields").innerHTML = gids.map(gid => {
      const g = byId(gid), saved = store("nx_fields_" + gid, {});
      const fields = ACCOUNT_FIELDS[gid] || [{ key: "account", label: "Account / username", placeholder: "" }];
      return `
        <div class="co-game">
          ${gids.length > 1 ? `<div class="co-game-head">${tile(g)}<strong>${g.name}</strong></div>` : ""}
          ${fields.map(f => `
            <label class="co-field">${esc(f.label)}
              <input type="${f.type || "text"}" maxlength="120" data-gid="${gid}" data-key="${f.key}" data-label="${esc(f.label)}"
                     placeholder="${esc(f.placeholder || "")}" value="${esc(saved[f.key] || "")}" required>
            </label>`).join("")}
        </div>`;
    }).join("");
    $("#coFields").dataset.built = "1";
  }

  /* payment methods */
  $("#payList").innerHTML = Object.entries(PAY_METHODS).filter(([k]) => walletReady(k)).map(([k, m]) => {
    const ok = walletReady(k);
    return `
      <button type="button" class="pay-opt ${k === payMethod ? "selected" : ""}" data-m="${k}" ${ok ? "" : "disabled"}>
        <span class="pay-ic ${k}">${m.symbol === "LTC" ? "Ł" : "₮"}</span>
        <span class="pay-info"><strong>${m.name}</strong><small>${m.network}</small></span>
        ${ok ? (k === payMethod ? `<span class="amt-check" style="display:grid;position:static">✓</span>` : "") : `<small class="muted-inline">Not available</small>`}
      </button>`;
  }).join("");

  /* crypto amount */
  const m = PAY_METHODS[payMethod], amt = cryptoAmount(payMethod);
  $("#coCrypto").innerHTML = payMethod === "ltc" && amt == null
    ? (ltcErr ? `You'll pay in LTC — <button class="link-btn" id="ltcRetry">couldn't load the LTC rate, retry</button>` : "Loading LTC rate…")
    : `You'll pay <strong>${amt} ${m.symbol}</strong> on ${m.network}`;
}

async function loadLtc() {
  ltcErr = false; ltcRate = null; renderCheckout();
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=usd");
    const j = await r.json();
    ltcRate = j.litecoin.usd;
  } catch { ltcErr = true; }
  renderCheckout();
}

/* ---------- events ---------- */
$("#payList").addEventListener("click", e => {
  const b = e.target.closest(".pay-opt");
  if (!b || b.disabled) return;
  payMethod = b.dataset.m;
  save("nx_paymethod", payMethod);
  if (payMethod === "ltc" && !ltcRate) loadLtc(); else renderCheckout();
});
$("#coCrypto").addEventListener("click", e => { if (e.target.id === "ltcRetry") loadLtc(); });

function coError(msg) { $("#coErr").textContent = msg; $("#coErr").hidden = !msg; }

$("#placeBtn").addEventListener("click", async () => {
  coError("");
  if (!NX.enabled) return coError("The store isn't connected yet — please contact support.");
  if (!walletReady(payMethod)) return coError("Please choose a payment method.");

  /* account fields */
  const inputs = [...$$("#coFields input")];
  const empty = inputs.find(i => !i.value.trim());
  if (empty) { empty.focus(); return coError(`Please fill in: ${empty.dataset.label}`); }
  const badEmail = inputs.find(i => i.type === "email" && !/^\S+@\S+\.\S+$/.test(i.value.trim()));
  if (badEmail) { badEmail.focus(); return coError("Please enter a valid email."); }
  if (!$("#coAgree").checked) return coError("Please confirm your account details are correct.");

  const amt = cryptoAmount(payMethod);
  if (amt == null) return coError("LTC rate isn't loaded yet — try again in a moment.");

  await requireLogin("Sign in or create an account to place your order.");

  const btn = $("#placeBtn"); btn.disabled = true; btn.textContent = "Placing order…";
  try {
    /* remember details for next time */
    const byGame = {};
    inputs.forEach(i => { (byGame[i.dataset.gid] = byGame[i.dataset.gid] || {})[i.dataset.key] = i.value.trim(); });
    Object.entries(byGame).forEach(([gid, v]) => save("nx_fields_" + gid, v));

    const m = PAY_METHODS[payMethod];
    const order = {
      items: coItems.map(i => {
        const pk = i.g.packages[i.p];
        return { gid: i.gid, gameName: i.g.name, p: i.p, label: pkgLabel(i.g, pk), opt: i.opt ?? null,
                 optLabel: optLabel(i.g, i.opt) || "", qty: i.qty, price: pk.price };
      }),
      fields: inputs.map(i => ({ gid: i.dataset.gid, gameName: byId(i.dataset.gid).name, label: i.dataset.label, value: i.value.trim() })),
      total: round2(totalUsd()),
      payMethod, payNetwork: m.network, cryptoSymbol: m.symbol, cryptoAmount: amt,
      payAddress: WALLETS[payMethod],
      ltcRate: payMethod === "ltc" ? ltcRate : null,
    };
    const id = await NX.createOrder(order);

    NX.notifyOwner(`🛒 New order #${shortId(id)} — $${order.total}`, {
      Order: "#" + shortId(id),
      Customer: `${(NX.profile && NX.profile.name) || ""} <${NX.user.email}>`,
      Items: order.items.map(i => `${i.qty} × ${i.label}${i.optLabel ? " (" + i.optLabel + ")" : ""} — ${i.gameName}`).join(" | "),
      Account: order.fields.map(f => `${f.label}: ${f.value}`).join(" | "),
      Total: `$${order.total} → ${amt} ${m.symbol} (${m.network})`,
      Status: "Awaiting payment",
    });

    if (co.fromCart) { cart = []; saveCart(); }
    try { sessionStorage.removeItem("nx_checkout"); } catch {}
    location.href = `order.html?id=${id}`;
  } catch (err) {
    console.error(err);
    coError("Couldn't place the order — please try again.");
    btn.disabled = false; btn.textContent = "Place order";
  }
});

/* default to an available method */
if (!walletReady(payMethod)) payMethod = Object.keys(PAY_METHODS).find(walletReady) || payMethod;
window.pageRender = renderCheckout;
renderCheckout();
if (payMethod === "ltc") loadLtc();
