# Agent Skills Evaluation Framework

This directory contains evaluation (evals) configurations for testing and improving Agent Skills following the [Agent Skills specification](https://agentskills.io/).

## Overview

Following best practices from [Evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills.md), each skill includes:

1. **Test cases** (`evals/evals.json`) - Realistic prompts with expected outputs and assertions
2. **Input files** (`evals/files/`) - Sample files for testing file-based skills
3. **Workspace structure** - For running iterations and comparing results

## Eval Structure

### Test Case Format

Each test case in `evals/evals.json` has:

```json
{
  "id": 1,
  "prompt": "Realistic user message",
  "expected_output": "Human-readable description of success",
  "files": ["evals/files/sample-input.ts"],
  "assertions": [
    "Programmatic checks for grading",
    "Specific and observable outcomes"
  ]
}
```

### Assertion Guidelines

**Good assertions:**
- ✅ "The output identifies the missing cleanup function in useEffect"
- ✅ "The corrected code includes clearInterval(intervalId)"
- ✅ "Both axes are labeled on the chart"

**Weak assertions:**
- ❌ "The output is good"
- ❌ "Uses exactly the phrase 'Total Revenue'"

## Running Evals

### Workspace Organization

```
skill-name/
├── SKILL.md
└── evals/
    ├── evals.json
    └── files/

skill-name-workspace/
└── iteration-1/
    ├── eval-test-case-1/
    │   ├── with_skill/
    │   │   ├── outputs/
    │   │   ├── timing.json
    │   │   └── grading.json
    │   └── without_skill/
    │       ├── outputs/
    │       ├── timing.json
    │       └── grading.json
    └── benchmark.json
```

### Execution Pattern

1. **With Skill**: Run agent with skill path, save to `with_skill/outputs/`
2. **Without Skill**: Run same prompt without skill, save to `without_skill/outputs/`
3. **Grade**: Evaluate assertions against outputs, record PASS/FAIL with evidence
4. **Aggregate**: Compute pass rates, time/token deltas in `benchmark.json`

## Skills with Evals

### 1. memory-leak-prevention

**Purpose**: Identify and fix memory leaks in React, Vue, and Node.js code

**Test Cases**:
- React component with setInterval and event listener leaks
- Vue component with WebSocket and RxJS subscription leaks  
- Node.js service with unbounded caches and event emitter leaks

**Key Assertions**:
- Identifies missing cleanup functions
- Provides corrected code with proper teardown
- Recommends LRU cache, WeakMap, removeListener patterns

### 2. global-error-handling

**Purpose**: Implement comprehensive error handling strategy

**Test Cases**:
- API fetch error handling with rate limiting and auth failures
- Error boundaries for React apps
- Offline detection and graceful degradation

**Key Assertions**:
- Creates structured AppError class with error codes
- Implements GlobalErrorBoundary with componentDidCatch
- Provides user-safe messages without exposing tokens/secrets

### 3. design-token-system

**Purpose**: Create production-ready DTCG-aligned design token architecture

**Test Cases**:
- Convert demo tokens to primitive/semantic/component layers
- Add theme support and responsive scaling

**Key Assertions**:
- Uses DTCG format ($type, $value, $description)
- Generates CSS custom properties with media queries
- Includes TypeScript type definitions

### 4. repo-bootstrap

**Purpose**: Initialize repository with AI agent workflow structure

**Test Cases**:
- Create standard directory structure and symlinks
- Set up pre-commit hooks and quality gates

**Key Assertions**:
- Creates .agents/skills, plans/, agents-docs/ directories
- setup-skills.sh creates working symlinks
- quality_gate.sh fails fast on first error

## Grading Principles

1. **Require concrete evidence for PASS** - Don't give benefit of the doubt
2. **Review assertions themselves** - Fix too-easy or too-hard assertions
3. **Use blind comparison** - Compare outputs without knowing which is which
4. **Mix automated and human review** - Scripts for mechanical checks, humans for quality

## Iteration Loop

1. Run initial evals (2-3 test cases)
2. Grade outputs and aggregate results
3. Review with human feedback
4. Analyze patterns (always-pass, always-fail, inconsistent)
5. Improve skill instructions based on signals
6. Rerun in new iteration directory
7. Repeat until satisfied

## Best Practices Applied

From [Agent Skills Best Practices](https://agentskills.io/skill-creation/best-practices.md):

✅ **Start from real expertise** - Test cases based on actual leak patterns, error scenarios
✅ **Refine with real execution** - Evals provide systematic feedback loop
✅ **Spending context wisely** - Assertions focus on what agent wouldn't know
✅ **Calibrating control** - Mix of prescriptive (error codes) and flexible (UI design) instructions
✅ **Patterns for effective instructions**:
   - Gotchas sections for common mistakes
   - Templates for output formats
   - Checklists for multi-step workflows
   - Validation loops for self-correction

## Next Steps

To add evals to additional skills:

1. Create `evals/evals.json` with 2-3 varied test cases
2. Add sample input files to `evals/files/`
3. Define specific, verifiable assertions
4. Run through iteration loop
5. Expand test set based on edge cases discovered

## References

- [Evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills.md)
- [Best practices for skill creators](https://agentskills.io/skill-creation/best-practices.md)
- [Agent Skills Specification](https://agentskills.io/specification.md)
- [Quickstart](https://agentskills.io/skill-creation/quickstart.md)
