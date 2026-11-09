# Hamza TV — code source complet et mode d'emploi

Ce dossier contient tout ce qui fait tourner Hamza TV : le site (interface + lecteur),
le catalogue de données, et le script de fabrication de l'APK. Rien n'est caché, rien
n'est compilé : ce sont des fichiers texte, modifiables avec n'importe quel éditeur.

Version du catalogue au moment du paquet : v52 — 1285 entrées, 39 879 épisodes.

---

## 1. Comment l'ensemble tient debout

Trois pièces, et elles ne se mélangent pas.

1. Un dépôt GitHub public : `maigasons-max/hamza-tv`, avec GitHub Pages activé.
   GitHub sert les fichiers en HTTPS. Il n'y a aucun serveur, aucune base de données,
   aucun coût d'hébergement. C'est le "backend".
2. Le site dans ce dépôt : `index.html`, `app.js`, `style.css`, `correctifs.css`,
   `manifest.json`, `assets/` (icônes + hls.js), et `serie.json` (les données).
3. L'APK Android : une coquille WebView. Elle n'embarque pas l'interface, elle ouvre
   l'URL Pages. Conséquence : modifier le site ne demande jamais de reconstruire l'APK.
   Si le réseau manque, elle bascule sur la copie de secours dans `assets/`.

Flux d'une mise à jour : j'édite un fichier, je pousse sur `main`, GitHub Pages republie
en 30 à 90 secondes, la TV récupère la nouvelle version au prochain lancement.

---

## 2. Arborescence

```
site/
  index.html        page unique, charge les scripts
  app.js            1 349 lignes : catalogue, vues, recherche, lecteur
  style.css         mise en page, thème sombre
  correctifs.css    surcharges de mise au point
  manifest.json     manifeste PWA (installation, icônes)
  installer.html    page d'installation de l'APK
  serie.json        3,1 Mo : tout le catalogue
  assets/
    hls.min.js      lecteur HLS (414 Ko), indispensable pour le streaming .m3u8
    icon-*.png, favicon.png, logo-*.png, affiche-*.jpg
apk/
  build_hamza.py    script de fabrication de l'APK (Python)
```

---

## 3. Format du catalogue (`serie.json`)

Un seul objet. `v` sert de compteur de version pour casser le cache.

```json
{
  "v": 52,
  "series": [
    {
      "id": "one-piece",
      "t": "One Piece",
      "s": "1999 · Animé · VF",
      "affiche": "https://cdn.exemple/poster.jpg",
      "badge": "VF",
      "categorie": "anime",
      "annee": 1999,
      "tendance": 12,
      "episodes": { "1": "https://exemple/embed/1", "2": "https://exemple/embed/2" },
      "saisonDe": { "1": 1, "2": 1 },
      "numero":   { "1": 1, "2": 2 },
      "saisonNoms": { "1": "Saison 1" }
    }
  ]
}
```

Champs utiles :

- `id` : identifiant unique, utilisé dans les URLs internes. Ne pas le changer après coup.
- `t`, `s`, `affiche` : titre, sous-titre, image. `s.saisonDe[n]` range l'épisode n dans une saison.
- `episodes` : la clé est le numéro, la valeur est **une URL de page de lecteur** ou
  **un fichier direct** (`.mp4`, `.m3u8`). Les deux marchent.
- `categorie` : `anime`, `serie` ou `film`. C'est ce qui décide de l'onglet.
- `aRelier` : variante pour une fiche sans fichier (le film s'ouvre ailleurs).
- `plateformes` : `[{"nom":"Prime Video","url":"https://..."}]` pour un bouton officiel.

Ajouter une série = ajouter un objet ici, incrémenter `v`, pousser. C'est tout.

---

## 4. Chargement du catalogue (`app.js`)

```js
const SOURCES = [
  "https://maigasons-max.github.io/hamza-tv/serie.json",
  "https://raw.githubusercontent.com/maigasons-max/hamza-tv/main/serie.json"
];
```

Le premier est le site, le second le dépôt brut. Le second sert de secours si Pages
tousse. Le tout est mis en cache local pour un démarrage instantané, avec comparaison
du champ `v` pour ne remplacer que si c'est plus récent. Une copie est embarquée dans
l'APK : l'app démarre même sans réseau.

---

## 5. Le lecteur (`app.js`)

Les `episodes` d'un animé pointent vers une **page** de lecteur, pas vers une vidéo.
Le travail consiste à en extraire l'adresse du flux, puis à jouer ce flux soi-même
avec hls.js. C'est ce qui donne le plein écran, le 1080p et zéro publicité.

```js
async function fluxDirect(embed) {
  const r = await fetch(embed, { cache: "no-store" });
  if (!r.ok) return null;
  const texte = await r.text();
  const m = texte.match(/https?:\/\/[^"'\\\s]+\.m3u8[^"'\\\s]*/);
  return m ? m[0].replace(/\\\//g, "/") : null;
}
```

Puis :

```js
const video = document.createElement("video");
if (window.Hls && Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource(urlM3u8);
  hls.attachMedia(video);
} else {
  video.src = urlM3u8;          // Safari, Android récent
}
```

Deux conditions pour que ça marche :

1. La page du lecteur doit renvoyer un en-tête `Access-Control-Allow-Origin` qui
   accepte `maigasons-max.github.io`. Sans ça, `fetch` échoue et hls.js est impossible.
2. L'URL `.m3u8` contient souvent un jeton à durée de vie (12 h chez certains).
   Donc on la résout **à chaque clic**, on ne la stocke jamais dans le catalogue.

Si l'extraction échoue, un iframe de secours prend le relais avec un compteur
d'attente, pour ne jamais laisser un écran noir muet.

---

## 6. Pousser une modification

Le jeton ne doit jamais être écrit dans un fichier du dépôt. Il se met dans
l'environnement, et on l'injecte au moment du push.

```bash
git clone https://github.com/maigasons-max/hamza-tv.git
cd hamza-tv
# ... modifier app.js ou serie.json ...
git add -A
git commit -m "v53 : ajout de 20 séries"
git push https://x-access-token:$GITHUB_TOKEN@github.com/maigasons-max/hamza-tv.git HEAD:main
```

Vérifier en ligne deux minutes plus tard :

```bash
curl -s "https://maigasons-max.github.io/hamza-tv/serie.json?t=$(date +%s)" | head -c 120
```

Attention au cache : `index.html` référence `app.js?v=52`. Si vous modifiez `app.js`,
montez ce numéro, sinon la TV garde l'ancien script en mémoire. Même logique pour `v`
dans `serie.json`.

---

## 7. Se créer son propre jeton GitHub

Un jeton à vous, pour ne dépendre de personne. C'est gratuit et ça prend deux minutes.

1. GitHub → votre photo en haut à droite → **Settings**.
2. Tout en bas à gauche → **Developer settings**.
3. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
4. Renseignez :
   - Name : `hamza-tv-2026`
   - Expiration : 90 jours (ou 1 an)
   - Resource owner : votre compte `maigasons-max`
   - Repository access : **Only select repositories** → `hamza-tv`
   - Permissions → Repository permissions → **Contents : Read and write**
   - Permissions → Repository permissions → **Pages : Read and write** (si vous activez Pages par script)
5. **Generate token**, puis copiez la valeur qui commence par `github_pat_`. Elle ne
   s'affiche qu'une seule fois.
6. Mettez-la dans votre terminal, jamais dans un fichier versionné :

```bash
export GITHUB_TOKEN=github_pat_xxxxx
```

ou dans un `.env` local ajouté au `.gitignore` :

```
GITHUB_TOKEN=github_pat_xxxxx
```

Régénérer, c'est aussi simple : même écran, **Regenerate**. Si un jeton a circulé
(par message, capture d'écran), révoquez-le et créez-en un neuf. Un jeton n'est pas
un mot de passe : il ne donne accès qu'aux dépôts cochés, et seulement aux
permissions cochées. C'est pour ça qu'il faut un jeton par projet, avec 90 jours
d'expiration, plutôt qu'un jeton permanent à portée totale.

Ce que votre jeton permet, ici : pousser des commits, publier des Releases, redéployer
Pages. Rien d'autre. Il ne donne pas accès à votre compte, à vos mails, ni à vos
autres dépôts.

---

## 8. Ajouter un film en fichier direct (sans site tiers)

Un film en `.mp4` peut vivre dans une **Release** GitHub : 2 Go par fichier, lien
direct, pas de publicité, pas d'expiration. GitHub limite en revanche la taille totale
du dépôt, donc on utilise les Releases, pas le dépôt lui-même.

```bash
# 1) créer la release
curl -X POST -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/maigasons-max/hamza-tv/releases \
  -d '{"tag_name":"film-kfp-1","name":"Kung Fu Panda","draft":false,"prerelease":false}'

# 2) téléverser le fichier (l'URL d'upload est renvoyée dans upload_url)
curl -X POST -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Content-Type: video/mp4" \
  --data-binary @kung-fu-panda-1.mp4 \
  "https://uploads.github.com/repos/maigasons-max/hamza-tv/releases/ID/assets?name=kung-fu-panda-1.mp4"
```

L'URL publique ressemble à :
`https://github.com/maigasons-max/hamza-tv/releases/download/film-kfp-1/kung-fu-panda-1.mp4`

Elle se colle dans `episodes` de l'entrée du catalogue, et le lecteur la joue
directement.

---

## 9. Reconstruire l'APK (seulement si l'URL ou l'icône change)

`apk/build_hamza.py` fabrique l'APK : il prend le JDK et le SDK Android, compile une
WebView, signe, et sort un fichier installable.

```bash
python3 apk/build_hamza.py <url_du_site> <versionName> <versionCode> <sortie.apk>
```

La signature utilise la clé `nexus.jks`. **Elle n'est pas dans ce paquet** : une clé de
signature qui circule publiquement permet à n'importe qui de produire une mise à jour
que les téléphones accepteraient comme la vôtre. Gardez-la en lieu sûr, avec son mot de
passe. Pour reconstruire, il faut la même clé que les versions précédentes, sinon
Android refuse l'installation par-dessus (il faut désinstaller).

Règle simple : on ne reconstruit l'APK que si l'URL du site change, si l'icône change
ou si le nom du paquet change. Pour du contenu, un simple push suffit.

---

## 10. Les pièges déjà rencontrés

1. **Cache** : sans `?v=N` sur les scripts et sans incrément de `v` dans `serie.json`,
   la TV affiche l'ancienne version et on croit que le push a échoué.
2. **CORS** : certains hébergeurs n'envoient pas d'en-tête d'origine. Dans ce cas,
   hls.js est impossible quel que soit le code. Il faut passer par l'iframe.
3. **403 sur les fichiers de catalogue** : l'en-tête `Referer` du site d'origine est
   exigé, sans lui la requête est refusée.
4. **503 en rafale** : ne pas dépasser 4 à 6 requêtes simultanées pendant une collecte,
   sinon le site coupe. Faire des pauses.
5. **Jetons expirants** : une URL `.m3u8` gardée en cache meurt au bout de quelques
   heures. Toujours résoudre au clic.
6. **Iframe "vidéo en timbre-poste"** : c'est le lecteur du site tiers qui impose sa
   taille. La solution est celle décrite en section 5 : jouer le flux soi-même.
7. **Télécommande** : sur Android TV, les flèches gauche/droite font ±10 s, haut/bas le
   volume, OK la pause, Retour ferme le lecteur.

---

## 11. Ce qui reste à décider

Le catalogue d'animés est alimenté par une source tierce, avec la mécanique décrite en
section 5. Pour les films et séries sous droits, cette mécanique ne s'applique pas : il
faut soit un fichier que vous fournissez, soit la plateforme officielle qui détient les
droits (bouton `plateformes`). C'est un choix de distribution, pas un choix technique,
et il vous appartient.
