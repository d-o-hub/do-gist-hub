/**
 * OAuth Device Flow Service
 *
 * Implements GitHub's Device Flow for browser-based authentication.
 * Uses the auth-proxy Cloudflare Worker to avoid CORS issues and
 * client-side secret exposure.
 *
 * Flow:
 *   1. Request device code from proxy → user gets user_code + verification_uri
 *   2. User visits github.com/login/device and enters the code
 *   3. App polls for access token until user completes auth
 *   4. Token is stored via the existing auth service (encrypted at rest)
 *
 * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 */

import { noop } from '../../utils/noop';
import { recordAuthCompleted, recordAuthMethod } from '../telemetry/auth-telemetry';
import { saveToken } from './auth';

// Configurable via window.__AUTH_PROXY_URL
const DEFAULT_PROXY_URL = 'https://auth-proxy.d-o-gist-hub.workers.dev';

function getProxyUrl(): string {
  if (typeof window !== 'undefined') {
    const win = window as { __AUTH_PROXY_URL?: string };
    if (win.__AUTH_PROXY_URL) return win.__AUTH_PROXY_URL;
  }
  return DEFAULT_PROXY_URL;
}

/**
 * Device code response from GitHub
 */
export interface DeviceCode {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  interval: number;
  expiresIn: number;
}

/**
 * Token polling result
 */
export interface DeviceFlowResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
  errorDescription?: string;
}

/**
 * Step 1: Request a device code from GitHub via the auth proxy
 */
export async function requestDeviceCode(): Promise<DeviceCode> {
  const proxyUrl = getProxyUrl();
  const response = await fetch(`${proxyUrl}/login/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Failed to request device code: ${response.status} ${errBody}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    interval: data.interval || 5,
    expiresIn: data.expires_in || 900,
  };
}

/**
 * Step 2: Poll for access token.
 *
 * Calls back with the current poll status so the UI can show progress.
 * Returns the result on success, expiration, or fatal error.
 *
 * @param deviceCode - The device code from requestDeviceCode()
 * @param expiresIn - Time in seconds before the code expires
 * @param interval - Polling interval in seconds (from GitHub)
 * @param onProgress - Optional callback for UI updates
 */
export async function pollForToken(
  deviceCode: string,
  expiresIn: number,
  interval: number,
  onProgress?: (status: string) => void
): Promise<DeviceFlowResult> {
  const proxyUrl = getProxyUrl();
  const startTime = Date.now();
  const timeoutMs = expiresIn * 1000;
  const pollIntervalMs = interval * 1000;

  onProgress?.('Waiting for authentication...');

  while (Date.now() - startTime < timeoutMs) {
    // Wait for the polling interval
    await delay(pollIntervalMs);

    try {
      const response = await fetch(`${proxyUrl}/login/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_code: deviceCode }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: 'network_error',
          errorDescription: `Proxy returned ${response.status}`,
        };
      }

      const data = await response.json();

      // Success — token received
      if (data.access_token) {
        return {
          success: true,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
        };
      }

      // Handle polling errors
      if (data.error) {
        switch (data.error) {
          case 'authorization_pending':
            // Normal — user hasn't completed auth yet
            onProgress?.('Waiting for authentication...');
            break;
          case 'slow_down':
            // GitHub asks us to slow down — increase interval by 5s
            onProgress?.('Slowing down polling...');
            await delay(pollIntervalMs * 2);
            break;
          case 'expired_token':
            return {
              success: false,
              error: 'expired_token',
              errorDescription: 'The device code expired. Please try again.',
            };
          case 'access_denied':
            return {
              success: false,
              error: 'access_denied',
              errorDescription: 'You denied the authorization request.',
            };
          default:
            return {
              success: false,
              error: data.error,
              errorDescription: data.error_description || 'Unknown error during polling',
            };
        }
      }
    } catch (err) {
      return {
        success: false,
        error: 'network_error',
        errorDescription: err instanceof Error ? err.message : 'Network error during polling',
      };
    }
  }

  return {
    success: false,
    error: 'timeout',
    errorDescription: 'Authentication timed out. Please try again.',
  };
}

/**
 * Complete OAuth device flow: request code, poll, and save token.
 *
 * This is the high-level API for the settings UI.
 *
 * @param onProgress - Callback invoked with status messages for UI display
 * @returns DeviceFlowResult with success status, error details, and optional token
 */
export async function authenticateWithDeviceFlow(
  onProgress?: (status: string) => void
): Promise<DeviceFlowResult> {
  try {
    onProgress?.('Connecting to GitHub...');

    // Step 1: Request device code
    const code = await requestDeviceCode();

    onProgress?.(`Visit ${code.verificationUri} and enter code: ${code.userCode}`);

    // Step 2: Poll for token
    const result = await pollForToken(code.deviceCode, code.expiresIn, code.interval, onProgress);

    if (!result.success || !result.accessToken) {
      return result;
    }

    // Step 3: Save token via the existing auth service
    onProgress?.('Saving token...');
    const saveResult = await saveToken(result.accessToken);

    if (!saveResult.success) {
      return {
        success: false,
        error: 'save_error',
        errorDescription: saveResult.error || 'Failed to save token',
      };
    }

    // Fire-and-forget telemetry (must not block success)
    recordAuthMethod('device-flow').catch(noop);
    recordAuthCompleted().catch(noop);

    // Store refresh token in its own try/catch (must not block success)
    if (result.refreshToken && result.expiresIn) {
      try {
        const { storeRefreshToken } = await import('./auth');
        await storeRefreshToken(result.refreshToken, result.expiresIn);
      } catch {
        // Refresh token storage is non-critical
      }
    }

    return { success: true, accessToken: result.accessToken };
  } catch (err) {
    return {
      success: false,
      error: 'unexpected_error',
      errorDescription: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
