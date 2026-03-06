# Parallax Elements, Lower Third Graphic & Concrete Calculator — Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan from this design.

**Goal:** Add three distinct features — (1) per-element parallax/motion animations, (2) a lower-third decorative shape overlay on any section, and (3) a client-specific concrete calculator with Three.js 3D visualization and SUPER_ADMIN feature toggle.

**Architecture:** All three features extend the existing section config JSONB model. No breaking changes. Feature 3 adds one new Prisma model (`ClientFeature`). Features 1 and 2 share z-index layers with existing overlay/text systems.

**Tech Stack:** Anime.js 4.2 (motion), Three.js 0.183 (3D viz), IntersectionObserver (scroll triggers), Prisma JSONB (config persistence)

---

## Feature 1 — Parallax & Motion Elements

### Placement
- **Flexible sections:** New element type `parallax-image` (#11) in `FlexibleSectionEditorModal.tsx`
- **Normal/CTA/Hero sections:** New **Motion Elements** tab in `NormalSectionEditor`, `CTASectionEditor`

### Data Model

```ts
interface MotionElement {
  id: string;
  src: string;              // image URL (transparent PNG/SVG expected)
  alt: string;
  // Position (absolute within section)
  top?: string;             // CSS value e.g. "60%"
  left?: string;
  right?: string;
  bottom?: string;
  width: string;            // e.g. "300px" or "25%"
  zIndex: number;           // 20 default (above content, below text anim)
  // Parallax depth (scroll speed offset)
  parallax: {
    enabled: boolean;
    speed: number;          // -1 to 1. 0 = no parallax, 0.3 = slow, -0.3 = counter-scroll
  };
  // Scroll entrance
  entrance: {
    enabled: boolean;
    direction: 'top' | 'bottom' | 'left' | 'right';
    distance: number;       // px to travel (e.g. 200)
    duration: number;       // ms (e.g. 800)
    delay: number;          // ms before start
    easing: string;         // anime.js easing e.g. "easeOutCubic"
  };
  // Scroll exit
  exit: {
    enabled: boolean;
    direction: 'top' | 'bottom' | 'left' | 'right';
    distance: number;
    duration: number;
  };
  // Idle loop (while section is visible)
  idle: {
    enabled: boolean;
    type: 'float' | 'bob' | 'rotate' | 'pulse' | 'sway';
    speed: number;          // relative speed 0.5–3
    amplitude: number;      // px or deg
    loop: boolean;          // always true for idle
  };
}
```

Stored in section config JSONB as: `section.content.motionElements: MotionElement[]`

### Z-Index Layers

```
z-index 1   — Section background / image
z-index 5   — Section content (text, cards, etc.)
z-index 10  — Lower third graphic (Feature 2)
z-index 20  — Motion elements (Feature 1)  ← HERE
z-index 30  — Intro text overlay animations
z-index 40  — Section Into shape (existing TAB_TRIANGLE)
```

### Renderer (`MotionElementRenderer.tsx`)
- `useEffect` → IntersectionObserver on parent section → triggers entrance, exit, idle via Anime.js
- `useEffect` → passive scroll listener → computes parallax offset → `translateY` on image
- Returns an absolute-positioned `<img>` per element
- Cleanup: `anime.remove()` + scroll listener removal on unmount

### Admin UI
- **FlexibleSectionEditorModal:** New palette tile "Parallax Image" — clicking opens `MotionElementEditor` modal
- **NormalSectionEditor:** New tab "Motion" between Overlay and Triangle tabs
- `MotionElementEditor` component: image picker → then accordion for each of the 4 modes

---

## Feature 2 — Lower Third Graphic

### Data Model

```ts
interface LowerThirdConfig {
  enabled: boolean;
  mode: 'preset' | 'image';
  // Preset mode
  preset: 'wave' | 'diagonal' | 'arch' | 'stepped' | 'mountain' | 'blob' | 'chevron' | 'ripple';
  presetColor: string;        // hex
  presetOpacity: number;      // 0–1
  // Image mode
  imageSrc: string;           // URL to PNG/SVG with transparent bg
  // Shared
  height: number;             // px, 40–400 range
  flipHorizontal: boolean;
  flipVertical: boolean;
}
```

Stored as: `section.content.lowerThird: LowerThirdConfig`

### Presets — SVG path library (`lib/lower-third-presets.ts`)
8 SVG viewBox paths, all designed to be `100% wide × configurable height`:
- `wave` — smooth sine wave
- `diagonal` — straight diagonal cut
- `arch` — single arch
- `stepped` — two-step staircase
- `mountain` — double peak mountain
- `blob` — organic asymmetric blob
- `chevron` — V-shape chevron
- `ripple` — double wave

### Renderer (`LowerThirdRenderer.tsx`)
- Absolute positioned at section bottom, `width: 100%`, `height: config.height`px
- **Preset mode:** `<svg>` element with `fill={presetColor}` at `opacity={presetOpacity}`
- **Image mode:** `<img>` with `object-fit: cover`, full width
- `transform: scaleX(-1)` when flipHorizontal, `scaleY(-1)` when flipVertical
- z-index: 10 (see layer table above)
- Applied to: `NormalSectionRenderer`, `CTASectionRenderer`, `HeroCarouselSection` wrappers

### Admin UI
- New **Lower Third tab** in all section editors (between Triangle and Spacing tabs)
- Enable/disable toggle
- Mode selector: Preset / Upload Image
- Preset grid: 8 tiles showing shape preview (mini SVG) — click to select, highlighted when active
- Color picker + opacity slider (preset mode only)
- Image upload field (image mode)
- Height slider (40–400px)
- Flip horizontal + vertical toggles
- Live preview at bottom of modal

---

## Feature 3 — Concrete Calculator (Client Feature)

### Part A — Feature Flag Infrastructure

**New Prisma model:**
```prisma
model ClientFeature {
  id        String   @id @default(cuid())
  slug      String   @unique    // e.g. "concrete-calculator"
  name      String              // e.g. "Concrete Calculator"
  enabled   Boolean  @default(false)
  config    Json     @default("{}")
  updatedAt DateTime @updatedAt
}
```

**API:** `GET/PATCH /api/admin/features` — SUPER_ADMIN role required

**Admin UI:** Settings → Features tab (new tab in existing settings page)
- Table of registered features: name | slug | enabled toggle | configure button
- Only SUPER_ADMIN sees this tab

**Hook:** `lib/hooks/useClientFeature.ts`
```ts
function useClientFeature(slug: string): { enabled: boolean; config: Record<string, unknown> }
```
Fetches from `/api/admin/features/[slug]` on mount. Returns `{ enabled: false }` if not found.

### Part B — Concrete Calculator Page

**Route:** `/calculator` (public page, checks feature flag — returns 404 if disabled)

**Calculator types** (extensible via admin config):
1. **Slab** — Length × Width × Depth → volume
2. **Column/Cylinder** — Diameter × Height → volume (π r² h)
3. **Footing/Strip** — Length × Width × Depth → volume
4. **Staircase** — Steps × (Rise × Run × Width) → volume
5. **Custom** (admin-defined formula in settings)

**Outputs per calculation:**
- Volume in m³ and cm³
- Weight in kg (volume × density from settings, default 2400 kg/m³)
- Bags of cement needed (based on mix ratio from settings)
- Estimated cost (bag price × bags + delivery)
- Mix strength rating (15MPa / 20MPa / 25MPa / 30MPa / 35MPa — admin configures)

### Part C — Admin Formula Settings

**Route:** `/admin/features/concrete-settings` (SUPER_ADMIN, only accessible when feature enabled)

**Settings stored in `ClientFeature.config` JSONB:**
```jsonc
{
  "concreteDensity": 2400,          // kg/m³
  "cementBagSize": 50,              // kg per bag
  "cementBagPrice": 95,             // ZAR per bag
  "deliveryFee": 850,               // ZAR flat
  "wastagePercent": 10,             // % to add
  "mixRatios": {
    "15MPa": { "cement": 1, "sand": 3, "stone": 6 },
    "20MPa": { "cement": 1, "sand": 2.5, "stone": 5 },
    "25MPa": { "cement": 1, "sand": 2, "stone": 4 },
    "30MPa": { "cement": 1, "sand": 1.5, "stone": 3 }
  },
  "customFormulas": []              // extensible
}
```

### Part D — Three.js WOW Visualization

**Component:** `ConcreteViz3D.tsx` (dynamic import, `ssr: false`)

**Scene per calculator type:**
- `Slab` → `BoxGeometry(L, D, W)` — flat box
- `Column` → `CylinderGeometry(r, r, H, 32)` — smooth cylinder
- `Footing` → `BoxGeometry(L, D, W)` — box
- `Staircase` → stacked `BoxGeometry` objects, each step

**Material:** `MeshStandardMaterial` with:
- `roughness: 0.85`, `metalness: 0.0`
- Grey concrete color (`#8a8a8a`)
- `bumpScale` noise for surface texture feel
- Or a concrete texture PNG loaded from `/images/concrete-texture.jpg`

**Lighting:**
- `AmbientLight` (soft, `#ffffff`, intensity 0.4)
- `DirectionalLight` (sun, `#fff5e0`, intensity 1.2, casts shadow)
- `HemisphereLight` (sky/ground bounce)

**Controls:** `OrbitControls` — user can rotate/zoom

**Animation sequence on "Calculate" click (Anime.js + Three.js):**
1. Geometry scale tweens from 0 → actual dimensions (0.8s, easeOutBack)
2. Dimension annotation lines draw themselves (SVG overlay, 0.6s)
3. Strength meter arc sweeps from 0 → MPa value (1s)
4. Volume counter counts up (1s, easeOutExpo)
5. "Pour" particle effect: 200 grey `Points` rain down onto the top face (1.5s)
6. Camera auto-orbits slowly (continuous, speed 0.001 rad/frame)

**Dimension annotations:** 2D `<canvas>` overlay (same size as Three.js canvas), drawn after 3D renders, showing L/W/D labels with Anime.js-animated line drawing.

---

## Implementation Phases

### Phase 1 — Feature Flag Infrastructure (prerequisite for Feature 3)
- Prisma migration, API route, admin settings tab, `useClientFeature` hook

### Phase 2 — Lower Third Graphic (simpler, highest visual impact per effort)
- SVG preset library, `LowerThirdRenderer`, admin tab in all editors, apply to section renderers

### Phase 3 — Parallax Motion Elements
- `MotionElement` types, `MotionElementRenderer`, Flexible designer element #11, Normal section Motion tab

### Phase 4 — Concrete Calculator + Three.js Viz
- Calculator page, formula settings, Three.js component, animation sequence

---

## Risk Notes
- `FlexibleSectionEditorModal.tsx` is already 2,150 lines — new element type adds complexity; consider extracting `MotionElementEditor` as fully separate component
- Three.js OrbitControls requires `import` from `three/addons/controls/OrbitControls.js` (available in v0.183)
- Parallax scroll listener must be `passive: true` to avoid blocking paint thread
- Lower third SVG paths must use `preserveAspectRatio="none"` + `viewBox` for responsive stretching
- Client Feature model needs a migration; use `npx prisma migrate dev` (dev) / `prisma db push` (non-interactive)
