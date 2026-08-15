import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

if (!import.meta.env.VITE_API_URL) {
  vi.stubEnv("VITE_API_URL", "http://localhost:3333");
}

let server: (typeof import("./server"))["server"];

beforeAll(async () => {
  ({ server } = await import("./server"));
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());
