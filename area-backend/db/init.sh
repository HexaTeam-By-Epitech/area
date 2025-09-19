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

# Use host and port if defined
PGHOST=${PGHOST:-localhost}
PGPORT=${PGPORT:-5432}

# Use PGUSER if set, else fallback to DB_USER
PG_SUPERUSER=${PGUSER:-$DB_USER}

# Use 'postgres' as admin database for superuser commands
PG_ADMIN_DB=postgres

# Generate a random password if DB_PASSWORD is empty
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(openssl rand -base64 12)
    echo "Generated random password for $DB_USER: $DB_PASSWORD"
    # Update .env
    if grep -q "^DB_PASSWORD=" "$ENV_FILE"; then
        sed -i '' "s/^DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" "$ENV_FILE" 2>/dev/null || \
        sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" "$ENV_FILE"
    else
        echo "DB_PASSWORD=$DB_PASSWORD" >> "$ENV_FILE"
    fi
fi

echo "Using PG_SUPERUSER: $PG_SUPERUSER"
echo "Using DB_USER: $DB_USER"
echo "Using DB_NAME: $DB_NAME"

# Export password for superuser
export PGPASSWORD="$DB_PASSWORD"

# Check if user exists
USER_EXISTS=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PG_SUPERUSER" -d "$PG_ADMIN_DB" -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")
if [ "$USER_EXISTS" != "1" ]; then
    echo "Creating PostgreSQL user $DB_USER..."
    psql -h "$PGHOST" -p "$PGPORT" -U "$PG_SUPERUSER" -d "$PG_ADMIN_DB" -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
else
    echo "User $DB_USER already exists, skipping creation."
    psql -h "$PGHOST" -p "$PGPORT" -U "$PG_SUPERUSER" -d "$PG_ADMIN_DB" -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
fi

# Check if database exists
DB_EXISTS=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PG_SUPERUSER" -d "$PG_ADMIN_DB" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")
if [ "$DB_EXISTS" != "1" ]; then
    echo "Creating database $DB_NAME..."
    psql -h "$PGHOST" -p "$PGPORT" -U "$PG_SUPERUSER" -d "$PG_ADMIN_DB" -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
else
    echo "Database $DB_NAME already exists, skipping creation."
fi

# Export password for DB_USER
export PGPASSWORD="$DB_PASSWORD"

# Apply schema
psql -h "$PGHOST" -p "$PGPORT" -U $DB_USER -d $DB_NAME -f "$SCRIPT_DIR/schema.sql"
echo "Schema applied."

# Apply seed if exists
if [ -f "$SCRIPT_DIR/seed.sql" ]; then
    psql -h "$PGHOST" -p "$PGPORT" -U $DB_USER -d $DB_NAME -f "$SCRIPT_DIR/seed.sql"
    echo "Seed data applied."
fi

echo "Database initialization complete."
