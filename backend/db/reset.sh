#!/bin/bash
# db/reset.sh
set -e

# Détecte le chemin du .env par rapport à ce script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE."
    exit 1
fi
export $(grep -v '^#' "$ENV_FILE" | xargs)

if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
    echo "Error: DB_NAME or DB_USER is not defined in .env"
    exit 1
fi

PGHOST=${PGHOST:-localhost}
PGPORT=${PGPORT:-5432}
PG_SUPERUSER=${PGUSER:-postgres}
PG_ADMIN_DB=postgres
PG_SUPERUSER_PASSWORD=${PG_SUPERUSER_PASSWORD:-$DB_PASSWORD}

if [ -z "$PG_SUPERUSER_PASSWORD" ]; then
    echo "Error: PG_SUPERUSER_PASSWORD (or DB_PASSWORD) must be set in .env for superuser operations."
    exit 1
fi

# Affichage des infos
echo "Using PG_SUPERUSER: $PG_SUPERUSER"
echo "Using DB_USER: $DB_USER"
echo "Using DB_NAME: $DB_NAME"

# Fermer toutes les connexions à la base avant suppression (sinon dropdb échoue)
export PGPASSWORD="$PG_SUPERUSER_PASSWORD"
echo "Terminating connections to $DB_NAME..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PG_SUPERUSER" -d "$PG_ADMIN_DB" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" || {
    echo "Error: Could not connect as superuser ($PG_SUPERUSER) to terminate connections. Check your PG_SUPERUSER_PASSWORD and access rights.";
    exit 1;
}

echo "Dropping database $DB_NAME..."
dropdb -h "$PGHOST" -p "$PGPORT" -U "$PG_SUPERUSER" "$DB_NAME" || {
    echo "Error: Could not drop database $DB_NAME. Check your superuser credentials and that the database exists.";
    exit 1;
}

echo "Dropping user $DB_USER..."
dropuser -h "$PGHOST" -p "$PGPORT" -U "$PG_SUPERUSER" "$DB_USER" || {
    echo "Error: Could not drop user $DB_USER. Check your superuser credentials and that the user exists.";
    exit 1;
}

# Réinitialisation
export PGPASSWORD="$DB_PASSWORD"
echo "Reinitializing database..."
$SCRIPT_DIR/init.sh

echo "Database reset complete."
