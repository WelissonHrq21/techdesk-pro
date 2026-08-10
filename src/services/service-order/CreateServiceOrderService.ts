import { AppError } from "../../errors/AppError";
import { CustomerRepository } from "../../repositories/CustomerRepository";
import { EquipmentRepository } from "../../repositories/EquipmentRepository";
import { ServiceOrderRepository } from "../../repositories/ServiceOrderRepository";
import { UserRepository } from "../../repositories/UserRepository";

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

class CreateServiceOrderService {
  async execute(data: CreateServiceOrderData) {
    const customerRepository = new CustomerRepository();
    const equipmentRepository = new EquipmentRepository();
    const serviceOrderRepository = new ServiceOrderRepository();
    const userRepository = new UserRepository();

    const customer = await customerRepository.findById(data.customerId);

    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    if (!customer.active) {
      throw new AppError("Customer is inactive", 400);
    }

    const equipment = await equipmentRepository.findById(data.equipmentId);

    if (!equipment) {
      throw new AppError("Equipment not found", 404);
    }

    if (!equipment.active) {
      throw new AppError("Equipment is inactive", 400);
    }

    if (equipment.customerId !== data.customerId) {
      throw new AppError(
        "Equipment does not belong to this customer",
        400
      );
    }

    if (data.userId) {
      const user = await userRepository.findById(data.userId);

      if (!user) {
        throw new AppError("User not found", 404);
      }

      if (!user.active) {
        throw new AppError("User is inactive", 400);
      }
    }

    const openServiceOrder =
      await serviceOrderRepository.findOpenByEquipmentId(
        data.equipmentId
      );

    if (openServiceOrder) {
      throw new AppError(
        "This equipment already has an open service order",
        409
      );
    }

    return serviceOrderRepository.create(data);
  }
}

export { CreateServiceOrderService };