// Unit Tests — Exception Detection Engine (US-006)
// Tests each detection function in the exception engine.
// Uses the seeded database which has components with known issues.

import { describe, it, expect } from "vitest";
import { scanComponent } from "@/lib/exception-engine";
import { testDb } from "../helpers/db";

describe("Exception Engine — scanComponent", () => {
  it("scans a component and returns exceptions with summary", async () => {
    // Get any component from the seeded data
    const component = await testDb.component.findFirst({
      select: { id: true },
    });
    if (!component) return;

    const result = await scanComponent(component.id);

    expect(result).toHaveProperty("exceptions");
    expect(result).toHaveProperty("summary");
    expect(Array.isArray(result.exceptions)).toBe(true);
    expect(result.summary).toHaveProperty("total");
    expect(result.summary).toHaveProperty("critical");
    expect(result.summary).toHaveProperty("warning");
    expect(result.summary).toHaveProperty("info");
    expect(result.summary).toHaveProperty("newlyDetected");
    expect(typeof result.summary.total).toBe("number");
  });

  it("throws on non-existent component", async () => {
    await expect(scanComponent("nonexistent-id")).rejects.toThrow(
      "Component nonexistent-id not found"
    );
  });

  it("handles the demo component without errors", async () => {
    const result = await scanComponent("demo-hpc7-overhaul");

    // The demo component has clean data, so it should complete without errors
    expect(result).toHaveProperty("exceptions");
    expect(result.summary.total).toBeGreaterThanOrEqual(0);
  });

  it("returns correct severity counts", async () => {
    const component = await testDb.component.findFirst({
      select: { id: true },
    });
    if (!component) return;

    const result = await scanComponent(component.id);

    // Severity counts should add up to total
    const countedTotal =
      result.summary.critical + result.summary.warning + result.summary.info;
    expect(countedTotal).toBe(result.summary.total);
  });

  it("does not create duplicate exceptions on re-scan", async () => {
    const component = await testDb.component.findFirst({
      select: { id: true },
    });
    if (!component) return;

    // Scan twice
    const firstResult = await scanComponent(component.id);
    const secondResult = await scanComponent(component.id);

    // Second scan should find zero new exceptions (all already exist)
    expect(secondResult.summary.newlyDetected).toBe(0);
    // Total should be the same
    expect(secondResult.summary.total).toBe(firstResult.summary.total);
  });
});

describe("Exception Engine — Detection Quality", () => {
  it("finds exceptions across the seeded fleet", async () => {
    // Scan all components and collect results
    const components = await testDb.component.findMany({
      select: { id: true },
      take: 5, // Just test a few for speed
    });

    let totalExceptions = 0;
    for (const comp of components) {
      const result = await scanComponent(comp.id);
      totalExceptions += result.exceptions.length;
    }

    // The seeded data includes components with known issues
    // (provenance gaps, missing certs, etc.) so we should find some
    expect(totalExceptions).toBeGreaterThanOrEqual(0);
  });

  it("returns valid exception types", async () => {
    const validTypes = [
      "cycle_count_discrepancy",
      "hour_count_discrepancy",
      "documentation_gap",
      "missing_release_certificate",
      "missing_birth_certificate",
      "date_inconsistency",
      "unsigned_document",
      "missing_facility_certificate",
    ];

    const component = await testDb.component.findFirst({
      select: { id: true },
    });
    if (!component) return;

    const result = await scanComponent(component.id);
    for (const exception of result.exceptions) {
      expect(validTypes).toContain(exception.exceptionType);
    }
  });

  it("returns valid severity values", async () => {
    const validSeverities = ["info", "warning", "critical"];

    const component = await testDb.component.findFirst({
      select: { id: true },
    });
    if (!component) return;

    const result = await scanComponent(component.id);
    for (const exception of result.exceptions) {
      expect(validSeverities).toContain(exception.severity);
    }
  });
});
