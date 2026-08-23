import {
  BudgetItemType,
  Prisma,
  ServiceOrderStatus,
  StockMovementType,
} from "@prisma/client";
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

type DecideBudgetData = {
  budgetId: string;
  serviceOrderId: string;
  expectedStatus: ServiceOrderStatus;
  newStatus: ServiceOrderStatus;
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
        await this.assertRevisionCoversConsumedParts(transaction, data);

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

  async decide(data: DecideBudgetData) {
    return prisma.$transaction(async (transaction) => {
      const lockedOrder = await this.lockServiceOrder(
        transaction,
        data.serviceOrderId
      );
      const latestBudget = await transaction.budget.findFirst({
        where: { serviceOrderId: data.serviceOrderId },
        orderBy: { version: "desc" },
        select: { id: true },
      });

      if (
        lockedOrder.status !== data.expectedStatus ||
        latestBudget?.id !== data.budgetId
      ) {
        throw new AppError(
          "Budget decision conflict. Reload the service order and try again",
          409
        );
      }

      const serviceOrder = await transaction.serviceOrder.update({
        where: { id: data.serviceOrderId },
        data: { status: data.newStatus },
      });

      await transaction.serviceOrderHistory.create({
        data: {
          serviceOrderId: data.serviceOrderId,
          previousStatus: data.expectedStatus,
          newStatus: data.newStatus,
          userId: data.userId,
          observation: data.observation,
        },
      });

      return serviceOrder;
    });
  }

  private async assertVersionBaseline(
    transaction: Prisma.TransactionClient,
    data: Pick<
      CreateBudgetData,
      "serviceOrderId" | "expectedVersion" | "expectedStatus"
    >
  ) {
    const lockedOrder = await this.lockServiceOrder(
      transaction,
      data.serviceOrderId
    );

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

  private async assertRevisionCoversConsumedParts(
    transaction: Prisma.TransactionClient,
    data: CreateBudgetRevisionData
  ) {
    const exits = await transaction.stockMovement.findMany({
      where: {
        serviceOrderId: data.serviceOrderId,
        type: StockMovementType.EXIT,
      },
      select: { id: true, partId: true, quantity: true },
    });

    if (exits.length === 0) {
      return;
    }

    const reversals = await transaction.stockMovement.groupBy({
      by: ["reversalOfMovementId"],
      where: {
        type: StockMovementType.REVERSAL,
        reversalOfMovementId: { in: exits.map((item) => item.id) },
      },
      _sum: { quantity: true },
    });
    const reversedByExitId = new Map(
      reversals.map((item) => [
        item.reversalOfMovementId,
        item._sum.quantity ?? 0,
      ])
    );
    const consumedByPartId = new Map<string, number>();

    for (const exit of exits) {
      const consumed =
        exit.quantity - (reversedByExitId.get(exit.id) ?? 0);

      if (consumed > 0) {
        consumedByPartId.set(
          exit.partId,
          (consumedByPartId.get(exit.partId) ?? 0) + consumed
        );
      }
    }

    const revisionByPartId = new Map<string, number>();

    for (const item of data.items) {
      if (item.type === BudgetItemType.PART && item.partId) {
        revisionByPartId.set(
          item.partId,
          (revisionByPartId.get(item.partId) ?? 0) + item.quantity
        );
      }
    }

    for (const [partId, consumed] of consumedByPartId) {
      const revisionQuantity = revisionByPartId.get(partId);

      if (revisionQuantity === undefined) {
        throw new AppError(
          "Revised budget cannot remove a part already consumed",
          409
        );
      }

      if (revisionQuantity < consumed) {
        throw new AppError(
          "Revised budget quantity cannot be lower than already consumed quantity",
          409
        );
      }
    }
  }

  private async lockServiceOrder(
    transaction: Prisma.TransactionClient,
    serviceOrderId: string
  ) {
    const orders = await transaction.$queryRaw<
      Array<{ id: string; status: ServiceOrderStatus }>
    >`
      SELECT "id", "status"
      FROM "ServiceOrder"
      WHERE "id" = ${serviceOrderId}
      FOR UPDATE
    `;

    if (!orders[0]) {
      throw new AppError("Service order not found", 404);
    }

    return orders[0];
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
