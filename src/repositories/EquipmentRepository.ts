import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

type FindManyEquipmentsData = {
    skip: number;
    limit: number;
    search?: string;
    customerId?: string;
};

class EquipmentRepository {
    async create(data: Prisma.EquipmentCreateInput){
        return prisma.equipment.create({
            data,
        });
    }

    async findAll(){
        return prisma.equipment.findMany({
            where: {
                active: true
            }
        });
    }

    async findMany(data: FindManyEquipmentsData) {
        const where: Prisma.EquipmentWhereInput = {
            active: true,
            ...(data.customerId
                ? {
                    customerId: data.customerId,
                }
                : {}),
            ...(data.search
                ? {
                    OR: [
                        {
                            type: {
                                contains: data.search,
                                mode: "insensitive",
                            },
                        },
                        {
                            brand: {
                                contains: data.search,
                                mode: "insensitive",
                            },
                        },
                        {
                            model: {
                                contains: data.search,
                                mode: "insensitive",
                            },
                        },
                        {
                            serialNumber: {
                                contains: data.search,
                                mode: "insensitive",
                            },
                        },
                        {
                            customer: {
                                name: {
                                    contains: data.search,
                                    mode: "insensitive",
                                },
                            },
                        },
                    ],
                }
                : {}),
        };

        const [equipments, total] = await prisma.$transaction([
            prisma.equipment.findMany({
                where,
                skip: data.skip,
                take: data.limit,
                orderBy: {
                    createdAt: "desc",
                },
                select: {
                    id: true,
                    type: true,
                    brand: true,
                    model: true,
                    serialNumber: true,
                    active: true,
                    createdAt: true,
                    updatedAt: true,
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                        },
                    },
                },
            }),
            prisma.equipment.count({
                where,
            }),
        ]);

        return {
            data: equipments,
            total,
        };
    }

    async findById(id: string){
        return prisma.equipment.findUnique({
            where: {
                id,
            }
        })
    }

    async update(id: string, data: Prisma.EquipmentUpdateInput){
        return prisma.equipment.update({
            where: {
                id
            },
            data,
        })
    }

    async deactivate(id: string){
        return prisma.equipment.update({
            where: {
                id
            },
            data: {
                active: false
            }
        })
    }
}

export { EquipmentRepository };
