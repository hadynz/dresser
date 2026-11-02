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

## Proposed defaults (not yet confirmed by user)
- Structure: one carcass divided into **1–4 bays** (vertical sections), each bay gets its own preset interior.
- Overall size (cm): width 80–300 (step 10), height 180–260 (step 5), depth 55–65 (step 5, default 60).
  Bay width 40–100. Board 18 mm.
- Drawers: fixed 20 cm fronts, 0–4 per bay, bottom of bay only.
- Hanging rail: needs ≥ 100 cm clear (short hang) or ≥ 150 cm (long hang).
- Bay presets: Long hang · Hang + drawers · Shelves · Double hang · Drawers + shelves.
- Doors: none / hinged (1 or 2 per bay) / sliding (2–3 panels across full width, adds ~8 cm depth).
  Panels: plain, mirror, clear glass, frosted glass. Handle choice later.
- Pricing (all rates in one config file): panel area m² × material rate + per drawer + door area × panel-type
  rate + per rail + flat hardware + flat delivery/install, × margin. Deposit % configurable (start 30%).
- Stack: React + TypeScript + Vite, React Three Fiber (Three.js), Zustand state, i18next, Tailwind (RTL).
- Prototype hosting: static on GitHub Pages; designs saved in the URL + browser storage; order request via
  WhatsApp/lead form. Real payments need a small backend (Supabase/Cloudflare) and an Egyptian gateway (Paymob).
