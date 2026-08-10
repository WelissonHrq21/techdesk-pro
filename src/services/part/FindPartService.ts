import { AppError } from "../../errors/AppError";
import { PartRepository } from "../../repositories/PartRepository";

class FindPartService {
  async execute(id: string) {
    const partRepository = new PartRepository();

    const part = await partRepository.findById(id);

    if (!part) {
      throw new AppError("Part not found", 404);
    }

    return part;
  }
}

export { FindPartService };
