// ============================================================
//  🎁 CONFIGURATION DU CADEAU : c'est ici que tu personnalises
// ============================================================
window.NOEL = {
  // Message affiché tout à la fin, sous le code
  messageFinal:
    "Cette appli, c'est mon cadeau pour toute la famille.\n" +
    "On va s'en servir toute l'année pour rester proches, même de loin. ❤️",

  // Messages surprises qui apparaissent entre deux couches, dans l'ordre (les mêmes pour tout le monde).
  // Un message peut être un simple texte, ou { texte, de, image }.
  // Exemple avec photo : { texte: "Tu te souviens ?", image: "photos/plage-2009.jpg", de: "Moi" }
  messagesParDefaut: [
    "Tu as bien déchiré ce papier. On sent l'expérience. 😄",
    { texte: "Un indice : ce cadeau ne se range pas dans un placard…", de: "Le lutin" },
    "Plus que quelques couches… courage !",
    "Attention, il fait tout noir dans la dernière poupée… 🕯️",
    "Quel souffle ! Le Père Noël est impressionné. 🌬️",
  ],

  // Les joueurs, dans l'ordre d'affichage des boutons.
  //   nom   : le prénom affiché sur le bouton
  //   code  : le code écrit sur son VRAI cadeau, sous le sapin
  //   photo : sa tête en version cartoon (fichier du dossier photos/). "" = tête dessinée.
  joueurs: [
    { nom: "Sylvie",  code: "ÉTOILE",    photo: "" },
    { nom: "Gilles",  code: "TRAÎNEAU",  photo: "" },
    { nom: "Anouk",   code: "FLOCON",    photo: "" },
    { nom: "Pablo",   code: "RENNE",     photo: "" },
    { nom: "Esther",  code: "LUTIN",     photo: "" },
    { nom: "Charles", code: "SAPIN",     photo: "" },
    { nom: "Laure",   code: "BOUGIE",    photo: "" },
    { nom: "Benoit",  code: "GUIRLANDE", photo: "" },
  ],
};
