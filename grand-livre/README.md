# Grand Livre

Application Android de gestion et de comptabilite, 100 % hors-ligne.

## Ce qu'elle contient
- Accueil : solde total, chiffre d'affaires, benefice du mois, depenses, dettes et creances, meilleures ventes, alertes de stock bas.
- Operations : revenus et depenses, categories personnalisables, justification, compte, date, depenses programmees.
- Stock : prix d'achat, prix de vente, marge calculee, quantite, seuil d'alerte, fournisseur, precommande, vente rapide, import CSV/JSON.
- Argent : comptes (mobile money, banque, caisse), transferts, correction de solde, dettes avec paiements partiels, employes et salaires.
- Plus : clients et fournisseurs, agenda, bilans mensuel/semestriel/annuel, archives, factures PDF, export CSV, assistant local, plusieurs entreprises, sauvegarde et restauration, theme clair/sombre, code a 4 chiffres.

## Structure
- `www/index.html`, `www/style.css`, `www/app.js` : l'application (aucune dependance, aucun appel reseau).
- `build_grand_livre.py` : fabrique l'APK (assets embarqués, origine locale interceptee, signature nexus.jks).

## Fabriquer l'APK
```
cd apk-factory
python3 build_grand_livre.py 1 1.0     # versionCode, versionName
```
Sortie : `apk-factory/out/grand-livre-1.0.apk`

## Donnees
Tout est stocke dans le localStorage de l'application, sous la cle `grand-livre-v1`.
Sauvegarde : menu Plus > Sauvegarde et export > Exporter mes donnees.
