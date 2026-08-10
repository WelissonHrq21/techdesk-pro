import { Request, Response } from "express";
import { changeServiceOrderStatusSchema } from "../../schemas/service-order/changeServiceOrderStatusSchema";
import { ChangeServiceOrderStatusService } from "../../services/service-order/ChangeServiceOrderStatusService";

type ChangeStatusParams = {
  id: string;
};

class ChangeServiceOrderStatusController {
  async handle(
    request: Request,
    response: Response
  ) {
    const { id } = request.params as { id: string };

    const { status, observation } =
      changeServiceOrderStatusSchema.parse(request.body);
    
    
    const changeServiceOrderStatusService = new ChangeServiceOrderStatusService();


    const serviceOrder = await changeServiceOrderStatusService.execute({
      id,
      status,
      userRole: request.user.role,
      userId: request.user.id,
      observation,
    });


    return response.status(200).json(serviceOrder);
  }
}

export { ChangeServiceOrderStatusController };
