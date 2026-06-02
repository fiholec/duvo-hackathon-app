# DEK → Hilti · SAP order-entry mockup (duvo demo)

A lightweight **frontend simulation of SAP** for the Builder Day hackathon. It
recreates the manual order-entry process where a Hilti HQ operator keys a DEK
purchase order into SAP, and surfaces the time saved by automating it with duvo.

The UI is in **English** and uses **real routes** (multi-page App Router), not a
single-page app.

There is **no real SAP / Supabase connection yet** — data is local mock data
whose shape mirrors the planned Supabase schema 1:1, so the real connectors drop
in later without touching the UI.

## Run

```bash
npm install
npm run dev   # http://localhost:3000  (redirects to /inbox)
```

## Routes (the workflow, 1:1 with `docs/hilti-dek-workflow.png`)

- `/inbox` — **Incoming PDF**: the PDF order from DEK + manual check + `OK?` decision.
- `/order-entry` — **Order entry (ME21N)**: the SAP order-entry grid. Per-line checks
  light up the status bar (green/amber/red). Interactive error branches:
  - out of stock → delay notice to DEK (non-blocking),
  - discontinued article → successor + notify DEK → rewrite,
  - bad quantity / invalid warehouse (type a bad value) → verify with DEK → rewrite.
  All resolved lines rejoin the stock check, exactly as the diagram shows.
- `/completion` — **Completion**: completion + confirmation e-mail to DEK, the action
  log, and the `po_line_validation` log (every check + error is recorded).
- `/processed-orders` — output queue of finished orders (operator or duvo agent).
- `/audit-log` — the full `audit_log`, filterable by actor, exportable as JSON.
- `/savings` — **Savings with duvo**: ROI calculator. 150 runs/week × 10 min → projected
  hours and CZK saved per week / month / year, with editable assumptions.

## Warehouses (the `target_storage_location`)

The warehouse number on an order is a **variable supplied by the company / DB**, not a
value baked into the app. HQ operates **every** warehouse regardless of its city
(Prague, Brno, Ostrava, …). On entry, each line's warehouse number is **validated
against the company warehouse master** (`storageLocations` / `companyWarehouses` in
`src/lib/mockData.ts`): an unknown number is rejected as an invalid warehouse, and a
known warehouse where the material isn't maintained is flagged separately. Nothing in
the logic hardcodes a single warehouse code.

## Architecture

- **Next.js 16 (App Router, route segments) + Tailwind v4**, deployable to Vercel.
- `src/app/layout.tsx` — root layout: the SAP shell (toolbar + route tabs + **status bar**)
  wraps every page; `StoreProvider` lives here so workflow state survives navigation.
- `src/app/*/page.tsx` — one route per screen.
- `src/lib/types.ts` — row shapes mirroring the Supabase tables (PRD §8).
- `src/lib/mockData.ts` — seed data (PRD §9), the **company warehouse master**, and a
  random-order generator. **The only place to swap for real Supabase reads.**
- `src/lib/checks.ts` — thin, "SQL-backed-style" checks: `checkMaterial`, `checkQty`,
  `checkWarehouse` (warehouse-number validity + maintenance), `checkAvailability`.
- `src/lib/savings.ts` — the time-savings / CZK model.
- `src/lib/store.tsx` — React store (reducer) holding workflow state, the validation
  log, and the action log. Navigation is handled by the router, not store state.
- `src/components/` — SAP shell (toolbar + tabs + **status bar**), the screens, the
  MMBE stock panel, and the action log.

## Plugging in Supabase later

Replace the lookups in `src/lib/mockData.ts` (`findMaterial`, `stockAvailability`,
`getPoLines`, `storageLocations`/`companyWarehouses`, …) with Supabase queries against
the matching tables and the `stock_availability` view. The duvo backend can update rows
in the DB; this app reads them. Nothing in the components or checks needs to change.
