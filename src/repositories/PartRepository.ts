import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

type FindManyPartsData = {
  skip: number;
  limit: number;
  search?: string;
  maxStock?: number;
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
    const where: Prisma.PartWhereInput = {
      active: true,
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
}

export { PartRepository };
