import { NextResponse } from "next/server";
import { db, users } from "@/lib/db";

export const dynamic = "force-dynamic";

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return "unparseable";
  }
}

export async function GET() {
  const usedKey = process.env.POSTGRES_URL
    ? "POSTGRES_URL"
    : process.env.DATABASE_URL
      ? "DATABASE_URL"
      : Object.keys(process.env).find((k) => /_(POSTGRES_URL|DATABASE_URL)$/.test(k)) ?? "none";

  let userCount: number | string = "error";
  let dbError: string | null = null;
  try {
    const rows = await db.select().from(users);
    userCount = rows.length;
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    resolvedFrom: usedKey,
    postgresUrlHost: hostOf(process.env.POSTGRES_URL),
    databaseUrlHost: hostOf(process.env.DATABASE_URL),
    userCount,
    dbError,
  });
}
