import {
  BudgetItemType,
  ServiceOrderStatus,
  StockMovementType,
  UserRole,
} from "@prisma/client";
import { compare } from "bcryptjs";
import { decode, sign } from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app";
import { authConfig } from "../../src/config/auth";
import { openApiDocument } from "../../src/docs/openapi";
import { prisma, resetDatabase } from "../helpers/database";
import {
  authenticateTestUser,
  createApprovedMaintenanceScenario,
  createTestPart,
  createTestServiceOrder,
  createTestUser,
} from "../helpers/factories";

function withToken(method: "get" | "post" | "put" | "patch" | "delete", path: string, token: string) {
  return request(app)[method](path).set("Authorization", `Bearer ${token}`);
}

async function createAwaitingBudgetScenario() {
  const technician = await authenticateTestUser(UserRole.TECHNICIAN);
  const reception = await authenticateTestUser(UserRole.RECEPTION);
  const { serviceOrder } = await createTestServiceOrder(
    ServiceOrderStatus.IN_ANALYSIS
  );
  const part = await createTestPart(10);
  const budget = await withToken(
    "post",
    `/service-orders/${serviceOrder.id}/budgets`,
    technician.token
  )
    .send({
      items: [{ partId: part.id, quantity: 2, unitPrice: 250 }],
    })
    .expect(201);

  await prisma.serviceOrder.update({
    where: { id: serviceOrder.id },
    data: { status: ServiceOrderStatus.AWAITING_APPROVAL },
  });

  return {
    technician,
    reception,
    serviceOrder,
    part,
    budget: budget.body as { id: string; version: number },
  };
}

async function expectOneDecision(
  action: "approve" | "reject",
  expectedStatus: ServiceOrderStatus
) {
  const scenario = await createAwaitingBudgetScenario();
  const path = `/budgets/${scenario.budget.id}/${action}`;
  const responses = await Promise.all([
    withToken("post", path, scenario.reception.token).send({}),
    withToken("post", path, scenario.reception.token).send({}),
  ]);

  expect(responses.map((response) => response.status).sort()).toEqual([
    200,
    409,
  ]);
  expect(
    responses.find((response) => response.status === 409)?.body.message
  ).toBe("Budget decision conflict. Reload the service order and try again");
  expect(
    await prisma.serviceOrder.findUniqueOrThrow({
      where: { id: scenario.serviceOrder.id },
    })
  ).toMatchObject({ status: expectedStatus });
  expect(
    await prisma.serviceOrderHistory.count({
      where: {
        serviceOrderId: scenario.serviceOrder.id,
        newStatus: expectedStatus,
      },
    })
  ).toBe(1);
  expect(await prisma.stockMovement.count()).toBe(0);
}

describe("Stage 5 concurrent OS actions and session revocation", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("allows only one concurrent approval", async () => {
    await expectOneDecision("approve", ServiceOrderStatus.BUDGET_APPROVED);
  });

  it("allows only one concurrent rejection", async () => {
    await expectOneDecision("reject", ServiceOrderStatus.BUDGET_REJECTED);
  });

  it("serializes concurrent approve and reject decisions", async () => {
    const scenario = await createAwaitingBudgetScenario();
    const responses = await Promise.all([
      withToken(
        "post",
        `/budgets/${scenario.budget.id}/approve`,
        scenario.reception.token
      ).send({ observation: "Approved" }),
      withToken(
        "post",
        `/budgets/${scenario.budget.id}/reject`,
        scenario.reception.token
      ).send({ observation: "Rejected" }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200,
      409,
    ]);
    const serviceOrder = await prisma.serviceOrder.findUniqueOrThrow({
      where: { id: scenario.serviceOrder.id },
    });
    expect([
      ServiceOrderStatus.BUDGET_APPROVED,
      ServiceOrderStatus.BUDGET_REJECTED,
    ]).toContain(serviceOrder.status);
    expect(
      await prisma.serviceOrderHistory.count({
        where: { serviceOrderId: scenario.serviceOrder.id },
      })
    ).toBe(1);
    expect(await prisma.stockMovement.count()).toBe(0);
  });

  it("returns 409 when a stale tab decides an already decided budget", async () => {
    const scenario = await createAwaitingBudgetScenario();

    await withToken(
      "post",
      `/budgets/${scenario.budget.id}/approve`,
      scenario.reception.token
    )
      .send({})
      .expect(200);
    const staleDecision = await withToken(
      "post",
      `/budgets/${scenario.budget.id}/reject`,
      scenario.reception.token
    )
      .send({})
      .expect(409);

    expect(staleDecision.body.message).toBe(
      "Budget decision conflict. Reload the service order and try again"
    );
    expect(
      await prisma.serviceOrderHistory.count({
        where: { serviceOrderId: scenario.serviceOrder.id },
      })
    ).toBe(1);
  });

  it("rejects approval when a revision changes the locked baseline", async () => {
    const scenario = await createAwaitingBudgetScenario();
    let approvalRequest: Promise<request.Response> | undefined;

    await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id"
        FROM "ServiceOrder"
        WHERE "id" = ${scenario.serviceOrder.id}
        FOR UPDATE
      `;

      approvalRequest = Promise.resolve(
        withToken(
          "post",
          `/budgets/${scenario.budget.id}/approve`,
          scenario.reception.token
        ).send({})
      );

      await new Promise((resolve) => setTimeout(resolve, 120));
      await transaction.serviceOrder.update({
        where: { id: scenario.serviceOrder.id },
        data: { status: ServiceOrderStatus.IN_MAINTENANCE },
      });
    });

    const revisionRequest = withToken(
      "post",
      `/service-orders/${scenario.serviceOrder.id}/budgets/revision`,
      scenario.technician.token
    ).send({
      items: [
        { partId: scenario.part.id, quantity: 2, unitPrice: 275 },
        {
          type: BudgetItemType.SERVICE,
          description: "Additional diagnostics",
          quantity: 1,
          unitPrice: 80,
        },
      ],
    });
    const [approval, revision] = await Promise.all([
      approvalRequest!,
      revisionRequest,
    ]);

    expect(approval.status).toBe(409);
    expect(revision.status).toBe(201);
    expect(revision.body.version).toBe(2);
    expect(
      await prisma.serviceOrder.findUniqueOrThrow({
        where: { id: scenario.serviceOrder.id },
      })
    ).toMatchObject({
      status: ServiceOrderStatus.BUDGET_CHANGED_AWAITING_APPROVAL,
    });
  });

  it("creates one history for duplicate status transitions", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { serviceOrder } = await createTestServiceOrder();
    const path = `/service-orders/${serviceOrder.id}/status`;
    const responses = await Promise.all([
      withToken("patch", path, technician.token).send({ status: "IN_ANALYSIS" }),
      withToken("patch", path, technician.token).send({ status: "IN_ANALYSIS" }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200,
      409,
    ]);
    expect(
      await prisma.serviceOrderHistory.count({
        where: { serviceOrderId: serviceOrder.id },
      })
    ).toBe(1);
  });

  it("rejects a diagnosis validated against a concurrently changed status", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { serviceOrder } = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    let diagnosisRequest: Promise<request.Response> | undefined;

    await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id"
        FROM "ServiceOrder"
        WHERE "id" = ${serviceOrder.id}
        FOR UPDATE
      `;
      diagnosisRequest = Promise.resolve(
        withToken(
          "patch",
          `/service-orders/${serviceOrder.id}/diagnosis`,
          technician.token
        ).send({ diagnosis: "Stale diagnosis" })
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      await transaction.serviceOrder.update({
        where: { id: serviceOrder.id },
        data: { status: ServiceOrderStatus.AWAITING_APPROVAL },
      });
    });

    const response = await diagnosisRequest!;
    expect(response.status).toBe(409);
    expect(
      await prisma.serviceOrder.findUniqueOrThrow({
        where: { id: serviceOrder.id },
      })
    ).toMatchObject({ diagnosis: null });
  });

  it("allows only one incompatible transition or cancellation", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const { serviceOrder } = await createTestServiceOrder();
    const path = `/service-orders/${serviceOrder.id}/status`;
    const responses = await Promise.all([
      withToken("patch", path, admin.token).send({ status: "IN_ANALYSIS" }),
      withToken("patch", path, admin.token).send({ status: "CANCELLED" }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200,
      409,
    ]);
    const serviceOrderAfter = await prisma.serviceOrder.findUniqueOrThrow({
      where: { id: serviceOrder.id },
    });
    expect([
      ServiceOrderStatus.IN_ANALYSIS,
      ServiceOrderStatus.CANCELLED,
    ]).toContain(serviceOrderAfter.status);
    expect(
      await prisma.serviceOrderHistory.count({
        where: { serviceOrderId: serviceOrder.id },
      })
    ).toBe(1);
  });

  it("serializes status completion against stock consumption", async () => {
    const scenario = await createApprovedMaintenanceScenario({
      budgetQuantity: 1,
      stock: 1,
    });
    const responses = await Promise.all([
      withToken(
        "patch",
        `/service-orders/${scenario.serviceOrder.id}/status`,
        scenario.token
      ).send({ status: "FINISHED" }),
      withToken(
        "post",
        `/service-orders/${scenario.serviceOrder.id}/parts/${scenario.part.id}/consume`,
        scenario.token
      ).send({ quantity: 1 }),
    ]);

    expect(responses.some((response) => response.status === 200)).toBe(true);
    expect(
      responses.every((response) => [200, 201, 409].includes(response.status))
    ).toBe(true);
    expect(
      await prisma.stockMovement.count({
        where: {
          serviceOrderId: scenario.serviceOrder.id,
          type: StockMovementType.EXIT,
        },
      })
    ).toBeLessThanOrEqual(1);
    expect(
      await prisma.part.findUniqueOrThrow({ where: { id: scenario.part.id } })
    ).toMatchObject({ stock: expect.any(Number) });
    expect(
      (await prisma.part.findUniqueOrThrow({ where: { id: scenario.part.id } }))
        .stock
    ).toBeGreaterThanOrEqual(0);
  });

  it("prevents duplicate stock effects from concurrent consumption", async () => {
    const scenario = await createApprovedMaintenanceScenario({
      budgetQuantity: 1,
      stock: 2,
    });
    const path = `/service-orders/${scenario.serviceOrder.id}/parts/${scenario.part.id}/consume`;
    const responses = await Promise.all([
      withToken("post", path, scenario.token).send({ quantity: 1 }),
      withToken("post", path, scenario.token).send({ quantity: 1 }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201,
      409,
    ]);
    expect(
      await prisma.stockMovement.count({
        where: {
          serviceOrderId: scenario.serviceOrder.id,
          type: StockMovementType.EXIT,
        },
      })
    ).toBe(1);
  });

  it("serializes budget revision against newly consumed stock", async () => {
    const scenario = await createApprovedMaintenanceScenario({
      budgetQuantity: 1,
      stock: 1,
    });
    const responses = await Promise.all([
      withToken(
        "post",
        `/service-orders/${scenario.serviceOrder.id}/parts/${scenario.part.id}/consume`,
        scenario.token
      ).send({ quantity: 1 }),
      withToken(
        "post",
        `/service-orders/${scenario.serviceOrder.id}/budgets/revision`,
        scenario.token
      ).send({
        items: [
          {
            type: BudgetItemType.SERVICE,
            description: "Service-only revision",
            quantity: 1,
            unitPrice: 100,
          },
        ],
      }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201,
      409,
    ]);
    const stock = (
      await prisma.part.findUniqueOrThrow({ where: { id: scenario.part.id } })
    ).stock;
    expect([0, 1]).toContain(stock);
    expect(
      await prisma.stockMovement.count({
        where: {
          serviceOrderId: scenario.serviceOrder.id,
          type: StockMovementType.EXIT,
        },
      })
    ).toBe(stock === 0 ? 1 : 0);
  });

  it("does not deadlock concurrent revisions with reversed Part order", async () => {
    const scenario = await createApprovedMaintenanceScenario({
      budgetQuantity: 2,
      stock: 5,
    });
    const otherPart = await createTestPart(5);
    const path = `/service-orders/${scenario.serviceOrder.id}/budgets/revision`;
    const itemsA = [
      { partId: scenario.part.id, quantity: 2, unitPrice: 250 },
      { partId: otherPart.id, quantity: 1, unitPrice: 100 },
    ];
    const itemsB = [...itemsA].reverse();
    const operation = Promise.all([
      withToken("post", path, scenario.token).send({ items: itemsA }),
      withToken("post", path, scenario.token).send({ items: itemsB }),
    ]);
    const responses = await Promise.race([
      operation,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Concurrent revisions timed out")), 5000)
      ),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201,
      409,
    ]);
  });

  it("keeps operations on different service orders independent", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const first = await createTestServiceOrder();
    const second = await createTestServiceOrder();
    const responses = await Promise.all([
      withToken(
        "patch",
        `/service-orders/${first.serviceOrder.id}/status`,
        technician.token
      ).send({ status: "IN_ANALYSIS" }),
      withToken(
        "patch",
        `/service-orders/${second.serviceOrder.id}/status`,
        technician.token
      ).send({ status: "IN_ANALYSIS" }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
  });

  it("issues versioned JWTs and rejects tokens without the version claim", async () => {
    const authenticated = await authenticateTestUser(UserRole.ADMIN);
    const payload = decode(authenticated.token) as { tokenVersion?: number };
    expect(payload.tokenVersion).toBe(0);
    expect(authenticated.user.tokenVersion).toBe(0);

    const legacyToken = sign(
      { role: authenticated.user.role },
      authConfig.jwt.secret,
      { subject: authenticated.user.id, expiresIn: "1h" }
    );
    const response = await withToken("get", "/me", legacyToken).expect(401);
    expect(response.body.message).toBe("Session revoked");
  });

  it("revokes every previous session after an own password change", async () => {
    const user = await createTestUser(UserRole.TECHNICIAN);
    const login = () =>
      request(app).post("/sessions").send({
        login: user.login,
        password: "senha123",
      });
    const [sessionA, sessionB] = await Promise.all([login(), login()]);

    await withToken("put", "/me/password", sessionA.body.token)
      .send({ currentPassword: "senha123", newPassword: "nova123" })
      .expect(200);

    await withToken("get", "/me", sessionA.body.token).expect(401);
    await withToken("get", "/me", sessionB.body.token).expect(401);
    await request(app)
      .post("/sessions")
      .send({ login: user.login, password: "senha123" })
      .expect(401);
    const newSession = await request(app)
      .post("/sessions")
      .send({ login: user.login, password: "nova123" })
      .expect(200);
    await withToken("get", "/me", newSession.body.token).expect(200);
    expect(
      await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    ).toMatchObject({ tokenVersion: 1 });
  });

  it("revokes sessions after admin password reset and role change only", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const target = await authenticateTestUser(UserRole.TECHNICIAN);

    await withToken("put", `/users/${target.user.id}`, admin.token)
      .send({ name: "Renamed User" })
      .expect(200);
    await withToken("get", "/me", target.token).expect(200);

    await withToken("put", `/users/${target.user.id}`, admin.token)
      .send({ role: "RECEPTION" })
      .expect(200);
    await withToken("get", "/me", target.token).expect(401);

    const roleSession = await request(app)
      .post("/sessions")
      .send({ login: target.user.login, password: "senha123" })
      .expect(200);
    expect(roleSession.body.user.role).toBe("RECEPTION");

    await withToken("put", `/users/${target.user.id}`, admin.token)
      .send({ password: "reset123" })
      .expect(200);
    await withToken("get", "/me", roleSession.body.token).expect(401);
    await request(app)
      .post("/sessions")
      .send({ login: target.user.login, password: "senha123" })
      .expect(401);
    await request(app)
      .post("/sessions")
      .send({ login: target.user.login, password: "reset123" })
      .expect(200);
  });

  it("keeps deactivated and reactivated users from reusing old tokens", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const target = await authenticateTestUser(UserRole.TECHNICIAN);

    await withToken("delete", `/users/${target.user.id}`, admin.token).expect(200);
    await withToken("get", "/me", target.token).expect(401);
    await prisma.user.update({
      where: { id: target.user.id },
      data: { active: true },
    });
    await withToken("get", "/me", target.token).expect(401);
    await request(app)
      .post("/sessions")
      .send({ login: target.user.login, password: "senha123" })
      .expect(200);
  });

  it("isolates revocation to the changed user", async () => {
    const first = await authenticateTestUser(UserRole.TECHNICIAN);
    const second = await authenticateTestUser(UserRole.RECEPTION);

    await withToken("put", "/me/password", first.token)
      .send({ currentPassword: "senha123", newPassword: "nova123" })
      .expect(200);
    await withToken("get", "/me", first.token).expect(401);
    await withToken("get", "/me", second.token).expect(200);
  });

  it("increments tokenVersion without lost updates during concurrent resets", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const target = await authenticateTestUser(UserRole.TECHNICIAN);
    const responses = await Promise.all([
      withToken("put", `/users/${target.user.id}`, admin.token).send({
        password: "primeira123",
      }),
      withToken("put", `/users/${target.user.id}`, admin.token).send({
        password: "segunda123",
      }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const storedUser = await prisma.user.findUniqueOrThrow({
      where: { id: target.user.id },
    });
    expect(storedUser.tokenVersion).toBe(2);
    expect(
      (await compare("primeira123", storedUser.password)) ||
        (await compare("segunda123", storedUser.password))
    ).toBe(true);
    await withToken("get", "/me", target.token).expect(401);
  });

  it("keeps setup profile changes valid and tokenVersion private", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);

    const updated = await withToken("patch", "/setup/admin", admin.token)
      .send({ name: "Admin Setup", login: admin.user.login })
      .expect(200);
    expect(updated.body.tokenVersion).toBeUndefined();
    await withToken("get", "/me", admin.token).expect(200);
    expect(
      await prisma.user.findUniqueOrThrow({ where: { id: admin.user.id } })
    ).toMatchObject({ tokenVersion: 0 });
  });

  it("documents conflict and revoked-session contracts without exposing tokenVersion", () => {
    const paths = openApiDocument.paths;

    expect(paths["/service-orders/{id}/status"].patch.responses["409"])
      .toBeDefined();
    expect(paths["/budgets/{id}/approve"].post.responses["409"])
      .toBeDefined();
    expect(paths["/budgets/{id}/reject"].post.responses["409"])
      .toBeDefined();
    expect(paths["/me/password"].put.description).toContain(
      "revokes every existing session"
    );
    expect(JSON.stringify(openApiDocument)).not.toContain("tokenVersion");
  });
});
