/* ================= NILORIX — store profile page (store.html) ================= */
let stFilter = "all";

function renderStore() {
  const st = storeStats();
  const all = [...remoteReviews, ...games.flatMap(g => (g.reviews || []).map(r => ({ ...r, gids: [g.id] })))];

  $("#stDelivery").textContent = DELIVERY_TIME;
  $("#stPct").innerHTML = st.positive === null ? "" : `<span class="pct ${st.positive >= 98 ? "good" : st.positive >= 96 ? "mid" : "bad"}">${st.positive}%</span>`;

  $("#stStats").innerHTML = `
    <div class="st-stat"><small>Orders</small><strong>${st.orders ? st.orders.toLocaleString("en-US") : "New"}</strong></div>
    <div class="st-stat"><small>Rating</small><strong>${st.count ? `★ ${st.avg.toFixed(1)}` : "—"}</strong></div>
    <div class="st-stat"><small>Reviews</small><strong>${st.count}</strong></div>
    <div class="st-stat"><small>Positive</small><strong>${st.positive === null ? "—" : st.positive + "%"}</strong></div>
    <div class="st-stat"><small>Delivery</small><strong>~${parseInt(DELIVERY_TIME) || 20} min</strong></div>`;

  /* rating breakdown */
  const dist = [5, 4, 3, 2, 1].map(n => ({ n, c: all.filter(r => r.stars === n).length }));
  $("#stSummary").innerHTML = `
    <div class="st-big">${st.count ? st.avg.toFixed(1) : "—"}</div>
    ${starsHtml(st.avg)}
    <p class="panel-sub">${st.count ? `${st.count} review${st.count === 1 ? "" : "s"}` : "No reviews yet"}</p>
    <div class="st-bars">
      ${dist.map(d => `
        <div class="st-bar"><span>${d.n}★</span>
          <i><b style="width:${st.count ? (d.c / st.count * 100) : 0}%"></b></i>
          <em>${d.c}</em></div>`).join("")}
    </div>`;

  /* filters: All + games that have reviews */
  const withRev = games.filter(g => all.some(r => (r.gids || []).includes(g.id)));
  $("#stFilters").innerHTML = [`<button class="filter ${stFilter === "all" ? "active" : ""}" data-f="all">All</button>`,
    ...withRev.map(g => `<button class="filter ${stFilter === g.id ? "active" : ""}" data-f="${g.id}">${g.name}</button>`)].join("");

  const list = all.filter(r => stFilter === "all" || (r.gids || []).includes(stFilter))
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  $("#stReviews").innerHTML = list.length ? list.map(r => {
    const g = byId((r.gids || [])[0]);
    return `
      <div class="review">
        <div class="review-top">
          <span class="avatar">${r.photo ? `<img src="${esc(r.photo)}" alt="">` : esc((r.name || "?").charAt(0).toUpperCase())}</span>
          <div><strong>${esc(r.name || "Customer")}</strong><small>${esc(r.date || (r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : ""))}</small></div>
          ${starsHtml(r.stars)}
        </div>
        ${g || r.item ? `<span class="rev-item">✔ Purchased: ${esc(r.item || "")}${g ? ` · <a href="${gameUrl(g)}">${esc(g.name)}</a>` : ""}</span>` : ""}
        ${revText(r)}
      </div>`;
  }).join("") : `<p class="rev-empty">No reviews yet — reviews from customers show up here after each order.</p>`;

  $("#stGames").innerHTML = games.map(x => `
    <a class="more-card" href="${gameUrl(x)}">
      ${tile(x)}
      <span><strong>${x.name}</strong><small>From ${fmt(minPrice(x))}</small></span>
    </a>`).join("");
}

$("#stFilters").addEventListener("click", e => {
  const b = e.target.closest("[data-f]"); if (!b) return;
  stFilter = b.dataset.f; renderStore();
});

window.pageRender = renderStore;
renderStore();
