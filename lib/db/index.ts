import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import * as schema from "./schema";

// `@vercel/postgres`'s `sql` client reads the POSTGRES_URL env var lazily on
// first query, so this module can be imported safely at build time (e.g. by
// route handlers that are statically analyzed) without a live database
// connection being required until a request actually runs.
export const db = drizzle(sql, { schema });

export * from "./schema";
