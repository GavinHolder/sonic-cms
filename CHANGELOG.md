# Changelog

All notable changes to the White-Label CMS are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2026-03-27] Session

### Added
- **Google Integration tab** on `/admin/content/seo` — 6-step guided checklist for connecting site to Google:
  1. Set canonical base URL (auto-detected)
  2. Verify site in Google Search Console (manual + step-by-step instructions)
  3. Submit sitemap to Google (manual + copy-to-clipboard URL)
  4. Connect GA4 Analytics (saves measurement ID, auto-injects gtag.js on all public pages)
  5. Claim Google Business Profile (manual + instructions)
  6. Request page indexing (manual + instructions)
- **GA4 auto-injection** — root layout reads `ga4_measurement_id` from SystemSettings and injects Google Analytics `gtag.js` script on all public pages (validated against `/^G-[A-Z0-9]+$/i`)
- **API route** `GET/PUT /api/admin/google-setup` — stores manual step completions + GA4 ID in SystemSettings
- **GoogleSetupTab component** (`components/admin/GoogleSetupTab.tsx`) — progress bar, expandable step cards, copy-to-clipboard helpers, direct Google links, manual toggles

### Fixed
- **Volt Designer: floating action panel always visible** — duplicate `display` property in inline style (`display:none;...display:flex;`) meant the panel never hid. Removed duplicate, toggle logic now works correctly
- **Volt Designer: multi-select visual feedback** — Ctrl+click in layers panel only called `renderLayers()`, not `renderCanvas()`, so dashed selection boxes never appeared on canvas
- **Volt Designer: multi-select drag** — clicking a layer in a multi-select group called `selectLayer()` which reset `multiSelectIds`, breaking the group. Now preserves multi-select when clicking within the group
- **CMS Update System: upstream merge never ran** — `dispatchWorkflow` in `lib/github-actions.ts` sent `{ ref }` without `inputs: { merge_upstream: "true" }`, so the upstream-merge job was always skipped on client CMS instances
- **CMS Update System: deploy never pulled new Docker image** — stop+start fallback restarted the old container. Added Portainer Docker API image pull (`/api/endpoints/{id}/docker/images/create`) before restart
- **CMS Update System: push rejection on concurrent runs** — added `git pull --rebase` before push in upstream merge step
- **SEO Wizard crash** — `if (!show) return null` placed between `useState` and `useCallback`/`useEffect` hooks violated React's rules of hooks. Moved early return after all hook declarations

### Changed
- Deploy template (`deploy/client-deploy-template.yml`) and master deploy (`.github/workflows/deploy.yml`) updated with image pull + rebase fixes
- Client repos (ovbreadymix-cms, sonic-cms) patched directly via git clone + push (`.gitattributes merge=ours` on `deploy.yml` blocks upstream propagation)
- In-app docs (`lib/admin/docs-content.ts`) updated with Google Integration section
- CLAUDE.md updated with SEO/Google topic mapping

---

## [Unreleased — design-overhaul branch]

### Added

- **3D Asset Admin Page** (`/admin/volt-3d`): full version management UI — list assets, expand per-asset version accordion, download GLB/.blend, activate version, delete asset
- **Volt Studio sidebar sub-menu**: Vector Designs + 3D Assets split into separate sub-items
- **Multi-format 3D viewer**: `volt-3d-viewer.html` now supports GLB, GLTF, FBX, OBJ via auto-detection or manual FORMAT OVERRIDE dropdown in the 3D Objects modal; format badge shown top-right in viewer
- **3D thumbnail preview in Volt Designer**: after previewing a version in the modal, a JPEG thumbnail is auto-captured from the Three.js renderer (150ms settle) and stored on `layer.object3DData.thumb`; canvas renders thumbnail image instead of dashed placeholder once available
- **Layer grouping** (`Ctrl+G`): select multiple layers and group them; group accordion in layer panel; collapse/expand; ungroup; delete group with children
- **Layer + group renaming**: double-click name or click hover pencil icon (✏) to rename inline on any layer or group

### Removed

- Trigger Events UI removed from 3D object layer properties panel (feature deferred)

---

## [Unreleased — previous sprints]

### Added
- **Animated Background System for FLEXIBLE sections** (`lib/anim-bg/`)
  - 8 preset animation types: `floating-shapes`, `moving-gradient`, `particle-field`, `waves`, `parallax-drift`, `3d-tilt`, `custom-code`, `3d-scene`
  - Configurable layered stack — up to 3 simultaneous animation layers per section
  - Per-layer controls: opacity, blend mode (`normal`, `multiply`, `screen`, `overlay`, `soft-light`), color palette toggle
  - Intensity overlay: semi-transparent veil to keep content readable over animations
  - `IntersectionObserver` pause/resume — animations stop when section leaves viewport
  - `prefers-reduced-motion` hard-stop — no animations start on accessibility-reduced-motion OS setting
  - Mobile degradation — only `floating-shapes` and `moving-gradient` run on `<768px` viewports
  - "Animation" tab added to `FlexibleSectionEditorModal` (between Background and Text Overlay)
  - Full round-trip persistence via `content.animBg` JSONB — no DB migration required
  - Three.js `3d-scene` layer with GLTFLoader for `.glb` model uploads
  - Monaco Editor code tab for `custom-code` layer type (admin-only)
- Mobile-responsive hero carousel with mobile-specific images and background colors
- Custom background color support (hex colors in addition to presets)
- Color palette system for sections (colorPalette, colorPaletteHarmony, colorPaletteLocked)
- Multi-screen section support (contentMode: "single" or "multi")
- Text overlay support for normal sections with animations
- Triangle overlay mobile-responsive scaling

### Fixed
- Section CSS scoping to prevent conflicts with admin modals and Monaco Editor
- Triangle overlay rendering and z-index issues
- Navigation scroll context to use #snap-container
- Bootstrap class consistency in hero carousel position classes

### Changed
- Section styles now scoped to #snap-container
- Background color type now accepts both preset names and custom hex colors
- Navigation functions now use snap container as scroll context
- Anime.js v4 API throughout (`animate(targets, props)`, `ease:`, `resume()`)

---

## [2026-02-16] - Mobile Enhancements & Bug Fixes

See [CHANGES_2026-02-16.md](./CHANGES_2026-02-16.md) for detailed documentation.

### Added
- Mobile background colors for hero carousel slides
- Mobile-specific image support (portrait-oriented)
- Custom hex color support for section backgrounds
- Automatic dark background detection with luminance calculation
- Color palette fields (colorPalette, colorPaletteHarmony, colorPaletteLocked)
- Multi-screen section mode (contentMode: "single" or "multi")
- Text overlay support for normal sections

### Fixed
- Section CSS scoping issues with admin modals
- Triangle overlay clipping and z-index problems
- Bootstrap class consistency (changed from Tailwind classes)
- Navigation scroll context (now uses #snap-container)
- Triangle overlay mobile scaling

### Changed
- Section styles scoped to #snap-container to prevent conflicts
- Background color type now supports custom hex colors
- Navigation utilities updated for snap container integration
- Mobile detection added to hero carousel component

---

## [2026-02-13] - Scroll Snap System Rewrite

### Added
- Snap container wrapper (`#snap-container`) for scroll snap system
- CSS-only scroll snap implementation
- Internal scrolling for long-content sections

### Fixed
- Chromium scroll snap reliability issues
- Viewport snap behavior inconsistencies

### Changed
- Moved scroll snap from html element to wrapper div
- Removed JavaScript snap controller
- Updated navbar scroll detection to use snap container

### Removed
- SmartSnapController (conflicted with CSS mandatory snap)
- JavaScript-based snap manipulation

---

## [2026-02-10] - Section Height & Scroll Mechanics

### Added
- 100vh section mechanics with internal scroll containers
- Section content wrapper for overflow handling
- Padding controls for sections (paddingTop, paddingBottom)

### Fixed
- Section height consistency across pages
- Content overflow in long sections

### Changed
- All sections now enforce 100vh height
- Long content scrolls internally via .section-content-wrapper
- Removed external margins on sections (use internal padding)

---

## [2026-02-07] - Prototype Migration & Shape Manual

### Added
- Shape manual prototype page features
- Triangle overlays and section wrappers
- Advanced visual effects from prototype

### Changed
- Migrated prototype features to gavin branch
- Updated scroll snap system to match prototype behavior

---

## [2026-01-28] - Pages Feature Implementation

### Added
- Dynamic page creation system (full pages, PDF pages, form pages)
- Page management admin interface
- Footer integration with dynamic pages
- PDF page display with embed/download modes
- Custom form builder with field editor
- Reserved slug protection

### Changed
- Updated footer links to support dynamic page routes
- Enhanced section editor with multi-page support

---

## [2026-01-20] - Canvas Editor & Visual Builder

### Added
- GrapesJS-based visual canvas editor
- 18 draggable element types (text, image, button, layout containers, Bootstrap components)
- Hierarchical layers panel
- Properties panel with styling controls
- Device mode switching (mobile/tablet/desktop)
- Element nesting system
- Keyboard shortcuts for editor

### Changed
- Admin interface with canvas editor route
- Section types to include freeform canvas sections

---

## [2026-01-15] - Section-Based Architecture

### Added
- Dynamic section system with 7 section types:
  - hero-carousel
  - text-image
  - stats-grid
  - card-grid
  - banner
  - table
  - freeform
- Section manager with enable/disable and reordering
- DynamicSection renderer component
- Backend API structure for section data

### Changed
- Pages now use section-based architecture
- All content controlled via backend configuration
- Sections can be reordered and toggled without code changes

---

## [2026-01-10] - Initial Setup

### Added
- Next.js 16 project structure with App Router
- React 19 and TypeScript configuration
- Tailwind CSS v4 with HeroUI component library
- Prisma ORM with PostgreSQL database
- Admin authentication system with JWT
- Basic layout components (Navbar, Footer, Section)
- Hero carousel component
- Mobile-first responsive design approach

---

## Reference Links

- **Detailed Changes**: [CHANGES_2026-02-16.md](./CHANGES_2026-02-16.md)
- **Project Documentation**: See `docs/` folder (gitignored, local only)
- **CLAUDE.md**: Configuration for Claude Code
- **README.md**: Project overview and setup instructions

---

Last Updated: February 16, 2026
