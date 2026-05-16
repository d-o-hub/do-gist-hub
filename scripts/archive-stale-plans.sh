#!/usr/bin/env bash
# ============================================================================
# archive-stale-plans.sh — Archive Stale Progress Updates (E7)
# ============================================================================
#
# Moves progress updates from plans/ to plans/archive/ when they are
# older than 60 days. Date is parsed from the filename pattern:
#   NNN-progress-update-YYYY-MM-DD.md
#
# Usage:
#   ./scripts/archive-stale-plans.sh
#
# Exit codes:
#   0 — All plans processed (nothing stale, or all moved successfully)
#   1 — Error during processing (archive dir missing, etc.)
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLANS_DIR="$SCRIPT_DIR/plans"
ARCHIVE_DIR="$PLANS_DIR/archive"
EXIT_CODE=0
MOVED_COUNT=0
NOW_SECONDS=$(date +%s)
SIXTY_DAYS_SECONDS=$((60 * 24 * 60 * 60))

if [[ ! -d "$ARCHIVE_DIR" ]]; then
  echo "✗ Archive directory not found: $ARCHIVE_DIR"
  exit 1
fi

while IFS= read -r -d '' file; do
  filename=$(basename "$file")
  file_date=$(echo "$filename" | sed -n 's/.*-\([0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\).*/\1/p')

  if [[ -z "$file_date" ]]; then
    continue
  fi

  file_seconds=$(date -d "$file_date" +%s 2>/dev/null) || continue
  age_seconds=$((NOW_SECONDS - file_seconds))

  if [[ $age_seconds -gt $SIXTY_DAYS_SECONDS ]]; then
    mv "$file" "$ARCHIVE_DIR/$filename"
    echo "  → $filename moved to archive/"
    MOVED_COUNT=$((MOVED_COUNT + 1))
  fi
done < <(find "$PLANS_DIR" -maxdepth 1 -name '*-progress-update-*.md' -print0)

if [[ $MOVED_COUNT -eq 0 ]]; then
  echo "No stale plans to archive."
fi

exit $EXIT_CODE
