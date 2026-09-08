"use client";

import * as React from "react";
import { ExternalLink, FileText, Figma, Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { TaskLink } from "@/lib/db";
import type { TaskDetail as TaskDetailType } from "@/types";

function PrimaryLinkButton({
  href,
  label,
  icon: Icon,
}: {
  href: string | null;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  if (!href) {
    return (
      <div className="flex flex-1 items-center gap-2 rounded-md border border-dashed border-text-muted/20 px-3 py-2 text-sm text-text-dim">
        <Icon className="h-4 w-4" />
        {label} not set
      </div>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex flex-1 items-center gap-2 rounded-md border border-brand-blue/30 bg-brand-blue/10 px-3 py-2 text-sm font-medium text-brand-blue transition-colors hover:bg-brand-blue/20"
    >
      <Icon className="h-4 w-4" />
      {label}
      <ExternalLink className="ml-auto h-3.5 w-3.5" />
    </a>
  );
}

export function TaskLinks({
  task,
  canEdit,
  onPatch,
  onAddLink,
  onDeleteLink,
}: {
  task: TaskDetailType;
  canEdit: boolean;
  onPatch: (patch: Record<string, unknown>) => void;
  onAddLink: (label: string, url: string) => Promise<void>;
  onDeleteLink: (linkId: string) => Promise<void>;
}) {
  const [jiraUrl, setJiraUrl] = React.useState(task.jiraUrl ?? "");
  const [confluenceUrl, setConfluenceUrl] = React.useState(task.confluenceUrl ?? "");
  const [figmaUrl, setFigmaUrl] = React.useState(task.figmaUrl ?? "");
  const [newLabel, setNewLabel] = React.useState("");
  const [newUrl, setNewUrl] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  React.useEffect(() => setJiraUrl(task.jiraUrl ?? ""), [task.jiraUrl]);
  React.useEffect(() => setConfluenceUrl(task.confluenceUrl ?? ""), [task.confluenceUrl]);
  React.useEffect(() => setFigmaUrl(task.figmaUrl ?? ""), [task.figmaUrl]);

  async function handleAdd() {
    if (!newLabel.trim() || !newUrl.trim()) return;
    setAdding(true);
    try {
      await onAddLink(newLabel.trim(), newUrl.trim());
      setNewLabel("");
      setNewUrl("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Links</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canEdit ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Jira</Label>
              <Input
                placeholder="https://..."
                value={jiraUrl}
                onChange={(e) => setJiraUrl(e.target.value)}
                onBlur={() => jiraUrl !== (task.jiraUrl ?? "") && onPatch({ jiraUrl: jiraUrl || null })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Confluence (PRD)</Label>
              <Input
                placeholder="https://..."
                value={confluenceUrl}
                onChange={(e) => setConfluenceUrl(e.target.value)}
                onBlur={() =>
                  confluenceUrl !== (task.confluenceUrl ?? "") &&
                  onPatch({ confluenceUrl: confluenceUrl || null })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Figma</Label>
              <Input
                placeholder="https://..."
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                onBlur={() =>
                  figmaUrl !== (task.figmaUrl ?? "") && onPatch({ figmaUrl: figmaUrl || null })
                }
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <PrimaryLinkButton href={task.jiraUrl} label="Jira" icon={ExternalLink} />
            <PrimaryLinkButton href={task.confluenceUrl} label="Confluence (PRD)" icon={FileText} />
            <PrimaryLinkButton href={task.figmaUrl} label="Figma" icon={Figma} />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label>Supporting links</Label>
          {task.links.length === 0 && (
            <p className="text-sm text-text-dim">No supporting links yet.</p>
          )}
          {task.links.map((link: TaskLink) => (
            <div
              key={link.id}
              className="flex items-center justify-between gap-2 rounded-md bg-surface-2 px-3 py-2"
            >
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-brand-blue hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {link.label}
              </a>
              {canEdit && (
                <button
                  onClick={() => onDeleteLink(link.id)}
                  className="text-text-dim transition-colors hover:text-critical"
                  aria-label="Remove link"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {canEdit && (
            <div className="mt-1 flex gap-2">
              <Input
                placeholder="Label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-1/3"
              />
              <Input
                placeholder="https://..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
              <Button size="sm" variant="secondary" disabled={adding} onClick={handleAdd}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
