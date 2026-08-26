import { describe, expect, it } from "vitest";

import { normalizeCode } from "@/lib/auth/code";

/* ADR 0005 puts the code first in the email subject line so iOS shows it in
   the notification banner. The promise that makes it pleasant is that the
   user can paste that line as-is, or type the digits, or let the OS autofill
   it — and never be told the code is wrong because of a space. */

describe("normalizeCode", () => {
  it("keeps a plain code untouched", () => {
    expect(normalizeCode("12345678")).toBe("12345678");
  });

  it("survives how a code is really typed or pasted", () => {
    expect(normalizeCode(" 12345678 ")).toBe("12345678");
    expect(normalizeCode("1234 5678")).toBe("12345678");
    expect(normalizeCode("1234-5678")).toBe("12345678");
  });

  it("digs the code out of a whole pasted subject line", () => {
    expect(normalizeCode("12345678 — your Stap sign-in code")).toBe("12345678");
  });

  it("returns an empty string when there is no code in there", () => {
    expect(normalizeCode("")).toBe("");
    expect(normalizeCode("   ")).toBe("");
    expect(normalizeCode("no digits here")).toBe("");
  });
});
