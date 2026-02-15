/**
 * Curated repository data for the browse page.
 * Pre-seeded repos that have been reviewed and have cached curricula.
 */

export interface CuratedRepo {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  stars: number;
  learners: number;
  estimatedHours: number;
  language: string;
  topics: string[];
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  topicCount: number;
}

export const CATEGORIES = [
  "All",
  "Foundations",
  "GPT",
  "Llama",
  "Infrastructure",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CURATED_REPOS: CuratedRepo[] = [
  // ---------- Foundations ----------
  {
    owner: "karpathy",
    name: "micrograd",
    fullName: "karpathy/micrograd",
    description: "A tiny autograd engine and neural net library",
    stars: 14700,
    learners: 1847,
    estimatedHours: 8,
    language: "Python",
    topics: ["autograd", "neural networks", "backpropagation"],
    category: "Foundations",
    difficulty: "beginner",
    topicCount: 12,
  },
  {
    owner: "karpathy",
    name: "makemore",
    fullName: "karpathy/makemore",
    description: "An autoregressive character-level language model for making more things",
    stars: 3700,
    learners: 924,
    estimatedHours: 6,
    language: "Python",
    topics: ["character-level LM", "embeddings", "autoregressive"],
    category: "Foundations",
    difficulty: "beginner",
    topicCount: 8,
  },
  // ---------- GPT ----------
  {
    owner: "jaymody",
    name: "picoGPT",
    fullName: "jaymody/picoGPT",
    description: "An unnecessarily tiny implementation of GPT-2 in NumPy",
    stars: 3400,
    learners: 412,
    estimatedHours: 4,
    language: "Python",
    topics: ["GPT-2", "NumPy", "language models"],
    category: "GPT",
    difficulty: "beginner",
    topicCount: 6,
  },
  {
    owner: "karpathy",
    name: "minGPT",
    fullName: "karpathy/minGPT",
    description: "A minimal PyTorch re-implementation of the OpenAI GPT training",
    stars: 23600,
    learners: 2156,
    estimatedHours: 10,
    language: "Python",
    topics: ["GPT", "PyTorch", "transformer training"],
    category: "GPT",
    difficulty: "intermediate",
    topicCount: 12,
  },
  {
    owner: "karpathy",
    name: "nanoGPT",
    fullName: "karpathy/nanoGPT",
    description: "The simplest, fastest repository for training/finetuning medium-sized GPTs",
    stars: 53200,
    learners: 3241,
    estimatedHours: 15,
    language: "Python",
    topics: ["transformers", "GPT", "language models"],
    category: "GPT",
    difficulty: "intermediate",
    topicCount: 18,
  },
  // ---------- Llama ----------
  {
    owner: "karpathy",
    name: "llama2.c",
    fullName: "karpathy/llama2.c",
    description: "Inference Llama 2 in one file of pure C",
    stars: 19200,
    learners: 1687,
    estimatedHours: 8,
    language: "C",
    topics: ["Llama", "inference", "C implementation"],
    category: "Llama",
    difficulty: "intermediate",
    topicCount: 10,
  },
  {
    owner: "likejazz",
    name: "llama3.np",
    fullName: "likejazz/llama3.np",
    description: "llama3.np is a pure NumPy implementation for Llama 3 model",
    stars: 990,
    learners: 187,
    estimatedHours: 4,
    language: "Python",
    topics: ["Llama 3", "NumPy", "inference"],
    category: "Llama",
    difficulty: "beginner",
    topicCount: 6,
  },
  {
    owner: "naklecha",
    name: "llama3-from-scratch",
    fullName: "naklecha/llama3-from-scratch",
    description: "llama3 implementation one matrix multiplication at a time",
    stars: 15200,
    learners: 1342,
    estimatedHours: 6,
    language: "Python",
    topics: ["Llama 3", "from scratch", "matrix multiplication"],
    category: "Llama",
    difficulty: "intermediate",
    topicCount: 8,
  },
  // ---------- Infrastructure ----------
  {
    owner: "karpathy",
    name: "minbpe",
    fullName: "karpathy/minbpe",
    description: "Minimal, clean code for the Byte Pair Encoding algorithm",
    stars: 12800,
    learners: 892,
    estimatedHours: 5,
    language: "Python",
    topics: ["tokenization", "BPE", "NLP"],
    category: "Infrastructure",
    difficulty: "beginner",
    topicCount: 8,
  },
  {
    owner: "karpathy",
    name: "llm.c",
    fullName: "karpathy/llm.c",
    description: "LLM training in simple, raw C/CUDA",
    stars: 28900,
    learners: 1523,
    estimatedHours: 20,
    language: "C",
    topics: ["LLM training", "CUDA", "low-level optimization"],
    category: "Infrastructure",
    difficulty: "advanced",
    topicCount: 15,
  },
  {
    owner: "srush",
    name: "GPU-Puzzles",
    fullName: "srush/GPU-Puzzles",
    description: "Solve puzzles. Learn CUDA.",
    stars: 11900,
    learners: 834,
    estimatedHours: 8,
    language: "Python",
    topics: ["CUDA", "GPU programming", "puzzles"],
    category: "Infrastructure",
    difficulty: "intermediate",
    topicCount: 10,
  },
];

// ---------- Search / Filter ----------

export function filterRepos(
  repos: CuratedRepo[],
  query: string,
  category: Category
): CuratedRepo[] {
  let filtered = repos;

  if (category !== "All") {
    filtered = filtered.filter((r) => r.category === category);
  }

  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.language.toLowerCase().includes(q) ||
        r.topics.some((t) => t.toLowerCase().includes(q)) ||
        r.owner.toLowerCase().includes(q)
    );
  }

  return filtered;
}

export function formatStars(stars: number): string {
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return stars.toString();
}
