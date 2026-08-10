import { AppError } from "../../errors/AppError"
import { EquipmentRepository } from "../../repositories/EquipmentRepository"
import { CustomerRepository } from "../../repositories/CustomerRepository";
import { prisma } from "../../config/prisma";
import { Prisma } from "@prisma/client";

type CreateEquipmentDTO = {
    type: string;
    brand: string;
    model: string;
    serialNumber?: string;
    customerId: string;
}

class CreateEquipmentService {
    async execute(data: CreateEquipmentDTO){
        const equipmentRepository = new EquipmentRepository();
        const customerRepository = new CustomerRepository();

        const customer = await customerRepository.findById(data.customerId);

        if(!customer){
            throw new AppError("Customer not found", 404);
        }
        if(!customer.active){
            throw new AppError("Customer is inactive", 400);
        }

        if (data.serialNumber){
            const existingEquipment = await prisma.equipment.findUnique({
                where: {
                    serialNumber: data.serialNumber,
                }
            });
            if (existingEquipment){
                throw new AppError("Serial number already exists", 400)
            }
        }


        return equipmentRepository.create({
            type: data.type,
            brand: data.brand,
            model: data.model,
            serialNumber: data.serialNumber,
            customer: {
                connect: {
                id: data.customerId
                }
            }
});
        
        

    }
}

export { CreateEquipmentService }
