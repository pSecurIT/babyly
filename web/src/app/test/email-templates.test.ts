import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFindUnique } = vi.hoisted(() => ({ mockFindUnique: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { emailTemplate: { findUnique: mockFindUnique } } }));

import { TEMPLATE_DEFS, validateTemplateContent } from "@/lib/email-template-defs";
import { htmlToPlainText, renderEmailContent, renderTemplate, sanitizeEmailHtml } from "@/lib/email-templates";

describe("e-mailsjablonen", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockFindUnique.mockResolvedValue(null);
  });

  it("verwijdert scripts, event handlers en javascript-links", () => {
    const html = sanitizeEmailHtml(
      '<p onclick="x()">Hoi</p><script>alert(1)</script><a href="javascript:alert(1)">klik</a><iframe src="https://a.b"></iframe>',
    );
    expect(html).not.toMatch(/script|onclick|javascript:|iframe/i);
    expect(html).toContain("Hoi");
  });

  it("escapet plaatsaanduidingen in de HTML maar niet in het onderwerp", () => {
    const result = renderEmailContent("Hoi {{name}}", "<p>{{name}}</p>", { name: "<b>A&B</b>" });
    expect(result.html).toContain("&lt;b&gt;A&amp;B&lt;/b&gt;");
    expect(result.subject).toBe("Hoi <b>A&B</b>");
  });

  it("maakt een tekstversie met de link uit de HTML", () => {
    const text = htmlToPlainText('<h1>Titel</h1><p>Tekst</p><a href="https://x.test/a?b=1">Ga</a>');
    expect(text).toContain("Titel");
    expect(text).toContain("https://x.test/a?b=1");
    expect(text).not.toContain("<");
  });

  it("gebruikt de standaardtekst wanneer er geen override is", async () => {
    const result = await renderTemplate("guest_magic_link", { link: "https://x.test/v?token=1" });
    expect(result.subject).toBe(TEMPLATE_DEFS.guest_magic_link.subject);
    expect(result.html).toContain("https://x.test/v?token=1");
    expect(result.text).toContain("https://x.test/v?token=1");
  });

  it("gebruikt een geldige override", async () => {
    mockFindUnique.mockResolvedValue({ subject: "Nieuw", html: '<a href="{{link}}">Open</a>' });
    const result = await renderTemplate("admin_magic_link", { link: "https://x.test/v" });
    expect(result.subject).toBe("Nieuw");
    expect(result.html).toContain('href="https://x.test/v"');
  });

  it("valt terug op de standaardtekst bij een ongeldige override of DB-fout", async () => {
    mockFindUnique.mockResolvedValue({ subject: "Kapot", html: "<p>geen link</p>" });
    expect((await renderTemplate("admin_magic_link", { link: "https://x.test/v" })).subject).toBe(
      TEMPLATE_DEFS.admin_magic_link.subject,
    );

    mockFindUnique.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await renderTemplate("admin_magic_link", { link: "https://x.test/v" })).subject).toBe(
      TEMPLATE_DEFS.admin_magic_link.subject,
    );
  });

  it("valideert verplichte en onbekende plaatsaanduidingen", () => {
    const base = { subject: "Onderwerp", allowed: ["link" as const], required: ["link" as const] };
    expect(validateTemplateContent({ ...base, html: "<p>x</p>" })).toEqual(["{{link}} moet in de HTML-inhoud staan."]);
    expect(validateTemplateContent({ ...base, html: "{{link}}{{bogus}}" })[0]).toContain("{{bogus}}");
    expect(validateTemplateContent({ ...base, html: "{{link}}" })).toEqual([]);
    expect(validateTemplateContent({ ...base, subject: "a\nb", html: "{{link}}" })).toHaveLength(1);
  });
});
