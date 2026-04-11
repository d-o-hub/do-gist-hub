# ADR-001: Reuse do-gemini-ui-ux-skill Token System

**Status**: Accepted  
**Date**: 2026  
**Deciders**: Architect, UI/UX Token Agent  

## Context

We need a design system for the GitHub Gist app that is:
- Mobile-first and responsive
- Themeable (dark/light modes)
- Maintainable by AI agents and humans
- Portable and future-proof

The `do-gemini-ui-ux-skill` repository contains a working semantic token design demo with:
- Multi-mode architecture (App, Game, Neural, Technical)
- Atmospheric effects (glassmorphism, blurs)
- Centralized TOKENS object in TypeScript
- Automated validation scripts

## Decision

Reuse the token design approach from `do-gemini-ui-ux-skill` as the visual and structural baseline, but upgrade it to production standards.

### What We Keep
- Semantic token architecture (primitive → semantic → component)
- Multi-theme support structure
- TOKENS object pattern for TypeScript access
- Atmospheric effects where appropriate (subtle glass)

### What We Upgrade
- DTCG-style naming and structure for portability
- Responsive scaling across 7 breakpoints
- Accessibility (WCAG AA contrast ratios)
- Motion tokens with reduced-motion support
- Elevation tokens for layering
- Layout tokens for consistent spacing
- Documentation for each token contract

### What We Change
- Remove game/neural/technical modes not needed for this app
- Simplify atmospheric effects for performance
- Add CSS custom property generation for framework interoperability
- Align with Design Tokens Community Group direction

## Tradeoffs

### Pros
- Leverages existing working design
- Faster initial setup
- Proven token architecture pattern
- Clear visual identity foundation

### Cons
- Requires adaptation work for production use
- May carry over unnecessary complexity
- Need to verify accessibility compliance
- Must ensure DTCG alignment for portability

## Consequences

### Positive
- Consistent visual language from day one
- Token-driven development enforced
- Easy theme switching
- Framework-agnostic token storage

### Negative
- Initial learning curve for team
- Migration effort if tokens change later
- Risk of over-engineering if not disciplined

## Rejected Alternatives

### Alternative 1: Build From Scratch
**Rejected because**: Unnecessary duplication of effort. The existing token system provides a solid foundation.

### Alternative 2: Use Material Design / Chakra UI
**Rejected because**: 
- Too heavy for our bundle budget
- Less flexible for custom mobile UX
- Harder to maintain token discipline
- Not aligned with AI agent workflow

### Alternative 3: Tailwind Config Only
**Rejected because**: 
- Tied to Tailwind specifically
- Less portable across frameworks
- Doesn't enforce semantic naming
- Missing motion/elevation tokens

## Rollback Triggers

Roll back to alternative approach if:
- Token system proves too complex for team
- Accessibility cannot be achieved with current tokens
- Performance impact exceeds budgets
- DTCG standard changes significantly

---

*Created: 2026. Status: Active.*
