# HACF Meet — supervision

Petit service HACF, à côté de Meet (le backend Meet n'est pas modifié) :

- **Supervision** (`/supervision/`) : réunions en cours sur LiveKit, participants,
  micro / caméra / partage d'écran, en **lecture seule**. Réservée aux utilisateurs
  **connectés à Meet** et membres du groupe Authentik **`ALLOWED_GROUP`** (`Infra`).
- **Santé du serveur** : métriques LiveKit (qualité moyenne, débit, pertes, latence,
  mémoire) lues sur son endpoint Prometheus, résumées sur la page et en graphe sur la
  dernière heure. En mémoire, sans Prometheus ni Grafana en plus. Masqué si
  `LIVEKIT_PROMETHEUS_URL` n'est pas défini.
- **Avatars** (`/supervision/api/avatar/…`) : la photo Authentik des membres, affichée
  par Meet à la place des initiales (en-tête de l'accueil, vignettes en visio). Visible
  par les utilisateurs connectés uniquement ; les initiales générées par Authentik sont
  ignorées (Meet garde les siennes).
- **Salles** (`/supervision/api/my-rooms`, `/supervision/api/all-rooms`) : la liste des
  salles enregistrées, lue **en lecture seule** dans la base PostgreSQL de Meet (l'API de
  Meet ne sait pas lister les salles). Chaque utilisateur connecté voit **ses** salles ;
  les membres du groupe `ALLOWED_GROUP` voient **en plus** les salles des **autres**
  utilisateurs, regroupées par propriétaire (vue admin). Désactivé si aucune base n'est
  configurée.
- **Suppression** (`DELETE /supervision/api/rooms/<slug>`) : réservée au groupe
  `ALLOWED_GROUP`, elle permet de supprimer depuis la vue admin la salle d'un **autre**
  utilisateur (l'API de Meet ne laisse supprimer qu'au propriétaire). Elle reproduit
  **exactement** la suppression de Meet : un *soft-delete* (`deleted_at`, **réversible** ;
  la ligne, le slug et les enregistrements sont conservés « pour traçabilité ») suivi de
  la fermeture de la salle LiveKit en cours. **Rien n'est effacé.** Nécessite un second
  utilisateur PostgreSQL d'écriture, très restreint (voir plus bas) ; désactivée si
  `DB_WRITE_*` n'est pas configuré.
- **Corbeille** (`POST …/rooms/<slug>/restore`, `POST …/rooms/<slug>/purge`) : la vue
  admin liste les salles *soft-delete* et offre deux actions, réservées au même groupe.
  **Restaurer** remet `deleted_at` à `NULL` (la salle et son nom reviennent ; aucun droit
  supplémentaire, `UPDATE (deleted_at)` suffit). **Supprimer définitivement** efface
  réellement la salle et tout ce qui en dépend (accès, enregistrements) en une
  transaction, dans l'ordre enfant→parent — Meet gère la cascade côté Python, pas en base,
  donc on la reproduit à la main. C'est **irréversible** et ça **libère le nom** (sinon un
  slug *soft-delete* reste réservé et bloque la recréation d'une salle du même nom). Seule
  une salle déjà *soft-delete* peut être purgée. La purge demande des droits élargis sur
  `meet_rw` (voir plus bas).

Le secret LiveKit et le jeton Authentik restent sur le serveur, jamais dans le navigateur.

## Fonctionnement

| Question | Source |
| --- | --- |
| Qui est connecté ? | Backend Meet `GET /api/v1.0/users/me/`, avec les cookies du navigateur (cache 60 s) |
| Fait-il partie du groupe ? | API Authentik `GET /api/v3/core/users/` (annuaire mis en cache 5 min) |
| Avatar d'un participant | Même annuaire : identité LiveKit = `sub` OIDC envoyé par Authentik (`uid` en mode par défaut « hashed user ID » ; pk, UUID, username, e-mail et UPN aussi reconnus) |
| Réunions en cours | API LiveKit `ListRooms` / `ListParticipants` |
| Salles enregistrées | Base PostgreSQL de Meet, en lecture seule (tables `meet_resource`, `meet_room`, `meet_resource_access`, `meet_user`) |
| Salle en ligne ? | Croisement de l'*id* de la salle avec les réunions LiveKit en cours (une salle enregistrée porte son UUID Meet comme nom LiveKit, pas son slug) |

## API

| Route | Accès | Réponse |
| --- | --- | --- |
| `GET /supervision/api/health` | public | `{"ok":true}` |
| `GET /supervision/api/access` | — | 200 autorisé, 401 non connecté, 403 hors groupe |
| `GET /supervision/api/rooms` | connecté + groupe | réunions et participants |
| `GET /supervision/api/my-rooms` | connecté | salles de l'utilisateur (ou `{available:false}`) |
| `GET /supervision/api/all-rooms` | connecté + groupe | toutes les salles avec propriétaire (ou `{available:false}`) |
| `DELETE /supervision/api/rooms/<slug>` | connecté + groupe | soft-delete d'une salle (en-tête `x-hacf-supervision: 1` requis) |
| `POST /supervision/api/rooms/<slug>/restore` | connecté + groupe | restaure une salle soft-delete (en-tête requis) |
| `POST /supervision/api/rooms/<slug>/purge` | connecté + groupe | suppression définitive, irréversible (en-tête requis) |
| `GET /supervision/api/metrics` | connecté + groupe | santé du serveur LiveKit (ou `{available:false}`) |
| `GET /supervision/api/avatar/me` | connecté | photo de l'utilisateur, 404 sans photo |
| `GET /supervision/api/avatar/<identité>` | connecté | photo d'un participant, 404 sans photo |
| `GET /supervision/` | (la page vérifie l'accès) | page de supervision |

## Configuration (variables d'environnement)

| Variable | Exemple | Rôle |
| --- | --- | --- |
| `MEET_API_URL` | `http://backend:8000` | Backend Meet (adresse interne) |
| `MEET_HOST` | `meet.hacf.fr` | Nom public, envoyé en `Host` au backend (`ALLOWED_HOSTS`, pas de redirection HTTPS) |
| `MEET_PUBLIC_URL` | `https://meet.hacf.fr` | Liens « Rejoindre » de la page |
| `AUTHENTIK_URL` | `https://sso.hacf.fr` | Authentik |
| `AUTHENTIK_TOKEN` | — | Jeton d'API Authentik (lecture des utilisateurs et groupes) |
| `ALLOWED_GROUP` | `Infra` | Groupe autorisé à voir la supervision |
| `LIVEKIT_URL` | `http://livekit:7880` | API LiveKit (adresse interne) |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | — | Mêmes valeurs que pour le backend Meet |
| `LIVEKIT_PROMETHEUS_URL` | `http://livekit:6789/metrics` | Endpoint Prometheus de LiveKit (optionnel ; sinon pas de section serveur) |
| `PORT` | `8090` | Port d'écoute |
| `SESSION_CACHE_SECONDS` / `DIRECTORY_CACHE_SECONDS` / `AVATAR_CACHE_SECONDS` | `60` / `300` / `600` | Durées de cache |
| `DB_HOST` | `postgresql` | Hôte PostgreSQL de Meet (active la vue des salles ; optionnel) |
| `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `5432` / `meet` / `meet_ro` / — | Connexion PostgreSQL (utilisateur **en lecture seule**) |
| `DATABASE_URL` | `postgres://meet_ro:…@postgresql:5432/meet` | Alternative à `DB_*` (prioritaire) |
| `DB_WRITE_USER` / `DB_WRITE_PASSWORD` | `meet_rw` / — | Utilisateur d'écriture pour le soft-delete (même hôte/port/base que `DB_*`) ; active la suppression. Optionnel |
| `DB_WRITE_URL` | `postgres://meet_rw:…@postgresql:5432/meet` | Alternative à `DB_WRITE_*` (prioritaire) |

### Base de données (optionnel)

La vue « Mes salles / Toutes les salles » lit la base de Meet en lecture seule.
Créez un utilisateur PostgreSQL dédié, **sans aucun droit d'écriture** :

```sql
-- À exécuter en tant que superutilisateur, sur la base de Meet.
CREATE USER meet_ro WITH PASSWORD 'un-mot-de-passe-solide';
GRANT CONNECT ON DATABASE meet TO meet_ro;
GRANT USAGE ON SCHEMA public TO meet_ro;
GRANT SELECT ON meet_resource, meet_room, meet_resource_access, meet_user TO meet_ro;
```

Le service n'exécute que des `SELECT` avec cet utilisateur ; ces quatre tables
suffisent. Si une mise à jour de Meet renomme ces tables, seule la requête de
`src/db.js` est à adapter.

### Suppression de salle (optionnel)

Pour que la vue admin puisse supprimer la salle d'un autre utilisateur, créez un
**second** utilisateur d'écriture, volontairement minimal : il ne peut que lire
`meet_room` et écrire sa **seule** colonne `deleted_at` (le *soft-delete*). Il ne
peut ni effacer de ligne, ni toucher à une autre table. Laissez `meet_ro` en
lecture seule.

```sql
-- À exécuter en tant que superutilisateur, sur la base de Meet.
CREATE USER meet_rw WITH PASSWORD 'un-autre-mot-de-passe-solide';
GRANT CONNECT ON DATABASE meet TO meet_rw;
GRANT USAGE ON SCHEMA public TO meet_rw;
GRANT SELECT ON meet_room TO meet_rw;             -- retrouver la salle par son slug
GRANT UPDATE (deleted_at) ON meet_room TO meet_rw; -- soft-delete ET restauration
```

Avec ces droits, le service fait le *soft-delete* (`UPDATE meet_room SET deleted_at =
now() WHERE slug = … AND deleted_at IS NULL`, exactement comme Meet —
`core.services.room_management.soft_delete`) et la **restauration** (le même `UPDATE`
remettant `deleted_at` à `NULL`). La fermeture de la session LiveKit en cours utilise les
accès LiveKit déjà configurés. Sans `DB_WRITE_*`, toutes ces actions sont désactivées.

**Suppression définitive (purge) — droits élargis, optionnels.** Pour que la vue admin
puisse *effacer* réellement une salle soft-delete (et libérer son nom), `meet_rw` doit
pouvoir supprimer la salle et tout ce qui la référence. Meet n'ayant pas de
`ON DELETE CASCADE` en base, on efface dans l'ordre enfant→parent :

```sql
-- Optionnel : uniquement si vous voulez la suppression DÉFINITIVE depuis l'admin.
GRANT SELECT ON meet_recording TO meet_rw;        -- retrouver les enregistrements de la salle
GRANT DELETE ON meet_recording_access TO meet_rw;
GRANT DELETE ON meet_recording TO meet_rw;
GRANT DELETE ON meet_resource_access TO meet_rw;
GRANT DELETE ON meet_room TO meet_rw;
GRANT DELETE ON meet_resource TO meet_rw;
```

La purge ne porte que sur une salle **déjà soft-delete** et s'exécute en une transaction
(tout ou rien). Si vous ne posez pas ces droits, « Restaurer » marche quand même ;
« Supprimer définitivement » échoue simplement sans rien casser. Si une mise à jour de
Meet ajoute une table pointant vers une salle/ressource/enregistrement, ajoutez son
`DELETE` ici **et** dans `PURGE_STEPS` de `src/db.js`.

## Développement

```sh
npm ci
MEET_API_URL=… AUTHENTIK_URL=… AUTHENTIK_TOKEN=… LIVEKIT_URL=… \
LIVEKIT_API_KEY=… LIVEKIT_API_SECRET=… npm start
```

Image : `ghcr.io/barto95100/meet-supervision:latest`, construite par le workflow
`.github/workflows/hacf-supervision.yml` à chaque modification de ce dossier.
