import { ServiceOrderStatus, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "./database";

export async function createTestUser(role: UserRole, suffix = Date.now()) {
  return prisma.user.create({
    data: {
      name: `${role} User ${suffix}`,
      login: `${role.toLowerCase()}-${suffix}-${Math.random()
        .toString(36)
        .slice(2)}`,
      password: await hash("senha123", 10),
      role,
    },
  });
}

export async function authenticateTestUser(role: UserRole) {
  const user = await createTestUser(role);

  const response = await request(app).post("/sessions").send({
    login: user.login,
    password: "senha123",
  });

  return {
    user,
    token: response.body.token as string,
  };
}

export async function createTestCustomer() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return prisma.customer.create({
    data: {
      name: `Customer ${suffix}`,
      phone: `85${String(Date.now()).slice(-9)}`,
      email: `customer-${suffix}@test.com`,
    },
  });
}

export async function createTestEquipment(customerId: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return prisma.equipment.create({
    data: {
      type: "Notebook",
      brand: "Acer",
      model: `Nitro ${suffix}`,
      serialNumber: `SERIAL-${suffix}`,
      customerId,
    },
  });
}

export async function createTestPart(stock = 0) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return prisma.part.create({
    data: {
      name: `SSD ${suffix}`,
      brand: "Kingston",
      currentPrice: 250,
      stock,
    },
  });
}

export async function createTestServiceOrder(
  status: ServiceOrderStatus = ServiceOrderStatus.RECEIVED
) {
  const customer = await createTestCustomer();
  const equipment = await createTestEquipment(customer.id);
  const user = await createTestUser(UserRole.ADMIN);

  const serviceOrder = await prisma.serviceOrder.create({
    data: {
      customerId: customer.id,
      equipmentId: equipment.id,
      userId: user.id,
      reportedIssue: "Notebook does not turn on",
      status,
    },
  });

  return {
    customer,
    equipment,
    user,
    serviceOrder,
  };
}

export async function createApprovedMaintenanceScenario() {
  const { token } = await authenticateTestUser(UserRole.TECHNICIAN);
  const { serviceOrder } = await createTestServiceOrder(
    ServiceOrderStatus.IN_ANALYSIS
  );
  const part = await createTestPart(5);

  const budgetResponse = await request(app)
    .post(`/service-orders/${serviceOrder.id}/budgets`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      items: [
        {
          partId: part.id,
          quantity: 2,
          unitPrice: 250,
        },
      ],
    });

  await prisma.serviceOrder.update({
    where: {
      id: serviceOrder.id,
    },
    data: {
      status: ServiceOrderStatus.IN_MAINTENANCE,
    },
  });

  return {
    token,
    serviceOrder,
    part,
    budget: budgetResponse.body,
  };
}
