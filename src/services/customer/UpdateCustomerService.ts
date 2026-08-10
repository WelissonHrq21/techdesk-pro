import { CustomerRepository } from "../../repositories/CustomerRepository";

class UpdateCustomerService {
    async execute(id: string, data: any){
        const customerRepository = new CustomerRepository();
        const customer = await customerRepository.findById(id);
        if(!customer){
            throw new Error("Customer not found");
        }

        return await customerRepository.update(id, data);

    }
}

export { UpdateCustomerService };