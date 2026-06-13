import multer from 'multer';
import type { RequestHandler } from 'express';
import { BadRequestError } from '../errors/AppError';
import {
  MAX_FILE_SIZE,
  getExtension,
  isAllowedExtension,
} from '../../integrations/storage/file-validation';

/**
 * Multipart upload middleware: buffers files in memory (capped at 20 MB / 5 files)
 * and rejects disallowed extensions early. Deep content validation (magic-byte
 * sniffing) happens in the attachment service once the buffer is available.
 */
export const uploadAttachments: RequestHandler = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedExtension(file.originalname)) {
      cb(
        new BadRequestError(`Files of type ".${getExtension(file.originalname)}" are not allowed.`),
      );
      return;
    }
    cb(null, true);
  },
}).array('files', 5);
