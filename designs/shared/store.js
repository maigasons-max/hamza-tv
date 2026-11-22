/* Magasin de données partagé : catégories et produits créés par le propriétaire.
   Persisté dans le navigateur (localStorage). Le catalogue de départ sert d'exemple.
   Les tableaux UNIVERS et PRODUITS de data.js sont mis à jour sur place pour que
   toutes les directions artistiques continuent de fonctionner sans modification. */

(function () {
  const CLE = "nexus-marche-v2";

  const exemple = () => ({
    categories: (typeof CATALOGUE !== "undefined" ? CATALOGUE.categories : UNIVERS).map(u => ({
      id: u.id,
      nom: u.nom,
      sous: u.sous,
      portable: u.portable !== undefined ? !!u.portable : ["mode", "beaute"].includes(u.id)
    })),
    produits: (typeof CATALOGUE !== "undefined" ? CATALOGUE.produits : PRODUITS).map(p => Object.assign({}, p))
  });

  function lire() {
    try {
      const brut = localStorage.getItem(CLE);
      if (!brut) return exemple();
      const d = JSON.parse(brut);
      if (!d || !Array.isArray(d.categories) || !Array.isArray(d.produits)) return exemple();
      return d;
    } catch (e) {
      return exemple();
    }
  }

  let etat = lire();
  const abonnes = [];

  function publier() {
    try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) {}
    synchroniser();
    abonnes.forEach(f => { try { f(etat); } catch (e) {} });
  }

  /* les directions lisent UNIVERS / PRODUITS : on les tient à jour sur place */
  function synchroniser() {
    if (typeof UNIVERS !== "undefined" && Array.isArray(UNIVERS)) {
      UNIVERS.length = 0;
      etat.categories.forEach(c => UNIVERS.push({ id: c.id, nom: c.nom, sous: c.sous, portable: !!c.portable }));
    }
    if (typeof PRODUITS !== "undefined" && Array.isArray(PRODUITS)) {
      PRODUITS.length = 0;
      etat.produits.forEach(p => PRODUITS.push(p));
    }
  }

  const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "cat";

  const Store = {
    get etat() { return etat; },
    abonner(f) { abonnes.push(f); return () => abonnes.splice(abonnes.indexOf(f), 1); },

    categories() { return etat.categories.slice(); },
    categorie(id) { return etat.categories.find(c => c.id === id) || null; },
    produits() { return etat.produits.slice(); },
    produit(id) { return etat.produits.find(p => p.id === id) || null; },
    estPortable(idCategorie) { const c = this.categorie(idCategorie); return !!(c && c.portable); },

    ajouterCategorie({ nom, sous, portable }) {
      const n = String(nom || "").trim();
      if (!n) throw new Error("Nom de catégorie obligatoire.");
      let id = slug(n), base = id, i = 2;
      while (etat.categories.some(c => c.id === id)) id = base + "-" + i++;
      etat.categories.push({ id, nom: n, sous: String(sous || "").trim(), portable: !!portable });
      publier();
      return id;
    },

    modifierCategorie(id, champs) {
      const c = this.categorie(id);
      if (!c) throw new Error("Catégorie introuvable.");
      if (champs.nom != null) c.nom = String(champs.nom).trim() || c.nom;
      if (champs.sous != null) c.sous = String(champs.sous).trim();
      if (champs.portable != null) c.portable = !!champs.portable;
      publier();
    },

    supprimerCategorie(id) {
      const restants = etat.produits.filter(p => p.cat === id);
      if (restants.length) throw new Error("Cette catégorie contient " + restants.length + " produit(s). Déplacez-les d'abord.");
      etat.categories = etat.categories.filter(c => c.id !== id);
      publier();
    },

    ajouterProduit(p) {
      const nom = String(p.nom || "").trim();
      if (!nom) throw new Error("Nom du produit obligatoire.");
      if (!this.categorie(p.cat)) throw new Error("Choisissez une catégorie.");
      const id = "p" + Date.now().toString(36);
      etat.produits.unshift({
        id, cat: p.cat, nom,
        sous: String(p.sous || "").trim(),
        prix: Math.max(0, Number(p.prix) || 0),
        achat: Math.max(0, Number(p.achat) || 0),
        stock: Math.max(0, Number(p.stock) || 0),
        desc: String(p.desc || "").trim(),
        variantes: Array.isArray(p.variantes) ? p.variantes : String(p.variantes || "").split(",").map(s => s.trim()).filter(Boolean),
        photo: p.photo || "",
        avis: []
      });
      publier();
      return id;
    },

    modifierProduit(id, champs) {
      const p = this.produit(id);
      if (!p) throw new Error("Produit introuvable.");
      ["nom", "sous", "desc", "cat", "photo"].forEach(k => { if (champs[k] != null) p[k] = String(champs[k]); });
      ["prix", "achat", "stock"].forEach(k => { if (champs[k] != null) p[k] = Math.max(0, Number(champs[k]) || 0); });
      if (champs.variantes != null) {
        p.variantes = Array.isArray(champs.variantes) ? champs.variantes
          : String(champs.variantes).split(",").map(s => s.trim()).filter(Boolean);
      }
      publier();
    },

    supprimerProduit(id) {
      etat.produits = etat.produits.filter(p => p.id !== id);
      publier();
    },

    reinitialiser() { etat = exemple(); publier(); }
  };

  synchroniser();
  window.Store = Store;
})();
