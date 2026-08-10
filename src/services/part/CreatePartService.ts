import { PartRepository } from "../../repositories/PartRepository";

type CreatePartData = {
  name: string;
  brand: string;
  currentPrice: number;
  supplier?: string;
};

class CreatePartService {
  async execute(data: CreatePartData) {
    const partRepository = new PartRepository();

    return partRepository.create({
      name: data.name,
      brand: data.brand,
      currentPrice: data.currentPrice,
      supplier: data.supplier,
    });
  }
}

export { CreatePartService };
