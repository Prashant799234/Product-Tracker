"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { TaskComment, User } from "@/lib/db";

type CommentWithAuthor = TaskComment & { author: Pick<User, "id" | "name" | "initials"> | null };

export function TaskComments({
  comments,
  onAdd,
}: {
  comments: CommentWithAuthor[];
  onAdd: (text: string) => Promise<void>;
}) {
  const [text, setText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await onAdd(text.trim());
      setText("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes &amp; Comments</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          {comments.length === 0 && (
            <p className="text-sm text-text-dim">No comments yet — be the first to add one.</p>
          )}
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px]">
                  {comment.author?.initials ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 rounded-md bg-surface-2 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    {comment.author?.name ?? "Unknown"}
                  </span>
                  <span className="text-xs text-text-dim">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{comment.text}</p>
              </div>
            </div>
          ))}
        </div>
        {comments.length > 0 && <Separator />}
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="Add a note or comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button
            size="sm"
            className="self-end"
            disabled={submitting || !text.trim()}
            onClick={handleSubmit}
          >
            <Send className="h-4 w-4" />
            Post
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
