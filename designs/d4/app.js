/* IIFE : évite le conflit de noms avec le moteur partagé. */
(function(){
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
/* Maïga Market — interactions.
   Reprises du prototype du propriétaire, corrigées :
   - anneau 3D : inertie réelle, clavier, clic sur une carte, pause hors écran et en onglet caché
   - particules : plafonnées, calcul des liens limité au voisinage, arrêt quand l'onglet est masqué
   - recherche : filtrage réel avec suggestions cliquables
   - compteurs : correction du signe « + » qui s'affichait au hasard
   - fiche produit, panier et avis honnêtes ajoutés
*/


/* ---------------- anneau 3D ---------------- */
function anneau() {
  const zone = $("#anneau-zone");
  const ring = $("#anneau");
  if (!zone || !ring) return;

  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* l'anneau ne garde que les douze univers les mieux garnis : au-delà, les cartes
     se chevauchent. La grille complète, elle, affiche tout. */
  const MONTRES_ANNEAU = 12;
  const classes = UNIVERS.slice().sort((x, y) => PRODUITS.filter(p => p.cat === y.id).length - PRODUITS.filter(p => p.cat === x.id).length).slice(0, MONTRES_ANNEAU);
  const cartes = classes.map(u => {
    const prix = Math.min(...PRODUITS.filter(p => p.cat === u.id).map(p => p.prix));
    const c = document.createElement("button");
    c.className = "anneau-carte";
    c.type = "button";
    c.setAttribute("role", "listitem");
    c.dataset.univ = u.id;
    c.innerHTML = `<b>${u.nom}</b><span>${u.sous.split(",")[0]}</span><i>${fcfa(prix)}</i>`;
    c.onclick = () => {
      const cible = $("#grille");
      if (cible) cible.scrollIntoView({ behavior: "smooth", block: "start" });
      const onglet = $(`.onglet[data-univ="${u.id}"]`);
      if (onglet) onglet.click();
    };
    ring.appendChild(c);
    return c;
  });

  const rayon = () => (innerWidth < 600 ? 230 : 340);
  const placer = () => {
    const R = rayon();
    cartes.forEach((c, i) => {
      c.style.transform = `rotateY(${(i * 360) / cartes.length}deg) translateZ(${R}px)`;
    });
  };
  placer();
  addEventListener("resize", placer);

  let angle = 0, vitesse = reduit ? 0 : 0.18, glisse = false, dernierX = 0, dernierT = 0, actif = true;

  zone.addEventListener("pointerdown", e => {
    glisse = true; dernierX = e.clientX; dernierT = performance.now();
    zone.classList.add("glisse");
    zone.setPointerCapture?.(e.pointerId);
  });
  zone.addEventListener("pointermove", e => {
    if (!glisse) return;
    const dx = e.clientX - dernierX;
    const dt = Math.max(16, performance.now() - dernierT);
    angle += dx * 0.32;
    vitesse = (dx / dt) * 18;
    dernierX = e.clientX; dernierT = performance.now();
  });
  const lacher = () => { glisse = false; zone.classList.remove("glisse"); };
  zone.addEventListener("pointerup", lacher);
  zone.addEventListener("pointercancel", lacher);
  zone.addEventListener("pointerleave", lacher);

  zone.tabIndex = 0;
  zone.setAttribute("aria-roledescription", "carrousel");
  zone.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { angle += 40; e.preventDefault(); }
    if (e.key === "ArrowLeft") { angle -= 40; e.preventDefault(); }
  });

  document.addEventListener("visibilitychange", () => { actif = !document.hidden; });

  (function boucle() {
    if (actif) {
      if (!glisse) {
        angle += vitesse;
        vitesse += (0.18 - vitesse) * 0.03;
        if (reduit) vitesse = 0;
      }
      ring.style.transform = `rotateX(-8deg) rotateY(${angle}deg)`;
    }
    requestAnimationFrame(boucle);
  })();
}

/* ---------------- particules (version économe) ---------------- */
function particules() {
  const toile = $("#fx");
  if (!toile) return;
  const ctx = toile.getContext("2d");
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let L = 0, H = 0, points = [], actif = true, pointeur = { x: -999, y: -999 };

  const dimensionner = () => {
    L = toile.width = innerWidth;
    H = toile.height = innerHeight;
    const n = innerWidth < 600 ? 26 : 44;   /* plafonné : 90 particules coûtaient trop cher */
    points = Array.from({ length: n }, () => ({
      x: Math.random() * L, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.5
    }));
  };
  dimensionner();
  addEventListener("resize", dimensionner);
  document.addEventListener("visibilitychange", () => { actif = !document.hidden; });

  const PORTEE = 110, PORTEE2 = PORTEE * PORTEE;
  (function dessine() {
    if (!actif || reduit) { requestAnimationFrame(dessine); return; }
    ctx.clearRect(0, 0, L, H);
    for (const p of points) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > L) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      const dx = p.x - pointeur.x, dy = p.y - pointeur.y;
      const d = Math.hypot(dx, dy);
      if (d < 130 && d > 0.01) { p.x += (dx / d) * 1.4; p.y += (dy / d) * 1.4; }
      ctx.fillStyle = "rgba(232,191,90,.75)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
    }
    /* liens : seulement les paires proches, pas les 4000 combinaisons d'avant */
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x, dy = points[i].y - points[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < PORTEE2) {
          ctx.strokeStyle = `rgba(232,191,90,${0.16 * (1 - d2 / PORTEE2)})`;
          ctx.beginPath(); ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[j].x, points[j].y); ctx.stroke();
        }
      }
    }
    requestAnimationFrame(dessine);
  })();

  let attente = false;
  addEventListener("pointermove", e => {
    pointeur.x = e.clientX; pointeur.y = e.clientY;
    if (attente) return;
    attente = true;
    requestAnimationFrame(() => {
      const spot = $("#spot");
      if (spot) {
        spot.style.setProperty("--x", e.clientX + "px");
        spot.style.setProperty("--y", e.clientY + "px");
      }
      attente = false;
    });
  }, { passive: true });
}

/* ---------------- bandeau ---------------- */
function bandeau() {
  const z = $("#mq");
  if (z) z.textContent = "MAÏGA MARKET ✦ ACHETER ✦ VENDRE ✦ BRILLER ✦ ".repeat(8);
}

/* ---------------- univers ---------------- */
function tuiles() {
  const grille = $("#grille");
  if (!grille) return;
  grille.innerHTML = UNIVERS.map(u => {
    const articles = PRODUITS.filter(p => p.cat === u.id);
    const mini = articles.length ? fcfa(Math.min(...articles.map(p => p.prix))) : "—";
    const premier = articles[0];
    const fond = premier ? ` style="--fond:url('${imageDe(premier)}')"` : "";
    return `<button class="tuile rv" data-univ="${u.id}" type="button"${fond}>
      <span class="tuile-n">${articles.length}</span>
      <h3>${u.nom}</h3>
      <p>${u.sous}</p>
      <small>à partir de ${mini}</small>
    </button>`;
  }).join("");

  $$(".tuile", grille).forEach(t => {
    t.addEventListener("pointermove", e => {
      const r = t.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      t.style.setProperty("--mx", x * 100 + "%");
      t.style.setProperty("--my", y * 100 + "%");
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        t.style.transform = `perspective(700px) rotateY(${(x - .5) * 14}deg) rotateX(${(.5 - y) * 14}deg)`;
      }
    });
    t.addEventListener("pointerleave", () => { t.style.transform = ""; });
    t.onclick = () => ouvrirUnivers(t.dataset.univ);
  });
}

function ouvrirUnivers(id) {
  const u = UNIVERS.find(x => x.id === id);
  const articles = PRODUITS.filter(p => p.cat === id);
  if (!articles.length) return;
  ouvrirFiche(articles[0].id);
}

/* ---------------- recherche ---------------- */
function recherche() {
  const champ = $("#champ");
  const boite = $("#suggestions");
  if (!champ || !boite) return;

  const normal = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const proposer = () => {
    const q = normal(champ.value.trim());
    if (q.length < 2) { boite.hidden = true; boite.innerHTML = ""; return; }
    const hits = PRODUITS.filter(p => {
      const u = UNIVERS.find(x => x.id === p.cat);
      return normal(p.nom + " " + p.sous + " " + u.nom + " " + p.desc).includes(q);
    }).slice(0, 6);
    const univ = UNIVERS.filter(u => normal(u.nom + " " + u.sous).includes(q)).slice(0, 3);
    if (!hits.length && !univ.length) {
      boite.innerHTML = `<p class="vide">Rien trouvé pour « ${champ.value.trim()} ». Essayez « moto », « téléphone », « karité ».</p>`;
      boite.hidden = false;
      return;
    }
    boite.innerHTML =
      univ.map(u => `<button class="suggestion" data-univ="${u.id}"><span>${u.nom}</span><small>univers</small></button>`).join("") +
      hits.map(p => `<button class="suggestion" data-produit="${p.id}"><span>${p.nom}</span><small>${fcfa(p.prix)}</small></button>`).join("");
    $$(".suggestion", boite).forEach(b => b.onclick = () => {
      boite.hidden = true;
      champ.value = "";
      if (b.dataset.produit) ouvrirFiche(b.dataset.produit);
      else ouvrirUnivers(b.dataset.univ);
    });
    boite.hidden = false;
  };

  champ.addEventListener("input", proposer);
  champ.addEventListener("focus", proposer);
  champ.addEventListener("keydown", e => {
    if (e.key === "Escape") { boite.hidden = true; champ.blur(); }
    if (e.key === "Enter" && !boite.hidden) { const p = $(".suggestion", boite); if (p) p.click(); }
  });
  document.addEventListener("click", e => {
    if (!boite.contains(e.target) && e.target !== champ) boite.hidden = true;
  });
}

/* ---------------- compteurs ---------------- */
function compteurs() {
  const cibles = $$("[data-n]");
  if (!cibles.length) return;
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const obs = new IntersectionObserver(entrees => {
    entrees.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const n = +el.dataset.n;
      if (reduit) { el.textContent = n.toLocaleString("fr-FR"); obs.unobserve(el); return; }
      let k = 0;
      const pas = Math.max(1, n / 40);
      const tic = setInterval(() => {
        k += pas;
        if (k >= n) { k = n; clearInterval(tic); }
        el.textContent = Math.round(k).toLocaleString("fr-FR");
      }, 34);
      obs.unobserve(el);
    });
  }, { threshold: 0.25 });
  cibles.forEach(c => obs.observe(c));
}

/* ---------------- apparitions ---------------- */
function apparitions() {
  const obs = new IntersectionObserver(entrees => {
    entrees.forEach(e => { if (e.isIntersecting) { e.target.classList.add("on"); obs.unobserve(e.target); } });
  }, { threshold: 0.16 });
  $$(".rv").forEach(el => obs.observe(el));
}

/* ---------------- fiche, panier ---------------- */
let panier = 0;
/* Une vraie photo si elle existe, sinon le visuel d'atelier fabrique. */
function imageDe(p) {
  if (!p) return "";
  if (p.photo) return p.photo;
  return window.visuelProduit ? window.visuelProduit(p) : "";
}

/* L'essayage n'a de sens que pour ce qui se porte : on masque le bloc
   quand le produit ouvert appartient à une catégorie d'objets. */
function majPortable(produit) {
  const bloc = $("#essai");
  const lien = $("#fiche-essai");
  if (!bloc) return;
  const portable = produit && window.Store ? window.Store.estPortable(produit.cat) : true;
  bloc.hidden = false;                 /* le bloc reste toujours accessible */
  if (lien) lien.hidden = !portable;   /* le raccourci n'apparaît que si ça se porte */
  const note = $("#fiche-essai-note");
  if (note) note.hidden = portable;
}


/* ---------------- catalogue : les articles, avec leur image ---------------- */
let filtreCatalogue = "tout";
let pagesAffichees = 2;

function catalogue() {
  const zone = $("#produits");
  const filtres = $("#filtres");
  const plus = $("#voir-plus");
  if (!zone || !filtres) return;

  const liste = () => filtreCatalogue === "tout"
    ? PRODUITS
    : PRODUITS.filter(p => p.cat === filtreCatalogue);

  const dessinerFiltres = () => {
    const compte = c => PRODUITS.filter(p => p.cat === c).length;
    filtres.innerHTML =
      `<button class="puce${filtreCatalogue === "tout" ? " on" : ""}" data-cat="tout">Tout<small>${PRODUITS.length}</small></button>` +
      UNIVERS.filter(u => compte(u.id)).map(u =>
        `<button class="puce${filtreCatalogue === u.id ? " on" : ""}" data-cat="${u.id}">${u.nom}<small>${compte(u.id)}</small></button>`
      ).join("");
    $$(".puce", filtres).forEach(b => b.onclick = () => {
      filtreCatalogue = b.dataset.cat;
      pagesAffichees = 2;
      dessinerFiltres();
      dessinerProduits();
    });
  };

  const carte = p => {
    const img = imageDe(p);
    const rupture = p.stock <= 0;
    return `<button class="article" data-produit="${p.id}" type="button">
      <span class="article-visuel"><img src="${img}" alt="${p.nom}" loading="lazy" width="600" height="620"></span>
      <span class="article-corps">
        <strong>${p.nom}</strong>
        <small>${p.sous || ""}</small>
        <span class="article-prix">${fcfa(p.prix)}</span>
        ${rupture ? '<em class="rupture">épuisé</em>' : (p.stock < 6 ? '<em class="rare">plus que ' + p.stock + '</em>' : '')}
      </span>
    </button>`;
  };

  const dessinerProduits = () => {
    const tout = liste();
    const lot = tout.slice(0, pagesAffichees * 24);
    zone.innerHTML = lot.map(carte).join("") || '<p class="vide">Aucun article dans cette catégorie.</p>';
    $$(".article", zone).forEach(b => b.onclick = () => ouvrirFiche(b.dataset.produit));
    if (plus) plus.hidden = lot.length >= tout.length;
  };

  if (plus) plus.onclick = () => { pagesAffichees += 1; dessinerProduits(); };

  dessinerFiltres();
  dessinerProduits();

  /* la recherche garde le catalogue synchronisé */
  document.addEventListener("catalogue:maj", () => { dessinerFiltres(); dessinerProduits(); });
}

function toast(texte) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = texte;
  t.hidden = false;
  clearTimeout(t._min);
  t._min = setTimeout(() => { t.hidden = true; }, 2400);
}

function poserVisuel(f, p) {
  const zone = f.querySelector("[data-visuel]");
  if (!zone || !p) return;
  zone.innerHTML = `<img alt="${p.nom}" src="${imageDe(p)}">`;
}

function brancherFiche() {
  const f = $("#fiche");
  if (!f) return;
  /* le visuel suit la fiche, quel que soit le chemin d'ouverture */
  new MutationObserver(() => {
    if (f.hidden) return;
    const nom = (f.querySelector("[data-nom]")?.textContent || "").trim();
    const produit = PRODUITS.find(x => x.nom === nom);
    poserVisuel(f, produit);
    majPortable(produit);
  }).observe(f, { attributes: true, attributeFilter: ["hidden"] });
  const fermer = $("#fiche-fermer"), voile = $("#voile");
  if (fermer) fermer.onclick = fermerFiche;
  if (voile) voile.onclick = fermerFiche;
  document.addEventListener("keydown", e => { if (e.key === "Escape") fermerFiche(); });

  const ajout = $("#fiche-ajout");
  if (ajout) ajout.onclick = () => {
    panier += 1;
    const n = $("#panier-n"); if (n) n.textContent = panier;
    const nom = f.querySelector("[data-nom]");
    toast((nom ? nom.textContent : "Article") + " ajouté au panier");
  };
  const p = $("#btn-panier");
  if (p) p.onclick = () => toast(panier ? panier + " article(s) dans le panier" : "Panier vide pour l'instant");
}

/* ---------------- départ ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  bandeau();
  anneau();
  particules();
  tuiles();
  recherche();
  compteurs();
  apparitions();
  brancherFiche();
  catalogue();
  $$("[data-essai]").forEach(z => window.monterGenerateur(z));
});

})();
