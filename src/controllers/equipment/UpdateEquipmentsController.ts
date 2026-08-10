import { Request, Response } from "express"
import { UpdateEquipmentService } from "../../services/equipment/UpdateEquipmentService"

type UpdateEquipmentParams = {
    id: string;
};

class UpdateEquipmentController{
    async handle(request: Request, response: Response){
        const { id } = request.params as { id: string };
        const data = request.body;
        const updateEquipmentService = new UpdateEquipmentService();
        updateEquipmentService.execute(id, data);

        return response.status(200).json({
            message: "Equipment Updated successfully"
        });
    }
}
export { UpdateEquipmentController }