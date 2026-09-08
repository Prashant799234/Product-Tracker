import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, users, USER_ROLES } from "@/lib/db";
import { getSessionUser, toPublicUser } from "@/lib/auth";
import { canManageTargetUser, wouldRemoveLastActiveAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  isActive: z.boolean().optional(),
  canManageUsers: z.boolean().optional(),
  forceLogout: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const actor = await getSessionUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.canManageUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [target] = await db.select().from(users).where(eq(users.id, params.id)).limit(1);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canManageTargetUser(actor, target)) {
    return NextResponse.json(
      { error: "Only an admin can change this user's role or active status" },
      { status: 403 }
    );
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const nextRole = data.role ?? target.role;
  const nextIsActive = data.isActive ?? target.isActive;

  if (
    (data.role !== undefined || data.isActive !== undefined) &&
    (await wouldRemoveLastActiveAdmin(target.id, nextIsActive, nextRole))
  ) {
    return NextResponse.json(
      { error: "Cannot remove the only active admin" },
      { status: 400 }
    );
  }

  const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (data.role !== undefined) {
    updates.role = data.role;
    updates.canManageUsers = data.role !== "viewer";
  }
  if (data.canManageUsers !== undefined) updates.canManageUsers = data.canManageUsers;
  if (data.isActive !== undefined) updates.isActive = data.isActive;
  if (data.forceLogout) {
    updates.tokenVersion = sql`${users.tokenVersion} + 1` as unknown as number;
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, params.id))
    .returning();

  return NextResponse.json({ user: toPublicUser(updated) });
}
