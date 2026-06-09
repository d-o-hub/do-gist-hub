<!-- Last Audit: 2026-05-11 -->
# Performance Strategy

> **Status**: Complete
> **Type**: Plan
> **Created**: 2026-05-11
> **Updated**: 2026-05-11
> **Owner**: agent
> **Related**: adr-008, adr-016

## Budgets

- Initial JS: < 150KB gzipped
- Route chunks: < 50KB each
- Cold start: < 2s

## Measurement

Web Vitals: LCP, FID, CLS, INP.

---

*Created: 2026. Last Audit: 2026-05-11. Status: Verified — Web Vitals monitoring, bundle budgets, CI bundle analysis job, ETag conditional GETs all implemented.*
