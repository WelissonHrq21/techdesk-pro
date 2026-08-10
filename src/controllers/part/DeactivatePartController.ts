import { Request, Response } from "express";
import { DeactivatePartService } from "../../services/part/DeactivatePartService";

type DeactivatePartParams = {
  id: string;
};

class DeactivatePartController {
  async handle(
    request: Request,
    response: Response
  ) {
    const { id } = request.params as { id: string };

    const deactivatePartService = new DeactivatePartService();

    const part = await deactivatePartService.execute(id);

    return response.status(200).json(part);
  }
}

export { DeactivatePartController };
