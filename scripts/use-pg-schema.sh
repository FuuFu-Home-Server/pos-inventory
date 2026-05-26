#!/usr/bin/env bash
set -e
cp prisma/schema.postgresql.prisma prisma/schema.prisma
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/migrations/migration_lock.toml
echo "Switched to PostgreSQL schema. Run 'npm run schema:restore' to revert."
