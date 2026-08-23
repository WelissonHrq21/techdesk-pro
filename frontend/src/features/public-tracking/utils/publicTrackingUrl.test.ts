import { describe, expect, it } from "vitest";
import {
  buildPublicTrackingUrl,
  getPublicTrackingPath,
} from "./publicTrackingUrl";

const publicToken = "33333333-3333-4333-8333-333333333333";

describe("publicTrackingUrl", () => {
  it("uses the real public tracking route and token", () => {
    expect(getPublicTrackingPath(publicToken)).toBe(`/track/${publicToken}`);
  });

  it.each([
    ["localhost", "http://localhost:8080", `http://localhost:8080/track/${publicToken}`],
    ["LAN", "http://192.168.1.69:8080", `http://192.168.1.69:8080/track/${publicToken}`],
    ["hostname", "http://techdesk.local:8080", `http://techdesk.local:8080/track/${publicToken}`],
    ["HTTPS", "https://assistencia.example.com", `https://assistencia.example.com/track/${publicToken}`],
  ])("preserves the %s origin", (_label, origin, expected) => {
    expect(buildPublicTrackingUrl(publicToken, origin)).toBe(expected);
  });

  it("encodes the token as a path segment without private query data", () => {
    const url = buildPublicTrackingUrl(
      "token with spaces",
      "https://assistencia.example.com"
    );

    expect(url).toBe(
      "https://assistencia.example.com/track/token%20with%20spaces"
    );
    expect(url).not.toContain("?");
    expect(url).not.toMatch(/document|customer|serviceOrderId|jwt|bearer/i);
  });
});
