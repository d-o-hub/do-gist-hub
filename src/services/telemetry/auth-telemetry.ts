/**
 * Auth Telemetry
 *
 * Anonymous, local-only counters tracking how users authenticate
 * (PAT vs Device Flow) and median time-to-first-API-call after auth.
 * Stored in IndexedDB metadata. Never sent externally.
 */

import { getMetadata, setMetadata } from '../db';
import { safeLog } from '../security/logger';

const TELEMETRY_KEY = 'auth-telemetry';
const MAX_DELTAS = 100;

export interface AuthTelemetryData {
  patCount: number;
  deviceFlowCount: number;
  authCompletedAt: number | null;
  timeToFirstApiCallDeltas: number[];
}

let firstApiCallRecorded = false;

function createDefaultTelemetry(): AuthTelemetryData {
  return {
    patCount: 0,
    deviceFlowCount: 0,
    authCompletedAt: null,
    timeToFirstApiCallDeltas: [],
  };
}

/**
 * Read the current auth telemetry data from IndexedDB.
 * Returns a default structure if no data has been persisted yet.
 */
export async function readTelemetry(): Promise<AuthTelemetryData> {
  const data = await getMetadata<AuthTelemetryData>(TELEMETRY_KEY);
  return data ?? createDefaultTelemetry();
}

async function writeTelemetry(data: AuthTelemetryData): Promise<void> {
  await setMetadata(TELEMETRY_KEY, data);
}

export async function recordAuthMethod(method: 'pat' | 'device-flow'): Promise<void> {
  const data = await readTelemetry();
  if (method === 'pat') {
    data.patCount += 1;
  } else {
    data.deviceFlowCount += 1;
  }
  await writeTelemetry(data);
}

export async function recordAuthCompleted(): Promise<void> {
  const data = await readTelemetry();
  data.authCompletedAt = Date.now();
  firstApiCallRecorded = false;
  await writeTelemetry(data);
}

export async function recordFirstApiCall(): Promise<void> {
  if (firstApiCallRecorded) return;
  const data = await readTelemetry();
  if (data.authCompletedAt === null) return;
  const delta = Date.now() - data.authCompletedAt;
  data.timeToFirstApiCallDeltas.push(delta);
  if (data.timeToFirstApiCallDeltas.length > MAX_DELTAS) {
    data.timeToFirstApiCallDeltas = data.timeToFirstApiCallDeltas.slice(-MAX_DELTAS);
  }
  data.authCompletedAt = null;
  firstApiCallRecorded = true;
  await writeTelemetry(data);
}

export async function logAuthTelemetry(): Promise<void> {
  const data = await readTelemetry();
  const total = data.patCount + data.deviceFlowCount;
  if (total === 0) return;

  const deltas = data.timeToFirstApiCallDeltas;
  let medianMs: number | null = null;
  if (deltas.length > 0) {
    const sorted = [...deltas].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    medianMs =
      sorted.length % 2 === 0
        ? Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2)
        : (sorted[mid] ?? 0);
  }

  safeLog(
    `[Telemetry] Auth methods: ${data.patCount} PAT, ${data.deviceFlowCount} Device Flow | Time-to-first-API-call: ${deltas.length} samples${medianMs !== null ? `, median: ${medianMs}ms` : ''}`
  );
}
