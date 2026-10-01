# HACF Meet — supervision

Petit service HACF, à côté de Meet (le backend Meet n'est pas modifié) :

- **Supervision** (`/supervision/`) : réunions en cours sur LiveKit, participants,
  micro / caméra / partage d'écran, en **lecture seule**. Réservée aux utilisateurs
  **connectés à Meet** et membres du groupe Authentik **`ALLOWED_GROUP`** (`Infra`).
- **Avatars** (`/supervision/api/avatar/…`) : la photo Authentik des membres, affichée
  par Meet à la place des initiales (en-tête de l'accueil, vignettes en visio). Visible
  par les utilisateurs connectés uniquement ; les initiales générées par Authentik sont
  ignorées (Meet garde les siennes).

Le secret LiveKit et le jeton Authentik restent sur le serveur, jamais dans le navigateur.

## Fonctionnement

| Question | Source |
| --- | --- |
| Qui est connecté ? | Backend Meet `GET /api/v1.0/users/me/`, avec les cookies du navigateur (cache 60 s) |
| Fait-il partie du groupe ? | API Authentik `GET /api/v3/core/users/` (annuaire mis en cache 5 min) |
| Avatar d'un participant | Même annuaire : identité LiveKit = `sub` OIDC envoyé par Authentik (`uid` en mode par défaut « hashed user ID » ; pk, UUID, username, e-mail et UPN aussi reconnus) |
| Réunions en cours | API LiveKit `ListRooms` / `ListParticipants` |

## API

| Route | Accès | Réponse |
| --- | --- | --- |
| `GET /supervision/api/health` | public | `{"ok":true}` |
| `GET /supervision/api/access` | — | 200 autorisé, 401 non connecté, 403 hors groupe |
| `GET /supervision/api/rooms` | connecté + groupe | réunions et participants |
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
| `PORT` | `8090` | Port d'écoute |
| `SESSION_CACHE_SECONDS` / `DIRECTORY_CACHE_SECONDS` / `AVATAR_CACHE_SECONDS` | `60` / `300` / `600` | Durées de cache |

## Développement

```sh
npm ci
MEET_API_URL=… AUTHENTIK_URL=… AUTHENTIK_TOKEN=… LIVEKIT_URL=… \
LIVEKIT_API_KEY=… LIVEKIT_API_SECRET=… npm start
```

Image : `ghcr.io/barto95100/meet-supervision:latest`, construite par le workflow
`.github/workflows/hacf-supervision.yml` à chaque modification de ce dossier.
