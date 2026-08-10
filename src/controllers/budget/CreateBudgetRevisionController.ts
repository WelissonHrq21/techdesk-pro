import { Request, Response } from "express";
import { createBudgetRevisionSchema } from "../../schemas/budget/createBudgetRevisionSchema";
import { CreateBudgetRevisionService } from "../../services/budget/CreateBudgetRevisionService";

type CreateBudgetRevisionParams = {
  id: string;
};

class CreateBudgetRevisionController {
  async handle(
    request: Request,
    response: Response
  ) {
    const { id } = request.params as { id: string };
    const data = createBudgetRevisionSchema.parse(request.body);

    const createBudgetRevisionService =
      new CreateBudgetRevisionService();

    const budget = await createBudgetRevisionService.execute({
      serviceOrderId: id,
      items: data.items,
      observation: data.observation,
      userId: request.user.id,
    });

    return response.status(201).json(budget);
  }
}

export { CreateBudgetRevisionController };
