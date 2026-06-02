// Validation checks — backed by the LIVE Supabase catalogue (loaded via /api/catalog
// into src/lib/catalog.ts). There is no stock table in the DB, so "valid" means the
// article + warehouse are recognised and the quantity is sane — no IN_STOCK/OUT_OF_STOCK.

import { findProduct, findSuccessor, isKnownWarehouse, isCatalogLoaded } from "./catalog";
import type { LightColor, ValidationOutcome } from "./types";

export interface CheckResult {
  outcome: ValidationOutcome;
  light: LightColor;
  message: string; // status-bar text (Czech, SAP-style)
  successor?: string | null;
}

// ── Article check — against products / product_successors ─────────────────────
export function checkMaterial(materialNumber: string): CheckResult {
  const mn = materialNumber.trim();
  if (!mn) {
    return { outcome: "ARTICLE_NOT_FOUND", light: "red", message: "Zadejte číslo materiálu." };
  }
  const successor = findSuccessor(mn);
  if (successor) {
    return {
      outcome: "SUCCESSOR",
      light: "amber",
      message: `Materiál ${mn} ukončen – nástupce ${successor}; oznamte DEK.`,
      successor,
    };
  }
  const product = findProduct(mn);
  if (product) {
    return { outcome: "OK", light: "neutral", message: `Materiál ${mn} – ${product.description}.` };
  }
  return { outcome: "ARTICLE_NOT_FOUND", light: "red", message: `Materiál ${mn} neexistuje v katalogu – ověřte s DEK.` };
}

// ── Quantity check ────────────────────────────────────────────────────────────
export function checkQty(qty: number, uom: string): CheckResult {
  const okQty = Number.isFinite(qty) && qty > 0 && Number.isInteger(qty);
  if (!okQty) {
    return {
      outcome: "QTY_ERROR",
      light: "amber",
      message: `Neplatné množství ${Number.isNaN(qty) ? "" : qty} ${uom} – ověřte s DEK.`,
    };
  }
  return { outcome: "OK", light: "neutral", message: `Množství ${qty} ${uom} v pořádku.` };
}

// ── Warehouse check — against customer_delivery_locations ─────────────────────
export function checkWarehouse(sklad: string): CheckResult {
  const w = sklad.trim();
  if (!isKnownWarehouse(w)) {
    return {
      outcome: "WAREHOUSE_ERROR",
      light: "red",
      message: `Sklad ${w || "—"} neexistuje v databázi – ověřte s DEK.`,
    };
  }
  return { outcome: "OK", light: "neutral", message: `Sklad ${w} – ověřeno.` };
}

/**
 * Full per-line evaluation: article → quantity → warehouse, all against the live
 * Supabase catalogue. Returns the first error, or VALID when everything is recognised.
 */
export function evaluateLine(
  materialNumber: string,
  qty: number,
  uom: string,
  sklad: string,
): CheckResult {
  if (!isCatalogLoaded()) {
    return { outcome: "OK", light: "neutral", message: "Načítání katalogu z databáze…" };
  }
  const article = checkMaterial(materialNumber);
  if (article.outcome !== "OK") return article;

  const quantity = checkQty(qty, uom);
  if (quantity.outcome !== "OK") return quantity;

  const warehouse = checkWarehouse(sklad);
  if (warehouse.outcome !== "OK") return warehouse;

  return {
    outcome: "VALID",
    light: "green",
    message: `Materiál ${materialNumber.trim()} ověřen v katalogu – sklad ${sklad.trim()}, ${qty} ${uom}.`,
  };
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
  VALID: "green",
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
