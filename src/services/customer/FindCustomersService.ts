import { CustomerRepository } from "../../repositories/CustomerRepository";
import { UserRole } from "@prisma/client";
import {
    getPagination,
    getPaginationMeta,
} from "../../utils/pagination";

type FindCustomersData = {
    page: number;
    limit: number;
    search?: string;
    role: UserRole;
};

class FindCustomersService {
    async execute(data: FindCustomersData){
        const customerRepository = new CustomerRepository();
        const pagination = getPagination(data);

        const result = await customerRepository.findMany({
            ...pagination,
            search: data.search,
            role: data.role,
        });

        return {
            data: result.data,
            meta: getPaginationMeta({
                page: data.page,
                limit: data.limit,
                total: result.total,
            }),
        };
    }
}

export { FindCustomersService };
