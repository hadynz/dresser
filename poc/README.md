# Wardrobe configurator: proof of concept

Shows the Egypt team that a customer can design a wardrobe on a phone, in Arabic, and see it in 3D.
Not production code: no payments, no accounts, and prices are placeholders.

## Run
```
npm install
npm run dev        # dev server with hot reload, on the LAN
npm run build      # static site in dist/ (can go on GitHub Pages as-is)
npm run preview    # serve the built site on :4173
```

## How it works
One design object (`src/model/design.ts`) is the single source of truth:

| File | Role |
|---|---|
| `model/design.ts` | The customer's choices, limits, construction constants, starter designs, `normalize()` |
| `model/build.ts` | Design → list of physical parts (boards, rails, doors, drawers) + warnings |
| `model/pricing.ts` | Parts → crude EGP price. **All rates are guesses** in `RATES` |
| `model/cutlist.ts` | Parts → grouped cut list for the workshop |
| `three/Scene.tsx` | Parts → 3D (React Three Fiber). Doors and drawers animate open |
| `i18n.ts` | Arabic (default, RTL) and English strings |
| `App.tsx` | The form |

The current design is stored in the URL hash, so "Copy link" shares an exact design.

## Things to confirm with the workshop
Everything in `design.ts` under "Construction constants" and `LIMITS`, the starter designs, the
Arabic workshop terms in `i18n.ts`, and every number in `RATES`.
