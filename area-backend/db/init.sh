#!/bin/bash
# db/init.sh
set -e

# Load variables from .env
export $(grep -v '^#' ../.env | xargs)

# Use host and port if defined
PGHOST=${PGHOST:-localhost}
PGPORT=${PGPORT:-5432}

# Generate a random password if DB_PASSWORD is empty
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(openssl rand -base64 12)
    echo "Generated random password for $DB_USER: $DB_PASSWORD"
    # Update .env
    if grep -q "^DB_PASSWORD=" ../.env; then
        sed -i '' "s/^DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" ../.env 2>/dev/null || \
        sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" ../.env
    else
        echo "DB_PASSWORD=$DB_PASSWORD" >> ../.env
    fi
fi

# Check if user exists
USER_EXISTS=$(sudo -u postgres psql -h "$PGHOST" -p "$PGPORT" -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")
if [ "$USER_EXISTS" != "1" ]; then
    echo "Creating PostgreSQL user $DB_USER..."
    sudo -u postgres psql -h "$PGHOST" -p "$PGPORT" -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
else
    echo "User $DB_USER already exists, skipping creation."
    sudo -u postgres psql -h "$PGHOST" -p "$PGPORT" -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
fi

# Check if database exists
DB_EXISTS=$(sudo -u postgres psql -h "$PGHOST" -p "$PGPORT" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")
if [ "$DB_EXISTS" != "1" ]; then
    echo "Creating database $DB_NAME..."
    sudo -u postgres psql -h "$PGHOST" -p "$PGPORT" -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
else
    echo "Database $DB_NAME already exists, skipping creation."
fi

# Apply schema
psql -h "$PGHOST" -p "$PGPORT" -U $DB_USER -d $DB_NAME -W -f "$(dirname "$0")/schema.sql"
echo "Schema applied."

# Apply seed if exists
if [ -f "$(dirname "$0")/seed.sql" ]; then
    psql -h "$PGHOST" -p "$PGPORT" -U $DB_USER -d $DB_NAME -W -f "$(dirname "$0")/seed.sql"
    echo "Seed data applied."
fi

echo "Database initialization complete."
