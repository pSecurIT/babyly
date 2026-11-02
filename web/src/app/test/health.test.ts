import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { $queryRaw: mockQuery } }));

import { GET } from "@/app/api/health/route";

describe("health endpoint", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("meldt ok en de build-sha wanneer de database bereikbaar is", async () => {
    mockQuery.mockResolvedValue([{ "?column?": 1 }]);
    vi.stubEnv("GIT_SHA", "abc123");

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", sha: "abc123" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    vi.unstubAllEnvs();
  });

  it("geeft 503 zonder details wanneer de database niet bereikbaar is", async () => {
    mockQuery.mockRejectedValue(new Error("connection refused to 10.0.0.1"));

    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "error" });
  });
});
