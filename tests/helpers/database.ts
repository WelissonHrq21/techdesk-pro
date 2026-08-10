import { prisma } from "../../src/config/prisma";

export async function resetDatabase() {
  await prisma.budgetItem.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.serviceOrderHistory.deleteMany();
  await prisma.accessory.deleteMany();
  await prisma.serviceOrder.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.part.deleteMany();
  await prisma.user.deleteMany();
}

export { prisma };
