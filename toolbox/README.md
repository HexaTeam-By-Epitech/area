# Local Infrastructure

This project uses **PostgreSQL** and **Redis** via Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Start services

```bash
docker compose up -d
```

This will start:

- PostgreSQL on `localhost:4242` with:
    - user: `area-user`
    - password: `your-super-secret-password`
    - database: `db-area`
- Redis on `localhost:6379` with:
    - password: `mypassword`

## Check running containers

```bash
docker ps
```

## Connect to PostgreSQL

```bash
docker exec -it postgres psql -U db-user -d db-name
```

## Stop services

```bash
docker compose down
```

## Remove persistent data

```bash
docker compose down -v
```