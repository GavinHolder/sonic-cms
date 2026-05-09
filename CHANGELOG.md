# Changelog

All notable changes to the White-Label CMS are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2026-05-09] Session (continued 3)

### Added
- **Media Library overhaul** (`app/admin/media/`): Full rebuild with DB-backed storage:
  - Folder sidebar (`MediaFolderTree.tsx`) — create/rename/delete folders, right-click context menu, drag-and-drop assets onto folder targets with visual highlight
  - Asset grid with pagination (10/20 per page), full-text search, MIME type filter
  - **Multi-select bulk operations** — checkbox per asset card, bulk move to folder, bulk delete (confirmation required)
  - `upload-simple` route now passes `folderId` from query param, creates DB record and returns `mediaId`
  - `MediaMoveModal` tree picker for moving single or multiple assets to any folder
  - `MediaAsset` + `MediaFolder` DB-backed (Prisma) — all uploads visible in gallery pickers
- **Activity log auto-cleanup** (`lib/audit-log.ts`): Entries older than 30 days are pruned on every write — log is now bounded to 30 days ("monthly")
- **Audit logging wired** to media upload, media delete, and media move actions

### Fixed
- **Activity log only logged logins** — now also logs media uploads, deletions, and file moves
- **Changelog page only showed root** `CHANGELOG.md` which was stale (last entry March 2026). Root file now consolidates all history; `docs/CHANGELOG.md` path removed from admin changelog page

### Changed
- Root `CHANGELOG.md` is now the single source of truth for all version history (previously split between committed root file and gitignored `docs/CHANGELOG.md`)

---

## [2026-05-09] Session (continued)

### Fixed
- **Gallery media picker now shows uploaded images**: Root cause was the media library uploading via `upload-simple` (filesystem only, no DB record), while the gallery picker queries `/api/media` (DB-backed). The picker received a successful but empty response and never fell through to the filesystem fallback. Fixed by updating the media library admin to use the DB-backed `/api/media/upload` route and list/delete via `/api/media`. Also fixed `MEDIA_URL` default from `http://localhost:3000/uploads` to `/uploads` so stored asset URLs are relative and work in any environment. **Note:** Images uploaded before this fix have no DB record — re-upload them via Media Library to use them in the gallery.
- **Maintenance mode now applies to standalone pages**: `/standalone/[slug]` and STANDALONE-type pages at `/{slug}` were previously excluded from the maintenance mode check in `app/layout.tsx`. Changed `isPublicRoute` to only exclude `/volt-preview` and `/maintenance-preview` (not all isolated routes), so standalone pages now show the maintenance page when maintenance mode is enabled.

---

## [2026-05-09] Session

### Added
- **Gallery feature** — full photo gallery system:
  - `GalleryCategory` + `GalleryImage` Prisma models with migration (`20260509000000_gallery_feature`)
  - `GALLERY` value added to `PageType` enum
  - 6 API routes: `GET/POST /api/admin/gallery/categories`, `GET/PUT/DELETE /api/admin/gallery/categories/[id]`, `GET/POST /api/admin/gallery/categories/[id]/images`, `PATCH/DELETE /api/admin/gallery/categories/[id]/images/[imageId]`, `POST /api/admin/gallery/categories/[id]/reorder`, `GET /api/gallery/cta-images`
  - Admin UI at `/admin/content/gallery`: two-panel master-detail, dnd-kit drag-to-reorder, multi-select media picker, caption/alt editor
  - Public gallery at `/gallery/[slug]`: masonry grid, pure-React lightbox, floating category drawer
  - `/gallery` hub page redirects to first active category
  - `gallery-cta` Flexible Designer block: parallax photo collage background (mouse parallax on desktop, auto-drift on mobile), stats chips, accent-word highlight, CTA button
  - **Gallery** entry added to sidebar Content section
  - Gallery docs added to in-app documentation
- **Landing page preview** (`/preview/landing-page`): admin-gated preview route renders slug `/` sections exactly as public homepage; dismissable "Preview Mode" badge; Preview button in landing page admin toolbar
- **MediaPickerModal multi-select mode**: new `multi` + `onSelectAssets` props for selecting multiple assets by ID; backwards-compatible (existing `onSelect(url)` unchanged); selection indicators (blue tick + outline); confirm button shows count

---

## [2026-05-08] Session (continued 2)

### Added
- **SMTP test without save** (`app/api/settings/email/test/route.ts`): New dedicated endpoint for testing email settings using form values directly — no save required first. If `smtp_pass` is the masked placeholder `••••••••`, falls back to the stored DB password. Fixes the previous behaviour where the test button always returned "Email not configured" unless settings were saved first.

### Fixed
- **Client config survives demo seeds** (`prisma/seed-showcase.ts`, `prisma/seed-v6.ts`): Demo seeds no longer delete `brand_tokens`, SMTP settings, CMS update config, or GitHub credentials from `SystemSettings`. Wipe now uses `{ where: { key: { notIn: CLIENT_CONFIG_KEYS } } }` to preserve client-configured keys. `seed-v6.ts` also stops deleting `SiteConfig`, and uses `upsert` with `update: {}` for company/contact settings so existing client values are never overwritten by generic demo data.

---

## [2026-05-08] Session (continued)

### Added
- **Mosaic / Bento layout mode in Flexible Designer** (`public/flexible-designer.html`): New "Mosaic / Bento Gallery" option in the Layout Type selector. Row height and gap sliders. Per-block mosaic preset selector (s-lg, s-md, s-sm, s-tall, s-wide, s-mid) — maps to `[colSpan, rowSpan]` pairs on a 12-col grid. Canvas preview uses a correct `nextFree[]` per-column occupancy algorithm to simulate auto-flow placement without overlapping tiles. Mosaic state (rowH, gap, per-block preset) included in undo history (snapshotState/applySnapshot).
- **Section Header/Footer config in Flexible Designer** (`public/flexible-designer.html`): New "Section Header" config box with eyebrow, heading, subheading fields + Centered/Split pill toggle (split mode adds a lead paragraph column). New "Section Footer" config box with enable toggle, left text, and button label/href. All fields serialised in buildJson() — header variant only emits `'split'` (not the default 'centered'), sectionLead only emits when variant is split. Footer only emits when enabled and at least one field is filled.
- **Steps block type in Flexible Designer** (`public/flexible-designer.html`): New "Steps" drag card in Block Library. Props panel: add/remove/edit step rows (number, heading, subtext), number-column-width slider (48–200px), row-dividers checkbox, last-divider checkbox. Canvas thumbnail shows first 3 steps. Round-trips correctly through buildJson() → DesignerBlock renderer.
- **Photo Strip block type in Flexible Designer** (`public/flexible-designer.html`): New "Photo Strip" drag card in Block Library. Props panel: columns slider (1–8), height slider (80–600px), gap slider (0–32px), hover-brightness checkbox, per-image URL inputs with file picker + remove. Canvas thumbnail shows image cells (bi-image placeholder when no src). Round-trips through buildJson() → DesignerBlock renderer.

### Fixed
- `public/flexible-designer.html`: `applyPresetById()` called undefined `renderProps()` and `autoSaveDraft()` — corrected to `renderPropsPanel()` and `autoSave()`.
- `public/flexible-designer.html`: Section header/footer fields now included in snapshotState/applySnapshot so Ctrl+Z correctly restores eyebrow, heading, footer text etc. Header/footer fields cleared when applying a preset so stale values don't carry over.
- `public/flexible-designer.html`: `setHeaderVariant()` and `toggleSectionFooter()` now call `pushHistory()` as first line so toggling is undoable.
- `public/flexible-designer.html`: `addStripImage()` now calls `renderCanvas()` so the photo-strip thumbnail updates immediately when a new image row is added.

---

## [2026-05-08] Session

### Added
- **Hero Stacked Heading Editor** (`SlideEditor.tsx`): New "Heading Mode" toggle in the Overlay tab — Classic (single heading, unchanged) or Stacked (multi-row `headingRows[]`). Stacked mode adds an eyebrow field (text + colour picker), up to 5 heading rows each with text, font size (px), font weight, colour picker, and animation select. Rows are drag-reorderable via a grip handle (drag on handle only — text fields remain selectable). Switching to Stacked copies the existing heading into the first row so no content is lost.
- **Hero Stats Strip** (`HeroCarouselEditor.tsx` + `HeroCarousel.tsx`): New "Stats Strip" tab at the carousel level. Enable/disable toggle + drag-reorderable item list (Bootstrap icon input + text + delete). Max 6 items. Renders as a frosted-glass bar (`rgba(0,0,0,0.55)` + `backdrop-filter: blur(8px)`) pinned at the hero bottom, icon accent colour from `var(--cms-accent)`. Slide controls shift up automatically.
- **Flexible Designer Preset System**: 7 built-in section layout presets in `lib/designer-presets.ts` — About Grid, Services Grid, How It Works, Contact Split, Stats Banner, Features Alternating, Team Grid. Each is a complete `designerData` JSON object with realistic placeholder content.
- **Presets Gallery Modal** (`PresetsGalleryModal.tsx`): Full-screen modal with CSS wireframe thumbnails, shown automatically when creating a new FLEXIBLE section. 8 cards (7 presets + Start Blank).
- **Layouts Tab in Flexible Designer**: New "Layouts" tab in the left sidebar of the designer HTML shows all 7 presets as a list with "Apply" buttons and a confirmation dialog before replacing section content.
- **`contact-form` block type** (`FlexibleSectionRenderer.tsx`): New block for FLEXIBLE sections — configurable fields (name, email, phone, message, subject), custom submit label, success message, optional `emailTo` override. Submits to `/api/forms/submit`. Dark/light aware via `darkBg` prop.
- **`how-steps` block type** (`FlexibleSectionRenderer.tsx`): Numbered step card with dashed horizontal connector line extending right (hidden on last step via `isLast` prop). Accent colour from `var(--cms-accent)`.
- **Placeholder SVG images**: `/public/images/placeholder-tall.svg`, `placeholder-wide.svg`, `placeholder-portrait.svg` — used by preset definitions as image block defaults.
- **Types** (`types/section.ts`): Added `statsStrip` to `HeroSection.content`; added `ContactFormBlockProps` and `HowStepsBlockProps` interfaces.
- **In-app docs** (`lib/admin/docs-content.ts`): Updated Hero Carousel docs (stacked heading, stats strip), Flexible Elements docs (contact-form, how-steps, preset gallery), block count 14→16.

### Fixed
- `FlexibleSectionRenderer.tsx`: Changed `--brand-accent` CSS variable references to `--cms-accent` to match the brand token system emitted by `lib/brand-tokens.ts`.

---

## [2026-05-07] Session

### Added
- **Template import — HTML & ZIP**: `Import Template` button on Template Library page. HTML import runs the CMS integration analyser immediately. ZIP import auto-converts images to WebP (via Sharp), uploads them to `/images/uploads/`, wires each as a `{{cms.media.SLOTNAME}}` variable, bundles non-minified JS inline before `</body>`, and concatenates CSS files into the template CSS field.
- **CMS Integration Analyser** (`Analyse` button on every standalone template card): Opens a modal that scans the template HTML and shows every integration point — forms (with a CMS form dropdown), images/backgrounds/videos (with a per-occurrence Media Library picker), phone/email (one-click `{{cms.phone}}` / `{{cms.email}}` replacement), and external CDN stylesheets (informational). Fixes are applied live in `workingHtml` state and persisted with a single **Save** click.
- **`lib/template-import-utils.ts`**: Shared utility module for both import routes. Contains `analyzeHtml`, `processZip`, `uploadImageBuffer`, `uploadSvgBuffer`, `replaceLocalRef`, `isLocalPath`, `toSlotName`, `dedupeSlotName`. Moving `processZip` here (away from a route file) fixed a Next.js cross-route import build failure on client OVB instances.
- **`POST /api/templates/import`**: Accepts `.html`/`.zip`, delegates to shared utilities.
- **`GET|POST|PATCH /api/templates/{id}/analyze`**: GET analyses stored HTML + returns CMS form pages; POST re-imports from ZIP and updates DB in place; PATCH saves inline HTML fixes.
- **`data-src` and `data-background` detection**: Lazy-loaded images and Swiper/hero-slider backgrounds are now detected by the analyser.
- **Analyse modal shows ALL image sources**: `analyzeHtml(html, false)` (non-local-only mode) surfaces every `<img src>`, `data-src`, `poster`, `background-image`, `data-background`, and video `src` — including CDN URLs and absolute paths — so admins can replace any placeholder with a real CMS media file.
- **ZIP re-import** inside Analyse modal: Drop a new ZIP at any time to refresh images, JS, and CSS in-place without losing other template metadata.
- **Re-linkable at any time**: The Analyse button is always available on standalone template cards. Any image not yet replaced with a `{{cms.*}}` variable reappears as linkable on every subsequent open.
- **Docs**: `docs/TEMPLATE_IMPORT.md` — full reference for import workflow, analyser types, inline fixes, CMS variables, and API endpoints.

### Fixed
- Build failure on OVB Docker builds: `app/api/templates/[id]/analyze/route.ts` was importing `processZip` directly from another route file (`app/api/templates/import/route.ts`). Next.js does not allow cross-route imports. Moved `processZip` to `lib/template-import-utils.ts`; both routes now import from the shared lib.

---

## [2026-05-05] Session

### Added
- **Multi-entry-point routing**: Every enabled page type (Standalone, Full, Form, PDF, Designer) now serves at a clean `/{slug}` URL with no prefix. Middleware detects STANDALONE pages via an internal edge-safe API and rewrites to `/standalone/{slug}` internally — the browser always sees `/{slug}`.
- **Standalone pages suppress navbar/footer**: `layout.tsx` detects standalone pages at `/{slug}` and applies isolated rendering (no site nav/footer), same as `/standalone/*` direct routes.
- **`/standalone/{slug}` permanent redirect**: Old bookmarked or indexed `/standalone/{slug}` URLs permanently redirect (308) to `/{slug}` so search engines and browsers update automatically.
- **Template Library — "Use as Page" button**: Standalone templates now have a rocket-icon button that creates a live published Standalone page in one step — enter title + slug, click Create, page is live at `/{slug}` immediately.
- **CMS Forms (`/cms-forms.js`)**: Public vanilla-JS helper for standalone pages. Add `<script src="/cms-forms.js"></script>` and `data-cms-form` on any form to get the full OTP verification → leads pipeline → admin email notification flow, with no framework dependencies.
- **Admin pages list**: Added "Sections" filter tab and stat card for Full Page type. Preview URLs and page list display now show `/{slug}` for all page types (no `/standalone/` prefix shown).
- **Standalone editor — Forms snippet**: Variables tab in the Standalone HTML Editor now shows the CMS Forms integration snippet with full attribute reference.
- **In-app docs** (`/admin/documents`): Updated Standalone page docs (URL, template-to-page workflow, CMS Forms integration guide), Template Library docs (Use as Page feature), fixed all `/standalone/{slug}` URL references to `/{slug}`.

### Fixed
- `StandalonePageEditorModal.tsx`: Preview URL in modal header updated from `/standalone/{slug}` to `/{slug}`.

---

## [2026-03-31] Session

### Added
- **Volt Studio — Canvas Overflow / Bleed**: `canvasOverflow: 'visible'` setting per design; per-layer `bleed` checkbox lets images, text, and slots extend outside the card boundary. Bleed zone shown as a hatched dashed indicator around the artboard in the designer.
- **Volt Studio — Carousel / Multi-Slide**: Full carousel system on `VoltElementData` — unlimited named slides each with slot content overrides and per-layer visibility. Five transition types (fade, slide-left, slide-right, scale, flip) with Anime.js v4. Prev/next arrows (minimal/rounded/pill styles), dot indicators, auto-play with configurable interval.
- **Volt persistence — `designerData` column**: New `designerData Json?` column on `VoltElement` model stores the full designer payload. Fixes loss of `canvasOverflow`, `carousel`, `flipCard`, `tiltEnabled` and other fields that previously weren't persisted.
- **Docs — Canvas Overflow & Bleed** topic added to Volt Designer section in in-app docs.
- **Docs — Carousel / Multi-Slide** topic added to Volt Designer section in in-app docs.

### Fixed
- `VoltStudio.tsx`: Save handler now always preserves the database element ID — designer payload's empty `id` was overwriting the real DB id, causing PUT requests to fail silently and names to stay "New Design".
- Anime.js v4 carousel transitions: `JSAnimation` has no `.finished` property; fixed by wrapping `animate()` in a `Promise` with `onComplete: () => resolve()`.

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

Last Updated: 2026-05-09
