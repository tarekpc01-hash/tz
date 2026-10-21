/* ================= NILORIX — shared UI (كل الصفحات) =================
   الألعاب والأسعار في data.js — الإعدادات (Firebase / المحافظ / الإيميل) في config.js
   ===================================================================== */

/* ---------- State ---------- */
let currency = store("nx_currency", "USD");
let cart     = store("nx_cart2", []);     // [{gid, p, qty, opt}]
let recent   = store("nx_recent", []);    // [gameId, ...]
let remoteReviews = [];                   // from database (public)
let remoteSales   = {};                   // {gameId: completed orders} from database

function fmt(usd) {
  const v = usd * rates[currency];
  return symbols[currency] + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function totalSold(g) { return (g.sold || 0) + (remoteSales[g.id] || 0); }
function soldLabel(n) { return n >= 1000 ? (n / 1000).toFixed(1).replace(".0", "") + "k" : n; }

/* Reviews = تقييمات العملاء من قاعدة البيانات + اللي مكتوبة في data.js */
function reviewsOf(g) {
  return [...remoteReviews.filter(r => (r.gids || []).includes(g.id)), ...(g.reviews || [])];
}
/* نص الريفيو — الريفيو التلقائي (العميل مكتبش حاجة خلال 3 أيام) بيتعلّم بوضوح */
function revText(r) {
  return r.auto
    ? `<p class="rev-auto">⏱ Automatic review — the buyer didn't leave feedback within ${AUTO_COMPLETE_DAYS} days.</p>`
    : `<p>${esc(r.text)}</p>`;
}
function avgStars(list) { return list.length ? list.reduce((s, r) => s + r.stars, 0) / list.length : 0; }
/* إحصائيات الاستور كله */
function storeStats() {
  const all = [...remoteReviews, ...games.flatMap(g => g.reviews || [])];
  return {
    orders: (remoteSales._orders || 0) + games.reduce((s, x) => s + (x.sold || 0), 0),   // أوردرات حقيقية اتسلّمت
    count: all.length,
    avg: avgStars(all),
    positive: all.length ? Math.round(all.filter(r => r.stars >= 4).length / all.length * 100) : null,
  };
}
function starsHtml(n) {
  const full = Math.round(n);
  return `<span class="stars">${"★".repeat(full)}<span class="off">${"★".repeat(5 - full)}</span></span>`;
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2600);
}
/* صورة اللعبة — ولو الصورة مش موجودة يرجع لأول حرف تلقائياً */
function gameImg(g, phClass = "") {
  return g.img
    ? `<img src="${asset(g.img)}" alt="${esc(g.name)}" data-l="${letter(g)}" data-ph="${phClass}" onerror="nxImgFail(this)">`
    : `<span class="${phClass}">${letter(g)}</span>`;
}
function nxImgFail(el) {
  const s = document.createElement("span");
  if (el.dataset.ph) s.className = el.dataset.ph;
  s.textContent = el.dataset.l;
  el.replaceWith(s);
}
function tile(g, cls = "mini-tile") {
  return `<span class="${cls}" style="--g:${g.g}">${gameImg(g)}</span>`;
}
const arrowSvg = `<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>`;
function statusPill(s) {
  const st = ORDER_STATUS[s] || { label: s, cls: "" };
  return `<span class="status ${st.cls}">${st.label}</span>`;
}

/* ---------- Dropdown menus + footer links ---------- */
function renderMenus() {
  ["currency", "topup"].forEach(type => {
    const list = games.filter(g => g.type === type);
    $(`[data-menu="${type}"]`).innerHTML =
      `<div class="dd-title">${TYPE_LABEL[type]}</div>` +
      list.map(g => `
        <a class="dd-item" href="${gameUrl(g)}">
          ${tile(g)}
          <span><strong>${g.name}</strong><small>From ${fmt(minPrice(g))}</small></span>
        </a>`).join("");

    const footer = $(`#footer${type === "currency" ? "Currency" : "Topup"}`);
    if (footer) footer.innerHTML = list.map(g => `<a href="${gameUrl(g)}">${g.name}</a>`).join("");
  });
}

/* ---------- Cart ---------- */
function saveCart() { save("nx_cart2", cart); renderCart(); }

function addToCart(gid, p, qty = 1, opt = null, amt = null) {
  const item = cart.find(i => i.gid === gid && i.p === p && (i.opt ?? null) === opt && (i.amt ?? null) === amt);
  item ? item.qty += qty : cart.push({ gid, p, qty, opt, amt });
  saveCart();
  toast(`✅ ${qty > 1 ? qty + " × " : ""}${pkgLabel(byId(gid), pkgFor(byId(gid), p, amt))} added to cart`);
}

function renderCart() {
  cart = cart.filter(i => pkgFor(byId(i.gid), i.p, i.amt));
  const count = cart.reduce((s, i) => s + i.qty, 0);
  $("#cartCount").textContent = count;
  $("#cartCount").hidden = count === 0;

  if (!cart.length) {
    $("#cartItems").innerHTML = `<p class="cart-empty">Your cart is empty 🛒</p>`;
    $("#cartTotal").textContent = fmt(0);
    return;
  }
  let total = 0;
  $("#cartItems").innerHTML = cart.map((i, idx) => {
    const g = byId(i.gid), pk = pkgFor(g, i.p, i.amt), label = pkgLabel(g, pk), price = pk.price, op = optLabel(g, i.opt);
    total += price * i.qty;
    return `
      <div class="cart-item">
        ${tile(g)}
        <div class="cart-info">
          <strong>${label}</strong>
          <span class="game-meta">${g.name}${op ? " · " + op : ""} · ${fmt(price)}</span>
          <div class="qty">
            <button data-act="dec" data-idx="${idx}">−</button>
            <span>${i.qty}</span>
            <button data-act="inc" data-idx="${idx}">+</button>
          </div>
        </div>
        <button class="remove" data-act="del" data-idx="${idx}" aria-label="Remove">🗑</button>
      </div>`;
  }).join("");
  $("#cartTotal").textContent = fmt(total);
}

$("#cartItems").addEventListener("click", e => {
  const b = e.target.closest("button[data-act]");
  if (!b) return;
  const i = cart[+b.dataset.idx];
  if (b.dataset.act === "inc") i.qty++;
  if (b.dataset.act === "dec") i.qty--;
  if (b.dataset.act === "del" || i.qty <= 0) cart.splice(+b.dataset.idx, 1);
  saveCart();
});

function openCart()  { $("#cart").classList.add("open");  $("#overlay").classList.add("show"); }
function closeCart() { $("#cart").classList.remove("open"); $("#overlay").classList.remove("show"); }
$("#cartBtn").addEventListener("click", openCart);
$("#closeCart").addEventListener("click", closeCart);
$("#overlay").addEventListener("click", closeCart);

/* ---------- go to checkout (Pay / cart Checkout) ---------- */
function goCheckout(items, fromCart = false) {
  try { sessionStorage.setItem("nx_checkout", JSON.stringify({ items, fromCart })); } catch {}
  location.href = "checkout.html";
}
$("#checkoutBtn").addEventListener("click", () => {
  if (!cart.length) return toast("Your cart is empty");
  goCheckout(cart.map(i => ({ gid: i.gid, p: i.p, qty: i.qty, opt: i.opt ?? null, amt: i.amt ?? null })), true);
});

/* ---------- Search ---------- */
const searchInput = $("#searchInput");
const searchBox = $("#searchResults");

/* empty search box → Recently viewed on top, then Most popular (by orders) */
const searchRow = (g, sub) => `
  <a class="dd-item" href="${gameUrl(g)}">
    ${tile(g)}
    <span><strong>${g.name}</strong><small>${sub}</small></span>
  </a>`;
function showSuggestions() {
  const rec = store("nx_recent", []).map(byId).filter(Boolean).slice(0, 4);
  const popular = [...games].filter(g => !rec.includes(g)).sort((a, b) => totalSold(b) - totalSold(a));
  searchBox.innerHTML =
    (rec.length ? `<div class="dd-title">🕒 Recently viewed</div>` + rec.map(g => searchRow(g, `${TYPE_LABEL[g.type]} · From ${fmt(minPrice(g))}`)).join("") : "") +
    `<div class="dd-title">🔥 Most popular</div>` +
    popular.map(g => searchRow(g, `${TYPE_LABEL[g.type]} · From ${fmt(minPrice(g))}`)).join("");
  searchBox.classList.add("show");
}
searchInput.addEventListener("focus", () => { if (!searchInput.value.trim()) showSuggestions(); });
searchInput.addEventListener("click", () => { if (!searchInput.value.trim()) showSuggestions(); });

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return showSuggestions();
  const hits = games.filter(g => (g.name + " " + g.desc + " " + TYPE_LABEL[g.type]).toLowerCase().includes(q));
  searchBox.innerHTML = hits.length
    ? hits.map(g => `
        <a class="dd-item" href="${gameUrl(g)}">
          ${tile(g)}
          <span><strong>${g.name}</strong><small>${TYPE_LABEL[g.type]} · From ${fmt(minPrice(g))}</small></span>
        </a>`).join("")
    : `<p class="search-empty">No results for "${esc(searchInput.value)}"</p>`;
  searchBox.classList.add("show");
});
searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") { const first = searchBox.querySelector("a.dd-item"); if (first) location.href = first.href; }
});
function closeSearch() { searchBox.classList.remove("show"); }

/* ---------- Dropdown open/close (click for touch) ---------- */
function closeAllMenus() { $$(".dd").forEach(d => d.classList.remove("open")); }
document.addEventListener("click", e => {
  const ddBtn = e.target.closest(".dd-btn");
  if (ddBtn) {
    const dd = ddBtn.parentElement;
    const wasOpen = dd.classList.contains("open");
    closeAllMenus();
    if (!wasOpen) dd.classList.add("open");
    return;
  }
  if (!e.target.closest(".dd")) closeAllMenus();
  if (!e.target.closest(".search")) closeSearch();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeCart(); closeAllMenus(); closeSearch(); }
});

/* ---------- Currency select ---------- */
const currencySel = $("#currency");
currencySel.value = currency;
currencySel.addEventListener("change", e => {
  currency = e.target.value;
  save("nx_currency", currency);
  renderMenus();
  renderCart();
  renderBell();
  if (window.pageRender) window.pageRender();
});

/* ---------- Mobile menu ---------- */
$("#menuBtn").addEventListener("click", () => $("#nav").classList.toggle("open"));

$("#year").textContent = new Date().getFullYear();

/* =========================================================
   🔐 Sign in / Create account (modal)
   ========================================================= */
const loginModal = document.createElement("div");
loginModal.className = "modal";
loginModal.id = "loginModal";
loginModal.innerHTML = `
  <div class="modal-box login-box" role="dialog" aria-modal="true">
    <button class="icon-btn modal-close" id="lgClose" aria-label="Close">✕</button>
    <img src="${typeof LOGO_SRC !== 'undefined' ? LOGO_SRC : 'images/logo.png'}" alt="" class="lg-logo">
    <h3 id="lgTitle">Sign in</h3>
    <p class="lg-sub" id="lgSub">Sign in to place orders and chat with us.</p>
    <div class="lg-tabs">
      <button type="button" class="lg-tab" data-mode="in">Sign in</button>
      <button type="button" class="lg-tab" data-mode="up">Create account</button>
    </div>
    <form id="lgForm">
      <label id="lgNameRow">Name<input type="text" id="lgName" maxlength="30" placeholder="Your name"></label>
      <label>Email<input type="email" id="lgEmail" maxlength="80" placeholder="you@example.com" required></label>
      <label id="lgPassRow">Password<input type="password" id="lgPass" minlength="6" placeholder="At least 6 characters"></label>
      <p class="lg-err" id="lgErr" hidden></p>
      <button class="btn btn-primary btn-block" type="submit" id="lgSubmit">Sign in</button>
      <button class="link-btn lg-forgot" type="button" id="lgForgot">Forgot password?</button>
    </form>
    <div class="lg-or"><span>or</span></div>
    <button class="btn btn-ghost btn-block lg-google" type="button" id="lgGoogle">
      <svg viewBox="0 0 48 48" style="stroke:none"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
      Continue with Google
    </button>
  </div>`;
document.body.appendChild(loginModal);

let lgMode = "in";
let loginWaiters = [];
function setLoginMode(m) {
  lgMode = m;
  $$(".lg-tab").forEach(t => t.classList.toggle("active", t.dataset.mode === m));
  $("#lgTitle").textContent = m === "up" ? "Create account" : m === "reset" ? "Reset password" : "Sign in";
  $("#lgNameRow").hidden = m !== "up";
  $("#lgPassRow").hidden = m === "reset";
  $("#lgPass").required = m !== "reset";
  $("#lgSubmit").textContent = m === "up" ? "Create account" : m === "reset" ? "Send reset link" : "Sign in";
  $("#lgForgot").textContent = m === "reset" ? "Back to sign in" : "Forgot password?";
  $("#lgForgot").hidden = m === "up";
  $("#lgErr").hidden = true;
}
function openLogin(mode = "in", sub) {
  if (!NX.enabled) return toast("Store setup isn't finished yet (config.js).");
  setLoginMode(mode);
  $("#lgSub").textContent = sub || "Sign in to place orders and chat with us.";
  loginModal.classList.add("show");
  document.body.classList.add("lock");
  setTimeout(() => $(mode === "up" ? "#lgName" : "#lgEmail").focus(), 50);
}
function closeLogin() { loginModal.classList.remove("show"); document.body.classList.remove("lock"); }
/* resolves when the user is signed in (opens the modal if needed) */
function requireLogin(sub) {
  return new Promise(resolve => {
    if (NX.user) return resolve(NX.user);
    loginWaiters.push(resolve);
    openLogin("in", sub);
  });
}
function lgError(e) { $("#lgErr").textContent = typeof e === "string" ? e : NX.errText(e); $("#lgErr").hidden = false; }

$$(".lg-tab").forEach(t => t.addEventListener("click", () => setLoginMode(t.dataset.mode)));
$("#lgForgot").addEventListener("click", () => setLoginMode(lgMode === "reset" ? "in" : "reset"));
$("#lgClose").addEventListener("click", closeLogin);
loginModal.addEventListener("click", e => { if (e.target === loginModal) closeLogin(); });
$("#lgForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("#lgEmail").value.trim(), pass = $("#lgPass").value, name = $("#lgName").value.trim();
  const btn = $("#lgSubmit"); btn.disabled = true;
  try {
    if (lgMode === "up") {
      if (!name) { lgError("Please enter your name."); return; }
      await NX.signUp(name, email, pass);
    } else if (lgMode === "reset") {
      await NX.resetPassword(email);
      toast("📧 Reset link sent — check your email");
      setLoginMode("in");
      return;
    } else {
      await NX.signIn(email, pass);
    }
  } catch (err) { lgError(err); }
  finally { btn.disabled = false; }
});
$("#lgGoogle").addEventListener("click", async () => {
  try { await NX.signInGoogle(); } catch (err) { lgError(err); }
});

/* =========================================================
   ⭐ Review modal — opens after the buyer confirms "Received"
   ========================================================= */
const reviewModal = document.createElement("div");
reviewModal.className = "modal";
reviewModal.id = "reviewModal";
reviewModal.innerHTML = `
  <div class="modal-box review-box" role="dialog" aria-modal="true">
    <div class="rm-ok">✓</div>
    <h3>Order received!</h3>
    <p class="rm-item" id="rmItem"></p>
    <form id="rmForm">
      <h4>Rate your order</h4>
      <div class="star-pick big" id="rmStars">
        ${[1,2,3,4,5].map(n => `<button type="button" data-s="${n}" aria-label="${n} stars">★</button>`).join("")}
      </div>
      <textarea id="rmText" maxlength="300" rows="3" placeholder="How was your order?" required></textarea>
      <button class="btn btn-primary btn-block" type="submit">Submit review</button>
      <button class="btn btn-ghost btn-block" type="button" id="rmSkip">Skip</button>
    </form>
  </div>`;
document.body.appendChild(reviewModal);

let rmStars = 5, rmOrder = null;
const paintRm = () => $$("#rmStars button").forEach(b => b.classList.toggle("on", +b.dataset.s <= rmStars));
function openReview(order) {
  rmOrder = order;
  const first = order.items[0];
  $("#rmItem").innerHTML = `<strong>${esc(first.label)}</strong>${order.items.length > 1 ? ` + ${order.items.length - 1} more` : ""} · ${esc(first.gameName)}`;
  rmStars = 5; paintRm();
  $("#rmText").value = "";
  reviewModal.classList.add("show");
  document.body.classList.add("lock");
}
function closeReview() { reviewModal.classList.remove("show"); document.body.classList.remove("lock"); rmOrder = null; }
$("#rmStars").addEventListener("click", e => {
  const b = e.target.closest("button[data-s]");
  if (b) { rmStars = +b.dataset.s; paintRm(); }
});
$("#rmSkip").addEventListener("click", closeReview);
$("#rmForm").addEventListener("submit", async e => {
  e.preventDefault();
  const text = $("#rmText").value.trim();
  if (!rmOrder || !text) return;
  try {
    await NX.addReview(rmOrder.id, {
      name: (NX.profile && NX.profile.name) || "Customer",
      photo: (NX.profile && NX.profile.photo) || "",
      stars: rmStars, text,
      item: rmOrder.items.map(i => i.label).join(", "),
      gids: [...new Set(rmOrder.items.map(i => i.gid))],
    });
    toast("⭐ Thanks for your review!");
    remoteReviews = await NX.loadReviews();
    if (window.pageRender) window.pageRender();
  } catch (err) { console.error(err); toast("Couldn't save your review — try again."); return; }
  closeReview();
});

/* =========================================================
   🔔 Bell — My orders (live from database)
   ========================================================= */
let myOrders = [];
let stopOrders = null;
const seenKey = () => "nx_bell_seen_" + (NX.user ? NX.user.uid : "guest");

/* "Clear" hides orders from the bell only (they stay in My orders).
   An order shows up again in the bell if its status changes after you cleared. */
const clearedKey = () => "nx_bell_cleared_" + (NX.user ? NX.user.uid : "guest");
const bellOrders = () => { const t = store(clearedKey(), 0); return myOrders.filter(o => (o.updatedAt || o.createdAt) > t); };

function renderBell() {
  const lastSeen = store(seenKey(), 0);
  const list = NX.user ? bellOrders() : [];
  const unseen = list.filter(o => (o.updatedAt || o.createdAt) > lastSeen).length;
  $("#bellCount").hidden = unseen === 0;
  $("#bellCount").textContent = unseen;

  let body;
  if (!NX.user) {
    body = `<div class="pop-empty">🔔<p>Sign in to see your orders</p><button class="btn btn-primary" data-bell="login" style="margin-top:12px;padding:8px 18px;font-size:13px">Sign in</button></div>`;
  } else if (!myOrders.length) {
    body = `<div class="pop-empty">🔔<p>No orders yet</p><small>Your orders and their status will show up here.</small></div>`;
  } else if (!list.length) {
    body = `<div class="pop-empty">🔔<p>You're all caught up</p><small>New order updates will show up here.</small></div>`;
  } else {
    body = list.slice(0, 15).map(o => {
      const first = o.items[0], g = byId(first.gid);
      return `
        <a class="order-row" href="order.html?id=${o.id}">
          ${g ? tile(g) : `<span class="mini-tile">#</span>`}
          <span class="or-info">
            <strong>${esc(first.label)}${o.items.length > 1 ? ` +${o.items.length - 1}` : ""}</strong>
            <small>#${shortId(o.id)} · ${timeAgo(o.createdAt)}</small>
            ${statusPill(o.status)}
          </span>
          <span class="or-total">${fmt(o.total)}</span>
        </a>`;
    }).join("");
  }
  $("#bellMenu").innerHTML = `
    <div class="pop-head"><strong>My orders</strong>
      ${list.length ? `<button class="bell-clear" data-bell="clear">Clear</button>` : ""}</div>
    <div class="pop-list">${body}</div>
    ${NX.user && myOrders.length ? `<a class="pop-foot" href="orders.html">View all orders →</a>` : ""}`;
}
function markOrdersSeen() {
  if (!NX.user) return;
  save(seenKey(), Date.now());
  $("#bellCount").hidden = true;
}
$("#bellMenu").addEventListener("click", e => {
  if (e.target.closest('[data-bell="login"]')) { e.stopPropagation(); closePops(); openLogin(); }
  if (e.target.closest('[data-bell="clear"]')) {
    e.stopPropagation();
    save(clearedKey(), Date.now());
    markOrdersSeen();
    renderBell();
    toast("🔔 Cleared — your orders are still in My orders");
  }
});

/* =========================================================
   👤 Profile circle — photo + account menu
   ========================================================= */
const personSvg = `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>`;
const prof = () => NX.profile || { name: "", email: "", photo: "" };

function avatarInner(p = prof()) {
  if (NX.user && p.photo) return `<img src="${p.photo}" alt="">`;
  if (NX.user && p.name) return `<span>${esc(p.name.charAt(0).toUpperCase())}</span>`;
  return personSvg;
}

function renderProfile() {
  const p = prof();
  $("#avatarBtn").innerHTML = avatarInner();
  if (!NX.user) {
    $("#profileMenu").innerHTML = `
      <div class="pm-head">
        <span class="avatar-btn lg">${personSvg}</span>
        <div><strong>Guest</strong><small>Sign in to place orders</small></div>
      </div>
      <button class="pm-item" data-pm="login"><span>🔐</span>Sign in</button>
      <button class="pm-item" data-pm="signup"><span>✨</span>Create account</button>
      <a class="pm-item" href="mailto:support@nilorix.com"><span>🎧</span>Support</a>`;
    return;
  }
  $("#profileMenu").innerHTML = `
    <div class="pm-head">
      <span class="avatar-btn lg">${avatarInner()}</span>
      <div>
        <strong>${esc(p.name || "My account")}</strong>
        <small>${esc(p.email || NX.user.email || "")}</small>
      </div>
    </div>
    ${NX.isAdmin() ? `<a class="pm-item" href="nilorixstoreadmmin5656.html"><span>🛠️</span>Admin panel</a>` : ""}
    <button class="pm-item" data-pm="photo"><span>📷</span>${p.photo ? "Change photo" : "Upload photo"}</button>
    <a class="pm-item" href="orders.html"><span>📦</span>My orders</a>
    <button class="pm-item" data-pm="settings"><span>⚙️</span>Account settings</button>
    <a class="pm-item" href="mailto:support@nilorix.com"><span>🎧</span>Support</a>
    <button class="pm-item pm-out" data-pm="logout"><span>↪</span>Sign out</button>`;
}

/* resize uploaded photo to a small square so it fits in the database */
function readPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) return reject();
    const img = new Image();
    img.onload = () => {
      const S = 160, cv = document.createElement("canvas");
      cv.width = cv.height = S;
      const m = Math.min(img.width, img.height);
      cv.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
      URL.revokeObjectURL(img.src);
      resolve(cv.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/* =========================================================
   🛡️ Photo safety check — blocks explicit (porn / hentai) profile photos
   Runs inside the visitor's browser with NSFWJS (open-source, MIT).
   The photo never leaves the browser for this check. The model (~6 MB) loads
   only the first time someone uploads a photo.
   ========================================================= */
const NSFW_LIBS = [
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js",
  "https://cdn.jsdelivr.net/npm/nsfwjs@4.2.1/dist/models/mobilenet_v2/model.min.js",
  "https://cdn.jsdelivr.net/npm/nsfwjs@4.2.1/dist/models/mobilenet_v2/group1-shard1of1.min.js",
  "https://cdn.jsdelivr.net/npm/nsfwjs@4.2.1/dist/browser/nsfwjs.min.js",
];
let nsfwModel = null;
function loadScript(src) {
  return new Promise((res, rej) => {
    if ([...document.scripts].some(s => s.src === src)) return res();
    const s = document.createElement("script");
    s.src = src; s.async = false; s.crossOrigin = "anonymous";
    s.onload = res; s.onerror = () => rej(new Error("load " + src));
    document.head.appendChild(s);
  });
}
async function getNsfwModel() {
  if (nsfwModel) return nsfwModel;
  for (const src of NSFW_LIBS) await loadScript(src);
  nsfwModel = await nsfwjs.load("MobileNetV2");
  return nsfwModel;
}
/* true = OK to use · false = explicit · throws if the check couldn't run */
async function photoIsSafe(dataUrl) {
  const model = await getNsfwModel();
  const img = new Image();
  await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = dataUrl; });
  const preds = await model.classify(img);
  const p = Object.fromEntries(preds.map(x => [x.className, x.probability]));
  const explicit = (p.Porn || 0) + (p.Hentai || 0);
  return !(explicit >= 0.4 || (p.Sexy || 0) >= 0.7);
}
async function checkedPhoto(file) {
  const data = await readPhoto(file);          // resize first (also rejects non-images)
  toast("🛡️ Checking photo…");
  let ok;
  try { ok = await photoIsSafe(data); }
  catch (err) { console.error(err); toast("Couldn't check this photo — please try again in a moment."); return null; }
  if (!ok) { toast("🚫 This photo isn't allowed. Please choose another one."); return null; }
  return data;
}

let photoTarget = "profile";   // "profile" or "settings"
let draftPhoto = "";

$("#photoInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  e.target.value = "";
  try {
    const data = await checkedPhoto(file);
    if (!data) return;
    if (photoTarget === "settings") { draftPhoto = data; paintSettingsPhoto(); }
    else { await NX.saveProfile({ photo: data }); toast("📷 Photo updated"); }
  } catch { toast("Please choose an image file"); }
});

/* ---------- Account settings modal ---------- */
const settingsModal = document.createElement("div");
settingsModal.className = "modal";
settingsModal.id = "settingsModal";
settingsModal.innerHTML = `
  <div class="modal-box settings-box" role="dialog" aria-modal="true">
    <button class="icon-btn modal-close" id="setClose" aria-label="Close">✕</button>
    <h3>Account settings</h3>
    <form id="setForm">
      <div class="set-photo">
        <span class="avatar-btn xl" id="setAvatar"></span>
        <div class="set-photo-btns">
          <button type="button" class="btn btn-ghost" id="setUpload">Upload photo</button>
          <button type="button" class="link-btn" id="setRemove">Remove</button>
        </div>
      </div>
      <label>Name<input type="text" id="setName" maxlength="30" placeholder="Your name"></label>
      <label>Email<input type="email" id="setEmail" disabled></label>
      <button class="btn btn-primary btn-block" type="submit">Save changes</button>
      <button class="link-btn" type="button" id="setReset" style="justify-self:center">Change password</button>
    </form>
  </div>`;
document.body.appendChild(settingsModal);

function paintSettingsPhoto() {
  const name = $("#setName").value.trim();
  $("#setAvatar").innerHTML = draftPhoto ? `<img src="${draftPhoto}" alt="">`
    : name ? `<span>${esc(name.charAt(0).toUpperCase())}</span>` : personSvg;
  $("#setRemove").hidden = !draftPhoto;
}
function openSettings() {
  const p = prof();
  draftPhoto = p.photo || "";
  $("#setName").value = p.name || "";
  $("#setEmail").value = p.email || (NX.user && NX.user.email) || "";
  paintSettingsPhoto();
  settingsModal.classList.add("show");
  document.body.classList.add("lock");
}
function closeSettings() { settingsModal.classList.remove("show"); document.body.classList.remove("lock"); }
$("#setUpload").addEventListener("click", () => { photoTarget = "settings"; $("#photoInput").click(); });
$("#setRemove").addEventListener("click", () => { draftPhoto = ""; paintSettingsPhoto(); });
$("#setName").addEventListener("input", paintSettingsPhoto);
$("#setClose").addEventListener("click", closeSettings);
$("#setReset").addEventListener("click", async () => {
  try { await NX.resetPassword(NX.user.email); toast("📧 Password reset link sent to your email"); }
  catch (err) { toast(NX.errText(err)); }
});
settingsModal.addEventListener("click", e => { if (e.target === settingsModal) closeSettings(); });
$("#setForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await NX.saveProfile({ name: $("#setName").value.trim(), photo: draftPhoto });
    closeSettings();
    toast("✅ Profile saved");
  } catch (err) { toast("Couldn't save — try again."); }
});

/* ---------- open / close the two header popups ---------- */
function closePops() { $$(".hd-pop").forEach(p => p.classList.remove("open")); }
function togglePop(id) {
  const el = $(id), was = el.classList.contains("open");
  closePops(); closeAllMenus(); closeSearch();
  if (!was) el.classList.add("open");
  return !was;
}
$("#bellBtn").addEventListener("click", e => {
  e.stopPropagation();
  renderBell();
  if (togglePop("#bellWrap")) markOrdersSeen();
});
$("#avatarBtn").addEventListener("click", e => { e.stopPropagation(); togglePop("#profileWrap"); });
$("#profileMenu").addEventListener("click", async e => {
  const b = e.target.closest("[data-pm]");
  if (!b) return;
  e.stopPropagation();
  closePops();
  const a = b.dataset.pm;
  if (a === "login")    openLogin("in");
  if (a === "signup")   openLogin("up");
  if (a === "photo")    { photoTarget = "profile"; $("#photoInput").click(); }
  if (a === "settings") openSettings();
  if (a === "logout")   { await NX.signOut(); toast("Signed out"); }
});
document.addEventListener("click", e => { if (!e.target.closest(".hd-pop")) closePops(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") { closePops(); closeSettings(); closeLogin(); } });

/* =========================================================
   💬 Support chat widget (bottom-right) — like eldorado.gg
   ========================================================= */
const SUPPORT_REASONS = [
  { id: "order",   icon: "📦", label: "Problem with an order" },
  { id: "payment", icon: "💳", label: "Payment question" },
  { id: "product", icon: "🎮", label: "Question about a product" },
  { id: "account", icon: "👤", label: "Account & sign in" },
  { id: "other",   icon: "💬", label: "Something else" },
];
const sw = document.createElement("div");
sw.className = "sw";
sw.innerHTML = `
  <button class="sw-fab" id="swFab" aria-label="Chat with support">
    <svg class="sw-ic-chat" viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>
    <svg class="sw-ic-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
    <span class="sw-badge" id="swBadge" hidden></span>
  </button>
  <div class="sw-panel" id="swPanel" role="dialog" aria-label="Support chat">
    <div class="sw-head">
      <button class="sw-back" id="swBack" aria-label="Back" hidden><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
      <img src="${typeof LOGO_SRC !== 'undefined' ? LOGO_SRC : 'images/logo.png'}" alt="" class="sw-logo">
      <div><strong>Nilorix Support</strong><small><span class="sw-dot"></span>We usually reply in a few minutes</small></div>
    </div>
    <div class="sw-body" id="swBody"></div>
  </div>`;
document.body.appendChild(sw);

let swView = "home", swTicket = null, swReason = null, swMsgs = [], swStopMsgs = null, myTickets = [], swStopTickets = null;
const swSeenKey = () => "nx_sw_seen_" + (NX.user ? NX.user.uid : "guest");
const swUnread = () => myTickets.filter(t => t.lastFrom === "admin" && t.updatedAt > store(swSeenKey(), 0));
const reasonOf = (id) => SUPPORT_REASONS.find(r => r.id === id) || { icon: "💬", label: id };

function swOpen(open) {
  sw.classList.toggle("open", open);
  if (open) { closePops(); renderSw(); }
}
function swGo(view, data) {
  if (swStopMsgs) { swStopMsgs(); swStopMsgs = null; }
  swView = view;
  if (view === "ticket") {
    swTicket = data; swMsgs = [];
    swStopMsgs = NX.watchTicketMessages(data, list => { swMsgs = list; if (swView === "ticket") renderSw(); });
  }
  if (view === "compose") swReason = data;
  renderSw();
}

function renderSw() {
  const body = $("#swBody");
  $("#swBack").hidden = swView === "home";
  const name = (NX.profile && NX.profile.name) ? NX.profile.name.split(" ")[0] : "";

  if (swView === "home") {
    const open = myTickets.slice(0, 4);
    body.innerHTML = `
      <div class="sw-hello"><h4>Hi${name ? " " + esc(name) : ""} 👋</h4><p>How can we help you today?</p></div>
      ${open.length ? `
        <div class="sw-label">Your conversations</div>
        ${open.map(t => `
          <button class="sw-conv" data-ticket="${t.id}">
            <span class="sw-conv-ic">${reasonOf(t.reason).icon}</span>
            <span class="sw-conv-txt"><strong>${esc(reasonOf(t.reason).label)}</strong><small>${t.lastFrom === "admin" ? "Nilorix: " : "You: "}${esc(t.lastText || "")}</small></span>
            ${t.lastFrom === "admin" && t.updatedAt > store(swSeenKey(), 0) ? `<span class="sw-new"></span>` : `<small class="sw-time">${timeAgo(t.updatedAt)}</small>`}
          </button>`).join("")}` : ""}
      <div class="sw-label">Choose a topic</div>
      ${SUPPORT_REASONS.map(r => `<button class="sw-reason" data-reason="${r.id}"><span>${r.icon}</span>${r.label}<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>`).join("")}
      ${!NX.user ? `<p class="sw-note">You'll need to sign in so we can reply to you.</p>` : ""}`;
    return;
  }

  if (swView === "orders") {
    body.innerHTML = `
      <div class="sw-label">Which order?</div>
      ${myOrders.slice(0, 8).map(o => {
        const first = o.items[0], g = byId(first.gid);
        return `<a class="sw-conv" href="order.html?id=${o.id}#chat">
          ${g ? tile(g) : `<span class="mini-tile">#</span>`}
          <span class="sw-conv-txt"><strong>${esc(first.label)}</strong><small>#${shortId(o.id)} · ${(ORDER_STATUS[o.status] || {}).label || o.status}</small></span>
          <svg viewBox="0 0 24 24" class="sw-chev"><path d="M9 6l6 6-6 6"/></svg></a>`;
      }).join("") || `<p class="sw-note">You don't have any orders yet.</p>`}
      <p class="sw-note">Each order has its own chat — pick the order to talk to us about it.</p>
      <button class="sw-reason" data-compose="order"><span>✍️</span>My order isn't listed<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>`;
    return;
  }

  if (swView === "compose") {
    const r = reasonOf(swReason);
    body.innerHTML = `
      <div class="sw-topic">${r.icon} ${esc(r.label)}</div>
      <form class="sw-compose" id="swCompose">
        <textarea id="swText" maxlength="1000" rows="5" placeholder="Tell us how we can help…" required></textarea>
        <button class="btn btn-primary btn-block" type="submit">Send message</button>
      </form>`;
    setTimeout(() => $("#swText") && $("#swText").focus(), 30);
    return;
  }

  if (swView === "ticket") {
    const t = myTickets.find(x => x.id === swTicket) || {};
    const keep = $("#swInput") ? $("#swInput").value : "";
    body.innerHTML = `
      <div class="sw-topic">${reasonOf(t.reason).icon} ${esc(reasonOf(t.reason).label)}${t.status === "closed" ? ` <span class="sw-closed">Closed</span>` : ""}</div>
      <div class="sw-msgs" id="swMsgs">
        ${swMsgs.map(m => `
          <div class="msg ${m.from === "buyer" ? "mine" : "theirs"}">
            ${m.from === "admin" ? `<img src="${typeof LOGO_SRC !== 'undefined' ? LOGO_SRC : 'images/logo.png'}" alt="" class="msg-av">` : ""}
            <div class="bubble"><p>${esc(m.text)}</p><small>${m.from === "admin" ? "Nilorix · " : ""}${timeAgo(m.createdAt)}</small></div>
          </div>`).join("")}
        ${swMsgs.length && swMsgs[swMsgs.length - 1].from === "buyer" ? `<p class="sw-note">Thanks! We'll reply here soon — we'll also see it if you close this window.</p>` : ""}
      </div>
      <form class="chat-form sw-reply" id="swReply">
        <input type="text" id="swInput" maxlength="1000" placeholder="Write a message…" autocomplete="off">
        <button class="btn btn-primary" type="submit">Send</button>
      </form>`;
    if (keep) $("#swInput").value = keep;
    const box = $("#swMsgs"); box.scrollTop = box.scrollHeight;
    // mark as read
    save(swSeenKey(), Date.now()); renderSwBadge();
  }
}
function renderSwBadge() {
  const n = NX.user ? swUnread().length : 0;
  $("#swBadge").hidden = n === 0;
  $("#swBadge").textContent = n;
}

$("#swFab").addEventListener("click", e => { e.stopPropagation(); swOpen(!sw.classList.contains("open")); });
$("#swBack").addEventListener("click", () => swGo(swView === "compose" && swReason === "order" && myOrders.length ? "orders" : "home"));
sw.addEventListener("click", async e => {
  e.stopPropagation();
  const conv = e.target.closest("[data-ticket]");
  if (conv) return swGo("ticket", conv.dataset.ticket);
  const r = e.target.closest("[data-reason]");
  const c = e.target.closest("[data-compose]");
  if (r || c) {
    const reason = r ? r.dataset.reason : c.dataset.compose;
    if (!NX.enabled) return toast("Support chat isn't connected yet.");
    if (!NX.user) { await requireLogin("Sign in so we can reply to your message."); swOpen(true); }
    if (reason === "order" && r && myOrders.length) return swGo("orders");
    return swGo("compose", reason);
  }
});
sw.addEventListener("submit", async e => {
  e.preventDefault();
  if (e.target.id === "swCompose") {
    const text = $("#swText").value.trim();
    if (!text) return;
    const btn = e.target.querySelector("button"); btn.disabled = true; btn.textContent = "Sending…";
    try {
      const id = await NX.createTicket(swReason, text);
      NX.notifyOwner(`💬 New support message — ${reasonOf(swReason).label}`, {
        Topic: reasonOf(swReason).label, From: `${(NX.profile && NX.profile.name) || ""} <${NX.user.email}>`, Message: text,
      });
      save("nx_swmail_" + id, Date.now());
      swGo("ticket", id);
    } catch (err) { console.error(err); toast("Couldn't send — try again."); btn.disabled = false; btn.textContent = "Send message"; }
  }
  if (e.target.id === "swReply") {
    const inp = $("#swInput"), text = inp.value.trim();
    if (!text || !swTicket) return;
    inp.value = "";
    try {
      await NX.sendTicketMessage(swTicket, text, "buyer");
      const k = "nx_swmail_" + swTicket;
      if (Date.now() - store(k, 0) > 10 * 60000) {
        save(k, Date.now());
        const t = myTickets.find(x => x.id === swTicket) || {};
        NX.notifyOwner(`💬 Support reply — ${reasonOf(t.reason).label}`, { From: NX.user.email, Message: text });
      }
    } catch (err) { console.error(err); toast("Message not sent — try again."); inp.value = text; }
  }
});
document.addEventListener("click", e => { if (!e.target.closest(".sw") && !e.target.closest(".modal")) sw.classList.remove("open"); });
document.addEventListener("keydown", e => { if (e.key === "Escape") sw.classList.remove("open"); });

/* =========================================================
   Start
   ========================================================= */
NX.onAuth(user => {
  if (user) {
    closeLogin();
    loginWaiters.splice(0).forEach(fn => fn(user));
  }
  if (stopOrders) { stopOrders(); stopOrders = null; }
  myOrders = [];
  if (user) stopOrders = NX.watchMyOrders(list => { myOrders = list; renderBell(); if (swView === "orders") renderSw(); });
  if (swStopTickets) { swStopTickets(); swStopTickets = null; }
  myTickets = [];
  if (user) swStopTickets = NX.watchMyTickets(list => {
    myTickets = list; renderSwBadge();
    if (sw.classList.contains("open") && swView !== "compose") renderSw();
  });
  if (!user && swView !== "home") swGo("home");
  renderSwBadge();
  renderProfile();
  renderBell();
  if (window.onAuthChange) window.onAuthChange(user);
});

/* أسعار لوحة التحكم — الصفحة بتتحدّث أول ما توصل، والدفع بيستناها */
window.pricesReady = NX.enabled
  ? NX.loadPrices().then(p => { applyPrices(p); renderMenus(); renderCart(); if (window.pageRender) window.pageRender(); })
  : Promise.resolve();

if (NX.enabled) {
  Promise.all([NX.loadReviews(), NX.loadSales()]).then(([r, s]) => {
    remoteReviews = r; remoteSales = s;
    if (window.pageRender) window.pageRender();
  });
}

renderMenus();
renderCart();
renderBell();
renderProfile();
