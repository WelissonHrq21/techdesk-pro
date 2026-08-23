import { AppError } from "../../errors/AppError";
import { PartRepository } from "../../repositories/PartRepository";
import { StockMovementRepository } from "../../repositories/StockMovementRepository";
import { UserRepository } from "../../repositories/UserRepository";
import { serializePart } from "../../utils/stockStatus";

type CreateStockEntryData = {
  partId: string;
  quantity: number;
  reason?: string;
  userId?: string;
};

class CreateStockEntryService {
  async execute(data: CreateStockEntryData) {
    const partRepository = new PartRepository();
    const stockMovementRepository = new StockMovementRepository();

    const part = await partRepository.findById(data.partId);

    if (!part) {
      throw new AppError("Part not found", 404);
    }

    if (!part.active) {
      throw new AppError("Part is inactive", 400);
    }

    if (data.userId) {
      const userRepository = new UserRepository();
      const user = await userRepository.findById(data.userId);

      if (!user) {
        throw new AppError("User not found", 404);
      }

      if (!user.active) {
        throw new AppError("User is inactive", 400);
      }
    }

    const result = await stockMovementRepository.createEntry(data);

    return {
      ...result,
      part: serializePart(result.part),
    };
  }
}

export { CreateStockEntryService };
