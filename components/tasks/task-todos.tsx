"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { TaskTodo } from "@/lib/db";

export function TaskTodos({
  todos,
  canEdit,
  onAdd,
  onToggle,
  onDelete,
}: {
  todos: TaskTodo[];
  canEdit: boolean;
  onAdd: (text: string) => Promise<void>;
  onToggle: (todoId: string, isDone: boolean) => Promise<void>;
  onDelete: (todoId: string) => Promise<void>;
}) {
  const [text, setText] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  async function handleAdd() {
    if (!text.trim()) return;
    setAdding(true);
    try {
      await onAdd(text.trim());
      setText("");
    } finally {
      setAdding(false);
    }
  }

  const doneCount = todos.filter((t) => t.isDone).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          To-dos {todos.length > 0 && (
            <span className="text-xs font-normal text-text-dim">
              ({doneCount}/{todos.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {todos.length === 0 && <p className="text-sm text-text-dim">No to-dos yet.</p>}
        {todos.map((todo) => (
          <div key={todo.id} className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2">
            <Checkbox
              checked={todo.isDone}
              onCheckedChange={(checked) => onToggle(todo.id, checked === true)}
              disabled={!canEdit}
            />
            <span className={cn("flex-1 text-sm", todo.isDone && "text-text-dim line-through")}>
              {todo.text}
            </span>
            {canEdit && (
              <button
                onClick={() => onDelete(todo.id)}
                className="text-text-dim transition-colors hover:text-critical"
                aria-label="Remove todo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {canEdit && (
          <div className="mt-1 flex gap-2">
            <Input
              placeholder="Add a to-do..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
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
