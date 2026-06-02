"use client";

import { useStore, useDispatch } from "@/lib/store";
import { findMaterial } from "@/lib/mockData";

export function InboxScreen() {
  const { po, lines, pdfChecked } = useStore();
  const dispatch = useDispatch();
  if (!po) return null;

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1.3fr_1fr]">
      {/* Faux PDF objednávka from DEK */}
      <section className="border border-[var(--sap-grid-line)] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--sap-grid-line)] bg-[var(--sap-header)] px-4 py-2">
          <span className="text-[12px] font-semibold text-slate-700">
            📄 PDF objednávka — příloha e-mailu od DEK
          </span>
          <span className="font-mono text-[11px] text-slate-500">
            {po.po_number}.pdf
          </span>
        </div>

        <div className="space-y-4 p-6 text-[13px] text-slate-800">
          <div className="flex items-start justify-between border-b border-dashed border-slate-300 pb-3">
            <div>
              <div className="text-lg font-bold tracking-tight text-[#c8102e]">
                DEK
              </div>
              <div className="text-[12px] text-slate-500">{po.customer}</div>
            </div>
            <div className="text-right text-[12px] text-slate-500">
              <div>Objednávka č.</div>
              <div className="font-mono text-[13px] font-semibold text-slate-800">
                {po.po_number}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-1 text-[12px]">
            <span className="text-slate-500">Dodavatel:</span>
            <span className="text-slate-800">{po.supplier}</span>
            <span className="text-slate-500">Požadované dodání:</span>
            <span className="text-slate-800">{po.requested_delivery_date}</span>
            <span className="text-slate-500">Cílový sklad:</span>
            <span className="text-slate-800">54081 — Hlavní sklad Praha</span>
          </div>

          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-y border-slate-300 text-left text-slate-500">
                <th className="py-1 pr-2 font-medium">Poz.</th>
                <th className="py-1 pr-2 font-medium">Materiál</th>
                <th className="py-1 pr-2 font-medium">Označení</th>
                <th className="py-1 pr-2 text-right font-medium">Množ.</th>
                <th className="py-1 font-medium">MJ</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.line_no} className="border-b border-slate-100">
                  <td className="py-1 pr-2 font-mono">{l.line_no}</td>
                  <td className="py-1 pr-2 font-mono">{l.material_number}</td>
                  <td className="py-1 pr-2 text-slate-600">
                    {findMaterial(l.material_number)?.description ?? "—"}
                  </td>
                  <td className="py-1 pr-2 text-right">{l.qty}</td>
                  <td className="py-1">{l.uom}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="pt-2 text-[11px] italic text-slate-400">
            Operátor čte PDF a ručně kontroluje — žádné OCR, žádná automatizace
            (jak proces probíhá dnes).
          </p>
        </div>
      </section>

      {/* Workflow controls: manual check + decision */}
      <section className="space-y-3">
        <div className="border border-[var(--sap-grid-line)] bg-white p-4">
          <h2 className="mb-1 text-[13px] font-semibold text-slate-800">
            Krok 1–4 · Manuální kontrola PDF
          </h2>
          <p className="mb-3 text-[12px] text-slate-600">
            Operátor přečte objednávku a posoudí, zda je v pořádku. Toto je lidské
            rozhodnutí (<span className="font-mono">V pořádku?</span>).
          </p>

          {!pdfChecked ? (
            <button
              onClick={() => dispatch({ type: "CHECK_PDF" })}
              className="w-full rounded-sm bg-[var(--duvo-accent-2)] px-4 py-2 text-[13px] font-semibold text-white transition hover:brightness-110"
            >
              ✓ Zkontrolováno — V pořádku? ANO
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
                PDF zkontrolováno — pokračujeme na manuální zadání do SAP.
              </div>
              <button
                onClick={() => dispatch({ type: "START_ENTRY" })}
                className="w-full rounded-sm bg-[var(--sap-toolbar)] px-4 py-2 text-[13px] font-semibold text-white transition hover:brightness-110"
              >
                → Manuální zadání do SAP (ME21N)
              </button>
            </div>
          )}
        </div>

        <div className="border border-[var(--sap-grid-line)] bg-white p-4">
          <h2 className="mb-2 text-[13px] font-semibold text-slate-800">
            Demo data
          </h2>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => dispatch({ type: "LOAD_PO", poNumber: "NO-540-26-01605" })}
              className="rounded-sm border border-slate-300 px-3 py-1.5 text-[12px] text-slate-700 transition hover:bg-slate-50"
            >
              Načíst demo objednávku NO-540-26-01605
            </button>
            <button
              onClick={() => dispatch({ type: "LOAD_RANDOM" })}
              className="rounded-sm border border-slate-300 px-3 py-1.5 text-[12px] text-slate-700 transition hover:bg-slate-50"
            >
              🎲 Načíst náhodnou objednávku
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Data jsou prozatím lokální (mock). Struktura odpovídá Supabase schématu
            — konektory se doplní později.
          </p>
        </div>
      </section>
    </div>
  );
}
