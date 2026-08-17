import { AppError } from "../../errors/AppError";
import { ServiceOrderRepository } from "../../repositories/ServiceOrderRepository";
import { UserRole } from "@prisma/client";

class FindServiceOrderService {
  async execute(id: string, role: UserRole) {
    const serviceOrderRepository = new ServiceOrderRepository();

    const serviceOrder = await serviceOrderRepository.findById(id, role);

    if (!serviceOrder) {
      throw new AppError("Service order not found", 404);
    }

    return serviceOrder;
  }
}

export { FindServiceOrderService };
