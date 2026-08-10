import { Request, Response } from "express";
import { findPartsSchema } from "../../schemas/part/findPartsSchema";
import { FindPartsService } from "../../services/part/FindPartsService";

class FindPartsController {
  async handle(request: Request, response: Response) {
    const query = findPartsSchema.parse(request.query);
    const findPartsService = new FindPartsService();

    const parts = await findPartsService.execute(query);

    return response.status(200).json(parts);
  }
}

export { FindPartsController };
