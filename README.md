# AREA

A multi-platform automation project (IFTTT-like) with:

- Backend API using NestJS + Prisma + PostgreSQL + Redis
- Web frontend using Vue 3 + Vite
- Mobile app using React Native (Expo)

This README explains the technology choices, project structure, environment setup, and how to run the project both with Docker and manually via npm.

## Technologies

- Backend
  - NestJS 11 (`@nestjs/*`) for structured, modular Node.js server
  - Prisma ORM (`@prisma/client`, `prisma`) with PostgreSQL
  - Redis for caching/queues/session-like features (`redis`)
  - Auth
    - JWT (`@nestjs/jwt`)
    - OAuth2 providers: Google and Spotify (Authorization Code Flow)
  - Validation and DTOs: `class-validator`, `class-transformer`
  - API Documentation with Swagger (`@nestjs/swagger`, `swagger-ui-express`) at `/api`
- Web
  - Vue 3 (`vue`) with Vite (`vite`, `@vitejs/plugin-vue`)
  - HTTP via `axios`
- Mobile
  - React Native (Expo) app using React 19, Expo 54
  - Navigation via `@react-navigation/*`
  - UI components via `react-native-paper`
- DevOps
  - Dockerfiles for backend and web images
  - `toolbox/docker-compose.yml` to start PostgreSQL and Redis locally
  - GitHub Actions workflows in `.github/workflows/`

## Repository Structure

```
/ (repo root)
├─ area-backend/           # NestJS backend API (TypeScript)
│  ├─ src/
│  │  ├─ main.ts          # bootstrap, Swagger at /api, PORT defaults to 3000
│  │  └─ prisma/          # Prisma schema/migrations (if present)
│  ├─ package.json        # scripts: dev, build, prod, test, lint, etc.
│  ├─ .env.example        # backend environment variables
│  └─ Dockerfile          # multi-stage build, runs node dist/main.js
│
├─ area-web/              # Vue 3 + Vite frontend
│  ├─ package.json        # scripts: dev, build, preview
│  └─ Dockerfile          # builds static site and serves with NGINX
│
├─ area-mobile/           # React Native (Expo) mobile app
│  ├─ App.js, index.js    # entry points
│  └─ package.json        # scripts: expo start / android / ios / web
│
├─ toolbox/
│  └─ docker-compose.yml  # postgres:16 and redis:7 for local dev
│
├─ .github/workflows/     # CI workflows
└─ CONTRIBUTING.md
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker and Docker Compose (for containerized setup)

Backend requires running PostgreSQL and Redis. You can start them with Docker Compose (recommended) or run them locally if you prefer.

## Environment Configuration (Backend)

Copy and configure environment variables for the backend:

```
cp area-backend/.env.example area-backend/.env
```

Edit `area-backend/.env` accordingly:

- Database (PostgreSQL)
  - `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`
  - `DATABASE_URL` (Prisma connection string)
- Redis
  - `REDIS_URL`, `REDIS_PASSWORD`
- App URLs
  - `BACKEND_BASE_URL` (default http://localhost:3000)
  - `FRONTEND_BASE_URL` (default http://localhost:5173)
- Auth
  - `JWT_SECRET`
  - Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
  - Spotify OAuth: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`
- Security
  - `TOKENS_ENC_KEY` (encryption key for sensitive tokens)

Swagger UI is exposed at: `http://localhost:3000/api`

## Start Databases with Docker Compose

Use the provided compose file to start PostgreSQL and Redis:

```
docker compose -f toolbox/docker-compose.yml up -d
```

- PostgreSQL: exposed on `localhost:4242` with default creds from the compose/env
- Redis: exposed on `localhost:6379` with password `mypassword`

Update your `area-backend/.env` to match these values (see `.env.example`).

## Running the Project (npm)

- Backend (NestJS)
  1. Install dependencies:
     ```
     cd area-backend
     npm ci
     ```
  2. Generate Prisma client (and run migrations if applicable):
     ```
     npx prisma generate
     # If you have migrations and a dev DB:
     # npx prisma migrate dev
     ```
  3. Start in watch mode:
     ```
     npm run dev
     ```
     The API will listen on `http://localhost:3000` and Swagger on `/api`.

- Web (Vue + Vite)
  1. Install dependencies:
     ```
     cd area-web
     npm ci
     ```
  2. Start dev server:
     ```
     npm run dev
     ```
     The app will run on `http://localhost:5173` by default.

- Mobile (Expo)
  1. Install dependencies:
     ```
     cd area-mobile
     npm ci
     ```
  2. Start Expo:
     ```
     npm run start
     # or: npm run android / npm run ios / npm run web
     ```

## Running the Project (Docker)

Database layer (Postgres + Redis) still uses the compose file in `toolbox/`.

- Start Postgres and Redis
  ```
  docker compose -f toolbox/docker-compose.yml up -d
  ```

- Backend Image
  ```
  cd area-backend
  docker build -t area-backend:local .
  # Run the container, mounting backend .env if needed
  docker run --rm \
    --name area-backend \
    -p 3000:3000 \
    --env-file .env \
    area-backend:local
  ```
  The API is available at `http://localhost:3000` (Swagger at `/api`).

- Web Image
  ```
  cd area-web
  docker build -t area-web:local .
  docker run --rm \
    --name area-web \
    -p 8080:80 \
    area-web:local
  ```
  The web app is available at `http://localhost:8080`.

Notes:
- Ensure `area-backend/.env` points to the Dockerized Postgres/Redis (`localhost:4242` and `localhost:6379`).
- For production-like setups, consider creating a docker-compose that orchestrates backend, web, and databases together with proper networks.

## Useful Scripts

- Backend (`area-backend/package.json`)
  - `npm run dev` – start NestJS in watch mode
  - `npm run build` – compile TypeScript
  - `npm run prod` – run compiled app (`dist/main`)
  - `npm run test` – run tests (Jest)
  - `npm run lint` – lint and fix

- Web (`area-web/package.json`)
  - `npm run dev` – start Vite dev server
  - `npm run build` – build for production
  - `npm run preview` – preview production build

- Mobile (`area-mobile/package.json`)
  - `npm run start` – start Expo
  - `npm run android` / `ios` / `web`

## API Documentation

Once the backend is running, visit:

- Swagger UI: `http://localhost:3000/api`

## Troubleshooting

- Port conflicts: change host ports in `docker run -p` or Vite/Expo configs.
- Database connection errors: verify `DATABASE_URL` and that Postgres is up (`docker ps`, `docker logs postgres`).
- Prisma client issues: re-run `npx prisma generate` after env/schema changes.
- OAuth callbacks: ensure `GOOGLE_REDIRECT_URI` and `SPOTIFY_REDIRECT_URI` match your backend public URL.

## License

This project is for educational purposes. See individual packages for licenses of dependencies.
