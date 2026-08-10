import { StockMovementType } from "@prisma/client";
import { prisma } from "../config/prisma";
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
