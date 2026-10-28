// Do not silently accept numeric prefixes ("10usd") or coerce booleans/arrays on paid endpoints.
export function foodNumber(value: unknown): number | undefined {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && !value.trim())
  )
    return undefined;
  return typeof value === "number" || typeof value === "string"
    ? Number(value)
    : NaN;
}
