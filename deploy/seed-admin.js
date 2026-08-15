const { PrismaClient, UserRole } = require("@prisma/client");
const { hash } = require("bcryptjs");

const required = ["ADMIN_NAME", "ADMIN_LOGIN", "ADMIN_PASSWORD"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`${key} is required`);
    process.exit(1);
  }
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const existingAdmin = await prisma.user.findUnique({
      where: {
        login: process.env.ADMIN_LOGIN,
      },
    });

    if (existingAdmin) {
      console.log("Initial administrator already exists");
      return;
    }

    const passwordHash = await hash(process.env.ADMIN_PASSWORD, 10);

    await prisma.user.create({
      data: {
        name: process.env.ADMIN_NAME,
        login: process.env.ADMIN_LOGIN,
        password: passwordHash,
        role: UserRole.ADMIN,
      },
    });

    console.log("Initial administrator created");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
