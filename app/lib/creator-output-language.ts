export const CREATOR_OUTPUT_BLOCKED_MESSAGE =
  "This result was blocked because it contains unsupported script. Please generate a new result.";

/** Keep this browser boundary aligned with the API's Creator output check. */
export function containsThaiScript(value: unknown): boolean {
  if (typeof value === "string") {
    return /[\u0E00-\u0E7F]|\p{Script_Extensions=Thai}/u.test(value);
  }
  if (Array.isArray(value)) return value.some(containsThaiScript);
  if (value && typeof value === "object") {
    return Object.entries(value).some(
      ([key, item]) => containsThaiScript(key) || containsThaiScript(item),
    );
  }
  return false;
}
