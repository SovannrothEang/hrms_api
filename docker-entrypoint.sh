#!/bin/sh
set -e

# Run migrations
echo "Running migrations..."
npx prisma migrate deploy

# Run seeds
echo "Running seeds..."
npx prisma db seed

# Execute the passed command
exec "$@"
