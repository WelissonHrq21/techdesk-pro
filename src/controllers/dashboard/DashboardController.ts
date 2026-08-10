import { Request, Response } from "express";
import { DashboardService } from "../../services/dashboard/DashboardService";

class DashboardController {
  async handle(request: Request, response: Response) {
    const dashboardService = new DashboardService();

    const summary = await dashboardService.execute();

    return response.status(200).json(summary);
  }
}

export { DashboardController };
