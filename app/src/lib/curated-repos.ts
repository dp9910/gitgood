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
  "Machine Learning",
  "Web Dev",
  "Algorithms",
  "Data Science",
  "Systems",
  "Tools",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CURATED_REPOS: CuratedRepo[] = [
  {
    owner: "karpathy",
    name: "micrograd",
    fullName: "karpathy/micrograd",
    description: "A tiny autograd engine and neural net library",
    stars: 10200,
    learners: 1847,
    estimatedHours: 8,
    language: "Python",
    topics: ["autograd", "neural networks", "backpropagation"],
    category: "Machine Learning",
    difficulty: "beginner",
    topicCount: 12,
  },
  {
    owner: "karpathy",
    name: "nanoGPT",
    fullName: "karpathy/nanoGPT",
    description: "The simplest, fastest repository for training/finetuning medium-sized GPTs",
    stars: 38500,
    learners: 3241,
    estimatedHours: 15,
    language: "Python",
    topics: ["transformers", "GPT", "language models"],
    category: "Machine Learning",
    difficulty: "intermediate",
    topicCount: 18,
  },
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
    category: "Machine Learning",
    difficulty: "beginner",
    topicCount: 8,
  },
  {
    owner: "trekhleb",
    name: "javascript-algorithms",
    fullName: "trekhleb/javascript-algorithms",
    description: "Algorithms and data structures implemented in JavaScript",
    stars: 191000,
    learners: 5621,
    estimatedHours: 25,
    language: "JavaScript",
    topics: ["algorithms", "data structures", "sorting"],
    category: "Algorithms",
    difficulty: "beginner",
    topicCount: 35,
  },
  {
    owner: "TheAlgorithms",
    name: "Python",
    fullName: "TheAlgorithms/Python",
    description: "All algorithms implemented in Python",
    stars: 195000,
    learners: 4102,
    estimatedHours: 30,
    language: "Python",
    topics: ["algorithms", "data structures", "dynamic programming"],
    category: "Algorithms",
    difficulty: "intermediate",
    topicCount: 42,
  },
  {
    owner: "vercel",
    name: "next.js",
    fullName: "vercel/next.js",
    description: "The React Framework for the Web",
    stars: 130000,
    learners: 2934,
    estimatedHours: 20,
    language: "TypeScript",
    topics: ["React", "SSR", "web framework"],
    category: "Web Dev",
    difficulty: "intermediate",
    topicCount: 24,
  },
  {
    owner: "tailwindlabs",
    name: "tailwindcss",
    fullName: "tailwindlabs/tailwindcss",
    description: "A utility-first CSS framework for rapid UI development",
    stars: 86000,
    learners: 1563,
    estimatedHours: 10,
    language: "TypeScript",
    topics: ["CSS", "utility classes", "responsive design"],
    category: "Web Dev",
    difficulty: "beginner",
    topicCount: 15,
  },
  {
    owner: "jakevdp",
    name: "PythonDataScienceHandbook",
    fullName: "jakevdp/PythonDataScienceHandbook",
    description: "Python Data Science Handbook: full text in Jupyter Notebooks",
    stars: 43500,
    learners: 2187,
    estimatedHours: 22,
    language: "Python",
    topics: ["pandas", "numpy", "matplotlib", "scikit-learn"],
    category: "Data Science",
    difficulty: "beginner",
    topicCount: 28,
  },
  {
    owner: "donnemartin",
    name: "system-design-primer",
    fullName: "donnemartin/system-design-primer",
    description: "Learn how to design large-scale systems",
    stars: 284000,
    learners: 6723,
    estimatedHours: 35,
    language: "Python",
    topics: ["system design", "scalability", "distributed systems"],
    category: "Systems",
    difficulty: "advanced",
    topicCount: 40,
  },
  {
    owner: "practical-tutorials",
    name: "project-based-learning",
    fullName: "practical-tutorials/project-based-learning",
    description: "Curated list of project-based tutorials",
    stars: 210000,
    learners: 4589,
    estimatedHours: 40,
    language: "Multiple",
    topics: ["projects", "tutorials", "hands-on learning"],
    category: "Tools",
    difficulty: "beginner",
    topicCount: 30,
  },
  {
    owner: "pytorch",
    name: "pytorch",
    fullName: "pytorch/pytorch",
    description: "Tensors and dynamic neural networks with strong GPU acceleration",
    stars: 87000,
    learners: 1845,
    estimatedHours: 30,
    language: "Python",
    topics: ["deep learning", "tensors", "autograd"],
    category: "Machine Learning",
    difficulty: "advanced",
    topicCount: 32,
  },
  {
    owner: "fastapi",
    name: "fastapi",
    fullName: "fastapi/fastapi",
    description: "High performance web framework for building APIs with Python",
    stars: 82000,
    learners: 1234,
    estimatedHours: 12,
    language: "Python",
    topics: ["REST API", "async", "web framework"],
    category: "Web Dev",
    difficulty: "intermediate",
    topicCount: 16,
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
