import { ServiceOrderStatus } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import { ServiceOrderRepository } from "../../repositories/ServiceOrderRepository";

type UpdateServiceOrderDiagnosisData = {
  id: string;
  diagnosis: string;
};

class UpdateServiceOrderDiagnosisService {
  async execute({ id, diagnosis }: UpdateServiceOrderDiagnosisData) {
    const serviceOrderRepository = new ServiceOrderRepository();

    const serviceOrder = await serviceOrderRepository.findById(id);

    if (!serviceOrder) {
      throw new AppError("Service order not found", 404);
    }

    if (serviceOrder.status !== ServiceOrderStatus.IN_ANALYSIS) {
      throw new AppError(
        "Diagnosis can only be updated while the service order is in analysis",
        400
      );
    }

    return serviceOrderRepository.updateDiagnosis(id, diagnosis);
  }
}

export { UpdateServiceOrderDiagnosisService };
