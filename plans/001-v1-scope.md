# V1 Scope Definition

## Primary Goal

Ship **d.o. Gist Hub**, a production-ready GitHub Gist management app with offline-first behavior and Android packaging.

## Feature List v1

### Authentication
- [x] Fine-grained PAT input in Settings
- [x] PAT validation on save (test request to GitHub API)
- [x] PAT stored securely in IndexedDB
- [x] PAT redacted in UI after save
- [x] Token wipe/reset flow
- [ ] OAuth device flow (v2)

### Gist Operations
- [x] List user gists (pagination)
- [x] List starred gists
- [x] View gist detail
- [x] Create new gist (single/multi-file)
- [x] Edit existing gist
- [x] Delete gist (with confirmation)
- [x] Star/unstar gist
- [x] Fork gist
- [x] View gist revisions/history
- [ ] Create gist from template (v2)

### Offline Behavior
- [x] Cache gists in IndexedDB
- [x] Read from cache when offline
- [x] Queue writes when offline
- [x] Sync queue on reconnect
- [x] Show offline indicator
- [x] Show last-synced timestamp
- [ ] Conflict resolution UI (basic surfacing only)
- [ ] Advanced conflict resolution (v2)

### Search & Filter
- [x] Local search (client-side filter)
- [x] Filter by: All / Mine / Starred / Recent
- [x] Sort by: Created / Updated / Relevance
- [ ] Full-text search across file contents (v2)

### UI/UX
- [x] Bottom navigation (Home, Favorites, Drafts, Offline, Settings)
- [x] Responsive layout (7 breakpoints)
- [x] Dark/light theme toggle
- [x] Loading states (skeletons)
- [x] Empty states
- [x] Error states with recovery actions
- [x] Toast notifications
- [x] Confirmation dialogs
- [ ] Animations/transitions (minimal, respectful of prefers-reduced-motion)

### Settings
- [x] GitHub PAT management
- [x] Theme selection (auto/dark/light)
- [x] Font size adjustment
- [x] Cache controls (clear cache)
- [x] Diagnostics export
- [x] App reset (clear all data)
- [ ] Backup/export gists (v2)

### PWA
- [x] Web app manifest
- [x] Service worker registration
- [x] Offline fallback page
- [x] Install prompt
- [x] Update notification
- [ ] Background sync (v2, browser support varies)

### Android Packaging
- [x] Capacitor integration
- [x] Android project configuration
- [x] WebView validation
- [x] Emulator testing
- [ ] Real device testing
- [ ] Play Store preparation (v2)

### Performance
- [x] Web Vitals measurement (LCP, FID, CLS, INP)
- [x] Bundle size budgets
- [x] Code splitting by route
- [x] Lazy loading for heavy features
- [x] Image/icon optimization
- [ ] Performance CI checks (v2)

### Security
- [x] CSP headers
- [x] PAT redaction in logs
- [x] Input sanitization
- [x] Safe raw content rendering
- [x] External link handling
- [ ] Dependency vulnerability scanning (v2)

### Testing
- [x] Playwright browser tests
- [x] Mobile emulation tests
- [x] Offline scenario tests
- [x] Error state tests
- [ ] Android WebView smoke tests
- [ ] Visual regression tests (v2)
- [ ] Accessibility tests (v2)

## Non-Goals v1

These are explicitly out of scope:

1. **OAuth Authentication**: Use fine-grained PAT only
2. **Backend Server**: All client-side, no sync server
3. **Real-time Collaboration**: Single-user focus
4. **Multi-Account Support**: One GitHub account per install
5. **iOS Packaging**: Android only via Capacitor
6. **Push Notifications**: No native notifications
7. **Advanced Conflict Resolution**: Surface conflicts, manual resolution
8. **Full-text Search**: Client-side metadata search only
9. **Gist Comments**: View-only if time permits
10. **Team/Org Gists**: Personal gists only

## Acceptance Criteria

### Functional
- User can authenticate with GitHub PAT
- User can list, create, read, update, delete gists
- User can star/unstar and fork gists
- User can view gist revisions
- App works offline for cached data
- Writes queue when offline, sync on reconnect

### UX
- App is responsive from 320px to 1536px+
- Bottom navigation works on mobile
- Dark/light themes both usable
- Loading, empty, and error states clear
- Touch targets >= 44x44px on mobile

### Performance
- Cold start < 2s on mid-tier mobile
- Gist list interaction < 100ms
- Local search < 200ms
- Editor open < 300ms
- LCP < 2.5s, CLS < 0.1, INP < 200ms

### Security
- PAT never logged or exposed in UI
- CSP configured and enforced
- No hardcoded secrets in code
- Raw gist content rendered safely

### Reliability
- No silent failures
- All errors have user-safe messages
- Recovery actions offered where applicable
- Offline transitions clear

---

*Created: 2026. Status: Active.*
