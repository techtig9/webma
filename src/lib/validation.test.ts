import { describe, it, expect } from "vitest";
import { generateWebsiteSchema, followUpQuestionsSchema, validate } from "@/lib/validation";

describe("generateWebsiteSchema", () => {
  it("accepts a valid request", () => {
    const result = validate(generateWebsiteSchema, {
      name: "Bloom & Co.",
      description: "A cozy neighborhood bakery in Lahore, warm and rustic.",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Bloom & Co.");
  });

  it("rejects an empty name", () => {
    const result = validate(generateWebsiteSchema, { name: "", description: "A long enough description." });
    expect(result.success).toBe(false);
  });

  it("rejects a description that's too short to be useful", () => {
    const result = validate(generateWebsiteSchema, { name: "Bloom", description: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing body entirely", () => {
    const result = validate(generateWebsiteSchema, null);
    expect(result.success).toBe(false);
  });

  it("defaults answers to an empty object when omitted", () => {
    const result = validate(generateWebsiteSchema, {
      name: "Bloom",
      description: "A cozy neighborhood bakery in Lahore.",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.answers).toEqual({});
  });

  it("rejects a non-uuid projectId instead of silently passing it through", () => {
    const result = validate(generateWebsiteSchema, {
      name: "Bloom",
      description: "A cozy neighborhood bakery in Lahore.",
      projectId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("followUpQuestionsSchema", () => {
  it("rejects when description is missing", () => {
    const result = validate(followUpQuestionsSchema, { name: "Bloom" });
    expect(result.success).toBe(false);
  });
});
