import { CustomerRepository } from "../../repositories/CustomerRepository";
import { UserRole } from "@prisma/client";
import { AppError } from "../../errors/AppError";

class FindCustomerService {
    async execute(id: string, role: UserRole){
        const customerRepository = new CustomerRepository();
        const customer = await customerRepository.findByIdForRole(id, role);
        if(!customer){
            throw new AppError("Customer not found", 404);
        }
        return customer;
    }
}

export { FindCustomerService };
