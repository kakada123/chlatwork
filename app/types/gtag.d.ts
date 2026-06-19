type GoogleTagConfig = {
  page_path?: string;
  page_location?: string;
  page_title?: string;
  [key: string]: unknown;
};

type GoogleTagArguments =
  | ["js", Date]
  | ["config", string, GoogleTagConfig?]
  | ["event", string, Record<string, unknown>?]
  | ["set", Record<string, unknown>]
  | [string, ...unknown[]];

type GoogleTagFunction = (...args: GoogleTagArguments) => void;

declare global {
  interface Window {
    dataLayer?: GoogleTagArguments[];
    gtag?: GoogleTagFunction;
  }
}

export {};
