import { AppError } from "../../errors/AppError";
import { PartRepository } from "../../repositories/PartRepository";
import { StockMovementRepository } from "../../repositories/StockMovementRepository";
import type { StockMovementType } from "@prisma/client";
import {
  getPagination,
  getPaginationMeta,
} from "../../utils/pagination";

type FindPartStockMovementsData = {
  page: number;
  limit: number;
  type?: StockMovementType;
  dateFrom?: string;
  dateTo?: string;
};

class FindPartStockMovementsService {
  async execute(partId: string, data: FindPartStockMovementsData) {
    const partRepository = new PartRepository();
    const stockMovementRepository = new StockMovementRepository();

    const part = await partRepository.findById(partId);

    if (!part) {
      throw new AppError("Part not found", 404);
    }

    const pagination = getPagination(data);
    const result = await stockMovementRepository.findByPartId({
      partId,
      ...pagination,
      type: data.type,
      dateFrom: data.dateFrom
        ? new Date(`${data.dateFrom}T00:00:00.000Z`)
        : undefined,
      dateTo: data.dateTo
        ? new Date(`${data.dateTo}T23:59:59.999Z`)
        : undefined,
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

export { FindPartStockMovementsService };
