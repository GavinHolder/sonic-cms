# Changelog

All notable changes to the White-Label CMS.

> Auto-generated from git history. Run `node scripts/generate-changelog.mjs` to regenerate.

## Unreleased

### Bug Fixes
- align buttons now translate SVG pathData to match bounding box position
- Volt designer cursor forced to default — prevents white cursor from globals.css

### Documentation
- regenerate changelog

---

## v1.24.0 (2026-03-26)

### Features
- Volt full-canvas button — expand any layer to fill entire canvas width+height

### Documentation
- regenerate changelog
- regenerate changelog

---

## v1.23.2 (2026-03-26)

### Bug Fixes
- Volt designer — CW/CH undefined in mousedown handler + zoom uses applyZoom()

---

## v1.23.1 (2026-03-26)

### Bug Fixes
- Volt designer crash — wrong element ID for scroll zoom (artboard-container → canvas-wrap)

---

## v1.23.0 (2026-03-26)

### Features
- enhanced SEO wizard Go Live step — comprehensive Google Search Console guide

---

## v1.22.0 (2026-03-26)

### Features
- changelog system — auto-generated from git history, viewable in admin

---

## v1.21.3 (2026-03-26)

### Bug Fixes
- 3 Volt designer bugs — shape stuck, text auto-size, resize scaling

### Documentation
- add non-negotiable deployment rules — one method, no exceptions

---

## v1.21.2 (2026-03-26)

### Bug Fixes
- deploy handles non-git stacks — stop+start fallback for all Portainer stack types

---

## v1.21.1 (2026-03-26)

### Bug Fixes
- main CMS deploy.yml now preserves Portainer env vars + has fallback method

### Documentation
- add Backup & Restore + Setup Wizard topics to in-app documentation

---

## v1.21.0 (2026-03-26)

### Features
- CMS setup wizard — first-run configuration with Test & Verify for repo/deploy link
- full site backup & restore — DB, media, settings, selective categories

### Bug Fixes
- add error handling to plugin API endpoints (surface errors instead of empty 500)

---

## v1.20.0 (2026-03-26)

### Features
- plugins contribute section types + page types to creation UIs

---

## v1.19.0 (2026-03-26)

### Features
- plugin system docs topic + fix Prisma JSON type errors

---

## v1.18.4 (2026-03-26)

### Bug Fixes
- deploy preserves Portainer env vars during redeploy — reads stack config before PUT

### Refactoring
- notify-clients reads from CLIENT_REGISTRY secret, not CLIENTS.json

### Documentation
- comprehensive client deployment guide — setup, auto-updates, registration, troubleshooting

---

## v1.18.3 (2026-03-26)

### Bug Fixes
- deploy template removes main-repo-only workflows after upstream merge

---

## v1.18.2 (2026-03-26)

### Bug Fixes
- deploy template handles modify/delete merge conflicts during upstream merge

### Refactoring
- remove ALL client-specific references — main CMS is now fully generic

---

## v1.18.1 (2026-03-26)

### Bug Fixes
- deploy template supports PORTAINER_USERNAME secret (defaults to admin)

---

## v1.18.0 (2026-03-25)

### Features
- canonical client deploy workflow template — ONE standard for all clients

---

## v1.17.1 (2026-03-25)

### Bug Fixes
- accept 204 from Portainer webhook (OVB returns 204 not 200)

### Documentation
- add OVB-MIGRATION-BRIEF.md — instructions to standardise OVB deploy pipeline
- update CLIENT-DEPLOYMENT.md — Portainer API approach, secrets reference, stack ID guide
- add CLIENT-DEPLOYMENT.md — standard new client setup checklist

---

## v1.17.0 (2026-03-25)

### Features
- auto-version affects tags, boot-time plugin seeding, registry tests
- sidebar Plugin Manager link + update modal impact analysis
- Plugin Manager admin page — card grid with enable/disable toggles
- plugin API routes — list, seed, get, enable/disable, public
- plugin registry — seed, query, enable/disable, impact analysis, migration
- built-in plugin manifests for all 16 features
- Plugin prisma model for plugin registry
- plugin manifest type definitions

---

## v1.16.1 (2026-03-25)

### Bug Fixes
- always show Manage Types link in Content submenu regardless of content type count

---

## v1.16.0 (2026-03-25)

### Features
- uniform browse + upload buttons on ALL image fields app-wide

---

## v1.15.0 (2026-03-25)

### Features
- update modal progress bar with step-by-step status

---

## v1.14.0 (2026-03-25)

### Features
- media browse buttons, breaking change alerts, fix test

---

## v1.13.0 (2026-03-25)

### Features
- visual icon picker, help text system, remove calculator from settings

---

## v1.12.9 (2026-03-25)

### Bug Fixes
- uniform height for maintenance template preview cards

---

## v1.12.8 (2026-03-25)

### Bug Fixes
- brand fonts scoped to public site only + email icon

---

## v1.12.7 (2026-03-25)

### Bug Fixes
- handle modify/delete merge conflicts in client deploy template

---

## v1.12.6 (2026-03-25)

### Bug Fixes
- skip redundant Build & Deploy on version bump commits

---

## v1.12.5 (2026-03-25)

### Bug Fixes
- auto-version uses PAT so version bump triggers notify-clients

---

## v1.12.4 (2026-03-25)

### Bug Fixes
- test client notification pipeline
- notify-clients now triggers + sidebar scroll stays within nav

---

## v1.12.3 (2026-03-25)

### Bug Fixes
- persist active settings tab in URL hash across page refresh

---

## v1.12.2 (2026-03-25)

### Bug Fixes
- correct Sonic repo name to sonic-cms

---

## v1.12.1 (2026-03-25)

### Bug Fixes
- move client-deploy template out of workflows dir

---

## v1.12.0 (2026-03-25)

### Features
- seed CMS update defaults (upstream URL, channel, workflow)

---

## v1.11.0 (2026-03-25)

### Features
- per-client PATs in notify-clients workflow

---

## v1.10.0 (2026-03-25)

### Features
- scrollable sidebar + complete in-app docs for all features

---

## v1.9.2 (2026-03-25)

### Bug Fixes
- remove gavin ref from Sonic client config — uses main

### Documentation
- add Volt UX & Shortcuts topic to in-app documentation

---

## v1.9.1 (2026-03-25)

### Bug Fixes
- support per-client ref in notify-clients dispatch

---

## v1.9.0 (2026-03-25)

### Features
- global update pipeline, SEO go-live checklist, seed cleanup
- security hardening — rate limiting, audit logs, redirects, code injection
- content scheduling cron + version history UI
- section template library — 14 pre-built designs + gallery modal
- form submissions inbox — dedicated admin page with detail panel
- blog + team content types seeded, RSS feed route
- responsive breakpoints — mobile/tablet/desktop in Volt
- component/symbol system — save and reuse design elements
- scroll-triggered states + exit animations
- clip mask + TS fixes for content types and metadata
- Unsplash photo search in Volt designer image picker
- animation timeline — keyframe editor + Anime.js renderer
- Volt designer UX polish — copy/paste, nudge, distribute, zoom
- expanded Google Fonts + brand colour swatches in Volt designer
- test infrastructure — brand token + content type tests, CI integration
- public content type routes — listing and detail pages
- content type admin UI — type manager, entry list, entry editor, sidebar
- content type engine — Prisma models, lib, and API routes
- brand token admin UI — Brand tab in Settings with full editor
- brand token system — CSS custom properties + Google Fonts injection

### Bug Fixes
- delay instrumentation tick by 5s to avoid Prisma startup race condition
- critical Volt rendering bugs — hover animation, fill types, state transitions

---

## v1.8.2 (2026-03-23)

### Bug Fixes
- remember me now controls cookie persistence

---

## v1.8.1 (2026-03-23)

### Bug Fixes
- dashboard real DB counts + migration fallback

### Documentation
- add deployment guide + gitattributes for client repo isolation

---

## v1.8.0 (2026-03-23)

### Features
- show update notification globally in sidebar for all admin users

---

## v1.7.3 (2026-03-23)

### Bug Fixes
- SEO — add metadataBase, remove ISP-specific sitemap routes

---

## v1.7.2 (2026-03-21)

### Bug Fixes
- persist data/ dir across redeploys — add Docker volume for SEO + navbar config

---

## v1.7.1 (2026-03-21)

### Bug Fixes
- canonicalBase field allows typing https:// — strip trailing slash on blur only
- SEO — canonical fallback, JSON-LD guards, static page metadata, sitemap static routes, admin warning

---

## v1.7.0 (2026-03-21)

### Features
- SEO — fix robots/sitemap generation, smart wizard keyword suggestions + editable description

---

## v1.6.0 (2026-03-21)

### Features
- SEO wizard — multi-select business types with custom comma-separated input

---

## v1.5.0 (2026-03-21)

### Features
- instrumentation.ts — server-side cron for scheduled updates + 45min maintenance failsafe

---

## v1.4.5 (2026-03-21)

### Bug Fixes
- remove blocking health check — complete update immediately on Actions success

---

## v1.4.4 (2026-03-21)

### Bug Fixes
- health check never blocks completion — build success always disables maintenance mode

---

## v1.4.3 (2026-03-21)

### Bug Fixes
- health check verifies container is up (status ok) — not version number

---

## v1.4.2 (2026-03-21)

### Bug Fixes
- verify uses saved PAT from DB + version gap warning + large jump safety

---

## v1.4.1 (2026-03-21)

### Bug Fixes
- add Retry Update button in UpdateModal error phase

---

## v1.4.0 (2026-03-21)

### Features
- update channel publishing system

---

## v1.3.1 (2026-03-21)

### Bug Fixes
- modal z-index above sidebar + add update channel selector

---

## v1.3.0 (2026-03-21)

### Features
- Test & Verify button for CMS Update GitHub config + docs for CMS Updates, SEO Wizard, Features sidebar

---

## v1.2.1 (2026-03-21)

### Bug Fixes
- settings page waits for role before render — CMS Updates tab always visible for SUPER_ADMIN

---

## v1.2.0 (2026-03-21)

### Features
- SEO Wizard — multi-step modal to auto-populate SEO settings from business info
- features sidebar dynamic + dedicated manage page + version in sidebar
- CMS Update system — version check, update badge, modal, GitHub Actions trigger
- maintenance colour picker + live preview
- maintenance page template system — Plain, Construction, Custom
- maintenance page redesign — industrial construction template
- maintenance mode — animated construction worker page + admin toggle
- add apex domain redirect ovbreadymix.co.za → www.ovbreadymix.co.za
- redirect backend.domain to /admin/login via Traefik middleware
- VPS deployment — subdomain routing, multi-site Traefik, ovbreadymix config
- photo-card block type + Overberg Ready Mix v2 seed improvements
- overberg ready mix v2 seed — 8 sections, tall navbar, coverage map, parallax
- volt studio — artboard bg, alignment tools, animation personality, Z-depth for vectors, stroke dash pattern
- volt-designer — hover fills, entrance anim, 3D anim, flip face preview
- volt-designer — state machine (hover state authoring)
- Volt Studio — Google Fonts dynamic loader, expanded font library
- Volt Studio sprint 6 — gradient presets, icon library
- Volt Studio sprints 4+5 — gradient fills, corner radius, blend modes
- Volt Studio Sprint 3 — entrance animations
- Volt Studio Sprint 1+2 — text layers + layer effects
- scroll-story block — Three.js scroll-pinned 3D storytelling section
- flip card — 4 animation types + click/auto triggers + direction/perspective controls
- seed /about and /projects content pages with CTA linking
- Volt flip card, glass morphism fills, SVG gradient rendering + WOW demo seed
- volt — image layer type, demo product card, favicon dynamic loading
- volt phase B, image carousel, navbar style toggle, sidebar fixes
- navbar links manager — admin UI + per-item section/page toggle
- image block — multi-image carousel/slider
- tall navbar variant — phone + social icons, per-client toggle
- seed v6 — BuildPro showcase with Volt cards, 3D slab, dark hex bg fix
- designer V-align + card height mode, CTA 2-column contact layout
- seed v5 — add Why Choose Us parallax 3-zone section, gradient+solid color scheme backgrounds
- designer preview with true viewport simulation (iframe) + canvas UX fixes
- coverage map feature + projects gallery + Overberg ReadyMix seed
- standardised mobile/desktop spacing system
- CTA contact form — shuffled keypad human verification
- scroll stage — 5 zones, 3D threejs track, zone snap points, hidden scrollbar
- Scroll Stage parallax system for multi-section FLEXIBLE sections
- Site Configuration page — company details auto-populate Navbar and Footer
- Volt Designer, 3D pipeline, flexible sections, feature flags, API keys
- 3D thumbnail preview in Volt Designer canvas + remove trigger events
- 3D file format auto-detection with user override (GLB/GLTF/FBX/OBJ)
- 3D Assets admin page with version history and .blend download
- layer grouping + inline rename for layers and groups (Volt Designer)
- mobile-first multi-column sub-element rendering in text-block
- vertical side toolbar, sub-element snap, correct dropdown positioning
- shape presets panel + improved canvas hint readability
- slot transparent skinning, key legend status bar, preset fix, bool-edit workflow
- slot dropdown with descriptions, preset fix, fit layers, better bezier handles, Volt Designer docs
- bezier stub handles, drop shadow, input slot type, updated key legend
- Bezier handles on all shapes in vertex edit + corner rounding slider + slot type dropdown + slot preview mode + cursor fix
- complete Bezier/Pen curve tool (task #16)
- contextual key legend (bottom-left canvas), true ghost shapes for ellipse/line during draw
- tool mode dropdown (auto-select vs sticky), Shift+drag constrains rect/ellipse to square/circle
- auto-cycle shape colors on create — 10-color palette for rect/ellipse/polygon, line stays black
- complete vertex add/delete — Alt+click edge adds vertex, Alt+dblclick handle deletes, red handles + green preview dot in Alt mode, window capture fixes Windows Alt interception
- non-destructive boolean ops, marquee select, drag-reorder layers, fix rename
- shift+click to assign boolean base layer — canvas and layer panel
- Blender addon v1.1 — selection-only export, exclude lights/cameras, selection feedback UI
- boolean ops — color outlines with CUTTER (orange) and BASE (teal) pill labels
- 3D layer properties — clip selector + trigger events editor
- render 3d-object layers in DynamicSection with Volt3DRenderer
- Volt3DRenderer Three.js + IntersectionObserver + triggers
- Volt Designer 3D panel, modal, preview and layer placement
- volt-3d-viewer.html Three.js GLB preview with postMessage bridge
- Blender addon volt-sync.py — export GLB/blend and sync to API
- Volt3D asset sync/confirm/delete API
- admin API keys page with generate/delete UI
- API key management routes
- ApiKey + Volt3DAsset + Volt3DVersion schema models
- polygon vertex editing — double-click to enter, drag vertices to reshape, Esc to exit
- layer rename, boolean ops UX, localStorage autosave, slot type fix
- flexible-designer Phase 4 — Hybrid B+C responsive behavior rules
- flexible-designer Phase 3 — Volt Studio modal overlay from Layout Designer
- flexible-designer Phase 2 UX — section config collapse, empty canvas hint, floating mini-toolbar
- Volt Designer Phase 1 UX overhaul
- volt thumbnails — SVG snapshot on save, shown in library cards
- volt designer — alt+drag duplicate, auto-select after draw, ctrl+snap grid
- volt designer — fix selection/move, add resize handles, polygon tool, canvas size, boolean ops
- replace dark volt studio with bootstrap designer UI (iframe, matches layout designer style)
- add /admin/volt page — Volt Studio library and editor launcher
- add VoltStudio shell, canvas, toolbar, layer panel, property inspector
- VoltRenderer, DynamicSection volt guard, Studio reducer
- add Volt CRUD API routes
- add Volt utility functions, defaults, and personality mapper
- add Volt Studio TypeScript type definitions
- add VoltElement, VoltAsset schema + Section volt fields
- add feature pages to pages admin manager
- 3D viewer controls, navbar scrolled-state on sub-pages, footer partner strip
- Tools dropdown in navbar for enabled feature pages (concrete calculator)
- calculator sliders+scrubber, estimate report modal, sequential ref numbers, calculator admin settings
- concrete calculator public page with 3D viz and Anime.js results
- SEO superpowers — JSON-LD injection, seed script, autosave, docs update
- full SEO management system
- make navbar CTA button configurable via admin navbar settings
- integrate Figma MCP + ai-engineer skill library
- initial white-label CMS (forked from sonic-website)

### Bug Fixes
- restrict CMS Updates settings tab to SUPER_ADMIN only
- maintenance mode — light/dark themes + reduced animations
- serve runtime uploads via route handlers (Next.js standalone limitation)
- ensure images/uploads dir is owned by nextjs in Docker image
- add images_uploads volume to persist logo/favicon uploads across container restarts
- replace tiny form-switch with explicit enable/disable button for maintenance mode
- use RE2-compatible regex in backend redirect middleware
- add migration for all schema additions since 20260303
- force-dynamic on sitemap and robots — stops DB calls at build time
- force-dynamic on root layout — prevents DB calls at Next.js build time
- lazy JWT_SECRET check in auth.ts — prevents Next.js build failure when env not set at build time
- remove invalid secrets reference from workflow if condition
- build image on GitHub Actions, Portainer pulls from ghcr.io — avoids OOM on 2GB VPS
- Overberg Ready Mix — footer text color, contact info in CTA left panel, Why Choose Us stats row
- Overberg Ready Mix v2 — section layout, nav labels, CTA form, mixes typography
- security — JWT fail-fast on missing secret, slug validation in publish route
- hero loads first + redesign Volt card showcase with real photos
- volt-designer — drag/move broken by DOM reorder releasing pointer capture
- designer canvas — re-render on rAF after INIT to fix grid block y=0 stacking
- CTA form — field.id, string options, mobile overflow
- flexible grid — smart row sizing (text/card rows → auto, volt/image → 1fr)
- volt studio z-order (DOM reorder not CSS z-index), add Browse media button
- volt studio — drag bug, shadow, rotation handle, shape auto-select, z-order, logo upload
- section-content-wrapper — enforce min navbar clearance via CSS max()
- scroll snap — use getBoundingClientRect for multi-zone detection
- About Us section — reduce padding + gap so all 5 stats + button fit in 100vh
- admin landing page — responsive sidebar + section rows for mobile/tablet
- flexible designer — Ctrl axis-lock drag + X/Y/W/H slider ID type mismatch
- FLEXIBLE sub-element rendering — centered paragraph, button sizing, video motion elements
- designer — 'text' block type padding, inner padding sliders, supportsAdd, isTextBlock
- pages bugs — invalid date, coverage-maps feature toggle, designer content tab empty, nav button scroll
- canvas designer — button colors, mobile overlap, resize handles, edge pad
- canvas designer — mobile view scrollable to access all stacked blocks
- canvas designer — correct mobile single-column stacking + sub-element IDs
- designer preview — mobile/tablet viewport accuracy + admin header alignment
- stats canvas designer — add Value, Label, Icon, Animate toggle, Duration slider
- About Us 5th stat visible, stats animation controls, designer viewport toggle
- hero editor save buttons + spacing preview + navbar clearance + seed v3
- video upload 200MB limit + show actual error reason on failure
- scroll stage — zone markers use scrollSnapStop: always to prevent skip
- mobile navbar overlap, normal section tabs, tools alignment
- scroll stage — zone 5 text, mobile all-zones, prevent internal scroll
- motion elements not saving + rendering in front of content
- orange bezier handles, real input slot preview, proportional preset scaling
- corner rounding cuts actual corners, handle dots visible at zero-distance, slot dropdown z-index, no rounding compounding
- hide canvas hint immediately on tool switch, not just on next renderCanvas
- hide canvas hint as soon as any tool is active or drawing begins
- translatePath now handles C (cubic Bezier) — pen shapes drag as one unit
- pen tool coordinate space bug + remove hand tool
- boolean subtract mask, cutter vertex edit, alt+click add vertex
- cutter invisible in bool-edit mode — visible:false blocked render before bool-edit check
- bool-edit cutter drag, subtract evenodd, canvas hint readability
- hero block bgType (color/gradient/image/video) + motion elements null save
- refactor 3D Objects modal to Volt Designer's clean white/light UI
- renderAll on shift-click + keyboard shortcut null guard
- boolean outline pills drawn inside shapes to prevent SVG viewBox clipping
- boolean ops strictly isolated to selected cutter + chosen base only
- 3d-object layer missing zIndex/opacity/rotation/blendMode fields
- extract resolveVolt3DUser, animClips validation, path traversal guard
- rawKey display uses code element for consistent monospace
- async bcrypt, key cap (10), JSON parse guard, label length validation
- Volt3DAsset cascade delete + schema header
- volt-designer empty canvas hint — readable blueish color
- volt-designer — smaller handles (5px), thinner selection outline (0.75px), snap on resize handles
- volt designer — handles zoom-invariant across all presets, ctrl+snap on drag
- volt designer — zoom-invariant handles/strokes, correct canvas preset sync
- volt canvas rendering — scale SVG paths from % to pixel space, force remount on element switch
- volt admin layout — AdminLayout pattern, studio z-index, canvas flex height, CLAUDE.md visual inspection rule
- useToast ToastProvider nesting, Next.js 16 params Promise in volt route
- volt admin error handling — toast feedback on all async failures
- volt admin auth guard, show own volts, refresh badges after save
- code quality — save error handling, undo history, click-to-select, NaN guard, hex validation
- stroke cap toggle, row-hover delete reveal, align value alignment
- make visibility/lock toggles undoable, simplify VoltRenderer effect deps
- add Anime.js cleanup in VoltRenderer useEffect
- preserve camera position across 3D scene rebuilds
- mobile hamburger color stable — use effectiveScrolled not background detection
- navbar always-scrolled on sub-pages, section buttons threshold, 3D debounce + dimension lines
- calculator spacing, modal clears navbar, mobile-first layout with 3D viz on top
- concrete settings crash — useToast before ToastProvider
- calculator crash, animejs v4 API, performance + feature link pickers
- mobile-first improvements across layout, cards, and footer
- complete audit fixes — animation, assets, white-label cleanup
- resolve all 295 TypeScript compilation errors

### Documentation
- update maintenance mode docs — templates (Plain/Construction/Custom)
- add Maintenance Mode topic to admin documentation
- update in-app docs + fix video upload streaming
- update TAB_SPACING in-app docs — desktop/mobile tabs, Auto defaults, CSS vars
- add Scroll Stage parallax zones documentation to in-app docs
- update calculator feature docs with 3D viewer capabilities
- update admin docs for z-index layers, opacity control, flexible motion tabs, calculator report
- add Animations & Motion docs with SVG previews for lower-third, motion elements, feature flags
- design doc — parallax elements, lower third graphic, concrete calculator
- add white-label todo checklist and CLAUDE.md pointer

---

