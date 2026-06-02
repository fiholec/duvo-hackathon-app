"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Actor, AuditEvent } from "@/lib/types";

const fmtTs = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
};

const TYPE_LABEL: Record<AuditEvent["type"], string> = {
  order_loaded: "Načtení objednávky",
  pdf_checked: "Kontrola PDF",
  entry_started: "Zahájení zadání",
  line_entered: "Zadání řádku",
  delay_notice: "Upozornění na zpoždění",
  successor_accepted: "Převzetí nástupce",
  dek_verification: "Ověření s DEK",
  order_completed: "Dokončení objednávky",
  order_confirmed: "Potvrzení objednávky",
};

const actorChip = (a: Actor) =>
  a === "duvo-agent"
    ? "bg-[var(--duvo-accent)]/15 text-emerald-700"
    : "bg-slate-200 text-slate-700";

export function AuditLogScreen() {
  const { auditLog } = useStore();
  const [filter, setFilter] = useState<"all" | Actor>("all");

  const rows = [...auditLog]
    .reverse()
    .filter((e) => filter === "all" || e.actor === filter);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(auditLog, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-log.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-3" data-testid="audit-log">
      <div className="flex flex-wrap items-center justify-between gap-2 border border-[var(--sap-grid-line)] bg-[var(--sap-header)] px-4 py-2">
        <span className="text-[13px] font-semibold text-slate-800">
          Audit log
          <span className="ml-2 font-mono text-[12px] text-slate-500">
            {auditLog.length} událostí (audit_log)
          </span>
        </span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-sm bg-white p-0.5 ring-1 ring-slate-200">
            {(["all", "operator", "duvo-agent"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-sm px-2 py-0.5 text-[11px] font-medium ${
                  filter === f ? "bg-[var(--sap-toolbar)] text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f === "all" ? "Vše" : f === "operator" ? "Operátor" : "duvo agent"}
              </button>
            ))}
          </div>
          <button
            onClick={exportJson}
            disabled={auditLog.length === 0}
            className="rounded-sm border border-slate-300 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            ⭳ Export JSON
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="border border-[var(--sap-grid-line)] bg-white px-4 py-10 text-center text-[13px] text-slate-400">
          Žádné události. Akce ve workflow se zde zaznamenají s aktérem a časem.
        </div>
      ) : (
        <div className="overflow-x-auto border border-[var(--sap-grid-line)] bg-white">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[var(--sap-grid-head)] text-left text-[11px] font-semibold text-slate-700">
                <th className="px-3 py-1.5">#</th>
                <th className="px-3 py-1.5">Čas</th>
                <th className="px-3 py-1.5">Aktér</th>
                <th className="px-3 py-1.5">Událost</th>
                <th className="px-3 py-1.5">Objednávka</th>
                <th className="px-3 py-1.5">Poz.</th>
                <th className="px-3 py-1.5">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-mono text-slate-400">{e.id}</td>
                  <td className="px-3 py-1.5 font-mono text-slate-600">{fmtTs(e.ts)}</td>
                  <td className="px-3 py-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${actorChip(e.actor)}`}>
                      {e.actor === "duvo-agent" ? "🤖 duvo" : "👤 operátor"}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-slate-700">{TYPE_LABEL[e.type]}</td>
                  <td className="px-3 py-1.5 font-mono text-slate-600">{e.po_number}</td>
                  <td className="px-3 py-1.5 font-mono text-slate-500">{e.line_no ?? "—"}</td>
                  <td className="px-3 py-1.5 text-slate-600">{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
