// Per-user OAuth for deploy — lets a site deploy under the CUSTOMER's own Vercel
// account instead of Techtig's platform-level token. This requires registering an
// OAuth application in Vercel's dashboard first:
//   https://vercel.com/dashboard/integrations/console -> Create Integration
// Needs a redirect URI of `${NEXT_PUBLIC_APP_URL}/api/deploy-oauth/vercel/callback`.
// Until VERCEL_OAUTH_CLIENT_ID is set, the authorize route returns a clear error
// instead of a broken redirect — deploys keep working via the platform token in
// the meantime (see src/lib/deploy.ts).

import crypto from "crypto";

export type DeployProvider = "vercel";

interface OAuthConfig {
  clientId: string | undefined;
  clientSecret: string | undefined;
  authorizeUrl: string;
  tokenUrl: string;
}

function configFor(provider: DeployProvider): OAuthConfig {
  return {
    clientId: process.env.VERCEL_OAUTH_CLIENT_ID,
    clientSecret: process.env.VERCEL_OAUTH_CLIENT_SECRET,
    authorizeUrl: "https://vercel.com/oauth/authorize",
    tokenUrl: "https://api.vercel.com/v2/oauth/access_token",
  };
}

function redirectUri(provider: DeployProvider) {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/deploy-oauth/${provider}/callback`;
}

export function buildAuthorizeUrl(provider: DeployProvider, state: string): string | null {
  const cfg = configFor(provider);
  if (!cfg.clientId) return null;

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri(provider),
    state,
  });
  return `${cfg.authorizeUrl}?${params.toString()}`;
}

export interface TokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

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
  if (Date.now() - Number(ts) > 10 * 60 * 1000) return null;

  return userId;
}

export async function exchangeCodeForToken(provider: DeployProvider, code: string): Promise<TokenResult> {
  const cfg = configFor(provider);
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Error(`${provider} OAuth isn't configured (missing client id/secret).`);
  }

  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    redirect_uri: redirectUri(provider),
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
