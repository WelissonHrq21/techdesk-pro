import { BudgetItemType } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import { PartRepository } from "../../repositories/PartRepository";
import {
  BudgetItemInput,
  PreparedBudgetItem,
} from "../../types/budget";

export async function prepareBudgetItems(
  items: BudgetItemInput[],
  partRepository: PartRepository
): Promise<PreparedBudgetItem[]> {
  const preparedItems: PreparedBudgetItem[] = [];

  for (const item of items) {
    if (item.quantity <= 0) {
      throw new AppError("Quantity must be greater than zero", 400);
    }

    if (item.unitPrice <= 0) {
      throw new AppError("Unit price must be greater than zero", 400);
    }

    const type = item.type ?? BudgetItemType.PART;

    if (type === BudgetItemType.PART) {
      if (!item.partId) {
        throw new AppError("Part ID is required for PART items", 400);
      }

      if (item.description !== undefined) {
        throw new AppError(
          "PART item description is generated from the Part",
          400
        );
      }

      const part = await partRepository.findById(item.partId);

      if (!part) {
        throw new AppError("Part not found", 404);
      }

      if (!part.active) {
        throw new AppError("Part is inactive", 400);
      }

      preparedItems.push({
        type,
        partId: part.id,
        description: part.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
      continue;
    }

    if (type === BudgetItemType.SERVICE) {
      if (item.partId !== undefined && item.partId !== null) {
        throw new AppError("SERVICE items cannot reference a Part", 400);
      }

      const description = item.description?.trim();

      if (!description) {
        throw new AppError(
          "Description is required for SERVICE items",
          400
        );
      }

      if (description.length > 200) {
        throw new AppError(
          "Description must be less than 200 characters",
          400
        );
      }

      preparedItems.push({
        type,
        partId: null,
        description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
      continue;
    }

    throw new AppError("Budget item type is invalid", 400);
  }

  return preparedItems;
}
