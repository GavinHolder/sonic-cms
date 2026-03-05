/**
 * Your Company CMS — Complete Documentation Content
 * Organized as a topic tree with markdown content for each topic.
 */

export interface DocTopic {
  id: string;
  label: string;
  icon?: string;
  children?: DocTopic[];
  content?: string;
}

// ─────────────────────────────────────────────
// CONTENT STRINGS
// ─────────────────────────────────────────────

const OVERVIEW = `
# Your Company CMS — Platform Overview

Your Company CMS is a full-stack content management platform built for business websites.
It gives non-technical administrators complete control over the public website without touching code.

---

## 🔑 Key Concepts

| Concept | Description |
|---------|-------------|
| **Section** | A content block on a page (hero, text, cards, footer, etc.) |
| **Page** | A URL route that contains an ordered list of sections |
| **Landing Page** | The homepage \`/\` — a special page managed from the Landing Page editor |
| **Dynamic Page** | Any route like \`/about\`, \`/services\` — created via the Pages manager |
| **Flexible Section** | A WYSIWYG-designed section using the visual block designer |
| **Normal Section** | A structured section with preset layouts (text+image, cards, stats, etc.) |
| **AnimBg** | Animated background system — canvas-based animations on any section |

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, Bootstrap 5.3 |
| Database | PostgreSQL via Prisma ORM |
| Animation | Canvas 2D, Framer Motion, Anime.js |
| Auth | JWT tokens with auto-refresh |
`;

const ADMIN_ACCESS = `
# Admin Panel Access

## Login

Navigate to \`/admin/login\` and sign in with your admin credentials.

> 🔒 Credentials are managed securely. Contact your system administrator for access details.

---

## Admin Sidebar Navigation

**Mobile:** On screens < 768px, the sidebar is hidden by default. Tap the **☰** button at the top left to open it as a drawer overlay.

---

## User Roles

| Role | Permissions |
|------|-------------|
| **SUPER_ADMIN** | Full access — all sections, pages, users, settings |
| **ADMIN** | Content and media management |
| **EDITOR** | Content editing only |
| **VIEWER** | Read-only access |
`;

const LANDING_PAGE_HOW = `
# Landing Page — How It Works

The landing page (\`/\`) is made up of **sections** stacked vertically. Each section is exactly one full screen tall (**100vh**) and users scroll through them with a smooth **snap effect**.

---

- Scroll is captured by **\`#snap-container\`** (not the browser viewport)
- \`scroll-snap-type: y mandatory\` — the page always snaps to a section, no in-between states
- Each section uses \`scroll-snap-align: start; scroll-snap-stop: always\`

---

## Section Ordering

Sections are ordered by the **order** field (a float, which allows fractional ordering for smooth drag-and-drop). Lower order = higher on the page.

| Order | Section |
|-------|---------|
| 0 | Hero Carousel |
| 1 | Coverage Area |
| 2 | Plans & Pricing |
| 999999 | Footer (always last) |
`;

const SECTION_TYPES = `
# Section Types

There are **4 core section types** in the database, plus the **Flexible** variant:

---

## 1. HERO — Hero Carousel

A full-screen image/video slideshow with text overlays and CTA buttons.

**Key Features:**
- Multiple slides with individual backgrounds (image, video, or solid color)
- Mobile-specific image source or solid color per slide
- Auto-play with configurable interval
- Navigation dots
- Animated text overlays with 12 animation types

---

## 2. NORMAL — Content Section

A structured layout section. Supports a variety of preset layouts combining text, images, cards, stats, and more.

---

## 3. FOOTER — CTA Footer

The bottom section of the page. Contains contact info, navigation columns, social links, and branding.

> **Contact Form Style:** The CTA Footer supports a **Contact Form** mode in addition to its standard button layouts. When selected, the footer renders a custom contact form with OTP email verification. See **Email & OTP** docs for details.

---

## 4. FLEXIBLE — Visual Designer Section

A free-form canvas section designed using the drag-and-drop **Flexible Section Designer**. Supports 10 element types, animated backgrounds, glass/glow effects, and custom gradients.

> See the **Flexible Sections** documentation for full details.

---

## Section Type Comparison

| Feature | HERO | NORMAL | FLEXIBLE | FOOTER |
|---------|------|--------|----------|--------|
| Background color | ✅ | ✅ | ✅ gradient+image | ✅ |
| Background image | ✅ per slide | ✅ | ✅ | ✅ |
| Animated background | ❌ | ✅ | ✅ | ❌ |
| Section Into overlay | ❌ | ✅ | ✅ | ❌ |
| Text overlay | ❌ | ✅ | ✅ | ❌ |
| Padding control | ❌ | ✅ | ✅ | ✅ |
| Scroll snap | ✅ | ✅ | single/multi | ✅ |
| Nav label | ❌ | ✅ | ✅ | ❌ |
`;

const SECTION_EDITOR_OVERVIEW = `
# Section Editor — Overview

Every section (except the Hero) opens in a modal editor when you click **Edit** (pencil icon) in the Landing Page manager.

The editor has **7 tabs**:

---

## Common Header Controls (All Tabs)

These controls appear at the top of the modal regardless of active tab:

| Control | Description |
|---------|-------------|
| **Display Name** | Internal admin label (not shown on website) |
| **Nav Label** | 1-word label shown in navbar (e.g. "Coverage") |
| **Enable/Disable** toggle | Show or hide the section on the live site |
`;

const TAB_CONTENT = `
# Section Editor — Content Tab

The Content tab is where you edit the main body of the section. What you see here changes based on **section type**.

---

### Layout Presets

| Preset | Visual |
|--------|--------|
| \`full-width\` | Text spans the full section width |
| \`split-left\` | Text on left · Image on right |
| \`split-right\` | Image on left · Text on right |
| \`centered\` | All content centered |
| \`cards\` | Grid of feature cards |
| \`stats\` | Large numbered stats in a row |
| \`banner\` | Wide coloured announcement bar |

### Text Animation Types

Applied to heading and body text when section enters viewport:

| Type | Effect |
|------|--------|
| \`fadeIn\` | Fades in from transparent |
| \`slideUp\` | Slides up from below |
| \`slideDown\` | Slides down from above |
| \`slideInLeft\` | Slides in from left |
| \`slideInRight\` | Slides in from right |
| \`scaleIn\` | Scales up from 80% |
| \`zoomIn\` | Zooms in from center |
| \`flipInX\` | Horizontal 3D flip |
| \`flipInY\` | Vertical 3D flip |
| \`bounceIn\` | Bounces in with overshoot |
| \`rotateIn\` | Rotates in from 90° |
| \`blurIn\` | Unblurs from blurry state |

---

## Flexible Section — Content Tab

Opens the **Flexible Section Designer** (full-screen iframe). See the Flexible Sections documentation for complete details.

---

## Footer — Content Tab

| Field | Description |
|-------|-------------|
| Logo URL | Path to footer logo image |
| Company Name | Text fallback if no logo |
| Columns | Array of link columns (heading + list of links) |
| Social Links | Platform + URL pairs |
| Phone | Primary contact number |
| Email | Primary contact email |
| Address | Physical/postal address |
| Copyright text | Bottom bar text |
`;

const TAB_BACKGROUND = `
# Section Editor — Background Tab

Controls the section's background appearance.

---

## Background Color

> ℹ️ **Auto-contrast:** Text color (light/dark) is automatically chosen based on background luminance. Dark backgrounds get white text; light backgrounds get dark text.

---

## Background Image

### Background Image Settings

| Setting | Options | Default | Effect |
|---------|---------|---------|--------|
| URL | Any image URL | — | Sets background image |
| Size | cover / contain / auto | cover | How image fills the space |
| Position | 9 grid positions | center | Where to anchor the image |
| Repeat | none / repeat / repeat-x / repeat-y | none | Tile behaviour |
| Opacity | 0–100% | 100% | Image transparency |
| Parallax | on/off | off | Scroll parallax depth effect |

---

## CSS Gradient Backgrounds

For Flexible sections, you can enter a full CSS gradient string:

\`\`\`css
/* Examples */
linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)
radial-gradient(circle at 30% 50%, #7c3aed, #0f172a)
linear-gradient(to bottom right, #ff6b6b, #feca57, #48dbfb)
\`\`\`
`;

const TAB_ANIMATION = `
# Section Editor — Animation Tab (AnimBg)

The Animation tab gives each section a **canvas-based animated background** layered beneath the content.
Up to **3 layers** can be stacked and blended together.

---

> ♻️ **Performance:** Animations automatically **pause** when the section scrolls out of view and **resume** when it re-enters. This prevents off-screen canvas drawing.

> 📱 **Mobile:** Only \`floating-shapes\` and \`moving-gradient\` run on mobile (< 768px). All other types are suspended for performance.

---

## Layer Controls (shared by all types)

| Control | Range | Description |
|---------|-------|-------------|
| **Enabled** | on/off | Show/hide this layer |
| **Opacity** | 0–100% | Layer transparency |
| **Blend Mode** | normal / multiply / screen / overlay / soft-light | How layer blends with layers below |
| **Use Palette** | on/off | Use section color palette instead of custom colors |
| **Colors** | up to 5 hex values | Custom color set for this layer |

---

> ⚠️ **Auto-correction:** If blend mode is \`screen\` on a light background (would be invisible), it's automatically switched to \`normal\`. Same for \`multiply\` on dark backgrounds.

---

## Overlay Settings

| Setting | Range | Description |
|---------|-------|-------------|
| **Overlay Color** | hex | Color tint applied on top of all layers |
| **Overlay Opacity** | 0–80% | How strong the tint is |

Use overlay to darken the animation and ensure text readability.
`;

const ANIM_FLOATING = `
# AnimBg — Floating Shapes

Soft, blurred geometric shapes that slowly drift across the section.

---

## Settings

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| **Count** | 2–20 | 8 | Number of shapes on screen |
| **Size Min** | 10–200px | 30px | Smallest shape diameter |
| **Size Max** | 10–400px | 120px | Largest shape diameter |
| **Speed Min** | 2–30s | 8s | Fastest drift cycle |
| **Speed Max** | 2–60s | 18s | Slowest drift cycle |
| **Blur** | 0–60px | 12px | Gaussian blur radius |
| **Opacity Min** | 0–100% | 20% | Minimum shape opacity |
| **Opacity Max** | 0–100% | 60% | Maximum shape opacity |
| **Shapes** | circle/blob/square/triangle | all | Which shapes to include |

---

## Shape Types

| Shape | Visual | Best For |
|-------|--------|----------|
| circle | ● | Clean, modern look |
| blob | 〇 | Organic, flowing feel |
| square | ■ | Geometric, techy |
| triangle | ▲ | Dynamic, energetic |

---

## Tips

- High count (15+) + small size = **scattered confetti** effect
- Low count (3–5) + large size + high blur = **ambient color wash**
- Set Speed Max very high (40–60s) for ultra-slow, meditative drift
`;

const ANIM_GRADIENT = `
# AnimBg — Moving Gradient

An animated color gradient that slowly shifts across the canvas.

---

## Settings

| Parameter | Options | Default | Description |
|-----------|---------|---------|-------------|
| **Direction** | horizontal / vertical / diagonal / radial | horizontal | Which axis the gradient moves along |
| **Speed** | 2–60s | 12s | Seconds for one full cycle |
| **Scale** | 100–400% | 200% | Canvas overscan — higher = more color visible |

---

## Tips

- Use **radial** with a center hotspot color to create a spotlight effect
- Pair with a dark section background + **screen** blend mode for a glow wash
- Set Speed to 30–60s for a nearly imperceptible, living texture
`;

const ANIM_PARTICLES = `
# AnimBg — Particle Field

A field of small floating particles, optionally connected by lines.

---

## Settings

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| **Count** | 5–200 | 30 | Number of particles |
| **Size Min** | 1–20px | 2px | Smallest particle dot |
| **Size Max** | 1–30px | 5px | Largest particle dot |
| **Speed** | 0.1–5 | 0.5 | Movement speed (px per frame) |
| **Connect Lines** | on/off | off | Draw lines between nearby particles |
| **Connection Distance** | 50–300px | 120px | Max distance for line drawing |

---

## Tips

- **Connect Lines on** + dark background = network/tech graph aesthetic
- **Count 100+** + tiny size (1–2px) = **starfield** effect
- **Low speed (0.1)** + large size = slow-drifting bokeh
`;

const ANIM_WAVES = `
# AnimBg — Waves

Smooth sinusoidal waves that flow horizontally across the section.

---

## Settings

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| **Wave Count** | 2–5 | 3 | Number of stacked wave layers |
| **Amplitude** | 10–200px | 50px | Height of wave crest |
| **Speed** | 2–30s | 8s | Seconds per full wave cycle |
| **Direction** | left / right | right | Wave flow direction |

---

## Tips

- Stack 3 waves with different opacities (100%, 60%, 30%) for depth
- High amplitude (150px+) on a tall section = dramatic ocean waves
- Use with a dark blue section + light blue/teal colors for a nautical look
`;


const ANIM_PARALLAX = `
# AnimBg — Parallax Drift

Large blurred shapes that move at a different speed to the scroll, creating a parallax depth effect.

---

## Settings

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| **Factor** | 0.05–0.5 | 0.15 | Parallax depth (0.05=subtle, 0.5=strong) |
| **Direction** | vertical / horizontal / both | vertical | Which axis the parallax applies to |
| **Shape Count** | 2–12 | 5 | Number of drifting shapes |
| **Shape Size** | 50–400px | 150px | Diameter of each shape |
| **Blur** | 10–100px | 20px | Gaussian blur on each shape |

> ⚠️ Parallax tracks scroll position on the \`#snap-container\` element.
`;

const ANIM_TILT = `
# AnimBg — 3D Tilt

Applies a subtle 3D perspective tilt to the section based on mouse position.

---

## Settings

| Parameter | Options | Default | Description |
|-----------|---------|---------|-------------|
| **Mode** | mouse / auto / both | mouse | mouse = tracks cursor; auto = loops automatically |
| **Intensity** | 1–20° | 5° | Maximum tilt angle |
| **Speed** | 2–30s | 8s | Auto-loop cycle duration |
| **Perspective** | 500–3000px | 1200px | Camera distance (lower = more extreme perspective) |

---

## Mode Comparison

| Mode | Behaviour |
|------|-----------|
| **mouse** | Tilt follows cursor movement over the section |
| **auto** | Section tilts in a slow loop (no cursor needed) |
| **both** | Auto-loops and also responds to cursor |
`;

const ANIM_CUSTOM = `
# AnimBg — Custom Code

Write your own JavaScript animation that runs on a \`<canvas>\` element.

---

## Interface

The editor provides a Monaco code editor with the following contract:

\`\`\`javascript
// Your code runs with these variables available:
//   canvas    — the HTMLCanvasElement
//   ctx       — canvas.getContext('2d')
//   colors    — array of hex color strings from the layer palette
//   config    — your saved config object

let running = true;
let animId;

function tick() {
  if (!running) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw your animation here
  ctx.fillStyle = colors[0] || '#ff0000';
  ctx.fillRect(10, 10, 100, 100);

  animId = requestAnimationFrame(tick);
}

tick();

// REQUIRED: return control handles
return {
  pause:   () => { running = false; cancelAnimationFrame(animId); },
  resume:  () => { running = true; tick(); },
  destroy: () => { running = false; cancelAnimationFrame(animId); }
};
\`\`\`

---

## Requirements

- Code **must** return an object with \`{ pause, resume, destroy }\` methods
- Use \`requestAnimationFrame\` for smooth animation
- Always call \`ctx.clearRect\` at the start of each frame
- Clean up in \`destroy()\` — cancel timers, rAF loops

---

## Tips

- Colors array is driven by the layer's color palette or section color palette
- Canvas is automatically resized to match the section dimensions
- Code runs in a sandboxed \`Function()\` — no access to other DOM elements
`;

const TAB_OVERLAY = `
# Section Editor — Overlay Tab

The Overlay tab adds a **text layer** that floats over the section.
Use this for scroll-triggered reveal text or permanent callouts.

---

## Overlay Settings

| Setting | Description |
|---------|-------------|
| **Enabled** | Show/hide the overlay |
| **Text** | The overlay text content |
| **Font Size** | Text size in px |
| **Color** | Text color (hex) |
| **Position** | One of 9 grid positions |
| **Animation** | Entry animation type |
`;

const TAB_TRIANGLE = `
# Section Editor — Section Into Tab

**Section Into** adds a decorative SVG shape at the bottom corner of a section,
visually bridging into the next section. Clicking it scrolls to the target section.

---

## Basic Settings

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| **Enabled** | on/off | off | Show the overlay |
| **Side** | left / right | right | Corner placement |
| **Height** | 50–400px | 200px | Height (width = height × 2) |
| **Target Section** | section ID | — | Section to scroll to on click |

---

## Shape Presets (9 options)

| Shape | Description |
|-------|-------------|
| **Triangle** | Standard diagonal triangle |
| **Steep** | Narrow steep triangle |
| **Diagonal** | Full-width diagonal cut |
| **Rhombus** | Diamond/rhombus shape |
| **Curve Out** | Convex curved edge |
| **Curve In** | Concave curved edge |
| **Wave** | S-curve wave shape |
| **Arch** | Arch / rainbow shape |
| **Classic** | CSS border triangle (legacy — no gradient/image support) |

All shapes except **Classic** use SVG rendering, which supports gradients and image fill.

---

## Gradient Fill

| Setting | Options | Default |
|---------|---------|---------|
| **Fill Type** | Solid / Linear / Radial | Solid |
| **Color 1** | hex + alpha | #4ecdc4, 100% |
| **Color 2** | hex + alpha | #6a82fb, 100% |
| **Gradient Angle** | 0–360° | 45° (linear only) |

---

## Image Fill

Upload an image clipped precisely to the selected shape via SVG \`<clipPath>\`.

| Setting | Range | Description |
|---------|-------|-------------|
| **Fill Image** | URL / media picker | Image to display inside the shape |
| **X Position** | 0–100% | Horizontal centre of image (50 = centred) |
| **Y Position** | 0–100% | Vertical centre of image (50 = centred) |
| **Scale** | 50–300% | Zoom level of the image |
| **Opacity** | 0–100% | Image transparency |

> ℹ️ When an image is set, the gradient fill renders at 30% opacity as a tint behind the image.

---

## Hover Text

Optional text that appears on hover.

| Setting | Description |
|---------|-------------|
| **Enable Hover Text** | Toggle on/off |
| **Hover Text** | Text string to display |
| **Text Style** | Style 1 = inside shape; Style 2 = outside shape |
| **Font Size** | px |
| **Font Family** | Google Fonts picker |
| **Animation Type** | slide, sweep, fade |
| **Always Show Text** | Show without hovering (accessibility / preview) |
| **X Offset** | Fine-tune horizontal position |

---

## Mobile Scaling

| Breakpoint | Scale |
|-----------|-------|
| < 576px | 50% |
| 576–768px | 65% |
| 768–992px | 80% |
| > 992px | 100% |

> ℹ️ Sections with Section Into overlays use \`overflow: visible\` and a \`z-index\` bump to render above adjacent sections.
`;

const TAB_SPACING = `
# Section Editor — Spacing Tab

Controls the internal padding of the section.

---

## Settings

| Setting | Range | Default | Description |
|---------|-------|---------|-------------|
| **Padding Top** | 0–200px | 80px | Space above section content |
| **Padding Bottom** | 0–200px | 80px | Space below section content |

> 💡 Keep padding symmetric (same top and bottom) for balanced visual rhythm.
> For sections with Section Into overlays, reduce bottom padding to avoid gaps.

---

## SpacingControls Component

The Spacing tab uses the **SpacingControls** admin component:

- Dual slider interface (drag to set value visually)
- Number input (type exact value)
- Min: 0px, Max: 200px, Step: 1px
- Live preview updates as you drag
`;

const TAB_PREVIEW = `
# Section Editor — Preview Tab

The Preview tab shows a **live render** of the section inside the modal, allowing you to see changes without leaving the editor.

---

## Features

- Renders the section at approximately desktop width
- Shows background color, image, and animation (if AnimBg enabled)
- Shows content layout, text, and buttons
- Triangle overlays are shown (scaled to fit)
- Useful to check contrast and layout before saving

---

## Limitations

- Preview is constrained to the modal width (~900px)
- Some canvas animations may behave slightly differently in preview mode
- Mobile-specific layouts are not shown in preview

---

> 💡 Always save and check the live site at \`localhost:3000\` for the final result — especially for animations and scroll snap behavior.
`;

const FLEXIBLE_OVERVIEW = `
# Flexible Sections — Overview

Flexible Sections use a **drag-and-drop visual designer** to create fully custom layouts. Unlike Normal Sections which have preset layouts, Flexible Sections give you complete control over every element.

---

## How to Open the Designer

1. Go to **Landing Page** in admin
2. Click **+ Add Section → Flexible Section**
3. Click the **Edit** (pencil) icon on the new section
4. The editor modal opens → go to the **Content** tab
5. Click **Open Designer**

The designer opens as a **full-screen iframe** with a block panel on the left and a canvas area on the right where you drag elements to design your layout.

---

## Content Modes

| Mode | Behaviour |
|------|-----------|
| **Single** (default) | Section is exactly 100vh — snaps like all other sections |
| **Multi** | Section grows with content — no height limit, no snap stop |

Set via: Section editor → Content tab → **Content Mode** dropdown.

---

## Positioning Mode

| Mode | Behaviour |
|------|-----------|
| **⟜ Free** (default) | Blocks drop at cursor position — drag anywhere on canvas |
| **⊞ Grid** | Blocks snap to a configurable row/column grid |

Toggle by clicking the **⟜ Free** / **⊞ Grid** badge in the top toolbar.

In Free mode the Properties panel shows **X / Y / W / H sliders** for pixel-precise positioning. Use **Full Width**, **Full Height**, and **Center on Canvas** buttons for quick alignment.

---

## Sub-Element Free Positioning

Within **Hero** and other multi-element blocks, each sub-element (heading, paragraph, button, image) can also be positioned freely within the parent block:

1. Select a block on the canvas
2. Click a sub-element in the Properties panel
3. Use the **X / Y** sliders to offset it within the block
4. The parent block auto-resizes to contain all sub-elements

> **Note:** Drag the block header to reposition the whole block. Drag handles appear on hover.

---

## Media Uploads

All image and video fields in the Properties panel use a **file picker button** — no URL input needed. Click **Upload Image** (or **Upload Video**) to browse local files. Files are stored as data URLs in the section data.

---

## Responsive Layout (Device Preview)

Device preview buttons are in the **Live Preview Canvas** header (top-right of the canvas panel):

| Button | Width | What it does |
|--------|-------|--------------|
| Desktop | Full canvas | Design your main layout here |
| Tablet | 768px | Drag blocks to override tablet positions |
| Mobile | 375px | Drag blocks to override mobile positions |

**How responsive positions work:**

1. Design your layout on **Desktop** first — this is the base layout
2. Click **Tablet** — blocks auto-scale proportionally to 768px
3. **Drag blocks** to any position — the tablet-specific position is saved
4. Click **Mobile** — blocks auto-scale to 375px
5. **Drag blocks** as needed for mobile — saved separately from tablet

When a device-specific position is set, a **yellow (tablet) or cyan (mobile) indicator** appears in the canvas header. Click **↺ Reset** to clear all device overrides and revert to auto-scaled proportional layout.

**On the live site:** The live page automatically applies the correct positions using screen-width detection — desktop, tablet (≤991px), and mobile (≤575px) — giving fully fluid responsive behaviour.

---

## Rulers & Guide Lines

The **Live Preview Canvas** header contains two ruler/guide controls:

| Control | Description |
|---------|-------------|
| 📐 Rulers button | Toggle pixel rulers on/off along top and left edges. **Off by default.** |
| ✕ Clear Guides button | Remove all guide lines you have dragged from the rulers |

**Drag from the top ruler** to create a vertical guide line. **Drag from the left ruler** to create a horizontal guide line. Right-click any guide to delete it individually.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Delete / Backspace** | Delete selected block or sub-element |
| **Ctrl+Z** | Undo last action (up to 10 steps) |

---

## Auto-Save

The designer auto-saves to the parent modal every time you make a change. When you click **Save** in the section editor modal, it persists to the database.
`;

const FLEXIBLE_ELEMENTS = `
# Flexible Sections — Element Types

The block panel on the left contains 10 element types. **Card, Banner, and Stats** now use the same free-positioning sub-element system as Text Block — all content is draggable, dblclick editable, and the block auto-resizes in all directions.

---

## 1. Text Block

A free-form text container. Unlike other blocks, the **Text Block has no visible border** — sub-elements are fully transparent so the canvas preview looks exactly like the live page. A subtle outline appears only on hover or selection to show element boundaries.

### How to use

1. **Drag "Text"** from the block panel onto the canvas — it drops as an empty 600×80 frame
2. Click the **\`+ add\`** button (top-right of the block header) to open the element picker
3. Choose a sub-element type:

| Element | Level | Default Size |
|---------|-------|-------------|
| **H1** — Largest title | \`<h1>\` | 36px |
| **H2** — Section title | \`<h2>\` | 28px |
| **H3** — Sub-title | \`<h3>\` | 22px |
| **H4** — Heading | \`<h4>\` | 18px |
| **H5** — Small heading | \`<h5>\` | 15px |
| **H6** — Label | \`<h6>\` | 13px |
| **Paragraph** — Body text | \`<p>\` | 16px |
| **Button** | — | — |

4. **Double-click** any heading or paragraph on the canvas to edit its text inline — a blue outline appears; press **Enter** (headings) or **Escape** to finish
5. **Drag** any sub-element to reposition it within the block — the parent block **auto-resizes in all directions** (up, down, left, right) to contain it
6. **Drag the right edge** of a sub-element to resize its width — the block also expands/shrinks horizontally

### Block auto-resize behaviour

The parent Text Block **always fits its sub-elements** — it grows and shrinks in all four directions as you drag:
- Moving a sub-element **down** → block grows taller
- Moving a sub-element **up** → block shrinks shorter
- Moving a sub-element **right** → block grows wider (sub-element auto-converts to explicit width on first drag)
- Moving a sub-element **left** → block shrinks narrower

### Sub-element properties (per element in Properties panel)

| Property | Description |
|----------|-------------|
| Text | The text content (input or textarea in the panel; double-click on canvas) |
| Heading Level | h1 – h6 (headings only) |
| Font Size | px value |
| Font Weight | 300 Light → 900 Black |
| Font Family | Google Font picker (95 curated + install any) |
| Color | Hex color |
| Alignment | left / center / right / justify |
| Line Height | Multiplier (e.g. 1.4) |
| Letter Spacing | px offset |
| Text Wrap | Wrap / Break anywhere / Single line |
| X / Y | Position within block (px from top-left) |
| W | Explicit width in px (null = full block width) |
| Custom CSS | Freeform CSS override |

### Empty-state placeholders

When a heading or paragraph has no content yet, the canvas shows a **dimmed italic placeholder** (e.g. *H2 — double-click to edit*). The placeholder is never saved — double-click to replace it with real text.

---

## 2. Image

| Property | Description |
|----------|-------------|
| Src | Upload button (browse local file) — stored as data URL |
| Alt | Accessibility description |
| Width | Fixed width (px or %) |
| Height | Fixed height or auto |
| Object Fit | cover / contain / fill |
| Border Radius | Rounded corners |
| Shadow | Drop shadow preset |
| Animation | Entry animation type |

---

## 3. Video

Embeds a video player (MP4, WebM, or YouTube/Vimeo embed).

| Property | Description |
|----------|-------------|
| Src | Video URL |
| Auto-play | Play on load (muted) |
| Loop | Loop continuously |
| Controls | Show player controls |
| Muted | Required for autoplay |
| Poster | Thumbnail before play |

---

## 4. Button

| Property | Options | Description |
|----------|---------|-------------|
| Label | text | Button display text |
| URL | href | Destination link |
| Variant | filled / outline / ghost | Visual style |
| Color | hex | Button color |
| Size | sm / md / lg | Button size |
| Full Width | on/off | Stretch to container width |
| Animation | type | Entry animation |

---

## 5. Banner

A full-width announcement or CTA banner. Like Text Block, Banner uses a **free-positioning sub-element system** — all content is made of draggable, editable sub-elements on the canvas.

**Default sub-elements (on drop):** Heading + Paragraph + Button

**Block-level properties:**
| Property | Description |
|----------|-------------|
| Background | Block background color |
| Text | Default text color inherited by sub-elements |

Use the **\`+ add\`** button (top-right of block header) to add more sub-elements. All sub-elements are draggable and double-click editable. The block auto-resizes in all directions as you drag sub-elements.

---

## 6. Card

A content card block with a **free-positioning sub-element system**.

**Default sub-elements (on drop):** Image + Heading + Paragraph + Button

Use the **\`+ add\`** button to add more sub-elements. All sub-elements are draggable and dblclick editable. The block auto-resizes to fit its contents.

**Block-level properties:**
| Property | Description |
|----------|-------------|
| Background | Card background color |
| Card Style | shadow / flat / border |
| Glass Effect | none / light / dark (backdrop blur) |

---

## 7. Stats

A statistics display block with a **free-positioning sub-element system**.

**Default sub-elements (on drop):** Icon (bi-graph-up, 48px) + Heading (99%) + Paragraph (Uptime)

Use the **\`+ add\`** button to add more sub-elements including the **Icon** type. All sub-elements are draggable. The block auto-resizes to fit its contents.

**Block-level properties:**
| Property | Description |
|----------|-------------|
| Background | Block background color |
| BG Opacity | 0–100% — supports transparent/semi-transparent backgrounds |
| Text Color | Default text color for sub-elements |

---

## 7a. Icon Sub-Element

Available inside **Banner, Stats, Card, and Text Block** via the \`+ add\` menu.

Renders a Bootstrap Icon (\`<i class="bi ...">\`) as a positioned element within a block.

| Property | Description |
|----------|-------------|
| Icon (bi-...) | Bootstrap icon class, e.g. \`bi-wifi\`, \`bi-graph-up\` |
| Preview | Live icon preview in the properties panel |
| Size | 16–96px |
| Colour | Hex color |
| Align | left / center / right |
| X / Y | Position within block |
| Custom CSS | Freeform CSS override |
| Animation | Entrance animation effect (see 7b below) |

> No double-click inline edit (icons have no text content). Draggable and width-resizable like all other sub-elements.

---

## 7b. Sub-Element Entrance Animations

**Every sub-element** (heading, paragraph, icon, button, badge) has a granular **Animation** section in its Properties panel. Animations are **static by default** — they only play on the live page when the element scrolls into view.

### Available effects

| Effect | Description |
|--------|-------------|
| None | No animation (default) |
| Fade In | Opacity 0→1 |
| Slide Up | Translates up from below |
| Slide Down | Translates down from above |
| Slide In Left | Slides in from the left |
| Slide In Right | Slides in from the right |
| Zoom In | Scale 0.5→1 |
| Bounce In | Spring-physics bounce |
| Blur In | Blur → sharp |
| Count Up | Animated number increment (headings/paragraphs) |
| Typewriter | Character-by-character text reveal (headings/paragraphs) |

### Controls

| Control | Description |
|---------|-------------|
| Effect | Dropdown — choose from 10 effects |
| Duration | 100–5000ms — how long the animation runs |
| Delay | 0–3000ms — pause before starting |
| Loop | Toggle — replay the animation every time the section re-enters view |

### Notes

- **Count Up** — reads the numeric value from the text content and counts from 0 to that value using easing. Best used on headings showing statistics (e.g. "99%", "1200+")
- **Typewriter** — types each character with a small delay. Best used on short headings
- A **blue "ANIM" badge** appears on the sub-element in the designer canvas when an animation effect is active
- Animations are **IntersectionObserver-triggered** on the live page — they fire each time the element enters the viewport (or once if Loop is off)

---

## 8. Divider

A horizontal or vertical separator line.

| Property | Options | Description |
|----------|---------|-------------|
| Orientation | horizontal / vertical | Line direction |
| Style | solid / dashed / dotted / gradient | Line appearance |
| Thickness | 1–20px | Line weight |
| Color | hex | Line color |
| Spacing | px | Margin above/below |

---

## 9. HTML

Raw HTML block — paste any embed code or custom markup.

| Property | Description |
|----------|-------------|
| Code | Raw HTML (parsed and rendered) |

> ⚠️ Use carefully. Scripts are not executed for security reasons.

---

## 10. Hero

A full-height hero banner element within a flexible section — stretches to fill the parent block height automatically.

| Property | Description |
|----------|-------------|
| Heading | Large heading text |
| Subheading | Supporting text |
| Background | Gradient or image (upload button) |
| Buttons | Array of CTA buttons (each with optional background image) |
| Overlay | Color overlay opacity |

**Sub-element positioning:** Each sub-element (heading, paragraph, each button) has its own **X / Y offset sliders** in the Properties panel for precise placement within the hero block. The parent block auto-resizes to fit all sub-elements.

---

`;

const FLEXIBLE_STYLING = `
# Flexible Sections — Element Styling

Every element block in the designer now has a **three-tab editor**: **Content**, **Style**, and **Animate**.

Open the editor by clicking any block accordion in the Section editor (Content tab → element list).

---

## Content Tab

Basic configuration for the block itself.

| Field | Description |
|-------|-------------|
| **Block Label** | Internal name — not shown to visitors |
| **Background** | Solid fill colour for the block |
| **Glass Effect** | Frosted glass overlay (Light or Dark variants) |
| **Pad Top / Bottom** | Inner vertical padding (0–200 px) |
| **Pad Left / Right** | Inner horizontal padding (0–200 px) |
| **Element Gap** | Space between nested sub-elements (headings, paragraphs, buttons) |
| **Custom CSS** | Raw CSS applied to the block wrapper for advanced customisation |

---

## Style Tab

Visual layer customisation — backgrounds, borders, shadows, and animated effects.

| Field | Type | Description |
|-------|------|-------------|
| **Text Color** | Color picker | Overrides the default text colour inside the block |
| **BG Image** | URL / upload | Background image — takes priority over the solid BG colour |
| **BG Gradient** | CSS string | CSS gradient e.g. \`linear-gradient(135deg,#0f0c29,#302b63)\` |
| **Overlay Color** | Color picker | Semi-transparent colour layer over a BG image or gradient |
| **Overlay Opacity** | 0–80% slider | Strength of the overlay (0 = off) |
| **Border Color** | Color picker | Colour of the block border |
| **Border Width** | 0–10 px slider | Thickness of the border |
| **Box Shadow** | Dropdown | Drop shadow preset |
| **Visual Effect** | Dropdown | Animated CSS effect |
| **Glow Color** | Color picker | Colour used by Hover Glow and Pulse Glow effects |

### Box Shadow Presets

| Option | Shadow |
|--------|--------|
| **None** | No shadow |
| **Small** | Subtle 8 px shadow |
| **Medium** | Standard 18 px shadow |
| **Large** | Deep 32 px shadow |
| **Extra Large** | Dramatic 60 px shadow |
| **Glow** | Coloured glow using the Glow Color field |

### Visual Effects

| Effect | Behaviour |
|--------|-----------|
| **Hover Glow** | Soft halo appears when the user hovers over the block |
| **Shimmer Sweep** | Shimmering light stripe sweeps continuously across the surface |
| **RGB Glow** | Animated rainbow border that cycles through the spectrum |
| **Pulse Glow** | Glow breathes in-and-out on a 2.5 s loop |

> **Tip:** Combine **BG Gradient + Hover Glow + Large Shadow** for premium card styling.

---

## Animate Tab

Controls a one-shot **scroll entry animation** — plays once when the block first enters the viewport.

| Field | Description |
|-------|-------------|
| **Scroll Animation** | Choose an animation from the list below |

### Available Animations

| Name | Effect |
|------|--------|
| **None (instant)** | Block appears immediately — no animation |
| **Fade In** | Fades from invisible to visible |
| **Slide Up** | Rises 48 px upward while fading in |
| **Slide Down** | Drops 48 px downward while fading in |
| **Slide from Left** | Sweeps in from the left while fading in |
| **Slide from Right** | Sweeps in from the right while fading in |
| **Scale In** | Grows from 80 % to 100 % while fading in |
| **Zoom In** | Shrinks from 120 % to 100 % while fading in |
| **Flip X** | 3D horizontal flip |
| **Flip Y** | 3D vertical flip |
| **Bounce In** | Spring overshoot — snaps into place |
| **Rotate In** | Spins from 90° to 0° while fading in |

All animations use a **0.65 s cubic-bezier(0.16, 1, 0.3, 1)** easing — snappy entry, smooth landing.

> The animation fires **once per page load**, triggered by IntersectionObserver when at least 10 % of the block is visible.
`;

const FLEXIBLE_ANIMATIONS = `
# Flexible Sections — Element Animations (AnimBg)

> **Note:** For per-block scroll animations, see the **Element Styling** topic — each block has its own **Animate** tab.

This topic covers the **section-level AnimBg** animated backgrounds — the full-screen layer effects applied to the entire section canvas.

---

## Where to Configure

Section editor → **Animation** tab → click **+ Add Layer**.

---

## Available Layer Types

| Type | Effect | Duration |
|------|--------|----------|
| **Floating Shapes** | Coloured geometric shapes drift around | continuous |
| **Moving Gradient** | Slow colour mesh gradient shifts | continuous |
| **Particle Field** | Dots/stars with linking lines | continuous |
| **Waves** | Animated SVG wave bands | continuous |
| **Parallax Drift** | Image/colour layer that drifts on scroll | scroll-linked |
| **3D Tilt** | Section tilts with mouse cursor movement | mouse-linked |
| **Custom Code** | Raw JavaScript canvas/WebGL | custom |

---

## Per-Block Scroll Animations

Each element block also has its own entry animation (Fade In, Slide Up, Bounce In, etc.) in the **Animate** tab of the block editor. See **Element Styling → Animate Tab** for the full list.

---

## Blend Modes & Opacity

Each AnimBg layer supports:

| Setting | Description |
|---------|-------------|
| **Opacity** | 0–100 % |
| **Blend Mode** | normal / screen / multiply / overlay / soft-light |

The renderer auto-corrects invisible blend modes (e.g. \`screen\` on a light background becomes \`normal\`).
`;

const HERO_CAROUSEL = `
# Hero Carousel

The Hero Carousel is the first section on the landing page — a full-screen slide show.

---

## Slide Settings

| Setting | Description |
|---------|-------------|
| **Background Image** | Full-size backdrop image URL |
| **Background Video** | MP4/WebM video URL (auto-muted, loops) |
| **Background Color** | Solid color fallback |
| **Mobile Image (mobileSrc)** | Portrait-ratio image for phones |
| **Mobile Bg Color (mobileBgColor)** | Solid color on mobile (overrides image) |
| **Heading** | Main slide title |
| **Sub-heading** | Supporting description |
| **Eyebrow** | Small label above heading |
| **CTA Buttons** | Up to 2 buttons with labels + URLs |
| **Content Position** | Where the text sits (9 grid positions) |
| **Text Alignment** | left / center / right |
| **Overlay Opacity** | Dark overlay on background for text contrast |
| **Animation** | Entry animation for text elements |

---

## Carousel Controls

| Setting | Default | Description |
|---------|---------|-------------|
| **Auto-play** | ✅ on | Automatically advance slides |
| **Interval** | 5000ms | Milliseconds between slides |
| **Show Dots** | ✅ on | Navigation dot indicators |
| **Show Arrows** | ✅ on | Left/right navigation arrows |
| **Transition** | fade | Slide transition style |
`;

const PAGES_SYSTEM = `
# Pages System

The Pages system lets you create additional routes beyond the landing page.
Access via **Admin → Content → Pages**.

---

## Page Types

### 1. Designer Pages ⭐ Default

Full-screen visual builder pages using the **Flexible Section Designer**.

- Edit via full-screen designer overlay (opened from the edit button)
- Content built with the same 11-element Flexible Section designer
- Renders in **multi mode** — page grows to fit content (no 100vh scroll snap)
- This is the **default type** when creating a new page

---

### 2. PDF Pages

Embeds a PDF document in the page.

| Setting | Description |
|---------|-------------|
| **PDF URL** | Direct link to .pdf file |
| **Display Mode** | embed / download / both |
| **Description** | Text shown above the viewer |

---

### 3. Full Pages (Legacy)

Full pages use the same section system as the landing page.

- Edit sections at \`/admin/page-editor/{slug}\`
- Same section types as landing page (HERO, NORMAL, CTA, FLEXIBLE, FOOTER)
- New full pages cannot be created — use Designer Pages instead
- Existing full pages continue to work

---

### 4. Form Pages

Dedicated contact or inquiry form pages — visitors fill in fields and submit to reach you.

**Create via:** Admin → Content → Pages → **Contact Form**

---

#### Field Types

| Type | Description | Notes |
|------|-------------|-------|
| **text** | Single-line text input | General purpose |
| **email** | Email address input | Validated format; used for OTP delivery |
| **phone** | Phone number input | No format restriction |
| **textarea** | Multi-line text area | For longer messages |
| **select** | Dropdown with custom options | Enter options one per line |
| **checkbox** | Yes/No toggle | Good for consent or opt-in |

> ⚠️ Every form **must include an email field** for OTP verification to work. Without an email field, the form cannot send the verification code.

---

#### Building Your Form

1. Go to **Admin → Content → Pages** and click **Edit** (pencil) on a Form Page
2. Click **Add Field** to add a new field
3. For each field:
   - Choose a **field type** from the dropdown
   - Enter a **label** (shown to the visitor)
   - Toggle **Required** if the field must be filled in
   - For **select** type: enter each option on a new line
4. Drag the **⠿ handle** on any field row to **reorder** fields
5. Click the **trash icon** to delete a field
6. Set a **Success Message** (shown after the form is submitted successfully)
7. Set the **Submit Action** (Email or Webhook)
8. Click **Save**

---

#### Submit Actions

| Action | Description |
|--------|-------------|
| **Email** | Sends form data to the Admin Notification Email (requires SMTP config) |
| **Webhook** | POSTs form data as JSON to any URL (e.g. Zapier, Make, custom API) |

---

#### OTP Email Verification Flow

When the submit action is **Email**, submissions go through a verification step:

1. Visitor fills in the form and clicks **Submit**
2. Required fields are validated — any errors shown inline
3. A **6-digit OTP code** is sent to the visitor's email address
4. A modal dialog appears: visitor enters the code
5. Code is valid for **10 minutes**; visitor can request a resend after 30 seconds
6. On successful verification, the form data is forwarded to the Admin Notification Email with a reply-to set to the visitor's address

> ⚙️ Requires SMTP configured in **Admin → Settings → Email & SMTP**.

---

## Page Management

| Action | Description |
|--------|-------------|
| Create | New page with auto-generated slug from title |
| Edit | Opens settings panel for the page type |
| Toggle | Enable/disable — disabled pages return 404 |
| Duplicate | Clone a page (new slug auto-generated) |
| Delete | Permanently removes page and all its sections |

---

## Reserved Slugs

These slugs cannot be used (they conflict with existing routes):

\`admin\`, \`api\`, \`_next\`, \`images\`, \`coverage\`, \`support\`, \`services\`, \`equipment\`, \`client-login\`, \`home\`, \`index\`
`;

const NAVIGATION = `
# Navigation — Navbar

The navbar adapts its appearance based on scroll position and screen size.

---

## Desktop States

---

## Mobile State

On mobile, the hamburger menu opens a dropdown overlay with all nav links.

---

## Nav Links — Dynamic Loading

Nav links are loaded from the **first 5 non-hero, non-footer sections** on the landing page, sorted by their \`order\` field.

**Rules:**
- Only sections with a \`navLabel\` OR a non-default \`displayName\` appear
- Maximum **5 nav links** — hard limit
- Nav label = **first word** of the label (e.g. "Coverage Area" → "Coverage")
- Navbar polls for changes every **5 seconds** (auto-updates when admin reorders)

---

## Background Color Detection

The navbar automatically adjusts text/icon colors based on the background behind it:

\`\`\`
Dark background  → white logo + white hamburger icon
Light background → dark logo + dark hamburger icon
\`\`\`

---

## Navbar Settings (Admin → Content → Navigation)

| Setting | Description |
|---------|-------------|
| **Logo** | Upload or URL for the navbar logo |
| **CTA Button Text** | Label on the "Client Login" button |
| **CTA Button URL** | Destination link |
| **CTA Button Style** | solid / outlined / ghost |
| **Navbar Background** | Opaque color when scrolled (default: transparent) |
`;

const SETTINGS_PAGE = `
# Admin Settings

Access via **Admin → Settings**.

---

## General Settings

| Setting | Description |
|---------|-------------|
| **Site Name** | Website title (used in browser tab) |
| **Site Description** | Meta description for SEO |
| **Favicon** | Browser tab icon |
| **Logo** | Main site logo (used by Navbar and Footer) |
| **Primary Color** | Brand primary color |
| **Contact Email** | Default contact email address |
| **Contact Phone** | Default phone number |

---

## SEO Settings

| Setting | Description |
|---------|-------------|
| **Meta Title Template** | Format: \`{Page Title} | Your Company\` |
| **Meta Description** | Default meta description |
| **OG Image** | Default social sharing image |
| **Google Analytics ID** | Tracking code (e.g. G-XXXXXXX) |
| **Robots** | index/noindex, follow/nofollow |

---

## Performance Settings

| Setting | Default | Description |
|---------|---------|-------------|
| **Image Optimization** | ✅ on | Use Next.js image optimization |
| **Lazy Load** | ✅ on | Load images as they enter viewport |
| **Preload Hero** | ✅ on | Preload first slide's image |
| **Animation on Mobile** | limited | Only floating-shapes and moving-gradient on mobile |

---

## Security Settings

| Setting | Description |
|---------|-------------|
| **JWT Secret** | Authentication signing key (set via environment variable) |
| **Session Duration** | How long admin sessions last (default: 1 hour) |
| **Password Policy** | Minimum password requirements |

---

## Maintenance Mode

When enabled, the public website shows a maintenance page while the admin panel remains accessible.

---

## Email & SMTP Settings

Configure outgoing email for contact form OTP verification and submission notifications.

Access via **Admin → Settings → Email & SMTP** tab.

---

### Settings Reference

| Setting | Description |
|---------|-------------|
| **SMTP Host** | Mail server hostname (e.g. \`smtp.gmail.com\`) |
| **SMTP Port** | Port number — use **587** for TLS (recommended) or **465** for SSL |
| **SMTP Secure** | Toggle ON for port 465 only; leave OFF for port 587 |
| **SMTP Username** | Login email / username for the mail account |
| **SMTP Password** | Account password — stored securely; shown as ●●●●●●●● once saved |
| **From Address** | The \`From:\` name/email shown to recipients (e.g. \`Your Company <info@yourcompany.co.za>\`) |
| **Admin Notification Email** | Where contact form submissions are forwarded after OTP verification |

---

### Common Provider Settings

**Gmail (Google Workspace):**

| Field | Value |
|-------|-------|
| SMTP Host | \`smtp.gmail.com\` |
| Port | \`587\` |
| Secure | OFF |
| Username | your Gmail address |
| Password | App Password (generate at myaccount.google.com → Security → App passwords) |

> ⚠️ Google requires an **App Password**, not your regular account password. Enable 2FA first.

**Outlook / Microsoft 365:**

| Field | Value |
|-------|-------|
| SMTP Host | \`smtp.office365.com\` |
| Port | \`587\` |
| Secure | OFF |
| Username | your Outlook address |
| Password | your account password |

**cPanel / Plesk hosting:**

| Field | Value |
|-------|-------|
| SMTP Host | \`mail.yourdomain.co.za\` |
| Port | \`587\` |
| Secure | OFF |
| Username | full email address (e.g. \`info@yourcompany.co.za\`) |
| Password | email account password |

---

### Test Connection

After saving, click **Test Connection** — this sends a test email to the Admin Notification Email address. If the email arrives, SMTP is working correctly.

**If Test Connection fails:**
- Double-check the host, port, and credentials
- For Gmail: ensure you are using an App Password (not your Google account password)
- For port 465: toggle SMTP Secure ON
- Check that your mail host allows SMTP relay from external IPs

---

### How Email Is Used

| Action | Trigger |
|--------|---------|
| **OTP code sent to visitor** | When visitor submits a contact form (CTA section or Form Page) |
| **Submission forwarded to admin** | After visitor successfully verifies their OTP code |
| **Test email** | When admin clicks Test Connection in settings |

> ⚠️ Email settings must be configured before contact forms or form pages can send emails. Without SMTP, OTP verification will fail with an error.
`;

const MEDIA_LIBRARY = `
# Media Library

Access via **Admin → Media Library**.

Manage all images and files used across the site.

---

## Interface

---

## Supported File Types

| Type | Extensions |
|------|-----------|
| Images | .jpg, .jpeg, .png, .gif, .webp, .svg |
| Videos | .mp4, .webm, .mov |
| Documents | .pdf |

---

## File Operations

| Action | Description |
|--------|-------------|
| **Upload** | Add files from local disk |
| **Copy URL** | Copy file path for use in section editors |
| **Rename** | Change file name |
| **Delete** | Remove file (cannot undo) |
| **Filter** | Filter by type (images / videos / documents) |
| **Search** | Find files by name |

---

## Upload Path

Uploaded files are stored at:
\`/public/images/uploads/{filename}\`

URL format for use in editors:
\`/images/uploads/my-photo.jpg\`
`;

const EMAIL_OTP = `
# Email & OTP Verification

The Email & OTP system enables **verified contact form submissions** from the public website.

---

## How It Works

1. Visitor fills in a contact form (CTA section or Form Page)
2. On submit, a **6-digit OTP code** is emailed to the visitor's email address
3. Visitor enters the code in a modal dialog (valid for **10 minutes**)
4. On successful verification, the form data is forwarded to the **admin notification email**

> This prevents spam and ensures every submission comes from a real, reachable email address.

---

## Prerequisites

SMTP must be configured in **Admin → Settings → Email & SMTP** before email features work.

---

## Where Contact Forms Appear

### CTA Footer — Contact Form Style

The CTA Footer section can display a fully functional contact form instead of its standard button layout.

**To enable:**
1. Open the **Landing Page** editor and click **Edit** on the Footer (CTA) section
2. In the **Content** tab, find the **Style** selector
3. Choose **Contact Form**
4. A field builder appears below — add your fields (see table below)
5. Set a **Form Title** (optional heading above the form)
6. Set a **Success Message** (shown after successful submission)
7. Save the section

**Field types available:** text, email, phone, textarea, select, checkbox

> ⚠️ Include at least one **email** type field — it is used to send the OTP code to the visitor.

### Form Pages

Dedicated contact/inquiry pages at their own URL (e.g. \`/contact\`):

- Create via **Admin → Content → Pages → Contact Form**
- Build fields with the form editor (add/reorder/delete)
- Set **Submit Action** to **Email** to activate OTP verification
- See **Pages System → Form Pages** for full field-builder instructions

---

## OTP Flow Details

| Property | Value |
|----------|-------|
| Code length | 6 digits |
| Expiry | 10 minutes |
| Rate limit | Max 3 codes per email per 10 minutes |
| Replay protection | Code marked \`used\` after successful verification |
| Resend | Available after 30-second cooldown |

---

## Admin Notification Email

When a form is successfully submitted (OTP verified), the form data is emailed to the **Admin Notification Email** configured in Settings.

The email includes:
- All field labels and values in a formatted table
- Source (section name or page title)
- Reply-to set to the visitor's email address (reply directly to respond)

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| "Email not configured" error | Set SMTP settings in Admin → Settings → Email & SMTP |
| OTP email not arriving | Check spam folder; verify SMTP credentials with Test Connection |
| "Too many requests" error | Wait 10 minutes — rate limit reached for that email |
| Code expired | Click **Resend code** to get a fresh OTP |
`;

const USERS = `
# Users & Access

Access via **Admin → Users**.

---

## User Management

| Action | Description |
|--------|-------------|
| **Create User** | Add new admin account |
| **Edit User** | Change name, email, role |
| **Reset Password** | Force password change on next login |
| **Enable/Disable** | Suspend access without deleting |
| **Delete** | Permanently remove user |

---

## Role Permissions Matrix

| Feature | VIEWER | EDITOR | ADMIN | SUPER_ADMIN |
|---------|--------|--------|-------|-------------|
| View dashboard | ✅ | ✅ | ✅ | ✅ |
| Edit sections | ❌ | ✅ | ✅ | ✅ |
| Manage pages | ❌ | ✅ | ✅ | ✅ |
| Upload media | ❌ | ✅ | ✅ | ✅ |
| Delete media | ❌ | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ | ✅ |
| Change settings | ❌ | ❌ | ❌ | ✅ |
| View documents | ✅ | ✅ | ✅ | ✅ |
`;

// ─────────────────────────────────────────────
// TOPIC TREE
// ─────────────────────────────────────────────

export const DOC_TOPICS: DocTopic[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: "bi-rocket-takeoff",
    children: [
      { id: "overview", label: "Overview & Architecture", icon: "bi-diagram-3", content: OVERVIEW },
      { id: "admin-access", label: "Admin Access & Navigation", icon: "bi-shield-lock", content: ADMIN_ACCESS },
    ],
  },
  {
    id: "landing-page",
    label: "Landing Page",
    icon: "bi-house-door",
    children: [
      { id: "landing-how", label: "How It Works", icon: "bi-info-circle", content: LANDING_PAGE_HOW },
      { id: "section-types", label: "Section Types", icon: "bi-layers", content: SECTION_TYPES },
    ],
  },
  {
    id: "section-editor",
    label: "Section Editor",
    icon: "bi-pencil-square",
    children: [
      { id: "editor-overview", label: "Editor Overview", icon: "bi-window", content: SECTION_EDITOR_OVERVIEW },
      { id: "tab-content", label: "Content Tab", icon: "bi-type", content: TAB_CONTENT },
      { id: "tab-background", label: "Background Tab", icon: "bi-image", content: TAB_BACKGROUND },
      { id: "tab-animation", label: "Animation Tab (AnimBg)", icon: "bi-stars", content: TAB_ANIMATION },
      { id: "tab-overlay", label: "Text Overlay Tab", icon: "bi-chat-quote", content: TAB_OVERLAY },
      { id: "tab-triangle", label: "Section Into Tab", icon: "bi-triangle", content: TAB_TRIANGLE },
      { id: "tab-spacing", label: "Spacing Tab", icon: "bi-arrows-expand", content: TAB_SPACING },
      { id: "tab-preview", label: "Preview Tab", icon: "bi-eye", content: TAB_PREVIEW },
    ],
  },
  {
    id: "animated-backgrounds",
    label: "Animated Backgrounds",
    icon: "bi-stars",
    children: [
      { id: "anim-overview", label: "How AnimBg Works", icon: "bi-info-circle", content: TAB_ANIMATION },
      { id: "anim-floating", label: "Floating Shapes", icon: "bi-circle", content: ANIM_FLOATING },
      { id: "anim-gradient", label: "Moving Gradient", icon: "bi-palette", content: ANIM_GRADIENT },
      { id: "anim-particles", label: "Particle Field", icon: "bi-dot", content: ANIM_PARTICLES },
      { id: "anim-waves", label: "Waves", icon: "bi-water", content: ANIM_WAVES },
      { id: "anim-parallax", label: "Parallax Drift", icon: "bi-layers", content: ANIM_PARALLAX },
      { id: "anim-tilt", label: "3D Tilt", icon: "bi-box", content: ANIM_TILT },
      { id: "anim-custom", label: "Custom Code", icon: "bi-code-slash", content: ANIM_CUSTOM },
    ],
  },
  {
    id: "flexible-sections",
    label: "Flexible Sections",
    icon: "bi-grid-1x2",
    children: [
      { id: "flex-overview", label: "Designer Overview", icon: "bi-info-circle", content: FLEXIBLE_OVERVIEW },
      { id: "flex-elements", label: "Element Types", icon: "bi-collection", content: FLEXIBLE_ELEMENTS },
      { id: "flex-styling", label: "Element Styling", icon: "bi-palette", content: FLEXIBLE_STYLING },
      { id: "flex-animations", label: "Section Animations (AnimBg)", icon: "bi-layers", content: FLEXIBLE_ANIMATIONS },
    ],
  },
  {
    id: "hero-carousel",
    label: "Hero Carousel",
    icon: "bi-images",
    children: [
      { id: "hero-overview", label: "Slides & Settings", icon: "bi-sliders", content: HERO_CAROUSEL },
    ],
  },
  {
    id: "pages",
    label: "Pages System",
    icon: "bi-files",
    children: [
      { id: "pages-overview", label: "Full, PDF & Form Pages", icon: "bi-file-earmark", content: PAGES_SYSTEM },
    ],
  },
  {
    id: "navigation",
    label: "Navigation",
    icon: "bi-compass",
    children: [
      { id: "nav-overview", label: "Navbar Settings", icon: "bi-layout-text-window-reverse", content: NAVIGATION },
    ],
  },
  {
    id: "email-otp",
    label: "Email & OTP",
    icon: "bi-envelope-check",
    children: [
      { id: "email-otp-overview", label: "Contact Forms & Verification", icon: "bi-shield-check", content: EMAIL_OTP },
    ],
  },
  {
    id: "admin",
    label: "Admin Panel",
    icon: "bi-speedometer2",
    children: [
      { id: "settings", label: "Settings", icon: "bi-gear", content: SETTINGS_PAGE },
      { id: "media", label: "Media Library", icon: "bi-image", content: MEDIA_LIBRARY },
      { id: "users", label: "Users & Roles", icon: "bi-people", content: USERS },
    ],
  },
];
