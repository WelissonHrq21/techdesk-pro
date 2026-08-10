import { Request, Response } from "express"
import { CreateEquipmentService } from "../../services/equipment/CreateEquipmentService"
import { createEquipmentSchema } from "../../schemas/equipment/createEquipmentSchema"

class CreateEquipmentController {
    async handle(request: Request, response: Response){
        const data = createEquipmentSchema.parse(request.body);

        const createEquipmentService = new CreateEquipmentService();

        const equipment = await createEquipmentService.execute(data);
        
        return response.status(201).json(equipment)
    }
}

export { CreateEquipmentController } 
