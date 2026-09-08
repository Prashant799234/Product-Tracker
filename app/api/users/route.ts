import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, users, USER_ROLES } from "@/lib/db";
import { getSessionUser, hashPassword, toPublicUser } from "@/lib/auth";
import { getInitials, randomPassword } from "@/lib/utils";

export const dynamic = "force-dynamic";

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(USER_ROLES).default("viewer"),
});

const LIGHTSTORM_DOMAIN = "@lightstorm.in";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.canManageUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db.select().from(users).orderBy(users.createdAt);
  return NextResponse.json({ users: rows.map(toPublicUser) });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.canManageUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase().trim();
  if (!email.endsWith(LIGHTSTORM_DOMAIN)) {
    return NextResponse.json(
      { error: `Invited users must have an ${LIGHTSTORM_DOMAIN} email address` },
      { status: 400 }
    );
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const tempPassword = randomPassword();
  const passwordHash = await hashPassword(tempPassword);

  const [created] = await db
    .insert(users)
    .values({
      email,
      name: parsed.data.name,
      initials: getInitials(parsed.data.name),
      passwordHash,
      role: parsed.data.role,
      canManageUsers: parsed.data.role !== "viewer",
      mustChangePassword: true,
      isActive: true,
    })
    .returning();

  // Temp password is returned once, to the inviter only — never persisted
  // anywhere else and never logged. The inviter is expected to share it
  // out-of-band (Slack/WhatsApp) with the new user.
  return NextResponse.json(
    { user: toPublicUser(created), tempPassword },
    { status: 201 }
  );
}
