import { describe, it, expect, beforeEach } from "vitest";
import {
  getReports,
  getReportsForRepo,
  submitReport,
  hasUserReportedRepo,
  getReportCount,
  clearReports,
  REPORT_REASONS,
} from "../lib/moderation";

beforeEach(() => {
  localStorage.clear();
});

describe("REPORT_REASONS", () => {
  it("has 6 reasons", () => {
    expect(REPORT_REASONS).toHaveLength(6);
  });

  it("each reason has value, label, and description", () => {
    for (const reason of REPORT_REASONS) {
      expect(reason.value).toBeTruthy();
      expect(reason.label).toBeTruthy();
      expect(reason.description.length).toBeGreaterThan(10);
    }
  });

  it("includes harmful_content reason", () => {
    expect(REPORT_REASONS.find((r) => r.value === "harmful_content")).toBeDefined();
  });
});

describe("submitReport", () => {
  it("creates a report with correct fields", () => {
    const report = submitReport("owner", "repo", "harmful_content", "Dangerous code", "user1");
    expect(report.id).toContain("report_");
    expect(report.repoOwner).toBe("owner");
    expect(report.repoName).toBe("repo");
    expect(report.reason).toBe("harmful_content");
    expect(report.description).toBe("Dangerous code");
    expect(report.reportedBy).toBe("user1");
    expect(report.status).toBe("pending");
    expect(report.createdAt).toBeTruthy();
  });

  it("persists to localStorage", () => {
    submitReport("owner", "repo", "spam", "This is spam", "user1");
    const reports = getReports();
    expect(reports).toHaveLength(1);
    expect(reports[0].reason).toBe("spam");
  });

  it("throws for empty description", () => {
    expect(() => submitReport("o", "r", "spam", "", "u")).toThrow("Description is required");
  });

  it("throws for description over 1000 chars", () => {
    const long = "a".repeat(1001);
    expect(() => submitReport("o", "r", "spam", long, "u")).toThrow("under 1000");
  });

  it("trims description whitespace", () => {
    const report = submitReport("o", "r", "spam", "  trimmed  ", "u");
    expect(report.description).toBe("trimmed");
  });

  it("allows multiple reports from different users", () => {
    submitReport("o", "r", "spam", "Report 1", "user1");
    submitReport("o", "r", "harmful_content", "Report 2", "user2");
    expect(getReports()).toHaveLength(2);
  });
});

describe("getReportsForRepo", () => {
  it("filters by owner and repo", () => {
    submitReport("owner1", "repo1", "spam", "desc", "user1");
    submitReport("owner2", "repo2", "spam", "desc", "user1");
    submitReport("owner1", "repo1", "other", "desc", "user2");

    const reports = getReportsForRepo("owner1", "repo1");
    expect(reports).toHaveLength(2);
  });

  it("returns empty for no matches", () => {
    submitReport("owner1", "repo1", "spam", "desc", "user1");
    expect(getReportsForRepo("other", "other")).toHaveLength(0);
  });
});

describe("hasUserReportedRepo", () => {
  it("returns true when user has pending report", () => {
    submitReport("o", "r", "spam", "desc", "user1");
    expect(hasUserReportedRepo("o", "r", "user1")).toBe(true);
  });

  it("returns false for different user", () => {
    submitReport("o", "r", "spam", "desc", "user1");
    expect(hasUserReportedRepo("o", "r", "user2")).toBe(false);
  });

  it("returns false when no reports exist", () => {
    expect(hasUserReportedRepo("o", "r", "user1")).toBe(false);
  });
});

describe("getReportCount", () => {
  it("counts pending reports", () => {
    submitReport("o", "r", "spam", "desc", "user1");
    submitReport("o2", "r2", "other", "desc", "user2");
    expect(getReportCount()).toBe(2);
  });

  it("returns 0 with no reports", () => {
    expect(getReportCount()).toBe(0);
  });
});

describe("clearReports", () => {
  it("removes all reports", () => {
    submitReport("o", "r", "spam", "desc", "user1");
    submitReport("o", "r", "spam", "desc", "user2");
    clearReports();
    expect(getReports()).toHaveLength(0);
  });
});
