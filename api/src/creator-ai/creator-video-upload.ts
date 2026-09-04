import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { HttpStatus } from '@nestjs/common';
import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';
import { diskStorage, type Options as MulterOptions } from 'multer';
import { CREATOR_AI_DEFAULTS } from './creator-ai.config';
import { CreatorAiException } from './creator-ai.errors';

const MIME_EXTENSIONS: Record<string, string[]> = {
  'video/mp4': ['.mp4', '.m4v'],
  'video/quicktime': ['.mov'],
  'video/webm': ['.webm'],
};

export interface CreatorVideoUpload {
  path: string;
  mimetype: string;
  originalname: string;
  filename: string;
  size: number;
}

@Catch(PayloadTooLargeException)
export class CreatorVideoUploadExceptionFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
    host.switchToHttp().getResponse<Response>().status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      code: 'VIDEO_TOO_LARGE',
      message: 'This video exceeds the absolute upload limit.',
    });
  }
}

export function creatorVideoTempDirectory() {
  return (
    process.env.AI_VIDEO_TEMP_DIR?.trim() ||
    join(tmpdir(), CREATOR_AI_DEFAULTS.videoTempDirectoryName)
  );
}

export const creatorVideoUploadOptions: MulterOptions = {
  limits: { files: 1, fileSize: CREATOR_AI_DEFAULTS.absoluteMaxVideoBytes },
  fileFilter: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    const allowed = MIME_EXTENSIONS[file.mimetype];
    if (!allowed || !allowed.includes(extension)) {
      callback(
        new CreatorAiException(
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
          'UNSUPPORTED_VIDEO_FORMAT',
          'Upload a valid MP4, MOV, M4V, or WebM video.',
        ),
        false,
      );
      return;
    }
    callback(null, true);
  },
  storage: diskStorage({
    destination: (_request, _file, callback) => {
      const directory = creatorVideoTempDirectory();
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      callback(null, directory);
    },
    filename: (_request, file, callback) => {
      const extension = extname(file.originalname).toLowerCase();
      callback(null, `${randomUUID()}${extension}`);
    },
  }),
};
