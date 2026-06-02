// Thin, "SQL-backed" check functions + the outcome -> status-bar message map.
// These mirror PRD §7 and §10. Logic stays dumb; the UI just wires it.

import {
  findMaterial,
  findUomConversion,
  findStorageLocation,
  findStock,
  stockAvailability,
} from "./mockData";
import type { LightColor, ValidationOutcome } from "./types";

export interface CheckResult {
  outcome: ValidationOutcome;
  light: LightColor;
  message: string; // status-bar text (Czech, SAP-style)
  successor?: string | null;
  available?: number;
}

// ── Article check (Chyba v artiklu) ──────────────────────────────────────────
export function checkMaterial(materialNumber: string): CheckResult {
  const m = findMaterial(materialNumber);
  if (!m) {
    return {
      outcome: "ARTICLE_NOT_FOUND",
      light: "red",
      message: `Materiál ${materialNumber} neexistuje – ověřte s DEK.`,
    };
  }
  if (m.status !== "active") {
    if (m.successor_material_number) {
      return {
        outcome: "SUCCESSOR",
        light: "amber",
        message: `Materiál ${materialNumber} ukončen – nástupce ${m.successor_material_number}; oznamte DEK.`,
        successor: m.successor_material_number,
      };
    }
    return {
      outcome: "ARTICLE_NOT_FOUND",
      light: "red",
      message: `Materiál ${materialNumber} blokován bez nástupce – ověřte s DEK.`,
    };
  }
  return { outcome: "OK", light: "neutral", message: `Materiál ${materialNumber} – ${m.description}.` };
}

// ── Quantity check (Chyba v množství) ─────────────────────────────────────────
export function checkQty(materialNumber: string, qty: number, uom: string): CheckResult {
  const okQty = Number.isFinite(qty) && qty > 0 && Number.isInteger(qty);
  const conv = findUomConversion(materialNumber, uom);
  if (!okQty || conv === null) {
    return {
      outcome: "QTY_ERROR",
      light: "amber",
      message: `Neplatné množství ${qty} ${uom} – ověřte s DEK.`,
    };
  }
  return { outcome: "OK", light: "neutral", message: `Množství ${qty} ${uom} v pořádku.` };
}

// ── Warehouse check (Chyba v cílovém skladu) ──────────────────────────────────
export function checkWarehouse(materialNumber: string, sklad: string): CheckResult {
  const loc = findStorageLocation(sklad);
  const maintained = findStock(materialNumber, sklad);
  if (!loc || !maintained) {
    return {
      outcome: "WAREHOUSE_ERROR",
      light: "red",
      message: `Materiál ${materialNumber} není veden ve skladu ${sklad} – ověřte s DEK.`,
    };
  }
  return { outcome: "OK", light: "neutral", message: `Sklad ${sklad} – ${loc.name}.` };
}

// ── Availability (Zboží skladem?) – non-blocking, PRD §7 ──────────────────────
export function checkAvailability(
  materialNumber: string,
  sklad: string,
  qty: number,
  uom: string,
): CheckResult {
  const conv = findUomConversion(materialNumber, uom) ?? 1;
  const requestedBase = qty * conv;
  const av = stockAvailability(materialNumber, sklad);
  const available = av?.available ?? 0;
  if (available >= requestedBase) {
    return {
      outcome: "IN_STOCK",
      light: "green",
      message: `Skladem ${available} ks ve skladu ${sklad} – pokračovat.`,
      available,
    };
  }
  return {
    outcome: "OUT_OF_STOCK",
    light: "amber",
    message: `Nedostatek ve skladu ${sklad} (${available}/${requestedBase} ks) – upozornění na zpoždění do DEK, poté pokračovat.`,
    available,
  };
}

/**
 * Full per-line evaluation in the diagram order:
 *   article -> (blocking) ; quantity -> (blocking) ; warehouse -> (blocking) ;
 *   then availability (non-blocking stock status).
 * Returns the first blocking error, or the stock status if all checks pass.
 */
export function evaluateLine(
  materialNumber: string,
  qty: number,
  uom: string,
  sklad: string,
): CheckResult {
  const article = checkMaterial(materialNumber);
  if (article.outcome !== "OK") return article;

  const quantity = checkQty(materialNumber, qty, uom);
  if (quantity.outcome !== "OK") return quantity;

  const warehouse = checkWarehouse(materialNumber, sklad);
  if (warehouse.outcome !== "OK") return warehouse;

  return checkAvailability(materialNumber, sklad, qty, uom);
}

export const BLOCKING_OUTCOMES: ValidationOutcome[] = [
  "ARTICLE_NOT_FOUND",
  "SUCCESSOR",
  "QTY_ERROR",
  "WAREHOUSE_ERROR",
];

export const isBlocking = (o: ValidationOutcome) => BLOCKING_OUTCOMES.includes(o);

export const outcomeLight: Record<ValidationOutcome, LightColor> = {
  OK: "neutral",
  IN_STOCK: "green",
  OUT_OF_STOCK: "amber",
  SUCCESSOR: "amber",
  QTY_ERROR: "amber",
  ARTICLE_NOT_FOUND: "red",
  WAREHOUSE_ERROR: "red",
};

export const lightHex: Record<LightColor, string> = {
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  neutral: "#94a3b8",
};
