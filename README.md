# AREA

A multi-platform automation project (IFTTT-like) with backend API, web frontend, and mobile app.

## Project Overview

AREA is an automation platform that connects different services and allows users to create custom workflows (Actions and REActions).

## Repository Structure

```
/ (repo root)
├── backend/               # NestJS backend API
├── frontend/              # Vue 3 + Vite web app
├── mobile/                # React Native (Expo) mobile app
├── toolbox/               # Docker Compose for databases
└── .github/workflows/     # CI/CD pipelines
```

## Technologies

### Backend
- NestJS 11 (Node.js framework)
- Prisma ORM with PostgreSQL
- Redis for caching/queues
- JWT + OAuth2 (Google, Spotify)
- Swagger API documentation

### Frontend
- Vue 3 with Composition API
- Vite (build tool)
- Vue Router, Pinia (state management)
- Axios

### Mobile
- React Native (Expo)
- React Navigation
- React Native Paper

## Prerequisites

- Node.js 20+
- npm 10+
- Docker and Docker Compose (for databases)

## Quick Start

### 1. Start Databases

Start PostgreSQL and Redis using Docker Compose:

```bash
docker compose -f toolbox/docker-compose.yml up -d
```

This starts:
- PostgreSQL on `localhost:4242`
- Redis on `localhost:6379`

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
npm ci
npx prisma generate
npx prisma db push
npm run dev
```

Backend API: `http://localhost:3000`
Swagger docs: `http://localhost:3000/api`

**See [`backend/README.md`](backend/README.md) for detailed instructions.**

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

Web app: `http://localhost:5173`

**See [`frontend/README.md`](frontend/README.md) for detailed instructions.**

### 4. Mobile Setup

```bash
cd mobile
cp .env.example .env
# Edit .env with your backend URL (use local IP for physical devices)
npm ci
npm run start
```

**See [`mobile/README.md`](mobile/README.md) for detailed instructions.**

## Documentation

Each component has its own detailed documentation:

- **Backend:** [`backend/README.md`](backend/README.md)
  - Environment configuration
  - Database setup
  - OAuth providers
  - API documentation
  - Testing

- **Frontend:** [`frontend/README.md`](frontend/README.md)
  - Environment setup
  - Proxy configuration
  - Development tips
  - Building for production

- **Mobile:** [`mobile/README.md`](mobile/README.md)
  - Environment setup
  - Running on physical devices
  - Expo configuration
  - Building APK/IPA

- **Database:** [`backend/db/README.md`](backend/db/README.md)
  - Database initialization
  - Migrations
  - PostgreSQL troubleshooting

## Docker

### Backend

```bash
cd backend
docker build -t area-backend:local .
docker run --rm --name area-backend -p 3000:3000 --env-file .env area-backend:local
```

### Frontend

```bash
cd frontend
docker build -t area-web:local .
docker run --rm --name area-web -p 8080:80 area-web:local
```

## CI/CD

GitHub Actions workflows are configured in `.github/workflows/ci.yml`:
- Backend: unit tests + build
- Frontend: build
- Mobile: unit tests + Expo build

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for contribution guidelines.

## License

This project is for educational purposes.
