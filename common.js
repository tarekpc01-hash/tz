/* ================= NILORIX — shared (كل الصفحات) ================= */

/* =========================================================
   الألعاب — عدّل من هنا بس
   type    : "currency" أو "topup"  (يحدد هي في أنهي ليستة)
   unit    : اسم العملة اللي بتظهر في كروت الكمية (V-Bucks, Robux...)
   sold    : عدد الأوردرات — حط الرقم الحقيقي (الأكثر مبيعاً بيترتب على حسبه)
   img     : صورة اللعبة (اختياري) مثلاً "images/games/robux.png"
   packages: كل باقة = { amount: الكمية, price: السعر بالدولار,
                         old: السعر الأصلي قبل الخصم (اختياري),
                         badge: "popular" أو "best" (اختياري),
                         label: اسم بدل الكمية (اختياري، زي Welkin Moon) }
   reviews : تقييمات حقيقية من عملائك، مثال:
             { name: "Ahmed", stars: 5, text: "Fast delivery!", item: "800 V-Bucks", date: "2026-10-20" }
   ========================================================= */
const games = [
  /* ---------- Currency ---------- */
  { id: "ps99", type: "currency", name: "Pet Simulator 99", desc: "Diamonds", unit: "Diamonds",
    g: "linear-gradient(150deg,#22c55e,#0e7490)", sold: 860, img: "", reviews: [],
    about: "Buy Pet Simulator 99 Diamonds safely and get them delivered to your Roblox account fast.",
    packages: [
      { amount: 10000000,  price: 2.99 },
      { amount: 50000000,  price: 9.99, badge: "popular" },
      { amount: 100000000, price: 17.99 },
      { amount: 250000000, price: 39.99, badge: "best" },
    ] },

  { id: "bladeball", type: "currency", name: "Blade Ball Tokens", desc: "Tokens", unit: "Tokens",
    g: "linear-gradient(150deg,#f43f5e,#3b0764)", sold: 640, img: "", reviews: [],
    about: "Get Blade Ball Tokens to unlock swords, abilities and explosions.",
    packages: [
      { amount: 10000,  price: 1.99 },
      { amount: 50000,  price: 7.99, badge: "popular" },
      { amount: 100000, price: 14.99 },
      { amount: 250000, price: 32.99, badge: "best" },
    ] },

  { id: "robux", type: "currency", name: "Roblox Robux", desc: "Robux", unit: "Robux",
    g: "linear-gradient(150deg,#64748b,#0f172a)", sold: 1520, img: "", reviews: [],
    about: "Top up Robux for your Roblox account and spend them in any experience.",
    packages: [
      { amount: 400,  price: 4.99 },
      { amount: 800,  price: 9.99, badge: "popular" },
      { amount: 1700, price: 19.99 },
      { amount: 4500, price: 49.99, badge: "best" },
    ] },

  /* ---------- Top Up ---------- */
  { id: "fortnite", type: "topup", name: "Fortnite", desc: "V-Bucks", unit: "V-Bucks",
    g: "linear-gradient(150deg,#ffb020,#ea580c)", sold: 1380, img: "", reviews: [],
    about: "Top up V-Bucks for skins, emotes and the Battle Pass.",
    packages: [
      { amount: 800,    price: 3.50,   old: 8.99 },
      { amount: 2400,   price: 9.96,   old: 22.99 },
      { amount: 4500,   price: 14.84,  old: 36.99, badge: "popular" },
      { amount: 9000,   price: 25.00,  old: 73.98 },
      { amount: 12500,  price: 31.99,  old: 89.99 },
      { amount: 25000,  price: 64.00,  old: 179.98 },
      { amount: 50000,  price: 124.99, old: 359.96 },
      { amount: 62500,  price: 155.00, old: 449.95 },
      { amount: 125000, price: 308.00, old: 899.90, badge: "best" },
    ] },

  { id: "apex", type: "topup", name: "Apex Legends", desc: "Apex Coins", unit: "Apex Coins",
    g: "linear-gradient(150deg,#dc2626,#450a0a)", sold: 540, img: "", reviews: [],
    about: "Get Apex Coins for legends, skins and the Battle Pass.",
    packages: [
      { amount: 1000,  price: 9.99 },
      { amount: 2150,  price: 19.99, badge: "popular" },
      { amount: 4350,  price: 39.99 },
      { amount: 11500, price: 99.99, badge: "best" },
    ] },

  { id: "eafc", type: "topup", name: "EA Sports FC Points", desc: "FC Points", unit: "FC Points",
    g: "linear-gradient(150deg,#10b981,#0c4a6e)", sold: 910, img: "", reviews: [],
    about: "Top up FC Points for Ultimate Team packs and more.",
    packages: [
      { amount: 500,  price: 4.99 },
      { amount: 1050, price: 9.99 },
      { amount: 2800, price: 24.99, badge: "popular" },
      { amount: 5900, price: 49.99, badge: "best" },
    ] },

  { id: "pokemongo", type: "topup", name: "Pokémon GO Top Up", desc: "PokéCoins", unit: "PokéCoins",
    g: "linear-gradient(150deg,#eab308,#1d4ed8)", sold: 470, img: "", reviews: [],
    about: "Get PokéCoins for items, storage upgrades and raid passes.",
    packages: [
      { amount: 550,  price: 4.99 },
      { amount: 1200, price: 9.99, badge: "popular" },
      { amount: 2500, price: 19.99 },
      { amount: 5600, price: 39.99, badge: "best" },
    ] },

  { id: "genshin", type: "topup", name: "Genshin Impact Top Up", desc: "Genesis Crystals", unit: "Genesis Crystals",
    g: "linear-gradient(150deg,#a78bfa,#1e1b4b)", sold: 780, img: "", reviews: [],
    about: "Top up Genesis Crystals and Welkin Moon for your Genshin account.",
    packages: [
      { label: "Welkin Moon", sub: "30 days", price: 4.99, badge: "popular" },
      { amount: 980,  price: 14.99 },
      { amount: 1980, price: 29.99 },
      { amount: 3280, price: 49.99, badge: "best" },
    ] },
];

const TYPE_LABEL = { currency: "Currency", topup: "Top Up" };
const SELLER = { name: "Nilorix", logo: "images/logo.png" };
const DELIVERY_TIME = "20 minutes";   // وقت وصول الأوردر — عدّله من هنا

/* ---------- Currency conversion ---------- */
const rates   = { USD: 1, EGP: 48.5, EUR: 0.92 };   // عدّل سعر الصرف من هنا
const symbols = { USD: "$", EGP: "EGP ", EUR: "€" };

/* ---------- Helpers ---------- */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
function store(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
const byId = (id) => games.find(g => g.id === id);
const minPrice = (g) => Math.min(...g.packages.map(p => p.price));
/* اسم الباقة: "4,500 V-Bucks" أو label زي "Welkin Moon" */
const shortNum = (n) => n >= 1e6 ? (n / 1e6).toLocaleString("en-US") + "M" : n.toLocaleString("en-US");
const pkgLabel = (g, p) => p.label || `${shortNum(p.amount)} ${g.unit}`;
const letter = (g) => g.name.trim().charAt(0).toUpperCase();
const gameUrl = (g) => `game.html?id=${g.id}`;

/* ---------- State ---------- */
let currency = store("nx_currency", "USD");
let cart     = store("nx_cart2", []);     // [{gid, p, qty}]
let recent   = store("nx_recent", []);    // [gameId, ...]
let sales    = store("nx_sales", {});     // {gameId: count}

function fmt(usd) {
  const v = usd * rates[currency];
  return symbols[currency] + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function totalSold(g) { return g.sold + (sales[g.id] || 0); }
function soldLabel(n) { return n >= 1000 ? (n / 1000).toFixed(1).replace(".0", "") + "k" : n; }
function recordSale(gid, qty) { sales[gid] = (sales[gid] || 0) + qty; save("nx_sales", sales); }

/* Reviews = اللي في الداتا + اللي اتكتبت من الموقع */
function reviewsOf(g) { return [...store("nx_reviews_" + g.id, []), ...(g.reviews || [])]; }
function avgStars(list) { return list.length ? list.reduce((s, r) => s + r.stars, 0) / list.length : 0; }
/* إحصائيات الاستور كله */
function storeStats() {
  const all = games.flatMap(reviewsOf);
  return {
    orders: games.reduce((s, x) => s + totalSold(x), 0),
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
  t._h = setTimeout(() => t.classList.remove("show"), 2200);
}
function tile(g, cls = "mini-tile") {
  return `<span class="${cls}" style="--g:${g.g}">${g.img ? `<img src="${g.img}" alt="">` : letter(g)}</span>`;
}
const arrowSvg = `<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>`;

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
          <span class="arrow">${arrowSvg}</span>
        </a>`).join("");

    const footer = $(`#footer${type === "currency" ? "Currency" : "Topup"}`);
    if (footer) footer.innerHTML = list.map(g => `<a href="${gameUrl(g)}">${g.name}</a>`).join("");
  });
}

/* ---------- Cart ---------- */
function saveCart() { save("nx_cart2", cart); renderCart(); }

function addToCart(gid, p, qty = 1) {
  const item = cart.find(i => i.gid === gid && i.p === p);
  item ? item.qty += qty : cart.push({ gid, p, qty });
  saveCart();
  toast(`✅ ${qty > 1 ? qty + " × " : ""}${pkgLabel(byId(gid), byId(gid).packages[p])} added to cart`);
}

function renderCart() {
  cart = cart.filter(i => byId(i.gid) && byId(i.gid).packages[i.p]);
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
    const g = byId(i.gid), pk = g.packages[i.p], label = pkgLabel(g, pk), price = pk.price;
    total += price * i.qty;
    return `
      <div class="cart-item">
        ${tile(g)}
        <div class="cart-info">
          <strong>${label}</strong>
          <span class="game-meta">${g.name} · ${fmt(price)}</span>
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

$("#checkoutBtn").addEventListener("click", () => {
  if (!cart.length) return toast("Your cart is empty");
  // هنا تربط بوابة الدفع الخاصة بك لاحقاً — بعد ما الدفع ينجح ننفّذ الكود ده
  const orders = cart.map(i => { const pk = byId(i.gid).packages[i.p]; return { gid: i.gid, item: pkgLabel(byId(i.gid), pk), qty: i.qty, total: pk.price * i.qty }; });
  placeOrders(orders);
  cart = [];
  saveCart();
  closeCart();
});

/* ---------- Search ---------- */
const searchInput = $("#searchInput");
const searchBox = $("#searchResults");

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return closeSearch();
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
   Orders + review after each order
   كل أوردر بيطلب من العميل يقيّم، والتقييم بيظهر تحت Reviews
   ========================================================= */
const reviewModal = document.createElement("div");
reviewModal.className = "modal";
reviewModal.id = "reviewModal";
reviewModal.innerHTML = `
  <div class="modal-box review-box" role="dialog" aria-modal="true">
    <div class="rm-ok">✓</div>
    <h3>Order placed!</h3>
    <p class="rm-item" id="rmItem"></p>
    <form id="rmForm">
      <h4>Rate your order</h4>
      <div class="star-pick big" id="rmStars">
        ${[1,2,3,4,5].map(n => `<button type="button" data-s="${n}" aria-label="${n} stars">★</button>`).join("")}
      </div>
      <input type="text" id="rmName" maxlength="30" placeholder="Your name" required>
      <textarea id="rmText" maxlength="300" rows="3" placeholder="How was your order?" required></textarea>
      <button class="btn btn-primary btn-block" type="submit">Submit review</button>
      <button class="btn btn-ghost btn-block" type="button" id="rmSkip">Skip</button>
    </form>
  </div>`;
document.body.appendChild(reviewModal);

let reviewQueue = [];
let rmStars = 5;
const paintRm = () => $$("#rmStars button").forEach(b => b.classList.toggle("on", +b.dataset.s <= rmStars));

function placeOrders(orders) {
  orders.forEach(o => recordSale(o.gid, o.qty));
  // save to "My orders" (bell)
  const now = Date.now();
  const saved = store("nx_orders", []);
  orders.forEach((o, k) => saved.unshift({ id: "NX" + (now + k).toString(36).toUpperCase(), ...o, ts: now, seen: false }));
  save("nx_orders", saved.slice(0, 50));
  renderBell();
  reviewQueue = orders.slice();
  if (window.pageRender) window.pageRender();
  nextReview();
}
function nextReview() {
  const o = reviewQueue[0];
  if (!o) { reviewModal.classList.remove("show"); document.body.classList.remove("lock"); return; }
  $("#rmItem").innerHTML = `${o.qty > 1 ? o.qty + " × " : ""}<strong>${esc(o.item)}</strong> · ${byId(o.gid).name}`;
  rmStars = 5; paintRm();
  $("#rmText").value = "";
  reviewModal.classList.add("show");
  document.body.classList.add("lock");
}
$("#rmStars").addEventListener("click", e => {
  const b = e.target.closest("button[data-s]");
  if (b) { rmStars = +b.dataset.s; paintRm(); }
});
$("#rmSkip").addEventListener("click", () => { reviewQueue.shift(); nextReview(); });
$("#rmForm").addEventListener("submit", e => {
  e.preventDefault();
  const o = reviewQueue.shift();
  const name = $("#rmName").value.trim(), text = $("#rmText").value.trim();
  if (o && name && text) {
    const key = "nx_reviews_" + o.gid;
    save(key, [{ name, stars: rmStars, text, item: o.item, date: new Date().toISOString().slice(0, 10) }, ...store(key, [])]);
    toast("⭐ Thanks for your review!");
    if (window.pageRender) window.pageRender();
  }
  nextReview();
});

/* =========================================================
   🔔 Bell — My orders
   ========================================================= */
const DELIVERY_MIN = parseInt(DELIVERY_TIME) || 20;
const bellIcon = (svgPath) => svgPath;

function orderStatus(o) {
  const left = Math.ceil((o.ts + DELIVERY_MIN * 60000 - Date.now()) / 60000);
  return left > 0
    ? { cls: "processing", text: `Arriving in ~${left} min` }
    : { cls: "delivered", text: "Delivered ✓" };
}
function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toISOString().slice(0, 10);
}

function renderBell() {
  const orders = store("nx_orders", []);
  const unseen = orders.filter(o => !o.seen).length;
  $("#bellCount").hidden = unseen === 0;
  $("#bellCount").textContent = unseen;

  $("#bellMenu").innerHTML = `
    <div class="pop-head"><strong>My orders</strong>${orders.length ? `<small>${orders.length}</small>` : ""}</div>
    <div class="pop-list">
      ${orders.length ? orders.map(o => {
        const g = byId(o.gid), st = orderStatus(o);
        if (!g) return "";
        return `
          <a class="order-row" href="${gameUrl(g)}">
            ${tile(g)}
            <span class="or-info">
              <strong>${o.qty > 1 ? o.qty + " × " : ""}${esc(o.item)}</strong>
              <small>${g.name} · #${o.id} · ${timeAgo(o.ts)}</small>
              <span class="status ${st.cls}">${st.text}</span>
            </span>
            ${o.total != null ? `<span class="or-total">${fmt(o.total)}</span>` : ""}
          </a>`;
      }).join("") : `<div class="pop-empty">🔔<p>No orders yet</p><small>Your orders and their status will show up here.</small></div>`}
    </div>`;
}

function markOrdersSeen() {
  const orders = store("nx_orders", []);
  if (orders.some(o => !o.seen)) { save("nx_orders", orders.map(o => ({ ...o, seen: true }))); }
  $("#bellCount").hidden = true;
}

/* =========================================================
   👤 Profile circle — photo + account menu
   (محفوظ على جهاز المستخدم — لتسجيل دخول حقيقي محتاج سيرفر)
   ========================================================= */
let profile = store("nx_profile", { name: "", email: "", photo: "" });
const personSvg = `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>`;

function avatarInner() {
  if (profile.photo) return `<img src="${profile.photo}" alt="">`;
  if (profile.name) return `<span>${esc(profile.name.charAt(0).toUpperCase())}</span>`;
  return personSvg;
}

function renderProfile() {
  $("#avatarBtn").innerHTML = avatarInner();
  $("#profileMenu").innerHTML = `
    <div class="pm-head">
      <span class="avatar-btn lg">${avatarInner()}</span>
      <div>
        <strong>${profile.name ? esc(profile.name) : "Guest"}</strong>
        <small>${profile.email ? esc(profile.email) : "Set up your profile"}</small>
      </div>
    </div>
    <button class="pm-item" data-pm="photo"><span>📷</span>${profile.photo ? "Change photo" : "Upload photo"}</button>
    <button class="pm-item" data-pm="orders"><span>📦</span>My orders</button>
    <button class="pm-item" data-pm="settings"><span>⚙️</span>Account settings</button>
    <a class="pm-item" href="mailto:support@nilorix.com"><span>🎧</span>Support</a>`;
}

/* resize uploaded photo to a small square so it fits in storage */
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
      resolve(cv.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

let photoTarget = "profile";   // "profile" or "settings"
let draftPhoto = "";

$("#photoInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  e.target.value = "";
  try {
    const data = await readPhoto(file);
    if (photoTarget === "settings") { draftPhoto = data; paintSettingsPhoto(); }
    else { profile.photo = data; save("nx_profile", profile); renderProfile(); toast("📷 Photo updated"); }
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
      <label>Email<input type="email" id="setEmail" maxlength="60" placeholder="you@example.com"></label>
      <button class="btn btn-primary btn-block" type="submit">Save changes</button>
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
  draftPhoto = profile.photo;
  $("#setName").value = profile.name;
  $("#setEmail").value = profile.email;
  paintSettingsPhoto();
  settingsModal.classList.add("show");
  document.body.classList.add("lock");
}
function closeSettings() { settingsModal.classList.remove("show"); document.body.classList.remove("lock"); }
$("#setUpload").addEventListener("click", () => { photoTarget = "settings"; $("#photoInput").click(); });
$("#setRemove").addEventListener("click", () => { draftPhoto = ""; paintSettingsPhoto(); });
$("#setName").addEventListener("input", paintSettingsPhoto);
$("#setClose").addEventListener("click", closeSettings);
settingsModal.addEventListener("click", e => { if (e.target === settingsModal) closeSettings(); });
$("#setForm").addEventListener("submit", e => {
  e.preventDefault();
  profile = { name: $("#setName").value.trim(), email: $("#setEmail").value.trim(), photo: draftPhoto };
  save("nx_profile", profile);
  renderProfile();
  closeSettings();
  toast("✅ Profile saved");
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
$("#profileMenu").addEventListener("click", e => {
  const b = e.target.closest("[data-pm]");
  if (!b) return;
  e.stopPropagation();
  closePops();
  if (b.dataset.pm === "photo")    { photoTarget = "profile"; $("#photoInput").click(); }
  if (b.dataset.pm === "settings") openSettings();
  if (b.dataset.pm === "orders")   { renderBell(); togglePop("#bellWrap"); markOrdersSeen(); }
});
document.addEventListener("click", e => { if (!e.target.closest(".hd-pop")) closePops(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") { closePops(); closeSettings(); } });

// update "Arriving in ~X min" while the page is open
setInterval(() => { if ($("#bellWrap").classList.contains("open")) renderBell(); }, 30000);

renderMenus();
renderCart();
renderBell();
renderProfile();
