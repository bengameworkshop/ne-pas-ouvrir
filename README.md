# 🎁 Ne pas ouvrir : le cadeau de Noël à déballer

Une appli web installable (PWA) qui marche sur **iPhone et Android**, sans App Store ni Play Store.
Elle est hébergée gratuitement sur **GitHub Pages**.

Chacun touche son prénom, prend un selfie (transformé en cartoon), puis déballe son cadeau
couche par couche, comme des poupées russes :
nœud → papier cadeau à gratter (c'est son propre selfie cartoon !) → boîte à secouer → poupées → bougie à souffler → son personnage cartoon sort de la dernière poupée
→ le **code** écrit sur son vrai cadeau sous le sapin.

---

## 1. Mettre l'appli en ligne (une seule fois)

### a) Créer le dépôt
1. Va sur [github.com](https://github.com) et connecte-toi.
2. En haut à droite, clique sur **+** puis **New repository**.
3. Nom du dépôt : `ne-pas-ouvrir`, ou ce que tu veux, car ce sera dans l'adresse.
4. Coche **Public**. GitHub Pages gratuit n'accepte que les dépôts publics.
5. Clique sur **Create repository**.

### b) Envoyer les fichiers
1. Sur la page du dépôt vide, clique sur le lien **uploading an existing file**.
2. Décompresse le zip sur ton ordi, puis **glisse-dépose tout le contenu** du dossier `ne-pas-ouvrir` (pas le dossier lui-même) :
   `index.html`, `app.js`, `config.js`, `style.css`, `sw.js`, `manifest.webmanifest`, `README.md`, `.nojekyll` et le dossier `icons`.
   > Le fichier `.nojekyll` est caché sur Mac. Fais `Cmd + Maj + .` dans le Finder pour l'afficher. Il n'est pas obligatoire, mais c'est mieux avec.
3. En bas, clique sur **Commit changes**.

### c) Activer GitHub Pages
1. Dans le dépôt : **Settings** → **Pages**, dans le menu de gauche.
2. Dans **Source**, choisis **Deploy from a branch**.
3. Dans **Branch**, choisis `main` et `/ (root)`, puis **Save**.
4. Attends 1 à 2 minutes et recharge la page. L'adresse s'affiche en haut :
   `https://bengameworkshop.github.io/ne-pas-ouvrir/`

C'est en ligne ! 🎉

---

## 2. Tester sur ton téléphone

Le **mode test** saute l'écran d'installation et ajoute un bouton « Rejouer » à la fin :

| Lien | Effet |
|---|---|
| `…/ne-pas-ouvrir/?reset&test` | Repart de zéro, en mode test |
| `…/ne-pas-ouvrir/?test&joueur=Anouk` | Entre directement en tant qu'Anouk |
| `…/ne-pas-ouvrir/?test&etape=5` | Saute directement à l'étape 5 |
| `…/ne-pas-ouvrir/?reset&test=0` | Remet tout à zéro et quitte le mode test |

> ⚠️ Avant d'envoyer le lien, fais `?reset&test=0` sur ton téléphone pour le remettre comme neuf.

---

## 3. Mettre à jour l'appli (à chaque nouvelle version)

1. Sur la page du dépôt, clique sur **Add file** → **Upload files**.
2. Glisse les fichiers modifiés. Ceux qui ont le même nom sont remplacés.
3. **Commit changes**.
4. Attends 1 à 2 minutes. Sur le téléphone, **ferme l'appli complètement puis rouvre-la**. Parfois il faut la rouvrir deux fois.
   Sur ordinateur : rechargement forcé avec `Ctrl + Maj + R` (`Cmd + Maj + R` sur Mac).

Pour modifier juste un texte, tu peux aussi le faire directement sur GitHub : clique sur `config.js`, puis sur le crayon ✏️ en haut à droite, modifie, et **Commit changes**.

---

## 4. Personnaliser (fichier `config.js`)

- `joueurs` : une ligne par personne.
  - `nom` : le prénom affiché sur le bouton à l'entrée de l'appli.
  - `codeSecret` : le code écrit sur son **vrai** cadeau sous le sapin, **brouillé** pour qu'un petit malin ne puisse pas le lire dans le fichier.
    Pour brouiller un nouveau code, ouvre `https://bengameworkshop.github.io/ne-pas-ouvrir/?test&encode=TONMOT` : l'appli affiche la version brouillée à copier.
- `messagesParDefaut` : des messages surprises entre les couches, les mêmes pour tout le monde (aucun pour l'instant).
- `messageFinal` : un mot affiché tout à la fin (vide pour l'instant).

**Ajouter une photo dans un message :** crée un dossier `photos` dans le dépôt, mets-y l'image, puis écris
`{ texte: "Tu te souviens ?", image: "photos/plage-2009.jpg", de: "Moi" }`.

> 🔒 Le dépôt est public : n'importe qui ayant l'adresse peut lire `config.js`. Les codes y sont brouillés, mais pas les messages éventuels.

---

## 5. Le message à envoyer à la famille (le jour J)

> 🎁 J'ai un cadeau pour toi ! Ouvre ce lien sur ton téléphone : https://bengameworkshop.github.io/ne-pas-ouvrir/
> Installe l'appli comme indiqué, ouvre l'icône « Ne pas ouvrir », touche ton prénom… et déballe !

**Sur iPhone** : il faut ouvrir le lien dans **Safari**, puis faire Partager ⬆️ → « Sur l'écran d'accueil ».
**Sur Android** : ouvre le lien dans **Chrome**, puis touche « Installer » (ou menu ⋮ → « Installer l'application »).

Au premier lancement de l'icône, chacun touche son prénom. À la fin du déballage, l'appli garde le code affiché : on peut la rouvrir pour le revoir.

---

## Le déballage, étape par étape

Selfie → 3 nœuds (suivre la flèche) → papier à gratter (son selfie cartoon) → boîte à secouer →
poupée 1 → **les rennes égarés** → poupée 2 → **le traîneau** → poupée 3 → **les clochettes** →
**le Père Noël coincé dans la cheminée** → la dernière poupée qui s'échappe → le personnage → **le coffre** → le code.

## L'escape game : le coffre du Bois Rouelle 🔒

À la fin du déballage, le cadeau est enfermé dans un coffre à **4 symboles** (🦌 🎅 🛷 🔔 ⭐ 🎄 ❄️ 🍪).
- Le **symbole n°1**, chacun l'a sur son propre téléphone.
- Les **symboles n°2, 3 et 4** sont gardés par 3 autres membres de la famille (les « gardiens »).
  Le téléphone donne seulement un **indice** sur qui les garde : d'abord un mot en lien avec le gardien aux **lettres mélangées**, puis un **rébus en emojis** (après 2 min), puis le **mot en clair** (après 4 min).
- Le gardien ouvre « 🗝️ Quelqu'un me demande un symbole » (sur son écran du coffre ou de fin) et touche le prénom de celui qui demande :
  - n°2 : le symbole s'affiche directement ;
  - n°3 : le gardien pose d'abord une **question sur lui-même** et juge la réponse (15 s de pénalité si c'est faux) ;
  - n°4 : **mode duo** : le chercheur a un **numéro secret**, le gardien a un **tableau** « symbole ↔ numéro ». Aucun des deux ne peut trouver seul : il faut poser les deux téléphones côte à côte.
- Un essai raté sur le coffre indique combien de symboles sont bien placés.
- Pour pouvoir aider les autres, il faut avoir **fini ses jeux** (être arrivé au coffre).
- Pas de bouton « Je suis bloqué » sur le coffre : il faut vraiment jouer ensemble 😉

**Qui garde quoi** (ne le montre à personne !) :

| Joueur | Symbole n°2 | Symbole n°3 | Symbole n°4 |
|---|---|---|---|
| Sylvie | Gilles (indice) | Pablo (question) | Charles (duo) |
| Gilles | Anouk (indice) | Esther (question) | Laure (duo) |
| Anouk | Pablo (indice) | Charles (question) | Benoit (duo) |
| Pablo | Esther (indice) | Laure (question) | Sylvie (duo) |
| Esther | Charles (indice) | Benoit (question) | Gilles (duo) |
| Charles | Laure (indice) | Sylvie (question) | Anouk (duo) |
| Laure | Benoit (indice) | Gilles (question) | Pablo (duo) |
| Benoit | Sylvie (indice) | Anouk (question) | Esther (duo) |

## Bon à savoir

- **Le selfie** reste sur le téléphone : il n'est envoyé nulle part. Sans caméra disponible, l'appli propose d'ouvrir l'appareil photo.
- **« Je suis bloqué 😅 »** apparaît en haut à gauche si on reste longtemps sur une étape (45 s, ou 70 à 90 s pour les jeux) : il la passe automatiquement.
- **🔊 / 🔇** en haut à droite coupe ou remet le son (mémorisé sur le téléphone).

- **Un seul téléphone pour plusieurs personnes** : à la fin, le bouton « Au tour de quelqu'un d'autre » ramène à la liste des prénoms. Ceux qui ont déjà déballé ont un ✓, et en touchant leur prénom ils revoient directement leur code.

- Le **micro** (bougie) et la **secousse** demandent une autorisation. Si quelqu'un refuse, il y a toujours une alternative au doigt : appui long sur la flamme, tapoter la boîte.
- Sur iPhone, l'appli installée et Safari ne partagent pas leurs données. C'est pour ça que l'appli redemande le prénom quand on l'ouvre depuis l'icône.
- Tout est stocké sur le téléphone de chacun. Il n'y a pas encore de serveur : il viendra avec la partie « quotidien » de l'appli.
