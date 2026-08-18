import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/AppError";

class CompleteSetupService {
  async execute() {
    return prisma.$transaction(async (transaction) => {
      const settings = await transaction.companySettings.findFirst({
        orderBy: {
          createdAt: "asc",
        },
      });

      if (settings?.setupCompleted) {
        return settings;
      }

      if (!settings || !settings.name.trim()) {
        throw new AppError("Company settings are required before setup completion", 400);
      }

      return transaction.companySettings.update({
        where: {
          id: settings.id,
        },
        data: {
          setupCompleted: true,
          setupCompletedAt: new Date(),
        },
      });
    });
  }
}

export { CompleteSetupService };
