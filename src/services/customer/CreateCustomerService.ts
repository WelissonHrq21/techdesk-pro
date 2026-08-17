import { CustomerRepository } from "../../repositories/CustomerRepository";
import { UserRole } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import type { CreateCustomerSchema } from "../../schemas/customer/createCustomerSchema";
import { isUniqueConstraintError } from "../../utils/prismaErrors";

class CreateCustomerService {
    async execute(data: CreateCustomerSchema, role: UserRole){

        const customerRepository = new CustomerRepository()

        if (data.email){
            const existingCustomer = await customerRepository.findByEmail(data.email)
            if (existingCustomer){
                throw new AppError("Email already exists")
            }
        }

        if (data.document){
            const existingCustomer = await customerRepository.findByDocument(data.document)
            if (existingCustomer){
                throw new AppError("Customer document already exists", 409)
            }
        }

        try {
            return await customerRepository.create(data, role);
        } catch (error) {
            if (isUniqueConstraintError(error, "document")) {
                throw new AppError("Customer document already exists", 409);
            }

            if (isUniqueConstraintError(error, "email")) {
                throw new AppError("Email already exists", 409);
            }

            throw error;
        }
;    }
}

export { CreateCustomerService }
