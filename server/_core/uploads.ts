import { randomUUID } from "node:crypto";
import { ENV } from "./env";

export type ValidatedImage = {
  bytes: Buffer;
  mimeType: AllowedMime;
  extension: string;
  safeFilename: string;
};

export type AllowedMime = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

const ALLOWED: Record<AllowedMime, { ext: string; sniff: (b: Buffer) => boolean }> = {
  "image/png": { ext: "png", sniff: b => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/jpeg": { ext: "jpg", sniff: b => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/webp": { ext: "webp", sniff: b => b.length > 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  "image/gif": { ext: "gif", sniff: b => b.length > 6 && ["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString("ascii")) },
};

export const ALLOWED_MIME_TYPES = Object.keys(ALLOWED) as AllowedMime[];

export class UploadValidationError extends Error {
  constructor(public readonly reason: string, message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

const DATA_URL = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i;
const SAFE_FILENAME = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,118}$/;

/** Reject traversal, separators, control chars, hidden files and non-image extensions. */
export function isSafeFilename(name: string): boolean {
  if (!SAFE_FILENAME.test(name)) return false;
  if (name.includes("..")) return false;
  if (/[\\/]/.test(name)) return false;
  if (!/\.(png|jpe?g|webp|gif)$/i.test(name)) return false;
  return true;
}

/**
 * Validate an uploaded image end-to-end:
 *  - data URL shape and base64 alphabet
 *  - declared MIME allowed
 *  - decoded size within limit (checked before decoding using base64 arithmetic too)
 *  - magic-byte signature matches the declared type
 *  - filename is safe (it is *never* used as a storage path; see storageKeyFor)
 */
export function validateImageUpload(input: { dataUrl: string; filename: string; mimeType: string }): ValidatedImage {
  if (!isSafeFilename(input.filename)) throw new UploadValidationError("filename", "Unsafe file name");

  const declared = input.mimeType.toLowerCase() as AllowedMime;
  if (!(declared in ALLOWED)) throw new UploadValidationError("mime", "Unsupported image type");

  const match = DATA_URL.exec(input.dataUrl);
  if (!match) throw new UploadValidationError("dataUrl", "Malformed image data");
  const [, urlMime, base64] = match;
  if (urlMime.toLowerCase() !== declared) throw new UploadValidationError("mime", "Image type mismatch");

  // Estimate decoded size before allocating.
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const estimated = Math.floor((base64.length * 3) / 4) - padding;
  if (estimated > ENV.maxUploadBytes) throw new UploadValidationError("size", "Image is too large");
  if (estimated < 16) throw new UploadValidationError("dataUrl", "Image data is empty");

  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > ENV.maxUploadBytes) throw new UploadValidationError("size", "Image is too large");

  const spec = ALLOWED[declared];
  if (!spec.sniff(bytes)) throw new UploadValidationError("signature", "File content does not match an image");

  return { bytes, mimeType: declared, extension: spec.ext, safeFilename: input.filename };
}

/** Server-generated storage key. Never derived from user input. */
export function storageKeyFor(scope: "products" | "brand", extension: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `reka/${scope}/${date}/${randomUUID()}.${extension}`;
}
