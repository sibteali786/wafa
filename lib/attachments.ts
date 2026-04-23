export const MAX_ATTACHMENTS_PER_PROMISE = 5;

export const ATTACHMENT_RULES = {
  "image/jpeg": { kind: "image", maxBytes: 5 * 1024 * 1024 },
  "image/png": { kind: "image", maxBytes: 5 * 1024 * 1024 },
  "image/webp": { kind: "image", maxBytes: 5 * 1024 * 1024 },
  "audio/mpeg": { kind: "audio", maxBytes: 10 * 1024 * 1024 },
  "audio/mp4": { kind: "audio", maxBytes: 10 * 1024 * 1024 },
  "application/pdf": { kind: "pdf", maxBytes: 10 * 1024 * 1024 },
  "video/mp4": { kind: "video", maxBytes: 30 * 1024 * 1024 },
} as const;

type AllowedMime = keyof typeof ATTACHMENT_RULES;
export type AttachmentKind = (typeof ATTACHMENT_RULES)[AllowedMime]["kind"];

export function getAttachmentRule(mimeType: string) {
  return ATTACHMENT_RULES[mimeType as AllowedMime] ?? null;
}

export function sanitizeFilename(filename: string) {
  const trimmed = filename.trim();
  if (!trimmed) return "file";
  return trimmed
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 120);
}
