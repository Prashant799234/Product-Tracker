import { toPublicUser, type PublicUser } from "./auth";
import type { TaskEscalation, User } from "./db";

/**
 * Drizzle's relational `with: { raiser: true, taggedUser: true, resolver: true }`
 * returns the FULL `users` row for each of those relations (including
 * `passwordHash`, `tokenVersion`) — exactly the leak that was fixed for
 * `creator`/`escalator` on tasks (see app/api/tasks/route.ts and
 * app/api/tasks/[id]/route.ts). Every escalation object that reaches
 * `NextResponse.json(...)` must be passed through this first.
 */
export function sanitizeEscalation<
  T extends TaskEscalation & {
    raiser?: User | null;
    taggedUser?: User | null;
    resolver?: User | null;
  },
>(
  escalation: T
): Omit<T, "raiser" | "taggedUser" | "resolver"> & {
  raiser: PublicUser | null;
  taggedUser: PublicUser | null;
  resolver: PublicUser | null;
} {
  return {
    ...escalation,
    raiser: escalation.raiser ? toPublicUser(escalation.raiser) : null,
    taggedUser: escalation.taggedUser ? toPublicUser(escalation.taggedUser) : null,
    resolver: escalation.resolver ? toPublicUser(escalation.resolver) : null,
  };
}
