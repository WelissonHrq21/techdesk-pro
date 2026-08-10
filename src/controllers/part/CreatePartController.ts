import { Request, Response } from "express";
import { createPartSchema } from "../../schemas/part/createPartSchema";
import { CreatePartService } from "../../services/part/CreatePartService";

class CreatePartController {
  async handle(request: Request, response: Response) {
    const data = createPartSchema.parse(request.body);

    const createPartService = new CreatePartService();

    const part = await createPartService.execute(data);

    return response.status(201).json(part);
  }
}

export { CreatePartController };
