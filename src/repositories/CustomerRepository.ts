import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { getCustomerSelectForRole } from "../serializers/customerSerializer";
import { normalizeCustomerDocument } from "../utils/customerDocument";

type FindManyCustomersData = {
  skip: number;
  limit: number;
  search?: string;
  role: UserRole;
};

class CustomerRepository {
  async create(data: Prisma.CustomerCreateInput, role: UserRole) {
    return prisma.customer.create({
      data,
      select: getCustomerSelectForRole(role),
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
    const normalizedSearchDocument = normalizeCustomerDocument(data.search);
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
              ...(normalizedSearchDocument
                ? [
                    {
                      document: {
                        contains: normalizedSearchDocument,
                      },
                    },
                  ]
                : []),
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
          ...getCustomerSelectForRole(data.role),
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

  async findByIdForRole(id: string, role: UserRole){
    return prisma.customer.findUnique({
      where: {
        id
      },
      select: getCustomerSelectForRole(role),
    })
  }

  async findByEmail(email: string) {
  return prisma.customer.findUnique({
    where: {
      email,
    },
  });
}

  async findByDocument(document: string) {
    return prisma.customer.findUnique({
      where: {
        document,
      },
    });
  }

  async update(id: string, data: Prisma.CustomerUpdateInput, role?: UserRole){
    return prisma.customer.update({
      where: {
        id
      },
      data,
      ...(role
        ? {
            select: getCustomerSelectForRole(role),
          }
        : {}),
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
