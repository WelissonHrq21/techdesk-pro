import { Request, Response } from "express";
import { findEquipmentsSchema } from "../../schemas/equipment/findEquipmentsSchema";
import { FindEquipmentsService } from "../../services/equipment/FindEquipmentsService"

class FindEquipmentsController{
    async handle(request: Request, response: Response){
        const query = findEquipmentsSchema.parse(request.query);
        const findEquipmentsService = new FindEquipmentsService();
        const equipments = await findEquipmentsService.execute(query);

        return response.status(200).json(equipments);
    }
}

export { FindEquipmentsController }
