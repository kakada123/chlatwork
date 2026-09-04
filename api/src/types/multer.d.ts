declare module 'multer' {
  import type { Request } from 'express';

  interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
  }

  interface DiskStorageFile extends MulterFile {
    destination: string;
    filename: string;
    path: string;
  }

  interface StorageEngine {}

  export interface Options {
    limits?: { files?: number; fileSize?: number };
    fileFilter?: (
      request: Request,
      file: MulterFile,
      callback: (error: Error | null, acceptFile: boolean) => void,
    ) => void;
    storage?: StorageEngine;
  }

  export function diskStorage(options: {
    destination: (
      request: Request,
      file: MulterFile,
      callback: (error: Error | null, destination: string) => void,
    ) => void;
    filename: (
      request: Request,
      file: MulterFile,
      callback: (error: Error | null, filename: string) => void,
    ) => void;
  }): StorageEngine;
}
