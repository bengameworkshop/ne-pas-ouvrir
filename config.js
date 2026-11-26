// ============================================================
//  🎁 CONFIGURATION DU CADEAU : c'est ici que tu personnalises
// ============================================================
window.NOEL = {
  // Message affiché tout à la fin, sous le code (vide = pas de message)
  messageFinal: "",

  // Messages surprises entre deux couches, dans l'ordre (les mêmes pour tout le monde).
  // Vide = pas de message. Un message peut être un texte, ou { texte, de, image }.
  messagesParDefaut: [],

  // Les joueurs, dans l'ordre d'affichage des boutons.
  //   nom   : le prénom affiché sur le bouton
  //   codeSecret : le code écrit sur son VRAI cadeau, brouillé pour qu'on ne puisse pas le lire ici.
  //                Pour brouiller un nouveau code, ouvre l'appli avec ?test&encode=TONMOT
  //
  //   ESCAPE GAME (optionnel, sinon des indices automatiques sur le prénom sont utilisés) :
  //   indices   : des mots en lien avec cette personne. Ceux qui cherchent un symbole qu'elle garde
  //               voient d'abord le mot aux lettres MÉLANGÉES, puis le rébus en emojis (après 2 min),
  //               puis le mot en clair (après 4 min).
  //   questions : des questions SUR cette personne, qu'elle posera à ceux qui viennent chercher un symbole.
  //               C'est elle qui juge si la réponse est bonne.
  //               ex. questions: ["Quel est mon plat préféré ?", "Où suis-je partie en voyage cet été ?"]
  joueurs: [
    { nom: "Sylvie",  codeSecret: "rex5Pyg/aA==",
      indices: [{ mot: "Broderie", rebus: "🧵🪡🌸" }, { mot: "Beaux-arts", rebus: "🎨🖼️🏛️" }] },
    { nom: "Gilles",  codeSecret: "Ojdss+89aC4g",
      indices: [{ mot: "Voitures", rebus: "🚗🏎️🔧" }, { mot: "Moustache", rebus: "🥸" }] },
    { nom: "Anouk",   codeSecret: "KCliMy49",
      indices: [{ mot: "Kawaii", rebus: "🌸🐱💖✨" }, { mot: "Ado", rebus: "📱🙄🎧" }] },
    { nom: "Pablo",   codeSecret: "PCBjPiQ=",
      indices: [{ mot: "Pokémon", rebus: "⚡🐭🔴⚪" }, { mot: "Mbappé", rebus: "⚽🇫🇷🔟💨" }] },
    { nom: "Esther",  codeSecret: "IjB5OS8=",
      indices: [{ mot: "Film d'horreur", rebus: "🎬🔪👻😱" }, { mot: "Pialat", rebus: "🎥🇫🇷 « À nos amours » (1983)" }] },
    { nom: "Charles", codeSecret: "PSR9OS8=",
      indices: [{ mot: "Mexique", rebus: "🌮🌵🪅" }, { mot: "Léon Marchand", rebus: "🏊‍♂️🥇🥇🥇🥇" }] },
    { nom: "Laure",   codeSecret: "LCp4Nyg2",
      indices: [{ mot: "Céline Dion", rebus: "🎤🇨🇦🚢💔" }, { mot: "Comptabilité", rebus: "🧾🧮📊💶" }] },
    { nom: "Benoit",  codeSecret: "KTBkIi0yYysw",
      indices: [{ mot: "Ordinateur", rebus: "💻🖱️⌨️" }, { mot: "Geek", rebus: "🤓🎮👾" }] },
  ],
};
