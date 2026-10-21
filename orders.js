/* ================= NILORIX — My orders ================= */

let olOrders = [], stopOl = null;

window.onAuthChange = (user) => {
  if (stopOl) { stopOl(); stopOl = null; }
  $("#olGate").hidden = !!user;
  $("#olList").hidden = !user;
  if (!user) { $("#olEmpty").hidden = true; return; }
  stopOl = NX.watchMyOrders(list => { olOrders = list; renderOrders(); });
};
$("#olGateBtn").addEventListener("click", () => openLogin("in", "Sign in to see your orders."));

function renderOrders() {
  $("#olEmpty").hidden = olOrders.length > 0;
  $("#olList").innerHTML = olOrders.map(o => {
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
        <span class="go">${arrowSvg}</span>
      </a>`;
  }).join("");
}

window.pageRender = renderOrders;
if (!NX.enabled) window.onAuthChange(null);
