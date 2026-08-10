import { Request, Response } from "express";
import { updateServiceOrderDiagnosisSchema } from "../../schemas/service-order/updateServiceOrderDiagnosisSchema";
import { UpdateServiceOrderDiagnosisService } from "../../services/service-order/UpdateServiceOrderDiagnosisService";

type UpdateDiagnosisParams = {
  id: string;
};

class UpdateServiceOrderDiagnosisController {
  async handle(
    request: Request,
    response: Response
  ) {
    const { id } = request.params as { id: string };
    const { diagnosis } = updateServiceOrderDiagnosisSchema.parse(
      request.body
    );

    const updateServiceOrderDiagnosisService =
      new UpdateServiceOrderDiagnosisService();

    const serviceOrder =
      await updateServiceOrderDiagnosisService.execute({
        id,
        diagnosis,
      });

    return response.status(200).json(serviceOrder);
  }
}

export { UpdateServiceOrderDiagnosisController };
