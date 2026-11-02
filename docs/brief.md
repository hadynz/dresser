# Product brief (v1, updated 2026-10-31)

A mobile-first web app where Egyptian homeowners design a **free-standing bedroom wardrobe**
(locally called a "dresser" / دولاب), see it in interactive 3D, get an instant quote and pay a
deposit to order. Woodworkers in Egypt build it by hand from a generated cut sheet; we deliver and install.

## Market
- Egypt first. Customers: homeowners wanting a standalone wardrobe.
- Language: **Arabic required (RTL)**, English as second language (i18n from day one).
- Currency EGP, units cm.
- New business. Sales handled by a contact in Egypt using the prototype.

## Configuration (constrained, preset-first)
- Customer sets **width, height, depth** within limits (defaults in decisions.md, to be tuned).
- Start from **preset layouts**, then limited tweaks: number of drawers (fixed drawer height),
  hanging rail on/off, shelves.
- **Doors**: options incl. none / hinged / sliding, panel types plain / mirror / glass.
- **Materials**: solid wood, veneer, MDF/melamine, painted. Must be visually distinguishable.
- Extras (legs, lighting, locks, cornice...): **out of scope for now**.
- Open: single carcass vs. multiple sections (see open-questions.md).

## Visuals
- 3D, rotatable/zoomable. **Schematic, not photo-real**, but clearly shows material, mirror vs glass,
  drawers, rails, shelves. Must run well on mid/low-end Android phones.

## Pricing and ordering
- MVP: **crude pricing formula**, configurable, tweak later. Losing money early is acceptable; goal is
  proving demand.
- Instant quote → customer pays a **deposit** → serious engagement begins.
- Lead time shown on site, configurable.
- Customers can **save designs** and come back.

## Back office / manufacturing
- Hand-built from drawings (no CNC).
- Goal: app generates a **cut sheet** per order; woodworkers follow preset rules/models rather than
  reinventing each piece. Accurate cut sheet is a later goal.
- Back office (order management) **excluded from MVP**.

## Hosting
- Code on GitHub; user expects hosting via GitHub (see decisions: GitHub Pages is static-only).
