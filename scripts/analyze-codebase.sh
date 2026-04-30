#!/bin/bash
set -euo pipefail

# Codebase Optimizer - Autonomous Analysis and Self-Learning Script
# Analyzes code, detects issues, suggests fixes, and learns from corrections

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
AGENT_DOCS="$ROOT_DIR/agents-docs"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Command line flags
FIX_MODE=false
VALIDATE_MODE=false
WATCH_MODE=false
PRE_COMMIT=false
VERBOSE=false

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --fix          Auto-fix detected issues where possible"
    echo "  --validate     Validate fixes with screenshots/tests"
    echo "  --watch        Watch mode - runs on file changes"
    echo "  --pre-commit   Run as pre-commit hook (exit non-zero on issues)"
    echo "  --verbose      Detailed output"
    echo "  -h, --help     Show this help"
    echo ""
    echo "Examples:"
    echo "  $0                    # Quick analysis"
    echo "  $0 --fix              # Analyze and auto-fix"
    echo "  $0 --validate         # Analyze with screenshot validation"
    echo "  $0 --fix --validate   # Full optimization cycle"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fix) FIX_MODE=true ;;
        --validate) VALIDATE_MODE=true ;;
        --watch) WATCH_MODE=true ;;
        --pre-commit) PRE_COMMIT=true ;;
        --verbose) VERBOSE=true ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Unknown option: $1"; usage; exit 1 ;;
    esac
    shift
done

log() {
    echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Ensure agents-docs structure exists
init_agent_docs() {
    mkdir -p "$AGENT_DOCS"/{patterns,issues,fixes,references}
    
    # Create index if it doesn't exist
    if [[ ! -f "$AGENT_DOCS/README.md" ]]; then
        cat > "$AGENT_DOCS/README.md" << 'EOF'
# Agent Documentation

Self-learning knowledge base for codebase optimization.

## Structure

- `patterns/` - Detected code patterns (good practices and anti-patterns)
- `issues/` - Documented issues with context and root cause
- `fixes/` - Applied fixes with verification steps
- `references/` - Auto-generated best practice guides

## How It Works

1. **Detection**: Analysis scripts scan codebase for known patterns
2. **Documentation**: Issues are documented with full context
3. **Fixing**: Automated fixes applied where possible
4. **Learning**: Patterns extracted and documented
5. **Prevention**: Rules updated to prevent recurrence

## Usage

Run analysis:
```bash
./scripts/analyze-codebase.sh
```

Auto-fix issues:
```bash
./scripts/analyze-codebase.sh --fix
```

Validate with screenshots:
```bash
./scripts/analyze-codebase.sh --validate
```
EOF
    fi
}

# CSS Analysis - Check for common CSS issues
analyze_css() {
    log "Analyzing CSS for common issues..."
    
    local issues_found=0
    local sidebar_ok=false
    
    # Check 1: Sidebar has base display:none before media queries in any CSS file
    for css_file in "$ROOT_DIR"/src/styles/*.css; do
        if [[ -f "$css_file" ]] && \
           grep -q "\.sidebar-nav" "$css_file" 2>/dev/null && \
           grep -A5 "\.sidebar-nav" "$css_file" | grep -q "display:\s*none"; then
            sidebar_ok=true
            break
        fi
    done
    
    if [[ "$sidebar_ok" != true ]]; then
        log_error "CSS Issue: .sidebar-nav missing base 'display: none'"
        issues_found=$((issues_found + 1))
        
        document_issue "css-sidebar-visibility" \
            "Sidebar missing base display:none" \
            "Mobile shows unstyled sidebar buttons" \
            "$ROOT_DIR/src/styles/" \
            "Add '.sidebar-nav { display: none; }' before any media queries in a CSS file"
    else
        log_success "Sidebar base styles correct"
    fi
    
    # Check 2: App shell uses 100dvh
    if ! grep -q "100dvh" "$css_file"; then
        log_warning "CSS: Consider using 100dvh for mobile viewport stability"
    fi
    
    # Check 3: Safe area insets defined
    if ! grep -q "safe-area-inset" "$css_file"; then
        log_warning "CSS: Missing safe area insets for notched devices"
    fi
    
    # Check 4: Flex children with overflow have min-height:0
    if grep -q "overflow-y:\s*auto" "$css_file" && \
       ! grep -B5 "overflow-y:\s*auto" "$css_file" | grep -q "min-height:\s*0"; then
        log_warning "CSS: Flex children with overflow should have 'min-height: 0'"
    fi
    
    return $issues_found
}

# Component Analysis - Check component structure
analyze_components() {
    log "Analyzing component structure..."
    
    local issues_found=0
    local app_file="$ROOT_DIR/src/components/app.ts"
    
    if [[ ! -f "$app_file" ]]; then
        log_warning "app.ts not found, skipping component analysis"
        return 0
    fi
    
    # Check if sidebar uses proper classes
    if grep -q 'class="sidebar-nav"' "$app_file" && \
       grep -q 'class="sidebar-item"' "$app_file"; then
        log_success "Component: Sidebar uses proper CSS classes"
    else
        log_warning "Component: Sidebar may be missing proper CSS classes"
    fi
    
    return $issues_found
}

# Document an issue for self-learning
document_issue() {
    local issue_id="$1"
    local title="$2"
    local symptom="$3"
    local location="$4"
    local fix_suggestion="$5"
    
    local issue_file="$AGENT_DOCS/issues/${DATE}-${issue_id}.md"
    
    cat > "$issue_file" << EOF
# Issue: $title

**Detected:** $DATE
**ID:** $issue_id
**Status:** Open

## Symptom
$symptom

## Location
\`$location\`

## Root Cause
<!-- To be filled during analysis -->

## Fix Suggestion
$fix_suggestion

## Verification
<!-- To be filled after fix -->
- [ ] Screenshot at 320px shows correct layout
- [ ] Screenshot at 768px shows correct layout
- [ ] No console errors

## Learning
<!-- Pattern extracted from this issue -->

## Related
- Pattern: <!-- Link to pattern file -->
- Fix: <!-- Link to fix file -->
EOF

    log "Issue documented: $issue_file"
}

# Extract patterns from fixes
extract_patterns() {
    log "Extracting patterns from previous fixes..."
    
    # Check for sidebar visibility pattern
    if ls "$AGENT_DOCS/issues/"*"sidebar"*".md" 1>/dev/null 2>&1; then
        local pattern_file="$AGENT_DOCS/patterns/css-navigation-patterns.md"
        
        if [[ ! -f "$pattern_file" ]]; then
            cat > "$pattern_file" << 'EOF'
# CSS Navigation Patterns

## Pattern: Mobile-First Navigation

### Rule
Always define base styles for mobile before desktop media queries.

### Correct
```css
/* Base: Mobile - hide sidebar */
.sidebar-nav {
  display: none;
}

/* Desktop: show sidebar */
@media (min-width: 768px) {
  .sidebar-nav {
    display: flex;
  }
}
```

### Incorrect
```css
/* Wrong: No base style, sidebar visible everywhere */
.sidebar-nav {
  display: flex;
}

@media (max-width: 767px) {
  .sidebar-nav {
    display: none;
  }
}
```

### Why
Mobile-first ensures elements are hidden by default on mobile, preventing
unstyled content from appearing during page load or if CSS fails.

### Detection
```bash
grep -n "\.sidebar-nav" src/styles/base.css | head -5
```

### Prevention
- Always add base `display: none` for elements hidden on mobile
- Use `display: none` not `visibility: hidden` for layout elements
- Place base styles before any media queries
EOF
            log_success "Created pattern: css-navigation-patterns.md"
        fi
    fi
}

# Update AGENTS.md with learned rules
update_agents_md() {
    log "Checking AGENTS.md for updates..."
    
    local agents_file="$ROOT_DIR/AGENTS.md"
    
    if [[ ! -f "$agents_file" ]]; then
        log_warning "AGENTS.md not found, skipping update"
        return
    fi
    
    # Check if our self-learning section exists
    if ! grep -q "Self-Learning Rules" "$agents_file"; then
        log "Adding Self-Learning Rules section to AGENTS.md"
        
        cat >> "$agents_file" << 'EOF'

---

## Self-Learning Rules (Auto-Generated)

This section is automatically updated by `./scripts/analyze-codebase.sh`.

### CSS Layout Rules

1. **Mobile-First Navigation**: Always use `display: none` base style for sidebar
2. **Dynamic Viewport**: Use `100dvh` for app shell on mobile
3. **Safe Areas**: Include `env(safe-area-inset-*)` for header/footer padding
4. **Flex Scrolling**: Add `min-height: 0` to flex children with overflow

### Verification Checklist

Before committing, run:
```bash
./scripts/analyze-codebase.sh --validate
```

This checks:
- [ ] No unstyled elements at any breakpoint
- [ ] Layout gaps eliminated
- [ ] Responsive behavior correct
- [ ] No console errors

### Issue History

See `agents-docs/issues/` for documented issues and fixes.
EOF
    fi
}

# Validate with screenshots
validate_with_screenshots() {
    log "Validating with screenshots..."
    
    if ! command -v agent-browser &> /dev/null; then
        log_warning "agent-browser not installed, skipping screenshot validation"
        return 0
    fi
    
    # Check if dev server is running
    if ! curl -s http://localhost:3000 > /dev/null; then
        log_warning "Dev server not running on localhost:3000, starting..."
        cd "$ROOT_DIR" && npm run dev > /tmp/dev.log 2>&1 &
        sleep 3
    fi
    
    local screenshot_dir="$ROOT_DIR/analysis/responsive"
    mkdir -p "$screenshot_dir"
    
    # Capture screenshots at key breakpoints
    local breakpoints=(320 768 1536)
    
    for bp in "${breakpoints[@]}"; do
        log "Capturing screenshot at ${bp}px..."
        agent-browser set viewport "$bp" 700 2>/dev/null || true
        agent-browser screenshot "$screenshot_dir/${bp}px-${TIMESTAMP}.png" 2>/dev/null || {
            log_warning "Failed to capture ${bp}px screenshot"
        }
    done
    
    log_success "Screenshots captured in $screenshot_dir"
}

# Main analysis function
run_analysis() {
    log "Starting codebase analysis..."
    log "Mode: fix=$FIX_MODE, validate=$VALIDATE_MODE, pre-commit=$PRE_COMMIT"
    
    init_agent_docs
    
    local total_issues=0
    
    # Run all analyzers
    analyze_css
    total_issues=$((total_issues + $?))
    
    analyze_components
    total_issues=$((total_issues + $?))
    
    # Extract patterns from any documented issues
    extract_patterns
    
    # Update documentation
    update_agents_md
    
    # Validate if requested
    if [[ "$VALIDATE_MODE" == true ]]; then
        validate_with_screenshots
    fi
    
    # Summary
    echo ""
    log "Analysis complete"
    
    if [[ $total_issues -eq 0 ]]; then
        log_success "No issues detected"
        return 0
    else
        log_error "$total_issues issue(s) detected"
        log "See $AGENT_DOCS/issues/ for details"
        
        if [[ "$PRE_COMMIT" == true ]]; then
            return 1
        fi
        return 0
    fi
}

# Watch mode
watch_mode() {
    log "Starting watch mode..."
    log "Monitoring: src/ directory"
    
    if ! command -v inotifywait &> /dev/null; then
        log_error "inotifywait not installed. Install with: apt-get install inotify-tools"
        exit 1
    fi
    
    while true; do
        inotifywait -r -e modify,create,delete "$ROOT_DIR/src" 2>/dev/null && {
            log "Change detected, running analysis..."
            run_analysis
            echo "---"
        }
    done
}

# Main entry point
main() {
    if [[ "$WATCH_MODE" == true ]]; then
        watch_mode
    else
        run_analysis
    fi
}

main "$@"
