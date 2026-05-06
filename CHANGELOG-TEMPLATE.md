# Changelog Template

Use this template when adding a new release section to [CHANGELOG.md](./CHANGELOG.md).

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security improvements

[X.Y.Z]: https://github.com/d-o-hub/do-gist-hub/releases/tag/vX.Y.Z
```

## Release Checklist

- [ ] Update `VERSION` file
- [ ] Update `package.json` version
- [ ] Add release section to `CHANGELOG.md`
- [ ] Run `./scripts/quality_gate.sh`
- [ ] Create Git tag matching VERSION exactly
- [ ] Push tag to trigger release workflow
- [ ] Verify release artifacts
