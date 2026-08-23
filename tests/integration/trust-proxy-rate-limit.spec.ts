import { UserRole } from "@prisma/client";
import express from "express";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app";
import {
  configureTrustProxy,
  TRUSTED_PROXY_HOPS,
} from "../../src/config/trustProxy";
import { createClientRateLimiter } from "../../src/middlewares/createClientRateLimiter";
import { prisma, resetDatabase } from "../helpers/database";
import { createTestUser } from "../helpers/factories";

function createIpProbe(limit = 100) {
  const probe = express();
  configureTrustProxy(probe);
  probe.use(createClientRateLimiter({ windowMs: 60_000, limit }));
  probe.get("/probe", (req, res) => {
    return res.json({
      ip: req.ip,
      ips: req.ips,
      protocol: req.protocol,
    });
  });

  return probe;
}

describe("trusted proxy and client rate limiting", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("trusts exactly the single reverse proxy used by production", async () => {
    const probe = createIpProbe();
    const response = await request(probe)
      .get("/probe")
      .set("X-Forwarded-For", "198.51.100.10")
      .set("X-Forwarded-Proto", "https")
      .expect(200);

    expect(TRUSTED_PROXY_HOPS).toBe(1);
    expect(app.get("trust proxy")).toBe(1);
    expect(response.body).toEqual({
      ip: "198.51.100.10",
      ips: ["198.51.100.10"],
      protocol: "https",
    });
  });

  it("isolates limiter buckets by client while preserving same-client limits", async () => {
    const probe = createIpProbe(2);

    await request(probe)
      .get("/probe")
      .set("X-Forwarded-For", "198.51.100.20")
      .expect(200);
    await request(probe)
      .get("/probe")
      .set("X-Forwarded-For", "198.51.100.20")
      .expect(200);
    await request(probe)
      .get("/probe")
      .set("X-Forwarded-For", "198.51.100.20")
      .expect(429);

    await request(probe)
      .get("/probe")
      .set("X-Forwarded-For", "198.51.100.21")
      .expect(200);
  });

  it("ignores spoofed left-side XFF values behind the trusted proxy", async () => {
    const probe = createIpProbe(2);

    for (const spoofedIp of ["192.0.2.1", "192.0.2.2"]) {
      const response = await request(probe)
        .get("/probe")
        .set("X-Forwarded-For", `${spoofedIp}, 198.51.100.30`)
        .expect(200);

      expect(response.body.ip).toBe("198.51.100.30");
    }

    await request(probe)
      .get("/probe")
      .set("X-Forwarded-For", "192.0.2.3, 198.51.100.30")
      .expect(429);
  });

  it("uses the rightmost XFF hop when an unsupported multi-proxy chain arrives", async () => {
    const probe = createIpProbe();
    const response = await request(probe)
      .get("/probe")
      .set(
        "X-Forwarded-For",
        "192.0.2.10, 198.51.100.40, 203.0.113.50"
      )
      .expect(200);

    expect(response.body.ip).toBe("203.0.113.50");
    expect(response.body.ips).toEqual(["203.0.113.50"]);
  });

  it("keeps login roles and public tracking free from proxy validation errors", async () => {
    const users = await Promise.all([
      createTestUser(UserRole.ADMIN),
      createTestUser(UserRole.RECEPTION),
      createTestUser(UserRole.TECHNICIAN),
    ]);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      for (const [index, user] of users.entries()) {
        const response = await request(app)
          .post("/sessions")
          .set("X-Forwarded-For", `198.51.100.${60 + index}`)
          .send({ login: user.login, password: "senha123" })
          .expect(200);

        expect(response.body.user.role).toBe(user.role);
      }

      await request(app)
        .get("/public/service-orders/00000000-0000-0000-0000-000000000000")
        .set("X-Forwarded-For", "198.51.100.70")
        .expect(404);

      const loggedErrors = consoleError.mock.calls.flat().map(String).join("\n");
      expect(loggedErrors).not.toContain(
        "ERR_ERL_UNEXPECTED_X_FORWARDED_FOR"
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
