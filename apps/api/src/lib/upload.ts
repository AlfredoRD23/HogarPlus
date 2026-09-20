import fs from "fs";
import path from "path";
import multer from "multer";
import { config } from "../config/env";
import { AppError } from "../shared/utils";

export const MAX_CLIENT_IMAGES = 8;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

function isAllowed(file: Express.Multer.File) {
  return ALLOWED_MIME.has(file.mimetype) || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.originalname);
}

export const clientImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = path.join(config.uploadDir, "clients", req.params.id);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: MAX_CLIENT_IMAGES },
  fileFilter: (_req, file, cb) => {
    if (!isAllowed(file)) {
      cb(new Error("Solo se permiten imágenes JPG, PNG, WEBP, GIF o HEIC"));
      return;
    }
    cb(null, true);
  },
});

export function publicUploadPath(clientId: string, filename: string) {
  return `/uploads/clients/${clientId}/${filename}`;
}

export function absoluteUploadPath(storedPath: string) {
  return path.join(config.uploadDir, storedPath.replace(/^\/uploads\/?/, ""));
}

export function asUploadError(error: unknown) {
  if (error instanceof Error && /Solo se permiten imágenes/i.test(error.message)) {
    return new AppError(400, "INVALID_FILE", error.message);
  }
  if (error && typeof error === "object" && "code" in error && error.code === "LIMIT_FILE_SIZE") {
    return new AppError(400, "FILE_TOO_LARGE", "Cada imagen debe pesar menos de 8 MB");
  }
  if (error && typeof error === "object" && "code" in error && error.code === "LIMIT_FILE_COUNT") {
    return new AppError(400, "TOO_MANY_FILES", `Máximo ${MAX_CLIENT_IMAGES} imágenes por cliente`);
  }
  return error;
}
