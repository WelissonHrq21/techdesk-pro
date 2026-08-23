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
  createTestServiceOrder,
} from "../helpers/factories";

async function createOriginalMovement({
  type = StockMovementType.EXIT,
  status = ServiceOrderStatus.IN_MAINTENANCE,
  quantity = 2,
  stock = 10,
  withServiceOrder = true,
}: {
  type?: StockMovementType;
  status?: ServiceOrderStatus;
  quantity?: number;
  stock?: number;
  withServiceOrder?: boolean;
} = {}) {
  const part = await createTestPart(stock);
  const { serviceOrder, user } = await createTestServiceOrder(status);

  const movement = await prisma.stockMovement.create({
    data: {
      type,
      quantity,
      reason: "Original movement for reversal test",
      partId: part.id,
      serviceOrderId: withServiceOrder ? serviceOrder.id : undefined,
      userId: user.id,
    },
  });

  return {
    part,
    serviceOrder,
    user,
    movement,
  };
}

function reverseMovement(
  movementId: string,
  token: string,
  body: object = {
    quantity: 1,
    reason: "Part will not be used",
  }
) {
  return request(app)
    .post(`/stock-movements/${movementId}/reverse`)
    .set("Authorization", `Bearer ${token}`)
    .send(body);
}

function consumePart(
  serviceOrderId: string,
  partId: string,
  token: string,
  quantity: number
) {
  return request(app)
    .post(`/service-orders/${serviceOrderId}/parts/${partId}/consume`)
    .set("Authorization", `Bearer ${token}`)
    .send({ quantity });
}

async function getConsumptionBalance(
  serviceOrderId: string,
  partId: string
) {
  const exits = await prisma.stockMovement.findMany({
    where: {
      type: StockMovementType.EXIT,
      serviceOrderId,
      partId,
    },
    select: {
      id: true,
      quantity: true,
    },
  });

  const reversed = exits.length
    ? await prisma.stockMovement.aggregate({
        where: {
          type: StockMovementType.REVERSAL,
          reversalOfMovementId: {
            in: exits.map((exit) => exit.id),
          },
        },
        _sum: {
          quantity: true,
        },
      })
    : { _sum: { quantity: 0 } };

  const grossConsumed = exits.reduce((total, exit) => {
    return total + exit.quantity;
  }, 0);
  const reversedQuantity = reversed._sum.quantity ?? 0;

  return {
    grossConsumed,
    reversed: reversedQuantity,
    netConsumed: grossConsumed - reversedQuantity,
  };
}

async function createApprovedMaintenanceScenarioForPart({
  partId,
  budgetQuantity,
  token,
}: {
  partId: string;
  budgetQuantity: number;
  token: string;
}) {
  const { serviceOrder } = await createTestServiceOrder(
    ServiceOrderStatus.IN_ANALYSIS
  );

  await request(app)
    .post(`/service-orders/${serviceOrder.id}/budgets`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      items: [
        {
          partId,
          quantity: budgetQuantity,
          unitPrice: 250,
        },
      ],
    })
    .expect(201);

  await prisma.serviceOrder.update({
    where: {
      id: serviceOrder.id,
    },
    data: {
      status: ServiceOrderStatus.IN_MAINTENANCE,
    },
  });

  return serviceOrder;
}

describe("Auditable stock reversal", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates partial and total REVERSAL movements while preserving the original EXIT", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { part, serviceOrder, movement } =
      await createOriginalMovement();

    const partial = await reverseMovement(
      movement.id,
      technician.token,
      {
        quantity: 1,
        reason: "Part removed during test",
      }
    ).expect(201);

    expect(partial.body.movement.type).toBe("REVERSAL");
    expect(partial.body.movement.quantity).toBe(1);
    expect(partial.body.movement.partId).toBe(part.id);
    expect(partial.body.movement.serviceOrderId).toBe(
      serviceOrder.id
    );
    expect(partial.body.movement.userId).toBe(technician.user.id);
    expect(partial.body.movement.reversalOfMovementId).toBe(
      movement.id
    );
    expect(partial.body.part.stock).toBe(part.stock + 1);
    expect(partial.body.reversibleQuantity).toBe(1);

    const originalAfterPartial =
      await prisma.stockMovement.findUniqueOrThrow({
        where: {
          id: movement.id,
        },
      });

    expect(originalAfterPartial.type).toBe(StockMovementType.EXIT);
    expect(originalAfterPartial.quantity).toBe(2);
    expect(originalAfterPartial.partId).toBe(part.id);
    expect(originalAfterPartial.serviceOrderId).toBe(serviceOrder.id);
    expect(originalAfterPartial.userId).toBe(movement.userId);
    expect(originalAfterPartial.reversalOfMovementId).toBeNull();

    const remaining = await reverseMovement(
      movement.id,
      technician.token,
      {
        quantity: 1,
        reason: "Remaining part not needed",
      }
    ).expect(201);

    expect(remaining.body.movement.type).toBe("REVERSAL");
    expect(remaining.body.reversibleQuantity).toBe(0);
    expect(remaining.body.reversedQuantity).toBe(2);
    expect(remaining.body.part.stock).toBe(part.stock + 2);

    await reverseMovement(movement.id, technician.token, {
      quantity: 1,
      reason: "No balance left",
    }).expect(409);

    const reversalSum = await prisma.stockMovement.aggregate({
      where: {
        type: StockMovementType.REVERSAL,
        reversalOfMovementId: movement.id,
      },
      _sum: {
        quantity: true,
      },
    });

    expect(reversalSum._sum.quantity).toBe(2);

    const serviceOrderResponse = await request(app)
      .get(`/service-orders/${serviceOrder.id}`)
      .set("Authorization", `Bearer ${technician.token}`)
      .expect(200);

    expect(
      serviceOrderResponse.body.stockMovements.some(
        (item: { type: string; reversalOfMovementId?: string }) =>
          item.type === "REVERSAL" &&
          item.reversalOfMovementId === movement.id
      )
    ).toBe(true);

    const partMovementsResponse = await request(app)
      .get(`/parts/${part.id}/stock-movements`)
      .set("Authorization", `Bearer ${technician.token}`)
      .expect(200);

    expect(
      partMovementsResponse.body.data.some(
        (item: { type: string; reversalOfMovementId?: string }) =>
          item.type === "REVERSAL" &&
          item.reversalOfMovementId === movement.id
      )
    ).toBe(true);
  });

  it("returns 409 when requested quantity exceeds the reversible balance", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { movement } = await createOriginalMovement({
      quantity: 2,
    });

    await reverseMovement(movement.id, technician.token, {
      quantity: 3,
      reason: "Trying to reverse too much",
    }).expect(409);

    const reversalCount = await prisma.stockMovement.count({
      where: {
        type: StockMovementType.REVERSAL,
        reversalOfMovementId: movement.id,
      },
    });

    expect(reversalCount).toBe(0);
  });

  it.each([
    StockMovementType.ENTRY,
    StockMovementType.ADJUSTMENT,
    StockMovementType.REVERSAL,
  ])("rejects %s movements", async (type) => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const { movement } = await createOriginalMovement({ type });

    await reverseMovement(movement.id, admin.token).expect(400);
  });

  it("rejects manual EXIT movements without a service order", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const { movement } = await createOriginalMovement({
      withServiceOrder: false,
    });

    await reverseMovement(movement.id, admin.token).expect(400);
  });

  it.each([
    ServiceOrderStatus.IN_MAINTENANCE,
    ServiceOrderStatus.FINISHED,
  ])("allows reversal when service order is %s", async (status) => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { movement } = await createOriginalMovement({ status });

    await reverseMovement(movement.id, technician.token).expect(201);
  });

  it.each([
    ServiceOrderStatus.RECEIVED,
    ServiceOrderStatus.IN_ANALYSIS,
    ServiceOrderStatus.AWAITING_APPROVAL,
    ServiceOrderStatus.BUDGET_APPROVED,
    ServiceOrderStatus.AWAITING_PICKUP,
    ServiceOrderStatus.DELIVERED,
    ServiceOrderStatus.CANCELLED,
  ])("blocks reversal when service order is %s", async (status) => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { movement } = await createOriginalMovement({ status });

    await reverseMovement(movement.id, technician.token).expect(400);
  });

  it("enforces reversal RBAC", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const reception = await authenticateTestUser(UserRole.RECEPTION);

    const adminScenario = await createOriginalMovement();
    await reverseMovement(
      adminScenario.movement.id,
      admin.token
    ).expect(201);

    const technicianScenario = await createOriginalMovement();
    await reverseMovement(
      technicianScenario.movement.id,
      technician.token
    ).expect(201);

    const receptionScenario = await createOriginalMovement();
    await reverseMovement(
      receptionScenario.movement.id,
      reception.token
    ).expect(403);
  });

  it("validates the reversal request body", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { movement } = await createOriginalMovement();

    await reverseMovement(movement.id, technician.token, {
      quantity: 1,
    }).expect(400);

    await reverseMovement(movement.id, technician.token, {
      quantity: 1,
      reason: "   ",
    }).expect(400);

    await reverseMovement(movement.id, technician.token, {
      quantity: 0,
      reason: "Invalid quantity",
    }).expect(400);

    await reverseMovement(movement.id, technician.token, {
      quantity: -1,
      reason: "Invalid quantity",
    }).expect(400);

    await reverseMovement(movement.id, technician.token, {
      quantity: 1.5,
      reason: "Invalid quantity",
    }).expect(400);

    await reverseMovement(movement.id, technician.token, {
      quantity: 1,
      reason: "Valid reversal",
      extra: true,
    }).expect(400);
  });

  it("returns 404 when original movement does not exist", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);

    await reverseMovement(
      "00000000-0000-0000-0000-000000000000",
      technician.token
    ).expect(404);
  });

  it("prevents concurrent double reversal of the same EXIT", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { part, movement } = await createOriginalMovement({
        quantity: 1,
        stock: 0,
      });

      const responses = await Promise.all([
        reverseMovement(movement.id, technician.token, {
          quantity: 1,
          reason: `Concurrent reversal A ${attempt}`,
        }),
        reverseMovement(movement.id, technician.token, {
          quantity: 1,
          reason: `Concurrent reversal B ${attempt}`,
        }),
      ]);

      const statuses = responses
        .map((response) => response.status)
        .sort();

      expect(statuses).toEqual([201, 409]);

      const reversalSum = await prisma.stockMovement.aggregate({
        where: {
          type: StockMovementType.REVERSAL,
          reversalOfMovementId: movement.id,
        },
        _sum: {
          quantity: true,
        },
      });

      const updatedPart = await prisma.part.findUniqueOrThrow({
        where: {
          id: part.id,
        },
      });

      expect(reversalSum._sum.quantity).toBe(1);
      expect(updatedPart.stock).toBe(1);
    }
  });

  it("keeps the existing consume endpoint behavior intact", async () => {
    const scenario = await createApprovedMaintenanceScenario();

    await request(app)
      .post(
        `/service-orders/${scenario.serviceOrder.id}/parts/${scenario.part.id}/consume`
      )
      .set("Authorization", `Bearer ${scenario.token}`)
      .send({ quantity: 1 })
      .expect(201);

    const updatedPart = await prisma.part.findUniqueOrThrow({
      where: {
        id: scenario.part.id,
      },
    });

    const exitMovement = await prisma.stockMovement.findFirst({
      where: {
        type: StockMovementType.EXIT,
        partId: scenario.part.id,
        serviceOrderId: scenario.serviceOrder.id,
      },
    });

    expect(updatedPart.stock).toBe(4);
    expect(exitMovement?.quantity).toBe(1);
  });

  it("uses net consumption after a partial reversal when enforcing the approved budget", async () => {
    const scenario = await createApprovedMaintenanceScenario({
      budgetQuantity: 2,
      stock: 5,
    });

    const firstConsume = await consumePart(
      scenario.serviceOrder.id,
      scenario.part.id,
      scenario.token,
      2
    ).expect(201);

    await reverseMovement(
      firstConsume.body.movement.id,
      scenario.token,
      {
        quantity: 1,
        reason: "Partially returned to stock",
      }
    ).expect(201);

    await consumePart(
      scenario.serviceOrder.id,
      scenario.part.id,
      scenario.token,
      1
    ).expect(201);

    const balance = await getConsumptionBalance(
      scenario.serviceOrder.id,
      scenario.part.id
    );

    expect(balance).toEqual({
      grossConsumed: 3,
      reversed: 1,
      netConsumed: 2,
    });

    await consumePart(
      scenario.serviceOrder.id,
      scenario.part.id,
      scenario.token,
      1
    ).expect(409);
  });

  it("allows consuming restored capacity after multiple partial reversals", async () => {
    const scenario = await createApprovedMaintenanceScenario({
      budgetQuantity: 3,
      stock: 8,
    });

    const firstConsume = await consumePart(
      scenario.serviceOrder.id,
      scenario.part.id,
      scenario.token,
      3
    ).expect(201);

    await reverseMovement(
      firstConsume.body.movement.id,
      scenario.token,
      {
        quantity: 1,
        reason: "First unit returned",
      }
    ).expect(201);

    await reverseMovement(
      firstConsume.body.movement.id,
      scenario.token,
      {
        quantity: 1,
        reason: "Second unit returned",
      }
    ).expect(201);

    await consumePart(
      scenario.serviceOrder.id,
      scenario.part.id,
      scenario.token,
      2
    ).expect(201);

    const balance = await getConsumptionBalance(
      scenario.serviceOrder.id,
      scenario.part.id
    );

    expect(balance).toEqual({
      grossConsumed: 5,
      reversed: 2,
      netConsumed: 3,
    });
  });

  it("allows consuming the approved quantity again after a total reversal", async () => {
    const scenario = await createApprovedMaintenanceScenario({
      budgetQuantity: 2,
      stock: 5,
    });

    const firstConsume = await consumePart(
      scenario.serviceOrder.id,
      scenario.part.id,
      scenario.token,
      2
    ).expect(201);

    await reverseMovement(
      firstConsume.body.movement.id,
      scenario.token,
      {
        quantity: 2,
        reason: "Total return",
      }
    ).expect(201);

    const zeroBalance = await getConsumptionBalance(
      scenario.serviceOrder.id,
      scenario.part.id
    );

    expect(zeroBalance.netConsumed).toBe(0);

    await consumePart(
      scenario.serviceOrder.id,
      scenario.part.id,
      scenario.token,
      2
    ).expect(201);

    const finalBalance = await getConsumptionBalance(
      scenario.serviceOrder.id,
      scenario.part.id
    );

    expect(finalBalance).toEqual({
      grossConsumed: 4,
      reversed: 2,
      netConsumed: 2,
    });
  });

  it("keeps consumption behavior unchanged when there is no reversal", async () => {
    const scenario = await createApprovedMaintenanceScenario({
      budgetQuantity: 2,
      stock: 5,
    });

    await consumePart(
      scenario.serviceOrder.id,
      scenario.part.id,
      scenario.token,
      1
    ).expect(201);

    await consumePart(
      scenario.serviceOrder.id,
      scenario.part.id,
      scenario.token,
      1
    ).expect(201);

    await consumePart(
      scenario.serviceOrder.id,
      scenario.part.id,
      scenario.token,
      1
    ).expect(409);

    const balance = await getConsumptionBalance(
      scenario.serviceOrder.id,
      scenario.part.id
    );

    expect(balance).toEqual({
      grossConsumed: 2,
      reversed: 0,
      netConsumed: 2,
    });
  });

  it("does not let a reversal from another service order reduce this service order consumption", async () => {
    const scenarioA = await createApprovedMaintenanceScenario({
      budgetQuantity: 2,
      stock: 10,
    });
    const serviceOrderB = await createApprovedMaintenanceScenarioForPart({
      partId: scenarioA.part.id,
      budgetQuantity: 1,
      token: scenarioA.token,
    });

    const firstConsumeA = await consumePart(
      scenarioA.serviceOrder.id,
      scenarioA.part.id,
      scenarioA.token,
      2
    ).expect(201);

    await consumePart(
      serviceOrderB.id,
      scenarioA.part.id,
      scenarioA.token,
      1
    ).expect(201);

    await reverseMovement(
      firstConsumeA.body.movement.id,
      scenarioA.token,
      {
        quantity: 1,
        reason: "Different service order reversal",
      }
    ).expect(201);

    await consumePart(
      serviceOrderB.id,
      scenarioA.part.id,
      scenarioA.token,
      1
    ).expect(409);

    const balanceB = await getConsumptionBalance(
      serviceOrderB.id,
      scenarioA.part.id
    );

    expect(balanceB).toEqual({
      grossConsumed: 1,
      reversed: 0,
      netConsumed: 1,
    });
  });

  it("uses net consumption when protecting revised budget quantities", async () => {
    const scenario = await createApprovedMaintenanceScenario({
      budgetQuantity: 2,
      stock: 5,
    });

    const firstConsume = await consumePart(
      scenario.serviceOrder.id,
      scenario.part.id,
      scenario.token,
      2
    ).expect(201);

    await reverseMovement(
      firstConsume.body.movement.id,
      scenario.token,
      {
        quantity: 1,
        reason: "Reduce effective consumption before revision",
      }
    ).expect(201);

    const revision = await request(app)
      .post(`/service-orders/${scenario.serviceOrder.id}/budgets/revision`)
      .set("Authorization", `Bearer ${scenario.token}`)
      .send({
        items: [
          {
            partId: scenario.part.id,
            quantity: 1,
            unitPrice: 250,
          },
        ],
      })
      .expect(201);

    expect(revision.body.version).toBe(2);
  });

  it("keeps net consumption within budget during concurrent reverse and consume", async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const scenario = await createApprovedMaintenanceScenario({
        budgetQuantity: 1,
        stock: 2,
      });

      const firstConsume = await consumePart(
        scenario.serviceOrder.id,
        scenario.part.id,
        scenario.token,
        1
      ).expect(201);

      const [reversalResponse, consumeResponse] = await Promise.all([
        reverseMovement(
          firstConsume.body.movement.id,
          scenario.token,
          {
            quantity: 1,
            reason: `Concurrent return ${attempt}`,
          }
        ),
        consumePart(
          scenario.serviceOrder.id,
          scenario.part.id,
          scenario.token,
          1
        ),
      ]);

      expect(reversalResponse.status).toBe(201);
      expect([201, 409]).toContain(consumeResponse.status);

      const balance = await getConsumptionBalance(
        scenario.serviceOrder.id,
        scenario.part.id
      );
      const updatedPart = await prisma.part.findUniqueOrThrow({
        where: {
          id: scenario.part.id,
        },
      });

      expect(balance.netConsumed).toBeLessThanOrEqual(1);
      expect(updatedPart.stock).toBe(
        2 - balance.grossConsumed + balance.reversed
      );
    }
  });

  it("documents the reversal endpoint and REVERSAL enum in OpenAPI", () => {
    const stockMovementSchema =
      openApiDocument.components.schemas.StockMovement;
    const reversePath =
      openApiDocument.paths["/stock-movements/{id}/reverse"];

    expect(
      stockMovementSchema.properties.type.enum.includes("REVERSAL")
    ).toBe(true);
    expect(reversePath.post.responses["201"].description).toBe(
      "Stock reversal created"
    );
    expect(reversePath.post.responses["409"].description).toContain(
      "Reversal quantity"
    );
  });
});
