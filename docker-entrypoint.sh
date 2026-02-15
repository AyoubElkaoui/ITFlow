#!/bin/sh
set -e

echo "Pushing database schema..."
npx prisma db push --skip-generate

# Apply custom database constraints (idempotent)
if [ -f prisma/migrations/custom/constraints.sql ]; then
  echo "Applying custom database constraints..."
  npx prisma db execute --file prisma/migrations/custom/constraints.sql || echo "Constraints may already exist, continuing..."
fi

echo "Starting app..."
exec node server.js
