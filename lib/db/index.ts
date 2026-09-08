import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import * as schema from "./schema";

// `@vercel/postgres`'s `sql` client only ever reads `process.env.POSTGRES_URL`
// (hardcoded in that package, lazily on first query — so this module can be
// imported safely at build time without a live connection being required
// until a request actually runs). Vercel's native Postgres integration used
// to inject `POSTGRES_URL`, but the current Neon marketplace integration
// injects `DATABASE_URL` / `DATABASE_URL_UNPOOLED` instead. Alias it so
// either naming works without per-environment configuration.
if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

export const db = drizzle(sql, { schema });

export * from "./schema";
