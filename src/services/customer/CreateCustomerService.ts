import { CustomerRepository } from "../../repositories/CustomerRepository";
import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/AppError";

class CreateCustomerService {
    async execute(data: Prisma.CustomerCreateInput){

        const customerRepository = new CustomerRepository()

        if (data.email){
            const existingCustomer = await customerRepository.findByEmail(data.email)
            if (existingCustomer){
                throw new AppError("Email already exists")
            }
        }

        return customerRepository.create(data);
;    }
}

export { CreateCustomerService }