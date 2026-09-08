/**
 * Idempotent seed script: creates the 3 real team accounts (upsert by
 * email — safe to re-run) and, optionally, a handful of clearly-fake sample
 * tasks so the UI isn't empty on first run.
 *
 * Usage: npm run db:seed
 *
 * Requires POSTGRES_URL to be set (via .env.local) and the schema to already
 * be pushed (npm run db:push). Never run this against a database you haven't
 * already pushed the schema to.
 */
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db, users, tasks, taskTodos, taskComments, taskLinks } from "./index";
import { hashPassword } from "../auth";
import { getInitials, randomPassword } from "../utils";
import { getCurrentQuarter, shiftQuarter } from "../quarters";

// Load .env.local (Next.js convention) if present, else fall back to .env.
if (existsSync(".env.local")) {
  loadEnv({ path: ".env.local" });
} else {
  loadEnv();
}

const SEED_USERS = [
  { name: "Ankur Goyal", email: "ankur.goyal@lightstorm.in", initials: "AG", role: "admin" as const },
  { name: "Prashant Kumar", email: "prashant.kumar1@lightstorm.in", initials: "PK", role: "member" as const },
  { name: "Harshit Chopra", email: "harshit.chopra@lightstorm.in", initials: "HC", role: "member" as const },
];

async function upsertUser(spec: (typeof SEED_USERS)[number]) {
  const email = spec.email.toLowerCase();
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    console.log(`skip (already exists): ${email}`);
    return { user: existing, tempPassword: null as string | null };
  }

  const tempPassword = randomPassword();
  const passwordHash = await hashPassword(tempPassword);

  const [created] = await db
    .insert(users)
    .values({
      email,
      name: spec.name,
      initials: spec.initials || getInitials(spec.name),
      passwordHash,
      role: spec.role,
      canManageUsers: true,
      mustChangePassword: true,
      isActive: true,
    })
    .returning();

  return { user: created, tempPassword };
}

async function seedSampleTasks(userIds: Record<string, string>) {
  const [existingSample] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.title, "[Sample] Set up billing export"))
    .limit(1);
  if (existingSample) {
    console.log("skip sample tasks (already seeded)");
    return;
  }

  const currentQuarter = getCurrentQuarter();
  const prevQuarter = shiftQuarter(currentQuarter, -1);

  const ankur = userIds["ankur.goyal@lightstorm.in"];
  const prashant = userIds["prashant.kumar1@lightstorm.in"];
  const harshit = userIds["harshit.chopra@lightstorm.in"];

  // Escalated task, in progress, with todos/comments/links.
  const [escalatedTask] = await db
    .insert(tasks)
    .values({
      title: "[Sample] Set up billing export",
      description:
        "Sample data — safe to delete. Nightly export of invoices to the finance team's S3 bucket.",
      quarter: currentQuarter,
      module: "Billing",
      severity: "Critical",
      status: "Blocked",
      progressPct: 40,
      assignedTo: harshit,
      createdBy: prashant,
      source: "Finance team request in #ops-finance",
      valueAdd: "Removes a manual monthly reconciliation step for finance.",
      isEscalated: true,
      escalationNote: "Blocked on VPC peering approval from infra.",
      escalatedBy: harshit,
      escalatedAt: new Date(),
    })
    .returning();

  await db.insert(taskTodos).values([
    { taskId: escalatedTask.id, text: "Confirm export schema with finance", isDone: true, createdBy: prashant, completedAt: new Date() },
    { taskId: escalatedTask.id, text: "Get VPC peering approved by infra", isDone: false, createdBy: harshit },
  ]);

  await db.insert(taskComments).values([
    { taskId: escalatedTask.id, authorId: prashant, text: "Sample comment — pinged infra again today." },
  ]);

  await db.insert(taskLinks).values([
    { taskId: escalatedTask.id, label: "Infra ticket", url: "https://example.atlassian.net/browse/INFRA-101", createdBy: harshit },
  ]);

  // Straightforward in-progress task, current quarter.
  await db.insert(tasks).values({
    title: "[Sample] Redesign onboarding checklist",
    description: "Sample data — safe to delete.",
    quarter: currentQuarter,
    module: "Onboarding",
    severity: "Medium",
    status: "In Progress",
    progressPct: 65,
    assignedTo: prashant,
    createdBy: ankur,
    source: "Q2 retro action item",
    valueAdd: "Cuts new-hire ramp-up time.",
  });

  // Done task, previous quarter.
  await db.insert(tasks).values({
    title: "[Sample] Migrate task tracker off spreadsheets",
    description: "Sample data — safe to delete.",
    quarter: prevQuarter,
    module: "Internal Tools",
    severity: "High",
    status: "Done",
    progressPct: 100,
    assignedTo: ankur,
    createdBy: ankur,
  });

  // To-do, unassigned, current quarter.
  await db.insert(tasks).values({
    title: "[Sample] Draft Q&A doc for new module rollout",
    quarter: currentQuarter,
    module: "Docs",
    severity: "Low",
    status: "To Do",
    progressPct: 0,
    createdBy: harshit,
  });

  console.log("seeded 4 sample tasks (titles prefixed with [Sample])");
}

async function main() {
  console.log("Seeding users...\n");
  const created: { email: string; tempPassword: string }[] = [];
  const userIds: Record<string, string> = {};

  for (const spec of SEED_USERS) {
    const { user, tempPassword } = await upsertUser(spec);
    userIds[spec.email] = user.id;
    if (tempPassword) created.push({ email: spec.email, tempPassword });
  }

  const seedSample = process.argv.includes("--with-sample-data") || !process.argv.includes("--no-sample-data");
  if (seedSample) {
    await seedSampleTasks(userIds);
  } else {
    console.log("skipping sample tasks (--no-sample-data passed)");
  }

  console.log("\nDone.");
  if (created.length > 0) {
    console.log("\nTemporary passwords (share out-of-band, never write these to a file):");
    for (const { email, tempPassword } of created) {
      console.log(`  ${email} -> ${tempPassword}`);
    }
    console.log(
      "\nEach account has must_change_password=true and will be forced to set a new password on first login."
    );
  } else {
    console.log("\nAll 3 accounts already existed — no new passwords generated.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
