import { describe, expect, it } from "vitest";
import { mergeRecipients, parseExtraEmails } from "@/lib/custom-email";

describe("eigen e-mail ontvangers", () => {
  it("parseert, dedupliceert en markeert ongeldige adressen", () => {
    const result = parseExtraEmails("A@x.nl, b@x.nl;a@x.nl\nkapot");
    expect(result.valid).toEqual(["a@x.nl", "b@x.nl"]);
    expect(result.invalid).toEqual(["kapot"]);
  });

  it("voegt deelnemers en extra adressen samen zonder dubbelen", () => {
    const result = mergeRecipients([{ id: "p1", email: "a@x.nl", name: "Anna" }], ["a@x.nl", "b@x.nl"]);
    expect(result).toEqual([
      { email: "a@x.nl", name: "Anna", participantId: "p1" },
      { email: "b@x.nl", name: null, participantId: null },
    ]);
  });
});
