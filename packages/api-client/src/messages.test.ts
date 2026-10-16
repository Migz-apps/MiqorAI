import { BASE_MESSAGES, createToUserMessage, toUserMessage } from "./messages";

describe("toUserMessage", () => {
  it("passes short human messages through", () => {
    expect(toUserMessage("Patient not found.")).toBe("Patient not found.");
    expect(toUserMessage(new Error("Invitation has expired"))).toBe("Invitation has expired");
  });

  it("hides technical, empty or overly long messages behind the fallback", () => {
    expect(toUserMessage("TypeError: Failed to fetch")).toBe(BASE_MESSAGES.generic.error);
    expect(toUserMessage("Internal server error")).toBe(BASE_MESSAGES.generic.error);
    expect(toUserMessage("   ")).toBe(BASE_MESSAGES.generic.error);
    expect(toUserMessage("x".repeat(200))).toBe(BASE_MESSAGES.generic.error);
    expect(toUserMessage({ some: "object" })).toBe(BASE_MESSAGES.generic.error);
  });

  it("uses a per-portal fallback", () => {
    expect(createToUserMessage("Portal fallback")(undefined)).toBe("Portal fallback");
  });
});
