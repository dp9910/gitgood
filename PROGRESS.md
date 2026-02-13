# GitGood - Build Progress Tracker

## Build Order & Dependencies

```
#11 Scaffold project + env validation
 ├── #12 Firebase Auth + GitHub OAuth
 │    ├── #13 Server-side rate limiting (Upstash Redis)
 │    ├── #14 GitHub API wrapper
 │    │    ├── #15 Cache-first curriculum retrieval
 │    │    └── #17 Repo analysis & size classification
 │    └─────────────────────────────────────────────┐
 ├── #16 Landing page + URL validation              │
 │    └── #18 Proficiency assessment modal           │
 │                                                   │
 #19 AI curriculum generation ← [#13, #17, #18]     │
 #20 Curriculum storage & sync ← [#15, #19]         │
 #21 Curriculum display UI ← [#20]                   │
 ├── #22 Three-panel learning interface              │
 │    ├── #23 Content delivery (multi-level)         │
 │    ├── #24 AI tutor chat ← [#22, #13]            │
 │    ├── #25 Quiz & challenges ← [#23, #24]        │
 │    └── #27 Notes & bookmarks ← [#22, #26]        │
 ├── #26 Progress tracking + GitHub sync             │
 ├── #28 Dashboard + streaks ← [#26]                 │
 ├── #29 Browse curated repos ← [#15, #21]          │
 ├── #30 Settings & profile ← [#12, #28]            │
 ├── #31 Onboarding flow ← [#18, #21]               │
 ├── #32 Error handling & sanitization ← [#24, #16] │
 ├── #33 Mobile + accessibility ← [#22, #28]        │
 └── #34 Security audit + deployment ← [#32, #33]
```

---

## Completed

### #11 - Scaffold project + env validation
- **Status:** DONE
- **Files:**
  - `app/.env.example` - All 10 required env vars documented
  - `app/.gitignore` - Hardened, .env.local never committed
  - `app/next.config.ts` - Security headers (X-Frame-Options, nosniff, referrer policy, permissions policy)
  - `app/vitest.config.ts` - Test runner config with path aliases
  - `app/src/lib/env.ts` - Zod validation, crashes on missing/empty vars
  - `app/src/app/layout.tsx` - Root layout with Inter + JetBrains Mono fonts
  - `app/src/app/page.tsx` - Minimal landing page placeholder
  - `app/src/app/globals.css` - Tailwind + custom theme variables
- **Tests:** `env.test.ts` - 15 tests (server/client validation, security checks)

### #12 - Firebase Auth + GitHub OAuth
- **Status:** DONE
- **Files:**
  - `app/src/lib/firebase-client.ts` - Client-side: GitHub OAuth popup, sign-in/out, auth listener
  - `app/src/lib/firebase-admin.ts` - Server-side: Admin SDK init, token verification
  - `app/src/lib/auth-context.tsx` - React context: user state, loading, login/logout
  - `app/src/lib/auth-middleware.ts` - Server middleware: verifySession(), requireAuth()
  - `app/src/app/api/auth/session/route.ts` - POST (create session cookie), DELETE (clear cookie)
  - `app/src/app/api/protected/route.ts` - Example protected endpoint
- **Tests:** `auth-context.test.tsx` (5), `auth-middleware.test.ts` (8), `auth-session-route.test.ts` (6)

### #13 - Server-side rate limiting (Upstash Redis)
- **Status:** DONE
- **Files:**
  - `app/src/lib/redis.ts` - Singleton Upstash Redis client
  - `app/src/lib/rate-limit.ts` - 3-layer rate limiting (IP, cooldown, user daily), credit tracking
- **Constants:** 100 req/user/day, 500 req/IP/day, 3s cooldown, 4000 max input tokens
- **Tests:** `rate-limit.test.ts` - 28 tests

### #14 - GitHub API wrapper
- **Status:** DONE
- **Files:**
  - `app/src/lib/github.ts` - parseRepoUrl(), fetchRepoMetadata(), fetchFileTree(), fetchFileContent(), createRepo(), commitFile()
- **Features:** Multi-format URL parsing, rate limit header extraction, content truncation, user vs cache token support
- **Tests:** `github.test.ts` - 19 tests

---

### #15 - Cache-first curriculum retrieval
- **Status:** DONE
- **Files:**
  - `app/src/lib/curriculum-cache.ts` - checkCache(), saveToCache(), incrementCacheUsage(), cloneToUserRepo(), buildCacheKey()
- **Features:** Cache hit/miss detection, parallel JSON fetch, usage counter increment, clone curriculum to user's learning-tracker repo
- **Tests:** `curriculum-cache.test.ts` - 10 tests

### #16 - Landing page + URL validation
- **Status:** DONE
- **Files:**
  - `app/src/app/page.tsx` - Full landing page with hero, URL input, validation, examples, How It Works, CTA, footer
  - `app/src/app/layout.tsx` - Added Material Icons link
  - `app/src/__tests__/setup.ts` - Added cleanup() for React Testing Library
- **Features:** URL validation with inline errors, example repo buttons, loading state, responsive header/footer, How It Works section
- **Tests:** `landing-page.test.tsx` - 11 tests

### #17 - Repo analysis & size classification
- **Status:** DONE
- **Files:**
  - `app/src/lib/repo-analysis.ts` - classifyRepoSize(), detectRepoType(), selectFilesToFetch(), findAlternatives(), analyzeRepo()
- **Features:** 4-tier size classification (small/medium/large/massive), repo type detection (tutorial/library/application/research/tool), smart file selection strategy, alternative repo suggestions for massive repos
- **Tests:** `repo-analysis.test.ts` - 27 tests

---

## Up Next (Unblocked)

### #18 - Proficiency assessment modal
- **Status:** TODO
- **Depends on:** #16 ✅
- **Scope:** 3-question modal (experience level, learning goal, time commitment), store preferences in session.

### #19 - AI curriculum generation
- **Status:** TODO
- **Depends on:** #13 ✅, #17 ✅, #18
- **Scope:** Gemini API integration, repo type detection, structured curriculum JSON generation, prompt engineering, schema validation.

---

## Blocked (Waiting on Dependencies)

### #20 - Curriculum storage & sync
- **Status:** TODO
- **Depends on:** #15, #19
- **Scope:** Save curriculum to user's learning-tracker repo AND central cache. Create progress.json, metadata.json, notes.md. Multi-level explanations + quizzes.

### #21 - Curriculum display UI
- **Status:** TODO
- **Depends on:** #20
- **Scope:** Interactive tree/accordion, category cards, topic badges (difficulty, time, completion), filters, "next recommended" highlight.

### #22 - Three-panel learning interface
- **Status:** TODO
- **Depends on:** #21
- **Scope:** Left (curriculum tree 25%), Center (content 50%), Right (AI chat 25%). Breadcrumbs, keyboard shortcuts, smooth transitions. Match Stitch mockup.

### #23 - Content delivery (multi-level)
- **Status:** TODO
- **Depends on:** #22
- **Scope:** Fetch explanations by proficiency level (beginner/intermediate/expert). Markdown rendering, syntax highlighting, inline GitHub links, "Explain more" button.

### #24 - AI tutor chat
- **Status:** TODO
- **Depends on:** #22, #13 ✅
- **Scope:** Chat panel with history, credit counter, quick actions (Quiz me, ELI5, Show example, Challenge me), 3s cooldown, context-aware prompts.

### #25 - Quiz & challenges
- **Status:** TODO
- **Depends on:** #23, #24
- **Scope:** Cached quiz fetching, AI-generated quizzes, multiple choice modal, code challenges with editor, scoring, results saved to GitHub.

### #26 - Progress tracking + GitHub sync
- **Status:** TODO
- **Depends on:** #22
- **Scope:** In-memory state updates, batch commits every 5 min, localStorage queue for offline, retry mechanism, toast notifications.

### #27 - Notes & bookmarks
- **Status:** TODO
- **Depends on:** #22, #26
- **Scope:** Inline note editor (markdown), bookmarks with code snippets + GitHub links, search across all notes/bookmarks, dedicated bookmarks view.

### #28 - Dashboard + streaks
- **Status:** TODO
- **Depends on:** #26
- **Scope:** Active learning cards (progress %, last accessed, time remaining), stats, GitHub-style heatmap, "Continue Learning", recommended next repos. Match Stitch mockup.

### #29 - Browse curated repos
- **Status:** TODO
- **Depends on:** #15, #21
- **Scope:** Grid of pre-seeded repos, search + filter chips, star/learner counts, progress indicators. Match Stitch mockup.

### #30 - Settings & profile
- **Status:** TODO
- **Depends on:** #12 ✅, #28
- **Scope:** Profile info, avatar, learning preferences (experience level, learning mode), credits/billing summary. Match Stitch mockup.

### #31 - Onboarding flow
- **Status:** TODO
- **Depends on:** #18, #21
- **Scope:** First-time user detection, welcome modal (3 steps), interactive tutorial tooltips, pro tip dismissibles.

### #32 - Error handling & sanitization
- **Status:** TODO
- **Depends on:** #24, #16
- **Scope:** Invalid URL, private repo, no README, unsupported language, malformed AI JSON, GitHub 404, network errors, content moderation.

### #33 - Mobile + accessibility
- **Status:** TODO
- **Depends on:** #22, #28
- **Scope:** Mobile breakpoints (<768px single panel), touch gestures, WCAG 2.1 AA, screen reader support, keyboard nav, color contrast.

### #34 - Security audit + deployment
- **Status:** TODO
- **Depends on:** #32, #33
- **Scope:** Full security review, Vercel deployment, Firebase OAuth config, env vars in Vercel dashboard, custom domain setup, analytics, error monitoring.

---

## Test Summary

| Test File | Tests | Status |
|-----------|-------|--------|
| env.test.ts | 15 | ✅ Pass |
| auth-context.test.tsx | 5 | ✅ Pass |
| auth-middleware.test.ts | 8 | ✅ Pass |
| auth-session-route.test.ts | 6 | ✅ Pass |
| rate-limit.test.ts | 28 | ✅ Pass |
| github.test.ts | 19 | ✅ Pass |
| curriculum-cache.test.ts | 10 | ✅ Pass |
| repo-analysis.test.ts | 27 | ✅ Pass |
| landing-page.test.tsx | 11 | ✅ Pass |
| **Total** | **118** | **✅ All passing** |

---

## Tech Stack

- **Framework:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS 4, Inter + JetBrains Mono fonts
- **Auth:** Firebase Auth (GitHub OAuth), httpOnly session cookies
- **AI:** Google Gemini API (server-side only)
- **GitHub:** Octokit (repo analysis, user progress storage, curriculum cache)
- **Rate Limiting:** Upstash Redis (3-layer: IP, cooldown, user daily)
- **Validation:** Zod schemas for env vars and inputs
- **Testing:** Vitest + Testing Library (jsdom)
- **Deploy:** Vercel (planned)

## UI Mockups Available

Located in `/ui/stitch (1-6)/` — Google Stitch HTML prototypes:
1. Dashboard page
2. Repo analysis processing modal
3. Three-panel learning interface
4. Quiz modal
5. Browse curated repos
6. Settings & profile page
