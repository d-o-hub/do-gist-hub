/**
 * OAuth Device Flow Proxy — Cloudflare Worker
 *
 * Proxies GitHub's Device Flow endpoints to avoid CORS issues and
 * client-side secret exposure. Stateless — no KV/Durable Objects needed.
 *
 * Deploy: wrangler deploy
 *
 * Endpoints:
 *   POST /login/device/code       → github.com/login/device/code
 *   POST /login/oauth/access_token → github.com/login/oauth/access_token
 */

const GITHUB_API = 'https://github.com';
const ALLOWED_ORIGINS = [
  'https://d-o-gist-hub.pages.dev',
  'https://do-gist-hub.vercel.app',
  /^https?:\/\/localhost:\d+$/,
];

interface Env {
  GITHUB_CLIENT_ID?: string;
}

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  interval: number;
  expires_in: number;
}

interface AccessTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = ALLOWED_ORIGINS.some((pattern) => {
    if (pattern instanceof RegExp) return pattern.test(origin ?? '');
    return origin === pattern;
  });

  return {
    'Access-Control-Allow-Origin': allowed && origin ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  };
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const corsHeaders = getCorsHeaders(request.headers.get('Origin'));
  const clientId = env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return new Response(JSON.stringify({ error: 'GITHUB_CLIENT_ID not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Route: POST /login/device/code
  if (url.pathname === '/login/device/code' && request.method === 'POST') {
    const githubResponse = await fetch(`${GITHUB_API}/login/device/code`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        scope: 'gist',
      }),
    });

    if (!githubResponse.ok) {
      return new Response(await githubResponse.text(), {
        status: githubResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = (await githubResponse.json()) as DeviceCodeResponse;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Route: POST /login/oauth/access_token
  if (url.pathname === '/login/oauth/access_token' && request.method === 'POST') {
    const body = (await request.json()) as { device_code?: string };
    const deviceCode = body?.device_code;

    if (!deviceCode) {
      return new Response(JSON.stringify({ error: 'device_code is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const githubResponse = await fetch(`${GITHUB_API}/login/oauth/access_token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    if (!githubResponse.ok) {
      return new Response(await githubResponse.text(), {
        status: githubResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = (await githubResponse.json()) as AccessTokenResponse;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 404 for unmatched routes
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export default {
  fetch: handleRequest,
};
