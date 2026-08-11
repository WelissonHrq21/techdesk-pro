import type { ServiceOrderStatus } from "../../../types/dashboard";

export type PublicServiceOrder = {
  number: number;
  status: ServiceOrderStatus;
  createdAt: string;
  updatedAt: string;
  equipment: {
    type: string;
    brand: string;
    model: string;
  };
};
