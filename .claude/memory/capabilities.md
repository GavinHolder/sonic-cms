# CMS Capabilities Reference
> **Keep this file updated.** Fast reference — no need to re-read source files for known features.
> Last updated: 2026-03-16

---

## Section Types (`SectionType` enum)

| Type | Renderer | Content field |
|------|----------|---------------|
| `HERO` | `HeroCarousel` | `content.slides[]` |
| `NORMAL` | `NormalSectionEditor` | `content.heading/body/...` |
| `FLEXIBLE` | `FlexibleSectionRenderer` | `content.designerData` |
| `CTA` | `CTASectionEditor` | `content.style/fields/...` |
| `FOOTER` | `FooterSectionEditor` | `content.companyName/columns/...` |

### Section Prisma fields

```prisma
type           SectionType
enabled        Boolean
order          Int
displayName    String?
background     String?       // CSS color, gradient string, or preset name
paddingTop     Int           // default 80
paddingBottom  Int           // default 80
content        Json?         // type-specific content
designerData   Json?         // FLEXIBLE only (also mirrored inside content.designerData)
voltElementId  String?       // Full-Volt section — section is entirely rendered by a VoltElement
voltSlotMap    Json?         // { slotLayerId: contentFieldName } — maps Volt slots to content fields
lowerThird     Json?         // SVG/image at section bottom, z-10
motionElements Json?         // MotionElement[] parallax overlays, z-20
```

---

## HERO Section

### Slide types

```json
{
  "id": "slide-1",
  "type": "image",           // "image" | "video" | "color"
  "src": "https://...",
  "gradient": {
    "enabled": true,
    "type": "preset",
    "preset": { "direction": "bottomRight", "startOpacity": 65, "endOpacity": 40, "color": "#000000" }
  },
  "overlay": {
    "heading":    { "text": "...", "fontSize": 68, "fontWeight": 800, "color": "#fff", "animation": "slideUp", "animationDuration": 900, "animationDelay": 100 },
    "subheading": { "text": "...", "fontSize": 20, "fontWeight": 400, "color": "rgba(255,255,255,0.88)", "animation": "slideUp", "animationDuration": 900, "animationDelay": 300 },
    "buttons": [
      { "text": "CTA", "href": "#contact", "backgroundColor": "#2e7d32", "textColor": "#fff", "variant": "filled", "animation": "slideUp", "animationDelay": 500 },
      { "text": "Secondary", "href": "#services", "backgroundColor": "transparent", "textColor": "#fff", "variant": "outline", "animation": "slideUp", "animationDelay": 620 }
    ],
    "position": "center",
    "spacing": { "betweenHeadingSubheading": 24, "betweenSubheadingButtons": 48, "betweenButtons": 16 }
  }
}
```

### Carousel config

```json
{
  "slides": [...],
  "autoPlay": true,
  "autoPlayInterval": 6000,
  "transitionDuration": 800,
  "showDots": true,
  "showArrows": true
}
```

---

## FLEXIBLE Section — Designer Data

### Top-level structure

```json
{
  "contentMode": "multi",       // omit for single-screen
  "designerData": {
    "contentMode": "multi",     // matches outer
    "multiLimit": 2,            // number of 100vh snap stops (2 = 200vh total)
    "layoutType": "grid",
    "grid": { "cols": 3, "rows": 2, "gap": 20 },
    "blocks": [ ... ]
  }
}
```

### Block base shape

```json
{
  "id": 1,
  "type": "text",              // block type (see table below)
  "position": {
    "row": 1, "col": 1,        // 1-based
    "colSpan": 3,              // optional — default 1
    "rowSpan": 2,              // optional — default 1
    "section": 0               // multi-zone snap index (0, 1, 2...) — used only in multi mode
  },
  "props": { ... }             // type-specific props (see below)
}
```

### Block types

| Type | Key props | Notes |
|------|-----------|-------|
| `text` | `paddingTop`, `paddingBottom`, `paddingX`, `textAlign` | Uses `subElements[]` for content |
| `card` | `bgColor`, `borderRadius` | Uses `subElements[]` for content |
| `stats` | `icon`, `number`, `statLabel`, `bgColor`, `textColor`, `bgOpacity`, `animateCount` | Self-contained stat block |
| `image` | `src`, `alt`, `objectFit`, `borderRadius` | Renders a plain image |
| `volt` | `voltId`, `slotTitle`, `slotBody`, `slotImageUrl`, `slotImageAlt`, `slotActionLabel`, `slotActionHref`, `slotBadge`, `slotIcon` | Renders a Volt Studio element |
| `projects-gallery` | `heading`, `subtext`, `textColor`, `columns` | Pulls from Project DB records |
| `coverage-map` | `mapSlug`, `mapHeight`, `showSearch`, `showGeolocation` | Leaflet map (feature-gated) |
| `concrete-calculator` | — | Calculator widget (feature-gated) |
| `editorial` | `text`, `fontFamily`, `fontSize`, `lineHeight`, `textColor`, `bgColor`, `obstacles[]` | Magazine-style text layout via @chenglou/pretext — text flows around alpha-hull-traced obstacle images. Obstacles: `{id, src, x, y, width, height, useAlphaHull, padding}` all fractional 0-1 except padding (px). Text is selectable DOM spans. |

### `subElements[]` — used in `text` and `card` blocks

```json
[
  { "type": "heading",   "props": { "text": "...", "fontSize": 32, "fontWeight": "800", "color": "#fff", "lineHeight": 1.2, "textAlign": "center", "marginBottom": 24, "letterSpacing": 2, "textTransform": "uppercase" } },
  { "type": "paragraph", "props": { "text": "...", "fontSize": 16, "color": "#9ca3af", "lineHeight": 1.75, "marginBottom": 16 } },
  { "type": "button",    "props": { "text": "Get a Quote", "navTarget": "#contact", "bgColor": "#2e7d32", "textColor": "#fff", "paddingX": 28, "paddingY": 12, "borderRadius": 6, "marginTop": 8 } }
]
```

### Multi-zone position math

```
totalRows = grid.rows × multiLimit
block at section:S, row:R → absoluteRow = S × grid.rows + R
section height = multiLimit × 100vh
each 100vh zone = grid.rows rows
```

---

## CTA Section

```json
{
  "style": "contact-form",       // triggers CTAFooter renderer
  "heading": "Get a Quote Today",
  "subheading": "We'll respond within 2 hours.",
  "formTitle": "Request a Quote",
  "formFields": [
    { "id": "name",  "label": "Full Name",     "type": "text",     "required": true,  "placeholder": "..." },
    { "id": "email", "label": "Email Address", "type": "email",    "required": true,  "placeholder": "..." },
    { "id": "phone", "label": "Phone Number",  "type": "tel",      "required": false, "placeholder": "..." },
    { "id": "type",  "label": "Concrete Type", "type": "select",   "required": false, "options": ["15MPa", "20MPa", ...] },
    { "id": "msg",   "label": "Message",       "type": "textarea", "required": true,  "placeholder": "..." }
  ],
  "formSuccessMessage": "Thank you!",
  "requireEmail": true,
  "emailTo": "info@company.co.za",
  "emailSubject": "Quote Request"
}
```

---

## FOOTER Section

```json
{
  "companyName": "BuildPro Concrete",
  "tagline": "Quality concrete. On time.",
  "copyright": "© 2026 BuildPro Concrete. All rights reserved.",
  "logoUrl": "",
  "textColor": "#d1d5db",
  "accentColor": "#4caf50",
  "columns": [
    { "heading": "Services", "links": [ { "text": "Standard Mixes", "href": "#services" } ] },
    { "heading": "Contact",  "links": [ { "text": "+27 28 312 0000", "href": "tel:..." } ] },
    { "heading": "Company",  "links": [ { "text": "About Us", "href": "#about" } ] }
  ],
  "socials": [
    { "platform": "facebook",  "href": "https://facebook.com/...", "icon": "bi-facebook" },
    { "platform": "instagram", "href": "https://instagram.com/...", "icon": "bi-instagram" }
  ]
}
```

---

## Motion Elements (parallax overlays)

Stored in `section.motionElements` as `MotionElement[]`.
Rendered by `MotionElementRenderer` at z-20 (above content, above lower-third).

```json
[
  {
    "id": "me-unique-id",
    "type": "image",              // "image" | "video" | "volt"
    "src": "https://...",
    "alt": "description",
    "top": "0%",                  // CSS positioning (use top/right/bottom/left)
    "right": "-5%",
    "width": "40%",               // required
    "opacity": 25,                // 0–100
    "zIndex": 5,                  // legacy; prefer "layer"
    "layer": "behind",            // "behind" | "above-lower-third" | "above-content"
    "parallax": { "enabled": true, "speed": 0.25 },
    "entrance": { "enabled": false, "direction": "right", "distance": 60, "duration": 800, "delay": 0, "easing": "outCubic" },
    "exit":     { "enabled": false, "direction": "right", "distance": 60, "duration": 400 },
    "idle":     { "enabled": false, "type": "float", "speed": 1, "amplitude": 10 }
  }
]
```

**Video type** — renders as `<video autoPlay loop muted playsInline>`, `aspectRatio: 9/16`
**Image type** — renders as `<img>`, height auto

> ⚠️ 3D motion overlay: NOT a supported motion element type. 3D content belongs in Volt elements with `3d-object` layers. See Volt3D pipeline below.

---

## Volt Studio — Element Architecture

### VoltElement (DB: `voltElement`)

```typescript
{
  id: string
  name: string
  layers: VoltLayer[]
  states: VoltLayerState[]
  canvasWidth: number    // e.g. 300
  canvasHeight: number   // e.g. 380
  elementType: string    // e.g. "service-card"
  isPublic: boolean
  authorId: string
  tags: string[]
}
```

### Layer types (`VoltLayer.type`)

| Type | Rendered by | Notes |
|------|-------------|-------|
| `vector` | `VoltSvgLayer` (SVG `<path>`) | Shapes, backgrounds, accents |
| `slot` | `VoltSlotRenderer` | Dynamic content placeholders |
| `image` | VoltRenderer (future) | Static image layer |
| `gradient` | VoltRenderer (future) | Gradient fill layer |
| `3d-object` | `Volt3DRenderer` (Three.js) | GLB-based 3D scene |
| `group` | Not yet implemented | |
| `text-decoration` | Not yet implemented | |

> **Important:** `VoltRenderer` only renders `vector` + `slot` layers.
> `Volt3DRenderer` is rendered separately — currently only in `DynamicSection.tsx` (full-volt sections) AND `VoltBlock.tsx` (after task #12 is done).

### Slot types (`slotData.slotType`)

`title` | `body` | `image` | `action` | `badge` | `icon` | `custom`

### VoltLayer — coordinates

All `x`, `y`, `width`, `height` are **% of canvas** (0–100).
`zIndex` is local layer ordering.

### VoltLayer helper functions (seed scripts)

```javascript
function vectorLayer({ id, name, role, x, y, w, h, zIndex, pathData, color, opacity=1, blendMode="normal", animation })
function slotLayer({ id, name, slotType, x, y, w, h, zIndex, fontFamily, fontSize, fontWeight, color, textAlign, buttonVariant, animation })
function defaultAnim(overrides={}) // returns animation personality object
function circlePath(cx, cy, r)     // SVG path string for circle in % space
function roundRectPath(x, y, w, h, r=3)  // SVG path for rounded rect in % space
```

### VoltLayerState (hover/interaction)

```json
{ "id": "uid", "name": "hover", "trigger": "mouseenter", "layerOverrides": { "layerId": { "scale": 1.15, "translateX": -6 } } }
```

### Using a Volt element in FLEXIBLE designer

Block type `volt` with props:
```json
{
  "voltId": "<volt-element-db-id>",
  "slotTitle": "Service Title",
  "slotBody": "Description text",
  "slotIcon": "bi-truck",
  "slotActionLabel": "Learn More",
  "slotActionHref": "#contact",
  "slotBadge": "Featured",
  "slotImageUrl": "https://...",
  "slotImageAlt": "alt text"
}
```

---

## Volt3D Pipeline

### Models

```
Volt3DAsset  (id, name, authorId, thumbnail?, activeVersionId, triggerConfig?)
  └── Volt3DVersion  (id, assetId, versionNum, glbPath, blendPath?, animClips, isConfirmed)
```

### VoltObject3DData (inside a `3d-object` VoltLayer)

```typescript
{
  assetId: string
  assetUrl: string              // = Volt3DVersion.glbPath (public GLB URL)
  assetName?: string
  cameraAzimuth: number         // degrees, 0 = front
  cameraElevation: number       // degrees, positive = above
  cameraDistance: number        // units from origin
  ambientIntensity: number      // 0.0–2.0
  keyLightIntensity: number     // 0.0–3.0
  keyLightAngle: number         // degrees
  transparent: boolean          // transparent background
  backgroundColor?: string      // if !transparent
  wireframe?: boolean           // NEW: override all mesh materials with wireframe
  wireframeColor?: string       // NEW: wireframe color, default "#43a047"
  autoRotateSpeed?: number      // NEW: OrbitControls.autoRotateSpeed, 0=off
  customScale?: { x: number, y: number, z: number }  // NEW: per-axis scale multiplier applied AFTER normalization
  animationMap: Record<string, { trackName: string; loop: boolean } | undefined>
  availableTracks: Array<{ name: string; duration: number }>
  activeClip?: string
  triggerEvents?: Array<{ on: 'animStart'|'animEnd'|'animLoop', loopCount?: number, action: string, targetId: string }>
}
```

### Rendering path

- **Full-Volt section** (`section.voltElementId` set): `DynamicSection.tsx` renders `VoltRenderer` + iterates layers to render `Volt3DRenderer` for each `3d-object` layer.
- **Volt block in FLEXIBLE** (`type:'volt'` block): `VoltBlock.tsx` → `VoltRenderer` + `Volt3DRenderer` for `3d-object` layers (added in task #12).

### Seeding a 3D element

```typescript
const slabAsset = await prisma.volt3DAsset.create({ data: { name: '...', authorId: admin.id } });
const slabVersion = await prisma.volt3DVersion.create({ data: { assetId: slabAsset.id, versionNum: 1, glbPath: 'https://...Box.glb', animClips: [], isConfirmed: true } });
await prisma.volt3DAsset.update({ where: { id: slabAsset.id }, data: { activeVersionId: slabVersion.id } });
// Then use slabAsset.id + slabVersion.glbPath in VoltLayer.object3DData
```

---

## Section Background Values

| Value | Result |
|-------|--------|
| `"#1a1a1a"` | Solid colour |
| `"transparent"` | Transparent |
| `"midnight"` | Built-in gradient preset (dark navy→black) |
| `"linear-gradient(135deg, #1a1a1a 0%, #1b5e20 100%)"` | Custom CSS gradient |
| `"https://..."` | Image URL |

---

## Colour Scheme — Grey + Green

```
DARK GREY:  #0d1117  #111827  #1a1a1a  #212121  #2d2d2d  #374151
GREEN:      #0f1a0f  #1b5e20  #2e7d32  #388e3c  #43a047  #4caf50  #a5d6a7
TEXT:       #ffffff  rgba(255,255,255,0.88)  rgba(255,255,255,0.65)  #9ca3af  #6b7280
GRADIENT 1: linear-gradient(135deg, #1a1a1a 0%, #1b5e20 100%)
GRADIENT 2: linear-gradient(180deg, #1a1a1a 0%, #2e7d32 100%)
```

---

## Pages System

### Page types

`LANDING` | `FULL_PAGE` | `FORM` | `PDF` | `DESIGNER`

- `LANDING` — the main homepage (slug `/`)
- `FULL_PAGE` — section-based pages (admin section editor)
- `FORM` — form page (stored in DB, `formConfig` JSON)
- `PDF` — PDF embed page
- `DESIGNER` — canvas designer page (designerData in localStorage via `cms_designer_<slug>`)

### Key routes

```
GET  /api/pages                  → all pages (type in [FORM,PDF,DESIGNER,FULL_PAGE])
POST /api/pages                  → create page
GET  /api/pages/[slug]           → single page
PUT  /api/pages/[slug]           → update
DELETE /api/pages/[slug]         → delete
POST /api/pages/[slug]/duplicate → duplicate
GET  /api/admin/form-submissions → list submissions (admin)
DELETE /api/admin/form-submissions?id=  → delete submission
POST /api/forms/submit           → submit form (public)
```

---

## Admin UI Patterns

### Toast

```typescript
import { useToast } from "@/components/admin/ToastProvider";
const toast = useToast();
toast.success("Saved!") | toast.error("Failed") | toast.info("...") | toast.warning("...")
```

### Section data in Prisma

```typescript
// FLEXIBLE section content is stored as:
content: { designerData: { layoutType:'grid', grid:{...}, blocks:[...] }, contentMode:'multi' }
// OR accessed directly as section.designerData (Prisma JSON column)
```

### Seeding pattern

```typescript
import { PrismaClient, Prisma } from '@prisma/client';
function j(obj: object): Prisma.InputJsonValue { return obj as Prisma.InputJsonValue; }
await prisma.section.create({ data: { ..., content: j({ designerData: {...} }) } });
```

---

## Known Fixed Bugs (don't re-introduce)

- `verticalAlign: 'center'` on text blocks → `align-self: center` overrides paddingTop. **Never add verticalAlign to text blocks.**
- `duration: 0` on animations crashes WAAPI. Use `0.01` minimum.
- `designerData` in Prisma returns as object (not string) — never `JSON.parse()` without `typeof check`.
- Scroll stage: `.container-fluid overflow-x:hidden` forces scroll container — use `overflow:hidden;height:100%` inline for scroll stage.
- `getPages()` and `getPage()` are async (API calls) — always `await` them.

---

## File Locations (key files)

```
lib/page-manager.ts              — async CRUD for pages (uses /api/pages)
lib/email.ts                     — email sending
lib/auth.ts                      — JWT auth (⚠️ hardcoded fallback secret — known issue)
lib/api-middleware.ts            — requireRole, successResponse, errorResponse, handleApiError
prisma/schema.prisma             — DB schema
components/sections/
  DynamicSection.tsx             — section renderer (all types) + Volt3DRenderer invocation
  FlexibleSectionRenderer.tsx    — FLEXIBLE designer block renderer
  MotionElementRenderer.tsx      — parallax overlay renderer
  Volt3DRenderer.tsx             — Three.js GLB renderer
  VoltBlock.tsx                  — fetches VoltElement + renders via VoltRenderer
components/volt/
  VoltRenderer.tsx               — renders vector + slot layers (NOT 3d-object)
  VoltSvgLayer.tsx               — SVG path renderer
  VoltSlotRenderer.tsx           — slot content renderer
app/admin/content/
  landing-page/page.tsx          — landing page section manager
  pages/page.tsx                 — dynamic pages (form/pdf/designer) + submissions inbox
types/
  section.ts                     — SectionConfig, MotionElement, etc.
  volt.ts                        — VoltLayer, VoltObject3DData, VoltSlots, etc.
  page.ts                        — PageConfig, PageType, etc.
```

---

## Seed Scripts

| Script | Command | What it seeds |
|--------|---------|---------------|
| `db:seed` | `npx tsx prisma/seed.ts` | Admin user + blank default sections |
| `db:seed-readymix` (legacy) | `npx tsx prisma/seed-readymix.ts` | Overberg ReadyMix full site v4 |
| `db:seed-v6` | `npx tsx prisma/seed-v6.ts` | NEW: Full showcase — grey+green, Volt cards, parallax, 3D slab |
| `db:seed-motion-demo` | `npx tsx prisma/seed-motion-demo.ts` | 10 motion/lower-third demo sections |
| (volt cards only) | `node scripts/seed-volt-cards.mjs` | 3 Volt card designs (Neo, Stripe, Glow) |

---

## Current Pending Issues

1. `lib/auth.ts:13-14` — Hardcoded JWT fallback secret (CRITICAL)
2. Zero test coverage (HIGH)
3. `app/api/pages/[slug]/publish/route.ts:47` — Raw SQL without validation (MEDIUM)
