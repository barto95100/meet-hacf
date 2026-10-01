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
| `src/frontend/src/routes.ts` | 2 lignes : la route `home` charge `@/features/hacf/routes/HacfHome` ; la route `room` charge `@/features/hacf/routes/HacfRoom` (salle d'origine + bouton « Supervision » pendant la visio). |
| `src/frontend/src/main.tsx` | 1 ligne ajoutée : `import './features/hacf/styles/theme.css'`. |
| `src/frontend/src/components/Avatar.tsx` | 3 lignes : `position: relative` et `<HacfAvatarPhoto />`, qui pose la photo Authentik du participant (contexte LiveKit) sur les initiales. |
| `src/frontend/src/features/rooms/components/Conference.tsx` | 2 lignes : import et `<HacfDiagnosticsPanel />` dans `<LiveKitRoom>`, pour le panneau de diagnostic réseau en visio (groupe autorisé). |
| `src/frontend/src/features/rooms/utils/isRoomValid.ts` | Noms de salle lisibles : en plus des codes `abc-defg-hij`, accepte lettres minuscules, chiffres et tirets (3 à 60 caractères, ex. `atelier-zigbee`), sauf les chemins réservés (`feedback`, `test-connection`, `mentions-legales`, `api`, `admin`, `supervision`…). Les codes tapés sans tirets ou en majuscules restent normalisés (`ABCDEFGHIJ` → `abc-defg-hij`). Le backend accepte déjà n'importe quel nom (il le passe dans `slugify`). |
| `src/frontend/public/favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png` | Fichiers remplacés (mêmes noms ; `index.html` et `site.webmanifest` inchangés) : icônes au logo HACF, découpées dans `docs/design/hacf-bannière-transparent.png`. Disque blanc derrière le logo en 16/32/48 px (lisible sur onglets clairs et sombres), fond `#0b0b10` pour l'icône Apple (pas de transparence sur iOS). |

**Fichiers ajoutés** (aucun conflit possible) :

| Fichier | Contenu |
| ------- | ------- |
| `src/frontend/src/features/hacf/styles/theme.css` | Thème HACF de toute l'interface. Redéfinit, hors `@layer` (donc prioritaires sans toucher `panda.config.ts`), les jetons Panda : `--colors-primary-*` (bleu HACF, survol violet), `--colors-primary-dark-*` (palette de la réunion, teinte HACF à luminosité égale), `--colors-focus-ring`, et les jetons clairs (`default`, `box`, `control`, gris) passés en sombre. Corrige les couleurs codées en dur de quelques composants (classes atomiques Panda), affiche la bannière HACF dans l'en-tête upstream (point d'accroche `.Header-beforeLogo`), et pose le fond sombre + halo sur toutes les pages hors conférence, avec une lueur autour de l'aperçu caméra. |
| `src/frontend/src/features/hacf/routes/HacfHome.tsx` | Page d'accueil (maquette « Accueil HACF Visio », section 2) : halo dégradé, titre, capsule de code, connexion ou actions de création. |
| `src/frontend/src/features/hacf/components/HacfHeader.tsx` | En-tête de l'accueil : bannière HACF, puis selon l'état Meet avatar + nom + « Déconnexion » (≥ 640 px) ou avatar ouvrant un menu du compte (< 640 px), et bouton Paramètres (langue…). |
| `src/frontend/src/features/hacf/components/HacfJoinForm.tsx` | Capsule « Code de la salle » : même validation (`isRoomValid`) et même navigation que `JoinMeetingDialog`. |
| `src/frontend/src/features/hacf/components/HacfCreateActions.tsx` | « Réunion instantanée » (code aléatoire) / « Créer un lien de réunion » : mêmes appels que `CreateMeetingMenu` (`useCreateRoom`, `generateRoomId`), copie via `useCopyRoomToClipboard`. |
| `src/frontend/src/features/hacf/components/HacfRoomNameForm.tsx` | Étape « Nom de la salle » de « Créer un lien de réunion » : un code aléatoire est proposé, sélectionné, et peut être remplacé par un nom lisible avant la création ; aperçu de l'adresse, erreurs (trop court, réservé, déjà utilisé). |
| `src/frontend/src/features/hacf/components/HacfInviteByEmail.tsx` | « Inviter par e-mail » sous le lien créé : appelle l'endpoint upstream `POST /api/v1.0/rooms/<id>/invite/` (propriétaire / administrateurs de la salle), qui envoie l'invitation via le SMTP du backend (voir plus bas). |
| `src/frontend/src/features/hacf/styles/buttons.ts`, `theme.ts` | Styles des boutons et couleurs de l'accueil (variables CSS `--hacf-*`). |
| `src/frontend/src/features/hacf/styles/hacf.css` + `assets/fonts/` | Polices Inter et JetBrains Mono auto-hébergées (SIL OFL 1.1). |
| `src/frontend/src/features/hacf/assets/images/hacf-banner-light-text.webp` | Bannière HACF (logo + « Home Assistant Communauté Francophone ») en 812 × 132, fond transparent, texte recoloré en clair pour les fonds sombres. Source : `docs/design/hacf-bannière-transparent.png`. |
| `src/frontend/public/licenses/` | Textes de licence livrés dans l'image (`/licenses/`) : `meet-MIT.txt` (copie de `LICENSE.md`, exigée par la licence MIT), `inter-OFL.txt`, `jetbrains-mono-OFL.txt`. À recopier si `LICENSE.md` change upstream. |
| `src/frontend/src/features/hacf/components/HacfDiagnosticsPanel.tsx` | Panneau de diagnostic réseau en visio, réservé au groupe autorisé : qualité, pertes, gigue, résolution, images/s et débit **par participant**, lus sur les flux que le navigateur reçoit déjà (aucun observateur caché, aucun flux supplémentaire). |
| `src/frontend/src/features/hacf/api/supervision.ts`, `components/HacfAvatarPhoto.tsx`, `components/HacfConferenceSupervision.tsx`, `routes/HacfRoom.tsx` | Intégration du service de supervision : accès (bouton « Supervision » à l'accueil et en visio, pour le groupe Authentik autorisé) et avatars Authentik. |
| `src/frontend/src/features/hacf/routes/HacfRooms.tsx`, `api/rooms.ts` | Page `/salles` ouverte depuis le menu de l'avatar : « Mes salles » pour chacun, « Toutes les salles » (regroupées par propriétaire, vue admin) pour le groupe autorisé. Liste lue via le service de supervision ; suppression via l'API Meet (qui vérifie la propriété). |
| `src/hacf-supervision/` | **Service de supervision** (Node.js, voir son README) : page `/supervision/`, réunions en cours via l'API LiveKit, contrôle d'accès Meet + groupe Authentik, avatars Authentik. Image `ghcr.io/barto95100/meet-supervision`. |
| `.github/workflows/hacf-supervision.yml` | Construit l'image du service de supervision quand son code change. |
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

### Invitations par e-mail (SMTP du backend)

L'envoi est fait par le **backend officiel** : il suffit de configurer le SMTP dans son
fichier d'environnement, sans reconstruire d'image. Exemple avec OVH (offre MX Plan ;
Email Pro : `pro1.mail.ovh.net`, Exchange : `exN.mail.ovh.net`, port 587 + TLS) :

```sh
EMAIL_HOST=ssl0.ovh.net
EMAIL_PORT=465
EMAIL_USE_SSL=True            # ou EMAIL_PORT=587 + EMAIL_USE_TLS=True (jamais les deux)
EMAIL_HOST_USER=meet@hacf.fr
EMAIL_HOST_PASSWORD=…
EMAIL_FROM=HACF Meet <meet@hacf.fr>   # doit être la boîte authentifiée (ou un alias)
EMAIL_BRAND_NAME=HACF Meet
EMAIL_LOGO_IMG=https://meet.hacf.fr/android-chrome-192x192.png
EMAIL_DOMAIN=meet.hacf.fr
EMAIL_APP_BASE_URL=https://meet.hacf.fr
```

Puis `docker compose up -d --force-recreate backend`. Test d'envoi :

```sh
docker compose exec backend python manage.py shell -c "from django.conf import settings; from django.core.mail import send_mail; send_mail('Test HACF Meet', 'OK', settings.EMAIL_FROM, ['vous@exemple.fr'])"
```

Le texte du mail est celui du backend officiel, prévu pour un appel **en cours** (« … vous
invite à rejoindre un appel vidéo en cours », bouton « REJOINDRE L'APPEL »). Son sujet reste
en anglais (« Video call in progress: … is waiting for you to connect ») : le backend
construit le texte avant de le traduire, la traduction française n'est donc jamais trouvée.
Le modifier demanderait de construire aussi l'image backend.

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

## Supervision et avatars (service `meet-supervision`)

Service à part (`src/hacf-supervision/`, image `ghcr.io/barto95100/meet-supervision`),
sans modification du backend Meet. Déploiement :

**1. Jeton Authentik** (`https://sso.hacf.fr`), en lecture seule :
- *Directory › Users › Create Service account* : `meet-supervision` (sans expiration) ;
- lui donner les permissions globales **Can view User** et **Can view Group**
  (onglet *Permissions* du compte, ou via un rôle attribué à un groupe le contenant) ;
- *Directory › Tokens and App passwords › Create* : intention **API**, utilisateur
  `meet-supervision`, sans expiration ; copier la clé.

**2. Service dans `compose.yaml`** :

```yaml
  supervision:
    image: ghcr.io/barto95100/meet-supervision:latest
    container_name: meet-supervision
    restart: unless-stopped
    env_file: env.d/supervision
    depends_on: [backend, livekit]
```

`env.d/supervision` :

```sh
MEET_API_URL=http://backend:8000
MEET_HOST=meet.hacf.fr
MEET_PUBLIC_URL=https://meet.hacf.fr
AUTHENTIK_URL=https://sso.hacf.fr
AUTHENTIK_TOKEN=<clé du jeton>
ALLOWED_GROUP=Infra
LIVEKIT_URL=http://livekit:7880
LIVEKIT_API_KEY=<même valeur que le backend>
LIVEKIT_API_SECRET=<même valeur que le backend>
LIVEKIT_PROMETHEUS_URL=http://livekit:6789/metrics   # optionnel (santé serveur)

# Optionnel : vue « Mes salles / Toutes les salles » (lecture seule de la base Meet)
DB_HOST=postgresql
DB_NAME=meet
DB_USER=meet_ro
DB_PASSWORD=<mot de passe de l'utilisateur en lecture seule>
```

Pour la vue des salles, créer un utilisateur PostgreSQL **en lecture seule** (le service
ne fait que des `SELECT`) ; voir le README du service pour le SQL
(`CREATE USER meet_ro … GRANT SELECT ON meet_room, meet_resource_access, meet_user`).
Sans ces variables, la page « Salles » reste accessible mais indique simplement que la
liste n'est pas disponible.

Pour la section « Serveur LiveKit » (qualité, débit, pertes, mémoire, sur la dernière
heure, sans Prometheus ni Grafana), activer le port Prometheus de LiveKit dans sa
configuration (`livekit.yaml`) :

```yaml
prometheus_port: 6789
```

Ce port reste interne (jamais exposé par le reverse proxy) ; seul le service
`supervision` le lit.

**3. Route nginx** dans `default.conf.template` (bloc `server`, avant `location /`), puis
`docker compose up -d --force-recreate frontend` :

```nginx
    location ^~ /supervision {
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_pass http://supervision:8090;
    }
```

Vérification : `curl -s https://meet.hacf.fr/supervision/api/health` → `{"ok":true}`.
Les membres du groupe `Infra` voient alors « Supervision » dans l'en-tête de l'accueil
et en haut à gauche pendant une visio (« Supervision » et « Diagnostic » réseau par
participant) ; les photos Authentik remplacent les initiales
(pour les utilisateurs connectés). Sans ce service, Meet fonctionne normalement :
pas de bouton, initiales partout.

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
