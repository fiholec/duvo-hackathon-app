"use client";

import { useStore, useDispatch } from "@/lib/store";
import { ActionLog } from "@/components/ActionLog";
import { lightHex, outcomeLight } from "@/lib/checks";

export function CompletionScreen() {
  const { po, lines, validationLog } = useStore();
  const dispatch = useDispatch();
  if (!po) return null;

  const confirmed = po.status === "confirmed";

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <div className="border border-[var(--sap-grid-line)] bg-white">
        <div className="flex items-center justify-between border-b border-[var(--sap-grid-line)] bg-[var(--sap-header)] px-4 py-2">
          <span className="text-[13px] font-semibold text-slate-800">
            Dokončení objednávky {po.po_number}
          </span>
          <span
            className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ${
              confirmed
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {confirmed ? "POTVRZENO" : "DOKONČENO — čeká na potvrzení"}
          </span>
        </div>

        {/* Line summary */}
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[var(--sap-grid-head)] text-left text-[11px] font-semibold text-slate-700">
              <th className="px-3 py-1.5">Poz.</th>
              <th className="px-3 py-1.5">Materiál</th>
              <th className="px-3 py-1.5">Text</th>
              <th className="px-3 py-1.5 text-right">Množ.</th>
              <th className="px-3 py-1.5">MJ</th>
              <th className="px-3 py-1.5">Sklad</th>
              <th className="px-3 py-1.5">Výsledek</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const o = l.result?.outcome ?? "OK";
              return (
                <tr key={l.line_no} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 font-mono text-slate-600">{l.line_no}</td>
                  <td className="px-3 py-1.5 font-mono">{l.material_number}</td>
                  <td className="px-3 py-1.5 text-slate-600">{l.description}</td>
                  <td className="px-3 py-1.5 text-right">{l.qty}</td>
                  <td className="px-3 py-1.5">{l.uom}</td>
                  <td className="px-3 py-1.5 font-mono">{l.sklad}</td>
                  <td className="px-3 py-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: lightHex[outcomeLight[o]] }}
                      />
                      <span className="font-mono text-[11px]">{o}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation action */}
      <div className="flex items-center justify-between border border-[var(--sap-grid-line)] bg-white px-4 py-3">
        <span className="text-[12px] text-slate-600">
          {confirmed
            ? "Potvrzení objednávky odesláno do DEK. Proces ukončen."
            : "Posledním krokem je odeslání potvrzení objednávky do DEK."}
        </span>
        {confirmed ? (
          <button
            onClick={() => dispatch({ type: "GOTO", screen: "savings" })}
            className="rounded-sm bg-[var(--duvo-accent)] px-5 py-2 text-[13px] font-semibold text-white hover:brightness-110"
          >
            Zobrazit úsporu s duvo →
          </button>
        ) : (
          <button
            onClick={() => dispatch({ type: "CONFIRM_ORDER" })}
            className="rounded-sm bg-[var(--sap-toolbar)] px-5 py-2 text-[13px] font-semibold text-white hover:brightness-110"
          >
            ✉ Potvrzení objednávky e-mailem do DEK
          </button>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ActionLog />
        {/* Validation log = po_line_validation table (also captures any errors) */}
        <div className="border border-[var(--sap-grid-line)] bg-white">
          <div className="border-b border-[var(--sap-grid-line)] bg-[var(--sap-header)] px-3 py-1.5 text-[12px] font-semibold text-slate-700">
            Protokol kontrol (po_line_validation)
          </div>
          <ul className="max-h-60 overflow-auto">
            {validationLog.length === 0 && (
              <li className="px-3 py-2 text-[12px] italic text-slate-400">
                Žádné záznamy.
              </li>
            )}
            {validationLog.map((v, i) => (
              <li
                key={i}
                className="flex items-start gap-2 border-b border-slate-100 px-3 py-1.5 text-[12px]"
              >
                <span className="font-mono text-[11px] text-slate-400">{v.created_at}</span>
                <span className="font-mono text-[11px] text-slate-500">#{v.line_no}</span>
                <span
                  className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: lightHex[outcomeLight[v.outcome]] }}
                />
                <span className="text-slate-700">
                  <span className="font-mono text-[11px]">{v.outcome}</span> — {v.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
