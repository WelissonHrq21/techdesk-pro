import { Request, Response } from "express";
import { FindEquipmentService } from "../../services/equipment/FindEquipmentService"

type FindEquipmentParams = {
    id: string;
};

class FindEquipmentController {
    async handle(request: Request, response: Response){
        const { id } = request.params as { id: string };
        const findEquipmentService = new FindEquipmentService();
        const equipment = await findEquipmentService.execute(id)

        return response.status(200).json(equipment);
    }
}

export { FindEquipmentController } 