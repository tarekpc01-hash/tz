/* ================= NILORIX — script ================= */

/* ---------- Popular games ----------
   img: ضع مسار صورة اللعبة (مثلاً "images/games/fortnite.png") أو اتركها فاضية */
const games = [
  { name: "Fortnite",       short: "F",  img: "", g: "linear-gradient(160deg,#2563eb,#7c3aed)" },
  { name: "Roblox",         short: "R",  img: "", g: "linear-gradient(160deg,#334155,#0f172a)" },
  { name: "Steam",          short: "S",  img: "", g: "linear-gradient(160deg,#1e3a5f,#0b1220)" },
  { name: "PlayStation",    short: "PS", img: "", g: "linear-gradient(160deg,#1d4ed8,#1e1b4b)" },
  { name: "Xbox",           short: "X",  img: "", g: "linear-gradient(160deg,#15803d,#052e16)" },
  { name: "Nintendo",       short: "N",  img: "", g: "linear-gradient(160deg,#dc2626,#7f1d1d)" },
  { name: "Valorant",       short: "V",  img: "", g: "linear-gradient(160deg,#e11d48,#4c0519)" },
  { name: "Genshin Impact", short: "GI", img: "", g: "linear-gradient(160deg,#a78bfa,#1e1b4b)" },
  { name: "EA FC",          short: "FC", img: "", g: "linear-gradient(160deg,#0ea5e9,#082f49)" },
];

/* ---------- Products ----------
   price بالدولار. category: fortnite | roblox | giftcards | coins | software */
const products = [
  { id: 1,  title: "Fortnite V-Bucks",   meta: "1,000 V-Bucks",  price: 8.99,  category: "fortnite",  badge: "Popular", img: "", g: "linear-gradient(160deg,#3b82f6,#6d28d9)", ph: "1,000", phSub: "V-BUCKS" },
  { id: 2,  title: "Fortnite V-Bucks",   meta: "2,800 V-Bucks",  price: 22.99, category: "fortnite",  badge: "",        img: "", g: "linear-gradient(160deg,#3b82f6,#6d28d9)", ph: "2,800", phSub: "V-BUCKS" },
  { id: 3,  title: "Fortnite V-Bucks",   meta: "5,000 V-Bucks",  price: 36.99, category: "fortnite",  badge: "",        img: "", g: "linear-gradient(160deg,#3b82f6,#6d28d9)", ph: "5,000", phSub: "V-BUCKS" },
  { id: 4,  title: "Roblox Robux",       meta: "800 Robux",      price: 9.99,  category: "roblox",    badge: "",        img: "", g: "linear-gradient(160deg,#b45309,#451a03)", ph: "800",   phSub: "ROBUX" },
  { id: 5,  title: "Roblox Robux",       meta: "1,700 Robux",    price: 19.99, category: "roblox",    badge: "Best Value", img: "", g: "linear-gradient(160deg,#b45309,#451a03)", ph: "1,700", phSub: "ROBUX" },
  { id: 6,  title: "PlayStation Gift Card", meta: "$25 Gift Card", price: 25.00, category: "giftcards", badge: "",     img: "", g: "linear-gradient(160deg,#1d4ed8,#1e1b4b)", ph: "$25",   phSub: "PLAYSTATION" },
  { id: 7,  title: "Steam Wallet Card",  meta: "$20 Wallet Code", price: 20.00, category: "giftcards", badge: "",       img: "", g: "linear-gradient(160deg,#1e3a5f,#0b1220)", ph: "$20",   phSub: "STEAM" },
  { id: 8,  title: "Xbox Gift Card",     meta: "$15 Gift Card",  price: 15.00, category: "giftcards", badge: "",        img: "", g: "linear-gradient(160deg,#15803d,#052e16)", ph: "$15",   phSub: "XBOX" },
  { id: 9,  title: "Nintendo eShop Card", meta: "$20 eShop",     price: 20.00, category: "giftcards", badge: "",        img: "", g: "linear-gradient(160deg,#dc2626,#7f1d1d)", ph: "$20",   phSub: "NINTENDO" },
  { id: 10, title: "Valorant Points",    meta: "1,000 VP",       price: 9.99,  category: "coins",     badge: "",        img: "", g: "linear-gradient(160deg,#e11d48,#4c0519)", ph: "1,000", phSub: "VP" },
  { id: 11, title: "Genshin Genesis Crystals", meta: "980 Crystals", price: 14.99, category: "coins", badge: "",        img: "", g: "linear-gradient(160deg,#a78bfa,#1e1b4b)", ph: "980",   phSub: "CRYSTALS" },
  { id: 12, title: "EA FC Points",       meta: "2,800 FC Points", price: 24.99, category: "coins",    badge: "Hot",     img: "", g: "linear-gradient(160deg,#0ea5e9,#082f49)", ph: "2,800", phSub: "FC POINTS" },
  { id: 13, title: "Windows 11 Pro Key", meta: "Lifetime License", price: 29.99, category: "software", badge: "",       img: "", g: "linear-gradient(160deg,#0284c7,#0c4a6e)", ph: "WIN 11", phSub: "PRO" },
  { id: 14, title: "Office 2021 Pro",    meta: "Lifetime License", price: 39.99, category: "software", badge: "",       img: "", g: "linear-gradient(160deg,#ea580c,#7c2d12)", ph: "OFFICE", phSub: "2021" },
];

/* ---------- Currency ---------- */
const rates   = { USD: 1, EGP: 48.5, EUR: 0.92 };   // عدّل الأسعار حسب السوق
const symbols = { USD: "$", EGP: "EGP ", EUR: "€" };
let currency = localGet("nx_currency") || "USD";

/* ---------- State ---------- */
let cart = JSON.parse(localGet("nx_cart") || "[]");
let activeFilter = "all";
let searchTerm = "";

/* ---------- Helpers ---------- */
const $ = (s) => document.querySelector(s);
function localGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function localSet(k, v) { try { localStorage.setItem(k, v); } catch {} }
function fmt(usd) {
  const v = usd * rates[currency];
  return symbols[currency] + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2000);
}

/* ---------- Render games ---------- */
function renderGames() {
  $("#gamesRow").innerHTML = games.map(g => `
    <div class="game" style="--g:${g.g}" data-search="${g.name}">
      <div class="game-icon">${g.img ? `<img src="${g.img}" alt="${g.name}">` : g.short}</div>
      <div class="game-name">${g.name}</div>
    </div>`).join("");

  document.querySelectorAll(".game").forEach(el => {
    el.addEventListener("click", () => {
      $("#searchInput").value = el.dataset.search;
      searchTerm = el.dataset.search.toLowerCase();
      setFilter("all");
      $("#products").scrollIntoView();
    });
  });
}

/* ---------- Render products ---------- */
function renderProducts() {
  const list = products.filter(p =>
    (activeFilter === "all" || p.category === activeFilter) &&
    (!searchTerm || (p.title + " " + p.meta + " " + p.category).toLowerCase().includes(searchTerm))
  );
  $("#emptyMsg").hidden = list.length > 0;
  $("#productsGrid").innerHTML = list.map(p => `
    <div class="product">
      <div class="product-img" style="--g:${p.g}">
        ${p.img ? `<img src="${p.img}" alt="${p.title}">` : `<div class="ph">${p.ph}<small>${p.phSub}</small></div>`}
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
      </div>
      <div class="product-body">
        <div class="product-title">${p.title}</div>
        <div class="product-meta">${p.meta}</div>
        <div class="product-price">${fmt(p.price)}</div>
        <button class="add-btn" data-id="${p.id}">🛒 Add to Cart</button>
      </div>
    </div>`).join("");

  document.querySelectorAll(".add-btn").forEach(b =>
    b.addEventListener("click", () => addToCart(+b.dataset.id)));
}

function setFilter(f) {
  activeFilter = f;
  document.querySelectorAll(".filter").forEach(b => b.classList.toggle("active", b.dataset.filter === f));
  renderProducts();
}

/* ---------- Cart ---------- */
function saveCart() { localSet("nx_cart", JSON.stringify(cart)); renderCart(); }

function addToCart(id) {
  const item = cart.find(i => i.id === id);
  item ? item.qty++ : cart.push({ id, qty: 1 });
  saveCart();
  const p = products.find(p => p.id === id);
  toast(`✅ ${p.title} (${p.meta}) added to cart`);
}

function renderCart() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  $("#cartCount").textContent = count;

  if (!cart.length) {
    $("#cartItems").innerHTML = `<p class="cart-empty">Your cart is empty 🛒</p>`;
    $("#cartTotal").textContent = fmt(0);
    return;
  }
  let total = 0;
  $("#cartItems").innerHTML = cart.map(i => {
    const p = products.find(p => p.id === i.id);
    if (!p) return "";
    total += p.price * i.qty;
    return `
      <div class="cart-item">
        <div class="cart-thumb" style="--g:${p.g}"></div>
        <div class="cart-info">
          <strong>${p.title}</strong>
          <span class="product-meta">${p.meta} · ${fmt(p.price)}</span>
          <div class="qty">
            <button data-act="dec" data-id="${p.id}">−</button>
            <span>${i.qty}</span>
            <button data-act="inc" data-id="${p.id}">+</button>
          </div>
        </div>
        <button class="remove" data-act="del" data-id="${p.id}">🗑</button>
      </div>`;
  }).join("");
  $("#cartTotal").textContent = fmt(total);
}

$("#cartItems").addEventListener("click", e => {
  const b = e.target.closest("button[data-act]");
  if (!b) return;
  const id = +b.dataset.id;
  const item = cart.find(i => i.id === id);
  if (b.dataset.act === "inc") item.qty++;
  if (b.dataset.act === "dec") item.qty--;
  if (b.dataset.act === "del" || item.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart();
});

function openCart()  { $("#cart").classList.add("open");  $("#overlay").classList.add("show"); }
function closeCart() { $("#cart").classList.remove("open"); $("#overlay").classList.remove("show"); }
$("#cartBtn").addEventListener("click", openCart);
$("#closeCart").addEventListener("click", closeCart);
$("#overlay").addEventListener("click", closeCart);
$("#checkoutBtn").addEventListener("click", () => {
  if (!cart.length) return toast("Your cart is empty");
  // هنا تربط بوابة الدفع الخاصة بك لاحقاً
  toast("Checkout coming soon 🚀");
});

/* ---------- Events ---------- */
document.querySelectorAll(".filter").forEach(b =>
  b.addEventListener("click", () => setFilter(b.dataset.filter)));

document.querySelectorAll("[data-filter-link]").forEach(a =>
  a.addEventListener("click", () => setFilter(a.dataset.filterLink)));

$("#searchInput").addEventListener("input", e => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderProducts();
});

const currencySel = $("#currency");
currencySel.value = currency;
currencySel.addEventListener("change", e => {
  currency = e.target.value;
  localSet("nx_currency", currency);
  renderProducts();
  renderCart();
});

$("#menuBtn").addEventListener("click", () => $("#nav").classList.toggle("open"));
document.querySelectorAll(".nav a").forEach(a => a.addEventListener("click", () => {
  document.querySelectorAll(".nav a").forEach(x => x.classList.remove("active"));
  a.classList.add("active");
  $("#nav").classList.remove("open");
}));

$("#year").textContent = new Date().getFullYear();

/* ---------- Init ---------- */
renderGames();
renderProducts();
renderCart();
