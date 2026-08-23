import {
  BudgetItemType,
  ServiceOrderStatus,
  UserRole,
} from "@prisma/client";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app";
import { openApiDocument } from "../../src/docs/openapi";
import { prisma, resetDatabase } from "../helpers/database";
import {
  authenticateTestUser,
  createTestPart,
  createTestServiceOrder,
} from "../helpers/factories";

describe("v1.2.0 Stage 1 budget and stock foundation", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("keeps the legacy part-only payload and snapshots the Part name", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { serviceOrder } = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const part = await createTestPart();

    const response = await request(app)
      .post(`/service-orders/${serviceOrder.id}/budgets`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({
        items: [{ partId: part.id, quantity: 2, unitPrice: 250 }],
      })
      .expect(201);

    expect(response.body.budgetItems[0]).toMatchObject({
      type: BudgetItemType.PART,
      description: part.name,
      partId: part.id,
      quantity: 2,
    });
    expect(Number(response.body.totalValue)).toBe(500);

    await prisma.part.update({
      where: { id: part.id },
      data: { name: "Renamed after budget" },
    });

    const detail = await request(app)
      .get(`/service-orders/${serviceOrder.id}`)
      .set("Authorization", `Bearer ${technician.token}`)
      .expect(200);

    expect(detail.body.budgets[0].budgetItems[0]).toMatchObject({
      type: BudgetItemType.PART,
      description: part.name,
      part: {
        name: "Renamed after budget",
      },
    });
  });

  it("creates mixed PART and SERVICE items without linking SERVICE to stock", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { serviceOrder } = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const part = await createTestPart(5);

    const response = await request(app)
      .post(`/service-orders/${serviceOrder.id}/budgets`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({
        items: [
          {
            type: BudgetItemType.PART,
            partId: part.id,
            quantity: 1,
            unitPrice: 250,
          },
          {
            type: BudgetItemType.SERVICE,
            partId: null,
            description: "Technical labor",
            quantity: 2,
            unitPrice: 75,
          },
        ],
      })
      .expect(201);

    expect(Number(response.body.totalValue)).toBe(400);
    expect(response.body.budgetItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: BudgetItemType.PART,
          description: part.name,
          partId: part.id,
        }),
        expect.objectContaining({
          type: BudgetItemType.SERVICE,
          description: "Technical labor",
          partId: null,
          part: null,
        }),
      ])
    );

    await prisma.serviceOrder.update({
      where: { id: serviceOrder.id },
      data: { status: ServiceOrderStatus.IN_MAINTENANCE },
    });

    await request(app)
      .post(`/service-orders/${serviceOrder.id}/parts/${part.id}/consume`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ quantity: 1 })
      .expect(201);

    const revision = await request(app)
      .post(`/service-orders/${serviceOrder.id}/budgets/revision`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({
        items: [
          {
            partId: part.id,
            quantity: 1,
            unitPrice: 250,
          },
          {
            type: BudgetItemType.SERVICE,
            description: "Revised technical labor",
            quantity: 1,
            unitPrice: 100,
          },
        ],
      })
      .expect(201);

    expect(revision.body.version).toBe(2);
    expect(revision.body.budgetItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: BudgetItemType.SERVICE,
          description: "Revised technical labor",
          partId: null,
        }),
      ])
    );

    expect(
      await prisma.stockMovement.count({
        where: { serviceOrderId: serviceOrder.id },
      })
    ).toBe(1);
  });

  it("rejects invalid PART and SERVICE combinations", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { serviceOrder } = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const part = await createTestPart();
    const endpoint = `/service-orders/${serviceOrder.id}/budgets`;
    const authorizedPost = () =>
      request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${technician.token}`);

    await authorizedPost()
      .send({
        items: [
          {
            type: BudgetItemType.PART,
            quantity: 1,
            unitPrice: 100,
          },
        ],
      })
      .expect(400);

    await authorizedPost()
      .send({
        items: [
          {
            type: BudgetItemType.SERVICE,
            description: "   ",
            quantity: 1,
            unitPrice: 100,
          },
        ],
      })
      .expect(400);

    await authorizedPost()
      .send({
        items: [
          {
            type: BudgetItemType.SERVICE,
            partId: part.id,
            description: "Invalid linked service",
            quantity: 1,
            unitPrice: 100,
          },
        ],
      })
      .expect(400);

    expect(
      await prisma.budget.count({
        where: { serviceOrderId: serviceOrder.id },
      })
    ).toBe(0);
  });

  it("enforces minimumStock validation while preserving the zero default", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);

    const defaultPart = await request(app)
      .post("/parts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Default minimum",
        brand: "Brand",
        currentPrice: 10,
      })
      .expect(201);

    expect(defaultPart.body.minimumStock).toBe(0);

    const configuredPart = await request(app)
      .post("/parts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Configured minimum",
        brand: "Brand",
        currentPrice: 10,
        minimumStock: 4,
      })
      .expect(201);

    expect(configuredPart.body.minimumStock).toBe(4);

    await request(app)
      .post("/parts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Invalid minimum",
        brand: "Brand",
        currentPrice: 10,
        minimumStock: -1,
      })
      .expect(400);

    await request(app)
      .put(`/parts/${configuredPart.body.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ minimumStock: -1 })
      .expect(400);
  });

  it("blocks duplicate versions per OS and allows the same version across OS", async () => {
    const first = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const second = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );

    await prisma.budget.create({
      data: {
        serviceOrderId: first.serviceOrder.id,
        version: 1,
        totalValue: 0,
      },
    });
    await prisma.budget.create({
      data: {
        serviceOrderId: second.serviceOrder.id,
        version: 1,
        totalValue: 0,
      },
    });

    await expect(
      prisma.budget.create({
        data: {
          serviceOrderId: first.serviceOrder.id,
          version: 1,
          totalValue: 0,
        },
      })
    ).rejects.toMatchObject({ code: "P2002" });

    expect(await prisma.budget.count()).toBe(2);
  });

  it("documents Stage 1 budget and Part contracts in OpenAPI", () => {
    const schemas = openApiDocument.components.schemas;
    const partItem = schemas.BudgetPartItemInput;
    const serviceItem = schemas.BudgetServiceItemInput;

    expect(partItem.properties.type.enum).toContain("PART");
    expect(partItem.required).toContain("partId");
    expect(serviceItem.properties.type.enum).toContain("SERVICE");
    expect(serviceItem.required).toContain("description");
    expect(schemas.Part.properties.minimumStock.minimum).toBe(0);
    expect(
      openApiDocument.paths["/service-orders/{id}/budgets"].post
        .requestBody
    ).toBeDefined();
  });
});
