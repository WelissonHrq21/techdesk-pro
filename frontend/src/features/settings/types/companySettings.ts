export type CompanySettings = {
  id: string | null;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  zipCode: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CompanySettingsFormData = {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  zipCode?: string;
};
