export type Security = "WPA" | "WEP" | "nopass";
export type PrintTheme = "cute" | "modern" | "minimal";
export type PosterSize = "A4" | "A5";

function slugifySegment(value: string, fallback: string, maxLength: number) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, maxLength);

  return slug || fallback;
}

export function escapeWifiValue(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

export function buildWifiPayload(options: {
  ssid: string;
  password: string;
  security: Security;
  hidden: boolean;
}): string {
  const ssid = escapeWifiValue(options.ssid.trim());
  const password = escapeWifiValue(options.password);

  return `WIFI:T:${options.security};S:${ssid};P:${options.security === "nopass" ? "" : password};H:${options.hidden};;`;
}

export function getWifiDisplayPassword(
  password: string,
  security: Security,
): string {
  if (security === "nopass") {
    return "";
  }

  return password || "";
}

export function buildWifiQrFileName(ssid: string, now = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  return `chlatwork-wifi-${slugifySegment(ssid, "qr", 32)}-${yyyy}-${mm}-${dd}.png`;
}

export function buildWifiPosterFileName(options: {
  shopName: string;
  posterSize: PosterSize;
}): string {
  return `chlatwork-wifi-poster-${slugifySegment(options.shopName, "shop", 24)}-${options.posterSize}.png`;
}

export async function dataUrlToFile(dataUrl: string, name: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  return new File([blob], name, { type: blob.type || "image/png" });
}
