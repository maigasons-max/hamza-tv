/* Catalogue de démonstration.
   Remplacer par les vrais articles : chaque produit a un univers (cat),
   un nom, un prix en FCFA, une description, des variantes et des avis RÉELS.
   Aucun avis inventé : "avis" reste vide tant que de vrais clients n'ont pas écrit. */

const UNIVERS = [
  { id: "tech",    nom: "Tech",        sous: "téléphones, audio, ordinateurs" },
  { id: "mode",    nom: "Mode",        sous: "vêtements, chaussures, sacs" },
  { id: "maison",  nom: "Maison",      sous: "cuisine, déco, rangement" },
  { id: "beaute",  nom: "Beauté",      sous: "soin, parfum, cheveux" },
  { id: "moto",    nom: "Motos",       sous: "deux-roues, casques, pièces" },
  { id: "auto",    nom: "Autos",       sous: "voitures, entretien, accessoires" }
];

const PRODUITS = [
  {
    id: "p1", cat: "tech", nom: "Téléphone Nova X", sous: "128 Go · 5G",
    prix: 185000, teinte: ["#3b4bff", "#7a3bff"], forme: "Nova X",
    desc: "Écran 6,6 pouces 120 Hz, batterie qui tient deux jours, double SIM. Livré avec chargeur 33 W et coque.",
    variantes: ["128 Go", "256 Go"], avis: []
  },
  {
    id: "p2", cat: "tech", nom: "Casque Aura", sous: "réduction de bruit",
    prix: 47500, teinte: ["#00c2a8", "#0b7f9e"], forme: "Aura",
    desc: "Trente heures d'autonomie, coussinets mémoire, mode transparence pour entendre autour de vous.",
    variantes: ["Noir", "Sable"], avis: []
  },
  {
    id: "p3", cat: "mode", nom: "Veste Sahara", sous: "coton lourd",
    prix: 32000, teinte: ["#e8552e", "#ffb03a"], forme: "Sahara",
    desc: "Coupe droite, épaules tombantes, deux poches profondes. Se porte ouverte sur un tee, fermée le soir.",
    variantes: ["S", "M", "L", "XL"], avis: []
  },
  {
    id: "p4", cat: "mode", nom: "Sneakers Kano", sous: "semelle crantée",
    prix: 38000, teinte: ["#8a6bff", "#3b4bff"], forme: "Kano",
    desc: "Tige en mesh respirant, semelle qui accroche sur le sable comme sur le goudron.",
    variantes: ["40", "41", "42", "43", "44"], avis: []
  },
  {
    id: "p5", cat: "maison", nom: "Marmite fonte 5 L", sous: "cuisson lente",
    prix: 27500, teinte: ["#b06a3b", "#6b3b2a"], forme: "5 L",
    desc: "Fonte émaillée, couvercle qui garde l'humidité. Pour les sauces longues et le pain.",
    variantes: ["Noir", "Terracotta"], avis: []
  },
  {
    id: "p6", cat: "maison", nom: "Lampe Cercle", sous: "lumière chaude",
    prix: 19000, teinte: ["#ffb03a", "#e8552e"], forme: "Cercle",
    desc: "Anneau de 40 cm, intensité réglable au doigt, se pose au sol ou sur un meuble.",
    variantes: ["Blanc", "Noir"], avis: []
  },
  {
    id: "p7", cat: "beaute", nom: "Huile Karité brute", sous: "100 % pressée",
    prix: 6500, teinte: ["#d9a441", "#a86b1f"], forme: "Karité",
    desc: "Beurre de karité non raffiné du Burkina, sans parfum ajouté. Peau et cheveux.",
    variantes: ["250 ml", "500 ml"], avis: []
  },
  {
    id: "p8", cat: "moto", nom: "Casque Route 3", sous: "homologué",
    prix: 42000, teinte: ["#2b2b33", "#0f0f14"], forme: "Route 3",
    desc: "Écran clair et fumé fournis, mousses amovibles, fermeture micrométrique.",
    variantes: ["M", "L", "XL"], avis: []
  },
  {
    id: "p9", cat: "moto", nom: "Moto Urban 125", sous: "neuve · garantie 1 an",
    prix: 795000, teinte: ["#e8552e", "#7a2b12"], forme: "125",
    desc: "Moteur 125 cm³, consommation 2,1 L/100, selle biplace, porte-bagages. Carte grise incluse.",
    variantes: ["Rouge", "Noir"], avis: []
  },
  {
    id: "p10", cat: "auto", nom: "Toyota d'occasion", sous: "essence · 2014",
    prix: 4200000, teinte: ["#4a5b6b", "#22303d"], forme: "2014",
    desc: "Véhicule révisé, pneus neufs, climatisation froide. Essai possible sur rendez-vous.",
    variantes: ["Manuelle"], avis: []
  },
  {
    id: "p11", cat: "auto", nom: "Kit entretien", sous: "huile + filtres",
    prix: 14500, teinte: ["#3b8a6b", "#1f4a3b"], forme: "Kit",
    desc: "Huile 5W30 4 L, filtre à huile, filtre à air. Pour la plupart des moteurs essence.",
    variantes: ["Essence", "Diesel"], avis: []
  },
  {
    id: "p12", cat: "beaute", nom: "Savon noir doux", sous: "argile + karité",
    prix: 2500, teinte: ["#6b5b3b", "#3b2f1f"], forme: "Savon",
    desc: "Nettoie sans dessécher, convient au visage. Fabriqué à Ouagadougou.",
    variantes: ["100 g"], avis: []
  }
];
