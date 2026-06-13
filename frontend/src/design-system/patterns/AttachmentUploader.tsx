import { type DragEvent, useRef, useState } from 'react';
import { Download, FileText, Loader2, ShieldAlert, ShieldCheck, Upload } from 'lucide-react';
import { Badge } from '@/design-system/primitives/Badge';
import { Button } from '@/design-system/primitives/Button';
import { formatBytes } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { AttachmentScanStatus } from '@/types';

export interface UploaderAttachment {
  _id: string;
  fileName: string;
  size: number;
  scanStatus: AttachmentScanStatus;
}

const ACCEPTED = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'zip',
  'rar',
];
const MAX_SIZE = 20 * 1024 * 1024;

interface AttachmentUploaderProps {
  attachments?: UploaderAttachment[];
  onUpload?: (files: File[]) => void;
  onDownload?: (id: string) => void;
  uploading?: boolean;
  disabled?: boolean;
  className?: string;
}

function ScanStatusBadge({ status }: { status: AttachmentScanStatus }) {
  if (status === 'clean')
    return (
      <Badge variant="success">
        <ShieldCheck className="h-3 w-3" /> Clean
      </Badge>
    );
  if (status === 'infected')
    return (
      <Badge variant="danger">
        <ShieldAlert className="h-3 w-3" /> Infected
      </Badge>
    );
  return (
    <Badge variant="warning">
      <Loader2 className="h-3 w-3 animate-spin" /> Scanning
    </Badge>
  );
}

export function AttachmentUploader({
  attachments = [],
  onUpload,
  onDownload,
  uploading = false,
  disabled = false,
  className,
}: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (files: File[]): File[] => {
    setError(null);
    const ok: File[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!ACCEPTED.includes(ext)) {
        setError(`"${file.name}" — file type not allowed.`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        setError(`"${file.name}" exceeds the 20 MB limit.`);
        continue;
      }
      ok.push(file);
    }
    return ok;
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || !onUpload) return;
    const valid = validate(Array.from(fileList));
    if (valid.length) onUpload(valid);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {onUpload ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-border',
            disabled && 'pointer-events-none opacity-60',
          )}
        >
          <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Click to upload
            </button>{' '}
            or drag and drop
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, Office, images, archives · up to 20 MB
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      ) : null}

      {error ? (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {uploading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
        </p>
      ) : null}

      {attachments.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {attachments.map((attachment) => (
            <li key={attachment._id} className="flex items-center gap-3 p-3">
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{attachment.fileName}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(attachment.size)}</p>
              </div>
              <ScanStatusBadge status={attachment.scanStatus} />
              {onDownload ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Download ${attachment.fileName}`}
                  disabled={attachment.scanStatus !== 'clean'}
                  onClick={() => onDownload(attachment._id)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
