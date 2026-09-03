import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/env", () => ({
  getEnv: () => ({ PRIVACY_CONTACT_EMAIL: "privacy@example.com" }),
}));

import PrivacyPage from "@/app/privacy/page";

describe("privacy-pagina", () => {
  it("toont de gegevensuitleg en het beheerde verwijderingsproces", () => {
    const html = renderToStaticMarkup(PrivacyPage());

    expect(html).toContain("Privacy bij Babyly");
    expect(html).toContain("Terug naar keuzemenu");
    expect(html).toContain("privacy@example.com");
    expect(html).toContain("alle gekoppelde voorspellingen en adresgegevens");
    expect(html).toContain("niet gebruikt voor advertenties, tracking");
  });
});