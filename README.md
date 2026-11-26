# 🎁 Ne pas ouvrir : le cadeau de Noël à déballer

Une appli web installable (PWA) qui marche sur **iPhone et Android**, sans App Store ni Play Store.
Elle est hébergée gratuitement sur **GitHub Pages**.

Chacun touche son prénom, puis déballe son cadeau
couche par couche, comme des poupées russes :
nœud → papier → boîte à secouer → poupées → bougie à souffler → son personnage cartoon sort de la dernière poupée
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

Pour modifier juste un texte, tu peux aussi le faire directement sur GitHub : clique sur `config.js`, puis sur le crayon ✏️ en haut à droite, modifie, et **Commit changes**.

---

## 4. Personnaliser (fichier `config.js`)

- `joueurs` : une ligne par personne.
  - `nom` : le prénom affiché sur le bouton à l'entrée de l'appli.
  - `code` : le code écrit sur son **vrai** cadeau sous le sapin.
  - `photo` : sa tête en cartoon, par exemple `"photos/leo.png"`. Laisse `""` pour avoir une tête dessinée.
- `messagesParDefaut` : les messages surprises entre les couches, les mêmes pour tout le monde.
- `messageFinal` : le mot affiché tout à la fin.

**Ajouter une photo dans un message :** crée un dossier `photos` dans le dépôt, mets-y l'image, puis écris
`{ texte: "Tu te souviens ?", image: "photos/plage-2009.jpg", de: "Moi" }`.

> 🔒 Le dépôt est public : n'importe qui ayant l'adresse peut lire `config.js` et voir les photos.
> Évite d'y mettre des choses très personnelles. Et un membre de la famille un peu malin pourrait lire les messages en avance 😉

---

## 5. Le message à envoyer à la famille (le jour J)

> 🎁 J'ai un cadeau pour toi ! Ouvre ce lien sur ton téléphone : https://bengameworkshop.github.io/ne-pas-ouvrir/
> Installe l'appli comme indiqué, ouvre l'icône « Ne pas ouvrir », touche ton prénom… et déballe !

**Sur iPhone** : il faut ouvrir le lien dans **Safari**, puis faire Partager ⬆️ → « Sur l'écran d'accueil ».
**Sur Android** : ouvre le lien dans **Chrome**, puis touche « Installer » (ou menu ⋮ → « Installer l'application »).

Au premier lancement de l'icône, chacun touche son prénom. À la fin du déballage, l'appli garde le code affiché : on peut la rouvrir pour le revoir.

---

## Bon à savoir

- **Un seul téléphone pour plusieurs personnes** : à la fin, le bouton « Au tour de quelqu'un d'autre » ramène à la liste des prénoms. Ceux qui ont déjà déballé ont un ✓, et en touchant leur prénom ils revoient directement leur code.

- Le **micro** (bougie) et la **secousse** demandent une autorisation. Si quelqu'un refuse, il y a toujours une alternative au doigt : appui long sur la flamme, tapoter la boîte.
- Sur iPhone, l'appli installée et Safari ne partagent pas leurs données. C'est pour ça que l'appli redemande le prénom quand on l'ouvre depuis l'icône.
- Tout est stocké sur le téléphone de chacun. Il n'y a pas encore de serveur : il viendra avec la partie « quotidien » de l'appli.
