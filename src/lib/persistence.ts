// Persistence layer. Browser localStorage today; the SINGLE place to swap for
// SQLite or Supabase later. The duvo backend (browser-automation agent) drives the
// UI and the resulting processed orders + audit log are persisted here.
//
// To move to a real DB:
//   - replace load/save below with fetch() calls to API routes (app/api/*), OR
//   - read/write Supabase tables `processed_order`, `processed_order_line`, `audit_log`.
// Nothing else in the app needs to change.

import type { AuditEvent, ProcessedOrderRecord } from "./types";

export interface PersistedState {
  processedOrders: ProcessedOrderRecord[];
  auditLog: AuditEvent[];
}

const STORAGE_KEY = "duvo-sap-mockup:v1";

const empty: PersistedState = { processedOrders: [], auditLog: [] };

export function loadPersisted(): PersistedState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      processedOrders: parsed.processedOrders ?? [],
      auditLog: parsed.auditLog ?? [],
    };
  } catch {
    return empty;
  }
}

export function savePersisted(state: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — ignore for the demo */
  }
}

export function clearPersisted(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
