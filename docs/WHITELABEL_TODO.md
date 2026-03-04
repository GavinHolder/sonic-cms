# White-Label CMS — Setup TODO

> **For Claude:** Read this at the start of every session in this project.
> This project is a white-label fork of `sonic-website` (D:\Projects\2026\sonic-website).
> The sonic-website project must NEVER be touched from here.
> Work through the tasks below in order.

---

## What This Project Is

A generic CMS platform stripped of all ISP (Internet Service Provider) branding.
Intended for a **concrete / ready-mix company** — the business owner will do the final
content customisation. Our job is to remove ISP-specific features and replace
"Sonic" branding with "Your Company" placeholders.

---

## Task Checklist

### Phase 1 — Remove ISP Price Card

- [ ] **`components/sections/FlexibleSectionRenderer.tsx`**
  - Remove the `case "isp-price-card"` block (starts around line 795)
  - Remove all ISP Price Card CSS classes at top of file (lines ~131–200)
  - Remove `IspPriceCard`, `IspPriceCardAurora`, `IspPriceCardHeroHeader` components (lines ~853–1150)

- [ ] **`public/flexible-designer.html`**
  - Remove the draggable element card for ISP Price Card (~line 1164)
  - Remove the default config entry `'isp-price-card': { ... }` (~line 1380)
  - Remove the `case 'isp-price-card':` render block (~line 2002)
  - Remove `case 'isp-price-card':` from the properties panel switch (~line 3449)
  - Remove `'isp-price-card':'bi-credit-card-2-front'` from the icon map (~line 4303)

---

### Phase 2 — Remove WiFi Pulse & Fibre Pulse Animations

- [ ] **`components/sections/AnimBgRenderer.tsx`**
  - Remove the `fibre-pulse` branch (~line 129–131)
  - Remove the `wifi-pulse` branch (~line 132–135)

- [ ] **`lib/anim-bg/animators.ts`** (or wherever `fibrePulseAnimator` / `wifiPulseAnimator` live)
  - Remove both animator functions entirely

- [ ] **`lib/anim-bg/`** — check for dedicated fibre/wifi animator files and delete them

- [ ] **`components/admin/AnimBgEditor.tsx`** (or similar editor UI)
  - Remove "Fibre Pulse" and "WiFi Pulse" from the animation type dropdown/list

---

### Phase 3 — Strip ISP References from Docs

- [ ] **`lib/admin/docs-content.ts`**
  - Remove `const ANIM_FIBRE` constant (~line 434)
  - Remove `const ANIM_WIFI` constant (~line 465)
  - Remove `{ id: "anim-fibre", ... }` entry from `DOC_TOPICS` (~line 1902)
  - Remove `{ id: "anim-wifi", ... }` entry from `DOC_TOPICS` (~line 1903)
  - Remove ISP Price Card section from `FLEXIBLE_ELEMENTS` constant (~lines 1153–1182 — Package Type, glow variants table)
  - Update `FLEXIBLE_ELEMENTS` element count (was "11 element types" → "10 element types")
  - Remove ISP-specific animation descriptions from `SECTION_TYPES` comparison table if present

---

### Phase 4 — Update Branding

- [ ] **`package.json`** — change `"name": "sonic-website"` → `"name": "white-label-cms"`

- [ ] **`prisma/seed.ts`**
  - Change admin user email from `admin@sonic.co.za` (or similar) to `admin@yourcompany.co.za`
  - Remove ISP-specific seeded sections (Plans Overview, Coverage Map, etc.)
  - Keep: Hero, About/Normal section, CTA Footer — with generic placeholder content

- [ ] **`lib/admin/docs-content.ts`**
  - Replace "SONIC" / "Sonic ISP" / "Sonic CMS" → "Your Company CMS" in the overview text
  - Replace "South African ISP" description → "business website platform"

- [ ] **`deploy/app/docker-compose.yml`** (and `.env.example`)
  - Change default db name `sonic_cms` → `cms_db`
  - Change container names `sonic-app` / `sonic-db` → `app` / `db`

- [ ] **`CLAUDE.md`** — update project description at the top to reflect this is a generic CMS

---

### Phase 5 — Final Verification

- [ ] Run `npm install` to restore node_modules
- [ ] Create `.env` from `.env.example` with a local DB URL (`cms_db`)
- [ ] Run `npx prisma migrate dev` to apply all migrations
- [ ] Run `npm run db:seed` to seed generic data
- [ ] Run `npm run dev` and verify:
  - Admin panel loads at `/admin/login`
  - Landing page editor has no ISP Price Card in the designer
  - Animation picker has no WiFi/Fibre Pulse options
  - No "Sonic" branding visible in the UI

---

## Notes

- The source project (`sonic-website`) is **live in production** — never modify it
- All Prisma migrations are already included — no new migrations needed for Phase 1–4
- The flexible designer (`public/flexible-designer.html`) is vanilla JS — edit carefully
- Keep all other animations (floating shapes, gradient, particles, waves, parallax, 3D tilt, custom code)
- Keep all other block types (text, image, video, button, banner, card, stats, divider, html, hero)
- The OTP / Email feature is fully included and works identically

---

## Business Context (for content guidance)

**Target industry:** Concrete / Ready-Mix company
**Typical pages needed:**
- Home (hero + about + products/services + CTA)
- Products (ready-mix concrete grades, pump hire, aggregate)
- About Us
- Contact / Quote Request (form page with OTP)

The business owner will customise content — our job is just the clean white-label base.
