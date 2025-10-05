# AREA Backend

NestJS-based backend API for the AREA project (automation platform).

## Technologies

- **NestJS 11** - Progressive Node.js framework
- **Prisma ORM** - Database ORM with PostgreSQL
- **Redis** - Caching, queues, and session management
- **JWT** - Authentication tokens
- **OAuth2** - Google and Spotify authentication (Authorization Code Flow)
- **Swagger** - API documentation at `/api`
- **TypeScript** - Type-safe development

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 16+
- Redis 7+

You can run PostgreSQL and Redis using Docker Compose (see below) or install them locally.

## Environment Configuration

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and configure the following variables:

### Database (PostgreSQL)
- `DB_USER` - Database user (default: `db-user`)
- `DB_PASSWORD` - Database password
- `DB_HOST` - Database host (default: `localhost`)
- `DB_PORT` - Database port (default: `4242`)
- `DB_NAME` - Database name (default: `db-name`)
- `DATABASE_URL` - Full Prisma connection string

### Redis
- `REDIS_URL` - Redis connection URL (default: `redis://localhost:6379`)
- `REDIS_PASSWORD` - Redis password (default: `mypassword`)

### SMTP (Email)
- `SMTP_HOST` - SMTP server host
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `SMTP_FROM` - Sender email address

### Application URLs
- `BACKEND_BASE_URL` - Backend URL (default: `http://localhost:3000`)
- `FRONTEND_BASE_URL` - Frontend URL (default: `http://localhost:5173`)

### Authentication
- `JWT_SECRET` - Secret key for JWT tokens (use a long random string)
- `TOKENS_ENC_KEY` - AES-256-GCM encryption key for OAuth tokens (use a long random string)

### OAuth Providers

#### Google OAuth
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_REDIRECT_URI` - Callback URL (default: `http://localhost:3000/auth/google/callback`)
- `GOOGLE_IDENTITY_REDIRECT_URI` - Login callback URL (default: `http://localhost:3000/auth/google/login/callback`)

#### Spotify OAuth
- `SPOTIFY_CLIENT_ID` - Spotify OAuth client ID
- `SPOTIFY_CLIENT_SECRET` - Spotify OAuth client secret
- `SPOTIFY_REDIRECT_URI` - Callback URL (default: `http://localhost:3000/auth/spotify/callback`)

## Start Databases with Docker Compose

From the project root, start PostgreSQL and Redis:

```bash
docker compose -f toolbox/docker-compose.yml up -d
```

This will start:
- PostgreSQL on `localhost:4242` (user: `db-user`, password from compose file)
- Redis on `localhost:6379` (password: `mypassword`)

Make sure your `.env` file matches these credentials.

## Installation

Install dependencies:

```bash
npm ci
```

## Database Setup

1. Generate Prisma client:

```bash
npx prisma generate
```

2. Run migrations (if you have a development database):

```bash
npx prisma migrate dev
```

Or push the schema directly:

```bash
npx prisma db push
```

## Running the Application

### Development mode (with watch)

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Production build

1. Build the application:

```bash
npm run build
```

2. Run the compiled application:

```bash
npm run prod
```

### Other commands

```bash
npm start          # Start without watch mode
npm run debug      # Start with debugging
```

## API Documentation

Once the backend is running, visit Swagger UI at:

**http://localhost:3000/api**

This provides interactive API documentation with all available endpoints.

## Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Test coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Debug tests
npm run test:debug
```

## Code Quality

```bash
# Lint and fix
npm run lint

# Format code
npm run format
```

## Docker

Build and run the backend as a Docker container:

```bash
# Build image
docker build -t area-backend:local .

# Run container
docker run --rm \
  --name area-backend \
  -p 3000:3000 \
  --env-file .env \
  area-backend:local
```

**Note:** Make sure your `.env` file points to accessible PostgreSQL and Redis instances (use host network or Docker networking).

## Project Structure

```
backend/
├── src/
│   ├── main.ts              # Application entry point, Swagger setup
│   ├── prisma/              # Prisma schema and migrations
│   ├── auth/                # Authentication module (JWT, OAuth)
│   ├── users/               # Users module
│   ├── areas/               # AREA automation logic
│   └── ...                  # Other modules
├── test/                    # Unit and E2E tests
├── db/                      # Database initialization scripts
│   ├── README.md            # Database setup documentation
│   ├── migrations/          # SQL migrations
│   └── fixtures/            # Test data
├── .env.example             # Environment variables template
├── nest-cli.json            # NestJS CLI configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## Troubleshooting

### Database connection errors

- Verify `DATABASE_URL` in `.env`
- Check PostgreSQL is running: `docker ps` or `systemctl status postgresql`
- Check logs: `docker logs postgres` or `journalctl -xeu postgresql`

### Prisma client issues

Re-generate the Prisma client after schema or environment changes:

```bash
npx prisma generate
```

### OAuth callback issues

- Ensure redirect URIs in `.env` match your OAuth provider configuration
- For Google/Spotify: update redirect URIs in their developer consoles
- Use `BACKEND_BASE_URL` for local development, update for production

### Port conflicts

Change the port in `src/main.ts` or set `PORT` environment variable.

## License

This project is for educational purposes.
