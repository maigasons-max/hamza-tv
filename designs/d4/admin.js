/* Espace administrateur : le propriétaire crée ses catégories et ses produits.
   Tout est enregistré dans le navigateur (localStorage) via shared/store.js. */

(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fcfa = n => Math.round(Number(n) || 0).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ") + " F";

  const dire = (texte, ok) => {
    const z = $("#retour");
    if (!z) return;
    z.textContent = texte;
    z.className = "retour " + (ok ? "bon" : "mauvais");
    z.hidden = false;
    clearTimeout(dire.t);
    dire.t = setTimeout(() => { z.hidden = true; }, 4000);
  };

  function optionsCategories(selection) {
    return Store.categories()
      .map(c => `<option value="${c.id}"${c.id === selection ? " selected" : ""}>${c.nom}</option>`)
      .join("");
  }

  function peindreCategories() {
    const z = $("#liste-categories");
    if (!z) return;
    const cats = Store.categories();
    z.innerHTML = cats.map(c => {
      const n = Store.produits().filter(p => p.cat === c.id).length;
      return `<li class="ligne-cat">
        <div><strong>${c.nom}</strong><small>${c.sous || "—"} · ${n} produit(s)</small></div>
        <label class="bascule"><input type="checkbox" data-portable="${c.id}"${c.portable ? " checked" : ""}> essayage</label>
        <button type="button" class="mini danger" data-suppr-cat="${c.id}">Supprimer</button>
      </li>`;
    }).join("") || `<li class="vide">Aucune catégorie. Créez-en une ci-dessus.</li>`;

    $$("[data-portable]").forEach(i => i.onchange = () => {
      Store.modifierCategorie(i.dataset.portable, { portable: i.checked });
      dire("Essayage " + (i.checked ? "activé" : "désactivé") + " pour cette catégorie.", true);
    });
    $$("[data-suppr-cat]").forEach(b => b.onclick = () => {
      try { Store.supprimerCategorie(b.dataset.supprCat); dire("Catégorie supprimée.", true); }
      catch (e) { dire(e.message, false); }
    });
  }

  function peindreProduits() {
    const z = $("#liste-produits");
    if (!z) return;
    const ps = Store.produits();
    z.innerHTML = ps.map(p => {
      const c = Store.categorie(p.cat);
      const marge = p.prix ? Math.round(((p.prix - p.achat) / p.prix) * 100) : 0;
      return `<li class="ligne-produit">
        <div class="lp-nom"><strong>${p.nom}</strong><small>${c ? c.nom : p.cat} · stock ${p.stock}</small></div>
        <div class="lp-prix"><strong>${fcfa(p.prix)}</strong><small>marge ${marge} %</small></div>
        <button type="button" class="mini danger" data-suppr="${p.id}">Retirer</button>
      </li>`;
    }).join("") || `<li class="vide">Aucun produit. Ajoutez le premier.</li>`;

    $$("[data-suppr]").forEach(b => b.onclick = () => {
      Store.supprimerProduit(b.dataset.suppr);
      dire("Produit retiré du catalogue.", true);
    });
  }

  function peindre() {
    peindreCategories();
    peindreProduits();
    const sel = $("#p-cat");
    if (sel) {
      const avant = sel.value;
      sel.innerHTML = optionsCategories(avant);
    }
  }

  function brancher() {
    if (!window.Store) return;

    const formCat = $("#form-categorie");
    if (formCat) formCat.onsubmit = e => {
      e.preventDefault();
      try {
        Store.ajouterCategorie({
          nom: $("#c-nom").value,
          sous: $("#c-sous").value,
          portable: $("#c-portable").checked
        });
        formCat.reset();
        dire("Catégorie créée.", true);
      } catch (err) { dire(err.message, false); }
    };

    const formProd = $("#form-produit");
    if (formProd) formProd.onsubmit = e => {
      e.preventDefault();
      try {
        Store.ajouterProduit({
          nom: $("#p-nom").value,
          cat: $("#p-cat").value,
          sous: $("#p-sous").value,
          prix: $("#p-prix").value,
          achat: $("#p-achat").value,
          stock: $("#p-stock").value,
          desc: $("#p-desc").value,
          variantes: $("#p-variantes").value,
          photo: ($("#p-photo").dataset.url || "")
        });
        formProd.reset();
        const apercu = $("#p-apercu");
        if (apercu) { apercu.removeAttribute("src"); apercu.hidden = true; }
        delete $("#p-photo").dataset.url;
        dire("Produit ajouté au catalogue.", true);
      } catch (err) { dire(err.message, false); }
    };

    const photo = $("#p-photo");
    if (photo) photo.onchange = () => {
      const f = photo.files && photo.files[0];
      if (!f) return;
      const l = new FileReader();
      l.onload = () => {
        photo.dataset.url = l.result;
        const a = $("#p-apercu");
        if (a) { a.src = l.result; a.hidden = false; }
      };
      l.readAsDataURL(f);
    };

    const reset = $("#tout-effacer");
    if (reset) reset.onclick = () => {
      if (!confirm("Revenir au catalogue d'exemple ? Vos ajouts seront perdus.")) return;
      Store.reinitialiser();
      dire("Catalogue d'exemple restauré.", true);
    };

    Store.abonner(peindre);
    peindre();
  }

  if (document.readyState === "loading") addEventListener("DOMContentLoaded", brancher);
  else brancher();
})();
