import { Prisma, ServiceOrderStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../errors/AppError";
import { PreparedBudgetItem } from "../types/budget";
import { isUniqueConstraintError } from "../utils/prismaErrors";

type CreateBudgetData = {
  serviceOrderId: string;
  expectedVersion: number | null;
  expectedStatus: ServiceOrderStatus;
  totalValue: Prisma.Decimal.Value;
  items: PreparedBudgetItem[];
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
    try {
      return await prisma.$transaction(async (transaction) => {
        await this.assertVersionBaseline(transaction, data);

        return this.createBudgetRecord(
          transaction,
          data,
          (data.expectedVersion ?? 0) + 1
        );
      });
    } catch (error) {
      this.rethrowVersionConflict(error);
    }
  }

  async createRevision(data: CreateBudgetRevisionData) {
    try {
      return await prisma.$transaction(async (transaction) => {
        await this.assertVersionBaseline(transaction, data);

        const budget = await this.createBudgetRecord(
          transaction,
          data,
          (data.expectedVersion ?? 0) + 1
        );

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
    } catch (error) {
      this.rethrowVersionConflict(error);
    }
  }

  private async assertVersionBaseline(
    transaction: Prisma.TransactionClient,
    data: Pick<
      CreateBudgetData,
      "serviceOrderId" | "expectedVersion" | "expectedStatus"
    >
  ) {
    const lockedOrders = await transaction.$queryRaw<
      Array<{ id: string; status: ServiceOrderStatus }>
    >`
      SELECT "id", "status"
      FROM "ServiceOrder"
      WHERE "id" = ${data.serviceOrderId}
      FOR UPDATE
    `;

    const lockedOrder = lockedOrders[0];

    if (!lockedOrder) {
      throw new AppError("Service order not found", 404);
    }

    const latestBudget = await transaction.budget.findFirst({
      where: {
        serviceOrderId: data.serviceOrderId,
      },
      orderBy: {
        version: "desc",
      },
      select: {
        version: true,
      },
    });

    if (
      lockedOrder.status !== data.expectedStatus ||
      (latestBudget?.version ?? null) !== data.expectedVersion
    ) {
      throw this.versionConflictError();
    }
  }

  private createBudgetRecord(
    transaction: Prisma.TransactionClient,
    data: CreateBudgetData,
    version: number
  ) {
    return transaction.budget.create({
      data: {
        serviceOrderId: data.serviceOrderId,
        version,
        totalValue: data.totalValue,
        budgetItems: {
          create: data.items.map((item) => ({
            type: item.type,
            partId: item.partId,
            description: item.description,
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

  private rethrowVersionConflict(error: unknown): never {
    if (
      isUniqueConstraintError(error, "serviceOrderId") ||
      isUniqueConstraintError(error, "version")
    ) {
      throw this.versionConflictError();
    }

    throw error;
  }

  private versionConflictError() {
    return new AppError(
      "Budget version conflict. Reload the service order and try again",
      409
    );
  }
}

export { BudgetRepository };
