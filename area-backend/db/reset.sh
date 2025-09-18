#!/bin/bash
# db/reset.sh
set -e

dropdb "$DB_NAME" -U "$DB_USER" || true
createdb "$DB_NAME" -U "$DB_USER"
psql -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/schema.sql"
psql -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/seed.sql"
echo "Database reset with test data."
