# CLAUDE.md

> ⚠️ **WHITE-LABEL CMS — Generic business website CMS.**
> This is the single source of truth. Client instances link TO this repo, not the other way around.
> **This repo must have ZERO client-specific references.**

---

## ⛔ NON-NEGOTIABLE: CHANGES MUST NOT BREAK EXISTING FUNCTIONALITY

**Every change — no matter how small or unrelated — must be verified not to break existing working features.**

Rules:
1. **Scope your changes tightly.** Only touch files directly related to the request. Do NOT refactor adjacent code, change shared utilities, or "clean up" things nearby.
2. **Before touching shared code** (layout, CSS, globals, Navbar, DynamicSection, etc.) — identify ALL features that use it and verify your change won't affect them.
3. **After every change** — use Playwright to visually verify the modified feature AND the most likely affected areas (navbar, footer, sections, admin sidebar).
4. **If a change requires modifying shared infrastructure** — pause and confirm with the user what might be affected first.
5. **No change is "safe by default."** Treat every edit to shared/layout/global files as HIGH RISK.

**This rule exists because:** unrelated changes have repeatedly broken working features (navbar social icons, multi-select, back-to-library button, section padding). Each of those was caused by an edit that seemed unrelated but had side effects.

---

## MCP Servers

**Figma** (`https://mcp.figma.com/mcp`):
- Use localhost source directly if returned — no placeholders
- Run `get_design_context` then `get_screenshot` before implementing
- Translate to Bootstrap 5 classes + existing components + brand tokens
- Skills: `figma:implement-design`, `figma:code-connect-components`, `figma:create-design-system-rules`

---

## Skills (ai-engineer library)

| Skill | When to use |
|-------|-------------|
| `bootstrap-5` | ALL Bootstrap UI work |
| `react-19` | ALL React component development |
| `html5` | ALL HTML structure |
| `css3` | ALL CSS/styling |
| `javascript-es2025` | ALL JavaScript |
| `frontend-aesthetics` | UI design quality, animations |
| `modern-ui-ux` | Landing pages, immersive design |
| `visual-debugging` | Screenshot & inspect UI via Playwright |

---

## ⛔ DESIGNER-FIRST RULE (PERMANENT — override requires explicit mutual agreement)

**UI layout, content, and section design work MUST be done through the CMS Designer/Volt Designer — never via hardcoded scripts, direct JSON construction, or renderer code edits.**

| Allowed via code | Must use Designer instead |
|---|---|
| Bug fixes in renderers | Text/heading changes |
| New block type features | Spacing/padding adjustments |
| API/backend work | Column layouts, card arrangements |
| Features not in Designer yet | Any visual layout change |

**Seeding scripts:** Must write `designerData` in the exact schema the Designer produces. After seeding, every section MUST open and be editable in the Designer. That is the test.

### ⛔ VOLT-FIRST RULE FOR GRAPHICAL ELEMENTS (PERMANENT)

**Cards, visual components, graphical UI elements, and interactive elements with hover effects MUST be built as Volt designs in Volt Studio — NEVER as hardcoded React components.**

- **All cards** → build in Volt Studio, use `volt` block type in Flexible Designer
- **Graphical UI elements** (hero cards, product cards, feature cards, showcase cards) → Volt
- **Hover animations** (peek-a-boo, slide-in shapes, reveals) → Volt states (hover/rest) with layer overrides
- **3D showcase cards** → Volt with `3d-object` layer type
- **Layout of cards on a page** → Flexible Designer with `volt` blocks, NOT a custom React component

**If Volt doesn't yet support a required interaction** (e.g. hover-connected 3D controls): STOP, tell the user what Volt enhancement is needed first, then build the enhancement, THEN build the card in Volt. Do NOT bypass Volt by creating a custom component.

**This rule exists because:** building hardcoded React components for visual cards circumvents the entire CMS authoring system — the user can't edit them in the Designer, they can't be reused across pages, and they don't appear in Volt Studio library.

**Override:** Only when user and Claude explicitly agree that a code change is needed and state why.

---

## ⚡ MANDATORY: Feature Confirmation → Docs + Commit

**Every time the user confirms a feature is working:**

1. **Update `lib/admin/docs-content.ts`** (in-app docs at `/admin/documents`):

| Feature changed | Topic constant to update |
|----------------|--------------------------|
| Section Into (shapes, hover) | `TAB_TRIANGLE` |
| New FLEXIBLE block type | `FLEXIBLE_ELEMENTS` + `SECTION_TYPES` |
| Animated background | `TAB_ANIMATION` + matching `ANIM_*` |
| Page types | `PAGES_SYSTEM` |
| Hero carousel | `HERO_CAROUSEL` |
| Section spacing | `TAB_SPACING` |
| Lower Third / Motion Elements | `LOWER_THIRD_DOCS` / `MOTION_ELEMENTS_DOCS` |
| SEO / Google integration | `SEO_MANAGEMENT` |

2. **Commit** all modified files. Do NOT push unless user asks.

---

## Project Setup

**Stack:** Next.js 16 App Router, React 19, TypeScript, Bootstrap 5.3, Prisma + PostgreSQL, Anime.js 4.x, Three.js 0.183

**Dev commands:**
```bash
npm run dev          # http://localhost:3000
npm run build
npm run lint
npx prisma db push   # sync schema to DB
npx prisma generate  # regenerate Prisma Client
npm run db:seed      # seed admin user + sample data
npm run db:seed-motion-demo  # seed 10 demo motion/lower-third sections
```

**Admin:** http://localhost:3000/admin/login — `admin` / `admin2026` (SUPER_ADMIN)

**Database:** `postgresql://postgres:admin@localhost:5432/white_label_cms`

---

## Documentation Rules

- All `.md`/`.txt` files go in `docs/` (except README.md and CLAUDE.md)
- Update `docs/INDEX.md` when adding docs
- `docs/` is gitignored — local reference only

---

## Adversarial Engineering

Act as **senior engineering peer**: challenge assumptions, hunt edge cases, demand evidence BEFORE writing code.

**Risk Levels:**
| Level | Risk | Workflow |
|-------|------|----------|
| 1 LOW | Docs, CSS tweaks | Code → Commit |
| 2 MEDIUM | New features, CRUD | /plan → Code → /code-review → Commit |
| 3 HIGH | Auth, migrations, uploads | /plan → /adversarial-review → TDD → /security-review → /code-review → Commit |
| 4 CRITICAL | N/A for this project | — |

**Auto-trigger Level 3 for:** `lib/auth.ts`, `app/api/auth/**`, `app/api/media/upload/**`, `prisma/schema.prisma`, keywords: auth/login/jwt/password/upload/migrate/sql

**Level 3 requires:** assumptions doc, failure mode analysis, edge case matrix, decision rationale (templates in `.claude/templates/`)

**Multi-perspective review agents** (6 parallel for Level 3+):
Security Expert (Opus) | React Reviewer | Skeptic | Architect | Consistency | Redundancy — need 4/6 consensus

**Current Critical Issues (PENDING FIX):**
1. `lib/auth.ts:13-14` — Hardcoded JWT fallback secret (CRITICAL — fail fast if JWT_SECRET unset)
2. Zero test coverage (HIGH — target 80%+)
3. `app/api/pages/[slug]/publish/route.ts:47` — Raw SQL without validation (MEDIUM)

**Rules:** `.claude/rules/` | **Templates:** `.claude/templates/` | **Agents:** `.claude/agents/`

---

## React Engineering Standard

- **Server Components first** — use `"use client"` only for hooks/browser APIs
- **`next/image` always** — never raw `<img>` in production routes
- **TypeScript strict** — no `any` without justification
- **Mobile-first** — base = 320px+, `md:` for desktop

**Read:** `.claude/rules/react-engineering-standard.md` — mandatory for all React work

---

## Architecture

**Component tiers:**
- `components/ui/` — primitives (Button, Card, Container, Banner)
- `components/layout/` — Navbar, Footer, Section
- `components/sections/` — HeroCarousel, TextImageSection, DynamicSection, LowerThirdRenderer, MotionElementRenderer

**Admin UI components:**
- Toast: `useToast()` from `components/admin/ToastProvider.tsx` — `toast.success/error/info/warning()`
- `TabPanel.tsx` — pills/underline/boxed variants
- `HelpText.tsx` — info/warning/tip, collapsible
- `InfoCard.tsx` — stat cards with trends
- `SpacingControls.tsx` — dual slider + number input (0–200px)

**Styling:** Tailwind CSS v4 + HeroUI (NextUI) — configured in `tailwind.config.ts`, `app/globals.css`, `app/providers.tsx`

**Path alias:** `@/*` → root. **TypeScript:** strict mode, ES2017, react-jsx.

---

## Key Patterns

**Images:** `next/image` for all production images. Admin editors use `<img>` with `onError` fallback.

**Navbar** (`components/layout/Navbar.tsx`): Centered logo, top = hamburger dropdown, scrolled = centered nav with tab-page overlays (full-screen), mobile = standard nav.

**Sections:** All sections are `100vh`, CSS `scroll-snap-type: y mandatory`. Hero has NO snap. Content scrolls internally via `.section-content-wrapper` (`overflow-y: auto`). Class: `cms-section`.

**Section padding:** `paddingTop`/`paddingBottom` (0–200px, default 80px). Internal padding only — no external margins.

**Section JSONB extras:** `lowerThird Json?` (SVG/image at section bottom, z-10), `motionElements Json?` (parallax overlay images, z-20). Both wired via `wrapSection()` in `DynamicSection.tsx`.

**Animations:** Anime.js 4.x — use `await import("animejs")` in `useEffect`. Passive scroll listeners. `anime.remove(el)` on cleanup. Utilities in `lib/anime.ts`.

**Feature flags:** `ClientFeature` Prisma model — SUPER_ADMIN toggle at Settings → Client Features. Hook: `useClientFeature(slug)` → `{enabled, config, loading}`.

**Canvas Editor:** Custom visual page builder in `components/admin/canvas/`. See `.claude/memory/canvas-editor.md` for full details.

**Architecture details:** Pages feature, GrapesJS freeform, motion elements, concrete calculator — see `.claude/memory/architecture-details.md`.

---

## Git Workflow

- Main branch: `main` | Feature work on: `master` → push to `main`
- Commit format: `feat:` / `fix:` / `refactor:` / `docs:` / `chore:`
- Do NOT push unless user explicitly asks

---

## Communication Rules

- No fluff, no summaries unless asked, no "I'll do X" before doing X
- Optimize tokens — every token costs money
- Speak through actions: code/edits/tool calls are the response
- Text is for decisions, questions, and blockers only

---

## Non-Negotiable Rules

1. **Tasks for everything** — create task list BEFORE writing code
2. **Mark in_progress → completed** — never skip steps
3. **Debug tasks for bugs** — fix in place, resume parent task
4. **Amendment tasks for revisions** — don't redo completed steps
5. **Verify before claiming done** — run TypeScript check, test output
6. **Visual inspection ALWAYS required for UI** — after every UI feature implementation, use Playwright (`mcp__plugin_playwright_playwright__browser_*`) to navigate to the page, take a screenshot, and confirm it renders correctly. Do NOT mark UI work done without visual confirmation. Code review alone is not sufficient.

---

## Risk Classification (Quick Ref)

| Level | Risk | Workflow |
|-------|------|----------|
| 4 CRITICAL | Data/security/money | Plan → Adversarial → TDD → Security → Code review |
| 3 HIGH | Breaking changes | Plan → Adversarial → TDD → Code review |
| 2 MEDIUM | Standard features | Plan → Code → Code review |
| 1 LOW | Docs/tests/formatting | Code → Optional review |

---

## CLAUDE.md Size Rule

**This file MUST stay under 40,000 characters.**
- Move verbose content to `.claude/memory/` files
- Reference memory files instead of duplicating content
- Run `/revise-claude-md` periodically to audit and trim
- Memory files: `canvas-editor.md`, `architecture-details.md`, `MEMORY.md`
