/* Nexus marché — logique : rayons, fiche produit, avis honnêtes, essayage. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const fcfa = (n) => new Intl.NumberFormat("fr-FR").format(n) + " F";

/* ---------- état ---------- */
const etat = { univers: "tous", panier: 0, produit: null, variante: null };

/* ---------- visuel généré (aucune photo inventée) ---------- */
function visuel(p) {
  const [a, b] = p.teinte;
  return `
    <div class="halo" style="background:radial-gradient(closest-side, ${a}, transparent 72%)"></div>
    <div class="halo" style="background:radial-gradient(closest-side, ${b}88, transparent 68%); transform:translate(28%,18%)"></div>
    <div class="ombre"></div>
    <div class="forme">${p.forme}</div>`;
}

/* ---------- rayons ---------- */
function rendreOnglets() {
  const nav = $("#onglets");
  const tous = [{ id: "tous", nom: "Tout" }, ...UNIVERS];
  nav.innerHTML = tous.map(u => `
    <button class="onglet" role="tab" data-univ="${u.id}" aria-selected="${etat.univers === u.id}">
      ${u.nom}
    </button>`).join("");
  $$(".onglet", nav).forEach(b => b.onclick = () => {
    etat.univers = b.dataset.univ;
    rendreOnglets();
    rendreRayons();
  });
}

function rendreRayons() {
  const zone = $("#rayons");
  const liste = etat.univers === "tous" ? UNIVERS : UNIVERS.filter(u => u.id === etat.univers);
  zone.innerHTML = liste.map(u => {
    const articles = PRODUITS.filter(p => p.cat === u.id);
    if (!articles.length) return "";
    return `
      <section class="rayon" data-rayon="${u.id}">
        <div class="rayon-tete">
          <h2>${u.nom}</h2>
          <p>${u.sous} · ${articles.length} pièce${articles.length > 1 ? "s" : ""}</p>
        </div>
        <div class="rail">
          ${articles.map(p => `
            <article class="carte" data-produit="${p.id}" tabindex="0" role="button" aria-label="${p.nom}">
              <div class="carte-visuel">
                ${visuel(p)}
                <span class="carte-tag">${u.nom}</span>
              </div>
              <div class="carte-bas">
                <div>
                  <p class="carte-nom">${p.nom}</p>
                  <p class="carte-sous">${p.sous}</p>
                </div>
                <span class="carte-prix">${fcfa(p.prix)}</span>
              </div>
            </article>`).join("")}
        </div>
      </section>`;
  }).join("");

  $$(".carte", zone).forEach(c => {
    const ouvrir = () => ouvrirFiche(c.dataset.produit);
    c.onclick = ouvrir;
    c.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrir(); } };
  });
}

/* ---------- fiche produit ---------- */
function ouvrirFiche(id) {
  const p = PRODUITS.find(x => x.id === id);
  if (!p) return;
  etat.produit = p;
  etat.variante = p.variantes[0];
  const u = UNIVERS.find(x => x.id === p.cat);

  $("#fiche-media").innerHTML = visuel(p);
  $("#fiche-cat").textContent = u.nom + " · " + u.sous;
  $("#fiche-nom").textContent = p.nom;
  $("#fiche-prix").textContent = fcfa(p.prix);
  $("#fiche-desc").textContent = p.desc;
  $("#fiche-variantes").innerHTML = p.variantes.map(v =>
    `<button class="variante" data-v="${v}" aria-pressed="${v === etat.variante}">${v}</button>`).join("");
  $$("#fiche-variantes .variante").forEach(b => b.onclick = () => {
    etat.variante = b.dataset.v;
    $$("#fiche-variantes .variante").forEach(x => x.setAttribute("aria-pressed", x === b));
  });

  rendreAvis(p);
  $("#voile").hidden = false;
  $("#fiche").hidden = false;
  document.body.style.overflow = "hidden";
}

function rendreAvis(p) {
  const etatTxt = $("#avis-etat");
  const corps = $("#avis-corps");
  if (p.avis && p.avis.length) {
    etatTxt.textContent = p.avis.length + " avis vérifié" + (p.avis.length > 1 ? "s" : "");
    corps.innerHTML = `<div class="avis-liste">${p.avis.map(a => `
      <div class="avis-item">
        <div class="avis-item-tete">
          <span>${a.auteur} · achat vérifié</span>
          <span class="avis-note">${"★".repeat(a.note)}${"☆".repeat(5 - a.note)}</span>
        </div>
        <p>${a.texte}</p>
      </div>`).join("")}</div>`;
    return;
  }
  /* Aucun avis : on ne fabrique rien, on rend l'absence utile. */
  etatTxt.textContent = "aucun avis pour l'instant";
  corps.innerHTML = `
    <div class="avis-vide">
      <strong>Cette pièce n'a pas encore d'avis.</strong>
      <p>Nous n'écrivons pas de faux commentaires pour remplir la page. Les avis apparaîtront ici après les premières livraisons, avec le numéro de commande vérifié.</p>
      <p>En attendant, vous pouvez nous écrire sur WhatsApp pour poser une question précise sur cette pièce : on répond avec des photos réelles et les dimensions exactes.</p>
    </div>`;
}

function fermerFiche() {
  $("#voile").hidden = true;
  $("#fiche").hidden = true;
  document.body.style.overflow = "";
  etat.produit = null;
}

/* ---------- essayage ---------- */
const PIECES = [
  { id: "tee", nom: "T-shirt", svg: tee() },
  { id: "veste", nom: "Veste", svg: veste() },
  { id: "robe", nom: "Robe", svg: robe() }
];
const essai = { piece: "tee", photo: null, taille: 80, y: 0, rot: 0, op: 92 };

function tee() {
  return `<svg viewBox="0 0 100 100"><path d="M32 22 L20 30 L14 44 L26 50 L26 82 L74 82 L74 50 L86 44 L80 30 L68 22 C62 30 38 30 32 22 Z"
    fill="#e8552e" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/></svg>`;
}
function veste() {
  return `<svg viewBox="0 0 100 100"><path d="M32 20 L18 30 L12 62 L24 66 L24 84 L48 84 L48 24 Z"
    fill="#3b4bff" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>
    <path d="M68 20 L82 30 L88 62 L76 66 L76 84 L52 84 L52 24 Z" fill="#3242e0" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/></svg>`;
}
function robe() {
  return `<svg viewBox="0 0 100 100"><path d="M36 22 L30 34 L22 84 L78 84 L70 34 L64 22 C58 28 42 28 36 22 Z"
    fill="#8a6bff" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/></svg>`;
}

function rendrePieces() {
  const z = $("#essai-pieces");
  z.innerHTML = PIECES.map(p => `
    <button class="piece" data-piece="${p.id}" aria-pressed="${essai.piece === p.id}" title="${p.nom}">${p.svg}</button>`).join("");
  $$(".piece", z).forEach(b => b.onclick = () => {
    essai.piece = b.dataset.piece;
    $$(".piece", z).forEach(x => x.setAttribute("aria-pressed", x === b));
    dessiner();
  });
}

function dessiner() {
  const toile = $("#toile");
  const ctx = toile.getContext("2d");
  ctx.clearRect(0, 0, toile.width, toile.height);
  if (!essai.photo) return;

  const ratio = Math.min(toile.width / essai.photo.width, toile.height / essai.photo.height);
  const w = essai.photo.width * ratio, h = essai.photo.height * ratio;
  const x = (toile.width - w) / 2, y = (toile.height - h) / 2;
  ctx.drawImage(essai.photo, x, y, w, h);

  const piece = PIECES.find(p => p.id === essai.piece);
  const svg = new Blob([piece.svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"')], { type: "image/svg+xml" });
  const url = URL.createObjectURL(svg);
  const img = new Image();
  img.onload = () => {
    const largeur = toile.width * (essai.taille / 100);
    const hauteur = largeur;
    ctx.save();
    ctx.globalAlpha = essai.op / 100;
    ctx.translate(toile.width / 2, toile.height / 2 + (essai.y / 100) * toile.height);
    ctx.rotate((essai.rot * Math.PI) / 180);
    ctx.drawImage(img, -largeur / 2, -hauteur / 2, largeur, hauteur);
    ctx.restore();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function chargerPhoto(fichier) {
  const lecteur = new FileReader();
  lecteur.onload = () => {
    const img = new Image();
    img.onload = () => {
      const toile = $("#toile");
      const max = 1100;
      const r = Math.min(1, max / Math.max(img.width, img.height));
      toile.width = Math.round(img.width * r);
      toile.height = Math.round(img.height * r);
      essai.photo = img;
      $("#essai-vide").hidden = true;
      $("#essai-grille").hidden = false;
      dessiner();
      toast("Photo chargée, ajustez la pièce");
    };
    img.src = lecteur.result;
  };
  lecteur.readAsDataURL(fichier);
}

/* ---------- divers ---------- */
let minuterie;
function toast(texte) {
  const t = $("#toast");
  t.textContent = texte;
  t.hidden = false;
  clearTimeout(minuterie);
  minuterie = setTimeout(() => { t.hidden = true; }, 2600);
}

/* ---------- branchements ---------- */
document.addEventListener("DOMContentLoaded", () => {
  rendreOnglets();
  rendreRayons();
  rendrePieces();

  $("#btn-explorer").onclick = () => $("#rayons").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#btn-essai").onclick = () => $("#bloc-essai").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#btn-photo").onclick = () => $("#photo").click();
  $("#photo").onchange = (e) => { if (e.target.files[0]) chargerPhoto(e.target.files[0]); };

  $("#r-taille").oninput = (e) => { essai.taille = +e.target.value; dessiner(); };
  $("#r-y").oninput = (e) => { essai.y = +e.target.value; dessiner(); };
  $("#r-rot").oninput = (e) => { essai.rot = +e.target.value; dessiner(); };
  $("#r-op").oninput = (e) => { essai.op = +e.target.value; dessiner(); };

  $("#btn-reset").onclick = () => {
    essai.taille = 80; essai.y = 0; essai.rot = 0; essai.op = 92;
    $("#r-taille").value = 80; $("#r-y").value = 0; $("#r-rot").value = 0; $("#r-op").value = 92;
    dessiner();
  };
  $("#btn-export").onclick = () => {
    if (!essai.photo) { toast("Choisissez d'abord une photo"); return; }
    const lien = document.createElement("a");
    lien.download = "essayage.png";
    lien.href = $("#toile").toDataURL("image/png");
    lien.click();
    toast("Image enregistrée");
  };

  $("#voile").onclick = fermerFiche;
  $("#fiche-fermer").onclick = fermerFiche;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#fiche").hidden) fermerFiche(); });

  $("#fiche-ajout").onclick = () => {
    etat.panier += 1;
    $("#panier-n").textContent = etat.panier;
    toast(etat.produit.nom + " ajouté au panier");
  };
  $("#fiche-essai").onclick = () => {
    const p = etat.produit;
    fermerFiche();
    if (p && ["mode"].includes(p.cat)) {
      essai.piece = p.nom.toLowerCase().includes("veste") ? "veste" : "tee";
      rendrePieces();
    }
    $("#bloc-essai").scrollIntoView({ behavior: "smooth", block: "start" });
  };
});
