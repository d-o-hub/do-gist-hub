---
name: skill-evaluator
description: Reusable skill for evaluating other skills via structure checks, eval coverage review, and real usage spot checks. Use when verifying skill wiring, reviewing evals/evals.json, running live evals, comparing against baselines, or identifying missing folders, weak evals, or flaky assertions.
license: MIT
metadata:
  author: d.o.
  version: "1.1"
  spec: agentskills.io
---
# SKILL.md: Skill Evaluator

## When To Use
- Test skill wiring and configuration
- Verify `evals/evals.json` existence and usability
- Run/grant real prompts through a skill and score outputs
- Compare skill behavior against a no-skill baseline or older snapshot
- Identify missing folders, weak evals, or flaky assertions

## Required Inputs
- `SKILL_PATH`: Absolute or workspace-relative path to the target skill directory
- `GOAL`: `structure check` / `eval review` / `live run` / `baseline comparison`

## Evaluation Workflow
1. **Structure Check:** Verify directory sanity. Expected layout:
   ```text
   skill-name/
   ├── SKILL.md
   ├── evals/evals.json (required)
   ├── references/evaluating-skills.md (required)
   └── scripts/ (optional)
   ```
   Flag: missing `SKILL.md`, nested duplicates, missing/invalid `evals.json`, or eval cases missing `id`, `prompt`, or `expected_output`.
2. **Eval Review:** Read `evals/evals.json`.
   - *Good:* Real user prompts, clear success definitions, concrete/checkable assertions, optional input files.
   - *Weak:* Vague prompts, purely subjective assertions, no pass/fail evidence path.
3. **Live Run:** Execute ≥1 representative prompt. Load target skill, read only referenced files, produce output, and grade against assertions with explicit evidence.
4. **Baseline Comparison:** Rerun identical prompt(s) in three states: `with_skill`, `without_skill`, `old_skill`. Compare pass rate, missing details, format compliance, `duration_ms`, and `total_tokens`.
5. **Verdict:** Conclude with `PASS` (sound structure & meets assertions), `NEEDS_WORK` (usable but has gaps), or `FAIL` (broken/misleading/missing core pieces).

## Workspace Layout & Artifact Schemas
Organize results in `-workspace/iteration-N/eval-/` with parallel `with_skill/` and `without_skill/` directories containing `outputs/`, `timing.json`, and `grading.json`. Root contains `benchmark.json` and `feedback.json`.

**`timing.json`**
```json
{ "total_tokens": 84852, "duration_ms": 23332 }
```
**`grading.json`**
```json
{
  "assertion_results": [{ "text": "...", "passed": true, "evidence": "..." }],
  "summary": { "passed": 3, "failed": 1, "total": 4, "pass_rate": 0.75 }
}
```
**`benchmark.json`**
```json
{
  "run_summary": {
    "with_skill": { "pass_rate": { "mean": 0.83 }, "tokens": { "mean": 3800 } },
    "without_skill": { "pass_rate": { "mean": 0.33 }, "tokens": { "mean": 2100 } },
    "delta": { "pass_rate": 0.50, "tokens": 1700 }
  }
}
```
**`feedback.json`**
```json
{ "eval-case-id": "Actionable feedback message from human review", "another-eval-id": "" }
```

## Assertion Rules
- Prefer directly verifiable, evidence-backed claims.
- *Good:* `"The output includes all 7 scoring dimensions"`, `"evals.json contains at least 2 cases"`
- *Bad:* `"The output is good"`, `"The skill feels smart"`, `"The answer is polished"`
- Every pass/fail must include explicit evidence.

## Output Format Template
```text
## Eval Report: <skill-name>
- Goal: <value>
- Structure: PASS/NEEDS_WORK/FAIL
- Live run: PASS/NEEDS_WORK/FAIL
- Baseline: not run / <summary>

### Assertion Results
- PASS: <details>
- FAIL: <details>

### Issues
- <list>

### Next Fixes
1. <item>
2. <item>

### Verdict
PASS | NEEDS_WORK | FAIL
```

## Bundled Tools & References
- **Tool:** `scripts/check_structure.py` (validates local skill folder structure and eval presence)
- **Reference:** `references/evaluating-skills.md` (condensed eval workflow and grading guidance)
