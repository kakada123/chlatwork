/** Check the entire result, including labels, identifiers, and subtitle exports. */
export function containsThaiScript(value: unknown): boolean {
  if (typeof value === 'string') {
    // The full Thai block also covers marks, digits, and the currency symbol
    // that a Script=Thai-only check can miss.
    return /[\u0E00-\u0E7F]|\p{Script_Extensions=Thai}/u.test(value);
  }
  if (Array.isArray(value)) return value.some(containsThaiScript);
  if (value && typeof value === 'object') {
    return Object.entries(value).some(
      ([key, item]) => containsThaiScript(key) || containsThaiScript(item),
    );
  }
  return false;
}

export function assertCreatorOutputLanguage(value: unknown) {
  if (containsThaiScript(value)) {
    throw new Error('Creator output contains unsupported script');
  }
}
