import { Request, Response } from "express";
import { completeSetupSchema } from "../../schemas/setup/completeSetupSchema";
import { CompleteSetupService } from "../../services/setup/CompleteSetupService";

class CompleteSetupController {
  async handle(request: Request, response: Response) {
    completeSetupSchema.parse(request.body);
    const settings = await new CompleteSetupService().execute();

    return response.status(200).json({
      setupCompleted: settings.setupCompleted,
      setupCompletedAt: settings.setupCompletedAt,
    });
  }
}

export { CompleteSetupController };
