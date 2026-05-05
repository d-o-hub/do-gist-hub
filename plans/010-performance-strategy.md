<!-- Last Audit: 2024-05-15 -->
# Performance Strategy

## Budgets

- Initial JS: < 150KB gzipped
- Route chunks: < 50KB each
- Cold start: < 2s

## Measurement

Web Vitals: LCP, FID, CLS, INP.

## Optimizations (v1.1)

- **Batch IndexedDB Writes**: Buffered gist updates are committed as a single transaction (300ms debounce) to reduce I/O overhead.
- **Sync Queue Deduplication**: Pending operations for the same Gist are replaced rather than appended, preventing redundant API calls.
- **Cache Eviction (LRU/TTL)**: Gist cache automatically evicts entries older than 30 days or exceeding 100 records to stabilize storage usage on mobile devices.

---

*Created: 2026. Status: Completed (Audited and Verified) (Missing Playwright coverage).*
