import { UserRole } from "@prisma/client";

export function canReadCustomerDocument(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.RECEPTION;
}

export function getCustomerSelectForRole(role: UserRole) {
  return {
    id: true,
    name: true,
    phone: true,
    ...(canReadCustomerDocument(role)
      ? {
          document: true,
        }
      : {}),
    email: true,
    zipCode: true,
    address: true,
    active: true,
    createdAt: true,
    updatedAt: true,
  };
}
