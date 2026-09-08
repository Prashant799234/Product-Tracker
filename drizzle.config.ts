import type { Config } from "drizzle-kit";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) {
  loadEnv({ path: ".env.local" });
} else {
  loadEnv();
}

// Accept either naming: Vercel's older native Postgres integration injects
// POSTGRES_URL, the current Neon marketplace integration injects DATABASE_URL.
if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

if (!process.env.POSTGRES_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    "POSTGRES_URL/DATABASE_URL is not set. Set one in .env.local before running drizzle-kit push."
  );
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL ?? "",
  },
} satisfies Config;
