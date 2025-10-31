# AREA Docker Deployment

## Quick Start

1. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your API keys
```

2. **Build and start:**
```bash
docker compose build
docker compose up -d
```
> **Note:** Docker Compose charge automatiquement le fichier `.env` à la racine

3. **Access services:**
- Backend: http://localhost:8080
- Web: http://localhost:8081
- APK: http://localhost:8081/client.apk

## Services

- **postgres** + **redis**: Databases (internal)
- **server**: Backend API (port 8080)
- **client_mobile**: Builds Android APK
- **client_web**: Web app + serves APK (port 8081)

## Common Commands

```bash
docker compose build          # Build all
docker compose up -d          # Start
docker compose down           # Stop
docker compose logs -f        # View logs
docker compose down -v        # Clean all (deletes data)
```

## Ngrok Deployment

```bash
docker compose up -d
ngrok http 8080

# Update .env with ngrok URL
BACKEND_BASE_URL=https://your-url.ngrok-free.app
# Update all OAuth redirect URIs

docker compose restart server
```

## Troubleshooting

**Mobile build fails (OOM):** Increase Docker memory to 8GB+ in Docker Desktop settings

**APK not ready:** Mobile build takes 15-25 minutes on first run

**Database errors:** Wait for healthchecks: `docker compose ps`

