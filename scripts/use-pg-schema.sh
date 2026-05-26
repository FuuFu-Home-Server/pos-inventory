#!/usr/bin/env bash
set -e
cp prisma/schema.postgresql.prisma prisma/schema.prisma
echo "Switched to PostgreSQL schema. Run 'npm run schema:restore' to revert."
