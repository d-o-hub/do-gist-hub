# Design Token Architecture

## Token Layers

### Primitive Tokens
Raw values without semantic meaning.

### Semantic Tokens  
Meaningful names tied to use cases.

### Component Tokens
Specific to UI components.

## Breakpoints

- 320px: Small phone
- 390px: Standard phone
- 480px: Large phone
- 768px: Tablet portrait
- 1024px: Tablet landscape
- 1280px: Desktop
- 1536px: Wide desktop

## Implementation Plan

1. Extract tokens from do-gemini-ui-ux-skill
2. Normalize to DTCG-style format
3. Generate CSS custom properties
4. Create TypeScript type definitions
5. Document token contracts

---

*Created: 2026. Status: Draft.*
