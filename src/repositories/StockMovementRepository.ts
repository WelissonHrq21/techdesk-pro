import { ServiceOrderStatus, StockMovementType } from "@prisma/client";
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

type ReverseStockMovementData = {
  movementId: string;
  quantity: number;
  reason: string;
  userId: string;
  allowedStatuses: ServiceOrderStatus[];
};

class StockMovementRepository {
  async createEntry(data: CreateStockEntryData) {
    return prisma.$transaction(async (transaction) => {
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

  async findByPartId(partId: string) {
    return prisma.stockMovement.findMany({
      where: {
        partId,
      },
      include: {
        user: {
          select: publicUserSelect,
        },
        serviceOrder: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
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

  async findConsumedPartsByServiceOrder(serviceOrderId: string) {
    const consumedParts = await prisma.stockMovement.groupBy({
      by: ["partId"],
      where: {
        type: StockMovementType.EXIT,
        serviceOrderId,
      },
      _sum: {
        quantity: true,
      },
    });

    return consumedParts.map((item) => ({
      partId: item.partId,
      consumed: item._sum.quantity ?? 0,
    }));
  }
}

export { StockMovementRepository };
