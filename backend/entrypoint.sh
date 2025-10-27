#!/bin/sh
set -e

echo "Waiting for database to be ready..."
sleep 5

echo "Running Prisma migrations..."
npx prisma migrate deploy --schema=src/prisma/schema.prisma

echo "Starting application..."
exec node dist/main.js

