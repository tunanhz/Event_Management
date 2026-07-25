import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Router, Request, RequestHandler, Response, NextFunction } from 'express';
import multer from 'multer';
import { put } from '@vercel/blob';
import { isAuthenticated, authorize } from '../../common/middleware/auth.middleware';
import { AppError } from '../../common/utils/AppError';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ApiResponse } from '../../common/utils/ApiResponse';

/**
 * Organizer file uploads, one sub-route per asset kind:
 *  - /permits    — legal permit docs (wizard step 4): PDF/DOCX/PNG ≤ 15MB (SRS)
 *  - /images     — poster/banner/logo/ticket artwork:  PNG/JPG/WEBP ≤ 5MB
 *  - /signatures — hand-drawn contract signature (step 5): PNG ≤ 1MB
 * All return ApiResponse{name, url, sizeKb}. Files get random server-side
 * names (validated extension only) — the client filename is display metadata.
 *
 * Storage: serverless hosts mount the app bundle read-only (writes fail with
 * EROFS) and give each invocation its own container, so a file written to local
 * disk would neither save nor still be there on the next request. Uploads
 * therefore go to Vercel Blob whenever BLOB_READ_WRITE_TOKEN is configured;
 * the local-disk path is kept only for dev machines that have no token, where
 * `express.static('/uploads')` serves the files back.
 */

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

interface UploaderConfig {
  subdir: string;
  allowedMimeByExt: Record<string, string[]>;
  maxSizeMb: number;
  /** Friendly 400 message when extension/mime is not allowed. */
  typeErrorMessage: string;
}

/**
 * Persist the buffered upload and return the URL to hand back to the client:
 * an absolute Blob URL in production, a `/uploads/...` path in local dev.
 * The stored name is always server-generated — only the extension is taken
 * from the client, and it has already passed the extension/mime allow-list.
 */
async function storeFile(subdir: string, file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

  if (BLOB_TOKEN) {
    const { url } = await put(`${subdir}/${filename}`, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
      token: BLOB_TOKEN,
      // Name is already collision-proof (timestamp + 6 random bytes); keeping
      // it verbatim means the stored URL still ends in the validated extension.
      addRandomSuffix: false,
    });
    return url;
  }

  const dir = path.join(process.cwd(), 'uploads', subdir);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(path.join(dir, filename), file.buffer);
  return `/uploads/${subdir}/${filename}`;
}

function createUploader(config: UploaderConfig): RequestHandler {
  const upload = multer({
    // Buffered in memory so the same handler can push to Blob or to disk;
    // the per-route size limit below caps how much is ever held.
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxSizeMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedMimes = config.allowedMimeByExt[ext];
      if (!allowedMimes || !allowedMimes.includes(file.mimetype)) {
        return cb(new AppError(config.typeErrorMessage, 400));
      }
      cb(null, true);
    },
  });

  // Translate multer's own errors (e.g. file too large) into friendly 400s.
  return (req: Request, res: Response, next: NextFunction): void => {
    upload.single('file')(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        const message =
          err.code === 'LIMIT_FILE_SIZE'
            ? `File tối đa ${config.maxSizeMb}MB`
            : 'Upload thất bại — vui lòng thử lại';
        return next(new AppError(message, 400));
      }
      next(err as any);
    });
  };
}

/** Shared success handler — echoes stored file metadata for the wizard form. */
function respondUploaded(subdir: string) {
  return asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      throw new AppError('Vui lòng đính kèm file trong field "file"', 400);
    }
    const url = await storeFile(subdir, file);
    res.status(201).json(
      ApiResponse.created(
        {
          name: file.originalname,
          url,
          sizeKb: Math.round(file.size / 1024),
        },
        'Tải file lên thành công'
      )
    );
  });
}

const uploadPermit = createUploader({
  subdir: 'permits',
  maxSizeMb: 15,
  allowedMimeByExt: {
    '.pdf': ['application/pdf'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    '.png': ['image/png'],
  },
  typeErrorMessage: 'Tài liệu giấy phép chỉ chấp nhận PDF/DOCX/PNG',
});

const uploadImage = createUploader({
  subdir: 'images',
  maxSizeMb: 5,
  allowedMimeByExt: {
    '.png': ['image/png'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.webp': ['image/webp'],
  },
  typeErrorMessage: 'Ảnh chỉ chấp nhận PNG/JPG/WEBP',
});

const uploadSignature = createUploader({
  subdir: 'signatures',
  maxSizeMb: 1,
  allowedMimeByExt: { '.png': ['image/png'] },
  typeErrorMessage: 'Chữ ký chỉ chấp nhận ảnh PNG',
});

const router = Router();

router.use(isAuthenticated as any, authorize('ORGANIZER', 'ADMIN') as any);

router.post('/permits', uploadPermit, respondUploaded('permits'));
router.post('/images', uploadImage, respondUploaded('images'));
router.post('/signatures', uploadSignature, respondUploaded('signatures'));

export default router;
