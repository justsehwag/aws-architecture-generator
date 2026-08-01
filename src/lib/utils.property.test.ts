import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { cn } from "./utils";

describe("cn utility - property tests", () => {
  it("always returns a string", () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { maxLength: 5 }), (classNames) => {
        const result = cn(...classNames);
        expect(typeof result).toBe("string");
      })
    );
  });

  it("empty input produces empty string", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("single class passes through unchanged", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("px-4", "py-2", "text-lg", "bg-red-500", "flex"),
        (className) => {
          const result = cn(className);
          expect(result).toBe(className);
        }
      )
    );
  });
});
