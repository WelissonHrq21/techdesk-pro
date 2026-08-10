import { Request, Response } from "express";
import { FindPartService } from "../../services/part/FindPartService";

type FindPartParams = {
  id: string;
};

class FindPartController {
  async handle(request: Request, response: Response) {
    const { id } = request.params as { id: string };

    const findPartService = new FindPartService();

    const part = await findPartService.execute(id);

    return response.status(200).json(part);
  }
}

export { FindPartController };
