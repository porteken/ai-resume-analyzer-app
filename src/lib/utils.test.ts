import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn utility function", () => {
  it("should merge class names", () => {
    const result = cn("text-base", "font-bold");
    expect(result).toContain("text-base");
    expect(result).toContain("font-bold");
  });

  it("should handle conditional classes", () => {
    const shouldHide = false;
    const result = cn("text-base", shouldHide && "hidden", "visible");
    expect(result).toContain("text-base");
    expect(result).toContain("visible");
    expect(result).not.toContain("hidden");
  });

  it("should merge tailwind classes properly", () => {
    const result = cn("px-2 py-1", "px-4");
    expect(result).toBe("py-1 px-4");
  });

  it("should handle empty inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should handle arrays of classes", () => {
    const result = cn(["text-base", "font-bold"]);
    expect(result).toContain("text-base");
    expect(result).toContain("font-bold");
  });

  it("should handle objects with boolean values", () => {
    const result = cn({
      "font-bold": false,
      "text-base": true,
      visible: true,
    });
    expect(result).toContain("text-base");
    expect(result).toContain("visible");
    expect(result).not.toContain("font-bold");
  });
});
