import { describe, it, expect } from "vitest";
import { getStatus } from "../lib/hlr";

describe("HLR Status Classification", () => {
  it("should return 'new' when attempts are 0", () => {
    expect(getStatus(0, 1.0, 90.0)).toBe("new");
    expect(getStatus(0, 0.5, 3.0)).toBe("new");
  });

  it("should classify high recall (>= 0.9) with low half-life (< 7) as 'weak'", () => {
    // High recall but low half-life -> should be capped at 'weak'
    expect(getStatus(5, 0.95, 6.0)).toBe("weak");
    expect(getStatus(5, 0.9, 1.0)).toBe("weak");
  });

  it("should classify high recall (>= 0.9) with moderate half-life (7 to 14) as 'fading'", () => {
    // High recall but moderate half-life -> should be capped at 'fading' (Moderate)
    expect(getStatus(5, 0.95, 10.0)).toBe("fading");
    expect(getStatus(5, 0.92, 7.0)).toBe("fading");
    expect(getStatus(5, 0.9, 13.9)).toBe("fading");
  });

  it("should classify high recall (>= 0.9) with high half-life (>= 14) as 'strong'", () => {
    // High recall and high half-life -> should be 'strong'
    expect(getStatus(5, 0.95, 15.0)).toBe("strong");
    expect(getStatus(5, 0.9, 90.0)).toBe("strong");
  });

  it("should still classify low recall correctly regardless of half-life", () => {
    // Extremely low recall -> 'forgotten'
    expect(getStatus(5, 0.2, 90.0)).toBe("forgotten");
    expect(getStatus(5, 0.3, 6.0)).toBe("forgotten");

    // Mildly low recall -> 'weak' or 'fading'
    expect(getStatus(5, 0.5, 90.0)).toBe("weak");
    expect(getStatus(5, 0.7, 90.0)).toBe("fading");
  });
});
