// Live product / warehouse catalogue, loaded from Supabase via /api/catalog into a
// module-level cache. Validation (checks.ts) reads from HERE, so it reflects the real
// database contents — not the old hardcoded mock arrays.

export interface CatalogPayload {
  products: { code: string; description: string; uom: string }[];
  successors: { old: string; new: string }[];
  locations: string[];
}

let productByCode = new Map<string, { description: string; uom: string }>();
let successorByOld = new Map<string, string>();
let warehouses = new Set<string>();
let loaded = false;

export function setCatalog(data: CatalogPayload): void {
  productByCode = new Map(
    (data.products ?? []).map((p) => [String(p.code).trim(), { description: p.description, uom: p.uom }]),
  );
  successorByOld = new Map((data.successors ?? []).map((s) => [String(s.old).trim(), String(s.new)]));
  warehouses = new Set((data.locations ?? []).map((l) => String(l).trim()));
  loaded = true;
}

export const isCatalogLoaded = (): boolean => loaded;

/** A valid, current article (incl. discontinued ones, which also appear as successors). */
export const findProduct = (code: string) => productByCode.get(code.trim()) ?? null;

/** If the code is a discontinued article, returns its successor article code. */
export const findSuccessor = (code: string): string | null => successorByOld.get(code.trim()) ?? null;

/** Is this a real delivery-location / warehouse code (customer_delivery_locations)? */
export const isKnownWarehouse = (code: string): boolean => warehouses.has(code.trim());
