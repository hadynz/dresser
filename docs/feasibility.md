# Feasibility assessment (2026-10-31)

**Verdict: feasible.** Each piece uses mature, free technology. The risks are business ones
(pricing accuracy, payments in Egypt, delivery logistics), not technical ones.

## Core idea: one design model drives everything
```
WardrobeDesign (JSON: size, bays, interior per bay, doors, material)
   ├─ validate()   → is it buildable? (rules, min/max, rail clearance)
   ├─ toPanels()   → list of boards with exact dimensions and material
   │     ├─ 3D view (each panel = a box mesh)
   │     ├─ price  (panel area × rate + hardware)
   │     └─ cut sheet (panel list + dimensioned drawings, Arabic)
   └─ serialise()  → save / share link / order
```
Because the 3D view, the price and the cut sheet all come from the same panel list, they never
disagree. A basic cut sheet is almost free once this exists; making it *accurate* (joinery,
edge banding, tolerances) is the later work.

## Components
| Part | Approach | Difficulty |
|---|---|---|
| 3D view | React Three Fiber; boxes per panel; simple wood textures, reflective mirror, transparent glass; orbit controls; doors can open | Low–medium |
| Configurator UI | Mobile bottom-sheet steps: Size → Layout → Interior → Doors → Material → Quote | Medium |
| Arabic/English | i18next + RTL layout (Tailwind logical properties), Arabic font (e.g. Cairo/Tajawal) | Low, if done from day one |
| Rules engine | Pure TypeScript functions, unit tested | Medium (where the real thinking is) |
| Pricing | Config-file formula | Low |
| Save/share | Design encoded in URL + localStorage; share to WhatsApp | Low |
| Order + deposit | Needs backend + Egyptian gateway (Paymob/Kashier/Fawry). Stripe does not appear to onboard Egypt-based merchants (verify) | Medium; gated on company registration |
| Cut sheet | PDF/printable page: panel list + front/side drawings in cm | Basic: low; accurate: medium–high |
| Back office | Order list, statuses, scheduling | Later phase |

## Hosting
GitHub Pages serves static files only: fine for the **prototype** (configurator, price, share
link, order request via WhatsApp/form). Taking payments and storing orders/accounts needs a
backend: Supabase (DB + auth by phone) or Cloudflare Workers, with code still on GitHub.

## Phased plan
1. **Sales prototype** (static, GitHub Pages): 3D configurator, presets + tweaks, doors, materials,
   Arabic/English, crude price, save/share link, "Order" → sends design + price to the sales contact's
   WhatsApp. Deposit collected manually. Roughly 2–4 weeks of focused work.
2. **MVP**: backend, phone-number accounts, saved designs, online deposit via Paymob, order records,
   notifications, admin-editable prices/lead time, basic printable cut sheet per order.
3. **Operations**: back office, accurate cut sheets and drawings, install scheduling, extras
   (legs, lighting, handles, cornice), more layouts.

## Main risks
- **Price accuracy**: crude formula can lose money per order; accepted for now. Calibrate with
  woodworkers' real costs after the first orders.
- **Payments**: local gateways need a registered business; manual deposit until then.
- **Delivery**: big wardrobes vs. narrow stairs/lifts. Design as modules assembled on site.
- **Low-end phones**: keep geometry simple, textures small; test on a cheap Android.
- **Woodworker adoption**: cut sheet must match how they already work (Arabic, cm, their
  board sizes). Show them a sample early.
- **Fit in the room**: customer measures wrong. Add a "measure your space" guide and a final
  confirmation call after the deposit.
