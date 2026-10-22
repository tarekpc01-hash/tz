/* ================= NILORIX — home page ================= */

function gameCard(g) {
  return `
    <a class="game-card" href="${gameUrl(g)}">
      <div class="game-art" style="--g:${g.g}">
        <span class="type-pill">${TYPE_LABEL[g.type]}</span>
        ${gameImg(g, "ph")}
      </div>
      <div class="game-body">
        <div class="game-name">${g.name}</div>
        <div class="game-meta">${g.desc}</div>
        <div class="game-foot">
          <span class="from">From<strong>${fmt(minPrice(g))}</strong></span>
          <span class="go">${arrowSvg}</span>
        </div>
      </div>
    </a>`;
}

/* كروت الهيرو: غيّر الألعاب من هنا (4 ألعاب) */
const HERO_GAMES = ["fortnite", "robux", "eafc", "genshin"];
const HERO_NAMES = { eafc: "EA FC Points" };
const HERO_COLORS = ["linear-gradient(160deg,#2563eb,#7c3aed)", "linear-gradient(160deg,#ffd43b,#f59f00)",
                     "linear-gradient(160deg,#10b981,#065f46)", "linear-gradient(160deg,#ec4899,#7c3aed)"];
function renderHero() {
  const box = $("#heroCards"); if (!box) return;
  box.innerHTML = HERO_GAMES.map(byId).filter(Boolean).map((g, i) => `
    <a class="hcard hc${i + 1}${g.id === "robux" ? " hc-light" : ""}" href="${gameUrl(g)}" style="--hc:${HERO_COLORS[i % 4]}">
      <span class="hc-ic" style="--g:${g.g}">${gameImg(g, "ph")}</span>
      <b>${esc(HERO_NAMES[g.id] || g.name.replace(/ Top Up$/, ""))}</b>
      <small>${esc(g.custom ? "Any amount" : g.desc)}</small>
      <span class="hc-foot"><span class="hc-price">From ${fmt(minPrice(g))}</span><i>⚡ Instant</i></span>
    </a>`).join("");
}

function renderHome() {
  renderHero();
  const bySales = (a, b) => totalSold(b) - totalSold(a);

  $("#currencyGrid").innerHTML = games.filter(g => g.type === "currency").sort(bySales).map(gameCard).join("");
  $("#topupGrid").innerHTML    = games.filter(g => g.type === "topup").sort(bySales).map(gameCard).join("");

  // Recently viewed — يظهر بس لو فيه
  recent = store("nx_recent", []);
  const recentGames = recent.map(byId).filter(Boolean);
  $("#recent").hidden = recentGames.length === 0;
  $("#recentGrid").innerHTML = recentGames.map(gameCard).join("");

  // Trending — الأكثر مبيعاً
  $("#trendingList").innerHTML = [...games].sort(bySales).map((g, i) => `
    <a class="trend" href="${gameUrl(g)}">
      <span class="rank">#${i + 1}</span>
      ${tile(g)}
      <span class="trend-info"><strong>${g.name}</strong><small>${TYPE_LABEL[g.type]}</small></span>
      <span class="trend-right"><strong>${fmt(minPrice(g))}</strong>${totalSold(g) ? `<span class="sold">🔥 ${soldLabel(totalSold(g))} sold</span>` : ""}</span>
    </a>`).join("");
}

$("#clearRecent").addEventListener("click", () => { save("nx_recent", []); renderHome(); });

// لما الزائر يرجع بزرار Back يتحدّث Recently Viewed
window.addEventListener("pageshow", renderHome);

window.pageRender = renderHome;
renderHome();
