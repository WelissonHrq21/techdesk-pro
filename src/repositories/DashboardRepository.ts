import { ServiceOrderStatus } from "@prisma/client";
import { prisma } from "../config/prisma";

const lowStockThreshold = 5;

class DashboardRepository {
  async getSummary() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      serviceOrdersByStatus,
      openServiceOrders,
      createdToday,
      deliveredToday,
      partsOutOfStock,
      partsLowStock,
      recentServiceOrders,
      recentStockMovements,
    ] = await prisma.$transaction([
      prisma.serviceOrder.groupBy({
        by: ["status"],
        _count: {
          status: true,
        },
      }),
      prisma.serviceOrder.count({
        where: {
          status: {
            notIn: [
              ServiceOrderStatus.DELIVERED,
              ServiceOrderStatus.CANCELLED,
            ],
          },
        },
      }),
      prisma.serviceOrder.count({
        where: {
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),
      prisma.serviceOrderHistory.count({
        where: {
          newStatus: ServiceOrderStatus.DELIVERED,
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),
      prisma.part.count({
        where: {
          active: true,
          stock: 0,
        },
      }),
      prisma.part.count({
        where: {
          active: true,
          stock: {
            gt: 0,
            lte: lowStockThreshold,
          },
        },
      }),
      prisma.serviceOrder.findMany({
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          number: true,
          status: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          equipment: {
            select: {
              id: true,
              type: true,
              brand: true,
              model: true,
            },
          },
        },
      }),
      prisma.stockMovement.findMany({
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          type: true,
          quantity: true,
          createdAt: true,
          part: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          serviceOrder: {
            select: {
              id: true,
              number: true,
            },
          },
        },
      }),
    ]);

    return {
      serviceOrdersByStatus,
      openServiceOrders,
      createdToday,
      deliveredToday,
      partsOutOfStock,
      partsLowStock,
      recentServiceOrders,
      recentStockMovements,
    };
  }
}

export { DashboardRepository, lowStockThreshold };
