# DEK → Hilti · SAP order-entry mockup (duvo demo)

A lightweight **frontend simulation of SAP** for the Builder Day hackathon. It
recreates the manual order-entry process where a Hilti operator keys a DEK
purchase order into SAP, and surfaces the time saved by automating it with duvo.

There is **no real SAP / Supabase connection yet** — data is local mock data
whose shape mirrors the planned Supabase schema 1:1, so the real connectors drop
in later without touching the UI.

## Run

```bash
npm install
npm run dev   # http://localhost:3000
```

## Screens (the workflow, 1:1 with `docs/hilti-dek-workflow.png`)

1. **Příchozí PDF** — the PDF order from DEK + manual check + `V pořádku?` decision.
2. **Zadání objednávky (ME21N)** — the SAP order-entry grid. Per-line checks light
   up the status bar (green/amber/red). Interactive error branches:
   - out of stock → delay notice to DEK (non-blocking),
   - discontinued article → successor + notify DEK → rewrite,
   - bad quantity / wrong warehouse (type a bad value) → verify with DEK → rewrite.
   All resolved lines rejoin the stock check, exactly as the diagram shows.
3. **Dokončení** — completion + confirmation e-mail to DEK, the action log, and the
   `po_line_validation` log (every check + error is recorded — the "log to DB" output).
4. **Úspora s duvo** — ROI calculator. 150 runs/week × 10 min → projected hours and
   CZK saved per week / month / year, with editable assumptions and a live session counter.

## Architecture

- **Next.js 16 (App Router) + Tailwind v4**, deployable to Vercel.
- `src/lib/types.ts` — row shapes mirroring the Supabase tables (PRD §8).
- `src/lib/mockData.ts` — seed data (PRD §9) + a random-order generator. **The only
  place to swap for real Supabase reads.**
- `src/lib/checks.ts` — thin, "SQL-backed-style" checks: `checkMaterial`, `checkQty`,
  `checkWarehouse`, `checkAvailability`, + the outcome → status-message map.
- `src/lib/savings.ts` — the time-savings / CZK model.
- `src/lib/store.tsx` — React store (reducer) holding workflow state, the validation
  log, and the action log.
- `src/components/` — SAP shell (toolbar + tabs + **status bar**), the four screens,
  the MMBE stock panel, and the action log.

## Plugging in Supabase later

Replace the lookups in `src/lib/mockData.ts` (`findMaterial`, `stockAvailability`,
`getPoLines`, …) with Supabase queries against the matching tables and the
`stock_availability` view. The duvo backend can update rows in the DB; this app
reads them. Nothing in the components or checks needs to change.
