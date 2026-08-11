export type EquipmentCustomer = {
  id: string;
  name: string;
  phone?: string;
};

export type Equipment = {
  id: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  customer?: EquipmentCustomer;
  customerId?: string;
};

export type EquipmentFormData = {
  type: string;
  brand: string;
  model: string;
  serialNumber?: string;
  customerId: string;
};
