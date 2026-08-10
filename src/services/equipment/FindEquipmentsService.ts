import { EquipmentRepository } from "../../repositories/EquipmentRepository"
import {
    getPagination,
    getPaginationMeta,
} from "../../utils/pagination";

type FindEquipmentsData = {
    page: number;
    limit: number;
    search?: string;
    customerId?: string;
};

class FindEquipmentsService {
    async execute(data: FindEquipmentsData){
        const equimentRepository = new EquipmentRepository();
        const pagination = getPagination(data);

        const result = await equimentRepository.findMany({
            ...pagination,
            search: data.search,
            customerId: data.customerId,
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

export { FindEquipmentsService }
