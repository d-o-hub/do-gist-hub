import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/db', () => ({
  getMetadata: vi.fn(),
  setMetadata: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
}));

import { getMetadata, setMetadata } from '../../src/services/db';
import { safeLog } from '../../src/services/security/logger';

const createMockData = (overrides: Partial<AuthTelemetryData> = {}): AuthTelemetryData => ({
  patCount: 0,
  deviceFlowCount: 0,
  authCompletedAt: null,
  timeToFirstApiCallDeltas: [],
  ...overrides,
});

// Lazy-loaded module reference for tests that need a fresh module state.
// The telemetry module keeps a module-level `firstApiCallRecorded` singleton
// flag, so we re-import the module to reset it between tests.
type TelemetryModule = typeof import('../../src/services/telemetry/auth-telemetry');

let telemetryModule: TelemetryModule;

const loadTelemetry = (): Promise<TelemetryModule> => {
  vi.resetModules();
  return import('../../src/services/telemetry/auth-telemetry');
};

interface AuthTelemetryData {
  patCount: number;
  deviceFlowCount: number;
  authCompletedAt: number | null;
  timeToFirstApiCallDeltas: number[];
}

describe('auth-telemetry', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    telemetryModule = await loadTelemetry();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('readTelemetry', () => {
    it('returns default data when no metadata exists', async () => {
      vi.mocked(getMetadata).mockResolvedValue(undefined);
      const data = await telemetryModule.readTelemetry();
      expect(data).toEqual({
        patCount: 0,
        deviceFlowCount: 0,
        authCompletedAt: null,
        timeToFirstApiCallDeltas: [],
      });
    });

    it('returns existing data when present', async () => {
      const existing = createMockData({ patCount: 5, deviceFlowCount: 2 });
      vi.mocked(getMetadata).mockResolvedValue(existing);
      const data = await telemetryModule.readTelemetry();
      expect(data.patCount).toBe(5);
      expect(data.deviceFlowCount).toBe(2);
    });
  });

  describe('recordAuthMethod', () => {
    it('increments patCount for PAT method', async () => {
      vi.mocked(getMetadata).mockResolvedValue(createMockData());
      await telemetryModule.recordAuthMethod('pat');
      expect(setMetadata).toHaveBeenCalledWith(
        'auth-telemetry',
        expect.objectContaining({ patCount: 1 })
      );
    });

    it('increments deviceFlowCount for device-flow method', async () => {
      vi.mocked(getMetadata).mockResolvedValue(createMockData());
      await telemetryModule.recordAuthMethod('device-flow');
      expect(setMetadata).toHaveBeenCalledWith(
        'auth-telemetry',
        expect.objectContaining({ deviceFlowCount: 1 })
      );
    });

    it('accumulates counts across multiple calls', async () => {
      vi.mocked(getMetadata).mockResolvedValue(createMockData({ patCount: 2 }));
      await telemetryModule.recordAuthMethod('pat');
      expect(setMetadata).toHaveBeenCalledWith(
        'auth-telemetry',
        expect.objectContaining({ patCount: 3 })
      );
    });
  });

  describe('recordAuthCompleted', () => {
    it('sets authCompletedAt to current timestamp', async () => {
      vi.mocked(getMetadata).mockResolvedValue(createMockData());
      const before = Date.now();
      await telemetryModule.recordAuthCompleted();
      const after = Date.now();
      const writeCall = vi.mocked(setMetadata).mock.calls[0];
      expect(writeCall).toBeDefined();
      const written = writeCall?.[1] as AuthTelemetryData;
      expect(written.authCompletedAt).toBeGreaterThanOrEqual(before);
      expect(written.authCompletedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('recordFirstApiCall', () => {
    it('returns early when no authCompletedAt is set', async () => {
      vi.mocked(getMetadata).mockResolvedValue(createMockData());
      await telemetryModule.recordFirstApiCall();
      expect(setMetadata).not.toHaveBeenCalled();
    });

    it('records delta and clears authCompletedAt when called after auth', async () => {
      const authAt = Date.now() - 1500;
      vi.mocked(getMetadata).mockResolvedValue(createMockData({ authCompletedAt: authAt }));
      await telemetryModule.recordFirstApiCall();
      const writeCall = vi.mocked(setMetadata).mock.calls[0];
      expect(writeCall).toBeDefined();
      const written = writeCall?.[1] as AuthTelemetryData;
      expect(written.timeToFirstApiCallDeltas).toHaveLength(1);
      const delta = written.timeToFirstApiCallDeltas[0];
      expect(delta).toBeDefined();
      expect(delta!).toBeGreaterThanOrEqual(1500);
      expect(written.authCompletedAt).toBeNull();
    });

    it('does not record a second time after a delta is recorded (singleton guard)', async () => {
      vi.mocked(getMetadata).mockResolvedValue(
        createMockData({ authCompletedAt: Date.now() - 500 })
      );
      await telemetryModule.recordFirstApiCall();
      const firstCallCount = vi.mocked(setMetadata).mock.calls.length;
      expect(firstCallCount).toBeGreaterThan(0);

      // Second call: authCompletedAt is now null after the first call
      vi.mocked(getMetadata).mockResolvedValue(createMockData());
      await telemetryModule.recordFirstApiCall();
      // No additional write since the function returned early
      const secondCallCount = vi.mocked(setMetadata).mock.calls.length;
      expect(secondCallCount).toBe(firstCallCount);
    });

    it('caps deltas at MAX_DELTAS (100) keeping the most recent', async () => {
      const existing: number[] = [];
      for (let i = 0; i < 100; i++) existing.push(i);
      vi.mocked(getMetadata).mockResolvedValue(
        createMockData({
          authCompletedAt: Date.now() - 100,
          timeToFirstApiCallDeltas: existing,
        })
      );
      await telemetryModule.recordFirstApiCall();
      const writeCall = vi.mocked(setMetadata).mock.calls[0];
      const written = writeCall?.[1] as AuthTelemetryData;
      expect(written.timeToFirstApiCallDeltas).toHaveLength(100);
      expect(written.timeToFirstApiCallDeltas[0]).toBe(1);
    });
  });

  describe('logAuthTelemetry', () => {
    it('does nothing when total auth count is zero', async () => {
      vi.mocked(getMetadata).mockResolvedValue(createMockData());
      await telemetryModule.logAuthTelemetry();
      expect(safeLog).not.toHaveBeenCalled();
    });

    it('logs counts and median for collected samples', async () => {
      vi.mocked(getMetadata).mockResolvedValue(
        createMockData({
          patCount: 3,
          deviceFlowCount: 1,
          timeToFirstApiCallDeltas: [100, 200, 300],
        })
      );
      await telemetryModule.logAuthTelemetry();
      expect(safeLog).toHaveBeenCalled();
      const message = vi.mocked(safeLog).mock.calls[0]?.[0];
      expect(message).toContain('3 PAT');
      expect(message).toContain('1 Device Flow');
      expect(message).toContain('median: 200ms');
    });

    it('handles even-length delta arrays for median', async () => {
      vi.mocked(getMetadata).mockResolvedValue(
        createMockData({
          patCount: 1,
          timeToFirstApiCallDeltas: [100, 200, 300, 400],
        })
      );
      await telemetryModule.logAuthTelemetry();
      const message = vi.mocked(safeLog).mock.calls[0]?.[0];
      expect(message).toContain('median: 250ms');
    });

    it('logs without median when no deltas exist', async () => {
      vi.mocked(getMetadata).mockResolvedValue(createMockData({ patCount: 1 }));
      await telemetryModule.logAuthTelemetry();
      const message = vi.mocked(safeLog).mock.calls[0]?.[0];
      expect(message).toContain('1 PAT');
      expect(message).toContain('0 samples');
      expect(message).not.toContain('median:');
    });
  });
});
