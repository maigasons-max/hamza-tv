/* Hamza TV — plusieurs séries, leurs épisodes, un lecteur qui marche. */
const app = () => document.querySelector("#app");
let CATALOGUE = window.CATALOGUE || null;

/* le catalogue peut aussi venir de GitHub, si une version plus récente existe */
const SOURCES = [
  "https://maigasons-max.github.io/hamza-tv/serie.json",
  "https://raw.githubusercontent.com/maigasons-max/hamza-tv/main/serie.json"
];

/* accepte aussi l'ancien format (une seule série à la racine) */
function normaliser(d) {
  if (!d) return null;
  if (Array.isArray(d.series)) return d;
  if (d.episodes) return { v: Number(d.v || 0), series: [d] };
  return null;
}

function nbEpisodes(serie) {
  return Object.keys((serie && serie.episodes) || {}).length;
}

function qualite(d) {
  const c = normaliser(d);
  if (!c) return -1;
  const total = c.series.reduce((s, x) => s + nbEpisodes(x), 0);
  // la version la plus récente gagne, puis le catalogue le plus complet
  return Number(c.v || 0) * 100000 + total;
}

async function actualiser() {
  const candidats = [];
  for (const url of SOURCES) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(url + "?t=" + Date.now(), { signal: ctrl.signal, cache: "no-store" });
      clearTimeout(t);
      if (!r.ok) continue;
      const d = normaliser(await r.json());
      if (d && d.series.length) candidats.push(d);
    } catch (e) { /* source indisponible */ }
  }
  if (CATALOGUE) candidats.push(normaliser(CATALOGUE));
  candidats.sort((a, b) => qualite(b) - qualite(a));
  if (candidats.length) CATALOGUE = candidats[0];
}

/* selon la série : lien direct, ou identifiant YouTube */
function lienEpisode(serie, num) {
  const v = (serie.episodes || {})[num];
  if (!v) return "";
  if (serie.type === "youtube") {
    return "https://www.youtube.com/embed/" + v + "?playsinline=1&rel=0&modestbranding=1";
  }
  return v;
}

function accueil() {
  const cartes = CATALOGUE.series.map((s, i) => `
      <button class="carte-serie" data-serie="${i}">
        <div class="visuel">
          <img src="${s.affiche}" alt="${s.t}">
          <div class="voile"></div>
          <div class="lecture"></div>
        </div>
        <div class="infos">
          <b>${s.t}</b>
          <small>${s.s} · ${nbEpisodes(s)} épisodes</small>
          <span class="vf">${s.badge || "VF · sans publicité"}</span>
        </div>
      </button>`).join("");

  app().innerHTML = `
    <div class="accueil">
      <div class="titre-app">
        <img src="assets/icon-192.png" alt="">
        <div><b>Hamza TV</b><span>Version française</span></div>
      </div>
      <div class="series">${cartes}</div>
    </div>`;

  document.querySelectorAll("[data-serie]").forEach(el => {
    el.onclick = () => listeEpisodes(CATALOGUE.series[Number(el.dataset.serie)]);
  });
  brancherFocus();
}

let serieCourante = null;

function listeEpisodes(serie) {
  serieCourante = serie;
  const nums = Object.keys(serie.episodes).map(Number).sort((a, b) => a - b);
  app().innerHTML = `
    <div class="entete">
      <button id="retour">←</button>
      <div><b>${serie.t}</b><small>${serie.s} · ${nums.length} épisodes</small></div>
    </div>
    <div class="episodes">
      ${nums.map(n => `<div class="ep" data-ep="${n}">${n}<small>ÉPISODE</small></div>`).join("")}
    </div>`;
  document.querySelector("#retour").onclick = accueil;
  document.querySelectorAll("[data-ep]").forEach(el => el.onclick = () => lire(el.dataset.ep));
  brancherFocus();
}

function lire(num) {
  const url = lienEpisode(serieCourante, num);
  if (!url) return;
  const d = document.createElement("div");
  d.className = "lecteur";
  d.innerHTML = `
    <div class="barre">
      <button id="fermer">✕</button>
      <b>${serieCourante.t} · Épisode ${num}</b>
    </div>
    <div class="zone"><iframe src="${url}" allowfullscreen referrerpolicy="origin" allow="autoplay; encrypted-media; fullscreen"></iframe></div>`;
  document.body.appendChild(d);
  d.querySelector("#fermer").onclick = () => d.remove();
}

/* télécommande : flèches + OK */
let pos = 0;
function focusables() {
  return [...document.querySelectorAll(".ep, .carte-serie, #retour")].filter(e => e.offsetParent);
}
function brancherFocus() {
  const els = focusables(); if (!els.length) return;
  pos = 0; els[0].classList.add("focus");
}
document.addEventListener("keydown", (e) => {
  if (document.querySelector(".lecteur")) {
    if (e.key === "Escape" || e.key === "Backspace") { const l = document.querySelector(".lecteur"); if (l) l.remove(); }
    return;
  }
  const els = focusables(); if (!els.length) return;
  const bouger = (d) => {
    els[pos] && els[pos].classList.remove("focus");
    pos = (pos + d + els.length) % els.length;
    els[pos].classList.add("focus");
    els[pos].scrollIntoView({ block: "center", behavior: "smooth" });
  };
  if (["ArrowRight", "ArrowDown"].includes(e.key)) { e.preventDefault(); bouger(1); }
  if (["ArrowLeft", "ArrowUp"].includes(e.key)) { e.preventDefault(); bouger(-1); }
  if (e.key === "Enter") { e.preventDefault(); els[pos] && els[pos].click(); }
  if (e.key === "Escape" || e.key === "Backspace") {
    if (document.querySelector(".episodes")) { e.preventDefault(); accueil(); }
  }
});

(async function () {
  CATALOGUE = normaliser(CATALOGUE);
  // on attend la version en ligne : le fichier pèse quelques Ko, c'est immédiat.
  // si le réseau ne répond pas, le catalogue embarqué prend le relais.
  await Promise.race([actualiser(), new Promise(r => setTimeout(r, 4000))]);
  document.querySelector("#chargeur").classList.add("cache");
  if (!CATALOGUE || !CATALOGUE.series.length) {
    app().innerHTML = "<p style='padding:30px;color:#9a9ab0'>Catalogue indisponible.</p>";
    return;
  }
  if (document.querySelector(".episodes") && serieCourante) {
    const frais = CATALOGUE.series.find(s => s.id === serieCourante.id);
    listeEpisodes(frais || serieCourante);
  } else {
    accueil();
  }
})();
