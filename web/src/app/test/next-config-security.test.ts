import { afterEach, describe, expect, it, vi } from "vitest";

import nextConfig from "../../../next.config";

describe("centrale security headers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("configureert browser security headers voor alle routes", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const rules = await nextConfig.headers?.();
    const route = rules?.find((rule) => rule.source === "/(.*)");
    const headers = new Map(route?.headers?.map((header) => [header.key, header.value]));

    expect(headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("Content-Security-Policy")).toContain("form-action 'self'");
    expect(headers.get("Content-Security-Policy")).not.toContain("'unsafe-eval'");
    expect(headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("stuurt HSTS niet naar lokale HTTP-ontwikkeling", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const rules = await nextConfig.headers?.();
    const headers = rules?.[0]?.headers ?? [];

    expect(headers.some((header) => header.key === "Strict-Transport-Security")).toBe(false);
    expect(headers.find((header) => header.key === "Content-Security-Policy")?.value).toContain(
      "'unsafe-eval'",
    );
  });
});