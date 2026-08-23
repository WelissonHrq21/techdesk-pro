import { AppError } from "../../errors/AppError";
import { PartRepository } from "../../repositories/PartRepository";
import { serializePart } from "../../utils/stockStatus";

class DeactivatePartService {
  async execute(id: string) {
    const partRepository = new PartRepository();

    const part = await partRepository.findById(id);

    if (!part) {
      throw new AppError("Part not found", 404);
    }

    if (!part.active) {
      throw new AppError("Part is inactive", 400);
    }

    return serializePart(await partRepository.deactivate(id));
  }
}

export { DeactivatePartService };
