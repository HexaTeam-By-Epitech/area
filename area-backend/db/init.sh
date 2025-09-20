#!/bin/bash
# db/init.sh
set -e

# Détecte le chemin du .env par rapport à ce script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE."
    exit 1
fi
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Configuration par défaut (compatible avec votre docker-compose.yml)
DB_USER=${DB_USER:-area}
DB_PASSWORD=${DB_PASSWORD:-areapassword}
DB_NAME=${DB_NAME:-areadb}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

# Use host and port if defined
PGHOST=${PGHOST:-$DB_HOST}
PGPORT=${PGPORT:-$DB_PORT}

# Use PGUSER if set, else fallback to DB_USER
PG_SUPERUSER=${PGUSER:-$DB_USER}

# Use 'postgres' as admin database for superuser commands
PG_ADMIN_DB=postgres

echo "Using PG_SUPERUSER: $PG_SUPERUSER"
echo "Using DB_USER: $DB_USER"
echo "Using DB_NAME: $DB_NAME"
echo "Using DB_HOST: $DB_HOST"
echo "Using DB_PORT: $DB_PORT"

# Export password for superuser
export PGPASSWORD="$DB_PASSWORD"

# Fonction pour détecter si PostgreSQL est dans Docker
detect_postgres_location() {
    # Vérifier si le conteneur Docker existe et est en cours d'exécution
    if docker ps --format "table {{.Names}}" | grep -q "postgres-area"; then
        echo "docker"
    else
        echo "host"
    fi
}

# Fonction pour exécuter une commande psql
execute_psql() {
    local sql_file="$1"
    local location="$2"
    
    if [ "$location" = "docker" ]; then
        echo "Executing via Docker container..."
        docker exec -i postgres-area psql -U $DB_USER -d $DB_NAME < "$sql_file"
    else
        echo "Executing via direct connection..."
        psql -h "$PGHOST" -p "$PGPORT" -U $DB_USER -d $DB_NAME < "$sql_file"
    fi
}

# Détecter l'environnement PostgreSQL
POSTGRES_LOCATION=$(detect_postgres_location)
echo "PostgreSQL detected in: $POSTGRES_LOCATION"

# Vérifier la connexion à la base de données
echo "Testing database connection..."
if [ "$POSTGRES_LOCATION" = "docker" ]; then
    if ! docker exec postgres-area psql -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
        echo "Error: Cannot connect to PostgreSQL in Docker container"
        exit 1
    fi
else
    if ! psql -h "$PGHOST" -p "$PGPORT" -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
        echo "Error: Cannot connect to PostgreSQL on host"
        exit 1
    fi
fi
echo "Database connection successful."

# Apply schema
echo "Applying schema..."
execute_psql "$SCRIPT_DIR/schema.sql" "$POSTGRES_LOCATION"
echo "Schema applied."

# Apply seed if exists
if [ -f "$SCRIPT_DIR/seed.sql" ]; then
    echo "Applying seed data..."
    execute_psql "$SCRIPT_DIR/seed.sql" "$POSTGRES_LOCATION"
    echo "Seed data applied."
fi

echo "Database initialization complete."
