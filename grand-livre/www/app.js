/* =========================================================
   Grand Livre — gestion et comptabilité hors-ligne
   Aucun serveur, aucune dépendance. Tout en localStorage.
   ========================================================= */
(function () {
"use strict";

/* ---------- outils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const nf = new Intl.NumberFormat("fr-FR");
const fcfa = n => nf.format(Math.round(n || 0)).replace(/\u202f|\u00a0/g, " ") + " F";
const court = n => (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(1).replace(".0", "") + " M" : Math.abs(n) >= 1e4 ? Math.round(n / 1e3) + " k" : nf.format(Math.round(n || 0)));
const jour = d => (d || new Date()).toISOString().slice(0, 10);
const mois = d => (d || new Date()).toISOString().slice(0, 7);
const joliDate = s => { const [a, m, j] = s.split("-"); return `${j}/${m}/${a}`; };
const joliMois = s => { const [a, m] = s.split("-"); return ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"][+m - 1] + " " + a; };
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- base ---------- */
const CLE = "grand-livre-v1";
let DB;

function neuve() {
  const e = uid();
  return {
    version: 1,
    entreprises: [{ id: e, nom: "Mon entreprise", type: "entreprise" }],
    active: e,
    comptes: [{ id: uid(), ent: e, nom: "Caisse", type: "caisse", solde: 0 }],
    categories: [
      { id: uid(), nom: "Ventes", type: "revenu" },
      { id: uid(), nom: "Prestations", type: "revenu" },
      { id: uid(), nom: "Transport", type: "depense" },
      { id: uid(), nom: "Loyer", type: "depense" },
      { id: uid(), nom: "Achats", type: "depense" },
      { id: uid(), nom: "Salaire", type: "depense" }
    ],
    operations: [], produits: [], mouvements: [], tiers: [], dettes: [],
    employes: [], agenda: [], factures: [], programmees: [], reglages: { theme: "sombre", pin: "" }
  };
}

function charger() {
  try { DB = JSON.parse(localStorage.getItem(CLE)) || neuve(); }
  catch (e) { DB = neuve(); }
  if (!DB.entreprises || !DB.entreprises.length) DB = neuve();
}
function sauver() {
  try { localStorage.setItem(CLE, JSON.stringify(DB)); }
  catch (e) { toast("Mémoire pleine : retirez des photos"); }
}

/* ---------- données filtrées sur l'entreprise active ---------- */
const E = () => DB.active;
const de = liste => liste.filter(x => x.ent === E());
const comptes = () => de(DB.comptes);
const ops = () => de(DB.operations).sort((a, b) => b.date.localeCompare(a.date) || b.cree - a.cree);
const produits = () => de(DB.produits);
const tiers = () => de(DB.tiers);
const dettes = () => de(DB.dettes);
const employes = () => de(DB.employes);
const agenda = () => de(DB.agenda).sort((a, b) => a.date.localeCompare(b.date));
const factures = () => de(DB.factures).sort((a, b) => b.date.localeCompare(a.date));
const prog = () => de(DB.programmees).sort((a, b) => a.date.localeCompare(b.date));
const cats = type => de(DB.categories).filter(c => !type || c.type === type);

/* ---------- calculs ---------- */
const soldeCompte = c => c.solde + de(DB.operations)
  .filter(o => o.compte === c.id)
  .reduce((s, o) => s + (o.type === "revenu" ? o.montant : -o.montant), 0);

const soldeTotal = () => comptes().reduce((s, c) => s + soldeCompte(c), 0);
const somme = (liste, type, m) => liste.filter(o => o.type === type && (!m || o.date.slice(0, 7) === m)).reduce((s, o) => s + o.montant, 0);
const caMois = m => somme(ops(), "revenu", m || mois());
const depMois = m => somme(ops(), "depense", m || mois());

function dettesNet() {
  let dois = 0, doivent = 0;
  dettes().forEach(d => {
    const reste = d.montant - (d.paiements || []).reduce((s, p) => s + p.montant, 0);
    if (d.sens === "je_dois") dois += reste; else doivent += reste;
  });
  return { dois, doivent };
}

function margeProduit(p) { return (p.vente || 0) - (p.achat || 0); }

function beneficeProduit(p) {
  const vendu = de(DB.mouvements).filter(m => m.produit === p.id && m.type === "vente").reduce((s, m) => s + m.qte, 0);
  return vendu * margeProduit(p);
}

function topProduits(n = 5) {
  return produits().map(p => ({ p, vendu: de(DB.mouvements).filter(m => m.produit === p.id && m.type === "vente").reduce((s, m) => s + m.qte, 0) }))
    .filter(x => x.vendu > 0).sort((a, b) => b.vendu - a.vendu).slice(0, n);
}

function stockBas() { return produits().filter(p => (p.qte || 0) <= (p.seuil == null ? 3 : p.seuil)); }

function depensesParCategorie(m) {
  const map = {};
  ops().filter(o => o.type === "depense" && o.date.slice(0, 7) === (m || mois()))
    .forEach(o => { map[o.categorie || "Autre"] = (map[o.categorie || "Autre"] || 0) + o.montant; });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function serie6mois() {
  const out = [];
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const m = dd.toISOString().slice(0, 7);
    out.push({ m, ca: caMois(m), dep: depMois(m) });
  }
  return out;
}

/* ---------- interface : briques ---------- */
function toast(t) {
  const el = $("#toast");
  el.textContent = t; el.hidden = false;
  clearTimeout(el._t); el._t = setTimeout(() => (el.hidden = true), 2200);
}

function ouvrir(html, apres) {
  const f = $("#feuille");
  f.innerHTML = html; f.hidden = false; $("#voile").hidden = false;
  $$("[data-fermer]", f).forEach(b => b.onclick = fermer);
  if (apres) apres(f);
  f.scrollTop = 0;
}
function fermer() {
  $("#feuille").hidden = true; $("#voile").hidden = true;
  $("#feuille").innerHTML = "";
}

function ligne(ico, titre, sous, valeur, classe) {
  return `<div class="ligne"><div class="ico">${ico}</div><div class="txt"><b>${esc(titre)}</b><small>${esc(sous || "")}</small></div>
    ${valeur != null ? `<div class="val ${classe || ""}">${valeur}</div>` : ""}</div>`;
}

/* ---------- navigation ---------- */
let ongletActif = "accueil";
function aller(o) {
  ongletActif = o;
  $$("#barre button").forEach(b => b.classList.toggle("on", b.dataset.onglet === o));
  rendre();
}
$$("#barre button").forEach(b => b.onclick = () => aller(b.dataset.onglet));

function rendre() {
  const v = $("#vue");
  v.innerHTML = "";
  const map = { accueil: vueAccueil, operations: vueOperations, stock: vueStock, argent: vueArgent, plus: vuePlus };
  (map[ongletActif] || vueAccueil)(v);
  majEntete();
}

function majEntete() {
  const e = DB.entreprises.find(x => x.id === E()) || { nom: "—", type: "entreprise" };
  $("#ent-nom").textContent = e.nom;
  $("#ent-type").textContent = e.type === "personnel" ? "Personnel" : "Entreprise";
}

/* ---------- vue Accueil ---------- */
function vueAccueil(v) {
  const m = mois();
  const det = dettesNet();
  const top = topProduits(4);
  const bas = stockBas();
  v.innerHTML = `
    <div class="carte solde">
      <small>Solde total</small>
      <b>${fcfa(soldeTotal())}</b>
      <small>${comptes().length} compte(s) · ${joliMois(m)}</small>
    </div>
    <div class="duo">
      <div class="kpi"><small>Chiffre d'affaires</small><b>${court(caMois())}</b></div>
      <div class="kpi ok"><small>Bénéfice du mois</small><b>${court(caMois() - depMois())}</b></div>
      <div class="kpi ko"><small>Dépenses</small><b>${court(depMois())}</b></div>
      <div class="kpi"><small>Dettes / créances</small><b>${court(det.dois)} / ${court(det.doit)}</b></div>
    </div>

    <div class="section-titre"><h3>Ventes et dépenses</h3><button data-graph>6 mois</button></div>
    <div class="carte"><canvas class="graph" id="g1"></canvas>
      <div class="legende"><span><i style="background:var(--ok)"></i>Chiffre d'affaires</span><span><i style="background:var(--ko)"></i>Dépenses</span></div>
    </div>

    <div class="section-titre"><h3>Dernières opérations</h3><button data-voir-ops>Tout voir</button></div>
    <div class="carte">${ops().slice(0, 5).map(o => ligne(
      o.type === "revenu" ? "↑" : "↓",
      o.categorie || (o.type === "revenu" ? "Revenu" : "Dépense"),
      joliDate(o.date) + (o.note ? " · " + o.note.slice(0, 26) : ""),
      (o.type === "revenu" ? "+" : "−") + court(o.montant),
      o.type === "revenu" ? "plus" : "moins")).join("") || `<div class="vide">Aucune opération. Touchez + pour en ajouter une.</div>`}
    </div>

    <div class="section-titre"><h3>Meilleures ventes</h3><button data-voir-stock>Stock</button></div>
    <div class="carte">${top.map(t => ligne("▣", t.p.nom, t.vendu + " vendu(s) · marge " + fcfa(margeProduit(t.p)), court(beneficeProduit(t.p)), "plus")).join("") || `<div class="vide">Aucune vente enregistrée.</div>`}</div>

    ${bas.length ? `<div class="section-titre"><h3>Stock bas</h3></div><div class="carte">${bas.slice(0, 5).map(p => ligne("!", p.nom, "reste " + (p.qte || 0), `<span class="badge warn">à commander</span>`)).join("")}</div>` : ""}
  `;
  dessinerCourbe($("#g1", v), serie6mois());
  $$("[data-voir-ops]", v).forEach(b => b.onclick = () => aller("operations"));
  $$("[data-voir-stock]", v).forEach(b => b.onclick = () => aller("stock"));
  $$("[data-graph]", v).forEach(b => b.onclick = () => { fermer(); bilanMensuel(); });
}

/* ---------- vue Opérations ---------- */
let filtreOp = "tout";
function vueOperations(v) {
  const liste = ops().filter(o => filtreOp === "tout" || o.type === filtreOp);
  const parMois = {};
  liste.forEach(o => { (parMois[o.date.slice(0, 7)] = parMois[o.date.slice(0, 7)] || []).push(o); });
  v.innerHTML = `
    <div class="titre"><h2>Opérations</h2><small>${liste.length} écriture(s)</small></div>
    <div class="filtres">
      ${[["tout", "Tout"], ["revenu", "Revenus"], ["depense", "Dépenses"]].map(([k, n]) =>
        `<button class="puce ${filtreOp === k ? "on" : ""}" data-f="${k}">${n}</button>`).join("")}
      <button class="puce" data-prog>Programmées</button>
    </div>
    ${Object.keys(parMois).length ? Object.keys(parMois).sort().reverse().map(m => {
      const tot = parMois[m].reduce((s, o) => s + (o.type === "revenu" ? o.montant : -o.montant), 0);
      return `<div class="section-titre"><h3>${joliMois(m)}</h3><small style="margin-left:auto;color:${tot >= 0 ? "var(--ok)" : "var(--ko)"}">${tot >= 0 ? "+" : ""}${fcfa(tot)}</small></div>
        <div class="carte">${parMois[m].map(o => ligne(
          o.type === "revenu" ? "↑" : "↓",
          o.categorie || "—",
          joliDate(o.date) + (o.note ? " · " + o.note.slice(0, 30) : ""),
          (o.type === "revenu" ? "+" : "−") + court(o.montant),
          o.type === "revenu" ? "plus" : "moins")).join("")}</div>`;
    }).join("") : `<div class="vide">Aucune opération pour ce filtre.<br>Touchez + pour commencer.</div>`}
  `;
  $$("[data-f]", v).forEach(b => b.onclick = () => { filtreOp = b.dataset.f; rendre(); });
  $$("[data-prog]", v).forEach(b => b.onclick = programmees);
}

/* ---------- vue Stock ---------- */
function vueStock(v) {
  const ps = produits();
  const valeur = ps.reduce((s, p) => s + (p.achat || 0) * (p.qte || 0), 0);
  v.innerHTML = `
    <div class="titre"><h2>Stock</h2><small>${ps.length} produit(s)</small></div>
    <div class="duo" style="margin-top:0">
      <div class="kpi"><small>Valeur du stock</small><b>${court(valeur)}</b></div>
      <div class="kpi ok"><small>Marge potentielle</small><b>${court(ps.reduce((s, p) => s + margeProduit(p) * (p.qte || 0), 0))}</b></div>
    </div>
    <div class="section-titre"><h3>Produits</h3><button data-ajout-produit>+ Ajouter</button></div>
    <div class="carte">
      ${ps.map(p => `<div class="ligne"><div class="ico">▣</div>
        <div class="txt"><b>${esc(p.nom)}</b><small>${fcfa(p.achat)} → ${fcfa(p.vente)} · marge ${fcfa(margeProduit(p))}</small></div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge ${(p.qte || 0) > 3 ? "ok" : "warn"}">${p.qte || 0}</span>
          <button class="rond" data-vendre="${p.id}" title="Vendre">₣</button>
        </div></div>`).join("") || `<div class="vide">Aucun produit.<br>Ajoutez-en ou importez votre catalogue.</div>`}
    </div>
    <button class="btn sec" data-import>Importer un catalogue (CSV / JSON)</button>
  `;
  $$("[data-ajout-produit]", v).forEach(b => b.onclick = ficheProduit);
  $$("[data-vendre]", v).forEach(b => b.onclick = () => venteRapide(b.dataset.vendre));
  $$("[data-import]", v).forEach(b => b.onclick = importCatalogue);
}

/* ---------- vue Argent ---------- */
function vueArgent(v) {
  const det = dettesNet();
  const salaires = employes().reduce((s, e) => s + (e.salaire || 0), 0);
  v.innerHTML = `
    <div class="titre"><h2>Argent</h2><small>${fcfa(soldeTotal())}</small></div>
    <div class="section-titre"><h3>Comptes</h3><button data-ajout-compte>+ Compte</button></div>
    <div class="carte">
      ${comptes().map(c => `<div class="ligne"><div class="ico">${c.type === "banque" ? "🏦" : c.type === "mobile" ? "📱" : "💵"}</div>
        <div class="txt"><b>${esc(c.nom)}</b><small>${esc(c.type || "caisse")}</small></div>
        <div class="val">${fcfa(soldeCompte(c))}</div></div>`).join("") || `<div class="vide">Aucun compte.</div>`}
    </div>
    <div class="duo">
      <button class="btn sec" data-transfert style="margin-top:10px">Transfert</button>
      <button class="btn sec" data-corriger style="margin-top:10px">Corriger solde</button>
    </div>

    <div class="section-titre"><h3>Dettes et créances</h3><button data-ajout-dette>+ Dette</button></div>
    <div class="carte">
      <div class="ligne"><div class="ico">↘</div><div class="txt"><b>Je dois</b><small>à régler</small></div><div class="val moins">${fcfa(det.dois)}</div></div>
      <div class="ligne"><div class="ico">↗</div><div class="txt"><b>On me doit</b><small>à encaisser</small></div><div class="val plus">${fcfa(det.doit)}</div></div>
      ${dettes().map(d => {
        const reste = d.montant - (d.paiements || []).reduce((s, p) => s + p.montant, 0);
        return `<div class="ligne"><div class="ico">${d.sens === "je_dois" ? "↓" : "↑"}</div>
          <div class="txt"><b>${esc(d.tiers)}</b><small>échéance ${d.echeance ? joliDate(d.echeance) : "libre"} · reste ${fcfa(reste)}</small></div>
          <button class="rond" data-payer="${d.id}">₣</button></div>`;
      }).join("")}
    </div>

    <div class="section-titre"><h3>Employés</h3><button data-ajout-employe>+ Employé</button></div>
    <div class="carte">
      ${employes().map(e => {
        const paye = (e.paiements || []).includes(mois());
        return `<div class="ligne"><div class="ico">👤</div>
          <div class="txt"><b>${esc(e.nom)}</b><small>${esc(e.poste || "")} · ${fcfa(e.salaire)}</small></div>
          <button class="puce ${paye ? "on" : ""}" data-salaire="${e.id}">${paye ? "payé" : "à payer"}</button></div>`;
      }).join("") || `<div class="vide">Aucun employé. Total salaires : ${fcfa(salaires)}</div>`}
    </div>
  `;
  $$("[data-ajout-compte]", v).forEach(b => b.onclick = ficheCompte);
  $$("[data-transfert]", v).forEach(b => b.onclick = transfert);
  $$("[data-corriger]", v).forEach(b => b.onclick = corrigerSolde);
  $$("[data-ajout-dette]", v).forEach(b => b.onclick = ficheDette);
  $$("[data-payer]", v).forEach(b => b.onclick = () => paiementDette(b.dataset.payer));
  $$("[data-ajout-employe]", v).forEach(b => b.onclick = ficheEmploye);
  $$("[data-salaire]", v).forEach(b => b.onclick = () => basculerSalaire(b.dataset.salaire));
}

/* ---------- vue Plus ---------- */
function vuePlus(v) {
  v.innerHTML = `
    <div class="titre"><h2>Plus</h2></div>
    <div class="carte">
      ${ligne("👥", "Clients et fournisseurs", tiers().length + " fiche(s)")}
      ${ligne("🗓", "Agenda", agenda().length + " événement(s)")}
      ${ligne("📊", "Bilans et archives", "mois, semestre, année")}
      ${ligne("🧾", "Factures", factures().length + " facture(s)")}
      ${ligne("🤖", "Assistant", "dépense en langage naturel")}
      ${ligne("🏢", "Entreprises", DB.entreprises.length + " espace(s)")}
      ${ligne("⬇", "Sauvegarde et export", "fichier de sécurité")}
      ${ligne("⚙", "Réglages", "thème, code, réinitialiser")}
    </div>
  `;
  const b = $$(".ligne", v);
  b[0].onclick = vueTiers; b[1].onclick = vueAgenda; b[2].onclick = vueBilans;
  b[3].onclick = vueFactures; b[4].onclick = assistant; b[5].onclick = entreprises;
  b[6].onclick = sauvegarde; b[7].onclick = reglages;
}

/* ---------- ajout rapide (3 taps) ---------- */
function ajoutRapide() {
  ouvrir(`
    <div class="feuille-tete"><h2>Nouvelle opération</h2><button class="rond" data-fermer>✕</button></div>
    <div class="choix">
      <button data-t="revenu"><b>↑</b>Revenu</button>
      <button data-t="depense"><b>↓</b>Dépense</button>
      <button data-t="vente"><b>₣</b>Vente</button>
    </div>`, f => {
    $$("[data-t]", f).forEach(b => b.onclick = () => {
      if (b.dataset.t === "vente") return venteRapide();
      saisieOperation(b.dataset.t);
    });
  });
}

function saisieOperation(type) {
  let montant = "";
  const catsListe = cats(type);
  let cat = catsListe[0] ? catsListe[0].nom : (type === "revenu" ? "Ventes" : "Dépenses");
  let compte = comptes()[0] ? comptes()[0].id : null;

  ouvrir(`
    <div class="feuille-tete"><h2>${type === "revenu" ? "Revenu" : "Dépense"}</h2><button class="rond" data-fermer>✕</button></div>
    <div class="grand-montant" id="m">0 F</div>
    <div class="pave" id="pave"></div>
    <label class="etq">Catégorie</label>
    <div class="puces" id="cats">${catsListe.map(c => `<button class="puce ${c.nom === cat ? "on" : ""}" data-c="${esc(c.nom)}">${esc(c.nom)}</button>`).join("")}
      <button class="puce" data-nouvelle-cat>+ Catégorie</button></div>
    <label class="etq">Compte</label>
    <div class="puces" id="comptes">${comptes().map(c => `<button class="puce ${c.id === compte ? "on" : ""}" data-a="${c.id}">${esc(c.nom)}</button>`).join("")}</div>
    <input class="saisie" id="note" placeholder="Justification (facultatif)" style="margin-top:14px">
    <input class="saisie" id="date" type="date" value="${jour()}">
    <button class="btn" id="valider">Enregistrer</button>
  `, f => {
    const aff = () => ($("#m", f).textContent = fcfa(+montant || 0));
    const pave = $("#pave", f);
    ["1","2","3","4","5","6","7","8","9","000","0","⌫"].forEach(t => {
      const b = document.createElement("button");
      b.textContent = t;
      b.onclick = () => {
        if (t === "⌫") montant = montant.slice(0, -1);
        else montant = (montant + t).replace(/^0+(?=\d)/, "").slice(0, 9);
        aff();
      };
      pave.appendChild(b);
    });
    $$("[data-c]", f).forEach(b => b.onclick = () => {
      cat = b.dataset.c; $$("[data-c]", f).forEach(x => x.classList.toggle("on", x === b));
    });
    $$("[data-a]", f).forEach(b => b.onclick = () => {
      compte = b.dataset.a; $$("[data-a]", f).forEach(x => x.classList.toggle("on", x === b));
    });
    $$("[data-nouvelle-cat]", f).forEach(b => b.onclick = () => nouvelleCategorie(type, nom => {
      cat = nom; saisieOperation(type);
    }));
    $("#valider", f).onclick = () => {
      const v = +montant;
      if (!v) return toast("Entrez un montant");
      DB.operations.push({
        id: uid(), ent: E(), type, montant: v, categorie: cat, compte,
        date: $("#date", f).value || jour(), note: $("#note", f).value.trim(), cree: Date.now()
      });
      sauver(); fermer(); toast("Enregistré : " + fcfa(v)); rendre();
    };
  });
}

function nouvelleCategorie(type, apres) {
  const nom = prompt("Nom de la catégorie");
  if (!nom) return;
  DB.categories.push({ id: uid(), ent: E(), nom: nom.trim(), type });
  sauver(); toast("Catégorie ajoutée");
  if (apres) apres(nom.trim()); else rendre();
}

/* ---------- ventes et produits ---------- */
function venteRapide(produitId) {
  const ps = produits();
  if (!ps.length) return ficheProduit();
  const p = produitId ? ps.find(x => x.id === produitId) : null;
  if (p) return confirmerVente(p);

  ouvrir(`<div class="feuille-tete"><h2>Vente rapide</h2><button class="rond" data-fermer>✕</button></div>
    <div class="carte">${ps.map(x => ligne("▣", x.nom, fcfa(x.vente) + " · reste " + (x.qte || 0), "▸")).join("")}</div>`,
    f => $$(".ligne", f).forEach((el, i) => el.onclick = () => confirmerVente(ps[i])));
}

function confirmerVente(p) {
  let qte = 1;
  ouvrir(`<div class="feuille-tete"><h2>${esc(p.nom)}</h2><button class="rond" data-fermer>✕</button></div>
    <div class="grand-montant">${fcfa(p.vente)}</div>
    <div class="row2">
      <button class="btn sec" id="moins">−</button>
      <button class="btn sec" id="plus">+</button>
    </div>
    <p class="centre mini" style="margin:12px 0">Quantité : <b id="q">1</b> · total <b id="tot">${fcfa(p.vente)}</b></p>
    <p class="centre mini">Marge sur cette vente : <b style="color:var(--ok)" id="mg">${fcfa(margeProduit(p))}</b></p>
    <button class="btn" id="ok">Valider la vente</button>`, f => {
    const maj = () => {
      $("#q", f).textContent = qte;
      $("#tot", f).textContent = fcfa(qte * p.vente);
      $("#mg", f).textContent = fcfa(qte * margeProduit(p));
    };
    $("#moins", f).onclick = () => { qte = clamp(qte - 1, 1, 99); maj(); };
    $("#plus", f).onclick = () => { qte = clamp(qte + 1, 1, 99); maj(); };
    $("#ok", f).onclick = () => {
      const compte = comptes()[0] ? comptes()[0].id : null;
      DB.mouvements.push({ id: uid(), ent: E(), produit: p.id, type: "vente", qte, date: jour(), prix: p.vente });
      DB.operations.push({ id: uid(), ent: E(), type: "revenu", montant: qte * p.vente, categorie: "Ventes", compte, date: jour(), note: "Vente " + p.nom, cree: Date.now() });
      const prod = DB.produits.find(x => x.id === p.id);
      prod.qte = Math.max(0, (prod.qte || 0) - qte);
      sauver(); fermer(); toast("Vente enregistrée"); rendre();
    };
  });
}

function ficheProduit() {
  ouvrir(`<div class="feuille-tete"><h2>Nouveau produit</h2><button class="rond" data-fermer>✕</button></div>
    <label class="etq">Nom</label><input class="saisie" id="nom" placeholder="Ex. Crocs">
    <div class="row2"><div><label class="etq">Prix d'achat</label><input class="saisie" id="achat" type="number" inputmode="numeric" placeholder="5000"></div>
    <div><label class="etq">Prix de vente</label><input class="saisie" id="vente" type="number" inputmode="numeric" placeholder="8500"></div></div>
    <div class="row2"><div><label class="etq">Quantité</label><input class="saisie" id="qte" type="number" inputmode="numeric" value="0"></div>
    <div><label class="etq">Seuil d'alerte</label><input class="saisie" id="seuil" type="number" inputmode="numeric" value="3"></div></div>
    <label class="etq">Fournisseur</label><input class="saisie" id="four" placeholder="Facultatif">
    <label class="etq">Précommande</label>
    <div class="puces"><button class="puce" id="pre">Non</button></div>
    <p class="mini" id="marge" style="margin-top:12px">Marge : —</p>
    <button class="btn" id="ok">Enregistrer</button>`, f => {
    let pre = false;
    const maj = () => {
      const m = (+$("#vente", f).value || 0) - (+$("#achat", f).value || 0);
      $("#marge", f).innerHTML = "Marge : <b style='color:var(--ok)'>" + fcfa(m) + "</b> par unité";
    };
    ["#vente", "#achat"].forEach(s => $(s, f).oninput = maj);
    $("#pre", f).onclick = e => { pre = !pre; e.target.classList.toggle("on", pre); e.target.textContent = pre ? "Oui" : "Non"; };
    $("#ok", f).onclick = () => {
      const nom = $("#nom", f).value.trim();
      if (!nom) return toast("Nom obligatoire");
      DB.produits.push({
        id: uid(), ent: E(), nom, achat: +$("#achat", f).value || 0, vente: +$("#vente", f).value || 0,
        qte: +$("#qte", f).value || 0, seuil: +$("#seuil", f).value || 3,
        fournisseur: $("#four", f).value.trim(), precommande: pre
      });
      sauver(); fermer(); toast("Produit ajouté"); rendre();
    };
  });
}

function importCatalogue() {
  ouvrir(`<div class="feuille-tete"><h2>Importer</h2><button class="rond" data-fermer>✕</button></div>
    <p class="mini">Collez un JSON ou un CSV (nom;prix_achat;prix_vente;quantite). Une ligne par produit.</p>
    <textarea class="saisie" id="txt" placeholder="nom,prix_achat,prix_vente,quantite&#10;Crocs,5000,8500,12"></textarea>
    <button class="btn sec" id="fichier">Choisir un fichier</button>
    <input type="file" id="file" accept=".json,.csv,text/*" hidden>
    <button class="btn" id="ok">Importer</button>`, f => {
    const traiter = txt => {
      let n = 0;
      txt = txt.trim();
      if (!txt) return;
      if (txt.startsWith("[") || txt.startsWith("{")) {
        let data = JSON.parse(txt);
        const liste = Array.isArray(data) ? data : (data.produits || data.products || []);
        liste.forEach(p => {
          const nom = p.nom || p.name || p.title;
          if (!nom) return;
          DB.produits.push({
            id: uid(), ent: E(), nom,
            achat: +(p.achat || p.prix_achat || p.cost || 0), vente: +(p.vente || p.prix || p.price || 0),
            qte: +(p.qte || p.stock || p.quantite || 0), seuil: 3, fournisseur: p.fournisseur || "", precommande: false
          });
          n++;
        });
      } else {
        txt.split(/\r?\n/).forEach((l, i) => {
          if (!l.trim() || (i === 0 && /nom/i.test(l))) return;
          const c = l.split(/[;,\t]/).map(x => x.trim());
          if (!c[0]) return;
          DB.produits.push({ id: uid(), ent: E(), nom: c[0], achat: +c[1] || 0, vente: +c[2] || 0, qte: +c[3] || 0, seuil: 3, fournisseur: "", precommande: false });
          n++;
        });
      }
      sauver(); fermer(); toast(n + " produit(s) importé(s)"); rendre();
    };
    $("#ok", f).onclick = () => { try { traiter($("#txt", f).value); } catch (e) { toast("Format non reconnu"); } };
    $("#fichier", f).onclick = () => $("#file", f).click();
    $("#file", f).onchange = e => {
      const fl = e.target.files[0]; if (!fl) return;
      const r = new FileReader();
      r.onload = () => { $("#txt", f).value = r.result; };
      r.readAsText(fl);
    };
  });
}

/* ---------- comptes ---------- */
function ficheCompte() {
  ouvrir(`<div class="feuille-tete"><h2>Nouveau compte</h2><button class="rond" data-fermer>✕</button></div>
    <label class="etq">Nom</label><input class="saisie" id="nom" placeholder="Orange Money, Moov, Banque…">
    <label class="etq">Type</label>
    <div class="puces" id="types">
      <button class="puce on" data-ty="mobile">Mobile money</button>
      <button class="puce" data-ty="banque">Banque</button>
      <button class="puce" data-ty="caisse">Caisse</button>
    </div>
    <label class="etq">Solde de départ</label><input class="saisie" id="solde" type="number" inputmode="numeric" value="0">
    <button class="btn" id="ok">Créer le compte</button>`, f => {
    let ty = "mobile";
    $$("[data-ty]", f).forEach(b => b.onclick = () => { ty = b.dataset.ty; $$("[data-ty]", f).forEach(x => x.classList.toggle("on", x === b)); });
    $("#ok", f).onclick = () => {
      const nom = $("#nom", f).value.trim();
      if (!nom) return toast("Nom obligatoire");
      DB.comptes.push({ id: uid(), ent: E(), nom, type: ty, solde: +$("#solde", f).value || 0 });
      sauver(); fermer(); rendre();
    };
  });
}

function transfert() {
  const cs = comptes();
  if (cs.length < 2) return toast("Créez au moins deux comptes");
  ouvrir(`<div class="feuille-tete"><h2>Transfert</h2><button class="rond" data-fermer>✕</button></div>
    <label class="etq">Depuis</label><select class="saisie" id="de">${cs.map(c => `<option value="${c.id}">${esc(c.nom)}</option>`).join("")}</select>
    <label class="etq">Vers</label><select class="saisie" id="vers">${cs.map(c => `<option value="${c.id}">${esc(c.nom)}</option>`).join("")}</select>
    <label class="etq">Montant</label><input class="saisie" id="m" type="number" inputmode="numeric">
    <button class="btn" id="ok">Transférer</button>`, f => {
    $("#ok", f).onclick = () => {
      const m = +$("#m", f).value, a = $("#de", f).value, b = $("#vers", f).value;
      if (!m || a === b) return toast("Vérifiez les comptes et le montant");
      DB.operations.push({ id: uid(), ent: E(), type: "depense", montant: m, categorie: "Transfert", compte: a, date: jour(), note: "Transfert sortant", cree: Date.now() });
      DB.operations.push({ id: uid(), ent: E(), type: "revenu", montant: m, categorie: "Transfert", compte: b, date: jour(), note: "Transfert entrant", cree: Date.now() });
      sauver(); fermer(); toast("Transfert effectué"); rendre();
    };
  });
}

function corrigerSolde() {
  const cs = comptes();
  ouvrir(`<div class="feuille-tete"><h2>Corriger un solde</h2><button class="rond" data-fermer>✕</button></div>
    <label class="etq">Compte</label><select class="saisie" id="c">${cs.map(c => `<option value="${c.id}">${esc(c.nom)} — ${fcfa(soldeCompte(c))}</option>`).join("")}</select>
    <label class="etq">Solde réel constaté</label><input class="saisie" id="m" type="number" inputmode="numeric">
    <button class="btn" id="ok">Ajuster</button>`, f => {
    $("#ok", f).onclick = () => {
      const c = DB.comptes.find(x => x.id === $("#c", f).value);
      const reel = +$("#m", f).value;
      if (isNaN(reel)) return toast("Entrez un montant");
      const diff = reel - soldeCompte(c);
      DB.operations.push({
        id: uid(), ent: E(), type: diff >= 0 ? "revenu" : "depense", montant: Math.abs(diff),
        categorie: "Correction", compte: c.id, date: jour(), note: "Correction de solde", cree: Date.now()
      });
      sauver(); fermer(); toast("Solde corrigé"); rendre();
    };
  });
}

/* ---------- dettes ---------- */
function ficheDette() {
  ouvrir(`<div class="feuille-tete"><h2>Nouvelle dette</h2><button class="rond" data-fermer>✕</button></div>
    <div class="puces" id="sens">
      <button class="puce on" data-s="je_dois">Je dois</button>
      <button class="puce" data-s="on_me_doit">On me doit</button>
    </div>
    <label class="etq">Nom</label><input class="saisie" id="tiers" placeholder="Client ou fournisseur">
    <label class="etq">Montant</label><input class="saisie" id="m" type="number" inputmode="numeric">
    <label class="etq">Échéance</label><input class="saisie" id="ech" type="date" value="${jour()}">
    <button class="btn" id="ok">Enregistrer</button>`, f => {
    let sens = "je_dois";
    $$("[data-s]", f).forEach(b => b.onclick = () => { sens = b.dataset.s; $$("[data-s]", f).forEach(x => x.classList.toggle("on", x === b)); });
    $("#ok", f).onclick = () => {
      const t = $("#tiers", f).value.trim(), m = +$("#m", f).value;
      if (!t || !m) return toast("Nom et montant obligatoires");
      DB.dettes.push({ id: uid(), ent: E(), sens, tiers: t, montant: m, echeance: $("#ech", f).value, paiements: [] });
      sauver(); fermer(); rendre();
    };
  });
}

function paiementDette(id) {
  const d = DB.dettes.find(x => x.id === id);
  const reste = d.montant - (d.paiements || []).reduce((s, p) => s + p.montant, 0);
  ouvrir(`<div class="feuille-tete"><h2>${esc(d.tiers)}</h2><button class="rond" data-fermer>✕</button></div>
    <p class="mini">Reste à régler : <b>${fcfa(reste)}</b></p>
    <label class="etq">Montant du paiement</label><input class="saisie" id="m" type="number" inputmode="numeric" value="${reste}">
    <button class="btn" id="ok">Enregistrer le paiement</button>`, f => {
    $("#ok", f).onclick = () => {
      const m = +$("#m", f).value;
      if (!m) return;
      d.paiements = d.paiements || [];
      d.paiements.push({ date: jour(), montant: m });
      if (d.sens === "je_dois") {
        DB.operations.push({ id: uid(), ent: E(), type: "depense", montant: m, categorie: "Dette", compte: comptes()[0] ? comptes()[0].id : null, date: jour(), note: "Paiement dette " + d.tiers, cree: Date.now() });
      } else {
        DB.operations.push({ id: uid(), ent: E(), type: "revenu", montant: m, categorie: "Créance", compte: comptes()[0] ? comptes()[0].id : null, date: jour(), note: "Encaissement " + d.tiers, cree: Date.now() });
      }
      sauver(); fermer(); toast("Paiement enregistré"); rendre();
    };
  });
}

/* ---------- employés ---------- */
function ficheEmploye() {
  ouvrir(`<div class="feuille-tete"><h2>Nouvel employé</h2><button class="rond" data-fermer>✕</button></div>
    <label class="etq">Nom</label><input class="saisie" id="nom">
    <label class="etq">Poste</label><input class="saisie" id="poste">
    <label class="etq">Salaire mensuel</label><input class="saisie" id="salaire" type="number" inputmode="numeric">
    <button class="btn" id="ok">Enregistrer</button>`, f => {
    $("#ok", f).onclick = () => {
      const nom = $("#nom", f).value.trim();
      if (!nom) return toast("Nom obligatoire");
      DB.employes.push({ id: uid(), ent: E(), nom, poste: $("#poste", f).value.trim(), salaire: +$("#salaire", f).value || 0, paiements: [] });
      sauver(); fermer(); rendre();
    };
  });
}

function basculerSalaire(id) {
  const e = DB.employes.find(x => x.id === id);
  e.paiements = e.paiements || [];
  const m = mois();
  if (e.paiements.includes(m)) {
    e.paiements = e.paiements.filter(x => x !== m);
    toast("Marqué à payer");
  } else {
    e.paiements.push(m);
    DB.operations.push({ id: uid(), ent: E(), type: "depense", montant: e.salaire, categorie: "Salaire", compte: comptes()[0] ? comptes()[0].id : null, date: jour(), note: "Salaire " + e.nom, cree: Date.now() });
    toast("Salaire payé et enregistré");
  }
  sauver(); rendre();
}

/* ---------- clients, agenda ---------- */
function vueTiers() {
  ouvrir(`<div class="feuille-tete"><h2>Clients et fournisseurs</h2><button class="rond" data-fermer>✕</button></div>
    <div class="carte">${tiers().map(t => ligne(t.type === "fournisseur" ? "🚚" : "👤", t.nom, (t.tel || "") + " · " + t.type, "▸")).join("") || `<div class="vide">Aucune fiche.</div>`}</div>
    <button class="btn" id="ajout">Ajouter une fiche</button>`, f => {
    $("#ajout", f).onclick = () => {
      const nom = prompt("Nom"); if (!nom) return;
      const tel = prompt("Téléphone (facultatif)") || "";
      const type = (prompt("Type : client ou fournisseur", "client") || "client").toLowerCase().includes("four") ? "fournisseur" : "client";
      DB.tiers.push({ id: uid(), ent: E(), nom: nom.trim(), tel, type });
      sauver(); vueTiers(); rendre();
    };
  });
}

function vueAgenda() {
  ouvrir(`<div class="feuille-tete"><h2>Agenda</h2><button class="rond" data-fermer>✕</button></div>
    <div class="carte">${agenda().map(a => ligne("🗓", a.titre, joliDate(a.date) + " · " + (a.type || "événement"), "▸")).join("") || `<div class="vide">Aucun événement.</div>`}</div>
    <button class="btn" id="ajout">Ajouter</button>`, f => {
    $("#ajout", f).onclick = () => {
      const titre = prompt("Titre"); if (!titre) return;
      const date = prompt("Date (AAAA-MM-JJ)", jour()) || jour();
      DB.agenda.push({ id: uid(), ent: E(), titre: titre.trim(), date, type: "événement" });
      sauver(); vueAgenda(); rendre();
    };
  });
}

/* ---------- programmees ---------- */
function programmees() {
  ouvrir(`<div class="feuille-tete"><h2>Dépenses programmées</h2><button class="rond" data-fermer>✕</button></div>
    <div class="carte">${prog().map(p => ligne("⏱", p.libelle, joliDate(p.date) + " · " + p.recurrence, fcfa(p.montant))).join("") || `<div class="vide">Aucune dépense programmée.</div>`}</div>
    <button class="btn" id="ajout">Programmer une dépense</button>`, f => {
    $("#ajout", f).onclick = () => {
      const libelle = prompt("Libellé"); if (!libelle) return;
      const montant = +prompt("Montant", "0") || 0;
      const date = prompt("Date (AAAA-MM-JJ)", jour()) || jour();
      const rec = prompt("Récurrence : aucune, mensuelle, hebdomadaire", "aucune") || "aucune";
      DB.programmees.push({ id: uid(), ent: E(), libelle, montant, date, recurrence: rec });
      sauver(); programmees(); rendre();
    };
  });
}

/* ---------- bilans ---------- */
function vueBilans() {
  const m = mois();
  const an = new Date().getFullYear();
  const caA = ops().filter(o => o.type === "revenu" && o.date.startsWith(an)).reduce((s, o) => s + o.montant, 0);
  const depA = ops().filter(o => o.type === "depense" && o.date.startsWith(an)).reduce((s, o) => s + o.montant, 0);
  ouvrir(`<div class="feuille-tete"><h2>Bilans</h2><button class="rond" data-fermer>✕</button></div>
    <div class="carte">
      ${ligne("📅", "Ce mois", joliMois(m), `${court(caMois() - depMois())}`, "plus")}
      ${ligne("📆", "Cette année", String(an), `${court(caA - depA)}`, "plus")}
      ${ligne("📈", "Chiffre d'affaires " + an, "", court(caA))}
      ${ligne("📉", "Dépenses " + an, "", court(depA), "moins")}
    </div>
    <button class="btn sec" id="pdf">Exporter le bilan (PDF)</button>
    <button class="btn sec" id="csv">Exporter les opérations (CSV)</button>
    <button class="btn sec" id="archives">Archives par mois</button>`, f => {
    $("#pdf", f).onclick = () => pdfBilan();
    $("#csv", f).onclick = () => exportCSV();
    $("#archives", f).onclick = archives;
  });
}

function archives() {
  const ms = [...new Set(ops().map(o => o.date.slice(0, 7)))].sort().reverse();
  ouvrir(`<div class="feuille-tete"><h2>Archives</h2><button class="rond" data-fermer>✕</button></div>
    <div class="carte">${ms.map(m => {
      const ca = caMois(m), dp = depMois(m);
      return ligne("🗂", joliMois(m), `CA ${court(ca)} · dépenses ${court(dp)}`, court(ca - dp), ca - dp >= 0 ? "plus" : "moins");
    }).join("") || `<div class="vide">Aucun historique.</div>`}</div>`);
}

/* ---------- factures ---------- */
function vueFactures() {
  ouvrir(`<div class="feuille-tete"><h2>Factures</h2><button class="rond" data-fermer>✕</button></div>
    <div class="carte">${factures().map(x => ligne("🧾", "N° " + x.numero, x.client + " · " + joliDate(x.date), fcfa(x.total))).join("") || `<div class="vide">Aucune facture.</div>`}</div>
    <button class="btn" id="ajout">Créer une facture</button>`, f => {
    $("#ajout", f).onclick = facture;
  });
}

function facture() {
  ouvrir(`<div class="feuille-tete"><h2>Nouvelle facture</h2><button class="rond" data-fermer>✕</button></div>
    <label class="etq">Client</label><input class="saisie" id="client" placeholder="Nom du client">
    <label class="etq">Articles</label>
    <textarea class="saisie" id="lignes" placeholder="Crocs;8500;2&#10;Sac cuir;24500;1"></textarea>
    <p class="mini">Une ligne par article : nom;prix;quantité</p>
    <button class="btn" id="ok">Générer la facture</button>`, f => {
    $("#ok", f).onclick = () => {
      const client = $("#client", f).value.trim() || "Client";
      const lignes = $("#lignes", f).value.split(/\r?\n/).filter(Boolean).map(l => {
        const [nom, prix, q] = l.split(";");
        return { nom: (nom || "").trim(), prix: +prix || 0, qte: +q || 1 };
      }).filter(l => l.nom);
      if (!lignes.length) return toast("Ajoutez au moins un article");
      const total = lignes.reduce((s, l) => s + l.prix * l.qte, 0);
      const numero = "F" + String(factures().length + 1).padStart(4, "0");
      DB.factures.push({ id: uid(), ent: E(), numero, client, lignes, total, date: jour() });
      sauver(); fermer();
      pdfFacture({ numero, client, lignes, total, date: jour() });
      rendre();
    };
  });
}

/* ---------- assistant local ---------- */
function assistant() {
  ouvrir(`<div class="feuille-tete"><h2>Assistant</h2><button class="rond" data-fermer>✕</button></div>
    <p class="mini">Écrivez comme vous parlez : « dépense 5000 taxi », « combien j'ai dépensé ce mois », « où économiser ».</p>
    <input class="saisie" id="q" placeholder="Votre phrase…" autocomplete="off">
    <button class="btn" id="ok">Envoyer</button>
    <div id="rep" class="carte" style="margin-top:14px;display:none"></div>`, f => {
    const repondre = () => {
      const q = $("#q", f).value.trim();
      if (!q) return;
      const r = analyser(q);
      const box = $("#rep", f);
      box.style.display = "block";
      box.innerHTML = r;
      $("#q", f).value = "";
      if (r.includes("data-ok")) rendre();
    };
    $("#ok", f).onclick = repondre;
    $("#q", f).onkeydown = e => { if (e.key === "Enter") repondre(); };
  });
}

function analyser(q) {
  const t = q.toLowerCase();
  const m = t.match(/(\d[\d\s.,]*)/);
  const montant = m ? +m[1].replace(/[\s.,]/g, "") : 0;

  if (/(dépense|depense|payé|paye|acheté|achete|sortie)/.test(t) && montant) {
    const cat = (cats("depense").find(c => t.includes(c.nom.toLowerCase())) || { nom: "Dépenses" }).nom;
    DB.operations.push({ id: uid(), ent: E(), type: "depense", montant, categorie: cat, compte: comptes()[0] ? comptes()[0].id : null, date: jour(), note: q.slice(0, 60), cree: Date.now() });
    sauver();
    return `<b style="color:var(--ok)">Dépense enregistrée</b><br>${fcfa(montant)} en ${esc(cat)}. <span data-ok></span>`;
  }
  if (/(revenu|reçu|recu|vendu|vente|encaissé|encaisse|gagné|gagne)/.test(t) && montant) {
    DB.operations.push({ id: uid(), ent: E(), type: "revenu", montant, categorie: "Ventes", compte: comptes()[0] ? comptes()[0].id : null, date: jour(), note: q.slice(0, 60), cree: Date.now() });
    sauver();
    return `<b style="color:var(--ok)">Revenu enregistré</b><br>${fcfa(montant)}. <span data-ok></span>`;
  }
  if (/(combien|total|somme).*(dépens|depens)/.test(t)) {
    return `Ce mois : <b>${fcfa(depMois())}</b> de dépenses.<br>Le plus gros poste : ${depensesParCategorie()[0] ? depensesParCategorie()[0][0] + " (" + fcfa(depensesParCategorie()[0][1]) + ")" : "aucun"}.`;
  }
  if (/(bénéfice|benefice|gagné|marge)/.test(t)) {
    return `Bénéfice de ${joliMois(mois())} : <b>${fcfa(caMois() - depMois())}</b>.<br>CA ${fcfa(caMois())} − dépenses ${fcfa(depMois())}.`;
  }
  if (/(économis|economis|conseil|réduire|reduire)/.test(t)) {
    const d = depensesParCategorie().slice(0, 3);
    if (!d.length) return "Pas encore assez de données. Enregistrez quelques dépenses et je vous dirai où couper.";
    return `Vos trois postes les plus lourds ce mois :<br>` +
      d.map(([k, v], i) => `${i + 1}. ${esc(k)} — ${fcfa(v)}`).join("<br>") +
      `<br><br>Le premier représente ${Math.round((d[0][1] / Math.max(1, depMois())) * 100)} % de vos dépenses. C'est là qu'un effort de 10 % se voit tout de suite.`;
  }
  if (/(solde|combien.*reste)/.test(t)) return `Solde total : <b>${fcfa(soldeTotal())}</b> sur ${comptes().length} compte(s).`;
  return `Je sais enregistrer une dépense ou un revenu (« dépense 5000 transport »), donner votre solde, votre bénéfice, vos postes de dépense et des conseils d'économie. Réessayez avec un montant.`;
}

/* ---------- entreprises ---------- */
function entreprises() {
  ouvrir(`<div class="feuille-tete"><h2>Entreprises</h2><button class="rond" data-fermer>✕</button></div>
    <div class="carte">${DB.entreprises.map(e => ligne("🏢", e.nom, e.type === "personnel" ? "Personnel" : "Entreprise", e.id === E() ? "actif" : "▸")).join("")}</div>
    <button class="btn" id="ajout">Créer un espace</button>`, f => {
    $$(".ligne", f).forEach((el, i) => el.onclick = () => { DB.active = DB.entreprises[i].id; sauver(); fermer(); rendre(); toast("Espace : " + DB.entreprises[i].nom); });
    $("#ajout", f).onclick = () => {
      const nom = prompt("Nom de l'entreprise"); if (!nom) return;
      const perso = (prompt("Type : entreprise ou personnel", "entreprise") || "").toLowerCase().includes("perso");
      const id = uid();
      DB.entreprises.push({ id, nom: nom.trim(), type: perso ? "personnel" : "entreprise" });
      DB.comptes.push({ id: uid(), ent: id, nom: perso ? "Espèces" : "Caisse", type: "caisse", solde: 0 });
      DB.active = id; sauver(); fermer(); rendre();
    };
  });
}

/* ---------- sauvegarde ---------- */
function sauvegarde() {
  ouvrir(`<div class="feuille-tete"><h2>Sauvegarde</h2><button class="rond" data-fermer>✕</button></div>
    <p class="mini">Le fichier contient toutes vos données : entreprises, comptes, opérations, stock, dettes, factures.</p>
    <button class="btn" id="exp">Exporter mes données</button>
    <button class="btn sec" id="imp">Restaurer une sauvegarde</button>
    <input type="file" id="file" accept=".json,application/json" hidden>
    <p class="mini" style="margin-top:14px">Dernière sauvegarde automatique : à chaque modification, dans la mémoire de l'application.</p>`, f => {
    $("#exp", f).onclick = () => {
      const txt = JSON.stringify(DB, null, 2);
      ecrireFichier("grand-livre-sauvegarde-" + jour() + ".json", "application/json", txt);
    };
    $("#imp", f).onclick = () => $("#file", f).click();
    $("#file", f).onchange = e => {
      const fl = e.target.files[0]; if (!fl) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const d = JSON.parse(r.result);
          if (!d.entreprises) throw 0;
          DB = d; sauver(); fermer(); toast("Sauvegarde restaurée"); rendre();
        } catch (err) { toast("Fichier invalide"); }
      };
      r.readAsText(fl);
    };
  });
}

/* ---------- réglages ---------- */
function reglages() {
  ouvrir(`<div class="feuille-tete"><h2>Réglages</h2><button class="rond" data-fermer>✕</button></div>
    <div class="carte">
      ${ligne("◐", "Thème", DB.reglages.theme === "clair" ? "clair" : "sombre", "changer")}
      ${ligne("🔒", "Code d'accès", DB.reglages.pin ? "activé" : "aucun", "changer")}
      ${ligne("ℹ", "Version", "Grand Livre 1.0", "")}
    </div>
    <button class="btn danger" id="raz">Réinitialiser toutes les données</button>`, f => {
    $$(".ligne", f)[0].onclick = () => { basculerTheme(); fermer(); };
    $$(".ligne", f)[1].onclick = definirPin;
    $("#raz", f).onclick = () => {
      if (!confirm("Effacer toutes les données ? Cette action est définitive.")) return;
      localStorage.removeItem(CLE); charger(); fermer(); rendre(); toast("Données effacées");
    };
  });
}

function basculerTheme() {
  const clair = DB.reglages.theme !== "clair";
  DB.reglages.theme = clair ? "clair" : "sombre";
  document.documentElement.dataset.theme = clair ? "clair" : "sombre";
  sauver();
}

function definirPin() {
  const p = prompt("Nouveau code à 4 chiffres (laisser vide pour désactiver)", "");
  if (p === null) return;
  if (p === "") { DB.reglages.pin = ""; sauver(); toast("Code désactivé"); return; }
  if (!/^\d{4}$/.test(p)) return toast("4 chiffres attendus");
  DB.reglages.pin = p; sauver(); toast("Code activé");
}

/* ---------- verrou ---------- */
function verrouiller() {
  const pin = DB.reglages.pin;
  if (!pin) return;
  const v = $("#verrou"), pts = $("#verrou-points"), pave = $("#pave");
  v.hidden = false;
  let saisie = "";
  const maj = () => pts.innerHTML = [0, 1, 2, 3].map(i => `<i class="${i < saisie.length ? "on" : ""}"></i>`).join("");
  maj();
  pave.innerHTML = "";
  ["1","2","3","4","5","6","7","8","9","","0","⌫"].forEach(t => {
    const b = document.createElement("button");
    b.textContent = t;
    if (!t) { b.style.visibility = "hidden"; }
    b.onclick = () => {
      if (t === "⌫") saisie = saisie.slice(0, -1);
      else if (t && saisie.length < 4) saisie += t;
      maj();
      if (saisie.length === 4) {
        if (saisie === pin) { v.hidden = true; }
        else { $("#verrou-msg").textContent = "Code incorrect"; saisie = ""; maj(); }
      }
    };
    pave.appendChild(b);
  });
}

/* ---------- fichiers ---------- */
function ecrireFichier(nom, mime, contenu) {
  if (window.Nexus && window.Nexus.saveFile) {
    try {
      const b64 = btoa(unescape(encodeURIComponent(contenu)));
      const chemin = window.Nexus.saveFile(nom, mime, b64);
      toast("Enregistré : " + (chemin || nom));
      return;
    } catch (e) { /* on retombe sur le téléchargement */ }
  }
  const blob = new Blob([contenu], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
  toast("Fichier : " + nom);
}

function exportCSV() {
  const entetes = ["date", "type", "categorie", "montant", "note"];
  const lignes = ops().map(o => [o.date, o.type, o.categorie || "", o.montant, (o.note || "").replace(/;/g, ",")].join(";"));
  ecrireFichier("operations-" + jour() + ".csv", "text/csv", [entetes.join(";")].concat(lignes).join("\n"));
}

/* ---------- PDF minimal ---------- */
function pdfDe(lignes) {
  const pages = [];
  const parPage = 42;
  for (let i = 0; i < lignes.length; i += parPage) pages.push(lignes.slice(i, i + parPage));
  if (!pages.length) pages.push([""]);

  const objets = [];
  const contenu = p => {
    let s = "BT\n/F1 11 Tf\n50 800 Td\n14 TL\n";
    p.forEach(l => { s += "(" + String(l).replace(/([()\\])/g, "\\$1").replace(/[^\x20-\x7E]/g, "?") + ") Tj\nT*\n"; });
    return s + "ET";
  };
  const nbPages = pages.length;
  objets.push("<< /Type /Catalog /Pages 2 0 R >>");
  const kids = [];
  for (let i = 0; i < nbPages; i++) kids.push((3 + i * 2) + " 0 R");
  objets.push("<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + nbPages + " >>");
  pages.forEach((p, i) => {
    const c = contenu(p);
    objets.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 " + (3 + nbPages * 2) + " 0 R >> >> /Contents " + (4 + i * 2) + " 0 R >>");
    objets.push("<< /Length " + c.length + " >>\nstream\n" + c + "\nendstream");
  });
  objets.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objets.forEach((o, i) => { offsets.push(pdf.length); pdf += (i + 1) + " 0 obj\n" + o + "\nendobj\n"; });
  const xref = pdf.length;
  pdf += "xref\n0 " + (objets.length + 1) + "\n0000000000 65535 f \n";
  offsets.forEach(o => { pdf += String(o).padStart(10, "0") + " 00000 n \n"; });
  pdf += "trailer\n<< /Size " + (objets.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";
  return pdf;
}

function pdfFacture(f) {
  const e = DB.entreprises.find(x => x.id === E()) || { nom: "Mon entreprise" };
  const L = [];
  L.push(e.nom.toUpperCase());
  L.push("Facture n° " + f.numero + "   -   " + joliDate(f.date));
  L.push("");
  L.push("Client : " + f.client);
  L.push("");
  L.push("Article                       Qte      Prix unit.        Total");
  L.push("---------------------------------------------------------------");
  f.lignes.forEach(l => {
    const nom = (l.nom + "                              ").slice(0, 28);
    L.push(nom + String(l.qte).padStart(4) + "   " + fcfa(l.prix).padStart(14) + "   " + fcfa(l.prix * l.qte).padStart(14));
  });
  L.push("---------------------------------------------------------------");
  L.push("TOTAL A PAYER".padEnd(46) + fcfa(f.total).padStart(14));
  L.push("");
  L.push("Merci de votre confiance.");
  ecrireFichier("facture-" + f.numero + ".pdf", "application/pdf", pdfDe(L));
}

function pdfBilan() {
  const m = mois(), an = new Date().getFullYear();
  const e = DB.entreprises.find(x => x.id === E()) || { nom: "Mon entreprise" };
  const L = [
    e.nom.toUpperCase() + " - BILAN",
    "Édité le " + joliDate(jour()),
    "",
    "Mois " + joliMois(m),
    "  Chiffre d'affaires : " + fcfa(caMois()),
    "  Dépenses           : " + fcfa(depMois()),
    "  Bénéfice           : " + fcfa(caMois() - depMois()),
    "",
    "Année " + an,
    "  Chiffre d'affaires : " + fcfa(ops().filter(o => o.type === "revenu" && o.date.startsWith(an)).reduce((s, o) => s + o.montant, 0)),
    "  Dépenses           : " + fcfa(ops().filter(o => o.type === "depense" && o.date.startsWith(an)).reduce((s, o) => s + o.montant, 0)),
    "",
    "Comptes",
    ...comptes().map(c => "  " + c.nom.padEnd(22) + fcfa(soldeCompte(c))),
    "",
    "Dépenses par catégorie (mois)",
    ...depensesParCategorie().map(([k, v]) => "  " + k.padEnd(22) + fcfa(v)),
    "",
    "Produits les plus vendus",
    ...topProduits(8).map(t => "  " + t.p.nom.padEnd(22) + t.vendu + " vendu(s), bénéfice " + fcfa(beneficeProduit(t.p)))
  ];
  ecrireFichier("bilan-" + m + ".pdf", "application/pdf", pdfDe(L));
}

/* ---------- graphiques ---------- */
function dessinerCourbe(cv, serie) {
  if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const L = cv.clientWidth || 300, H = cv.clientHeight || 170;
  cv.width = L * dpr; cv.height = H * dpr;
  const x = cv.getContext("2d");
  x.scale(dpr, dpr);
  const style = getComputedStyle(document.documentElement);
  const or = style.getPropertyValue("--or").trim() || "#e0b457";
  const ok = style.getPropertyValue("--ok").trim() || "#3fbf7f";
  const ko = style.getPropertyValue("--ko").trim() || "#e0574a";
  const mu = style.getPropertyValue("--mu").trim() || "#9a927f";
  const max = Math.max(1, ...serie.map(s => Math.max(s.ca, s.dep)));
  const pad = 8, bas = H - 18, haut = 10;
  x.clearRect(0, 0, L, H);

  x.strokeStyle = "rgba(150,150,150,.15)";
  x.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = haut + (bas - haut) * (i / 3);
    x.beginPath(); x.moveTo(pad, y); x.lineTo(L - pad, y); x.stroke();
  }

  const px = i => pad + (L - pad * 2) * (serie.length === 1 ? .5 : i / (serie.length - 1));
  const py = v => bas - (bas - haut) * (v / max);

  const trace = (cle, coul) => {
    x.beginPath(); x.lineWidth = 2.4; x.strokeStyle = coul; x.lineJoin = "round";
    serie.forEach((s, i) => { const X = px(i), Y = py(s[cle]); i ? x.lineTo(X, Y) : x.moveTo(X, Y); });
    x.stroke();
    serie.forEach((s, i) => {
      x.beginPath(); x.arc(px(i), py(s[cle]), 3, 0, 7); x.fillStyle = coul; x.fill();
    });
  };
  trace("ca", ok); trace("dep", ko);

  x.fillStyle = mu; x.font = "10px sans-serif"; x.textAlign = "center";
  serie.forEach((s, i) => x.fillText(s.m.slice(5), px(i), H - 4));
}

/* ---------- démarrage ---------- */
function demarrer() {
  charger();
  document.documentElement.dataset.theme = DB.reglages.theme === "clair" ? "clair" : "sombre";
  majEntete();
  rendre();
  verrouiller();

  $("#fab").onclick = ajoutRapide;
  $("#voile").onclick = fermer;
  $("#btn-theme").onclick = basculerTheme;
  $("#btn-entreprise").onclick = entreprises;
  $("#btn-recherche").onclick = () => {
    $("#feuille-recherche").hidden = false; $("#voile").hidden = false;
    $("#champ-recherche").focus();
    $("#champ-recherche").oninput = e => {
      const q = e.target.value.trim().toLowerCase();
      const box = $("#resultats");
      if (q.length < 2) { box.innerHTML = ""; return; }
      const res = [];
      produits().filter(p => p.nom.toLowerCase().includes(q)).forEach(p => res.push(["▣", p.nom, fcfa(p.vente)]));
      tiers().filter(t => t.nom.toLowerCase().includes(q)).forEach(t => res.push(["👤", t.nom, t.tel || ""]));
      ops().filter(o => (o.note || "").toLowerCase().includes(q) || (o.categorie || "").toLowerCase().includes(q))
        .slice(0, 6).forEach(o => res.push([o.type === "revenu" ? "↑" : "↓", (o.categorie || "") + " " + (o.note || ""), fcfa(o.montant)]));
      box.innerHTML = res.length ? res.slice(0, 20).map(r => ligne(r[0], r[1], "", r[2])).join("") : `<div class="vide">Rien trouvé.</div>`;
    };
  };
  $$("[data-fermer]", $("#feuille-recherche")).forEach(b => b.onclick = () => { $("#feuille-recherche").hidden = true; $("#voile").hidden = true; });
}

document.addEventListener("DOMContentLoaded", demarrer);

/* API pour les tests */
window.GL = { get DB() { return DB; }, analyser, pdfDe, serie6mois, soldeTotal, margeProduit };
})();
