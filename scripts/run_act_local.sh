#!/usr/bin/env bash
set -euo pipefail

# Local GitHub Actions runner using nektos/act
# https://github.com/nektos/act

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Environment overrides
ACT_JOB="${ACT_JOB:-}"
ACT_EVENT="${ACT_EVENT:-pull_request}"
ACT_WORKFLOW_FILE="${ACT_WORKFLOW_FILE:-.github/workflows/ci.yml}"

PLATFORM="ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest"

usage() {
  echo "Usage: $(basename "$0") [OPTIONS]"
  echo ""
  echo "Run GitHub Actions workflows locally using 'act'."
  echo ""
  echo "Environment variables:"
  echo "  ACT_JOB              Job name to run (default: all jobs)"
  echo "  ACT_EVENT            Event type (default: pull_request)"
  echo "  ACT_WORKFLOW_FILE    Workflow file path (default: .github/workflows/ci.yml)"
  echo ""
  echo "Options:"
  echo "  -h, --help    Show this help"
  echo ""
  echo "Examples:"
  echo "  ACT_JOB=lint $(basename "$0")"
  echo "  ACT_EVENT=push ACT_WORKFLOW_FILE=.github/workflows/release.yml $(basename "$0")"
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

# ------------------------------------------------------------------------------
# Prerequisites
# ------------------------------------------------------------------------------

if ! command -v act &> /dev/null; then
  echo "✗ 'act' is not installed. Install it first:"
  echo "   https://github.com/nektos/act#installation"
  exit 1
fi

if ! command -v docker &> /dev/null; then
  echo "✗ 'docker' is not installed. Docker is required to run act."
  exit 1
fi

if ! docker info &> /dev/null; then
  echo "✗ Docker daemon is not running. Start Docker first."
  exit 1
fi

# ------------------------------------------------------------------------------
# Build command
# ------------------------------------------------------------------------------

workflow_path="$ROOT_DIR/$ACT_WORKFLOW_FILE"

if [[ ! -f "$workflow_path" ]]; then
  echo "✗ Workflow file not found: $workflow_path"
  exit 1
fi

# act requires an event payload JSON file, not a directory
EVENT_FILE="$ROOT_DIR/event.json"
if [[ ! -f "$EVENT_FILE" ]]; then
  echo "{}" > "$EVENT_FILE"
  echo "→ Created dummy event payload at event.json"
fi

args=(
  --platform "$PLATFORM"
  --eventpath "$EVENT_FILE"
  --workflows "$workflow_path"
)

if [[ -n "$ACT_JOB" ]]; then
  args+=("--job" "$ACT_JOB")
fi

echo "→ Running act with event '$ACT_EVENT'"
echo "   Workflow: $ACT_WORKFLOW_FILE"
if [[ -n "$ACT_JOB" ]]; then
  echo "   Job:      $ACT_JOB"
fi
echo ""

cd "$ROOT_DIR"
act "$ACT_EVENT" "${args[@]}"
