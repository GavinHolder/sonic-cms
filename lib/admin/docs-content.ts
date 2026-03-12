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
| 1 | About Us |
| 2 | Services |
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

> **Landing page badge:** Section cards in the admin show a **single-block** or **multi-block** badge (info colour) for Flexible sections so you can identify content mode at a glance without opening the editor.

---

## Motion Elements &amp; Lower Third (Flexible Sections)

Flexible sections now support the same **Motion Elements** and **Lower Third** tabs as Normal and CTA sections:

| Tab | What it does |
|-----|-------------|
| **Motion** | Add floating/parallax image overlays with 3-tier depth control (Behind / Above Shape / Above Content) |
| **Lower Third** | Add a decorative SVG shape or image to the bottom of the section |

See **Animations &amp; Motion → Motion &amp; Parallax Elements** and **Animations &amp; Motion → Lower Third Graphic** for full documentation on these features.

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

### Quick Presets

When a Text Block is **empty**, clicking **\`+ add\`** shows a **⚡ Quick Presets** section at the top of the picker with ready-made layouts:

**Single Column**
| Preset | Elements |
|--------|----------|
| Heading + Body | H2 + Paragraph |
| Heading + Body + Button | H2 + Paragraph + Button |
| Title + Subhead | H1 + H4 |
| Badge + Heading + Body | Badge + H2 + Paragraph |
| Heading + Body + Image | H2 + Paragraph + Image |

**Two Column** (side-by-side sub-elements)
| Preset | Elements |
|--------|----------|
| 2-Col: Title \| Body | H2 left + Paragraph right |
| 2-Col: Heading + Body each | H2+Para left + H2+Para right |
| 2-Col: Text \| Image | H2+Para left + Image right |

**Three Column**
| Preset | Elements |
|--------|----------|
| 3-Col: Heading + Body each | H3+Para in each of 3 columns |
| 3-Col: Icon + Heading + Body | Icon+H4+Para in each column |

Column presets use pixel \`x\`/\`w\` positioning on sub-elements — drag the edge handle to resize each column.

---

### How to use

1. **Drag "Text"** from the block panel onto the canvas — it drops as an empty 600×80 frame
2. Click the **\`+ add\`** button (top-right of the block header) to open the element picker
3. Choose a preset (for empty blocks) or add individually:

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

\`admin\`, \`api\`, \`_next\`, \`images\`, \`home\`, \`index\`
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
- Nav label = **first word** of the label (e.g. "About Us" → "About")
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
| **CTA Button Show** | Toggle — show or hide the CTA button entirely |
| **CTA Button Text** | Label displayed on the button (e.g. "Client Login", "Get a Quote") |
| **CTA Button URL** | Destination link — supports any page or external URL |
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

const SEO_MANAGEMENT = `
# SEO Management

Access via **Admin → Content → SEO**.

The SEO system gives you full control over how your website appears in search engines and on social media.

---

## Site-Wide Defaults (Tab: Site Settings)

These apply to every page unless overridden at the page level.

| Setting | Description |
|---------|-------------|
| **Site Name** | Appended to all page titles: "Page Title \| Site Name" |
| **Title Separator** | Character between page title and site name (default: \`\|\`) |
| **Default Description** | Fallback meta description for pages without their own |
| **Canonical Base URL** | Full domain (e.g. \`https://www.yourcompany.co.za\`) — enables canonical tags and absolute sitemap URLs |

> 💡 **SERP Preview** updates live as you type — shows exactly how the homepage will look in Google search results.

---

## Social & Open Graph (Tab: Social & OG)

Controls how pages look when shared on Facebook, LinkedIn, WhatsApp, Slack, and Twitter/X.

| Setting | Description |
|---------|-------------|
| **Default OG Image** | Shown when pages are shared — recommended size **1200×630px** |
| **Twitter Card** | \`summary_large_image\` (large preview) or \`summary\` (small thumbnail) |
| **Twitter Handle** | Your \`@handle\` — shown as "Via @handle" under Twitter cards |

> 💡 **Social Card Preview** shows a realistic WhatsApp/LinkedIn card preview.

---

## Robots & Sitemap (Tab: Robots & Sitemap)

Controls what search engines are allowed to crawl.

| Setting | Description |
|---------|-------------|
| **Disallow Paths** | One path per line — crawlers will not index these |
| **Include Sitemap** | Adds \`Sitemap:\` line to robots.txt pointing to \`/sitemap.xml\` |

**Default disallowed paths:** \`/admin\` and \`/api\` — keep these blocked.

> 💡 **Live robots.txt Preview** shows the exact content of \`/robots.txt\` based on your settings.

---

## Structured Data / JSON-LD (Tab: Structured Data)

LocalBusiness schema is injected into every page's \`<head>\` as JSON-LD.
This is the most powerful SEO signal for local search results and Google Knowledge Panels.

| Setting | Description |
|---------|-------------|
| **Enable** | Toggle structured data injection on/off |
| **Business Type** | schema.org type (e.g. \`LocalBusiness\`, \`Plumber\`, \`Restaurant\`) |
| **Business Name** | Exact trading name as registered |
| **Street Address** | Physical address of the business |
| **City** | Town or city |
| **Country** | ISO 3166-1 alpha-2 code (e.g. \`ZA\`, \`US\`, \`GB\`) |
| **Telephone** | In international format: \`+27 21 555 0100\` |
| **Website URL** | Canonical homepage URL |

> 💡 **JSON-LD Preview** shows the exact script tag that will be injected.

---

## Per-Page SEO

Set individual SEO metadata for any page via **Admin → Content → Pages → 🔍 SEO** button.

| Field | Description |
|-------|-------------|
| **Meta Title** | Custom \`<title>\` tag — shown in browser tab and search results |
| **Meta Description** | 50–160 char summary — shown under the link in search results |
| **Meta Keywords** | Comma-separated keywords (low direct ranking impact) |
| **OG Title** | Title for social sharing (defaults to Meta Title) |
| **OG Image** | Image URL for social sharing (defaults to site default) |
| **OG Description** | Description for social sharing (defaults to Meta Description) |
| **Canonical URL** | Override the auto-generated canonical — leave blank in most cases |
| **noindex** | Exclude this page from search engines entirely |
| **nofollow** | Tell crawlers not to follow links on this page |

> 💡 **SERP Preview** in the modal updates live as you type.

---

## SEO Audit (Tab: SEO Audit)

Runs automatically on the **1st of every month** via a Vercel cron job.
You can also trigger it manually by clicking **Run Audit Now**.

The audit checks:
- Pages missing a meta title
- Pages with descriptions that are too short (< 50 chars) or too long (> 160 chars)
- Duplicate meta titles across pages
- Duplicate meta descriptions across pages
- Pages missing an OG image

**Issue severity levels:**

| Severity | Meaning |
|----------|---------|
| 🔴 error | Directly hurts SEO — fix immediately |
| 🟡 warning | Suboptimal — fix when possible |
| 🔵 info | Suggestion — nice to have |

---

## Dynamic Files

| URL | Description |
|-----|-------------|
| \`/sitemap.xml\` | Auto-generated from all published, indexable pages |
| \`/robots.txt\` | Auto-generated from Robots & Sitemap settings |

> Both update instantly when you save settings or publish/unpublish pages.
`;

// ─────────────────────────────────────────────
// ANIMATIONS & MOTION CONTENT
// ─────────────────────────────────────────────

export const LOWER_THIRD_DOCS = `
<h4>Lower Third Graphic</h4>
<p class="lead">Add a decorative SVG shape or custom image to the <strong>bottom of any section</strong> — perfect for creating smooth transitions between sections or adding visual flair.</p>

<h5 class="mt-4">Z-Index Layer Order</h5>
<div class="alert alert-info">
  <table class="table table-sm table-borderless mb-0">
    <tbody>
      <tr><td><code>z-index 2</code></td><td>Animated background (AnimBg)</td></tr>
      <tr><td><code>z-index 5</code></td><td>Motion elements — <strong>Behind</strong> layer</td></tr>
      <tr><td><code>z-index 10</code></td><td class="fw-bold text-primary">↑ Lower Third Graphic ← HERE</td></tr>
      <tr><td><code>z-index 15</code></td><td>Motion elements — <strong>Above Shape</strong> layer</td></tr>
      <tr><td><code>z-index 20</code></td><td>Section content (text, cards, blocks)</td></tr>
      <tr><td><code>z-index 25</code></td><td>Motion elements — <strong>Above Content</strong> layer</td></tr>
      <tr><td><code>z-index 50</code></td><td>Triangle / Section Intro shape (always on top)</td></tr>
    </tbody>
  </table>
</div>

<h5 class="mt-4">8 Preset Shapes</h5>
<p>Click any preset in the <strong>Lower Third</strong> tab of the Normal or CTA section editor to apply it.</p>

<div class="row g-3 mb-4">
  <div class="col-6">
    <div class="border rounded p-2">
      <div class="fw-semibold small mb-2">Wave</div>
      <svg viewBox="0 0 240 60" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:60px;display:block;">
        <rect width="240" height="60" fill="#e2e8f0"/>
        <path d="M0,60 C60,0 180,60 240,0 L240,60 Z" fill="#6366f1" opacity="0.85"/>
      </svg>
      <p class="text-muted small mt-1 mb-0">Smooth sine curve — most popular for section transitions</p>
    </div>
  </div>
  <div class="col-6">
    <div class="border rounded p-2">
      <div class="fw-semibold small mb-2">Diagonal</div>
      <svg viewBox="0 0 240 60" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:60px;display:block;">
        <rect width="240" height="60" fill="#e2e8f0"/>
        <path d="M0,60 L240,0 L240,60 Z" fill="#6366f1" opacity="0.85"/>
      </svg>
      <p class="text-muted small mt-1 mb-0">Clean angled cut — modern, minimal look</p>
    </div>
  </div>
  <div class="col-6">
    <div class="border rounded p-2">
      <div class="fw-semibold small mb-2">Arch</div>
      <svg viewBox="0 0 240 60" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:60px;display:block;">
        <rect width="240" height="60" fill="#e2e8f0"/>
        <path d="M0,60 Q120,0 240,60 Z" fill="#6366f1" opacity="0.85"/>
      </svg>
      <p class="text-muted small mt-1 mb-0">Single arch — great for hero sections</p>
    </div>
  </div>
  <div class="col-6">
    <div class="border rounded p-2">
      <div class="fw-semibold small mb-2">Stepped</div>
      <svg viewBox="0 0 240 60" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:60px;display:block;">
        <rect width="240" height="60" fill="#e2e8f0"/>
        <path d="M0,60 L0,30 L120,30 L120,0 L240,0 L240,60 Z" fill="#6366f1" opacity="0.85"/>
      </svg>
      <p class="text-muted small mt-1 mb-0">Two-step staircase — bold geometric statement</p>
    </div>
  </div>
  <div class="col-6">
    <div class="border rounded p-2">
      <div class="fw-semibold small mb-2">Mountain</div>
      <svg viewBox="0 0 240 60" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:60px;display:block;">
        <rect width="240" height="60" fill="#e2e8f0"/>
        <path d="M0,60 L72,12 L120,36 L168,6 L240,60 Z" fill="#6366f1" opacity="0.85"/>
      </svg>
      <p class="text-muted small mt-1 mb-0">Double peak — dramatic, ideal for outdoor/nature brands</p>
    </div>
  </div>
  <div class="col-6">
    <div class="border rounded p-2">
      <div class="fw-semibold small mb-2">Blob</div>
      <svg viewBox="0 0 240 60" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:60px;display:block;">
        <rect width="240" height="60" fill="#e2e8f0"/>
        <path d="M0,60 C24,24 72,6 120,18 C168,30 216,0 240,12 L240,60 Z" fill="#6366f1" opacity="0.85"/>
      </svg>
      <p class="text-muted small mt-1 mb-0">Organic asymmetric — playful, creative brands</p>
    </div>
  </div>
  <div class="col-6">
    <div class="border rounded p-2">
      <div class="fw-semibold small mb-2">Chevron</div>
      <svg viewBox="0 0 240 60" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:60px;display:block;">
        <rect width="240" height="60" fill="#e2e8f0"/>
        <path d="M0,60 L120,0 L240,60 Z" fill="#6366f1" opacity="0.85"/>
      </svg>
      <p class="text-muted small mt-1 mb-0">V-shape — sharp, energetic, arrow-like</p>
    </div>
  </div>
  <div class="col-6">
    <div class="border rounded p-2">
      <div class="fw-semibold small mb-2">Ripple</div>
      <svg viewBox="0 0 240 60" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:60px;display:block;">
        <rect width="240" height="60" fill="#e2e8f0"/>
        <path d="M0,60 C60,30 60,0 120,12 C180,24 180,0 240,6 L240,60 Z" fill="#6366f1" opacity="0.85"/>
      </svg>
      <p class="text-muted small mt-1 mb-0">Double wave — water/fluid theme, layered depth</p>
    </div>
  </div>
</div>

<h5 class="mt-4">Settings Reference</h5>
<table class="table table-sm">
  <thead class="table-light"><tr><th>Setting</th><th>Options</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Enable</td><td>Toggle</td><td>On/Off without losing settings</td></tr>
    <tr><td>Mode</td><td>Preset Shape / Upload Image</td><td>Upload transparent PNG or SVG for custom shapes</td></tr>
    <tr><td>Preset</td><td>8 shapes (see above)</td><td>Click tile to select</td></tr>
    <tr><td>Fill Color</td><td>Color picker</td><td>Usually match the next section's background color</td></tr>
    <tr><td>Opacity</td><td>0–100%</td><td>Lower opacity = see-through layered effect</td></tr>
    <tr><td>Height</td><td>40–400px</td><td>Taller = more dramatic transition</td></tr>
    <tr><td>Flip Horizontal</td><td>Toggle</td><td>Mirrors the shape left–right</td></tr>
    <tr><td>Flip Vertical</td><td>Toggle</td><td>Mirrors the shape top–bottom (cuts from section top instead)</td></tr>
  </tbody>
</table>

<div class="alert alert-success mt-3">
  <strong>Pro Tip:</strong> Set the lower third color to match the <em>next</em> section's background. A blue section with a white wave lower third leading into a white section creates a seamless flow.
</div>
`;

export const MOTION_ELEMENTS_DOCS = `
<style>
@keyframes cms-float {
  0%,100% { transform: translateY(-13px); }
  50%     { transform: translateY(13px); }
}
@keyframes cms-bob {
  0%,100% { transform: translateY(0px); }
  50%     { transform: translateY(-20px); }
}
@keyframes cms-rotate {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes cms-pulse {
  0%,100% { transform: scale(1); }
  50%     { transform: scale(1.35); }
}
@keyframes cms-sway {
  0%,100% { transform: rotateZ(-16deg); }
  50%     { transform: rotateZ(16deg); }
}
@keyframes cms-slide-in-right {
  0%   { transform: translateX(120px); opacity: 0; }
  100% { transform: translateX(0px);  opacity: 1; }
}
@keyframes cms-parallax-slow {
  0%   { transform: translateY(0px); }
  50%  { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
}
@keyframes cms-parallax-fast {
  0%   { transform: translateY(0px); }
  50%  { transform: translateY(-50px); }
  100% { transform: translateY(0px); }
}
@keyframes cms-parallax-counter {
  0%   { transform: translateY(0px); }
  50%  { transform: translateY(30px); }
  100% { transform: translateY(0px); }
}
@keyframes cms-scroll-bg {
  0%   { background-position: 0 0; }
  100% { background-position: 0 100%; }
}
.cms-idle-icon { display:inline-block; width:44px; height:44px; border-radius:8px; }
</style>

<h4>Motion &amp; Parallax Elements</h4>
<p class="lead">Layer animated images over any section — transparent PNGs, SVGs, or decorative graphics that <strong>float, slide, rotate, and parallax-scroll</strong> independently of the page content.</p>

<div class="alert alert-info mb-4">
  <strong>3-Tier Depth System</strong> — Each motion element has a <strong>Layer</strong> setting that controls where it sits in the z-stack:
  <table class="table table-sm table-borderless mb-0 mt-2">
    <thead><tr><th>Layer</th><th>Z-Index</th><th>Sits between</th></tr></thead>
    <tbody>
      <tr><td><strong>Behind All</strong> (default)</td><td><code>5</code></td><td>AnimBg ↔ Lower Third — behind everything</td></tr>
      <tr><td><strong>Above Shape</strong></td><td><code>15</code></td><td>Lower Third ↔ Section Content — above the shape, below text/cards</td></tr>
      <tr><td><strong>Above Content</strong></td><td><code>25</code></td><td>Above text and cards — use for foreground decorations</td></tr>
    </tbody>
  </table>
  Triangle shapes always render at <code>z-50</code> regardless of motion element layer.
</div>

<h5 class="mt-2 mb-3">The 4 Animation Modes</h5>
<p class="text-muted small">Each motion element can combine any or all of these independently:</p>

<div class="row g-3 mb-4">

  <div class="col-12">
    <div class="border rounded p-3">
      <div class="d-flex align-items-center gap-2 mb-2">
        <span class="badge bg-primary">Mode 1</span>
        <strong>Scroll Parallax</strong>
      </div>
      <p class="small mb-3">The element moves at a different speed than the page scroll — creating a 3D depth illusion. Speed is a multiplier from <code>-1.0</code> to <code>+1.0</code>.</p>
      <div class="d-flex gap-4 align-items-end flex-wrap" style="overflow:hidden;border:1px solid #dee2e6;border-radius:6px;background:#f8f9fa;padding:16px 12px;min-height:110px;position:relative;">
        <div class="text-center" style="position:relative;">
          <div style="width:40px;height:40px;background:#6c757d;border-radius:6px;margin:0 auto 4px;animation:cms-parallax-slow 3s ease-in-out infinite;"></div>
          <code style="font-size:0.7rem">speed 0.3</code>
          <div class="text-muted" style="font-size:0.65rem">moves slower</div>
        </div>
        <div class="text-center">
          <div style="width:40px;height:40px;background:#3b82f6;border-radius:6px;margin:0 auto 4px;animation:cms-parallax-slow 1.5s ease-in-out infinite;"></div>
          <code style="font-size:0.7rem">speed 0.7</code>
          <div class="text-muted" style="font-size:0.65rem">moves much slower</div>
        </div>
        <div class="text-center">
          <div style="width:40px;height:40px;background:#10b981;border-radius:6px;margin:0 auto 4px;"></div>
          <code style="font-size:0.7rem">speed 0</code>
          <div class="text-muted" style="font-size:0.65rem">no parallax</div>
        </div>
        <div class="text-center">
          <div style="width:40px;height:40px;background:#ec4899;border-radius:6px;margin:0 auto 4px;animation:cms-parallax-counter 3s ease-in-out infinite;"></div>
          <code style="font-size:0.7rem">speed -0.3</code>
          <div class="text-muted" style="font-size:0.65rem">counter-scrolls</div>
        </div>
        <div class="text-center">
          <div style="width:40px;height:40px;background:#f59e0b;border-radius:6px;margin:0 auto 4px;animation:cms-parallax-fast 2s ease-in-out infinite;"></div>
          <code style="font-size:0.7rem">speed 1.0</code>
          <div class="text-muted" style="font-size:0.65rem">max depth effect</div>
        </div>
        <div class="text-muted" style="position:absolute;bottom:6px;right:10px;font-size:0.65rem;">↕ simulating scroll</div>
      </div>
    </div>
  </div>

  <div class="col-12">
    <div class="border rounded p-3">
      <div class="d-flex align-items-center gap-2 mb-2">
        <span class="badge bg-success">Mode 2</span>
        <strong>Scroll Entrance</strong>
      </div>
      <p class="small mb-3">When the section scrolls into view, the element animates in from a chosen direction. The box below shows a <strong>right → center</strong> entrance repeating:</p>
      <div style="height:64px;overflow:hidden;border:1px solid #dee2e6;border-radius:6px;background:#f8f9fa;position:relative;display:flex;align-items:center;padding:0 12px;">
        <div style="width:50px;height:36px;background:#3b82f6;border-radius:6px;animation:cms-slide-in-right 1.8s ease-out infinite;display:flex;align-items:center;justify-content:center;">
          <span style="color:#fff;font-size:0.65rem;font-weight:600;">↠ in</span>
        </div>
        <div class="ms-3 text-muted small">direction: <strong>right</strong> | distance: <strong>120px</strong> | duration: <strong>800ms</strong> | easing: <strong>easeOutCubic</strong></div>
      </div>
      <div class="row g-2 mt-2">
        <div class="col-6"><small><strong>Direction:</strong> top / bottom / left / right</small></div>
        <div class="col-6"><small><strong>Distance:</strong> px to travel</small></div>
        <div class="col-6"><small><strong>Duration:</strong> ms (e.g. 800ms)</small></div>
        <div class="col-6"><small><strong>Delay:</strong> ms before start (stagger multiple elements)</small></div>
        <div class="col-12"><small><strong>Easing:</strong> easeOutCubic / easeOutBack / easeInOutSine / linear</small></div>
      </div>
    </div>
  </div>

  <div class="col-12">
    <div class="border rounded p-3">
      <div class="d-flex align-items-center gap-2 mb-2">
        <span class="badge bg-warning text-dark">Mode 3</span>
        <strong>Scroll Exit</strong>
      </div>
      <p class="small mb-0">When the section scrolls out of view, the element animates away. Combine with entrance for a full enter/leave lifecycle.</p>
      <div class="row g-2 mt-2">
        <div class="col-6"><small><strong>Direction:</strong> which way it leaves</small></div>
        <div class="col-6"><small><strong>Distance:</strong> how far it travels before disappearing</small></div>
        <div class="col-12"><small><strong>Duration:</strong> exit speed in ms</small></div>
      </div>
    </div>
  </div>

  <div class="col-12">
    <div class="border rounded p-3">
      <div class="d-flex align-items-center gap-2 mb-2">
        <span class="badge bg-danger">Mode 4</span>
        <strong>Idle Loop</strong>
      </div>
      <p class="small mb-3">While the section is visible, the element loops a continuous animation. Stops automatically when section leaves viewport.</p>
      <div class="row g-3 text-center">
        <div class="col-4 col-md-2">
          <div style="height:64px;display:flex;align-items:center;justify-content:center;">
            <div class="cms-idle-icon" style="background:#6366f1;animation:cms-float 2s ease-in-out infinite;"></div>
          </div>
          <div class="small fw-semibold mt-1">Float</div>
          <div class="text-muted" style="font-size:0.7rem">up-down oscillation</div>
        </div>
        <div class="col-4 col-md-2">
          <div style="height:64px;display:flex;align-items:center;justify-content:center;">
            <div class="cms-idle-icon" style="background:#10b981;animation:cms-bob 1.6s ease-in-out infinite;"></div>
          </div>
          <div class="small fw-semibold mt-1">Bob</div>
          <div class="text-muted" style="font-size:0.7rem">gentle lift &amp; return</div>
        </div>
        <div class="col-4 col-md-2">
          <div style="height:64px;display:flex;align-items:center;justify-content:center;">
            <div class="cms-idle-icon" style="background:#f59e0b;animation:cms-rotate 2.5s linear infinite;"></div>
          </div>
          <div class="small fw-semibold mt-1">Rotate</div>
          <div class="text-muted" style="font-size:0.7rem">continuous spin</div>
        </div>
        <div class="col-4 col-md-2">
          <div style="height:64px;display:flex;align-items:center;justify-content:center;">
            <div class="cms-idle-icon" style="background:#ef4444;border-radius:50%;animation:cms-pulse 1.4s ease-in-out infinite;"></div>
          </div>
          <div class="small fw-semibold mt-1">Pulse</div>
          <div class="text-muted" style="font-size:0.7rem">scale in and out</div>
        </div>
        <div class="col-4 col-md-2">
          <div style="height:64px;display:flex;align-items:center;justify-content:center;">
            <div class="cms-idle-icon" style="background:#8b5cf6;border-radius:4px;animation:cms-sway 2s ease-in-out infinite;transform-origin:center bottom;"></div>
          </div>
          <div class="small fw-semibold mt-1">Sway</div>
          <div class="text-muted" style="font-size:0.7rem">left-right tilt</div>
        </div>
      </div>
      <table class="table table-sm mt-3 mb-0">
        <thead class="table-light"><tr><th>Setting</th><th>Range</th><th>Effect</th></tr></thead>
        <tbody>
          <tr><td>Speed</td><td>0.5×–3×</td><td>Multiplier — higher = faster loop</td></tr>
          <tr><td>Amplitude</td><td>px or deg</td><td>Float/bob: px travel | Rotate/sway: degrees | Pulse: % scale change</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<h5 class="mt-4">Position Settings</h5>
<table class="table table-sm">
  <thead class="table-light"><tr><th>Field</th><th>Example</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Top</td><td><code>20%</code></td><td>Distance from section top edge</td></tr>
    <tr><td>Right</td><td><code>5%</code></td><td>Distance from section right edge</td></tr>
    <tr><td>Bottom</td><td><code>80px</code></td><td>Distance from section bottom edge</td></tr>
    <tr><td>Left</td><td><code>3%</code></td><td>Distance from section left edge</td></tr>
    <tr><td>Width</td><td><code>200px</code> or <code>25%</code></td><td>Element width (height is auto)</td></tr>
  </tbody>
</table>

<h5 class="mt-4">Depth &amp; Opacity</h5>
<table class="table table-sm">
  <thead class="table-light"><tr><th>Setting</th><th>Options</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td><strong>Layer</strong></td><td>Behind All / Above Shape / Above Content</td><td>Controls the element's z-depth. Default: <strong>Behind All</strong>. See layer chart above.</td></tr>
    <tr><td><strong>Opacity</strong></td><td>0–100%</td><td>Slider control. 100 = fully opaque, 0 = invisible. Entrance animation respects this target opacity.</td></tr>
  </tbody>
</table>

<div class="alert alert-success">
  <strong>Best Results:</strong> Use transparent PNGs or SVGs. Use <code>%</code>-based positioning to stay responsive. Combine <strong>entrance + idle</strong> for the richest effect — element slides in then continuously floats.
</div>

<div class="alert alert-warning">
  <strong>Performance Tip:</strong> Keep files under 200KB each. Max 3–4 per section. All animations pause automatically when the section is off-screen.
</div>

<h5 class="mt-4">Live Demo</h5>
<p>10 demo sections are seeded on the landing page showcasing every combination. View at <a href="/" target="_blank">the homepage</a> — scroll past the main sections to see the DEMO sections.</p>
`;

export const FEATURE_FLAGS_DOCS = `
<h4>Client Feature Flags</h4>
<p class="lead">Toggle client-specific features on or off without code changes. Only <strong>SUPER_ADMIN</strong> users can access this panel.</p>

<div class="alert alert-warning">
  <i class="bi bi-shield-lock me-1"></i>
  <strong>SUPER_ADMIN only.</strong> This tab is hidden from Publisher and Editor roles.
</div>

<h5 class="mt-4">How to Access</h5>
<ol>
  <li>Log in as SUPER_ADMIN</li>
  <li>Go to <strong>Settings</strong> (top navigation)</li>
  <li>Click the <strong>Features</strong> tab (only visible to SUPER_ADMIN)</li>
</ol>

<h5 class="mt-4">Current Features</h5>
<table class="table table-sm">
  <thead class="table-light"><tr><th>Slug</th><th>Name</th><th>Default</th><th>Description</th></tr></thead>
  <tbody>
    <tr>
      <td><code>concrete-calculator</code></td>
      <td>Concrete Calculator</td>
      <td><span class="badge bg-secondary">OFF</span></td>
      <td>
        Public <code>/calculator</code> page — supports Slab, Column, Footing, Beam &amp; Staircase. Includes:
        <ul class="mb-0 mt-1">
          <li>3D Three.js interactive preview — drag to rotate, scroll to zoom, ⇧+drag to pan</li>
          <li>Camera position is preserved when adjusting dimension sliders — no snap-out</li>
          <li><strong>Dims</strong> button — toggleable blue dimension lines with arrowheads per shape</li>
          <li><strong>Spin</strong> / <strong>Stop</strong> button — auto-rotate toggle</li>
          <li><strong>Center</strong> button — reset camera to default framing for current shape</li>
          <li>Dimension inputs have sliders + scrubber inputs for precise adjustment</li>
          <li>Professional estimate report with reference number</li>
          <li><strong>Request Formal Quote</strong> button — sends a formatted email to the admin address configured in Settings → Email</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>
<p>New features are added here as they are developed. Toggle <strong>Enabled</strong> to activate for the client's deployment.</p>
`;

// ─────────────────────────────────────────────
// VOLT DESIGNER
// ─────────────────────────────────────────────

const VOLT_OVERVIEW = `
# Volt Designer — Overview

Volt Designer is the visual vector-canvas editor for creating **reusable UI elements** (buttons, cards, banners, input skins, widgets) that can be embedded in any CMS section.

Elements are stored as JSON and rendered natively in the browser — no raster images, infinite resolution.

---

## Canvas

The canvas is a fixed-size artboard (default **800×500 px**). All coordinates are stored in **percentage space** (0–100) relative to canvas width/height, making elements resolution-independent.

### Changing Canvas Size

1. Open **Element Properties → Canvas Size**
2. Pick a **Preset** (Button, Card, Hero Banner, etc.) or enter custom Width/Height
3. Click **Apply Size** — the canvas frame resizes; **existing layers keep their % positions unchanged**
4. Use the **Fit Layers** button to refit all layers to the new canvas manually if needed

> **Tip:** Switching presets never auto-scales or auto-zooms. Shapes stay exactly where they are — resize them yourself to suit the new canvas.

### Canvas Presets

| Preset | Size | Typical use |
|--------|------|-------------|
| Input Field | 300×44 | Custom text-input skin |
| Button | 280×44 | CTA button element |
| Badge | 120×32 | Tag / label |
| Icon | 64×64 | Icon container |
| Card | 320×200 | Content card |
| Widget | 400×300 | Feature widget |
| Hero Banner | 1200×600 | Full-width banner |

### Zoom Controls

| Action | Result |
|--------|--------|
| **+** / **−** buttons | Zoom in / out |
| **Fit** button (⊡) | Fit canvas to viewport |
| Mouse wheel | Zoom on canvas |

### Grid Snap

- Grid size is set in the **Grid Size** field (default 10 px)
- Hold **Ctrl** while drawing or dragging to snap to grid

---

## Saving & Library

- Changes are **auto-tracked** — the toolbar shows **● unsaved** when there are unsaved changes
- Click **Save** to persist the element
- Click **← Library** to return to the element library picker
`;

const VOLT_TOOLS = `
# Volt Designer — Drawing Tools

## Toolbar

| Key | Tool | Description |
|-----|------|-------------|
| **V** | Select | Move, resize, or enter vertex edit |
| **R** | Rectangle | Draw rectangles |
| **E** | Ellipse | Draw ellipses / circles |
| **L** | Line | Draw straight lines |
| **B** | Pen | Bezier pen tool — place anchor points |
| **P** | Polygon | Click to place vertices, Enter/dblclick to close |
| **S** | Slot | Define content slot regions |
| **SHP** | Shape Presets | Drop a pre-built vector shape onto the canvas |

### SHP — Shape Presets

Click the **⭐ SHP** button in the toolbar to open a grid of 16 pre-built vector shapes. Clicking any shape drops it centred on the canvas at 40% of canvas size. All shapes are fully editable vector layers.

| Shape | Shape | Shape | Shape |
|-------|-------|-------|-------|
| Arrow Right | Arrow Left | Arrow ↔ | 5-Point Star |
| Heart | Diamond | Triangle Up | Triangle Down |
| Chevron | Plus | Hexagon | Octagon |
| Pentagon | Shield | Speech Bubble | Tag |

---

## Drawing Shapes

**Rectangle / Ellipse / Slot**
- Click and drag to draw
- Hold **Shift** to constrain to square / circle
- Hold **Ctrl** to snap to grid
- Press **Esc** to cancel

**Line**
- Click and drag from start to end
- Hold **Ctrl** to snap to 45° angles / grid

**Polygon**
- Click to place each vertex
- Hold **Ctrl** to snap
- Press **Enter** or **double-click** to close and commit
- Press **Esc** to cancel

---

## Pen Tool (Bezier)

The pen tool creates smooth curves and complex shapes.

| Action | Result |
|--------|--------|
| **Click** | Place a sharp anchor point |
| **Click + drag** | Place a curved anchor point (drag to pull handles) |
| **Hover near first point** | Snaps to close the path |
| **Enter** or **double-click** | Commit as open path |
| **Ctrl** | Snap while placing |
| **Esc** | Cancel |

After committing, enter **Vertex Edit** (double-click) to adjust individual handles.

---

## Contextual Keyboard Shortcut Legend

A **status bar** below the toolbar shows all available keyboard shortcuts for the current context — it updates automatically as you switch modes.

| Context | Key shown |
|---------|-----------|
| **Idle / Select** | V, R, E, L, B, P, S, Ctrl+Z, Ctrl+Y |
| **Selection active** | Ctrl+drag (snap), Del, Alt+drag (duplicate), dblclick (vertex), Shift+click (bool base) |
| **Drawing Rect/Ellipse/Slot** | Shift (constrain), Ctrl (snap), Esc |
| **Pen tool** | Click (sharp), Click+drag (curve), Enter (commit), Ctrl (snap), Esc |
| **Polygon tool** | Click (point), Ctrl (snap), Enter/dblclick (commit), Esc |
| **Vertex Edit** | Ctrl+drag (⊙ snap — shown first), Drag vertex/handle, Shift+drag (symmetric), Alt+click (add point), Alt+dblclick (delete point), Esc |
| **Bool Edit** | Ctrl+drag (⊙ snap — shown first), Drag (move cutter), dblclick cutter (vertex edit), Esc (confirm) |

> **Snap shortcut:** In both Vertex Edit and Bool Edit modes, **hold Ctrl while dragging** to snap to grid. It is always the first shortcut shown in those contexts.
`;

const VOLT_LAYERS = `
# Volt Designer — Layers & Selection

## Layer Panel

Every shape, slot, or 3D object is a **layer**. Layers are listed in the **Layers** panel (left sidebar).

- **Drag** to reorder (higher in list = higher z-index)
- Click a layer row to select it
- **Double-click** the layer name to rename it
- Click the **eye icon** to toggle visibility
- Click the **lock icon** to lock (prevents selection/editing)
- Click **🗑** to delete

---

## Selecting Layers

| Action | Result |
|--------|--------|
| Click shape on canvas | Select that layer |
| Click layer row | Select that layer |
| **Del** | Delete selected layer |
| **Alt + drag** | Duplicate and drag |
| **Ctrl+Z** | Undo |
| **Ctrl+Y** | Redo |

### Marquee Select

- Click and drag on **empty canvas** area to draw a marquee rectangle
- All layers whose bounding boxes overlap the marquee are selected as a multi-selection

---

## Layer Types

| Type | Icon | Description |
|------|------|-------------|
| **vector** | STR/ACC/BG | SVG path layer (rect, ellipse, polygon, pen path) |
| **slot** | SLT | Content slot placeholder |
| **3d-object** | 3D | Three.js 3D asset |

### Roles

Each layer has a **role** that indicates its semantic purpose:

| Role | Meaning |
|------|---------|
| background | Background fill / texture |
| structure | Main shape / structural element |
| accent | Decorative / highlight shape |
| content | Text content area |
| overlay | Overlaid on top of other content |

---

## Resize Handles

When a layer is selected, 8 white square resize handles appear at the corners and edges.
Drag any handle to resize. The layer's path data is updated in real-time.
`;

const VOLT_VERTEX = `
# Volt Designer — Vertex & Bezier Editing

## Entering Vertex Edit Mode

**Double-click** any vector shape (on canvas or layer panel) to enter **Vertex Edit** mode.

The canvas shows:
- **Orange circles** at each vertex (anchor point)
- **Dashed indigo dots** — Bezier handle stubs (one per vertex side, pointing toward adjacent vertex)
- A **dashed amber bounding box** around the shape
- A **ROUND slider** at the bottom toolbar

---

## Keyboard & Mouse Reference

| Action | Result |
|--------|--------|
| **Drag orange vertex** | Move that anchor point |
| **Drag dashed indigo dot** | Pull out a Bezier curve handle — creates a smooth curve on that edge |
| **Shift + drag handle** | Symmetric smooth node — opposite handle mirrors automatically |
| **Alt + click edge** | Insert a new vertex at that point on the edge |
| **Alt + double-click vertex** | Delete that vertex (minimum 3 retained) |
| **Ctrl + drag** | Snap to grid while moving |
| **Esc** | Exit vertex edit mode |

---

## Bezier Handle Stubs

Every straight-line vertex has **stub handles** — small dashed indigo circles rendered 12 px toward each adjacent vertex.

- When a vertex has no curve yet (zero-distance handles), the stubs show pointing outward
- **Drag a stub** to pull out a Bezier handle and curve that edge
- Once a handle has distance, it renders as a solid indigo dot with an arm line
- **Shift-drag** a handle to keep both sides symmetric (smooth interpolation)

---

## Corner Rounding (ROUND Slider)

The **ROUND** slider (bottom toolbar, only visible in vertex edit mode) rounds all sharp corners simultaneously.

- Slide right to increase rounding (0–100%)
- Rounding is **non-destructive** — the original path is stored on first slider use
- Moving the slider back to 0% restores the original sharp path
- Rounding is **scale-aware**: radius = \`t × min(edge_length) × 0.5\`, so small shapes round proportionally
- Rounding is skipped for vertices that already have Bezier handles
- Click **↺** (reset) button to snap back to 0%

> **Note:** Corner rounding uses the cubic Bezier arc approximation (k = 0.5523), producing smooth, circular-looking corners without SVG \`rx\`/\`ry\` attributes.

---

## Exiting Vertex Edit

- Press **Esc** or click outside the shape
- If editing a **cutter** in Boolean mode, Esc returns to Bool Edit mode
`;

const VOLT_SLOTS = `
# Volt Designer — Slot System

Slots define **content regions** within a Volt element. When the Volt is used on a live page, slots are filled with real content (title, image, body text, etc.) without touching the design.

---

## Drawing a Slot

1. Click the **Slot tool** (**S** key) in the toolbar — or click the \`TIT ▼\` split button
2. Optionally click **▼** to pick the slot **type** first (see below)
3. Drag on canvas to draw the slot region
4. The slot appears as a **dashed green outline** in design mode

---

## Slot Types

| Type | Tag | Icon | Use For |
|------|-----|------|---------|
| **Title** | TIT | H1 | Heading / title text |
| **Body** | BOD | ¶ | Paragraph / body copy |
| **Image** | IMG | 🖼 | Photo or illustration |
| **Action** | ACT | Cursor | CTA button |
| **Badge** | BDG | Award | Tag / pill label |
| **Icon** | ICN | Star | Icon image |
| **Input** | INP | Input cursor | Text input field skin |
| **Custom** | CUS | Puzzle | Any other content |

---

## Preview Mode

Click the **Preview** toggle button (top bar, only visible when slots exist) to switch between:

- **Design mode** — dashed green outlines with type labels
- **Preview mode** — realistic placeholder content per slot type

Preview mode shows:
- **Title** — heading bar + subtitle bar
- **Body** — 4–5 lines of placeholder text bars
- **Image** — grey frame with image icon
- **Action** — styled button placeholder
- **Badge** — rounded pill in green
- **Icon** — large star icon
- **Input** — styled input field with border and inner text placeholder
- **Custom** — dashed outline with "CUSTOM" label

---

## Slot Properties

Select a slot layer to edit in **Layer Properties**:
- **Slot Type** — change the type (updates label automatically)
- **Slot Label** — custom label shown in design mode

---

## Input Slot (INP)

Use the **Input** slot type to design a custom text-input skin. The slot defines the bounding region; in live use, a real HTML \`<input>\` element is rendered inside it.

### Skin Mode

| Mode | Appearance | Use when |
|------|-----------|----------|
| **Transparent** (default) | Input has no background, border, or outline — completely invisible | You draw vector shapes **below** the slot; those shapes become the visual skin |
| **Custom** | Input renders with your chosen background, border, colour, and radius | You want a standalone styled input with no custom shapes |

**Transparent mode (recommended):**
1. Draw your shapes (rounded rect, gradient bar, etc.) as vector layers **below** the slot layer in the stack
2. Set the slot's Skin Mode to **Transparent**
3. The live input field sits invisibly on top — users type into it, and your shapes provide the visual appearance

### Input Properties (all modes)

| Property | Description |
|----------|-------------|
| **Skin Mode** | Transparent or Custom |
| **Text Color** | Colour of the typed text + caret |
| **Font Size** | Text size in px |
| **Placeholder** | Hint text shown when the field is empty |

### Custom Mode Only

| Property | Description |
|----------|-------------|
| **Background Color** | Fill colour of the input box |
| **Border Color** | Outline colour |
| **Border Width** | Outline thickness in px |
| **Border Radius** | Corner rounding in px |
`;

const VOLT_EFFECTS = `
# Volt Designer — Fill, Stroke & Shadow

All effects are controlled in the **Layer Properties** panel (right sidebar) when a vector or slot layer is selected.

---

## Fill

| Control | Description |
|---------|-------------|
| **+ Add** | Add a solid fill to the layer |
| **Color picker** | Click the swatch to open the native colour picker |
| **Hex field** | Type a 6-digit hex code (e.g. \`#6366f1\`) |
| **Opacity slider** | 0 = fully transparent, 1 = fully opaque |
| **Remove** | Remove the fill (shape becomes transparent) |

---

## Stroke

| Control | Description |
|---------|-------------|
| **+ Add** | Add a stroke outline |
| **Color picker / Hex** | Stroke colour |
| **Width** | Stroke width in canvas pixels |
| **Cap** | Line cap: \`butt\`, \`round\`, or \`square\` |
| **Remove** | Remove the stroke |

> **Boolean shapes:** Stroke width is automatically doubled with \`paint-order: stroke fill\` so only the outer boundary is visible (inner intersection lines are covered by fill).

---

## Drop Shadow

Every vector shape and slot can have a **drop shadow**.

| Control | Description |
|---------|-------------|
| **Toggle checkbox** | Enable / disable shadow |
| **Color picker / Hex** | Shadow colour (default black \`#000000\`) |
| **α (opacity slider)** | Shadow transparency — 0 = invisible, 1 = fully opaque |
| **X Offset** | Horizontal shadow offset in canvas pixels (positive = right) |
| **Y Offset** | Vertical shadow offset in canvas pixels (positive = down) |
| **Blur** | Blur radius — 0 = hard edge, higher = softer/more spread |

### Direction Handle (☀ on canvas)

When shadow is enabled, a **sun icon ☀** appears on the canvas at the layer centre offset by the current X/Y values.

- **Drag the ☀ handle** to reposition the shadow direction and distance in real-time
- The X Offset / Y Offset fields in the panel update as you drag
- Works for both vector shapes and slot elements

### Implementation Detail

- **Vector shapes:** SVG \`<filter><feDropShadow>\` applied to the shape group
- **Slot overlays:** CSS \`box-shadow\` applied to the slot div
`;

const VOLT_BOOLEAN = `
# Volt Designer — Boolean Operations

Boolean ops combine two vector shapes non-destructively into a composite shape.

---

## Workflow

1. **Select the CUTTER shape** (the shape doing the cutting) — it appears in the ① CUTTER field
2. **Shift-click a BASE shape** on canvas — or pick from the ② BASE dropdown
3. Click one of the three operation buttons:

| Button | Operation | Result |
|--------|-----------|--------|
| **Union** | Merge | Both shapes combined into one outline |
| **Sub** | Subtract | BASE minus CUTTER — punches a hole |
| **Isect** | Intersect | Only the overlapping region remains |

---

## Non-Destructive

- The cutter shape is **hidden** (not deleted) — you can edit it later
- The base shape stores the boolean relationship in \`boolChildren\`
- The SVG display path is recomputed every render

---

## Bool Edit Mode

Double-click the composite base shape to enter **Bool Edit Mode**:

| Action | Result |
|--------|--------|
| **Drag cutter** | Move the cutter to a new position |
| **Hold Ctrl + drag** | Move cutter snapping to grid |
| **Double-click cutter** | Enter vertex edit on the cutter path |
| **Esc** | Confirm position and exit Bool Edit mode |

The cutter is shown with an orange **CUTTER ✂** badge and dashed orange outline.
The base is shown with a teal **BASE** badge.

> **Cutter position is saved on mouse-up** — no extra Save needed. Esc confirms and returns to normal selection mode.

---

## Stroke on Boolean Shapes

When a stroke is applied to a boolean shape, the width is **doubled** internally with \`paint-order: stroke fill\`. This ensures only the outer boundary outline is visible — inner intersection lines between the combined paths are painted over by the fill.
`;

const VOLT_3D = `
# Volt Designer — 3D Objects

3D objects are Three.js-rendered assets that can be placed as layers in the Volt canvas.

---

## Adding a 3D Object

1. Click **3D Objects** in the left sidebar
2. Browse or upload a 3D asset (GLB/GLTF supported)
3. Click an asset to insert it as a layer at the default position

---

## 3D Layer Properties

Select a 3D object layer to access:

| Property | Description |
|----------|-------------|
| **Asset** | Name of the linked 3D asset |
| **Change / Preview** | Opens the 3D asset browser |
| **Active Clip** | Select which animation clip plays |
| **Trigger Events** | Fire system events when the animation ends |

---

## Animation Triggers

After a 3D animation completes, you can fire configurable events:

| Event Type | Effect |
|------------|--------|
| scroll | Scroll the page to a target section |
| modal | Open a modal |
| sound | Play a sound |
| custom | Custom JavaScript event |

---

## Blender Pipeline (volt-sync.py)

The **volt-sync.py** Blender addon syncs assets directly from Blender to the CMS:

1. Install the addon in Blender (Preferences → Add-ons → Install)
2. Enter your **API key** (Settings → API Keys in admin)
3. In Blender, select objects and click **Sync to Volt**
4. The asset appears in the 3D Objects library automatically

See **Admin → API Keys** for key management.
`;

const VOLT_ANIMATION = `
# Volt Designer — Animation

Each layer has an **Animation** configuration that controls how it enters the viewport when the Volt element is revealed.

---

## Animation Properties

| Property | Range | Description |
|----------|-------|-------------|
| **Delay** | 0–100 | Stagger delay before this layer starts animating |
| **Speed** | 0–100 | How fast the animation plays |
| **Style** | 0–100 | Animation curve / easing style |
| **Character** | 0–100 | Amount of "personality" in the motion |

---

## Animates Flags

Toggle which CSS/SVG properties are animated on entrance:

| Flag | Property |
|------|----------|
| Fill | Colour / fill |
| Scale | Size scale |
| Opacity | Fade in |
| Position | Translate in |
| Rotation | Spin in |

---

## Notes

- Animation is powered by **Anime.js 4.x** using the named \`animate\` export
- Animations are triggered when the element scrolls into view
- Each layer animates independently — use **Delay** to stagger a sequence
- Use **Speed** = 0 for instant reveal, 100 for very slow
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
    id: "animations",
    label: "Animations & Motion",
    icon: "bi-stars",
    children: [
      {
        id: "lower-third",
        label: "Lower Third Graphic",
        icon: "bi-layout-bottom",
        content: LOWER_THIRD_DOCS,
      },
      {
        id: "motion-elements",
        label: "Motion & Parallax Elements",
        icon: "bi-wind",
        content: MOTION_ELEMENTS_DOCS,
      },
      {
        id: "feature-flags",
        label: "Feature Flags",
        icon: "bi-toggles",
        content: FEATURE_FLAGS_DOCS,
      },
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
    id: "seo",
    label: "SEO Management",
    icon: "bi-search",
    children: [
      { id: "seo-overview", label: "Site Settings & Per-Page SEO", icon: "bi-search", content: SEO_MANAGEMENT },
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
  {
    id: "volt-designer",
    label: "Volt Designer",
    icon: "bi-vector-pen",
    children: [
      { id: "volt-overview", label: "Overview & Canvas", icon: "bi-info-circle", content: VOLT_OVERVIEW },
      { id: "volt-tools", label: "Drawing Tools", icon: "bi-pencil", content: VOLT_TOOLS },
      { id: "volt-layers", label: "Layers & Selection", icon: "bi-stack", content: VOLT_LAYERS },
      { id: "volt-vertex", label: "Vertex & Bezier Editing", icon: "bi-bezier2", content: VOLT_VERTEX },
      { id: "volt-slots", label: "Slot System", icon: "bi-layout-text-window", content: VOLT_SLOTS },
      { id: "volt-effects", label: "Fill, Stroke & Shadow", icon: "bi-palette", content: VOLT_EFFECTS },
      { id: "volt-boolean", label: "Boolean Operations", icon: "bi-intersect", content: VOLT_BOOLEAN },
      { id: "volt-3d", label: "3D Objects", icon: "bi-box", content: VOLT_3D },
      { id: "volt-animation", label: "Animation", icon: "bi-play-circle", content: VOLT_ANIMATION },
    ],
  },
];
