import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { getSessionUser, hashPassword } from "@/lib/auth";
import { canManageTargetUser } from "@/lib/permissions";
import { randomPassword } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * There's no email service in this app (see README), so "forgot password"
 * for the 3-person team + any invited viewers works via an admin/member
 * resetting the account here — same mechanism as the initial invite/seed:
 * a fresh temp password is generated, returned once, and must be changed on
 * next login.
 */
export async function POST(
  _request: Request,
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
      { error: "Only an admin can reset this user's password" },
      { status: 403 }
    );
  }

  const tempPassword = randomPassword();
  const passwordHash = await hashPassword(tempPassword);

  await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: true,
      tokenVersion: target.tokenVersion + 1,
      updatedAt: new Date(),
    })
    .where(eq(users.id, params.id));

  return NextResponse.json({ tempPassword });
}
