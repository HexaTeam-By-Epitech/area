#!/bin/bash
# db/init.sh
set -e

psql -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/schema.sql"
echo "Schema applied."
