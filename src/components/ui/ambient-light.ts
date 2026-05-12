/**
 * Ambient Light Sensor Theming
 * Opt-in sensor-based theme adaptation with privacy-safe lux value handling.
 * Falls back to time-based theming when sensor is unavailable or permission denied.
 */

import { cleanupThemeSystem, initTheme } from '../../tokens/design-tokens';
import { toast } from './toast';

let sensorInstance: AmbientLightSensorLike | null = null;
let sensorAbortController: AbortController | null = null;

/**
 * Minimal ambient light sensor interface for browsers that support it.
 */
interface AmbientLightSensorLike {
  illuminance: number;
  start(): void;
  stop(): void;
  onreading: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}

/**
 * Resolve ambient lux value to a light/dark theme.
 * Thresholds based on W3C Ambient Light Sensor use cases.
 */
export function resolveAmbientTheme(lux: number): 'light' | 'dark' {
  // < 200 lux: dim room / indoor ambient → dark
  // ≥ 200 lux: well-lit → light
  return lux < 200 ? 'dark' : 'light';
}

/**
 * Check whether the AmbientLightSensor API is available in this browser.
 */
export function isAmbientLightSupported(): boolean {
  return 'AmbientLightSensor' in window;
}

/**
 * Request ambient-light-sensor permission via the Permissions API.
 * Returns true only if the user explicitly grants permission.
 */
export async function checkAmbientLightPermission(): Promise<boolean> {
  if (!isAmbientLightSupported()) return false;

  try {
    const result = await navigator.permissions.query({
      name: 'ambient-light-sensor' as PermissionName,
    });
    return result.state === 'granted';
  } catch {
    return false;
  }
}

/**
 * Create an ambient light sensor instance if the API is available.
 */
function createAmbientLightSensor(): AmbientLightSensorLike | null {
  if (!isAmbientLightSupported()) return null;

  try {
    const ctor = (window as unknown as Record<string, unknown>).AmbientLightSensor as
      | (new () => AmbientLightSensorLike)
      | undefined;

    if (!ctor) return null;
    return new ctor();
  } catch {
    return null;
  }
}

/**
 * Start the ambient light sensor and wire theme updates.
 * Sensor readings are throttled to ~1 Hz to preserve battery.
 * Lux values are never logged, stored, or transmitted.
 */
export async function startAmbientLightSensor(): Promise<boolean> {
  if (sensorInstance) {
    return true;
  }

  const granted = await checkAmbientLightPermission();
  if (!granted) {
    return false;
  }

  const sensor = createAmbientLightSensor();
  if (!sensor) {
    return false;
  }

  sensorAbortController = new AbortController();
  const signal = sensorAbortController.signal;

  // Throttle theme updates to max 1 per second
  let lastUpdate = 0;
  const THROTTLE_MS = 1_000;

  sensor.onreading = () => {
    if (signal.aborted) return;

    const now = Date.now();
    if (now - lastUpdate < THROTTLE_MS) return;
    lastUpdate = now;

    const lux = sensor.illuminance;
    const theme = resolveAmbientTheme(lux);
    const current = document.documentElement.getAttribute('data-theme') as 'light' | 'dark';

    if (current !== theme) {
      document.documentElement.setAttribute('data-theme', theme);
      window.dispatchEvent(new CustomEvent('app:theme-change', { detail: { theme } }));
    }
  };

  sensor.onerror = () => {
    // Sensor error — silently fall back to time-based theme
    cleanupAmbientLightSensor();
    initTheme();
  };

  sensorInstance = sensor;

  try {
    sensor.start();
    return true;
  } catch {
    cleanupAmbientLightSensor();
    return false;
  }
}

/**
 * Stop and clean up the ambient light sensor.
 * Should be called on route change or when switching away from ambient mode.
 */
export function cleanupAmbientLightSensor(): void {
  if (sensorAbortController) {
    sensorAbortController.abort();
    sensorAbortController = null;
  }

  if (sensorInstance) {
    try {
      sensorInstance.stop();
    } catch {
      // Ignore stop errors
    }
    sensorInstance = null;
  }

  cleanupThemeSystem();
}

/**
 * Enable ambient light theming with user-friendly permission flow.
 * On success, starts the sensor. On failure, degrades to time-based mode.
 */
export async function enableAmbientLightTheming(): Promise<boolean> {
  if (!isAmbientLightSupported()) {
    toast.info('Ambient light sensor not available. Using time-based theme instead.');
    localStorage.setItem('theme-preference', 'time');
    initTheme();
    return false;
  }

  const granted = await checkAmbientLightPermission();
  if (!granted) {
    toast.info('Ambient light permission denied. Using time-based theme instead.');
    localStorage.setItem('theme-preference', 'time');
    initTheme();
    return false;
  }

  const started = await startAmbientLightSensor();
  if (!started) {
    toast.info('Could not start ambient light sensor. Using time-based theme instead.');
    localStorage.setItem('theme-preference', 'time');
    initTheme();
    return false;
  }

  localStorage.setItem('theme-preference', 'ambient');
  toast.success('Ambient light theme active');
  return true;
}
