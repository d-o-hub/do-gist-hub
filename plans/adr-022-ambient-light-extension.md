# ADR-022 Extension: Ambient Light Sensor Theming

> **Status**: Proposed (backlog)  
> **Priority**: P3  
> **Effort**: High (requires Permissions API, sensor hardware, privacy review)  
> **Depends on**: Goal 3 (time-based theming) complete  

---

## Context

ADR-022 (2026 UI Trends) calls for "context-aware theming beyond dark/light: time-of-day, ambient light, content-type adaptation." Goal 3 of Phase B GOAP (`plans/028-goap-phase-b-adr22-completion.md`) implements time-of-day auto-switching. This document defines the architecture for the next step: **ambient light sensor-based theming**.

## Problem

- `AmbientLightSensor` is not universally supported (Chrome/Edge behind flag, Firefox unsupported)
- Requires `ambient-light-sensor` permission via Permissions API
- Privacy-sensitive: raw lux values must not be logged or transmitted
- Must degrade gracefully to time-based theming when sensor unavailable

## Proposed Architecture

### 1. Permission Flow

```typescript
async function requestAmbientLightPermission(): Promise<boolean> {
  if (!('AmbientLightSensor' in window)) return false;
  try {
    const result = await navigator.permissions.query({ name: 'ambient-light-sensor' as PermissionName });
    return result.state === 'granted';
  } catch {
    return false;
  }
}
```

- User must explicitly opt-in via Settings UI
- Permission request triggered only by direct user action (button click)
- Denied permission → silently fall back to time-based theme

### 2. Sensor Integration

```typescript
interface AmbientLightSensor {
  illuminance: number;
  start(): Promise<void>;
  stop(): void;
  onreading: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}

function createAmbientLightSensor(): AmbientLightSensor | null {
  if (!('AmbientLightSensor' in window)) return null;
  try {
    return new (window as unknown as { AmbientLightSensor: new () => AmbientLightSensor }).AmbientLightSensor();
  } catch {
    return null;
  }
}
```

### 3. Theme Resolution Logic

```typescript
function resolveAmbientTheme(lux: number): 'light' | 'dark' {
  if (lux < 50) return 'dark';      // Dim environment
  if (lux < 200) return 'dark';     // Indoor evening
  return 'light';                   // Well-lit
}
```

Thresholds based on W3C Ambient Light Sensor use cases:
- < 50 lux: dark room, night
- 50–200 lux: indoor ambient
- > 200 lux: bright indoor / outdoor

### 4. Lifecycle & Memory Safety

- Sensor instance must be wrapped in an `AbortController` for cleanup
- `stop()` called on route change (via `lifecycle.cleanupRoute()`)
- No persistent sensor polling when app is backgrounded
- Reading frequency capped at 1 Hz to preserve battery

### 5. Privacy & Security

- Lux values **never** logged, stored, or transmitted
- `safeLog` must redact any accidental sensor readings
- Sensor access disabled in non-secure contexts (already enforced by browser)
- User can revoke permission at any time; app degrades to time-based

### 6. Settings UI Extension

Add to `src/routes/settings.ts` theme selector:
```html
<option value="ambient">Ambient Light (Opt-in)</option>
```

When selected:
1. Show permission explanation dialog
2. Request `ambient-light-sensor` permission
3. On grant: start sensor, apply theme based on readings
4. On deny: fallback to `time` mode, show toast explaining fallback

### 7. Integration Points

| File | Change |
|------|--------|
| `src/tokens/design-tokens.ts` | Add `resolveAmbientTheme(lux)`, extend `resolveTheme()` with `'ambient'` case |
| `src/routes/settings.ts` | Add ambient option, permission flow, sensor lifecycle |
| `src/services/lifecycle.ts` | Add `cleanupAmbientSensor()` to route cleanup |
| `src/styles/base.css` | Smooth CSS transition on `background-color` when theme changes from sensor |

### 8. Testing Strategy

- **Unit**: Mock `AmbientLightSensor` with `Object.defineProperty(window, 'AmbientLightSensor', ...)`
- **E2E**: Manual testing on devices with ambient light sensors (most Android phones, some laptops)
- **CI**: Skip ambient light tests in CI (no sensor hardware); assert fallback behavior

## Decision

**Defer implementation.** The ambient light sensor API has limited browser support and requires hardware access. The architecture above provides a clear implementation path when:
1. Browser support broadens (tracked via caniuse)
2. User demand justifies the complexity
3. Time-based theming (Goal 3) has proven stable in production

## Fallback Strategy

When `'ambient'` mode is selected but sensor unavailable:
1. Automatically degrade to `'time'` mode
2. Show toast: "Ambient light sensor unavailable. Using time-based theme instead."
3. Store `'time'` as the effective preference, keep `'ambient'` as user intent for retry

## References

- [W3C Ambient Light Sensor](https://www.w3.org/TR/ambient-light/)
- [MDN: AmbientLightSensor](https://developer.mozilla.org/en-US/docs/Web/API/AmbientLightSensor)
- [Permissions API: ambient-light-sensor](https://w3c.github.io/permissions/#ambient-light-sensor)
- ADR-022: 2026 UI Trends (`plans/adr-022-2026-ui-trends-recommendations.md`)
- Phase B GOAP (`plans/028-goap-phase-b-adr22-completion.md`)

---

*Created: 2026-07-18. Status: Proposed / Backlog.*
