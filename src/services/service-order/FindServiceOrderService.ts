import { AppError } from "../../errors/AppError";
import { ServiceOrderRepository } from "../../repositories/ServiceOrderRepository";

class FindServiceOrderService {
  async execute(id: string) {
    const serviceOrderRepository = new ServiceOrderRepository();

    const serviceOrder = await serviceOrderRepository.findById(id);

    if (!serviceOrder) {
      throw new AppError("Service order not found", 404);
    }

    return serviceOrder;
  }
}

export { FindServiceOrderService };