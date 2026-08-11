import { AppError } from "../../errors/AppError";
import { prisma } from "../../config/prisma";

class FindPublicServiceOrderService {
  async execute(token: string) {
    const serviceOrder = await prisma.serviceOrder.findUnique({
      where: {
        publicToken: token,
      },
      select: {
        number: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        equipment: {
          select: {
            type: true,
            brand: true,
            model: true,
          },
        },
      },
    });

    if (!serviceOrder) {
      throw new AppError("Public service order not found", 404);
    }

    return serviceOrder;
  }
}

export { FindPublicServiceOrderService };
