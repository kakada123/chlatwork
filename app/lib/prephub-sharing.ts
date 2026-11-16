/** Capability URLs must stay out of telemetry and search indexes, even on the legacy main-host path. */
export function isPrepPublicPath(path: string) {
  return /^\/(?:prephub\/)?shared\//.test(path);
}
export function filterPrepShareTelemetry<T extends { url: string }>(
  event: T,
): T | null {
  try {
    return isPrepPublicPath(new URL(event.url).pathname) ? null : event;
  } catch {
    return null;
  }
}

/** Runs before gtag loads. Keep the document blocked after a public visit so late events cannot carry its URL. */
export function prepShareGoogleGuardScript(measurementId: string) {
  return `(() => {
    const key = ${JSON.stringify("ga-disable-" + measurementId)};
    const protect = () => {
      if (/^\\/(?:prephub\\/)?shared\\//.test(window.location.pathname)) window[key] = true;
    };
    protect();
    window.addEventListener('popstate', protect, true);
  })();`;
}
