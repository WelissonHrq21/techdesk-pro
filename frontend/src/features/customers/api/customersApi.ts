import { http } from "../../../api/http";
import type { PaginatedResponse } from "../../../types/pagination";
import { normalizeCustomerDocument } from "../../../utils/customerDocument";
import type { Customer, CustomerFormData } from "../types/customer";

type FindCustomersParams = {
  page: number;
  limit: number;
  search?: string;
};

function cleanCustomerPayload(data: CustomerFormData) {
  return {
    name: data.name.trim(),
    phone: data.phone.trim(),
    document: normalizeCustomerDocument(data.document) ?? null,
    email: data.email?.trim() || undefined,
    zipCode: data.zipCode?.trim() || undefined,
    address: data.address?.trim() || undefined,
  };
}

export async function findCustomers(params: FindCustomersParams) {
  const response = await http.get<PaginatedResponse<Customer>>("/customers", {
    params,
  });

  return response.data;
}

export async function findCustomer(id: string) {
  const response = await http.get<Customer>(`/customers/${id}`);

  return response.data;
}

export async function createCustomer(data: CustomerFormData) {
  const response = await http.post<Customer>(
    "/customers",
    cleanCustomerPayload(data)
  );

  return response.data;
}

export async function updateCustomer(id: string, data: CustomerFormData) {
  const response = await http.put<{ message: string }>(
    `/customers/${id}`,
    cleanCustomerPayload(data)
  );

  return response.data;
}

export async function deactivateCustomer(id: string) {
  const response = await http.delete<Customer>(`/customers/${id}`);

  return response.data;
}
