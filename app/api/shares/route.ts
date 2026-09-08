import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, shares, SHARE_SCOPES } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const grantSchema = z.object({
  userId: z.string().uuid(),
  scope: z.enum(SHARE_SCOPES),
  module: z.string().min(1).optional(),
});

const revokeSchema = z.object({ shareId: z.string().uuid() });

export async function GET(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.canManageUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId query param is required" }, { status: 400 });
  }

  const rows = await db.select().from(shares).where(eq(shares.userId, userId));
  return NextResponse.json({ shares: rows });
}

export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.canManageUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = grantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (parsed.data.scope === "module" && !parsed.data.module) {
    return NextResponse.json(
      { error: "module is required when scope is 'module'" },
      { status: 400 }
    );
  }

  const [share] = await db
    .insert(shares)
    .values({
      userId: parsed.data.userId,
      scope: parsed.data.scope,
      module: parsed.data.scope === "module" ? parsed.data.module : null,
      grantedBy: actor.id,
    })
    .returning();

  return NextResponse.json({ share }, { status: 201 });
}

export async function DELETE(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.canManageUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = revokeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await db.delete(shares).where(eq(shares.id, parsed.data.shareId));
  return NextResponse.json({ ok: true });
}
