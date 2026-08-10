import { EquipmentRepository } from "../../repositories/EquipmentRepository"

class UpdateEquipmentService{
    async execute(id: string, data: any){
        const equipmentRepository = new EquipmentRepository();
        const equipment = await equipmentRepository.findById(id);
        if(!equipment){
            throw new Error("Equipment not found");
        }

        return await equipmentRepository.update(id, data);
    }

    
}

export { UpdateEquipmentService }