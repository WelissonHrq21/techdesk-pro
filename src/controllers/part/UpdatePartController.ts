import { Request, Response } from "express";
import { updatePartSchema } from "../../schemas/part/updatePartSchema";
import { UpdatePartService } from "../../services/part/UpdatePartService";

type UpdatePartParams = {
  id: string;
};

class UpdatePartController {
  async handle(request: Request, response: Response) {
    const { id } = request.params as { id: string };
    const data = updatePartSchema.parse(request.body);

    const updatePartService = new UpdatePartService();

    const part = await updatePartService.execute(id, data);

    return response.status(200).json(part);
  }
}

export { UpdatePartController };
