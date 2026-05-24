import { describe, expect, it } from "vitest";
import {
  ForgotPasswordSchema,
  LoginSchema,
  SignupSchema,
} from "@/features/auth/schemas";

describe("LoginSchema", () => {
  it("accepts well-formed credentials", () => {
    const result = LoginSchema.safeParse({
      email: "owner@shop.test",
      password: "hunter2hunter2",
    });
    expect(result.success).toBe(true);
  });

  it("rejects malformed email", () => {
    const result = LoginSchema.safeParse({
      email: "not-an-email",
      password: "hunter2hunter2",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined();
    }
  });

  it("requires a non-empty password", () => {
    const result = LoginSchema.safeParse({
      email: "owner@shop.test",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("SignupSchema", () => {
  it("requires the business name (onboarding precondition)", () => {
    const result = SignupSchema.safeParse({
      email: "new@shop.test",
      password: "hunter2hunter2",
      fullName: "Owner",
      businessName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.businessName).toBeDefined();
    }
  });

  it("rejects passwords under Supabase's 8-char minimum", () => {
    const result = SignupSchema.safeParse({
      email: "new@shop.test",
      password: "short",
      fullName: "Owner",
      businessName: "Shop",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toBeDefined();
    }
  });
});

describe("ForgotPasswordSchema", () => {
  it("trims and normalizes email", () => {
    const result = ForgotPasswordSchema.safeParse({
      email: "  spaced@shop.test  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("spaced@shop.test");
    }
  });
});
