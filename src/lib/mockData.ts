// Mock data store. Mirrors the Supabase tables (PRD §8/§9). Swap the exported
// arrays for real Supabase reads later — call sites only use the helpers below.

import type {
  Material,
  MaterialUom,
  StorageLocation,
  Stock,
  PurchaseOrder,
  PoLine,
  StockAvailability,
} from "./types";

// ── MARA ────────────────────────────────────────────────────────────────────
export const materials: Material[] = [
  { material_number: "2452572", description: "Sekáč s plochou špičkou TE-SX FP 50", base_uom: "KS", status: "active", successor_material_number: null },
  { material_number: "2460956", description: "Lopatkový sekáč TE-YX SC 28/8", base_uom: "KS", status: "active", successor_material_number: null },
  { material_number: "2461264", description: "Lopatkový sekáč TE-YX SC 36/12", base_uom: "KS", status: "discontinued", successor_material_number: "2461299" },
  { material_number: "2461299", description: "Lopatkový sekáč TE-YX SC 36/12 (nástupce)", base_uom: "KS", status: "active", successor_material_number: null },
  { material_number: "2127984", description: "Natloukací kotva HKV M16x65", base_uom: "KS", status: "active", successor_material_number: null },
  // extra master data for random orders
  { material_number: "2153410", description: "Vrták TE-CX 12/22 SDS-Plus", base_uom: "KS", status: "active", successor_material_number: null },
  { material_number: "2089117", description: "Chemická kotva HIT-HY 200-R 500 ml", base_uom: "KS", status: "active", successor_material_number: null },
  { material_number: "2024518", description: "Šroub do betonu HUS4-H 10x90", base_uom: "KS", status: "active", successor_material_number: null },
];

// ── MARM (alternative units of measure) ──────────────────────────────────────
export const materialUoms: MaterialUom[] = [
  { material_number: "2127984", uom: "BAL", conversion_to_base: 25 }, // 1 bal. = 25 ks
  { material_number: "2024518", uom: "BAL", conversion_to_base: 100 },
  { material_number: "2089117", uom: "KRT", conversion_to_base: 12 },
];

// ── T001L — kmenová data skladů firmy (platná čísla skladů) ───────────────────
// Centrála používá tento systém pro každý sklad bez ohledu na město. Číslo skladu
// v objednávce se ověřuje proti této množině; nic není natvrdo v logice.
export const storageLocations: StorageLocation[] = [
  { code: "54081", name: "Sklad Praha", plant: "5408", city: "Praha" },
  { code: "54082", name: "Sklad Brno", plant: "5408", city: "Brno" },
  { code: "54090", name: "Sklad Ostrava", plant: "5409", city: "Ostrava" },
];

/** Platná čísla skladů firmy, odvozená z kmenových dat (nikdy natvrdo). */
export const companyWarehouses = storageLocations.map((s) => s.code);

/** Výchozí cílový sklad firmy, převzatý z kmenových dat — ne magická konstanta. */
export const DEFAULT_WAREHOUSE = storageLocations[0].code;

/** Je to platné číslo skladu firmy? (kontrola platnosti, množina z DB) */
export const isKnownWarehouse = (code: string) =>
  companyWarehouses.includes(code.trim());

// ── MARD ────────────────────────────────────────────────────────────────────
// on_hand / reserved stored in BASE uom (KS). Stock is maintained per warehouse;
// a material can be stocked in some cities and not others.
export const stock: Stock[] = [
  { material_number: "2452572", storage_location_code: "54081", on_hand: 12, reserved: 0 },
  { material_number: "2452572", storage_location_code: "54082", on_hand: 6, reserved: 0 },
  { material_number: "2460956", storage_location_code: "54081", on_hand: 2, reserved: 0 }, // short
  { material_number: "2461299", storage_location_code: "54081", on_hand: 8, reserved: 0 }, // successor
  { material_number: "2127984", storage_location_code: "54081", on_hand: 25, reserved: 0 }, // = 1 BAL
  { material_number: "2153410", storage_location_code: "54081", on_hand: 40, reserved: 5 },
  { material_number: "2153410", storage_location_code: "54090", on_hand: 15, reserved: 0 },
  { material_number: "2089117", storage_location_code: "54081", on_hand: 18, reserved: 0 },
  { material_number: "2024518", storage_location_code: "54081", on_hand: 600, reserved: 100 },
  // note: 2461264 (discontinued) has NO stock row -> not maintained anywhere
];

// ── EKKO ────────────────────────────────────────────────────────────────────
export const purchaseOrders: PurchaseOrder[] = [
  { po_number: "NO-540-26-01605", supplier: "Hilti ČR spol. s r.o.", customer: "Stavebniny DEK a.s.", requested_delivery_date: "2026-06-09", status: "received" },
];

// ── EKPO ────────────────────────────────────────────────────────────────────
export const poLines: PoLine[] = [
  { po_number: "NO-540-26-01605", line_no: 10, material_number: "2452572", qty: 4, uom: "KS", target_storage_location: "54081" },
  { po_number: "NO-540-26-01605", line_no: 20, material_number: "2460956", qty: 3, uom: "KS", target_storage_location: "54081" },
  { po_number: "NO-540-26-01605", line_no: 30, material_number: "2461264", qty: 3, uom: "KS", target_storage_location: "54081" },
  { po_number: "NO-540-26-01605", line_no: 40, material_number: "2127984", qty: 1, uom: "BAL", target_storage_location: "54081" },
];

// ── Lookup helpers (the only API call sites should use) ───────────────────────
export const findMaterial = (mn: string) =>
  materials.find((m) => m.material_number === mn.trim()) ?? null;

export const findUomConversion = (mn: string, uom: string): number | null => {
  const m = findMaterial(mn);
  if (m && uom.trim().toUpperCase() === m.base_uom) return 1;
  const row = materialUoms.find(
    (u) => u.material_number === mn.trim() && u.uom.toUpperCase() === uom.trim().toUpperCase(),
  );
  return row ? row.conversion_to_base : null;
};

export const findStorageLocation = (code: string) =>
  storageLocations.find((s) => s.code === code.trim()) ?? null;

export const findStock = (mn: string, sklad: string) =>
  stock.find((s) => s.material_number === mn.trim() && s.storage_location_code === sklad.trim()) ?? null;

/** The SSOT availability view (PRD §8): available = on_hand - reserved. */
export const stockAvailability = (mn: string, sklad: string): StockAvailability | null => {
  const s = findStock(mn, sklad);
  if (!s) return null;
  return {
    material_number: s.material_number,
    storage_location_code: s.storage_location_code,
    available: s.on_hand - s.reserved,
  };
};

export const getPo = (poNumber: string) =>
  purchaseOrders.find((p) => p.po_number === poNumber) ?? null;

export const getPoLines = (poNumber: string) =>
  poLines.filter((l) => l.po_number === poNumber).sort((a, b) => a.line_no - b.line_no);

// ── Random order generator (for "use random data" demos) ──────────────────────
// Deterministic-ish PRNG seeded by a counter so SSR/CSR match and we avoid
// Math.random hydration drift. Generates a believable DEK -> Hilti PO.
let poSeq = 1700;

const cleanMaterials = materials.filter(
  (m) => m.status === "active" && stock.some((s) => s.material_number === m.material_number),
);

export function generateRandomPo(): { po: PurchaseOrder; lines: PoLine[] } {
  poSeq += 7;
  const n = (poSeq % 90000) + 10000;
  const po_number = `NO-540-26-${String(n).slice(0, 5)}`;
  const lineCount = 2 + (poSeq % 3); // 2-4 lines
  // Target warehouse comes from the company master, not a hardcoded code.
  const warehouse = DEFAULT_WAREHOUSE;
  const lines: PoLine[] = [];
  for (let i = 0; i < lineCount; i++) {
    const mat = cleanMaterials[(poSeq + i * 3) % cleanMaterials.length];
    const avail = stockAvailability(mat.material_number, warehouse);
    const maxQ = Math.max(1, Math.min(6, avail ? avail.available : 5));
    lines.push({
      po_number,
      line_no: (i + 1) * 10,
      material_number: mat.material_number,
      qty: 1 + ((poSeq + i) % maxQ),
      uom: mat.base_uom,
      target_storage_location: warehouse,
    });
  }
  const po: PurchaseOrder = {
    po_number,
    supplier: "Hilti ČR spol. s r.o.",
    customer: "Stavebniny DEK a.s.",
    requested_delivery_date: "2026-06-12",
    status: "received",
  };
  return { po, lines };
}
