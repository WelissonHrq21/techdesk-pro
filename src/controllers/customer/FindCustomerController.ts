import { Request, Response } from "express";
import { FindCustomerService } from "../../services/customer/FindCustomerService";

type FindCustomerParams = {
  id: string;
};

class FindCustomerController {
  async handle(request: Request, response: Response) {
    const { id } = request.params as { id: string };

    const findCustomerService = new FindCustomerService();

    const customer = await findCustomerService.execute(id);

    return response.status(200).json(customer);
  }
}

export { FindCustomerController };