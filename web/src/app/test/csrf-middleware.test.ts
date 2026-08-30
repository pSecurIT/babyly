import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "../../../middleware";

describe("CSRF middleware", () => {
  it("maakt een beveiligde CSRF-cookie aan als die ontbreekt", () => {
    const request = new NextRequest("http://localhost:3000/");
    const response = middleware(request);
    const cookie = response.cookies.get("baby_csrf");

    expect(cookie?.value).toMatch(/^[a-f0-9]{64}$/);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("strict");
    expect(cookie?.path).toBe("/");
  });

  it("vervangt een bestaande CSRF-cookie niet", () => {
    const request = new NextRequest("http://localhost:3000/");
    request.cookies.set("baby_csrf", "b".repeat(64));

    const response = middleware(request);

    expect(response.cookies.get("baby_csrf")).toBeUndefined();
  });

  it("vervangt een ongeldige CSRF-cookie", () => {
    const request = new NextRequest("http://localhost:3000/");
    request.cookies.set("baby_csrf", "invalid");

    const response = middleware(request);

    expect(response.cookies.get("baby_csrf")?.value).toMatch(/^[a-f0-9]{64}$/);
  });
});