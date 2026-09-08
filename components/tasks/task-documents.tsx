"use client";

import * as React from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TaskDocument } from "@/lib/db";

export function TaskDocuments({
  documents,
  canEdit,
  onAdd,
  onDelete,
}: {
  documents: TaskDocument[];
  canEdit: boolean;
  onAdd: (title: string, url: string) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
}) {
  const [title, setTitle] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  async function handleAdd() {
    if (!title.trim() || !url.trim()) return;
    setAdding(true);
    try {
      await onAdd(title.trim(), url.trim());
      setTitle("");
      setUrl("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {documents.length === 0 && <p className="text-sm text-text-dim">No documents linked yet.</p>}
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between gap-2 rounded-md bg-surface-2 px-3 py-2"
          >
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm text-brand-blue hover:underline"
            >
              <FileText className="h-3.5 w-3.5" />
              {doc.title}
            </a>
            {canEdit && (
              <button
                onClick={() => onDelete(doc.id)}
                className="text-text-dim transition-colors hover:text-critical"
                aria-label="Remove document"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {canEdit && (
          <div className="mt-1 flex gap-2">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-1/3"
            />
            <Input
              placeholder="https://drive.google.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button size="sm" variant="secondary" disabled={adding} onClick={handleAdd}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
