#!/bin/bash
# db/reset.sh
set -e

# Load variables from .env
if [ ! -f ../.env ]; then
    echo "Error: .env file not found in parent directory."
    exit 1
fi
export $(grep -v '^#' ../.env | xargs)

if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
    echo "Error: DB_NAME or DB_USER is not defined in .env"
    exit 1
fi

echo "Dropping database $DB_NAME..."
sudo -u postgres dropdb "$DB_NAME" 2>/dev/null || true

echo "Dropping user $DB_USER..."
sudo -u postgres dropuser "$DB_USER" 2>/dev/null || true

echo "Reinitializing database..."
./init.sh

echo "Database reset complete."
