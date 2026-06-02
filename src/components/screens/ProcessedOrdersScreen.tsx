"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { lightHex, outcomeLight } from "@/lib/checks";
import type { Actor } from "@/lib/types";

const fmt = (iso: string | null) => {
  if (!iso) return "—";
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

const actorLabel = (a: Actor) => (a === "duvo-agent" ? "🤖 duvo agent" : "👤 Operátor");

export function ProcessedOrdersScreen() {
  const { processedOrders } = useStore();
  const [open, setOpen] = useState<string | null>(null);

  const confirmed = processedOrders.filter((p) => p.status === "confirmed").length;

  return (
    <div className="mx-auto max-w-6xl space-y-3" data-testid="processed-orders">
      <div className="flex flex-wrap items-center justify-between gap-2 border border-[var(--sap-grid-line)] bg-[var(--sap-header)] px-4 py-2">
        <span className="text-[13px] font-semibold text-slate-800">
          Zpracované objednávky
          <span className="ml-2 font-mono text-[12px] text-slate-500">
            {processedOrders.length} celkem · {confirmed} potvrzeno
          </span>
        </span>
        <span className="text-[11px] text-slate-500">
          Výstupní fronta — objednávky zpracované operátorem nebo duvo agentem.
        </span>
      </div>

      {processedOrders.length === 0 ? (
        <div className="border border-[var(--sap-grid-line)] bg-white px-4 py-10 text-center text-[13px] text-slate-400">
          Zatím žádné zpracované objednávky. Dokončete objednávku na obrazovce
          <span className="mx-1 font-medium text-slate-600">Zadání objednávky</span>.
        </div>
      ) : (
        <div className="overflow-x-auto border border-[var(--sap-grid-line)] bg-white">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[var(--sap-grid-head)] text-left text-[11px] font-semibold text-slate-700">
                <th className="px-3 py-1.5">Objednávka</th>
                <th className="px-3 py-1.5">Zákazník</th>
                <th className="px-3 py-1.5">Zpracoval</th>
                <th className="px-3 py-1.5">Stav</th>
                <th className="px-3 py-1.5 text-right">Pozic</th>
                <th className="px-3 py-1.5">Dokončeno</th>
                <th className="px-3 py-1.5">Potvrzeno</th>
                <th className="px-3 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {processedOrders.map((p) => {
                const isOpen = open === p.po_number;
                return (
                  <Fragment key={p.po_number}>
                    <tr
                      data-testid={`order-${p.po_number}`}
                      className="border-t border-[var(--sap-grid-line)] hover:bg-slate-50"
                    >
                      <td className="px-3 py-1.5 font-mono font-medium">{p.po_number}</td>
                      <td className="px-3 py-1.5 text-slate-600">{p.customer}</td>
                      <td className="px-3 py-1.5">{actorLabel(p.actor)}</td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            p.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {p.status === "confirmed" ? "POTVRZENO" : "DOKONČENO"}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono">{p.line_count}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-600">{fmt(p.completed_at)}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-600">{fmt(p.confirmed_at)}</td>
                      <td className="px-3 py-1.5 text-right">
                        <button
                          onClick={() => setOpen(isOpen ? null : p.po_number)}
                          className="rounded-sm border border-slate-300 px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-100"
                        >
                          {isOpen ? "Skrýt" : "Detail"}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={8} className="px-4 py-2">
                          <table className="w-full border-collapse text-[11px]">
                            <thead>
                              <tr className="text-left text-slate-500">
                                <th className="py-1 pr-3">Poz.</th>
                                <th className="py-1 pr-3">Materiál</th>
                                <th className="py-1 pr-3">Text</th>
                                <th className="py-1 pr-3 text-right">Množ.</th>
                                <th className="py-1 pr-3">MJ</th>
                                <th className="py-1 pr-3">Sklad</th>
                                <th className="py-1">Výsledek</th>
                              </tr>
                            </thead>
                            <tbody>
                              {p.lines.map((l) => (
                                <tr key={l.line_no} className="border-t border-slate-200">
                                  <td className="py-1 pr-3 font-mono">{l.line_no}</td>
                                  <td className="py-1 pr-3 font-mono">{l.material_number}</td>
                                  <td className="py-1 pr-3 text-slate-600">{l.description}</td>
                                  <td className="py-1 pr-3 text-right">{l.qty}</td>
                                  <td className="py-1 pr-3">{l.uom}</td>
                                  <td className="py-1 pr-3 font-mono">{l.sklad}</td>
                                  <td className="py-1">
                                    <span className="inline-flex items-center gap-1.5">
                                      <span
                                        className="inline-block h-2 w-2 rounded-full"
                                        style={{ backgroundColor: lightHex[outcomeLight[l.outcome]] }}
                                      />
                                      <span className="font-mono">{l.outcome}</span>
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end">
        <Link
          href="/order-entry"
          className="rounded-sm bg-[var(--sap-toolbar)] px-4 py-1.5 text-[12px] font-medium text-white hover:brightness-110"
        >
          + Nová objednávka
        </Link>
      </div>
    </div>
  );
}
