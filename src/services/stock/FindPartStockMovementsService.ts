import { AppError } from "../../errors/AppError";
import { PartRepository } from "../../repositories/PartRepository";
import { StockMovementRepository } from "../../repositories/StockMovementRepository";

class FindPartStockMovementsService {
  async execute(partId: string) {
    const partRepository = new PartRepository();
    const stockMovementRepository = new StockMovementRepository();

    const part = await partRepository.findById(partId);

    if (!part) {
      throw new AppError("Part not found", 404);
    }

    return stockMovementRepository.findByPartId(partId);
  }
}

export { FindPartStockMovementsService };
