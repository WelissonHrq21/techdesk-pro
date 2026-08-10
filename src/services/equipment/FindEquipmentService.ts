import { EquipmentRepository } from "../../repositories/EquipmentRepository"

class FindEquipmentService{
    async execute(id: string){
        const equipmentRepository = new EquipmentRepository();
        const equipment = await equipmentRepository.findById(id);

        if(!equipment){
            throw new Error("Equipment not found");
        }

        return equipment;
    }
}

export { FindEquipmentService }