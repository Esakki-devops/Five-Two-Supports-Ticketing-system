import { fileTypeFromBuffer } from 'file-type';

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

// Extension → acceptable canonical MIME types.
const ALLOWED: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  csv: ['text/csv', 'application/csv', 'text/plain'],
  txt: ['text/plain'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  zip: ['application/zip', 'application/x-zip-compressed'],
  rar: ['application/x-rar-compressed', 'application/vnd.rar', 'application/x-rar'],
};

export const ALLOWED_EXTENSIONS = Object.keys(ALLOWED);

// Sniffed content that must never be accepted, whatever the extension claims.
const DANGEROUS_SNIFF_EXTS = new Set(['exe', 'elf', 'msi', 'cab', 'dll']);
const DANGEROUS_SNIFF_MIMES = new Set([
  'application/x-msdownload',
  'application/x-dosexec',
  'application/x-executable',
  'application/x-elf',
  'application/x-mach-binary',
  'application/vnd.microsoft.portable-executable',
]);

export function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? (parts.pop() ?? '') : '';
}

export function isAllowedExtension(filename: string): boolean {
  return ALLOWED_EXTENSIONS.includes(getExtension(filename));
}

export interface FileValidationResult {
  ok: boolean;
  mime: string;
  reason?: string;
}

/**
 * Two-stage validation: the extension allow-list is the first gate; a magic-byte
 * sniff is the second — rejecting files whose real content is an executable even
 * if they wear an allowed extension. Never trusts the client-supplied content-type.
 */
export async function validateFileContent(
  filename: string,
  buffer: Buffer,
): Promise<FileValidationResult> {
  const ext = getExtension(filename);
  const allowedMimes = ALLOWED[ext];
  if (!allowedMimes) {
    return { ok: false, mime: '', reason: `Files of type ".${ext}" are not allowed.` };
  }
  if (buffer.length > MAX_FILE_SIZE) {
    return { ok: false, mime: '', reason: 'File exceeds the 20 MB limit.' };
  }

  const sniffed = await fileTypeFromBuffer(buffer);
  if (
    sniffed &&
    (DANGEROUS_SNIFF_MIMES.has(sniffed.mime) || DANGEROUS_SNIFF_EXTS.has(sniffed.ext))
  ) {
    return { ok: false, mime: sniffed.mime, reason: 'File content was detected as an executable.' };
  }

  // Prefer the sniffed mime; fall back to the canonical mime (text/csv have no magic bytes).
  const mime = sniffed?.mime ?? allowedMimes[0] ?? 'application/octet-stream';
  return { ok: true, mime };
}
