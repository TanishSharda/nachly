const CANONICAL_GUEST_KEY = "naachly_guest_id";
const LEGACY_GUEST_KEYS = ["naachly_scroll_anon", "naachly_user_id"];
const GUEST_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function createGuestId() {
  return `guest_${Math.random().toString(36).slice(2, 10)}`;
}

function persistGuestCookie(guestId: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${CANONICAL_GUEST_KEY}=${encodeURIComponent(guestId)}; Max-Age=${GUEST_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

function readLegacyGuestId() {
  if (typeof window === "undefined") return "";

  for (const key of LEGACY_GUEST_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value) return value;
  }

  return "";
}

export function getExistingGuestId() {
  if (typeof window === "undefined") return "";

  const canonicalValue = window.localStorage.getItem(CANONICAL_GUEST_KEY);
  if (canonicalValue) {
    persistGuestCookie(canonicalValue);
    return canonicalValue;
  }

  const legacyValue = readLegacyGuestId();
  if (legacyValue) {
    window.localStorage.setItem(CANONICAL_GUEST_KEY, legacyValue);
    persistGuestCookie(legacyValue);
    return legacyValue;
  }

  return "";
}

export function getOrCreateGuestId() {
  if (typeof window === "undefined") return "anon";

  const existing = getExistingGuestId();
  if (existing) return existing;

  const created = createGuestId();
  window.localStorage.setItem(CANONICAL_GUEST_KEY, created);
  persistGuestCookie(created);
  return created;
}
