import { http as mswHttp, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { testApiUrl } from "../test/apiUrl";
import { server } from "../test/server";
import { http, registerUnauthorizedHandler } from "./http";

describe("http client test configuration", () => {
  it("has a deterministic API base URL during tests", () => {
    expect(http.defaults.baseURL).toBe(import.meta.env.VITE_API_URL);
    expect(http.defaults.baseURL).toMatch(/^http:\/\/localhost:3333|^http:\/\/127\.0\.0\.1:3333/);
  });

  it("notifies the app when the backend revokes a session", async () => {
    const handler = vi.fn();
    const unregister = registerUnauthorizedHandler(handler);
    server.use(
      mswHttp.get(`${testApiUrl}/revoked-session`, () =>
        HttpResponse.json({ message: "Session revoked" }, { status: 401 })
      )
    );

    await expect(http.get("/revoked-session")).rejects.toBeDefined();

    expect(handler).toHaveBeenCalledWith(
      "Sua sessão foi encerrada. Entre novamente."
    );
    unregister();
  });
});
