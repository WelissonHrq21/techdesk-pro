import { Request, Response } from "express";
import { GetSetupStatusService } from "../../services/setup/GetSetupStatusService";

class GetSetupStatusController {
  async handle(request: Request, response: Response) {
    const setupStatus = await new GetSetupStatusService().execute();

    return response.status(200).json(setupStatus);
  }
}

export { GetSetupStatusController };
