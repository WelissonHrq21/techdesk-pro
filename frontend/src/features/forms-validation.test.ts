import { describe, expect, it } from "vitest";
import { customerSchema } from "./customers/schemas/customerSchema";
import { userSchema } from "./users/schemas/userSchema";
import {
  budgetFormSchema,
  consumePartSchema,
} from "./service-orders/schemas/serviceOrderActionSchemas";

describe("critical form validation", () => {
  it("requires customer name and phone", () => {
    const result = customerSchema.safeParse({ name: "", phone: "" });

    expect(result.success).toBe(false);
  });

  it("rejects different password confirmation on user form", () => {
    const result = userSchema.safeParse({
      name: "Carlos",
      login: "carlos",
      role: "TECHNICIAN",
      password: "senha123",
      confirmPassword: "outra123",
    });

    expect(result.success).toBe(false);
  });

  it("requires part id on budget item", () => {
    const result = budgetFormSchema.safeParse({
      items: [{ partId: "", quantity: 1, unitPrice: 250 }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects zero quantity when consuming parts", () => {
    const result = consumePartSchema.safeParse({
      quantity: 0,
      observation: "",
    });

    expect(result.success).toBe(false);
  });
});
