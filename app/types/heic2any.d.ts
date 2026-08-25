declare module "heic2any" {
  export interface HeicConversionOptions {
    blob: Blob;
    toType?: string;
    quality?: number;
    multiple?: boolean;
  }

  export default function heic2any(
    options: HeicConversionOptions,
  ): Promise<Blob | Blob[]>;
}
