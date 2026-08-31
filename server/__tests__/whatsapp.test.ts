import { describe, expect, it } from "vitest";
import { formatPrice, whatsappChatUrl, whatsappMessage, whatsappProductUrl } from "@shared/whatsapp";

describe("WhatsApp inquiry links", () => {
  it("format EGP prices with grouping", () => {
    expect(formatPrice(350)).toBe("350 EGP");
    expect(formatPrice(1250)).toBe("1,250 EGP");
  });

  it("contain the encoded product name and current price", () => {
    const url = whatsappProductUrl("+20 100 000 0000", "Velvet Tint & Glow #2", 1250);
    expect(url.startsWith("https://wa.me/201000000000?text=")).toBe(true);
    const text = decodeURIComponent(url.split("text=")[1]);
    expect(text).toBe("Hi, I would like to ask about Velvet Tint & Glow #2, priced at 1,250 EGP.");
    // Special characters must be encoded, never raw in the URL.
    expect(url).not.toContain("&");
    expect(url).not.toContain("#");
    expect(url).toContain(encodeURIComponent("1,250 EGP"));
  });

  it("reflect the *current* price when it changes", () => {
    const before = whatsappProductUrl("201000000000", "Tint", 300);
    const after = whatsappProductUrl("201000000000", "Tint", 420);
    expect(before).not.toBe(after);
    expect(decodeURIComponent(after)).toContain("420 EGP");
  });

  it("build a plain chat link when no product is selected", () => {
    expect(whatsappChatUrl("2010-0000-0000")).toBe("https://wa.me/201000000000");
    expect(whatsappMessage("X", 1)).toContain("X");
  });
});
