import { Request, Response } from "express";
import { budgetDecisionSchema } from "../../schemas/budget/budgetDecisionSchema";
import { ApproveBudgetService } from "../../services/budget/ApproveBudgetService";

type BudgetParams = {
  id: string;
};

class ApproveBudgetController {
  async handle(request: Request, response: Response) {
    const { id } = request.params as { id: string };
    const data = budgetDecisionSchema.parse(request.body ?? {});

    const approveBudgetService = new ApproveBudgetService();

    const result = await approveBudgetService.execute({
      budgetId: id,
      ...data,
      userId: request.user.id,
    });

    return response.status(200).json(result);
  }
}

export { ApproveBudgetController };
