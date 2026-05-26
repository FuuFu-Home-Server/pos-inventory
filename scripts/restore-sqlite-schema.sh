#!/usr/bin/env bash
set -e
git checkout prisma/schema.prisma prisma/migrations/migration_lock.toml
echo "Restored SQLite schema."
