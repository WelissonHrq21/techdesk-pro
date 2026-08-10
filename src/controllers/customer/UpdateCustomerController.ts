import { Request, Response } from "express"
import { UpdateCustomerService } from "../../services/customer/UpdateCustomerService";

type UpdateCustomerParams = {
  id: string;
};

class UpdateCustomerController {
    async handle(request: Request, response: Response){
        const { id } = request.params as { id: string };
        const data = request.body;
        const updateCustomerService = new UpdateCustomerService();
        await updateCustomerService.execute(id, data);

        return response.status(200).json({
            message: "Customer updated successfully"
        });
    }
    
}

export { UpdateCustomerController };