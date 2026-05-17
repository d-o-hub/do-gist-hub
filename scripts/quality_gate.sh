#!/usr/bin/env bash
# Full quality gate with auto-detection for multiple languages.
# Exit 0 = silent success, Exit 2 = errors surfaced to agent.
# Used in pre-commit hook and CI.
# NOTE: errexit disabled explicitly - it causes unpredictable failures in CI
# We aggregate all failures before deciding the final exit code.
set +e
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT" || exit 1

# Source lint-cache library
# shellcheck source=scripts/lib/lint_cache.sh
if [ -f "$REPO_ROOT/scripts/lib/lint_cache.sh" ]; then
    # shellcheck source=scripts/lib/lint_cache.sh
    source "$REPO_ROOT/scripts/lib/lint_cache.sh"
fi

# Colors for output
if [[ -t 1 ]] && [[ "${FORCE_COLOR:-}" != "0" ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    NC=''
    YELLOW=''
    BLUE=''
fi

FAILED=0
DETECTED_LANGUAGES=()

echo "Running quality gate..."
echo ""

# --- Validate git hooks configuration ---
if [ "${SKIP_GLOBAL_HOOKS_CHECK:-false}" != "true" ]; then
    echo -e "${BLUE}Validating git hooks configuration...${NC}"
    if ! ./scripts/validate-git-hooks.sh; then
        # Don't fail the quality gate, just warn
        echo -e "${YELLOW}  ⚠ Git hooks configuration warning${NC}"
    fi
    echo ""
fi

# --- Validate GitHub Actions SHAs ---
echo -e "${BLUE}Validating GitHub Actions SHAs...${NC}"
if ! ./scripts/validate-github-actions-shas.sh; then
    FAILED=1
fi
echo ""

# --- Validate skills (symlinks and format) ---
if [ -f "./scripts/validate-skills.sh" ]; then
    echo -e "${BLUE}Validating skills...${NC}"
    if ! ./scripts/validate-skills.sh; then
        FAILED=1
    fi
    echo ""
fi

# --- ADR compliance check ---
if [ -f "./scripts/check-adr-compliance.sh" ]; then
    echo -e "${BLUE}Checking ADR compliance...${NC}"
    if ! ./scripts/check-adr-compliance.sh; then
        FAILED=1
    fi
    echo ""
fi

# --- Plan numbering consistency ---
if [ -f "./scripts/check-plan-numbering.sh" ]; then
    echo -e "${BLUE}Checking plan numbering...${NC}"
    if ! ./scripts/check-plan-numbering.sh; then
        FAILED=1
    fi
    echo ""
fi

# --- Enforce LOC limits ---
echo -e "${BLUE}Enforcing LOC limits...${NC}"
if ! ./scripts/loc_gate.sh; then
    FAILED=1
fi
echo ""

# --- Auto-detect project languages ---
echo -e "${BLUE}Detecting project languages...${NC}"

if [ -f "package.json" ]; then
    echo "  ${GREEN}✓${NC} TypeScript/JavaScript (package.json)"
    DETECTED_LANGUAGES+=("typescript")
fi

if find . -name "*.sh" -not -path "./.git/*" -not -path "./node_modules/*" -print -quit | grep -q .; then
    echo "  ${GREEN}✓${NC} Shell scripts detected"
    DETECTED_LANGUAGES+=("shell")
fi

if find . -name "*.md" -not -path "./.git/*" -not -path "./node_modules/*" -print -quit | grep -q .; then
    echo "  ${GREEN}✓${NC} Markdown files detected"
    DETECTED_LANGUAGES+=("markdown")
fi

echo ""

# --- Run language-specific checks ---

# TypeScript / JavaScript checks
if [[ " ${DETECTED_LANGUAGES[*]} " =~ " typescript " ]]; then
    echo -e "${BLUE}Running TypeScript/JavaScript checks...${NC}"

    if command -v pnpm &> /dev/null; then
        # Typecheck
        if ! OUTPUT=$(pnpm run typecheck 2>&1); then
            echo -e "${RED}  ✗ pnpm typecheck failed${NC}"
            printf "%s\n" "$OUTPUT" >&2
            FAILED=1
        else
            echo -e "${GREEN}  ✓ pnpm typecheck passed${NC}"
        fi

        # Lint & Format (Biome)
        if ! OUTPUT=$(pnpm run check 2>&1); then
            echo -e "${RED}  ✗ Biome check failed${NC}"
            printf "%s\n" "$OUTPUT" >&2
            FAILED=1
        else
            echo -e "${GREEN}  ✓ Biome check passed${NC}"
        fi

        # Coverage
        if [ "${SKIP_TESTS:-false}" != "true" ]; then
            if ! OUTPUT=$(pnpm exec vitest run --coverage 2>&1); then
                echo -e "${RED}  ✗ Coverage check failed${NC}"
                printf "%s\n" "$OUTPUT" >&2
                FAILED=1
            else
                echo -e "${GREEN}  ✓ Coverage check passed${NC}"
            fi
        fi
    fi

    # Enforce TypeScript-only source: no .js/.jsx files in src/
    echo "  → Checking for forbidden .js/.jsx files in src/..."
    JS_SRC_FILES=$(find "$REPO_ROOT/src" -name '*.js' -o -name '*.jsx' 2>/dev/null | head -20)
    if [[ -n "$JS_SRC_FILES" ]]; then
        echo -e "${RED}  ✗ Found .js/.jsx files in src/ — source must be TypeScript only:${NC}"
        echo "$JS_SRC_FILES"
        FAILED=1
    else
        echo -e "${GREEN}  ✓ No .js/.jsx files in src/${NC}"
    fi
    echo ""
fi

# Shell script checks
if [[ " ${DETECTED_LANGUAGES[*]} " =~ " shell " ]]; then
    echo -e "${BLUE}Running Shell script checks...${NC}"

    if command -v shellcheck &> /dev/null; then
        SHELL_SCRIPTS=$(find . -name "*.sh" -not -path "./.git/*" -not -path "./node_modules/*" 2>/dev/null || true)
        if [ -n "$SHELL_SCRIPTS" ]; then
            sc_failed=0
            while IFS= read -r script; do
                [ -n "$script" ] || continue
                if ! lint_if_changed "$script" "shellcheck" ".shellcheckrc" shellcheck --severity=error -f quiet "$script" >/dev/null 2>&1; then
                    echo -e "${RED}  ✗ shellcheck failed: $script${NC}"
                    sc_failed=1
                fi
            done <<< "$SHELL_SCRIPTS"

            if [ $sc_failed -eq 0 ]; then
                echo -e "${GREEN}  ✓ shellcheck passed${NC}"
            else
                FAILED=1
            fi
        fi
    else
        echo -e "${YELLOW}  ⚠ shellcheck not installed - skipping shell checks${NC}"
    fi
    echo ""
fi

# Final status
if [ $FAILED -ne 0 ]; then
    echo -e "${RED}─────────────────────────────────────────────────────────────────${NC}"
    echo -e "${RED}│ ✗ Quality Gate FAILED                                         │${NC}"
    echo -e "${RED}─────────────────────────────────────────────────────────────────${NC}"
    exit 2
fi

echo -e "${GREEN}─────────────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}│ ✓ All Quality Gates PASSED                                    │${NC}"
echo -e "${GREEN}─────────────────────────────────────────────────────────────────${NC}"
echo ""
echo "Languages checked: ${DETECTED_LANGUAGES[*]}"
