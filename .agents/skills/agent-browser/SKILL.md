---
name: agent-browser
description: Browser automation CLI for AI agents. Use when the user needs to interact with websites, including navigating pages, filling forms, clicking buttons, taking screenshots, extracting data, testing web apps, or automating any browser task.
version: '0.1.0'
template_version: '0.1.0'
allowed-tools: Bash(npx agent-browser:*), Bash(agent-browser:*)
---

# Browser Automation with agent-browser

The CLI uses Chrome/Chromium via CDP directly. Install via `npm i -g agent-browser`. Run `agent-browser install` to download Chrome.

## Core Workflow

1. **Navigate**: `agent-browser open <url>`
2. **Snapshot**: `agent-browser snapshot -i` (get element refs like `@e1`, `@e2`)
3. **Interact**: Use refs to click, fill, select
4. **Re-snapshot**: After navigation or DOM changes, get fresh refs

```bash
agent-browser open https://example.com/form
agent-browser snapshot -i
# Output: @e1 [input type="email"], @e2 [input type="password"], @e3 [button] "Submit"

agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"
agent-browser click @e3
```

## Command Chaining

Chain commands with `&&` for efficiency. Browser persists between commands via background daemon.

```bash
agent-browser open https://example.com && agent-browser snapshot -i
agent-browser fill @e1 "text" && agent-browser click @e2
```

## Essential Commands

```bash
# Navigation
agent-browser open <url>
agent-browser close

# Snapshot (get interactive elements with refs)
agent-browser snapshot -i
agent-browser snapshot -i --urls

# Interaction
agent-browser click @e1
agent-browser fill @e2 "text"
agent-browser select @e1 "option"
agent-browser press Enter

# Wait
agent-browser wait @e1           # Wait for element
agent-browser wait 2000           # Wait milliseconds
agent-browser wait --text "Welcome"

# Capture
agent-browser screenshot
agent-browser screenshot --full
agent-browser screenshot --annotate

# Batch (ALWAYS use for 2+ sequential commands)
agent-browser batch "open https://example.com" "snapshot -i"
agent-browser batch "click @e1" "wait 1000" "screenshot"
```

## Authentication

**Quick auth via state file**:

```bash
agent-browser --auto-connect state save ./auth.json
agent-browser --state ./auth.json open https://app.example.com
```

**Persistent session**:

```bash
agent-browser --session-name myapp open https://app.example.com/login
# Login, then close - state auto-saved
agent-browser --session-name myapp open https://app.example.com/dashboard
```

## Common Patterns

### Form Submission

```bash
agent-browser batch "open https://example.com/signup" "snapshot -i"
agent-browser batch "fill @e1 \"Jane Doe\"" "fill @e2 \"jane@example.com\"" "click @e3"
```

### Data Extraction

```bash
agent-browser batch "open https://example.com" "snapshot -i"
agent-browser get text @e5
agent-browser snapshot -i --json
```

### Viewport & Responsive Testing

```bash
agent-browser set viewport 1920 1080
agent-browser screenshot analysis/responsive/desktop.png
agent-browser set viewport 375 812
agent-browser screenshot analysis/responsive/mobile.png
```

## Ref Lifecycle (Important)

Refs (`@e1`, `@e2`) are invalidated when page changes. Always re-snapshot after:

- Clicking links/buttons that navigate
- Form submissions
- Dynamic content loading

## Security

- State files contain session tokens - add to `.gitignore`
- Use `AGENT_BROWSER_ENCRYPTION_KEY` for encryption at rest
- Use `AGENT_BROWSER_ALLOWED_DOMAINS` to restrict navigation

## Deep-Dive Documentation

| Reference                          | Description                          |
| ---------------------------------- | ------------------------------------ |
| `references/commands.md`           | Full command reference               |
| `references/snapshot-refs.md`      | Ref lifecycle, troubleshooting       |
| `references/authentication.md`     | Login flows, OAuth, 2FA              |
| `references/session-management.md` | Parallel sessions, state persistence |

## Templates

| Template                             | Description                         |
| ------------------------------------ | ----------------------------------- |
| `templates/form-automation.sh`       | Form filling with validation        |
| `templates/authenticated-session.sh` | Login once, reuse state             |
| `templates/capture-workflow.sh`      | Content extraction with screenshots |
