# Project Charter: d.o. Gist Hub

## Vision

Build the easiest serious production path for a personal GitHub Gist management app that works offline-first, packages for Android, and uses a token-driven design system.

## Mission Statement

Create **d.o. Gist Hub**, a web-first PWA that provides full GitHub Gist CRUD operations with offline support, polished mobile UX, and measurable performance discipline.

## Success Criteria

1. **Functional**: Full gist CRUD (create, read, update, delete) plus star/unstar/fork/revisions
2. **Offline**: Read cached gists offline, queue writes for sync
3. **Mobile**: Bottom navigation, responsive from 320px to 1536px+
4. **Performance**: Cold start < 2s, interaction < 100ms, Web Vitals tracked
5. **Security**: PAT redacted, CSP configured, no hardcoded secrets
6. **Reliability**: No silent failures, clear error states, recovery actions
7. **Android**: Packaged via Capacitor, validated on emulator/device

## Scope v1 (This Project)

### In Scope
- Fine-grained GitHub PAT authentication
- IndexedDB local storage
- Web-first PWA architecture
- Capacitor Android packaging
- Full gist CRUD operations
- Star/unstar/fork/revisions
- Offline read, queued writes
- Basic conflict surfacing
- Token-driven design system
- Responsive UI (7 breakpoints)
- Global error handling
- Security hardening
- Memory leak prevention
- Performance budgets

### Out of Scope (v2+)
- OAuth device flow
- Backend sync server
- Real-time collaboration
- Advanced conflict resolution
- Multi-account support
- Turso/edge database
- Push notifications
- iOS packaging

## Constraints

- No backend for v1
- No Turso unless proven hard requirement
- No OAuth/device flow unless proven hard requirement
- No premature sync complexity
- No hardcoded secrets
- No unsafe logging
- No silent failures
- No memory-leak-prone patterns
- No performance-blind implementation
- No single-breakpoint UI

## Timeline

- Phase 1: Foundation (weeks 1-2) - Repo setup, tokens, architecture
- Phase 2: Core (weeks 3-4) - Data layer, GitHub API, basic UI
- Phase 3: Polish (weeks 5-6) - Error handling, security, performance
- Phase 4: Packaging (weeks 7-8) - PWA, Android, testing, docs

## Stakeholders

- Primary User: Individual developer managing gists
- Secondary Users: Team members viewing shared gists
- Maintainers: AI agents + human developers

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| GitHub API changes | High | Low | Follow official docs, version pinning |
| IndexedDB browser support | Medium | Low | Feature detection, graceful fallback |
| PAT security concerns | High | Medium | Least privilege, redaction, wipe flow |
| Android WebView fragmentation | Medium | Medium | Test on multiple devices/emulators |
| Performance regression | Medium | High | Budgets, measurement, CI checks |

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Tests passing (browser, mobile, offline, Android)
- [ ] Performance budgets verified
- [x] Security review complete
- [x] Documentation updated
- [x] ADRs reviewed and approved

---

*Created: 2026. Status: Active.*
