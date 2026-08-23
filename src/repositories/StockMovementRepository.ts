import {
  Prisma,
  ServiceOrderStatus,
  StockMovementType,
} from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../errors/AppError";
import { publicUserSelect } from "./UserRepository";

type CreateStockEntryData = {
  partId: string;
  quantity: number;
  reason?: string;
  userId?: string;
};

type CreateStockExitData = CreateStockEntryData & {
  serviceOrderId?: string;
};

type CreateServiceOrderStockExitData = CreateStockEntryData & {
  serviceOrderId: string;
  approvedQuantity: number;
};

type FindPartStockMovementsData = {
  partId: string;
  skip: number;
  limit: number;
  type?: StockMovementType;
  dateFrom?: Date;
  dateTo?: Date;
};

type ReverseStockMovementData = {
  movementId: string;
  quantity: number;
  reason: string;
  userId: string;
  allowedStatuses: ServiceOrderStatus[];
};

type PrismaExecutor = typeof prisma | Prisma.TransactionClient;

class StockMovementRepository {
  async createEntry(data: CreateStockEntryData) {
    return prisma.$transaction(async (transaction) => {
      await this.lockPart(transaction, data.partId);

      const existingPart = await transaction.part.findUnique({
        where: { id: data.partId },
      });

      if (!existingPart) {
        throw new AppError("Part not found", 404);
      }

      if (!existingPart.active) {
        throw new AppError("Part is inactive", 400);
      }

      const part = await transaction.part.update({
        where: {
          id: data.partId,
        },
        data: {
          stock: {
            increment: data.quantity,
          },
        },
      });

      const movement = await transaction.stockMovement.create({
        data: {
          type: StockMovementType.ENTRY,
          quantity: data.quantity,
          reason: data.reason,
          partId: data.partId,
          userId: data.userId,
        },
        include: {
          user: {
            select: publicUserSelect,
          },
          serviceOrder: true,
        },
      });

      return {
        part,
        movement,
      };
    });
  }

  async createExit(data: CreateStockExitData) {
    return prisma.$transaction(async (transaction) => {
      if (data.serviceOrderId) {
        await this.lockServiceOrder(transaction, data.serviceOrderId);
      }

      await this.lockPart(transaction, data.partId);

      const existingPart = await transaction.part.findUnique({
        where: { id: data.partId },
      });

      if (!existingPart) {
        throw new AppError("Part not found", 404);
      }

      if (!existingPart.active) {
        throw new AppError("Part is inactive", 400);
      }

      if (existingPart.stock < data.quantity) {
        throw new AppError("Insufficient stock", 409);
      }

      const part = await transaction.part.update({
        where: {
          id: data.partId,
        },
        data: {
          stock: {
            decrement: data.quantity,
          },
        },
      });

      const movement = await transaction.stockMovement.create({
        data: {
          type: StockMovementType.EXIT,
          quantity: data.quantity,
          reason: data.reason,
          partId: data.partId,
          serviceOrderId: data.serviceOrderId,
          userId: data.userId,
        },
        include: {
          user: {
            select: publicUserSelect,
          },
          serviceOrder: true,
        },
      });

      return {
        part,
        movement,
      };
    });
  }

  async createServiceOrderExit(data: CreateServiceOrderStockExitData) {
    return prisma.$transaction(async (transaction) => {
      await this.lockServiceOrder(transaction, data.serviceOrderId);

      const netConsumed =
        await this.sumNetConsumedQuantityByPartAndServiceOrder(
          data.partId,
          data.serviceOrderId,
          transaction
        );

      if (netConsumed + data.quantity > data.approvedQuantity) {
        throw new AppError(
          "Consumed quantity exceeds approved budget quantity",
          409
        );
      }

      await this.lockPart(transaction, data.partId);

      const existingPart = await transaction.part.findUnique({
        where: {
          id: data.partId,
        },
      });

      if (!existingPart) {
        throw new AppError("Part not found", 404);
      }

      if (!existingPart.active) {
        throw new AppError("Part is inactive", 400);
      }

      if (existingPart.stock < data.quantity) {
        throw new AppError("Insufficient stock", 409);
      }

      const part = await transaction.part.update({
        where: {
          id: data.partId,
        },
        data: {
          stock: {
            decrement: data.quantity,
          },
        },
      });

      const movement = await transaction.stockMovement.create({
        data: {
          type: StockMovementType.EXIT,
          quantity: data.quantity,
          reason: data.reason,
          partId: data.partId,
          serviceOrderId: data.serviceOrderId,
          userId: data.userId,
        },
        include: {
          user: {
            select: publicUserSelect,
          },
          serviceOrder: true,
        },
      });

      return {
        part,
        movement,
      };
    });
  }

  async findByPartId(data: FindPartStockMovementsData) {
    const where: Prisma.StockMovementWhereInput = {
      partId: data.partId,
      type: data.type,
      ...(data.dateFrom || data.dateTo
        ? {
            createdAt: {
              gte: data.dateFrom,
              lte: data.dateTo,
            },
          }
        : {}),
    };

    const [movements, total] = await prisma.$transaction([
      prisma.stockMovement.findMany({
        where,
        skip: data.skip,
        take: data.limit,
        include: {
          user: {
            select: publicUserSelect,
          },
          serviceOrder: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return { data: movements, total };
  }

  async reverseExitMovement(data: ReverseStockMovementData) {
    return prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id"
        FROM "StockMovement"
        WHERE "id" = ${data.movementId}
        FOR UPDATE
      `;

      const originalMovement =
        await transaction.stockMovement.findUnique({
          where: {
            id: data.movementId,
          },
          include: {
            part: true,
            serviceOrder: {
              select: {
                id: true,
                number: true,
                status: true,
              },
            },
            user: {
              select: publicUserSelect,
            },
          },
        });

      if (!originalMovement) {
        throw new AppError("Stock movement not found", 404);
      }

      if (originalMovement.type !== StockMovementType.EXIT) {
        throw new AppError(
          "Only EXIT movements can be reversed",
          400
        );
      }

      if (
        !originalMovement.serviceOrderId ||
        !originalMovement.serviceOrder
      ) {
        throw new AppError(
          "Only service order EXIT movements can be reversed",
          400
        );
      }

      if (
        !data.allowedStatuses.includes(
          originalMovement.serviceOrder.status
        )
      ) {
        throw new AppError(
          "Service order status does not allow stock reversal",
          400
        );
      }

      await this.lockServiceOrder(
        transaction,
        originalMovement.serviceOrderId
      );

      await this.lockPart(transaction, originalMovement.partId);

      const reversedQuantityResult =
        await transaction.stockMovement.aggregate({
          where: {
            type: StockMovementType.REVERSAL,
            reversalOfMovementId: originalMovement.id,
          },
          _sum: {
            quantity: true,
          },
        });

      const reversedQuantity =
        reversedQuantityResult._sum.quantity ?? 0;
      const reversibleQuantity =
        originalMovement.quantity - reversedQuantity;

      if (data.quantity > reversibleQuantity) {
        throw new AppError(
          "Reversal quantity exceeds available reversible quantity",
          409
        );
      }

      const part = await transaction.part.update({
        where: {
          id: originalMovement.partId,
        },
        data: {
          stock: {
            increment: data.quantity,
          },
        },
      });

      const movement = await transaction.stockMovement.create({
        data: {
          type: StockMovementType.REVERSAL,
          quantity: data.quantity,
          reason: data.reason,
          partId: originalMovement.partId,
          serviceOrderId: originalMovement.serviceOrderId,
          userId: data.userId,
          reversalOfMovementId: originalMovement.id,
        },
        include: {
          part: true,
          user: {
            select: publicUserSelect,
          },
          serviceOrder: {
            select: {
              id: true,
              number: true,
              status: true,
            },
          },
          reversalOfMovement: {
            select: {
              id: true,
              type: true,
              quantity: true,
              partId: true,
              serviceOrderId: true,
              userId: true,
              createdAt: true,
            },
          },
        },
      });

      return {
        part,
        movement,
        originalMovement,
        reversedQuantity: reversedQuantity + data.quantity,
        reversibleQuantity: reversibleQuantity - data.quantity,
      };
    });
  }

  async sumExitedQuantityByPartAndServiceOrder(
    partId: string,
    serviceOrderId: string
  ) {
    const result = await prisma.stockMovement.aggregate({
      where: {
        type: StockMovementType.EXIT,
        partId,
        serviceOrderId,
      },
      _sum: {
        quantity: true,
      },
    });

    return result._sum.quantity ?? 0;
  }

  async sumNetConsumedQuantityByPartAndServiceOrder(
    partId: string,
    serviceOrderId: string,
    executor: PrismaExecutor = prisma
  ) {
    const exitMovements = await executor.stockMovement.findMany({
      where: {
        type: StockMovementType.EXIT,
        partId,
        serviceOrderId,
      },
      select: {
        id: true,
        quantity: true,
      },
    });

    const grossConsumed = exitMovements.reduce((total, movement) => {
      return total + movement.quantity;
    }, 0);

    if (exitMovements.length === 0) {
      return 0;
    }

    const reversedResult = await executor.stockMovement.aggregate({
      where: {
        type: StockMovementType.REVERSAL,
        reversalOfMovementId: {
          in: exitMovements.map((movement) => movement.id),
        },
      },
      _sum: {
        quantity: true,
      },
    });

    const reversed = reversedResult._sum.quantity ?? 0;
    const netConsumed = grossConsumed - reversed;

    if (netConsumed < 0) {
      throw new AppError(
        "Net consumed quantity is inconsistent",
        500
      );
    }

    return netConsumed;
  }

  async findConsumedPartsByServiceOrder(serviceOrderId: string) {
    const exitMovements = await prisma.stockMovement.findMany({
      where: {
        type: StockMovementType.EXIT,
        serviceOrderId,
      },
      select: {
        id: true,
        partId: true,
        quantity: true,
      },
    });

    if (exitMovements.length === 0) {
      return [];
    }

    const reversedByOriginalMovement = await prisma.stockMovement.groupBy({
      by: ["reversalOfMovementId"],
      where: {
        type: StockMovementType.REVERSAL,
        reversalOfMovementId: {
          in: exitMovements.map((movement) => movement.id),
        },
      },
      _sum: {
        quantity: true,
      },
    });

    const reversedByMovementId = new Map(
      reversedByOriginalMovement.map((item) => [
        item.reversalOfMovementId,
        item._sum.quantity ?? 0,
      ])
    );

    const consumedByPartId = new Map<string, number>();

    for (const movement of exitMovements) {
      const netConsumed =
        movement.quantity - (reversedByMovementId.get(movement.id) ?? 0);

      if (netConsumed < 0) {
        throw new AppError(
          "Net consumed quantity is inconsistent",
          500
        );
      }

      consumedByPartId.set(
        movement.partId,
        (consumedByPartId.get(movement.partId) ?? 0) + netConsumed
      );
    }

    return Array.from(consumedByPartId.entries())
      .filter(([, consumed]) => consumed > 0)
      .map(([partId, consumed]) => ({
        partId,
        consumed,
      }));
  }

  private async lockServiceOrder(
    transaction: Prisma.TransactionClient,
    serviceOrderId: string
  ) {
    await transaction.$queryRaw`
      SELECT "id"
      FROM "ServiceOrder"
      WHERE "id" = ${serviceOrderId}
      FOR UPDATE
    `;
  }

  private async lockPart(
    transaction: Prisma.TransactionClient,
    partId: string
  ) {
    await transaction.$queryRaw`
      SELECT "id"
      FROM "Part"
      WHERE "id" = ${partId}
      FOR UPDATE
    `;
  }
}

export { StockMovementRepository };
