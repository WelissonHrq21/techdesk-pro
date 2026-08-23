import { PartRepository } from "../../repositories/PartRepository";
import {
  getPagination,
  getPaginationMeta,
} from "../../utils/pagination";
import { serializePart, type StockStatus } from "../../utils/stockStatus";

type FindPartsData = {
  page: number;
  limit: number;
  search?: string;
  maxStock?: number;
  stockStatus?: StockStatus;
};

class FindPartsService {
  async execute(data: FindPartsData) {
    const partRepository = new PartRepository();
    const pagination = getPagination(data);

    const result = await partRepository.findMany({
      ...pagination,
      search: data.search,
      maxStock: data.maxStock,
      stockStatus: data.stockStatus,
    });

    return {
      data: result.data.map(serializePart),
      meta: getPaginationMeta({
        page: data.page,
        limit: data.limit,
        total: result.total,
      }),
    };
  }
}

export { FindPartsService };
