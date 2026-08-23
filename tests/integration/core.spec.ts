import { ServiceOrderStatus, UserRole } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app";
import { prisma, resetDatabase } from "../helpers/database";
import {
  authenticateTestUser,
  createApprovedMaintenanceScenario,
  createTestCustomer,
  createTestEquipment,
  createTestPart,
  createTestServiceOrder,
  createTestUser,
} from "../helpers/factories";

describe("TechDesk Pro integration rules", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("exposes public maintenance routes and returns json 404", async () => {
    await request(app).get("/health").expect(200, { status: "ok" });
    await request(app).get("/ready").expect(200, { status: "ready" });

    const docsResponse = await request(app).get("/docs/").expect(200);

    expect(docsResponse.text).toContain("Swagger UI");

    await request(app)
      .get("/route-that-does-not-exist")
      .expect(404, { message: "Route not found" });

    await request(app).get("/customers").expect(401);
  });

  it("authenticates users and protects private routes", async () => {
    const user = await createTestUser(UserRole.ADMIN);
    const inactiveUser = await createTestUser(UserRole.ADMIN);

    await prisma.user.update({
      where: { id: inactiveUser.id },
      data: { active: false },
    });

    const loginResponse = await request(app).post("/sessions").send({
      login: user.login,
      password: "senha123",
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeTruthy();
    expect(loginResponse.body.user.password).toBeUndefined();

    await request(app)
      .post("/sessions")
      .send({ login: user.login, password: "wrong" })
      .expect(401);

    await request(app)
      .post("/sessions")
      .send({ login: "missing", password: "senha123" })
      .expect(401);

    await request(app)
      .post("/sessions")
      .send({ login: inactiveUser.login, password: "senha123" })
      .expect(401);

    await request(app).get("/users").expect(401);

    await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.setupCompleted).toBe(false);
      });
  });

  it("runs first-run setup securely and locks it after completion", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const reception = await authenticateTestUser(UserRole.RECEPTION);
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);

    const initialProfile = await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    expect(initialProfile.body.setupCompleted).toBe(false);

    await request(app).get("/setup/status").expect(401);

    await request(app)
      .get("/setup/status")
      .set("Authorization", `Bearer ${reception.token}`)
      .expect(403);

    await request(app)
      .get("/setup/status")
      .set("Authorization", `Bearer ${technician.token}`)
      .expect(403);

    const status = await request(app)
      .get("/setup/status")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    expect(status.body.setupCompleted).toBe(false);

    const company = await request(app)
      .patch("/setup/company")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Assistencia Onboarding",
        phone: "85999990000",
        email: "setup@techdesk.test",
      })
      .expect(200);

    expect(company.body.name).toBe("Assistencia Onboarding");

    const updatedAdmin = await request(app)
      .patch("/setup/admin")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Admin Setup",
        login: admin.user.login,
      })
      .expect(200);

    expect(updatedAdmin.body.name).toBe("Admin Setup");

    const setupReception = await request(app)
      .post("/setup/users")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Recepcao Setup",
        login: "recepcao-setup",
        password: "senha123",
        role: "RECEPTION",
      })
      .expect(201);

    expect(setupReception.body.role).toBe("RECEPTION");
    expect(setupReception.body.password).toBeUndefined();

    await request(app)
      .post("/setup/users")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Recepcao Duplicada",
        login: "recepcao-setup",
        password: "senha123",
        role: "RECEPTION",
      })
      .expect(409);

    const setupTechnician = await request(app)
      .post("/setup/users")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Tecnico Setup",
        login: "tecnico-setup",
        password: "senha123",
        role: "TECHNICIAN",
      })
      .expect(201);

    expect(setupTechnician.body.role).toBe("TECHNICIAN");

    await request(app)
      .post("/setup/users")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Admin Extra",
        login: "admin-extra",
        password: "senha123",
        role: "ADMIN",
      })
      .expect(400);

    await request(app)
      .post("/setup/complete")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ backupAcknowledged: false })
      .expect(400);

    const completed = await request(app)
      .post("/setup/complete")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ backupAcknowledged: true })
      .expect(200);

    expect(completed.body.setupCompleted).toBe(true);
    expect(completed.body.setupCompletedAt).toBeTruthy();

    await request(app)
      .post("/setup/complete")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ backupAcknowledged: true })
      .expect(200);

    const completedProfile = await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    expect(completedProfile.body.setupCompleted).toBe(true);

    await request(app)
      .patch("/setup/company")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Blocked" })
      .expect(409);

    await request(app)
      .patch("/setup/admin")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Blocked Admin",
        login: admin.user.login,
      })
      .expect(409);

    await request(app)
      .post("/setup/users")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Blocked User",
        login: "blocked-user",
        password: "senha123",
        role: "TECHNICIAN",
      })
      .expect(409);
  });

  it("keeps setup completion idempotent under duplicate requests", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);

    await request(app)
      .patch("/setup/company")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Assistencia Concorrente",
      })
      .expect(200);

    const responses = await Promise.all([
      request(app)
        .post("/setup/complete")
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ backupAcknowledged: true }),
      request(app)
        .post("/setup/complete")
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ backupAcknowledged: true }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200,
      200,
    ]);

    const settings = await prisma.companySettings.findMany();
    expect(settings).toHaveLength(1);
    expect(settings[0].setupCompleted).toBe(true);
    expect(settings[0].setupCompletedAt).toBeTruthy();
  });

  it("classifies existing operational databases as setup completed without forcing onboarding", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const customer = await createTestCustomer();
    const equipment = await createTestEquipment(customer.id);

    await prisma.serviceOrder.create({
      data: {
        customerId: customer.id,
        equipmentId: equipment.id,
        reportedIssue: "Legacy service order",
        status: ServiceOrderStatus.RECEIVED,
      },
    });

    const status = await request(app)
      .get("/setup/status")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    expect(status.body.setupCompleted).toBe(true);

    const settings = await prisma.companySettings.findFirstOrThrow();
    expect(settings.setupCompleted).toBe(true);
    expect(settings.setupCompletedAt).toBeTruthy();
  });

  it("validates and normalizes optional customer CPF/CNPJ documents", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);

    const cpf = await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Cliente CPF Ficticio",
        phone: "82999990001",
        document: "529.982.247-25",
      })
      .expect(201);

    expect(cpf.body.document).toBe("52998224725");

    const cnpj = await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Empresa CNPJ Ficticia",
        phone: "82999990002",
        document: "11.222.333/0001-81",
      })
      .expect(201);

    expect(cnpj.body.document).toBe("11222333000181");

    const alphanumericCnpj = await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Empresa CNPJ Alfanumerico Ficticia",
        phone: "82999990009",
        document: "12.abc.345/01de-35",
      })
      .expect(201);

    expect(alphanumericCnpj.body.document).toBe("12ABC34501DE35");

    await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Cliente sem Documento",
        phone: "82999990003",
      })
      .expect(201);

    await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Cliente Documento Null",
        phone: "82999990004",
        document: null,
      })
      .expect(201);

    const emptyDocument = await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Cliente Documento Vazio",
        phone: "82999990005",
        document: "   ",
      })
      .expect(201);

    expect(emptyDocument.body.document).toBeNull();

    await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "CPF Invalido",
        phone: "82999990006",
        document: "123.456.789-00",
      })
      .expect(400);

    await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "CPF Repetido Invalido",
        phone: "82999990007",
        document: "111.111.111-11",
      })
      .expect(400);

    await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "CNPJ Invalido",
        phone: "82999990008",
        document: "11.222.333/0001-80",
      })
      .expect(400);

    await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "CNPJ Alfanumerico DV Invalido",
        phone: "82999990010",
        document: "12.ABC.345/01DE-36",
      })
      .expect(400);

    await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "CNPJ Alfanumerico Curto",
        phone: "82999990011",
        document: "12.ABC.345/01DE-3",
      })
      .expect(400);

    await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "CNPJ Alfanumerico Caractere Invalido",
        phone: "82999990012",
        document: "12.ABC.345/01D@-35",
      })
      .expect(400);
  });

  it("enforces unique normalized customer documents on create and update", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);

    const first = await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Cliente Documento Um",
        phone: "82999990101",
        document: "529.982.247-25",
      })
      .expect(201);

    const second = await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Cliente Documento Dois",
        phone: "82999990102",
        document: "11222333000181",
      })
      .expect(201);

    await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Cliente CPF Duplicado",
        phone: "82999990103",
        document: "52998224725",
      })
      .expect(409);

    await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Cliente CNPJ Duplicado",
        phone: "82999990104",
        document: "11.222.333/0001-81",
      })
      .expect(409);

    const alphanumeric = await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Cliente CNPJ Alfanumerico",
        phone: "82999990105",
        document: "12.abc.345/01de-35",
      })
      .expect(201);

    expect(alphanumeric.body.document).toBe("12ABC34501DE35");

    await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Cliente CNPJ Alfanumerico Duplicado",
        phone: "82999990106",
        document: "12ABC34501DE35",
      })
      .expect(409);

    await request(app)
      .put(`/customers/${first.body.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Cliente Documento Um",
        phone: "82999990101",
        document: "529.982.247-25",
      })
      .expect(200);

    await request(app)
      .put(`/customers/${first.body.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Cliente Documento Um",
        phone: "82999990101",
        document: second.body.document,
      })
      .expect(409);

    await request(app)
      .put(`/customers/${first.body.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Cliente Documento Um",
        phone: "82999990101",
        document: alphanumeric.body.document,
      })
      .expect(409);

    await request(app)
      .put(`/customers/${first.body.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Cliente Documento Um",
        phone: "82999990101",
        document: "",
      })
      .expect(200);

    const updated = await prisma.customer.findUniqueOrThrow({
      where: {
        id: first.body.id,
      },
    });

    expect(updated.document).toBeNull();
  });

  it("searches customers by normalized and formatted document without breaking existing search", async () => {
    const reception = await authenticateTestUser(UserRole.RECEPTION);

    await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${reception.token}`)
      .send({
        name: "Cliente Busca Documento",
        phone: "82999990201",
        email: "busca-documento@test.com",
        document: "529.982.247-25",
      })
      .expect(201);

    await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${reception.token}`)
      .send({
        name: "Cliente Busca Alfanumerico",
        phone: "82999990202",
        email: "busca-alfanumerico@test.com",
        document: "12.ABC.345/01DE-35",
      })
      .expect(201);

    const byFormattedDocument = await request(app)
      .get("/customers")
      .query({ search: "529.982.247-25" })
      .set("Authorization", `Bearer ${reception.token}`)
      .expect(200);

    expect(byFormattedDocument.body.data).toHaveLength(1);
    expect(byFormattedDocument.body.data[0].document).toBe("52998224725");

    const byNormalizedDocument = await request(app)
      .get("/customers")
      .query({ search: "52998224725" })
      .set("Authorization", `Bearer ${reception.token}`)
      .expect(200);

    expect(byNormalizedDocument.body.data).toHaveLength(1);

    const byEmail = await request(app)
      .get("/customers")
      .query({ search: "busca-documento@test.com" })
      .set("Authorization", `Bearer ${reception.token}`)
      .expect(200);

    expect(byEmail.body.data).toHaveLength(1);

    const byAlphanumericDocument = await request(app)
      .get("/customers")
      .query({ search: "12.abc.345/01de-35" })
      .set("Authorization", `Bearer ${reception.token}`)
      .expect(200);

    expect(byAlphanumericDocument.body.data).toHaveLength(1);
    expect(byAlphanumericDocument.body.data[0].document).toBe(
      "12ABC34501DE35"
    );
  });

  it("minimizes customer document by role and never exposes it in public tracking", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const reception = await authenticateTestUser(UserRole.RECEPTION);
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);

    const customer = await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Cliente Privacidade",
        phone: "82999990301",
        document: "529.982.247-25",
      })
      .expect(201);

    const adminView = await request(app)
      .get(`/customers/${customer.body.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    expect(adminView.body.document).toBe("52998224725");

    const receptionView = await request(app)
      .get(`/customers/${customer.body.id}`)
      .set("Authorization", `Bearer ${reception.token}`)
      .expect(200);

    expect(receptionView.body.document).toBe("52998224725");

    const technicianView = await request(app)
      .get(`/customers/${customer.body.id}`)
      .set("Authorization", `Bearer ${technician.token}`)
      .expect(200);

    expect(technicianView.body.document).toBeUndefined();

    const { equipment } = await createTestServiceOrder(
      ServiceOrderStatus.RECEIVED
    );
    const serviceOrder = await prisma.serviceOrder.create({
      data: {
        customerId: customer.body.id,
        equipmentId: equipment.id,
        reportedIssue: "Teste de privacidade",
        status: ServiceOrderStatus.RECEIVED,
      },
    });

    const serviceOrderForTechnician = await request(app)
      .get(`/service-orders/${serviceOrder.id}`)
      .set("Authorization", `Bearer ${technician.token}`)
      .expect(200);

    expect(serviceOrderForTechnician.body.customer.document).toBeUndefined();

    const publicResponse = await request(app)
      .get(`/public/service-orders/${serviceOrder.publicToken}`)
      .expect(200);

    expect(JSON.stringify(publicResponse.body)).not.toContain("52998224725");
    expect(publicResponse.body.customer).toBeUndefined();
  });

  it("enforces core RBAC rules", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const reception = await authenticateTestUser(UserRole.RECEPTION);
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);

    await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ invalid: true })
      .expect(403);

    const { serviceOrder } = await createTestServiceOrder();

    await request(app)
      .patch(`/service-orders/${serviceOrder.id}/diagnosis`)
      .set("Authorization", `Bearer ${reception.token}`)
      .send({ diagnosis: "blocked" })
      .expect(403);

    await request(app)
      .patch(`/service-orders/${serviceOrder.id}/status`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ status: "IN_ANALYSIS" })
      .expect(200);

    const part = await createTestPart(5);
    const budget = await request(app)
      .post(`/service-orders/${serviceOrder.id}/budgets`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({
        items: [{ partId: part.id, quantity: 1, unitPrice: 250 }],
      })
      .expect(201);

    await request(app)
      .patch(`/service-orders/${serviceOrder.id}/status`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ status: "AWAITING_APPROVAL" })
      .expect(200);

    await request(app)
      .post(`/budgets/${budget.body.id}/approve`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({})
      .expect(403);

    await request(app)
      .post(`/budgets/${budget.body.id}/approve`)
      .set("Authorization", `Bearer ${reception.token}`)
      .send({})
      .expect(200);

    await request(app)
      .post("/parts")
      .set("Authorization", `Bearer ${reception.token}`)
      .send({ name: "Part", brand: "Brand", currentPrice: 10 })
      .expect(403);

    await request(app)
      .post("/parts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Part", brand: "Brand", currentPrice: 10 })
      .expect(201);
  });

  it("enforces service order transitions and transition roles", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const reception = await authenticateTestUser(UserRole.RECEPTION);
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { serviceOrder } = await createTestServiceOrder();

    await request(app)
      .patch(`/service-orders/${serviceOrder.id}/status`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ status: "IN_ANALYSIS" })
      .expect(200);

    const invalidJump = await createTestServiceOrder();

    await request(app)
      .patch(`/service-orders/${invalidJump.serviceOrder.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "FINISHED" })
      .expect(400);

    const maintenance = await createTestServiceOrder(
      ServiceOrderStatus.IN_MAINTENANCE
    );

    await request(app)
      .patch(`/service-orders/${maintenance.serviceOrder.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "DELIVERED" })
      .expect(400);

    const delivered = await createTestServiceOrder(
      ServiceOrderStatus.DELIVERED
    );

    await request(app)
      .patch(`/service-orders/${delivered.serviceOrder.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "IN_ANALYSIS" })
      .expect(400);

    const receptionBlocked = await createTestServiceOrder();

    await request(app)
      .patch(`/service-orders/${receptionBlocked.serviceOrder.id}/status`)
      .set("Authorization", `Bearer ${reception.token}`)
      .send({ status: "IN_ANALYSIS" })
      .expect(403);

    const awaitingPickup = await createTestServiceOrder(
      ServiceOrderStatus.AWAITING_PICKUP
    );

    await request(app)
      .patch(`/service-orders/${awaitingPickup.serviceOrder.id}/status`)
      .set("Authorization", `Bearer ${reception.token}`)
      .send({ status: "DELIVERED" })
      .expect(200);
  });

  it("versions budgets and protects old versions", async () => {
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const { serviceOrder } = await createTestServiceOrder(
      ServiceOrderStatus.IN_ANALYSIS
    );
    const part = await createTestPart();

    const v1 = await request(app)
      .post(`/service-orders/${serviceOrder.id}/budgets`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({
        items: [{ partId: part.id, quantity: 1, unitPrice: 250 }],
      })
      .expect(201);

    const v2 = await request(app)
      .post(`/service-orders/${serviceOrder.id}/budgets`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({
        items: [{ partId: part.id, quantity: 2, unitPrice: 250 }],
      })
      .expect(201);

    expect(v1.body.version).toBe(1);
    expect(v2.body.version).toBe(2);

    const v1FromDb = await prisma.budget.findUnique({
      where: { id: v1.body.id },
      include: { budgetItems: true },
    });

    expect(v1FromDb?.budgetItems[0].quantity).toBe(1);

    await prisma.serviceOrder.update({
      where: { id: serviceOrder.id },
      data: { status: ServiceOrderStatus.AWAITING_APPROVAL },
    });

    await request(app)
      .post(`/budgets/${v1.body.id}/approve`)
      .set("Authorization", `Bearer ${(await authenticateTestUser(UserRole.RECEPTION)).token}`)
      .send({})
      .expect(409);
  });

  it("creates budget revision atomically and protects consumed parts", async () => {
    const scenario = await createApprovedMaintenanceScenario();
    const keyboard = await createTestPart(5);

    await request(app)
      .post(
        `/service-orders/${scenario.serviceOrder.id}/parts/${scenario.part.id}/consume`
      )
      .set("Authorization", `Bearer ${scenario.token}`)
      .send({ quantity: 1 })
      .expect(201);

    await request(app)
      .post(`/service-orders/${scenario.serviceOrder.id}/budgets/revision`)
      .set("Authorization", `Bearer ${scenario.token}`)
      .send({
        items: [{ partId: keyboard.id, quantity: 1, unitPrice: 180 }],
      })
      .expect(409);

    const revision = await request(app)
      .post(`/service-orders/${scenario.serviceOrder.id}/budgets/revision`)
      .set("Authorization", `Bearer ${scenario.token}`)
      .send({
        items: [
          { partId: scenario.part.id, quantity: 1, unitPrice: 250 },
          { partId: keyboard.id, quantity: 1, unitPrice: 180 },
        ],
        observation: "Keyboard issue found",
      })
      .expect(201);

    const serviceOrder = await prisma.serviceOrder.findUnique({
      where: { id: scenario.serviceOrder.id },
      include: { serviceOrderHistories: true },
    });

    expect(revision.body.version).toBe(2);
    expect(serviceOrder?.status).toBe(
      ServiceOrderStatus.BUDGET_CHANGED_AWAITING_APPROVAL
    );
    expect(serviceOrder?.serviceOrderHistories.length).toBeGreaterThan(0);
  });

  it("updates stock with movements and prevents invalid exits", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const part = await createTestPart();

    await request(app)
      .post(`/parts/${part.id}/stock/entry`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ quantity: 10 })
      .expect(201);

    await request(app)
      .post(`/parts/${part.id}/stock/exit`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ quantity: 3 })
      .expect(201);

    await request(app)
      .post(`/parts/${part.id}/stock/exit`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ quantity: 8 })
      .expect(409);

    const updatedPart = await prisma.part.findUnique({
      where: { id: part.id },
    });
    const movementCount = await prisma.stockMovement.count({
      where: { partId: part.id },
    });

    expect(updatedPart?.stock).toBe(7);
    expect(movementCount).toBe(2);
  });

  it("does not allow consuming more parts than approved", async () => {
    const scenario = await createApprovedMaintenanceScenario();

    await request(app)
      .post(
        `/service-orders/${scenario.serviceOrder.id}/parts/${scenario.part.id}/consume`
      )
      .set("Authorization", `Bearer ${scenario.token}`)
      .send({ quantity: 1 })
      .expect(201);

    await request(app)
      .post(
        `/service-orders/${scenario.serviceOrder.id}/parts/${scenario.part.id}/consume`
      )
      .set("Authorization", `Bearer ${scenario.token}`)
      .send({ quantity: 1 })
      .expect(201);

    await request(app)
      .post(
        `/service-orders/${scenario.serviceOrder.id}/parts/${scenario.part.id}/consume`
      )
      .set("Authorization", `Bearer ${scenario.token}`)
      .send({ quantity: 1 })
      .expect(409);

    const budgetItem = await prisma.budgetItem.findFirst({
      where: { budgetId: scenario.budget.id },
    });

    expect(budgetItem?.quantity).toBe(2);
  });

  it("protects the last active admin", async () => {
    const adminA = await authenticateTestUser(UserRole.ADMIN);

    await request(app)
      .put(`/users/${adminA.user.id}`)
      .set("Authorization", `Bearer ${adminA.token}`)
      .send({ role: "TECHNICIAN" })
      .expect(409);

    await request(app)
      .delete(`/users/${adminA.user.id}`)
      .set("Authorization", `Bearer ${adminA.token}`)
      .expect(400);

    const adminB = await authenticateTestUser(UserRole.ADMIN);

    await request(app)
      .put(`/users/${adminB.user.id}`)
      .set("Authorization", `Bearer ${adminA.token}`)
      .send({ role: "TECHNICIAN" })
      .expect(200);
  });

  it("manages company settings with RBAC", async () => {
    const admin = await authenticateTestUser(UserRole.ADMIN);
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);

    const emptySettings = await request(app)
      .get("/settings/company")
      .set("Authorization", `Bearer ${technician.token}`)
      .expect(200);

    expect(emptySettings.body.name).toBe("");

    await request(app)
      .put("/settings/company")
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ name: "Blocked" })
      .expect(403);

    const settings = await request(app)
      .put("/settings/company")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Assistencia Piloto",
        phone: "85999990000",
        email: "contato@piloto.com",
      })
      .expect(200);

    expect(settings.body.name).toBe("Assistencia Piloto");

    const settingsCount = await prisma.companySettings.count();
    expect(settingsCount).toBe(1);
  });

  it("allows users to change their own password with current password validation", async () => {
    const user = await authenticateTestUser(UserRole.TECHNICIAN);

    await request(app)
      .put("/me/password")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        currentPassword: "wrong",
        newPassword: "nova123",
      })
      .expect(400);

    await request(app)
      .put("/me/password")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        currentPassword: "senha123",
        newPassword: "senha123",
      })
      .expect(400);

    await request(app)
      .put("/me/password")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        currentPassword: "senha123",
        newPassword: "nova123",
      })
      .expect(200);

    await request(app)
      .post("/sessions")
      .send({ login: user.user.login, password: "senha123" })
      .expect(401);

    await request(app)
      .post("/sessions")
      .send({ login: user.user.login, password: "nova123" })
      .expect(200);
  });

  it("returns limited public service order data and does not leak sensitive fields", async () => {
    const { serviceOrder } = await createTestServiceOrder(
      ServiceOrderStatus.IN_MAINTENANCE
    );

    await prisma.serviceOrder.update({
      where: { id: serviceOrder.id },
      data: {
        password: "secret-device-password",
        diagnosis: "Internal diagnosis",
      },
    });

    const serviceOrderFromDb = await prisma.serviceOrder.findUniqueOrThrow({
      where: { id: serviceOrder.id },
    });

    const response = await request(app)
      .get(`/public/service-orders/${serviceOrderFromDb.publicToken}`)
      .expect(200);

    expect(response.body.number).toBe(serviceOrder.number);
    expect(response.body.status).toBe("IN_MAINTENANCE");
    expect(response.body.equipment.brand).toBe("Acer");
    expect(response.body.customer).toBeUndefined();
    expect(response.body.password).toBeUndefined();
    expect(response.body.diagnosis).toBeUndefined();
    expect(response.body.budgets).toBeUndefined();
    expect(response.body.stockMovements).toBeUndefined();
    expect(response.body.serviceOrderHistories).toBeUndefined();
    expect(response.body.user).toBeUndefined();
    expect(response.body.userId).toBeUndefined();

    await request(app)
      .get("/public/service-orders/00000000-0000-0000-0000-000000000000")
      .expect(404);
  });

  it("runs a complete authenticated service-order flow", async () => {
    const reception = await authenticateTestUser(UserRole.RECEPTION);
    const technician = await authenticateTestUser(UserRole.TECHNICIAN);
    const admin = await authenticateTestUser(UserRole.ADMIN);

    const customer = await request(app)
      .post("/customers")
      .set("Authorization", `Bearer ${reception.token}`)
      .send({ name: "Flow Customer", phone: "85999990000" })
      .expect(201);

    const equipment = await request(app)
      .post("/equipments")
      .set("Authorization", `Bearer ${reception.token}`)
      .send({
        type: "Notebook",
        brand: "Acer",
        model: "Nitro",
        serialNumber: "FLOW-SERIAL",
        customerId: customer.body.id,
      })
      .expect(201);

    const part = await request(app)
      .post("/parts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "SSD", brand: "Kingston", currentPrice: 250 })
      .expect(201);

    await request(app)
      .post(`/parts/${part.body.id}/stock/entry`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ quantity: 2 })
      .expect(201);

    const serviceOrder = await request(app)
      .post("/service-orders")
      .set("Authorization", `Bearer ${reception.token}`)
      .send({
        customerId: customer.body.id,
        equipmentId: equipment.body.id,
        reportedIssue: "Does not start",
      })
      .expect(201);

    await request(app)
      .patch(`/service-orders/${serviceOrder.body.id}/status`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ status: "IN_ANALYSIS" })
      .expect(200);

    await request(app)
      .patch(`/service-orders/${serviceOrder.body.id}/diagnosis`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ diagnosis: "Faulty SSD" })
      .expect(200);

    const budget = await request(app)
      .post(`/service-orders/${serviceOrder.body.id}/budgets`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({
        items: [{ partId: part.body.id, quantity: 1, unitPrice: 250 }],
      })
      .expect(201);

    await request(app)
      .patch(`/service-orders/${serviceOrder.body.id}/status`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ status: "AWAITING_APPROVAL" })
      .expect(200);

    await request(app)
      .post(`/budgets/${budget.body.id}/approve`)
      .set("Authorization", `Bearer ${reception.token}`)
      .send({})
      .expect(200);

    await request(app)
      .patch(`/service-orders/${serviceOrder.body.id}/status`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ status: "IN_MAINTENANCE" })
      .expect(200);

    await request(app)
      .post(`/service-orders/${serviceOrder.body.id}/parts/${part.body.id}/consume`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ quantity: 1 })
      .expect(201);

    await request(app)
      .patch(`/service-orders/${serviceOrder.body.id}/status`)
      .set("Authorization", `Bearer ${technician.token}`)
      .send({ status: "FINISHED" })
      .expect(200);

    await request(app)
      .patch(`/service-orders/${serviceOrder.body.id}/status`)
      .set("Authorization", `Bearer ${reception.token}`)
      .send({ status: "AWAITING_PICKUP" })
      .expect(200);

    const delivered = await request(app)
      .patch(`/service-orders/${serviceOrder.body.id}/status`)
      .set("Authorization", `Bearer ${reception.token}`)
      .send({ status: "DELIVERED" })
      .expect(200);

    expect(delivered.body.status).toBe("DELIVERED");

    const historyCount = await prisma.serviceOrderHistory.count({
      where: { serviceOrderId: serviceOrder.body.id },
    });

    expect(historyCount).toBeGreaterThanOrEqual(6);
  });
});
