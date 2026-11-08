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

/* ---------- accueil ---------- */
function accueil() {
  app().innerHTML = `
    <div class="accueil">
      <div class="titre-app">
        <img src="assets/icon-192.png" alt="Hamza TV">
        <div><b>Hamza TV</b><span>Version française · v7.1</span></div>
      </div>
      <div class="recherche">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line></svg>
        <input id="q" type="search" inputmode="search" autocomplete="off" spellcheck="false"
               placeholder="Rechercher un film, une série…" aria-label="Rechercher">
      </div>
      <div class="compte" id="compte"></div>
      <div class="series" id="grille"></div>
    </div>`;

  const champ = document.querySelector("#q");
  champ.value = filtre;
  champ.addEventListener("input", () => { filtre = champ.value; grille(); });
  champ.addEventListener("keydown", (e) => { if (e.key === "Enter") champ.blur(); });

  grille();
  brancherFocus();
}

let filtre = "";

function grille() {
  const box = document.querySelector("#grille");
  if (!box) return;
  const q = sansAccent(filtre);
  const mots = q ? q.split(" ").filter(Boolean) : [];
  const cibleDe = (s) => sansAccent(s.t + " " + (s.s || "") + " " + (s.alias || ""));
  // d'abord la correspondance exacte, puis, si rien ne sort, on tolere une faute
  let liste = CATALOGUE.series.filter(s => {
    if (!mots.length) return true;
    const cible = cibleDe(s);
    return mots.every(m => cible.includes(m));
  });
  if (!liste.length && mots.length) {
    // les petits mots ("du", "de", "le") ne doivent pas bloquer la recherche
    const utiles = mots.filter(m => m.length > 2);
    const garde = utiles.length ? utiles : mots;
    liste = CATALOGUE.series.filter(s => garde.every(m => ressemble(cibleDe(s), m)));
  }

  const compte = document.querySelector("#compte");
  if (compte) {
    compte.textContent = mots.length
      ? (liste.length === 1 ? "1 résultat" : liste.length + " résultats")
      : "";
  }

  if (!liste.length) {
    box.innerHTML = `<p class="vide">Rien trouvé pour « ${filtre.replace(/[<>&]/g, "")} ».<br><small>Dis-moi le titre et je l'ajoute.</small></p>`;
    brancherFocus(true);
    return;
  }

  box.innerHTML = liste.map(s => {
    const film = estFilm(s);
    const n = nbEpisodes(s);
    return `
      <button class="carte-serie" data-id="${s.id}">
        <div class="visuel">
          <img src="${s.affiche}" alt="${s.t}" loading="lazy">
          <div class="voile"></div>
          <div class="lecture"></div>
          ${film ? "" : `<span class="nb">${n} ép.</span>`}
        </div>
        <div class="infos">
          <b>${s.t}</b>
          <small>${film ? "Film" : s.s}</small>
          <span class="vf">${s.badge || (film ? "VF · sans publicité" : "VF")}</span>
        </div>
      </button>`;
  }).join("");

  box.querySelectorAll("[data-id]").forEach(el => {
    el.onclick = () => ouvrir(el.dataset.id);
  });
  brancherFocus();
}

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
  app().innerHTML = `
    <div class="entete">
      <button id="retour" aria-label="Retour">←</button>
      <div><b>${item.t}</b><small>${item.s} · ${nums.length} épisodes</small></div>
    </div>
    <div class="episodes">
      ${nums.map(n => {
        const num = (item.numero || {})[n], sai = (item.saisonDe || {})[n];
        const grand = num || n, petit = sai ? "SAISON " + sai : "ÉPISODE";
        return `<div class="ep" data-ep="${n}">${grand}<small>${petit}</small></div>`;
      }).join("")}
    </div>`;
  document.querySelector("#retour").onclick = accueil;
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

  let phase = "Connexion au lecteur";
  const demarrerCompteur = () => {
    arreterCompteur();
    secondes = 0;
    compteur = setInterval(() => {
      secondes++;
      if (secondes >= LIMITE_ATTENTE) {
        arreterCompteur();
        poserIframe("Cette télé n'a pas démarré la vidéo HD en " + LIMITE_ATTENTE + " s. Mode de secours activé.");
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

    const flux = await fluxDirect(url);
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

    const secours = (motif) => poserIframe(motif);

    if (window.Hls && Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 30, backBufferLength: 30, startLevel: 0, capLevelToPlayerSize: true });
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
let pos = 0;
function focusables() {
  return [...document.querySelectorAll("#q, .carte-serie, .ep, #retour")].filter(e => e.offsetParent);
}
function brancherFocus(garderIndex) {
  const els = focusables(); if (!els.length) return;
  if (!garderIndex) pos = 0;
  pos = Math.min(pos, els.length - 1);
  els.forEach(e => e.classList.remove("focus"));
  els[pos].classList.add("focus");
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

  const bouger = (d) => {
    els[pos] && els[pos].classList.remove("focus");
    pos = (pos + d + els.length) % els.length;
    els[pos].classList.add("focus");
    els[pos].scrollIntoView({ block: "center", behavior: "smooth" });
    if (els[pos].id !== "q" && surChamp) champ.blur();
  };

  // une lettre tapée pendant qu'une carte est sélectionnée part dans la recherche
  if (!surChamp && e.key.length === 1 && !e.ctrlKey && !e.metaKey && champ) {
    champ.focus();
    return;
  }
  if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); bouger(1); }
  if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); bouger(-1); }
  if (e.key === "Enter") {
    if (surChamp) { e.preventDefault(); champ.blur(); return; }
    e.preventDefault(); els[pos] && els[pos].click();
  }
  if (e.key === "Escape" || e.key === "Backspace") {
    if (surChamp) return;
    if (document.querySelector(".episodes")) { e.preventDefault(); accueil(); }
  }
});

/* ---------- démarrage ---------- */
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
