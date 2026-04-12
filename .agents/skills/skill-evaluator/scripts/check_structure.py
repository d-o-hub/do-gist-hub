#!/usr/bin/env python3
"""Check structure of a skill directory.

Validates:
- SKILL.md exists and starts with ---
- evals/evals.json exists and is valid JSON with required fields
- references/ directory exists
- No nested duplicate SKILL.md files
"""

import json
import os
import sys
from pathlib import Path


def check_skill_structure(skill_path: str) -> list[str]:
    """Check the structure of a skill directory and return list of issues."""
    issues: list[str] = []
    path = Path(skill_path)

    if not path.is_dir():
        return [f"Skill path is not a directory: {skill_path}"]

    # Check SKILL.md
    skill_md = path / "SKILL.md"
    if not skill_md.exists():
        issues.append("MISSING: SKILL.md not found")
    else:
        content = skill_md.read_text().strip()
        if not content.startswith("---"):
            issues.append("INVALID: SKILL.md must start with --- (YAML frontmatter)")
        lines = content.split("\n")
        if len(lines) > 250:
            issues.append(f"WARNING: SKILL.md has {len(lines)} lines (max 250, use progressive disclosure)")

    # Check evals/evals.json
    evals_json = path / "evals" / "evals.json"
    if not evals_json.exists():
        issues.append("MISSING: evals/evals.json not found")
    else:
        try:
            data = json.loads(evals_json.read_text())
            if "evals" not in data:
                issues.append("INVALID: evals.json must have 'evals' key")
            else:
                for i, case in enumerate(data["evals"]):
                    for field in ("id", "prompt", "expected_output"):
                        if field not in case:
                            issues.append(f"INVALID: eval case {i+1} missing '{field}'")
        except json.JSONDecodeError as e:
            issues.append(f"INVALID: evals.json is not valid JSON: {e}")

    # Check references/
    refs_dir = path / "references"
    if not refs_dir.exists():
        issues.append("MISSING: references/ directory not found")

    # Check for nested SKILL.md (duplicates)
    for nested_md in path.rglob("SKILL.md"):
        if nested_md != skill_md:
            issues.append(f"WARNING: Nested SKILL.md found: {nested_md.relative_to(path)}")

    return issues


def main():
    if len(sys.argv) < 2:
        print("Usage: python check_structure.py <skill_path> [skill_path2 ...]")
        sys.exit(1)

    all_ok = True
    for skill_path in sys.argv[1:]:
        issues = check_skill_structure(skill_path)
        if issues:
            all_ok = False
            print(f"\n❌ {skill_path}:")
            for issue in issues:
                print(f"  - {issue}")
        else:
            print(f"✅ {skill_path}: OK")

    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
