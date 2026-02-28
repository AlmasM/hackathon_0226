/**
 * Logging for Google Maps API setup and auth failures.
 * Use for debugging AuthFailure / key issues. Does not log the full API key.
 */

const LOG_PREFIX = "[Maps]";

export function logMapsConfig(apiKey: string): void {
  const raw = typeof apiKey === "string" ? apiKey : "";
  const trimmed = raw.trim();
  const isSet = trimmed.length > 0;

  const looksLikePlaceholder =
    !isSet ||
    /your-.*-key-here|your-.*-api-key|replace-this|example\.com/i.test(trimmed) ||
    (trimmed.length < 30 && !/^AIza[Sy]/i.test(trimmed));

  console.info(`${LOG_PREFIX} Config:`, {
    keyPresent: isSet,
    keyLength: trimmed.length,
    keyPreview: isSet
      ? `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`
      : "(none)",
    looksLikePlaceholder: looksLikePlaceholder,
    origin: typeof window !== "undefined" ? window.location.origin : "(ssr)",
    href:
      typeof window !== "undefined"
        ? window.location.href
        : "(ssr)",
  });

  if (looksLikePlaceholder) {
    console.warn(
      `${LOG_PREFIX} The value of VITE_GOOGLE_MAPS_API_KEY looks like a placeholder, not a real key. ` +
        `Put your actual Google Maps API key in apps/frontend/.env (create the file if needed), then restart the dev server. ` +
        `Get a key from Google Cloud Console → APIs & Services → Credentials, and enable "Maps JavaScript API".`
    );
  }

  if (!isSet) {
    console.info(
      `${LOG_PREFIX} No API key. Set VITE_GOOGLE_MAPS_API_KEY in apps/frontend/.env and enable Maps JavaScript API in Google Cloud.`
    );
  }
}

export function logMapsAuthFailure(): void {
  console.error(
    `${LOG_PREFIX} AuthFailure: Google Maps rejected the API key.`,
    {
      checklist: [
        "1. Enable 'Maps JavaScript API' in Google Cloud Console → APIs & Services → Library",
        "2. If the key has HTTP referrer restrictions, add your origin to allowed referrers (e.g. http://localhost:5173)",
        "3. Ensure billing is enabled for the project (Maps often requires it even for free tier)",
        "4. Confirm you are using the correct key (same project where Maps JavaScript API is enabled)",
      ],
      currentOrigin:
        typeof window !== "undefined" ? window.location.origin : "(ssr)",
    }
  );
}

/**
 * Register the global gm_authFailure callback so we log and dispatch when Google
 * calls it. Must be called before the Maps script loads (e.g. in main.tsx).
 */
export function registerMapsAuthFailureCallback(): void {
  if (typeof window === "undefined") return;

  (window as unknown as { gm_authFailure?: () => void }).gm_authFailure =
    function gm_authFailure() {
      logMapsAuthFailure();
      window.dispatchEvent(new CustomEvent("maps-auth-failure"));
    };

  console.info(
    `${LOG_PREFIX} gm_authFailure callback registered (will log and dispatch 'maps-auth-failure' on auth error).`
  );
}
