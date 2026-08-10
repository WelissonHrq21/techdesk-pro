import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

type FindManyCustomersData = {
  skip: number;
  limit: number;
  search?: string;
};

class CustomerRepository {
  async create(data: Prisma.CustomerCreateInput) {
    return prisma.customer.create({
      data,
    });
  };

  async findAll() {
    return prisma.customer.findMany({
      where: {
        active: true
      }
    })
  }

  async findMany(data: FindManyCustomersData) {
    const where: Prisma.CustomerWhereInput = {
      active: true,
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
                phone: {
                  contains: data.search,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: data.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    const [customers, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        skip: data.skip,
        take: data.limit,
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          zipCode: true,
          address: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.customer.count({
        where,
      }),
    ]);

    return {
      data: customers,
      total,
    };
  }

  async findById(id: string){
    return prisma.customer.findUnique({
      where: {
        id
      }
    })
  }

  async findByEmail(email: string) {
  return prisma.customer.findUnique({
    where: {
      email,
    },
  });
}

  async update(id: string, data: Prisma.CustomerUpdateInput){
    return prisma.customer.update({
      where: {
        id
      },
      data
    })
  }

  async deactivate(id: string){
    return prisma.customer.update({
      where: {
        id
      },
      data: {
        active: false
      }
    })
  }
}

export { CustomerRepository }
