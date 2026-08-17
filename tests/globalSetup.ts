import "dotenv/config";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

export default async function globalSetup() {
  if (process.env.SKIP_DB_GLOBAL_SETUP === "true") {
    return;
  }

  const databaseUrlTest =
    process.env.DATABASE_URL_TEST ??
    "postgresql://postgres:postgres@127.0.0.1:5433/techdesk_test?schema=public";

  const adminUrl = databaseUrlTest.replace(
    /\/[^/?]+(\?[^?]*)?$/,
    "/postgres?schema=public"
  );

  const adminPrisma = new PrismaClient({
    datasources: {
      db: {
        url: adminUrl,
      },
    },
  });

  try {
    await adminPrisma.$executeRawUnsafe(`CREATE DATABASE techdesk_test`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    if (!message.includes("already exists")) {
      throw error;
    }
  } finally {
    await adminPrisma.$disconnect();
  }

  const prismaCliPath = join(
    process.cwd(),
    "node_modules",
    "prisma",
    "build",
    "index.js"
  );

  execFileSync(process.execPath, [prismaCliPath, "migrate", "deploy"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrlTest,
    },
  });
}
