// ============================================================
//  🎁 CONFIGURATION DU CADEAU : c'est ici que tu personnalises
// ============================================================
window.NOEL = {
  // Message affiché tout à la fin, sous le code
  messageFinal:
    "Cette appli, c'est mon cadeau pour toute la famille.\n" +
    "On va s'en servir toute l'année pour rester proches, même de loin. ❤️",

  // Messages utilisés si un joueur n'a pas les siens.
  // Ils apparaissent entre deux couches, dans l'ordre.
  // Un message peut être un simple texte, ou { texte, de, image }.
  // Exemple avec photo : { texte: "Tu te souviens ?", image: "photos/plage-2009.jpg", de: "Moi" }
  messagesParDefaut: [
    "Tu as bien déchiré ce papier. On sent l'expérience. 😄",
    { texte: "Un indice : ce cadeau ne se range pas dans un placard…", de: "Le lutin" },
    "Plus que quelques couches… courage !",
    "Attention, il fait tout noir dans la dernière poupée… 🕯️",
    "Quel souffle ! Le Père Noël est impressionné. 🌬️",
  ],

  // Les joueurs.
  //   nom    : le prénom affiché sur le bouton à l'entrée de l'appli
  //   code   : le code écrit sur son vrai cadeau, sous le sapin
  //   photo  : sa tête en version cartoon (fichier dans le dossier photos/)
  //   simple : true → moins d'étapes, plus facile (grands-parents, tout-petits)
  //   poupees: nombre de poupées russes à ouvrir (2 par défaut)
  //   messages : (optionnel) ses messages surprises personnels
  joueurs: [
    {
      nom: "Mamie", code: "ÉTOILE", photo: "", simple: true,
      messages: [
        "Mamie, tu déballes plus vite que tes petits-enfants ! ⚡",
        { texte: "Merci pour tous les gâteaux du dimanche.", de: "Toute la famille" },
        "Dernière ligne droite, Mamie !",
      ],
    },
    { nom: "Papy", code: "TRAÎNEAU", photo: "", simple: true },
    { nom: "Maman", code: "FLOCON", photo: "" },
    { nom: "Papa", code: "RENNE", photo: "" },
    { nom: "Léo", code: "LUTIN", photo: "", poupees: 3 },
  ],
};
