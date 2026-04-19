<!-- Last Audit: 2024-05-15 -->
# ADR-008: Web Vitals Performance Budgets

**Status**: Accepted  
**Date**: 2026  
**Deciders**: Architect, Performance Agent  

## Context

We need measurable performance targets for:
- Startup time
- Interaction latency
- Visual stability

## Decision

Track Core Web Vitals and enforce budgets:

### Metrics
- LCP < 2.5s (Largest Contentful Paint)
- FID < 100ms (First Input Delay)  
- CLS < 0.1 (Cumulative Layout Shift)
- INP < 200ms (Interaction to Next Paint)

### Budgets
- Initial JS < 150KB gzipped
- Route chunks < 50KB each
- Fonts < 100KB total
- Cold start < 2s

## Tradeoffs

### Pros
- Measurable UX quality
- Clear optimization targets
- Aligns with Google ranking factors

### Cons
- Requires measurement infrastructure
- May limit feature additions
- Testing overhead

## Consequences

Must measure Web Vitals in production.
Must enforce budgets in CI/CD.

## Rollback Triggers

If budgets prove unrealistic for required functionality.

---

*Created: 2026. Status: Active.*
