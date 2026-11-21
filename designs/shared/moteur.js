/* Moteur commun : construit l'accueil, la fiche produit et le tableau de bord.
   Chaque direction artistique ne change que son CSS (et parfois deux ou trois libellés). */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function carteProduit(p, u) {
  return `<article class="carte" data-produit="${p.id}" tabindex="0" role="button" aria-label="${p.nom}">
    <div class="carte-visuel" data-cat="${p.cat}">
      <span class="carte-forme">${p.nom.split(" ").slice(-1)[0]}</span>
      <span class="carte-tag">${u.nom}</span>
    </div>
    <div class="carte-bas">
      <div>
        <p class="carte-nom">${p.nom}</p>
        <p class="carte-sous">${p.sous}</p>
      </div>
      <span class="carte-prix">${fcfa(p.prix)}</span>
    </div>
  </article>`;
}

function rendreAccueil(racine, options = {}) {
  const rayons = racine.querySelector("[data-rayons]");
  const onglets = racine.querySelector("[data-onglets]");
  let actif = "tous";

  const dessiner = () => {
    const liste = actif === "tous" ? UNIVERS : UNIVERS.filter(u => u.id === actif);
    rayons.innerHTML = liste.map(u => {
      const articles = PRODUITS.filter(p => p.cat === u.id);
      if (!articles.length) return "";
      return `<section class="rayon">
        <header class="rayon-tete">
          <h2>${u.nom}</h2>
          <p>${u.sous}</p>
          <span class="rayon-n">${articles.length}</span>
        </header>
        <div class="rail">${articles.map(p => carteProduit(p, u)).join("")}</div>
      </section>`;
    }).join("");
    $$(".carte", rayons).forEach(c => {
      const ouvrir = () => ouvrirFiche(c.dataset.produit);
      c.onclick = ouvrir;
      c.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrir(); } };
    });
  };

  if (onglets) {
    onglets.innerHTML = [{ id: "tous", nom: "Tout" }, ...UNIVERS]
      .map(u => `<button class="onglet" data-univ="${u.id}" aria-selected="${u.id === actif}">${u.nom}</button>`).join("");
    $$(".onglet", onglets).forEach(b => b.onclick = () => {
      actif = b.dataset.univ;
      $$(".onglet", onglets).forEach(x => x.setAttribute("aria-selected", x === b));
      dessiner();
    });
  }
  dessiner();
}

function ouvrirFiche(id) {
  const p = PRODUITS.find(x => x.id === id);
  if (!p) return;
  const u = UNIVERS.find(x => x.id === p.cat);
  const fiche = $("#fiche");
  fiche.querySelector("[data-cat]").textContent = `${u.nom} · ${u.sous}`;
  fiche.querySelector("[data-nom]").textContent = p.nom;
  fiche.querySelector("[data-prix]").textContent = fcfa(p.prix);
  fiche.querySelector("[data-desc]").textContent = p.desc;
  fiche.querySelector("[data-visuel]").setAttribute("data-cat", p.cat);
  fiche.querySelector("[data-visuel]").innerHTML = `<span class="carte-forme">${p.nom.split(" ").slice(-1)[0]}</span>`;
  fiche.querySelector("[data-variantes]").innerHTML = p.variantes
    .map((v, i) => `<button class="variante" aria-pressed="${i === 0}">${v}</button>`).join("");
  $$("[data-variantes] .variante", fiche).forEach(b => b.onclick = () =>
    $$("[data-variantes] .variante", fiche).forEach(x => x.setAttribute("aria-pressed", x === b)));
  fiche.querySelector("[data-avis]").innerHTML = blocAvis(p);
  fiche.querySelector("[data-avis-etat]").textContent = p.avis.length ? `${p.avis.length} avis vérifié(s)` : "aucun avis pour l'instant";
  fiche.hidden = false;
  const voile = $("#voile");
  if (voile) voile.hidden = false;
  document.body.classList.add("fiche-ouverte");
}

function fermerFiche() {
  const fiche = $("#fiche");
  if (fiche) fiche.hidden = true;
  const voile = $("#voile");
  if (voile) voile.hidden = true;
  document.body.classList.remove("fiche-ouverte");
}

/* ---------- graphiques ---------- */
function courbe(valeurs, largeur = 560, hauteur = 160) {
  if (!valeurs.length) return "";
  const max = Math.max(...valeurs) * 1.12 || 1;
  const pas = largeur / Math.max(1, valeurs.length - 1);
  const pts = valeurs.map((v, i) => [i * pas, hauteur - (v / max) * hauteur]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const aire = d + ` L${largeur} ${hauteur} L0 ${hauteur} Z`;
  return `<svg class="courbe" viewBox="0 0 ${largeur} ${hauteur}" preserveAspectRatio="none" aria-hidden="true">
    <path class="courbe-aire" d="${aire}"/>
    <path class="courbe-ligne" d="${d}"/>
    ${pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3"/>`).join("")}
  </svg>`;
}

function barres(lignes) {
  const max = Math.max(...lignes.map(l => l.valeur)) || 1;
  return `<div class="barres">${lignes.map(l => `
    <div class="barre">
      <span class="barre-nom">${l.nom}</span>
      <div class="barre-piste"><div class="barre-remplie" style="width:${(l.valeur / max) * 100}%"></div></div>
      <span class="barre-val">${l.texte}</span>
    </div>`).join("")}</div>`;
}

/* ---------- tableau de bord ---------- */
function rendreAdmin(racine) {
  const s = stats();
  const mettre = (sel, v) => { const e = racine.querySelector(sel); if (e) e.textContent = v; };

  mettre("[data-kpi-ca]", fcfa(s.ca));
  mettre("[data-kpi-marge]", fcfa(s.marge));
  mettre("[data-kpi-taux]", s.tauxMarge.toFixed(1) + " %");
  mettre("[data-kpi-panier]", fcfa(s.panier));
  mettre("[data-kpi-commandes]", s.payees + " / " + s.commandes);
  mettre("[data-kpi-attente]", s.attente);

  const zoneCourbe = racine.querySelector("[data-courbe]");
  if (zoneCourbe) zoneCourbe.innerHTML = courbe(s.serie);
  const zoneJours = racine.querySelector("[data-jours]");
  if (zoneJours) zoneJours.innerHTML = s.jours.map(j => `<span>${j.slice(8, 10)}/${j.slice(5, 7)}</span>`).join("");

  const zoneTop = racine.querySelector("[data-top]");
  if (zoneTop) zoneTop.innerHTML = barres(s.top.slice(0, 5).map(([id, v]) => ({
    nom: v.nom, valeur: v.ca, texte: fcfa(v.ca) + " · " + v.unite + " u."
  })));

  const zoneStock = racine.querySelector("[data-stock]");
  if (zoneStock) zoneStock.innerHTML = s.stockFaible.map(p => `
    <li><span>${p.nom}</span><strong>${p.stock}</strong></li>`).join("");

  const zoneCommandes = racine.querySelector("[data-commandes]");
  if (zoneCommandes) zoneCommandes.innerHTML = COMMANDES.slice(0, 12).map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${c.nom}</td>
      <td>${c.quantite}</td>
      <td>${fcfa(c.total)}</td>
      <td><span class="pastille ${c.statut}">${c.statut}</span></td>
      <td>${c.date.slice(8, 10)}/${c.date.slice(5, 7)}</td>
      <td>${c.canal}</td>
    </tr>`).join("");

  const zoneProduits = racine.querySelector("[data-produits]");
  if (zoneProduits) zoneProduits.innerHTML = PRODUITS.map(p => {
    const marge = ((p.prix - p.achat) / p.prix) * 100;
    return `<tr>
      <td>${p.nom}</td>
      <td>${UNIVERS.find(u => u.id === p.cat).nom}</td>
      <td>${fcfa(p.prix)}</td>
      <td>${fcfa(p.achat)}</td>
      <td>${fcfa(p.prix - p.achat)}</td>
      <td>${marge.toFixed(0)} %</td>
      <td>${p.stock}</td>
    </tr>`;
  }).join("");

  /* lectures automatiques : calculs réels, présentés comme tels */
  const zoneIA = racine.querySelector("[data-lectures]");
  if (zoneIA) {
    const meilleur = s.top[0];
    const pire = [...PRODUITS].sort((a, b) => (a.prix - a.achat) / a.prix - (b.prix - b.achat) / b.prix)[0];
    const alertes = s.stockFaible.slice(0, 2).map(p => p.nom + " (" + p.stock + ")").join(", ");
    zoneIA.innerHTML = `
      <li><strong>Marge la plus faible :</strong> ${pire.nom}, ${(((pire.prix - pire.achat) / pire.prix) * 100).toFixed(0)} % — à renégocier ou à sortir.</li>
      <li><strong>Meilleure rentrée :</strong> ${meilleur ? meilleur[1].nom : "—"} avec ${meilleur ? fcfa(meilleur[1].ca) : "0"} encaissés.</li>
      <li><strong>Réassort :</strong> ${alertes || "aucun stock critique"}.</li>
      <li><strong>Panier moyen :</strong> ${fcfa(s.panier)} ; au-delà de ${fcfa(s.panier * 1.4)}, la commande vient d'un pro.</li>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const accueil = $("[data-accueil]");
  if (accueil) {
    rendreAccueil(accueil);
    const f = $("#fiche");
    if (f) {
      const fermer = $("#fiche-fermer"), voile = $("#voile");
      if (fermer) fermer.onclick = fermerFiche;
      if (voile) voile.onclick = fermerFiche;
      document.addEventListener("keydown", e => { if (e.key === "Escape") fermerFiche(); });
      $$("[data-essai]").forEach(z => monterEssayage(z));
    }
    const ancre = (sel, cible) => {
      const b = $(sel), c = $(cible);
      if (b && c) b.onclick = () => c.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    ancre("[data-vers-rayons]", "[data-rayons]");
    ancre("[data-vers-essai]", "[data-essai-bloc]");
  }
  const admin = $("[data-admin]");
  if (admin) rendreAdmin(admin);
});
