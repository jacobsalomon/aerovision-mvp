// Smoke test — verifies the test infrastructure works.
// If this passes, Vitest is properly configured.

import { describe, it, expect } from "vitest";

describe("Test Infrastructure", () => {
  it("vitest runs successfully", () => {
    expect(1 + 1).toBe(2);
  });

  it("can import project modules via @ alias", async () => {
    // Verify the path alias works — import a simple utility
    const { apiUrl } = await import("@/lib/api-url");
    expect(apiUrl("/api/test")).toContain("/api/test");
  });
});
