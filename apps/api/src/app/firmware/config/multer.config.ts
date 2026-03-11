/**
 * Multer Configuration for Firmware Upload
 */

import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_MIME_TYPES = [
  'application/octet-stream',
  'application/x-binary',
  'application/macbinary',
];

const ALLOWED_EXTENSIONS = ['.bin', '.hex', '.elf', '.img', '.fw'];

export const firmwareMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    // Check extension
    const ext = getExtension(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return callback(
        new BadRequestException(
          `Invalid file extension: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
        ),
        false,
      );
    }

    // Accept any binary-like MIME type
    if (
      ALLOWED_MIME_TYPES.includes(file.mimetype) ||
      file.mimetype.startsWith('application/')
    ) {
      return callback(null, true);
    }

    return callback(
      new BadRequestException(`Invalid file type: ${file.mimetype}`),
      false,
    );
  },
};

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.slice(lastDot) : '';
}

