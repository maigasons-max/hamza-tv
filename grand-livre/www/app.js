(function () {
  "use strict";

  var ICONES = {
    accueil: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/>',
    ecritures: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
    stock: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
    argent: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="17" cy="15" r="1.4"/>',
    tout: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    entree: '<path d="M12 4v13"/><path d="m6.5 11.5 5.5 5.5 5.5-5.5"/><path d="M4 21h16"/>',
    sortie: '<path d="M12 21V8"/><path d="m6.5 13.5 5.5-5.5 5.5 5.5"/><path d="M4 3h16"/>',
    echange: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    panier: '<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.6 10.5h10.2L20 7H6"/>',
    utilisateurs: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20c0-3.4 2.8-5.6 6.2-5.6s6.2 2.2 6.2 5.6"/><path d="M17 5.2a3.2 3.2 0 0 1 0 6M18.4 20c0-2.2-.6-3.8-1.8-4.8"/>',
    facture: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    livre: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M8 7h8M8 11h8"/>',
    balance: '<path d="M12 3v18M5 7h14"/><path d="M5 7 2.5 13h5zM19 7l-2.5 6h5z"/>',
    tva: '<circle cx="8" cy="8" r="2.4"/><circle cx="16" cy="16" r="2.4"/><path d="M18 5 6 19"/>',
    graphique: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="m7 15 4-5 3 3 4-6"/>',
    agenda: '<rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
    import: '<path d="M12 15V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    sauvegarde: '<path d="M12 4v10"/><path d="m8 10 4 4 4-4"/><path d="M4 18h16"/>',
    reglages: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 14.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9 2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2 2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9 2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.5 1z"/>',
    cle: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M17 12v4M20 12v3"/>',
    dettes: '<path d="M4 6h16v12H4z"/><path d="M8 10h8M8 14h4"/>',
    employes: '<circle cx="12" cy="7" r="3"/><path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5"/>',
    entreprise: '<path d="M3 21V8l6-4v17"/><path d="M9 21V11l6-3v13"/><path d="M15 21V12l6 3v6"/>'
  };

  function ico(nom, cls) {
    return '<svg viewBox="0 0 24 24" class="' + (cls || "") + '" stroke-linecap="round" stroke-linejoin="round">' + (ICONES[nom] || "") + '</svg>';
  }

  var SYNC = "https://solas-a1f836e8.base44.app/functions/grandLivreSync";
  var CLE_DB = "grand-livre-v2";
  var CLE_CODE = "grand-livre-code";

  var S = { db: null, code: "", revision: 0, enLigne: false, onglet: "accueil", filtre: "tout", minuteur: null, tirage: null };

  function fcfa(n) {
    var v = Math.round(Number(n) || 0);
    return v.toLocaleString("fr-FR").replace(/\u202f/g, " ") + " F";
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function jour(d) { var x = d ? new Date(d) : new Date(); return x.toISOString().slice(0, 10); }
  function mois(d) { return (d || jour()).slice(0, 7); }
  function moisLisible(m) {
    var noms = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    return noms[parseInt(m.slice(5, 7), 10) - 1] + " " + m.slice(0, 4);
  }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function baseVide(nom) {
    return {
      entreprise: { nom: nom || "AURA Global", type: "entreprise" },
      comptes: [
        { id: uid(), nom: "Caisse", type: "caisse", solde: 0 },
        { id: uid(), nom: "Orange Money", type: "mobile", solde: 0 },
        { id: uid(), nom: "Banque", type: "banque", solde: 0 }
      ],
      operations: [], produits: [], mouvements: [], clients: [], dettes: [],
      employes: [], factures: [], agenda: [],
      categories: [
        { id: uid(), nom: "Ventes", sens: "entree" },
        { id: uid(), nom: "Achats", sens: "sortie" },
        { id: uid(), nom: "Transport", sens: "sortie" },
        { id: uid(), nom: "Salaires", sens: "sortie" },
        { id: uid(), nom: "Loyer", sens: "sortie" },
        { id: uid(), nom: "Divers", sens: "sortie" }
      ]
    };
  }

  function charger() {
    try { S.db = JSON.parse(localStorage.getItem(CLE_DB) || "null"); } catch (e) { S.db = null; }
    if (!S.db || !S.db.entreprise) S.db = baseVide();
    S.code = localStorage.getItem(CLE_CODE) || "";
  }
  function enregistrer() {
    localStorage.setItem(CLE_DB, JSON.stringify(S.db));
    planifierEnvoi();
  }

  function etat(texte, classe) {
    var el = document.getElementById("entete-etat");
    if (!el) return;
    el.className = "etat " + (classe || "");
    el.innerHTML = '<i class="pastille"></i> ' + texte;
  }

  function avis(texte) {
    var el = document.getElementById("avis");
    el.textContent = texte;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.hidden = true; }, 2600);
  }

  function notifier(titre, texte) {
    if (window.Nexus && window.Nexus.notifier) {
      try { window.Nexus.notifier(titre, texte); } catch (e) {}
    }
    avis(texte);
  }

  function appeler(charge) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var minuteur = setTimeout(function () { if (ctrl) ctrl.abort(); }, 7000);
    return fetch(SYNC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(charge),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      clearTimeout(minuteur);
      if (!r.ok) throw new Error("indisponible");
      return r.json();
    }).catch(function (e) { clearTimeout(minuteur); throw e; });
  }

  function planifierEnvoi() {
    clearTimeout(S.minuteur);
    S.minuteur = setTimeout(function () { envoyer(); }, 900);
  }

  function envoyer() {
    if (!S.code) return;
    etat("Envoi…", "attente");
    appeler({ action: "push", code: S.code, payload: JSON.stringify(S.db), revision: S.revision, entreprise: S.db.entreprise.nom })
      .then(function (r) {
        if (r && r.ok) { S.revision = r.revision; S.enLigne = true; etat("Synchronisé", ""); }
        else { etat("Sur ce téléphone", "hors"); }
      })
      .catch(function () { etat("Sur ce téléphone", "hors"); });
  }

  function recevoir() {
    if (!S.code) return Promise.resolve();
    return appeler({ action: "pull", code: S.code }).then(function (r) {
      if (r && r.ok && r.payload) {
        if ((r.revision || 0) >= S.revision) {
          try {
            var distant = JSON.parse(r.payload);
            if (distant && distant.entreprise) {
              S.db = distant;
              S.revision = r.revision || 0;
              localStorage.setItem(CLE_DB, JSON.stringify(S.db));
              S.enLigne = true;
              etat("Synchronisé", "");
              rendre();
            }
          } catch (e) {}
        }
      }
    }).catch(function () { etat("Hors ligne", "hors"); });
  }

  function totalCompte(id) {
    var c = S.db.comptes.filter(function (x) { return x.id === id; })[0];
    if (!c) return 0;
    var s = Number(c.solde) || 0;
    S.db.operations.forEach(function (o) {
      if (o.compte !== id) return;
      if (o.sens === "entree") s += Number(o.montant) || 0;
      else if (o.sens === "sortie") s -= Number(o.montant) || 0;
    });
    return s;
  }
  function soldeTotal() {
    return S.db.comptes.reduce(function (t, c) { return t + totalCompte(c.id); }, 0);
  }
  function sommeOps(type, m) {
    return S.db.operations.filter(function (o) {
      return o.sens === type && (!m || o.date.slice(0, 7) === m);
    }).reduce(function (t, o) { return t + (Number(o.montant) || 0); }, 0);
  }
  function creances() {
    return S.db.dettes.filter(function (d) { return d.sens === "on_me_doit"; })
      .reduce(function (t, d) { return t + resteDette(d); }, 0);
  }
  function doit() {
    return S.db.dettes.filter(function (d) { return d.sens === "je_dois"; })
      .reduce(function (t, d) { return t + resteDette(d); }, 0);
  }
  function resteDette(d) {
    var paye = (d.paiements || []).reduce(function (t, p) { return t + (Number(p.montant) || 0); }, 0);
    return Math.max(0, (Number(d.montant) || 0) - paye);
  }
  function margeProduit(p) { return (Number(p.vente) || 0) - (Number(p.achat) || 0); }

  function vueAccueil() {
    var m = mois();
    var ca = sommeOps("entree", m), dep = sommeOps("sortie", m);
    var benefice = ca - dep;
    var top = S.db.produits.slice().sort(function (a, b) { return (b.vendus || 0) - (a.vendus || 0); }).slice(0, 3);
    var alertes = S.db.produits.filter(function (p) { return (Number(p.qte) || 0) <= 3; }).slice(0, 4);
    var dernieres = S.db.operations.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 5);

    var h = "";
    h += '<div class="solde"><small>Solde total</small><b>' + fcfa(soldeTotal()) + "</b>";
    h += '<div class="ligne"><div><span>Recettes</span><i class="vert">' + fcfa(ca) + "</i></div>";
    h += '<div><span>Dépenses</span><i class="rouge">' + fcfa(dep) + "</i></div>";
    h += "<div><span>Bénéfice</span><i>" + fcfa(benefice) + "</i></div></div></div>";

    h += '<div class="duo">';
    h += '<div class="mini"><span>On me doit</span><b>' + fcfa(creances()) + "</b></div>";
    h += '<div class="mini"><span>Je dois</span><b>' + fcfa(doit()) + "</b></div>";
    h += "</div>";

    h += '<div class="bloc" style="margin-top:14px"><div class="bloc-titre"><h2>' + moisLisible(m) + "</h2><small>" + S.db.operations.filter(function (o) { return o.date.slice(0, 7) === m; }).length + " écritures</small></div>";
    h += '<div class="liste">';
    if (!dernieres.length) h += '<p class="vide">Aucune écriture. Touchez le bouton doré pour commencer.</p>';
    dernieres.forEach(function (o) {
      h += ligneOperation(o);
    });
    h += "</div></div>";

    if (alertes.length) {
      h += '<div class="bloc"><div class="bloc-titre"><h2>Stock à surveiller</h2><small>' + alertes.length + "</small></div><div class=\"liste\">";
      alertes.forEach(function (p) {
        h += '<div class="ligne-op"><span class="puce neutre">' + ico("stock") + '</span><div class="txt"><strong>' + esc(p.nom) + "</strong><span>" + (Number(p.qte) || 0) + " en stock</span></div>";
        h += '<span class="badge ko">Réassort</span></div>';
      });
      h += "</div></div>";
    }

    if (top.length) {
      h += '<div class="bloc"><div class="bloc-titre"><h2>Meilleures ventes</h2><small>marge</small></div><div class="liste">';
      top.forEach(function (p) {
        h += '<div class="ligne-op"><span class="puce neutre">' + ico("panier") + '</span><div class="txt"><strong>' + esc(p.nom) + "</strong><span>" + (p.vendus || 0) + " vendus</span></div>";
        h += '<span class="montant">' + fcfa(margeProduit(p)) + "</span></div>";
      });
      h += "</div></div>";
    }
    return h;
  }

  function ligneOperation(o) {
    var entre = o.sens === "entree";
    var c = S.db.comptes.filter(function (x) { return x.id === o.compte; })[0];
    var signe = entre ? "+" : "−";
    return '<div class="ligne-op"><span class="puce ' + (entre ? "entree" : "sortie") + '">' + ico(entre ? "entree" : "sortie") + "</span>" +
      '<div class="txt"><strong>' + esc(o.libelle || (o.categorie || "Écriture")) + "</strong><span>" + esc(o.categorie || "") + (c ? " · " + esc(c.nom) : "") + " · " + o.date.split("-").reverse().join("/") + "</span></div>" +
      '<span class="montant ' + (entre ? "vert" : "rouge") + '">' + signe + " " + fcfa(o.montant) + "</span></div>";
  }

  function vueEcritures() {
    var ops = S.db.operations.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    if (S.filtre !== "tout") ops = ops.filter(function (o) { return o.sens === S.filtre; });
    var h = '<div class="onglets">';
    [["tout", "Tout"], ["entree", "Recettes"], ["sortie", "Dépenses"]].forEach(function (f) {
      h += '<button data-act="filtre" data-v="' + f[0] + '" class="' + (S.filtre === f[0] ? "actif" : "") + '">' + f[1] + "</button>";
    });
    h += "</div>";
    h += '<div class="bloc"><div class="liste">';
    if (!ops.length) h += '<p class="vide">Aucune écriture pour ce filtre.</p>';
    ops.slice(0, 120).forEach(function (o) { h += ligneOperation(o); });
    h += "</div></div>";
    return h;
  }

  function vueStock() {
    var h = '<div class="bloc"><div class="bloc-titre"><h2>Produits</h2><small>' + S.db.produits.length + "</small></div>";
    h += '<button class="second" data-act="nouveau-produit">Ajouter un produit</button>';
    h += '<div class="liste" style="margin-top:12px">';
    if (!S.db.produits.length) h += '<p class="vide">Aucun produit. Ajoutez votre premier article.</p>';
    S.db.produits.forEach(function (p) {
      h += '<div class="ligne-op"><span class="puce neutre">' + ico("stock") + '</span><div class="txt"><strong>' + esc(p.nom) + "</strong><span>" + fcfa(p.vente) + " · marge " + fcfa(margeProduit(p)) + " · " + (Number(p.qte) || 0) + " en stock</span></div>";
      h += '<button class="badge ok" data-act="vendre" data-id="' + p.id + '">Vendre</button></div>';
    });
    h += "</div></div>";
    return h;
  }

  function vueArgent() {
    var h = '<div class="bloc"><div class="bloc-titre"><h2>Comptes</h2><small>' + fcfa(soldeTotal()) + "</small></div><div class=\"liste\">";
    S.db.comptes.forEach(function (c) {
      h += '<div class="ligne-op"><span class="puce neutre">' + ico("argent") + '</span><div class="txt"><strong>' + esc(c.nom) + "</strong><span>" + esc(c.type) + "</span></div>";
      h += '<span class="montant">' + fcfa(totalCompte(c.id)) + "</span></div>";
    });
    h += "</div>";
    h += '<div class="rangee" style="margin-top:12px"><button class="second" data-act="transfert">Transfert</button><button class="second" data-act="nouveau-compte">Nouveau compte</button></div>';
    h += "</div>";

    h += '<div class="bloc"><div class="bloc-titre"><h2>Dettes et créances</h2><small>' + S.db.dettes.length + "</small></div><div class=\"liste\">";
    if (!S.db.dettes.length) h += '<p class="vide">Aucune dette enregistrée.</p>';
    S.db.dettes.forEach(function (d) {
      var reste = resteDette(d);
      h += '<div class="ligne-op"><span class="puce ' + (d.sens === "on_me_doit" ? "entree" : "sortie") + '">' + ico("dettes") + '</span><div class="txt"><strong>' + esc(d.tiers) + "</strong><span>" + (d.sens === "on_me_doit" ? "On me doit" : "Je dois") + (d.echeance ? " · " + d.echeance.split("-").reverse().join("/") : "") + "</span></div>";
      h += '<span class="montant">' + fcfa(reste) + "</span>";
      if (reste > 0) h += ' <button class="badge" data-act="payer-dette" data-id="' + d.id + '">Payer</button>';
      h += "</div>";
    });
    h += "</div>";
    h += '<button class="second" style="margin-top:12px" data-act="nouvelle-dette">Ajouter une dette</button></div>';
    return h;
  }

  function vueTout() {
    var cases = [
      ["journal", "Journal comptable", "Toutes les écritures datées", "livre"],
      ["balance", "Balance", "Comptes et soldes", "balance"],
      ["tva", "TVA", "Collectée et déductible", "tva"],
      ["bilans", "Bilans", "Mois, semestre, année", "graphique"],
      ["factures", "Factures", "Créer et exporter en PDF", "facture"],
      ["clients", "Clients et fournisseurs", "Fiches et historique", "utilisateurs"],
      ["employes", "Employés", "Postes et salaires", "employes"],
      ["agenda", "Agenda", "Échéances et rendez-vous", "agenda"],
      ["import", "Importer un catalogue", "CSV, JSON ou copier-coller", "import"],
      ["sauvegarde", "Sauvegarde", "Exporter et restaurer", "sauvegarde"],
      ["reglages", "Réglages", "Clé, entreprise, apparence", "reglages"]
    ];
    var h = '<div class="grille">';
    cases.forEach(function (c) {
      h += '<button class="case" data-act="page" data-v="' + c[0] + '">' + ico(c[3]) + "<strong>" + c[1] + "</strong><span>" + c[2] + "</span></button>";
    });
    h += "</div>";
    return h;
  }

  function vuePage(nom) {
    var h = '<button class="second" style="margin-bottom:14px" data-act="retour">← Retour</button>';
    if (nom === "journal") {
      var ops = S.db.operations.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
      h += '<div class="bloc"><div class="bloc-titre"><h2>Journal</h2><small>' + ops.length + "</small></div>";
      h += "<table><tr><th>Date</th><th>Libellé</th><th>Débit</th><th>Crédit</th></tr>";
      ops.slice(-80).reverse().forEach(function (o) {
        h += "<tr><td>" + o.date.split("-").reverse().join("/") + "</td><td>" + esc(o.libelle || o.categorie) + "</td>";
        h += '<td class="d">' + (o.sens === "sortie" ? fcfa(o.montant) : "") + '</td><td class="d">' + (o.sens === "entree" ? fcfa(o.montant) : "") + "</td></tr>";
      });
      h += "</table></div>";
      return h;
    }
    if (nom === "balance") {
      h += '<div class="bloc"><div class="bloc-titre"><h2>Balance générale</h2></div><table><tr><th>Compte</th><th>Solde</th></tr>';
      S.db.comptes.forEach(function (c) { h += "<tr><td>" + esc(c.nom) + '</td><td class="d">' + fcfa(totalCompte(c.id)) + "</td></tr>"; });
      h += '<tr><td><strong>Total</strong></td><td class="d"><strong>' + fcfa(soldeTotal()) + "</strong></td></tr></table></div>";
      return h;
    }
    if (nom === "tva") {
      var collectee = Math.round(sommeOps("entree") * 0.18);
      var deductible = Math.round(sommeOps("sortie") * 0.18);
      h += '<div class="bloc"><div class="bloc-titre"><h2>TVA 18 %</h2><small>estimation</small></div>';
      h += '<div class="duo"><div class="mini"><span>Collectée</span><b>' + fcfa(collectee) + '</b></div><div class="mini"><span>Déductible</span><b>' + fcfa(deductible) + "</b></div></div>";
      h += '<p class="sous" style="margin-top:14px">À payer : <strong>' + fcfa(Math.max(0, collectee - deductible)) + "</strong></p></div>";
      return h;
    }
    if (nom === "bilans") {
      var parMois = {};
      S.db.operations.forEach(function (o) {
        var k = o.date.slice(0, 7);
        parMois[k] = parMois[k] || { e: 0, s: 0 };
        if (o.sens === "entree") parMois[k].e += Number(o.montant) || 0; else parMois[k].s += Number(o.montant) || 0;
      });
      var cles = Object.keys(parMois).sort().reverse().slice(0, 12);
      h += '<div class="bloc"><div class="bloc-titre"><h2>Bilans mensuels</h2></div><table><tr><th>Mois</th><th>Recettes</th><th>Dépenses</th><th>Bénéfice</th></tr>';
      cles.forEach(function (k) {
        var v = parMois[k];
        h += "<tr><td>" + moisLisible(k) + '</td><td class="d">' + fcfa(v.e) + '</td><td class="d">' + fcfa(v.s) + '</td><td class="d">' + fcfa(v.e - v.s) + "</td></tr>";
      });
      if (!cles.length) h += '<tr><td colspan="4" class="vide">Aucune donnée.</td></tr>';
      h += "</table></div>";
      return h;
    }
    if (nom === "factures") {
      h += '<div class="bloc"><div class="bloc-titre"><h2>Factures</h2><small>' + S.db.factures.length + "</small></div>";
      h += '<button class="second" data-act="nouvelle-facture">Nouvelle facture</button><div class="liste" style="margin-top:12px">';
      if (!S.db.factures.length) h += '<p class="vide">Aucune facture.</p>';
      S.db.factures.forEach(function (f) {
        h += '<div class="ligne-op"><span class="puce neutre">' + ico("facture") + '</span><div class="txt"><strong>' + esc(f.numero) + "</strong><span>" + esc(f.client || "Client") + " · " + f.date.split("-").reverse().join("/") + "</span></div>";
        h += '<span class="montant">' + fcfa(f.total) + "</span></div>";
        h += '<button class="badge" data-act="pdf-facture" data-id="' + f.id + '">PDF</button></div>';
      });
      h += "</div></div>";
      return h;
    }
    if (nom === "clients") {
      h += '<div class="bloc"><div class="bloc-titre"><h2>Clients et fournisseurs</h2><small>' + S.db.clients.length + "</small></div>";
      h += '<button class="second" data-act="nouveau-client">Ajouter une fiche</button><div class="liste" style="margin-top:12px">';
      if (!S.db.clients.length) h += '<p class="vide">Aucune fiche.</p>';
      S.db.clients.forEach(function (c) {
        h += '<div class="ligne-op"><span class="puce neutre">' + ico("utilisateurs") + '</span><div class="txt"><strong>' + esc(c.nom) + "</strong><span>" + esc(c.type || "client") + (c.tel ? " · " + esc(c.tel) : "") + "</span></div></div>";
      });
      h += "</div></div>";
      return h;
    }
    if (nom === "employes") {
      h += '<div class="bloc"><div class="bloc-titre"><h2>Employés</h2><small>' + S.db.employes.length + "</small></div>";
      h += '<button class="second" data-act="nouvel-employe">Ajouter un employé</button><div class="liste" style="margin-top:12px">';
      if (!S.db.employes.length) h += '<p class="vide">Aucun employé.</p>';
      S.db.employes.forEach(function (e) {
        h += '<div class="ligne-op"><span class="puce neutre">' + ico("employes") + '</span><div class="txt"><strong>' + esc(e.nom) + "</strong><span>" + esc(e.poste || "") + "</span></div>";
        h += '<span class="montant">' + fcfa(e.salaire) + "</span></div>";
      });
      h += "</div></div>";
      return h;
    }
    if (nom === "agenda") {
      h += '<div class="bloc"><div class="bloc-titre"><h2>Agenda</h2><small>' + S.db.agenda.length + "</small></div>";
      h += '<button class="second" data-act="nouvel-evenement">Ajouter un événement</button><div class="liste" style="margin-top:12px">';
      if (!S.db.agenda.length) h += '<p class="vide">Aucun événement.</p>';
      S.db.agenda.slice().sort(function (a, b) { return a.date.localeCompare(b.date); }).forEach(function (e) {
        h += '<div class="ligne-op"><span class="puce neutre">' + ico("agenda") + '</span><div class="txt"><strong>' + esc(e.titre) + "</strong><span>" + e.date.split("-").reverse().join("/") + "</span></div></div>";
      });
      h += "</div></div>";
      return h;
    }
    if (nom === "import") {
      h += '<div class="bloc"><div class="bloc-titre"><h2>Importer un catalogue</h2></div>';
      h += '<p class="sous">Collez des lignes au format nom;prix_achat;prix_vente;quantite, ou importez un fichier CSV ou JSON.</p>';
      h += '<textarea id="zone-import" class="champ" style="height:150px;padding:12px"></textarea>';
      h += '<button class="principal" data-act="importer-texte">Importer le texte</button>';
      h += '<button class="second" data-act="importer-fichier">Choisir un fichier</button>';
      h += '<input type="file" id="fichier-import" accept=".csv,.json,text/csv,application/json" hidden>';
      h += "</div>";
      return h;
    }
    if (nom === "sauvegarde") {
      h += '<div class="bloc"><div class="bloc-titre"><h2>Sauvegarde</h2></div>';
      h += '<p class="sous">Vos données restent sur le téléphone et sont synchronisées avec la clé d\'accès.</p>';
      h += '<button class="principal" data-act="exporter-json">Exporter toutes les données</button>';
      h += '<button class="second" data-act="exporter-csv">Exporter en CSV</button>';
      h += '<button class="second" data-act="restaurer">Restaurer une sauvegarde</button>';
      h += '<input type="file" id="fichier-restauration" accept=".json,application/json" hidden>';
      h += "</div>";
      return h;
    }
    if (nom === "reglages") {
      h += '<div class="bloc"><div class="bloc-titre"><h2>Réglages</h2></div>';
      h += '<label class="etiquette">Nom de l\'entreprise</label><input id="reg-nom" class="champ" value="' + esc(S.db.entreprise.nom) + '">';
      h += '<button class="principal" data-act="enregistrer-nom">Enregistrer le nom</button>';
      h += "</div>";
      h += '<div class="bloc"><div class="bloc-titre"><h2>Clé d\'accès</h2></div>';
      h += '<p class="sous">Clé actuelle : <strong>' + esc(S.code) + "</strong></p>";
      h += '<input id="reg-cle" class="champ" placeholder="Nouvelle clé (6 caractères minimum)">';
      h += '<button class="principal" data-act="changer-cle">Changer la clé</button>';
      h += '<button class="second" data-act="verrouiller">Verrouiller l\'application</button>';
      h += "</div>";
      h += '<div class="bloc"><div class="bloc-titre"><h2>Transmettre les données</h2></div>';
      h += '<p class="sous">Copiez ce code et collez-le sur un autre téléphone pour y retrouver toutes les écritures.</p>';
      h += '<button class="principal" data-act="copier-code">Copier le code de données</button>';
      h += '<textarea id="zone-code" class="champ" style="height:110px;margin-top:10px;padding:10px" placeholder="Collez ici un code reçu"></textarea>';
      h += '<button class="second" data-act="charger-code">Charger ce code</button>';
      h += "</div>";
      return h;
    }
    return "";
  }

  function rendre() {
    var vue = document.getElementById("vue");
    if (!vue) return;
    if (S.onglet === "accueil") vue.innerHTML = vueAccueil();
    else if (S.onglet === "ecritures") vue.innerHTML = vueEcritures();
    else if (S.onglet === "stock") vue.innerHTML = vueStock();
    else if (S.onglet === "argent") vue.innerHTML = vueArgent();
    else if (S.onglet === "tout") vue.innerHTML = vueTout();
    else vue.innerHTML = vuePage(S.onglet);
    var nom = document.getElementById("entete-nom");
    if (nom) nom.textContent = S.db.entreprise.nom;
  }

  function ouvrirFeuille(html) {
    var f = document.getElementById("feuille");
    document.getElementById("feuille-panneau").innerHTML = html;
    f.hidden = false;
  }
  function fermerFeuille() { document.getElementById("feuille").hidden = true; }

  var saisie = { sens: "sortie", montant: "0", libelle: "", categorie: "", compte: "" };

  function feuilleNouveau() {
    var h = '<h2>Nouvelle écriture</h2><p class="sous">Choisissez le type, saisissez le montant, validez.</p>';
    h += '<div class="choix">';
    h += '<button data-act="type" data-v="entree">' + ico("entree") + "<strong>Recette</strong><span>Argent reçu</span></button>";
    h += '<button data-act="type" data-v="sortie">' + ico("sortie") + "<strong>Dépense</strong><span>Argent sorti</span></button>";
    h += '<button data-act="type" data-v="vente">' + ico("panier") + "<strong>Vente</strong><span>Produit vendu</span></button>";
    h += '<button data-act="type" data-v="transfert">' + ico("echange") + "<strong>Transfert</strong><span>Entre comptes</span></button>";
    h += "</div>";
    ouvrirFeuille(h);
  }

  function feuilleMontant() {
    if (saisie.sens === "transfert") return feuilleTransfert();
    var titres = { entree: "Recette", sortie: "Dépense", vente: "Vente" };
    var h = '<h2>' + titres[saisie.sens] + "</h2>";
    h += '<div class="montant" id="montant-vu">' + (Number(saisie.montant) || 0).toLocaleString("fr-FR") + " <small>FCFA</small></div>";
    h += '<div class="pave">';
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "←"].forEach(function (t) {
      h += '<button data-act="chiffre" data-v="' + t + '">' + t + "</button>";
    });
    h += "</div>";
    h += '<input id="libelle" class="champ" placeholder="Libellé (ex. vente Crocs)" value="' + esc(saisie.libelle) + '">';
    h += '<select id="categorie" class="champ">' + S.db.categories.filter(function (c) { return c.sens === saisie.sens || saisie.sens === "vente"; }).map(function (c) {
      return '<option value="' + esc(c.nom) + '">' + esc(c.nom) + "</option>";
    }).join("") + "</select>";
    h += '<select id="compte" class="champ">' + S.db.comptes.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.nom) + "</option>";
    }).join("") + "</select>";
    h += '<button class="principal" data-act="valider">Valider l\'écriture</button>';
    ouvrirFeuille(h);
  }

  function feuilleTransfert() {
    var h = '<h2>Transfert</h2><p class="sous">Déplacer de l\'argent entre deux comptes.</p>';
    h += '<div class="montant">' + (Number(saisie.montant) || 0).toLocaleString("fr-FR") + " <small>FCFA</small></div>";
    h += '<div class="pave">';
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "←"].forEach(function (t) {
      h += '<button data-act="chiffre" data-v="' + t + '">' + t + "</button>";
    });
    h += "</div>";
    h += '<select id="compte" class="champ">' + S.db.comptes.map(function (c) {
      return '<option value="' + c.id + '">Depuis ' + esc(c.nom) + "</option>";
    }).join("") + "</select>";
    h += '<select id="compte2" class="champ">' + S.db.comptes.map(function (c) {
      return '<option value="' + c.id + '">Vers ' + esc(c.nom) + "</option>";
    }).join("") + "</select>";
    h += '<button class="principal" data-act="valider-transfert">Valider le transfert</button>';
    ouvrirFeuille(h);
  }

  function ajouterOperation(sens, montant, libelle, categorie, compte) {
    var m = Number(montant) || 0;
    if (m <= 0) { avis("Saisissez un montant."); return; }
    S.db.operations.push({ id: uid(), sens: sens, montant: m, libelle: libelle || "", categorie: categorie || "", compte: compte || (S.db.comptes[0] || {}).id, date: jour(), auteur: "moi" });
    enregistrer();
    fermerFeuille();
    rendre();
    notifier("Écriture enregistrée", (sens === "entree" ? "Recette" : "Dépense") + " de " + fcfa(m) + " enregistrée.");
  }

  var actions = {
    filtre: function (d) { S.filtre = d.v; rendre(); },
    page: function (d) { S.onglet = d.v; rendre(); window.scrollTo(0, 0); },
    retour: function () { S.onglet = "tout"; rendre(); },
    type: function (d) { saisie.sens = d.v; saisie.montant = "0"; feuilleMontant(); },
    chiffre: function (d) {
      var v = d.v;
      if (v === "←") saisie.montant = saisie.montant.slice(0, -1) || "0";
      else if (saisie.montant === "0") saisie.montant = v === "00" ? "0" : v;
      else saisie.montant += v;
      if (saisie.montant.length > 9) saisie.montant = saisie.montant.slice(0, 9);
      var vu = document.getElementById("montant-vu");
      if (vu) vu.innerHTML = (Number(saisie.montant) || 0).toLocaleString("fr-FR") + " <small>FCFA</small>";
    },
    valider: function () {
      var lib = (document.getElementById("libelle") || {}).value || "";
      var cat = (document.getElementById("categorie") || {}).value || "";
      var cpt = (document.getElementById("compte") || {}).value || "";
      ajouterOperation(saisie.sens === "vente" ? "entree" : saisie.sens, saisie.montant, lib || (saisie.sens === "vente" ? "Vente" : ""), cat, cpt);
    },
    "valider-transfert": function () {
      var a = (document.getElementById("compte") || {}).value;
      var b = (document.getElementById("compte2") || {}).value;
      var m = Number(saisie.montant) || 0;
      if (!a || !b || a === b) { avis("Choisissez deux comptes différents."); return; }
      if (m <= 0) { avis("Saisissez un montant."); return; }
      S.db.operations.push({ id: uid(), sens: "sortie", montant: m, libelle: "Transfert sortant", categorie: "Transfert", compte: a, date: jour() });
      S.db.operations.push({ id: uid(), sens: "entree", montant: m, libelle: "Transfert entrant", categorie: "Transfert", compte: b, date: jour() });
      enregistrer(); fermerFeuille(); rendre();
      notifier("Transfert effectué", fcfa(m) + " déplacés.");
    },
    vendre: function (d) {
      var p = S.db.produits.filter(function (x) { return x.id === d.id; })[0];
      if (!p) return;
      if ((Number(p.qte) || 0) <= 0) { avis("Stock épuisé pour " + p.nom + "."); return; }
      p.qte = Number(p.qte) - 1;
      p.vendus = (Number(p.vendus) || 0) + 1;
      S.db.operations.push({ id: uid(), sens: "entree", montant: Number(p.vente) || 0, libelle: "Vente " + p.nom, categorie: "Ventes", compte: (S.db.comptes[0] || {}).id, date: jour() });
      enregistrer(); rendre();
      notifier("Vente enregistrée", p.nom + " · " + fcfa(p.vente) + " · marge " + fcfa(margeProduit(p)));
    },
    "nouveau-produit": function () {
      ouvrirFeuille('<h2>Nouveau produit</h2><p class="sous">Prix d\'achat et prix de vente.</p>' +
        '<input id="p-nom" class="champ" placeholder="Nom du produit">' +
        '<div class="rangee"><input id="p-achat" class="champ" inputmode="numeric" placeholder="Prix d\'achat"><input id="p-vente" class="champ" inputmode="numeric" placeholder="Prix de vente"></div>' +
        '<input id="p-qte" class="champ" inputmode="numeric" placeholder="Quantité en stock">' +
        '<input id="p-four" class="champ" placeholder="Fournisseur (optionnel)">' +
        '<button class="principal" data-act="creer-produit">Enregistrer le produit</button>');
    },
    "creer-produit": function () {
      var nom = (document.getElementById("p-nom") || {}).value || "";
      if (!nom.trim()) { avis("Donnez un nom au produit."); return; }
      S.db.produits.push({
        id: uid(), nom: nom.trim(),
        achat: Number((document.getElementById("p-achat") || {}).value) || 0,
        vente: Number((document.getElementById("p-vente") || {}).value) || 0,
        qte: Number((document.getElementById("p-qte") || {}).value) || 0,
        fournisseur: (document.getElementById("p-four") || {}).value || "",
        vendus: 0
      });
      enregistrer(); fermerFeuille(); rendre();
      notifier("Produit ajouté", nom.trim() + " est dans le stock.");
    },
    transfert: function () { saisie.sens = "transfert"; saisie.montant = "0"; feuilleTransfert(); },
    "nouveau-compte": function () {
      ouvrirFeuille('<h2>Nouveau compte</h2><input id="c-nom" class="champ" placeholder="Nom du compte"><input id="c-solde" class="champ" inputmode="numeric" placeholder="Solde de départ"><button class="principal" data-act="creer-compte">Créer le compte</button>');
    },
    "creer-compte": function () {
      var nom = (document.getElementById("c-nom") || {}).value || "";
      if (!nom.trim()) { avis("Donnez un nom au compte."); return; }
      S.db.comptes.push({ id: uid(), nom: nom.trim(), type: "autre", solde: Number((document.getElementById("c-solde") || {}).value) || 0 });
      enregistrer(); fermerFeuille(); rendre();
    },
    "nouvelle-dette": function () {
      ouvrirFeuille('<h2>Nouvelle dette</h2><input id="d-tiers" class="champ" placeholder="Nom de la personne ou entreprise">' +
        '<select id="d-sens" class="champ"><option value="on_me_doit">On me doit</option><option value="je_dois">Je dois</option></select>' +
        '<input id="d-montant" class="champ" inputmode="numeric" placeholder="Montant"><input id="d-echeance" class="champ" type="date">' +
        '<button class="principal" data-act="creer-dette">Enregistrer la dette</button>');
    },
    "creer-dette": function () {
      var tiers = (document.getElementById("d-tiers") || {}).value || "";
      if (!tiers.trim()) { avis("Indiquez le nom."); return; }
      S.db.dettes.push({
        id: uid(), tiers: tiers.trim(),
        sens: (document.getElementById("d-sens") || {}).value || "on_me_doit",
        montant: Number((document.getElementById("d-montant") || {}).value) || 0,
        echeance: (document.getElementById("d-echeance") || {}).value || "",
        paiements: []
      });
      enregistrer(); fermerFeuille(); rendre();
    },
    "payer-dette": function (d) {
      var dette = S.db.dettes.filter(function (x) { return x.id === d.id; })[0];
      if (!dette) return;
      ouvrirFeuille('<h2>Paiement</h2><p class="sous">Reste ' + fcfa(resteDette(dette)) + "</p>" +
        '<input id="pay-montant" class="champ" inputmode="numeric" placeholder="Montant payé">' +
        '<button class="principal" data-act="confirmer-paiement" data-id="' + d.id + '">Confirmer</button>');
    },
    "confirmer-paiement": function (d) {
      var dette = S.db.dettes.filter(function (x) { return x.id === d.id; })[0];
      var m = Number((document.getElementById("pay-montant") || {}).value) || 0;
      if (!dette || m <= 0) { avis("Montant invalide."); return; }
      dette.paiements = dette.paiements || [];
      dette.paiements.push({ date: jour(), montant: m });
      enregistrer(); fermerFeuille(); rendre();
      notifier("Paiement enregistré", fcfa(m) + " sur la dette de " + dette.tiers + ".");
    },
    "nouveau-client": function () {
      ouvrirFeuille('<h2>Nouvelle fiche</h2><input id="cl-nom" class="champ" placeholder="Nom">' +
        '<select id="cl-type" class="champ"><option value="client">Client</option><option value="fournisseur">Fournisseur</option></select>' +
        '<input id="cl-tel" class="champ" placeholder="Téléphone"><button class="principal" data-act="creer-client">Enregistrer</button>');
    },
    "creer-client": function () {
      var nom = (document.getElementById("cl-nom") || {}).value || "";
      if (!nom.trim()) { avis("Indiquez le nom."); return; }
      S.db.clients.push({ id: uid(), nom: nom.trim(), type: (document.getElementById("cl-type") || {}).value, tel: (document.getElementById("cl-tel") || {}).value || "" });
      enregistrer(); fermerFeuille(); rendre();
    },
    "nouvel-employe": function () {
      ouvrirFeuille('<h2>Nouvel employé</h2><input id="e-nom" class="champ" placeholder="Nom"><input id="e-poste" class="champ" placeholder="Poste">' +
        '<input id="e-salaire" class="champ" inputmode="numeric" placeholder="Salaire mensuel"><button class="principal" data-act="creer-employe">Enregistrer</button>');
    },
    "creer-employe": function () {
      var nom = (document.getElementById("e-nom") || {}).value || "";
      if (!nom.trim()) { avis("Indiquez le nom."); return; }
      S.db.employes.push({ id: uid(), nom: nom.trim(), poste: (document.getElementById("e-poste") || {}).value || "", salaire: Number((document.getElementById("e-salaire") || {}).value) || 0, paye: false });
      enregistrer(); fermerFeuille(); rendre();
    },
    "nouvel-evenement": function () {
      ouvrirFeuille('<h2>Nouvel événement</h2><input id="ev-titre" class="champ" placeholder="Titre"><input id="ev-date" class="champ" type="date">' +
        '<button class="principal" data-act="creer-evenement">Enregistrer</button>');
    },
    "creer-evenement": function () {
      var titre = (document.getElementById("ev-titre") || {}).value || "";
      if (!titre.trim()) { avis("Indiquez un titre."); return; }
      S.db.agenda.push({ id: uid(), titre: titre.trim(), date: (document.getElementById("ev-date") || {}).value || jour() });
      enregistrer(); fermerFeuille(); rendre();
    },
    "nouvelle-facture": function () {
      var h = '<h2>Nouvelle facture</h2><input id="f-client" class="champ" placeholder="Client">';
      h += '<input id="f-objet" class="champ" placeholder="Objet (ex. 10 sacs)">';
      h += '<input id="f-total" class="champ" inputmode="numeric" placeholder="Montant total">';
      h += '<button class="principal" data-act="creer-facture">Créer la facture</button>';
      ouvrirFeuille(h);
    },
    "creer-facture": function () {
      var total = Number((document.getElementById("f-total") || {}).value) || 0;
      if (total <= 0) { avis("Montant invalide."); return; }
      var numero = "FA-" + String(S.db.factures.length + 1).padStart(4, "0");
      S.db.factures.push({ id: uid(), numero: numero, client: (document.getElementById("f-client") || {}).value || "", objet: (document.getElementById("f-objet") || {}).value || "", total: total, date: jour() });
      enregistrer(); fermerFeuille(); rendre();
      notifier("Facture créée", numero + " · " + fcfa(total));
    },
    "pdf-facture": function (d) {
      var f = S.db.factures.filter(function (x) { return x.id === d.id; })[0];
      if (!f) return;
      var lignes = [
        S.db.entreprise.nom,
        "Facture " + f.numero,
        "Date : " + f.date.split("-").reverse().join("/"),
        "Client : " + (f.client || "-"),
        "Objet : " + (f.objet || "-"),
        "",
        "Montant total : " + fcfa(f.total),
        "",
        "Merci de votre confiance."
      ];
      var b64 = pdfSimple(lignes);
      enregistrerFichier("facture-" + f.numero + ".pdf", "application/pdf", b64);
      avis("Facture exportée dans Téléchargements.");
    },
    "exporter-json": function () {
      var txt = JSON.stringify(S.db, null, 2);
      enregistrerFichier("grand-livre-sauvegarde-" + jour() + ".json", "application/json", btoa(unescape(encodeURIComponent(txt))));
      avis("Sauvegarde exportée.");
    },
    "exporter-csv": function () {
      var lignes = ["date;sens;libelle;categorie;montant"];
      S.db.operations.forEach(function (o) {
        lignes.push([o.date, o.sens, (o.libelle || "").replace(/;/g, ","), (o.categorie || "").replace(/;/g, ","), o.montant].join(";"));
      });
      enregistrerFichier("grand-livre-" + jour() + ".csv", "text/csv", btoa(unescape(encodeURIComponent(lignes.join("\n")))));
      avis("Export CSV prêt.");
    },
    restaurer: function () { var i = document.getElementById("fichier-restauration"); if (i) i.click(); },
    "importer-fichier": function () { var i = document.getElementById("fichier-import"); if (i) i.click(); },
    "importer-texte": function () {
      var t = (document.getElementById("zone-import") || {}).value || "";
      if (!t.trim()) { avis("Collez des lignes à importer."); return; }
      var n = 0;
      t.split("\n").forEach(function (l) {
        var p = l.split(/[;\t,]/).map(function (x) { return x.trim(); });
        if (p.length >= 2 && p[0]) {
          S.db.produits.push({ id: uid(), nom: p[0], achat: Number(p[1]) || 0, vente: Number(p[2]) || 0, qte: Number(p[3]) || 0, fournisseur: "", vendus: 0 });
          n++;
        }
      });
      enregistrer(); rendre();
      notifier("Import terminé", n + " produits ajoutés.");
    },
    "enregistrer-nom": function () {
      var v = (document.getElementById("reg-nom") || {}).value || "";
      if (!v.trim()) { avis("Le nom ne peut pas être vide."); return; }
      S.db.entreprise.nom = v.trim();
      enregistrer(); rendre();
      notifier("Nom enregistré", S.db.entreprise.nom);
    },
    "changer-cle": function () {
      var v = ((document.getElementById("reg-cle") || {}).value || "").trim().toUpperCase();
      if (v.length < 6) { avis("La clé doit faire au moins 6 caractères."); return; }
      appeler({ action: "rename", code: S.code, nouveau: v }).then(function (r) {
        if (r && r.ok) {
          S.code = v;
          localStorage.setItem(CLE_CODE, v);
          envoyer();
          rendre();
          notifier("Clé modifiée", "Nouvelle clé : " + v);
        } else {
          avis(r && r.erreur === "cle_deja_utilisee" ? "Cette clé est déjà utilisée." : "Impossible de changer la clé pour le moment.");
        }
      }).catch(function () { avis("Connexion nécessaire pour changer la clé."); });
    },
    "copier-code": function () {
      var code = btoa(unescape(encodeURIComponent(JSON.stringify(S.db))));
      var zone = document.getElementById("zone-code");
      if (zone) zone.value = code;
      if (navigator.clipboard) navigator.clipboard.writeText(code).catch(function () {});
      avis("Code copié. Envoyez-le à votre collaborateur.");
    },
    "charger-code": function () {
      var v = (document.getElementById("zone-code") || {}).value || "";
      try {
        var d = JSON.parse(decodeURIComponent(escape(atob(v.trim()))));
        if (!d || !d.entreprise) throw 0;
        S.db = d;
        enregistrer(); rendre();
        notifier("Données chargées", "Toutes les écritures ont été reprises.");
      } catch (e) { avis("Code invalide."); }
    },
    verrouiller: function () { localStorage.removeItem(CLE_CODE); location.reload(); },
    fermer: function () { fermerFeuille(); }
  };

  function pdfSimple(lignes) {
    var contenu = "BT /F1 14 Tf 60 760 Td 20 TL\n";
    lignes.forEach(function (l) {
      contenu += "(" + String(l).replace(/[()\\]/g, "\\$&").replace(/[^\x20-\x7E]/g, "") + ") Tj T*\n";
    });
    contenu += "ET";
    var objets = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      "<< /Length " + contenu.length + " >>\nstream\n" + contenu + "\nendstream"
    ];
    var pdf = "%PDF-1.4\n", offsets = [];
    objets.forEach(function (o, i) {
      offsets.push(pdf.length);
      pdf += (i + 1) + " 0 obj\n" + o + "\nendobj\n";
    });
    var xref = pdf.length;
    pdf += "xref\n0 " + (objets.length + 1) + "\n0000000000 65535 f \n";
    offsets.forEach(function (o) { pdf += String(o).padStart(10, "0") + " 00000 n \n"; });
    pdf += "trailer\n<< /Size " + (objets.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";
    return btoa(pdf);
  }

  function enregistrerFichier(nom, type, b64) {
    if (window.Nexus && window.Nexus.saveFile) {
      try { window.Nexus.saveFile(nom, type, b64); return; } catch (e) {}
    }
    var a = document.createElement("a");
    a.href = "data:" + type + ";base64," + b64;
    a.download = nom;
    a.click();
  }

  function dessinerBarre() {
    var textes = { accueil: "Accueil", ecritures: "Écritures", stock: "Stock", argent: "Argent", tout: "Tout" };
    var boutons = document.querySelectorAll("#barre button");
    Array.prototype.forEach.call(boutons, function (b) {
      var k = b.dataset.onglet;
      b.innerHTML = ico(k) + "<span>" + textes[k] + "</span>";
      b.onclick = function () {
        S.onglet = k; S.filtre = "tout";
        Array.prototype.forEach.call(boutons, function (x) { x.classList.remove("actif"); });
        b.classList.add("actif");
        rendre();
        window.scrollTo(0, 0);
      };
    });
  }

  function brancher() {
    dessinerBarre();
    var r = document.getElementById("ouvrir-reglages");
    r.innerHTML = ico("reglages");
    r.onclick = function () { S.onglet = "reglages"; rendre(); window.scrollTo(0, 0); };

    document.getElementById("nouveau").onclick = feuilleNouveau;

    document.getElementById("feuille").addEventListener("click", function (e) {
      if (e.target.dataset.fermer !== undefined) fermerFeuille();
    });

    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var act = actions[b.dataset.act];
      if (act) { e.preventDefault(); act(b.dataset); }
    });

    document.addEventListener("change", function (e) {
      if (e.target.id === "fichier-import") {
        var f = e.target.files[0];
        if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          try {
            var txt = String(fr.result);
            var n = 0;
            if (f.name.toLowerCase().endsWith(".json")) {
              var d = JSON.parse(txt);
              var arr = Array.isArray(d) ? d : (d.produits || d.items || []);
              arr.forEach(function (p) {
                S.db.produits.push({ id: uid(), nom: p.nom || p.name || "Article", achat: Number(p.achat || p.prix_achat) || 0, vente: Number(p.vente || p.prix || p.prix_vente) || 0, qte: Number(p.qte || p.stock) || 0, fournisseur: "", vendus: 0 });
                n++;
              });
            } else {
              txt.split("\n").forEach(function (l) {
                var p = l.split(/[;\t,]/).map(function (x) { return x.trim(); });
                if (p.length >= 2 && p[0]) {
                  S.db.produits.push({ id: uid(), nom: p[0], achat: Number(p[1]) || 0, vente: Number(p[2]) || 0, qte: Number(p[3]) || 0, fournisseur: "", vendus: 0 });
                  n++;
                }
              });
            }
            enregistrer(); rendre();
            notifier("Import terminé", n + " produits ajoutés.");
          } catch (err) { avis("Fichier illisible."); }
        };
        fr.readAsText(f);
      }
      if (e.target.id === "fichier-restauration") {
        var f2 = e.target.files[0];
        if (!f2) return;
        var fr2 = new FileReader();
        fr2.onload = function () {
          try {
            var d = JSON.parse(String(fr2.result));
            if (d && d.entreprise) { S.db = d; enregistrer(); rendre(); notifier("Restauration terminée", "Données restaurées."); }
            else avis("Ce fichier n'est pas une sauvegarde.");
          } catch (err) { avis("Fichier illisible."); }
        };
        fr2.readAsText(f2);
      }
    });

    document.addEventListener("visibilitychange", function () { if (!document.hidden) recevoir(); });
    setInterval(function () { if (!document.hidden) recevoir(); }, 45000);
  }

  function ouvrirApp() {
    document.getElementById("cle").hidden = true;
    document.getElementById("app").hidden = false;
    brancher();
    rendre();
    recevoir();
  }

  function genererCle() {
    var alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var s = "";
    for (var i = 0; i < 6; i++) s += alpha[Math.floor(Math.random() * alpha.length)];
    return "AURA-" + s;
  }

  function demarrer() {
    charger();
    var zone = document.getElementById("cle");
    var champ = document.getElementById("champ-cle");
    var err = document.getElementById("cle-erreur");

    if (S.code) { champ.value = S.code; }

    document.getElementById("entrer").onclick = function () {
      var v = (champ.value || "").trim().toUpperCase();
      if (v.length < 6) { err.hidden = false; err.textContent = "La clé doit faire au moins 6 caractères."; return; }
      err.hidden = true;
      var ancienne = localStorage.getItem(CLE_CODE);
      S.code = v;
      localStorage.setItem(CLE_CODE, v);
      if (v !== ancienne) {
        S.db = baseVide();
        localStorage.setItem(CLE_DB, JSON.stringify(S.db));
      }
      ouvrirApp();
      recevoir();
    };

    document.getElementById("creer-cle").onclick = function () {
      var v = genererCle();
      S.db = baseVide();
      S.code = v;
      S.revision = 0;
      localStorage.setItem(CLE_CODE, v);
      localStorage.setItem(CLE_DB, JSON.stringify(S.db));
      appeler({ action: "push", code: v, payload: JSON.stringify(S.db), revision: 1, entreprise: S.db.entreprise.nom })
        .then(function (r) { if (r && r.ok) S.revision = r.revision; })
        .catch(function () {});
      ouvrirApp();
      avis("Votre clé d'accès : " + v);
    };

    if (S.code) {
      document.getElementById("entrer").click();
    }
  }

  document.addEventListener("DOMContentLoaded", demarrer);
})();
