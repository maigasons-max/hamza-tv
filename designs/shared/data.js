/* Données partagées par les trois directions artistiques.
   Remplacer par les vrais articles et les vraies commandes : la structure ne bouge pas. */

const UNIVERS = [
  { id: "tech",   nom: "Tech",   sous: "téléphones, audio, ordinateurs" },
  { id: "mode",   nom: "Mode",   sous: "vêtements, chaussures, sacs" },
  { id: "maison", nom: "Maison", sous: "cuisine, déco, rangement" },
  { id: "beaute", nom: "Beauté", sous: "soin, parfum, cheveux" },
  { id: "moto",   nom: "Motos",  sous: "deux-roues, casques, pièces" },
  { id: "auto",   nom: "Autos",  sous: "voitures, entretien, accessoires" }
];

const PRODUITS = [
  { id:"p1", cat:"tech", nom:"Téléphone Nova X", sous:"128 Go · 5G", prix:185000, achat:142000, stock:14,
    desc:"Écran 6,6 pouces 120 Hz, batterie deux jours, double SIM. Chargeur 33 W et coque fournis.",
    variantes:["128 Go","256 Go"], avis:[] },
  { id:"p2", cat:"tech", nom:"Casque Aura", sous:"réduction de bruit", prix:47500, achat:31000, stock:31,
    desc:"Trente heures d'autonomie, coussinets à mémoire, mode transparence.", variantes:["Noir","Sable"], avis:[] },
  { id:"p3", cat:"mode", nom:"Veste Sahara", sous:"coton lourd", prix:32000, achat:17500, stock:22,
    desc:"Coupe droite, épaules tombantes, deux poches profondes. Se porte ouverte ou fermée.",
    variantes:["S","M","L","XL"], avis:[] },
  { id:"p4", cat:"mode", nom:"Sneakers Kano", sous:"semelle crantée", prix:38000, achat:21000, stock:18,
    desc:"Mesh respirant, semelle qui accroche sur sable comme sur goudron.", variantes:["40","41","42","43","44"], avis:[] },
  { id:"p5", cat:"maison", nom:"Marmite fonte 5 L", sous:"cuisson lente", prix:27500, achat:16000, stock:9,
    desc:"Fonte émaillée, couvercle qui garde l'humidité. Sauces longues et pain.", variantes:["Noir","Terracotta"], avis:[] },
  { id:"p6", cat:"maison", nom:"Lampe Cercle", sous:"lumière chaude", prix:19000, achat:9500, stock:26,
    desc:"Anneau de 40 cm, intensité réglable au doigt, au sol ou sur un meuble.", variantes:["Blanc","Noir"], avis:[] },
  { id:"p7", cat:"beaute", nom:"Huile Karité brute", sous:"100 % pressée", prix:6500, achat:2600, stock:64,
    desc:"Beurre de karité non raffiné du Burkina, sans parfum ajouté. Peau et cheveux.", variantes:["250 ml","500 ml"], avis:[] },
  { id:"p8", cat:"moto", nom:"Casque Route 3", sous:"homologué", prix:42000, achat:27000, stock:11,
    desc:"Écran clair et fumé fournis, mousses amovibles, fermeture micrométrique.", variantes:["M","L","XL"], avis:[] },
  { id:"p9", cat:"moto", nom:"Moto Urban 125", sous:"neuve · garantie 1 an", prix:795000, achat:690000, stock:3,
    desc:"125 cm³, 2,1 L/100, selle biplace, porte-bagages. Carte grise incluse.", variantes:["Rouge","Noir"], avis:[] },
  { id:"p10", cat:"auto", nom:"Toyota d'occasion", sous:"essence · 2014", prix:4200000, achat:3750000, stock:1,
    desc:"Révisée, pneus neufs, climatisation froide. Essai sur rendez-vous.", variantes:["Manuelle"], avis:[] },
  { id:"p11", cat:"auto", nom:"Kit entretien", sous:"huile + filtres", prix:14500, achat:8200, stock:40,
    desc:"Huile 5W30 4 L, filtre à huile, filtre à air. Moteurs essence courants.", variantes:["Essence","Diesel"], avis:[] },
  { id:"p12", cat:"beaute", nom:"Savon noir doux", sous:"argile + karité", prix:2500, achat:900, stock:120,
    desc:"Nettoie sans dessécher, convient au visage. Fabriqué à Ouagadougou.", variantes:["100 g"], avis:[] }
];

/* Commandes de démonstration : servent aux calculs du tableau de bord. */
const COMMANDES = (() => {
  const base = [
    ["p1",1,"payee"],["p7",4,"payee"],["p3",2,"payee"],["p2",1,"payee"],["p12",6,"payee"],
    ["p4",1,"payee"],["p6",2,"payee"],["p11",3,"payee"],["p1",1,"payee"],["p9",1,"payee"],
    ["p7",8,"payee"],["p3",1,"payee"],["p5",1,"payee"],["p8",2,"payee"],["p12",10,"payee"],
    ["p2",2,"attente"],["p4",1,"attente"],["p10",1,"attente"],["p6",1,"annulee"],["p7",2,"payee"]
  ];
  const jour = 86400000, maintenant = Date.now();
  return base.map((c, i) => {
    const p = PRODUITS.find(x => x.id === c[0]);
    const quand = maintenant - ((i * 37) % 28) * jour - (i % 7) * 3600000;
    return {
      id: "CMD-" + (1024 + i), produit: p.id, nom: p.nom, quantite: c[1],
      total: p.prix * c[1], cout: p.achat * c[1],
      statut: c[2], date: new Date(quand).toISOString(), canal: i % 3 === 0 ? "WhatsApp" : "Site"
    };
  });
})();

const fcfa = n => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " F";

function stats() {
  const payees = COMMANDES.filter(c => c.statut === "payee");
  const ca = payees.reduce((s, c) => s + c.total, 0);
  const cout = payees.reduce((s, c) => s + c.cout, 0);
  const marge = ca - cout;
  const panier = payees.length ? ca / payees.length : 0;
  const parJour = {};
  payees.forEach(c => {
    const j = c.date.slice(0, 10);
    parJour[j] = (parJour[j] || 0) + c.total;
  });
  const jours = Object.keys(parJour).sort().slice(-14);
  const ventesParProduit = {};
  payees.forEach(c => {
    ventesParProduit[c.produit] = ventesParProduit[c.produit] || { unite: 0, ca: 0, nom: c.nom };
    ventesParProduit[c.produit].unite += c.quantite;
    ventesParProduit[c.produit].ca += c.total;
  });
  const top = Object.entries(ventesParProduit).sort((a, b) => b[1].ca - a[1].ca);
  return {
    ca, marge, cout, panier,
    commandes: COMMANDES.length,
    payees: payees.length,
    attente: COMMANDES.filter(c => c.statut === "attente").length,
    annulees: COMMANDES.filter(c => c.statut === "annulee").length,
    tauxMarge: ca ? (marge / ca) * 100 : 0,
    jours, serie: jours.map(j => parJour[j]),
    top,
    stockFaible: PRODUITS.filter(p => p.stock <= 10).sort((a, b) => a.stock - b.stock)
  };
}

/* Lecture des avis : jamais d'invention. */
function blocAvis(p) {
  if (p.avis && p.avis.length) {
    return `<div class="avis-liste">${p.avis.map(a => `
      <div class="avis-item">
        <div class="avis-tete"><span>${a.auteur} · achat vérifié</span><span>${"★".repeat(a.note)}${"☆".repeat(5 - a.note)}</span></div>
        <p>${a.texte}</p>
      </div>`).join("")}</div>`;
  }
  return `<div class="avis-vide">
    <strong>Pas encore d'avis sur cette pièce.</strong>
    <p>Nous n'écrivons pas de faux commentaires pour remplir la page. Les avis arriveront après les premières livraisons, avec numéro de commande vérifié.</p>
  </div>`;
}

/* Essayage : photo locale, vêtement posé dessus, rien n'est envoyé. */
const PIECE_SVG = {
  tee: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="400" height="400"><path d="M32 22 L20 30 L14 44 L26 50 L26 82 L74 82 L74 50 L86 44 L80 30 L68 22 C62 30 38 30 32 22 Z" fill="#e8552e" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/></svg>`,
  veste: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="400" height="400"><path d="M32 20 L18 30 L12 62 L24 66 L24 84 L48 84 L48 24 Z" fill="#3b4bff" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/><path d="M68 20 L82 30 L88 62 L76 66 L76 84 L52 84 L52 24 Z" fill="#3242e0" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/></svg>`,
  robe: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="400" height="400"><path d="M36 22 L30 34 L22 84 L78 84 L70 34 L64 22 C58 28 42 28 36 22 Z" fill="#8a6bff" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/></svg>`
};

function monterEssayage(racine, options = {}) {
  const toile = racine.querySelector("canvas");
  const champ = racine.querySelector("input[type=file]");
  const etat = { photo: null, piece: options.piece || "tee", taille: 80, y: 0, rot: 0, op: 92 };

  const dessiner = () => {
    const ctx = toile.getContext("2d");
    ctx.clearRect(0, 0, toile.width, toile.height);
    if (!etat.photo) return;
    const r = Math.min(toile.width / etat.photo.width, toile.height / etat.photo.height);
    const w = etat.photo.width * r, h = etat.photo.height * r;
    ctx.drawImage(etat.photo, (toile.width - w) / 2, (toile.height - h) / 2, w, h);
    const img = new Image();
    img.onload = () => {
      const taille = toile.width * (etat.taille / 100);
      ctx.save();
      ctx.globalAlpha = etat.op / 100;
      ctx.translate(toile.width / 2, toile.height / 2 + (etat.y / 100) * toile.height);
      ctx.rotate(etat.rot * Math.PI / 180);
      ctx.drawImage(img, -taille / 2, -taille / 2, taille, taille);
      ctx.restore();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(PIECE_SVG[etat.piece])));
  };

  champ.onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1100, k = Math.min(1, max / Math.max(img.width, img.height));
        toile.width = Math.round(img.width * k);
        toile.height = Math.round(img.height * k);
        etat.photo = img;
        racine.classList.add("a-photo");
        dessiner();
      };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(f);
  };

  racine.querySelectorAll("[data-piece]").forEach(b => b.onclick = () => {
    etat.piece = b.dataset.piece;
    racine.querySelectorAll("[data-piece]").forEach(x => x.setAttribute("aria-pressed", x === b));
    dessiner();
  });
  ["taille", "y", "rot", "op"].forEach(k => {
    const r = racine.querySelector(`[data-reglage="${k}"]`);
    if (r) r.oninput = () => { etat[k] = +r.value; dessiner(); };
  });
  const enregistrer = racine.querySelector("[data-enregistrer]");
  if (enregistrer) enregistrer.onclick = () => {
    if (!etat.photo) return;
    const a = document.createElement("a");
    a.download = "essayage.png";
    a.href = toile.toDataURL("image/png");
    a.click();
  };
  return etat;
}
