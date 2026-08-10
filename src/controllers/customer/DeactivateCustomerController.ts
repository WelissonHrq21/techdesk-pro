import { Request, Response } from "express";
import { DeactivateCustomerService } from "../../services/customer/DeactivateCustomerService";

type DeactivateCustomerParams = {
  id: string;
};

class DeactivateCustomerController {
    async handle(request: Request, response: Response) {
        const { id } = request.params as { id: string };

        const deactivateCustomerService = new DeactivateCustomerService();

        await deactivateCustomerService.execute(id);
        return response.status(204).json({
            message: "Customer deactivated successfully"
        });

    }
}

export { DeactivateCustomerController };
     