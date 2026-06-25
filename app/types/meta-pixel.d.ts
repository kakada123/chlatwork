type MetaPixelArguments =
  | ["init", string]
  | ["track", "PageView" | string, Record<string, unknown>?]
  | [string, ...unknown[]];

type MetaPixelFunction = ((...args: MetaPixelArguments) => void) & {
  callMethod?: (...args: MetaPixelArguments) => void;
  loaded?: boolean;
  push?: MetaPixelFunction;
  queue?: MetaPixelArguments[];
  version?: string;
};

declare global {
  interface Window {
    __chlatworkMetaPixelId?: string;
    _fbq?: MetaPixelFunction;
    fbq?: MetaPixelFunction;
  }
}

export {};
