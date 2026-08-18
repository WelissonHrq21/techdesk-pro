import { prisma } from "../../config/prisma";

class GetSetupStatusService {
  async execute() {
    let settings = await prisma.companySettings.findFirst({
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!settings && (await this.hasOperationalData())) {
      settings = await prisma.companySettings.create({
        data: {
          singletonKey: "default",
          name: "",
          setupCompleted: true,
          setupCompletedAt: new Date(),
        },
      });
    }

    return {
      setupCompleted: settings?.setupCompleted ?? false,
      setupCompletedAt: settings?.setupCompletedAt ?? null,
      companySettings: settings ?? null,
      initialUsers: await prisma.user.findMany({
        where: {
          active: true,
          role: {
            in: ["RECEPTION", "TECHNICIAN"],
          },
        },
        select: {
          id: true,
          name: true,
          login: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
    };
  }

  private async hasOperationalData() {
    const [
      customers,
      equipments,
      serviceOrders,
      parts,
      budgets,
      stockMovements,
    ] = await prisma.$transaction([
      prisma.customer.count(),
      prisma.equipment.count(),
      prisma.serviceOrder.count(),
      prisma.part.count(),
      prisma.budget.count(),
      prisma.stockMovement.count(),
    ]);

    return (
      customers > 0 ||
      equipments > 0 ||
      serviceOrders > 0 ||
      parts > 0 ||
      budgets > 0 ||
      stockMovements > 0
    );
  }
}

export { GetSetupStatusService };
