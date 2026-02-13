import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildMaterialPath,
  buildCoursePath,
  buildMetaPath,
  fetchCourse,
  fetchMeta,
  saveCourse,
  saveMeta,
  MATERIAL_REPO_OWNER,
  MATERIAL_REPO_NAME,
} from "../lib/material-storage";

// ---------- Mocks ----------

vi.mock("../lib/env", () => ({
  getServerEnv: () => ({
    GITHUB_PERSONAL_TOKEN: "ghp_test_token",
  }),
}));

const mockFetchFileContent = vi.fn();
const mockCommitFile = vi.fn();
const mockGetContent = vi.fn();

vi.mock("../lib/github", () => ({
  getCacheOctokit: () => ({
    rest: {
      repos: {
        getContent: (...args: unknown[]) => mockGetContent(...args),
      },
    },
  }),
  fetchFileContent: (...args: unknown[]) => mockFetchFileContent(...args),
  commitFile: (...args: unknown[]) => mockCommitFile(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- Path building ----------

describe("buildMaterialPath", () => {
  it("builds correct path for a gist", () => {
    expect(buildMaterialPath("python", "karpathy", "8627fe009c40f57531cb18360106ce95")).toBe(
      "python/karpathy--8627fe009c40f57531cb18360106ce95"
    );
  });

  it("builds correct path for a repo", () => {
    expect(buildMaterialPath("python", "karpathy", "micrograd")).toBe(
      "python/karpathy--micrograd"
    );
  });

  it("lowercases language", () => {
    expect(buildMaterialPath("JavaScript", "owner", "repo")).toBe(
      "javascript/owner--repo"
    );
  });

  it("sanitizes special characters in name", () => {
    expect(buildMaterialPath("python", "owner", "my/weird repo")).toBe(
      "python/owner--my-weird-repo"
    );
  });
});

describe("buildCoursePath", () => {
  it("appends level.json to material path", () => {
    expect(buildCoursePath("python", "karpathy", "micrograd", "beginner")).toBe(
      "python/karpathy--micrograd/beginner.json"
    );
  });

  it("works for all levels", () => {
    expect(buildCoursePath("python", "owner", "repo", "intermediate")).toBe(
      "python/owner--repo/intermediate.json"
    );
    expect(buildCoursePath("python", "owner", "repo", "advanced")).toBe(
      "python/owner--repo/advanced.json"
    );
  });
});

describe("buildMetaPath", () => {
  it("appends meta.json to material path", () => {
    expect(buildMetaPath("python", "karpathy", "micrograd")).toBe(
      "python/karpathy--micrograd/meta.json"
    );
  });
});

// ---------- Fetch operations ----------

describe("fetchCourse", () => {
  it("returns parsed JSON when course exists", async () => {
    const courseData = { meta: { level: "beginner" }, modules: [] };
    mockFetchFileContent.mockResolvedValue({
      content: JSON.stringify(courseData),
      truncated: false,
    });

    const result = await fetchCourse("python", "karpathy", "micrograd", "beginner");

    expect(result).toEqual(courseData);
    expect(mockFetchFileContent).toHaveBeenCalledWith(
      expect.anything(),
      MATERIAL_REPO_OWNER,
      MATERIAL_REPO_NAME,
      "python/karpathy--micrograd/beginner.json",
      { maxChars: 2_000_000 }
    );
  });

  it("returns null when course does not exist (404)", async () => {
    mockFetchFileContent.mockRejectedValue(new Error("Not Found"));

    const result = await fetchCourse("python", "unknown", "repo", "beginner");
    expect(result).toBeNull();
  });

  it("returns null on JSON parse error", async () => {
    mockFetchFileContent.mockResolvedValue({
      content: "not valid json",
      truncated: false,
    });

    const result = await fetchCourse("python", "owner", "repo", "beginner");
    expect(result).toBeNull();
  });
});

describe("fetchMeta", () => {
  it("returns parsed meta.json when it exists", async () => {
    const metaData = { language: "python", feasibility: { canLearn: true } };
    mockFetchFileContent.mockResolvedValue({
      content: JSON.stringify(metaData),
      truncated: false,
    });

    const result = await fetchMeta("python", "karpathy", "micrograd");

    expect(result).toEqual(metaData);
    expect(mockFetchFileContent).toHaveBeenCalledWith(
      expect.anything(),
      MATERIAL_REPO_OWNER,
      MATERIAL_REPO_NAME,
      "python/karpathy--micrograd/meta.json",
      { maxChars: 50_000 }
    );
  });

  it("returns null when meta.json does not exist", async () => {
    mockFetchFileContent.mockRejectedValue(new Error("Not Found"));

    const result = await fetchMeta("python", "unknown", "repo");
    expect(result).toBeNull();
  });
});

// ---------- Save operations ----------

describe("saveCourse", () => {
  it("creates new file when no existing file", async () => {
    mockGetContent.mockRejectedValue(new Error("404"));
    mockCommitFile.mockResolvedValue({ sha: "new_sha" });

    const courseData = { meta: { level: "beginner" }, modules: [] };
    await saveCourse("python", "karpathy", "micrograd", "beginner", courseData);

    expect(mockCommitFile).toHaveBeenCalledWith(
      expect.anything(),
      MATERIAL_REPO_OWNER,
      MATERIAL_REPO_NAME,
      "python/karpathy--micrograd/beginner.json",
      JSON.stringify(courseData, null, 2),
      "Add beginner course for karpathy/micrograd",
      { sha: undefined }
    );
  });

  it("updates existing file with SHA", async () => {
    mockGetContent.mockResolvedValue({
      data: { sha: "existing_sha", type: "file" },
    });
    mockCommitFile.mockResolvedValue({ sha: "updated_sha" });

    const courseData = { meta: { level: "intermediate" }, modules: [] };
    await saveCourse("python", "karpathy", "micrograd", "intermediate", courseData);

    expect(mockCommitFile).toHaveBeenCalledWith(
      expect.anything(),
      MATERIAL_REPO_OWNER,
      MATERIAL_REPO_NAME,
      "python/karpathy--micrograd/intermediate.json",
      JSON.stringify(courseData, null, 2),
      "Add intermediate course for karpathy/micrograd",
      { sha: "existing_sha" }
    );
  });
});

describe("saveMeta", () => {
  it("commits meta.json to the material repo", async () => {
    mockGetContent.mockRejectedValue(new Error("404"));
    mockCommitFile.mockResolvedValue({ sha: "new_sha" });

    const metaData = { language: "python", feasibility: { canLearn: true } };
    await saveMeta("python", "karpathy", "micrograd", metaData);

    expect(mockCommitFile).toHaveBeenCalledWith(
      expect.anything(),
      MATERIAL_REPO_OWNER,
      MATERIAL_REPO_NAME,
      "python/karpathy--micrograd/meta.json",
      JSON.stringify(metaData, null, 2),
      "Update meta for karpathy/micrograd",
      { sha: undefined }
    );
  });
});

// ---------- Constants ----------

describe("repo constants", () => {
  it("uses dp9910/gitgood-learning-material", () => {
    expect(MATERIAL_REPO_OWNER).toBe("dp9910");
    expect(MATERIAL_REPO_NAME).toBe("gitgood-learning-material");
  });
});
