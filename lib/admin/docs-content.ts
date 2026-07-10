/**
 * CMS — Complete Documentation Content
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
# CMS — Platform Overview

This CMS is a full-stack content management platform built for business websites.
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

The Landing Page is not a single document — it is an ordered **stack of sections**. Each section fills the viewport and the visitor scrolls (snaps) from one to the next. Open it at **Admin → Content → Landing Page**. A real landing page is a **many-section** stack — a Hero, then several mixed middle sections, then a Footer. Every row is one section on the live homepage (slug \`/\`), rendered top-to-bottom in its \`order\`. A **Hero** is pinned to the top and a **Footer** to the bottom; everything between them is freely reorderable.

<div class="fig diagram"><span class="tag">Diagram</span><div class="fig-body"><svg viewBox="0 0 640 380" font-family="system-ui" font-size="12.5"><rect x="34" y="14" width="286" height="352" rx="10" fill="#fff" stroke="#e4e8ef"/><text x="177" y="33" text-anchor="middle" fill="#8a93a3" font-size="11" letter-spacing="1">LIVE HOMEPAGE  ( / )</text><rect x="48" y="42" width="258" height="40" rx="7" fill="#eaf4fd" stroke="#bcd4ff"/><text x="60" y="66" fill="#0a4bc2" font-weight="700" font-size="12">HERO</text><text x="296" y="66" text-anchor="end" fill="#5b6472" font-size="10">pinned top · Fixed</text><rect x="48" y="88" width="258" height="30" rx="7" fill="#f6f8fb" stroke="#e4e8ef"/><text x="60" y="107" fill="#1c2333" font-size="11.5">NORMAL · content</text><text x="296" y="107" text-anchor="end" fill="#0a6b52" font-size="10">single</text><rect x="48" y="124" width="258" height="30" rx="7" fill="#f6f8fb" stroke="#e4e8ef"/><text x="60" y="143" fill="#1c2333" font-size="11.5">FLEXIBLE · designer</text><text x="296" y="143" text-anchor="end" fill="#0a6b52" font-size="10">single</text><rect x="48" y="160" width="258" height="86" rx="7" fill="#eef2ff" stroke="#bcd4ff"/><line x1="48" y1="190" x2="306" y2="190" stroke="#bcd4ff" stroke-dasharray="3 3"/><line x1="48" y1="218" x2="306" y2="218" stroke="#bcd4ff" stroke-dasharray="3 3"/><text x="60" y="178" fill="#0a4bc2" font-size="11.5" font-weight="700">FLEXIBLE · scroll stage</text><text x="296" y="178" text-anchor="end" fill="#0a4bc2" font-size="10">multi</text><text x="60" y="208" fill="#5b6472" font-size="9.5">panel 1 → panel 2 → panel 3</text><text x="60" y="236" fill="#5b6472" font-size="9.5">stacked screens inside one section</text><rect x="48" y="252" width="258" height="30" rx="7" fill="#f6f8fb" stroke="#e4e8ef"/><text x="60" y="271" fill="#1c2333" font-size="11.5">CTA · call to action</text><text x="296" y="271" text-anchor="end" fill="#5b6472" font-size="10">movable</text><rect x="48" y="288" width="258" height="40" rx="7" fill="#eaf4fd" stroke="#bcd4ff"/><text x="60" y="312" fill="#0a4bc2" font-weight="700" font-size="12">FOOTER</text><text x="296" y="312" text-anchor="end" fill="#5b6472" font-size="10">pinned bottom · Fixed</text><text x="177" y="352" text-anchor="middle" fill="#8a93a3" font-size="9.5">…many more middle sections as needed…</text><path d="M321 88 h7 v194 h-7" fill="none" stroke="#e2001a" stroke-width="1.4"/><text x="336" y="188" fill="#e2001a" font-size="10" font-weight="700">drag</text><text x="505" y="33" text-anchor="middle" fill="#8a93a3" font-size="10" letter-spacing="1">SECTION SUB-TYPE</text><rect x="392" y="50" width="92" height="96" rx="8" fill="#e4f7f0" stroke="#bfe6da"/><text x="438" y="70" text-anchor="middle" fill="#0a6b52" font-size="11" font-weight="700">single</text><rect x="404" y="80" width="68" height="40" rx="4" fill="#fff" stroke="#bfe6da"/><text x="438" y="104" text-anchor="middle" fill="#5b6472" font-size="9">one 100vh screen</text><text x="438" y="136" text-anchor="middle" fill="#5b6472" font-size="9">content scrolls inside</text><rect x="512" y="50" width="104" height="160" rx="8" fill="#eef2ff" stroke="#bcd4ff"/><text x="564" y="70" text-anchor="middle" fill="#0a4bc2" font-size="11" font-weight="700">multi</text><rect x="524" y="80" width="80" height="30" rx="4" fill="#fff" stroke="#bcd4ff"/><text x="564" y="99" text-anchor="middle" fill="#5b6472" font-size="9">panel 1</text><rect x="524" y="116" width="80" height="30" rx="4" fill="#fff" stroke="#bcd4ff"/><text x="564" y="135" text-anchor="middle" fill="#5b6472" font-size="9">panel 2</text><rect x="524" y="152" width="80" height="30" rx="4" fill="#fff" stroke="#bcd4ff"/><text x="564" y="171" text-anchor="middle" fill="#5b6472" font-size="9">panel 3</text><text x="564" y="200" text-anchor="middle" fill="#5b6472" font-size="9">stacked screens</text></svg></div><div class="fig-cap"><b>A multi-section stack</b> — Hero pinned top, Footer pinned bottom, and as many movable sections between as you need. Each section carries a <b>sub-type</b>: <b>Fixed</b> (Hero/Footer, non-movable), <b>Hidden</b> (disabled, kept in the list but not rendered), or — on Flexible/Content sections — <b>single</b> (one locked 100vh screen, inner content scrolls) vs <b>multi</b> (a Flexible section that stacks several screens as a Scroll Stage).</div></div>

<div class="fig-note"><b>Where sections actually live.</b> Sections are rows in <b>PostgreSQL</b> (Prisma <code>Section</code> model, one row per section, joined to the <code>Page</code> whose <code>slug</code> is <code>/</code>). The admin list and the public homepage both load them through <code>lib/section-manager.ts</code> → <code>getSections("/")</code>, which fetches <code>/api/sections?pageSlug=/</code>; saves go to <code>/api/sections</code>, <code>/api/sections/[id]</code> and <code>/api/sections/reorder</code>. Per-section settings live in each row's <code>content</code> JSON column — <b>not</b> browser localStorage.</div>

---

## Scroll & Snap

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

> **Why Hero & Footer are special.** They are structural anchors, so the editor disables their drag handle and clamps any reorder into the range *between* them. You can still edit, hide, or delete them — you just cannot move them out of position.
`;

const SECTION_TYPES = `
# Section Types

There are **5 section types** in the CMS:

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

## 3. CTA — Call to Action

A dedicated call-to-action section. Supports a contact form with human verification, hero-style heading + subheading, and multiple CTA buttons.

> **Contact Form:** When form mode is enabled, CTA renders a custom contact form with **human verification via a shuffled keypad** and emails submissions to the configured recipient address.

---

## 4. FOOTER — Page Footer

The bottom section of the page. Contains logo, contact info, navigation columns, social links, certifications, and copyright text.

---

## 5. FLEXIBLE — Visual Designer Section

A free-form canvas section designed using the drag-and-drop **Flexible Section Designer**. Supports 10 element types, animated backgrounds, glass/glow effects, and custom gradients.

> See the **Flexible Sections** documentation for full details.

---

## Section Type Comparison

| Feature | HERO | NORMAL | FLEXIBLE | FOOTER |
|---------|------|--------|----------|--------|
| Background color | ✅ | ✅ | ✅ gradient+image | ✅ |
| Background image | ✅ per slide | ✅ | ✅ | ✅ |
| Animated background | ❌ | ✅ | ✅ | ❌ |
| Section Intro overlay | ❌ | ✅ | ✅ | ❌ |
| Text overlay | ❌ | ✅ | ✅ | ❌ |
| Padding control | ❌ | ✅ | ✅ | ✅ |
| Scroll snap | ✅ | ✅ | single/multi | ✅ |
| Nav label | ❌ | ✅ | ✅ | ❌ |

---

## The Section List

The list is the control centre. Each row is one section and exposes reorder, show/hide, edit, save-as-template and delete — plus a category filter rail.

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><div style="width:100%;max-width:600px"><div class="lrow fixed" style="margin-bottom:22px"><span class="grip" style="opacity:.28">⋮⋮</span><span class="ordn">#0</span><b>Homepage Hero</b><span class="chip blue">HERO</span><span class="chip blue">Fixed</span><span style="display:flex;gap:5px;justify-content:flex-end"><span class="iconbtn w">◎</span><span class="iconbtn p">✎</span><span class="iconbtn">▢</span><span class="iconbtn d">🗑</span></span></div><div class="lrow"><span class="grip anno">⋮⋮<span class="cnum">1</span></span><span class="ordn anno">#3<span class="cnum">2</span></span><b class="anno">Services<span class="cnum">3</span></b><span class="chip anno">FLEXIBLE<span class="cnum">4</span></span><span class="chip info anno">multi<span class="cnum">5</span></span><span class="anno" style="display:flex;gap:5px;justify-content:flex-end"><span class="cnum">6</span><span class="iconbtn">↑</span><span class="iconbtn">↓</span><span class="iconbtn w">◎</span><span class="iconbtn p">✎</span><span class="iconbtn">▢</span><span class="iconbtn d">🗑</span></span></div></div><div style="width:100%;max-width:600px;font-size:11.5px;color:#7a2570;margin-top:4px"><div style="display:flex;gap:16px 20px;flex-wrap:wrap"><span><span class="callout-num">1</span> drag handle <span style="color:#8a93a3">(movable rows only)</span></span><span><span class="callout-num">2</span> order number</span><span><span class="callout-num">3</span> admin section name</span><span><span class="callout-num">4</span> type badge</span><span><span class="callout-num">5</span> sub-type badge <span style="color:#8a93a3">(Fixed / Hidden / single / multi)</span></span><span><span class="callout-num">6</span> row actions <span style="color:#8a93a3">(↑↓ · show/hide · edit · save-as-template · delete)</span></span></div></div></div><div class="fig-cap"><b>A section row, annotated in place.</b> The top (blue-tinted) row is a <b>Fixed</b> Hero — its drag handle is greyed and it has no up/down arrows. The bottom row is a movable <b>Flexible · multi</b> section with the full control set; each red badge sits on the element it labels.</div></div>

### Row actions

| Control | Icon | Does |
|---------|------|------|
| Drag handle | ⋮⋮ | Drag-and-drop reorder (movable sections only). Drop is clamped to stay between Hero and Footer. 8px drag threshold so a click never triggers a drag. |
| Move up / down | ↑ ↓ | One-step reorder; auto-disabled at the boundary next to Hero/Footer. Only shown when 2+ movable sections exist. |
| Show / Hide | ◎ | Toggles \`enabled\`. A hidden section stays in the list (badge reads **Hidden**) but is not rendered on the live page. |
| Edit | ✎ | Opens the matching editor modal. The section id is written to the URL (\`?edit=<id>\`) so a refresh reopens it. |
| Save as Template | ▢ | Saves this section's full config (background, spacing, content, intro shape, lower-third, motion…) to the reusable Template Library. |
| Delete | 🗑 | Removes the section after an in-app confirm dialog. Remaining sections are re-numbered. |

### Sub-type / status badge (one per row)

| Badge | Shown when | Meaning |
|-------|-----------|---------|
| **Hidden** | \`enabled === false\` (any type) | Kept in the list but not rendered. Takes priority — a disabled Hero reads Hidden, not Fixed. |
| **Fixed** | enabled & type \`HERO\` or \`FOOTER\` | Pinned anchor — non-movable (no drag handle, no arrows). |
| **single** | enabled & \`FLEXIBLE\`, \`contentMode ≠ "multi"\` | One locked 100vh screen; inner content scrolls. |
| **multi** | enabled & \`FLEXIBLE\`, \`contentMode === "multi"\` | Section grows taller / stacks Scroll-Stage screens. |
| — none — | enabled NORMAL or CTA rows | No sub-type badge (the slot is empty). |

> ⚠️ **Clear All is destructive.** It deletes every section on the page and requires typing **YES** into the confirm dialog before it proceeds. There is no undo.

---

## Adding a Section

Add Section opens a small modal with a single type picker. Most types create immediately; a non-plugin Flexible type detours through a preset gallery first.

<div class="fig control"><span class="tag">Control mockup</span><div class="fig-body"><div class="mock-panel" style="max-width:440px"><div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:14px"><b>Add New Section</b><span style="color:#b3bccb">✕</span></div><label class="lbl">Section Type</label><select class="input"><option>Hero Section (Always First)</option><option>Footer Section (Always Last)</option><option>Call to Action (Movable)</option><option selected>Content Section (Movable)</option><option>Flexible Section (Custom Layout)</option><option>── Plugin Sections ──</option></select><div class="hint" style="margin-top:8px">ⓘ Normal sections can be positioned anywhere between hero and footer.</div><div style="display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--line);padding-top:14px;margin-top:16px"><button class="btno">Cancel</button><button class="btnp">＋ Create Section</button></div></div></div><div class="fig-cap"><b>Add Section modal</b> — one dropdown of types. The help line under it changes per selected type to explain placement rules.</div></div>

<div class="fig diagram"><span class="tag">Diagram</span><div class="fig-body"><svg viewBox="0 0 640 210" font-family="system-ui" font-size="12.5"><rect x="20" y="80" width="120" height="44" rx="8" fill="#e7f0ff" stroke="#bcd4ff"/><text x="80" y="100" text-anchor="middle" fill="#0a4bc2" font-weight="700">Add Section</text><text x="80" y="116" text-anchor="middle" fill="#5b6472" font-size="11">pick a type</text><line x1="140" y1="102" x2="210" y2="102" stroke="#c3cbd6" stroke-width="1.5"/><polygon points="210,102 200,97 200,107" fill="#c3cbd6"/><polygon points="270,102 320,72 370,102 320,132" fill="#fff" stroke="#e4e8ef"/><text x="320" y="99" text-anchor="middle" fill="#1c2333" font-size="11">Flexible?</text><text x="320" y="114" text-anchor="middle" fill="#8a93a3" font-size="10">no plugin</text><line x1="370" y1="102" x2="440" y2="102" stroke="#c3cbd6" stroke-width="1.5"/><polygon points="440,102 430,97 430,107" fill="#c3cbd6"/><text x="405" y="94" text-anchor="middle" fill="#8a93a3" font-size="10">no</text><rect x="440" y="80" width="180" height="44" rx="8" fill="#e4f7f0" stroke="#bfe6da"/><text x="530" y="100" text-anchor="middle" fill="#0a6b52" font-weight="700">Section created</text><text x="530" y="116" text-anchor="middle" fill="#5b6472" font-size="11">opens in the list</text><line x1="320" y1="132" x2="320" y2="168" stroke="#c3cbd6" stroke-width="1.5"/><polygon points="320,168 315,158 325,158" fill="#c3cbd6"/><text x="332" y="152" fill="#8a93a3" font-size="10">yes</text><rect x="212" y="168" width="216" height="34" rx="8" fill="#fdf6e3" stroke="#f0e0bd"/><text x="320" y="189" text-anchor="middle" fill="#8a5a00" font-weight="700">"Choose a Layout" → then create</text></svg></div><div class="fig-cap"><b>Create flow</b> — most types create the section immediately; a non-plugin <b>Flexible</b> type first opens the <b>Choose a Layout</b> gallery (\`PresetsGalleryModal\`): seven full-section templates — About Grid, Services Grid, How It Works, Contact Split, Stats Banner, Features Alternating, Team Grid — plus a <b>Start Blank</b> card.</div></div>
`;

const SECTION_EDITOR_OVERVIEW = `
# Section Editor — Overview

Editing a section opens a large modal. Content, background, spacing and the decorative extras all live behind a row of tabs. **Five editor variants** exist: **Content** (NORMAL) and **Flexible** share the same eight-tab shell (controls on the left, a persistent live preview on the right), while **CTA**, **Footer** and **Hero** are purpose-built forms.

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><div class="tabbar"><span class="t on">🅣 Content</span><span class="t">🖼 Background</span><span class="t">✦ Animation</span><span class="t">▤ Text Overlay</span><span class="t">◺ Section Intro</span><span class="t">▂ Lower Third</span><span class="t">🎞 Motion</span><span class="t">↕ Spacing</span></div><div style="font-size:11.5px;color:#7a2570;max-width:600px;margin-top:6px">Flexible editor adds a <b>Scroll Stage</b> tab when Content Mode = Multi, and relabels <b>Section Intro → Intro</b>.</div></div><div class="fig-cap"><b>Section editor tab bar</b> (Content / Flexible variants) — eight tabs; each is documented in its own topic. The active tab shows a blue underline.</div></div>

## Common Header Controls (All Tabs)

These controls appear at the top of the modal regardless of active tab:

| Control | Description |
|---------|-------------|
| **Display Name** | Internal admin label (not shown on website) |
| **Nav Label** | 1-word label shown in navbar (e.g. "Coverage") |
| **Enable/Disable** toggle | Show or hide the section on the live site |

---

## Editor variants — what differs

| Variant | Opens for | Distinctive tabs / controls |
|---------|-----------|------------------------------|
| Content editor | NORMAL | All 8 tabs. Content tab has layout type (text-only / text+image / image+text / grid / columns), layout preset, and an inline rich-text body editor. |
| Flexible editor | FLEXIBLE + plugin | Same 8 tabs + **Scroll Stage** (multi mode). Content tab launches the **Flexible Designer** and lists designer blocks in an accordion. |
| CTA editor | CTA | Purpose-built form: heading, sub-heading, buttons, contact info. No designer. |
| Footer editor | FOOTER | Logo, tagline, company info, link columns, social links, certification logos, copyright. |
| Hero editor | HERO | Carousel of slides — each with image/video, animated heading/subheading, buttons, gradient overlay, autoplay/dots/arrows. |

> **Autosave.** Both big editors autosave in the background as well as on explicit Save. The Flexible editor additionally keeps an unsaved-work draft in local storage and warns before discarding designer changes that haven't been committed to the section.
`;

const TAB_CONTENT = `
# Section Editor — Content Tab

The Content tab is where you edit the main body of the section. What you see here changes based on **section type**. It also carries the **Content Height Mode** (single / multi) that decides whether the section is one locked 100vh screen or grows taller.

<div class="fig control"><span class="tag">Control mockup</span><div class="fig-body"><div class="mock-panel"><label class="lbl">Content Height Mode</label><div class="seg" style="width:100%"><button class="on" style="flex:1">⛶ Single Screen (100vh)</button><button style="flex:1">↕ Multi Screen (&gt;100vh)</button></div><div class="hint" style="margin-bottom:14px">Single locks the section to one viewport; content scrolls inside it. Multi lets the section grow taller than the screen.</div><label class="lbl">Layout Type</label><select class="input" style="margin-bottom:12px"><option>Text Only</option><option selected>Text + Image (Right)</option><option>Image + Text (Left)</option><option>Grid Layout</option><option>Multiple Columns</option></select><label class="lbl">Content Position Preset</label><select class="input"><option selected>Text Left + Image Right — Standard side-by-side</option><option>Text Overlay (Center)</option><option>Text Overlay (Bottom)</option></select><div class="hint">Presets also drive the recommended text-overlay position.</div></div></div><div class="fig-cap"><b>Content tab (NORMAL)</b> — height mode, layout type and position preset. Image/columns fields appear only for the layouts that use them.</div></div>

### Single vs multi — where "multi" really stacks panels

The \`contentMode\` flag means two different things. In the **Content (NORMAL)** editor it is purely a height cap. In the **Flexible** editor, switching Content Mode to **Multi** reveals a **Scroll Stage** tab — that is what turns one section into *several stacked screens* ("zones") you add, edit and reorder.

<div class="fig diagram"><span class="tag">Diagram</span><div class="fig-body"><svg viewBox="0 0 640 240" font-family="system-ui" font-size="12"><text x="120" y="26" text-anchor="middle" fill="#0a6b52" font-size="12" font-weight="700">single</text><rect x="60" y="36" width="120" height="150" rx="8" fill="#e4f7f0" stroke="#bfe6da"/><rect x="72" y="52" width="96" height="118" rx="5" fill="#fff" stroke="#bfe6da"/><text x="120" y="108" text-anchor="middle" fill="#5b6472" font-size="10">one 100vh</text><text x="120" y="122" text-anchor="middle" fill="#5b6472" font-size="10">screen</text><text x="120" y="206" text-anchor="middle" fill="#8a93a3" font-size="9.5">inner content scrolls</text><text x="320" y="26" text-anchor="middle" fill="#0a4bc2" font-size="12" font-weight="700">multi · Content editor</text><rect x="266" y="36" width="108" height="176" rx="8" fill="#f6f8fb" stroke="#e4e8ef"/><rect x="278" y="48" width="84" height="150" rx="5" fill="#fff" stroke="#e4e8ef"/><text x="320" y="118" text-anchor="middle" fill="#5b6472" font-size="10">grows taller</text><text x="320" y="132" text-anchor="middle" fill="#5b6472" font-size="10">than 100vh</text><text x="320" y="228" text-anchor="middle" fill="#8a93a3" font-size="9.5">height flag only — no panels</text><text x="530" y="26" text-anchor="middle" fill="#0a4bc2" font-size="12" font-weight="700">multi · Flexible Scroll Stage</text><rect x="470" y="36" width="120" height="176" rx="8" fill="#eef2ff" stroke="#bcd4ff"/><rect x="482" y="46" width="96" height="46" rx="5" fill="#fff" stroke="#bcd4ff"/><text x="530" y="73" text-anchor="middle" fill="#5b6472" font-size="9.5">Zone 1</text><rect x="482" y="98" width="96" height="46" rx="5" fill="#fff" stroke="#bcd4ff"/><text x="530" y="125" text-anchor="middle" fill="#5b6472" font-size="9.5">Zone 2</text><rect x="482" y="150" width="96" height="46" rx="5" fill="#fff" stroke="#bcd4ff"/><text x="530" y="177" text-anchor="middle" fill="#5b6472" font-size="9.5">Zone 3</text><text x="530" y="228" text-anchor="middle" fill="#8a93a3" font-size="9.5">stacked screens you add/reorder</text></svg></div><div class="fig-cap"><b>Three readings of the sub-type.</b> <b>single</b> — one locked 100vh screen. <b>multi (Content editor)</b> — the same section allowed to grow past 100vh; no panels. <b>multi (Flexible)</b> — Content Mode = Multi unlocks the <b>Scroll Stage</b> tab whose <b>Zones</b> render as several stacked scroll-driven screens inside the one section.</div></div>

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

Controls the section's background appearance — a solid colour, a preset swatch, a custom hex, or a gradient — plus an optional section background image with size/position/repeat/opacity/parallax. The distinctive control here is the **gradient mask** (fade): it fades the *background image itself* to transparent so it blends into the section colour — different from a colour overlay drawn on top.

<div class="fig-grid2"><div class="fig control" style="margin:0"><span class="tag">Control mockup</span><div class="fig-body"><div class="mock-panel"><label class="lbl">Background Type</label><div class="seg" style="width:100%;margin-bottom:12px"><button class="on" style="flex:1">🪣 Solid</button><button style="flex:1">🎨 Gradient</button></div><label class="lbl">Preset Colors</label><div style="display:flex;gap:8px;flex-wrap:wrap;padding:10px;background:var(--panel);border-radius:8px"><span class="swatch sel" style="background:#fff"></span><span class="swatch" style="background:#f8f9fa"></span><span class="swatch" style="background:#1e3a5f"></span><span class="swatch" style="background:#dbeafe"></span><span class="swatch" style="background:repeating-linear-gradient(45deg,#ccc 0 4px,#fff 4px 8px)"></span></div><div class="hint" style="margin-top:8px">White · Gray · Blue · Light Blue · None(transparent), then a full brand swatch strip + custom hex picker.</div></div></div><div class="fig-cap"><b>Background type &amp; presets</b> — Solid/Gradient toggle, five named presets, brand swatches, and a custom hex + eyedropper.</div></div><div class="fig control" style="margin:0"><span class="tag">Control mockup</span><div class="fig-body"><div class="mock-panel"><div class="sw-row"><span class="toggle"></span><span class="lbl" style="margin:0">Fade image to transparent (gradient mask)</span></div><div class="hint" style="margin-bottom:12px">Fades the background image so it blends into the section colour.</div><label class="lbl">Fade Direction</label><select class="input" style="margin-bottom:12px"><option selected>To Bottom</option><option>To Top</option><option>To Left</option><option>To Right</option></select><label class="lbl">Opaque Until: 0%</label><div class="slider"><div class="fill" style="width:0"></div><div class="knob" style="left:0"></div></div><label class="lbl">Fully Faded At: 100%</label><div class="slider"><div class="fill" style="width:100%"></div><div class="knob" style="left:100%"></div></div></div></div><div class="fig-cap"><b>Gradient mask (fade)</b> — appears when a section background image is set. Two stops define where the image stays opaque and where it reaches full transparency.</div></div></div>

<div class="fig render"><span class="tag">Render preview</span><div class="fig-body"><svg viewBox="0 0 600 150" style="max-width:560px"><defs><linearGradient id="bgphoto" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a6ea5"/><stop offset="1" stop-color="#8fb3d9"/></linearGradient><linearGradient id="bgmask" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#f6f8fb" stop-opacity="1"/></linearGradient></defs><rect x="20" y="14" width="260" height="122" rx="8" fill="url(#bgphoto)"/><text x="150" y="80" text-anchor="middle" fill="#fff" font-size="12" opacity=".8">image, no mask</text><rect x="320" y="14" width="260" height="122" rx="8" fill="url(#bgphoto)"/><rect x="320" y="14" width="260" height="122" rx="8" fill="url(#bgmask)"/><text x="450" y="42" text-anchor="middle" fill="#fff" font-size="12" opacity=".9">image, faded to bottom</text><text x="450" y="126" text-anchor="middle" fill="#5b6472" font-size="11">blends into section colour</text></svg></div><div class="fig-cap"><b>What the mask does</b> — left: raw image; right: same image faded (To Bottom) so its lower edge dissolves into the section's background colour.</div></div>

<div class="fig-note"><b>Two different "gradients."</b> The <b>Gradient background type</b> paints a colour gradient. The <b>Gradient mask</b> makes the <em>image</em> fade to nothing. They are independent and can be combined.</div>

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

### Theme-aware backgrounds (light / dark)

Below the solid-colour picker, the **Theme-aware** swatches (BG · Surface · Navy · Card) set the background to a theme token instead of a fixed colour. A section using one of these **flips automatically** when the visitor toggles light/dark, and its default text colour follows the theme. The site default is set in **Settings → Site Configuration → Default Theme**.
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
# Section Editor — Section Intro Tab

**Section Intro** (internally the *triangle* overlay) draws a decorative SVG shape at a section edge — a transition into the next section. Clicking it scrolls to the target section. It supports nine shapes, a side, a height, solid/gradient/image fill, and optional hover text.

<div class="fig control"><span class="tag">Control mockup</span><div class="fig-body"><div class="mock-panel"><label class="lbl">Shape</label><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px"><div style="border:2px solid var(--primary);border-radius:6px;background:#e8f0fe;padding:6px 4px 3px;text-align:center"><svg viewBox="0 0 200 100" preserveAspectRatio="none" style="width:56px;height:28px"><path d="M 200 0 L 0 100 L 200 100 Z" fill="#0d6efd"/></svg><div style="font-size:10px;color:#0d6efd;font-weight:700">Triangle</div></div><div style="border:2px solid #dee2e6;border-radius:6px;background:#f8f9fa;padding:6px 4px 3px;text-align:center"><svg viewBox="0 0 200 100" preserveAspectRatio="none" style="width:56px;height:28px"><path d="M 200 0 L 130 100 L 200 100 Z" fill="#6c757d"/></svg><div style="font-size:10px;color:#495057">Steep</div></div><div style="border:2px solid #dee2e6;border-radius:6px;background:#f8f9fa;padding:6px 4px 3px;text-align:center"><svg viewBox="0 0 200 100" preserveAspectRatio="none" style="width:56px;height:28px"><path d="M 0 0 L 0 100 L 200 100 Z" fill="#6c757d"/></svg><div style="font-size:10px;color:#495057">Diagonal</div></div><div style="border:2px solid #dee2e6;border-radius:6px;background:#f8f9fa;padding:6px 4px 3px;text-align:center"><svg viewBox="0 0 200 100" preserveAspectRatio="none" style="width:56px;height:28px"><path d="M 200 0 L 200 100 L 0 100 L 100 0 Z" fill="#6c757d"/></svg><div style="font-size:10px;color:#495057">Rhombus</div></div><div style="border:2px solid #dee2e6;border-radius:6px;background:#f8f9fa;padding:6px 4px 3px;text-align:center"><svg viewBox="0 0 200 100" preserveAspectRatio="none" style="width:56px;height:28px"><path d="M 200 0 Q 0 0 0 100 L 200 100 Z" fill="#6c757d"/></svg><div style="font-size:10px;color:#495057">Curve Out</div></div><div style="border:2px solid #dee2e6;border-radius:6px;background:#f8f9fa;padding:6px 4px 3px;text-align:center"><svg viewBox="0 0 200 100" preserveAspectRatio="none" style="width:56px;height:28px"><path d="M 200 0 Q 200 100 0 100 L 200 100 Z" fill="#6c757d"/></svg><div style="font-size:10px;color:#495057">Curve In</div></div><div style="border:2px solid #dee2e6;border-radius:6px;background:#f8f9fa;padding:6px 4px 3px;text-align:center"><svg viewBox="0 0 200 100" preserveAspectRatio="none" style="width:56px;height:28px"><path d="M 0 100 C 40 50 80 100 120 50 C 160 0 190 60 200 0 L 200 100 Z" fill="#6c757d"/></svg><div style="font-size:10px;color:#495057">Wave</div></div><div style="border:2px solid #dee2e6;border-radius:6px;background:#f8f9fa;padding:6px 4px 3px;text-align:center"><svg viewBox="0 0 200 100" preserveAspectRatio="none" style="width:56px;height:28px"><path d="M 0 100 Q 100 -30 200 100 Z" fill="#6c757d"/></svg><div style="font-size:10px;color:#495057">Arch</div></div><div style="border:2px solid #dee2e6;border-radius:6px;background:#f8f9fa;padding:6px 4px 3px;text-align:center"><svg viewBox="0 0 200 100" preserveAspectRatio="none" style="width:56px;height:28px"><path d="M 200 0 L 0 100 L 200 100 Z" fill="#6c757d"/></svg><div style="font-size:10px;color:#495057">Classic</div></div></div></div></div><div class="fig-cap"><b>Section Intro shape picker</b> — nine preset shapes: <b>Triangle</b> (id \`modern\`), Steep, Diagonal, Rhombus, Curve Out, Curve In, Wave, Arch, <b>Classic</b> (id \`classic\`). The picker highlights the current shape in blue; with none set it falls back to highlighting the first item, Triangle.</div></div>

<div class="fig-note"><b>Triangle vs Classic — the default is nuanced.</b> When you enable Section Intro the value actually stored is <code>classic</code> (label "Classic", the last swatch), while the picker's cosmetic highlight fallback is <code>modern</code> / "Triangle" (the first swatch). Both draw the identical triangle path, so either way the default <em>looks</em> like a plain triangle. One real consequence: <b>gradients only render on the non-<code>classic</code> (clip-path) shapes</b> — switch off Classic to use gradient fills.</div>

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

> ℹ️ Sections with Section Intro overlays use \`overflow: visible\` and a \`z-index\` bump to render above adjacent sections.
`;

const TAB_SPACING = `
# Section Editor — Spacing Tab

Controls the internal padding of the section on desktop and mobile independently. All spacing is padding *inside* the section — there are no external margins. When mobile overrides are available the control gains Desktop/Mobile sub-tabs; mobile defaults to a smart "Auto" that clears the fixed navbar.

<div class="fig control"><span class="tag">Control mockup</span><div class="fig-body"><div class="mock-panel"><div style="display:flex;gap:2px;border-bottom:1px solid var(--line);margin-bottom:14px"><span class="t" style="padding:7px 12px;border-bottom:2px solid var(--primary);color:var(--primary-ink);font-weight:600;font-size:12.5px">🖥 Desktop</span><span class="t" style="padding:7px 12px;color:var(--muted);font-size:12.5px">📱 Mobile <span class="chip blue" style="font-size:10px">custom</span></span></div><div style="display:flex;justify-content:space-between"><span class="lbl">Padding Top <span class="hint">(space above content)</span></span><span class="chip blue">100px</span></div><div class="slider"><div class="fill" style="width:50%"></div><div class="knob" style="left:50%"></div></div><div style="display:flex;justify-content:space-between"><span class="lbl">Padding Bottom <span class="hint">(space below content)</span></span><span class="chip blue">80px</span></div><div class="slider"><div class="fill" style="width:40%"></div><div class="knob" style="left:40%"></div></div><div style="border-top:1px solid var(--line);padding-top:10px;margin-top:6px"><span class="lbl">Quick Presets</span><div class="seg" style="width:100%"><button style="flex:1">Compact</button><button class="on" style="flex:1">Normal</button><button style="flex:1">Spacious</button></div></div></div></div><div class="fig-cap"><b>Spacing controls</b> — dual slider + number entry (0–200px, 5px steps) for top &amp; bottom, three quick presets, and a Desktop/Mobile tab split.</div></div>

---

## Desktop Tab

| Setting | Range | Default | Description |
|---------|-------|---------|-------------|
| **Padding Top** | 0–200px | 100px | Space above content on desktop |
| **Padding Bottom** | 0–200px | 80px | Space below content on desktop |

---

## Mobile Tab

Each field defaults to **Auto** — the smart default (100px top / 80px bottom) is applied automatically on all mobile screens without any configuration needed.

The 100px top default always clears the 76px fixed navbar with 24px breathing room.

To override a field, toggle the switch from **Auto** to **Custom** — a slider and number input appear. The Mobile tab shows a **custom** badge whenever any field has a manual override.

| Setting | Default | Description |
|---------|---------|-------------|
| **Padding Top (mobile)** | Auto = 100px | Space above content on phones/tablets. Must be ≥ 76px to clear the fixed navbar. |
| **Padding Bottom (mobile)** | Auto = 80px | Space below content on phones/tablets. |

> 💡 **Leave both fields on Auto** unless a section needs a very different layout on mobile. The defaults are designed to look correct on all screen sizes without adjustment.

---

## Quick Presets

Both the Desktop and Mobile (when overriding) tabs include quick-preset buttons:

| Preset | Top | Bottom |
|--------|-----|--------|
| **Compact** | 40px | 20px |
| **Normal** | 100px | 80px |
| **Spacious** | 150px | 120px |

---

## How It Works

Spacing is applied via CSS custom properties on the section element:

- \`--section-pt\` / \`--section-pb\` — desktop padding
- \`--section-pt-mobile\` / \`--section-pb-mobile\` — mobile override (only emitted when Custom is set)

The \`.section-content-wrapper\` reads these variables. On mobile (≤ 767px) it reads the mobile vars with a 100px/80px fallback, so all sections are safe even without explicit mobile values.
`;

const TAB_PREVIEW = `
# Section Editor — Preview Tab

The Preview tab shows a **live render** of the section at a true device viewport, so CSS @media queries fire exactly as they do on the real site.

---

## Device Selector

Three buttons let you switch the simulated viewport:

| Button | Viewport | What it simulates |
|--------|----------|-------------------|
| **Desktop** | 1440px | Standard widescreen monitor |
| **Tablet** | 768px | iPad / tablet portrait |
| **Mobile** | 375px | iPhone / small phone |

Each device is rendered inside a **device frame chrome** — a bordered screen outline with a browser bar (desktop) or status notch (tablet/mobile) — so the boundaries of the simulated screen are always clear.

---

## How it works

- The section is rendered in a sandboxed iframe sized to the exact device width
- Because the iframe is a true 1440px / 768px / 375px viewport, Bootstrap breakpoints and all CSS \`@media\` rules are fully accurate
- The frame is scaled down to fit the modal — the scale factor is shown in the dimension ruler below the device

---

## Limitations

- Some entrance animations may be slightly different from the live site (they re-trigger on preview load)
- Scroll-snap and section-to-section transitions are not shown — only the single section is rendered
- Very tall mobile layouts scroll inside the device frame

---

> 💡 Always verify on the live site at \`localhost:3000\` for the final result — especially for scroll snap, section transitions, and animations.
`;

const FLEXIBLE_OVERVIEW = `
# Flexible Sections — Overview

Flexible Sections use a **drag-and-drop visual designer** to create fully custom layouts. Unlike Normal Sections which have preset layouts, Flexible Sections give you complete control over every element. The Designer opens from the Flexible editor's Content tab and hands the layout back to the section as designer JSON.

<div class="fig-warn"><b>⚠ Program rules that govern this tool.</b> <b>DESIGNER-FIRST</b> — all UI layout, content and section design is authored here in the Designer, never via hardcoded scripts, direct JSON, or renderer edits; seeding scripts must write \`designerData\` in this exact schema and every section must re-open editable here. <b>VOLT-FIRST for graphical elements</b> — cards, hover animations, 3D showcase cards and interactive graphical elements are built as Volt designs and dropped in via the \`volt\` block, not as hardcoded React. The canvas, sections and CSS are shared surfaces — every change is HIGH RISK and visually verified on deploy.</div>

### This package is split across dedicated pages

| Page | Covers |
|------|--------|
| **Designer Overview** (this page) | Orientation, how to open, content modes, positioning, media, responsive, rulers |
| **Toolbar & Canvas** | Top action bar (Save/Done, FREE/GRID, SNAP, guides) + canvas toolbar (rulers, undo, device, zoom, preview) + canvas interactions |
| **Section Configuration** | Content mode, the 3 layout engines (Grid / Preset / Mosaic), 11 preset skeletons, section header & footer |
| **Block Library & Elements** | The 4 library tabs, all 14 container blocks, sub-elements, Volt, and 7 full layout templates |
| **Properties Panel** | Exhaustive per-type control reference (block settings + sub-element props + animation + nav target) |
| **Layers, Menus & Shortcuts** | Layers tree, context menus, the 3 floating toolbars, full keyboard map |
| **Wrapper Modal & Save** | The section wrapper that hosts the iframe, its 8 chrome tabs, and the postMessage save protocol |

**Figure types used throughout:** <span class="tag">Interface map</span> annotated panel mock with numbered callouts · <span class="tag">Control mockup</span> a group of controls reproduced · <span class="tag">Render preview</span> what the output looks like · <span class="tag">Diagram</span> flow / relationship. *(Reference built from source — not browser-verified.)*

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><svg viewBox="0 0 640 360" font-family="system-ui" font-size="11.5"><rect x="10" y="10" width="620" height="30" rx="6" fill="#1c2333"/><text x="24" y="30" fill="#fff" font-weight="700">Layout <tspan fill="#8fb3ff">Designer</tspan></text><rect x="150" y="16" width="86" height="18" rx="9" fill="#2a3550"/><text x="193" y="29" text-anchor="middle" fill="#cdd7ee" font-size="10">Single Section</text><text x="404" y="30" fill="#cdd7ee" font-size="10">⟜ FREE</text><rect x="446" y="16" width="30" height="18" rx="4" fill="#2a3550"/><text x="461" y="29" text-anchor="middle" fill="#cdd7ee" font-size="10">SNAP</text><rect x="536" y="15" width="42" height="20" rx="5" fill="#0d6efd"/><text x="557" y="29" text-anchor="middle" fill="#fff" font-size="10">Save</text><rect x="582" y="15" width="42" height="20" rx="5" fill="#198754"/><text x="603" y="29" text-anchor="middle" fill="#fff" font-size="10">Done</text><rect x="10" y="48" width="150" height="304" rx="7" fill="#fff" stroke="#e4e8ef"/><text x="20" y="66" fill="#8a93a3" font-size="10">SECTION CONFIG</text><rect x="20" y="72" width="130" height="16" rx="3" fill="#f6f8fb"/><text x="20" y="106" fill="#8a93a3" font-size="10">BLOCK LIBRARY</text><rect x="20" y="112" width="130" height="14" rx="3" fill="#eef2ff"/><text x="26" y="123" fill="#0a4bc2" font-size="9">Blocks · Sub-Els · ⚡Volt · Layouts</text><g fill="#f6f8fb" stroke="#e4e8ef"><rect x="20" y="132" width="62" height="34" rx="5"/><rect x="88" y="132" width="62" height="34" rx="5"/><rect x="20" y="172" width="62" height="34" rx="5"/><rect x="88" y="172" width="62" height="34" rx="5"/><rect x="20" y="212" width="62" height="34" rx="5"/><rect x="88" y="212" width="62" height="34" rx="5"/></g><text x="51" y="153" text-anchor="middle" font-size="9" fill="#5b6472">Hero</text><text x="119" y="153" text-anchor="middle" font-size="9" fill="#5b6472">Card</text><text x="51" y="193" text-anchor="middle" font-size="9" fill="#5b6472">Text</text><text x="119" y="193" text-anchor="middle" font-size="9" fill="#5b6472">Stats</text><text x="51" y="233" text-anchor="middle" font-size="9" fill="#5b6472">Image</text><text x="119" y="233" text-anchor="middle" font-size="9" fill="#5b6472">Video</text><rect x="168" y="48" width="316" height="304" rx="7" fill="#f6f8fb" stroke="#e4e8ef"/><rect x="168" y="48" width="316" height="24" rx="7" fill="#fff" stroke="#e4e8ef"/><text x="180" y="64" fill="#5b6472" font-size="10">Live Preview Canvas</text><text x="476" y="64" text-anchor="end" fill="#8a93a3" font-size="9">🖥 📱 · zoom · 🖼 bg · 👁</text><rect x="186" y="86" width="280" height="70" rx="6" fill="#fff" stroke="#cfe0ff"/><text x="326" y="125" text-anchor="middle" fill="#0a4bc2" font-size="10">Hero block</text><rect x="186" y="166" width="134" height="80" rx="6" fill="#fff" stroke="#e4e8ef"/><rect x="332" y="166" width="134" height="80" rx="6" fill="#fff" stroke="#e4e8ef"/><text x="253" y="210" text-anchor="middle" fill="#5b6472" font-size="10">Card</text><text x="399" y="210" text-anchor="middle" fill="#5b6472" font-size="10">Card</text><line x1="326" y1="86" x2="326" y2="330" stroke="#0d6efd" stroke-width="1" stroke-dasharray="3 3" opacity=".5"/><text x="330" y="330" fill="#0d6efd" font-size="8">align guide</text><rect x="492" y="48" width="138" height="304" rx="7" fill="#fff" stroke="#e4e8ef"/><text x="502" y="66" fill="#8a93a3" font-size="10">PROPERTIES</text><rect x="502" y="74" width="118" height="120" rx="5" fill="#f6f8fb"/><text x="502" y="214" fill="#8a93a3" font-size="10">LAYERS</text><rect x="502" y="222" width="118" height="16" rx="3" fill="#eef2ff"/><rect x="510" y="244" width="110" height="12" rx="2" fill="#f6f8fb"/><rect x="518" y="260" width="102" height="12" rx="2" fill="#f6f8fb"/><rect x="518" y="276" width="102" height="12" rx="2" fill="#f6f8fb"/></svg></div><div class="fig-cap"><b>Designer layout</b> — top action bar (mode, FREE/SNAP, Save/Done); left = Section Config + Block Library; centre = Live Preview Canvas with per-device toolbar; right = Properties + Layers tree.</div></div>

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

const SCROLL_STAGE_DOCS = `
# Scroll Stage — Parallax Zones

**Scroll Stage** turns a FLEXIBLE section into an immersive multi-panel experience. As the visitor scrolls, a sticky visual track (image, video, or 3D model) plays alongside zone-specific text content on the other side.

---

## How It Works

- The section expands to **N × 100vh** (one screen per zone, up to 5)
- The left or right column is **sticky** — it stays fixed in the viewport while the page scrolls through each zone
- The visual track cross-fades between zone images/videos as the scroll position changes
- The text column updates with a cross-fade when a new zone becomes active
- **Mobile:** zones stack vertically — no sticky behaviour, all zones scroll naturally

---

## Enabling Scroll Stage

1. Edit a **FLEXIBLE** section
2. Set **Content Mode → Multi** and choose number of zones (1–5)
3. Enable the **Scroll Stage** toggle
4. Configure each zone in the **Scroll Stage** tab

---

## Zone Configuration

| Field | Description |
|-------|-------------|
| **Visual Type** | \`image\` \| \`video\` \| \`3d\` — what appears in the sticky track |
| **Image / Video URL** | Direct URL to the media asset |
| **Object Fit** | \`cover\` (fill) or \`contain\` (letterbox) |
| **Object Position** | \`center\`, \`top\`, \`bottom\`, \`left\`, \`right\` |
| **Parallax Factor** | 0 = no parallax, 1 = normal, 1.4 = fast. Image shifts at this multiplier relative to scroll |
| **Parallax Direction** | \`up\` or \`down\` |
| **Transition Duration** | Cross-fade time in ms (e.g. 500, 800) |
| **Side Override** | Force track to \`left\` or \`right\` for this zone only |

---

## Track Side

Set globally under **Scroll Stage → Side**: \`left\` or \`right\`.
Individual zones can override with **Side Override**.

---

## 3D Track (Three.js)

When **Visual Type = 3d**, the track renders a Three.js scene:
- Upload a GLB model via the media library
- The model auto-rotates and responds to scroll position
- Zone transitions animate the model rotation

---

## Content Per Zone

Each zone shows its own blocks from the **Flexible Designer**. Blocks are assigned to zones via their **Section** position field (0 = zone 1, 1 = zone 2, etc.).

- **Desktop:** only the active zone's blocks are shown (cross-fade on zone change)
- **Mobile:** all zones' blocks are stacked vertically in one continuous scroll

---

## Scroll Snap

Each zone boundary is a CSS scroll-snap point — scrolling snaps cleanly to each zone on supported browsers.

---

## Tips

- Use **objectFit: contain** for artwork/logos, **cover** for photography
- Parallax factor 1.2–1.5 gives the most dramatic depth without motion sickness
- Keep text blocks concise — each zone is one viewport height
- Set a dark section background so text remains readable across all zone images
`;

const FLEXIBLE_ELEMENTS = `
# Flexible Sections — Element Types

The block panel on the left contains **16 element types**. **Card, Banner, and Stats** now use the same free-positioning sub-element system as Text Block — all content is draggable, dblclick editable, and the block auto-resizes in all directions.

**Layout Presets** — When creating a new Flexible section, a gallery of 7 pre-built layouts opens automatically. Choose a preset to start with a complete grid + block configuration, or click "Start Blank" to build from an empty grid. You can also apply a preset to an existing section via the Layouts tab in the Designer sidebar (replaces current content).

### Layout presets — how the arrangements differ

Under **Preset Layout**, these named column arrangements auto-place the drop zones. The differences are structural, not cosmetic:

<div class="fig render"><span class="tag">Render preview</span><div class="fig-body"><div class="thumbs"><div class="thumb"><svg viewBox="0 0 100 40"><rect x="4" y="4" width="92" height="32" rx="3" fill="#e7f0ff" stroke="#bcd4ff"/></svg><div class="tn"><b>Full Width</b>1 column</div></div><div class="thumb"><svg viewBox="0 0 100 40"><rect x="4" y="4" width="44" height="32" rx="3" fill="#e7f0ff" stroke="#bcd4ff"/><rect x="52" y="4" width="44" height="32" rx="3" fill="#e7f0ff" stroke="#bcd4ff"/></svg><div class="tn"><b>Two Column</b>50 / 50</div></div><div class="thumb"><svg viewBox="0 0 100 40"><rect x="4" y="4" width="28" height="32" rx="3" fill="#e7f0ff" stroke="#bcd4ff"/><rect x="36" y="4" width="28" height="32" rx="3" fill="#e7f0ff" stroke="#bcd4ff"/><rect x="68" y="4" width="28" height="32" rx="3" fill="#e7f0ff" stroke="#bcd4ff"/></svg><div class="tn"><b>Three Column</b>33 / 33 / 33</div></div><div class="thumb"><svg viewBox="0 0 100 40"><rect x="4" y="4" width="20" height="32" rx="3" fill="#e7f0ff" stroke="#bcd4ff"/><rect x="27" y="4" width="20" height="32" rx="3" fill="#e7f0ff" stroke="#bcd4ff"/><rect x="50" y="4" width="20" height="32" rx="3" fill="#e7f0ff" stroke="#bcd4ff"/><rect x="73" y="4" width="20" height="32" rx="3" fill="#e7f0ff" stroke="#bcd4ff"/></svg><div class="tn"><b>Four Column</b>25 ×4</div></div><div class="thumb"><svg viewBox="0 0 100 40"><rect x="4" y="4" width="54" height="32" rx="3" fill="#e7f0ff" stroke="#bcd4ff"/><rect x="62" y="4" width="34" height="32" rx="3" fill="#dbe6ff" stroke="#bcd4ff"/></svg><div class="tn"><b>Asymmetric</b>60 / 40</div></div><div class="thumb"><svg viewBox="0 0 100 40"><rect x="4" y="4" width="34" height="32" rx="3" fill="#dbe6ff" stroke="#bcd4ff"/><rect x="42" y="4" width="54" height="32" rx="3" fill="#e7f0ff" stroke="#bcd4ff"/></svg><div class="tn"><b>Asymmetric</b>40 / 60</div></div><div class="thumb"><svg viewBox="0 0 100 40"><rect x="4" y="4" width="22" height="32" rx="3" fill="#dbe6ff" stroke="#bcd4ff"/><rect x="30" y="4" width="66" height="32" rx="3" fill="#e7f0ff" stroke="#bcd4ff"/></svg><div class="tn"><b>Sidebar + Main</b>25 / 75</div></div><div class="thumb"><svg viewBox="0 0 100 40"><rect x="4" y="4" width="66" height="32" rx="3" fill="#e7f0ff" stroke="#bcd4ff"/><rect x="74" y="4" width="22" height="32" rx="3" fill="#dbe6ff" stroke="#bcd4ff"/></svg><div class="tn"><b>Main + Sidebar</b>75 / 25</div></div><div class="thumb"><svg viewBox="0 0 100 40"><rect x="4" y="4" width="92" height="14" rx="3" fill="#dbe6ff" stroke="#bcd4ff"/><rect x="4" y="22" width="44" height="14" rx="3" fill="#e7f0ff" stroke="#bcd4ff"/><rect x="52" y="22" width="44" height="14" rx="3" fill="#e7f0ff" stroke="#bcd4ff"/></svg><div class="tn"><b>Hero + 2 Col</b>banner over pair</div></div><div class="thumb"><svg viewBox="0 0 100 40"><rect x="4" y="4" width="92" height="14" rx="3" fill="#dbe6ff" stroke="#bcd4ff"/><rect x="4" y="22" width="92" height="14" rx="3" fill="#e7f0ff" stroke="#bcd4ff"/></svg><div class="tn"><b>Banner + Content</b>stacked rows</div></div><div class="thumb"><svg viewBox="0 0 100 40"><rect x="4" y="4" width="44" height="32" rx="3" fill="#eef2ff" stroke="#bcd4ff"/><rect x="52" y="4" width="44" height="32" rx="3" fill="#eef2ff" stroke="#bcd4ff"/></svg><div class="tn"><b>Two Column Text</b>50/50, wide gap</div></div><div class="thumb"><svg viewBox="0 0 100 40"><rect x="4" y="4" width="40" height="20" rx="2" fill="#e7f0ff" stroke="#bcd4ff"/><rect x="48" y="4" width="24" height="20" rx="2" fill="#dbe6ff" stroke="#bcd4ff"/><rect x="76" y="4" width="20" height="32" rx="2" fill="#e7f0ff" stroke="#bcd4ff"/><rect x="4" y="28" width="68" height="8" rx="2" fill="#dbe6ff" stroke="#bcd4ff"/></svg><div class="tn"><b>Mosaic / Bento</b>12-col, per-block size</div></div></div></div><div class="fig-cap"><b>Preset Layout arrangements</b> (from \`PRESET_DEFS\`) plus the Mosaic engine. Grid Layout (not shown) is the same idea with free rows×cols sliders; Mosaic is a 12-column bento with per-block size presets (e.g. Large 6×2, Wide 8×1, Small 4×1).</div></div>

### Multi-select, alignment guides & snapping

<div class="fig-grid2"><div class="fig diagram" style="margin:0"><span class="tag">Diagram</span><div class="fig-body"><svg viewBox="0 0 300 170" style="max-width:280px"><rect x="10" y="10" width="280" height="150" rx="8" fill="#fff" stroke="#e4e8ef"/><rect x="40" y="40" width="150" height="90" fill="#0d6efd" fill-opacity=".08" stroke="#0d6efd" stroke-dasharray="4 3"/><rect x="55" y="55" width="50" height="34" rx="4" fill="#e7f0ff" stroke="#0d6efd"/><rect x="120" y="55" width="50" height="34" rx="4" fill="#e7f0ff" stroke="#0d6efd"/><rect x="55" y="96" width="50" height="26" rx="4" fill="#e7f0ff" stroke="#0d6efd"/><text x="200" y="60" fill="#5b6472" font-size="10">marquee-drag</text><text x="200" y="74" fill="#5b6472" font-size="10">selects many</text><text x="200" y="96" fill="#5b6472" font-size="10">shift-click</text><text x="200" y="110" fill="#5b6472" font-size="10">adds/removes</text><text x="200" y="132" fill="#8a5a00" font-size="10">drag one →</text><text x="200" y="146" fill="#8a5a00" font-size="10">group moves</text></svg></div><div class="fig-cap"><b>Multi-select</b> — marquee-drag on empty canvas or shift-click individual blocks, then group-move the whole selection together.</div></div><div class="fig diagram" style="margin:0"><span class="tag">Diagram</span><div class="fig-body"><svg viewBox="0 0 300 170" style="max-width:280px"><rect x="10" y="10" width="280" height="150" rx="8" fill="#fff" stroke="#e4e8ef"/><rect x="40" y="30" width="70" height="46" rx="5" fill="#f6f8fb" stroke="#dee2e6"/><rect x="40" y="96" width="70" height="40" rx="5" fill="#e7f0ff" stroke="#0d6efd"/><line x1="40" y1="18" x2="40" y2="150" stroke="#0d6efd" stroke-dasharray="3 3"/><line x1="110" y1="18" x2="110" y2="150" stroke="#0d6efd" stroke-dasharray="3 3"/><text x="150" y="60" fill="#5b6472" font-size="10">edges align →</text><text x="150" y="74" fill="#5b6472" font-size="10">guide appears</text><text x="150" y="104" fill="#8a5a00" font-size="10">block snaps</text><text x="150" y="118" fill="#8a5a00" font-size="10">to the guide</text></svg></div><div class="fig-cap"><b>Alignment guides + snapping</b> — dragging a block shows one stable guide per axis when edges/centres line up, and snaps to it. Pixel-grid snap is a separate **S** toggle.</div></div></div>

### Outlined text, view modes & the canvas background toggle

<div class="fig-grid2"><div class="fig control" style="margin:0"><span class="tag">Control mockup</span><div class="fig-body"><div class="mock-panel" style="max-width:280px"><div class="sw-row"><span class="toggle"></span><span class="lbl" style="margin:0">Outline</span></div><label class="lbl">Outline Width</label><div class="slider"><div class="fill" style="width:20%"></div><div class="knob" style="left:20%"></div></div><div class="hint" style="margin-top:-6px;margin-bottom:10px">1px · range 0.5–8px</div><label class="lbl">Outline Colour</label><span class="swatch" style="background:#000"></span><div style="text-align:center;margin-top:12px;font-size:34px;font-weight:800;color:transparent;-webkit-text-stroke:1.5px #1c2333">Aa</div></div></div><div class="fig-cap"><b>Outlined text</b> — on a text sub-element, toggle Outline for a hollow/stroked look with adjustable width &amp; colour.</div></div><div class="fig control" style="margin:0"><span class="tag">Control mockup</span><div class="fig-body"><div class="mock-panel" style="max-width:280px"><label class="lbl">Device preview</label><div class="seg" style="margin-bottom:12px"><button class="on">🖥 Desktop</button><button>▭ Tablet</button><button>📱 Mobile</button></div><div class="hint" style="margin-bottom:14px">Positions are saved <b>per device</b> — drag blocks in each mode to set responsive layouts. Reset clears device overrides.</div><div class="sw-row"><span class="toggle"></span><span class="lbl" style="margin:0">🖼 Show section background on canvas</span></div><div class="hint">View-only — previews the section's real background/image/gradient behind your blocks without changing saved data.</div></div></div><div class="fig-cap"><b>View modes &amp; canvas bg</b> — Desktop/Tablet/Mobile (1200/768/375px) with per-device positions, plus a toggle to preview the section's configured background on the canvas.</div></div></div>

**Quick reference — recently added block types:**

- **contact-form** — A contact form block that submits to the site's contact email via \`/api/contact\`. Configure which fields are visible (name, email, phone, message, subject), the submit button label, and the success message shown after submission. Styled to work on both light and dark backgrounds.
- **how-steps** — A numbered process step card. Displays a large step number (e.g. "01") in a coloured circle, a bold title, and a description. Includes a dashed connector line extending to the right — set \`isLast: true\` on the final step to hide the connector. Use 3–4 of these in a row grid for a "How It Works" section.
- **pricing-tabs** — A tabbed pricing table. Define one or more **tabs** (e.g. Wireless / Fibre / Voice); each tab holds a grid of plan cards (\`name\`, \`spec\`, \`price\`, \`period\`, \`features[]\`, optional \`flag\`, \`popular\`, \`desc\`). A tab can instead use **groups** (titled sub-sections, e.g. two fibre networks), an optional **note** panel, and a **rates** row (label/value pairs). The "Most popular" card is highlighted; prices use the display font; tabs switch client-side. Drop one block, span the full width.
- **steps (service-row variant)** — The numbered \`steps\` block gains a richer layout automatically when a step includes a **tag** and/or **chips**: a ghost outline number, large heading, a red eyebrow tag with a tick line, the description, and a row of feature chip pills — with a red hover beam. Plain steps (number + heading + subtext only) render as before. Ideal for a "What we do" services list.
- **card (numbered)** — Any card can show a large **ghost outline number** by setting \`cardNumber\` (e.g. "01"); it fills red on hover. Cards also accept a **chips** array to render a row of pill tags (e.g. a list of towns or features). Non-image text cards are now vertically centred.
- **card content fields** — A card's **Eyebrow / Heading / Subheading / Body / Card Number / Chips** are editable directly in the Designer's card properties panel (chips are entered comma-separated). These render via the mosaic/card renderer and show in the live Preview tab.
- **legacy sections open automatically** — Sections authored before the Designer (stored as legacy elements + a mosaic layout) now load straight into the canvas instead of showing blank. Edit them and **Save & Close** to convert the section to standard Designer data — the public page renders identically before and after.
- **marquee** — An animated horizontal strip (the moving "stat strip" / town ticker). Drag the **Marquee** block in; in Properties choose **Style** (Town = uppercase labels, Stat = value + label), **Direction** (left ← / right →), **Speed** (seconds per loop — lower is faster), **Separator** (✦ / • / | / none), **Pause on hover**, and the **Items** (one per line; for Stat style use \`value | label\`). Honours \`prefers-reduced-motion\`.
- **outlined text** — In any heading you can make part of the text **hollow/outlined** (transparent fill + stroke in the current colour) by wrapping it in double underscores: \`Reliably serviced. __No excuses.__\`. This sits alongside the red-accent marker \`**word**\`. Both work in section headings and card headings.

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

### Image Carousel / Multi-image Slider

Toggle **Carousel mode** in the Properties panel to turn any Image block into a multi-image slider.

| Property | Description |
|----------|-------------|
| **Carousel mode** | Toggle on/off |
| **Columns** | 1–4 images side-by-side per slide |
| **Display mode** | Static (all columns always visible) or Slideshow (auto-advances) |
| **Transition** | Slide or Fade |
| **Interval** | Auto-advance interval in seconds (Slideshow only) |
| **Images** | Add/remove/reorder images; each has URL + alt text |

When Columns > 1, all columns scroll together as one group. In Slideshow mode with 1 column, the next image fades/slides in automatically.

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

## 11. Coverage Map

Embeds a live interactive delivery coverage map directly inside any Flexible section. Powered by **Leaflet.js + OpenStreetMap** — no API key required.

| Property | Description |
|----------|-------------|
| **Map Slug** | The slug of the coverage map to display (created in Admin → Features → Coverage Maps) |
| **Height** | Map height in pixels (default 480 px) |

**What it shows:**
- Coloured polygons for each delivery region (colours set in admin)
- Floating text labels positioned anywhere on the map
- **Search bar** — visitor types a town/city name to jump to that area
- **Auto-geolocation** — browser detects visitor location and zooms to their region, highlighting the polygon they fall inside

> **Requires** the \`coverage-map\` feature to be enabled: Admin → Settings → Client Features → Coverage Map → toggle ON.

---

## 12. Projects Gallery

Displays a responsive card grid of completed projects with a **lightbox viewer**. Data is pulled from Admin → Features → Projects.

| Property | Description |
|----------|-------------|
| **Heading** | Optional heading above the grid (e.g. "Our Projects") |
| **Subtext** | Optional supporting text below the heading |
| **Text Color** | Hex color for heading and subtext |
| **Columns** | Number of columns in the grid (default 3) |

**What visitors see:**
- Card grid with cover image, title, location, and description
- Click any card → full-screen lightbox with left/right navigation
- Gallery images shown as thumbnails below the main lightbox image
- Completed date shown where available

> **Admin:** Manage project entries at Admin → Features → Projects. Each project supports a cover image, gallery images (multiple URLs), description, location, and completed date.

---

## 13. Volt ⚡

Embeds a live **Volt Studio** vector design inside the section. The Volt element renders as an interactive, animated SVG with optional slot content.

### Selecting a Volt design

Drag a **Volt** block from the library panel (⚡ Volt tab) onto the canvas. Click **Change** in the Properties panel to open Volt Studio and select or edit a design.

### Content Slots

Slots are placeholder regions in the Volt design that can be filled with live content per-instance:

| Slot | Description |
|------|-------------|
| **Title** | Override the design's title slot |
| **Body** | Override body text |
| **Icon** | Bootstrap icon class or emoji |
| **Image** | Upload an image to fill the image slot |
| **Action label** | Button text |

### Layer Colors (per-instance overrides)

The **Layer Colors** section in the Properties panel lists every vector layer in the Volt design. You can override each layer's fill color and show/hide it for this specific instance — without modifying the master Volt design.

| Control | Description |
|---------|-------------|
| **Color picker** | Override the fill color for this instance |
| **Checkbox** | Show or hide the layer for this instance |
| **● dot indicator** | Purple dot on the color picker = override active |
| **Reset** | Remove all overrides, restore master design colors |

> Changes are per-instance only — the master Volt design in Volt Studio is never modified.

---

## 14. Editorial 📰

Magazine-style text layout powered by **[@chenglou/pretext](https://github.com/chenglou/pretext)**. Text flows around obstacle images using precise alpha hull tracing — the actual shape of the image, not just its bounding box.

### How it works

- Text is measured using the browser's own font engine (via Canvas) — no DOM reflow
- Each line is laid out individually, routing around any obstacles
- Text is real DOM content: **fully selectable and copyable**
- Layout re-runs instantly on resize (~0.09ms hot path)

### Adding text

Type or paste your body copy in the **Body Text** textarea in the Properties panel. Choose a **Font Family** and adjust **Font Size** and **Line Height** to match your design.

### Obstacles

Obstacles are images that text flows around. Text routes around the actual shape of the image (alpha channel tracing), not just its rectangular bounds.

| Property | Description |
|----------|-------------|
| **Image** | Upload an image — PNG with transparency works best |
| **Alpha Hull** | When checked, traces the image's actual alpha contour. When unchecked, uses the bounding rectangle |
| **X / Y** | Fractional position within the block (0–100%) — drag in canvas or use sliders |
| **W / H** | Fractional width/height relative to block size |
| **Padding** | Extra space between the image shape and the nearest text line (px) |

### Dragging obstacles

In the Designer canvas, obstacle images show a **dashed blue outline** and a move cursor. Drag them to reposition — text reflows instantly around the new position.

### Supported fonts

Any **Google Font** works. The font is loaded automatically before layout runs. Popular editorial choices:
- **Merriweather** (default) — classic serif for long-form reading
- **Lora**, **EB Garamond**, **Libre Baskerville** — traditional editorial serifs
- **Inter**, **Open Sans** — clean sans-serif for modern layouts

> **Tip:** Use a PNG image with a transparent background and enable Alpha Hull for the most dramatic text-wrapping effect.

---

## 15. How Steps

Numbered step card with a large accent-colored step number, title, and description. Connect multiple steps horizontally using the **connector line** that renders on the right edge of all but the last step.

| Property | Description |
|----------|-------------|
| **Step Number** | Display label — typically \`"01"\`, \`"02"\`, etc. |
| **Title** | Bold step name |
| **Description** | Supporting paragraph |
| **Accent Color** | Color for the step number and connector arrow |
| **Is Last Step** | Toggle off the right-edge connector arrow for the final step |

**Typical use:** Place 3–4 How Steps blocks in a single grid row with the *How It Works* preset (creates this layout automatically).

---

## 16. Contact Form

An embedded contact form that submits to the site's \`/api/contact\` endpoint. Configurable fields, labels, and success message — no separate page needed.

| Property | Description |
|----------|-------------|
| **Form Title** | Optional heading displayed above the fields |
| **Fields** | Toggle name / email / phone / subject / message on or off |
| **Submit Label** | Button text (default: "Send Message") |
| **Success Message** | Text shown after submission |
| **Email To** | Override the recipient address for this form |

On submission the form shows a success checkmark or an inline error message. The same SMTP settings used for CTA contact forms apply here.

**Typical use:** Pair with a Text Block in the *Contact Split* preset — contact details on the left, Contact Form on the right.

---

## Preset Layouts

When you **create a new Flexible Section**, the Preset Gallery opens automatically — pick one of 7 curated starter layouts or choose **Start Blank** for an empty canvas.

| Preset | Description |
|--------|-------------|
| **About Grid** | Tall photo left, story text + 4 stats right |
| **Services Grid** | Centred heading + 3 service cards |
| **How It Works** | Heading + 4 numbered How Steps in a row |
| **Contact Split** | Contact details left, Contact Form right |
| **Stats Banner** | 4 bold stats in a full-width band |
| **Features Alternating** | Heading + alternating text/image rows |
| **Team Grid** | Heading + 4 team member cards |

You can also apply any preset from the **Layouts tab** in the left panel of the Flexible Designer — selecting a preset replaces the current layout (with a confirmation prompt).

---

## Accent words in headings

Highlight one or more words in any **heading** with the theme accent colour, straight from the text field — wrap them in double asterisks:

\`\`\`
Your region. **Connected.**
\`\`\`

→ "Connected." renders in the accent colour (\`--theme-red\`). Works in the section header heading, heading elements, hero headings and block titles. Headings without \`**\` are unchanged. The accent colour is theme-aware, so it stays correct in both light and dark mode.

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

---

## Steps Block

Numbered process steps with large accent counters.

| Field | Description |
|-------|-------------|
| **steps** | Array of \`{ number, heading, subtext }\` |
| **numberStyle** | \`"large-accent"\` — 64px green tabular number |
| **dividers** | Show horizontal rules between items |
| **lastDivider** | Include rule after the final item |
| **numberWidth** | Width reserved for the number column (px) |

Use inside a mosaic cell (\`colSpan: 8\` or \`colSpan: 12\`) for full-width numbered lists.

---

## Photo Strip Block

Horizontal image strip — ideal for portfolio or before/after showcases.

| Field | Description |
|-------|-------------|
| **images** | Array of \`{ src, alt }\` |
| **height** | Strip height (e.g. \`"380px"\`) |
| **gap** | Space between images (px) |
| **columns** | Number of equal columns (default: images.length) |
| **hoverBrightness** | Brightness on hover (e.g. \`1.1\`) |

---

## Mosaic Grid Layout Mode

Add \`layoutMode: "mosaic"\` to any FLEXIBLE section config to switch from the default column grid to a 12-column CSS mosaic.

| Field | Default | Description |
|-------|---------|-------------|
| **layoutMode** | \`"columns"\` | \`"mosaic"\` enables the 12-column grid |
| **gridAutoRows** | 180px | Height of each implicit grid row |
| **gap** | 14px | Gap between cells |

Each element inside a mosaic section gets:

| Field | Range | Description |
|-------|-------|-------------|
| **colSpan** | 1–12 | How many columns the cell spans |
| **rowSpan** | 1–6 | How many rows the cell spans |
| **mosaicPreset** | see below | Named size shortcut |

### Named Mosaic Presets

| Preset | Columns | Rows | Use case |
|--------|---------|------|----------|
| \`s-lg\` | 6 | 2 | Large feature card |
| \`s-md\` | 4 | 2 | Medium card |
| \`s-sm\` | 4 | 1 | Compact card |
| \`s-tall\` | 4 | 2 | Tall portrait card |
| \`s-wide\` | 8 | 1 | Wide banner card |
| \`s-mid\` | 6 | 1 | Half-width banner |

Mobile: all cells collapse to full-width single column.

---

## Section Header Variants

| Field | Default | Description |
|-------|---------|-------------|
| **sectionHeaderVariant** | \`"centered"\` | \`"split"\` — heading left, lead right |
| **sectionEyebrow** | — | Small uppercase label above heading |
| **sectionLead** | — | Lead paragraph (shown right in split variant) |

**Split variant** creates a 2-column layout: ~60% heading on the left, ~40% lead text on the right, baseline-aligned. Stacks on mobile.

---

## Section Footer Row

Add a footer row at the bottom of any FLEXIBLE section:

\`\`\`json
"sectionFooter": {
  "leftText": "A portfolio shaped by [em]184[/em] projects",
  "rightButton": { "label": "All Projects →", "href": "/projects" }
}
\`\`\`

- \`leftText\` supports \`[em]value[/em]\` syntax for inline emphasis spans
- \`rightButton\` renders as a ghost link aligned to the right

---

## Animated Counter Stats (Enhanced)

The \`stats\` block type now supports scroll-triggered counting animation:

| Field | Default | Description |
|-------|---------|-------------|
| **statsAnimateOnScroll** | false | Counts up from 0 when scrolled into view |
| **statsCountDuration** | 2000 | Animation duration in ms |
| **statsStyleVariant** | \`"stacked"\` | \`"counter"\` — large number + label stacked |
| **prefix** | — | Text before number (e.g. \`"$"\`) |
| **suffix** | — | Text after number (e.g. \`"+"\`, \`"k"\`) |
| **displaySuffix** | — | Override suffix shown during animation |

The animation uses cubic ease-out via \`requestAnimationFrame\`.

---

## Theme-aware colours (light / dark)

Every colour picker in the Flexible Designer has a **Theme** dropdown alongside the hex picker. Choosing a theme token stores a CSS variable (e.g. \`var(--theme-surface)\`) instead of a fixed hex, so the colour **flips automatically** when the visitor toggles light/dark:

| Token | Typical use |
|-------|-------------|
| **BG / Surface** | Section or card backgrounds |
| **Text / Muted** | Body and secondary text |
| **Navy / Accent** | Strong blocks, CTAs, highlights |
| **Card BG / Card Border** | Card surfaces and outlines |

The **section background** also offers a "Theme-aware" swatch row (Styling tab). When a section background is a theme token, its default text colour follows \`--theme-text\` automatically. Hex colours are unchanged and stay fixed in both themes. The site-wide default (light or dark) is set in **Settings → Site Configuration → Default Theme**.

---

## Decorative watermark (ghost number/word)

In the **Styling tab**, the **Decorative Watermark** field places an oversized, faded number or word (e.g. \`01\`) behind the section content, top-right — an editorial accent. Leave blank for none.

---

## Diagonal slab

The **Diagonal slab** switch (Styling tab) clips the whole section at an angle along the top and bottom edges for a dynamic, magazine-style cut. Keep section padding generous so content isn't clipped. Works with theme-aware backgrounds.

---
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

const FLEXIBLE_TOOLBAR = `
# Flexible Designer — Toolbar & Canvas

The **Top Action Bar** and the **Live Preview Canvas** are the two chrome surfaces that frame every design session. The action bar (dark, pinned to the very top) sets global mode and holds Save/Done; the canvas toolbar (over the artboard) holds rulers, undo, device modes, zoom and preview.

---

## Top Action Bar

Left side = identity + mode badges. Right side = position-mode toggle, guide/snap toggles, utilities, and the primary **Save / Done** actions. **Done** is hidden until the designer is embedded in the wrapper modal (it appears only after a \`FLEXIBLE_DESIGNER_INIT\` message arrives from the parent).

<div class="fig map">
  <div class="fig-head"><span class="tag">Interface map</span><span class="ttl">Top action bar</span></div>
  <div class="fig-body"><div class="mbar">
    <span class="brand">Layout <span>Designer</span></span>
    <span class="cal">1</span>
    <span class="pill">Single Section</span>
    <span class="cal">2</span>
    <span class="pill" style="background:#3a2e12;color:#ffd98a;border-color:#7a5a1a">&#9998; Editing: Card &times;</span>
    <span class="cal">3</span>
    <span class="spacer"></span>
    <span class="cal">4</span><span class="pill free">&#10204; FREE</span>
    <span class="cal">5</span><span class="mbtn">&#9638; grid</span>
    <span class="cal">6</span><span class="mbtn">SNAP</span>
    <span class="cal">7</span><span class="mbtn">&lt;/&gt;</span>
    <span class="cal">8</span><span class="mbtn dgr">&#128465;</span>
    <span class="cal">9</span><span class="mbtn pri">&#128190; Save</span>
    <span class="cal">10</span><span class="mbtn ok">&#10003; Done</span>
  </div></div>
  <ul class="callout-list">
    <li><span class="cal">1</span><span><b>Brand / title</b> — static "Layout Designer" identity.</span></li>
    <li><span class="cal">2</span><span><b>Mode badge</b> — "Single Section" or "Multi Section", reflects Content Mode.</span></li>
    <li><span class="cal">3</span><span><b>Editing indicator</b> — shows only inside a block's Edit-Content mode; &times; exits.</span></li>
    <li><span class="cal">4</span><span><b>Position-mode toggle</b> — FREE &harr; GRID.</span></li>
    <li><span class="cal">5</span><span><b>Guides toggle</b> — show/hide grid guide overlay.</span></li>
    <li><span class="cal">6</span><span><b>SNAP</b> — pixel-grid snap on/off (free mode).</span></li>
    <li><span class="cal">7</span><span><b>Code &lt;/&gt;</b> — opens the JSON output panel.</span></li>
    <li><span class="cal">8</span><span><b>Clear (trash)</b> — clears the entire canvas (confirm modal).</span></li>
    <li><span class="cal">9</span><span><b>Save</b> — persist draft + postMessage to parent.</span></li>
    <li><span class="cal">10</span><span><b>Done</b> — save + close (embedded only).</span></li>
  </ul>
  <div class="fig-cap">All controls live in <code>#toolbar</code>. The editing indicator and Done button are display-toggled at runtime.</div>
</div>

| Control | Function | Options / default | Use case |
|---------|----------|-------------------|----------|
| **Position-mode badge** (⟜ FREE) | \`togglePositionMode()\` — switches free absolute positioning ↔ grid-cell snapping. Switching to Grid snaps every block to the nearest cell (colSpan/rowSpan reset to 1). | FREE / GRID · **default FREE** | FREE for pixel-exact art-boards; GRID for tidy row/column structures |
| **Guides** (⊞) | \`toggleGuides()\` — show/hide the grid guide overlay. | on / off · **default ON** | Visual alignment aid while placing blocks |
| **SNAP** | \`toggleSnapGrid()\` — pixel-grid snap while dragging in free mode (snaps to \`snapSize\`). Also the **S** key. | on / off, grid = 10px · **default OFF** | Keep free-mode drags on a tidy grid |
| **Code** (&lt;/&gt;) | \`toggleJson()\` — opens the "Layout Configuration Output" panel (read-only JSON + Copy). | panel open/close | Inspect / copy the exact saved schema |
| **Clear** (🗑) | \`clearAll()\` — removes all blocks after an in-app confirm. Undoable (Ctrl+Z, up to 10 steps). | — | Start a section over |
| **Save** | \`saveLayout()\` — writes draft to \`localStorage\` and posts \`FLEXIBLE_DESIGNER_SAVE\` to the parent. Button flashes "Saved!". | — | Persist without leaving |
| **Done** | \`doneAndClose()\` — saves and posts \`FLEXIBLE_DESIGNER_DONE\`; parent closes the iframe. Hidden until embedded. | — | Finish and return to the wrapper |

---

## Live Preview Canvas + per-device toolbar

The centre column: a header/toolbar over the artboard. The canvas is a fixed **1440px** design width (scaled to fit). Blocks are dropped, dragged, resized and multi-selected here.

<div class="fig map">
  <div class="fig-head"><span class="tag">Interface map</span><span class="ttl">Canvas toolbar</span></div>
  <div class="fig-body"><div class="mbar light">
    <span class="brand" style="color:#334">&#128421; Live Preview Canvas</span>
    <span style="color:#8a93a3;font-size:11px">1440 &times; 900</span>
    <span class="spacer"></span>
    <span class="cal b">1</span><span class="mbtn lt">&#8942; rulers</span>
    <span class="cal b">2</span><span class="mbtn lt" style="color:#a33">&#10006; guides</span>
    <span class="cal b">3</span><span class="mbtn lt">&#8634; undo</span>
    <span class="cal b">4</span><span class="mbtn lt">&#128421;</span><span class="mbtn lt">&#128427;</span><span class="mbtn lt">&#128241;</span>
    <span class="cal b">5</span><span class="mbtn lt">&#8722;</span><span style="font-size:11px;color:#345">100%</span><span class="mbtn lt">&#43;</span><span class="mbtn lt">1:1</span>
    <span class="cal b">6</span><span class="mbtn lt">&#128444;</span>
    <span class="cal b">7</span><span class="mbtn lt">&#128065;</span>
  </div></div>
  <ul class="callout-list">
    <li><span class="cal b">1</span><span><b>Rulers</b> — toggle pixel rulers; drag from a ruler to create a guide line.</span></li>
    <li><span class="cal b">2</span><span><b>Clear Guides</b> — remove all ruler guide lines.</span></li>
    <li><span class="cal b">3</span><span><b>Undo</b> — Ctrl+Z; shows remaining step count (up to 10).</span></li>
    <li><span class="cal b">4</span><span><b>Device modes</b> — Desktop / Tablet / Mobile.</span></li>
    <li><span class="cal b">5</span><span><b>Zoom</b> — − / label / + / 1:1 reset.</span></li>
    <li><span class="cal b">6</span><span><b>Section BG toggle</b> — show/hide the section's real background (view-only).</span></li>
    <li><span class="cal b">7</span><span><b>Preview eye</b> — open a live preview of the section in a tab.</span></li>
  </ul>
  <div class="fig-cap">Canvas <code>#canvas</code> also hosts: section-bg layer, grid overlay, guide overlay, dimension display, empty hint, and the floating toolbars. A deliberate divider sits between device modes and zoom to prevent mis-clicks.</div>
</div>

| Control | Function | Options / default | Use case |
|---------|----------|-------------------|----------|
| **Rulers** (⋮) | \`toggleRulers()\` — pixel rulers on canvas edges; draggable to spawn guides. | on / off · **hidden** | Precise measurement + custom guides |
| **Clear Guides** | \`clearGuidelines()\` — deletes all ruler guide lines. | — | Reset guide clutter |
| **Undo** | \`undo()\` — step back through history; count shown; disabled when empty. | up to 10 steps · **Ctrl+Z** | Revert any edit |
| **Desktop** | \`setDevicePreview('desktop')\` — full 1440px design width. | active by default | Design the master layout |
| **Tablet** | 768px. Grid/mosaic = editable per-tablet positions; FREE = scaled-stage preview (read-only). | 768px | Check / adjust tablet |
| **Mobile** | 375px. Same free-vs-grid behaviour as tablet. Resize handles hidden in mobile. | 375px | Check / adjust mobile |
| **Reset (device)** | \`resetDevicePositions()\` — clears tablet/mobile overrides. Appears only in grid/mosaic tablet/mobile mode. | — | Discard responsive overrides |
| **Zoom** − / + / 1:1 | \`adjustUserZoom(±0.1)\` / \`resetUserZoom()\`. Also Ctrl+scroll and Ctrl +/−/0. | 0.25–2.0 · **100%** | Zoom into detail work |
| **Section BG toggle** (🖼) | \`toggleSectionBg()\` — overlays the section's configured background on the canvas. View-only, never saved. | on / off · **ON** | See contrast against the real BG |
| **Preview eye** | \`previewSection()\` — saves + posts \`FLEXIBLE_DESIGNER_PREVIEW\` so the parent shows a live render. | — | See the true front-end output |

---

## FREE vs GRID behaviour

<div class="two">
  <div class="fig diagram" style="margin:0">
    <div class="fig-head"><span class="tag">Diagram</span><span class="ttl">FREE mode</span></div>
    <div class="fig-body" style="font-size:12.5px;color:var(--muted);align-items:flex-start;text-align:left">Absolute X/Y/W/H positioning. Blocks placed anywhere; Properties shows X/Y/W/H sliders + Full-Width / Full-Height / Center. Optional pixel <b>SNAP</b> (10px, key <b>S</b>). Tablet/mobile are scaled-stage previews (the desktop art-board shrunk), so per-block responsive controls are hidden.</div>
  </div>
  <div class="fig diagram" style="margin:0">
    <div class="fig-head"><span class="tag">Diagram</span><span class="ttl">GRID mode</span></div>
    <div class="fig-body" style="font-size:12.5px;color:var(--muted);align-items:flex-start;text-align:left">Blocks snap to cells. Properties shows Row / Column / Col Span / Row Span / V-Align + Full-Width / Full-Height / Reset 1×1. Dropping onto an occupied cell raises the <b>drop-conflict popup</b> (Replace / Stack / Cancel). Tablet/mobile allow real per-device positions + Reset.</div>
  </div>
</div>

## Canvas interactions

| Interaction | Behaviour |
|-------------|-----------|
| **Drag from library** | Drop a block/volt onto the canvas; sub-elements drop into a block being edited |
| **Resize handles** | 8 handles on a selected/hovered block: 4 edges (N/S/E/W) + 4 corners. Hidden in mobile |
| **Drag to move** | Blocks and sub-elements drag freely; arrow keys nudge 1px (10px with Shift) |
| **Alignment guides** | Figma-style smart guides + snapping appear while dragging a child / multi-selection |
| **Marquee select** | Drag on empty canvas to rubber-band select multiple sub-elements |
| **Shift-click** | Add / remove a sub-element from the multi-selection (additive) |
| **Group move** | A multi-selection drags together by one delta |
| **Drop conflict (grid)** | Popup: **Replace** / **Stack** / **Cancel** when a target cell is occupied |
| **Click empty canvas** | Deselects everything and exits edit mode |

> Full keyboard shortcuts are on the **Layers, Menus & Shortcuts** page.
`;

const FLEXIBLE_CONFIG = `
# Flexible Designer — Section Configuration

The upper panel of the left sidebar (\`#section-config-header\`, collapsible). It sets whole-section behaviour: content height, the layout engine, its numeric config, and the optional section header & footer bands. Below it sits the Block Library.

<div class="fig map">
  <div class="fig-head"><span class="tag">Interface map</span><span class="ttl">Section Configuration panel</span></div>
  <div class="fig-body two">
    <div class="panelmock">
      <div class="pm-head">&#9636; Section Configuration <span style="margin-left:auto">&#9662;</span></div>
      <div class="pm-body">
        <div class="cfgbox"><div class="lbl"><span class="cal">1</span> Content Mode</div>
          <div class="field"><select class="fake-select"><option>Single Section (100vh)</option></select></div>
          <div class="field" style="opacity:.6"><label>Height</label><div class="fake-range"></div><span class="fake-val">3&times;</span></div>
        </div>
        <div class="cfgbox"><div class="lbl"><span class="cal">2</span> Layout Type</div>
          <div class="field"><select class="fake-select"><option>Grid Layout</option></select></div>
        </div>
        <div class="cfgbox"><div class="lbl"><span class="cal">3</span> Grid Configuration</div>
          <div class="field"><label>Rows</label><div class="fake-range"></div><span class="fake-val">2</span></div>
          <div class="field"><label>Cols</label><div class="fake-range"></div><span class="fake-val">3</span></div>
          <div class="field"><label>Gap</label><div class="fake-range"></div><span class="fake-val">16px</span></div>
          <div class="field"><label>Edge Pad</label><div class="fake-range"></div><span class="fake-val">0px</span></div>
        </div>
      </div>
    </div>
    <div class="panelmock">
      <div class="pm-head">&#9636; Section Configuration (cont.)</div>
      <div class="pm-body">
        <div class="cfgbox"><div class="lbl"><span class="cal">4</span> Section Header</div>
          <div class="field"><label>Eyebrow</label><input class="fake-input" value="OUR SERVICES"></div>
          <div class="field"><label>Heading</label><input class="fake-input" value="Three services."></div>
          <div class="field"><label>Subhead</label><input class="fake-input" placeholder="optional"></div>
          <div class="field"><span class="dchip pri">&#9632; Centered</span><span class="dchip">&#9632;&#9632; Split</span></div>
        </div>
        <div class="cfgbox"><div class="lbl"><span class="cal">5</span> Section Footer</div>
          <div class="field"><label>Enable</label> <span class="pill on" style="color:#fff">switch</span></div>
          <div class="field" style="opacity:.6"><label>Left text</label><input class="fake-input"></div>
          <div class="field" style="opacity:.6"><label>Btn label</label><input class="fake-input"></div>
        </div>
      </div>
    </div>
  </div>
  <ul class="callout-list">
    <li><span class="cal">1</span><span><b>Content Mode</b> — Single (100vh) or Multi (tall, scrollable). Multi reveals the Height slider (2–10 ×100vh).</span></li>
    <li><span class="cal">2</span><span><b>Layout Type</b> — Grid / Preset / Mosaic. Swaps the config box below.</span></li>
    <li><span class="cal">3</span><span><b>Layout config</b> — Grid, Mosaic or Preset controls (only the active one shows).</span></li>
    <li><span class="cal">4</span><span><b>Section Header</b> — eyebrow / heading / subheading + Centered/Split; Split reveals a Lead-text box.</span></li>
    <li><span class="cal">5</span><span><b>Section Footer</b> — toggle a footer band with left text (+ <code>[em]</code> accent) and a button.</span></li>
  </ul>
  <div class="fig-cap">The panel header is a collapse toggle (<code>toggleSectionConfig()</code>). Choosing Mosaic in Layout Type force-resets Content Mode to Single (mosaic can't be multi-section).</div>
</div>

## Content Mode & Layout Type

| Control | Function | Options / default | Use case |
|---------|----------|-------------------|----------|
| **Content Mode** | \`#contentMode\` → \`onModeChange()\`. Single locks to one viewport; Multi grows and reveals Height. | Single (100vh) / Multi · **Single** | Multi for long scroll-stage sections |
| **Height** (multi) | \`#multiLimit\` slider — number of viewport heights the multi section spans. | 2–10 · **3** ×100vh | Tall sections / scroll storytelling |
| **Layout Type** | \`#layoutType\` → \`onLayoutChange()\` — chooses the layout engine and shows its config box. | Grid / Preset / Mosaic · **Grid** | See the three engines below |

### The three Layout Types

| Layout Type | What it does | Its config controls |
|-------------|--------------|---------------------|
| **Grid Layout** | Classic CSS grid — blocks occupy row/col cells and can span. Blocks get Row/Col/Span/V-Align in Properties. | Rows 1–10 (def 2), Cols 1–12 (def 3), Gap 0–50px (def 16), Edge Pad 0–60px (def 0) |
| **Preset Layout** | Pick a canned column skeleton; drag blocks into its zones. Sets the grid shape for you. | 11 preset buttons (below) |
| **Mosaic / Bento** | 12-column auto-flow bento grid; each block picks a size preset. No mobile preview — check mobile in live preview. | Row height 80–500px (def 200), Gap 0–32px (def 10) |

### Preset Layout — all 11 zone skeletons

| Preset | Shape | Preset | Shape |
|--------|-------|--------|-------|
| Full Width | 1 col | Sidebar + Main | 25 / 75 |
| Two Column | 50 / 50 | Main + Sidebar | 75 / 25 |
| Three Column | 33 / 33 / 33 | Hero + 2 Col | full row + 2 |
| Asymmetric | 60 / 40 | Four Column | 25 × 4 |
| Asymmetric | 40 / 60 | Banner + Content | banner + body |
| Two Column Text | text / text | | |

Chosen via \`selectPreset(id,el)\`; the active preset is highlighted. These Preset-Layout **zone skeletons** are distinct from the Block-Library **Layouts** tab, which applies full pre-built content templates.

## Section Header & Footer

| Control | Function | Options / default |
|---------|----------|-------------------|
| **Eyebrow** | \`#sectionEyebrow\` — small label above the heading. | free text |
| **Heading** | \`#sectionHeading\` — multi-line section title (supports line breaks). | free text |
| **Subheading** | \`#sectionSubheading\` — optional small text below heading. | free text (optional) |
| **Header Style** | \`setHeaderVariant()\` — Centered vs Split. Split reveals the **Lead Text** textarea. | Centered / Split · **Centered** |
| **Lead Text** | \`#sectionLead\` — only visible in Split style. | free text |
| **Enable section footer** | \`#sectionFooterEnabled\` switch → \`toggleSectionFooter()\` reveals footer fields. | on / off · **off** |
| **Footer left text** | \`#sectionFooterLeft\` — supports \`[em]accent[/em]\` syntax. | free text |
| **Button label / href** | \`#sectionFooterBtnLabel\` / \`#sectionFooterBtnHref\`. | text / URL or #anchor |
`;

const FLEXIBLE_PROPERTIES = `
# Flexible Designer — Properties Panel

The right panel is **context-sensitive**: an empty prompt with nothing selected; **block-level** props when a block is selected; **sub-element** props when a sub-element is selected. Block props always start with Element Dimensions (read-only px), then Position (mode-dependent), then type-specific Settings, then Content (Edit-Content), Custom CSS and Remove.

<div class="fig map">
  <div class="fig-head"><span class="tag">Interface map</span><span class="ttl">Block properties — common frame</span></div>
  <div class="fig-body">
    <div class="panelmock" style="max-width:320px">
      <div class="pm-head">&#9636; Properties</div>
      <div class="pm-body">
        <div class="cfgbox" style="background:#fdf6e3;border-color:#f0e0bd"><div class="lbl"><span class="cal">1</span> &#128241; Mobile Responsive Behavior</div>
          <div class="field"><span class="dchip">Auto</span><span class="dchip">&#8596; Stretch</span><span class="dchip">&#10006; Hide</span></div>
        </div>
        <div class="cfgbox" style="background:var(--primary-soft);border-color:#b6d4fe"><div class="lbl"><span class="cal">2</span> &#128207; Element Dimensions</div>
          <div class="field"><span style="font-size:15px;color:var(--primary);font-weight:700">360px</span> &times; <span style="font-size:15px;color:var(--primary);font-weight:700">240px</span></div>
        </div>
        <div class="cfgbox"><div class="lbl"><span class="cal">3</span> &#8597; Position &amp; Size <span style="color:#adb5bd;font-weight:400">free mode</span></div>
          <div class="field"><label>X</label><div class="fake-range"></div><input class="fake-input" style="max-width:52px" value="40"></div>
          <div class="field"><label>Y</label><div class="fake-range"></div><input class="fake-input" style="max-width:52px" value="60"></div>
          <div class="field"><label>W</label><div class="fake-range"></div><input class="fake-input" style="max-width:52px" value="360"></div>
          <div class="field"><label>H</label><div class="fake-range"></div><input class="fake-input" style="max-width:52px" value="240"></div>
          <div class="field"><span class="dchip">&#10231; Full Width</span><span class="dchip">&#8597; Full Height</span><span class="dchip">&#8853; Center</span></div>
        </div>
        <div class="cfgbox"><div class="lbl"><span class="cal">4</span> &#9881; [Type] Settings</div><div style="color:#adb5bd;font-size:11px">type-specific rows &rarr;</div></div>
        <div class="cfgbox"><div class="lbl"><span class="cal">5</span> &#128218; Content (n sub-elements)</div><div class="field"><span class="dchip pri">&#9998; Edit Content</span></div></div>
        <div class="cfgbox"><div class="lbl"><span class="cal">6</span> &#128187; Custom CSS Override</div><div style="color:#adb5bd;font-size:11px">textarea</div></div>
        <div class="field"><span class="dchip dgr">&#128465; Remove Block</span></div>
      </div>
    </div>
  </div>
  <ul class="callout-list" style="grid-template-columns:1fr">
    <li><span class="cal">1</span><span><b>Responsive Behavior</b> — only in grid/mosaic tablet/mobile mode: Auto / Stretch / Hide per block.</span></li>
    <li><span class="cal">2</span><span><b>Element Dimensions</b> — read-out of exact px W×H so you can design art to fit.</span></li>
    <li><span class="cal">3</span><span><b>Position &amp; Size</b> — free: X/Y/W/H + Full-W/Full-H/Center. Grid: Row/Col/Spans/V-Align. Mosaic: size-preset picker.</span></li>
    <li><span class="cal">4</span><span><b>Type Settings</b> — the per-type controls (tables below).</span></li>
    <li><span class="cal">5</span><span><b>Content</b> — enter/exit Edit-Content to add sub-elements (non-volt blocks).</span></li>
    <li><span class="cal">6</span><span><b>Custom CSS</b> — raw CSS override on the block; then a red Remove Block.</span></li>
  </ul>
  <div class="fig-cap">Grid-mode Position replaces callout 3 with Row / Column / Col Span / Row Span / V-Align (Top/Mid/Bot) + Full-Width / Full-Height / Reset 1×1. Mosaic replaces it with a Block-Size preset: Large 6×2, Medium 4×2, Small 4×1, Tall 4×2, Wide 8×1, Mid 6×1.</div>
</div>

> These tables are the exhaustive control reference. Prose usage guides for each block live on the **Block Library & Elements** page.

## Type-specific block Settings

### Hero

| Control | Options / range | Default |
|---------|-----------------|---------|
| BG Type | Solid / Gradient / Image / Video | **color** |
| Background / Gradient From-To + Angle | colors; angle 0–360° | **#1e3a5f→#312e81, 135°** |
| BG Image / Video | media picker | — |
| Overlay Opacity / Color | 0–80% ; color | **0% / #000** |
| Text Color, Heading, Heading X/Y | color; text; 0–100% each | **#fff; X50 Y38** |
| Subtext, Subtext X/Y | text; 0–100% | **X50 Y52** |
| Show Button + Button X/Y | checkbox; 0–100% | **on; X50 Y67** |
| Button Text / Color / Text Color / Style / Image | text; colors; Filled/Outline/Ghost; image | **Learn More, filled** |
| Navigation Target (button) | nav dropdown + custom/tel/mailto | — |

### Card

| Control | Options / range | Default |
|---------|-----------------|---------|
| Eyebrow / Heading / Subheading / Body / Card Number / Chips | text; chips = comma list | — |
| Bind to Package | network package dropdown; then \`{{pkg.name\\|price\\|period\\|speed\\|speedDown\\|speedUp\\|features}}\` tokens in fields | **None** |
| Card Style | Shadow / Bordered / Flat / Elevated | **shadow** |
| Height Mode | Fill (stretch to row) / Auto (wrap) | **fill** |
| Background / Glass Effect | color; None / Light glass / Dark glass | **transparent / none** |
| Inner Padding Top / Bottom / L-R / Sub-element Gap | 0–80 / 0–80 / 0–60 / 0–48 px | **16 / 16 / 20 / 12** |

### Text / Text-block

| Control | Options / range | Default |
|---------|-----------------|---------|
| Background / Glass Effect | color; None / Light / Dark glass | **transparent / none** |
| Inner Padding Top / Bottom / L-R / Sub-element Gap | 0–100 / 0–100 / 0–80 / 0–64 px | **16 / 16 / 20 / 12** |

### Banner · Stats · Image · Video · HTML · Divider

| Block | Controls |
|-------|----------|
| **Banner** | Background, Text color, + Navigation Target (whole block links) |
| **Stats** | Value, Label, Icon (bi-*), Background + BG Opacity 0–100%, Text Color, Animate Number (yes/no), Anim Speed 300–4000ms (def 1600) |
| **Image** | Carousel-mode toggle. Single: Image Mode (Fill/Natural/Float-L/Float-R), Image, Alt. Carousel: Visible columns 1–3, Display mode (Static/Auto-rotate/Random), Transition (Slide/Fade/Ease/Snap), Auto-rotate interval 1–20s, editable image list |
| **Video** | Video File + Poster Image (media pickers) |
| **HTML** | HTML content textarea |
| **Divider** | Thickness 1–10px (def 2), Color (def #dee2e6) |

### Editorial · Steps · Photo Strip · Marquee · Packages

| Block | Controls |
|-------|----------|
| **Editorial** | Body Text; Font Family (10 serif/sans, def Merriweather); Font Size 12–36 (def 18); Line Height 1.0–2.5 (def 1.6); Text Color; Background; **Obstacles** list — each: image (browse), Alpha-Hull toggle, X/Y 0–0.9, W/H 0.05–0.9, Padding 0–40px |
| **Steps** | Steps list (Number / Heading / Subtext, add/remove); Number-column width 48–200px (def 100); Row dividers (def on); Last-row divider (def off) |
| **Photo Strip** | Columns 1–8; Height 80–600px (def 220); Gap 0–32px (def 4); Hover-brightness (def on); Images list (URL / pick / remove) |
| **Marquee** | Style (Town label / Stat value+label); Direction (Left/Right); Speed 8–80s (def 36); Separator (Star/Dot/Bar/None); Pause-on-hover (def on); Items textarea (\`value \\| label\` in stat style) |
| **Packages** | Network (slug dropdown); Columns 1–4 (def 3); optional Heading. Renders live packages from Coverage Maps |

### Volt block

Volt is documented in its own package — here you only bind, slot-override and recolour layers. Volt blocks have **no sub-elements and no Edit-Content**; all content comes from the Volt design itself.

| Control | Function |
|---------|----------|
| **Volt name + Change** | Shows the bound Volt design (name + short ID); **Change** opens Volt Studio (\`openVoltModal\`) |
| **Content Slots** | Override Title, Body, Icon (bi-* / emoji), Image (media picker), Action label. Pushed live into the Volt preview iframe via URL params |
| **Layer Colors** | Per vector layer: visibility checkbox + fill color; dot marks overrides; **Reset** clears all. Loaded from \`/api/public/volt/{id}\` |

## Sub-element properties (per type)

Selecting a sub-element shows: type-specific rows, then **Position within Block** (X/Y/W/H + "Re-stack All"), a Navigation Target (buttons only), Custom CSS, and Remove. Text types also get an Animation section and the floating format toolbar.

| Sub-element | Type-specific controls |
|-------------|------------------------|
| **Heading** | Text; Level H1–H6; Color; Font Size 12–96 (def 22); Font Family; Align L/C/R; Weight 300–900 (def 700); Text Wrap (Wrap/Break-all/Nowrap); Line Height 0.8–2.5; Letter Spacing −3–15px; Outline rows; Animation |
| **Paragraph** | Text; Color; Font Size 10–96 (def 14); Font Family; Align L/C/R/Justify; Text Wrap (pre-wrap/normal/nowrap); Line Height 1.0–3.0 (def 1.6); Letter Spacing; Outline; Animation |
| **Eyebrow** | Text; Color (def #0d6efd); Font Size 9–28 (def 13); Font Family; Align; Case (UPPER/as-typed/lower/Capitalize); Letter Spacing 0–15 (def 2); Outline; Animation |
| **Image** | Mode (Fill/Natural/Float-L/Float-R); Image (media picker) |
| **Button** | Button Text; Variant (Filled/Outline/Ghost); Button Color; Text Color; Icon (bi-*); Animation; + Navigation Target |
| **Badge** | Text; Background; Text Color; Animation |
| **Divider** | Thickness 1–10px; Color |
| **Icon** | Icon name (bi-*) + live preview; Size 16–96 (def 48); Colour; Align; Animation |

### Sub-element Animation (text / button / badge / icon)

| Control | Options | Notes |
|---------|---------|-------|
| **Effect** | None / Count Up / Zoom In / Pulse / Fade In / Slide Up / Bounce In / Blur In / Typewriter | Live page only |
| **Duration / Delay** | 200–3000ms / 0–2000ms | Shown once an effect is chosen |
| **Loop** | checkbox | Pulse only |

### Navigation Target (banner, hero button, button sub-element)

| Control | Function |
|---------|----------|
| **Link To** | Dropdown of nav options loaded from the CMS (pages/anchors). Selecting \`custom\`, \`tel\` or \`mailto\` reveals a free-text input for URL / tel: / mailto: |
`;

const FLEXIBLE_LAYERS_MENUS = `
# Flexible Designer — Layers, Menus & Shortcuts

Covers the **Layers tree** (right panel, bottom), the **context / right-click** behaviour, the three **floating toolbars** that attach to a selection, and the full **keyboard-shortcut** map.

## Layers Tree

A Figma-style hierarchy of the section. Blocks with children are collapsible groups; their sub-elements nest under them; childless blocks are leaf rows. Selecting a row syncs canvas selection; rows drag to reorder / re-nest.

<div class="fig map">
  <div class="fig-head"><span class="tag">Interface map</span><span class="ttl">Layers tree</span></div>
  <div class="fig-body">
    <div class="panelmock">
      <div class="pm-head">&#9636; Layers <span style="margin-left:auto"><span class="cal">1</span> &#8645;</span></div>
      <div class="pm-body" style="padding:6px">
        <div class="layer sel"><span class="cal">2</span> &#9662; &#128194; <b>Hero Card</b> <span class="bdg">3</span><span class="acts"><span class="cal">4</span>&#128065; &#9998; &#10697; &#128465;</span></div>
        <div class="layer child"><span style="visibility:hidden">&bull;</span> &#128196; "Big Title" <span class="acts">&#128065; &#10697; &#128465;</span></div>
        <div class="layer child"><span style="visibility:hidden">&bull;</span> &#182; "Body copy" <span class="acts">&#128065; &#10697; &#128465;</span></div>
        <div class="layer"><span class="cal">3</span> &bull; &#128444; <b>Image</b> <span class="acts">&#128065; &#9998; &#10697; &#128465;</span></div>
      </div>
    </div>
  </div>
  <ul class="callout-list" style="grid-template-columns:1fr">
    <li><span class="cal">1</span><span><b>Collapse/expand all</b> — <code>toggleAllLayerGroups()</code> header button.</span></li>
    <li><span class="cal">2</span><span><b>Group row</b> — caret collapses children; icon + name + child count. Double-click name to rename.</span></li>
    <li><span class="cal">3</span><span><b>Leaf row</b> — a childless block.</span></li>
    <li><span class="cal">4</span><span><b>Per-row actions</b> — Show/hide (eye), Rename (blocks only, pencil), Duplicate (copy), Delete (trash).</span></li>
  </ul>
  <div class="fig-cap">Drag a row to reorder; drag a sub-element onto a group to re-parent it. Rename writes <code>props.label</code>. Hidden rows dim; the eye toggles <code>block.hidden</code>/<code>se.hidden</code>.</div>
</div>

| Element / action | Function | Use case |
|------------------|----------|----------|
| **Caret** | Collapse / expand a group's children | Tame long trees |
| **Row click** | Select the block or sub-element (syncs canvas + properties) | Navigate deep nesting |
| **Double-click name** | Inline rename (blocks) → \`props.label\` | Name your blocks |
| **Eye** | Show / hide element on canvas + render | Temporarily hide |
| **Pencil** | Rename group / leaf block | Rename via button |
| **Copy** | Duplicate block (fresh child IDs) or sub-element (offset +16px) | Clone quickly |
| **Trash** | Delete the block or sub-element | Remove |
| **Drag row** | Reorder siblings; drop a sub onto a group to re-nest | Restructure hierarchy |

## Right-click / Context menus

The designer intentionally uses **floating menus** rather than a canvas right-click menu — most per-element actions live on the mini action toolbar. The only genuine right-click (contextmenu) handler is on **ruler guide lines**.

| Where | Right-click / context behaviour |
|-------|---------------------------------|
| **Ruler guide line** | Right-click (or double-click) a guide line → deletes that guide (\`deleteGuide\`). Guides are created by dragging from a ruler edge |
| **Canvas & blocks** | No custom right-click menu — browser default appears. Element actions are on the floating toolbars. The grid drop-conflict popup (Replace/Stack/Cancel) is drop-triggered, not right-click |

<div class="fig-warn"><b>Note:</b> there is no full canvas right-click menu (cut/copy/paste/bring-to-front). That surface is covered entirely by the floating toolbars below.</div>

## Floating menus & toolbars

Three floating surfaces attach to the current selection: the **mini action toolbar**, the **text-format toolbar**, and the **+ Add-element menu**. Each is a collapsed pill that expands on hover; both toolbars re-anchor to the selected element and clamp on-screen.

<div class="two">
  <div class="fig control" style="margin:0">
    <div class="fig-head"><span class="tag">Control mockup</span><span class="ttl">Mini action toolbar</span></div>
    <div class="fig-body">
      <div style="display:inline-flex;flex-direction:column;gap:4px;border:1px solid var(--line);border-radius:9px;padding:6px;background:#fff">
        <span class="dchip" style="justify-content:center">&#43; Add Sub-Element</span>
        <span class="dchip" style="justify-content:center">&#9998; Edit Content</span>
        <span class="dchip" style="justify-content:center">&#10697; Duplicate Block</span>
        <span class="dchip" style="justify-content:center">&#128268; Snap sub-els (8px)</span>
        <span class="dchip dgr" style="justify-content:center">&#128465; Delete Block</span>
      </div>
    </div>
    <div class="fig-cap">Collapsed "+" pill off the block's right edge; expands downward. Add + Snap show only for card/text/banner/stats. <b>Edit</b> on a volt block opens Volt Studio instead.</div>
  </div>
  <div class="fig control" style="margin:0">
    <div class="fig-head"><span class="tag">Control mockup</span><span class="ttl">Text-format toolbar</span></div>
    <div class="fig-body">
      <div style="display:inline-flex;gap:5px;align-items:center;border:1px solid var(--line);border-radius:9px;padding:6px 8px;background:#fff;flex-wrap:wrap;font-size:11.5px">
        <span class="dchip" style="padding:3px 6px">Tt</span><span class="dchip" style="padding:3px 6px">AB</span><span class="dchip" style="padding:3px 6px">ab</span><span class="dchip" style="padding:3px 6px">Ab</span>
        <span style="color:var(--line)">|</span>
        <span class="dchip" style="padding:3px 6px">&#8676;</span><span class="dchip" style="padding:3px 6px">&#8596;</span><span class="dchip" style="padding:3px 6px">&#8677;</span><span class="dchip" style="padding:3px 6px">&#8801;</span>
        <span style="color:var(--line)">|</span>
        <span class="dchip" style="padding:3px 6px">Font &#9662;</span><span class="dchip" style="padding:3px 6px">18</span><span style="width:18px;height:16px;border-radius:3px;border:1px solid #0002;display:inline-block;background:#1c2333"></span>
        <span style="color:var(--line)">|</span>
        <span class="dchip" style="padding:3px 6px">&#84; outline</span>
      </div>
    </div>
    <div class="fig-cap">Appears for heading / paragraph / eyebrow children. Collapsed round "A" pill above the element's top-right; hover expands. Hidden during multi-select. Outline toggle reveals outline colour + width when on.</div>
  </div>
</div>

| Toolbar | Buttons |
|---------|---------|
| **Mini action toolbar** | **Add Sub-Element** (opens + menu), **Edit Content**, **Duplicate Block**, **Snap sub-elements to 8px** (toggle), **Delete Block**. Add/Snap conditional on block type |
| **Text-format toolbar** | **Case** (As-typed / UPPERCASE / lowercase / Capitalize), **Align** (left/center/right/justify), **Font family** select, **Font size** number, **Text colour**, **Outline** toggle (+ outline colour & width 0.5–8px when on) |
| **+ Add-element menu** | For text blocks, top = **Quick Presets** (Single/Two/Three-column skeletons). Then individual items: text blocks list H1–H6 + Eyebrow + Paragraph + Button; other blocks list Heading/Eyebrow/Paragraph/Button/Image/Icon/Badge/Divider |

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| **Ctrl/Cmd + Z** | Undo (up to 10 steps) |
| **Ctrl/Cmd + = / +** | Zoom in |
| **Ctrl/Cmd + −** | Zoom out |
| **Ctrl/Cmd + 0** | Reset zoom to 100% |
| **Ctrl/Cmd + scroll** | Zoom canvas in/out |
| **S** | Toggle pixel-grid snap (when not typing in a field) |
| **Esc** | Clear current selection (single or multi); exit edit mode |
| **Delete / Backspace** | Delete selected sub-element / block / whole multi-selection |
| **← ↑ → ↓** | Nudge selected element 1px |
| **Shift + arrows** | Nudge 10px |
| **Shift + click** | Add / remove a sub-element in the multi-selection |
| **Enter** (editing text) | Commit inline text edit (except paragraph, which keeps newlines); Esc also commits |
`;

const FLEXIBLE_WRAPPER = `
# Flexible Designer — Wrapper Modal & Save

The designer runs inside an iframe (\`/flexible-designer.html\`) launched full-screen from the **section wrapper modal** (\`FlexibleSectionEditorModal\`). The wrapper owns **section-level** config (background, animation, overlay, intro, lower-third, motion, spacing, scroll-stage) around the layout the designer produces. The layout itself is always authored in the designer iframe.

<div class="fig map">
  <div class="fig-head"><span class="tag">Interface map</span><span class="ttl">Wrapper modal shell</span></div>
  <div class="fig-body">
    <div class="panelmock" style="max-width:560px">
      <div class="pm-head" style="text-transform:none;font-size:12px">&#9638; Edit Flexible Section <span style="margin-left:auto">&times;</span></div>
      <div class="pm-body">
        <div class="field"><label style="min-width:auto"><span class="cal">1</span> Section Name</label><input class="fake-input" value="Features Grid"></div>
        <div class="libtabs" style="margin-top:10px">
          <span class="cal">2</span>
          <span class="libtab on">Content</span><span class="libtab">Background</span><span class="libtab">Animation</span>
          <span class="libtab">Overlay</span><span class="libtab">Intro</span><span class="libtab">Lower Third</span>
          <span class="libtab">Motion</span><span class="libtab">Spacing</span><span class="libtab">Scroll Stage*</span>
        </div>
        <div class="cfgbox" style="margin-top:10px"><div class="lbl"><span class="cal">3</span> Content Height Mode</div>
          <div class="field"><span class="dchip pri">&#9974; Single (100vh)</span><span class="dchip">&#8597; Multi (&gt;100vh)</span></div>
          <div class="field"><span class="cal">4</span> <span class="dchip pri">&#9998; Open / Edit in Designer</span> <span style="font-size:11px;color:var(--muted)">&rarr; launches the iframe</span></div>
        </div>
        <div class="field" style="justify-content:flex-end"><span class="cal">5</span><span class="dchip">Cancel</span><span class="dchip pri">Save Only</span><span class="dchip pri" style="background:var(--primary);color:#fff">Save &amp; Close</span></div>
      </div>
    </div>
  </div>
  <ul class="callout-list">
    <li><span class="cal">1</span><span><b>Section Name</b> — admin-only label for the section.</span></li>
    <li><span class="cal">2</span><span><b>Tabs</b> — 8 section tabs (+ Scroll Stage only in Multi mode).</span></li>
    <li><span class="cal">3</span><span><b>Content Height Mode</b> — Single / Multi (mirrors the designer's Content Mode).</span></li>
    <li><span class="cal">4</span><span><b>Open Designer</b> — launches the full-screen flexible-designer iframe.</span></li>
    <li><span class="cal">5</span><span><b>Footer</b> — Cancel / Save Only / Save &amp; Close (unsaved-changes warning shown).</span></li>
  </ul>
  <div class="fig-cap">The designer's own Save/Done write a draft + postMessage; the wrapper's footer Save is what actually commits section data. An "Unsaved — designer changes aren't saved until you click Save here" banner appears when dirty.</div>
</div>

## Wrapper tabs (section chrome around the layout)

These tabs configure **section-level** chrome — each is a deep feature documented on its own page. They are enumerated here for completeness; cross-references point to the authoritative topic.

| Wrapper tab | Section-level purpose | See |
|-------------|-----------------------|-----|
| **Content** | Content Height Mode (Single/Multi) + **Open Designer** launcher + inline block list | This designer package |
| **Background** | Solid / Gradient / Image background: palette + custom hex, harmony palette generator, image (size/position/repeat/opacity/parallax/gradient-mask fade), gradient (direction/opacity) | Section Editor → Background Tab |
| **Animation** | Section entrance / scroll AnimBg settings | Section Animations (AnimBg) |
| **Overlay** | Optional overlay heading/subheading band over the section | Section Editor → Text Overlay Tab |
| **Intro (triangle)** | Section "Intro" shapes / reveal | Section Editor → Section Intro Tab |
| **Lower Third** | Broadcast-style lower-third element at the section bottom | Animations & Motion → Lower Third Graphic |
| **Motion** | Parallax motion-element overlay images | Animations & Motion → Motion & Parallax Elements |
| **Spacing** | Section padding top / bottom | Section Editor → Spacing Tab |
| **Scroll Stage** | Multi-mode only: scroll-stage zones (snap/free, side, per-zone visual & parallax) | Scroll Stage (Parallax Zones) |

## iframe messaging protocol

<div class="fig diagram">
  <div class="fig-head"><span class="tag">Diagram</span><span class="ttl">postMessage handshake (wrapper ⇄ designer iframe)</span></div>
  <div class="fig-body" style="align-items:stretch">
    <div class="flow">
      <span class="step">iframe loads</span><span class="arr">&rarr;</span>
      <span class="step"><code>FLEXIBLE_DESIGNER_READY</code> (iframe→parent)</span><span class="arr">&rarr;</span>
      <span class="step"><code>FLEXIBLE_DESIGNER_INIT</code> + payload (parent→iframe) · reveals <b>Done</b></span>
    </div>
    <div class="flow">
      <span class="step">Save → <code>FLEXIBLE_DESIGNER_SAVE</code> + JSON</span>
      <span class="step">Preview → <code>SAVE</code> then <code>FLEXIBLE_DESIGNER_PREVIEW</code></span>
      <span class="step">Done → <code>FLEXIBLE_DESIGNER_DONE</code> (parent closes iframe)</span>
    </div>
  </div>
  <div class="fig-cap">The INIT payload carries the existing layout (blocks, positionMode, layoutType, grid/mosaic config) plus the section background for the canvas BG preview. Drafts are mirrored to <code>localStorage['cms_layout_draft']</code>.</div>
</div>
`;

const HERO_CAROUSEL = `
# Hero Carousel

The Hero Carousel is the first section on the landing page — a full-screen slide show.

---

## Stats Strip

A frosted-glass bar pinned to the bottom of **every slide** — ideal for social-proof items like certifications, uptime, or key stats.

Configured at the **carousel level** (not per slide) in the Hero Carousel editor.

| Setting | Description |
|---------|-------------|
| **Enable Stats Strip** | Toggle the bar on/off |
| **Items** | List of up to 6 icon+text pairs |
| **Icon** | Bootstrap icon class (e.g. \`bi-shield-check-fill\`) |
| **Text** | Short stat label (e.g. "ISO 9001 Certified") |

The strip sits at **z-index 25**, above the slide controls, with a \`blur(8px)\` glass backdrop.

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

**Stacked Heading Mode** — In the Slide Editor → Text Overlay tab, toggle "Heading Mode" from Classic to Stacked. Stacked mode lets you define 2–5 heading rows, each with its own color, font size, weight, and animation. An optional Eyebrow field (text + color) adds a small uppercase label above the rows. Switching back to Classic preserves your content.

**Stats Strip** — In the Hero editor → Stats Strip section, enable the frosted glass bar that appears at the bottom of every hero slide. Add up to 6 items, each with a Bootstrap icon class (e.g. \`bi-geo-alt-fill\`) and a short text label. The icon color inherits the brand accent colour.

---

## Carousel Controls

| Setting | Default | Description |
|---------|---------|-------------|
| **Auto-play** | ✅ on | Automatically advance slides |
| **Interval** | 5000ms | Milliseconds between slides |
| **Show Dots** | ✅ on | Navigation dot indicators |
| **Show Arrows** | ✅ on | Left/right navigation arrows |
| **Transition** | fade | Slide transition style |
| **Show Slide Counter** | ❌ off | "01/03" counter shown on slide |
| **Show Scroll Indicator** | ❌ off | Animated "SCROLL ↓" prompt at bottom |
| **Controls Position** | bottom-right | Where arrows/dots sit: bottom-right, bottom-left, bottom-center |
| **Meta Line** | — | Array of small info strings below the heading (e.g. coordinates, dates, location tags) |

---

## Per-Slide Advanced Fields

| Field | Description |
|-------|-------------|
| **Eyebrow** | Small uppercase label above the main heading |
| **Heading Rows** | Replace single heading with multi-row array — each row can have its own color, size, weight, font, and animation |

### Multi-Row Heading (headingRows)

Instead of a single \`heading\` string, use \`headingRows\` for per-line styling:

\`\`\`json
"headingRows": [
  { "text": "Ready.", "color": "#ffffff", "fontSize": "clamp(60px,10vw,110px)", "fontWeight": 700 },
  { "text": "Concrete.", "color": "#22c55e", "fontSize": "clamp(60px,10vw,110px)", "animation": "slideUp" }
]
\`\`\`

Each row supports: \`text\`, \`color\`, \`fontSize\`, \`fontWeight\`, \`fontFamily\`, \`animation\`, \`animationDuration\`, \`animationDelay\`.

> **Backward compatible:** Slides with a plain \`heading\` string continue to work unchanged.

### Using the Stacked Heading Editor

In the **Slide Editor → Overlay tab**:

1. Click **"Switch to Stacked"** to enter stacked mode — the current heading becomes the first row
2. Edit each row's **text**, **color** (hex or color picker), **size**, **weight**, and **animation**
3. Click **"+ Add Row"** to add up to 5 rows
4. Drag rows to reorder, or click the trash icon to remove
5. The optional **Eyebrow** field (above all rows) supports its own color

Click **"Switch to Classic"** to return to a single heading string (all row data is discarded).
`;

const PAGES_SYSTEM = `
# Pages System

The **Pages** area manages every standalone, navigable route on the site — everything that is *not* the landing page. One list, five page types, and per-page controls for publishing, SEO, and linking. Access via **Admin → Content → Pages**.

A page is a row in the \`Page\` table with a unique **slug** (its URL), a **type** that decides how it is authored and rendered, and two independent state axes: **enabled** (is the route live at all) and **status** (DRAFT vs PUBLISHED). These two are often confused — the first figure separates them.

<div class="fig diagram"><span class="tag">Diagram</span><div class="fig-body"><svg viewBox="0 0 720 250" role="img" aria-label="Page anatomy"><rect x="16" y="20" width="688" height="46" rx="8" fill="#fff" stroke="#e4e8ef"/><text x="30" y="40" font-size="11" font-weight="600" fill="#8a93a3">PUBLIC URL</text><text x="30" y="58" font-family="monospace" font-size="15" font-weight="700" fill="#1c2333">https://www.example.com<tspan fill="#0d6efd">/about-us</tspan></text><text x="560" y="52" font-size="11" font-weight="600" fill="#0a4bc2">← the slug</text><rect x="16" y="86" width="220" height="66" rx="8" fill="#e7f0ff" stroke="#cfe0ff"/><text x="30" y="108" font-size="11" font-weight="700" fill="#0a4bc2">TYPE</text><text x="30" y="128" font-size="13" font-weight="600" fill="#1c2333">full · designer · pdf</text><text x="30" y="144" font-size="13" font-weight="600" fill="#1c2333">form · standalone</text><rect x="250" y="86" width="220" height="66" rx="8" fill="#e8f7ee" stroke="#bfe6cf"/><text x="264" y="108" font-size="11" font-weight="700" fill="#12633f">ENABLED (boolean)</text><text x="264" y="128" font-size="13" font-weight="600" fill="#1c2333">Enabled → route live</text><text x="264" y="144" font-size="13" font-weight="600" fill="#5b6472">Disabled → 404 / hidden</text><rect x="484" y="86" width="220" height="66" rx="8" fill="#fff2d8" stroke="#ffe0a3"/><text x="498" y="108" font-size="11" font-weight="700" fill="#8a5a00">STATUS</text><text x="498" y="128" font-size="13" font-weight="600" fill="#1c2333">DRAFT → PUBLISHED</text><text x="498" y="144" font-size="13" font-weight="600" fill="#5b6472">(ARCHIVED)</text><rect x="16" y="172" width="688" height="62" rx="8" fill="#fbfcfe" stroke="#e4e8ef"/><text x="30" y="192" font-size="11" font-weight="600" fill="#8a93a3">ALSO ON THE ROW</text><text x="30" y="214" font-size="12" fill="#5b6472">SEO fields (metaTitle, metaDescription, og*, canonical, noindex/nofollow) · homepage flag</text><text x="30" y="230" font-size="12" fill="#5b6472">nav fields (showOnNavbar, navLabel, navOrder) · type payload (formConfig / customHtml+customCss / sections)</text></svg></div><div class="fig-cap"><b>Anatomy of a page</b> — one slug, one type, two independent state flags, plus SEO / nav / payload attached to the same row.</div></div>

## The five page types

<div class="params scroll-x"><table><caption>The five page types (types/page.ts · PageType)</caption><thead><tr><th>Type</th><th>List label</th><th>Authored with</th><th>Use it when…</th></tr></thead><tbody><tr><td><code>full</code></td><td>Full Page / Sections</td><td>Section editor + Flexible Designer (100vh snap sections)</td><td>A normal multi-section content page like the landing page.</td></tr><tr><td><code>designer</code></td><td>Designer Page</td><td>Full-screen Flexible Designer, unbounded canvas (no snap)</td><td>A free-form visual page taller than one screen, drag-and-drop.</td></tr><tr><td><code>pdf</code></td><td>PDF Document</td><td>PDF editor modal (URL + display mode)</td><td>You just need to show or hand out a PDF document.</td></tr><tr><td><code>form</code></td><td>Contact Form</td><td>Form editor modal (fields + submit action)</td><td>A contact / inquiry form that emails or webhooks submissions.</td></tr><tr><td><code>standalone</code></td><td>Standalone HTML</td><td>Monaco HTML/CSS editor, CMS variables</td><td>Pasting raw HTML/CSS from a design tool with zero CMS chrome.</td></tr></tbody></table></div>

<div class="note"><b>Note.</b> The Prisma <code>PageType</code> enum also defines <code>LANDING</code>, <code>TAB_PAGE</code> and <code>GALLERY</code>; the Pages list only surfaces the five above (it filters to <code>full/pdf/form/designer/standalone</code>). Each type has its own topic in this section.</div>

## The Pages list & stats

The landing screen: seven stat tiles across the top, a pill filter bar (one pill per type plus Features and a right-aligned Submissions), and a table of every page with a compact action cluster on each row.

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><div class="mk"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div><div style="font-weight:700;font-size:16px">Pages</div><div style="font-size:11.5px;color:#8a93a3">Manage navigable pages (separate from landing page)</div></div><span class="btn p">＋ Create Page</span></div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:12px"><div class="mk-card" style="padding:9px 11px"><div style="font-size:10px;color:#8a93a3">Total Pages</div><div style="font-size:19px;font-weight:700">12</div></div><div class="mk-card" style="padding:9px 11px;border-left:3px solid #0d6efd"><div style="font-size:10px;color:#8a93a3">Section</div><div style="font-size:19px;font-weight:700;color:#0d6efd">3</div></div><div class="mk-card" style="padding:9px 11px"><div style="font-size:10px;color:#8a93a3">PDF</div><div style="font-size:19px;font-weight:700;color:#dc3545">2</div></div><div class="mk-card" style="padding:9px 11px"><div style="font-size:10px;color:#8a93a3">Form</div><div style="font-size:19px;font-weight:700;color:#198754">2</div></div><div class="mk-card" style="padding:9px 11px"><div style="font-size:10px;color:#8a93a3">Designer</div><div style="font-size:19px;font-weight:700;color:#0dcaf0">3</div></div><div class="mk-card" style="padding:9px 11px;border-left:3px solid #ca8a04"><div style="font-size:10px;color:#8a93a3">Standalone</div><div style="font-size:19px;font-weight:700;color:#ca8a04">1</div></div><div class="mk-card" style="padding:9px 11px;border-left:3px solid #7c3aed"><div style="font-size:10px;color:#8a93a3">Feature</div><div style="font-size:19px;font-weight:700;color:#7c3aed">2</div></div></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;align-items:center"><span class="tbtn on">All Pages (12)</span><span class="tbtn">▤ Sections (3)</span><span class="tbtn">▤ PDFs (2)</span><span class="tbtn">▤ Forms (2)</span><span class="tbtn">▤ Designer (3)</span><span class="tbtn" style="color:#ca8a04">▤ Standalone (1)</span><span class="tbtn" style="color:#7c3aed">▤ Features (2)</span><span class="tbtn" style="margin-left:auto;color:#0d6efd">✉ Submissions <span class="pill blue">4</span></span></div><div class="mk-card"><table class="t"><thead><tr><th style="width:34%">Page</th><th>Type</th><th>Status</th><th>Updated</th><th style="text-align:right">Actions</th></tr></thead><tbody><tr><td><div style="font-weight:600">About Us <span class="pill green">⌂ Homepage</span></div><code style="color:#0d6efd">/about-us</code> ↗</td><td><span class="pill blue">▤ Full Page</span></td><td><span class="pill green">Enabled</span></td><td class="tnote">2026-07-02</td><td><div style="display:flex;gap:4px;justify-content:flex-end"><span class="btn p sm">✎</span><span class="btn g sm" style="color:#0dcaf0">🔍</span><span class="btn g sm" style="color:#ca8a04">◐</span><span class="btn g sm">⧉</span><span class="btn g sm">⌂</span><span class="btn g sm" style="color:#dc3545">🗑</span></div></td></tr><tr><td><div style="font-weight:600">Brochure</div><code style="color:#0d6efd">/brochure</code> ↗</td><td><span class="pill red">▤ PDF Document</span></td><td><span class="pill green">Enabled</span></td><td class="tnote">2026-06-10</td><td><div style="display:flex;gap:4px;justify-content:flex-end;opacity:.85"><span class="btn p sm">✎</span><span class="btn g sm">🔍</span><span class="btn g sm">◐</span><span class="btn g sm">⧉</span><span class="btn g sm">⌂</span><span class="btn g sm">🗑</span></div></td></tr><tr style="opacity:.5"><td><div style="font-weight:600">Old Promo</div><code style="color:#0d6efd">/old-promo</code> ↗</td><td><span class="pill warn">▤ Standalone HTML</span></td><td><span class="pill grey">Disabled</span></td><td class="tnote">2026-05-09</td><td><div style="display:flex;gap:4px;justify-content:flex-end"><span class="btn w sm">&lt;/&gt;</span><span class="btn g sm">🔍</span><span class="btn g sm">◉</span><span class="btn g sm">⧉</span><span class="btn g sm">⌂</span><span class="btn g sm">🗑</span></div></td></tr></tbody></table></div></div></div><div class="fig-cap"><b>Pages list</b> — stat tiles ▸ type filter pills ▸ table. Disabled pages render at 50% opacity; the row's edit button colour and icon change with the page type.</div></div>

<div class="params scroll-x"><table><caption>Row action cluster (right → left as coded)</caption><thead><tr><th>Icon</th><th>Action</th><th>Behaviour</th><th>Notes</th></tr></thead><tbody><tr><td>✎ / ▤ / &lt;/&gt;</td><td>Edit</td><td>Opens the type-specific editor</td><td>Full → route <code>/admin/page-editor/{slug}</code>; Designer → info ▤ icon; PDF/Form → blue modal; Standalone → warning &lt;/&gt; modal.</td></tr><tr><td>🔍</td><td>SEO settings</td><td>Opens the SEO modal for that page</td><td>Outline-info button. See <b>Publishing &amp; SEO</b>.</td></tr><tr><td>◐ / ◉</td><td>Enable / Disable</td><td>Toggles <code>enabled</code></td><td>Eye-slash (warning) when live, eye (success) when disabled.</td></tr><tr><td>⧉</td><td>Duplicate</td><td>Clones the page via <code>/duplicate</code></td><td>New slug auto-suffixed server-side.</td></tr><tr><td>⌂</td><td>Set as homepage</td><td>Points <code>/</code> at this page (site-config)</td><td>Filled house + green when active; click again clears → default landing page.</td></tr><tr><td>🗑</td><td>Delete</td><td>Confirm dialog, then removes the page</td><td>In-app confirm modal (never a native <code>confirm()</code>). Removes the page and all its sections.</td></tr></tbody></table></div>

<div class="note"><b>Status column ≠ publish state.</b> The <b>Status</b> column shows the <code>enabled</code> flag (Enabled/Disabled), <i>not</i> DRAFT/PUBLISHED. Publish state lives in the section-page editor and is what gates linkability (see <b>Publishing &amp; SEO</b>).</div>

## Creating a page: title → slug → type

"Create Page" opens a small modal. You type a **title**, the **slug** is auto-generated from it, and you pick the page **type** from a stack of description cards. Type defaults to **Designer**. Plugin-provided page types append below the built-ins when any plugin registers them.

<div class="fig control"><span class="tag">Control mockup</span><div class="fig-body"><div class="mk-card" style="max-width:460px"><div class="mk-modalhead"><span class="t">Create New Page</span><span class="mk-x">✕</span></div><div class="mk-body"><div class="grp"><label class="f">Page Title</label><div class="inp"><span class="ph">About Us</span></div><div class="help">URL slug will be generated automatically (e.g., "about-us")</div></div><div class="grp"><label class="f">Page Type</label><div class="opt on"><span class="oi">▤</span><div><strong>Designer Page</strong><div class="od">Visual drag-and-drop page builder — unlimited height, no snap constraints</div></div><span class="chk">✔</span></div><div class="opt"><span class="oi">&lt;/&gt;</span><div><strong>Standalone HTML</strong><div class="od">Paste raw HTML/CSS from design tools — no CMS constraints, full design freedom</div></div></div><div class="opt"><span class="oi">▤</span><div><strong>PDF Document</strong><div class="od">Display a PDF document with embed/download options</div></div></div><div class="opt"><span class="oi">☑</span><div><strong>Contact Form</strong><div class="od">Create a contact or inquiry form with custom fields</div></div></div><div style="text-align:center;margin:8px 0 4px"><span class="pill grey">Plugin Page Types</span></div><div class="opt"><span class="oi">◆</span><div><strong>Gallery</strong> <span class="pill grey">Media Plugin</span><div class="od">Registered by an installed plugin via /api/admin/plugins/page-types</div></div></div></div></div><div class="mk-foot"><span class="btn g">Cancel</span><span class="btn p">＋ Create Page</span></div></div></div><div class="fig-cap"><b>Create Page modal</b> — four built-in type cards (Designer selected by default) plus any plugin-registered types. Note: <b>Full/Section</b> pages are not offered here.</div></div>

<div class="params scroll-x"><table><caption>Create fields &amp; slug rules (lib/page-manager.ts)</caption><thead><tr><th>Field</th><th>Function</th><th>Options / rules</th><th>Default</th></tr></thead><tbody><tr><td>Page Title</td><td>Admin display name; seeds the slug</td><td>Required, non-empty</td><td class="def">—</td></tr><tr><td>Slug (auto)</td><td>URL path <code>/{slug}</code></td><td>Lowercased, spaces→<code>-</code>, strips non <code>[a-z0-9-]</code>; must be unique</td><td class="def">from title</td></tr><tr><td>Page Type</td><td>Chooses author + render pipeline</td><td><code>designer</code> · <code>standalone</code> · <code>pdf</code> · <code>form</code> · <code>plugin:*</code></td><td class="def"><code>designer</code></td></tr><tr><td>enabled</td><td>Route live on creation</td><td>boolean</td><td class="def"><code>true</code></td></tr></tbody></table></div>

<div class="fig diagram"><span class="tag">Diagram</span><div class="fig-body"><svg viewBox="0 0 700 150" role="img" aria-label="Slug generation"><rect x="10" y="20" width="150" height="44" rx="7" fill="#fff" stroke="#e4e8ef"/><text x="20" y="40" font-size="11" font-weight="600" fill="#8a93a3">TITLE</text><text x="20" y="57" font-size="13" font-weight="600" fill="#1c2333">"About Us!"</text><text x="172" y="47" fill="#8a93a3">→</text><rect x="190" y="20" width="200" height="44" rx="7" fill="#e7f0ff" stroke="#cfe0ff"/><text x="202" y="40" font-size="11" font-weight="600" fill="#0a4bc2">generateSlug()</text><text x="202" y="57" font-family="monospace" font-size="13" font-weight="600" fill="#0a4bc2">about-us</text><text x="400" y="47" fill="#8a93a3">→</text><rect x="418" y="20" width="272" height="44" rx="7" fill="#fff2d8" stroke="#ffe0a3"/><text x="430" y="40" font-size="11" font-weight="600" fill="#8a5a00">validateSlugFormat()</text><text x="430" y="57" font-size="12" fill="#8a5a00">unique · not a reserved slug</text><rect x="10" y="86" width="680" height="52" rx="7" fill="#fbfcfe" stroke="#e4e8ef"/><text x="22" y="105" font-size="11" font-weight="600" fill="#8a93a3">RESERVED (rejected)</text><text x="22" y="124" font-family="monospace" font-size="12" fill="#5b6472">admin · api · _next · images · uploads · home · index · landing-page · editor …</text></svg></div><div class="fig-cap"><b>Slug pipeline</b> — the title is slugified, then validated for format, uniqueness, and against the reserved-slug list before the page is created.</div></div>

## Reserved Slugs

These slugs cannot be used (they conflict with existing routes):

\`admin\`, \`api\`, \`_next\`, \`images\`, \`uploads\`, \`home\`, \`index\`, \`landing-page\`, \`editor\`

---

## Where to go next

| Page type / task | Topic |
|------------------|-------|
| Full & Designer (section/canvas) pages | **Full & Designer Pages** |
| PDF document pages | **PDF Pages** |
| Contact / inquiry forms | **Form Pages** |
| Raw HTML/CSS pages + \`{{cms.*}}\` variables | **Standalone HTML Pages** |
| Feature routes & the submissions inbox | **Feature Pages & Submissions** |
| Linking nav items / buttons to pages | **Linking to Pages (LinkPicker)** |
| Publish state, noindex & per-page SEO | **Publishing & SEO** |
`;

const PAGES_FULL_DESIGNER = `
# Full & Designer Pages

Both of these are **section / canvas** pages authored through the CMS Designer — the same tooling as the landing page. They differ only in canvas mode.

<div class="params scroll-x"><table><caption>Full vs Designer</caption><thead><tr><th>&nbsp;</th><th>Full Page (<code>full</code>)</th><th>Designer Page (<code>designer</code>)</th></tr></thead><tbody><tr><td>Canvas</td><td>Stacked <b>100vh</b> sections, scroll-snap</td><td>One <b>unbounded</b> canvas, no snap (<code>contentMode:"multi"</code>)</td></tr><tr><td>Opened via</td><td>Route <code>/admin/page-editor/{slug}</code></td><td>Full-screen modal (iframe <code>/flexible-designer.html</code>)</td></tr><tr><td>Saving</td><td>Per-section draft → publish flow</td><td>Auto-saved on every change (postMessage); "Done" closes</td></tr><tr><td>Storage</td><td><code>Section[]</code> rows (config / configDraft)</td><td>Designer JSON in <code>localStorage</code> key <code>cms_designer_{slug}</code></td></tr><tr><td>Create modal</td><td>Not offered (created elsewhere / seeded)</td><td>Default choice in Create modal</td></tr></tbody></table></div>

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><div class="mk" style="max-width:640px"><div style="background:#16213e;border-radius:8px 8px 0 0;padding:9px 14px;display:flex;justify-content:space-between;align-items:center"><div style="display:flex;gap:10px;align-items:center;color:#fff"><span style="color:#6a82fb">▤</span><b style="font-size:13px">Designer Page Editor</b><span style="color:rgba(255,255,255,.5);border-left:1px solid rgba(255,255,255,.2);padding-left:10px;font-size:12px">About Us</span></div><div style="display:flex;gap:10px;align-items:center"><span style="color:rgba(255,255,255,.4);font-size:11px">Changes auto-saved · Press Done in designer to close</span><span style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:6px;padding:3px 9px;font-size:12px">✕ Close</span></div></div><div style="background:#1a1a2e;border-radius:0 0 8px 8px;height:150px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.35);font-size:12.5px;text-align:center"><div>Flexible Designer iframe (unbounded canvas)<br><span style="font-size:11px">blocks · Volt cards · section background · alignment guides</span></div></div></div></div><div class="fig-cap"><b>Designer overlay</b> — a dark full-viewport shell around the Flexible Designer iframe. The header carries only the title and Close; all authoring happens inside the iframe.</div></div>

<div class="note xref"><b>Cross-reference.</b> The Section Editor, the Flexible Designer, block types, Volt cards, section background and spacing controls are documented in full under <b>Section Editor</b>, <b>Flexible Sections</b> and <b>Volt Designer</b>. For a Full or Designer page, author it exactly as you author a landing-page section — this topic does not repeat that surface.</div>
`;

const PAGES_PDF = `
# PDF Pages

The simplest type: point at a PDF (a full URL or an uploaded \`/uploads/…\` path) and choose how it presents. Payload is stored in the row's \`formConfig\` JSON as \`{ pdfUrl, displayMode }\`.

<div class="fig control"><span class="tag">Control mockup</span><div class="fig-body"><div class="mk-card" style="max-width:520px"><div class="mk-modalhead"><span class="t">▤ Edit PDF Page</span><span class="mk-x">✕</span></div><div class="mk-body"><div class="grp"><label class="f">PDF Document URL <span class="req">*</span></label><div class="inp"><span class="ph">https://example.com/document.pdf or /uploads/document.pdf</span><span style="margin-left:auto" class="btn g sm">📂</span></div><div class="help">Enter a full URL or relative path to your PDF document</div></div><div class="grp"><label class="f">Display Mode</label><div class="opt on"><span class="oi">▤</span><div><strong>Embed in Page</strong><div class="od">Display PDF inline using browser viewer</div></div><span class="chk">✔</span></div><div class="opt"><span class="oi">⭳</span><div><strong>Download Only</strong><div class="od">Show download button (no inline viewer)</div></div></div><div class="opt"><span class="oi">▤⭳</span><div><strong>Both</strong><div class="od">Embed viewer + download button below</div></div></div></div><div class="grp"><label class="f">Description (Optional)</label><div class="inp" style="min-height:48px;align-items:flex-start"><span class="ph">Brief description of the document (shown above the PDF)</span></div></div></div><div class="mk-foot"><span class="btn g">Cancel</span><span class="btn p">✓ Save Changes</span></div></div></div><div class="fig-cap"><b>PDF editor</b> — URL with a media-library browse button, three display-mode cards, and an optional description shown above the document.</div></div>

<div class="params scroll-x"><table><caption>PDF page fields (PDFPageConfig)</caption><thead><tr><th>Field</th><th>Function</th><th>Options</th><th>Default</th></tr></thead><tbody><tr><td>pdfUrl <span class="req">*</span></td><td>Source of the document</td><td>Absolute URL or relative <code>/uploads/…</code> path; Save is disabled until non-empty</td><td class="def">""</td></tr><tr><td>displayMode</td><td>How the PDF is presented</td><td><code>embed</code> (inline viewer) · <code>download</code> (button only) · <code>both</code></td><td class="def"><code>embed</code></td></tr><tr><td>description</td><td>Intro text above the document</td><td>Free text, optional</td><td class="def">—</td></tr></tbody></table></div>

<div class="note"><b>Note.</b> The media-library browse button currently opens a placeholder ("integration coming soon") — enter the URL manually for now.</div>
`;

const PAGES_FORM = `
# Form Pages

A form page is a list of **fields** plus a **submit action**. Fields are added, reordered and deleted in the main modal; each field is edited in a secondary modal. Submissions go to an email address or a webhook, and land in the Submissions inbox. Payload stored as \`formConfig = { fields, submitAction, submitConfig }\`.

**Create via:** Admin → Content → Pages → **Contact Form**

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><div class="mk-card" style="max-width:560px"><div class="mk-modalhead"><span class="t">☑ Edit Form Page</span><span class="mk-x">✕</span></div><div class="mk-body"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="font-size:13px">Form Fields</b><span class="btn p sm">＋ Add Field</span></div><div class="mk-card" style="padding:9px 11px;margin-bottom:6px;display:flex;align-items:center;gap:10px"><div style="flex:1"><div><b>Full Name</b> <span class="pill grey">text</span> <span class="pill red">Required</span></div><div class="tnote">Name: full_name</div></div><span class="btn g sm">↑</span><span class="btn g sm">↓</span><span class="btn g sm" style="color:#0d6efd">✎</span><span class="btn g sm" style="color:#dc3545">🗑</span></div><div class="mk-card" style="padding:9px 11px;margin-bottom:14px;display:flex;align-items:center;gap:10px"><div style="flex:1"><div><b>Email Address</b> <span class="pill grey">email</span> <span class="pill red">Required</span></div><div class="tnote">Name: email</div></div><span class="btn g sm">↑</span><span class="btn g sm">↓</span><span class="btn g sm" style="color:#0d6efd">✎</span><span class="btn g sm" style="color:#dc3545">🗑</span></div><b style="font-size:13px">Submission Settings</b><div style="margin-top:8px"><div class="opt on"><span class="oi">✉</span><div><strong>Send Email</strong><div class="od">Send form data to email address</div></div></div><div class="opt"><span class="oi">🔗</span><div><strong>Webhook</strong><div class="od">POST form data to webhook URL</div></div></div></div><div class="grp" style="margin-top:10px"><label class="f">Email Address <span class="req">*</span></label><div class="inp"><span class="ph">admin@example.com</span></div></div><div class="grp"><label class="f">Success Message</label><div class="inp"><span>Thank you! Your submission has been received.</span></div></div></div><div class="mk-foot"><span class="btn g">Cancel</span><span class="btn p">✓ Save Changes</span></div></div></div><div class="fig-cap"><b>Form editor</b> — reorderable field list (↑↓✎🗑 per field), then a submit-action choice that swaps the field below it (Email Address vs Webhook URL) and a success message.</div></div>

<div class="fig control"><span class="tag">Control mockup</span><div class="fig-body"><div class="mk-card" style="max-width:460px"><div class="mk-modalhead"><span class="t">Edit Field</span><span class="mk-x">✕</span></div><div class="mk-body"><div class="grp"><label class="f">Field Type</label><div class="inp"><span>Dropdown</span><span style="margin-left:auto">▾</span></div></div><div class="grp"><label class="f">Label <span class="req">*</span></label><div class="inp"><span class="ph">Full Name</span></div></div><div class="grp"><label class="f">Field Name <span class="req">*</span></label><div class="inp"><span class="ph">full_name</span></div><div class="help">Used as the key in submission data (lowercase, no spaces)</div></div><div class="grp"><label class="f" style="display:inline-flex;gap:6px;align-items:center"><span>☑</span> Required field</label></div><div class="grp"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><label class="f" style="margin:0">Options</label><span class="btn p sm">＋ Add Option</span></div><div class="inp" style="margin-bottom:6px"><span class="ph">Value (e.g., option1)</span><span class="ph" style="margin-left:auto">Label (e.g., Option 1)</span><span style="color:#dc3545">🗑</span></div></div></div><div class="mk-foot"><span class="btn g">Cancel</span><span class="btn p">✓ Save Field</span></div></div></div><div class="fig-cap"><b>Field editor</b> — type, label, submission-key name, required toggle; a placeholder appears for text-like types, an options list appears only for Dropdown.</div></div>

<div class="params scroll-x"><table><caption>Field types &amp; per-field options (FormField)</caption><thead><tr><th>Property</th><th>Function</th><th>Options / values</th><th>Default</th></tr></thead><tbody><tr><td>type</td><td>Input rendered on the public form</td><td><code>text</code> · <code>email</code> · <code>phone</code> · <code>textarea</code> · <code>select</code> · <code>checkbox</code></td><td class="def"><code>text</code></td></tr><tr><td>label <span class="req">*</span></td><td>Visible field label</td><td>Required</td><td class="def">"New Field"</td></tr><tr><td>name <span class="req">*</span></td><td>Key in the submission payload</td><td>Required, lowercase / no spaces</td><td class="def">auto <code>field_…</code></td></tr><tr><td>required</td><td>Field must be filled</td><td>boolean</td><td class="def"><code>false</code></td></tr><tr><td>placeholder</td><td>Hint text</td><td>Hidden for <code>checkbox</code> &amp; <code>select</code></td><td class="def">—</td></tr><tr><td>options</td><td>Dropdown choices</td><td><code>select</code> only; ≥1 required; <code>{value,label}</code> pairs</td><td class="def">[]</td></tr></tbody></table></div>

<div class="params scroll-x"><table><caption>Submission settings (submitConfig)</caption><thead><tr><th>Field</th><th>Function</th><th>Options / rules</th><th>Default</th></tr></thead><tbody><tr><td>submitAction</td><td>Where submissions go</td><td><code>email</code> or <code>webhook</code></td><td class="def"><code>email</code></td></tr><tr><td>emailTo <span class="req">*</span></td><td>Recipient address</td><td>Required when action = email</td><td class="def">—</td></tr><tr><td>webhookUrl <span class="req">*</span></td><td>POST target (JSON body)</td><td>Required when action = webhook</td><td class="def">—</td></tr><tr><td>successMessage</td><td>Confirmation shown after submit</td><td>Free text</td><td class="def">"Thank you! …received."</td></tr></tbody></table></div>

<div class="note"><b>Save is blocked</b> until at least one field exists and the required contact (email / webhook) for the chosen action is filled.</div>

---

## Field Types

| Type | Description | Notes |
|------|-------------|-------|
| **text** | Single-line text input | General purpose |
| **email** | Email address input | Validated format; used for verification delivery |
| **phone** | Phone number input | No format restriction |
| **textarea** | Multi-line text area | For longer messages |
| **select** | Dropdown with custom options | Enter each option as a \`{value,label}\` pair |
| **checkbox** | Yes/No toggle | Good for consent or opt-in |

> ⚠️ Every form **must include an email field** for verification and email delivery to work.

---

## Human Verification — Shuffled Keypad

When the visitor clicks **Submit**, a compact **human check modal** appears before the form is sent:

1. Visitor fills in the form and clicks **Submit**
2. Required fields are validated — any errors shown inline
3. A **shuffled numeric keypad** modal appears, showing a randomly generated 6-digit code
4. The visitor must enter that code using the **10-key pad** — digits are displayed in a random order
5. A **countdown timer** (15 seconds) reshuffles the key positions when it expires
6. Correct entry → form is submitted immediately; wrong entry → cleared and reshuffled
7. On successful verification, the form data is forwarded per the submit action

> Verification is fully client-side (no server-side OTP). ⚙️ Email delivery requires SMTP configured in **Admin → Settings → Email & SMTP**.

---

## Manual Form Integration (alternative to the field builder)

If you need full control over the markup — for example inside a **Standalone HTML** page — use the \`data-cms-form\` approach directly:

\`\`\`html
<script src="/cms-forms.js"></script>

<form data-cms-form
      data-source="Contact Us"
      data-email-to="admin@example.com"
      data-success="Thanks! We'll be in touch.">
  <input type="text"  name="name"    data-label="Full Name"     required>
  <input type="email" name="email"   data-label="Email Address" required>
  <textarea           name="message" data-label="Message"></textarea>
  <button type="submit">Send</button>
</form>
\`\`\`

| Attribute | Effect |
|-----------|--------|
| \`data-source\` | Label in the admin email subject (default: page title) |
| \`data-email-to\` | Override the admin notification email |
| \`data-success\` | Success message shown after submission |
| \`data-label\` (on field) | Friendly field name in the admin email |

> Submissions from every form page collect in **Feature Pages & Submissions → the Submissions inbox** (and Content Types → Form Submissions Inbox).
`;

const PAGES_STANDALONE = `
# Standalone HTML Pages

A raw HTML/CSS canvas with no CMS chrome — for pasting design-tool output. A Monaco code editor with five tabs. CMS data is injected at render time through \`{{cms.*}}\` placeholders, so the page still shows live company details, links and images. Payload: \`customHtml\`, \`customCss\`, \`customCssUrls\`, \`mediaSlots\`.

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><div class="mk" style="max-width:660px"><div class="mk-card"><div class="mk-modalhead"><span class="t">&lt;/&gt; Standalone HTML Editor <span class="pill warn">old-promo</span></span><span class="mk-x">✕</span></div><div class="toolbar-strip" style="padding:8px 12px;border-bottom:1px solid #e4e8ef"><span class="tbtn on">▤ HTML</span><span class="tbtn">▤ CSS</span><span class="tbtn">🔗 CSS Files (2)</span><span class="tbtn">🖼 Media (3) ⚠</span><span class="tbtn">{ } Variables</span></div><div style="background:#1e1e1e;color:#9cdcfe;font-family:monospace;font-size:12px;line-height:1.7;padding:14px 16px;min-height:120px"><div style="color:#6a9955">&lt;!-- paste your HTML here --&gt;</div><div>&lt;section class=<span style="color:#ce9178">"hero"</span>&gt;</div><div>&nbsp;&nbsp;&lt;img src=<span style="color:#ce9178">"{{cms.media.hero-bg}}"</span>&gt;</div><div>&nbsp;&nbsp;&lt;h1&gt;<span style="color:#d4d4d4">{{cms.company}}</span>&lt;/h1&gt;</div><div>&lt;/section&gt;</div></div><div class="mk-foot" style="justify-content:space-between"><div style="display:flex;gap:6px"><span class="btn g sm">🔖 Load Template</span><span class="btn g sm">＋ Save as Template</span></div><div style="display:flex;gap:6px"><span class="btn g sm">Cancel</span><span class="btn g sm" style="color:#0d6efd">👁 Preview</span><span class="btn w sm">💾 Save All</span></div></div></div></div></div><div class="fig-cap"><b>Standalone editor</b> — Monaco with HTML / CSS / CSS Files / Media / Variables tabs. The ⚠ on Media flags detected <code>{{cms.media.*}}</code> slots that have no image assigned while the page is enabled.</div></div>

<div class="params scroll-x"><table><caption>The five editor tabs</caption><thead><tr><th>Tab</th><th>What it edits</th><th>Injected as</th></tr></thead><tbody><tr><td>HTML</td><td><code>customHtml</code> — the page body</td><td>Rendered server-side at <code>/{slug}</code></td></tr><tr><td>CSS</td><td><code>customCss</code></td><td>A <code>&lt;style&gt;</code> block in <code>&lt;head&gt;</code>; supports <code>{{cms.*}}</code></td></tr><tr><td>CSS Files</td><td><code>customCssUrls[]</code> — external stylesheets, reorderable</td><td><code>&lt;link rel="stylesheet"&gt;</code> tags, in order; quick-add for Bootstrap / Icons / Tailwind / Animate.css / Font Awesome</td></tr><tr><td>Media</td><td><code>mediaSlots</code> — named image slots</td><td>Auto-detected from <code>{{cms.media.NAME}}</code> in HTML; assign a URL or pick from Media Library</td></tr><tr><td>Variables</td><td>Reference only (click-to-copy)</td><td>Site vars, page links, feature flags, media slots, form injection, JS API</td></tr></tbody></table></div>

<div class="fig render"><span class="tag">Render preview</span><div class="fig-body"><div class="mk" style="max-width:600px;width:100%"><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><div><div class="tnote" style="margin-bottom:6px">AUTHORED (in editor)</div><div style="background:#1e1e1e;color:#d4d4d4;font-family:monospace;font-size:11px;line-height:1.7;padding:10px 12px;border-radius:8px">&lt;h1&gt;{{cms.company}}&lt;/h1&gt;<br>&lt;a href=<span style="color:#ce9178">"{{cms.pages.contact}}"</span>&gt;Contact&lt;/a&gt;<br>&lt;img src=<span style="color:#ce9178">"{{cms.media.hero-bg}}"</span>&gt;</div></div><div><div class="tnote" style="margin-bottom:6px">RENDERED (public page)</div><div style="background:#fff;border:1px solid #e4e8ef;border-radius:8px;padding:12px 14px"><div style="font-weight:700;font-size:15px">Your Company</div><a style="font-size:12px;color:#0d6efd">Contact → /contact</a><div style="margin-top:8px;height:40px;border-radius:6px;background:linear-gradient(135deg,#0d6efd,#7c3aed)"></div></div></div></div></div></div><div class="fig-cap"><b>Variable substitution</b> — <code>{{cms.*}}</code> tokens are replaced at render time with live Site-Config values, resolved page URLs, and assigned slot images.</div></div>

<div class="params scroll-x"><table><caption>Variable families available in Standalone HTML</caption><thead><tr><th>Family</th><th>Example token</th><th>Resolves to</th></tr></thead><tbody><tr><td>Site vars</td><td><code>{{cms.company}}</code>, <code>{{cms.phone}}</code>, <code>{{cms.logo}}</code>…</td><td>Values from Admin → Settings → Site Config (16 vars: company, tagline, phone, email, address, city, postal, country, copyright + 6 socials + logo)</td></tr><tr><td>Page links</td><td><code>{{cms.pages.about}}</code></td><td>The page URL (<code>/about</code>) or <code>#</code> if not published/enabled</td></tr><tr><td>Feature flags</td><td><code>{{cms.features.coverage-maps}}</code></td><td><code>"true"</code> / <code>"false"</code></td></tr><tr><td>Media slots</td><td><code>{{cms.media.hero-bg}}</code></td><td>The image URL assigned to that slot in the Media tab</td></tr><tr><td>Form injection</td><td><code>{{cms.form.contact}}</code></td><td>A complete verified CMS form (auto-includes <code>/cms-forms.js</code>)</td></tr><tr><td>JS API</td><td><code>window.__CMS_SITE</code></td><td>Live object: <code>logoUrl, companyName, phone, email, address, navLinks[]</code></td></tr></tbody></table></div>

<div class="note"><b>Reusable.</b> Standalone content can be saved to / loaded from the Template Library (templateType <code>standalone</code>) for reuse across sites.</div>

## Standalone Pages

Standalone pages are fully **self-contained HTML pages** served at a clean URL. They bypass the CMS layout entirely — no navbar, no footer, no section snap-scroll. An external graphic designer can deliver raw HTML/CSS and you wire it into the CMS in minutes.

**Create via:** Admin → Content → Pages → **Standalone**

---

### The Designer-to-Live Workflow

This is the standard process when a designer hands off a completed HTML page:

**Step 1 — Create the page**
1. Go to **Admin → Content → Pages → New Page → Standalone**
2. Set a slug (e.g. \`home\`, \`services\`, \`landing\`)
3. Click **Save** — the page shell now exists

**Step 2 — Paste the designer's HTML**
1. Click the **Edit (pencil)** button on the new page
2. Paste the full HTML in the **HTML tab**
3. Paste CSS in the **CSS tab** (or leave CSS inside \`<style>\` tags in the HTML)
4. Add any CDN libraries (Bootstrap, fonts, etc.) in the **CSS Files tab**

**Step 3 — Wire up company information (Variables)**
Open the **Variables tab** and replace every hardcoded value with a CMS variable:

| Designer wrote | Replace with |
|----------------|-------------|
| \`"Acme Corp"\` | \`{{cms.company}}\` |
| \`"021 123 4567"\` | \`{{cms.phone}}\` |
| \`"info@acme.co.za"\` | \`{{cms.email}}\` |
| \`"123 Main Road"\` | \`{{cms.address}}\` |
| \`<img src="logo.png">\` | \`<img src="{{cms.logo}}">\` |
| \`"© 2026 Acme"\` | \`{{cms.copyright}}\` |
| \`href="https://facebook.com/..."\` | \`href="{{cms.facebook}}"\` |

**Step 4 — Wire up images (Media tab)**
For every image the designer hardcoded:
1. Open the **Media tab**
2. Click **Add Slot** → enter a descriptive name (e.g. \`hero-bg\`, \`about-photo\`, \`team-1\`)
3. Click **Pick Image** → select or upload from the media library
4. In the HTML, replace \`<img src="designer-image.jpg">\` with \`<img src="{{cms.media.hero-bg}}">\`

Now the image is managed from the Media tab — swap it anytime without touching the HTML.

**Step 5 — Wire up links to features and pages (Variables)**
The Variables tab shows all live CMS pages and enabled features. Replace hardcoded links:

| Designer wrote | Replace with |
|----------------|-------------|
| \`href="/calculator"\` | \`href="{{cms.pages.calculator}}"\` |
| \`href="/projects"\` | \`href="{{cms.pages.projects}}"\` |
| \`href="/contact"\` | \`href="{{cms.pages.contact}}"\` |

If the linked feature is disabled, \`{{cms.pages.calculator}}\` returns \`#\` — the link becomes a no-op, nothing breaks.

**Step 6 — Wire up forms (Variables → Form Injection)**
Replace any hardcoded \`<form>\` with a CMS-managed form that has OTP verification and lead capture:
1. Find the form slug in the **Variables tab → Form Injection** section
2. Delete the designer's \`<form>...</form>\` block entirely
3. Paste \`{{cms.form.contact}}\` where the form was

The CMS renders the full form at page load — OTP verification, email notifications, leads DB — all automatic.

**Step 7 — Set as homepage (optional)**
If this is the main website page:
1. Go to **Settings → Site Config → Homepage Entry Point**
2. Select this page from the dropdown
3. Click **Save** — visitors see this page at \`/\`, internal URL never exposed

**Step 8 — Save and preview**
Click **Save All** in the editor, then **Preview** to verify everything is wired correctly.

---

### The HTML Editor — 5 Tabs

#### HTML Tab
Full Monaco editor (VS Code) with syntax highlighting. Paste or write raw HTML here. Supports \`{{cms.*}}\` variables anywhere.

#### CSS Tab
Custom styles injected as a \`<style>\` block in the page \`<head>\`. Supports \`{{cms.*}}\` variables in values (e.g. \`background: url({{cms.media.hero-bg}})\`).

#### CSS Files Tab
External stylesheets loaded before your HTML renders — linked as \`<link rel="stylesheet">\` tags. Use for CDN libraries: Bootstrap, Font Awesome, Google Fonts, Animate.css.

Quick-add buttons for common libraries are provided.

#### Media Tab
Manage **named image slots** for this page. Each slot is a named reference to a media library item.

**Slots are auto-detected from your HTML.** Any \`{{cms.media.SLOTNAME}}\` token you write in the HTML editor automatically appears as a slot row in this tab — no manual "Add Slot" needed. Slots are additive: auto-detected slots are never removed automatically; delete them manually if no longer needed.

Slots detected from the current HTML show a **from HTML** badge. Manually-added slots (via the "Add Slot" input) work identically.

| Action | How |
|--------|-----|
| Auto-add a slot | Write \`{{cms.media.SLOTNAME}}\` in the HTML editor — it appears here automatically |
| Add a slot manually | Click **Add Slot** → enter name → **Pick Image** |
| Change an image | Click **Pick Image** next to the slot → select new image |
| Delete a slot | Click the trash icon |
| Use in HTML | Copy \`{{cms.media.SLOTNAME}}\` and paste into HTML |

Slot names must be lowercase letters, numbers, hyphens, or underscores. Example: \`hero-bg\`, \`team_photo_1\`, \`carousel-slide-2\`.

> **Warning banner:** If this page is **enabled** (live) and any HTML-detected slot has no image assigned, a yellow warning appears listing the unset slots. The page will render those tokens as blank until images are assigned.

#### Variables Tab
Live reference of every \`{{cms.*}}\` variable available for this page. Click any variable to copy it to the clipboard.

Sections:
- **Company Info** — site config values (company, phone, email, address, logo, social links)
- **Page Links** — \`{{cms.pages.SLUG}}\` for every enabled published page (auto-populated)
- **Feature Flags** — \`{{cms.features.SLUG}}\` for every CMS feature (shows whether enabled)
- **Media Slots** — \`{{cms.media.SLOTNAME}}\` for every slot you've defined in the Media tab
- **Form Injection** — \`{{cms.form.SLUG}}\` for every enabled form page (auto-populated)
- **JS Access** — how to read site data via \`window.__CMS_SITE\` in JavaScript

---

### Complete Variable Reference

#### Company Info
\`\`\`
{{cms.logo}}        Logo image URL
{{cms.company}}     Company name
{{cms.tagline}}     Tagline / slogan
{{cms.phone}}       Phone number
{{cms.email}}       Email address
{{cms.address}}     Street address
{{cms.city}}        City
{{cms.postal}}      Postal / zip code
{{cms.country}}     Country
{{cms.copyright}}   Copyright text
{{cms.facebook}}    Facebook URL
{{cms.instagram}}   Instagram URL
{{cms.twitter}}     Twitter / X URL
{{cms.linkedin}}    LinkedIn URL
{{cms.youtube}}     YouTube URL
{{cms.tiktok}}      TikTok URL
\`\`\`

#### Page Links
\`\`\`
{{cms.pages.SLUG}}  URL of the page at /SLUG (returns # if page not found)

Examples:
{{cms.pages.calculator}}   →  /calculator
{{cms.pages.projects}}     →  /projects
{{cms.pages.contact}}      →  /contact
\`\`\`

#### Feature Flags
\`\`\`
{{cms.features.SLUG}}  "true" or "false" — whether the feature is enabled

Examples:
{{cms.features.concrete-calculator}}   →  "true"
{{cms.features.project-gallery}}       →  "false"
\`\`\`
Use in JavaScript: \`if ("{{cms.features.concrete-calculator}}" === "true") { ... }\`

#### Media Slots
\`\`\`
{{cms.media.SLOTNAME}}  URL of the image assigned to this slot in the Media tab

Examples:
{{cms.media.hero-bg}}        →  /uploads/2026/hero-landscape.jpg
{{cms.media.about-photo}}    →  /uploads/2026/team-photo.jpg
{{cms.media.carousel-1}}     →  /uploads/2026/slide1.jpg
\`\`\`

#### Form Injection
\`\`\`
{{cms.form.SLUG}}  Renders a full CMS form (OTP verified, email notification, leads DB)

Examples:
{{cms.form.contact}}    →  renders the "contact" form page
{{cms.form.quote}}      →  renders the "quote-request" form page
\`\`\`

Place the variable anywhere in your HTML. The CMS injects the complete form HTML server-side. \`/cms-forms.js\` is automatically injected just before \`</body>\` when any form is detected — no manual script tag needed.

---

### Manual Form Integration (alternative to injection)

If you need full control over the form markup and styling, use the \`data-cms-form\` approach directly:

\`\`\`html
<script src="/cms-forms.js"></script>

<form data-cms-form
      data-source="Contact Us"
      data-email-to="admin@example.com"
      data-success="Thanks! We'll be in touch.">
  <input type="text"  name="name"    data-label="Full Name"     required>
  <input type="email" name="email"   data-label="Email Address" required>
  <textarea           name="message" data-label="Message"></textarea>
  <button type="submit">Send</button>
</form>
\`\`\`

**How it works:**
1. User fills in the form and clicks Submit
2. A 6-digit OTP is emailed to the address in the email field
3. An overlay prompt appears asking for the code
4. On success, the form data is sent to **Admin → Leads** and the admin email is notified

| Attribute | Effect |
|-----------|--------|
| \`data-source\` | Label in admin email subject (default: page title) |
| \`data-email-to\` | Override the admin notification email |
| \`data-success\` | Success message shown after submission |
| \`data-label\` (on field) | Friendly field name in the admin email |

---

### Setting as Homepage

When a standalone page is the entire website (not just one route):

1. **Settings → Site Config → Homepage Entry Point**
2. Select this page from the dropdown — shows all enabled pages
3. **Save Configuration**

Visitors hitting \`/\` are served this page transparently. The slug URL is never visible.

To revert: set the dropdown back to "Default: Landing page with sections".

---

### What Standalone Is For

| Use case | Use Standalone |
|----------|---------------|
| External designer delivered a custom HTML page | ✅ Yes |
| Full website from a single HTML file | ✅ Yes |
| CMS-branded pages with editable sections | ❌ Use Full / Designer page |
| Contact form with CMS field builder | ❌ Use Form page |

> Standalone pages are served as a raw HTTP response — they bypass the Next.js layout entirely. No Bootstrap theme, no CMS JS, no global CSS is injected. All CSS frameworks, fonts, and JS libraries must be included in your HTML or linked via the CSS Files tab.

### SEO on Standalone Pages

Even though standalone pages bypass the CMS layout, the **full site SEO pipeline is injected automatically** into the served HTML:

| Injected | Source |
|----------|--------|
| \`<title>\` + meta description | Page SEO fields (Pages → Edit → SEO) — replaces the template's tags when set |
| Canonical link | SEO Settings → Canonical Base URL. The configured homepage canonicalises to \`/\` — even when reached via its slug |
| og: / twitter: meta | Page SEO fields, falling back to site SEO defaults |
| JSON-LD structured data | SEO Settings → Structured Data (when enabled) |
| Head Tags / Body Scripts | Settings → Site Config (GSC verification, pixels, chat widgets) |
| Google Analytics (GA4) | Settings → GA4 Measurement ID |

**No double-injection:** if your template already contains a given tag (e.g. its own \`og:title\` or canonical), the template's version wins and the CMS skips that tag.

**Sitemap:** when a standalone page is set as the homepage, the sitemap lists it only as \`/\` — the duplicate \`/{slug}\` entry is excluded automatically.
`;

const PAGES_FEATURES = `
# Feature Pages & Submissions

Two things share the Pages screen but aren't ordinary pages: **Feature pages** (code-backed routes provided by installed features) and the **Submissions** inbox (form entries collected from every form page).

<div class="fig control"><span class="tag">Control mockup</span><div class="fig-body"><div class="mk-card" style="width:100%"><table class="t"><thead><tr><th>Page</th><th>Type</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody><tr><td><div style="font-weight:600">Concrete Calculator <span class="pill purple">⚙ Feature</span></div><code style="color:#0d6efd">/calculator</code> ↗</td><td><span class="pill purple">⚙ Feature Page</span></td><td><span class="pill green">Enabled</span></td><td><div style="display:flex;gap:4px;justify-content:flex-end"><span class="btn p sm">⚙</span><span class="btn g sm" style="color:#ca8a04">◐</span></div></td></tr><tr><td><div style="font-weight:600">Coverage Maps <span class="pill purple">⚙ Feature</span></div><code style="color:#0d6efd">/coverage</code> ↗</td><td><span class="pill purple">⚙ Feature Page</span></td><td><span class="pill green">Enabled</span></td><td><div style="display:flex;gap:4px;justify-content:flex-end"><span class="btn p sm">⚙</span><span class="btn g sm" style="color:#ca8a04">◐</span></div></td></tr></tbody></table></div></div><div class="fig-cap"><b>Feature pages</b> — purple-badged, code-backed routes. Actions are limited to a settings link (⚙, its own admin screen) and an enable/disable toggle; they cannot be edited, duplicated, or deleted here.</div></div>

<div class="fig control"><span class="tag">Control mockup</span><div class="fig-body"><div class="mk-card" style="width:100%"><div style="padding:10px 14px;border-bottom:1px solid #e4e8ef;font-weight:600">✉ Form Submissions <span class="pill blue">4</span></div><table class="t"><thead><tr><th>Form</th><th>Email</th><th>Data</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody><tr><td><b>Contact Us</b><div class="tnote">/contact</div></td><td class="tnote">jo@buyer.example</td><td class="tnote">name: Jo P<br>message: Please call…<br><span style="color:#8a93a3">+1 more</span></td><td><span class="pill green">sent</span></td><td class="tnote">2026-07-08<br>14:22</td><td><span class="btn g sm" style="color:#dc3545">🗑</span></td></tr><tr><td><b>Quote Request</b><div class="tnote">/quote</div></td><td class="tnote">—</td><td class="tnote">product: Fibre 100</td><td><span class="pill red">failed</span></td><td class="tnote">2026-07-07<br>09:03</td><td><span class="btn g sm" style="color:#dc3545">🗑</span></td></tr></tbody></table></div></div><div class="fig-cap"><b>Submissions inbox</b> — every form-page entry: originating form + slug, submitter email, a 3-key data preview, delivery status (sent / failed / pending), timestamp, and a delete action.</div></div>

<div class="params scroll-x"><table><caption>Built-in feature pages (FEATURE_META)</caption><thead><tr><th>Feature</th><th>Public route</th><th>Settings screen</th></tr></thead><tbody><tr><td>concrete-calculator</td><td><code>/calculator</code></td><td><code>/admin/features/concrete-settings</code></td></tr><tr><td>coverage-maps</td><td><code>/coverage</code></td><td><code>/admin/features/coverage-maps</code></td></tr></tbody></table></div>

<div class="note xref"><b>Cross-reference.</b> The full submissions list, filtering, and export live under <b>Content Types &amp; Blog → Form Submissions Inbox</b>.</div>
`;

const PAGES_LINKING = `
# Linking to Pages (LinkPicker)

Anywhere the CMS asks for a link target — nav items, buttons, cards — it uses the shared **LinkPicker**: one grouped dropdown of every internal target, plus a Custom escape hatch. Authors never hand-type a \`/slug\` or \`#anchor\`.

<div class="fig control"><span class="tag">Control mockup</span><div class="fig-body"><div class="mk" style="max-width:420px;width:100%"><label class="f">Link target</label><div class="mk-card" style="padding:0;overflow:hidden"><div style="padding:8px 11px;border-bottom:1px solid #e4e8ef;color:#8a93a3;font-size:12.5px">Select a link… ▾</div><div style="padding:6px 0"><div style="padding:3px 12px;font-size:11px;color:#8a93a3">Home</div><div style="padding:4px 12px;font-size:10.5px;font-weight:700;color:#0a4bc2;background:#f5f9ff">PAGES</div><div style="padding:4px 18px;font-size:12.5px">About Us</div><div style="padding:4px 12px;font-size:10.5px;font-weight:700;color:#5a34c7;background:#f9f7ff">SECTIONS</div><div style="padding:4px 18px;font-size:12.5px">Home: Hero <span class="tnote">#hero-1</span></div><div style="padding:4px 12px;font-size:10.5px;font-weight:700;color:#12633f;background:#f4fbf6">FORMS</div><div style="padding:4px 18px;font-size:12.5px">Contact Us</div><div style="padding:4px 12px;font-size:10.5px;font-weight:700;color:#8a5a00;background:#fffbf0">DOCUMENTS &amp; PDFS</div><div style="padding:4px 18px;font-size:12.5px">Brochure.pdf</div><div style="padding:4px 12px;font-size:10.5px;font-weight:700;color:#5a34c7;background:#f9f7ff">FEATURES · POLICIES</div><div style="padding:4px 18px;font-size:12.5px;color:#8a93a3">Custom URL / anchor…</div></div></div></div></div><div class="fig-cap"><b>LinkPicker dropdown</b> — targets grouped by source. Empty groups are hidden; picking "Custom" reveals a free-text field. Any existing raw value round-trips (matched → preselected, else shown as Custom).</div></div>

<div class="params scroll-x"><table><caption>LinkPicker groups &amp; what qualifies</caption><thead><tr><th>Group</th><th>Source</th><th>Inclusion rule</th></tr></thead><tbody><tr><td>Pages</td><td>/api/pages</td><td>enabled <b>and</b> status = PUBLISHED, excluding form/pdf types</td></tr><tr><td>Sections</td><td>/api/sections?pageSlug=/</td><td>Home-page section anchors (<code>#id</code>), enabled ≠ false</td></tr><tr><td>Forms</td><td>/api/pages</td><td>type = form <b>and</b> enabled (no publish requirement)</td></tr><tr><td>Documents &amp; PDFs</td><td>/api/pages + /api/media</td><td>PDF pages (enabled) + media library documents</td></tr><tr><td>Features</td><td>/api/features</td><td>enabled features</td></tr><tr><td>Policies</td><td>/api/policies?enabled=true</td><td>enabled policies (empty when plugin off)</td></tr></tbody></table></div>

<div class="note"><b>Key asymmetry.</b> Content pages must be <b>PUBLISHED</b> to appear; forms and PDFs are linkable as soon as they're <b>enabled</b>. Every source degrades to an empty (hidden) group if its API is unavailable.</div>
`;

const PAGES_PUBLISHING_SEO = `
# Publishing & SEO

Every page (any type) has its own SEO panel, reached from the 🔍 row action. It writes SEO columns straight onto the \`Page\` row and shows live Google / Facebook / Twitter previews. Publishing — a separate axis — is what makes content pages linkable and public.

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><div class="mk-card" style="width:100%"><div class="mk-modalhead"><span class="t">🔍 SEO Settings — <span style="color:#8a93a3;font-weight:400">About Us</span></span><span class="mk-x">✕</span></div><div style="display:grid;grid-template-columns:1.4fr 1fr"><div style="padding:16px;border-right:1px solid #e4e8ef"><div class="grp"><label class="f">Meta Title</label><div class="inp"><span class="ph">Blank → use page title</span></div><div class="help" style="color:#198754">0/60 — leave blank to use page title</div></div><div class="grp"><label class="f">Meta Description</label><div class="inp" style="min-height:44px;align-items:flex-start"><span class="ph">Describe this page in 50–160 characters…</span></div><div class="help">0/160 — required for good CTR</div></div><div class="grp"><label class="f">Meta Keywords</label><div class="inp"><span class="ph">keyword1, keyword2</span></div></div><div class="grp"><span class="btn g sm" style="width:100%;justify-content:space-between">↔ Customise social sharing <span>▾</span></span></div><div class="tnote" style="letter-spacing:.05em;margin:6px 0">ADVANCED</div><div class="grp"><label class="f">Canonical URL Override</label><div class="inp"><span class="ph">auto: canonicalBase + /slug</span></div></div><div style="display:flex;gap:20px"><span style="font-size:12px"><b>◉</b> noindex <span class="tnote">hide from Google</span></span><span style="font-size:12px"><b>◉</b> nofollow <span class="tnote">no link authority</span></span></div></div><div style="padding:16px;background:#f6f8fb"><div class="tnote" style="letter-spacing:.05em;margin-bottom:8px">LIVE PREVIEW</div><div class="toolbar-strip" style="margin-bottom:8px"><span class="tbtn on" style="background:#1c2333;border-color:#1c2333">Google</span><span class="tbtn">Facebook</span><span class="tbtn">Twitter</span></div><div style="background:#fff;border:2px solid #198754;border-radius:8px;padding:11px"><div style="font-size:11px;color:#4d5156">yourcompany.example › about-us</div><div style="font-size:16px;color:#1a0dab">About Us</div><div style="font-size:12px;color:#4d5156">Add a meta description to preview it here…</div></div></div></div><div class="mk-foot"><span class="btn g">Close</span><span class="btn p">💾 Save SEO Settings</span></div></div></div><div class="fig-cap"><b>SEO modal</b> — inputs on the left with live character-count colouring, engine previews on the right. Collapsible "Customise social sharing" reveals OG title / description / image overrides.</div></div>

<div class="params scroll-x"><table><caption>SEO fields (written to the Page row)</caption><thead><tr><th>Field</th><th>Function</th><th>Guidance</th><th>Default</th></tr></thead><tbody><tr><td>metaTitle</td><td>&lt;title&gt; / search headline</td><td>Ideal ≤ 60 (warn &gt;60, invalid &gt;70), max 80 chars; blank → page title</td><td class="def">—</td></tr><tr><td>metaDescription</td><td>Search snippet</td><td>50–160 ideal (warn &gt;160, invalid &gt;180), max 300</td><td class="def">—</td></tr><tr><td>metaKeywords</td><td>Comma-separated keywords</td><td>Low ranking impact; internal search</td><td class="def">—</td></tr><tr><td>ogTitle / ogDescription / ogImage</td><td>Social sharing overrides</td><td>Blank → falls back to meta / site-wide OG image</td><td class="def">—</td></tr><tr><td>canonicalUrl</td><td>Canonical override</td><td>Blank → auto <code>canonicalBase + /slug</code></td><td class="def">auto</td></tr><tr><td>noindex</td><td>Exclude from search index</td><td>Switch; shows a red warning when on</td><td class="def"><code>false</code></td></tr><tr><td>nofollow</td><td>Don't pass link authority</td><td>Switch</td><td class="def"><code>false</code></td></tr></tbody></table></div>

<div class="note warn"><b>Only DB-backed pages.</b> The SEO modal refuses to load for a page not yet saved to the database — it shows a warning instead of the form.</div>

<div class="fig diagram"><span class="tag">Diagram</span><div class="fig-body"><svg viewBox="0 0 700 170" role="img" aria-label="Draft to published flow"><rect x="20" y="30" width="150" height="52" rx="9" fill="#fff2d8" stroke="#ffe0a3"/><text x="95" y="52" text-anchor="middle" font-size="13" font-weight="700" fill="#8a5a00">DRAFT</text><text x="95" y="70" text-anchor="middle" font-size="11" fill="#8a5a00">editing sections</text><text x="230" y="52" text-anchor="middle" font-size="12" fill="#8a93a3">Publish ▶</text><text x="230" y="68" text-anchor="middle" font-size="10" font-weight="600" fill="#8a93a3">(PUBLISHER role)</text><rect x="290" y="30" width="150" height="52" rx="9" fill="#e8f7ee" stroke="#bfe6cf"/><text x="365" y="52" text-anchor="middle" font-size="13" font-weight="700" fill="#12633f">PUBLISHED</text><text x="365" y="70" text-anchor="middle" font-size="11" fill="#12633f">configDraft → config</text><rect x="470" y="30" width="210" height="52" rx="9" fill="#e7f0ff" stroke="#cfe0ff"/><text x="575" y="50" text-anchor="middle" font-size="12" font-weight="600" fill="#0a4bc2">public + linkable</text><text x="575" y="68" text-anchor="middle" font-size="11" fill="#0a4bc2">appears in LinkPicker "Pages"</text><path d="M170 56 H286" stroke="#8a93a3" stroke-width="1.5"/><path d="M286 56 l-7 -4 v8 z" fill="#8a93a3"/><path d="M440 56 H466" stroke="#8a93a3" stroke-width="1.5"/><path d="M466 56 l-7 -4 v8 z" fill="#8a93a3"/><rect x="20" y="110" width="660" height="44" rx="8" fill="#fbfcfe" stroke="#e4e8ef"/><text x="34" y="129" font-size="11" font-weight="600" fill="#8a93a3">SEPARATE AXIS</text><text x="34" y="146" font-size="12" fill="#5b6472">enabled toggle (row ◐) can hide a live route independently · homepage flag (⌂) points "/" at any page</text></svg></div><div class="fig-cap"><b>Publish flow</b> — publishing (PUBLISHER role) copies each section's draft config to live and makes a content page linkable. <code>enabled</code> and the homepage flag are independent controls.</div></div>
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

## Navbar Settings (Admin → Content → Navbar)

| Setting | Description |
|---------|-------------|
| **Logo** | Upload or URL for the navbar logo |
| **CTA Button Show** | Toggle — show or hide the CTA button entirely |
| **CTA Button Text** | Label displayed on the button (e.g. "Client Login", "Get a Quote") |
| **CTA Button URL** | Destination link — supports any page or external URL |
| **CTA Button Style** | solid / outlined / ghost |
| **Navbar Background** | Opaque color when scrolled (default: transparent) |

---

## Navbar Style

| Style | Description |
|-------|-------------|
| **Standard** | Single-row navbar — logo + navigation links |
| **Tall** | Two-row navbar — phone number on top row, logo + nav on bottom row |

Toggle between styles at **Admin → Content → Navbar → Navbar Style**.

When **Tall** is selected, the phone number is pulled from **Admin → Settings → Site Config → Contact Details**. If no phone number is set, a warning appears with a link to Site Config.

---

## Navbar Links (Admin → Content → Navbar Links)

Manage which links appear in the navbar and in what order.

| Setting | Description |
|---------|-------------|
| **Show on Navbar** | Toggle — include or exclude this link from the navbar |
| **Drag handle** | Reorder links by dragging (desktop only) |

Links can be section anchors (landing page sections) or custom pages. Order is saved live — the navbar polls for changes every 5 seconds.
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

## Google Integration (Settings → Google Integration)

A guided 5-step wizard for setting up Google OAuth credentials. Required before using Search Console or Google Business Profile features.

### Why this is needed

The CMS integrates directly with Google's APIs (Search Console, Business Profile). Google requires you to register an OAuth 2.0 "app" in Google Cloud Console and provide credentials to your CMS instance. Credentials are encrypted with AES-256-GCM before being stored.

### Prerequisites

Before starting, ensure:
- ✅ A Google account that manages your Search Console property / Business Profile
- ✅ Access to [Google Cloud Console](https://console.cloud.google.com) (free)
- ✅ The \`GSC_ENCRYPTION_KEY\` environment variable is set on your server (64 hex chars)

Generate a key with: \`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"\`

### The 5-Step Wizard

**Step 1 — Overview**
Displays requirements and checks whether \`GSC_ENCRYPTION_KEY\` is configured on the server. A green alert confirms encryption is ready; an amber alert means you must set the env var before proceeding.

**Step 2 — Google Cloud Setup**
Guided links to:
1. Create or select a Google Cloud project at [console.cloud.google.com](https://console.cloud.google.com/projectcreate)
2. Enable all five required APIs: **Google Search Console API**, **My Business Account Management API**, **My Business Business Information API**, **Business Profile Performance API**, and **Google My Business API** (legacy v4 — access-gated; request access via Google's form)
3. Configure the OAuth consent screen (app name, email, add your account as a **Test user**, keep publishing status on **Testing**)

**Step 3 — Create OAuth 2.0 Credentials**
Exact redirect URIs to copy into Google Cloud Console:
- \`https://yourdomain.com/api/seo/gsc/callback\` — for Search Console
- \`https://yourdomain.com/api/gbp/callback\` — for Business Profile

Steps: Credentials page → Create Credentials → OAuth client ID → Web application → paste both URIs.

**Step 4 — Enter Details**
- **Client ID**: validated against the format \`digits-alphanumeric.apps.googleusercontent.com\`
- **Client Secret**: stored encrypted; leave blank to keep an existing saved value
- **CMS Backend Domain**: the domain where this CMS backend runs (where the admin UI and the \`/api/.../callback\` OAuth routes live) — **not** your public website / template domain. Auto-filled from the current URL; the \`/api/seo/gsc/callback\` path is appended automatically. Only change it if the backend is served from a different origin

**Step 5 — Verify & Save**
Review table shows Client ID, masked secret, redirect base, and encryption status. Save button is disabled if encryption is not configured or credentials are incomplete.

After saving, next steps are displayed: go to **SEO → Search Console** to connect your property.

---

## Backup & Restore (Settings → Backup & Restore)

Export and import a full backup of your CMS data including sections, pages, templates, media metadata, site config, and brand tokens. The backup is a downloadable JSON file.

> Database backups (PostgreSQL dumps) must be managed separately at the infrastructure level.

---

## About (Settings → About)

Shows the CMS product name (**BLANK CMS**), current version loaded from \`/public/cms-version.json\`, and developer contact information.

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

---

## Email Appearance

Controls how branded emails look when sent to visitors and admins.

Access via **Admin → Settings → Email & SMTP** — scroll to the **Email Appearance** card.

| Setting | Description |
|---------|-------------|
| **Show Logo** | Displays the site logo at the top of every email |
| **Show Company Name** | Displays the company name below the logo |
| **Subject Prefix** | Optional text prepended to every email subject (e.g. \`[Acme]\`) |
| **Header Tagline** | Short tagline shown beneath the logo/company name in the email header |
| **Footer Text** | Small-print text at the bottom of every email (e.g. reply instructions, unsubscribe note) |

Click **Preview Email** to open a live preview modal showing exactly how a branded submission notification will look with the current appearance settings applied. The preview is generated server-side and reflects your saved appearance values.

> The logo shown in emails is the site logo configured in **General Settings**. Make sure it is a publicly accessible URL (not a local file path) so email clients can load it.
`;

const MEDIA_LIBRARY = `
# Media Library

Access via **Admin → Media Library**.

Manage all images and files used across the site.

---

## Interface

---

## Supported File Types & Limits

| Type | Extensions | Max Size |
|------|-----------|----------|
| Images | .jpg, .jpeg, .png, .gif, .webp | 10 MB (auto-optimised to WebP) |
| Videos | .mp4, .webm, .mov | 200 MB (streamed directly to disk) |
| Documents | .pdf | 10 MB |

> **Images** are automatically resized to max 1920×1080 and converted to WebP (85% quality) on upload. A JPEG fallback is also generated.
>
> **Videos** are stored as-is — no server-side transcoding. Compress before uploading for best performance. Recommended: H.264 MP4, under 50 MB for hero backgrounds.

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

## SEO Score & Automated Audits (Tab: Score)

The **Score** tab gives you a single 0–100 health number plus three sub-scores. An audit runs **automatically every 24 hours** (configurable) and you can trigger one anytime with **Run Audit Now**.

| Sub-score | What it measures | When it shows |
|-----------|------------------|---------------|
| **On-Page Health** | Meta titles/descriptions, duplicates, canonical, structured data, business NAP, GA4/Search Console connected, sitemap | Always |
| **Content & Structure** | Live crawl of your published pages: exactly one H1, content depth (word count), mobile viewport, image alt text, internal linking | After a full audit runs |
| **Performance** | Google Search Console data: pages indexed, average position, CTR, impressions (28 days) | Only when Search Console is connected |

The overall score is a weighted blend of whichever sub-scores are available (On-Page 50%, Content 30%, Performance 20%).

**Regression alerts:** if a scheduled audit detects the score dropping, fewer pages indexed, or more pages with issues, an email is sent to your admin address. Disable or tune the threshold in System Settings (\`seo_alert_enabled\`, \`seo_alert_score_drop\`).

> 💡 The **Content & Structure** crawl needs a reachable **Canonical Base URL** — set it under Site Settings or the crawl is skipped.

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

## Search Console (Tab: Search Console)

Live index status for every published page, powered by the Google Search Console API.

> ⚠️ **Requires Google OAuth credentials** — configure them first at **Settings → Google Integration** (see below).

### Connecting Search Console

1. Go to **Settings → Google Integration** and complete the 5-step wizard
2. Return to **SEO → Search Console** and click **Connect Search Console**
3. Sign in with the Google account that manages your Search Console property
4. Grant permissions — you are redirected back to the CMS
5. Select your **Search Console property** from the dropdown

### What you can do after connecting

| Feature | Description |
|---------|-------------|
| **Page index table** | All published pages with index status, last crawl date, clicks, impressions |
| **Inspect URL** | Run a live Google index inspection on any individual page |
| **Sitemaps panel** | List submitted sitemaps and their processing status |
| **Disconnect** | Remove stored OAuth tokens at any time |

### Index Status Meanings

| Badge | Meaning |
|-------|---------|
| 🟢 Indexed | Page is in Google's index and ranking |
| 🟡 Submitted, not indexed | Google knows the URL but hasn't fully indexed it yet |
| 🔴 Not indexed | Page is blocked or hasn't been crawled |
| ⚪ Unknown | Inspection not yet run |

---

## Business Profile (Tab: Business Profile)

Manage your Google Business Profile listing directly — read reviews, publish posts, and view insights. Requires the same Google OAuth credentials as Search Console.

---

## Google Integration (Tab: Google)

A checklist guiding you through manual Google setup steps (Analytics, Search Console verification, sitemap submission, etc.).

### Google Analytics (GA4)

When you enter a GA4 Measurement ID, the CMS automatically injects the Google Analytics tracking script on all public pages. No code editing required.

1. Go to [Google Analytics](https://analytics.google.com)
2. Create a GA4 property for your site
3. Copy the Measurement ID (starts with \`G-\`)
4. Paste it in the Google tab → GA4 field

### Timeline

After completing all setup steps, Google typically takes **1–4 weeks** to fully index a new site. Monitor progress in Google Search Console → Coverage → Pages.

---

## SEO Overview Tab

The **Overview** tab shows your SEO Engine status:
- Last run timestamp and overall health score
- Page classification breakdown (Protected / Monitored / New)
- Issue groups with severity counts (errors, warnings, info)
- **Run SEO Engine Now** button for an immediate analysis pass

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

<h5 class="mt-4">Filter Presets &amp; Blend Modes</h5>
<table class="table table-sm">
  <thead class="table-light"><tr><th>Setting</th><th>Options</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td><strong>Filter Preset</strong></td><td>none / silhouette / custom</td><td><code>silhouette</code> applies grayscale + high contrast to create a dark shape from any image. <code>custom</code> enables the Custom Filter field.</td></tr>
    <tr><td><strong>Custom Filter</strong></td><td>CSS filter string</td><td>e.g. <code>blur(2px) brightness(1.5)</code> — only active when Filter Preset = custom.</td></tr>
    <tr><td><strong>Mix Blend Mode</strong></td><td>normal / screen / multiply / overlay / soft-light / color-dodge</td><td>Composites the element against the section background. <code>screen</code> makes black transparent — perfect for vehicle or figure silhouettes.</td></tr>
  </tbody>
</table>

<h5 class="mt-4">Horizontal Parallax</h5>
<table class="table table-sm">
  <thead class="table-light"><tr><th>Setting</th><th>Default</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td><strong>Horizontal Parallax</strong></td><td>off</td><td>Element drifts left/right as the section scrolls, creating a cross-axis depth effect.</td></tr>
    <tr><td><strong>Horizontal Amount</strong></td><td>60px</td><td>Total horizontal travel distance (split evenly either side of center).</td></tr>
  </tbody>
</table>

<p>Combine <code>filterPreset: "silhouette"</code> + <code>mixBlendMode: "screen"</code> + horizontal parallax to create dramatic foreground subjects that appear to move against the background.</p>

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
  <li>Click <strong>Features</strong> in the sidebar (dedicated management page at <code>/admin/features</code>)</li>
  <li>Enabled features automatically appear as sub-items in the sidebar for quick access</li>
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
    <tr>
      <td><code>coverage-map</code></td>
      <td>Coverage Map</td>
      <td><span class="badge bg-secondary">OFF</span></td>
      <td>
        Interactive delivery coverage map powered by <strong>Leaflet.js + OpenStreetMap</strong> — no API key required.
        <ul class="mb-0 mt-1">
          <li>Public page at <code>/coverage</code> — gated by this feature flag</li>
          <li>Admin management at <strong>Admin → Features → Coverage Maps</strong></li>
          <li>Multiple named maps (e.g. "Western Cape", "Overberg") each with their own polygon regions and text labels</li>
          <li>Draw/edit delivery region polygons using the built-in polygon editor (Leaflet.Draw)</li>
          <li>Each region: custom name, fill colour, stroke colour, opacity</li>
          <li>Text labels: position anywhere on the map, custom text and font size</li>
          <li><strong>Embeddable</strong> — use the <code>coverage-map</code> block type in any FLEXIBLE section</li>
          <li>Auto-geolocation — zooms to visitor's area and highlights their region</li>
          <li>Search bar — visitor types a town/city name to navigate the map</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>
<p>New features are added here as they are developed. Toggle <strong>Enabled</strong> to activate for the client's deployment.</p>
`;

// ─────────────────────────────────────────────
// COVERAGE MAP
// ─────────────────────────────────────────────

const COVERAGE_MAP_OVERVIEW = `
# Coverage Map — Overview

The Coverage Map feature lets you display interactive delivery/service coverage areas on your website using coloured polygons. Powered entirely by **Leaflet.js + OpenStreetMap** — no Google Maps API key needed, no usage costs.

---

## How It Works

1. **Enable the feature** — Admin → Settings → Client Features → Coverage Map → toggle ON
2. **Create a map** — Admin → Features → Coverage Maps → New Map
3. **Draw regions** — click "Draw Polygon" on any region to open the interactive polygon editor
4. **Add text labels** — position floating labels anywhere on the map
5. **Embed or link** — place a \`coverage-map\` block in any FLEXIBLE section, or link visitors to \`/coverage\`

---

## Feature Flag

The \`/coverage\` public page returns **404 Not Found** when the feature is disabled. Enables instantly — no restart required.

---

## Technology Stack

| Component | Library | Notes |
|-----------|---------|-------|
| Map tiles | OpenStreetMap | Free, no API key |
| Map rendering | Leaflet.js v1.9 | Loaded dynamically (SSR-safe) |
| Polygon editor | Leaflet.Draw | Built-in toolbar: draw, edit, delete |
| Geocoding (search) | Nominatim | Free OpenStreetMap geocoder, SA-biased results |
| Geolocation | Browser \`navigator.geolocation\` | User prompted for permission |

---

## Embeddable Block

Add a \`coverage-map\` block inside any FLEXIBLE section to embed the map on your landing page:

| Prop | Description |
|------|-------------|
| **Map Slug** | The URL slug of the map (set when creating the map) |
| **Height** | Map height in pixels (default 480 px) |

The embedded map shows the full search bar, geolocation button, and clickable regions.
`;

const COVERAGE_MAP_ADMIN = `
# Coverage Map — Admin Management

Access: **Admin → Features → Coverage Maps**

---

## Maps

Each map groups a set of regions and labels. You can have multiple maps (e.g. one per province or service area). On the public \`/coverage\` page, if more than one map is active, tabs appear at the top to switch between them.

| Field | Description |
|-------|-------------|
| **Name** | Map display name (shown as tab label on /coverage) |
| **Slug** | URL-safe identifier — used in the \`coverage-map\` FLEXIBLE block |
| **Default Zoom** | Initial zoom level when the page loads (1–18; towns ≈12, cities ≈10) |
| **Centre Lat / Lng** | Map centre coordinates on first load |
| **Active** | Toggle to show/hide from the public page |

---

## Regions

Each map has multiple regions — each region is a coloured polygon on the map.

| Field | Description |
|-------|-------------|
| **Name** | Region name shown in the sidebar (e.g. "Hermanus") |
| **Color** | Fill colour of the polygon (hex or colour picker) |
| **Stroke Color** | Outline colour of the polygon |
| **Opacity** | Fill opacity 0–100 % |
| **Order** | Display order in the sidebar list |
| **Active** | Show/hide this region |
| **Polygon** | The drawn polygon coordinates — click **Draw / Edit Polygon** |

### Drawing a Polygon

1. Click **Draw / Edit Polygon** on any region
2. A full-screen map modal opens
3. Click the **pentagon toolbar icon** (top-left) to start drawing
4. Click points on the map to define the region boundary
5. **Double-click** the last point to close the polygon
6. Use **Edit layers** in the toolbar to adjust existing points
7. Click **Save Polygon** — the region coordinates are stored immediately

> The polygon editor shows a live point count. You need at least 3 points to save.

---

## Labels

Text labels float above the map at specified coordinates. Use them to name towns, add callouts, or mark key locations.

| Field | Description |
|-------|-------------|
| **Text** | Label text (e.g. "Hermanus", "Next-day delivery") |
| **Lat / Lng** | Map position — you can copy coordinates from Google Maps |
| **Font Size** | Label text size in pixels |
| **Active** | Show/hide this label |

---

## Region Sidebar (Public View)

On the \`/coverage\` page, a sidebar lists all active regions. Clicking a region:
1. Highlights the polygon on the map (bolder stroke, opaque fill)
2. Pans and zooms the map to fit the polygon

The visitor's detected location (via geolocation) also auto-highlights the matching region.
`;

const PROJECTS_GALLERY_DOCS = `
# Projects Gallery

The Projects Gallery displays completed work in a responsive card grid with a full-screen lightbox viewer.

---

## Admin — Managing Projects

Access: **Admin → Features → Projects**

| Field | Description |
|-------|-------------|
| **Title** | Project name (shown on card and lightbox) |
| **Location** | Where the project was completed (shown on card) |
| **Description** | One-paragraph summary (shown on card and lightbox) |
| **Cover Image URL** | Main card image — paste a URL or upload via media manager |
| **Gallery Images** | Additional photos shown in the lightbox viewer (one URL per line) |
| **Completed Date** | Date shown on the card (optional) |
| **Order** | Display order in the grid |
| **Active** | Show/hide from the public gallery |

---

## Embedding on the Landing Page

Add a \`projects-gallery\` block inside any FLEXIBLE section:

| Prop | Description |
|------|-------------|
| **Heading** | Optional heading above the grid (e.g. "Our Projects") |
| **Subtext** | Supporting text beneath the heading |
| **Text Color** | Hex color for heading and subtext |
| **Columns** | Number of grid columns (default 3; responsive on mobile) |

---

## Visitor Experience

- **Card grid** — cover image, title, location badge, truncated description, completed date
- **Click any card** → opens a full-screen lightbox
- **Lightbox** — large cover image, title + description, left/right arrow navigation, counter (1 of N)
- **Gallery images** — thumbnails shown below the main lightbox image; click to jump to that photo
- **Close** — click the × button or press Escape

---

## Image Recommendations

| Use | Recommended Size |
|-----|-----------------|
| Cover image | 800×600 px, landscape |
| Gallery images | 1200×900 px or larger |
| Format | WebP or JPEG for best performance |

> **Tip:** Upload images via Admin → Media Library first, then paste the URL into the project form.
`;

const GALLERY_DOCS = `
# Photo Gallery

The Gallery system organises images into **categories**, each with its own public URL at \`/gallery/[slug]\`.
Visitors can browse all categories via the floating drawer on the right side of every gallery page.

---

## Admin: Content → Gallery

The Gallery admin has a two-panel layout:

| Panel | What it does |
|-------|-------------|
| **Left: Categories** | Create, rename, show/hide, and delete categories |
| **Right: Images** | Add, reorder (drag), caption, and remove images |

### Creating a category

1. Click **New Category** (top-right or the + icon in the left panel).
2. Fill in **Name** — the slug is auto-generated.
3. Optionally add a **Description** (shown on the gallery page).
4. Toggle **Visible on public gallery** to show/hide it.
5. Click **Create Category**.

### Adding images

1. Select a category from the left panel.
2. Click **Add Images**.
3. The Media Picker opens in **multi-select mode** — click multiple images to select (blue tick appears).
4. Click **Add N Images** to confirm.

> Images must be uploaded to the Media Library first (**Admin → Media Library**).

### Reordering images

Drag any image tile to a new position. Order is saved automatically.

### Editing captions & alt text

Click the **pencil icon** on any image tile to edit:
- **Caption** — displayed below the image in the masonry grid and lightbox.
- **Alt text** — overrides the media library alt text for this gallery instance (important for accessibility).

---

## Public Gallery (/gallery/[slug])

Each category renders at its own URL:
- **Masonry grid** — responsive columns layout.
- **Lightbox** — click any image to open a full-screen viewer. Navigate with arrow keys or on-screen buttons.
- **Floating drawer** — click "Categories" tab on the right edge to jump to another category.

The \`/gallery\` root URL automatically redirects to the first active category.

---

## Gallery CTA Block (Flexible Designer)

The **Gallery CTA** block adds an eye-catching call-to-action section with a parallax photo collage background pulled live from your gallery.

Add it in the **Flexible Designer** → palette → **Gallery CTA**.

### Props

| Prop | Description |
|------|-------------|
| **Heading** | Main heading text |
| **Accent word** | One word in the heading to highlight with the accent colour |
| **Subtext** | Supporting paragraph |
| **Button text** | CTA button label (default: "View Gallery") |
| **Button URL** | Where the button links (default: /gallery) |
| **Category slug** | Which category's images to use for the collage background |
| **Stat 1 / Stat 2** | Two stat chips (value + label) shown above the heading |
| **Accent colour** | Highlight colour for the accent word, stats, and button |
| **Overlay opacity** | Darkness of the overlay on the collage (0–100) |

> **Desktop:** Images drift with mouse parallax.
> **Mobile:** Images auto-drift gently.

---

## Image size recommendations

| Use | Recommended size |
|-----|-----------------|
| Gallery images | 1600×1200 px or larger |
| Thumbnails | Automatically used if generated by upload |
| Format | WebP or JPEG |
`;


// ─────────────────────────────────────────────
// VOLT DESIGNER
// ─────────────────────────────────────────────

const VOLT_OVERVIEW = `
# Volt Designer — Overview

Volt Designer is the visual vector-canvas editor for creating **reusable UI elements** (buttons, cards, banners, input skins, widgets) that can be embedded in any CMS section.

Elements are stored as JSON and rendered natively in the browser — no raster images, infinite resolution. You reach it from the Flexible Designer's Block Library (**⚡ Volt → Create New Volt**) or the Volt library, then place the result as a \`volt\` block in a Flexible section. The interface is a classic three-column studio — tool palette and stage in the centre, panels left and right, and an animation timeline docked below.

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><svg viewBox="0 0 640 358" font-family="system-ui" font-size="10"><rect x="10" y="10" width="620" height="28" rx="6" fill="#0f1626"/><text x="24" y="29" fill="#fff" font-weight="700" font-size="11">Volt <tspan fill="#8fb3ff">Designer</tspan></text><rect x="150" y="15" width="70" height="18" rx="9" fill="#243049"/><text x="185" y="27" text-anchor="middle" fill="#cdd7ee" font-size="8">● unsaved</text><text x="356" y="28" fill="#cdd7ee" font-size="8.5">🖥 ▭ 📱 · ↺ ↻ 🗑</text><rect x="506" y="14" width="44" height="20" rx="5" fill="#0d6efd"/><text x="528" y="28" text-anchor="middle" fill="#fff" font-size="9">Save</text><rect x="556" y="14" width="66" height="20" rx="5" fill="#243049"/><text x="589" y="28" text-anchor="middle" fill="#cdd7ee" font-size="8.5">← Library</text><rect x="10" y="46" width="126" height="300" rx="7" fill="#fff" stroke="#e4e8ef"/><text x="20" y="60" fill="#8a93a3" font-size="8">ELEMENT PROPERTIES</text><rect x="18" y="65" width="110" height="10" rx="2" fill="#f6f8fb"/><text x="20" y="90" fill="#8a93a3" font-size="8">CANVAS SIZE</text><rect x="18" y="95" width="110" height="10" rx="2" fill="#f6f8fb"/><text x="20" y="120" fill="#8a93a3" font-size="8">LAYERS</text><rect x="18" y="125" width="110" height="9" rx="2" fill="#eef2ff"/><rect x="18" y="137" width="110" height="9" rx="2" fill="#f6f8fb"/><rect x="18" y="149" width="110" height="9" rx="2" fill="#f6f8fb"/><text x="20" y="176" fill="#8a93a3" font-size="8">BOOLEAN OPS</text><rect x="18" y="181" width="35" height="14" rx="3" fill="#f6f8fb" stroke="#e4e8ef"/><text x="35" y="191" text-anchor="middle" font-size="7.5" fill="#5b6472">Union</text><rect x="56" y="181" width="28" height="14" rx="3" fill="#f6f8fb" stroke="#e4e8ef"/><text x="70" y="191" text-anchor="middle" font-size="7.5" fill="#5b6472">Sub</text><rect x="87" y="181" width="41" height="14" rx="3" fill="#f6f8fb" stroke="#e4e8ef"/><text x="107" y="191" text-anchor="middle" font-size="7.5" fill="#5b6472">Isect</text><text x="20" y="220" fill="#8a93a3" font-size="8">3D OBJECTS</text><rect x="18" y="225" width="110" height="14" rx="3" fill="#f6f8fb"/><text x="73" y="235" text-anchor="middle" font-size="7.5" fill="#5b6472">Browse / Place 3D</text><text x="20" y="264" fill="#8a93a3" font-size="8">IMAGES</text><rect x="18" y="269" width="110" height="14" rx="3" fill="#f6f8fb"/><text x="73" y="279" text-anchor="middle" font-size="7.5" fill="#5b6472">Browse / Place Image</text><rect x="144" y="46" width="344" height="22" rx="5" fill="#1c2333"/><text x="152" y="60" fill="#cdd7ee" font-size="9" letter-spacing="1">V  R  E  L  P  B  T</text><rect x="226" y="49" width="48" height="16" rx="4" fill="#2a3550"/><text x="250" y="60" text-anchor="middle" fill="#cdd7ee" font-size="7.5">Slot · TIT</text><text x="284" y="60" fill="#8fb3ff" font-size="7.5">SHP GRD ICN CMP</text><rect x="390" y="49" width="40" height="16" rx="4" fill="#0d6efd"/><text x="410" y="60" text-anchor="middle" fill="#fff" font-size="7.5">REST</text><rect x="434" y="49" width="46" height="16" rx="4" fill="#2a3550"/><text x="457" y="60" text-anchor="middle" fill="#cdd7ee" font-size="7.5">HOVER</text><rect x="144" y="72" width="344" height="190" rx="6" fill="#f6f8fb" stroke="#e4e8ef"/><text x="480" y="86" text-anchor="end" fill="#8a93a3" font-size="8">Stage / artboard · 800×500</text><rect x="180" y="98" width="150" height="42" rx="5" fill="#fff" stroke="#bcd4ff" stroke-dasharray="3 3"/><text x="255" y="123" text-anchor="middle" fill="#0a4bc2" font-size="9">Title slot</text><rect x="180" y="150" width="200" height="30" rx="5" fill="#fff" stroke="#bcd4ff" stroke-dasharray="3 3"/><text x="280" y="169" text-anchor="middle" fill="#5b6472" font-size="9">Body slot</text><rect x="180" y="190" width="86" height="24" rx="12" fill="#e7f0ff" stroke="#bcd4ff"/><text x="223" y="206" text-anchor="middle" fill="#0a4bc2" font-size="9">Action slot</text><rect x="152" y="236" width="96" height="16" rx="8" fill="#fff" stroke="#e4e8ef"/><text x="200" y="248" text-anchor="middle" fill="#5b6472" font-size="8">−  100%  +  Fit</text><rect x="496" y="46" width="134" height="216" rx="7" fill="#fff" stroke="#e4e8ef"/><text x="506" y="60" fill="#8a93a3" font-size="8">LAYER PROPERTIES</text><rect x="504" y="66" width="118" height="58" rx="4" fill="#f6f8fb"/><rect x="504" y="130" width="118" height="42" rx="4" fill="#f6f8fb"/><rect x="504" y="178" width="118" height="76" rx="4" fill="#f6f8fb"/><rect x="144" y="270" width="486" height="76" rx="7" fill="#fff" stroke="#e4e8ef"/><text x="156" y="285" fill="#8a93a3" font-size="8">TIMELINE</text><text x="230" y="285" fill="#5b6472" font-size="7.5">＋Key −Key · ▶ ■ · 3000ms · Trigger · Loop</text><line x1="270" y1="294" x2="620" y2="294" stroke="#e4e8ef"/><rect x="156" y="302" width="104" height="12" rx="2" fill="#f6f8fb"/><text x="161" y="311" fill="#5b6472" font-size="7">Layer 1</text><rect x="156" y="318" width="104" height="12" rx="2" fill="#f6f8fb"/><text x="161" y="327" fill="#5b6472" font-size="7">Layer 2</text><rect x="300" y="304" width="8" height="8" fill="#0d6efd" transform="rotate(45 304 308)"/><rect x="360" y="320" width="8" height="8" fill="#0d6efd" transform="rotate(45 364 324)"/><line x1="332" y1="298" x2="332" y2="342" stroke="#e2001a" stroke-width="1.2"/></svg></div><div class="fig-cap"><b>Volt Studio layout</b> — top action bar (brand, breakpoints, undo/redo, Save, ← Library); <b>left panels</b> Element Properties · Canvas Size · Layers · Boolean Ops · 3D Objects · Images; <b>centre</b> tool palette (Select V · Rect R · Ellipse E · Line L · Polygon P · Pen B · Text T · Slot, plus SHP/GRD/ICN/CMP presets and a <b>REST / HOVER</b> state switch) over the stage; <b>right</b> Layer Properties; <b>below</b> a keyframe Timeline with playhead.</div></div>

<div class="fig-note"><b>Volt has its own full package.</b> This map is a summary so Landing Page authors know where Volt fits — build a graphic in Volt, then place it as a <code>volt</code> block in a Flexible section. The complete Volt walkthrough (slots, states, boolean shape ops, 3D objects and the animation timeline) is documented in the following Volt topics. <span style="color:#5b6472">(Interface note: the on-screen brand reads "Volt Designer"; the Flexible canvas likewise brands itself "Layout Designer".)</span></div>

---

## Top Bar

The persistent header. The left side identifies the element being edited; the right side holds the live canvas size, the responsive-breakpoint switcher, history, and the three commit actions. **Save / Done** post messages to the parent CMS window; a standalone window auto-saves to \`localStorage("volt_autosave")\`.

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><svg viewBox="0 0 640 74" font-family="system-ui" font-size="10"><rect x="8" y="10" width="624" height="30" rx="7" fill="#0f1626"/><text x="20" y="29" fill="#fff" font-weight="700" font-size="10">Volt <tspan fill="#8fb3ff">Designer</tspan></text><rect x="96" y="15" width="66" height="20" rx="5" fill="#243049"/><text x="129" y="29" text-anchor="middle" fill="#cdd7ee" font-size="8">New Design</text><rect x="168" y="15" width="66" height="20" rx="10" fill="#3a2f0a"/><text x="201" y="29" text-anchor="middle" fill="#f0c24b" font-size="8">● unsaved</text><text x="300" y="29" fill="#8a93a3" font-size="8">800×500px</text><text x="360" y="29" fill="#cdd7ee" font-size="9">🖥 ▭ 📱</text><text x="430" y="29" fill="#cdd7ee" font-size="9">↺ ↻</text><rect x="470" y="14" width="22" height="22" rx="5" fill="#3a1420"/><text x="481" y="29" text-anchor="middle" fill="#f08" font-size="9">🗑</text><rect x="498" y="14" width="46" height="22" rx="5" fill="#0d6efd"/><text x="521" y="29" text-anchor="middle" fill="#fff" font-size="8">💾 Save</text><rect x="550" y="14" width="74" height="22" rx="5" fill="#166534"/><text x="587" y="29" text-anchor="middle" fill="#dcfce7" font-size="8">← Library</text><g font-weight="700" font-size="8.5"><circle cx="129" cy="52" r="6.5" fill="#e2001a"/><text x="129" y="55" text-anchor="middle" fill="#fff">1</text><circle cx="201" cy="52" r="6.5" fill="#e2001a"/><text x="201" y="55" text-anchor="middle" fill="#fff">2</text><circle cx="300" cy="52" r="6.5" fill="#0d6efd"/><text x="300" y="55" text-anchor="middle" fill="#fff">3</text><circle cx="360" cy="52" r="6.5" fill="#0d6efd"/><text x="360" y="55" text-anchor="middle" fill="#fff">4</text><circle cx="430" cy="52" r="6.5" fill="#0d6efd"/><text x="430" y="55" text-anchor="middle" fill="#fff">5</text><circle cx="481" cy="52" r="6.5" fill="#e2001a"/><text x="481" y="55" text-anchor="middle" fill="#fff">6</text><circle cx="521" cy="52" r="6.5" fill="#e2001a"/><text x="521" y="55" text-anchor="middle" fill="#fff">7</text><circle cx="587" cy="52" r="6.5" fill="#e2001a"/><text x="587" y="55" text-anchor="middle" fill="#fff">8</text></g></svg></div><div class="fig-cap"><b>Callouts —</b> <b>1</b> element name badge · <b>2</b> unsaved indicator · <b>3</b> live canvas size · <b>4</b> breakpoint switcher · <b>5</b> undo/redo · <b>6</b> delete layer · <b>7</b> Save · <b>8</b> Done (← Library).</div></div>

| Control | Function | Options / range | Default & use case |
|---------|----------|-----------------|--------------------|
| Element name badge | Displays current design name | text mirror of \`el-name\` | "New Design" · orient which element you're editing |
| Unsaved indicator | Dirty-state flag | shown / hidden | hidden · know when a Save is pending |
| Canvas size label | Live artboard dimensions | \`W×Hpx\` | 800×500px |
| Breakpoint switcher | Desktop / Tablet / Mobile | \`data-bp\` desktop/tablet/mobile | hidden until breakpoints defined; swaps width + per-layer overrides |
| Undo / Redo | Step through history | \`Ctrl+Z\` / \`Ctrl+Y\` · \`Ctrl+Shift+Z\` | 50-step ring buffer |
| Delete layer | Remove selected layer | \`Del\` / \`Backspace\` | disabled without selection |
| Save | Persist to parent CMS | postMessage \`VOLT_DESIGNER_SAVE\` | disabled unless dirty; marks clean |
| Done (← Library) | Commit & exit to library | postMessage \`VOLT_DESIGNER_DONE\` | finish editing session |

> **Note:** there is no explicit "mood" or "public" control in the top bar — those live in the left **Element Properties** panel. There is no separate "Code" button in this build; the top-bar right cluster is exactly the eight items above.

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

A horizontal **tool palette** sits at the top of the canvas area. Primary drawing tools are on the left (each with a single-key shortcut), then a separator, then four **library** launchers (SHP / GRD / ICN / CMP). The **REST / HOVER** state switcher sits at the far right of the strip.

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><svg viewBox="0 0 640 96" font-family="system-ui" font-size="10"><rect x="8" y="10" width="624" height="34" rx="7" fill="#1c2333"/><g fill="#cdd7ee" font-size="11" font-weight="700"><rect x="16" y="16" width="22" height="22" rx="4" fill="#0d6efd"/><text x="27" y="31" text-anchor="middle" fill="#fff">▤</text><text x="52" y="31" text-anchor="middle">▭</text><text x="76" y="31" text-anchor="middle">◯</text><text x="100" y="31" text-anchor="middle">╱</text><text x="124" y="31" text-anchor="middle">⬠</text><text x="148" y="31" text-anchor="middle">✎</text><text x="172" y="31" text-anchor="middle">T</text></g><rect x="188" y="16" width="52" height="22" rx="4" fill="#2a3550"/><text x="214" y="31" text-anchor="middle" fill="#7ee0a8" font-size="8">▤ TIT ▾</text><line x1="248" y1="16" x2="248" y2="38" stroke="#3a475f"/><rect x="256" y="16" width="34" height="22" rx="4" fill="#2a3550"/><text x="273" y="31" text-anchor="middle" fill="#8fb3ff" font-size="8">SHP</text><rect x="294" y="16" width="34" height="22" rx="4" fill="#2a3550"/><text x="311" y="31" text-anchor="middle" fill="#f0b24b" font-size="8">GRD</text><rect x="332" y="16" width="32" height="22" rx="4" fill="#2a3550"/><text x="348" y="31" text-anchor="middle" fill="#4fd1a0" font-size="8">ICN</text><rect x="368" y="16" width="34" height="22" rx="4" fill="#2a3550"/><text x="385" y="31" text-anchor="middle" fill="#c4a8f5" font-size="8">CMP</text><rect x="520" y="16" width="46" height="22" rx="4" fill="#0d6efd"/><text x="543" y="31" text-anchor="middle" fill="#fff" font-size="8">REST</text><rect x="570" y="16" width="54" height="22" rx="4" fill="#2a3550"/><text x="597" y="31" text-anchor="middle" fill="#cdd7ee" font-size="8">HOVER</text><g font-weight="700"><circle cx="27" cy="54" r="7" fill="#e2001a"/><text x="27" y="57" text-anchor="middle" fill="#fff" font-size="9">1</text><circle cx="214" cy="54" r="7" fill="#e2001a"/><text x="214" y="57" text-anchor="middle" fill="#fff" font-size="9">2</text><circle cx="273" cy="54" r="7" fill="#0d6efd"/><text x="273" y="57" text-anchor="middle" fill="#fff" font-size="9">3</text><circle cx="311" cy="54" r="7" fill="#0d6efd"/><text x="311" y="57" text-anchor="middle" fill="#fff" font-size="9">4</text><circle cx="385" cy="54" r="7" fill="#0d6efd"/><text x="385" y="57" text-anchor="middle" fill="#fff" font-size="9">5</text><circle cx="543" cy="54" r="7" fill="#e2001a"/><text x="543" y="57" text-anchor="middle" fill="#fff" font-size="9">6</text></g></svg></div><div class="fig-cap"><b>Callouts —</b> <b>1</b> drawing tools (Select · Rect · Ellipse · Line · Polygon · Pen · Text); the Select caret ▾ toggles Auto-select / Sticky. <b>2</b> Slot tool + type caret (picks one of 8 slot types; tag shows current type). <b>3</b> SHP shape presets. <b>4</b> GRD gradient presets. <b>5</b> ICN Bootstrap-icon library / CMP saved components. <b>6</b> REST / HOVER state switcher (artboard gets an amber outline in HOVER).</div></div>

## Every tool & library launcher

| Tool | Key | What it does | Notes |
|------|-----|--------------|-------|
| Select & Move | \`V\` | Pick, move, resize, rotate; marquee multi-select | caret ▾ → Auto-select vs Sticky tool |
| Rectangle | \`R\` | Drag a rectangle | \`Shift\` = square, \`Ctrl\` = snap to grid |
| Ellipse | \`E\` | Drag an ellipse | \`Shift\` = circle |
| Line | \`L\` | Drag a straight stroke (no fill) | 2px round-cap stroke, role = accent |
| Polygon | \`P\` | Click to add points, close to commit | \`Enter\`/dblclick close, \`Backspace\` undo pt |
| Pen / Bezier | \`B\` | Click = sharp anchor, drag = curve anchor | near start closes; \`Enter\` commits open path |
| Text | \`T\` | Place a full CSS text layer | double-click on canvas to edit inline |
| Slot | \`S\` | Draw a content placeholder region | caret ▾ picks type; default TITle |
| SHP presets | — | Insert one of 23 preset shapes | centred, 40% of shorter dim, structure role |
| GRD presets | — | Apply a curated gradient to fill | 12 presets with angle |
| ICN library | — | Search + insert a Bootstrap icon | 6-col grid, live search box |
| CMP components | — | Insert a saved reusable component | fetched from \`/api/volt-elements?type=component\` |
| REST state | — | Edit base layer values | default active |
| HOVER state | — | Edit hover-override values | writes to hover state; amber artboard outline |

> **Select-tool behaviour caret:** **Auto-select** (default) returns to Select after each shape is drawn; **Sticky tool** keeps the current draw tool active for repeated shapes. The chosen mode persists on \`element.toolMode\`.

<div class="fig-note">The palette also surfaces transient badges next to the tools: a <b>✂ Bool Edit Mode</b> pill (while moving a cutter), a green <b>👁 Preview</b> toggle (only when slot layers exist), and a <b>FACE: Front / Back</b> switcher (only when Flip Card is enabled on the element).</div>

---

### SHP — the 23 built-in shapes

Click the **SHP** button to open the preset grid. Each is a normalised 0–100 path scaled to the canvas, dropped **centred at 40% of the shorter side** as a fully editable vector layer (structure role). Grouped roughly into directional, symbolic, geometric, and banner/label families:

| | | | |
|---|---|---|---|
| Arrow Right | Arrow Left | Double Arrow | Star |
| Heart | Diamond | Triangle Up | Triangle Down |
| Chevron | Plus | Hexagon | Octagon |
| Pentagon | Shield | Callout | Tag |
| Banner ↓ | Banner ↑ | Ribbon | Wave |
| Pill | Badge | Speech Bubble | |

### GRD — the 12 gradient presets

Applied to the selected vector's fill (each carries an angle): **Indigo Violet · Aurora · Sunset · Ocean · Emerald · Rose Gold · Midnight · Solar · Candy · Forest · Flame (3-stop) · Arctic.**

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

## Left Sidebar Panels

The left sidebar is a stack of collapsible accordion panels. Click a header to open/close; the whole sidebar collapses via the edge toggle.

| Panel | What it holds |
|-------|---------------|
| **Element Properties** | Name, Type (Custom / Button / Input / Card / Badge / Icon / Divider / Hero Element), Mood (None / Energetic / Calm / Bold / Playful / Minimal / Immersive), and a **Public** switch |
| **Canvas Size** | 10 presets, manual W/H (32–4096px), Apply Size, **Fit Layers** (scale all layers to fit + 5% pad), Grid Size (1–200px) |
| **Layers** | Role-badged rows with visibility & lock toggles, drag-to-reorder, inline rename, Group button; count badge in header |
| **Boolean Ops** | Union / Subtract / Intersect on 2+ selected shapes |
| **3D Objects** | "Browse / Place 3D Object" — opens the GLB/GLTF/FBX/OBJ viewer modal |
| **Images** | "Browse / Place Image" — opens the media picker (Library + Unsplash + paste-URL) |

---

## Layers Panel

Every shape, slot, or 3D object is a **layer**. Layers are listed in the **Layers** panel with a role badge, an eye toggle, a lock toggle, an inline rename, and are draggable to reorder.

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><svg viewBox="0 0 420 150" font-family="system-ui" font-size="10"><rect x="8" y="8" width="404" height="30" rx="6" fill="#fff" stroke="#e4e8ef"/><text x="18" y="27" fill="#343a40" font-weight="700" font-size="10">☰ Layers</text><rect x="92" y="16" width="18" height="14" rx="7" fill="#64748b"/><text x="101" y="26" text-anchor="middle" fill="#fff" font-size="8">3</text><text x="398" y="27" text-anchor="end" fill="#8a93a3">▾</text><rect x="8" y="44" width="404" height="30" rx="6" fill="#eef2ff" stroke="#c7d2fe"/><rect x="16" y="52" width="26" height="14" rx="3" fill="#6366f1"/><text x="29" y="62" text-anchor="middle" fill="#fff" font-size="8">STR</text><text x="50" y="62" fill="#1c2333" font-size="9.5">Rectangle</text><text x="360" y="62" fill="#5b6472" font-size="10">👁</text><text x="388" y="62" fill="#f59e0b" font-size="10">🔒</text><rect x="8" y="80" width="404" height="30" rx="6" fill="#fff" stroke="#e4e8ef" opacity="0.5"/><rect x="16" y="88" width="26" height="14" rx="3" fill="#22c55e"/><text x="29" y="98" text-anchor="middle" fill="#fff" font-size="8">SLT</text><text x="50" y="98" fill="#1c2333" font-size="9.5">Title Slot</text><text x="360" y="98" fill="#5b6472" font-size="10">👁⃠</text><text x="388" y="98" fill="#5b6472" font-size="10">🔒</text><rect x="8" y="116" width="404" height="28" rx="6" fill="#fff" stroke="#e4e8ef"/><rect x="16" y="123" width="26" height="14" rx="3" fill="#f59e0b"/><text x="29" y="133" text-anchor="middle" fill="#fff" font-size="8">ACC</text><text x="50" y="133" fill="#1c2333" font-size="9.5">Accent Line</text><text x="360" y="133" fill="#5b6472" font-size="10">👁</text><text x="388" y="133" fill="#5b6472" font-size="10">🔒</text></svg></div><div class="fig-cap"><b>Top of the list renders in front (highest z).</b> Rows carry a role badge, an eye toggle (dims the row when hidden), an amber padlock lock, and an inline rename. A hidden row is shown dimmed (middle). The header count badge shows the layer total.</div></div>

| Layers · control | Function | Options / range | Default |
|------------------|----------|-----------------|---------|
| Row | Select (works even when occluded on canvas) | click = select, dbl-click name = rename, drag = reorder | — |
| Drag order | Reorder → z-order | **top of list = front** | — |
| Visibility | Show / hide layer | eye toggle → \`layer.visible\`; hidden rows dim | visible |
| Lock | Prevent canvas selection/edit | amber padlock → \`layer.locked\`; still reachable in this panel | unlocked |
| Group | Group ≥2 selected layers | \`Ctrl+G\` | — |

> **Role badges** (colour): background \`#64748b\` · structure \`#6366f1\` · accent \`#f59e0b\` · content \`#22c55e\` · overlay \`#ec4899\`. The header shows a short badge (STR/SLT/ACC…). Grouping folds layers into accordion group-rows; cutters are hidden except while their base is in Bool-Edit mode.

---

## Selecting Layers

| Action | Result |
|--------|--------|
| Click shape on canvas | Select that layer |
| Click layer row | Select that layer (even if occluded on canvas) |
| Click again, same spot | **Dig downward** — selects the next layer beneath (cycles round the stack) |
| Click over locked/hidden | Ignored — the click passes through to what's beneath |
| **Del** | Delete selected layer |
| **Alt + drag** | Duplicate and drag |
| **Ctrl+Z** / **Ctrl+Y** | Undo / Redo |

### Occluded & pass-through selection

Hit-testing skips both **hidden** and **locked** layers, so they never intercept a click — it falls through to whatever is beneath. When shapes stack, **repeated clicks at the same point cycle the selection downward** through the stack (tracked via \`_hitCyclePt\`, within ~4px). \`Alt\` is **not** used for this — it is reserved for vertex add/delete. To reach a locked layer, select its row in the Layers panel.

### Marquee Select

- Click and drag on **empty canvas** area to draw a marquee rectangle
- All layers whose bounding boxes overlap the marquee are selected as a multi-selection

---

## Layer Types

| Type | Icon | Description |
|------|------|-------------|
| **vector** | STR/ACC/BG | SVG path layer (rect, ellipse, polygon, pen path) |
| **slot** | SLT | Content slot placeholder |
| **image** | IMG | Raster image layer (photo, texture, illustration) |
| **3d-object** | 3D | Three.js 3D asset |

### Image Layers

Click **Images → Browse / Place Image** in the left sidebar to insert an image layer.

- **Browse / Change** — opens the media library picker (thumbnail grid of all uploaded images)
- **Paste URL** — type or paste any image URL directly
- **Fill** — image covers the layer bounds (crops to fit, no letterbox)
- **Fit** — image scales to fit inside layer bounds (letterbox, no crop)
- **Crop** — same as Fill; use resize handles to control which part is visible
- **Alt text** — set descriptive alt text for accessibility

Image layers participate in the **animation** and **hover state** systems exactly like vector layers — you can fade, scale, or translate them using the Animation panel and State overrides.

### Roles

Each layer has a **role** that indicates its semantic purpose. Role does **not** affect rendering order (that's controlled by zIndex) — it controls the **animation stagger order** when multiple layers animate together on hover/focus/active states.

| Role | Meaning | Stagger order |
|------|---------|---------------|
| **accent** | Decorative / highlight shape | 1st — fires first |
| **structure** | Main shape / structural element | 2nd |
| **overlay** | Overlaid on top of other content | 3rd |
| **background** | Background fill / texture | 4th |
| **content** | Text content area / slot | 5th — fires last |

**Example:** On hover, accent shapes pop in first, then the structural shape expands, then the content fades in — creating a layered entrance effect.

> **Rule of thumb:** Use **accent** for decorative details you want to react first, **background** for the base fill, **content** for anything that holds readable text or slot data.

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

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><svg viewBox="0 0 420 190" font-family="system-ui" font-size="10"><rect x="8" y="8" width="404" height="174" rx="8" fill="#dee2e6"/><polygon points="90,55 320,45 340,150 80,140" fill="#6366f1" fill-opacity="0.18" stroke="#6366f1" stroke-width="1.5"/><line x1="320" y1="45" x2="368" y2="28" stroke="#6366f1" stroke-width="1"/><circle cx="368" cy="28" r="6" fill="#fff" stroke="#6366f1" stroke-width="1.5"/><rect x="84" y="49" width="12" height="12" fill="#fff" stroke="#6366f1" stroke-width="1.5"/><rect x="314" y="39" width="12" height="12" fill="#0d6efd" stroke="#fff" stroke-width="1.5"/><rect x="334" y="144" width="12" height="12" fill="#fff" stroke="#6366f1" stroke-width="1.5"/><rect x="74" y="134" width="12" height="12" fill="#fff" stroke="#6366f1" stroke-width="1.5"/><rect x="120" y="150" width="180" height="24" rx="12" fill="#fff" stroke="#e4e8ef"/><text x="150" y="166" text-anchor="middle" fill="#64748b" font-size="9" font-weight="700">ROUND</text><rect x="185" y="160" width="70" height="4" rx="2" fill="#e4e8ef"/><text x="270" y="166" text-anchor="middle" fill="#6366f1" font-size="9" font-weight="700">0%</text><text x="295" y="166" fill="#64748b" font-size="10">↺</text><g font-weight="700" font-size="8.5"><circle cx="72" cy="42" r="7" fill="#e2001a"/><text x="72" y="45" text-anchor="middle" fill="#fff">1</text><circle cx="378" cy="20" r="7" fill="#e2001a"/><text x="378" y="23" text-anchor="middle" fill="#fff">2</text><circle cx="305" cy="162" r="7" fill="#e2001a"/><text x="305" y="165" text-anchor="middle" fill="#fff">3</text></g></svg></div><div class="fig-cap"><b>Callouts —</b> <b>1</b> anchor points (white squares; the active anchor is filled blue) · <b>2</b> Bezier handle (drag to curve; \`Shift\`+drag keeps handles symmetric) · <b>3</b> ROUND bar (slider 0–45 rounds all corners uniformly; ↺ resets to 0%). The path is stored as rich anchors that preserve \`cpIn/cpOut\` Bezier handles.</div></div>

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

The Slot tool's caret picks the type before you draw; each type carries a colour tag and a "maps to field" hint. Change the type after drawing from the **Slot Type** dropdown in Layer Properties.

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><svg viewBox="0 0 420 176" font-family="system-ui" font-size="10"><rect x="8" y="8" width="404" height="70" rx="8" fill="#fff" stroke="#e4e8ef"/><text x="20" y="26" fill="#8a93a3" font-size="8">SLOT TYPE MENU</text><rect x="16" y="32" width="388" height="20" rx="4" fill="#f0fdf4" stroke="#bbf7d0"/><text x="26" y="46" fill="#166534" font-size="9" font-weight="700">Title</text><text x="120" y="46" fill="#94a3b8" font-size="8.5">Heading or title text area</text><text x="392" y="46" text-anchor="end" fill="#22c55e" font-size="8" font-weight="700">TIT</text><text x="26" y="68" fill="#5b6472" font-size="8.5">Body · Image · Action · Badge · Icon · Input · Custom</text><rect x="8" y="86" width="404" height="82" rx="8" fill="#fff" stroke="#e4e8ef"/><text x="20" y="104" fill="#8a93a3" font-size="8">SLOT CONFIG (inspector)</text><rect x="16" y="110" width="388" height="16" rx="4" fill="#f6f8fb"/><text x="24" y="122" fill="#5b6472" font-size="8.5">Slot Type</text><text x="392" y="122" text-anchor="end" fill="#1c2333" font-size="8.5">action ▾</text><rect x="16" y="130" width="388" height="16" rx="4" fill="#f6f8fb"/><text x="24" y="142" fill="#5b6472" font-size="8.5">Slot Label</text><text x="392" y="142" text-anchor="end" fill="#1c2333" font-size="8.5">Buy Now</text><rect x="16" y="150" width="388" height="14" rx="4" fill="#f6f8fb"/><text x="24" y="160" fill="#5b6472" font-size="8.5">Skin Mode (input/action only)</text><text x="392" y="160" text-anchor="end" fill="#1c2333" font-size="8.5">Transparent ▾</text></svg></div><div class="fig-cap">The 8-type menu each has an icon + one-line description. <b>Skin Mode</b> (input/action only): Transparent = the vector shapes below are the visual skin; Custom = the slot styles itself.</div></div>

### Maps-to-field reference

| Slot type | Tag | Maps to (typical) | Purpose |
|-----------|-----|-------------------|---------|
| Title | \`TIT\` | heading | Heading / title text |
| Body | \`BOD\` | body | Paragraph / body copy |
| Image | \`IMG\` | imageUrl | Photo / illustration / graphic |
| Action | \`ACT\` | actionLabel / actionHref | Call-to-action button |
| Badge | \`BDG\` | badge | Tag / pill / label |
| Icon | \`ICN\` | icon | Small icon / symbol |
| Input | \`INP\` | — | Text-input field skin |
| Custom | \`CUS\` | custom | Any other content |

> The model also stores \`contentFieldHint\` ("maps to field"), font settings, image mode (fill/fit/crop) and button variant (filled/outline/ghost/dark) on \`VoltSlotData\`. Slots default to the **content** role.

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
# Volt Designer — Layer Properties: Fill, Stroke & Shadow

The **right sidebar** is the layer inspector. With **no layer selected** it shows Element Settings (Flip Card, 3D Tilt, Artboard Background, Canvas Overflow, Carousel — see *Card Settings* and *Carousel*). With a layer selected it shows a **common core** (Name, Role, Opacity, Blend, Z Depth, Position/Size, Rotation) plus **type-specific** sections — fill / stroke / corners / effects for vectors, full typography for text, image fit, slot config, or 3D.

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><svg viewBox="0 0 300 300" font-family="system-ui" font-size="9"><rect x="8" y="8" width="284" height="284" rx="8" fill="#fff" stroke="#e4e8ef"/><text x="18" y="26" fill="#343a40" font-weight="700" font-size="10">☰ Layer Properties</text><g><rect x="16" y="34" width="268" height="18" rx="4" fill="#f6f8fb"/><text x="24" y="46" fill="#5b6472">Name</text><text x="276" y="46" text-anchor="end" fill="#1c2333">Rectangle</text><circle cx="150" cy="43" r="6" fill="#e2001a"/><text x="150" y="46" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">1</text></g><g><rect x="16" y="55" width="268" height="18" rx="4" fill="#f6f8fb"/><text x="24" y="67" fill="#5b6472">Role</text><text x="276" y="67" text-anchor="end" fill="#1c2333">structure ▾</text><circle cx="150" cy="64" r="6" fill="#0d6efd"/><text x="150" y="67" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">2</text></g><g><rect x="16" y="76" width="268" height="18" rx="4" fill="#f6f8fb"/><text x="24" y="88" fill="#5b6472">Opacity · Blend · Z</text><circle cx="150" cy="85" r="6" fill="#0d6efd"/><text x="150" y="88" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">3</text></g><g><rect x="16" y="97" width="268" height="18" rx="4" fill="#f6f8fb"/><text x="24" y="109" fill="#5b6472">X · Y · W · H · Rotate</text><circle cx="150" cy="106" r="6" fill="#0d6efd"/><text x="150" y="109" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">4</text></g><line x1="16" y1="122" x2="284" y2="122" stroke="#e4e8ef" stroke-dasharray="3 3"/><g><rect x="16" y="128" width="268" height="18" rx="4" fill="#eef2ff"/><rect x="24" y="132" width="12" height="12" rx="2" fill="#6366f1"/><text x="44" y="140" fill="#5b6472">Fill  #6366f1</text><circle cx="150" cy="137" r="6" fill="#e2001a"/><text x="150" y="140" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">5</text></g><g><rect x="16" y="149" width="268" height="18" rx="4" fill="#f6f8fb"/><text x="24" y="161" fill="#5b6472">Corners  radius / style / mask</text><circle cx="150" cy="158" r="6" fill="#0d6efd"/><text x="150" y="161" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">6</text></g><g><rect x="16" y="170" width="268" height="18" rx="4" fill="#f6f8fb"/><text x="24" y="182" fill="#5b6472">Stroke  colour / width / cap / dash</text><circle cx="150" cy="179" r="6" fill="#0d6efd"/><text x="150" y="182" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">7</text></g><g><rect x="16" y="191" width="268" height="18" rx="4" fill="#f6f8fb"/><text x="24" y="203" fill="#5b6472">Effects  shadow / glow / blur</text><circle cx="150" cy="200" r="6" fill="#e2001a"/><text x="150" y="203" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">8</text></g><line x1="16" y1="216" x2="284" y2="216" stroke="#e4e8ef" stroke-dasharray="3 3"/><rect x="16" y="222" width="86" height="16" rx="4" fill="#ece8fb"/><text x="59" y="234" text-anchor="middle" fill="#3a2d63" font-size="8">✧ Entrance</text><rect x="107" y="222" width="76" height="16" rx="4" fill="#fde8f9"/><text x="145" y="234" text-anchor="middle" fill="#831843" font-size="8">✦ Exit</text><rect x="188" y="222" width="96" height="16" rx="4" fill="#dcf5e8"/><text x="236" y="234" text-anchor="middle" fill="#0a5138" font-size="8">◈ Personality</text><text x="18" y="258" fill="#8a93a3" font-size="8">Text layers replace Fill/Stroke with full typography.</text><text x="18" y="272" fill="#8a93a3" font-size="8">Image layers show preview + Fit Mode + Alt text.</text><text x="18" y="286" fill="#8a93a3" font-size="8">3D layers show a 3D camera/lighting/animation panel.</text></svg></div><div class="fig-cap"><b>Callouts —</b> <b>1</b> Name · <b>2</b> Role · <b>3</b> Opacity / Blend / Z Depth · <b>4</b> Position & Size + Rotation · <b>5</b> Fill · <b>6</b> Corners · <b>7</b> Stroke · <b>8</b> Effects. Every layer type also gets ✧ Entrance, ✦ Exit and ◈ Personality below Effects.</div></div>

## Common layer properties (all types)

| Control | Function | Options / range | Default |
|---------|----------|-----------------|---------|
| Name | Layer label | text | tool-derived |
| Role | Stagger order + badge | background / structure / accent / content / overlay | structure (shapes) / content (text, slot) |
| Flip Card Face | Which face a layer belongs to | Front / Back | Front · only when Flip Card enabled |
| Opacity | Layer alpha | 0–1 (shown %) | 1 |
| Blend Mode | CSS mix-blend | all 16: normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity | normal |
| Bleed | Render outside card | on/off (image/text/slot only) | off · needs overflow = visible |
| Z Depth | Parallax translateZ; floats layer when 3D Tilt on | −80–120 px | 0 (flat) |
| Position X/Y | Top-left in px | number | — |
| Size W/H | Dimensions in px | number | — |
| Rotation | Rotate layer | −180–180° | 0 |

---

## Fill

Four fill types: **Solid · Linear · Radial · Glass.**

| Section · control | Function | Options / range | Default |
|-------------------|----------|-----------------|---------|
| Type | Fill style | Solid, Linear, Radial, Glass | Solid |
| Solid | Colour + opacity | picker + hex + brand swatches + \`var(--theme-*)\` tokens (BG / Surface / Text / Muted / Border / Navy / Accent / Card BG / Card Border) | #6366f1 |
| Gradient | Stop editor | 2+ stops (color / position 0–100), angle 0–360 (linear), live preview bar | 135°, 2 stops |
| Glass | Frosted overlay | Blur 0–80px, Radius 0–200px, Tint color+opacity, Border opacity | blur 12, radius 12, tint 0.15, border 0.3 |
| Opacity slider | Fill alpha | 0 = transparent, 1 = opaque | 1 |
| Remove | Remove the fill | — | shape becomes transparent |

---

## Corners

| Control | Function | Options / range | Default |
|---------|----------|-----------------|---------|
| Radius | Round corners | 0–200 px (number + slider) | 0 |
| Style | Corner cut style | Round / Bevel | Round |
| Mask | Per-corner enable | TL / TR / BL / BR toggles | all on |

---

## Stroke

| Control | Function | Options / range | Default |
|---------|----------|-----------------|---------|
| Colour | Outline colour | picker + hex | #000 |
| Width | Outline weight | 0.5–50 px | varies |
| Cap | Line-end shape | butt / round / square | butt |
| Dash | Dash pattern | e.g. \`8,4\`; Solid resets | solid |

> **Boolean shapes:** Stroke width is automatically doubled with \`paint-order: stroke fill\` so only the outer boundary is visible (inner intersection lines are covered by fill).

<div class="fig-warn"><b>Model-vs-UI gap:</b> <code>VoltStroke.align</code> (inside/center/outside) and <code>join</code> (miter/round/bevel) exist in the data model and the React inspector, but the live HTML stroke section exposes only colour, width, cap and dash.</div>

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

---

## Effects (collapsible)

Each effect has its own enable toggle.

| Effect | Function | Options / range | Default |
|--------|----------|-----------------|---------|
| Drop Shadow | Offset shadow | X, Y, Blur, Spread, colour, α; drag ☀ on canvas for direction | off (5/5/10/0, #000 @0.5) |
| Outer Glow | Blurred halo | Blur, Spread, colour, α | off (20/5, #818cf8 @0.8) |
| Layer Blur | CSS blur filter | 0–100 px | off (8) |

---

## Text layer typography

When a **text** layer is selected, Fill/Stroke are replaced by full typography. Double-click the text on canvas to edit inline.

| Control | Function | Options / range | Default |
|---------|----------|-----------------|---------|
| Content | The text | multiline textarea | "Text" |
| Font Family | Typeface (Google Fonts on demand) | ~50 fonts across sans / serif / display / mono / system | Inter |
| Size | Font size (px at canvas width) | 6–400 | 28 |
| Weight | Font weight | Thin…Black (100–900) | SemiBold (600) |
| Italic | Style toggle | normal / italic | normal |
| Transform | Case | None / UPPER / lower / Title | None |
| Color | Text colour | picker + hex + brand swatches | #ffffff |
| Alignment | Horizontal align | left / center / right | left |
| Vertical Align | Vertical placement | Top / Mid / Bottom | Top |
| Line Height | Leading multiplier | 0.8–4 | 1.2 |
| Letter Spacing | Tracking | −5–20 px | 0 |
| Word Wrap | Wrap at layer width | on / off | on |

> **Image layers** instead show: preview + Browse/Change, Fit Mode (Fill / Fit / Crop), Alt text. **Slot layers** show Slot Type, Slot Label, and — for input/action slots — Skin Mode + text colour/size.
`;

const VOLT_BOOLEAN = `
# Volt Designer — Boolean Operations

Boolean ops combine two vector shapes non-destructively into a composite shape.

---

## Workflow

1. **Multi-select 2+ shapes on the canvas** — Shift+click each shape (or Shift+click in the Layers panel). Works for any vector shapes, including curves and concave paths.
2. The **first shape you selected** is kept (the base). The rest become **cutters**.
3. Click one of the three operation buttons (in the Boolean Ops panel **or** the floating right toolbar):

| Button | Operation | Result |
|--------|-----------|--------|
| **Union** | Merge | All shapes combined into one outline |
| **Sub** | Subtract | Base minus cutters — punches holes |
| **Isect** | Intersect | Only the overlapping region remains |

There is **no base/cutter dropdown** — the canvas selection is the workflow.

<div class="fig diagram"><span class="tag">Diagram</span><div class="fig-body"><svg viewBox="0 0 420 120" font-family="system-ui" font-size="11"><g transform="translate(20,10)"><path d="M6 6 h44 v44 h-44 Z M42 34 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0" fill="#6366f1" fill-opacity="0.75" fill-rule="nonzero"/><text x="46" y="92" text-anchor="middle" font-weight="700" fill="#1c2333">Union</text><text x="46" y="106" text-anchor="middle" fill="#5b6472" font-size="9">base + cutters</text></g><g transform="translate(160,10)"><path d="M6 6 h50 v50 h-50 Z M40 40 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0" fill="#6366f1" fill-opacity="0.75" fill-rule="evenodd"/><text x="46" y="92" text-anchor="middle" font-weight="700" fill="#1c2333">Subtract</text><text x="46" y="106" text-anchor="middle" fill="#5b6472" font-size="9">base − cutters</text></g><g transform="translate(300,10)"><path d="M40 6 h20 v34 h-20 Z" fill="#6366f1" fill-opacity="0.85"/><path d="M6 6 h54 v54 h-54 Z" fill="none" stroke="#c8cdd4" stroke-dasharray="3 3"/><circle cx="56" cy="40" r="22" fill="none" stroke="#c8cdd4" stroke-dasharray="3 3"/><text x="46" y="92" text-anchor="middle" font-weight="700" fill="#1c2333">Intersect</text><text x="46" y="106" text-anchor="middle" fill="#5b6472" font-size="9">overlap only</text></g></svg></div><div class="fig-cap">Ops are reachable from the left <b>Boolean Ops</b> panel <em>and</em> the floating action menu (disabled until 2+ shapes are selected). Double-click a composite to enter <b>Bool Edit Mode</b> and move the cutter; a ✂ badge + <b>Esc</b>-to-exit appears.</div></div>

| Control | Function | Requires | Result |
|---------|----------|----------|--------|
| Union | Merge shapes | 2+ selected | combined outline (nonzero fill) |
| Subtract | Base minus cutters | 2+ selected | holes via even-odd fill-rule |
| Intersect | Keep overlap | 2+ selected | clipped to shared region |
| Bool Edit Mode | Reposition a cutter | double-click composite | move cutter; recalc bounds on Esc |
| Edit cutter | Reach a hidden cutter | select it in Layers panel | edit its vertices/props |

> Stored as \`boolChildren:[{cutterId, op}]\` on the base layer (non-destructive), with cutters marked \`boolRole:'cutter'\` + \`boolParentId\`. Because it's non-destructive you can re-enter and adjust the cutter at any time.

---

## Non-Destructive & Move-as-One

- Each cutter is **hidden** (not deleted) and the base stores the relationship in \`boolChildren\`.
- **Cutters travel with the base**: moving the composite result moves its cutters with it, so the cut never breaks.
- To reposition a cutter on its own, **select it in the Layers panel** (it carries a **CUT** badge) and move/rotate/scale it there.
- Rendering uses SVG masking (subtract/intersect) and co-rendered fills (union) — robust for curves and concave shapes, with **no winding artifacts**. Booleans also render correctly on the **published site**.

> **Cutter position is saved on mouse-up** — no extra Save needed. Esc confirms and returns to normal selection mode.

---

## Slot Layers & Boolean Ops

Boolean operations **cannot be applied to slot layers**. Slot layers define content placeholders — they have no editable vector path.

If your selection includes any slot layers (via marquee or Ctrl+click multi-select):
- The Boolean Ops panel shows **N/A — slots selected**
- The Union / Sub / Isect buttons are disabled
- The CUTTER ✂ and BASE overlays do not appear on the canvas
- Shift-click to set a boolean base is ignored

To use boolean ops, select only **vector** layers (shapes, paths, ellipses, rectangles, polygons).

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

3D-object layers replace the fill/stroke sections with a dedicated **3D panel**:

| Section · control | Function | Options |
|-------------------|----------|---------|
| Asset | Linked 3D asset name | GLB / GLTF / FBX / OBJ |
| Camera | Framing | azimuth / elevation / distance |
| Lighting | Scene light | ambient / key / angle |
| Animation Trigger | What plays the clip | None / Hover / Auto |
| Transition (when animated) | Timing | easing / duration / delay or period |
| Start / End (State A / B) | Animated pose | position, scale, rotation |

### 3D Object modal

Opened from **3D Objects → Browse / Place 3D Object**:

| Modal · control | Function | Options |
|-----------------|----------|---------|
| Assets list | Choose a 3D asset | rows of available GLB/GLTF/FBX/OBJ |
| Clips | Pick animation clip | named tracks with durations |
| Versions | Asset version history | version rows |
| Format override | Force loader format | Auto / GLB / GLTF / FBX / OBJ |
| Approve & Place | Insert into design | button |

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

const VOLT_OVERFLOW_BLEED = `
# Volt Designer — Canvas Overflow & Layer Bleed

Allow layers to extend **outside the card boundary** — the image or element "bleeds" beyond the canvas edge for a cinematic floating effect.

---

## Enabling Canvas Overflow

1. With no layer selected, open the **Canvas Overflow (Bleed)** section in the right panel
2. Toggle **Allow overflow** to \`visible\`
3. A hatched dashed indicator appears around the artboard showing the bleed zone

> Without overflow enabled, all content is clipped to the canvas rectangle.

---

## Making a Layer Bleed

Once canvas overflow is enabled, any image, text, or slot layer can bleed:

1. Select the layer
2. Tick the **Bleed** checkbox in the Layer Properties panel
3. Drag the layer so part of it extends beyond the canvas edge
4. The layer renders outside the card in the live page

### Typical use

- Hero product image overlapping the top-left corner of a card
- Badge or sticker floating above the card edge
- A rotated image bleeding out at an angle

---

## Behaviour in the Renderer

| \`canvasOverflow\` | Layer \`bleed\` | Result |
|--------------------|-----------------|--------|
| \`hidden\` (default) | any | Layer clipped to canvas |
| \`visible\` | \`false\` | Layer clipped to canvas |
| \`visible\` | \`true\` | Layer renders beyond canvas edge |

> Vector (SVG) layers are always clipped at their SVG viewBox — only HTML-rendered layers (image, text, slot) bleed.

---

## Notes

- Overflow is per-design, not per-instance — set it once in Volt Studio
- Bleed works inside any Flexible section block
- Bleed layers have z-index above the card background automatically
`;

const VOLT_CAROUSEL = `
# Volt Designer — Carousel / Multi-Slide

Turn a single Volt design into a **multi-slide carousel** where each slide can display different content through the Slot system — no duplicate designs needed.

---

## Enabling the Carousel

1. Scroll to the **Carousel / Multi-Slide** section in the right panel (with no layer selected)
2. Toggle **Enable carousel**
3. A slide list appears — add slides with **+ Add Slide**

> Enabling the carousel disables the Flip Card feature (they are mutually exclusive).

---

## Managing Slides

Each slide has:

| Field | Description |
|-------|-------------|
| **Name** | Label shown in the designer panel |
| **Slot Overrides** | Per-slot content for this slide (overrides the base slot value) |
| **Layer Visibility** | Show/hide individual layers for this slide only |

### Slot overrides

If your design has a \`slot-title\` slot, you can set a different title per slide without duplicating the design. Enter the value in the **Slot Overrides** section of that slide.

---

## Transition Settings

| Setting | Options / Range | Description |
|---------|----------------|-------------|
| **Transition** | fade, slide-left, slide-right, scale, flip | How slides change |
| **Duration** | 100–2000 ms | Length of the transition animation |
| **Ease** | easeInOutCubic, linear, spring, etc. | Timing curve |

---

## Navigation Controls

| Setting | Description |
|---------|-------------|
| **Show Arrows** | Prev/Next arrow buttons |
| **Arrow Style** | minimal, rounded, pill |
| **Show Dots** | Dot indicators below the card |
| **Auto Play** | Automatically advance slides |
| **Auto Interval** | Milliseconds between auto-advances (min 500) |

---

## How Slides Render

On the live page:

1. The base design (layers + slots) renders as the current slide
2. The current slide's **slot overrides** replace the base slot values
3. The current slide's **layer visibility** hides/shows layers
4. Transitions animate between slides via Anime.js v4
5. Arrows and dots are rendered over the card

> Carousel state is per-instance — each Volt block on a page runs its own carousel independently.
`;

const VOLT_ANIMATION = `
# Volt Designer — Animation

Each layer has a full **Animation** system covering entrance effects, exit effects, hover transitions, scroll-triggered states, and timeline keyframes.

<div class="fig-note"><b>Three animation systems coexist:</b> the keyframe <b>Timeline</b> (precise), per-layer <b>Entrance / Exit</b> (viewport-triggered presets), and <b>Personality</b> (character-driven procedural motion with per-property "animates" flags). <b>Role</b> sets the stagger order across all three.</div>

---

## Timeline Panel

A dockable panel below the canvas (toggle from the zoom bar or \`Ctrl+T\`). It holds a per-layer keyframe track. Global settings (duration, trigger, loop, loop-on-hover) live in the header; keyframes are diamonds you **double-click to add** (snaps to 50ms), drag to reposition, and click to open per-keyframe props.

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><svg viewBox="0 0 420 132" font-family="system-ui" font-size="9"><rect x="8" y="8" width="404" height="24" rx="6" fill="#1c2333"/><text x="18" y="24" fill="#cdd7ee" font-weight="700" font-size="9">🎬 TIMELINE</text><rect x="120" y="12" width="40" height="16" rx="4" fill="#14361f"/><text x="140" y="24" text-anchor="middle" fill="#7ee0a8" font-size="8">＋ Key</text><rect x="164" y="12" width="40" height="16" rx="4" fill="#3a1420"/><text x="184" y="24" text-anchor="middle" fill="#f08a8a" font-size="8">− Key</text><text x="214" y="24" fill="#7ee0a8" font-size="9">▶</text><text x="228" y="24" fill="#f08a8a" font-size="9">■</text><text x="248" y="24" fill="#8a93a3" font-size="8">3000ms</text><rect x="300" y="12" width="60" height="16" rx="4" fill="#2a3550"/><text x="330" y="24" text-anchor="middle" fill="#cdd7ee" font-size="7.5">Trigger ▾</text><text x="368" y="24" fill="#cdd7ee" font-size="8">☐Loop</text><rect x="8" y="36" width="70" height="88" fill="#fafafa" stroke="#e4e8ef"/><text x="16" y="52" fill="#8a93a3" font-size="7">ruler</text><text x="16" y="74" fill="#5b6472" font-size="8">Rectangle</text><rect x="8" y="84" width="70" height="18" fill="#eff6ff"/><text x="16" y="96" fill="#5b6472" font-size="8">Title</text><rect x="78" y="36" width="334" height="88" fill="#fff" stroke="#e4e8ef"/><text x="86" y="50" fill="#94a3b8" font-size="7">0ms   500   1s   1.5s   2s</text><line x1="78" y1="54" x2="412" y2="54" stroke="#eef1f6"/><rect x="120" y="64" width="9" height="9" fill="#6366f1" transform="rotate(45 124 68)" stroke="#fff"/><rect x="210" y="88" width="9" height="9" fill="#6366f1" transform="rotate(45 214 92)" stroke="#fff"/><line x1="250" y1="36" x2="250" y2="124" stroke="#e2001a" stroke-width="1.4"/></svg></div><div class="fig-cap"><b>Header:</b> ＋Key / −Key, Play / Stop, duration (500–30000ms), Trigger (Viewport / Hover-once), Loop / Loop-on-hover. <b>Tracks:</b> one per layer; diamonds are keyframes; the red line is the playhead. Timeline is opt-in per layer — a layer only animates once it has keyframes.</div></div>

| Control | Function | Options / range | Default |
|---------|----------|-----------------|---------|
| ＋ Key / − Key | Add/remove keyframe | at current time / last kf | — |
| Play / Stop | Preview timeline | playhead scrub | stopped |
| Duration | Total timeline length | 500–30000 ms | 3000 |
| Trigger | What fires the timeline | Viewport (IntersectionObserver) / Hover-once | Viewport |
| Loop | Repeat forever | on / off | off |
| Loop on hover | Loop only while hovered | on / off (excl. Loop) | off |
| Keyframe time | Position on track | 0–duration, 50ms snap | — |
| KF props | Animated values | opacity, translateX/Y, scaleX/Y, rotate | current layer state |
| KF ease | Segment easing | anime.js ease string | — |
| Entrance (inspector) | On-enter animation | Fade / Slide×4 / Scale / Rotate / Flip X/Y + duration/delay/distance/ease | none (600/0/40/easeOutCubic) |
| Exit (inspector) | On-leave animation | Fade / Slide×4 / Scale / Rotate + duration/delay/distance | none |
| Personality | Procedural feel | Character/Speed/Style 0–100, Delay 0–2000ms; Animates: opacity/scale/position/rotation/fill | 50/40/60/0, opacity on |

---

## Animation Personality (Legacy Sliders)

| Property | Range | Description |
|----------|-------|-------------|
| **Delay** | 0–100 | Stagger delay before this layer starts animating |
| **Speed** | 0–100 | How fast the animation plays |
| **Style** | 0–100 | Animation curve / easing style |
| **Character** | 0–100 | Amount of "personality" in the motion |

### Animates Flags

Toggle which CSS/SVG properties are animated on entrance:

| Flag | Property |
|------|----------|
| Fill | Colour / fill |
| Scale | Size scale |
| Opacity | Fade in |
| Position | Translate in |
| Rotation | Spin in |

---

## Entrance Animations

Each layer can have an entrance animation that plays when the element first appears.

| Type | Description |
|------|-------------|
| \`fadeIn\` | Simple opacity fade from 0 to 1 |
| \`slideInLeft\` | Slide in from the left edge |
| \`slideInRight\` | Slide in from the right edge |
| \`slideInUp\` | Slide in from below |
| \`slideInDown\` | Slide in from above |
| \`scaleIn\` | Scale up from 0 to full size |
| \`rotateIn\` | Rotate in from a specified angle |
| \`flipInX\` | 3D flip on the X axis |
| \`flipInY\` | 3D flip on the Y axis |

### Entrance Properties

| Property | Default | Description |
|----------|---------|-------------|
| **Duration** | 600ms | How long the entrance takes |
| **Delay** | 0ms | Wait before starting |
| **Easing** | \`easeOutCubic\` | Timing curve |
| **Distance** | 100px | How far slide/flip animations travel |

---

## Exit Animations

Exit animations play when the element leaves the viewport or is removed.

| Type | Description |
|------|-------------|
| \`fadeOut\` | Opacity fade from 1 to 0 |
| \`slideOutLeft\` | Slide out to the left |
| \`slideOutRight\` | Slide out to the right |
| \`slideOutUp\` | Slide out upward |
| \`slideOutDown\` | Slide out downward |
| \`scaleOut\` | Scale down to 0 |
| \`rotateOut\` | Rotate out to a specified angle |

Exit animations share the same duration/delay/easing properties as entrance animations.

---

## Hover State Transitions

Each layer can define hover overrides that animate when the user hovers over the Volt element:

| Property | Description |
|----------|-------------|
| **Opacity** | Change opacity on hover (e.g. dim or reveal) |
| **Scale** | Grow or shrink on hover |
| **Position (X/Y)** | Translate layer on hover |
| **Rotation** | Rotate layer on hover |
| **Fill** | Change colour/fill on hover |

Hover transitions animate smoothly between rest and hover states using the layer's configured easing.

---

## Scroll-Triggered States

Layers can change properties as the user scrolls past defined thresholds:

| Threshold | Trigger Point |
|-----------|---------------|
| \`scroll-25\` | Element is 25% through the viewport |
| \`scroll-50\` | Element is 50% through the viewport |
| \`scroll-75\` | Element is 75% through the viewport |
| \`scroll-100\` | Element has fully scrolled past |

Each threshold can override opacity, scale, position, rotation, and fill. States are tracked using **IntersectionObserver** with the corresponding threshold ratios. As the user scrolls, layers transition smoothly between states.

---

## Timeline Keyframes

The timeline system gives fine-grained control over complex multi-step animations.

### VoltKeyframe System

Each layer's timeline is a sequence of **VoltKeyframe** objects:

| Keyframe Property | Description |
|-------------------|-------------|
| **Time (%)** | Position on the timeline (0–100%) |
| **Opacity** | Opacity at this keyframe |
| **Scale X / Y** | Scale at this keyframe |
| **Position X / Y** | Translation at this keyframe |
| **Rotation** | Rotation angle at this keyframe |
| **Easing** | Per-keyframe easing curve |

### Timeline Controls

| Action | How |
|--------|-----|
| **Add keyframe** | Click the + button on the timeline track |
| **Remove keyframe** | Select a keyframe and press Delete |
| **Move keyframe** | Drag a keyframe left/right on the timeline |
| **Edit values** | Click a keyframe to edit its properties in the panel |
| **Play preview** | Click the Play button to see the full animation |
| **Scrub** | Drag the playhead to preview any point in time |
| **Loop mode** | Toggle loop to repeat the animation continuously |
| **Duration** | Set total timeline duration (ms) in the duration field |
| **Toggle panel** | \`Ctrl+T\` opens/closes the timeline panel |

### Tips

- Keyframes interpolate between each other — you only need to set the properties that change
- Use per-keyframe easing to create complex motion curves (ease-in at start, ease-out at end)
- Combine timeline keyframes with entrance animations for layered effects

---

## Notes

- Animation is powered by **Anime.js 4.x** using the named \`animate\` export
- Entrance/exit animations are triggered when the element scrolls into/out of view
- Each layer animates independently — use **Delay** to stagger a sequence
- Use **Speed** = 0 for instant reveal, 100 for very slow
- Keyboard shortcut: **Ctrl+T** to toggle the timeline panel
`;

// ─────────────────────────────────────────────
// VOLT UX, SHORTCUTS & FEATURES
// ─────────────────────────────────────────────

const VOLT_UX_DOCS = `
# Volt Designer — UX, Shortcuts & Features

A complete reference for keyboard shortcuts, alignment tools, and advanced features in Volt Studio.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| \`V\` | Select tool |
| \`R\` | Rectangle tool |
| \`E\` | Ellipse tool |
| \`L\` | Line tool |
| \`B\` | Pen/Bezier tool |
| \`P\` | Polygon tool |
| \`T\` | Text tool |
| \`S\` | Slot tool |
| \`Ctrl+Z\` | Undo |
| \`Ctrl+Y\` | Redo |
| \`Ctrl+C\` | Copy selected layer |
| \`Ctrl+V\` | Paste copied layer |
| \`Ctrl+D\` | Duplicate selected layer |
| \`Ctrl+G\` | Group selected layers |
| \`Ctrl+T\` | Toggle timeline panel |
| \`Delete / Backspace\` | Delete selected layer |
| \`Arrow keys\` | Nudge layer 1% |
| \`Shift + Arrow keys\` | Nudge layer 5% |
| \`Ctrl + Scroll wheel\` | Zoom in/out |
| \`Escape\` | Cancel current tool / Exit vertex edit |

### Full shortcut set, grouped by context

Shortcuts are suppressed while typing in inputs, textareas and selects. The in-app key legend under the canvas toolbar shows the relevant subset per tool/mode.

| Context | Keys | Action |
|---------|------|--------|
| Tools | \`V\` \`R\` \`E\` \`L\` \`P\` \`B\` \`T\` \`S\` | Select / Rect / Ellipse / Line / Polygon / Pen / Text / Slot |
| History | \`Ctrl+Z\` · \`Ctrl+Y\` / \`Ctrl+Shift+Z\` | Undo · Redo |
| Clipboard | \`Ctrl+C\` · \`Ctrl+V\` · \`Ctrl+D\` | Copy · Paste (+3/+3) · Duplicate |
| Layers | \`Ctrl+G\` · \`Del\` / \`Backspace\` | Group selected · Delete selected |
| Timeline | \`Ctrl+T\` | Toggle timeline panel |
| Zoom | \`Ctrl+Wheel\` | Zoom toward cursor |
| Nudge | \`←\` \`↑\` \`→\` \`↓\` · +\`Shift\` | Move 1% · 5% (Select tool) |
| Drawing (all) | \`Ctrl\` (hold) · \`Esc\` | Snap to grid · Cancel |
| Rect / Ellipse / Slot | \`Shift\` (hold) | Lock to square / circle |
| Pen | Click · Click+Drag · \`Enter\` · dblclick · \`Backspace\` · \`Esc\` | Sharp anchor · Curve anchor · Commit · Commit+close · Remove last pt · Cancel |
| Polygon | Click · \`Enter\` / dblclick · \`Backspace\` · \`Esc\` | Add pt · Close & commit · Remove pt · Cancel |
| Selection | \`Alt\`+drag · dblclick · \`Shift\`+click | Duplicate · Vertex edit · Set bool base |
| Vertex edit | drag · \`Shift\`+drag · \`Alt\`+click · \`Alt\`+dblclick · \`Ctrl\` · \`Esc\` | Move/curve · Symmetric · Add pt · Delete pt · Snap · Exit |
| Bool edit | drag · dblclick cutter · \`Esc\` | Move cutter · Edit cutter vertices · Confirm & exit |
| Context menu | \`Esc\` | Close menu |

> Nudging only fires with the Select tool active; drawing shortcuts are per-tool.

---

## Copy & Paste

- **Ctrl+C** copies the selected layer to an internal clipboard
- **Ctrl+V** pastes it as a new layer, offset +3% from the original
- The pasted layer gets a new unique ID and name suffix " copy"
- Works within the same design (cross-design paste not yet supported)

## Arrow Key Nudging

- Select any layer and use **arrow keys** to move it precisely
- **1%** per press (single arrow key)
- **5%** per press (Shift + arrow key)
- Multiple rapid nudges are batched into a single undo step

## Distribute Alignment

- **Multi-select** 3 or more layers (Shift+click or marquee select)
- Click **Distribute Horizontal** ⇄ to space them evenly on the X axis
- Click **Distribute Vertical** ⇅ to space them evenly on the Y axis
- Existing **Align** buttons (left/center/right/top/middle/bottom) align to canvas edges

## Zoom

- **Ctrl + scroll wheel** zooms the canvas (0.1× to 5×)
- Zoom buttons (+/−) in the toolbar
- **Fit** button auto-fits the canvas to the viewport

---

## Google Fonts

52 Google Fonts available in the text property panel, organised by category:

- **Sans-serif (modern):** Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Raleway, Nunito, DM Sans, Space Grotesk, Rubik, Outfit, Work Sans, Plus Jakarta Sans, Sora, Manrope, Lexend, Figtree, Be Vietnam Pro, and more
- **Serif (elegant):** Playfair Display, Merriweather, Cormorant Garamond, Libre Baskerville, Crimson Text, Lora, EB Garamond, Bitter, Spectral, DM Serif Display
- **Display (headlines):** Bebas Neue, Anton, Righteous, Archivo Black, Russo One
- **Monospace:** JetBrains Mono, Fira Code, Source Code Pro
- **System:** System UI, Georgia, Arial, Courier New

Fonts are loaded dynamically from Google Fonts CDN. The renderer also auto-loads any non-system fonts used in text layers.

## Brand Colour Swatches

- Colour pickers (text colour, fill colour) show a **Brand** row of 8 swatches
- Swatches are loaded from **Settings → Brand** tokens
- Click any swatch to instantly apply that colour
- Keeps designs consistent with your brand palette

---

## Unsplash Photo Search

The image picker has two tabs: **Media Library** and **Unsplash**.

1. Click the Unsplash tab
2. Search for any topic (e.g., "mountains", "office", "food")
3. Browse results in a grid with photographer credits
4. Click a photo to insert it into the selected image layer
5. "Load more" button for pagination

> **Note:** Requires \`UNSPLASH_ACCESS_KEY\` in your environment. Get a free key at [unsplash.com/developers](https://unsplash.com/developers).

---

## Component / Symbol System

Save and reuse groups of layers across designs.

### Saving a Component
1. Select one or more layers (Shift+click for multi-select)
2. Right-click → **Save as Component**
3. Enter a name → the layers are saved as a reusable VoltElement

### Using a Component
1. Click the **CMP** button in the toolbar
2. Browse your component library (shows name + layer count)
3. Click a component to insert its layers into the current design
4. Inserted layers get new IDs and are stacked on top

---

## Responsive Breakpoints

Design for mobile, tablet, and desktop in one Volt design.

| Breakpoint | Icon | Canvas Width |
|------------|------|-------------|
| Desktop | 🖥 | 800px (default) |
| Tablet | 📱 | 600px |
| Mobile | 📱 | 375px |

### How to Use
1. Open the timeline (\`Ctrl+T\`) — breakpoint switcher appears
2. Click a breakpoint button to resize the canvas
3. Reposition/resize layers at the new size
4. Overrides are saved per breakpoint (position, size, visibility, font size)
5. Desktop layout is not affected by tablet/mobile edits

The renderer uses a **ResizeObserver** to detect the container width and apply the matching breakpoint overrides automatically.

---

## Clip Mask

Clip an image or text layer to the shape of a vector layer below it.

### Setting a Clip Mask
1. Draw a **vector shape** (rectangle, circle, custom path)
2. Add an **image layer** above it
3. Select the image layer → right-click → **Set Clip Mask**
4. The image is clipped to the vector shape

### Releasing a Clip Mask
- Right-click the masked layer → **Release Mask**

> The mask uses CSS \`clip-path\` with the vector's SVG path data.
`;

const VOLT_CANVAS_NAV = `
# Volt Designer — Canvas & Navigation

The artboard sits on a grey stage with a dot grid and (optionally) a dashed bleed zone. A floating **zoom bar** is docked bottom-left; a contextual key-legend strip and an empty-canvas hint help while drawing. Navigation is fully independent of the drawing tools.

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><svg viewBox="0 0 420 200" font-family="system-ui" font-size="9"><rect x="8" y="8" width="404" height="160" rx="8" fill="#dee2e6"/><rect x="120" y="40" width="180" height="112" rx="4" fill="#fff" stroke="#c8cdd4"/><rect x="108" y="28" width="204" height="136" rx="5" fill="none" stroke="#818cf8" stroke-opacity="0.55" stroke-dasharray="4 4"/><circle cx="140" cy="60" r="1.4" fill="#c8cdd4"/><circle cx="164" cy="60" r="1.4" fill="#c8cdd4"/><circle cx="188" cy="60" r="1.4" fill="#c8cdd4"/><circle cx="140" cy="84" r="1.4" fill="#c8cdd4"/><circle cx="164" cy="84" r="1.4" fill="#c8cdd4"/><circle cx="188" cy="84" r="1.4" fill="#c8cdd4"/><rect x="16" y="140" width="150" height="20" rx="8" fill="#fff" stroke="#e4e8ef"/><text x="26" y="154" fill="#5b6472" font-size="9">🎬 🔍−  100%  🔎+  ⌖  ↺</text><g font-weight="700" font-size="8.5"><circle cx="26" cy="152" r="6.5" fill="#e2001a"/><text x="26" y="155" text-anchor="middle" fill="#fff">1</text><circle cx="255" cy="55" r="6.5" fill="#e2001a"/><text x="255" y="58" text-anchor="middle" fill="#fff">2</text><circle cx="150" cy="72" r="6.5" fill="#0d6efd"/><text x="150" y="75" text-anchor="middle" fill="#fff">3</text><circle cx="112" cy="32" r="6.5" fill="#0d6efd"/><text x="112" y="35" text-anchor="middle" fill="#fff">5</text></g><rect x="8" y="172" width="404" height="20" rx="4" fill="#f8f9fa" stroke="#e4e8ef"/><text x="18" y="185" fill="#6b8cae" font-size="8" font-weight="700">TOOLS</text><text x="60" y="185" fill="#5b6472" font-size="8">V Select · R Rect · E Ellipse — legend swaps per tool/mode</text><circle cx="400" cy="182" r="6.5" fill="#e2001a"/><text x="400" y="185" text-anchor="middle" fill="#fff" font-size="8.5" font-weight="700">4</text></svg></div><div class="fig-cap"><b>Callouts —</b> <b>1</b> zoom bar (Timeline toggle, Zoom out, % label, Zoom in, Fit ⌖, Reset View ↺) · <b>2</b> zoom-to-cursor (plain scroll-wheel; point under cursor stays fixed) · <b>3</b> dot grid (sized to Grid Size) · <b>4</b> contextual key legend (swaps per tool/mode) · <b>5</b> bleed zone (dashed inset, shown when Canvas Overflow = visible).</div></div>

## Zoom & pan controls

| Control | Function | Options / range | Default |
|---------|----------|-----------------|---------|
| Timeline toggle | Show/hide the keyframe timeline | \`Ctrl+T\` | hidden |
| Zoom out | ×0.83 about centre | button | — |
| Zoom % label | Current zoom readout | 5%–800% | 100% |
| Zoom in | ×1.2 about centre | button | — |
| Fit | Pan=0 + scale to viewport | button (⌖) | — |
| Reset View | Recentre: pan=0 + zoom-to-fit | \`#btn-reset-view\` (↺) | one-click restore |
| Scroll wheel | Zoom toward cursor (point stays fixed) | plain *or* \`Ctrl\`+wheel; ×1.1 / ÷1.1 | — |
| Middle-mouse drag | Free pan the artboard | any tool / any zoom; "grabbing" cursor | — |

> **Pan & view:** pan is a screen-space translate applied *after* scale (\`translate(panX,panY) scale(zoom)\`), so the middle-drag delta is added in raw screen px and is never clamped. **Fit** and **Reset View** both set pan=0 and zoom-to-fit (40px pad). **View state (pan/zoom) is not persisted** — it is stripped from the save payload as navigation, not design data.

---

## Occluded selection — click-to-cycle

Hit-testing skips both **hidden** and **locked** layers, so they never intercept a click — it falls through to whatever is beneath. When shapes stack, **repeated clicks at the same point cycle the selection downward** through the stack (tracked via \`_hitCyclePt\`, within ~4px). \`Alt\` is **not** used for this — it is reserved for vertex add/delete.

| Behaviour | Gesture | Result |
|-----------|---------|--------|
| Select top layer | click a stack | picks the front-most selectable layer |
| Dig downward | click again, same spot | selects the next layer beneath (cycles round) |
| Locked / hidden | click over them | ignored — click passes through |
| Reach a locked layer | Layers panel row | select there to unlock |

> There is no dedicated 1:1 (100%) button in the zoom bar — use the % readout / wheel to reach 100%. Cycling and pass-through selection mean occluded and locked elements are always resolvable without keyboard modifiers.

---

## Overlays while drawing

- **Dot grid** — radial-dot background sized to Grid Size; each dot sits on a snap point.
- **Bleed zone** — dashed inset shown when Canvas Overflow = visible; layers flagged "Bleed" may extend past the card edge.
- **Empty-canvas hint** — "Pick a tool and start drawing" card with the R/E/L/P/S key cheatsheet, shown while there are no layers.
- **Contextual key legend** — status strip that swaps its shortcut list per tool / mode (idle, pen, drawing, vertex, bool).
- **Vertex ROUND bar** — floats above the zoom bar only during vertex editing.
`;

const VOLT_ROLES = `
# Volt Designer — Layer Roles

Every layer carries a **role** — background / structure / accent / content / overlay. Role does two things today: it colours the layer-panel **badge**, and it sets the **animation stagger order** in the renderer. It does **not** change z-order and does **not** change fill.

<div class="fig diagram"><span class="tag">Diagram</span><div class="fig-body"><div class="fig-grid2"><div><h4>Badge colour</h4><table><thead><tr><th>Role</th><th>Colour</th><th>Meaning</th></tr></thead><tbody><tr><td>background</td><td><code>#64748b</code></td><td>card base / backdrop</td></tr><tr><td>structure</td><td><code>#6366f1</code></td><td>primary shapes, frames (draw default)</td></tr><tr><td>accent</td><td><code>#f59e0b</code></td><td>highlights, lines, decoration</td></tr><tr><td>content</td><td><code>#22c55e</code></td><td>text & slots (their default)</td></tr><tr><td>overlay</td><td><code>#ec4899</code></td><td>top-layered effects (glows, sheens)</td></tr></tbody></table></div><div><h4>Animation stagger order</h4><p><code>ROLE_ORDER</code> sorts layers before the entrance/state animation so they cascade:</p><p><b>1</b> accent → <b>2</b> structure → <b>3</b> overlay → <b>4</b> background → <b>5</b> content</p><div class="fig-note" style="margin-top:8px"><b>Important:</b> role today affects only badge colour + stagger order. It does <b>not</b> reorder z-index and does <b>not</b> change fill. Text and Slot layers default to <b>content</b>.</div></div></div></div></div>

## Role values reference

| Role | Meaning | Badge | Stagger # |
|------|---------|-------|-----------|
| background | Card base / backdrop | \`#64748b\` | 4 |
| structure | Primary shapes & frames (draw default) | \`#6366f1\` | 2 |
| accent | Highlights, lines, decoration | \`#f59e0b\` | 1 |
| content | Text & slots (their default) | \`#22c55e\` | 5 |
| overlay | Top-layered effects | \`#ec4899\` | 3 |

> The Role selector appears both in the right **Layer Properties** (per selected layer) and as the badge in the **Layers panel**. Options are the five values above, in the fixed dropdown order background → structure → accent → content → overlay.
`;

const VOLT_CARD_SETTINGS = `
# Volt Designer — Card Settings (Flip · Tilt · Background)

With **no layer selected**, the right sidebar shows **Element Settings** for the whole card: Flip Card, 3D Tilt, Artboard Background and Canvas Overflow. (Carousel is documented in its own topic; it is mutually exclusive with Flip Card.)

---

## Flip Card

A hover/click flip to a second (back) face. Each layer then carries a **Face: Front / Back** property, and a FACE switcher appears in the tool palette.

| Control | Function | Options / range | Default |
|---------|----------|-----------------|---------|
| Enable | Hover/click flip to a back face | on / off | off |
| Animation | Flip style | 3D Flip / Slide / Fade / Swing | 3D Flip |
| Trigger | What flips it | Hover / Click / Auto | Hover |
| Auto Interval | Auto-flip period (Auto only) | 500–10000 ms | 3000 |
| Direction | Slide/swing direction | ← → ↑ ↓ | → |
| Axis | Flip axis | Horizontal (Y) / Vertical (X) | Y |
| Perspective | 3D depth | 400–2400 px | 1200 |
| Duration | Flip time | 100–3000 ms | 600 |
| Easing | Curve | easeIn / easeOut / easeInOut / linear / spring | easeInOut |
| Spring | Physics (ease = spring) | Mass 0.1–5, Stiffness 20–400, Damping 1–30, Velocity 0–20 | 1 / 180 / 12 / 0 |

---

## 3D Tilt

| Control | Function | Options / range | Default |
|---------|----------|-----------------|---------|
| Enable | Cursor-tracking tilt | on / off | off |
| Max Angle | Tilt amount | 2–20° | 8 |

Layers with a non-zero **Z Depth** float toward the cursor when 3D Tilt is on (parallax).

---

## Artboard Background & Overflow

| Control | Function | Options / range | Default |
|---------|----------|-----------------|---------|
| Artboard Background | Card background colour | picker + hex + None (transparent) | #ffffff |
| Canvas Overflow | Allow bleed outside card | visible / hidden | hidden |

> When **Canvas Overflow = visible**, a dashed bleed zone appears around the artboard and any image/text/slot layer with its **Bleed** flag on can extend past the card edge. See *Canvas Overflow & Bleed*.
`;

const VOLT_MENUS = `
# Volt Designer — Floating & Context Menus

Two menus act on the selected layer: an **element-anchored floating action menu** that tracks the selection, and a **right-click context menu** for z-order and layer actions.

<div class="fig map"><span class="tag">Interface map</span><div class="fig-body"><svg viewBox="0 0 420 176" font-family="system-ui" font-size="9"><rect x="24" y="20" width="70" height="130" rx="6" fill="#eef4ff" stroke="#0d6efd" stroke-dasharray="4 4"/><text x="59" y="90" text-anchor="middle" fill="#0a4bc2" font-size="9">selected</text><rect x="104" y="20" width="34" height="130" rx="10" fill="#fff" stroke="#e4e8ef"/><text x="121" y="40" text-anchor="middle" fill="#5b6472" font-size="11">⬅</text><text x="121" y="60" text-anchor="middle" fill="#5b6472" font-size="11">⋮</text><text x="121" y="80" text-anchor="middle" fill="#5b6472" font-size="11">➡</text><text x="121" y="104" text-anchor="middle" fill="#5b6472" font-size="11">⌖</text><text x="121" y="124" text-anchor="middle" fill="#adb5bd" font-size="11">⤢</text><text x="121" y="144" text-anchor="middle" fill="#adb5bd" font-size="11">⧉</text><rect x="176" y="20" width="150" height="146" rx="8" fill="#fff" stroke="#e4e8ef"/><text x="188" y="38" fill="#1c2333" font-size="9">▲ Bring to Front</text><text x="188" y="54" fill="#1c2333" font-size="9">▲ Bring Forward</text><text x="188" y="70" fill="#1c2333" font-size="9">▼ Send Backward</text><text x="188" y="86" fill="#1c2333" font-size="9">▼ Send to Back</text><line x1="184" y1="94" x2="318" y2="94" stroke="#f1f5f9"/><text x="188" y="108" fill="#1c2333" font-size="9">⧉ Duplicate</text><text x="188" y="124" fill="#1c2333" font-size="9">📦 Save as Component</text><text x="188" y="140" fill="#1c2333" font-size="9">🔗 Set / Release Clip Mask</text><text x="188" y="158" fill="#dc3545" font-size="9">🗑 Delete</text><g font-weight="700" font-size="8.5"><circle cx="121" cy="16" r="6.5" fill="#e2001a"/><text x="121" y="19" text-anchor="middle" fill="#fff">1</text><circle cx="176" cy="16" r="6.5" fill="#e2001a"/><text x="176" y="19" text-anchor="middle" fill="#fff">2</text></g></svg></div><div class="fig-cap"><b>1</b> element-anchored floating menu — a collapsed pill just outside the layer's edge; hover expands it. <b>2</b> right-click context menu — z-order, duplicate, component, clip-mask, delete. Right-click auto-selects the layer under the cursor.</div></div>

## Floating action menu

Body-parented at runtime and positioned off the layer's on-screen rectangle (zoom/pan-aware), so it follows the selection as you move, zoom or pan. Shows as a collapsed pill that **expands on hover**; it flips to the layer's left edge near the properties panel and grows upward near the viewport bottom.

| Floating menu | Action / enabled when |
|---------------|-----------------------|
| Align Left / H-Center / Right | horizontal align · always |
| Align Top / V-Center / Bottom | vertical align · always |
| Fill canvas | expand layer to 100% W×H |
| Distribute H / V | even spacing · **greyed < 3 selected** |
| Union / Subtract / Intersect | boolean · **greyed until base + ≥1 cutter** |
| Collapse / expand | pill collapses; hover expands |

## Right-click context menu

| Context menu | Action |
|--------------|--------|
| Bring to Front | max z-index |
| Bring Forward | swap up one |
| Send Backward | swap down one |
| Send to Back | min z-index |
| Duplicate | copy +2/+2 offset (\`Ctrl+D\`) |
| Save as Component | store reusable element |
| Set / Release Clip Mask | clip to vector below |
| Delete | remove layer |

> **Clip Mask** clips a non-vector layer to the nearest vector shape below it in z-order. **Save as Component** POSTs the selected layer(s) to \`/api/volt-elements\` as a reusable \`elementType:"component"\`, later insertable from the CMP library.
`;

const VOLT_DATA_MODEL = `
# Volt Designer — Data Model & Modals

The controls throughout Volt bind to the \`types/volt.ts\` model. This is a quick reference for the key enums and the two full-screen pickers.

---

## Key enums

<div class="fig diagram"><span class="tag">Diagram</span><div class="fig-body"><div class="fig-grid2"><div><h4>LayerType</h4><p>vector · image · gradient · slot · text · text-decoration · effect · group · 3d-object</p><h4>LayerRole</h4><p>background · structure · accent · content · overlay</p><h4>SlotType</h4><p>title · body · image · action · badge · icon · custom (UI adds <b>input</b>)</p><h4>VoltTool</h4><p>select · pen · line · rectangle · ellipse · polygon · star · slot · object3d · eyedropper · hand</p></div><div><h4>Fill type</h4><p>solid · linear-gradient · radial-gradient · angular-gradient · image · glass</p><h4>Entrance / Exit</h4><p>fadeIn/Out · slideIn/Out×4 · scaleIn/Out · rotateIn/Out · flipInX/Y</p><h4>Flip / Carousel</h4><p>FlipAnimType: flip3d · slide · scalefade · swing<br/>CarouselTransition: fade · slide-left · slide-right · scale · flip</p><h4>3D</h4><p>animTrigger: 3d-hover · 3d-auto · none · easing: linear / easeIn / easeOut / easeInOut / spring</p></div></div></div></div>

<div class="fig-warn"><b>UI-vs-model deltas:</b> the UI adds an <b>input</b> slot type and a <b>glass</b> fill; the model lists <b>star / eyedropper / hand</b> tools not surfaced as palette buttons in this build, and a <b>gradient / angular-gradient / image</b> fill path only partially exposed in the HTML fill section.</div>

---

## 3D Object modal & Image picker

| Modal · control | Function | Options |
|-----------------|----------|---------|
| 3D · Assets list | Choose a 3D asset | rows of available GLB / GLTF / FBX / OBJ |
| 3D · Clips | Pick animation clip | named tracks with durations |
| 3D · Versions | Asset version history | version rows |
| 3D · Format override | Force loader format | Auto / GLB / GLTF / FBX / OBJ |
| 3D · Approve & Place | Insert into design | button |
| Image · Tabs | Source | Media Library / Unsplash |
| Image · Search | Filter media / photos | text search |
| Image · Paste URL | Insert by link | URL + Insert |

---

## Self-contained thumbnails & load gate

- **Thumbnails:** \`captureThumbnail()\` clones the artboard SVG, paints a white background, and **inlines every same-origin raster image as a base64 data URI** so the serialized SVG resolves standalone. The result is a \`data:image/svg+xml\` stored on the payload's \`thumbnail\` field at save time — library cards render placed photos correctly instead of dropping external images. Fetch failures fall back to the original href and never block the save.
- **Load gate:** opening a saved Volt shows \`#volt-load-overlay\` (a spinner) until the real element arrives, replacing the old flash of the default blank canvas. Shown only when running inside a parent iframe.

> Both are correctness fixes rather than user-facing controls: thumbnails are captured automatically on Save; the load gate is automatic on open.
`;

// ─────────────────────────────────────────────
// MAINTENANCE MODE
// ─────────────────────────────────────────────

const MAINTENANCE_MODE_DOCS = `
# Maintenance Mode

Put your entire public-facing website on hold with a single toggle — no code changes, no redeployments required.

## What It Does

When **Maintenance Mode** is enabled:
- Every public URL (home page, all pages, blog posts, etc.) shows a full-screen maintenance page
- The **admin panel remains fully accessible** at \`/admin/*\` — you can keep editing content while the site is down
- All admin APIs continue to function normally
- The state is stored in the database so it persists across server restarts and re-deploys

## How to Enable / Disable

1. Go to **Settings → Site** (the default tab when you open Settings)
2. Find the **Maintenance Mode** card
3. Click the toggle button — changes are saved instantly
4. An **Active** badge appears next to the label, plus a yellow warning banner when enabled

## Maintenance Page Templates

Below the toggle you'll find a **Maintenance Page Template** picker with three options:

### Plain (Default)
- Dark neutral background — appropriate for any industry
- Animated spinner icon
- "We'll Be Right Back" heading
- Animated progress bar
- Shows your site logo (from Site Config) at the top

### Construction
- Full CSS animated concrete mixer truck with rotating drum, exhaust smoke, spinning wheels
- Industrial hazard-tape stripes top and bottom
- "Under Construction" heading
- Colours default to **Pantone 2290 C (#78BE20)** / **Cool Gray 11 C (#53565A)** / **Cool Gray 4 C (#BBBCBC)**
- Best suited to civil engineering, construction, and concrete companies

### Custom Image
- Full-screen background image of your choice with a dark overlay
- Clean "Be Back Soon" heading and your logo centred on top
- Paste any image URL (from the Media Library or external) into the URL field that appears when this template is selected
- Works for any brand/industry

Clicking a template card saves it immediately — no extra save button.

## Technical Notes

- \`maintenance_mode\`, \`maintenance_template\`, \`maintenance_custom_img\` are all stored in \`system_settings\` key-value table
- The check and template selection both run **server-side** in the root layout — visitors never see a flash of the real site
- Routes skipped: \`/admin/*\`, \`/api/*\`, \`/volt-preview/*\`
- API: \`GET/PUT /api/admin/maintenance\` — requires SUPER_ADMIN role

## When to Use

- Deploying a major update
- Database migrations running on production
- Fixing a live issue without visitors seeing broken pages
- Scheduled maintenance windows
`;

// ─────────────────────────────────────────────
// CMS UPDATE SYSTEM
// ─────────────────────────────────────────────

export const CMS_UPDATES_DOCS = `
<h4>CMS Update System</h4>
<p class="lead">Keep client CMS instances up to date with upstream white-label-cms improvements — directly from the admin panel.</p>

<div class="alert alert-warning">
  <i class="bi bi-shield-lock me-1"></i>
  <strong>SUPER_ADMIN only.</strong> CMS Updates settings are hidden from all other roles.
</div>

<h5 class="mt-4">How It Works</h5>
<ol>
  <li>The admin badge polls the upstream <code>cms-version.json</code> URL every 60 seconds.</li>
  <li>When the upstream version is higher than the deployed version, an <strong>Update Available</strong> badge appears in Settings.</li>
  <li>Click the badge to open the Update Modal — view the changelog, then choose <strong>Update Now</strong> or <strong>Schedule for Midnight</strong>.</li>
  <li>Update Now: enables maintenance mode → triggers the client repo's GitHub Actions workflow → monitors build progress → verifies the new version is live → disables maintenance mode.</li>
  <li>If the build fails, maintenance mode stays active until you investigate and disable it manually.</li>
</ol>

<h5 class="mt-4">Configuring GitHub Settings</h5>
<p>Go to <strong>Settings → CMS Updates</strong> and fill in:</p>
<table class="table table-sm">
  <thead class="table-light"><tr><th>Field</th><th>Description</th><th>Example</th></tr></thead>
  <tbody>
    <tr><td>GitHub PAT</td><td>Personal Access Token with <code>repo</code> + <code>workflow</code> scopes</td><td><code>ghp_xxx...</code></td></tr>
    <tr><td>Repo Owner</td><td>GitHub username or org that owns the client repo</td><td><code>YourOrg</code></td></tr>
    <tr><td>Repo Name</td><td>Client repository name</td><td><code>my-company-cms</code></td></tr>
    <tr><td>Workflow ID</td><td>Filename of the deploy workflow</td><td><code>deploy.yml</code></td></tr>
    <tr><td>Upstream Version URL</td><td>Raw URL to master's <code>cms-version.json</code></td><td><code>https://raw.githubusercontent.com/GavinHolder/white-label-cms/main/public/cms-version.json</code></td></tr>
  </tbody>
</table>

<p>Click <strong>Test &amp; Verify</strong> before saving — it checks PAT validity, repo access, workflow existence, and the upstream URL all at once.</p>

<h5 class="mt-4">Auto-Versioning on Master</h5>
<p>Every push to the <code>white-label-cms</code> master repo automatically bumps the version via GitHub Actions:</p>
<ul>
  <li><code>feat:</code> commits → <strong>minor bump</strong> (1.1.0 → 1.2.0)</li>
  <li><code>fix:</code> commits → <strong>patch bump</strong> (1.1.0 → 1.1.1)</li>
  <li><code>feat!:</code> or <code>BREAKING CHANGE</code> → <strong>major bump</strong> (1.0.0 → 2.0.0)</li>
  <li>Changelog is built automatically from commit messages</li>
</ul>
<p>You never need to manually edit <code>public/cms-version.json</code>.</p>

<h5 class="mt-4">Scheduled Updates</h5>
<p><strong>Schedule for Midnight</strong> stores the scheduled time in the database. The next visit to Settings triggers the update automatically when midnight passes — no cron daemon required.</p>

<h5 class="mt-4">Update Pipeline Flow</h5>
<ol>
  <li>Admin clicks <strong>Update Now</strong></li>
  <li>Maintenance mode enabled (public sees maintenance page)</li>
  <li>GitHub Actions <code>workflow_dispatch</code> triggered on client repo</li>
  <li>Client workflow merges upstream/main → builds Docker image → deploys to VPS</li>
  <li>Admin modal polls every 8 seconds — shows live GitHub Actions URL</li>
  <li>On success: health check verifies new version → maintenance mode disabled → page reloads</li>
  <li>On failure: maintenance mode stays on → admin investigates → disable manually in Settings → Site</li>
</ol>
`;

// ─────────────────────────────────────────────
// GOOGLE INTEGRATION DOCS
// ─────────────────────────────────────────────

export const GOOGLE_INTEGRATION_DOCS = `
# Google Integration Setup

Access via **Settings → Google Integration**.

This 5-step wizard registers your Google OAuth credentials so the CMS can connect to **Search Console** and **Google Business Profile** on your behalf.

---

## Before You Begin

You need three things ready before starting:

1. **A Google account** that already manages your Search Console property and/or Business Profile listing
2. **Access to Google Cloud Console** — it is free, no billing required for these APIs
3. **\`GSC_ENCRYPTION_KEY\` environment variable** set on your server — this 64-character hex key encrypts stored credentials using AES-256-GCM

   Generate the key with this command (run once, copy the output to your server environment):
   \`\`\`
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   \`\`\`

   > ⚠️ The Save button is disabled until this env var is detected on the server.

---

## Step 1 — Overview

The wizard checks whether your server is ready. Look for:
- 🟢 **Encryption configured** — you can proceed
- 🟡 **GSC_ENCRYPTION_KEY not set** — add the env var to your server and restart before continuing

Click **Get Started** to move to Step 2.

---

## Step 2 — Google Cloud Setup

Open [console.cloud.google.com](https://console.cloud.google.com) in another tab and complete these three actions (links provided in the wizard):

**a) Create or select a project**
If you don't have a Google Cloud project, click "Create Project". Name it anything (e.g. "My Company CMS"). Free tier is sufficient.

**b) Enable required APIs**
In the API Library, enable all five:
- **Google Search Console API**
- **My Business Account Management API**
- **My Business Business Information API**
- **Business Profile Performance API**
- **Google My Business API** (legacy v4 — access-gated: a new project has zero quota until you request access via Google's form, so enable the other four first; it's used for reviews & creating posts)

Search for each by name, click it, and click **Enable**.

**c) Configure the OAuth consent screen**
- Go to APIs & Services → OAuth consent screen
- Choose **External** (or Internal if using Google Workspace)
- Fill in App name and User support email
- Add your own Google account email as a **Test user**
- Keep publishing status on **Testing**. This app requests sensitive scopes (\`webmasters.readonly\`, \`business.manage\`), so setting it to "In production" without Google verification triggers an unverified-app warning

Click **Next: Create Credentials** in the wizard.

---

## Step 3 — Create OAuth 2.0 Credentials

In Google Cloud Console:

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Under **Authorised redirect URIs**, add both URIs shown in the wizard (use the Copy buttons):
   - \`https://yourdomain.com/api/seo/gsc/callback\` — Search Console OAuth return URL
   - \`https://yourdomain.com/api/gbp/callback\` — Business Profile OAuth return URL
5. Click **Create**
6. A modal appears — copy both the **Client ID** and **Client Secret** (they are only shown once)

> ⚠️ The redirect URIs must match exactly — including the protocol (\`https://\`). If your domain differs from where you opened the wizard, update the domain in Step 4.

Click **Next: Enter Details** in the wizard.

---

## Step 4 — Enter Credentials

Paste the values from Google Cloud:

| Field | What to paste |
|-------|--------------|
| **Google Client ID** | Ends in \`.apps.googleusercontent.com\` — validated in real-time |
| **Google Client Secret** | The long string shown after creating the credential. Leave blank to keep an already-saved value |
| **CMS Backend Domain** | The domain where this CMS backend runs — where the admin and OAuth callbacks live, **not** your public website/template domain. Auto-filled from your current URL; the \`/api/seo/gsc/callback\` path is added automatically. Only change it if the backend runs on a different origin |

The Client ID field turns green when the format is valid. The Client Secret field turns green when non-empty.

Click **Next: Verify & Save** to review.

---

## Step 5 — Verify & Save

Review the summary table:
- **Client ID** — shown with a validation checkmark
- **Client Secret** — masked as ●●●●●●●● with a checkmark when set
- **Redirect Base** — the domain used in the redirect URIs
- **Encryption** — should show **AES-256-GCM** in green

Click **Save Credentials**. The credentials are encrypted and stored in your database.

---

## After Saving

Go to **Content → SEO → Search Console** to connect your Google account:
1. Click **Connect Search Console**
2. Sign in with the same Google account that manages your Search Console property
3. Grant permissions (read access to Search Console data)
4. You are redirected back to the CMS — select your property from the dropdown

Go to **Content → SEO → Business Profile** to connect your listing similarly.

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| Save button stays grey | \`GSC_ENCRYPTION_KEY\` not set on server — add it and restart |
| "redirect_uri_mismatch" error from Google | The **CMS Backend Domain** in Step 4 must be the origin where this CMS runs (the callback path is appended automatically), and the full \`…/api/seo/gsc/callback\` URI must be registered in Google Cloud — re-check Steps 3 and 4 |
| Client ID validation fails | Must end in \`.apps.googleusercontent.com\` — copy directly from Google Cloud |
| "Failed to exchange code" error | Client Secret may be wrong — re-enter it in Step 4 |
| Properties list is empty after connecting | Your Google account doesn't manage any Search Console properties — verify in [search.google.com/search-console](https://search.google.com/search-console) |
`;

// ─────────────────────────────────────────────
// SEO WIZARD DOCS
// ─────────────────────────────────────────────

export const SEO_WIZARD_DOCS = `
<h4>SEO Wizard</h4>
<p class="lead">Auto-populate all SEO fields from a short guided questionnaire — no SEO knowledge required.</p>

<h5 class="mt-4">How to Use</h5>
<ol>
  <li>Go to <strong>Content → SEO</strong></li>
  <li>Click the <strong>SEO Wizard</strong> button (top right)</li>
  <li>Complete the 4-step wizard:
    <ul>
      <li><strong>Business Info</strong> — name, type, optional tagline</li>
      <li><strong>Location &amp; Contact</strong> — URL, phone, address, Twitter handle</li>
      <li><strong>Keywords &amp; Description</strong> — comma-separated keywords; preview the generated meta description live</li>
      <li><strong>Review &amp; Apply</strong> — SERP preview + field summary before committing</li>
    </ul>
  </li>
  <li>Click <strong>Apply to SEO</strong> — all fields are populated in memory</li>
  <li>Review the fields on each tab, then click <strong>Save Settings</strong></li>
</ol>

<h5 class="mt-4">What Gets Populated</h5>
<table class="table table-sm">
  <thead class="table-light"><tr><th>Field</th><th>Source</th></tr></thead>
  <tbody>
    <tr><td>Site Name</td><td>Business Name</td></tr>
    <tr><td>Default Meta Description</td><td>Auto-generated from tagline + keywords + location</td></tr>
    <tr><td>Canonical Base URL</td><td>Website URL</td></tr>
    <tr><td>Twitter Handle</td><td>Twitter / X Handle</td></tr>
    <tr><td>Structured Data (JSON-LD)</td><td>All business fields (enabled automatically)</td></tr>
  </tbody>
</table>

<p class="text-muted small">All fields can be manually edited after the wizard applies them. The wizard does not save automatically — you must click Save Settings.</p>
`;

// ─────────────────────────────────────────────
// CONTENT TYPES & BLOG
// ─────────────────────────────────────────────

const CONTENT_TYPES_DOCS = `
# Content Types

Content Types let you define structured data collections beyond standard pages and sections — perfect for **blog posts**, **team members**, **testimonials**, **FAQs**, and any custom data.

---

## How It Works

1. **Define a Type** — Go to **Content → Types** and create a new content type (e.g. "Blog Post", "Team Member")
2. **Add Fields** — Each type has a flexible field schema with many field types (see below)
3. **Create Entries** — Add entries to your content type with the structured editor
4. **Display on Site** — Entries are automatically available at \`/content/{type-slug}\` (listing) and \`/content/{type-slug}/{entry-slug}\` (detail)

## Field Types

| Field Type | Description | Example Use |
|------------|-------------|-------------|
| \`text\` | Single-line plain text | Title, name, tagline |
| \`richtext\` | Rich text editor with formatting | Body content, bio |
| \`image\` | Image upload via media picker | Featured image, avatar |
| \`date\` | Date/time picker | Published date, event date |
| \`number\` | Numeric input | Price, display order, rating |
| \`boolean\` | Toggle switch (true/false) | Featured flag, active status |
| \`select\` | Dropdown single-select | Category, status |
| \`multiselect\` | Multi-choice select | Tags, categories |
| \`url\` | URL input with validation | Website link, social profile |
| \`color\` | Colour picker | Theme colour, accent |

## Built-in Content Types

The CMS comes seeded with two content types:

### Blog Posts
- Fields: title, slug, excerpt, body (rich text), featured image, author, published date, tags
- Listing page: \`/blog\` (aliased from \`/content/blog-post\`)
- Detail page: \`/blog/{slug}\`
- RSS feed: \`/api/rss\` — auto-generated from published blog posts

### Team Members
- Fields: name, slug, role/title, bio, photo, email, phone, social links, display order
- Listing page: \`/team\` (aliased from \`/content/team-member\`)
- Detail page: \`/team/{slug}\`

## RSS Feed

An RSS 2.0 feed is automatically generated at \`/api/rss\` from all published blog post entries. The feed includes title, description, link, publication date, and excerpt for each post. Feed metadata (site name, description) comes from your SEO settings.

## Tags & Search

- Entries support **tags** — add tags when editing any entry to enable filtering
- The public listing pages include a **search bar** to filter entries by title or content
- Tag-based filtering is available on listing pages (click a tag to filter)

## Version History

Every time an entry is saved, a **version snapshot** is created automatically. You can:
- View all previous versions via the **History** button on any entry
- Preview any past version
- **Restore** a previous version (creates a new version — history is never deleted)

## Content Scheduling

Entries can be **scheduled** for future publication:
1. In the entry editor, click **Schedule** instead of **Publish**
2. Pick a future date and time
3. The entry stays in draft until the scheduled time, then auto-publishes

## Admin UI

- **Content → Types** — Create, edit, delete content types and their field schemas
- **Content → Entries** — List all entries for a type, with search, sort, and status filter
- **Entry Editor** — Full form editor with field validation, media picker, and preview
`;

// ─────────────────────────────────────────────
// BRAND TOKENS
// ─────────────────────────────────────────────

const BRAND_TOKENS_DOCS = `
# Brand Tokens

Brand Tokens define your site's visual identity as CSS custom properties — colours, fonts, spacing, and borders that cascade through every page and component automatically.

---

## How It Works

Go to **Settings → Brand** to manage your brand tokens.

---

## Colour Tokens

8 colour tokens define your palette:

| Token | CSS Variable | Purpose |
|-------|-------------|---------|
| **Primary** | \`--brand-primary\` | Main brand colour (buttons, links, accents) |
| **Primary Light** | \`--brand-primary-light\` | Lighter variant for hover states, backgrounds |
| **Primary Dark** | \`--brand-primary-dark\` | Darker variant for active states |
| **Secondary** | \`--brand-secondary\` | Supporting brand colour |
| **Accent** | \`--brand-accent\` | Highlight / call-to-action colour |
| **Neutral** | \`--brand-neutral\` | Text and border defaults |
| **Background** | \`--brand-background\` | Page background |
| **Surface** | \`--brand-surface\` | Card/panel backgrounds |

Each token has a swatch picker for quick selection plus a full colour picker for custom hex/rgb values.

---

## Typography

| Setting | CSS Variable | Description |
|---------|-------------|-------------|
| **Heading Font** | \`--brand-font-heading\` | Google Font for h1–h6 headings |
| **Body Font** | \`--brand-font-body\` | Google Font for body text and paragraphs |
| **Base Font Size** | \`--brand-font-size-base\` | Root font size (default: 16px) |
| **Scale Ratio** | — | Type scale multiplier for heading sizes (e.g. 1.25 = Major Third) |

- Fonts are auto-loaded from Google Fonts via \`<link>\` tag — no manual installation
- The font picker provides 100+ curated Google Font families
- Changes are visible instantly across the entire site

---

## Spacing

| Setting | CSS Variable | Description |
|---------|-------------|-------------|
| **Section Padding** | \`--brand-section-padding\` | Default vertical padding for sections (0–200px) |
| **Container Max Width** | \`--brand-container-max\` | Maximum content width (e.g. 1200px, 1400px) |

---

## Borders

| Setting | CSS Variable | Description |
|---------|-------------|-------------|
| **Border Radius** | \`--brand-radius\` | Default corner radius for cards, buttons, inputs |

---

## How CSS Variables Flow

1. Brand tokens are stored in the \`BrandToken\` Prisma model
2. On page load, the root layout injects all tokens as CSS custom properties on \`:root\`
3. Bootstrap overrides pick up the variables (e.g. \`--bs-primary\` maps to \`--brand-primary\`)
4. All sections, Volt designs, and components inherit the tokens automatically
5. Volt Designer colour pickers show brand swatches for easy consistency

## Pantone Reference Fields

Click the **Pantone** button in the Brand Colors header to reveal Pantone code fields alongside each hex color.

- Pantone codes are **reference-only** — they are stored in the database but do not affect CSS output
- Use them to document your brand's official Pantone color standards for design consistency
- Look up Pantone ↔ hex conversions at [pantone.com/color-finder](https://www.pantone.com/color-finder)
- Example: enter \`286 C\` next to Primary to record that your brand blue is Pantone 286 C

---

## Auto-Detect Colors

Click **Auto-Detect** in the Brand Colors header to scan all section content in your pages for hex color codes.

- The CMS reads up to 200 sections and extracts all \`#rrggbb\` hex values found in content JSON
- A color swatch panel appears showing detected colors
- Click any swatch to copy its hex code, then paste it into a color field
- Common noise colors (pure black \`#000000\` and white \`#ffffff\`) are filtered out automatically
- Useful when onboarding an existing site — find all colors used and set them as brand tokens

---

## Persistence

Brand tokens are stored in the **database** (SystemSettings table, key: \`brand_tokens\`). They survive redeploys and container restarts because they live in your persistent PostgreSQL database, not in environment variables or the filesystem.

The green **"Saved in database"** badge in the Brand Colors header confirms the current values came from the database.

---

## Technical Details

- Tokens stored in \`SystemSettings\` Prisma model (key: \`brand_tokens\`, JSON blob)
- CSS custom properties injected server-side in root layout on every page load
- Google Fonts loaded dynamically based on selected font families
- Bootstrap CSS variables (\`--bs-primary\`, \`--bs-body-font-family\`, etc.) are overridden to match brand tokens
- All brand values accessible in Volt Designer for design consistency
`;

// ─────────────────────────────────────────────
// SECTION TEMPLATE LIBRARY
// ─────────────────────────────────────────────

const SECTION_TEMPLATES_DOCS = `
# Template Library

The Template Library (**Admin → Content → Templates**) stores reusable templates that you build and save over time. Templates are not pre-built — you create them from your own pages and sections, then reuse them across the site.

You can also **import** an external HTML or ZIP file directly into the library — the CMS auto-uploads images, bundles JS/CSS, and guides you through wiring up forms, phone numbers, emails, and media.

---

## Template Types

| Type | What it stores | Where to use |
|------|---------------|-------------|
| **Standalone** | Full HTML + CSS + linked CSS files | Standalone page editor — Load Template |
| **Section** | Full section config (background, blocks, spacing, overlays) | Landing page — bookmark icon on any section row |
| **Page** | Full page config (future use) | — |

---

## Importing a Template (HTML or ZIP)

Click **Import Template** on the Templates page to bring in a design from outside the CMS.

### HTML file import

Drop or browse to a \`.html\` / \`.htm\` file. The CMS analyses the HTML and returns a checklist of integration points — forms, images, phone numbers, emails. You can fix them inline in the import modal, or use the **Analyse** button later. Name the template and click **Save to Library**.

### ZIP file import

Drop a \`.zip\` containing the HTML plus its asset folder. The CMS automatically:

| Asset | What happens |
|-------|-------------|
| Images (JPG, PNG, GIF, WebP, AVIF) | Converted to WebP, uploaded to Media Library, replaced with \`{{cms.media.SLOTNAME}}\` |
| SVGs | Uploaded as-is, replaced with \`{{cms.media.SLOTNAME}}\` |
| CSS files | Concatenated and stored in the template CSS field |
| JS files (non-minified) | Bundled inline just before \`</body>\` |
| Videos | Listed as "needs attention" — upload via Media Library manually (up to 200 MB) |

After import, a checklist shows what was auto-handled (green) and what still needs your attention (yellow).

---

## CMS Integration Analyser

Every **Standalone** template card has an **Analyse** button (pulse icon). Open it any time to scan the template HTML and fix integration issues inline.

### What the analyser detects

| Issue | Fix available |
|-------|--------------|
| \`<form>\` elements | Dropdown — pick a CMS Form page to replace the form block |
| Images (\`src\`, \`data-src\`, \`poster\`) | **Browse Library** per image — pick from your uploaded media |
| Background images (CSS \`background-image\`, \`data-background\`) | **Browse Library** per background |
| Videos (\`<video src>\`, \`<source src>\`) | **Browse Library** per video |
| Hardcoded phone numbers (\`tel:\` links) | One-click → \`{{cms.phone}}\` |
| Hardcoded email addresses (\`mailto:\` links) | One-click → \`{{cms.email}}\` |
| Coverage map slots (\`{{cms.media.*}}\` detected as map placeholder) | Dropdown — pick a coverage map, click **Link** → replaces with \`{{cms.coverageMap.SLUG}}\` |
| External CDN stylesheets | Informational only — no action needed |

The analyser shows **all** image and video sources — including CDN/external URLs — so you can replace any placeholder with a real image from your Media Library.

### Fixing issues inline

**Forms** — Select a CMS form from the dropdown, click **Link**. The \`<form>…</form>\` block is replaced with \`{{cms.form.SLUG}}\`.

**Images / Backgrounds / Videos** — Each detected source gets its own **Browse Library** button. Click it to open a thumbnail grid of your uploaded media files, then click any thumbnail to swap that specific URL. The button turns green (✓ Linked) once replaced.

**Phone / Email** — A single button replaces every matching link across the whole template at once.

### Saving fixes

A **Save N fixes** button appears as soon as you make any change. Fixes are applied live in memory — click Save to persist them to the database. The modal stays open so you can keep working.

### Re-linking later

The **Analyse** button is always available. Any image you skipped — or any image you want to swap for a different one — will appear again the next time you open the modal. You can relink any image as many times as you like.

### ZIP re-import

The bottom of the Analyse modal has a **Re-import from ZIP** drop zone. Drop a new ZIP to re-upload images, re-bundle JS/CSS, and update the template HTML in-place without losing its name, description, or other metadata.

---

## Saving a Template

### From a Standalone Page

1. Go to **Admin → Content → Pages**, click **Edit** on a Standalone page
2. In the HTML Editor modal, click **Save as Template** (bottom of the modal footer)
3. Enter a name and optional description, then click **Save Template**

### From a Landing Page Section

1. Go to **Admin → Content → Landing Page**
2. Click the **bookmark icon** in the action column of any section row
3. Enter a name and optional description — the full section config is captured automatically

---

## Using a Template

### In the Standalone Editor

Click **Load Template** in the HTML Editor modal footer. The picker shows only standalone templates. Selecting one populates the HTML, CSS, and CSS Files tabs — it does **not** change the page slug, type, or any structural setting.

### On the Landing Page

Click the **bookmark icon** on a section to load a saved section template into it.

---

## Built-in Templates

Some templates are marked **Built-in** — these ship with the CMS and cannot be deleted. They are seeded automatically on fresh installs via \`npm run db:seed\`.

Current built-ins:
- **Blank Standalone** — empty starting point for a standalone page
- **OVB Readymix Landing Page** — full standalone landing reference design

---

## Use as Page — Launch Any Template as a Live Page

**Standalone**, **Section**, and **Page** templates all have a **Use as Page** button (yellow rocket button on the card). This creates a live page in one step.

1. Go to **Admin → Content → Templates**
2. Click **Use as Page** on any template
3. Enter a **title** and **URL slug** (auto-generated from title, editable)
4. Choose whether to **Set as website homepage** (checkbox, on by default)
5. Click **Create Page** — the page is created and published immediately

**What gets created by template type:**
- **Standalone template** → A Standalone HTML page with the template's HTML/CSS pre-loaded.
- **Section template** → A full landing-style page with the template's section pre-added.
- **Page template** → A full page, ready to add sections.

The new page appears in **Admin → Content → Pages** and is live immediately.

---

## Managing Templates

Visit **Admin → Content → Templates** to:
- Browse all templates (filter by type, section type, search by name)
- See usage counts
- **Import** — bring in an external HTML or ZIP file
- **Analyse** — wire up CMS integration for any standalone template
- **Use as Page** — launch any template as a live page instantly
- Rename or delete user-created templates (built-ins cannot be deleted)
`;

// ─────────────────────────────────────────────
// CMS VARIABLES
// ─────────────────────────────────────────────

const CMS_VARIABLES_DOCS = `
# CMS Variables

CMS variables are placeholders in the form \`{{cms.something}}\` that the CMS replaces with live data at render time. Use them in standalone page HTML, CSS, and flexible section HTML blocks.

Update a value once in the admin — every page that references it updates automatically.

---

## 1. Company Info Variables

Set values at **Admin → Settings → Site Configuration**.

| Variable | Description | Example value |
|----------|-------------|--------------|
| \`{{cms.logo}}\` | Logo image URL | \`/uploads/logo.png\` |
| \`{{cms.company}}\` | Company name | \`OVB Readymix\` |
| \`{{cms.tagline}}\` | Tagline / slogan | \`Built for the Overberg\` |
| \`{{cms.phone}}\` | Phone number | \`021 123 4567\` |
| \`{{cms.email}}\` | Email address | \`info@ovbreadymix.co.za\` |
| \`{{cms.address}}\` | Street address | \`12 Industrial Rd\` |
| \`{{cms.city}}\` | City | \`Caledon\` |
| \`{{cms.postal}}\` | Postal / zip code | \`7230\` |
| \`{{cms.country}}\` | Country | \`South Africa\` |
| \`{{cms.copyright}}\` | Copyright text | \`© 2026 OVB Readymix\` |
| \`{{cms.facebook}}\` | Facebook URL | \`https://facebook.com/…\` |
| \`{{cms.instagram}}\` | Instagram URL | \`https://instagram.com/…\` |
| \`{{cms.twitter}}\` | Twitter / X URL | \`https://x.com/…\` |
| \`{{cms.linkedin}}\` | LinkedIn URL | \`https://linkedin.com/…\` |
| \`{{cms.youtube}}\` | YouTube channel URL | \`https://youtube.com/…\` |
| \`{{cms.tiktok}}\` | TikTok URL | \`https://tiktok.com/…\` |

---

## 2. Page Link Variables

Automatically generated from all enabled, published CMS pages.

\`\`\`
{{cms.pages.SLUG}}
\`\`\`

Returns the URL path for that page (\`/slug\`), or \`#\` if the page doesn't exist or is disabled.

**Examples:**
\`\`\`html
<a href="{{cms.pages.calculator}}">Get a Quote</a>
<a href="{{cms.pages.projects}}">Our Projects</a>
<a href="{{cms.pages.contact}}">Contact Us</a>
\`\`\`

> The **Variables tab** in the Standalone Editor lists every available page slug — all click-to-copy.

---

## 3. Feature Flag Variables

Automatically generated from all CMS feature flags (**Settings → Client Features**).

\`\`\`
{{cms.features.SLUG}}
\`\`\`

Returns \`"true"\` if the feature is enabled, \`"false"\` if disabled.

**Examples:**
\`\`\`html
<!-- Conditionally show a feature link in JavaScript -->
<script>
  if ("{{cms.features.concrete-calculator}}" === "true") {
    document.getElementById('calc-btn').style.display = 'block';
  }
</script>
\`\`\`

---

## 4. Media Slot Variables

Per-page named image slots. Managed in the **Media tab** of the Standalone HTML Editor.

\`\`\`
{{cms.media.SLOTNAME}}
\`\`\`

Returns the URL of the image assigned to that slot, or an empty string if no image is assigned.

**How to use:**
1. Open the Standalone Editor → **Media tab**
2. Click **Add Slot** → enter a name (e.g. \`hero-bg\`, \`team-photo\`)
3. Click **Pick Image** → select from the media library
4. Use \`{{cms.media.hero-bg}}\` anywhere in the HTML or CSS

**Examples:**
\`\`\`html
<!-- Background image -->
<div style="background-image: url({{cms.media.hero-bg}})">...</div>

<!-- Image tag -->
<img src="{{cms.media.about-photo}}" alt="About us">

<!-- CSS background -->
<style>
  .hero { background: url({{cms.media.hero-bg}}) center/cover no-repeat; }
</style>
\`\`\`

Swap the image anytime from the Media tab — the HTML never needs to change.

---

## 5. Form Injection Variables

Inject a complete CMS-managed form (with OTP verification, email notification, and leads DB) anywhere in your HTML.

\`\`\`
{{cms.form.SLUG}}
\`\`\`

The SLUG refers to the slug of a **Form page** (Admin → Content → Pages, type: Contact Form).

**Examples:**
\`\`\`html
<!-- Basic injection — form appears here -->
<section class="contact-section">
  <h2>Get in Touch</h2>
  {{cms.form.contact}}
</section>

<!-- Multiple forms on one page -->
{{cms.form.contact}}
{{cms.form.quote-request}}
\`\`\`

When any \`{{cms.form.*}}\` variable is used, \`/cms-forms.js\` is automatically added to the page \`<head>\`. No manual script tag needed.

> The **Variables tab** in the Standalone Editor lists every available form slug.

---

## Where Variables Work

| Location | Variables supported | When replaced |
|----------|-------------------|--------------|
| Standalone page HTML | All 5 types | Server-side at page load |
| Standalone page CSS | Company info + Media slots | Server-side at page load |
| FLEXIBLE section HTML blocks | Company info only | Client-side via \`window.__CMS_SITE\` |

---

## Developer: \`window.__CMS_SITE\`

On all standard (non-standalone) public pages, the CMS injects a JavaScript object you can read from inline scripts:

\`\`\`javascript
const site = window.__CMS_SITE;

site.companyName   // "OVB Readymix"
site.phone         // "021 123 4567"
site.navLinks      // [{ type, label, href, navOrder }]
site.pages         // { calculator: "/calculator", projects: "/projects", ... }
site.features      // { "concrete-calculator": true, "project-gallery": false }

// Example: build a dynamic nav
site.navLinks.forEach(link => {
  const a = document.createElement('a');
  a.href = link.href || '#';
  a.textContent = link.label;
  nav.appendChild(a);
});
\`\`\`

> Standalone pages are isolated and do **not** receive \`window.__CMS_SITE\`. Use \`{{cms.*}}\` server-side variables instead — they require no JavaScript.
`;

// ─────────────────────────────────────────────
// DESIGNER HANDOFF GUIDE
// ─────────────────────────────────────────────

const DESIGNER_HANDOFF_DOCS = `
# Designer Handoff — Wiring a Custom HTML Page into the CMS

When a graphic designer delivers a completed HTML/CSS page, use this guide to wire it into the CMS fully — images managed, forms working, feature links connected, and the page live at \`/\`.

---

## What the Designer Delivers

A typical handoff includes:
- \`index.html\` — the full page markup
- \`style.css\` — custom styles (or styles are inside \`<style>\` tags)
- Assets: images, fonts, icons (usually hosted on their server or CDN)

The designer **does not know** about your CMS pages, features, forms, or media library. That's your job to wire in.

---

## Step-by-Step Wiring Process

### 1. Create the Standalone Page

**Admin → Content → Pages → New Page → Standalone**

Set a slug:
- For the main website: \`home\` or \`landing\`
- For a specific route: \`services\`, \`about\`, etc.

### 2. Paste the HTML

Click **Edit** (pencil) on the new page → **HTML tab** → paste the full HTML.

If the designer used a separate CSS file, paste it into the **CSS tab**. If CSS is inside \`<style>\` tags in the HTML, leave it there — both work.

### 3. Add External Libraries

If the design uses Bootstrap, Google Fonts, or other CDN libraries, add them in the **CSS Files tab**. Common ones have quick-add buttons.

### 4. Replace Hardcoded Text with Company Variables

Open the **Variables tab** → click any variable to copy it → paste into the HTML to replace hardcoded text.

| Find in HTML | Replace with |
|--------------|-------------|
| Company name in header/footer | \`{{cms.company}}\` |
| Phone number | \`{{cms.phone}}\` |
| Email address | \`{{cms.email}}\` |
| Street address | \`{{cms.address}}\` |
| Copyright line | \`{{cms.copyright}}\` |
| Logo \`<img src="...">\` | \`<img src="{{cms.logo}}">\` |
| Social media href values | \`{{cms.facebook}}\`, \`{{cms.instagram}}\`, etc. |

### 5. Replace Hardcoded Images with Media Slots

For every image the designer hardcoded (hero backgrounds, team photos, gallery slides, etc.):

1. Open **Media tab → Add Slot**
2. Name the slot descriptively: \`hero-background\`, \`team-photo\`, \`carousel-slide-1\`
3. Click **Pick Image** → upload or select from the media library
4. In the HTML, replace:
   \`\`\`html
   <!-- Before -->
   <img src="https://designers-cdn.com/hero.jpg" alt="Hero">
   <div style="background: url(https://designers-cdn.com/bg.jpg)">

   <!-- After -->
   <img src="{{cms.media.hero-background}}" alt="Hero">
   <div style="background: url({{cms.media.hero-background}})">
   \`\`\`

Now the image lives in **your media library** and can be changed from the Media tab at any time.

### 6. Replace Hardcoded Links with Page/Feature Variables

For every internal link the designer hardcoded:

1. Open the **Variables tab → Page Links** section
2. Find the page you want to link to, copy its variable
3. Replace the hardcoded href:

\`\`\`html
<!-- Before -->
<a href="/calculator">Get a Quote</a>
<a href="/our-projects">View Projects</a>
<a href="/contact">Contact Us</a>

<!-- After -->
<a href="{{cms.pages.calculator}}">Get a Quote</a>
<a href="{{cms.pages.projects}}">View Projects</a>
<a href="{{cms.pages.contact}}">Contact Us</a>
\`\`\`

If a page doesn't exist or is disabled, the variable returns \`#\` — the link becomes inert, nothing breaks.

**For feature-gated links** (only show when feature is enabled), use \`{{cms.features.SLUG}}\`:
\`\`\`html
<script>
  // Hide the calculator button if the feature is disabled
  if ("{{cms.features.concrete-calculator}}" !== "true") {
    document.querySelector('.calc-btn').style.display = 'none';
  }
</script>
\`\`\`

### 7. Replace Hardcoded Forms with CMS Form Injection

If the designer included a contact form or quote form:

1. Open **Variables tab → Form Injection** section
2. Find the form page slug you want to inject (e.g. \`contact\`, \`quote-request\`)
3. In the HTML, **delete** the designer's \`<form>...</form>\` block entirely
4. Place the injection variable where the form was:

\`\`\`html
<!-- Before: designer's hardcoded form -->
<form action="mailto:info@example.com" method="post">
  <input type="text" name="name" placeholder="Your Name">
  <input type="email" name="email" placeholder="Email">
  <button type="submit">Send</button>
</form>

<!-- After: CMS-managed form with OTP verification -->
{{cms.form.contact}}
\`\`\`

The CMS renders the full form with all configured fields, OTP email verification, and admin notification.

If you need a **custom-styled form** that matches the design exactly, use the manual approach instead — see **CMS Variables → Form Injection Variables** for the \`data-cms-form\` method.

### 8. Save and Preview

Click **Save All** → click **Preview** to verify everything renders correctly.

Check:
- ✅ All text replaced (no hardcoded company names, phone numbers, emails)
- ✅ All images loading (no broken image icons)
- ✅ All links working (click each internal link)
- ✅ Form submits (fill in and submit the form — check admin email)
- ✅ Features accessible (check calculator, projects, etc.)

### 9. Set as Homepage (if this is the main website page)

1. **Settings → Site Config → Homepage Entry Point**
2. Select this page from the dropdown
3. Click **Save Configuration**

Visitors hitting your domain root (\`/\`) are transparently served this page. The slug URL is never shown.

---

## Common Issues & Fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| Image shows broken icon | Media slot has no image assigned | Go to Media tab → pick image for that slot |
| Link goes to \`#\` | Page doesn't exist or is disabled | Create the page in Admin → Pages, or enable it |
| Form doesn't submit | Form page not enabled | Admin → Pages → enable the form page |
| Feature link broken | Feature not enabled | Settings → Client Features → enable it |
| Styles look wrong | Designer's CSS conflicts | Add the designer's CSS framework via CSS Files tab, or paste CSS into CSS tab |

---

## Maintaining the Page Over Time

Once wired up, the designer's HTML rarely needs to change:

| What changes | Where to change it |
|-------------|-------------------|
| Company phone, email, address | Settings → Site Config |
| Logo | Settings → Site Config → Branding |
| Hero background image | Standalone Editor → Media tab |
| Gallery images | Standalone Editor → Media tab → update each slot |
| Form fields | Admin → Pages → edit the form page |
| Links to new pages | Automatically updated when you create pages with matching slugs |

The template variable system means **the designer's HTML is the shell — the CMS fills in all the content.**
`;

// ─────────────────────────────────────────────
// FORM SUBMISSIONS
// ─────────────────────────────────────────────

const FORM_SUBMISSIONS_DOCS = `
# Form Submissions Inbox

All contact form and page form submissions are collected in a dedicated admin inbox with full detail views.

---

## Accessing Submissions

Go to **Content → Form Submissions** in the admin sidebar.

## Features

### Submission List
- All submissions listed chronologically (newest first)
- Shows: form name, submitter email/name, date, read/unread status
- Click any submission to open the detail panel

### Detail Panel
- Full submission data displayed in a clean read-only layout
- All form fields shown with labels and values
- Metadata: submission date, source page URL, IP address (if collected)
- Mark as read/unread
- Delete individual submissions

### Filtering
- Filter by form name (if multiple forms exist)
- Filter by read/unread status
- Search by submitter name or email

## How Forms Create Submissions

When a visitor submits a contact form or page form:
1. OTP verification completes (if enabled)
2. Submission is saved to the \`FormSubmission\` database table
3. Admin notification email is sent (if configured in Settings → Email)
4. Submission appears in the admin inbox immediately
`;

// ─────────────────────────────────────────────
// CONTENT SCHEDULING & VERSION HISTORY
// ─────────────────────────────────────────────

const CONTENT_SCHEDULING_DOCS = `
# Content Scheduling & Version History

Schedule content to go live at a future date/time, and track all changes with automatic version history.

---

## Content Scheduling

### How It Works
1. Edit any section or page content
2. Instead of clicking **Save**, click **Schedule**
3. Pick a date and time for the content to go live
4. The content is saved as a scheduled version — the current live content remains unchanged
5. A background cron job checks every minute for scheduled content that's due
6. When the scheduled time arrives, the new content replaces the live version automatically

### Managing Scheduled Content
- Scheduled items show a clock icon and the scheduled date
- Cancel a scheduled publish at any time before it goes live
- Multiple items can be scheduled independently

## Version History

### How It Works
Every time content is saved or published, a version snapshot is created automatically.

### Version History UI
- Click **History** on any section or page to see all previous versions
- Each version shows: date, author, change summary
- Click any version to preview it
- Click **Restore** to revert to a previous version (creates a new version, doesn't delete history)

### What's Tracked
- Section content changes
- Page metadata changes
- Designer data changes
- Scheduled publish events
`;

// ─────────────────────────────────────────────
// SECURITY HARDENING
// ─────────────────────────────────────────────

const SECURITY_HARDENING_DOCS = `
# Security Hardening

The CMS includes multiple security layers to protect against common web attacks.

---

## Rate Limiting

All API endpoints are rate-limited to prevent abuse:

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication (login, OTP) | 5 requests | 15 minutes |
| Admin API (CRUD operations) | 100 requests | 1 minute |
| Public API (content reads) | 200 requests | 1 minute |
| Form submissions | 10 requests | 10 minutes |

When a rate limit is exceeded, the API returns \`429 Too Many Requests\` with a \`Retry-After\` header.

## Audit Logs

All admin actions are logged to the \`AuditLog\` table:

- **What's logged:** Login/logout, content create/update/delete, settings changes, user management, media uploads
- **What's captured:** User ID, action type, resource type, resource ID, IP address, timestamp, before/after values
- **Viewing logs:** Settings → Audit Log (SUPER_ADMIN only)
- **Retention:** Logs are kept indefinitely (future: configurable retention policy)

## Security Headers

The CMS sets secure HTTP headers on all responses:
- \`X-Content-Type-Options: nosniff\`
- \`X-Frame-Options: SAMEORIGIN\`
- \`X-XSS-Protection: 1; mode=block\`
- \`Referrer-Policy: strict-origin-when-cross-origin\`
- \`Strict-Transport-Security\` (when HTTPS is enabled)

## Open Redirect Prevention

All redirect endpoints validate the target URL:
- Only relative paths and same-origin URLs are allowed
- External redirect attempts are blocked and logged
- Applies to login redirects, OAuth callbacks, and admin navigation

## Code Injection Prevention

- All user input is sanitised before storage and rendering
- Rich text fields use a whitelist of allowed HTML tags
- SVG uploads are sanitised to remove script elements
- JSON fields are validated against schemas before storage
`;

// ─────────────────────────────────────────────
// CMS UPDATE CHANNELS
// ─────────────────────────────────────────────

const UPDATE_CHANNELS_DOCS = `
# Update Channels

Client CMS instances subscribe to an update channel that controls which version stream they track.

---

## Available Channels

| Channel | Stability | How It's Published | Best For |
|---------|-----------|-------------------|----------|
| **Latest** | Unstable | Auto — every push to main | Development / staging |
| **Bugfix** | High | Auto — fix-only pushes | Production (conservative) |
| **Stable** | High | Manual tag \`stable-v*\` | Production instances |
| **LTS** | Highest | Manual tag \`lts-v*\` | Enterprise / critical sites |
| **Experimental** | Low | Manual tag \`experimental-v*\` | Beta testing |

## How Channels Work

1. Every push to \`main\` auto-bumps \`cms-version.json\` (the "latest" channel)
2. Fix-only pushes also update \`versions/bugfix.json\`
3. To promote a version to stable or LTS, the maintainer creates a git tag:
   - \`git tag stable-v1.8.1 && git push origin stable-v1.8.1\`
   - \`git tag lts-v1.8.1 && git push origin lts-v1.8.1\`
4. GitHub Actions automatically publishes the channel manifest
5. Client instances polling that channel see "Update available"

## Choosing a Channel

- **Stable** is recommended for most production sites
- **LTS** for sites that need maximum stability and infrequent updates
- **Bugfix** for sites that only want security/bug fixes, never new features
- **Latest** only for development/staging environments

## Configuring Your Channel

1. Go to **Settings → CMS Updates**
2. Select your preferred channel from the dropdown
3. The upstream URL auto-updates to the correct manifest
4. Click **Test & Verify** then **Save**

## Global Update Notifications

When the main CMS repo publishes a new version:
1. The \`notify-clients.yml\` workflow reads the client registry (\`CLIENTS.json\`)
2. Each registered client repo's deploy workflow is dispatched
3. Client admins see the "Update available" badge
4. Clients with \`auto_deploy: true\` automatically merge and deploy
`;

// ─────────────────────────────────────────────
// ACTIVITY LOG
// ─────────────────────────────────────────────

const ACTIVITY_LOG_DOCS = `
# Activity Log

Track every admin action with a comprehensive audit trail.

---

## Accessing the Log

Go to **Activity Log** in the admin sidebar.

## What's Logged

Every admin action is automatically recorded:

| Action | Examples |
|--------|---------|
| **Auth** | Login, logout, failed login attempts |
| **Pages** | Create, update, delete, publish, unpublish |
| **Sections** | Create, update, delete, reorder |
| **Media** | Upload, delete, rename |
| **Users** | Create, update role, deactivate, delete |
| **Settings** | Any settings change (site config, SEO, email, etc.) |

## Log Entry Details

Each entry records:
- **Timestamp** — exact time of the action
- **User** — who performed the action
- **Action** — what was done (create, update, delete, login, etc.)
- **Resource** — what was affected (page, section, user, etc.)
- **IP Address** — where the request came from

## Filtering

Use the resource type filter at the top to narrow results:
- All, Auth, Pages, Sections, Media, Users, Settings

## Pagination

Logs are displayed 50 per page with pagination controls at the bottom.
`;

// ─────────────────────────────────────────────
// REDIRECTS
// ─────────────────────────────────────────────

const REDIRECTS_DOCS = `
# Redirects

Manage HTTP redirects for URL migrations and link management.

---

## Accessing Redirects

Go to **Redirects** in the admin sidebar.

## Creating a Redirect

1. Click **Add Redirect**
2. Enter the **From** path (e.g. \`/old-page\`)
3. Enter the **To** path or URL (e.g. \`/new-page\` or \`https://example.com\`)
4. Select the **Status Code**:
   - **301** — Permanent redirect (SEO-friendly, search engines update their index)
   - **302** — Temporary redirect (search engines keep the old URL)
   - **307** — Temporary redirect (preserves request method)
5. Click **Save**

## Managing Redirects

- **Hit Count** — see how many times each redirect has been triggered
- **Enable/Disable** — toggle redirects on/off without deleting them
- **Edit** — change the destination or status code
- **Delete** — permanently remove a redirect

## Use Cases

- Page URL changed after redesign
- Old marketing campaign URLs
- Merging duplicate pages
- External link forwarding
`;

// ─────────────────────────────────────────────
// SITE CONFIGURATION
// ─────────────────────────────────────────────

const SITE_CONFIG_DOCS = `
# Site Configuration

Configure your company's identity and contact information used across the website.

---

## Accessing Site Config

Go to **Settings → Site Config** in the admin sidebar.

## Fields

### Company Info
- **Company Name** — displayed in navbar, footer, and SEO
- **Tagline** — short description shown in header areas
- **Logo URL** — main logo displayed in the navbar
- **Favicon URL** — browser tab icon

### Contact Details
- **Phone** — displayed in footer and contact sections
- **Email** — public contact email
- **Address, City, Postal Code, Country** — used in footer and structured data

### Social Media Links
- Facebook, Instagram, Twitter/X, LinkedIn, YouTube, TikTok
- Enter full URLs — these appear as social icons in the navbar and footer

### Display Options
- **Navbar Style** — choose the navigation layout
- **Copyright Text** — footer copyright line
- **Show Regulatory Links** — toggle compliance/regulatory section in footer

### Homepage Entry Point
- **Which page loads at \`/\`** — select any enabled page from the dropdown to serve it at your website root
- Leave on **"Default: Landing page with sections"** to use the standard section-based landing page
- When a page is selected, visitors going to \`/\` are transparently served that page — the URL stays \`/\`, nothing internal is ever exposed
- Works with **any page type**: Standalone (custom HTML), Full Page, Designer, Form, PDF
- To revert to the default landing page, set the dropdown back to "Default" and save

> 💡 This is how you set a **Standalone** or **custom HTML page** as your actual website — no redirects, no exposed internal URLs. The visitor only ever sees \`/\`.
`;

// ─────────────────────────────────────────────
// API KEYS
// ─────────────────────────────────────────────

const API_KEYS_DOCS = `
# API Keys

Manage API keys for third-party integrations like the Blender 3D addon.

---

## Accessing API Keys

Go to **Settings → API Keys** in the admin sidebar.

## Creating a Key

1. Click **Generate New Key**
2. Enter a **label** (e.g. "Blender Addon", "External Script")
3. The key is displayed **once** — copy it immediately
4. Click **Done**

## Managing Keys

- **Label** — descriptive name for the key
- **Last Used** — timestamp of the most recent API call using this key
- **Delete** — revoke the key permanently

## Security

- Keys are shown in full only once at creation time
- After creation, only a prefix is visible in the list
- Deleting a key immediately revokes all access
- Use separate keys for each integration so you can revoke individually
`;

// ─────────────────────────────────────────────
// FEATURES SYSTEM
// ─────────────────────────────────────────────

const FEATURES_SYSTEM_DOCS = `
# Features

Toggle optional CMS features on or off for your site.

---

## Accessing Features

Go to **Features → Manage Features** in the admin sidebar.

## Available Features

| Feature | Description | Settings Page |
|---------|-------------|---------------|
| **Concrete Calculator** | Volume and cost calculator for concrete orders | Features → Concrete Calculator |
| **Coverage Maps** | Interactive service area maps with regions | Features → Coverage Maps |
| **Projects** | Portfolio/case study gallery with categories | Features → Projects |

## How It Works

Each feature is a toggle switch:
- **Enabled** — the feature's public pages are visible, and its admin settings appear in the sidebar
- **Disabled** — the feature is completely hidden from the public site and admin sidebar

Feature state is stored in the \`ClientFeature\` database table and can be toggled by SUPER_ADMIN users only.

## Concrete Calculator

When enabled, provides a concrete volume calculator at \`/calculator\`:
- Configure price per cubic meter
- Set quote reference prefix and counter
- Manage materials library
- Generate PDF quotes

## Coverage Maps

When enabled, provides interactive maps showing service coverage:
- Create multiple maps with regions
- Define polygon boundaries for each region
- Assign colours and labels to regions
- Embed maps on any page

## Projects Gallery

When enabled, provides a portfolio gallery at \`/projects\`:
- Create project entries with images and descriptions
- Categorise projects
- Toggle featured status
- Published/draft workflow
`;

// ─────────────────────────────────────────────
// NAVBAR LINKS
// ─────────────────────────────────────────────

const NAVBAR_LINKS_DOCS = `
# Navbar Links

Configure the navigation link structure for your site's top navigation bar.

---

## Accessing Navbar Links

Go to **Settings → Navbar Links** in the admin sidebar, or use the **Navbar** editor under Content.

## Link Types

| Type | Description |
|------|-------------|
| **Page Link** | Links to a CMS page by slug (e.g. \`/about\`) |
| **Section Anchor** | Scrolls to a section on the homepage (e.g. \`#services\`) |
| **External URL** | Links to any external website |

## Managing Links

- **Add Link** — create a new navigation link with label and destination
- **Reorder** — drag and drop to rearrange link order
- **Edit** — change label, destination, or link type
- **Delete** — remove a link

## CTA Button

The navbar supports an optional call-to-action button:
- **Label** — button text (e.g. "Contact Us")
- **URL** — destination when clicked
- **Variant** — button style (primary, outline, etc.)
`;

// ─────────────────────────────────────────────
// BACKUP & RESTORE
// ─────────────────────────────────────────────

const BACKUP_RESTORE_DOCS = `
# Backup & Restore

Create full site backups and restore from them — including database, media files, settings, plugins, and all content.

---

## Creating a Backup

Go to **Settings → Data Management**.

Click **Create Full Backup**. This captures:

| Data | Included |
|------|----------|
| All database tables (pages, sections, users, content types, entries, volt designs, plugins, settings, media records, redirects, audit logs, form submissions, coverage maps, projects) | ✅ |
| Media files (\`/public/uploads/\`) | ✅ |
| Config files (SEO config, navbar config) | ✅ |
| User accounts (including password hashes) | ✅ |
| Plugin configurations | ✅ |

The backup is saved as a ZIP file on the server (\`/data/backups/\`) and can also be downloaded to your computer.

## Backup History

The Data Management page shows all server-stored backups with:
- Date and time created
- File size
- **Download** — save to your computer for off-site storage
- **Restore** — restore the site to this backup's state
- **Delete** — remove the backup file

## Restoring from a Backup

### Selective Restore

You don't have to restore everything. Choose what to restore:

| Category | What it restores |
|----------|-----------------|
| **Everything** | Full wipe + replace all data |
| **Settings** | System settings, site config, brand tokens, navbar, SEO |
| **Pages & Sections** | All pages and their sections |
| **Content** | Content types, fields, entries, versions |
| **Media** | Media library records + upload files |
| **Volt Designs** | All vector designs and 3D assets |
| **Users** | User accounts and API keys |
| **Plugins** | Plugin configurations |
| **Forms & Logs** | Form submissions, audit logs, redirects |
| **Features** | Coverage maps, projects |

### Safety Backup

Before ANY restore, the system **automatically creates a safety backup** of the current state. If something goes wrong, you can restore from the safety backup.

### Restore from Upload

You can also upload a previously downloaded backup ZIP to restore from it. This is useful for:
- Migrating between servers
- Restoring from an off-site backup
- Cloning a site configuration to a new client

## Important Notes

- **SUPER_ADMIN only** — only super administrators can create backups or restore
- **Treat backup files as sensitive** — they contain password hashes and all site data
- Backups are stored in \`/data/backups/\` which persists across Docker redeployments (via volume mount)
- The restore process is transactional — if it fails partway through, the safety backup is available
`;

// ─────────────────────────────────────────────
// CMS SETUP WIZARD
// ─────────────────────────────────────────────

const SETUP_WIZARD_DOCS = `
# CMS Setup Wizard

When you first deploy a new CMS instance, the Setup Wizard guides you through connecting it to your GitHub repository and deployment infrastructure.

---

## When It Appears

A yellow **"CMS needs configuration"** banner appears on the Dashboard when the setup hasn't been completed. Click it to open the wizard at \`/admin/setup\`.

You can also access it directly at any time via the URL.

## Setup Steps

### Step 1: Site Identity

| Field | Description | Example |
|-------|-------------|---------|
| Company Name | Your business name | "Acme Corp" |
| Site Domain | Your live website URL | "www.acmecorp.co.za" |

### Step 2: GitHub Connection

These settings enable the **CMS Update System** — pulling updates from the main white-label CMS repository.

| Field | Description | Example |
|-------|-------------|---------|
| Repo Owner | GitHub username or org | "GavinHolder" |
| Repo Name | Your client CMS repo name | "acme-cms" |
| GitHub PAT | Personal Access Token (needs \`repo\` + \`workflow\` scope) | "ghp_xxxx..." |
| Workflow ID | Deploy workflow filename | "deploy.yml" |
| Upstream URL | Main CMS version check URL | Pre-filled automatically |

Click **Test GitHub Connection** to verify:
- ✅ PAT is valid and has correct scopes
- ✅ Repository exists and is accessible
- ✅ Deploy workflow file exists
- ✅ Upstream version URL is reachable

### Step 3: Portainer Deployment

These settings enable **automatic deployment** when updates are merged.

| Field | Description | Example |
|-------|-------------|---------|
| Portainer URL | Your Portainer instance URL (no trailing slash) | "https://portainer.acme.co.za" |
| Username | Portainer login username | "admin" |
| Password | Portainer login password | "MySecurePass" |
| Stack ID | From the Portainer stack URL (\`?id=X\`) | "5" |
| Endpoint ID | From the Portainer URL (\`#!/X/docker/...\`) | "3" |

Click **Test Portainer Connection** to verify:
- ✅ Authentication succeeds
- ✅ Stack exists and is accessible
- ✅ Endpoint exists

### Step 4: Review & Save

Shows a summary of all configured values (passwords masked). Green checkmarks indicate verified connections. Click **Complete Setup** to save everything.

## After Setup

- The dashboard banner disappears
- CMS Update system works (Settings → CMS Updates → Update Now)
- Auto-updates from the main CMS repo flow through automatically
- You can re-run the wizard at any time by visiting \`/admin/setup\`

## Skipping Setup

Click **"Skip for now"** to dismiss the wizard. The dashboard banner remains until setup is completed. The CMS works without setup — but updates and auto-deploy won't function.
`;

// ─────────────────────────────────────────────
// PLUGIN SYSTEM
// ─────────────────────────────────────────────

const PLUGIN_SYSTEM_DOCS = `
# Plugin System

Every CMS feature is a **plugin** — a self-contained unit that can be enabled or disabled per client. Plugins register their routes, sidebar items, settings tabs, and database models via a manifest.

---

## Plugin Manager

Go to **Plugins** in the admin sidebar (or \`/admin/plugins\`).

### What You See

Plugins are grouped into tiers:

| Tier | Description | Can Disable? |
|------|-------------|--------------|
| **Core** | Pages, Auth, Media, Settings, Updates | No — always active |
| **Standard** | Content Types, Volt Studio, Brand Tokens, Templates, Forms, Activity Log, Redirects, Code Injection | Yes |
| **Optional** | Concrete Calculator, Coverage Maps, Projects | Yes (disabled by default) |

### Enable / Disable

- Click the toggle switch on any non-core plugin
- Disabled plugins: their sidebar items disappear, their routes become inactive
- Core plugins: toggle is locked — you can't disable pages, auth, or media

### Dependencies

Some plugins depend on others. For example, if Plugin B depends on Plugin A:
- You can't disable Plugin A while Plugin B is enabled
- The toggle shows a warning listing which plugins depend on it

---

## How Plugins Work

Each plugin has a **manifest** that declares:

| Field | Purpose |
|-------|---------|
| **Routes** | Admin pages, API endpoints, and public pages the plugin provides |
| **Sidebar Items** | Navigation links added to the admin sidebar when enabled |
| **Settings Tabs** | Tabs added to the Settings page |
| **Prisma Models** | Database tables the plugin owns |
| **Dependencies** | Other plugins this one requires |
| **Tier** | core / free / pro / enterprise (for SaaS pricing) |

### Plugin Lifecycle

1. On CMS boot: all built-in manifests are seeded into the Plugin table
2. Existing plugins keep their enabled/disabled state
3. New plugins (from updates) appear automatically
4. Sidebar and routes are built dynamically from enabled plugins

---

## Breaking Change Detection

When updating the CMS, the update modal shows which **enabled plugins** are affected by breaking changes:

- Each breaking change is tagged with which plugins it affects
- The modal shows: plugin name, severity (low/medium/high/critical), and migration steps
- Unaffected plugins show a green "safe" indicator
- You must acknowledge breaking changes before updating

### Commit Format for Breaking Changes

\`\`\`
feat!: rename CSS variable [affects:brand-tokens]
fix!: change field validation [affects:content-types]
\`\`\`

The \`[affects:plugin-slug]\` tag tells the system which plugin is impacted.

---

## Auto-Update Flow

When the main CMS pushes a new version:

1. \`auto-version.yml\` bumps \`cms-version.json\`
2. \`notify-clients.yml\` reads \`CLIENT_REGISTRY\` secret
3. Each registered client's deploy workflow is dispatched
4. Client merges upstream → tests → builds Docker image → Portainer redeploys

Clients configure their connection to the main CMS in **Settings → CMS Updates**.

---

## Adding a Plugin (for developers)

1. Create a manifest in \`lib/plugins/manifests.ts\`
2. Implement routes, components, and API endpoints
3. The manifest declares everything the plugin provides
4. On next boot, the plugin appears in Plugin Manager automatically
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
      { id: "tab-triangle", label: "Section Intro Tab", icon: "bi-triangle", content: TAB_TRIANGLE },
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
      { id: "flex-toolbar", label: "Toolbar & Canvas", icon: "bi-tools", content: FLEXIBLE_TOOLBAR },
      { id: "flex-config", label: "Section Configuration", icon: "bi-columns-gap", content: FLEXIBLE_CONFIG },
      { id: "flex-elements", label: "Block Library & Elements", icon: "bi-collection", content: FLEXIBLE_ELEMENTS },
      { id: "flex-properties", label: "Properties Panel", icon: "bi-sliders", content: FLEXIBLE_PROPERTIES },
      { id: "flex-styling", label: "Element Styling", icon: "bi-palette", content: FLEXIBLE_STYLING },
      { id: "flex-layers", label: "Layers, Menus & Shortcuts", icon: "bi-list-nested", content: FLEXIBLE_LAYERS_MENUS },
      { id: "flex-wrapper", label: "Wrapper Modal & Save", icon: "bi-window-stack", content: FLEXIBLE_WRAPPER },
      { id: "flex-animations", label: "Section Animations (AnimBg)", icon: "bi-layers", content: FLEXIBLE_ANIMATIONS },
      { id: "flex-scroll-stage", label: "Scroll Stage (Parallax Zones)", icon: "bi-layers-half", content: SCROLL_STAGE_DOCS },
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
    id: "coverage-map",
    label: "Coverage Map",
    icon: "bi-map",
    children: [
      { id: "coverage-overview",  label: "Overview & Setup",        icon: "bi-info-circle",   content: COVERAGE_MAP_OVERVIEW },
      { id: "coverage-admin",     label: "Admin: Maps & Regions",   icon: "bi-pencil-square", content: COVERAGE_MAP_ADMIN },
    ],
  },
  {
    id: "projects-gallery",
    label: "Projects Gallery",
    icon: "bi-building",
    children: [
      { id: "projects-overview",  label: "Gallery & Lightbox",      icon: "bi-images",        content: PROJECTS_GALLERY_DOCS },
    ],
  },
  {
    id: "gallery",
    label: "Photo Gallery",
    icon: "bi-images",
    children: [
      { id: "gallery-overview", label: "Categories & Images", icon: "bi-grid", content: GALLERY_DOCS },
    ],
  },
  {
    id: "content-types",
    label: "Content Types & Blog",
    icon: "bi-journal-text",
    children: [
      { id: "content-types-overview", label: "Content Types", icon: "bi-collection", content: CONTENT_TYPES_DOCS },
      { id: "form-submissions", label: "Form Submissions Inbox", icon: "bi-inbox", content: FORM_SUBMISSIONS_DOCS },
      { id: "content-scheduling", label: "Scheduling & Version History", icon: "bi-clock-history", content: CONTENT_SCHEDULING_DOCS },
    ],
  },
  {
    id: "pages",
    label: "Pages System",
    icon: "bi-files",
    children: [
      { id: "pages-overview", label: "Overview, Anatomy & Page Types", icon: "bi-diagram-3", content: PAGES_SYSTEM },
      { id: "pages-full-designer", label: "Full & Designer Pages", icon: "bi-easel", content: PAGES_FULL_DESIGNER },
      { id: "pages-pdf", label: "PDF Pages", icon: "bi-file-earmark-pdf", content: PAGES_PDF },
      { id: "pages-form", label: "Form Pages", icon: "bi-input-cursor-text", content: PAGES_FORM },
      { id: "pages-standalone", label: "Standalone HTML Pages", icon: "bi-code-slash", content: PAGES_STANDALONE },
      { id: "pages-features", label: "Feature Pages & Submissions", icon: "bi-puzzle", content: PAGES_FEATURES },
      { id: "pages-linking", label: "Linking to Pages (LinkPicker)", icon: "bi-link-45deg", content: PAGES_LINKING },
      { id: "pages-seo", label: "Publishing & SEO", icon: "bi-search", content: PAGES_PUBLISHING_SEO },
    ],
  },
  {
    id: "templates",
    label: "Template Library",
    icon: "bi-bookmark-star",
    children: [
      { id: "section-templates", label: "Using Templates", icon: "bi-grid-3x3-gap", content: SECTION_TEMPLATES_DOCS },
      { id: "designer-handoff", label: "Designer Handoff Guide", icon: "bi-palette2", content: DESIGNER_HANDOFF_DOCS },
      { id: "cms-variables", label: "CMS Variables ({{cms.*}})", icon: "bi-braces", content: CMS_VARIABLES_DOCS },
    ],
  },
  {
    id: "seo",
    label: "SEO Management",
    icon: "bi-search",
    children: [
      { id: "seo-overview", label: "Site Settings & Per-Page SEO", icon: "bi-search", content: SEO_MANAGEMENT },
      { id: "seo-wizard", label: "SEO Wizard", icon: "bi-magic", content: SEO_WIZARD_DOCS },
      { id: "google-integration", label: "Google Integration Setup", icon: "bi-google", content: GOOGLE_INTEGRATION_DOCS },
    ],
  },
  {
    id: "navigation",
    label: "Navigation",
    icon: "bi-compass",
    children: [
      { id: "nav-overview", label: "Navbar Settings", icon: "bi-layout-text-window-reverse", content: NAVIGATION },
      { id: "nav-links", label: "Navbar Links", icon: "bi-link-45deg", content: NAVBAR_LINKS_DOCS },
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
      { id: "site-config", label: "Site Configuration", icon: "bi-building", content: SITE_CONFIG_DOCS },
      { id: "brand-tokens", label: "Brand Tokens", icon: "bi-palette2", content: BRAND_TOKENS_DOCS },
      { id: "maintenance-mode", label: "Maintenance Mode", icon: "bi-cone-striped", content: MAINTENANCE_MODE_DOCS },
      { id: "security", label: "Security Hardening", icon: "bi-shield-check", content: SECURITY_HARDENING_DOCS },
      { id: "cms-updates", label: "CMS Update System", icon: "bi-arrow-up-circle", content: CMS_UPDATES_DOCS },
      { id: "update-channels", label: "Update Channels", icon: "bi-broadcast", content: UPDATE_CHANNELS_DOCS },
      { id: "api-keys", label: "API Keys", icon: "bi-key", content: API_KEYS_DOCS },
      { id: "media", label: "Media Library", icon: "bi-image", content: MEDIA_LIBRARY },
      { id: "users", label: "Users & Roles", icon: "bi-people", content: USERS },
      { id: "activity-log", label: "Activity Log", icon: "bi-clock-history", content: ACTIVITY_LOG_DOCS },
      { id: "redirects", label: "Redirects", icon: "bi-signpost-split", content: REDIRECTS_DOCS },
      { id: "features-system", label: "Features", icon: "bi-toggles", content: FEATURES_SYSTEM_DOCS },
      { id: "plugin-system", label: "Plugin System", icon: "bi-puzzle", content: PLUGIN_SYSTEM_DOCS },
      { id: "backup-restore", label: "Backup & Restore", icon: "bi-archive", content: BACKUP_RESTORE_DOCS },
      { id: "setup-wizard", label: "Setup Wizard", icon: "bi-magic", content: SETUP_WIZARD_DOCS },
    ],
  },
  {
    id: "volt-designer",
    label: "Volt Designer",
    icon: "bi-vector-pen",
    children: [
      { id: "volt-overview", label: "Overview, Top Bar & Canvas", icon: "bi-info-circle", content: VOLT_OVERVIEW },
      { id: "volt-canvas-nav", label: "Canvas & Navigation", icon: "bi-arrows-move", content: VOLT_CANVAS_NAV },
      { id: "volt-tools", label: "Tool Palette & Drawing", icon: "bi-pencil", content: VOLT_TOOLS },
      { id: "volt-layers", label: "Layers Panel & Selection", icon: "bi-stack", content: VOLT_LAYERS },
      { id: "volt-roles", label: "Layer Roles", icon: "bi-tags", content: VOLT_ROLES },
      { id: "volt-vertex", label: "Vertex & Bezier Editing", icon: "bi-bezier2", content: VOLT_VERTEX },
      { id: "volt-slots", label: "Slot System", icon: "bi-layout-text-window", content: VOLT_SLOTS },
      { id: "volt-effects", label: "Layer Properties: Fill, Stroke & Shadow", icon: "bi-palette", content: VOLT_EFFECTS },
      { id: "volt-boolean", label: "Boolean Operations", icon: "bi-intersect", content: VOLT_BOOLEAN },
      { id: "volt-3d", label: "3D Objects", icon: "bi-box", content: VOLT_3D },
      { id: "volt-card-settings", label: "Card Settings (Flip · Tilt)", icon: "bi-arrow-repeat", content: VOLT_CARD_SETTINGS },
      { id: "volt-overflow-bleed", label: "Canvas Overflow & Bleed", icon: "bi-fullscreen", content: VOLT_OVERFLOW_BLEED },
      { id: "volt-carousel", label: "Carousel / Multi-Slide", icon: "bi-collection-play", content: VOLT_CAROUSEL },
      { id: "volt-animation", label: "Animation & Timeline", icon: "bi-play-circle", content: VOLT_ANIMATION },
      { id: "volt-menus", label: "Floating & Context Menus", icon: "bi-menu-button-wide", content: VOLT_MENUS },
      { id: "volt-ux", label: "UX & Shortcuts", icon: "bi-keyboard", content: VOLT_UX_DOCS },
      { id: "volt-data-model", label: "Data Model & Modals", icon: "bi-diagram-3", content: VOLT_DATA_MODEL },
    ],
  },
];
