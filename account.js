/* ================= NILORIX — My account (account.html) ================= */
let acOrders = [], stopAc = null;
const PAID = ["processing", "delivered", "disputed", "completed"];

window.onAuthChange = (user) => {
  if (stopAc) { stopAc(); stopAc = null; }
  $("#acGate").hidden = !!user;
  $("#acWrap").hidden = !user;
  if (!user) return;
  renderAccount();
  stopAc = NX.watchMyOrders(list => { acOrders = list; renderAccount(); });
};
$("#acGateBtn").addEventListener("click", () => openLogin("in", "Sign in to see your account."));
$("#acEdit").addEventListener("click", () => openSettings());
$("#acPhoto").addEventListener("click", () => { photoTarget = "profile"; $("#photoInput").click(); });

function memberSince() {
  const p = NX.profile || {}, u = NX.user || {};
  const t = p.createdAt || (u.metadata && Date.parse(u.metadata.creationTime));
  return t ? new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "long" }) : "";
}

function renderAccount() {
  if (!NX.user) return;
  const p = NX.profile || {};
  $("#acAvatar").innerHTML = p.photo ? `<img src="${esc(p.photo)}" alt="">` : `<span>${esc((p.name || NX.user.email || "?").charAt(0).toUpperCase())}</span>`;
  $("#acName").textContent = p.name || "My account";
  $("#acEmail").textContent = p.email || NX.user.email || "";
  const since = memberSince();
  $("#acSince").textContent = since ? `🗓️ Member since ${since}` : "";
  $("#acPhoto").textContent = p.photo ? "📷 Change photo" : "📷 Upload photo";

  const paid = acOrders.filter(o => PAID.includes(o.status));
  const done = acOrders.filter(o => o.status === "completed").length;
  const spent = paid.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const mine = remoteReviews.filter(r => r.uid === NX.user.uid && !r.auto);
  $("#acStats").innerHTML = `
    <div class="st-stat"><small>Orders</small><strong>${acOrders.length}</strong></div>
    <div class="st-stat"><small>Completed</small><strong>${done}</strong></div>
    <div class="st-stat"><small>Total spent</small><strong>${fmt(spent)}</strong></div>
    <div class="st-stat"><small>Reviews</small><strong>${mine.length}</strong></div>`;

  $("#acOrders").innerHTML = acOrders.length ? acOrders.slice(0, 5).map(o => {
    const first = o.items[0], g = byId(first.gid);
    return `
      <a class="ol-row" href="order.html?id=${o.id}">
        ${g ? tile(g) : `<span class="mini-tile">#</span>`}
        <span class="ol-info">
          <strong>${esc(first.label)}${o.items.length > 1 ? ` + ${o.items.length - 1} more` : ""}</strong>
          <small>${esc(first.gameName)} · #${shortId(o.id)} · ${new Date(o.createdAt).toLocaleDateString()}</small>
        </span>
        ${statusPill(o.status)}
        <span class="or-total">${fmt(o.total)}</span>
      </a>`;
  }).join("") : `<p class="panel-sub">No orders yet — <a href="index.html" class="link-btn">browse games</a>.</p>`;

  $("#acReviews").innerHTML = mine.length ? mine.map(r => {
    const g = byId((r.gids || [])[0]);
    return `
      <div class="review">
        <div class="review-top">
          <span class="avatar">${r.photo ? `<img src="${esc(r.photo)}" alt="">` : esc((r.name || "?").charAt(0).toUpperCase())}</span>
          <div><strong>${esc(r.name || "Customer")}</strong><small>${r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : ""}</small></div>
          ${starsHtml(r.stars)}
        </div>
        ${g || r.item ? `<span class="rev-item">✔ Purchased: ${esc(r.item || "")}${g ? ` · <a href="${gameUrl(g)}">${esc(g.name)}</a>` : ""}</span>` : ""}
        <p>${esc(r.text)}</p>
      </div>`;
  }).join("") : `<p class="panel-sub">You haven't written any reviews yet. After an order is completed you can rate it from the order page.</p>`;
}

window.pageRender = renderAccount;
if (!NX.enabled) window.onAuthChange(null);
