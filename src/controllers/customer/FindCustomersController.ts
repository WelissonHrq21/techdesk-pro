import { Request, Response } from "express"
import { findCustomersSchema } from "../../schemas/customer/findCustomersSchema";
import { FindCustomersService } from "../../services/customer/FindCustomersService"

class FindCustomersController {
    async handle(request: Request, response: Response){
        const query = findCustomersSchema.parse(request.query);
        const findCustomersService = new FindCustomersService();
        const customers = await findCustomersService.execute({
            ...query,
            role: request.user.role,
        });

        return response.status(200).json(customers);
    }
}

export { FindCustomersController };
