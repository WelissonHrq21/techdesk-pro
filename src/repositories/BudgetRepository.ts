import { Prisma, ServiceOrderStatus } from "@prisma/client";
import { prisma } from "../config/prisma";

type CreateBudgetData = {
  serviceOrderId: string;
  version: number;
  totalValue: Prisma.Decimal.Value;
  items: Array<{
    partId: string;
    quantity: number;
    unitPrice: Prisma.Decimal.Value;
  }>;
};

type CreateBudgetRevisionData = CreateBudgetData & {
  previousStatus: ServiceOrderStatus;
  userId?: string;
  observation?: string;
};

class BudgetRepository {
  async findLastVersionByServiceOrderId(serviceOrderId: string) {
    return prisma.budget.findFirst({
      where: {
        serviceOrderId,
      },
      orderBy: {
        version: "desc",
      },
      select: {
        id: true,
        version: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.budget.findUnique({
      where: {
        id,
      },
    });
  }

  async findLatestWithItemsByServiceOrderId(serviceOrderId: string) {
    return prisma.budget.findFirst({
      where: {
        serviceOrderId,
      },
      orderBy: {
        version: "desc",
      },
      include: {
        budgetItems: {
          include: {
            part: true,
          },
        },
      },
    });
  }

  async create(data: CreateBudgetData) {
    return prisma.budget.create({
      data: {
        serviceOrderId: data.serviceOrderId,
        version: data.version,
        totalValue: data.totalValue,
        budgetItems: {
          create: data.items.map((item) => ({
            partId: item.partId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: {
        budgetItems: {
          include: {
            part: true,
          },
        },
      },
    });
  }

  async createRevision(data: CreateBudgetRevisionData) {
    return prisma.$transaction(async (transaction) => {
      const budget = await transaction.budget.create({
        data: {
          serviceOrderId: data.serviceOrderId,
          version: data.version,
          totalValue: data.totalValue,
          budgetItems: {
            create: data.items.map((item) => ({
              partId: item.partId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: {
          budgetItems: {
            include: {
              part: true,
            },
          },
        },
      });

      await transaction.serviceOrder.update({
        where: {
          id: data.serviceOrderId,
        },
        data: {
          status: ServiceOrderStatus.BUDGET_CHANGED_AWAITING_APPROVAL,
        },
      });

      await transaction.serviceOrderHistory.create({
        data: {
          serviceOrderId: data.serviceOrderId,
          previousStatus: data.previousStatus,
          newStatus: ServiceOrderStatus.BUDGET_CHANGED_AWAITING_APPROVAL,
          userId: data.userId,
          observation: data.observation,
        },
      });

      return budget;
    });
  }
}

export { BudgetRepository };
