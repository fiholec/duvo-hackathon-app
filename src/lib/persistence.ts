// Persistence layer — now backed by Supabase via the /api/persistence route
// (was browser localStorage). load -> GET, save -> POST. The route uses the
// service-role key server-side, so the secret never reaches the browser.
//
// The duvo backend (browser-automation agent) drives the UI; the resulting
// processed orders + audit log are persisted here, shared across sessions.

import type { AuditEvent, ProcessedOrderRecord } from "./types";

export interface PersistedState {
  processedOrders: ProcessedOrderRecord[];
  auditLog: AuditEvent[];
}

const empty: PersistedState = { processedOrders: [], auditLog: [] };

export async function loadPersisted(): Promise<PersistedState> {
  if (typeof window === "undefined") return empty;
  try {
    const res = await fetch("/api/persistence", { cache: "no-store" });
    if (!res.ok) return empty;
    const parsed = (await res.json()) as Partial<PersistedState>;
    return {
      processedOrders: parsed.processedOrders ?? [],
      auditLog: parsed.auditLog ?? [],
    };
  } catch {
    return empty;
  }
}

export async function savePersisted(state: PersistedState): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/persistence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(state),
    });
  } catch {
    /* network / quota — ignore for the demo */
  }
}
