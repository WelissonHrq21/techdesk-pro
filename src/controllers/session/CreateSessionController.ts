import { Request, Response } from "express";
import { createSessionSchema } from "../../schemas/session/createSessionSchema";
import { CreateSessionService } from "../../services/session/CreateSessionService";

class CreateSessionController {
  async handle(request: Request, response: Response) {
    const data = createSessionSchema.parse(request.body);

    const createSessionService = new CreateSessionService();

    const session = await createSessionService.execute(data);

    return response.status(200).json(session);
  }
}

export { CreateSessionController };
