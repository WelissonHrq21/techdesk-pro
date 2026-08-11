export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  zipCode: string | null;
  address: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerFormData = {
  name: string;
  phone: string;
  email?: string;
  zipCode?: string;
  address?: string;
};
