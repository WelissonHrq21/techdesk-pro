import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

class CompanySettingsRepository {
  async findFirst() {
    return prisma.companySettings.findFirst({
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async upsertSingleton(data: Prisma.CompanySettingsCreateInput) {
    const current = await this.findFirst();

    if (!current) {
      return prisma.companySettings.create({
        data,
      });
    }

    return prisma.companySettings.update({
      where: {
        id: current.id,
      },
      data,
    });
  }
}

export { CompanySettingsRepository };
