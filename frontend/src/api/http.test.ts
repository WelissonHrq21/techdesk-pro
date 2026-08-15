import { describe, expect, it } from "vitest";
import { http } from "./http";

describe("http client test configuration", () => {
  it("has a deterministic API base URL during tests", () => {
    expect(http.defaults.baseURL).toBe(import.meta.env.VITE_API_URL);
    expect(http.defaults.baseURL).toMatch(/^http:\/\/localhost:3333|^http:\/\/127\.0\.0\.1:3333/);
  });
});
