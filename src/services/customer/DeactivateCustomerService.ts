import { CustomerRepository } from "../../repositories/CustomerRepository";

class DeactivateCustomerService {
    async execute(id: string){
        const customerRepository = new CustomerRepository();
        const customer = await customerRepository.findById(id);
        if(!customer){
            throw new Error("Customer not found");
        }
        return await customerRepository.deactivate(id);
    }
    
}

export { DeactivateCustomerService };