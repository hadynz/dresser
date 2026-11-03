# Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-10-30 | Project folder created | Starting discovery |
| 2026-10-31 | Product is a free-standing bedroom **wardrobe** for homeowners in **Egypt** | User answers |
| 2026-10-31 | Arabic (RTL) mandatory, English second, i18n from day one | Egyptian market |
| 2026-10-31 | Preset layouts first, limited customisation | Woodworkers follow repeatable rules |
| 2026-10-31 | Schematic 3D, not photo-real; mobile-first | User answer; low-end phones |
| 2026-10-31 | Crude configurable pricing for MVP; deposit to order | Prove demand first |
| 2026-10-31 | Back office excluded from MVP; extras deferred | Scope |
| 2026-10-31 | Built POC (`poc/`) to show the Egypt team; payments and persistence out of scope | Show, don't tell |
| 2026-10-31 | POC uses the proposed defaults below (1–4 equal sections, preset interiors, hinged/sliding/none) | To be corrected by the workshop |
| 2026-10-31 | Design shared via URL hash; no backend | Cheapest way to send a specific design to Egypt |
| 2026-11-03 | Public GitHub repo `hadynz/dresser`, GitHub Pages | Free Pages needs a public repo (user chose public over paid private) |
| 2026-11-03 | Build dark mode | Momin's feedback |
| 2026-11-03 | Keep cut list at the bottom of the demo, labelled as the admin/workshop experience | Demo value; real admin login later |
| 2026-11-03 | **Sections are the core building block.** Start from a preset of 2–3 sections; customer adds/removes sections; tapping a section in 3D focuses editing on it | Construction is modular (Momin: 120 = 2 × 60) |
| 2026-11-03 | Section widths come from a fixed list of standard widths (proposed 40/50/60/80/100, default 60; confirm with Momin) | Easier manufacturing |
| 2026-11-03 | Customer sets **both** total width and section widths, both constrained: sections must fit inside the total width. Can't add a section unless there's room; widen the total first | User: e.g. 70 cm total fits one 60 section; 140 fits two 60s |
| 2026-11-03 | Whole-wardrobe settings: height, depth, material, handle style, top-cabinet height. Per section: width, interior, drawers, shelves | Agreed |
| 2026-11-03 | Hinged doors only for now (sliding dropped); a section's doors open when tapped | Sliding panels span sections, which breaks modularity |
| 2026-11-03 | Add (copies last) / duplicate / remove / move left-right; max 6 sections | Agreed; duplicate = Momin's "repeat above" |
| 2026-11-03 | Tap a section in 3D: highlight + form shows that section; camera stays put; "Whole wardrobe" tab to go back | Agreed |
| 2026-11-03 | Keep the named starter designs (rebuilt from sections); open on a 2-section design | Shows range in demos |
| 2026-11-03 | Dark mode follows the phone setting, with a toggle; 3D room darkens too (not black) | Agreed |
| 2026-11-03 | Customer sees a simple price (size, extras, total); detailed breakdown + cut list sit at the bottom as the "Workshop view (admin only)" | Momin's feedback |
| 2026-11-03 | **Lighting, mirrors etc. become accessories** the customer adds (not door finishes) | User |
| 2026-11-03 | Leftover width: wardrobe is the sum of its sections, show "X cm of space left", and suggest a better fit (e.g. widen a section) | Respect the user's input, stay within standard sizes, suggest changes |
| 2026-11-03 | "Add section" allowed whenever the space left ≥ the smallest standard width | Mixed widths are fine |
| 2026-11-03 | Shrinking total width below the sections automatically narrows/removes sections, explained with a message, **with undo/redo** for every change | Permissive and creative; undo removes the risk of losing work |
| 2026-11-03 | One height for the whole wardrobe (main body ≤ 240 cm + optional top cabinet 30/35/40/45) | Agreed |
