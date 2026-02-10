#!/usr/bin/env bash
# Regenerate docker/init.sql from all migration files
# Run from project root: bash scripts/rebuild-init-sql.sh

set -e

OUTPUT="docker/init.sql"

echo "-- Auto-generated from migrations/ on $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$OUTPUT"
echo "-- DO NOT EDIT — regenerate with: bash scripts/rebuild-init-sql.sh" >> "$OUTPUT"
echo "" >> "$OUTPUT"

for f in migrations/*.sql; do
  echo "-- ============================================" >> "$OUTPUT"
  echo "-- $(basename "$f")" >> "$OUTPUT"
  echo "-- ============================================" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
  cat "$f" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
done

echo "✅ Regenerated $OUTPUT from $(ls migrations/*.sql | wc -l) migration files"
