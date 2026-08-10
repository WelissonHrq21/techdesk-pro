import { Request, Response } from "express";
import { createBudgetSchema } from "../../schemas/budget/createBudgetSchema";
import { CreateBudgetService } from "../../services/budget/CreateBudgetService";

type CreateBudgetParams = {
  id: string;
};

class CreateBudgetController {
  async handle(
    request: Request,
    response: Response
  ) {
    const { id } = request.params as { id: string };
    const data = createBudgetSchema.parse(request.body);

    const createBudgetService = new CreateBudgetService();

    const budget = await createBudgetService.execute({
      serviceOrderId: id,
      items: data.items,
    });

    return response.status(201).json(budget);
  }
}

export { CreateBudgetController };
