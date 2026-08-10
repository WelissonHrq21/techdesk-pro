import { EquipmentRepository } from "../../repositories/EquipmentRepository"

class DeactivateEquipmentService{
    async execute(id: string){
        const equipmentRepository = new EquipmentRepository();
        const equipment = await equipmentRepository.findById(id);
        if(!equipment){
            throw new Error("Equipment not found");
        }

        return await equipmentRepository.deactivate(id);
    }
}

export { DeactivateEquipmentService }