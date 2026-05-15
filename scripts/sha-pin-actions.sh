#!/bin/bash
# SHA-pin GitHub Actions across all workflow files.
# Usage: ./scripts/sha-pin-actions.sh [workflow-file]
# If no file is given, processes all .github/workflows/*.yml

set -euo pipefail

resolve_sha() {
  local owner_repo=$1 tag=$2
  git ls-remote "https://github.com/${owner_repo}.git" "refs/tags/${tag}" 2>/dev/null \
    | awk '{print $1; exit}'
}

pin_file() {
  local file=$1 tmpfile tmp
  tmpfile=$(mktemp)
  echo "Processing $file ..."
  while IFS= read -r line; do
    if [[ $line =~ ^[[:space:]]*uses:[[:space:]]*([^@[:space:]]+)@([^#[:space:]]+) ]]; then
      action="${BASH_REMATCH[1]}"
      tag="${BASH_REMATCH[2]}"
      if [[ ! $tag =~ ^[0-9a-f]{40}$ ]]; then
        sha=$(resolve_sha "$action" "$tag")
        if [[ -n $sha && $sha =~ ^[0-9a-f]{40}$ ]]; then
          echo "${line//@$tag/@$sha  # pinned from $tag}"
        else
          echo "$line  # WARNING: could not resolve $action@$tag"
        fi
      else
        echo "$line"
      fi
    else
      echo "$line"
    fi
  done < "$file" > "$tmpfile"
  if ! diff -q "$file" "$tmpfile" >/dev/null 2>&1; then
    mv "$tmpfile" "$file"
    echo "  -> Updated"
  else
    rm "$tmpfile"
    echo "  -> No changes"
  fi
}

if [[ $# -gt 0 ]]; then
  pin_file "$1"
else
  for f in .github/workflows/*.yml; do
    pin_file "$f"
  done
fi
