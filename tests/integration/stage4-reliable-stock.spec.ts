import {
  ServiceOrderStatus,
  StockMovementType,
  UserRole,
} from "@prisma/client";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app";
import { openApiDocument } from "../../src/docs/openapi";
import { prisma, resetDatabase } from "../helpers/database";
import {
  authenticateTestUser,
  createApprovedMaintenanceScenario,
  createTestPart,
} from "../helpers/factories";

function authorizedPost(path: string, token: string, body: object) {
  return request(app)
    .post(path)
    .set("Authorization", `Bearer ${token}`)
    .send(body);
}

describe("Stage 4 reliable stock", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("derives stock status and combines status filters with search", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const fixtures = [
      { name: "SSD no alert", stock: 10, minimumStock: 0, expected: "OK" },
      { name: "SSD empty no alert", stock: 0, minimumStock: 0, expected: "OUT_OF_STOCK" },
      { name: "Memory healthy", stock: 10, minimumStock: 5, expected: "OK" },
      { name: "SSD at minimum", stock: 5, minimumStock: 5, expected: "LOW_STOCK" },
      { name: "SSD below minimum", stock: 1, minimumStock: 5, expected: "LOW_STOCK" },
      { name: "Memory empty", stock: 0, minimumStock: 5, expected: "OUT_OF_STOCK" },
    ];

    for (const fixture of fixtures) {
      await prisma.part.create({
        data: {
          name: fixture.name,
          brand: "Stage 4",
          currentPrice: 100,
          stock: fixture.stock,
          minimumStock: fixture.minimumStock,
        },
      });
    }

    const all = await request(app)
      .get("/parts?limit=100")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    for (const fixture of fixtures) {
      const part = all.body.data.find(
        (item: { name: string }) => item.name === fixture.name
      );
      expect(part.stockStatus).toBe(fixture.expected);
      expect(part.minimumStock).toBe(fixture.minimumStock);
    }

    const lowSsds = await request(app)
      .get("/parts?stockStatus=LOW_STOCK&search=ssd&limit=100")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    expect(lowSsds.body.data.map((part: { name: string }) => part.name))
      .toEqual(["SSD at minimum", "SSD below minimum"]);

    const outOfStock = await request(app)
      .get("/parts?stockStatus=OUT_OF_STOCK&limit=100")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    expect(outOfStock.body.data).toHaveLength(2);
    expect(
      outOfStock.body.data.every(
        (part: { stockStatus: string }) =>
          part.stockStatus === "OUT_OF_STOCK"
      )
    ).toBe(true);
  });

  it("updates minimum stock without changing current stock", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const part = await createTestPart(7);

    const updated = await request(app)
      .put(`/parts/${part.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ minimumStock: 7 })
      .expect(200);

    expect(updated.body.stock).toBe(7);
    expect(updated.body.minimumStock).toBe(7);
    expect(updated.body.stockStatus).toBe("LOW_STOCK");

    await request(app)
      .put(`/parts/${part.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ minimumStock: -1 })
      .expect(400);

    expect(
      await prisma.part.findUniqueOrThrow({ where: { id: part.id } })
    ).toMatchObject({ stock: 7, minimumStock: 7 });
  });

  it("serializes concurrent manual exits and never creates negative stock", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);

    for (let round = 0; round < 5; round += 1) {
      const part = await createTestPart(1);
      const path = `/parts/${part.id}/stock/exit`;
      const results = await Promise.all([
        authorizedPost(path, admin.token, { quantity: 1 }),
        authorizedPost(path, admin.token, { quantity: 1 }),
      ]);

      expect(results.map((result) => result.status).sort()).toEqual([
        201,
        409,
      ]);
      expect(
        await prisma.part.findUniqueOrThrow({ where: { id: part.id } })
      ).toMatchObject({ stock: 0 });
      expect(
        await prisma.stockMovement.count({
          where: { partId: part.id, type: StockMovementType.EXIT },
        })
      ).toBe(1);
    }
  });

  it("returns 409 for insufficient manual stock and preserves the balance", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const part = await createTestPart(1);

    const response = await authorizedPost(
      `/parts/${part.id}/stock/exit`,
      admin.token,
      { quantity: 2 }
    ).expect(409);

    expect(response.body.message).toBe("Insufficient stock");
    expect(
      await prisma.part.findUniqueOrThrow({ where: { id: part.id } })
    ).toMatchObject({ stock: 1 });
    expect(
      await prisma.stockMovement.count({ where: { partId: part.id } })
    ).toBe(0);
  });

  it("keeps concurrent ENTRY increments without lost updates", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const part = await createTestPart(0);
    const path = `/parts/${part.id}/stock/entry`;

    const results = await Promise.all([
      authorizedPost(path, admin.token, { quantity: 2 }),
      authorizedPost(path, admin.token, { quantity: 3 }),
    ]);

    expect(results.map((result) => result.status)).toEqual([201, 201]);
    expect(
      await prisma.part.findUniqueOrThrow({ where: { id: part.id } })
    ).toMatchObject({ stock: 5 });
    expect(
      await prisma.stockMovement.count({
        where: { partId: part.id, type: StockMovementType.ENTRY },
      })
    ).toBe(2);
  });

  it("serializes manual EXIT against service-order consumption", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const scenario = await createApprovedMaintenanceScenario({
      stock: 1,
      budgetQuantity: 1,
    });

    const results = await Promise.all([
      authorizedPost(
        `/parts/${scenario.part.id}/stock/exit`,
        admin.token,
        { quantity: 1 }
      ),
      authorizedPost(
        `/service-orders/${scenario.serviceOrder.id}/parts/${scenario.part.id}/consume`,
        scenario.token,
        { quantity: 1 }
      ),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([
      201,
      409,
    ]);
    expect(
      await prisma.part.findUniqueOrThrow({
        where: { id: scenario.part.id },
      })
    ).toMatchObject({ stock: 0 });
    expect(
      await prisma.stockMovement.count({
        where: {
          partId: scenario.part.id,
          type: StockMovementType.EXIT,
        },
      })
    ).toBe(1);
  });

  it("keeps manual EXIT consistent with a concurrent REVERSAL", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const scenario = await createApprovedMaintenanceScenario({
      stock: 2,
      budgetQuantity: 1,
    });

    const consumed = await authorizedPost(
      `/service-orders/${scenario.serviceOrder.id}/parts/${scenario.part.id}/consume`,
      scenario.token,
      { quantity: 1 }
    ).expect(201);

    const results = await Promise.all([
      authorizedPost(
        `/parts/${scenario.part.id}/stock/exit`,
        admin.token,
        { quantity: 1 }
      ),
      authorizedPost(
        `/stock-movements/${consumed.body.movement.id}/reverse`,
        scenario.token,
        { quantity: 1, reason: "Concurrent reversal" }
      ),
    ]);

    expect(results.map((result) => result.status)).toEqual([201, 201]);
    expect(
      await prisma.part.findUniqueOrThrow({
        where: { id: scenario.part.id },
      })
    ).toMatchObject({ stock: 1 });
    expect(
      await prisma.stockMovement.count({
        where: {
          partId: scenario.part.id,
          type: StockMovementType.REVERSAL,
        },
      })
    ).toBe(1);
  });

  it("paginates 105 movements without duplicates or missing items", async () => {
    const user = await authenticateTestUser(UserRole.TECHNICIAN);
    const part = await createTestPart(0);
    const movementTypes = [
      StockMovementType.ENTRY,
      StockMovementType.EXIT,
      StockMovementType.REVERSAL,
    ];

    await prisma.stockMovement.createMany({
      data: Array.from({ length: 105 }, (_, index) => ({
        type: movementTypes[index % movementTypes.length],
        quantity: 1,
        reason: `Movement ${index}`,
        partId: part.id,
        createdAt: new Date(
          Date.UTC(2026, 0, 1 + Math.floor(index / 20), index % 20)
        ),
      })),
    });

    const firstPage = await request(app)
      .get(`/parts/${part.id}/stock-movements`)
      .set("Authorization", `Bearer ${user.token}`)
      .expect(200);

    expect(firstPage.body.data).toHaveLength(20);
    expect(firstPage.body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 105,
      totalPages: 6,
    });

    const allIds: string[] = [];

    for (let page = 1; page <= 6; page += 1) {
      const response = await request(app)
        .get(`/parts/${part.id}/stock-movements?page=${page}&limit=20`)
        .set("Authorization", `Bearer ${user.token}`)
        .expect(200);
      allIds.push(
        ...response.body.data.map((movement: { id: string }) => movement.id)
      );
    }

    expect(allIds).toHaveLength(105);
    expect(new Set(allIds).size).toBe(105);
    expect(
      new Date(firstPage.body.data[0].createdAt).getTime()
    ).toBeGreaterThan(
      new Date(firstPage.body.data[1].createdAt).getTime()
    );

    const entries = await request(app)
      .get(
        `/parts/${part.id}/stock-movements?type=ENTRY&limit=100`
      )
      .set("Authorization", `Bearer ${user.token}`)
      .expect(200);

    expect(entries.body.meta.total).toBe(35);
    expect(
      entries.body.data.every(
        (movement: { type: string }) => movement.type === "ENTRY"
      )
    ).toBe(true);

    const dateRange = await request(app)
      .get(
        `/parts/${part.id}/stock-movements?dateFrom=2026-01-02&dateTo=2026-01-03&limit=100`
      )
      .set("Authorization", `Bearer ${user.token}`)
      .expect(200);

    expect(dateRange.body.meta.total).toBe(40);

    const combined = await request(app)
      .get(
        `/parts/${part.id}/stock-movements?type=EXIT&dateFrom=2026-01-02&dateTo=2026-01-03&limit=100`
      )
      .set("Authorization", `Bearer ${user.token}`)
      .expect(200);

    expect(combined.body.data.length).toBeGreaterThan(0);
    expect(
      combined.body.data.every(
        (movement: { type: string; createdAt: string }) =>
          movement.type === "EXIT" &&
          movement.createdAt >= "2026-01-02" &&
          movement.createdAt < "2026-01-04"
      )
    ).toBe(true);
  });

  it("validates pagination, filters, dates, and stable ordering", async () => {
    const user = await authenticateTestUser(UserRole.TECHNICIAN);
    const part = await createTestPart(0);
    const createdAt = new Date("2026-02-01T12:00:00.000Z");
    const ids = [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
    ];

    await prisma.stockMovement.createMany({
      data: ids.map((id) => ({
        id,
        type: StockMovementType.ENTRY,
        quantity: 1,
        partId: part.id,
        createdAt,
      })),
    });

    const stable = await request(app)
      .get(`/parts/${part.id}/stock-movements?limit=20`)
      .set("Authorization", `Bearer ${user.token}`)
      .expect(200);

    expect(stable.body.data.map((item: { id: string }) => item.id)).toEqual(
      [...ids].sort().reverse()
    );

    for (const query of [
      "page=0",
      "limit=101",
      "type=INVALID",
      "dateFrom=2026-02-02&dateTo=2026-02-01",
      "dateFrom=not-a-date",
      "dateFrom=2026-02-31",
    ]) {
      await request(app)
        .get(`/parts/${part.id}/stock-movements?${query}`)
        .set("Authorization", `Bearer ${user.token}`)
        .expect(400);
    }
  });

  it("documents reliable stock contracts in OpenAPI", () => {
    const partSchema = openApiDocument.components.schemas.Part;
    const partsPath = openApiDocument.paths["/parts"].get;
    const historyPath =
      openApiDocument.paths["/parts/{id}/stock-movements"].get;
    const exitPath =
      openApiDocument.paths["/parts/{id}/stock/exit"].post;

    expect(partSchema.properties.stockStatus.enum).toEqual([
      "OK",
      "LOW_STOCK",
      "OUT_OF_STOCK",
    ]);
    expect(
      partsPath.parameters.some(
        (parameter: { name: string }) => parameter.name === "stockStatus"
      )
    ).toBe(true);
    expect(
      historyPath.parameters.map(
        (parameter: { name: string }) => parameter.name
      )
    ).toEqual(
      expect.arrayContaining(["page", "limit", "type", "dateFrom", "dateTo"])
    );
    expect(historyPath.responses["200"].content).toBeDefined();
    expect(exitPath.responses["409"]).toBeDefined();
  });
});
