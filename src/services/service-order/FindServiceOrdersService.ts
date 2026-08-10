import { ServiceOrderStatus } from "@prisma/client";
import { ServiceOrderRepository } from "../../repositories/ServiceOrderRepository";
import {
  getPagination,
  getPaginationMeta,
} from "../../utils/pagination";

type FindServiceOrdersData = {
  page: number;
  limit: number;
  status?: ServiceOrderStatus[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  equipmentId?: string;
  sortBy: "createdAt" | "updatedAt" | "number";
  sortOrder: "asc" | "desc";
};

class FindServiceOrdersService {
  async execute(data: FindServiceOrdersData) {
    const serviceOrderRepository = new ServiceOrderRepository();
    const pagination = getPagination(data);

    const result = await serviceOrderRepository.findMany({
      ...pagination,
      statuses: data.status,
      search: data.search,
      customerId: data.customerId,
      equipmentId: data.equipmentId,
      dateFrom: data.dateFrom
        ? new Date(`${data.dateFrom}T00:00:00.000Z`)
        : undefined,
      dateTo: data.dateTo
        ? new Date(`${data.dateTo}T23:59:59.999Z`)
        : undefined,
      sortBy: data.sortBy,
      sortOrder: data.sortOrder,
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

export { FindServiceOrdersService };
