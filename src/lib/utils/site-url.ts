const DEFAULT_PRODUCTION_ORIGIN = "https://naachly.vercel.app";

function toOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

export function getConfiguredSiteOrigin(): string | null {
  const fromSiteUrl = toOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (fromSiteUrl) return fromSiteUrl;

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) {
    const normalized = vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
    const fromVercel = toOrigin(normalized);
    if (fromVercel) return fromVercel;
  }

  return null;
}

export function getSiteUrl(): string {
  const configured = getConfiguredSiteOrigin();
  if (configured) return configured;

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_ORIGIN;
  }

  return "http://localhost:3000";
}

export function getOAuthRedirectBaseClient(): string {
  const configured = getConfiguredSiteOrigin();
  if (typeof window === "undefined") {
    return configured || getSiteUrl();
  }

  const origin = window.location.origin;
  const hostname = window.location.hostname;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

  // On local/dev hosts, always prefer configured production origin for OAuth redirects.
  if (isLocalHost) {
    return configured || DEFAULT_PRODUCTION_ORIGIN;
  }

  // On production hosts, use the current origin so custom domains continue to work.
  return origin;
}
