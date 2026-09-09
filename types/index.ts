import type {
  Task,
  TaskComment,
  TaskDocument,
  TaskEscalation,
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

export type TaskEscalationItem = TaskEscalation & {
  raiser: PublicUser | null;
  taggedUser: PublicUser | null;
  resolver: PublicUser | null;
};

export type TaskListItem = Task & {
  assignees: PublicUser[];
  creator: PublicUser | null;
  escalations: TaskEscalationItem[];
};

export type TaskDetail = Task & {
  assignees: PublicUser[];
  creator: PublicUser | null;
  escalations: TaskEscalationItem[];
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
