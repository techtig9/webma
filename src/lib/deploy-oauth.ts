// Per-user OAuth for deploy providers — lets a site deploy under the CUSTOMER's own
// Vercel/Netlify account instead of Techtig's platform-level token. This requires
// registering an OAuth application in each provider's dashboard first:
//   Vercel:  https://vercel.com/dashboard/integrations/console -> Create Integration
//   Netlify: https://app.netlify.com/user/applications -> New OAuth application
// Both need a redirect URI of `${NEXT_PUBLIC_APP_URL}/api/deploy-oauth/<provider>/callback`.
// Until VERCEL_OAUTH_CLIENT_ID / NETLIFY_OAUTH_CLIENT_ID are set, the authorize routes
// return a clear error instead of a broken redirect — deploys keep working via the
// platform token in the meantime (see src/lib/deploy.ts).

import crypto from "crypto";

export type DeployProvider = "vercel" | "netlify";

interface OAuthConfig {
  clientId: string | undefined;
  clientSecret: string | undefined;
  authorizeUrl: string;
  tokenUrl: string;
}

function configFor(provider: DeployProvider): OAuthConfig {
  if (provider === "vercel") {
    return {
      clientId: process.env.VERCEL_OAUTH_CLIENT_ID,
      clientSecret: process.env.VERCEL_OAUTH_CLIENT_SECRET,
      authorizeUrl: "https://vercel.com/oauth/authorize",
      tokenUrl: "https://api.vercel.com/v2/oauth/access_token",
    };
  }
  return {
    clientId: process.env.NETLIFY_OAUTH_CLIENT_ID,
    clientSecret: process.env.NETLIFY_OAUTH_CLIENT_SECRET,
    authorizeUrl: "https://app.netlify.com/authorize",
    tokenUrl: "https://api.netlify.com/oauth/token",
  };
}

function redirectUri(provider: DeployProvider) {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/deploy-oauth/${provider}/callback`;
}

/** Builds the provider's authorize URL, or null if that provider's OAuth app isn't configured yet. */
export function buildAuthorizeUrl(provider: DeployProvider, state: string): string | null {
  const cfg = configFor(provider);
  if (!cfg.clientId) return null;

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri(provider),
    state,
    ...(provider === "netlify" ? { response_type: "code" } : {}),
  });
  return `${cfg.authorizeUrl}?${params.toString()}`;
}

export interface TokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

/** Signs `${userId}.${timestamp}` so the callback (an unauthenticated redirect from
 * the provider) can recover which user started the flow, without a server-side
 * pending-request table. Rejects anything older than 10 minutes. */
export function signOAuthState(provider: DeployProvider, userId: string): string {
  const cfg = configFor(provider);
  const payload = `${userId}.${Date.now()}`;
  const sig = crypto.createHmac("sha256", cfg.clientSecret ?? "unconfigured").update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyOAuthState(provider: DeployProvider, state: string): string | null {
  const [userId, ts, sig] = state.split(".");
  if (!userId || !ts || !sig) return null;

  const cfg = configFor(provider);
  const expected = crypto
    .createHmac("sha256", cfg.clientSecret ?? "unconfigured")
    .update(`${userId}.${ts}`)
    .digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sig, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Date.now() - Number(ts) > 10 * 60 * 1000) return null; // expired

  return userId;
}

/** Exchanges an OAuth `code` for an access token. Throws if the provider's OAuth app
 * isn't configured or the provider rejects the exchange. */
export async function exchangeCodeForToken(provider: DeployProvider, code: string): Promise<TokenResult> {
  const cfg = configFor(provider);
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Error(`${provider} OAuth isn't configured (missing client id/secret).`);
  }

  const body =
    provider === "vercel"
      ? new URLSearchParams({
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          code,
          redirect_uri: redirectUri(provider),
        })
      : new URLSearchParams({
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          code,
          redirect_uri: redirectUri(provider),
          grant_type: "authorization_code",
        });

  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? `${provider} token exchange failed.`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined,
  };
}
