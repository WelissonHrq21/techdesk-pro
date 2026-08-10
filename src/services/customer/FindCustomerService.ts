import { CustomerRepository } from "../../repositories/CustomerRepository";

class FindCustomerService {
    async execute(id: string){
        const customerRepository = new CustomerRepository();
        const customer = await customerRepository.findById(id);
        if(!customer){
            throw new Error("Customer not found");
        }
        return customer;
    }
}

export { FindCustomerService };