# 060 — GOAP: Plain Text Paste & LLM-Assisted Gist Creation

> **Status**: Active
> **Type**: GOAP
> **Created**: 2026-05-30
> **Updated**: 2026-05-30
> **Owner**: agent
> **Related**: src/routes/create.ts, src/stores/gist-store.ts, src/services/github/client.ts, src/types/api.ts

---

## Context

The create gist form currently requires manual entry of each filename and content. Users who maintain multi-file snippets, code blocks with surrounding text, or documentation in plain text must manually split content into separate file entries.

Two gaps exist:
1. **No paste intelligence**: Pasting plain text with multiple code blocks, filenames, or delimiters results in a single file with all content concatenated.
2. **No LLM assistance**: No AI-powered description generation, filename suggestion, or content restructuring exists.

This plan adds a "Paste to Gist" workflow: paste plain text (with optional LLM processing) and auto-populate the create form with separate files, descriptions, and filenames.

---

## Goals

### Goal 1: Plain Text Paste Parser (No LLM Required)

Parse pasted text into separate files using deterministic heuristics.

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 1 | Create `src/services/gist-paste-parser.ts` with `parsePasteText(text: string): ParsedPasteResult` | Research done | Pure function that detects file boundaries in pasted text | S |
| 2 | Add `ParsedPasteResult` type to `src/types/gist.ts`: `{ files: Array<{ filename: string; content: string }>; suggestedDescription?: string }` | Action 1 started | Type-safe output for parser consumers | XS |
| 3 | Implement delimiter detection: `--- filename.ext ---`, `## filename.ext`, `// filename.ext`, triple-backtick code blocks with language hint | Action 2 done | Handles common multi-file paste formats | M |
| 4 | Implement fallback: if no delimiters found, treat entire paste as single file with auto-detected extension from first code block language | Action 3 done | Graceful degradation for plain pastes | XS |
| 5 | Add unit tests in `tests/unit/gist-paste-parser.test.ts` covering: single file, multi-file with `---` delimiters, code blocks only, mixed text+code, no delimiters | Action 4 done | Parser correctness verified | S |

### Goal 2: Create Form Paste Zone UI

Enhance `src/routes/create.ts` with a dedicated paste area that triggers auto-population.

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 6 | Add paste zone markup above the files container: a textarea with placeholder "Paste plain text here..." and "PARSE PASTE" button | Action 2 done | Users have a dedicated area to paste content | S |
| 7 | Wire paste event on the textarea: on paste, call `parsePasteText()` and auto-populate the files container with detected files | Action 6 done, Action 5 done | Paste instantly fills form with separate file entries | S |
| 8 | Add "PARSE PASTE" button handler: re-parse textarea content on demand (for manual trigger after editing) | Action 7 done | Users can re-parse after editing pasted text | XS |
| 9 | Style paste zone in `src/styles/base.css`: bordered drop area, focus state, transition when populated | Action 6 done | Visual feedback matches app design system | S |
| 10 | Add remove button to auto-generated file entries (existing pattern from `createFileRow`) | Action 7 done | Users can remove unwanted auto-populated files | XS |

### Goal 3: LLM Service Layer

Create an optional LLM integration for description generation and smart filename suggestion.

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 11 | Create `src/services/llm/client.ts` with `LLMClient` type: `generateDescription(files): Promise<string>`, `suggestFilename(content: string): Promise<string>`, `splitIntoFiles(text: string): Promise<ParsedPasteResult>` | Research done | LLM abstraction layer with provider-agnostic interface | M |
| 12 | Create `src/services/llm/providers/openai.ts`: OpenAI GPT-4o-mini integration via `fetch()` to `https://api.openai.com/v1/chat/completions` | Action 11 started | Concrete provider for LLM operations | M |
| 13 | Create `src/services/llm/providers/github-models.ts`: GitHub Models integration via `https://models.inference.ai.azure.com/chat/completions` using existing PAT token | Action 11 started | Zero-config option using existing auth | M |
| 14 | Add `src/types/llm.ts`: `LLMProvider`, `LLMConfig`, `LLMRequest`, `LLMResponse` types | Action 11 started | Type safety for LLM operations | XS |
| 15 | Store LLM config in IndexedDB metadata store: `{ provider: 'openai' | 'github-models' | 'none', apiKey?: string, model?: string, enabled: boolean }` | Action 14 done | Persists user preferences without hardcoding secrets | S |
| 16 | Add LLM settings UI in `src/routes/settings.ts`: provider selector, API key input (masked), model dropdown, enable/disable toggle | Action 15 done | User controls LLM integration | S |
| 17 | Unit tests in `tests/unit/llm-client.test.ts`: mock fetch, test each provider, test error handling, test disabled state | Action 12 done, Action 13 done | LLM client correctness | S |

### Goal 4: LLM-Assisted Paste Processing

Wire LLM into the paste flow for intelligent file splitting and description generation.

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 18 | Add "AI PARSE" toggle button next to "PARSE PASTE" in create form | Action 6 done, Action 16 done | Users opt into LLM processing per paste | XS |
| 19 | When "AI PARSE" enabled: call `llm.splitIntoFiles(text)` instead of `parsePasteText(text)`, then `llm.generateDescription(files)` to auto-fill description | Action 18 done, Action 17 done | Smart file splitting and description generation | S |
| 20 | Add loading spinner on paste zone during LLM processing | Action 19 done | Visual feedback for async operation | XS |
| 21 | Fallback: if LLM call fails, silently fall back to heuristic parser and show toast "AI unavailable, using basic parser" | Action 19 done | Graceful degradation | XS |

### Goal 5: Drag-and-Drop File Import (Bonus)

Allow dragging files from the file system into the create form.

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 22 | Add `ondragover`/`ondrop` handlers on the files container in `src/routes/create.ts` | Action 6 done | Files can be dropped from OS file manager | S |
| 23 | Read dropped files via `FileReader.readAsText()`, map filename to gist filename, content to gist content | Action 22 done | Files auto-populate form entries | S |
| 24 | Visual drop zone: highlight files container on dragover, animate on drop | Action 22 done | Clear drag-drop affordance | XS |
| 25 | Unit tests for drop handler: single file, multiple files, non-text file rejection | Action 23 done | Drop behavior verified | S |

---

## Success Criteria

- Paste a multi-file snippet with `--- filename.js ---` delimiters → form auto-populates with 2+ file entries, each with correct filename and content
- Paste a code block with language hint → single file entry with correct filename extension
- Paste plain text with no delimiters → single file entry with `untitled.txt` or detected extension
- LLM toggle enabled + paste → description auto-filled, files split intelligently
- LLM toggle enabled but API fails → fallback to heuristic parser, toast shown
- LLM settings persisted across sessions in IndexedDB
- Drag-and-drop files → form populated with filenames and content
- `pnpm run typecheck` passes (strict types, no `any`)
- `pnpm run lint` passes (Biome zero errors)
- `pnpm run test:unit` passes with new parser and LLM client tests
- `./scripts/quality_gate.sh` passes

---

## Implementation Order

1. **Phase A** (Actions 1–5): Paste parser service + types + tests
2. **Phase B** (Actions 6–10): Create form paste zone UI
3. **Phase C** (Actions 11–17): LLM service layer + settings + tests
4. **Phase D** (Actions 18–21): LLM-assisted paste processing
5. **Phase E** (Actions 22–25): Drag-and-drop file import

---

## Plan Registry

- Register this plan in `_status.json`, `_index.md`, and `README.md`
- Next available plan: `061`
