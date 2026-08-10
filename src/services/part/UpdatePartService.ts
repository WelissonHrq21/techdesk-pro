import { AppError } from "../../errors/AppError";
import { PartRepository } from "../../repositories/PartRepository";

type UpdatePartData = {
  name?: string;
  brand?: string;
  currentPrice?: number;
  supplier?: string;
};

class UpdatePartService {
  async execute(id: string, data: UpdatePartData) {
    const partRepository = new PartRepository();

    const part = await partRepository.findById(id);

    if (!part) {
      throw new AppError("Part not found", 404);
    }

    if (!part.active) {
      throw new AppError("Part is inactive", 400);
    }

    return partRepository.update(id, data);
  }
}

export { UpdatePartService };
