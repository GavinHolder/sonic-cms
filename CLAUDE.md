# CLAUDE.md

> ⚠️ **WHITE-LABEL CMS — Generic business website CMS.**
> This project was forked from `sonic-website` (a South African ISP) and stripped of all ISP-specific references.
> The source project at `D:\Projects\2026\sonic-website` must NEVER be modified from here.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## MCP Servers

### Figma MCP Server

This project uses the Figma MCP server at `https://mcp.figma.com/mcp`.

**Rules:**
- If the Figma MCP returns a localhost source for an image or SVG, use that source directly — do NOT create placeholders
- Do NOT import new icon packages; use assets from the Figma payload
- Always run `get_design_context` first, then `get_screenshot` before implementing any design
- Translate Figma output into this project's conventions: Bootstrap 5 classes, existing components, brand tokens
- Strive for 1:1 visual parity with the Figma design

**Skills:** Use `figma:implement-design`, `figma:code-connect-components`, `figma:create-design-system-rules`

---

## Skills (ai-engineer library)

This project uses skills from [GavinHolder/ai-engineer](https://github.com/GavinHolder/ai-engineer).
Follow these skills **to the letter** for all development work:

| Skill | When to use |
|-------|-------------|
| `bootstrap-5` | ALL Bootstrap UI work — components, grid, utilities |
| `react-19` | ALL React component development |
| `html5` | ALL HTML structure work |
| `css3` | ALL CSS/styling work |
| `javascript-es2025` | ALL JavaScript code |
| `frontend-aesthetics` | UI design quality, animations |
| `modern-ui-ux` | Landing pages, immersive design |
| `visual-debugging` | Screenshot & inspect UI issues via Playwright |

---

## ⚡ MANDATORY: Feature Confirmation → Docs + Commit Workflow

**Every time the user confirms a feature is working**, you MUST:

### 1. Update `lib/admin/docs-content.ts` (in-app docs portal at `/admin/documents`)

Update the relevant topic constant to reflect all changes from this session:

| Feature changed | Topic constant to update |
|----------------|--------------------------|
| Section Into (shapes, image fill, hover) | `TAB_TRIANGLE` |
| New FLEXIBLE block type | `FLEXIBLE_ELEMENTS` + `SECTION_TYPES` |
| Animated background type | `TAB_ANIMATION` + matching `ANIM_*` |
| Page types (designer/pdf/form) | `PAGES_SYSTEM` |
| Hero carousel | `HERO_CAROUSEL` |
| Section spacing/padding | `TAB_SPACING` |

Rules:
- Update counts (e.g. "10 element types" → "11")
- Rename old terminology (e.g. "Triangle Overlay" → "Section Into")
- Add new settings tables for new options
- If whole new feature: create new `const TOPIC = \`...\`` and wire into navigation tree

### 2. Commit to git

Stage all modified files (components + types + lib + docs-content.ts + docs/*.md) and commit with a descriptive message:
```
feat: [short description]
fix: [short description]
```

Do NOT push unless the user explicitly asks.

---

## Project Overview

Sonic Website is a Next.js 16 website for a South African ISP (Internet Service Provider) based in the Overberg region. The project uses the App Router architecture with React 19, TypeScript, and Tailwind CSS v4.

## Development Commands

```bash
# Development server (runs on http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint

# Database commands
npx prisma migrate dev --name <description>  # Create and apply migration
npx prisma migrate reset                      # Reset database (WARNING: deletes all data)
npx prisma generate                           # Regenerate Prisma Client after schema changes
npx prisma studio                             # Open database browser at localhost:5555
npm run db:seed                               # Seed database with admin user and sample data
```

## Admin Access

- **Admin URL:** http://localhost:3000/admin/login
- **Default Username:** `admin`
- **Default Password:** `sonic2026`
- **Role:** SUPER_ADMIN (created by seed script)

## Documentation Management

**CRITICAL:** All documentation files MUST be stored in the `docs/` folder to keep the project root clean.

### Rules for Documentation

**Files that MUST stay in root:**
- `README.md` - Main project readme
- `CLAUDE.md` - This file (Claude Code configuration)
- `.env.example` - Environment variable template

**All other documentation goes in `docs/`:**
- ✅ All `.md` files (except README.md and CLAUDE.md)
- ✅ All `.txt` files
- ✅ All documentation, guides, specs, plans, status reports

### Creating New Documentation

**ALWAYS follow this process when creating documentation:**

1. **Create in docs folder:**
   ```bash
   # Good
   docs/NEW_FEATURE_GUIDE.md

   # Bad
   NEW_FEATURE_GUIDE.md
   ```

2. **Update the index:**
   - Open `docs/INDEX.md`
   - Add entry to appropriate category table
   - Update file count
   - Add to "All Files" alphabetical list
   - Update "Last Updated" date

3. **Use descriptive names:**
   - Use UPPERCASE for major docs (e.g., `API_GUIDE.md`)
   - Be specific (e.g., `DATABASE_MIGRATIONS.md` not `DB.md`)
   - Include dates for status docs if needed (e.g., `STATUS_2026-01.md`)

### Documentation Index

The `docs/INDEX.md` file provides:
- Categorized file listing
- Quick navigation by task
- File descriptions and update dates
- Complete alphabetical index

**Always keep INDEX.md current** when adding, removing, or updating documentation.

### Git Exclusion

The `docs/` folder is excluded from git commits (see `.gitignore`). Documentation is for local development reference only.

---

## Adversarial Vibe Coding (Project-Specific)

**This project uses a senior engineering peer methodology for code quality.**

### Core Philosophy

Claude should act as a **senior engineering peer**, not a helpful assistant. This means:
- Challenge assumptions BEFORE writing code
- Hunt for edge cases and failure modes
- Demand evidence for architectural decisions
- Question requirements ("Why JWT over sessions?")
- Think adversarially ("How would I break this?")

**Read:** `.claude/rules/adversarial-override.md` for full methodology

---

### Risk-Based Workflows

All features are automatically classified into 4 risk levels:

**Level 1: LOW RISK** (Documentation, simple UI components)
- Workflow: Code → Optional review → Commit
- No adversarial review needed
- Examples: CSS changes, UI components, documentation updates

**Level 2: MEDIUM RISK** (New features, CRUD operations)
- Workflow: /plan → Code → /code-review → Commit
- Standard code review
- Examples: Section components, admin UI, API endpoints (non-auth)

**Level 3: HIGH RISK** (Authentication, file uploads, database migrations)
- Workflow: /plan → **/adversarial-review** → TDD → /security-review → /code-review → Commit
- **MANDATORY multi-perspective validation**
- Examples: Authentication, file uploads, database migrations, publishing workflow
- See: `.claude/rules/risk-classification.md` for auto-detection rules

**Level 4: CRITICAL RISK** (Not applicable to this project)
- No financial transactions or payment processing in Sonic Website

---

### Mandatory Documentation (Level 3+)

For ALL Level 3 features, the following documentation is REQUIRED:

**1. Assumption Documentation** (functions >20 lines)
- Template: `.claude/templates/assumption-documentation.md`
- What must be true for this code to work?
- What failure modes exist?
- How do we validate assumptions at runtime?

**2. Failure Mode Analysis**
- Template: `.claude/templates/failure-mode-analysis.md`
- What could break and why?
- What's the impact and mitigation?
- How do we detect failures?

**3. Edge Case Matrix**
- Template: `.claude/templates/edge-case-matrix.md`
- Boundary conditions for all inputs
- Test cases for each edge case
- Expected behavior documented

**4. Decision Rationale**
- Template: `.claude/templates/decision-rationale.md`
- Why this approach over alternatives?
- Evidence supporting the decision
- Trade-offs accepted

**5. System Invariants**
- Template: `.claude/templates/invariants-checklist.md`
- Conditions that MUST ALWAYS be true
- How to verify and enforce invariants

---

### High-Risk Areas (Auto-Detected)

**Claude will automatically invoke /adversarial-review for:**

**File Paths:**
- `lib/auth.ts` - Authentication utilities
- `lib/api-middleware.ts` - Authorization middleware
- `app/api/auth/**` - Login, logout, token refresh
- `app/api/media/upload/**` - File upload handling
- `app/api/pages/**/publish/**` - Publishing workflow
- `prisma/schema.prisma` - Database schema changes
- `prisma/migrations/**` - Database migrations

**Keywords in User Request:**
- "auth", "login", "jwt", "token", "password", "session"
- "upload", "file", "image", "media"
- "publish", "deploy", "release"
- "role", "permission", "authorization"
- "migrate", "schema", "database", "sql"

**Operations:**
- CREATE/UPDATE/DELETE on User, Role, Media tables
- Raw SQL (`$executeRaw`, `$queryRaw`)
- File system operations (write, delete, move)
- Session management (create, validate, destroy)

---

### Multi-Perspective Validation

**For Level 3+ features, /adversarial-review launches 6 parallel agents:**

1. **Security Expert** (Opus) - OWASP Top 10, attack vectors, vulnerabilities
2. **React Reviewer** (Sonnet) - Server/Client Components, performance, TypeScript, Next.js patterns
3. **Skeptic** (Sonnet) - Challenge assumptions, devil's advocate, "why not X?"
4. **Architect** (Sonnet) - Next.js/React patterns, best practices alignment
5. **Consistency Reviewer** (Sonnet) - Match existing Sonic codebase style
6. **Redundancy Checker** (Sonnet) - Detect over-engineering, code duplication

**Consensus Requirements:**
- **Level 3:** 4/6 agents must approve (strong consensus)
- **Level 4:** 6/6 agents must approve (full consensus)
- **Blocking:** Any CRITICAL security issue or React anti-pattern stops implementation

**Agent Definitions:**
- Orchestrator: `.claude/agents/adversarial-reviewer.md`
- React Review: `.claude/agents/react-reviewer.md`
- Security: `.claude/agents/security-expert.md`
- Skeptic: `.claude/agents/skeptic.md`
- Architecture: `.claude/agents/architect.md`
- Consistency: `.claude/agents/consistency-reviewer.md`

---

### Communication Style Changes

**Before (Helpful Assistant):**
- "I'll implement the authentication system for you."
- "Tests pass, feature complete."
- "Here's the file upload endpoint."

**After (Senior Engineering Peer):**
- "Before implementing authentication, let me challenge some assumptions:
   - Why JWT over sessions? (Evidence: Next.js patterns, scaling concerns)
   - What if JWT_SECRET is leaked? (Failure mode: rotate secret, invalidate tokens)
   - What if token expires mid-request? (Edge case: handle gracefully)
   - Why 15-min expiry? (Evidence: industry standard, UX balance)

   Here are 3 approaches with trade-offs: [JWT, Sessions, Magic Links]
   Proceed with JWT?"

- "Tests pass (80% coverage), but I've identified untested edge cases:
   - [ ] Null password (currently throws TypeError)
   - [ ] Concurrent logins (race condition on token generation)
   - [ ] 1000-char password (potential DoS)

   Invariants verified:
   - ✅ User always has role
   - ✅ JWT_SECRET never exposed

   Known unknowns:
   - ⚠️ No rate limiting (brute force vulnerable)"

**See:** `.claude/rules/communication-style.md` for detailed guidelines

---

### Current Critical Issues

**Identified by adversarial analysis (needs immediate fix):**

1. **Hardcoded JWT fallback secrets** (`lib/auth.ts:13-14`)
   - Severity: CRITICAL
   - Impact: Production security breach if JWT_SECRET not set
   - Fix: Fail fast if JWT_SECRET not set (no fallback)
   - Status: **PENDING FIX**

2. **Zero test coverage**
   - Severity: HIGH
   - Impact: Edge cases untested, regressions undetected
   - Fix: Implement TDD workflow, target 80%+ coverage
   - Status: **PENDING IMPLEMENTATION**

3. **Raw SQL without validation** (`app/api/pages/[slug]/publish/route.ts:47`)
   - Severity: MEDIUM
   - Impact: Potential SQL injection if input not validated
   - Fix: Use Prisma transaction instead of raw SQL
   - Status: **PENDING REFACTOR**

4. **No failure mode documentation**
   - Severity: MEDIUM
   - Impact: Unknown edge cases in production, no mitigation strategy
   - Fix: Document all Level 3 features using templates
   - Status: **PENDING DOCUMENTATION**

---

### React Engineering Standard (PRIMARY)

**This project uses top-notch React/Next.js engineering standards.**

**Read:** `.claude/rules/react-engineering-standard.md` - **MANDATORY for all React development**

**Key Principles:**
- **Server Components First** - Only use "use client" when absolutely necessary
- **Async Server Components** - Fetch data directly, no useEffect/useState
- **next/image Always** - Never use <img> tags
- **TypeScript Strict** - No any types without justification
- **Performance First** - Optimize from day one
- **Accessible by Default** - Semantic HTML, ARIA labels, keyboard navigation

**Automatic React Review:**
- Every React component is automatically reviewed for Server/Client usage
- Images must use next/image (blocking issue if not)
- TypeScript strictness enforced (any types rejected)
- Performance anti-patterns flagged (unnecessary memoization, large bundles)
- Accessibility violations caught (div onClick, missing alt text)

---

### Quick Reference

**Rules Location:** `.claude/rules/`
- **React Engineering Standard:** `.claude/rules/react-engineering-standard.md` ⭐ **PRIMARY**
- Adversarial Overview: `.claude/rules/adversarial-override.md`
- Risk Classification: `.claude/rules/risk-classification.md`
- Communication Style: `.claude/rules/communication-style.md`

**Templates Location:** `.claude/templates/`
- Assumptions: `.claude/templates/assumption-documentation.md`
- Failure Modes: `.claude/templates/failure-mode-analysis.md`
- Edge Cases: `.claude/templates/edge-case-matrix.md`
- Decisions: `.claude/templates/decision-rationale.md`
- Invariants: `.claude/templates/invariants-checklist.md`

**Agents Location:** `.claude/agents/`
- Adversarial Reviewer: `.claude/agents/adversarial-reviewer.md` (orchestrator)
- Security Expert: `.claude/agents/security-expert.md`
- Skeptic: `.claude/agents/skeptic.md`
- Architect: `.claude/agents/architect.md`
- Consistency Reviewer: `.claude/agents/consistency-reviewer.md`

**Example Invocation:**
```bash
# Automatic for Level 3 features
User: "Add authentication endpoint for admin login"
Assistant: "This is Level 3 (HIGH RISK). Invoking /adversarial-review..."

# Manual invocation
User: "/adversarial-review lib/auth.ts"
```

---

## Architecture & Structure

### Next.js App Router

The project uses Next.js App Router (not Pages Router):
- `app/` directory contains all routes and layouts
- `app/layout.tsx` is the root layout with Header/Footer components
- `app/page.tsx` is the homepage
- Route pages: `app/coverage/page.tsx`, `app/support/page.tsx`, `app/services/page.tsx`, `app/equipment/page.tsx`, `app/client-login/page.tsx`

### Component Organization

- `components/` contains shared React components used across pages
- All components are TypeScript (.tsx)
- Client components use `"use client"` directive (e.g., Header.tsx for interactivity)
- Server components are the default (no directive needed)

### Admin UI Components

**Toast Notifications:**
- `components/admin/ToastProvider.tsx` wraps admin layout
- Use hook: `const toast = useToast();`
- Methods: `toast.success()`, `toast.error()`, `toast.info()`, `toast.warning()`
- All admin save operations should show toast feedback

**Other Admin Components:**
- `TabPanel.tsx` - Organize settings into tabs (pills/underline/boxed variants)
- `HelpText.tsx` - Contextual help (info/warning/tip variants, collapsible)
- `InfoCard.tsx` - Stat cards with trends (primary/success/warning/danger/info)
- `SpacingControls.tsx` - Dual slider + number input for spacing (0-200px)

### Styling

- **Tailwind CSS v4** with standard configuration (`tailwind.config.ts`)
- **HeroUI (NextUI)** component library for modern, accessible UI components
- Tailwind directives in `app/globals.css` (@tailwind base, components, utilities)
- HeroUI theme configured in `tailwind.config.ts` with custom colors
- HeroUIProvider wraps the application in `app/providers.tsx`
- Custom CSS variables defined in `globals.css` for theming
- Uses Geist Sans and Geist Mono fonts from `next/font/google`

### TypeScript Configuration

- Path alias: `@/*` maps to root directory (e.g., `@/components/Header`)
- Strict mode enabled
- Target: ES2017
- JSX runtime: react-jsx (automatic JSX transform)

### Code Formatting

- Prettier is installed but no `.prettierrc` config file exists yet
- ESLint uses Next.js recommended configs (core-web-vitals + typescript)

## Important Patterns

### Image Handling

- Use Next.js `<Image>` component from `next/image` for optimized images
- Static images stored in `public/images/` directory
- All section components support image uploads via config

**Admin Image Error Handling:**
```tsx
<img
  src={imageSrc}
  onError={(e) => {
    e.currentTarget.style.display = "none";
    fallbackElement.style.display = "flex";
  }}
/>
<div className="fallback" style={{ display: "none" }}>
  🖼️ Image not found
</div>
```

### Navigation

**Navbar uses Layout 3 design:**
- Centered logo (always centered, no animation)
- Desktop top: Hamburger menu → dropdown with links
- Desktop scrolled: Centered nav links with tab-page functionality
  - Click link → opens full-screen page overlay
  - Active link styled as blue tab connecting to page
  - Background scroll disabled
  - Close via backdrop, X button, or re-click link
  - Custom slim scrollbars in tab-page content (6px width)
  - Navbar has overflow hidden to prevent scrollbars
- Mobile: Standard page navigation (no tab-pages)
- File: `components/layout/Navbar.tsx`

**Scroll-to-Top Button:**
- Fixed position at bottom-right (2rem from edges)
- Appears after scrolling 300px down
- Anime.js animations (fade, scale, bounce)
- Smooth scroll to top on click
- z-index: 1040 (below navbar, above content)
- File: `components/ui/ScrollToTop.tsx`

### Client vs Server Components

- Default to Server Components unless interactivity is needed
- Use `"use client"` only when using hooks (useState, useEffect, etc.) or browser APIs
- Navbar is a Client Component (tab-page state, scroll detection)
- Footer is a Server Component (no interactivity)
- Section components are mostly Server Components (data display)

### Database Setup

**Environment:**
- Database: PostgreSQL (required)
- Connection string in `.env`: `DATABASE_URL="postgresql://postgres:admin@localhost:5432/sonic_cms"`
- Default password is `admin` - update if different

**Common Issues:**
- "Connection refused" → PostgreSQL not running (check service/brew)
- "password authentication failed" → Update password in `.env`
- "database does not exist" → Create database first: `CREATE DATABASE sonic_cms;`
- "relation does not exist" → Run migrations: `npx prisma migrate dev --name init`

## Git Workflow

- Main branch: `main`
- Current branch: `gavin`
- Prettier was recently added to package.json

## Key Documentation Files

- `README_SECTIONS.md` - Complete landing page sections framework guide
- `docs/BACKEND_API.md` - Backend API specifications for section-based pages
- `docs/FRAMER_MOTION.md` - Complete Framer Motion animation workflow guide
- `types/section.ts` - TypeScript definitions for all section types
- `CHANGELOG.md` - Full project history and implementation details

## Data Fetching & API Integration

### Section-Based Pages

**Pages are dynamically controlled via backend API.** Instead of hardcoded components, pages fetch section configurations and render them dynamically.

**API Endpoint Pattern:**
```typescript
// TODO: Fetch page configuration from backend
// GET /api/pages/:slug
// Expected response:
{
  id: string;
  slug: string;
  title: string;
  sections: SectionConfig[];
}
```

**Frontend automatically:**
- Filters disabled sections
- Sorts by order field
- Renders appropriate component for each type

**Example Implementation:**
```typescript
export default function Page() {
  // TODO: Replace with actual API call
  const sections = staticSections;

  const enabledSections = sections
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <>
      {enabledSections.map(section => (
        <DynamicSection key={section.id} section={section} />
      ))}
    </>
  );
}
```

### Other Data Fetching

For non-section components that fetch data, include `#TODO` comments defining:
1. The API endpoint to be called (e.g., `GET /api/endpoint`)
2. The expected response format (TypeScript interface or type)
3. Any required parameters or authentication

**Example:**
```typescript
// TODO: Fetch user data from API endpoint: GET /api/user
// Expected response format: { id: string; name: string; email: string }
// Requires authentication token in header
```

## Dynamic Section-Based Architecture

### Overview

**IMPORTANT:** The website uses a **section-based architecture** where all page content is controlled via backend API. Pages are composed of reorderable, enable/disable sections rather than hardcoded components.

### Component Organization

The project uses a three-tier component structure:

1. **`components/ui/`** - Primitive, reusable components
   - Button, Card, Container, Banner
   - Used as building blocks throughout the app

2. **`components/layout/`** - Layout-specific components
   - Navbar, Footer, Section
   - Handle page structure and consistent spacing

3. **`components/sections/`** - Composed page sections
   - HeroCarousel, TextImageSection, StatsGrid, CardGrid, DynamicSection
   - Combine primitives into full-featured sections
   - **DynamicSection**: Renders any section type based on backend configuration

### Section Types

All pages use a section-based structure with 7 available section types:

1. **`hero-carousel`** - Full-screen image/video carousel with overlays
2. **`text-image`** - Side-by-side text and image content
3. **`stats-grid`** - Statistics display in grid format
4. **`card-grid`** - Product/service cards in grid layout
5. **`banner`** - Full-width alert/notification banners
6. **`table`** - Tabular data (pricing, comparisons)
7. **`freeform`** - Visual drag-and-drop canvas with GrapesJS editor

Each section has:
- `enabled: boolean` - Show/hide without deleting
- `order: number` - Position on page (lower = higher)
- `background` - Color options (white, gray, blue, transparent)
- Type-specific configuration (items, stats, cards, etc.)

**See:** `README_SECTIONS.md` for complete section documentation

### Mobile-First Development

All new components follow a mobile-first approach:
- Base styles target mobile devices (320px+)
- Use `md:` prefix for desktop styles (768px+)
- Limit use of `sm:` and `lg:` breakpoints to essential cases only
- Test on mobile devices before desktop

### Creating Pages

**All pages should use the section-based architecture:**

```typescript
import DynamicSection from "@/components/sections/DynamicSection";
import type { SectionConfig } from "@/types/section";

export default function Page() {
  // TODO: Fetch from backend API
  const sections: SectionConfig[] = [
    {
      id: "hero-1",
      type: "hero-carousel",
      enabled: true,
      order: 1,
      items: [{ /* config */ }]
    },
    // ... more sections
  ];

  const enabledSections = sections
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <>
      {enabledSections.map(section => (
        <DynamicSection key={section.id} section={section} />
      ))}
    </>
  );
}
```

**Benefits:**
- Backend can enable/disable sections without code changes
- Sections can be reordered dynamically
- All content editable through CMS
- Easy to add/remove sections
- Consistent styling and behavior

**See:** `README_SECTIONS.md` for section types and configuration options

### Pages Feature

**NEW:** Dynamic page creation system for navigable routes separate from the landing page.

**Admin URL:** `/admin/content/pages`

#### Three Page Types

**1. Full Pages** - Use the complete section system
- Example: About Us, Services, Company Info
- Create at `/admin/content/pages` → "Full Page"
- Edit sections at `/admin/page-editor/{slug}`
- Same section types as landing page (hero, footer, text-image, etc.)
- Fully editable through section manager
- Storage: `sonic_sections_{slug}` in localStorage

**2. PDF Pages** - Display PDF documents
- Example: Terms & Conditions, Price Lists, Brochures
- Create at `/admin/content/pages` → "PDF Document"
- Configure PDF URL and display mode (embed/download/both)
- Optional description field for context
- Frontend renders at `/{slug}` with PDF viewer

**3. Form Pages** - Custom contact/inquiry forms
- Example: Contact Us, Quote Request, Support Ticket
- Create at `/admin/content/pages` → "Contact Form"
- Build custom forms with field editor
- Field types: text, email, phone, textarea, select, checkbox
- Drag-to-reorder fields
- Submit actions: Email or Webhook
- Custom success messages

#### Page Management

**Admin Interface:** Table-based UI with:
- Stats cards (Total, Full, PDF, Form, Enabled, Disabled)
- Filter tabs (All, Full Pages, PDFs, Forms)
- Actions: Edit, Toggle Enable/Disable, Duplicate, Delete
- Auto-generated slugs from titles
- Reserved slug protection (`admin`, `api`, etc.)

**Storage:**
```
localStorage keys:
- sonic_cms_pages           → Page metadata (title, slug, type, etc.)
- sonic_sections_{slug}     → Page sections (full pages only)
```

**Files:**
- `types/page.ts` - PageConfig, PDFPageConfig, FormPageConfig
- `lib/page-manager.ts` - CRUD operations for pages
- `app/admin/content/pages/page.tsx` - Pages list manager
- `app/admin/page-editor/[slug]/page.tsx` - Section editor for full pages
- `app/[slug]/page.tsx` - Dynamic frontend route
- `components/admin/PDFPageEditor.tsx` - PDF settings editor
- `components/admin/FormPageEditor.tsx` - Form builder

#### Footer Integration

Footer links dropdown now includes dynamic pages:
- Home (landing page)
- Landing page sections (anchor links: `#section-id`)
- **NEW:** Dynamic pages (routes: `/{slug}`)
- Custom external URLs

Edit footer → Add/edit column links → Dropdown shows all enabled pages

#### Creating a Page

```bash
# 1. Navigate to admin
http://localhost:3000/admin/content/pages

# 2. Click "Create Page"
# 3. Enter title: "About Us"
# 4. Select type: "Full Page"
# 5. Click "Create Page"

# For Full Pages:
# → Redirects to /admin/page-editor/about-us
# → Add sections (hero, text-image, footer, etc.)
# → Toggle, reorder, edit sections

# For PDF Pages:
# → Click Edit (pencil icon)
# → Enter PDF URL
# → Choose display mode
# → Save

# For Form Pages:
# → Click Edit (pencil icon)
# → Add fields (drag to reorder)
# → Configure submit action
# → Save

# 6. View at http://localhost:3000/about-us
```

#### Reserved Slugs

Cannot be used (conflicts with routes):
- `admin`, `api`, `_next`, `images`, `uploads`
- `coverage`, `support`, `services`, `equipment`, `client-login`
- `landing-page`, `navbar-demo`, `snap-react-test`, `canvas-test`, `editor`
- `home`, `index`, `page`

### Freeform Sections & GrapesJS Editor

**The freeform section type** provides a visual drag-and-drop editor for creating custom layouts:

**Admin Flow:**
1. Add new "Freeform Canvas" section from section manager
2. Click "Open Visual Editor" to launch GrapesJS editor
3. Drag blocks from left panel onto canvas
4. Style elements using right panel controls
5. Preview on different devices (Desktop/Tablet/Mobile)
6. Save to return to section manager

**Key Files:**
- `components/admin/GrapesJSEditor.tsx` - Visual editor wrapper with custom blocks
- `components/admin/FreeformEditor.tsx` - Section settings panel
- `components/sections/FreeformSection.tsx` - Frontend renderer
- `app/admin/editor/[sectionId]/page.tsx` - Editor route

**Custom Blocks Available:**
| Category | Blocks |
|----------|--------|
| Basic | Text, Heading, Paragraph, Image, Button, Link |
| Layout | Container, Section, 2 Columns, 3 Columns, Divider |
| Components | Card, Hero, CTA Banner |

**CSS Isolation Modes:**
- **Global**: Uses site-wide styles (may affect other sections)
- **Scoped**: Styles prefixed with section ID (recommended)
- **Shadow DOM**: Complete isolation via Shadow DOM

**Technical Notes:**
- GrapesJS loaded via dynamic import to prevent SSR issues
- Bootstrap 5.3 styles available in canvas
- Section data stored in localStorage (dev) / backend API (prod)
- Prevent duplicate initialization with `initAttemptedRef`

### Section Scrolling Behavior

**Scroll-Snap Navigation (CSS-only, matches prototype):**
- CSS `scroll-snap-type: y mandatory` on html element
- ALL sections are exactly 100vh (`height: 100vh; min-height: 100vh`)
- All sections (except hero) have `scroll-snap-align: start; scroll-snap-stop: always`
- **Hero carousel has NO snap** (`scroll-snap-align: none`) to prevent jump-back
- **NO JavaScript snap controller** - pure CSS handles all snapping
- Long content sections scroll internally via `.section-content-wrapper` (`overflow-y: auto`)
- Triangle overlays use `TriangleSectionWrapper` which overrides overflow to visible

**Section Layout Model:**
- `.sonic-section`: `height: 100vh; display: flex; flex-direction: column; overflow: hidden`
- `.section-content-wrapper`: `flex: 1; min-height: 0; overflow-y: auto` (internal scrolling)
- Padding via CSS custom properties: `--section-pt`, `--section-pb`, `--section-bg`
- No external margins on sections
- Total page height = number of sections x 100vh (perfect snap grid)

### Section Spacing System

**IMPORTANT:** Sections use **internal padding** (not external margins) to prevent white space above colored backgrounds.

- Configure via `paddingTop` and `paddingBottom` properties (0-200px)
- Default: 80px top and bottom
- Edit via SpacingControls component in admin
- Stored in section config JSONB field
- NO external margins on sections (removed from globals.css)

## Canvas Editor - Visual Page Builder

### Overview

The Canvas Editor is a custom visual page builder for creating layouts with absolute positioning. Each canvas can function as:
- A standalone custom page
- A section within the landing page

**Key Files:**
- `components/admin/canvas/CanvasEditor.tsx` - Main canvas orchestrator (1,800+ lines)
- `components/admin/canvas/ElementPalette.tsx` - Draggable elements (400+ lines)
- `components/admin/canvas/PropertiesPanel.tsx` - Property editors (1,400+ lines)
- `components/admin/canvas/LayersPanel.tsx` - Hierarchical tree view (330+ lines)
- `types/canvas-editor.ts` - TypeScript type definitions (280 lines)

**Current Status:** See `CANVAS_EDITOR_STATUS.md` and `START_HERE_NEXT_SESSION.md` for detailed status

### Architecture

**Drag-and-Drop:** Uses @dnd-kit/core library for modern drag-drop
**Positioning:** Absolute positioning for root elements, flow layout for nested children
**Styling:** Bootstrap 5.3.2 via CDN for components, Tailwind for utilities
**State:** React useState for canvas state, useEffect for auto-resize and keyboard shortcuts

### Element Types (18 Total)

**Basic Elements (6):**
- Text, Heading, Paragraph, Image, Button, Link

**Layout Containers (3):**
- Row (Bootstrap flexbox rows)
- Column (Bootstrap 12-grid columns)
- Box (General purpose containers)

**Bootstrap Components (9):**
- Alert, Card, Badge, Accordion, List Group, Breadcrumb, Pagination, Progress Bar, Spinner

### Nesting System

**Container Types:** row, column, box, card can accept nested children
**Detection:** Drop position checked via bounding box collision
**Relationship:** Parent ID stored in `element.content.parentId`, child IDs in `parent.children[]`
**Rendering:** Root elements use absolute positioning, nested children use flow layout
**Deletion:** Recursive - deleting parent deletes all children

### Device Modes

- **Mobile:** 375px canvas width
- **Tablet:** 768px canvas width
- **Desktop:** 1440px canvas width
- Rows automatically resize to match canvas width on device switch

### Component Styling

**Bootstrap Integration:**
- All components use proper Bootstrap 5.3.2 classes
- Border-radius preserved via CSS variables: `var(--bs-btn-border-radius, 0.375rem)`
- Overflow hidden to prevent content spillage
- 8 color variants: primary, secondary, success, danger, warning, info, light, dark

**Custom Styling:**
- Font family, size, weight, line-height, color
- Text alignment with visual line icons (left, center, right, justify)
- Background colors
- Text decoration

**Spacing Controls:**
- Margin/padding editors with sliders (0-200px)
- Visual overlays on canvas (orange for margin, green for padding)
- Individual side controls (top, right, bottom, left)

### Keyboard Shortcuts

- **Delete/Backspace:** Delete selected elements
- **Escape:** Deselect all
- **Cmd/Ctrl + [:** Toggle left sidebar
- **Cmd/Ctrl + ]:** Toggle right sidebar
- **Cmd/Ctrl + Click:** Multi-select elements

### Two-Tab Sidebar Interface

**Left Sidebar:**
- Elements Tab: Draggable element palette
- Layers Tab: Hierarchical document tree

**Right Sidebar:**
- Properties Tab: Element-specific property editors
- Styles Tab: Common styling controls + spacing editor

### Next Steps (Resume Work)

**Immediate:** Add property editors for 6 Bootstrap components (Accordion, List Group, Breadcrumb, Pagination, Progress, Spinner)
**Then:** Add search and collapsible categories to element palette
**Future:** HTML/CSS export system, frontend renderer, testing

See `START_HERE_NEXT_SESSION.md` for detailed next steps.

## Animation Workflow

### Anime.js

**All animations use Anime.js** as the primary animation library. DO NOT use CSS transitions or animations for new components (except for simple hover states).

**Installation:** `npm install animejs @types/animejs`

**Key Principles:**
1. **Always use standard easing:** `cubicBezier(0.4, 0, 0.2, 1)` (easeInOutCubic)
2. **Standard duration:** 600ms for most animations
3. **Animate transform and opacity** for best performance
4. **Scroll-triggered animations:** Use `scrollTrigger()` helper from `lib/anime.ts`
5. **Stagger delays:** 100ms per item for sequential animations
6. **All animated components should be client components** if using React hooks

**Animation Utilities:**

All animation functions are centralized in `lib/anime.ts`:
- `fadeIn()`, `fadeOut()` - Opacity animations
- `slideUp()`, `slideDown()` - Vertical slide animations
- `slideInLeft()`, `slideInRight()` - Horizontal slide animations
- `scaleIn()`, `scaleOut()` - Scale/zoom animations
- `staggerAnimation()` - Animate multiple elements with delay
- `scrollTrigger()` - Trigger animations on scroll (viewport intersection)
- `bounce()`, `pulse()`, `shake()` - Interactive animations
- `createTimeline()` - Complex sequential animations

**Common Patterns:**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { fadeIn, slideUp, scrollTrigger } from "@/lib/anime";

export function Component() {
  const ref = useRef<HTMLDivElement>(null);

  // Fade in on mount
  useEffect(() => {
    if (ref.current) {
      fadeIn(ref.current);
    }
  }, []);

  return <div ref={ref}>Content</div>;
}

// Scroll-triggered animation (no React needed)
useEffect(() => {
  const observer = scrollTrigger(".animate-on-scroll", "slideUp");
  return () => observer.disconnect();
}, []);

// Stagger animation for lists
useEffect(() => {
  staggerAnimation(".list-item", "fadeIn", 100);
}, []);

// Timeline for complex sequences
import { createTimeline } from "@/lib/anime";

const timeline = createTimeline()
  .add({ targets: ".first", opacity: [0, 1] })
  .add({ targets: ".second", translateY: [20, 0] }, "+=200");
```

**Best Practices:**
- Use animation utilities from `lib/anime.ts` instead of direct anime() calls
- Keep animations subtle and purposeful
- Prefer scroll-triggered animations over mount animations
- Use timelines for complex multi-step animations
- Clean up observers in useEffect cleanup functions


<!-- AI Engineer Toolkit -->
<!-- Appended by install-skills.py on 2026-03-05 11:14:52 UTC -->

# white-label-cms - Claude Code Guide

**Generated:** 2026-03-05 11:14:52 UTC | **Toolkit:** AI Engineer by GavinHolder
**Max size:** Keep this file under 40,000 characters. Move details to `.claude/memory/` files.

---

## Communication Rules

- **No fluff.** No "Great question", "Good job", "Sure thing", or filler phrases. Get straight to work.
- **No summaries unless asked.** Do not summarize what you just did after completing a task. The user can see the output. Only summarize if the user explicitly asks.
- **Optimize token usage.** Every token costs money. Be concise. Say what's needed, nothing more.
- **No unnecessary confirmations.** Don't say "I'll do X" then do X. Just do X.
- **Speak through actions.** Let your code, edits, and tool calls be the response. Text is for decisions, questions, and blockers only.

---

## Non-Negotiable Rules

These apply to EVERY session, EVERY task. No exceptions.

1. **Tasks for everything.** Create a task list BEFORE writing any code. Every task gets subtasks if multi-step.
2. **Never skip steps.** Mark tasks in_progress before starting, completed when done. Remaining tasks stay in queue untouched.
3. **Debug tasks for bugs.** When something breaks mid-step, create a `debug` child task. Fix in place, resume parent. Do NOT skip ahead.
4. **Amendment tasks for revisions.** When a completed step needs changes, create an `amend` task. Do NOT redo the entire step.
5. **Checkpoints every 5-10 tasks.** Pause, update session files, extract learnings, report summary.
6. **Learn after every task list.** After completing a set of tasks, extract non-obvious knowledge to the relevant skill's `learned/` folder. One topic per file, max 30 lines each. No monolithic learning files.
7. **Verify before claiming done.** Run tests, check output, confirm visually if UI work.
8. **Visual debugging for UI.** Use Playwright (`visual-debugging` skill) to screenshot and inspect when code-level debugging isn't enough.

---

## Session Protocol

### Start
1. Read `.claude/memory/SESSION_CONTEXT.md` (active tasks)
2. Read `.claude/memory/SESSION_CHANGELOG.md` (last session)
3. Scan `learned/` folders in relevant skills for recent learnings
4. Resume from "Next Action" or create new task list

### During Work
- Log progress in `SESSION_CONTEXT.md`
- At checkpoints: update changelog, extract learnings, report to user

### End
- Update `SESSION_CONTEXT.md` with next action
- Log session summary in `SESSION_CHANGELOG.md`
- Extract any remaining learnings

---

## Task Protocol

### Hierarchy (5 levels max)
```
1. Main Task
   1.1 Subtask
       1.1.1 Sub-subtask
```

### Task Types
```
[>] IN PROGRESS    [x] COMPLETE       [ ] NOT STARTED
[D] DEBUG          [A] AMENDMENT      [!] DEVIATION
[-] BLOCKED        [X] FAILED         [#] CHECKPOINT
```

### Debug Tasks (fix bugs without losing the plan)
```
1.1 Create layout [IN PROGRESS]
1.1.debug.a: Grid not rendering
    1.1.debug.a.1 Investigate
    1.1.debug.a.2 Fix
1.1 [RESUMED]
1.2 Add widgets (NEXT - unchanged)
```

### Amendment Tasks (revise completed steps)
```
1.2 Create POST /users [COMPLETE]
1.2.amend.a: Add email validation
    1.2.amend.a.1 Add logic
    1.2.amend.a.2 Update tests
1.3 Create DELETE /users (NEXT - unchanged)
```

Full protocol: `.claude/memory/TASK_PROTOCOL.md`

---

## Risk Classification

| Level | Risk | Workflow |
|-------|------|----------|
| **4 CRITICAL** | Data, security, money | Plan -> Adversarial review -> TDD -> Security review -> Code review |
| **3 HIGH** | Breaking changes, integrations | Plan -> Adversarial review -> TDD -> Code review |
| **2 MEDIUM** | Standard features | Plan -> Code -> Code review |
| **1 LOW** | Docs, tests, formatting | Code -> Optional review |

---

## Continuous Learning

Knowledge is stored as **individual files** in each skill's `learned/` folder:
```
~/.claude/skills/react-19/learned/hook-ordering-strict-mode.md
~/.claude/skills/bootstrap-5/learned/modal-z-index-conflict.md
```

- One topic per file, max 30 lines, kebab-case filenames
- Only extract non-obvious, reusable, verified knowledge
- See `continuous-learning` skill for full workflow

---

## Development Workflow

0. **Create tasks** - Always first
1. **Classify risk** (1-4)
2. **Plan** - `/brainstorming` or `/writing-plans` for Level 2+
3. **Visual reference** - `/playground` or `visual-debugging` for UI work
4. **Test first** - TDD for Level 2+
5. **Implement** - Create debug/amendment tasks for issues
6. **Verify** - Tests, lint, typecheck
7. **Review** - `/requesting-code-review` for Level 2+
8. **Learn** - Extract patterns to skill learned/ folders

### Code Style
- Max 500 lines/file, 20 lines/function, 3 params, 2 nesting levels
- No dead code, no magic numbers, no silent failures

### Deployment
Docker + Portainer + Traefik. Each app is its own stack.

---

## Skill Quick Reference

### Workflow
```
/brainstorming            /writing-plans           /test-driven-development
/systematic-debugging     /verification-before-completion
/requesting-code-review   /revise-claude-md
```

### Frontend
```
/frontend-design          /frontend-aesthetics     /bootstrap-5
/playground               /web-artifacts-builder   visual-debugging
```

### Development
```
/feature-dev              /Django Framework
/claude-bootstrap-base    /claude-bootstrap-react-web
```

---

## CLAUDE.md Size Management

This file MUST stay under 40,000 characters. If it grows too large:
1. Move verbose content to `.claude/memory/` files
2. Keep only rules, quick references, and concise protocols here
3. Reference external files for full details
4. Run `/revise-claude-md` to audit and trim

---

**Generated by:** scripts/install-skills.py
