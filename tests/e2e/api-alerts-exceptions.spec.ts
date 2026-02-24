// API Tests — Alerts & Exceptions (US-003)
// HTTP-based tests against the running dev server.

import { test, expect } from "@playwright/test";
import { url, authHeaders } from "./helpers";

test.describe("GET /api/alerts", () => {
  test("returns alerts with correct shape", async ({ request }) => {
    const res = await request.get(url("/api/alerts"), { headers: authHeaders });
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      const alert = data[0];
      expect(alert).toHaveProperty("id");
      expect(alert).toHaveProperty("alertType");
      expect(alert).toHaveProperty("severity");
      expect(alert).toHaveProperty("status");
      expect(alert).toHaveProperty("component");
    }
  });
});

test.describe("GET /api/exceptions", () => {
  test("returns exceptions with correct shape", async ({ request }) => {
    const res = await request.get(url("/api/exceptions"), { headers: authHeaders });
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      expect(data[0]).toHaveProperty("id");
      expect(data[0]).toHaveProperty("exceptionType");
      expect(data[0]).toHaveProperty("severity");
      expect(data[0]).toHaveProperty("status");
    }
  });

  test("filters by severity", async ({ request }) => {
    const res = await request.get(url("/api/exceptions?severity=warning"), { headers: authHeaders });
    const data = await res.json();

    expect(res.status()).toBe(200);
    for (const e of data) {
      expect(e.severity).toBe("warning");
    }
  });

  test("filters by status", async ({ request }) => {
    const res = await request.get(url("/api/exceptions?status=open"), { headers: authHeaders });
    const data = await res.json();

    expect(res.status()).toBe(200);
    for (const e of data) {
      expect(e.status).toBe("open");
    }
  });

  test("respects limit parameter", async ({ request }) => {
    const res = await request.get(url("/api/exceptions?limit=2"), { headers: authHeaders });
    const data = await res.json();

    expect(res.status()).toBe(200);
    expect(data.length).toBeLessThanOrEqual(2);
  });
});

test.describe("PATCH /api/exceptions/[id]", () => {
  test("rejects invalid status values", async ({ request }) => {
    // Get a real exception ID first
    const listRes = await request.get(url("/api/exceptions?limit=1"), { headers: authHeaders });
    const list = await listRes.json();
    if (list.length === 0) return;

    const res = await request.patch(url(`/api/exceptions/${list[0].id}`), {
      headers: authHeaders,
      data: { status: "invalid_status" },
    });
    expect(res.status()).toBe(400);
  });

  test("rejects request with no status", async ({ request }) => {
    const listRes = await request.get(url("/api/exceptions?limit=1"), { headers: authHeaders });
    const list = await listRes.json();
    if (list.length === 0) return;

    const res = await request.patch(url(`/api/exceptions/${list[0].id}`), {
      headers: authHeaders,
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test("returns 404 for non-existent exception", async ({ request }) => {
    const res = await request.patch(url("/api/exceptions/nonexistent-id"), {
      headers: authHeaders,
      data: { status: "investigating" },
    });
    expect(res.status()).toBe(404);
  });
});
