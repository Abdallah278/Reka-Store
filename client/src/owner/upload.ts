export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Client-side pre-check (UX only — the server re-validates everything). */
export function precheckFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return `${file.name}: only PNG, JPEG, WebP or GIF images are accepted.`;
  if (file.size > MAX_UPLOAD_BYTES) return `${file.name}: larger than 5 MB.`;
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,118}$/.test(file.name) || file.name.includes("..")) return `${file.name}: please rename the file (letters, numbers, spaces, dots, dashes only).`;
  return null;
}

export const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
