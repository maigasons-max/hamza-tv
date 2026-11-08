/* Hamza TV — catalogue de séries et de films, avec recherche. */
const app = () => document.querySelector("#app");
let CATALOGUE = window.CATALOGUE || null;

/* le catalogue peut aussi venir de GitHub, si une version plus récente existe */
const SOURCES = [
  "https://maigasons-max.github.io/hamza-tv/serie.json",
  "https://raw.githubusercontent.com/maigasons-max/hamza-tv/main/serie.json"
];

const sansAccent = (s) => String(s || "").toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ").trim();

/* accepte aussi l'ancien format (une seule série à la racine) */
function normaliser(d) {
  if (!d) return null;
  if (Array.isArray(d.series)) return d;
  if (Array.isArray(d.films)) return { v: Number(d.v || 0), series: d.films };
  if (d.episodes) return { v: Number(d.v || 0), series: [d] };
  return null;
}

function nbEpisodes(item) {
  return Object.keys((item && item.episodes) || {}).length;
}

function estFilm(item) {
  return item && (item.type === "film" || (!item.type && nbEpisodes(item) === 1));
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

/* selon l'élément : lien direct, ou identifiant YouTube */
function lienEpisode(item, num) {
  const v = (item.episodes || {})[num];
  if (!v) return "";
  if (item.type === "youtube") {
    return "https://www.youtube.com/embed/" + v + "?playsinline=1&rel=0&modestbranding=1";
  }
  return v;
}


/* deux mots se ressemblent-ils ? (une ou deux lettres d'ecart) */
function ecart(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prec = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cour = [i];
    for (let j = 1; j <= n; j++) {
      cour[j] = Math.min(prec[j] + 1, cour[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prec = cour;
  }
  return prec[n];
}

function ressemble(cible, mot) {
  if (mot.length < 3) return cible.includes(mot);
  const limite = mot.length > 6 ? 2 : 1;
  if (cible.includes(mot)) return true;
  if (cible.split(" ").some(x => x.startsWith(mot) || ecart(x, mot) <= limite)) return true;
  // "fairytail" ecrit d'un seul mot : on compare aux tranches de la version collee
  const collee = cible.replace(/ /g, "");
  for (let i = 0; i + mot.length <= collee.length; i++) {
    if (ecart(collee.slice(i, i + mot.length), mot) <= limite) return true;
  }
  return false;
}

/* ---------- memoire locale (ma liste, reprise) ---------- */
const CLE_FAV = "hamza-favoris", CLE_REPRISE = "hamza-reprise";
function lireStock(cle, defaut) {
  try { const v = JSON.parse(localStorage.getItem(cle)); return v === null ? defaut : v; }
  catch (e) { return defaut; }
}
function ecrireStock(cle, valeur) { try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch (e) {} }
function estFavori(id) { return lireStock(CLE_FAV, []).includes(id); }
function basculerFavori(id) {
  const l = lireStock(CLE_FAV, []);
  const i = l.indexOf(id);
  if (i < 0) l.push(id); else l.splice(i, 1);
  ecrireStock(CLE_FAV, l);
  return i < 0;
}
function noterReprise(item, num) {
  const r = lireStock(CLE_REPRISE, {});
  r[item.id] = { ep: String(num), date: Date.now() };
  ecrireStock(CLE_REPRISE, r);
}
function reprises() { return lireStock(CLE_REPRISE, {}); }

function toast(texte) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = texte;
  t.classList.add("vu");
  clearTimeout(toast.minuteur);
  toast.minuteur = setTimeout(() => t.classList.remove("vu"), 1700);
}

/* ---------- accueil ---------- */
let vue = "accueil";
let filtre = "";

const LOGO = `<svg viewBox="0 0 512 512" aria-hidden="true">
  <defs>
    <radialGradient id="lbg" cx=".3" cy=".2" r="1"><stop offset="0" stop-color="#241346"/><stop offset=".55" stop-color="#0d0a1c"/><stop offset="1" stop-color="#05050b"/></radialGradient>
    <linearGradient id="lbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b94"/><stop offset=".5" stop-color="#ff2e63"/><stop offset="1" stop-color="#7a2cff"/></linearGradient>
    <linearGradient id="lpl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#ffd9a0"/></linearGradient>
  </defs>
  <rect width="512" height="512" rx="116" fill="url(#lbg)"/>
  <rect x="132" y="120" width="56" height="272" rx="28" fill="url(#lbar)"/>
  <rect x="324" y="120" width="56" height="272" rx="28" fill="url(#lbar)"/>
  <path d="M214 190V322L318 256Z" fill="url(#lpl)" stroke="url(#lpl)" stroke-width="22" stroke-linejoin="round"/>
</svg>`;

function categorieDe(item) {
  return item.categorie || (estFilm(item) ? "film" : "anime");
}

function vedette() {
  const m = CATALOGUE.series.find(s => s.id === "miraculous");
  return m || CATALOGUE.series[0];
}

function carteSerie(s, options) {
  const o = options || {};
  const film = estFilm(s);
  const n = nbEpisodes(s);
  const r = reprises()[s.id];
  const prog = r ? Math.min(100, Math.max(8, (Number(r.ep) / Math.max(1, n)) * 100)) : 0;
  const info = o.reprise && r
    ? "Reprendre · épisode " + ((s.numero || {})[r.ep] || r.ep)
    : (film ? "Film" : s.s);
  return `
    <button class="carte-serie f" data-id="${s.id}" data-reprise="${o.reprise && r ? r.ep : ""}">
      <div class="visuel">
        <img src="${s.affiche}" alt="${s.t}" loading="lazy">
        <div class="voile"></div>
        <span class="vf">${s.badge ? s.badge.split(" ")[0] : "VF"}</span>
        ${film ? "" : `<span class="nb">${n} ép.</span>`}
        ${prog ? `<div class="progression"><i style="width:${prog}%"></i></div>` : ""}
      </div>
      <div class="infos"><b>${s.t}</b><small>${info}</small></div>
    </button>`;
}

function bandeau(s) {
  const film = estFilm(s);
  const r = reprises()[s.id];
  const texte = film
    ? "Disponible maintenant en version française, sans publicité."
    : nbEpisodes(s) + " épisodes en version française, prêts à être regardés sur ta télé.";
  return `
    <section class="hero">
      <div class="fond-art" style="background-image:url('${s.affiche}')"></div>
      <div class="degrade"></div>
      <div class="contenu">
        <div class="sur">À LA UNE</div>
        <h1>${s.t}</h1>
        <p>${texte}</p>
        <div class="boutons" data-rangee>
          <button class="bouton fort f" id="bLecture">${r ? "▶ Reprendre" : "▶ Regarder"}</button>
          <button class="bouton f" id="bListe">${estFavori(s.id) ? "✓ Ma liste" : "+ Ma liste"}</button>
        </div>
      </div>
    </section>`;
}

function contenuHTML() {
  const q = sansAccent(filtre);
  if (q) {
    const mots = q.split(" ").filter(Boolean);
    const cible = (s) => sansAccent(s.t + " " + (s.s || "") + " " + (s.alias || ""));
    let liste = CATALOGUE.series.filter(s => mots.every(m => cible(s).includes(m)));
    if (!liste.length) {
      const utiles = mots.filter(m => m.length > 2);
      const garde = utiles.length ? utiles : mots;
      liste = CATALOGUE.series.filter(s => garde.every(m => ressemble(cible(s), m)));
    }
    return liste.length
      ? `<div class="grille" data-rangee>${liste.map(s => carteSerie(s)).join("")}</div>`
      : `<p class="vide">Rien trouvé pour « ${filtre.replace(/[<>&]/g, "")} ».<br><small>Dis-moi le titre et je l'ajoute.</small></p>`;
  }

  const parTendance = CATALOGUE.series.slice().sort((x, y) => (x.tendance || 9) - (y.tendance || 9));
  const deCategorie = (cat) => CATALOGUE.series.filter(x => categorieDe(x) === cat);
  const vide = (quoi, aide) => `<p class="vide">${quoi} pour le moment.<br><small>${aide}</small></p>`;

  if (vue === "tendances") {
    return `<div class="rangees"><div class="rangee"><h3>Les tendances du moment</h3>
      <div class="rail" data-rangee>${parTendance.map(s => carteSerie(s)).join("")}</div></div></div>`;
  }

  if (vue === "animes") {
    const liste = deCategorie("anime");
    return liste.length
      ? `<div class="grille" data-rangee>${liste.map(s => carteSerie(s)).join("")}</div>`
      : vide("Aucun animé", "Dis-moi le titre et je l'ajoute.");
  }

  if (vue === "series") {
    const liste = deCategorie("serie");
    return liste.length
      ? `<div class="grille" data-rangee>${liste.map(s => carteSerie(s)).join("")}</div>`
      : vide("Aucune série", "Les séries arriveront ici, séparées des animés.");
  }

  if (vue === "films") {
    const liste = deCategorie("film");
    return liste.length
      ? `<div class="grille" data-rangee>${liste.map(s => carteSerie(s)).join("")}</div>`
      : vide("Aucun film", "Les films arriveront ici, séparés des séries.");
  }

  if (vue === "liste") {
    const favs = CATALOGUE.series.filter(s => estFavori(s.id));
    return favs.length
      ? `<div class="grille" data-rangee>${favs.map(s => carteSerie(s)).join("")}</div>`
      : `<p class="vide">Ta liste est vide.<br><small>Sur une fiche, appuie sur « + Ma liste ».</small></p>`;
  }

  const v = vedette();
  const enCours = CATALOGUE.series.filter(s => reprises()[s.id]);
  const favs = CATALOGUE.series.filter(s => estFavori(s.id));
  const rangees = [];
  rangees.push(`<div class="rangee"><h3>Tendances</h3>
    <div class="rail" data-rangee>${CATALOGUE.series.slice().sort((x, y) => (x.tendance || 9) - (y.tendance || 9)).map(s => carteSerie(s)).join("")}</div></div>`);
  if (enCours.length) {
    rangees.push(`<div class="rangee"><h3>Reprendre la lecture</h3>
      <div class="rail" data-rangee>${enCours.map(s => carteSerie(s, { reprise: true })).join("")}</div></div>`);
  }
  const anime = CATALOGUE.series.filter(x => categorieDe(x) === "anime");
  const serie = CATALOGUE.series.filter(x => categorieDe(x) === "serie");
  const film = CATALOGUE.series.filter(x => categorieDe(x) === "film");
  if (anime.length) {
    rangees.push(`<div class="rangee"><h3>Animés</h3>
      <div class="rail" data-rangee>${anime.map(s => carteSerie(s)).join("")}</div></div>`);
  }
  if (serie.length) {
    rangees.push(`<div class="rangee"><h3>Séries</h3>
      <div class="rail" data-rangee>${serie.map(s => carteSerie(s)).join("")}</div></div>`);
  }
  if (film.length) {
    rangees.push(`<div class="rangee"><h3>Films</h3>
      <div class="rail" data-rangee>${film.map(s => carteSerie(s)).join("")}</div></div>`);
  }
  if (favs.length) {
    rangees.push(`<div class="rangee"><h3>Ma liste</h3>
      <div class="rail" data-rangee>${favs.map(s => carteSerie(s)).join("")}</div></div>`);
  }
  return bandeau(v) + `<div class="rangees">${rangees.join("")}</div>`;
}

function brancherContenu() {
  document.querySelectorAll(".carte-serie").forEach(el => {
    el.onclick = () => {
      const id = el.dataset.id;
      const ep = el.dataset.reprise;
      const item = CATALOGUE.series.find(s => s.id === id);
      if (!item) return;
      if (ep) { lire(item, ep); return; }
      ouvrir(id);
    };
  });
  const bl = document.querySelector("#bLecture");
  if (bl) bl.onclick = () => {
    const s = vedette();
    const r = reprises()[s.id];
    if (r) lire(s, r.ep); else ouvrir(s.id);
  };
  const bListe = document.querySelector("#bListe");
  if (bListe) bListe.onclick = () => {
    const s = vedette();
    const ajoute = basculerFavori(s.id);
    bListe.textContent = ajoute ? "✓ Ma liste" : "+ Ma liste";
    toast(ajoute ? s.t + " ajouté à ta liste" : s.t + " retiré de ta liste");
    if (vue === "liste") rafraichir();
  };
}

function contenu() { return document.querySelector("#contenu"); }

function rafraichir() {
  const c = contenu();
  if (!c) return;
  c.innerHTML = contenuHTML();
  brancherContenu();
  brancherFocus(true);
}

function rendre(nouvelleVue) {
  if (nouvelleVue) vue = nouvelleVue;
  app().innerHTML = `
    <div class="nav" data-rangee>
      <div class="logo">${LOGO}HAMZA TV</div>
      <div class="pilules">
        ${[["tendances", "Tendances"], ["accueil", "Accueil"], ["animes", "Animés"], ["series", "Séries"], ["films", "Films"], ["liste", "Ma liste"]]
          .map(([cle, nom]) => `<button class="pilule f ${vue === cle ? "on" : ""}" data-vue="${cle}">${nom}</button>`)
          .join("")}
      </div>
      <div class="zone-recherche">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line></svg>
        <input id="q" class="f" type="search" inputmode="search" autocomplete="off" spellcheck="false"
               placeholder="Rechercher…" aria-label="Rechercher une série" value="${filtre.replace(/"/g, "&quot;")}">
      </div>
    </div>
    <div id="contenu">${contenuHTML()}</div>`;

  document.querySelectorAll("[data-vue]").forEach(el => {
    el.onclick = () => { filtre = ""; rendre(el.dataset.vue); };
  });
  const champ = document.querySelector("#q");
  champ.addEventListener("input", () => { filtre = champ.value; rafraichir(); champ.focus(); });
  champ.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); champ.blur(); } });

  brancherContenu();
  brancherFocus();
}

function accueil() { filtre = ""; rendre("accueil"); }

function ouvrir(id) {
  const item = CATALOGUE.series.find(s => s.id === id);
  if (!item) return;
  if (estFilm(item)) {
    const num = Object.keys(item.episodes)[0];
    lire(item, num);
  } else {
    listeEpisodes(item);
  }
}

/* ---------- liste des épisodes ---------- */
let itemCourant = null;

let saisonAffichee = null;

function nomDeSaison(item, saison) {
  return (item.saisonNoms || {})[saison] || ("Saison " + saison);
}

function listeEpisodes(item, saisonDemandee) {
  itemCourant = item;
  const nums = Object.keys(item.episodes).map(Number).sort((a, b) => a - b);

  const parSaison = new Map();
  nums.forEach(n => {
    const saison = (item.saisonDe || {})[n] || 1;
    if (!parSaison.has(saison)) parSaison.set(saison, []);
    parSaison.get(saison).push(n);
  });
  const saisons = [...parSaison.keys()].sort((a, b) => a - b);

  const r = reprises()[item.id];
  const saisonReprise = r ? ((item.saisonDe || {})[r.ep] || 1) : null;
  saisonAffichee = saisons.includes(saisonDemandee) ? saisonDemandee : (saisonReprise || saisons[0]);

  app().innerHTML = `
    <button id="retour" class="retour-coin f" aria-label="Retour">‹</button>
    <div class="fiche">
      <div class="fiche-tete">
        <img class="affiche-fiche" src="${item.affiche}" alt="">
        <div class="fiche-infos">
          <h1>${item.t}</h1>
          <p>${item.s}</p>
          ${r ? `<p class="reprise">Tu en étais à ${nomDeSaison(item, saisonReprise)} · épisode ${(item.numero || {})[r.ep] || r.ep}</p>` : ""}
          <div class="fiche-actions" data-rangee>
            <button id="bReprendre" class="bouton fort f">▶ ${r ? "Reprendre" : "Commencer"}</button>
            <button id="favori" class="bouton f">${estFavori(item.id) ? "✓ Ma liste" : "+ Ma liste"}</button>
          </div>
        </div>
      </div>
      <div class="onglets-saison" data-rangee id="onglets"></div>
      <div id="zone-episodes"></div>
    </div>`;

  const onglets = document.querySelector("#onglets");
  const zone = document.querySelector("#zone-episodes");

  const peindreSaison = () => {
    onglets.innerHTML = saisons.map(s =>
      `<button class="onglet-saison f ${s === saisonAffichee ? "on" : ""}" data-saison="${s}">${nomDeSaison(item, s)}
        <small>${(parSaison.get(s) || []).length}</small></button>`).join("");

    const liste = parSaison.get(saisonAffichee) || [];
    zone.innerHTML = `
      <div class="titre-saison">${nomDeSaison(item, saisonAffichee)}
        <small>${liste.length} épisode${liste.length > 1 ? "s" : ""}</small></div>
      <div class="episodes" data-rangee>
        ${liste.map(n => `<div class="ep" data-ep="${n}">${(item.numero || {})[n] || n}<small>ÉPISODE</small></div>`).join("")}
      </div>`;

    onglets.querySelectorAll("[data-saison]").forEach(el => {
      el.onclick = () => {
        const s = Number(el.dataset.saison);
        if (s === saisonAffichee) return;
        saisonAffichee = s;
        peindreSaison();
        const actif = onglets.querySelector(".onglet-saison.on");
        if (actif) { mettreFocus(actif); actif.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); }
      };
    });
    zone.querySelectorAll("[data-ep]").forEach(el => el.onclick = () => lire(itemCourant, el.dataset.ep));
  };

  document.querySelector("#retour").onclick = accueil;
  document.querySelector("#favori").onclick = (ev) => {
    const ajoute = basculerFavori(item.id);
    ev.currentTarget.textContent = ajoute ? "✓ Ma liste" : "+ Ma liste";
    toast(ajoute ? item.t + " ajouté à ta liste" : item.t + " retiré de ta liste");
  };
  document.querySelector("#bReprendre").onclick = () => {
    const depart = r ? r.ep : String(nums[0]);
    lire(item, depart);
  };

  peindreSaison();
  brancherFocus();
}

/* ---------- lecteur ---------- */
/* On lit nous-mêmes le flux direct du lecteur (il autorise notre domaine).
   Le lecteur raconte toujours ce qu'il fait et bascule seul en secours,
   parce que certaines TV n'affichent jamais le flux HD. */
const LIMITE_ATTENTE = 14; // secondes avant de passer en mode de secours

/* Ce que cette télé sait faire : affiche a l'ecran quand ça bloque,
   ça evite de deviner pourquoi un flux ne demarre pas. */
function capacitesTele() {
  const ua = navigator.userAgent || "";
  const chrome = (ua.match(/(?:Chrome|CrOS)\/(\d+)/) || [])[1];
  const android = (ua.match(/Android\s+([\d.]+)/) || [])[1];
  const v = document.createElement("video");
  const oui = (t) => (v.canPlayType(t) ? "oui" : "non");
  return {
    moteur: (chrome ? "Chrome " + chrome : "navigateur inconnu") + (android ? " · Android " + android : ""),
    mse: window.MediaSource ? "oui" : "non",
    hls: window.Hls ? "oui" : "non",
    hlsNatif: oui("application/vnd.apple.mpegurl"),
    h264: oui('video/mp4; codecs="avc1.42E01E"')
  };
}

function ligneDiag(incident) {
  const c = capacitesTele();
  return [c.moteur, "MSE " + c.mse, "hls.js " + c.hls, "H.264 " + c.h264,
          incident ? "blocage : " + incident : ""].filter(Boolean).join(" · ");
}

async function fluxDirect(embed) {
  try {
    const ctrl = new AbortController();
    const garde = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch(embed, { cache: "no-store", signal: ctrl.signal });
    clearTimeout(garde);
    if (!r.ok) return null;
    const texte = await r.text();
    const m = texte.match(/https?:\/\/[^"'\\\s]+\.m3u8[^"'\\\s]*/);
    return m ? m[0].replace(/\\\//g, "/") : null;
  } catch (e) { return null; }
}

/* uqload : la page est obfusquee et refuse les appels directs (pas d'en-tete CORS).
   On la lit via un relais public, on deballe le lecteur, on en sort le flux HLS. */
function deballer(bloc) {
  const m = bloc.match(/eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]*?\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)/);
  if (!m) return null;
  const paquet = m[1], base = parseInt(m[2], 10), mots = m[4].split('|');
  const CHIFFRES = "0123456789abcdefghijklmnopqrstuvwxyz";
  return paquet.replace(/\b[0-9a-z]+\b/g, (mot) => {
    let n = 0;
    for (const c of mot) {
      const i = CHIFFRES.indexOf(c);
      if (i < 0 || i >= base) return mot;
      n = n * base + i;
    }
    return (n < mots.length && mots[n]) ? mots[n] : mot;
  });
}

async function fluxUqload(embed) {
  try {
    const ctrl = new AbortController();
    const garde = setTimeout(() => ctrl.abort(), 16000);
    const r = await fetch("https://api.allorigins.win/get?url=" + encodeURIComponent(embed),
                          { cache: "no-store", signal: ctrl.signal });
    clearTimeout(garde);
    if (!r.ok) return null;
    const enveloppe = await r.json().catch(() => null);
    const texte = (enveloppe && enveloppe.contents) || "";
    const bloc = texte.match(/eval\(function\(p,a,c,k,e,[dr]\)[\s\S]*?\.split\('\|'\)\)/);
    if (!bloc) return null;
    const clair = deballer(bloc[0]);
    if (!clair) return null;
    const m = clair.match(/https?:\/\/[^"'\\\s]+\.m3u8[^"'\\\s]*/);
    return m ? m[0].replace(/\\\//g, "/") : null;
  } catch (e) { return null; }
}

function estYoutube(url) { return /youtu\.?be/.test(url); }

/* Un episode peut pointer vers plusieurs sources : la premiere qui repond est jouee,
   et si elle lache en cours de lecture l'app passe a la suivante toute seule. */
function sourcesDe(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  return v ? [v] : [];
}

function formaterTemps(secondes) {
  const t = Math.max(0, Math.floor(secondes || 0));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), c = t % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(c).padStart(2, "0");
}

async function lire(item, num) {
  const url = lienEpisode(item, num);
  if (!url) return;
  const urlDirecte = Array.isArray(url) ? url[0] : url;
  noterReprise(item, num);

  const nums = Object.keys(item.episodes).map(Number).sort((a, b) => a - b);
  const rang = nums.indexOf(Number(num));
  const suivant = rang >= 0 && rang < nums.length - 1 ? String(nums[rang + 1]) : null;
  const sai = (item.saisonDe || {})[num];
  const nAffiche = (item.numero || {})[num] || num;
  const sousTitre = estFilm(item) ? "Film · version française"
    : (sai ? "Saison " + sai + " · Épisode " + nAffiche : "Épisode " + nAffiche);

  const d = document.createElement("div");
  d.className = "lecteur";
  d.innerHTML = `
    <div class="zone">
      <div class="attente" id="attente"><div class="rond"></div><span id="etape">Connexion…</span></div>
      <div class="flash" id="flash"></div>
      <div class="ui" id="ui">
        <div class="haut">
          <button class="retour-lecteur" id="fermer" aria-label="Retour">‹</button>
          <div class="titres"><h1>${item.t}</h1><p>${sousTitre}</p></div>
          <div class="marque">${LOGO}<span>HAMZA TV</span></div>
        </div>
        <div class="bas">
          <div class="barre-video" id="barreVideo"><div class="tampon" id="tampon"></div><div class="remplissage" id="remplissage"></div><div class="point" id="point"></div></div>
          <div class="temps"><span id="tempsActuel">0:00</span><span id="tempsReste">−0:00</span></div>
          <div class="boutons" id="boutons"></div>
        </div>
      </div>
      <div class="avis" hidden><span id="avisTexte"></span><button id="bHd">Réessayer</button></div>
    </div>`;
  document.body.appendChild(d);

  const zone = d.querySelector(".zone");
  const ui = d.querySelector("#ui");
  const attente = d.querySelector("#attente");
  let incident = "";
  const etape = d.querySelector("#etape");
  const avis = d.querySelector(".avis");
  const avisTexte = d.querySelector("#avisTexte");
  const flashEl = d.querySelector("#flash");
  const barreVideo = d.querySelector("#barreVideo");
  const remplissage = d.querySelector("#remplissage");
  const point = d.querySelector("#point");
  const tampon = d.querySelector("#tampon");
  const tempsActuel = d.querySelector("#tempsActuel");
  const tempsReste = d.querySelector("#tempsReste");
  const boiteBoutons = d.querySelector("#boutons");

  let hls = null, video = null, iframe = null, secondes = 0, compteur = null, minuteurUi = null, flashMinuteur = null;
  let rangee = 1, colonne = 0;
  const boutons = [];

  /* ---------- plein écran ---------- */
  const plein = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const entrerPleinEcran = () => {
    if (plein()) return;
    const cible = document.documentElement;
    const f = cible.requestFullscreen || cible.webkitRequestFullscreen;
    if (f) { try { const r = f.call(cible); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  };
  const sortirPleinEcran = () => {
    if (!plein()) return;
    const f = document.exitFullscreen || document.webkitExitFullscreen;
    if (f) { try { const r = f.call(document); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  };
  const basculerPleinEcran = () => {
    const plein = document.fullscreenElement || document.webkitFullscreenElement;
    if (plein) {
      (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
      quitterImmersif();
    } else {
      const racine = document.documentElement;
      const demande = racine.requestFullscreen || racine.webkitRequestFullscreen;
      if (demande) { try { demande.call(racine); } catch (e) {} }
      devenirImmersif();
    }
  };

  /* si la TV sort du plein ecran par son propre bouton, on remet le bandeau complet */
  const suivrePleinEcran = () => {
    const plein = document.fullscreenElement || document.webkitFullscreenElement;
    if (plein) devenirImmersif(); else quitterImmersif();
  };
  document.addEventListener("fullscreenchange", suivrePleinEcran);
  document.addEventListener("webkitfullscreenchange", suivrePleinEcran);
  d.suivrePleinEcran = () => {
    document.removeEventListener("fullscreenchange", suivrePleinEcran);
    document.removeEventListener("webkitfullscreenchange", suivrePleinEcran);
  };

  let phase = "Connexion";
  const arreterCompteur = () => { clearInterval(compteur); compteur = null; };
  const demarrerCompteur = () => {
    arreterCompteur();
    secondes = 0;
    etape.textContent = phase + "… 0 s";
    compteur = setInterval(() => {
      secondes++;
      if (secondes >= LIMITE_ATTENTE) {
        arreterCompteur();
        if (!incident) incident = "aucune image en " + LIMITE_ATTENTE + " s";
        secours("La vidéo n'a pas démarré en " + LIMITE_ATTENTE + " s sur cette télé.");
        return;
      }
      if (etape.isConnected) etape.textContent = phase + "… " + secondes + " s";
    }, 1000);
  };

  /* ---------- bandeau de commande ---------- */
  const reveiller = () => {
    ui.classList.remove("cache-ui");
    clearTimeout(minuteurUi);
    /* le bandeau s'efface tout seul, meme en pause : en plein ecran il ne reste que la video */
    minuteurUi = setTimeout(() => { if (avis.hidden) ui.classList.add("cache-ui"); }, 4500);
  };

  /* plein ecran : aucune commande a l'ecran, juste la video.
     une touche ou un clic fait revenir le bandeau quelques secondes. */
  let immersif = false;
  const devenirImmersif = () => {
    immersif = true;
    d.classList.add("immersif");
    construireBoutons();
    ui.classList.add("cache-ui");
    clearTimeout(minuteurUi);
  };
  const quitterImmersif = () => {
    immersif = false;
    d.classList.remove("immersif");
    construireBoutons();
    reveiller();
  };

  const dessinerTemps = () => {
    const total = (video && isFinite(video.duration) && video.duration > 0) ? video.duration : 0;
    const actuel = video ? video.currentTime || 0 : 0;
    const pct = total ? Math.min(100, (actuel / total) * 100) : 0;
    remplissage.style.width = pct + "%";
    point.style.left = pct + "%";
    tempsActuel.textContent = formaterTemps(actuel);
    tempsReste.textContent = "−" + formaterTemps(total ? total - actuel : 0);
    let tamponPct = pct;
    try {
      if (video && video.buffered && video.buffered.length) {
        tamponPct = Math.min(100, (video.buffered.end(video.buffered.length - 1) / (total || 1)) * 100);
      }
    } catch (e) {}
    tampon.style.width = Math.max(pct, tamponPct) + "%";
  };

  const sauter = (delta) => {
    if (!video) return;
    video.currentTime = Math.max(0, Math.min((video.duration || 1e9), video.currentTime + delta));
    dessinerTemps();
    eclat((delta > 0 ? "+" : "−") + Math.abs(delta) + " s");
    reveiller();
  };

  const basculerLecture = () => {
    if (!video) return;
    if (video.paused) { video.play().catch(() => {}); eclat("▶"); }
    else { video.pause(); eclat("❚❚"); }
    majBoutons();
    reveiller();
  };

  /* qualite : seulement si le flux expose plusieurs niveaux */
  const hauteurs = () => {
    if (!hls || !hls.levels || !hls.levels.length) return [];
    const l = hls.levels.map(x => x.height).filter(Boolean);
    return [...new Set(l)].sort((a, b) => b - a);
  };
  let qualiteAuto = true, qualiteIndex = 0;
  const appliquerQualite = () => {
    const h = hauteurs();
    if (!h.length) return;
    if (qualiteAuto) { hls.currentLevel = -1; return; }
    const cible = h[Math.min(qualiteIndex, h.length - 1)];
    const i = hls.levels.findIndex(l => l.height === cible);
    if (i >= 0) hls.currentLevel = i;
  };

  const construireBoutons = () => {
    boiteBoutons.innerHTML = "";
    boutons.length = 0;
    const ajouter = (cle, texte, principal) => {
      const b = document.createElement("button");
      b.className = "bouton-lecteur" + (principal ? " principal" : "");
      b.dataset.cle = cle;
      b.textContent = texte;
      b.onclick = () => { activer(cle); };
      boiteBoutons.appendChild(b);
      boutons.push(b);
      return b;
    };
    ajouter("moins", "−10 s");
    ajouter("lecture", "", true);
    ajouter("plus", "+10 s");
    if (immersif) {
      /* en plein ecran : rien d'autre que la video et les commandes de base */
      ajouter("plein", "⛶ Réduire");
    } else {
      if (suivant) ajouter("suivant", "Épisode suivant ›");
      if (hauteurs().length > 1) ajouter("qualite", "Qualité : auto");
      ajouter("plein", "⛶ Plein écran");
    }
    majBoutons();
  };

  const majBoutons = () => {
    boutons.forEach(b => {
      if (b.dataset.cle === "lecture") b.textContent = (video && !video.paused) ? "❚❚ Pause" : "▶ Lecture";
      if (b.dataset.cle === "qualite") {
        const h = hauteurs();
        b.textContent = "Qualité : " + (qualiteAuto ? "auto" : (h[Math.min(qualiteIndex, h.length - 1)] + "p"));
      }
    });
  };

  const activer = (cle) => {
    if (cle === "moins") sauter(-10);
    else if (cle === "plus") sauter(10);
    else if (cle === "lecture") basculerLecture();
    else if (cle === "suivant") { if (suivant) { const n = suivant; fermer(); lire(item, n); } }
    else if (cle === "qualite") {
      const h = hauteurs();
      if (qualiteAuto) { qualiteAuto = false; qualiteIndex = 0; }
      else if (qualiteIndex < h.length - 1) { qualiteIndex++; }
      else { qualiteAuto = true; }
      appliquerQualite();
      majBoutons();
      eclat(qualiteAuto ? "Qualité auto" : h[Math.min(qualiteIndex, h.length - 1)] + "p");
    }
    else if (cle === "plein") basculerPleinEcran();
    reveiller();
  };

  const peindreFocus = () => {
    d.querySelectorAll(".foc").forEach(e => e.classList.remove("foc"));
    if (rangee === 0) d.querySelector("#fermer").classList.add("foc");
    else if (rangee === 1) barreVideo.classList.add("foc");
    else if (boutons[colonne]) boutons[colonne].classList.add("foc");
  };

  /* ---------- lecture ---------- */
  const fermer = () => {
    arreterCompteur();
    clearTimeout(minuteurUi);
    if (d.chien) clearInterval(d.chien);
    try { hls && hls.destroy(); } catch (e) {}
    if (video) { try { video.pause(); } catch (e) {} }
    sortirPleinEcran();
    d.remove();
  };
  d.fermer = fermer;
  d.basculerPleinEcran = basculerPleinEcran;
  d.querySelector("#fermer").onclick = fermer;
  d.querySelector("#bHd").onclick = () => demarrer();

  const retirerVideo = () => {
    if (d.chien) { clearInterval(d.chien); d.chien = null; }
    try { hls && hls.destroy(); } catch (e) {}
    hls = null;
    if (video) { try { video.pause(); } catch (e) {} if (video.parentNode) video.remove(); }
    video = null; d.video = null;
  };

  let secours = null;

  const poserIframe = (message) => {
    if (iframe) return;
    arreterCompteur();
    retirerVideo();
    iframe = document.createElement("iframe");
    iframe.src = urlDirecte;
    iframe.allowFullscreen = true;
    iframe.setAttribute("allow", "autoplay; encrypted-media; fullscreen");
    iframe.setAttribute("referrerpolicy", "origin");
    zone.insertBefore(iframe, ui);
    attente.style.display = "none";
    if (message) { avisTexte.textContent = message; avis.hidden = false; }
    construireBoutons();
  };

  const poserAvis = (message) => {
    arreterCompteur();
    retirerVideo();
    attente.style.display = "none";
    avisTexte.textContent = message;
    avis.hidden = false;
    construireBoutons();
  };

  secours = (motif) => (item.type === "natif" ? poserAvis(motif) : poserIframe(motif));

  const demarrer = async () => {
    retirerVideo();
    if (iframe) { iframe.remove(); iframe = null; }
    avis.hidden = true;
    attente.style.display = "flex";
    phase = "Connexion";
    demarrerCompteur();
    entrerPleinEcran();

    const sources = item.type === "natif" ? sourcesDe(url) : sourcesDe(url);
    let rangSource = 0;
    const sourceSuivante = async () => {
      for (let i = rangSource; i < sources.length; i++) {
        const u = sources[i];
        const f = /\.m3u8|\.mp4/i.test(u) ? u
                : (/uqload/i.test(u) ? await fluxUqload(u) : await fluxDirect(u));
        if (f) { rangSource = i + 1; return f; }
      }
      return null;
    };
    const flux = sources.length ? await sourceSuivante() : null;
    if (!flux) {
      incident = "flux introuvable";
      poserIframe("Le flux direct est injoignable depuis cette télé.");
      return;
    }
    if (!d.isConnected) return;

    phase = "Préparation de la vidéo";
    if (etape.isConnected) etape.textContent = phase + "…";

    video = document.createElement("video");
    video.setAttribute("playsinline", "");
    video.preload = "auto";
    video.autoplay = true;
    zone.insertBefore(video, ui);
    d.video = video;

    let dernierTemps = -1, figeeDepuis = 0;
    const surveiller = () => {
      if (d.chien) { clearInterval(d.chien); d.chien = null; }
      if (!video) return;
      d.chien = setInterval(() => {
        if (!video || !video.isConnected) { clearInterval(d.chien); d.chien = null; return; }
        if (video.paused) { dernierTemps = video.currentTime; figeeDepuis = 0; return; }
        if (video.currentTime > dernierTemps + 0.15) { dernierTemps = video.currentTime; figeeDepuis = 0; return; }
        figeeDepuis += 2;
        if (figeeDepuis >= 12) {
          clearInterval(d.chien); d.chien = null;
          secours("La vidéo s'est figée sur cette télé.");
        }
      }, 2000);
    };
    d.surveiller = surveiller;

    video.addEventListener("timeupdate", dessinerTemps);
    video.addEventListener("loadedmetadata", dessinerTemps);
    window.__lecture = { etat: "en cours", incident: "" };
    video.addEventListener("playing", () => {
      window.__lecture = { etat: "ok", incident: "" };
      arreterCompteur();
      attente.style.display = "none";
      surveiller();
      majBoutons();
      reveiller();
    }, { once: true });
    video.addEventListener("pause", () => { majBoutons(); reveiller(); });


    if (item.type === "natif") {
      let essais = 0;
      const relancer = () => {
        if (!video || !video.isConnected) return;
        try { video.load(); video.play().catch(() => {}); } catch (e) {}
      };
      video.src = flux;
      video.addEventListener("error", () => {
        incident = "lecture native refusée (code " + ((video.error && video.error.code) || "?") + ")";
        window.__lecture = { etat: "echec", incident: incident };
          if (essais < 1) { essais++; setTimeout(relancer, 1200); return; }
        poserAvis("Cette télé n'arrive pas à lire ce format vidéo.");
      });
      video.play().catch(() => {});
    } else if (window.Hls && Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 30, backBufferLength: 30, startLevel: -1, capLevelToPlayerSize: true });
      let dejaBascule = false;
      hls.on(Hls.Events.ERROR, (evt, data) => {
        if (!data || !data.fatal) return;
        incident = "hls.js " + (data.details || "erreur");
        window.__lecture = { etat: "echec", incident: incident };
        if (!dejaBascule) {
          dejaBascule = true;
          sourceSuivante().then((autre) => {
            if (autre && hls) { rangSource--; hls.loadSource(autre); hls.startLoad(); return; }
            secours("Le flux HD a été refusé par cette télé.");
          });
          return;
        }
        secours("Le flux HD a été refusé par cette télé.");
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        construireBoutons();
        appliquerQualite();
        video.play().catch(() => {});
      });
      hls.loadSource(flux);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = flux;
      video.addEventListener("error", () => secours("Le flux HD n'est pas lisible ici."), { once: true });
      video.play().catch(() => {});
    } else {
      secours("Le lecteur vidéo intégré n'est pas disponible sur cette télé.");
    }
    construireBoutons();
  };

  /* barre de progression : clic et fleches */
  barreVideo.addEventListener("click", (ev) => {
    if (!video || !video.duration) return;
    const r = barreVideo.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
    video.currentTime = pct * video.duration;
    dessinerTemps();
    reveiller();
  });

  /* ---------- clavier et telecommande ---------- */
  d.gererTouche = (e) => {
    const K = e.key;
    const cache = ui.classList.contains("cache-ui");
    if (cache) {
      reveiller();
      if (K === "Enter" || K === " ") { e.preventDefault(); basculerLecture(); }
      else if (K === "Escape" || K === "Backspace") { e.preventDefault(); fermer(); }
      return;
    }
    if (K === "ArrowDown") { rangee = Math.min(2, rangee + 1); }
    else if (K === "ArrowUp") { rangee = Math.max(0, rangee - 1); }
    else if (K === "ArrowRight") {
      if (rangee === 1) sauter(10);
      else if (rangee === 2) colonne = Math.min(boutons.length - 1, colonne + 1);
    }
    else if (K === "ArrowLeft") {
      if (rangee === 1) sauter(-10);
      else if (rangee === 2) colonne = Math.max(0, colonne - 1);
    }
    else if (K === "Enter" || K === " ") {
      if (rangee === 2 && boutons[colonne]) boutons[colonne].click();
      else if (rangee === 1) basculerLecture();
      else fermer();
    }
    else if (K === "Escape" || K === "Backspace") { fermer(); return; }
    else if (K === "f" || K === "F") { basculerPleinEcran(); }
    else return;
    e.preventDefault();
    peindreFocus();
    reveiller();
  };

  d.addEventListener("mousemove", reveiller);
  d.addEventListener("click", (ev) => {
    if (ev.target.closest(".ui")) return;
    if (ui.classList.contains("cache-ui")) reveiller();
  });
  construireBoutons();
  peindreFocus();
  reveiller();
  demarrer();
}

let elemFocus = null;

function focusables() {
  return [...document.querySelectorAll(".f")].filter(e => e.offsetParent && !e.disabled);
}

function mettreFocus(el) {
  if (!el) return;
  elemFocus = el;
  document.querySelectorAll(".focus").forEach(e => e.classList.remove("focus"));
  el.classList.add("focus");
  try { el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); } catch (e) {}
}

function brancherFocus(garder) {
  const els = focusables();
  if (!els.length) { elemFocus = null; return; }
  if (garder && elemFocus && els.includes(elemFocus)) return mettreFocus(elemFocus);
  mettreFocus(els.find(e => e.classList.contains("carte-serie")) || els[0]);
}

/* le plus proche voisin dans la direction demandee : marche aussi bien
   pour les rangees horizontales que pour la grille des episodes */
function voisin(el, dx, dy) {
  const r0 = el.getBoundingClientRect();
  const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  let best = null, score = Infinity;
  for (const autre of focusables()) {
    if (autre === el) continue;
    const r = autre.getBoundingClientRect();
    const ax = r.left + r.width / 2, ay = r.top + r.height / 2;
    const vx = ax - cx, vy = ay - cy;
    if (dx && (dx > 0 ? vx < 12 : vx > -12)) continue;
    if (dx && Math.abs(vy) > r0.height * 1.7) continue;
    if (dy && (dy > 0 ? vy < 12 : vy > -12)) continue;
    if (dy && Math.abs(vx) > r0.width * 2.2) continue;
    const principal = dx ? Math.abs(vx) : Math.abs(vy);
    const secondaire = dx ? Math.abs(vy) : Math.abs(vx);
    const sc = principal + secondaire * 2.6;
    if (sc < score) { score = sc; best = autre; }
  }
  return best;
}

document.addEventListener("keydown", (e) => {
  const lecteur = document.querySelector(".lecteur");
  if (lecteur) {
    e.preventDefault();
    if (lecteur.gererTouche) lecteur.gererTouche(e);
    return;
  }

  const els = focusables(); if (!els.length) return;
  const champ = document.querySelector("#q");
  const surChamp = document.activeElement === champ;

  // une lettre tapee pendant qu'une vignette est selectionnee part dans la recherche
  if (!surChamp && e.key.length === 1 && !e.ctrlKey && !e.metaKey && champ) {
    champ.focus();
    return;
  }

  const cour = surChamp ? champ : (elemFocus && els.includes(elemFocus) ? elemFocus : els[0]);
  if (!elemFocus) mettreFocus(cour);

  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault();
    const suivant = voisin(cour, e.key === "ArrowRight" ? 1 : 0, e.key === "ArrowDown" ? 1 : 0);
    if (suivant) { if (surChamp && suivant.id !== "q") champ.blur(); mettreFocus(suivant); }
  }
  if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    e.preventDefault();
    const precedent = voisin(cour, e.key === "ArrowLeft" ? -1 : 0, e.key === "ArrowUp" ? -1 : 0);
    if (precedent) { if (surChamp && precedent.id !== "q") champ.blur(); mettreFocus(precedent); }
  }
  if (e.key === "Enter") {
    if (surChamp) { e.preventDefault(); champ.blur(); return; }
    e.preventDefault();
    if (cour) cour.click();
  }
  if (e.key === "Escape" || e.key === "Backspace") {
    if (surChamp) return;
    e.preventDefault();
    if (document.querySelector(".fiche")) accueil();
    else if (filtre) { filtre = ""; rendre("accueil"); }
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
  if (document.querySelector(".episodes") && itemCourant) {
    const frais = CATALOGUE.series.find(s => s.id === itemCourant.id);
    listeEpisodes(frais || itemCourant);
  } else {
    accueil();
  }
})();
