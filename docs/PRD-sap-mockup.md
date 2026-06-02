# PRD — SAP order-entry mockup (DEK → Hilti)

**Project:** Builder Day hackathon · faithful simulation of the manual order-entry process
**Stack:** Supabase (Postgres) · Next.js (App Router) · Vercel
**Team:** 4 people · **Timebox:** one hackathon day
**Reference artifacts:** process flowchart (authoritative) · PO `NO-540-26-01605` (live demo data)

> Scope rule for this PRD: model the **as-is** process exactly as the diagram shows it. No automation, no process improvements, no extra features. Optimization is out of scope and handled later.

---

## 1. Problem & context

Stavebniny DEK sends purchase orders to Hilti as PDFs by email. A Hilti operator reads each PDF, manually checks it, and keys every line into SAP by hand. SAP is the single source of truth: if a material, warehouse, or stock level isn't in SAP, it doesn't exist.

The process has one main (error-free) branch and a branched error path that, once resolved with DEK, rejoins the main flow at the stock check. This project recreates that environment — a believable SAP screen backed by a real (small) database — and faithfully reproduces the manual steps and SAP's reactions.

## 2. Goals

- A SAP-look order-entry screen plus an `MMBE`-style stock display.
- A real SSOT: Supabase Postgres, availability computed in one place.
- Faithful reproduction of every node in the flowchart — main branch and error branch — including the loop-back.
- Deployed on Vercel, demoable end-to-end with PO `NO-540-26-01605`.

## 3. Non-goals (explicitly out of scope)

- No PDF parsing, OCR, or LLM extraction. The operator types manually — that is the process.
- No automation of any step. No process optimization.
- No real email sending. External email/phone steps are represented as operator actions that show in the status bar / action log; nothing is actually sent.
- No auth, multi-tenancy, or RLS. One operator, one session.

## 4. User

Single persona: the **Hilti order-entry operator**. Reads the PDF, manually checks it, keys lines into SAP, resolves errors with DEK, completes the order.

## 5. Process (1:1 with the flowchart)

### Main (error-free) branch

1. **Firma DEK** sends the order **by email**.
2. **PDF objednávka** arrives.
3. **Manuální kontrola PDF** — operator manually checks the PDF (critical step).
4. **V pořádku?** (decision, human judgment):
   - **ANO** → continue to step 5.
   - **NE (chyba)** → error branch (§5 below).
5. **Manuální zadání do SAP** — operator manually keys the order into SAP.
6. **Zboží skladem?** (decision, backed by **SAP dle produktu zobrazí skladovou dostupnost**):
   - **Je skladem** → go straight to completion.
   - **Není skladem** → **Upozornění na zpoždění emailem do DEK** (delay notice), **and only then** continue to completion. Short stock does **not** block the order.
7. **Dokončení objednávky**.
8. **Potvrzení obj. emailem do DEK** (end node).
9. End of process.

### Error branch (from "NE / chyba")

The PDF check found an error. It splits by error type into three streams; all three converge and rejoin the main flow at the stock check.

**A) Chyba v artiklu** (wrong/unclear product code)
- **SAP dle produktu zobrazí "správnost" + následovník artiklu** — SAP shows the correct article and any successor.
- **Má následovníka?**
  - **Má následovníka** → **oznámení o změně následovníka mailem na DEK** → after agreement, manual rewrite into SAP.
  - **Nemá následovníka (neexistuje)** → **manuální ověření mailem/callem na DEK** → loops back to **Firma DEK** (DEK must re-clarify / re-order).

**B) Chyba v množství**
- **SAP dle produktu zobrazí "správnost" množství** → **manuální ověření mailem/telefonem na DEK** → manual rewrite into SAP.

**C) Chyba v cílovém skladu**
- Directly **manuální ověření mailem/telefonem na DEK** → manual rewrite into SAP.

**Convergence:** all three streams meet at **Manuální přepis do SAPu po odsouhlasení** (the red node). From there an arrow returns to **Zboží skladem?** — the corrected order rejoins the main flow (stock check → completion → confirmation email).

## 6. Node coverage (what the mockup renders vs. external steps)

Every diagram node maps to either a SAP screen the mockup renders, an external manual/email action (shown but not executed), or a decision.

| Diagram node | Type | In the mockup |
|--------------|------|---------------|
| Firma DEK / posílá emailem / PDF objednávka | External | On-screen PDF reference only |
| Manuální kontrola PDF | Manual | Operator reads the PDF (no SAP screen) |
| V pořádku? | Decision | Human judgment |
| Manuální zadání do SAP | SAP screen | **Order-entry grid** |
| Zboží skladem? / SAP zobrazí skladovou dostupnost | SAP screen + decision | **Stock display** on the line |
| Upozornění na zpoždění emailem do DEK | External email | Action button → status bar / log, not sent |
| Dokončení objednávky | SAP action | **Save / complete** |
| Potvrzení obj. emailem do DEK | External email | Action → status bar / log, not sent |
| SAP zobrazí "správnost" + následovník artiklu | SAP screen | **Article check** surfaces successor |
| Má následovníka? | Decision | Driven by master data |
| Oznámení o změně následovníka mailem na DEK | External email | Action → status bar / log |
| Manuální ověření mailem/callem na DEK | External | Action → status bar / log |
| SAP zobrazí "správnost" množství | SAP screen | **Quantity check** |
| Manuální přepis do SAPu po odsouhlasení | SAP screen | **Re-entry**, then rejoins stock check |

## 7. Validation outcomes

Two distinct kinds — they behave differently, exactly as the diagram shows.

**Blocking errors (the error branch).** Must be resolved with DEK and rewritten into SAP before the order can proceed to the stock check.

| Condition | Outcome | Light | Status-bar message | Diagram node |
|-----------|---------|-------|--------------------|--------------|
| Material not in master, no successor | `ARTICLE_NOT_FOUND` | red | Material X does not exist — verify with DEK | Chyba v artiklu → neexistuje (loops to DEK) |
| Material discontinued, successor exists | `SUCCESSOR` | amber | Material X discontinued — successor Y; notify DEK | Chyba v artiklu → má následovníka |
| Quantity invalid for unit | `QTY_ERROR` | amber | Quantity invalid — verify with DEK | Chyba v množství |
| Material not stocked at target sklad | `WAREHOUSE_ERROR` | red | Material X not maintained in sklad N — verify with DEK | Chyba v cílovém skladu |

**Stock status (non-blocking).** Informational; never blocks the order.

| Condition | Outcome | Light | Status-bar message | Diagram node |
|-----------|---------|-------|--------------------|--------------|
| available ≥ requested | `IN_STOCK` | green | N available in sklad — proceed | Je skladem |
| available < requested | `OUT_OF_STOCK` | amber | Short in sklad — delay notice to DEK, then proceed | Není skladem → upozornění → completion |

Single rule: `available = on_hand − reserved`, compared in base unit after UoM conversion (e.g. `1 bal. = 25 ks`).

## 8. Data model (Supabase / Postgres)

| Table | Columns | SAP analogue |
|-------|---------|--------------|
| `material` | `material_number` (PK), `description`, `base_uom`, `status` (active \| discontinued \| blocked), `successor_material_number` (FK → material, null) | MARA |
| `material_uom` | `material_number` (FK), `uom`, `conversion_to_base` | MARM |
| `storage_location` | `code` (PK, e.g. 54081), `name`, `plant` | T001L |
| `stock` | `material_number` (FK), `storage_location_code` (FK), `on_hand`, `reserved` · PK (material, sklad) | MARD |
| `purchase_order` | `po_number` (PK), `supplier`, `customer`, `requested_delivery_date`, `status` | EKKO |
| `po_line` | `po_number` (FK), `line_no`, `material_number`, `qty`, `uom`, `target_storage_location` | EKPO |
| `po_line_validation` | `po_number`, `line_no`, `outcome`, `detail` | — (our output) |

**View — the SSOT for availability (don't duplicate in app code):**

```sql
create view stock_availability as
select material_number,
       storage_location_code,
       on_hand - reserved as available
from stock;
```

## 9. Seed data (covers the diagram branches)

PO `NO-540-26-01605`, target sklad `54081`:

| Pos | Material | Description | Order | On hand @54081 | Branch exercised |
|-----|----------|-------------|-------|----------------|------------------|
| 10 | 2452572 | Sekáč s plochou špičkou TE-SX FP 50 | 4 KS | 12 | Je skladem (clean) |
| 20 | 2460956 | Lopatkový sekáč TE-YX SC 28/8 | 3 KS | 2 | Není skladem → delay notice → proceeds |
| 30 | 2461264 | Lopatkový sekáč TE-YX SC 36/12 | 3 KS | — (discontinued) | Chyba v artiklu → má následovníka 2461299 |
| 40 | 2127984 | Natloukací kotva HKV M16x65 (25 ks/bal.) | 1 BAL | 1 BAL | Je skladem, exercises 1 bal = 25 ks |
| — | 2461299 | TE-YX SC 36/12 (successor) | — | 8 | active; resolves Pos 30 |

Chyba v množství and Chyba v cílovém skladu are demonstrated live by the operator typing a bad quantity or a wrong sklad — which is exactly how they arise in the manual process.

## 10. Architecture & stack

- Next.js (App Router) on Vercel; server-side Supabase access.
- Supabase service-role key server-side only — never reaches the browser.
- Availability lives in the SQL view; app code reads it, doesn't recompute it.
- Check functions are thin, SQL-backed lookups: `checkMaterial`, `checkQty`, `checkWarehouse`, `checkAvailability`.
- One status-message module maps outcome → status-bar text.

## 11. UI requirements ("look like SAP")

Imitate `ME21N` / `VA01` for entry and `MMBE` for the stock display. Three signatures:

1. Slate toolbar with the transaction-code command box top-left + save/back/enter icons.
2. A dense line-item grid: position, material, short text (auto-filled), qty, unit, sklad, status light.
3. The status bar at the bottom with a colored message light — this is where every branch surfaces. It is the most important component, not decoration.

External steps (delay notice, successor notice, DEK verification, confirmation) are operator-triggered actions that write to the status bar / a small action log — representing the email/phone steps without sending anything.

## 12. Work breakdown (4 people)

Front-end is the heavy, demo-critical lane, so two people sit on it.

| Owner | Lane | Deliverables | Depends on |
|-------|------|--------------|------------|
| P1 | Schema + Supabase + deploy | Tables, `stock_availability` view, seed structure, typed client, Vercel project + env | — (ships first, ~45 min) |
| P2 | Data + messages | Engineered seed (§9), successor record, UoM conversions, outcome → message map | P1 types |
| P3 | SAP look | Toolbar, grid, status bar, stock display, action log | — (starts immediately) |
| P4 | Interaction wiring | Field-on-entry → check functions → status bar + lights, the error-branch resolution + re-entry → back to stock check | P3 shell + P2 functions |

Keep checks SQL-backed and dumb so P4 wires rather than authors logic.

## 13. Milestones (hackathon day)

| Time | Milestone |
|------|-----------|
| T+0 | All 4 agree the schema + type contract (30 min, together). |
| T+45m | P1 ships schema + view + typed client → unblocks P2/P4. P3 already building shell. |
| Midday | Lanes build in parallel against the contract with mock data. |
| Final third | Integration: real Supabase data behind the real UI; wire the error-branch loop-back. |
| Last hour | Vercel deploy + run the §14 script twice. |

## 14. Demo script (follows the diagram exactly)

1. Open the SAP entry screen with PO `NO-540-26-01605`.
2. Pos 10 (2452572) → in stock → proceeds.
3. Pos 20 (2460956) → only 2 of 3 → **delay notice to DEK** → proceeds (does **not** block).
4. Pos 30 (2461264) → article error → SAP shows successor 2461299 → **notify DEK of successor change** → after agreement, **rewrite into SAP** with the successor → line rejoins the stock check.
5. Pos 40 (2127984), `1 bal.` → system reads it as 25 ks → in stock → proceeds.
6. (Optional, manual) type a wrong sklad or bad qty on a line → error → **verify with DEK** → rewrite → rejoins the stock check.
7. All lines resolved → completion → **confirmation email to DEK** → end.

## 15. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| UI eats the whole day | 2 people on front end; P3's shell has zero data dependency and starts at T+0. |
| Logic creep into the UI | Checks stay SQL-backed and dumb; P4 wires, doesn't author. |
| Integration crunch at the end | Lock the schema + type contract in the first 45 minutes. |
| Scope drift toward automation | Out of scope by rule; the PDF is on-screen reference only. |
