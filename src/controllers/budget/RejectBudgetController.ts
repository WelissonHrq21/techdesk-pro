import { Request, Response } from "express";
import { budgetDecisionSchema } from "../../schemas/budget/budgetDecisionSchema";
import { RejectBudgetService } from "../../services/budget/RejectBudgetService";

type BudgetParams = {
  id: string;
};

class RejectBudgetController {
  async handle(request: Request, response: Response) {
    const { id } = request.params as { id: string };
    const data = budgetDecisionSchema.parse(request.body ?? {});

    const rejectBudgetService = new RejectBudgetService();

    const result = await rejectBudgetService.execute({
      budgetId: id,
      ...data,
      userId: request.user.id,
    });

    return response.status(200).json(result);
  }
}

export { RejectBudgetController };
