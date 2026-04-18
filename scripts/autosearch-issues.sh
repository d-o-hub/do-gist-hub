#!/bin/bash
set -euo pipefail

# Autosearch Issues - Automatically detect and catalog codebase issues
# Searches for patterns that indicate problems and documents them

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
AGENT_DOCS="$ROOT_DIR/agent-docs"
DATE=$(date +%Y-%m-%d)

# Search patterns for common issues
declare -A PATTERNS=(
    # CSS Issues
    ["css_missing_base_display"]="\.sidebar-nav|\.bottom-nav.*\{[^}]*\}[^@]*@media"
    ["css_no_dvh"]="100vh[^d]"
    ["css_hardcoded_colors"]="#[0-9a-fA-F]{3,6}"
    ["css_missing_safe_area"]="env\(safe-area"
    
    # Component Issues
    ["ts_any_type"]=":\s*any[;\s]"
    ["ts_console_log"]="console\.(log|warn|error)"
    ["ts_missing_return"]="function\s+\w+\([^)]*\)\s*\{[^}]*$"
    
    # HTML/Template Issues
    ["html_unstyled_button"]="<button[^>]*>(?!.*class)"
    ["html_inline_style"]="style=\""
)

# Issue descriptions
declare -A DESCRIPTIONS=(
    ["css_missing_base_display"]="Element may be visible when it should be hidden"
    ["css_no_dvh"]="Using 100vh instead of 100dvh may cause mobile layout issues"
    ["css_hardcoded_colors"]="Hardcoded colors should use CSS custom properties"
    ["css_missing_safe_area"]="Missing safe area insets for notched devices"
    ["ts_any_type"]="TypeScript 'any' type reduces type safety"
    ["ts_console_log"]="Console statements should be removed or use proper logging"
    ["ts_missing_return"]="Function may be missing explicit return type"
    ["html_unstyled_button"]="Button without class may have unstyled appearance"
    ["html_inline_style"]="Inline styles bypass design token system"
)

# Severity levels
declare -A SEVERITY=(
    ["css_missing_base_display"]="high"
    ["css_no_dvh"]="medium"
    ["css_hardcoded_colors"]="low"
    ["css_missing_safe_area"]="medium"
    ["ts_any_type"]="medium"
    ["ts_console_log"]="low"
    ["ts_missing_return"]="low"
    ["html_unstyled_button"]="high"
    ["html_inline_style"]="medium"
)

init_dirs() {
    mkdir -p "$AGENT_DOCS"/{detected,resolved,suppressed}
}

# Search for pattern in files
search_pattern() {
    local pattern_name="$1"
    local pattern="${PATTERNS[$pattern_name]}"
    local description="${DESCRIPTIONS[$pattern_name]}"
    local severity="${SEVERITY[$pattern_name]}"
    
    echo ""
    echo "=== Searching: $pattern_name ==="
    echo "Description: $description"
    echo "Severity: $severity"
    
    local found=0
    
    # Search in relevant files based on pattern type
    case "$pattern_name" in
        css_*)
            if [[ -d "$ROOT_DIR/src/styles" ]]; then
                while IFS= read -r file; do
                    if grep -E "$pattern" "$file" > /dev/null 2>&1; then
                        echo "  Found in: $file"
                        document_detection "$pattern_name" "$file" "$description" "$severity"
                        found=$((found + 1))
                    fi
                done < <(find "$ROOT_DIR/src/styles" -name "*.css" -o -name "*.scss" 2>/dev/null)
            fi
            ;;
        ts_*)
            if [[ -d "$ROOT_DIR/src" ]]; then
                while IFS= read -r file; do
                    if grep -E "$pattern" "$file" > /dev/null 2>&1; then
                        echo "  Found in: $file"
                        document_detection "$pattern_name" "$file" "$description" "$severity"
                        found=$((found + 1))
                    fi
                done < <(find "$ROOT_DIR/src" -name "*.ts" -not -path "*/node_modules/*" 2>/dev/null)
            fi
            ;;
        html_*)
            if [[ -d "$ROOT_DIR/src" ]]; then
                while IFS= read -r file; do
                    if grep -E "$pattern" "$file" > /dev/null 2>&1; then
                        echo "  Found in: $file"
                        document_detection "$pattern_name" "$file" "$description" "$severity"
                        found=$((found + 1))
                    fi
                done < <(find "$ROOT_DIR/src" -name "*.ts" -o -name "*.html" -not -path "*/node_modules/*" 2>/dev/null)
            fi
            ;;
    esac
    
    if [[ $found -eq 0 ]]; then
        echo "  ✓ No issues found"
    else
        echo "  ⚠ $found occurrence(s) found"
    fi
    
    return $found
}

# Document a detected issue
document_detection() {
    local pattern_name="$1"
    local file="$2"
    local description="$3"
    local severity="$4"
    
    local safe_name=$(echo "$pattern_name" | tr '_' '-')
    local detect_file="$AGENT_DOCS/detected/${DATE}-${safe_name}.md"
    
    # Don't duplicate if already documented today
    if [[ -f "$detect_file" ]]; then
        # Append file to existing issue
        if ! grep -q "$file" "$detect_file"; then
            echo "- $file" >> "$detect_file"
        fi
        return
    fi
    
    cat > "$detect_file" << EOF
# Auto-Detected Issue: $pattern_name

**Date:** $DATE  
**Severity:** $severity  
**Pattern:** \`$pattern_name\`

## Description
$description

## Files Affected
- $file

## Suggested Fix
<!-- To be filled by developer -->

## Verification
<!-- To be filled after fix -->
- [ ] Issue resolved
- [ ] No regressions introduced
- [ ] Tests pass

## Related Patterns
<!-- Links to similar issues or patterns -->
EOF

    echo "  Documented: $detect_file"
}

# Generate summary report
generate_report() {
    local total_detected=$(ls -1 "$AGENT_DOCS/detected/"*.md 2>/dev/null | wc -l)
    local total_resolved=$(ls -1 "$AGENT_DOCS/resolved/"*.md 2>/dev/null | wc -l)
    
    local report_file="$AGENT_DOCS/reports/${DATE}-scan-report.md"
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
# Autosearch Report - $DATE

## Summary
- **Total Issues Detected:** $total_detected
- **Total Issues Resolved:** $total_resolved
- **Scan Date:** $(date)

## Detected Issues

EOF

    # List all detected issues
    {
        if [[ $total_detected -gt 0 ]]; then
            for issue in "$AGENT_DOCS/detected/"*.md; do
                local name=$(basename "$issue" .md)
                echo "- [$name]($issue)"
            done
        else
            echo "No issues detected."
        fi
    } >> "$report_file"

    cat >> "$report_file" << EOF

## Pattern Statistics

EOF

    # Count by severity
    local high_count=$(grep -l "Severity: high" "$AGENT_DOCS/detected/"*.md 2>/dev/null | wc -l)
    local medium_count=$(grep -l "Severity: medium" "$AGENT_DOCS/detected/"*.md 2>/dev/null | wc -l)
    local low_count=$(grep -l "Severity: low" "$AGENT_DOCS/detected/"*.md 2>/dev/null | wc -l)

    {
        echo "- High: $high_count"
        echo "- Medium: $medium_count"
        echo "- Low: $low_count"
    } >> "$report_file"

    echo ""
    echo "Report generated: $report_file"
}
    echo ""
    echo "======================================"
    echo "Scan complete. Total issues: $total_found"
    
    if [[ $total_found -gt 0 ]]; then
        echo "See $AGENT_DOCS/detected/ for details"
    fi
}

main "$@"
