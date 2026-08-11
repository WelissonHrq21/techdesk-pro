import { describe, expect, it } from "vitest";
import { getAvailableActions } from "./getAvailableActions";

describe("getAvailableActions", () => {
  it("shows analysis action for technician on received service order", () => {
    expect(
      getAvailableActions({
        status: "RECEIVED",
        role: "TECHNICIAN",
        hasBudget: false,
      })
    ).toContain("START_ANALYSIS");
  });

  it("does not show analysis action for reception on received service order", () => {
    expect(
      getAvailableActions({
        status: "RECEIVED",
        role: "RECEPTION",
        hasBudget: false,
      })
    ).not.toContain("START_ANALYSIS");
  });

  it("shows budget decision actions for reception while awaiting approval", () => {
    const actions = getAvailableActions({
      status: "AWAITING_APPROVAL",
      role: "RECEPTION",
      hasBudget: true,
    });

    expect(actions).toContain("APPROVE_BUDGET");
    expect(actions).toContain("REJECT_BUDGET");
  });

  it("does not show budget decision actions for technician", () => {
    const actions = getAvailableActions({
      status: "AWAITING_APPROVAL",
      role: "TECHNICIAN",
      hasBudget: true,
    });

    expect(actions).not.toContain("APPROVE_BUDGET");
    expect(actions).not.toContain("REJECT_BUDGET");
  });

  it("shows consume action during maintenance for technician", () => {
    expect(
      getAvailableActions({
        status: "IN_MAINTENANCE",
        role: "TECHNICIAN",
        hasBudget: true,
      })
    ).toContain("CONSUME_PART");
  });
});
