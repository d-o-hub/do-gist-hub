#!/usr/bin/env bash
set -Eeuo pipefail

log() { printf '[gh-jules-setup] %s\n' "$*"; }
warn() { printf '[gh-jules-setup][warn] %s\n' "$*" >&2; }
die() { printf '[gh-jules-setup][error] %s\n' "$*" >&2; exit 1; }

on_error() {
  local exit_code=$?
  local line_no=${1:-unknown}
  printf '[gh-jules-setup][error] Failed at line %s with exit code %s\n' "$line_no" "$exit_code" >&2
  exit "$exit_code"
}
trap 'on_error $LINENO' ERR

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  SUDO=""
else
  require_cmd sudo
  SUDO="sudo"
fi

export DEBIAN_FRONTEND=noninteractive

log "Checking base tools"
require_cmd apt
require_cmd dpkg

if command -v gh >/dev/null 2>&1; then
  log "gh is already installed: $(gh --version | head -n1)"
else
  log "Installing prerequisites"
  $SUDO apt update
  $SUDO apt install -y ca-certificates curl gpg

  log "Adding GitHub CLI apt repository"
  $SUDO mkdir -p -m 755 /etc/apt/keyrings
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | $SUDO tee /etc/apt/keyrings/githubcli-archive-keyring.gpg >/dev/null
  $SUDO chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | $SUDO tee /etc/apt/sources.list.d/github-cli.list >/dev/null

  log "Installing GitHub CLI"
  $SUDO apt update
  $SUDO apt install -y gh
fi

require_cmd gh
log "Installed version: $(gh --version | head -n1)"

log "Running basic gh health checks"
gh --version >/dev/null
if ! gh help >/dev/null 2>&1; then
  die "gh is installed but not responding correctly"
fi

if [[ -n "${GITHUB_TOKEN:-}" || -n "${GH_TOKEN:-}" ]]; then
  log "Token environment variable detected; checking authentication status"
  if gh auth status >/dev/null 2>&1; then
    log "gh authentication is working"
  else
    warn "gh is installed, but auth status failed even though a token variable is present"
    warn "Verify that GITHUB_TOKEN or GH_TOKEN is valid and available in the session"
  fi
else
  warn "No GITHUB_TOKEN or GH_TOKEN found during setup"
  warn "Install succeeded. To verify login later, run: gh auth login && gh auth status"
  warn "For headless use, set GITHUB_TOKEN or GH_TOKEN in Jules environment variables"
fi

log "Setup complete"
