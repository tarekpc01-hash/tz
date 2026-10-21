/* ================= NILORIX — data (الألعاب والأسعار والإعدادات) =================
   عدّل الألعاب والباقات والأسعار من الملف ده بس
   ========================================================================= */

/* =========================================================
   الألعاب — عدّل من هنا بس
   type    : "currency" أو "topup"  (يحدد هي في أنهي ليستة)
   unit    : اسم العملة اللي بتظهر في كروت الكمية (V-Bucks, Robux...)
   sold    : عدد الأوردرات — حط الرقم الحقيقي (الأكثر مبيعاً بيترتب على حسبه)
   img     : لوجو اللعبة — حط الصورة في فولدر images/games بنفس الاسم المكتوب
             (لو الصورة مش موجودة بيظهر أول حرف من اسم اللعبة بدلها)
   packages: كل باقة = { amount: الكمية, price: السعر بالدولار,
                         old: السعر الأصلي قبل الخصم (اختياري),
                         badge: "popular" أو "best" (اختياري),
                         label: اسم بدل الكمية (اختياري، زي Welkin Moon),
                         months: عدد الشهور (اختياري — بيحسب السعر لكل شهر),
                         icon: صورة الباقة جنب الكمية (اختياري) }
   options : اختيار قبل الكميات (زي Game device / Game region) — اختياري
   notice  : تنبيه برتقاني فوق الكميات — اختياري
   reviews : تقييمات حقيقية من عملائك، مثال:
             { name: "Ahmed", stars: 5, text: "Fast delivery!", item: "800 V-Bucks", date: "2026-10-20" }
   ========================================================= */
const games = [
  /* ---------- Currency ---------- */
  { id: "ps99", type: "currency", name: "Pet Simulator 99", desc: "Diamonds", unit: "Diamonds",
    g: "linear-gradient(150deg,#22c55e,#0e7490)", sold: 860, img: "images/games/ps99.png", reviews: [],
    about: "Buy Pet Simulator 99 Diamonds safely and get them delivered to your Roblox account fast.",
    packages: [
      { amount: 10000000,  price: 2.99 },
      { amount: 50000000,  price: 9.99, badge: "popular" },
      { amount: 100000000, price: 17.99 },
      { amount: 250000000, price: 39.99, badge: "best" },
    ] },

  { id: "bladeball", type: "currency", name: "Blade Ball Tokens", desc: "Tokens", unit: "Tokens",
    g: "linear-gradient(150deg,#f43f5e,#3b0764)", sold: 640, img: "images/games/bladeball.png", reviews: [],
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
    g: "linear-gradient(150deg,#ffb020,#ea580c)", sold: 1380, img: "images/games/fortnite.png", reviews: [],
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
    g: "linear-gradient(150deg,#dc2626,#450a0a)", sold: 540, img: "images/games/apex.png", reviews: [],
    about: "Get Apex Coins for legends, skins and the Battle Pass.",
    packages: [
      { amount: 6700,  price: 32.00,  old: 59.99 },
      { amount: 11500, price: 48.99,  old: 99.99,  badge: "popular" },
      { amount: 23000, price: 100.14, old: 199.98 },
      { amount: 34500, price: 152.98, old: 299.97 },
      { amount: 46000, price: 208.00, old: 399.96 },
    ] },

  { id: "eafc", type: "topup", name: "EA Sports FC Points", desc: "FC Points", unit: "FC Points",
    g: "linear-gradient(150deg,#10b981,#0c4a6e)", sold: 910, img: "images/games/eafc.png", reviews: [],
    about: "Top up FC Points for Ultimate Team packs and more.",
    /* تنبيه برتقاني بيظهر فوق الكميات */
    notice: {
      title: "Unlock the Transfer Market to receive Points",
      text: "Before ordering, make sure you can access the Transfer Market in the EA FC Web App. To unlock it, complete these objectives: <em>The Journey Begins</em>, <em>First Team Dreams</em> and <em>Rising Through the Ranks</em>.",
    },
    /* اختيار قبل الكميات (default = الاختيار المبدئي، بيبدأ من 0) */
    options: { title: "Game device", choices: ["PC - no EA Membership", "PC - with EA Membership"], default: 1 },
    coinImg: "images/games/eafc-coin.png",   // أيقونة العملة جنب كل كمية (بدل الدايرة الملونة)
    packages: [
      { amount: 500,   price: 6.84 },
      { amount: 1050,  price: 10.90 },
      { amount: 1600,  price: 14.59,  old: 14.99 },
      { amount: 2800,  price: 21.90,  old: 24.99 },
      { amount: 5900,  price: 39.50,  old: 49.99,  badge: "popular" },
      { amount: 12000, price: 76.80,  old: 99.99 },
      { amount: 18500, price: 115.59, old: 149.99 },
      { amount: 24000, price: 153.80, old: 199.98 },
      { amount: 36000, price: 228.80, old: 299.97 },
      { amount: 37000, price: 229.60, old: 299.98 },
      { amount: 48000, price: 306.59, old: 399.96 },
      { amount: 55500, price: 343.60, old: 449.97 },
      { amount: 60000, price: 380.59, old: 499.95 },
      { amount: 72000, price: 455.59, old: 599.94 },
      { amount: 74000, price: 454.79, old: 599.96, badge: "best" },
      { amount: 84000, price: 532.79, old: 699.93 },
      { amount: 96000, price: 619.79, old: 799.92 },
    ] },

  { id: "pokemongo", type: "topup", name: "Pokémon GO Top Up", desc: "PokéCoins", unit: "PokéCoins",
    g: "linear-gradient(150deg,#eab308,#1d4ed8)", sold: 470, img: "images/games/pokemongo.png", reviews: [],
    about: "Get PokéCoins for items, storage upgrades and raid passes.",
    packages: [
      { amount: 550,  price: 4.99 },
      { amount: 1200, price: 9.99, badge: "popular" },
      { amount: 2500, price: 19.99 },
      { amount: 5600, price: 39.99, badge: "best" },
    ] },

  { id: "genshin", type: "topup", name: "Genshin Impact Top Up", desc: "Genesis Crystals", unit: "Genesis Crystals",
    g: "linear-gradient(150deg,#a78bfa,#1e1b4b)", sold: 780, img: "images/games/genshin.png", reviews: [],
    about: "Top up Genesis Crystals and Welkin Moon for your Genshin account.",
    options: { title: "Game region", choices: ["EU", "NA", "Asia", "TW, HK, MO"], default: 0 },
    packages: [
      { amount: 60,    price: 1.04, icon: "images/games/genshin/p0.png" },
      { amount: 330,   price: 3.24,   old: 4.99, icon: "images/games/genshin/p1.png" },
      { amount: 1090,  price: 9.86,   old: 14.99, icon: "images/games/genshin/p2.png" },
      { amount: 2240,  price: 17.69,  old: 29.99, icon: "images/games/genshin/p3.png" },
      { amount: 3880,  price: 30.49,  old: 49.99, icon: "images/games/genshin/p4.png" },
      { amount: 8080,  price: 59.99,  old: 99.99,  badge: "popular", icon: "images/games/genshin/p5.png" },
      { amount: 16160, price: 120.00, old: 199.98, icon: "images/games/genshin/p6.png" },
      { amount: 24240, price: 180.00, old: 299.97, icon: "images/games/genshin/p7.png" },
      { amount: 32320, price: 240.00, old: 399.96, icon: "images/games/genshin/p8.png" },
      { amount: 80800, price: 589.95, old: 999.90, badge: "best", icon: "images/games/genshin/p9.png" },
      { label: "All-In-One Bundle",                       price: 120.81, old: 200.94, icon: "images/games/genshin/p10.png" },
      { label: "Blessing of the Welkin Moon - 180 Days",  price: 21.68,  old: 29.94, months: 6, icon: "images/games/genshin/p11.png" },
      { label: "Blessing of the Welkin Moon - 30 Days",   price: 3.19,   old: 4.99,  months: 1, icon: "images/games/genshin/p12.png" },
      { label: "Blessing of the Welkin Moon - 90 Days",   price: 11.25,  old: 14.97, months: 3, icon: "images/games/genshin/p13.png" },
      { label: "Blessing of the Welkin Moon + 1090 Genesis Crystals", price: 14.34, old: 19.98, icon: "images/games/genshin/p14.png" },
      { label: "Blessing of the Welkin Moon + 8080 Genesis Crystals", price: 65.00, old: 104.98, icon: "images/games/genshin/p15.png" },
      { label: "Gnostic Chorus - Battle Pass",            price: 16.39,  old: 19.99, icon: "images/games/genshin/p16.png" },
      { label: "Gnostic Hymn - Battle Pass",              price: 8.89,   old: 9.99, icon: "images/games/genshin/p17.png" },
    ] },
];

/* =========================================================
   بيانات حساب اللعبة اللي العميل بيكتبها وقت الطلب (لكل لعبة)
   key: اسم داخلي · label: اللي بيظهر للعميل · placeholder: مثال
   ⚠ متطلبش باسوورد في الخانات دي — لو محتاج حاجة زيادة اطلبها في الشات
   ========================================================= */
const ACCOUNT_FIELDS = {
  ps99:      [{ key: "username", label: "Roblox username", placeholder: "e.g. Builderman" }],
  bladeball: [{ key: "username", label: "Roblox username", placeholder: "e.g. Builderman" }],
  robux:     [{ key: "username", label: "Roblox username", placeholder: "e.g. Builderman" }],
  fortnite:  [{ key: "epic",     label: "Epic Games display name", placeholder: "Your Epic display name" },
              { key: "email",    label: "Epic account email", placeholder: "you@example.com", type: "email" }],
  apex:      [{ key: "email",    label: "EA account email", placeholder: "you@example.com", type: "email" },
              { key: "platform", label: "Platform", placeholder: "PC / PlayStation / Xbox / Switch" }],
  eafc:      [{ key: "email",    label: "EA account email", placeholder: "you@example.com", type: "email" }],
  pokemongo: [{ key: "trainer",  label: "Trainer name", placeholder: "Your trainer name" },
              { key: "email",    label: "Pokémon GO account email", placeholder: "you@example.com", type: "email" }],
  genshin:   [{ key: "uid",      label: "Genshin UID", placeholder: "e.g. 700123456" }],
};

/* طرق الدفع — العناوين نفسها بتتكتب في config.js */
const PAY_METHODS = {
  usdt_bep20: { name: "USDT", network: "BEP20 (BNB Smart Chain)", symbol: "USDT", explorer: "https://bscscan.com/tx/" },
  usdt_trc20: { name: "USDT", network: "TRC20 (Tron)",            symbol: "USDT", explorer: "https://tronscan.org/#/transaction/" },
  ltc:        { name: "Litecoin", network: "LTC",                  symbol: "LTC",  explorer: "https://blockchair.com/litecoin/transaction/" },
};

/* حالات الأوردر */
const ORDER_STATUS = {
  awaiting_payment:  { label: "Awaiting payment",          cls: "st-wait" },
  payment_submitted: { label: "Payment sent — verifying",  cls: "st-verify" },
  processing:        { label: "Processing",                cls: "st-proc" },
  delivered:         { label: "Delivered",                 cls: "st-deliv" },
  disputed:          { label: "Dispute open",              cls: "st-dispute" },
  completed:         { label: "Completed",                 cls: "st-done" },
  cancelled:         { label: "Cancelled",                 cls: "st-cancel" },
};
/* أسباب الـ Dispute اللي العميل بيختار منها */
const DISPUTE_REASONS = ["I didn't receive anything", "I received the wrong amount", "It was sent to the wrong account", "Other"];
const AUTO_COMPLETE_DAYS = 3;   // بعد التسليم بكام يوم الأوردر يتقفل لوحده لو العميل مأكدش

const TYPE_LABEL = { currency: "Currency", topup: "Top Up" };
const SELLER = { name: "Nilorix", logo: (typeof LOGO_SRC !== "undefined" ? LOGO_SRC : "images/logo.png") };
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
/* اسم الباقة + الاختيار (زي "5,900 FC Points · PC - with EA Membership") */
const optLabel = (g, opt) => (g.options && opt != null && g.options.choices[opt]) ? g.options.choices[opt] : "";
const itemLabel = (g, p, opt) => pkgLabel(g, p) + (optLabel(g, opt) ? ` · ${optLabel(g, opt)}` : "");
const letter = (g) => g.name.trim().charAt(0).toUpperCase();
const gameUrl = (g) => `game.html?id=${g.id}`;
const shortId = (id) => String(id).slice(0, 8).toUpperCase();
function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toISOString().slice(0, 10);
}

