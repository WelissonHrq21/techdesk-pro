import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";

const seedEnvSchema = z.object({
  ADMIN_NAME: z.string().trim().min(1, {
    message: "ADMIN_NAME is required",
  }),
  ADMIN_LOGIN: z.string().trim().min(3, {
    message: "ADMIN_LOGIN must have at least 3 characters",
  }),
  ADMIN_PASSWORD: z.string().min(6, {
    message: "ADMIN_PASSWORD must have at least 6 characters",
  }),
});

const prisma = new PrismaClient();

async function main() {
  const env = seedEnvSchema.parse(process.env);

  const existingAdmin = await prisma.user.findUnique({
    where: {
      login: env.ADMIN_LOGIN,
    },
  });

  if (existingAdmin) {
    console.log("Initial administrator already exists");
    return;
  }

  const passwordHash = await hash(env.ADMIN_PASSWORD, 10);

  await prisma.user.create({
    data: {
      name: env.ADMIN_NAME,
      login: env.ADMIN_LOGIN,
      password: passwordHash,
      role: UserRole.ADMIN,
    },
  });

  console.log("Initial administrator created");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
