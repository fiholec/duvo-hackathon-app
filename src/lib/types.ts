// Types mirror the Supabase / Postgres schema (PRD §8) 1:1.
// When the real connectors land, these row shapes stay; only the data source changes.

export type MaterialStatus = "active" | "discontinued" | "blocked";

/** MARA */
export interface Material {
  material_number: string;
  description: string;
  base_uom: string; // e.g. "KS"
  status: MaterialStatus;
  successor_material_number: string | null;
}

/** MARM */
export interface MaterialUom {
  material_number: string;
  uom: string; // e.g. "BAL"
  conversion_to_base: number; // 1 BAL = 25 KS -> 25
}

/** T001L */
export interface StorageLocation {
  code: string; // e.g. "54081"
  name: string;
  plant: string;
}

/** MARD */
export interface Stock {
  material_number: string;
  storage_location_code: string;
  on_hand: number; // in base UoM
  reserved: number; // in base UoM
}

/** EKKO */
export interface PurchaseOrder {
  po_number: string;
  supplier: string;
  customer: string;
  requested_delivery_date: string;
  status: "received" | "in_entry" | "completed" | "confirmed";
}

/** EKPO */
export interface PoLine {
  po_number: string;
  line_no: number;
  material_number: string;
  qty: number;
  uom: string;
  target_storage_location: string;
}

/** our output table */
export type ValidationOutcome =
  | "OK"
  | "ARTICLE_NOT_FOUND"
  | "SUCCESSOR"
  | "QTY_ERROR"
  | "WAREHOUSE_ERROR"
  | "IN_STOCK"
  | "OUT_OF_STOCK";

export interface PoLineValidation {
  po_number: string;
  line_no: number;
  outcome: ValidationOutcome;
  detail: string;
  created_at: string;
}

/** SSOT view: stock_availability = on_hand - reserved (PRD §8). */
export interface StockAvailability {
  material_number: string;
  storage_location_code: string;
  available: number;
}

export type LightColor = "green" | "amber" | "red" | "neutral";
