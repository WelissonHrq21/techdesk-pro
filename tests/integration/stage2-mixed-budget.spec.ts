import {
  BudgetItemType,
  Prisma,
  ServiceOrderStatus,
  StockMovementType,
  UserRole,
} from "@prisma/client";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { app } from "../../src/app";
import { openApiDocument } from "../../src/docs/openapi";
import { BudgetRepository } from "../../src/repositories/BudgetRepository";
import { prisma, resetDatabase } from "../helpers/database";
import {
  authenticateTestUser,
  createTestPart,
  createTestServiceOrder,
} from "../helpers/factories";

function createBudgetRequest(
  serviceOrderId: string,
  token: string,
  items: object[]
) {
  return request(app)
    .post(`/service-orders/${serviceOrderId}/budgets`)
    .set("Authorization", `Bearer ${token}`)
    .send({ items });
}

describe("v1.2.0 Stage 2 mixed budget backend", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates legacy, explicit PART, SERVICE-only, and mixed budgets", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const legacyOrder = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const serviceOrder = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const mixedOrder = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const firstPart = await createTestPart();
    const secondPart = await createTestPart();

    const legacy = await createBudgetRequest(
      legacyOrder.serviceOrder.id,
      technician.token,
      [{ partId: firstPart.id, quantity: 1, unitPrice: 250 }]
    ).expect(201);

    expect(legacy.body.budgetItems[0]).toMatchObject({
      type: BudgetItemType.PART,
      partId: firstPart.id,
      description: firstPart.name,
    });

    const serviceOnly = await createBudgetRequest(
      serviceOrder.serviceOrder.id,
      technician.token,
      [
        {
          type: BudgetItemType.SERVICE,
          description: "  Data recovery  ",
          quantity: 1,
          unitPrice: 100,
        },
      ]
    ).expect(201);

    expect(serviceOnly.body.budgetItems[0]).toMatchObject({
      type: BudgetItemType.SERVICE,
      partId: null,
      part: null,
      description: "Data recovery",
    });

    const mixed = await createBudgetRequest(
      mixedOrder.serviceOrder.id,
      technician.token,
      [
        {
          type: BudgetItemType.PART,
          partId: firstPart.id,
          quantity: 1,
          unitPrice: 250,
        },
        {
          type: BudgetItemType.PART,
          partId: secondPart.id,
          quantity: 2,
          unitPrice: 120,
        },
        {
          type: BudgetItemType.SERVICE,
          description: "Installation",
          quantity: 1,
          unitPrice: 100,
        },
        {
          type: BudgetItemType.SERVICE,
          description: "Configuration",
          quantity: 2,
          unitPrice: 40,
        },
      ]
    ).expect(201);

    expect(Number(mixed.body.totalValue)).toBe(670);
    expect(mixed.body.budgetItems).toHaveLength(4);
  });

  it("rejects invalid item contracts and rolls back the complete budget", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { serviceOrder } = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const activePart = await createTestPart();
    const inactivePart = await prisma.part.create({
      data: {
        name: "Inactive part",
        brand: "Brand",
        currentPrice: 10,
        active: false,
      },
    });

    await createBudgetRequest(serviceOrder.id, technician.token, [
      {
        partId: activePart.id,
        quantity: 1,
        unitPrice: 10,
      },
      {
        type: BudgetItemType.SERVICE,
        description: "",
        quantity: 1,
        unitPrice: 10,
      },
    ]).expect(400);

    await createBudgetRequest(serviceOrder.id, technician.token, [
      {
        type: BudgetItemType.PART,
        quantity: 1,
        unitPrice: 10,
      },
    ]).expect(400);

    await createBudgetRequest(serviceOrder.id, technician.token, [
      {
        type: BudgetItemType.SERVICE,
        partId: activePart.id,
        description: "Invalid service",
        quantity: 1,
        unitPrice: 10,
      },
    ]).expect(400);

    await createBudgetRequest(serviceOrder.id, technician.token, [
      {
        partId: inactivePart.id,
        quantity: 1,
        unitPrice: 10,
      },
    ]).expect(400);

    await createBudgetRequest(serviceOrder.id, technician.token, []).expect(
      400
    );

    expect(
      await prisma.budget.count({ where: { serviceOrderId: serviceOrder.id } })
    ).toBe(0);
  });

  it("preserves PART, SERVICE, and price snapshots across versions", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { serviceOrder } = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const part = await createTestPart();

    await createBudgetRequest(serviceOrder.id, technician.token, [
      { partId: part.id, quantity: 1, unitPrice: 200 },
      {
        type: BudgetItemType.SERVICE,
        description: "Initial labor",
        quantity: 1,
        unitPrice: 80,
      },
    ]).expect(201);

    await prisma.part.update({
      where: { id: part.id },
      data: { name: "Renamed part", currentPrice: 300 },
    });
    await prisma.serviceOrder.update({
      where: { id: serviceOrder.id },
      data: { status: ServiceOrderStatus.BUDGET_REJECTED },
    });

    await createBudgetRequest(serviceOrder.id, technician.token, [
      { partId: part.id, quantity: 1, unitPrice: 300 },
      {
        type: BudgetItemType.SERVICE,
        description: "Revised labor",
        quantity: 1,
        unitPrice: 90,
      },
    ]).expect(201);

    const detail = await request(app)
      .get(`/service-orders/${serviceOrder.id}`)
      .set("Authorization", `Bearer ${technician.token}`)
      .expect(200);

    expect(
      detail.body.budgets.map(
        (budget: { version: number }) => budget.version
      )
    ).toEqual([1, 2]);

    const [v1, v2] = detail.body.budgets;
    expect(v1.budgetItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: BudgetItemType.PART,
          description: part.name,
          unitPrice: "200",
        }),
        expect.objectContaining({
          type: BudgetItemType.SERVICE,
          description: "Initial labor",
          partId: null,
        }),
      ])
    );
    expect(v2.budgetItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: BudgetItemType.PART,
          description: "Renamed part",
          unitPrice: "300",
        }),
        expect.objectContaining({
          type: BudgetItemType.SERVICE,
          description: "Revised labor",
        }),
      ])
    );
  });

  it("approves and rejects mixed or SERVICE-only budgets without stock movement", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const reception = await authenticateTestUser(UserRole.RECEPTION);
    const part = await createTestPart(5);
    const approvalOrder = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const rejectionOrder = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const serviceOnlyApprovalOrder = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );

    const mixed = await createBudgetRequest(
      approvalOrder.serviceOrder.id,
      technician.token,
      [
        { partId: part.id, quantity: 1, unitPrice: 250 },
        {
          type: BudgetItemType.SERVICE,
          description: "Labor",
          quantity: 1,
          unitPrice: 100,
        },
      ]
    ).expect(201);
    const mixedRejected = await createBudgetRequest(
      rejectionOrder.serviceOrder.id,
      technician.token,
      [
        { partId: part.id, quantity: 1, unitPrice: 250 },
        {
          type: BudgetItemType.SERVICE,
          description: "Diagnosis",
          quantity: 1,
          unitPrice: 50,
        },
      ]
    ).expect(201);
    const serviceOnlyApproval = await createBudgetRequest(
      serviceOnlyApprovalOrder.serviceOrder.id,
      technician.token,
      [
        {
          type: BudgetItemType.SERVICE,
          description: "Remote configuration",
          quantity: 1,
          unitPrice: 75,
        },
      ]
    ).expect(201);

    await prisma.serviceOrder.updateMany({
      where: {
        id: {
          in: [approvalOrder.serviceOrder.id, rejectionOrder.serviceOrder.id],
        },
      },
      data: { status: ServiceOrderStatus.AWAITING_APPROVAL },
    });
    await prisma.serviceOrder.update({
      where: { id: serviceOnlyApprovalOrder.serviceOrder.id },
      data: { status: ServiceOrderStatus.AWAITING_APPROVAL },
    });

    const approved = await request(app)
      .post(`/budgets/${mixed.body.id}/approve`)
      .set("Authorization", `Bearer ${reception.token}`)
      .send({ observation: "Approved mixed budget" })
      .expect(200);
    const rejected = await request(app)
      .post(`/budgets/${mixedRejected.body.id}/reject`)
      .set("Authorization", `Bearer ${reception.token}`)
      .send({ observation: "Rejected mixed budget" })
      .expect(200);
    const approvedServiceOnly = await request(app)
      .post(`/budgets/${serviceOnlyApproval.body.id}/approve`)
      .set("Authorization", `Bearer ${reception.token}`)
      .send({ observation: "Approved service-only budget" })
      .expect(200);

    expect(approved.body.status).toBe(ServiceOrderStatus.BUDGET_APPROVED);
    expect(rejected.body.status).toBe(ServiceOrderStatus.BUDGET_REJECTED);
    expect(approvedServiceOnly.body.status).toBe(
      ServiceOrderStatus.BUDGET_APPROVED
    );
    expect(await prisma.stockMovement.count()).toBe(0);
  });

  it("limits consumption to PART quantities and keeps reversal accounting isolated", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { serviceOrder } = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const part = await createTestPart(5);

    await createBudgetRequest(serviceOrder.id, technician.token, [
      { partId: part.id, quantity: 2, unitPrice: 250 },
      {
        type: BudgetItemType.SERVICE,
        description: "Three service hours",
        quantity: 3,
        unitPrice: 100,
      },
    ]).expect(201);
    await prisma.serviceOrder.update({
      where: { id: serviceOrder.id },
      data: { status: ServiceOrderStatus.IN_MAINTENANCE },
    });

    const consumed = await request(app)
      .post(`/service-orders/${serviceOrder.id}/parts/${part.id}/consume`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ quantity: 2 })
      .expect(201);

    await request(app)
      .post(`/service-orders/${serviceOrder.id}/parts/${part.id}/consume`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ quantity: 1 })
      .expect(409);

    await request(app)
      .post(`/stock-movements/${consumed.body.movement.id}/reverse`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ quantity: 1, reason: "Part not required" })
      .expect(201);

    await request(app)
      .post(`/service-orders/${serviceOrder.id}/parts/${part.id}/consume`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ quantity: 1 })
      .expect(201);

    const movements = await prisma.stockMovement.findMany({
      where: { serviceOrderId: serviceOrder.id },
    });
    const exited = movements
      .filter((movement) => movement.type === StockMovementType.EXIT)
      .reduce((total, movement) => total + movement.quantity, 0);
    const reversed = movements
      .filter((movement) => movement.type === StockMovementType.REVERSAL)
      .reduce((total, movement) => total + movement.quantity, 0);

    expect(exited - reversed).toBe(2);
    expect(movements.every((movement) => movement.partId === part.id)).toBe(
      true
    );
  });

  it("aggregates duplicate PART lines without treating SERVICE quantity as stock", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { serviceOrder } = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const part = await createTestPart(5);

    await createBudgetRequest(serviceOrder.id, technician.token, [
      { partId: part.id, quantity: 1, unitPrice: 250 },
      { partId: part.id, quantity: 2, unitPrice: 250 },
      {
        type: BudgetItemType.SERVICE,
        description: "Labor",
        quantity: 5,
        unitPrice: 10,
      },
    ]).expect(201);
    await prisma.serviceOrder.update({
      where: { id: serviceOrder.id },
      data: { status: ServiceOrderStatus.IN_MAINTENANCE },
    });

    await request(app)
      .post(`/service-orders/${serviceOrder.id}/parts/${part.id}/consume`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ quantity: 3 })
      .expect(201);

    await request(app)
      .post(`/service-orders/${serviceOrder.id}/parts/${part.id}/consume`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ quantity: 1 })
      .expect(409);
  });

  it("returns 409 for concurrent same-OS V2 creation and never creates duplicate V2", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { serviceOrder } = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const part = await createTestPart();

    await createBudgetRequest(serviceOrder.id, technician.token, [
      { partId: part.id, quantity: 1, unitPrice: 100 },
    ]).expect(201);
    await prisma.serviceOrder.update({
      where: { id: serviceOrder.id },
      data: { status: ServiceOrderStatus.BUDGET_REJECTED },
    });

    const originalFind =
      BudgetRepository.prototype.findLastVersionByServiceOrderId;
    let completedReads = 0;
    let releaseReads: () => void = () => undefined;
    const bothRead = new Promise<void>((resolve) => {
      releaseReads = resolve;
    });

    vi.spyOn(
      BudgetRepository.prototype,
      "findLastVersionByServiceOrderId"
    ).mockImplementation(async function (serviceOrderId) {
      const result = await originalFind.call(this, serviceOrderId);
      completedReads += 1;

      if (completedReads === 2) {
        releaseReads();
      }

      await bothRead;
      return result;
    });

    const responses = await Promise.all([
      createBudgetRequest(serviceOrder.id, technician.token, [
        { partId: part.id, quantity: 2, unitPrice: 100 },
      ]),
      createBudgetRequest(serviceOrder.id, technician.token, [
        { partId: part.id, quantity: 3, unitPrice: 100 },
      ]),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(
      responses.find((response) => response.status === 409)?.body
    ).toEqual({
      message:
        "Budget version conflict. Reload the service order and try again",
    });

    const versions = await prisma.budget.findMany({
      where: { serviceOrderId: serviceOrder.id },
      orderBy: { version: "asc" },
      select: { version: true },
    });
    expect(versions.map((budget) => budget.version)).toEqual([1, 2]);
  });

  it("returns 409 for concurrent maintenance revisions from the same V1", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { serviceOrder } = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const part = await createTestPart();

    await createBudgetRequest(serviceOrder.id, technician.token, [
      { partId: part.id, quantity: 1, unitPrice: 100 },
    ]).expect(201);
    await prisma.serviceOrder.update({
      where: { id: serviceOrder.id },
      data: { status: ServiceOrderStatus.IN_MAINTENANCE },
    });

    const originalFind =
      BudgetRepository.prototype.findLastVersionByServiceOrderId;
    let completedReads = 0;
    let releaseReads: () => void = () => undefined;
    const bothRead = new Promise<void>((resolve) => {
      releaseReads = resolve;
    });

    vi.spyOn(
      BudgetRepository.prototype,
      "findLastVersionByServiceOrderId"
    ).mockImplementation(async function (serviceOrderId) {
      const result = await originalFind.call(this, serviceOrderId);
      completedReads += 1;

      if (completedReads === 2) {
        releaseReads();
      }

      await bothRead;
      return result;
    });

    const revise = (description: string) =>
      request(app)
        .post(`/service-orders/${serviceOrder.id}/budgets/revision`)
        .set("Authorization", `Bearer ${technician.token}`)
        .send({
          items: [
            { partId: part.id, quantity: 1, unitPrice: 100 },
            {
              type: BudgetItemType.SERVICE,
              description,
              quantity: 1,
              unitPrice: 50,
            },
          ],
        });

    const responses = await Promise.all([
      revise("Concurrent revision A"),
      revise("Concurrent revision B"),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(
      await prisma.budget.count({ where: { serviceOrderId: serviceOrder.id } })
    ).toBe(2);
    expect(
      await prisma.serviceOrderHistory.count({
        where: {
          serviceOrderId: serviceOrder.id,
          newStatus:
            ServiceOrderStatus.BUDGET_CHANGED_AWAITING_APPROVAL,
        },
      })
    ).toBe(1);
  });

  it("allows concurrent revisions for different service orders", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const firstOrder = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const secondOrder = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const firstPart = await createTestPart();
    const secondPart = await createTestPart();

    await Promise.all([
      createBudgetRequest(firstOrder.serviceOrder.id, technician.token, [
        { partId: firstPart.id, quantity: 1, unitPrice: 100 },
      ]),
      createBudgetRequest(secondOrder.serviceOrder.id, technician.token, [
        { partId: secondPart.id, quantity: 1, unitPrice: 100 },
      ]),
    ]);
    await prisma.serviceOrder.updateMany({
      where: {
        id: {
          in: [firstOrder.serviceOrder.id, secondOrder.serviceOrder.id],
        },
      },
      data: { status: ServiceOrderStatus.BUDGET_REJECTED },
    });

    const responses = await Promise.all([
      createBudgetRequest(firstOrder.serviceOrder.id, technician.token, [
        { partId: firstPart.id, quantity: 2, unitPrice: 100 },
      ]),
      createBudgetRequest(secondOrder.serviceOrder.id, technician.token, [
        { partId: secondPart.id, quantity: 2, unitPrice: 100 },
      ]),
    ]);

    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(responses.map((response) => response.body.version)).toEqual([2, 2]);
  });

  it("preserves budget RBAC for ADMIN, TECHNICIAN, and RECEPTION", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const reception = await authenticateTestUser(UserRole.RECEPTION);
    const adminOrder = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const technicianOrder = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const receptionOrder = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const part = await createTestPart();
    const items = [{ partId: part.id, quantity: 1, unitPrice: 10 }];

    await createBudgetRequest(
      adminOrder.serviceOrder.id,
      admin.token,
      items
    ).expect(201);
    await createBudgetRequest(
      technicianOrder.serviceOrder.id,
      technician.token,
      items
    ).expect(201);
    await createBudgetRequest(
      receptionOrder.serviceOrder.id,
      reception.token,
      items
    ).expect(403);
  });

  it("documents mixed contracts, reads, and concurrency conflicts in OpenAPI", () => {
    const budgetSchema = openApiDocument.components.schemas.BudgetItem;
    const createOperation =
      openApiDocument.paths["/service-orders/{id}/budgets"].post;
    const revisionOperation =
      openApiDocument.paths["/service-orders/{id}/budgets/revision"].post;

    expect(budgetSchema.required).toEqual(
      expect.arrayContaining(["type", "description", "partId"])
    );
    expect(createOperation.responses["409"]).toBeDefined();
    expect(revisionOperation.responses["409"]).toBeDefined();
  });

  it("maps a budget version unique violation to a stable 409 error", async () => {
    const uniqueError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: Prisma.prismaVersion.client,
        meta: { target: ["serviceOrderId", "version"] },
      }
    );

    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(uniqueError);

    await expect(
      new BudgetRepository().create({
        serviceOrderId: "a973a9e5-0082-4c2a-84e0-ed23f7803127",
        expectedVersion: 1,
        expectedStatus: ServiceOrderStatus.BUDGET_REJECTED,
        totalValue: new Prisma.Decimal(10),
        items: [
          {
            type: BudgetItemType.SERVICE,
            partId: null,
            description: "Mapping test",
            quantity: 1,
            unitPrice: 10,
          },
        ],
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message:
        "Budget version conflict. Reload the service order and try again",
    });
  });
});
