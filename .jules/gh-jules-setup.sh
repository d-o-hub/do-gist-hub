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

run_apt() {
  if [[ -n "$SUDO" ]]; then
    $SUDO env DEBIAN_FRONTEND=noninteractive apt-get "$@"
  else
    DEBIAN_FRONTEND=noninteractive apt-get "$@"
  fi
}

if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  SUDO=""
else
  require_cmd sudo
  SUDO="sudo"
fi

log "Checking base tools"
require_cmd apt-get
require_cmd dpkg

GH_KEYRING="/etc/apt/keyrings/githubcli-archive-keyring.gpg"
GH_LIST="/etc/apt/sources.list.d/github-cli.list"
GH_REPO_LINE="deb [arch=$(dpkg --print-architecture) signed-by=${GH_KEYRING}] https://cli.github.com/packages stable main"

install_gh_repo() {
  log "Ensuring GitHub CLI apt repository is configured"
  $SUDO mkdir -p -m 755 /etc/apt/keyrings
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | $SUDO tee "$GH_KEYRING" >/dev/null
  $SUDO chmod go+r "$GH_KEYRING"
  if [[ ! -f "$GH_LIST" ]] || ! grep -Fqx "$GH_REPO_LINE" "$GH_LIST"; then
    printf '%s\n' "$GH_REPO_LINE" | $SUDO tee "$GH_LIST" >/dev/null
  fi
}

log "Installing prerequisites"
run_apt update -yq
run_apt install -yq ca-certificates curl gpg

install_gh_repo

if command -v gh >/dev/null 2>&1; then
  log "gh already present: $(gh --version | head -n1)"
else
  log "Installing GitHub CLI"
  run_apt update -yq
  run_apt install -yq gh
fi

require_cmd curl
require_cmd gh

log "Installed version: $(gh --version | head -n1)"
log "Running gh health checks"
gh --version >/dev/null
gh help >/dev/null 2>&1 || die "gh is installed but not responding correctly"

if [[ -n "${GH_TOKEN:-}" || -n "${GITHUB_TOKEN:-}" ]]; then
  log "Token environment variable detected; validating gh authentication"
  if gh auth status >/dev/null 2>&1; then
    log "gh authentication is working"
  else
    warn "Token variable is present but gh auth status failed"
    warn "Check whether the token is valid and has the repo scopes you need"
  fi

  if gh repo view >/dev/null 2>&1; then
    log "Repository access check passed"
  else
    warn "gh is authenticated, but 'gh repo view' failed in the current directory"
    warn "This can happen outside a GitHub repo or if the token lacks repository access"
  fi
else
  warn "No GH_TOKEN or GITHUB_TOKEN found during setup"
  warn "Install succeeded. In Jules, add a repo environment variable and enable it for each task session"
  warn "Then verify with: gh auth status && gh repo view"
fi

log "Setup complete"
