import { CustomerRepository } from "../../repositories/CustomerRepository";
import { UserRole } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import type { UpdateCustomerSchema } from "../../schemas/customer/updateCustomerSchema";
import { isUniqueConstraintError } from "../../utils/prismaErrors";

class UpdateCustomerService {
    async execute(id: string, data: UpdateCustomerSchema, role: UserRole){
        const customerRepository = new CustomerRepository();
        const customer = await customerRepository.findById(id);
        if(!customer){
            throw new AppError("Customer not found", 404);
        }

        if (data.document && data.document !== customer.document) {
            const existingCustomer = await customerRepository.findByDocument(data.document);

            if (existingCustomer && existingCustomer.id !== id) {
                throw new AppError("Customer document already exists", 409);
            }
        }

        try {
            return await customerRepository.update(id, data, role);
        } catch (error) {
            if (isUniqueConstraintError(error, "document")) {
                throw new AppError("Customer document already exists", 409);
            }

            if (isUniqueConstraintError(error, "email")) {
                throw new AppError("Email already exists", 409);
            }

            throw error;
        }

    }
}

export { UpdateCustomerService };
