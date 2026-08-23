import { PartRepository } from "../../repositories/PartRepository";
import { serializePart } from "../../utils/stockStatus";

type CreatePartData = {
  name: string;
  brand: string;
  currentPrice: number;
  minimumStock: number;
  supplier?: string;
};

class CreatePartService {
  async execute(data: CreatePartData) {
    const partRepository = new PartRepository();

    const part = await partRepository.create({
      name: data.name,
      brand: data.brand,
      currentPrice: data.currentPrice,
      minimumStock: data.minimumStock,
      supplier: data.supplier,
    });

    return serializePart(part);
  }
}

export { CreatePartService };
