import { Request, Response } from "express";
import { DeactivateEquipmentService } from "../../services/equipment/DeactivateEquipmentService"

type DeactivateEquipmentParams = {
    id: string
}

class DeactivateEquipmentController{
    async handle(request: Request, response: Response){
        const { id } = request.params as { id: string };
        const deactivateEquipmentService = new DeactivateEquipmentService();

         await deactivateEquipmentService.execute(id);

         return response.status(201).json({
            message: "Equipment deactivated successfully"
         });

    }
}

export { DeactivateEquipmentController }