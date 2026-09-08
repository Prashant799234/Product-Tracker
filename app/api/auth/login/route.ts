import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSessionToken,
  toPublicUser,
  verifyPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();

  // Emails are stored lowercased at write time (invite/seed), so a
  // lowercase-normalized equality check is sufficient here.
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await signSessionToken({ sub: user.id, tokenVersion: user.tokenVersion });

  const response = NextResponse.json({ user: toPublicUser(user) });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
