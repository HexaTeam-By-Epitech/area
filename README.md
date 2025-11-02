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
├── toolbox/               # Docker Compose for local development
├── docker-compose.yml     # Production Docker Compose
├── .env                   # Production environment variables
└── .github/workflows/     # CI/CD pipelines
```

## Technologies

### Backend
- NestJS 11 (Node.js framework)
- Prisma ORM with PostgreSQL
- Redis for caching/queues
- JWT + OAuth2 (Google, Spotify, Discord, Slack, Notion)
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

## Quick Start - Production (Docker Compose)

```bash
cp .env.example .env
docker compose build
docker compose up -d
```

Access: http://localhost:8080 (API), http://localhost:8081 (Web)

**See [`DOCKER_DEPLOYMENT.md`](DOCKER_DEPLOYMENT.md) for details.**

## Quick Start - Local Development

**For local development with hot-reload:**

### Prerequisites

- Node.js 20+
- npm 10+
- Docker and Docker Compose (for databases)


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

## Backend API - about.json

The backend exposes a public health/metadata endpoint that describes the server and available services.

- Method and path: `GET /about.json`
- Authentication: none (public)
- Where to access:
  - Local dev: `http://localhost:3000/about.json`
  - Docker (prod compose): `http://localhost:8080/about.json`

### Response

- client.host: the client IP detected in this order:
  1) First IP from `X-Forwarded-For` header if present
  2) `X-Real-IP` header if present
  3) Fallback to socket `remoteAddress`
- server.current_time: Unix timestamp in seconds (number)
- server.services: array of services. Each service groups its actions and reactions:
  - name: string (service/provider name, e.g., "google", "spotify")
  - actions: array of `{ name: string, description: string }`
  - reactions: array of `{ name: string, description: string }`

Example:

```json
{
  "client": { "host": "10.101.53.35" },
  "server": {
    "current_time": 1730540000,
    "services": [
      {
        "name": "spotify",
        "actions": [
          {
            "name": "spotify_has_likes",
            "description": "Check if user has liked songs on Spotify"
          }
        ],
        "reactions": []
      },
      {
        "name": "google",
        "actions": [
          {
            "name": "gmail_new_email",
            "description": "Detect new incoming email in Gmail inbox"
          }
        ],
        "reactions": [
          {
            "name": "send_email",
            "description": "Send email notification"
          }
        ]
      }
    ]
  }
}
```

Notes:
- Service lists are generated dynamically by the backend Manager service.
- Descriptions may vary or be "No description available" when not provided.

## Docker Deployment

See [`DOCKER_DEPLOYMENT.md`](DOCKER_DEPLOYMENT.md) for complete guide.

```bash
docker compose build
docker compose up -d
```

Services: postgres, redis, server (8080), client_web (8081), client_mobile (APK builder)

## Environment Variables

All variables in root `.env` file. See `.env.example` for reference.

## CI/CD

GitHub Actions workflows are configured in `.github/workflows/ci.yml`:
- Backend: unit tests + build
- Frontend: build
- Mobile: unit tests + Expo build

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for contribution guidelines.

## License

This project is for educational purposes.
