import { Request, Response } from "express"
import { CreateCustomerService } from "../../services/customer/CreateCustomerService";
import { createCustomerSchema } from "../../schemas/customer/createCustomerSchema";

class CreateCustomerController {
    async handle(request: Request, response: Response) {
            const data = createCustomerSchema.parse(request.body);
        
            const createCustomerService = new CreateCustomerService();

            const customer = await createCustomerService.execute(
                data,
                request.user.role
            );

            return response.status(201).json(customer);
    }
}

export { CreateCustomerController }
