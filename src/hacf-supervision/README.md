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
  les membres du groupe `ALLOWED_GROUP` voient **toutes** les salles, regroupées par
  propriétaire (vue admin). Désactivé si aucune base n'est configurée.

Le secret LiveKit et le jeton Authentik restent sur le serveur, jamais dans le navigateur.

## Fonctionnement

| Question | Source |
| --- | --- |
| Qui est connecté ? | Backend Meet `GET /api/v1.0/users/me/`, avec les cookies du navigateur (cache 60 s) |
| Fait-il partie du groupe ? | API Authentik `GET /api/v3/core/users/` (annuaire mis en cache 5 min) |
| Avatar d'un participant | Même annuaire : identité LiveKit = `sub` OIDC envoyé par Authentik (`uid` en mode par défaut « hashed user ID » ; pk, UUID, username, e-mail et UPN aussi reconnus) |
| Réunions en cours | API LiveKit `ListRooms` / `ListParticipants` |
| Salles enregistrées | Base PostgreSQL de Meet, en lecture seule (tables `meet_resource`, `meet_room`, `meet_resource_access`, `meet_user`) |
| Salle en ligne ? | Croisement du *slug* avec les réunions LiveKit en cours |

## API

| Route | Accès | Réponse |
| --- | --- | --- |
| `GET /supervision/api/health` | public | `{"ok":true}` |
| `GET /supervision/api/access` | — | 200 autorisé, 401 non connecté, 403 hors groupe |
| `GET /supervision/api/rooms` | connecté + groupe | réunions et participants |
| `GET /supervision/api/my-rooms` | connecté | salles de l'utilisateur (ou `{available:false}`) |
| `GET /supervision/api/all-rooms` | connecté + groupe | toutes les salles avec propriétaire (ou `{available:false}`) |
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

Le service n'exécute que des `SELECT` ; ces quatre tables suffisent. Si une mise à
jour de Meet renomme ces tables, seule la requête de `src/db.js` est à adapter.

## Développement

```sh
npm ci
MEET_API_URL=… AUTHENTIK_URL=… AUTHENTIK_TOKEN=… LIVEKIT_URL=… \
LIVEKIT_API_KEY=… LIVEKIT_API_SECRET=… npm start
```

Image : `ghcr.io/barto95100/meet-supervision:latest`, construite par le workflow
`.github/workflows/hacf-supervision.yml` à chaque modification de ce dossier.
