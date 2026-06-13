import { type ReactNode, useState } from 'react';
import { Avatar, AvatarFallback } from '@/design-system/primitives/Avatar';
import { Button } from '@/design-system/primitives/Button';
import { Textarea } from '@/design-system/primitives/Textarea';
import { formatRelativeTime, initialsOf } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export interface ThreadComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  isMine?: boolean;
}

interface CommentThreadProps {
  comments: ThreadComment[];
  onSubmit?: (body: string) => void | Promise<void>;
  submitting?: boolean;
  emptyText?: ReactNode;
  className?: string;
}

export function CommentThread({
  comments,
  onSubmit,
  submitting = false,
  emptyText = 'No comments yet.',
  className,
}: CommentThreadProps) {
  const [body, setBody] = useState('');

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed || !onSubmit) return;
    await onSubmit(trimmed);
    setBody('');
  };

  return (
    <div className={cn('space-y-4', className)}>
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {initialsOf(comment.authorName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {comment.authorName}
                    {comment.isMine ? ' (you)' : ''}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground">
                  {comment.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {onSubmit ? (
        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            disabled={submitting}
            aria-label="Add a comment"
          />
          <div className="flex justify-end">
            <Button
              onClick={() => void handleSubmit()}
              loading={submitting}
              disabled={!body.trim()}
            >
              Comment
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
