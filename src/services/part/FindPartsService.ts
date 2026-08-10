import { PartRepository } from "../../repositories/PartRepository";
import {
  getPagination,
  getPaginationMeta,
} from "../../utils/pagination";

type FindPartsData = {
  page: number;
  limit: number;
  search?: string;
  maxStock?: number;
};

class FindPartsService {
  async execute(data: FindPartsData) {
    const partRepository = new PartRepository();
    const pagination = getPagination(data);

    const result = await partRepository.findMany({
      ...pagination,
      search: data.search,
      maxStock: data.maxStock,
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

export { FindPartsService };
