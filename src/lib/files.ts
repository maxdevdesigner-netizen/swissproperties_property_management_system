// Uploaded files (property pictures, Emirates ID copies) are served by
// /api/documents/serve/<file>, the same URL the live app stored in the database.
export const SERVE_PATH = "/api/documents/serve";

const INLINE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  pdf: "application/pdf",
};

/** A plain file name: no folders, no "..", no hidden files. */
export function isSafeFileName(name: string): boolean {
  return name.length > 0 && name.length <= 255 && !/[/\\\0]/.test(name) && !name.startsWith(".");
}

/** The type to show the file inline with, or null to download it instead (e.g. SVG, which can run scripts). */
export function inlineContentType(name: string): string | null {
  return INLINE_TYPES[name.split(".").pop()?.toLowerCase() ?? ""] ?? null;
}

/** A link for a stored file reference: a full URL or path as-is, a bare file name via the serve route. */
export function fileUrl(value: string): string {
  return /^(https:\/\/|\/)/.test(value) ? value : `${SERVE_PATH}/${encodeURIComponent(value)}`;
}
