#!/bin/bash
set -euo pipefail

# Self-Fix Workflow - Automatically fix detected issues
# Uses pattern matching to apply known fixes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
AGENT_DOCS="$ROOT_DIR/agent-docs"
DATE=$(date +%Y-%m-%d)

DRY_RUN=false
VERBOSE=false

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dry-run      Show what would be fixed without making changes"
    echo "  --verbose      Detailed output"
    echo "  -h, --help     Show this help"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true ;;
        --verbose) VERBOSE=true ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Unknown option: $1"; usage; exit 1 ;;
    esac
    shift
done

log() {
    echo "[$(date +%H:%M:%S)] $1"
}

# Document a fix
document_fix() {
    local issue_id="$1"
    local description="$2"
    local files_changed="$3"
    local verification_steps="$4"
    
    local fix_file="$AGENT_DOCS/fixes/${DATE}-${issue_id}.md"
    
    cat > "$fix_file" << EOF
# Fix: $description

**Date:** $DATE  
**Issue ID:** $issue_id

## Problem
<!-- Description from detection -->

## Solution Applied
$description

## Files Changed
$files_changed

## Verification
$verification_steps

- [ ] Fix verified in browser
- [ ] Screenshots updated
- [ ] No regressions

## Pattern Learned
<!-- Extracted pattern for future prevention -->

## Related
- Issue: \`../detected/${DATE}-${issue_id}.md\`
- Pattern: <!-- Link to pattern file -->
EOF

    log "Fix documented: $fix_file"
}

# Fix: Add base display:none for sidebar if missing
fix_sidebar_visibility() {
    local css_file="$ROOT_DIR/src/styles/base.css"
    
    if [[ ! -f "$css_file" ]]; then
        return 0
    fi
    
    # Check if sidebar-nav has base display:none
    if ! grep -A2 "\.sidebar-nav\s*{" "$css_file" | grep -q "display:\s*none"; then
        log "Found: Missing base display:none for .sidebar-nav"
        
        if [[ "$DRY_RUN" == true ]]; then
            log "[DRY-RUN] Would add 'display: none' to .sidebar-nav base style"
            return 1
        fi
        
        # Find the line with .sidebar-nav { and add display:none after it
        if grep -q "\.sidebar-nav\s*{" "$css_file"; then
            # Use sed to add display:none after the opening brace
            sed -i '/\.sidebar-nav\s*{/a\  display: none;' "$css_file"
            log "Fixed: Added 'display: none' to .sidebar-nav"
            
            document_fix "sidebar-visibility" \
                "Added base display:none for sidebar navigation" \
                "$css_file" \
                "- Screenshot at 320px should not show sidebar"
            
            return 1
        fi
    fi
    
    return 0
}

# Fix: Ensure 100dvh is used for app shell
fix_viewport_height() {
    local css_file="$ROOT_DIR/src/styles/base.css"
    
    if [[ ! -f "$css_file" ]]; then
        return 0
    fi
    
    # Check if app-shell uses 100vh without 100dvh fallback
    if grep -q "min-height:\s*100vh" "$css_file" && ! grep -q "100dvh" "$css_file"; then
        log "Found: Missing 100dvh for mobile viewport"
        
        if [[ "$DRY_RUN" == true ]]; then
            log "[DRY-RUN] Would add 100dvh fallback after 100vh"
            return 1
        fi
        
        # Add 100dvh line after 100vh
        sed -i 's/min-height: 100vh;/min-height: 100vh;\n  min-height: 100dvh;/' "$css_file"
        log "Fixed: Added 100dvh fallback"
        
        document_fix "viewport-height" \
            "Added 100dvh for mobile viewport stability" \
            "$css_file" \
            "- Test on mobile device or emulator"
        
        return 1
    fi
    
    return 0
}

# Fix: Add min-height:0 to flex children with overflow
fix_flex_scroll() {
    local css_file="$ROOT_DIR/src/styles/base.css"
    
    if [[ ! -f "$css_file" ]]; then
        return 0
    fi
    
    # Find elements with overflow-y:auto that don't have min-height:0
    local needs_fix=false
    
    while IFS= read -r line; do
        if echo "$line" | grep -q "overflow-y:\s*auto"; then
            local prev_lines=$(grep -B10 "$line" "$css_file" | tail -10)
            if ! echo "$prev_lines" | grep -q "min-height:\s*0"; then
                needs_fix=true
                break
            fi
        fi
    done < <(grep -n "overflow-y:\s*auto" "$css_file" || true)
    
    if [[ "$needs_fix" == true ]]; then
        log "Found: Flex children with overflow may need min-height:0"
        
        if [[ "$DRY_RUN" == true ]]; then
            log "[DRY-RUN] Would add min-height:0 to flex children with overflow"
            return 1
        fi
        
        # This is more complex - we'd need to identify the specific selectors
        log "Manual fix needed: Add 'min-height: 0' to flex children with overflow"
        return 0
    fi
    
    return 0
}

# Fix: Remove console.log statements from production code
fix_console_logs() {
    local src_dir="$ROOT_DIR/src"
    local found_logs=false
    
    while IFS= read -r file; do
        if grep -q "console\.log" "$file"; then
            found_logs=true
            log "Found console.log in: $file"
            
            if [[ "$DRY_RUN" == true ]]; then
                continue
            fi
            
            # Comment out console.log statements (don't remove for debugging)
            sed -i 's/console\.log/\/\/ console.log/g' "$file"
        fi
    done < <(find "$src_dir" -name "*.ts" -not -path "*/node_modules/*" 2>/dev/null)
    
    if [[ "$found_logs" == true && "$DRY_RUN" == false ]]; then
        document_fix "console-logs" \
            "Commented out console.log statements" \
            "src/**/*.ts" \
            "- Check that debug output still works when uncommented"
        return 1
    fi
    
    return 0
}

# Main fix loop
main() {
    log "Self-Fix Workflow Starting..."
    log "Mode: dry-run=$DRY_RUN"
    
    local fixes_applied=0
    
    # Run all fix functions
    fix_sidebar_visibility && fixes_applied=$((fixes_applied + 1))
    fix_viewport_height && fixes_applied=$((fixes_applied + 1))
    fix_flex_scroll && fixes_applied=$((fixes_applied + 1))
    fix_console_logs && fixes_applied=$((fixes_applied + 1))
    
    log ""
    log "Fix workflow complete"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY-RUN] No changes were made"
    else
        log "$fixes_applied fix(es) applied"
        
        if [[ $fixes_applied -gt 0 ]]; then
            log "See $AGENT_DOCS/fixes/ for documentation"
            
            # Run quality gate to verify
            log ""
            log "Running quality gate..."
            "$SCRIPT_DIR/quality_gate.sh" || true
        fi
    fi
}

main "$@"
