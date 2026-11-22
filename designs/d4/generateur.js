/* Maïga Market — visuels produits et générateur de rendu.
   Deux métiers ici :
   1. visuelProduit(p) : fabrique une photo d'atelier (SVG) pour chaque article,
      sans dépendre d'une banque d'images. Remplaçable par les vraies photos.
   2. monterGenerateur(zone) : prend la photo du client et l'article, et rend
      une image où l'article est porté : ombre portée, plis, accord de lumière,
      puis export PNG. Tout reste dans le navigateur, aucune photo envoyée. */

(function () {
  const OR = "#e8bf5a", OR2 = "#fff0b8", OR3 = "#b8861f";

  const FORME = {
    boite: (a) => `
      <rect x="196" y="248" width="208" height="212" rx="16" fill="url(#metal)" stroke="${a}" stroke-width="3"/>
      <path d="M196 300h208M300 300v160" stroke="${a}" stroke-width="2" opacity=".5"/>
      <rect x="264" y="330" width="72" height="26" rx="6" fill="none" stroke="${a}" stroke-width="2" opacity=".7"/>`,
    tech: (a) => `
      <rect x="212" y="150" width="176" height="330" rx="34" fill="url(#metal)" stroke="${a}" stroke-width="3"/>
      <rect x="228" y="176" width="144" height="278" rx="20" fill="#0a0a0c" stroke="${a}" stroke-width="1.4" opacity=".85"/>
      <circle cx="300" cy="196" r="5" fill="${a}"/>
      <circle cx="248" cy="152" r="3.4" fill="${a}" opacity=".8"/>
      <path d="M244 470h112" stroke="${a}" stroke-width="4" stroke-linecap="round" opacity=".55"/>`,
    mode: (a) => `
      <path d="M300 168c-26 0-44 14-52 30l-62 34 22 46 34-14v212h116V264l34 14 22-46-62-34c-8-16-26-30-52-30z"
            fill="url(#metal)" stroke="${a}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M268 168c10 16 54 16 64 0" fill="none" stroke="${a}" stroke-width="3"/>
      <path d="M242 336h116" stroke="#0a0a0c" stroke-width="2" opacity=".25"/>`,
    maison: (a) => `
      <path d="M214 300h172l-16 148a26 26 0 0 1-26 22h-88a26 26 0 0 1-26-22z" fill="url(#metal)" stroke="${a}" stroke-width="3"/>
      <ellipse cx="300" cy="300" rx="86" ry="18" fill="#0a0a0c" stroke="${a}" stroke-width="3" opacity=".9"/>
      <path d="M300 300V182" stroke="${a}" stroke-width="4"/>
      <circle cx="300" cy="170" r="34" fill="none" stroke="${a}" stroke-width="7"/>
      <path d="M232 470h136" stroke="${a}" stroke-width="3" opacity=".4"/>`,
    beaute: (a) => `
      <path d="M266 214h68v46c34 12 46 34 46 62v96a30 30 0 0 1-30 30h-100a30 30 0 0 1-30-30v-96c0-28 12-50 46-62z"
            fill="url(#metal)" stroke="${a}" stroke-width="3"/>
      <rect x="278" y="168" width="44" height="48" rx="10" fill="url(#metal)" stroke="${a}" stroke-width="3"/>
      <path d="M240 360c40 14 80 14 120 0" stroke="#0a0a0c" stroke-width="3" opacity=".3"/>`,
    moto: (a) => `
      <circle cx="222" cy="430" r="56" fill="none" stroke="${a}" stroke-width="9"/>
      <circle cx="378" cy="430" r="56" fill="none" stroke="${a}" stroke-width="9"/>
      <path d="M222 430l52-96h74l30 96" fill="none" stroke="${a}" stroke-width="7" stroke-linejoin="round"/>
      <path d="M274 334l-22-44h86l16 44" fill="none" stroke="${a}" stroke-width="7"/>
      <path d="M196 268h58" stroke="${a}" stroke-width="7" stroke-linecap="round"/>`,
    auto: (a) => `
      <path d="M164 392c0-18 10-30 28-34l30-56c6-12 16-18 30-18h96c14 0 24 6 30 18l30 56c18 4 28 16 28 34v40h-36a40 40 0 0 1-80 0H280a40 40 0 0 1-80 0h-36z"
            fill="url(#metal)" stroke="${a}" stroke-width="3"/>
      <path d="M236 302h128l22 42H214z" fill="#0a0a0c" opacity=".55"/>
      <circle cx="240" cy="432" r="30" fill="#0a0a0c" stroke="${a}" stroke-width="6"/>
      <circle cx="360" cy="432" r="30" fill="#0a0a0c" stroke="${a}" stroke-width="6"/>`
  };

  function visuelProduit(p) {
    const a = OR;
    const MEME = {
      tech:"tech", audio:"audio", info:"info", image:"image", tv:"tv", jeux:"info", bureau:"info",
      femme:"mode", homme:"mode", sport:"mode", chaussures:"mode", sacs:"mode", montres:"mode",
      bijoux:"mode", beaute:"mode", sante:"boite", maison:"boite", cuisine:"boite", meubles:"boite",
      jardin:"boite", bricolage:"boite", auto:"auto", moto:"moto", pleinair:"boite", bebe:"boite",
      jouets:"boite", livres:"boite", animaux:"boite", epicerie:"boite", instruments:"boite",
    };
    const forme = (FORME[MEME[p.cat]] || FORME.boite)(a);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 620" width="600" height="620">
      <defs>
        <radialGradient id="fond" cx="50%" cy="34%" r="72%">
          <stop offset="0" stop-color="#241d10"/><stop offset=".55" stop-color="#0d0d10"/><stop offset="1" stop-color="#050506"/>
        </radialGradient>
        <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff0b8" stop-opacity=".22"/>
          <stop offset=".45" stop-color="#e8bf5a" stop-opacity=".16"/>
          <stop offset="1" stop-color="#b8861f" stop-opacity=".10"/>
        </linearGradient>
        <linearGradient id="sol" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e8bf5a" stop-opacity=".22"/>
          <stop offset="1" stop-color="#e8bf5a" stop-opacity="0"/>
        </linearGradient>
        <filter id="lueur"><feGaussianBlur stdDeviation="16" result="f"/><feMerge><feMergeNode in="f"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="600" height="620" fill="url(#fond)"/>
      <ellipse cx="300" cy="512" rx="196" ry="34" fill="url(#sol)"/>
      <ellipse cx="300" cy="508" rx="128" ry="20" fill="#000" opacity=".55"/>
      <g filter="url(#lueur)">${forme}</g>
      <path d="M300 92v-34M282 68l18-18 18 18" stroke="${a}" stroke-width="2" opacity=".35" fill="none"/>
    </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* ---------- générateur de rendu porté ---------- */
  function monterGenerateur(zone) {
    if (!zone || zone.dataset.pret) return;
    zone.dataset.pret = "1";

    const toile = zone.querySelector("[data-toile]");
    const entree = zone.querySelector("[data-photo]");
    const depot = zone.querySelector("[data-depot]");
    const piece = zone.querySelector("[data-piece]");
    const taille = zone.querySelector("[data-taille]");
    const haut = zone.querySelector("[data-haut]");
    const angle = zone.querySelector("[data-angle]");
    const opac = zone.querySelector("[data-opacite]");
    const lumiere = zone.querySelector("[data-lumiere]");
    const exportBtn = zone.querySelector("[data-export]");
    const reinit = zone.querySelector("[data-reinit]");
    if (!toile) return;

    const ctx = toile.getContext("2d");
    let photo = null;
    let modele = null;

    const VETEMENTS = {
      veste: {
        nom: "Veste",
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="200" height="240">
          <path d="M100 16c-14 0-24 6-30 14L24 52l12 34 16-6v146h96V80l16 6 12-34-46-22c-6-8-16-14-30-14z"
                fill="#d9633a" stroke="#8f3a1e" stroke-width="2" stroke-linejoin="round"/>
          <path d="M100 30v196" stroke="#8f3a1e" stroke-width="2" opacity=".55"/>
          <path d="M72 60c8 10 48 10 56 0" fill="none" stroke="#8f3a1e" stroke-width="2"/>
        </svg>`
      },
      tshirt: {
        nom: "T-shirt",
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="200" height="240">
          <path d="M100 20c-12 0-20 4-26 10l-46 22 14 30 18-8v148h80V74l18 8 14-30-46-22c-6-6-14-10-26-10z"
                fill="#e8552e" stroke="#a63c1d" stroke-width="2" stroke-linejoin="round"/>
          <path d="M74 30c6 12 46 12 52 0" fill="none" stroke="#a63c1d" stroke-width="2"/>
        </svg>`
      },
      chemise: {
        nom: "Chemise",
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="200" height="240">
          <path d="M100 18l-28 14-44 22 12 30 16-6v150h88V78l16 6 12-30-44-22z"
                fill="#e9e2d0" stroke="#b3a893" stroke-width="2" stroke-linejoin="round"/>
          <path d="M100 32v190" stroke="#b3a893" stroke-width="2"/>
          <circle cx="100" cy="80" r="3" fill="#b3a893"/><circle cx="100" cy="120" r="3" fill="#b3a893"/>
          <circle cx="100" cy="160" r="3" fill="#b3a893"/><circle cx="100" cy="200" r="3" fill="#b3a893"/>
        </svg>`
      },
      robe: {
        nom: "Robe",
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 260" width="200" height="260">
          <path d="M100 14c-10 0-16 4-20 10L62 34l-6 26 14 4-22 176h104L130 64l14-4-6-26-18-10c-4-6-10-10-20-10z"
                fill="#b0476b" stroke="#7d2f4a" stroke-width="2" stroke-linejoin="round"/>
          <path d="M78 34c6 10 38 10 44 0" fill="none" stroke="#7d2f4a" stroke-width="2"/>
        </svg>`
      }
    };

    function preparerPiece() {
      const choix = (piece && piece.value) || "tshirt";
      const def = VETEMENTS[choix] || VETEMENTS.tshirt;
      const img = new Image();
      img.onload = () => { modele = img; dessiner(); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(def.svg);
    }

    function dessiner() {
      if (!photo) return;
      const l = toile.width, h = toile.height;
      ctx.clearRect(0, 0, l, h);
      ctx.drawImage(photo, 0, 0, l, h);

      if (!modele) return;
      const echelle = (parseFloat(taille?.value || 100) / 100);
      const larg = l * 0.46 * echelle;
      const hautPx = h * (parseFloat(haut?.value || 42) / 100);
      const ratio = modele.height / modele.width;
      const haute = larg * ratio;
      const cx = l / 2;
      const ang = (parseFloat(angle?.value || 0) * Math.PI) / 180;

      ctx.save();
      ctx.translate(cx, hautPx + haute / 2);
      ctx.rotate(ang);

      /* ombre portée douce : donne l'impression que le tissu est posé sur le corps */
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.filter = "blur(10px)";
      ctx.drawImage(modele, -larg / 2 + 6, -haute / 2 + 10, larg, haute);
      ctx.restore();

      /* le vêtement lui-même */
      ctx.globalAlpha = parseFloat(opac?.value || 100) / 100;
      ctx.drawImage(modele, -larg / 2, -haute / 2, larg, haute);

      /* plis : dégradé sombre sur les bords, lumière au centre */
      const g = ctx.createLinearGradient(-larg / 2, 0, larg / 2, 0);
      g.addColorStop(0, "rgba(0,0,0,.35)");
      g.addColorStop(.28, "rgba(0,0,0,0)");
      g.addColorStop(.5, "rgba(255,255,255,.10)");
      g.addColorStop(.72, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,.32)");
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = g;
      ctx.fillRect(-larg / 2, -haute / 2, larg, haute);

      /* accord de lumière avec la photo */
      const chaud = parseFloat(lumiere?.value || 50) / 100;
      if (chaud > 0) {
        ctx.fillStyle = `rgba(232,191,90,${0.10 * chaud})`;
        ctx.fillRect(-larg / 2, -haute / 2, larg, haute);
      }
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.filter = "none";
    }

    function chargerPhoto(fichier) {
      if (!fichier || !/^image\//.test(fichier.type)) return;
      const lecteur = new FileReader();
      lecteur.onload = () => {
        const img = new Image();
        img.onerror = () => {
          /* format refusé par le navigateur (souvent HEIC d'iPhone) : on le dit clairement */
          if (depot) {
            depot.style.display = "";
            const t = depot.querySelector("span");
            if (t) t.textContent = "Photo non prise en charge — choisissez un JPEG ou un PNG";
          }
          if (entree) entree.value = "";
        };
        img.onload = () => {
          /* on garde la photo d'origine, redimensionnée pour rester fluide */
          const maxL = 900;
          const r = Math.min(1, maxL / img.width);
          toile.width = Math.round(img.width * r);
          toile.height = Math.round(img.height * r);
          photo = img;
          if (depot) depot.style.display = "none";
          dessiner();
        };
        img.src = lecteur.result;
      };
      lecteur.readAsDataURL(fichier);
    }

    if (entree) entree.addEventListener("change", e => chargerPhoto(e.target.files?.[0]));
    [piece, taille, haut, angle, opac, lumiere].forEach(el => el && el.addEventListener("input", dessiner));
    if (reinit) reinit.onclick = () => {
      photo = null; ctx.clearRect(0, 0, toile.width, toile.height);
      if (depot) depot.style.display = "";
      if (entree) entree.value = "";
    };
    if (exportBtn) exportBtn.onclick = () => {
      if (!photo) return;
      const a = document.createElement("a");
      a.download = "maiga-rendu.png";
      a.href = toile.toDataURL("image/png");
      a.click();
    };

    preparerPiece();
  }

  window.visuelProduit = visuelProduit;
  window.monterGenerateur = monterGenerateur;
})();
