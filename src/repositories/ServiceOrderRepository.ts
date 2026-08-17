import { Prisma, ServiceOrderStatus, UserRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { getCustomerSelectForRole } from "../serializers/customerSerializer";
import { publicUserSelect } from "./UserRepository";

type CreateServiceOrderData = {
  customerId: string;
  equipmentId: string;
  userId?: string;
  reportedIssue: string;
  password?: string;
  accessories?: Array<{
    description: string;
    quantity: number;
    observation?: string;
  }>;
};

type ChangeStatusData = {
  id: string;
  previousStatus: ServiceOrderStatus;
  newStatus: ServiceOrderStatus;
  userId?: string;
  observation?: string;
};

type FindManyServiceOrdersData = {
  page: number;
  limit: number;
  skip: number;
  statuses?: ServiceOrderStatus[];
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  customerId?: string;
  equipmentId?: string;
  sortBy: "createdAt" | "updatedAt" | "number";
  sortOrder: "asc" | "desc";
};

class ServiceOrderRepository {
  async findOpenByEquipmentId(equipmentId: string) {
    return prisma.serviceOrder.findFirst({
      where: {
        equipmentId,
        status: {
          notIn: [
            ServiceOrderStatus.DELIVERED,
            ServiceOrderStatus.CANCELLED,
          ],
        },
      },
    });
  }

  async create(data: CreateServiceOrderData) {
    return prisma.serviceOrder.create({
      data: {
        customerId: data.customerId,
        equipmentId: data.equipmentId,
        userId: data.userId,
        reportedIssue: data.reportedIssue,
        password: data.password,

        accessories: data.accessories
          ? {
              create: data.accessories,
            }
          : undefined,
      },

      include: {
        accessories: true,
      },
    });
  }

  async findById(id: string, role: UserRole = UserRole.ADMIN) {
    return prisma.serviceOrder.findUnique({
      where: {
        id,
      },
      include: {
        customer: {
          select: getCustomerSelectForRole(role),
        },
        equipment: true,
        user: {
          select: publicUserSelect,
        },
        accessories: true,
        budgets: {
          include: {
            budgetItems: {
              include: {
                part: true,
              },
            },
          },
          orderBy: {
            version: "asc",
          },
        },
        serviceOrderHistories: {
          include: {
            user: {
              select: publicUserSelect,
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        stockMovements: {
          include: {
            part: true,
            user: {
              select: publicUserSelect,
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  }

  async findMany(data: FindManyServiceOrdersData) {
    const where = this.buildFindManyWhere(data);

    const [serviceOrders, total] = await prisma.$transaction([
      prisma.serviceOrder.findMany({
        where,
        skip: data.skip,
        take: data.limit,
        orderBy: {
          [data.sortBy]: data.sortOrder,
        },
        select: {
          id: true,
          number: true,
          status: true,
          reportedIssue: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          equipment: {
            select: {
              id: true,
              type: true,
              brand: true,
              model: true,
              serialNumber: true,
            },
          },
        },
      }),
      prisma.serviceOrder.count({
        where,
      }),
    ]);

    return {
      data: serviceOrders,
      total,
    };
  }

  private buildFindManyWhere(data: FindManyServiceOrdersData) {
    const conditions: Prisma.ServiceOrderWhereInput[] = [];

    if (data.statuses?.length) {
      conditions.push({
        status: {
          in: data.statuses,
        },
      });
    }

    if (data.customerId) {
      conditions.push({
        customerId: data.customerId,
      });
    }

    if (data.equipmentId) {
      conditions.push({
        equipmentId: data.equipmentId,
      });
    }

    if (data.dateFrom || data.dateTo) {
      conditions.push({
        createdAt: {
          gte: data.dateFrom,
          lte: data.dateTo,
        },
      });
    }

    if (data.search) {
      const searchConditions: Prisma.ServiceOrderWhereInput[] = [
        {
          customer: {
            name: {
              contains: data.search,
              mode: "insensitive",
            },
          },
        },
        {
          customer: {
            phone: {
              contains: data.search,
              mode: "insensitive",
            },
          },
        },
        {
          equipment: {
            type: {
              contains: data.search,
              mode: "insensitive",
            },
          },
        },
        {
          equipment: {
            brand: {
              contains: data.search,
              mode: "insensitive",
            },
          },
        },
        {
          equipment: {
            model: {
              contains: data.search,
              mode: "insensitive",
            },
          },
        },
        {
          equipment: {
            serialNumber: {
              contains: data.search,
              mode: "insensitive",
            },
          },
        },
      ];

      const serviceOrderNumber = Number(data.search);

      if (
        Number.isInteger(serviceOrderNumber) &&
        serviceOrderNumber >= -2147483648 &&
        serviceOrderNumber <= 2147483647
      ) {
        searchConditions.push({
          number: serviceOrderNumber,
        });
      }

      conditions.push({
        OR: searchConditions,
      });
    }

    return conditions.length
      ? {
          AND: conditions,
        }
      : {};
  }

  async updateStatus(
    id: string,
    status: ServiceOrderStatus
  ) {
    return prisma.serviceOrder.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
  }

  async updateDiagnosis(id: string, diagnosis: string) {
    return prisma.serviceOrder.update({
      where: {
        id,
      },
      data: {
        diagnosis,
      },
    });
  }

  async changeStatusWithHistory(data: ChangeStatusData) {
    return prisma.$transaction(async (transaction) => {
      const serviceOrder = await transaction.serviceOrder.update({
        where: {
          id: data.id,
        },
        data: {
          status: data.newStatus,
        },
      });

      await transaction.serviceOrderHistory.create({
        data: {
          serviceOrderId: data.id,
          previousStatus: data.previousStatus,
          newStatus: data.newStatus,
          userId: data.userId,
          observation: data.observation,
        },
      });

      return serviceOrder;
    });
  }
}

export { ServiceOrderRepository };
