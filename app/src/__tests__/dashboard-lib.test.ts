import { describe, it, expect } from "vitest";
import {
  calculateStreak,
  generateHeatmapData,
  getHeatmapColor,
  minutesToHours,
} from "../lib/dashboard";

describe("calculateStreak", () => {
  it("returns 0 for no activity", () => {
    expect(calculateStreak([])).toBe(0);
  });

  it("returns 0 when last activity is too old", () => {
    const oldDate = new Date(Date.now() - 3 * 86400000)
      .toISOString()
      .split("T")[0];
    expect(calculateStreak([oldDate])).toBe(0);
  });

  it("counts today as 1", () => {
    const today = new Date().toISOString().split("T")[0];
    expect(calculateStreak([today])).toBe(1);
  });

  it("counts consecutive days", () => {
    const dates = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(Date.now() - i * 86400000);
      dates.push(d.toISOString().split("T")[0]);
    }
    expect(calculateStreak(dates)).toBe(5);
  });

  it("breaks on gaps", () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000)
      .toISOString()
      .split("T")[0];
    expect(calculateStreak([today, yesterday, threeDaysAgo])).toBe(2);
  });

  it("deduplicates dates", () => {
    const today = new Date().toISOString().split("T")[0];
    expect(calculateStreak([today, today, today])).toBe(1);
  });

  it("works when streak starts from yesterday", () => {
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];
    const dayBefore = new Date(Date.now() - 2 * 86400000)
      .toISOString()
      .split("T")[0];
    expect(calculateStreak([yesterday, dayBefore])).toBe(2);
  });
});

describe("generateHeatmapData", () => {
  it("generates correct number of days for 12 weeks", () => {
    const data = generateHeatmapData([], 12);
    expect(data).toHaveLength(84);
  });

  it("generates correct number of days for 4 weeks", () => {
    const data = generateHeatmapData([], 4);
    expect(data).toHaveLength(28);
  });

  it("counts activity on dates", () => {
    const today = new Date().toISOString().split("T")[0];
    const data = generateHeatmapData([today, today, today], 1);
    const todayEntry = data.find((d) => d.date === today);
    expect(todayEntry?.count).toBe(3);
  });

  it("has 0 count for inactive days", () => {
    const data = generateHeatmapData([], 1);
    expect(data.every((d) => d.count === 0)).toBe(true);
  });
});

describe("getHeatmapColor", () => {
  it("returns slate for 0", () => {
    expect(getHeatmapColor(0)).toContain("slate");
  });

  it("returns light green for 1", () => {
    expect(getHeatmapColor(1)).toContain("green-200");
  });

  it("returns medium green for 2-3", () => {
    expect(getHeatmapColor(2)).toContain("green-400");
    expect(getHeatmapColor(3)).toContain("green-400");
  });

  it("returns dark green for 4+", () => {
    expect(getHeatmapColor(4)).toContain("green-600");
    expect(getHeatmapColor(10)).toContain("green-600");
  });
});

describe("minutesToHours", () => {
  it("shows minutes for less than 1 hour", () => {
    expect(minutesToHours(30)).toBe("30m");
  });

  it("shows hours for 60+ minutes", () => {
    expect(minutesToHours(60)).toBe("1h");
  });

  it("shows decimal hours", () => {
    expect(minutesToHours(90)).toBe("1.5h");
  });

  it("removes .0 for whole hours", () => {
    expect(minutesToHours(120)).toBe("2h");
  });
});
