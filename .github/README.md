# Meet HACF

Fork de [La Suite Meet](https://github.com/suitenumerique/meet) utilisé pour
[meet.hacf.fr](https://meet.hacf.fr), l'instance de visioconférence de **HACF**
(Home Assistant Communauté Francophone).

Seule la **page d'accueil du frontend** est personnalisée. Le backend, LiveKit et
le reste du frontend sont ceux de la version officielle.

> Ce fichier est dans `.github/` pour ne pas entrer en conflit avec le
> `README.md` de l'upstream (GitHub l'affiche en priorité sur la page du dépôt).

## Branches

| Branche | Rôle |
| ------- | ---- |
| `main`  | Miroir strict de `suitenumerique/meet` (aucun commit HACF). |
| `hacf`  | Nos commits, rejoués par-dessus le **dernier tag officiel** `vX.Y.Z`. |

`git log vX.Y.Z..hacf` liste à tout moment l'ensemble des personnalisations.

## Ce qui est personnalisé, et où

**Fichiers upstream touchés** (seuls points de conflit possibles lors d'un rebase) :

| Fichier | Modification |
| ------- | ------------ |
| `src/frontend/src/routes.ts` | 1 ligne : la route `home` charge `@/features/hacf/routes/HacfHome` au lieu de `@/features/home/routes/Home`. |
| `src/frontend/src/main.tsx` | 1 ligne ajoutée : `import './features/hacf/styles/theme.css'`. |
| `src/frontend/public/favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png` | Fichiers remplacés (mêmes noms ; `index.html` et `site.webmanifest` inchangés) : icônes au logo HACF, découpées dans `docs/design/hacf-bannière-transparent.png`. Disque blanc derrière le logo en 16/32/48 px (lisible sur onglets clairs et sombres), fond `#0b0b10` pour l'icône Apple (pas de transparence sur iOS). |

**Fichiers ajoutés** (aucun conflit possible) :

| Fichier | Contenu |
| ------- | ------- |
| `src/frontend/src/features/hacf/styles/theme.css` | Thème HACF de toute l'interface. Redéfinit, hors `@layer` (donc prioritaires sans toucher `panda.config.ts`), les jetons Panda : `--colors-primary-*` (bleu HACF, survol violet), `--colors-primary-dark-*` (palette de la réunion, teinte HACF à luminosité égale), `--colors-focus-ring`, et les jetons clairs (`default`, `box`, `control`, gris) passés en sombre. Corrige les couleurs codées en dur de quelques composants (classes atomiques Panda), affiche la bannière HACF dans l'en-tête upstream (point d'accroche `.Header-beforeLogo`), et pose le fond sombre + halo sur toutes les pages hors conférence, avec une lueur autour de l'aperçu caméra. |
| `src/frontend/src/features/hacf/routes/HacfHome.tsx` | Page d'accueil (maquette « Accueil HACF Visio », section 2) : halo dégradé, titre, capsule de code, connexion ou actions de création. |
| `src/frontend/src/features/hacf/components/HacfHeader.tsx` | En-tête de l'accueil : bannière HACF, puis selon l'état Meet avatar + nom + « Déconnexion » (≥ 640 px) ou avatar ouvrant un menu du compte (< 640 px), et bouton Paramètres (langue…). |
| `src/frontend/src/features/hacf/components/HacfJoinForm.tsx` | Capsule « Code de la salle » : même validation (`isRoomValid`) et même navigation que `JoinMeetingDialog`. |
| `src/frontend/src/features/hacf/components/HacfCreateActions.tsx` | « Réunion instantanée » / « Créer un lien de réunion » : mêmes appels que `CreateMeetingMenu` (`useCreateRoom`, `generateRoomId`), copie via `useCopyRoomToClipboard`. |
| `src/frontend/src/features/hacf/styles/buttons.ts`, `theme.ts` | Styles des boutons et couleurs de l'accueil (variables CSS `--hacf-*`). |
| `src/frontend/src/features/hacf/styles/hacf.css` + `assets/fonts/` | Polices Inter et JetBrains Mono auto-hébergées (SIL OFL 1.1). |
| `src/frontend/src/features/hacf/assets/images/hacf-banner-light-text.webp` | Bannière HACF (logo + « Home Assistant Communauté Francophone ») en 812 × 132, fond transparent, texte recoloré en clair pour les fonds sombres. Source : `docs/design/hacf-bannière-transparent.png`. |
| `src/frontend/public/licenses/` | Textes de licence livrés dans l'image (`/licenses/`) : `meet-MIT.txt` (copie de `LICENSE.md`, exigée par la licence MIT), `inter-OFL.txt`, `jetbrains-mono-OFL.txt`. À recopier si `LICENSE.md` change upstream. |
| `src/frontend/src/locales/{fr,en}/hacf.json` | Textes de l'accueil (namespace i18n `hacf`). Les autres langues retombent sur le français. |
| `docs/design/hacf-bannière-transparent.png` | Bannière source (3330 × 541, fond transparent). |
| `.github/workflows/hacf-frontend.yml` | Reconstruction automatique de l'image (voir plus bas). |
| `.github/README.md` | Ce fichier. |

Identité visuelle : dégradé `oklch(55% 0.22 262)` → `oklch(52% 0.17 330)` →
`oklch(60% 0.22 28)`, police Inter, fond sombre `#0b0b10`. Nom affiché : « HACF Meet »
(titre d'onglet, via `VITE_APP_TITLE` au build).

Contrastes (WCAG AA) : texte blanc sur les boutons principaux 5,09:1 (survol 6,04:1),
texte clair sur fond sombre ≥ 9:1, bordures de champs et anneau de focus ≥ 3:1.

Seule l'interface change : l'état connecté vient de `useUser()`, « Se connecter »
utilise `LoginButton` / `authUrl()` (y compris le bouton ProConnect si
`use_proconnect_button` est activé côté backend), « Déconnexion » appelle
`logout()`. Tant que l'OIDC n'est pas configuré sur l'instance, « Se connecter »
mène vers `/api/v1.0/authenticate/` qui ne pourra pas aboutir ; il fonctionnera
sans modification dès que l'OIDC sera activé (voir plus bas pour le masquer d'ici là).

Différences avec la page d'origine : le lien « pour plus tard » s'affiche sous
les boutons au lieu de la boîte de dialogue `LaterMeetingDialog` (numéro et code
téléphoniques affichés si la téléphonie est activée) ; le carrousel et la
redirection `external_home_url` ne sont pas repris.

### Masquer « Se connecter » tant que l'OIDC n'est pas activé

Sans reconstruire l'image, via la CSS personnalisée prévue par Meet : variable
d'environnement `FRONTEND_CUSTOM_CSS_URL` du **backend**, pointant vers un fichier
CSS servi par votre reverse proxy, par exemple :

```css
/* Accueil HACF : texte « Membre de la communauté ? » + bouton */
section[aria-labelledby='hacf-home-heading'] div:has(> a[data-attr='login']) {
  display: none;
}
/* Partout ailleurs (en-tête des pages, dialogue Paramètres) */
a[data-attr='login'] {
  display: none;
}
```

À retirer quand l'OIDC sera configuré.

## Développer / prévisualiser la page

```sh
cd src/frontend
npm ci
VITE_API_BASE_URL=http://localhost:8071/ npm run dev   # http://localhost:3000
```

Le frontend a besoin d'une API sur `VITE_API_BASE_URL` (au minimum
`/api/v1.0/config/` et `/api/v1.0/users/me/`) : la stack de dev officielle
(`make bootstrap`, voir le README upstream) ou un petit serveur factice.

## Tester l'image

```sh
docker pull ghcr.io/barto95100/meet-frontend:v1.32.1-hacf
docker run --rm -p 8080:8080 ghcr.io/barto95100/meet-frontend:v1.32.1-hacf
# http://localhost:8080 : la page HACF s'affiche (les appels API échouent sans backend)
```

Construire l'image localement, exactement comme le workflow :

```sh
docker build -f src/frontend/Dockerfile --target frontend-production \
  --build-arg DOCKER_USER=1001:127:-1000 --build-arg 'VITE_APP_TITLE=HACF Meet' \
  -t meet-frontend:hacf-local .
```

## Déployer (Docker Compose)

Le frontend HACF **doit avoir la même version que le backend** : l'image
`vX.Y.Z-hacf` est construite à partir du tag `vX.Y.Z`. Dans le `compose.yaml`,
remplacer uniquement l'image du frontend :

```yaml
services:
  backend:
    image: lasuite/meet-backend:v1.32.1
    # … inchangé
  frontend:
    image: ghcr.io/barto95100/meet-frontend:v1.32.1-hacf   # au lieu de lasuite/meet-frontend:v1.32.1
    # … inchangé
```

```sh
docker compose pull frontend backend
docker compose up -d
```

Pour une montée de version : attendre que l'image `vX.Y.Z-hacf` soit publiée
(onglet *Packages* du dépôt), puis passer **les deux** images à `vX.Y.Z` en
suivant les notes de version / `UPGRADE.md` officiels (migrations backend, etc.).
Aucun déploiement n'est automatique.

## Workflow « HACF frontend image »

`.github/workflows/hacf-frontend.yml`, lancé chaque jour à 04:23 UTC et
manuellement (*Actions → HACF frontend image → Run workflow*, option
`force_build` pour reconstruire une image existante, par exemple après avoir
modifié la page sans nouvelle version upstream).

1. Récupère les tags de `suitenumerique/meet` et retient le plus récent `vX.Y.Z`.
2. Si `ghcr.io/barto95100/meet-frontend:vX.Y.Z-hacf` existe déjà : rien à faire.
3. Sinon, rejoue les commits de `hacf` (`git rebase --onto vX.Y.Z <ancien tag> hacf`).
4. Conflit → ouvre une issue « Conflit de rebase HACF sur vX.Y.Z » et s'arrête
   en échec, **sans rien construire**.
5. Sinon, construit uniquement l'image frontend avec les mêmes paramètres que le
   workflow officiel `docker-hub.yml` (contexte `.`, `src/frontend/Dockerfile`,
   cible `frontend-production`, `linux/amd64,linux/arm64`, même `DOCKER_USER`), avec
   en plus `VITE_APP_TITLE=HACF Meet` (nom affiché dans l'onglet, le titre des salles
   et les messages d'autorisation micro/caméra ; le build officiel le laisse vide),
   la publie sur GHCR avec le tag `vX.Y.Z-hacf`, puis met à jour la branche `hacf`
   (`--force-with-lease`).

Permissions du `GITHUB_TOKEN` déclarées : `contents: write`, `packages: write`,
`issues: write` (rien d'autre). Actions utilisées : `actions/checkout` et
`docker/*` (créateur vérifié), épinglées sur les mêmes SHA que les workflows
officiels.

### Configuration requise du dépôt

- **Branche par défaut = `hacf`** (*Settings → General*). Les déclenchements
  planifiés (`schedule`) ne s'exécutent que depuis la branche par défaut, et le
  bouton *Run workflow* n'apparaît que pour un workflow présent sur celle-ci.
  `main` reste un miroir strict.
- **Secret `HACF_PUSH_TOKEN`** (fortement recommandé) : jeton *fine-grained*
  limité à ce dépôt, permissions *Contents: Read and write* et
  *Workflows: Read and write*. GitHub refuse qu'un `GITHUB_TOKEN` pousse un
  historique qui modifie des fichiers de `.github/workflows/` ; or chaque
  nouvelle version upstream en modifie souvent. Sans ce secret, l'image est
  quand même publiée mais la mise à jour de `hacf` peut échouer ; le workflow
  suivant refera alors uniquement le rebase et le push.
- Après la première publication, rendre le package `meet-frontend` **public**
  (*Packages → meet-frontend → Package settings*) ou faire un `docker login ghcr.io`
  sur le serveur.

## Quand le workflow ouvre une issue de conflit

Un conflit signifie qu'un fichier que nous modifions a changé upstream —
en pratique `src/frontend/src/routes.ts`, `src/frontend/src/main.tsx` ou une icône de
`src/frontend/public/` (nos autres fichiers sont nouveaux et ne peuvent pas entrer en
conflit). Pour une icône, garder la version HACF : pendant un rebase, c'est « theirs »
(`git checkout --theirs src/frontend/public/<fichier> && git add src/frontend/public/<fichier>`).

```sh
git fetch origin
git fetch https://github.com/suitenumerique/meet.git '+refs/tags/v*:refs/tags/v*'
git switch hacf && git reset --hard origin/hacf
git rebase --onto vX.Y.Z vA.B.C hacf    # vA.B.C = tag actuel de hacf, indiqué dans l'issue
# résoudre (ex. routes.ts : garder la nouvelle version upstream et
# ne remplacer que l'import de la page d'accueil), puis :
git add <fichiers> && git rebase --continue
cd src/frontend && npm ci && npm run build && npm run lint   # vérifier
git push --force-with-lease origin hacf
```

Si l'upstream a modifié un composant réutilisé (`useCreateRoom`,
`isRoomValid`, `useCopyRoomToClipboard`, `LoginButton`, `useUser`…), le rebase peut passer sans
conflit mais la compilation échouer dans le workflow : corriger alors les
fichiers de `features/hacf/` de la même façon.

Le thème repose sur des noms internes à l'upstream : les variables Panda
(`--colors-primary-*`, `--colors-primary-dark-*`, `--colors-default-*`, `--colors-box-*`,
`--colors-control-*`, gris, `--colors-focus-ring`), les classes `.Header-logo` /
`.Header-beforeLogo` / `.lk-room-container`, quelques classes atomiques Panda de couleurs
codées en dur (`bg-c_white`, `bg-c_primary.100`, `bg-c_primary.200`, `bg-c_primary.50`,
`c_primary.800`, `c_primary.900`, `c_greyscale.1000`, `c_greyscale.600`, `c_black`,
`c_blue`, `c_initial`, `bd-c_primary.800`, `bd-r_1px_solid_lightGray`, `min-w_10rem`,
`bg-c_box.bg`) et la structure de l'aperçu caméra (`[role=status] video`). S'ils sont
renommés, rien ne casse à la compilation mais un élément peut reprendre sa couleur
d'origine (clair sur fond sombre) : parcourir l'interface après chaque montée de
version (accueil, avant-réunion, réunion et ses panneaux, paramètres, pages légales).

Relancer ensuite le workflow manuellement et fermer l'issue.

## Licence

Meet est publié sous licence MIT (© DINUM/Etalab, voir `LICENSE.md`). La licence
n'impose aucune mention dans l'interface : l'instance HACF n'en affiche pas. Elle
impose en revanche que le texte de licence accompagne les copies du logiciel : il est
livré dans l'image (`/licenses/meet-MIT.txt`), comme ceux des polices Inter et
JetBrains Mono (SIL Open Font License 1.1, `/licenses/*-OFL.txt`).

Les pages `/mentions-legales`, `/conditions-utilisation` et `/accessibilite` de Meet
décrivent le service de la DINUM ; elles ne sont liées nulle part dans l'interface HACF
mais restent accessibles par leur URL.
