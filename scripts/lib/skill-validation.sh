#!/usr/bin/env bash
# shellcheck shell=bash
#
# Skill Validation Library
# Source this file to use validation functions in other scripts.
# Usage: source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/skill-validation.sh"
#
# Note: This library is intended to be sourced. Do NOT use 'set -euo pipefail' here
# to avoid side effects in the calling shell.

# ------------------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------------------

readonly SV_LIMIT_SKILL=250
readonly SV_LIMIT_SOURCE=500
readonly SV_LIMIT_AGENTS=150

readonly SV_REQUIRED_FIELDS=("name" "description" "version" "template_version")

# ------------------------------------------------------------------------------
# Colors
# ------------------------------------------------------------------------------

readonly SV_GREEN='\033[0;32m'
readonly SV_RED='\033[0;31m'
readonly SV_YELLOW='\033[1;33m'
readonly SV_BLUE='\033[0;34m'
readonly SV_NC='\033[0m'

# ------------------------------------------------------------------------------
# Internal State
# ------------------------------------------------------------------------------

sv_error_count=0
sv_warning_count=0
sv_checked_count=0

# ------------------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------------------

sv::_print() {
  local color="$1"
  local msg="$2"
  printf "%b%s%b\n" "$color" "$msg" "$SV_NC"
}

sv::info()    { sv::_print "$SV_BLUE"   "ℹ $1"; }
sv::ok()      { sv::_print "$SV_GREEN"  "✓ $1"; }
sv::err()     { sv::_print "$SV_RED"    "✗ $1"; ((++sv_error_count)); }
sv::warn()    { sv::_print "$SV_YELLOW" "⚠ $1"; ((++sv_warning_count)); }

sv::get_repo_version() {
  local root_dir="${1:-}"
  if [[ -z "$root_dir" ]]; then
    root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  fi
  local version_file="$root_dir/VERSION"
  if [[ -f "$version_file" ]]; then
    cat "$version_file" | tr -d '[:space:]'
  else
    echo ""
  fi
}

sv::count_lines() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo 0
    return
  fi
  wc -l < "$file" | tr -d '[:space:]'
}

# Single-pass frontmatter extraction and line counting.
# Outputs a tab-separated record: total_lines\tfrontmatter_block
sv::extract_frontmatter() {
  local file="$1"
  local total_lines=0
  local in_frontmatter=false
  local frontmatter_started=false
  local fm_buffer=""

  while IFS= read -r line || [[ -n "$line" ]]; do
    ((++total_lines))
    if [[ "$frontmatter_started" == false ]]; then
      if [[ "$line" == "---" ]]; then
        frontmatter_started=true
        in_frontmatter=true
        continue
      fi
    elif [[ "$in_frontmatter" == true ]]; then
      if [[ "$line" == "---" ]]; then
        in_frontmatter=false
        continue
      fi
      if [[ -n "$fm_buffer" ]]; then
        fm_buffer="$fm_buffer"$'\n'"$line"
      else
        fm_buffer="$line"
      fi
    fi
  done < "$file"

  printf "%s\t%s" "$total_lines" "$fm_buffer"
}

sv::parse_frontmatter_field() {
  local frontmatter="$1"
  local field="$2"
  local raw
  # Match field: value  or  field: "value"  or  field: 'value'
  raw=$(echo "$frontmatter" | grep -m1 -E "^${field}:" || true)
  if [[ -z "$raw" ]]; then
    echo ""
    return
  fi
  echo "$raw" | sed -E "s/^${field}:\s*['\"]?([^'\"]+)['\"]?/\1/" | tr -d '[:space:]'
}

sv::semver_cmp() {
  local v1="$1"
  local v2="$2"
  # Normalize by stripping leading v and taking first three numeric dot-separated parts
  v1="${v1#v}"
  v2="${v2#v}"
  local a1="${v1%%.*}"
  local rest1="${v1#*.}"
  local a2="${v2%%.*}"
  local rest2="${v2#*.}"

  a1="${a1:-0}"
  a2="${a2:-0}"

  if (( a1 > a2 )); then echo 1; return; fi
  if (( a1 < a2 )); then echo -1; return; fi

  local b1="${rest1%%.*}"
  local b2="${rest2%%.*}"
  b1="${b1:-0}"
  b2="${b2:-0}"

  if (( b1 > b2 )); then echo 1; return; fi
  if (( b1 < b2 )); then echo -1; return; fi

  local c1="${rest1#*.}"
  local c2="${rest2#*.}"
  c1="${c1%%[^0-9]*}"
  c2="${c2%%[^0-9]*}"
  c1="${c1:-0}"
  c2="${c2:-0}"

  if (( c1 > c2 )); then echo 1; return; fi
  if (( c1 < c2 )); then echo -1; return; fi

  echo 0
}

# ------------------------------------------------------------------------------
# Validation Functions
# ------------------------------------------------------------------------------

sv::validate_skill_md() {
  local file="$1"
  local skill_name="$2"
  local repo_version="$3"

  ((++sv_checked_count))

  if [[ ! -f "$file" ]]; then
    sv::err "Missing SKILL.md in $skill_name"
    return 1
  fi

  local result
  result=$(sv::extract_frontmatter "$file")
  local total_lines="${result%%$'\t'*}"
  local frontmatter="${result#*$'\t'}"

  # --- Line count ---
  if (( total_lines > SV_LIMIT_SKILL )); then
    sv::warn "$skill_name/SKILL.md exceeds line limit ($total_lines > $SV_LIMIT_SKILL)"
  fi

  # --- Frontmatter presence ---
  if [[ -z "$frontmatter" ]]; then
    sv::err "$skill_name/SKILL.md missing or invalid frontmatter block"
    return 1
  fi

  # --- Required fields ---
  local field
  for field in "${SV_REQUIRED_FIELDS[@]}"; do
    local value
    value=$(sv::parse_frontmatter_field "$frontmatter" "$field")
    if [[ -z "$value" ]]; then
      sv::err "$skill_name/SKILL.md missing required frontmatter field: $field"
    fi
  done

  # --- Version drift ---
  local skill_version
  skill_version=$(sv::parse_frontmatter_field "$frontmatter" "version")
  if [[ -n "$skill_version" && -n "$repo_version" ]]; then
    local cmp
    cmp=$(sv::semver_cmp "$skill_version" "$repo_version")
    if [[ "$cmp" != "0" ]]; then
      sv::warn "$skill_name/SKILL.md version drift (skill=$skill_version, repo=$repo_version)"
    fi
  fi

  return 0
}

sv::validate_agents_md() {
  local file="$1"
  ((++sv_checked_count))

  if [[ ! -f "$file" ]]; then
    sv::err "Missing AGENTS.md"
    return 1
  fi

  local total_lines
  total_lines=$(sv::count_lines "$file")
  if (( total_lines > SV_LIMIT_AGENTS )); then
    sv::warn "AGENTS.md exceeds line limit ($total_lines > $SV_LIMIT_AGENTS)"
  fi

  return 0
}

sv::validate_source_file() {
  local file="$1"
  ((++sv_checked_count))

  if [[ ! -f "$file" ]]; then
    sv::err "Source file not found: $file"
    return 1
  fi

  local total_lines
  total_lines=$(sv::count_lines "$file")
  if (( total_lines > SV_LIMIT_SOURCE )); then
    sv::err "Source file exceeds line limit ($total_lines > $SV_LIMIT_SOURCE): $file"
  fi

  return 0
}

sv::print_summary() {
  echo ""
  if (( sv_error_count == 0 && sv_warning_count == 0 )); then
    sv::ok "All $sv_checked_count checks passed"
    return 0
  fi

  if (( sv_warning_count > 0 )); then
    sv::_print "$SV_YELLOW" "Warnings: $sv_warning_count"
  fi
  if (( sv_error_count > 0 )); then
    sv::_print "$SV_RED" "Errors: $sv_error_count"
    return 1
  fi

  return 0
}

sv::reset_counters() {
  sv_error_count=0
  sv_warning_count=0
  sv_checked_count=0
}
