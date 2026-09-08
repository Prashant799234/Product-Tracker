import type {
  Task,
  TaskComment,
  TaskDocument,
  TaskEvent,
  TaskLink,
  TaskTodo,
  User,
} from "@/lib/db";

export type PublicUser = Pick<
  User,
  | "id"
  | "email"
  | "name"
  | "initials"
  | "role"
  | "canManageUsers"
  | "mustChangePassword"
  | "isActive"
  | "createdAt"
>;

export type TaskListItem = Task & {
  assignee: PublicUser | null;
  creator: PublicUser | null;
  escalator: PublicUser | null;
};

export type TaskDetail = Task & {
  assignee: PublicUser | null;
  creator: PublicUser | null;
  escalator: PublicUser | null;
  links: TaskLink[];
  documents: TaskDocument[];
  todos: TaskTodo[];
  comments: (TaskComment & { author: PublicUser | null })[];
  events: (TaskEvent & { actor: PublicUser | null })[];
};

export interface TaskPermissions {
  canEdit: boolean;
  canDelete: boolean;
}
