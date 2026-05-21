function getCrypto() {
  const cryptoApi = globalThis.crypto;

  if (!cryptoApi?.getRandomValues) {
    throw new Error("Secure random values are not available in this browser.");
  }

  return cryptoApi;
}

export function fillSecureRandomBytes(bytes: Uint8Array) {
  getCrypto().getRandomValues(bytes);
}

export function secureRandomInt(max: number) {
  if (!Number.isInteger(max) || max <= 0) {
    throw new Error("Max must be greater than 0.");
  }

  const array = new Uint32Array(1);
  const maxUint32 = 0xffffffff;
  const limit = maxUint32 - (maxUint32 % max);
  let value = 0;

  // Rejection sampling avoids modulo bias for passwords and token-like output.
  do {
    getCrypto().getRandomValues(array);
    value = array[0];
  } while (value >= limit);

  return value % max;
}

export function secureRandomId(prefix: string) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  const bytes = new Uint8Array(16);
  fillSecureRandomBytes(bytes);

  return `${prefix}-${Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
}
