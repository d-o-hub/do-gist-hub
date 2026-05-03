---
name: swarm-coordination
description: |
Coordinate multiple agents for complex tasks with handoff patterns. Use when splitting work across agents, chaining agent outputs, tracking progress in plans/, or when agent tasks fail due to wrong agent type selection. Triggers on: "swarm", "coordinate agents", "handoff", "agent failed", "explore agent returned empty", "task returned nothing".
version: "1.0"
template_version: "0.1.0"
license: MIT
---

# Swarm Coordination

Coordinate multiple AI agents to solve complex tasks with proper handoff patterns and progress tracking.

## Agent Type Selection (Critical)

### Agent Types and Capabilities

| Agent Type | grep | glob | read | bash | Use Case |
|-----------|------|------|------|------|----------|
| `explore` | ✅ | ✅ | ❌ | "Find files", "Search for X", "Read files in..." |
| `general` | ✅ | ✅ | ✅ | "Research X", "Run command and analyze", "Execute and report" |

**⚠️ CRITICAL**: `explore` agents CANNOT execute bash commands. If your task needs `npm`, `gh`, `git`, or any bash execution, use `general` agent type.

### Failure Pattern: Empty Task Results

**Symptom**: Task returns `<task_result>` with no content between tags.

**Root Cause**: Using `explore` agent with bash commands in instructions.

**❌ WRONG**:
```xml
<invoke name="task">
  <parameter name="subagent_type">explore</parameter>
  <parameter name="prompt">Run npm test and analyze results</parameter>
```

**✅ CORRECT**:
```xml
<invoke name="task">
  <parameter name="subagent_type">general</parameter>
  <parameter name="prompt">Run npm test and analyze results</parameter>
```

---

## Swarm Patterns

### Pattern 1: Parallel Independent Tasks

Use when tasks don't depend on each other:

```xml
<invoke name="task">
  <parameter name="description">Analyze tests</parameter>
  <parameter name="subagent_type">general</parameter>
  <parameter name="prompt">Analyze test coverage using npm run test:unit -- --coverage</parameter>
<invoke name="task">
  <parameter name="description">Research patterns</parameter>
  <parameter name="subagent_type">general</parameter>
  <parameter name="prompt">Research vitest best practices for TypeScript</parameter>
```

### Pattern 2: Sequential Handoff

Use when Task 2 needs output from Task 1:

```xml
<invoke name="task">
  <parameter name="description">Research phase</parameter>
  <parameter name="subagent_type">general</parameter>
  <parameter name="prompt">Research X and return detailed findings</parameter>
  <parameter name="task_id">research-task</parameter>

<invoke name="task">
  <parameter name="description">Implement based on research</parameter>
  <parameter name="subagent_type">general</parameter>
  <parameter name="prompt">Implement based on research from task_id research-task</parameter>
  <parameter name="task_id">implement-task</parameter>
```

### Pattern 3: Mixed Agent Types

```xml
<!-- Use explore for pure search tasks -->
<invoke name="task">
  <parameter name="subagent_type">explore</parameter>
  <parameter name="prompt">Find all test files using glob tests/**/*.test.ts</parameter>

<!-- Use general for tasks needing bash -->
<invoke name="task">
  <parameter name="subagent_type">general</parameter>
  <parameter name="prompt">Run vitest and report coverage percentages</parameter>
```

---

## Progress Tracking in plans/

### File Naming Convention

```
plans/
├── 0XX-description.md           # Original plan
├── 0XX-task-name-progress.md   # Progress updates
└── 0XX-task-name-summary.md   # Final summary
```

### Progress File Template

```markdown
# Progress Update: Task Name

> **Date**: YYYY-MM-DD
> **Branch**: `branch-name`
> **Related Plans**: `0XX-description.md`

---

## Executive Summary

### Key Achievements
- Bullet points of completed work

---

## Swarm Agent Coordination

### Agent Deployment

| Agent | Type | Task | Status | Result |
|-------|------|------|--------|--------|
| Agent 1 | general | "Task description" | SUCCESS | Details |
| Agent 2 | explore | "Search for X" | SUCCESS | Details |

### Handoff Coordination

```
Agent 1 (general) ──> Research findings ──> Agent 2 (general) ──> Implementation
```

---

## Implementation Details

### Files Modified/Created

| File | Action | Purpose |
|------|--------|---------|
| `path/to/file` | CREATED | Purpose |

---

## What Was Learned

### Agent Type Lessons

- **explore**: Use ONLY for grep/glob/read. Cannot run bash.
- **general**: Use for ANY task requiring bash execution.

---
```

---

## Common Gotchas

### 1. Explore Agent Returns Empty

**Problem**: Task result has empty `<task_result></task_result>`.

**Solution**: Check if instructions contain bash commands. If yes, switch to `general` agent.

### 2. General Agent Too Slow

**Problem**: General agent is slower due to broader capabilities.

**Solution**: Use `explore` for pure search tasks (faster), `general` only when bash needed.

### 3. Task ID Confusion

**Problem**: Resuming tasks with wrong `task_id`.

**Solution**: Always check existing task IDs before resuming. Use descriptive IDs like `ses_211c46b2bffeYwNpKVtP2ru5Mg`.

---

## Verification Checklist

Before launching swarm:

- [ ] Each task uses correct agent type (explore vs general)
- [ ] Tasks with bash commands use `general` agent type
- [ ] Progress file created in `plans/` with proper naming
- [ ] Handoff dependencies documented
- [ ] Task IDs tracked for sequential tasks

---

## References

- `AGENTS.md` - Agent configuration and available skills
- `.agents/skills/` - Available skill definitions
- `plans/` - Progress tracking examples
