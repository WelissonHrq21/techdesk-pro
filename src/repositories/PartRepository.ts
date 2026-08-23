import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import type { StockStatus } from "../utils/stockStatus";

type FindManyPartsData = {
  skip: number;
  limit: number;
  search?: string;
  maxStock?: number;
  stockStatus?: StockStatus;
};

class PartRepository {
  async create(data: Prisma.PartCreateInput) {
    return prisma.part.create({
      data,
    });
  }

  async findAll() {
    return prisma.part.findMany({
      where: {
        active: true,
      },
    });
  }

  async findMany(data: FindManyPartsData) {
    const stockStatusWhere = this.buildStockStatusWhere(data.stockStatus);
    const where: Prisma.PartWhereInput = {
      active: true,
      ...stockStatusWhere,
      ...(typeof data.maxStock === "number"
        ? {
            stock: {
              lte: data.maxStock,
            },
          }
        : {}),
      ...(data.search
        ? {
            OR: [
              {
                name: {
                  contains: data.search,
                  mode: "insensitive",
                },
              },
              {
                brand: {
                  contains: data.search,
                  mode: "insensitive",
                },
              },
              {
                supplier: {
                  contains: data.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    const [parts, total] = await prisma.$transaction([
      prisma.part.findMany({
        where,
        skip: data.skip,
        take: data.limit,
        orderBy: {
          name: "asc",
        },
      }),
      prisma.part.count({
        where,
      }),
    ]);

    return {
      data: parts,
      total,
    };
  }

  async findById(id: string) {
    return prisma.part.findUnique({
      where: {
        id,
      },
    });
  }

  async update(id: string, data: Prisma.PartUpdateInput) {
    return prisma.part.update({
      where: {
        id,
      },
      data,
    });
  }

  async deactivate(id: string) {
    return prisma.part.update({
      where: {
        id,
      },
      data: {
        active: false,
      },
    });
  }

  private buildStockStatusWhere(
    stockStatus?: StockStatus
  ): Prisma.PartWhereInput {
    if (stockStatus === "OUT_OF_STOCK") {
      return { stock: 0 };
    }

    if (stockStatus === "LOW_STOCK") {
      return {
        stock: {
          gt: 0,
          lte: prisma.part.fields.minimumStock,
        },
        minimumStock: { gt: 0 },
      };
    }

    if (stockStatus === "OK") {
      return {
        stock: {
          gt: prisma.part.fields.minimumStock,
        },
      };
    }

    return {};
  }
}

export { PartRepository };
