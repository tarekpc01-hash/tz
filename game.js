/* ================= NILORIX — game page (game.html?id=...) ================= */

const params = new URLSearchParams(location.search);
const game = byId(params.get("id"));
let selected = 0;   // package index (بيبدأ على Popular لو موجود)
let qty = 1;
let opt = null;   // الاختيار (زي Game device)
const COIN_COLORS = ["#a1a1aa", "#22c55e", "#3b82f6", "#6366f1", "#a855f7", "#eab308", "#f97316", "#ec4899", "#ef4444"];

if (!game) {
  $("#gpGrid").hidden = true;
  $("#crumbs").hidden = true;
  $("#moreBox").hidden = true;
  $("#notFound").hidden = false;
} else {
  document.title = `${game.name} — NILORIX`;

  // add to Recently Viewed (الأحدث أولاً، أقصى حاجة 8)
  save("nx_recent", [game.id, ...store("nx_recent", []).filter(x => x !== game.id)].slice(0, 8));

  // highlight the matching dropdown in the nav
  const navDd = $(`.dd[data-type="${game.type}"] .dd-btn`);
  if (navDd) navDd.classList.add("active");

  selected = Math.max(0, game.packages.findIndex(p => p.badge === "popular"));
  if (game.options) opt = game.options.default ?? 0;
  setupOrder();
  window.pageRender = renderGame;
  renderGame();
}

/* نسبة التقييم: 98%+ أخضر · 96–97% أصفر · أقل من 96% أحمر */
function pctClass(p) { return p >= 98 ? "good" : p >= 96 ? "mid" : "bad"; }

/* ---------- Render everything ---------- */
function renderGame() {
  const g = game;
  const revs = reviewsOf(g);
  const avg = avgStars(revs);

  $("#crumbs").innerHTML = `
    <a href="index.html">Home</a><span>/</span>
    <a href="index.html#popular-${g.type}">${TYPE_LABEL[g.type]}</a><span>/</span>
    <strong>${g.name}</strong>`;

  /* --- Top-left: logo (first letter) + name --- */
  $("#gpHead").innerHTML = `
    <div class="gp-logo" style="--g:${g.g}">
      ${gameImg(g)}
    </div>
    <div class="gp-title">
      <span class="type-pill">${TYPE_LABEL[g.type]}</span>
      <h1>${g.name}</h1>
    </div>`;

  /* --- Store bar (above reviews): Nilorix + orders + stars + % --- */
  const st = storeStats();
  $("#storeBar").innerHTML = `
    <img src="${SELLER.logo}" alt="" class="seller-logo">
    <div class="sb-info">
      <h3>${SELLER.name} <span class="verified" title="Verified seller">✔</span>${st.positive === null ? "" : `<span class="pct ${pctClass(st.positive)}" title="Positive ratings">${st.positive}%</span>`}</h3>
      <div class="sb-line">
        <span>📦 ${st.orders.toLocaleString("en-US")} orders</span>
        <span class="sb-rate">${starsHtml(st.avg)} ${st.count ? st.avg.toFixed(1) : ""}</span>
      </div>
    </div>`;

  /* --- About + how it works --- */
  $("#aboutBox").innerHTML = `
    <h3 class="panel-title">About</h3>
    <p class="about-text">${g.about || ""}</p>
    <h3 class="panel-title">How it works</h3>
    <ol class="steps">
      <li><span>1</span><div><strong>Choose amount</strong><small>Pick the ${g.desc} package and quantity.</small></div></li>
      <li><span>2</span><div><strong>Pay securely</strong><small>Complete your payment in seconds.</small></div></li>
      <li><span>3</span><div><strong>Get it delivered</strong><small>Your order arrives in about ${DELIVERY_TIME}.</small></div></li>
    </ol>`;

  renderAmounts();
  renderReviews();
  renderMore();
}

/* ---------- Amount cards (under the game name) ---------- */

function perUnit(p) {
  if (p.months) return `${fmt(p.price / p.months)} / month`;
  if (!p.amount) return p.sub || "";
  return p.amount >= 1e6
    ? `${fmt(p.price / p.amount * 1e6)} / M`
    : `${fmt(p.price / p.amount * 1000)} / K`;
}

/* أيقونة العملة: صورة اللعبة لو موجودة (coinImg) — وإلا دايرة ملونة */
function coinHtml(i) {
  const icon = game.packages[i] && game.packages[i].icon;
  if (icon) return `<img class="coin-img" src="${icon}" alt="">`;
  return game.coinImg
    ? `<img class="coin-img" src="${game.coinImg}" alt="">`
    : `<span class="coin" style="--c:${COIN_COLORS[i % COIN_COLORS.length]}">${game.unit.charAt(0)}</span>`;
}

function renderAmountTop() {
  let html = "";
  if (game.notice) html += `
    <div class="notice">
      <span class="notice-ic">⚠</span>
      <div><strong>${game.notice.title}</strong><p>${game.notice.text}</p></div>
    </div>`;
  if (game.options) html += `
    <h3 class="panel-title">${game.options.title}</h3>
    <div class="opt-row">
      ${game.options.choices.map((ch, i) => `
        <button type="button" class="opt ${i === opt ? "selected" : ""}" data-o="${i}">
          ${i === opt ? '<span class="opt-check">✓</span>' : ""}${esc(ch)}
        </button>`).join("")}
    </div>`;
  $("#amountTop").innerHTML = html;
}

function renderAmounts() {
  renderAmountTop();
  $("#amounts").innerHTML = game.packages.map((p, i) => {
    const pct = p.old ? Math.round((1 - p.price / p.old) * 100) : 0;
    const badge = p.badge === "popular" ? `<span class="amt-badge popular">★ Popular</span>`
                : p.badge === "best"    ? `<span class="amt-badge best">Best Value</span>` : "";
    return `
      <button type="button" class="amt ${i === selected ? "selected" : ""}" data-i="${i}">
        ${badge}
        <span class="amt-check">✓</span>
        ${coinHtml(i)}
        ${p.label
          ? `<span class="amt-num long">${esc(p.label)}</span>`
          : `<span class="amt-num">${shortNum(p.amount)}</span><span class="amt-unit">${game.unit}</span>`}
        <span class="amt-price"><strong>${fmt(p.price)}</strong>${pct > 0 ? `<span class="disc">-${pct}%</span>` : ""}</span>
        <span class="amt-old">${p.old ? `<s>${fmt(p.old)}</s> <i title="Original price">ⓘ</i>` : "&nbsp;"}</span>
        <span class="amt-per">${perUnit(p) || "&nbsp;"}</span>
      </button>`;
  }).join("");
  updateTotal();
}

/* ---------- Right: your order + quantity + Pay ---------- */
function updateTotal() {
  const p = game.packages[selected];
  $("#selItem").innerHTML = `
    ${coinHtml(selected)}
    <span class="sel-info"><strong>${pkgLabel(game, p)}</strong><small>${game.name}${optLabel(game, opt) ? " · " + optLabel(game, opt) : ""}</small></span>
    <span class="sel-price">${fmt(p.price)}</span>`;
  $("#deliveryTime").textContent = DELIVERY_TIME;
  $("#qInput").value = qty;
  $("#orderTotal").textContent = fmt(p.price * qty);
}

function setupOrder() {
  $("#amountTop").addEventListener("click", e => {
    const b = e.target.closest(".opt");
    if (!b) return;
    opt = +b.dataset.o;
    renderAmounts();
  });
  $("#amounts").addEventListener("click", e => {
    const b = e.target.closest(".amt");
    if (!b) return;
    selected = +b.dataset.i;
    renderAmounts();
  });
  $("#qMinus").addEventListener("click", () => { qty = Math.max(1, qty - 1); updateTotal(); });
  $("#qPlus").addEventListener("click", () => { qty = Math.min(99, qty + 1); updateTotal(); });
  $("#qInput").addEventListener("change", e => {
    qty = Math.min(99, Math.max(1, parseInt(e.target.value) || 1));
    updateTotal();
  });

  $("#addCartBtn").addEventListener("click", () => addToCart(game.id, selected, qty, opt));

  $("#payBtn").addEventListener("click", () => {
    goCheckout([{ gid: game.id, p: selected, qty, opt }]);
  });
}

/* ---------- Reviews ---------- */
function renderReviews() {
  const revs = reviewsOf(game);
  const avg = avgStars(revs);

  $("#revSummary").innerHTML = revs.length
    ? `<strong>${avg.toFixed(1)}</strong> ${starsHtml(avg)} <small>(${revs.length})</small>`
    : "";

  $("#revList").innerHTML = revs.length
    ? revs.map(r => `
        <div class="review">
          <div class="review-top">
            <span class="avatar">${r.photo ? `<img src="${esc(r.photo)}" alt="">` : esc((r.name || "?").charAt(0).toUpperCase())}</span>
            <div><strong>${esc(r.name)}</strong><small>${esc(r.date || (r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : ""))}</small></div>
            ${starsHtml(r.stars)}
          </div>
          ${r.item ? `<span class="rev-item">✔ Purchased: ${esc(r.item)}</span>` : ""}
          <p>${esc(r.text)}</p>
        </div>`).join("")
    : `<p class="rev-empty">No reviews yet for ${game.name}.</p>`;
}

/* ---------- More games (same category first) ---------- */
function renderMore() {
  const others = games.filter(x => x.id !== game.id)
    .sort((a, b) => (b.type === game.type) - (a.type === game.type) || totalSold(b) - totalSold(a))
    .slice(0, 6);
  $("#moreTitle").textContent = "You may also like";
  $("#moreRow").innerHTML = others.map(x => `
    <a class="more-card" href="${gameUrl(x)}">
      ${tile(x)}
      <span><strong>${x.name}</strong><small>From ${fmt(minPrice(x))}</small></span>
    </a>`).join("");
}
