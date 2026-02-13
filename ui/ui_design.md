Let me think through this from a cognitive and behavioral psychology perspective before writing the prompt...
Human Psychology & Learning Design Principles
Attention & Focus

Reduced cognitive load: Clean, uncluttered interface. One primary action per screen.
Progressive disclosure: Don't overwhelm. Show what's needed now, hide the rest.
Visual hierarchy: Bigger = more important. Guide the eye naturally.
White space: Brain needs breathing room to process information.

Motivation & Engagement

Progress visibility: Humans are motivated by seeing advancement (progress bars, checkmarks).
Immediate feedback: Every action gets a response (button states, animations).
Gamification: Streaks, badges, completion percentages trigger dopamine.
Social proof: "847 others learned this" = safety in numbers, FOMO.

Color Psychology for Learning

Blue (#2563EB): Trust, focus, calm - primary for learning content
Green (#10B981): Success, growth, completion - for progress/checkmarks
Yellow/Amber (#F59E0B): Warning, attention - for credits running low
Red (#EF4444): Error, urgency - use sparingly
Neutral grays (#F9FAFB, #1F2937): Background, text - reduces eye strain
Avoid: Too much black (harsh), too much white (glaring), neon colors (distracting)

Typography for Readability

Sans-serif for UI: Inter, SF Pro, or Geist (modern, clean, screen-optimized)
Monospace for code: JetBrains Mono, Fira Code (familiar to developers)
Font sizes:

Body text: 16px minimum (accessibility)
Headings: Clear hierarchy (48px → 36px → 24px → 18px)
Code: 14px (industry standard)


Line height: 1.5-1.7 for paragraphs (easier scanning)
Line length: 60-80 characters max (optimal reading)

Learning-Specific Design

Chunking: Break content into 3-5 item groups (working memory limit)
Dual coding: Text + visuals together (code + diagrams)
Spacing effect: Room between sections for mental processing
Active learning cues: Buttons like "Try it yourself" > passive reading
Familiar patterns: Don't reinvent UX - use what users know (GitHub-like navigation)

Behavioral Triggers

Scarcity: "37 credits left today" → urgency
Commitment: Checkboxes = micro-commitments → completion loop
Curiosity gap: "Next: Learn how attention actually works" → click through
Achievement: "🔥 7 day streak!" → don't break the chain


UI Design Prompt for Google Stitch
Design a modern, clean learning platform UI with the following specifications:

BRAND: GitGood - AI-powered learning platform for GitHub repositories
TARGET USERS: Developers aged 20-40, learning complex codebases
DESIGN PHILOSOPHY: Calm, focused learning environment with subtle gamification

═══════════════════════════════════════════════════════════════

COLOR PALETTE:
- Primary Blue: #2563EB (trust, focus) - CTAs, links, active states
- Success Green: #10B981 - progress bars, completed checkmarks, success messages
- Warning Amber: #F59E0B - credit warnings, attention states
- Error Red: #EF4444 - errors, limits reached (use sparingly)
- Neutral Background Light: #F9FAFB - page background
- Neutral Background Dark: #1F2937 - dark mode background
- Text Primary: #111827 - main content
- Text Secondary: #6B7280 - labels, metadata
- Border: #E5E7EB - subtle dividers
- Code Background: #F3F4F6 - code block backgrounds

TYPOGRAPHY:
- Primary Font: Inter (sans-serif) - all UI text
- Code Font: JetBrains Mono - all code snippets
- Base Size: 16px
- Heading Scale: 48px (h1) → 36px (h2) → 24px (h3) → 18px (h4)
- Line Height: 1.6 for body text, 1.3 for headings
- Font Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

SPACING SYSTEM:
Use 8px base grid: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, 96px

BORDER RADIUS:
- Buttons: 8px (friendly but not too round)
- Cards: 12px
- Modals: 16px
- Input fields: 6px

SHADOWS (subtle, layered):
- sm: 0 1px 2px rgba(0,0,0,0.05)
- md: 0 4px 6px rgba(0,0,0,0.07)
- lg: 0 10px 15px rgba(0,0,0,0.1)

═══════════════════════════════════════════════════════════════

PAGE 1: LANDING PAGE (Pre-Login)

Layout: Hero-centered, single column, scrollable

HEADER (sticky):
- Logo "GitGood" (left) - simple wordmark with gradient underline (blue to green)
- Navigation: [Browse Repos] [How It Works] [Pricing]
- CTA Button: "Start Learning" (primary blue, medium size, right aligned)
- Background: White with subtle gradient from #F9FAFB to pure white

HERO SECTION (above fold):
- Large heading (48px, bold): "Learn Anything on GitHub"
- Subheading (20px, medium weight, gray): "Turn any repository into a personalized AI course"
- Large input field (width: 600px, height: 56px):
  - Placeholder: "Paste any GitHub URL... (try: github.com/karpathy/micrograd)"
  - Gradient border on focus (blue to green)
  - Large primary button overlapping right side: "Start Learning →"
- Below input: Small text "✨ Free forever • No credit card • 847 developers learning"
- Hero illustration: Abstract representation of code transforming into organized learning path
  - Style: Minimal line art, blue/green gradient accents, floating gently

SOCIAL PROOF SECTION:
- 3 cards showing popular repos being learned:
  - Card style: White background, subtle shadow, 12px radius
  - Each card: Repo name, star count, "234 learning" text, small avatar stack of learners
  - Hover: Slight lift shadow animation

HOW IT WORKS (3 steps):
- Vertical timeline with numbered circles (1, 2, 3)
- Each step: Icon (left), heading, description (right)
- Icons: Simple, outlined style in primary blue
- Step 1: "📎 Paste a Repo" 
- Step 2: "🎯 AI Builds Your Path"
- Step 3: "🚀 Learn Interactively"

FOOTER (minimal):
- Links: [Terms] [Privacy] [Contact]
- Social: Twitter, GitHub icons
- Copyright text (small, gray)

═══════════════════════════════════════════════════════════════

PAGE 2: DASHBOARD (Post-Login)

Layout: Sidebar + main content, desktop-first

LEFT SIDEBAR (240px width, fixed):
- Logo + username at top with small avatar
- Navigation items (vertical):
  - 🏠 Dashboard (active state: light blue background)
  - 📚 My Learning
  - ⭐ Browse Curated
  - ⚙️ Settings
- Bottom: Credit counter card
  - "🔥 37/100 Credits"
  - Small progress ring visual
  - "Resets in 6h 23m" (small gray text)
  - "Upgrade" link (green)

MAIN CONTENT AREA:
- Top: Welcome message "Welcome back, [Name]! 👋" (24px)
- Stats row (3 cards, horizontal):
  - Card 1: "🎯 Topics Completed" - large number "47" with "+3 this week"
  - Card 2: "🔥 Learning Streak" - "12 days" with flame icon
  - Card 3: "⏱️ Time Invested" - "18.5 hours"
  - Each card: White, shadow, green accent on hover

"Continue Learning" section:
- Heading: "Pick up where you left off"
- Large card showing last accessed repo:
  - Repo name (bold, 20px)
  - Progress bar (green, shows 34% complete)
  - "Last topic: Understanding Backpropagation"
  - Large "Continue →" button (primary blue)
  - Thumbnail: Abstract visualization of repo structure

"Your Learning Paths" section:
- Grid of repo cards (3 columns, responsive):
  - Each card: 
    - Repo name + owner
    - Progress ring (circular, green)
    - "12 of 25 topics" text
    - Star count, language badge
    - Hover: Lift shadow, "View →" appears
  - Empty state card: Dashed border, "Start New Learning Path +"

═══════════════════════════════════════════════════════════════

PAGE 3: REPO ANALYSIS / ONBOARDING

Layout: Centered modal flow (stepped process)

STEP 1: Analyzing Repo
- Centered card (600px wide, white, large shadow)
- Animated spinner (blue gradient)
- Text: "Analyzing repository structure..."
- Progress text: "Reading files... 47/120"
- Small repo info at bottom: Name, stars, language

STEP 2: Size Classification
IF MASSIVE REPO:
- Warning icon (amber)
- Heading: "This is a large project (50K+ lines)"
- Description: "Learning this end-to-end would take 8+ weeks. Here are smaller related projects to start with:"
- 3 alternative repo cards:
  - Card: Repo name, description (truncated), stars, "Learn This Instead →" button
  - Style: Light background, border on hover
  
IF ACCEPTABLE SIZE:
- Checkmark icon (green)
- Heading: "Perfect! This repo is great for learning"
- Stats: "~1,200 lines • Estimated 2 weeks"
- "Next →" button

STEP 3: Personalization Questions (3 quick questions)
- Progress indicator at top: "Question 2 of 3" (dots: ○●○)
- Large question text (center): "What's your experience level?"
- 3 large option buttons (stacked):
  - "🌱 Novice - New to programming"
  - "💼 Intermediate - Some coding experience"
  - "🚀 Expert - Experienced developer"
- Each button: White, border, grows on hover, checkmark appears when selected
- "Next" button appears after selection (bottom right)

STEP 4: Generating Curriculum
- Centered animation: Code symbols flowing into organized blocks
- Text: "Creating your personalized learning path..."
- Sub-text: "This usually takes 10-15 seconds"
- Progress bar (indeterminate, blue gradient)

STEP 5: Ready!
- Success animation (confetti or checkmark burst)
- Heading: "Your learning path is ready! 🎉"
- Quick stats: "18 topics to master • ~2 weeks at 1hr/day"
- Large "Start Learning →" button
- Small link: "Preview curriculum first"

═══════════════════════════════════════════════════════════════

PAGE 4: LEARNING INTERFACE (Main Experience)

Layout: Three-panel layout (desktop), responsive stacking (mobile)

LEFT PANEL - Curriculum Tree (300px, scrollable, collapsible):
- Header: Repo name + overall progress (34%)
- Filters/sorts (small, top):
  - Toggle: "Show only incomplete"
  - Dropdown: "Sort by: Recommended"
- Accordion/tree structure:
  - Category level: Bold, 18px, collapse/expand arrow
    - "1. Foundation Concepts" (badge: 2/5 complete)
  - Topic level: Regular weight, 16px, indent 16px
    - Checkbox (green when complete)
    - "Understanding Backpropagation"
    - Difficulty badge: 🟢 Easy | 🟡 Medium | 🔴 Hard
    - Time estimate: "~25 min"
    - Lock icon if prerequisites incomplete
  - Active topic: Light blue background highlight
- Bottom: Collapse button (←)

CENTER PANEL - Content Display (flexible width):
- Breadcrumb navigation (top, small):
  - "Home > Foundation > Backpropagation"
- Topic heading (32px, bold)
- Metadata row: Difficulty, time, "2,847 learned this"
- Content area (max-width: 700px for readability):
  - Markdown-rendered explanation
  - Code blocks: Gray background, syntax highlighted, "View on GitHub" link
  - Inline diagrams/visualizations where helpful
  - Generous line spacing (1.6)
  - Margins between sections (32px)
- Bottom action row:
  - "📝 Add Note" button (outlined, gray)
  - "⭐ Bookmark" button
  - "✓ Mark Complete" button (primary green, large)
- Footer navigation:
  - "← Previous: Variables" (left)
  - "Next: Training Loop →" (right, primary blue)

RIGHT PANEL - AI Assistant (350px, collapsible):
- Header: "AI Tutor" with credit counter "37/100"
- Chat interface:
  - Messages: Speech bubble style
    - User: Right-aligned, blue background
    - AI: Left-aligned, light gray background
  - Timestamps (subtle, small)
  - Code blocks in messages: Syntax highlighted
- Quick action chips (above input):
  - "📝 Quiz me" • "💡 ELI5" • "🔍 Example" • "💪 Challenge"
  - Each costs credits (shown on hover)
- Input field (bottom):
  - Multiline textarea
  - Placeholder: "Ask anything about this topic..."
  - Send button (blue)
  - Character/token counter (subtle)
- Collapsed state: Just a "Ask AI 💬" button (right edge)

MOBILE ADAPTATION:
- Single column, tabs for panels:
  - Bottom nav: [Curriculum] [Content] [AI Chat]
  - Swipe between or tap tabs
  - Sticky "Mark Complete" button at bottom

═══════════════════════════════════════════════════════════════

PAGE 5: QUIZ MODAL

Overlay modal (centered, 600px wide):
- Header: "Knowledge Check: Backpropagation"
- Progress: "Question 2 of 5" (dots: ●●○○○)
- Question text (20px, medium): "What is the chain rule used for?"
- 4 answer options (radio buttons):
  - Large click targets (full width)
  - Letter labels (A, B, C, D)
  - Light background, border, hover state
  - Selected: Blue border, blue background (10% opacity)
- "Submit Answer" button (bottom, full width, primary blue)
- After submission:
  - Correct: Green background flash, checkmark, explanation
  - Incorrect: Red background flash, show correct answer, explanation
  - "Next Question →" button

Final screen:
- Score: "4/5 Correct! 🎉" (large, centered)
- Review wrong answers: List with explanations
- "Retake Quiz" (outlined) | "Continue Learning" (primary) buttons

═══════════════════════════════════════════════════════════════

PAGE 6: BROWSE CURATED REPOS

Layout: Grid with filters

TOP:
- Heading: "Curated Learning Paths"
- Subheading: "Expertly reviewed courses from the best GitHub repos"
- Search bar: "Search topics, languages, repos..."
- Filter chips: [All] [Machine Learning] [Web Dev] [Algorithms] [Data Science]
  - Active filter: Blue background
  - Others: Light gray, border

GRID (3 columns, responsive):
Each repo card (larger than dashboard cards):
- Thumbnail: Abstract repo visualization or topic icon
- "✨ Curated" badge (top right, green)
- Repo name (bold, 20px)
- One-line description
- Metadata row: ⭐ stars, 👥 learners, ⏱️ time estimate
- Tech stack badges: Small pills showing languages/frameworks
- Progress if started: Small progress ring
- Hover: Shadow lift, "Start Learning →" button appears
- Rating: ⭐⭐⭐⭐⭐ 4.7 (847 ratings)

EMPTY STATE (if no results):
- Illustration: Magnifying glass searching
- Text: "No repos found. Try different filters."
- "Request a repo" link

═══════════════════════════════════════════════════════════════

PAGE 7: SETTINGS

Layout: Two-column (sidebar nav + content area)

LEFT NAV (200px):
- Section links:
  - Profile
  - Preferences
  - Credits & Billing
  - Notifications
  - Connected Accounts
  - Data & Privacy

CONTENT AREA (Profile selected):
- Section heading (24px): "Profile"
- Avatar upload:
  - Circular preview (120px)
  - "Change Photo" button
- Form fields (stacked):
  - Name (from GitHub, editable)
  - Email (from GitHub, grayed out)
  - Bio (textarea)
  - Location (optional)
- "Save Changes" button (primary blue)

PREFERENCES:
- Learning preferences:
  - Explanation style: [Beginner] [Intermediate] [Expert] (toggle group)
  - Default session length: Slider (15-120 min)
  - Daily reminder: Toggle switch
- UI preferences:
  - Theme: [Light] [Dark] [Auto] (toggle group)
  - Compact mode: Toggle
  - Show keyboard shortcuts: Toggle

CREDITS & BILLING:
- Current plan card:
  - "Explorer (Free)" or "Pro ($5/month)"
  - Usage: "37/100 credits today"
  - Bar chart: Last 7 days usage
- Upgrade card (if free):
  - "Upgrade to Pro" heading
  - Benefits list with checkmarks
  - "$5/month" price
  - "Upgrade Now" button (green)
- Billing history (if paid):
  - Table: Date, Amount, Receipt

═══════════════════════════════════════════════════════════════

COMPONENTS TO DESIGN:

1. BUTTONS:
   - Primary: Blue background, white text, 8px radius, medium shadow
   - Secondary: White background, blue text, blue border
   - Outlined: Transparent, gray border, gray text
   - Danger: Red background (use sparingly)
   - Sizes: sm (32px), md (40px), lg (48px) height
   - States: Hover (slightly darker), Active (pressed), Disabled (50% opacity, cursor not-allowed)
   - Loading: Spinner inside button, text fades

2. PROGRESS INDICATORS:
   - Linear bar: 8px height, rounded ends, green fill, light gray background
   - Circular ring: Donut chart style, green stroke, percentage in center
   - Streak flame: Animated fire emoji with number overlay

3. BADGES:
   - Difficulty: Colored dot + text (🟢 Easy, 🟡 Medium, 🔴 Hard)
   - Language: Small pill, gray background, icon + text
   - Status: "✨ Curated", "🔥 Popular", "🆕 New"

4. CARDS:
   - Default: White background, subtle shadow, 12px radius
   - Hover: Lift shadow (larger), subtle scale (1.02)
   - Active/Selected: Blue border (2px)

5. MODALS:
   - Overlay: Dark background, 40% opacity
   - Modal: White, centered, 16px radius, large shadow
   - Close: X button (top right) or "Cancel" button

6. TOASTS/NOTIFICATIONS:
   - Success: Green left border, checkmark icon, white background
   - Error: Red left border, X icon
   - Info: Blue left border, i icon
   - Warning: Amber left border, ! icon
   - Position: Top right, stack vertically, auto-dismiss 5s

7. CODE BLOCKS:
   - Background: #F3F4F6 (light gray)
   - Padding: 16px
   - Border radius: 8px
   - Font: JetBrains Mono, 14px
   - Line numbers: Optional, gray
   - Syntax highlighting: VS Code Dark+ theme colors
   - Copy button: Top right corner, appears on hover

8. EMPTY STATES:
   - Illustration: Simple, friendly, 200px height
   - Heading: What's missing
   - Description: Why it's empty
   - CTA: Action to fill it

═══════════════════════════════════════════════════════════════

ANIMATIONS (subtle, purposeful):
- Page transitions: Fade in (200ms)
- Button hover: Scale 1.02, shadow increase (150ms ease-out)
- Card hover: Lift 4px, shadow increase (200ms)
- Progress bar fill: Smooth width transition (300ms)
- Modal open: Scale from 0.95 to 1 + fade in (250ms)
- Toast slide in: From right, 300ms ease-out
- Checkmark complete: Scale bounce effect
- Loading spinner: Smooth rotation, gradient trail

ACCESSIBILITY:
- Focus states: 2px blue outline offset 2px
- Skip to content link (keyboard users)
- ARIA labels on all icons
- Color contrast: WCAG AA minimum (4.5:1 text, 3:1 UI)
- Keyboard navigation: Tab order logical
- Screen reader text for icons
- Reduced motion: Respect prefers-reduced-motion

RESPONSIVE BREAKPOINTS:
- Mobile: <640px (single column, stacked)
- Tablet: 640-1024px (2 columns where possible)
- Desktop: 1024-1440px (3 columns, sidebars)
- Large: >1440px (max-width container, centered)

DARK MODE (Optional, Future):
- Background: #1F2937 → #111827
- Cards: #374151
- Text: #F9FAFB
- Borders: #4B5563
- Keep blue/green accents vibrant