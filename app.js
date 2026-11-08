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

  if (vue === "series") {
    return `<div class="grille" data-rangee>${CATALOGUE.series.map(s => carteSerie(s)).join("")}</div>`;
  }

  if (vue === "liste") {
    const favs = CATALOGUE.series.filter(s => estFavori(s.id));
    return favs.length
      ? `<div class="grille" data-rangee>${favs.map(s => carteSerie(s)).join("")}</div>`
      : `<p class="vide">Ta liste est vide.<br><small>Sur une série, appuie sur « + Ma liste ».</small></p>`;
  }

  const v = vedette();
  const enCours = CATALOGUE.series.filter(s => reprises()[s.id]);
  const favs = CATALOGUE.series.filter(s => estFavori(s.id));
  const rangees = [];
  if (enCours.length) {
    rangees.push(`<div class="rangee"><h3>Reprendre la lecture</h3>
      <div class="rail" data-rangee>${enCours.map(s => carteSerie(s, { reprise: true })).join("")}</div></div>`);
  }
  rangees.push(`<div class="rangee"><h3>Toutes les séries</h3>
    <div class="rail" data-rangee>${CATALOGUE.series.map(s => carteSerie(s)).join("")}</div></div>`);
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
        <button class="pilule f ${vue === "accueil" ? "on" : ""}" data-vue="accueil">Accueil</button>
        <button class="pilule f ${vue === "series" ? "on" : ""}" data-vue="series">Séries</button>
        <button class="pilule f ${vue === "liste" ? "on" : ""}" data-vue="liste">Ma liste</button>
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

function listeEpisodes(item) {
  itemCourant = item;
  const nums = Object.keys(item.episodes).map(Number).sort((a, b) => a - b);
  const r = reprises()[item.id];
  app().innerHTML = `
    <div class="entete" data-rangee>
      <button id="retour" class="retour f" aria-label="Retour">←</button>
      <img src="${item.affiche}" alt="">
      <div class="titre"><b>${item.t}</b><small>${item.s} · ${nums.length} épisodes${r ? " · repris à l'épisode " + ((item.numero || {})[r.ep] || r.ep) : ""}</small></div>
      <button id="favori" class="retour f" aria-label="Ma liste">${estFavori(item.id) ? "✓" : "+"}</button>
    </div>
    <div class="episodes" data-rangee>
      ${nums.map(n => {
        const num = (item.numero || {})[n], sai = (item.saisonDe || {})[n];
        const grand = num || n, petit = sai ? "SAISON " + sai : "ÉPISODE";
        return `<div class="ep" data-ep="${n}">${grand}<small>${petit}</small></div>`;
      }).join("")}
    </div>`;
  document.querySelector("#retour").onclick = accueil;
  document.querySelector("#favori").onclick = (ev) => {
    const ajoute = basculerFavori(item.id);
    ev.currentTarget.textContent = ajoute ? "✓" : "+";
    toast(ajoute ? item.t + " ajouté à ta liste" : item.t + " retiré de ta liste");
  };
  document.querySelectorAll("[data-ep]").forEach(el => el.onclick = () => lire(itemCourant, el.dataset.ep));
  brancherFocus();
}

/* ---------- lecteur ---------- */
/* On lit nous-mêmes le flux direct du lecteur (il autorise notre domaine).
   Le lecteur raconte toujours ce qu'il fait et bascule seul en secours,
   parce que certaines TV n'affichent jamais le flux HD. */
const LIMITE_ATTENTE = 14; // secondes avant de passer en mode de secours

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

function estYoutube(url) { return /youtu\.?be/.test(url); }

function lire(item, num) {
  const url = lienEpisode(item, num);
  if (!url) return;
  noterReprise(item, num);
  const numAffiche = (item.numero || {})[num];
  const sai = (item.saisonDe || {})[num];
  const titre = item.t + (estFilm(item) ? "" : (sai ? " · S" + sai + " E" + numAffiche : " · Épisode " + num));

  const d = document.createElement("div");
  d.className = "lecteur";
  d.innerHTML = `
    <div class="zone">
      <div class="charge"><div class="rond"></div><span id="etape">Connexion au lecteur…</span></div>
      <div class="avis" hidden><span id="avisTexte"></span><button id="bHd">Réessayer en HD</button></div>
    </div>
    <div class="barre">
      <button id="fermer" aria-label="Fermer">✕</button>
      <b>${titre}</b>
      <div class="commandes">
        <button data-rec="-10" aria-label="Reculer de 10 secondes">−10 s</button>
        <button data-lecture aria-label="Lecture ou pause">❚❚</button>
        <button data-rec="10" aria-label="Avancer de 10 secondes">+10 s</button>
      </div>
    </div>`;
  document.body.appendChild(d);

  const zone = d.querySelector(".zone");
  const barre = d.querySelector(".barre");
  const charge = d.querySelector(".charge");
  const etape = d.querySelector("#etape");
  const avis = d.querySelector(".avis");
  const avisTexte = d.querySelector("#avisTexte");
  let hls = null, video = null, iframe = null, secondes = 0, compteur = null, barreMinuteur = null;

  const arreterCompteur = () => { clearInterval(compteur); compteur = null; };

  const fermer = () => {
    arreterCompteur();
    if (d.chien) clearInterval(d.chien);
    clearTimeout(barreMinuteur);
    try { hls && hls.destroy(); } catch (e) {}
    if (video) { try { video.pause(); } catch (e) {} }
    d.remove();
  };
  d.fermer = fermer;
  d.querySelector("#fermer").onclick = fermer;

  const montrerBarre = () => {
    barre.classList.remove("cache");
    clearTimeout(barreMinuteur);
    barreMinuteur = setTimeout(() => barre.classList.add("cache"), 4500);
  };
  d.montrerBarre = montrerBarre;
  d.addEventListener("mousemove", montrerBarre);
  montrerBarre();

  const poserBoutons = () => {
    d.querySelectorAll("[data-rec]").forEach(b => b.onclick = () => {
      if (!d.video) return;
      d.video.currentTime = Math.max(0, d.video.currentTime + Number(b.dataset.rec));
    });
    d.querySelector("[data-lecture]").onclick = () => {
      if (!d.video) return;
      d.video.paused ? d.video.play() : d.video.pause();
    };
  };
  poserBoutons();

  const retirerVideo = () => {
    if (d.chien) { clearInterval(d.chien); d.chien = null; }
    try { hls && hls.destroy(); } catch (e) {}
    hls = null;
    if (video) { try { video.pause(); } catch (e) {} if (video.parentNode) video.remove(); }
    video = null; d.video = null;
  };

  const poserIframe = (message) => {
    if (iframe) return;
    arreterCompteur();
    retirerVideo();
    if (charge.parentNode) charge.remove();
    iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.allowFullscreen = true;
    iframe.setAttribute("allow", "autoplay; encrypted-media; fullscreen");
    iframe.setAttribute("referrerpolicy", "origin");
    zone.appendChild(iframe);
    if (message) { avisTexte.textContent = message; avis.hidden = false; }
  };

  const poserAvis = (message) => {
    arreterCompteur();
    retirerVideo();
    if (charge.parentNode) charge.remove();
    avisTexte.textContent = message;
    avis.hidden = false;
  };

  let phase = "Connexion au lecteur";
  const demarrerCompteur = () => {
    arreterCompteur();
    secondes = 0;
    compteur = setInterval(() => {
      secondes++;
      if (secondes >= LIMITE_ATTENTE) {
        arreterCompteur();
        (item.type === "natif" ? poserAvis : poserIframe)("La vidéo n'a pas démarré en " + LIMITE_ATTENTE + " s sur cette télé.");
        return;
      }
      if (etape.isConnected && charge.isConnected) {
        etape.textContent = phase + "… " + secondes + " s";
      }
    }, 1000);
    if (etape.isConnected && charge.isConnected) etape.textContent = phase + "… 0 s";
  };

  d.querySelector("#bHd").onclick = () => { demarrer(); };

  const demarrer = async () => {
    retirerVideo();
    if (iframe) { iframe.remove(); iframe = null; }
    avis.hidden = true;
    if (!charge.parentNode) zone.appendChild(charge);
    phase = "Connexion au lecteur";
    demarrerCompteur();

    const flux = item.type === "natif" ? url : await fluxDirect(url);
    if (!flux) { poserIframe("Le flux direct est injoignable depuis cette télé. Mode de secours activé."); return; }
    if (!d.isConnected) return;

    phase = "Préparation de la vidéo";
    if (etape.isConnected) etape.textContent = phase + "…";
    video = document.createElement("video");
    video.setAttribute("playsinline", "");
    video.preload = "auto";
    zone.insertBefore(video, charge);
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
          if (charge.parentNode) charge.remove();
          poserIframe("La vidéo s'est figée sur cette télé. Mode de secours activé.");
        }
      }, 2000);
    };
    d.surveiller = surveiller;

    video.addEventListener("playing", () => {
      arreterCompteur();
      if (charge.parentNode) charge.remove();
      surveiller();
    }, { once: true });

    const secours = (motif) => (item.type === "natif" ? poserAvis(motif) : poserIframe(motif));

    if (item.type === "natif") {
      video.src = flux;
      video.addEventListener("error", () => poserAvis("Cette télé n'arrive pas à lire ce format vidéo."), { once: true });
      video.play().catch(() => {});
    } else if (window.Hls && Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 30, backBufferLength: 30, startLevel: -1, capLevelToPlayerSize: true });
      hls.on(Hls.Events.ERROR, (evt, data) => { if (data && data.fatal) secours("Le flux HD a été refusé par cette télé. Mode de secours activé."); });
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
      hls.loadSource(flux);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = flux;
      video.addEventListener("error", () => secours("Le flux HD n'est pas lisible ici. Mode de secours activé."), { once: true });
      video.play().catch(() => {});
    } else {
      secours("Le lecteur vidéo intégré n'est pas disponible sur cette télé. Mode de secours activé.");
    }
  };

  if (estYoutube(url)) { poserIframe(null); montrerBarre(); return; }
  demarrer();
}

/* ---------- télécommande et clavier ---------- */
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
    const v = lecteur.video;
    lecteur.montrerBarre && lecteur.montrerBarre();
    if (e.key === "Escape" || e.key === "Backspace") { lecteur.fermer ? lecteur.fermer() : lecteur.remove(); return; }
    if (e.key === "ArrowLeft" && v) v.currentTime = Math.max(0, v.currentTime - 10);
    if (e.key === "ArrowRight" && v) v.currentTime = v.currentTime + 10;
    if (e.key === "ArrowUp" && v) v.volume = Math.min(1, v.volume + 0.1);
    if (e.key === "ArrowDown" && v) v.volume = Math.max(0, v.volume - 0.1);
    if (e.key === "Enter" || e.key === " ") { if (v) v.paused ? v.play() : v.pause(); }
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
    if (document.querySelector(".episodes")) accueil();
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
