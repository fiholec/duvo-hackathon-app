"use client";

import { useRouter } from "next/navigation";
import { useStore, useDispatch, allLinesReady, type WorkingLine } from "@/lib/store";
import { lightHex } from "@/lib/checks";

function Light({ line }: { line: WorkingLine }) {
  const color = line.result?.light ?? "neutral";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block h-3 w-3 rounded-full ${color !== "neutral" ? "light-pulse" : ""}`}
        style={{ backgroundColor: lightHex[color], boxShadow: `0 0 5px ${lightHex[color]}` }}
      />
      <span className="font-mono text-[10px] text-slate-500">{line.result?.outcome ?? "—"}</span>
    </span>
  );
}

export function OrderEntryScreen() {
  const { po, lines } = useStore();
  const dispatch = useDispatch();
  const router = useRouter();
  if (!po) return null;

  const ready = allLinesReady(lines);
  const set = (line_no: number, field: keyof WorkingLine, value: string) =>
    dispatch({ type: "SET_FIELD", line_no, field, value });

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      {/* PO header band */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border border-[var(--sap-grid-line)] bg-[var(--sap-header)] px-4 py-2 text-[12px]">
        <span className="font-semibold text-slate-800">Nákupní objednávka</span>
        <span className="font-mono text-slate-700">{po.po_number}</span>
        <span className="text-slate-500">Dodavatel:</span>
        <span className="text-slate-700">{po.supplier}</span>
        <span className="text-slate-500">Zákazník:</span>
        <span className="text-slate-700">{po.customer}</span>
        <span className="text-slate-500">Dodání:</span>
        <span className="text-slate-700">{po.requested_delivery_date}</span>
      </div>

      {/* Line-item grid */}
      <div className="overflow-x-auto border border-[var(--sap-grid-line)] bg-white">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[var(--sap-grid-head)] text-left text-[11px] font-semibold text-slate-700">
              <th className="border-r border-[var(--sap-grid-line)] px-2 py-1.5">Materiál</th>
              <th className="border-r border-[var(--sap-grid-line)] px-2 py-1.5">Krátký text</th>
              <th className="border-r border-[var(--sap-grid-line)] px-2 py-1.5 text-right">Množ.</th>
              <th className="border-r border-[var(--sap-grid-line)] px-2 py-1.5">MJ</th>
              <th className="border-r border-[var(--sap-grid-line)] px-2 py-1.5">Sklad</th>
              <th className="border-r border-[var(--sap-grid-line)] px-2 py-1.5">Enter</th>
              <th className="border-r border-[var(--sap-grid-line)] px-2 py-1.5">Stav</th>
              <th className="px-2 py-1.5 text-center">Smazat</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-[12px] italic text-slate-400">
                  Zatím žádné řádky. Přidejte řádek a opište položku z PDF objednávky.
                </td>
              </tr>
            )}
            {lines.map((l) => (
              <tr key={l.line_no} className="border-t border-[var(--sap-grid-line)] hover:bg-slate-50">
                <td className="border-r border-[var(--sap-grid-line)] px-2 py-1">
                  <input
                    data-testid={`material-${l.line_no}`}
                    value={l.material_number}
                    onChange={(e) => set(l.line_no, "material_number", e.target.value)}
                    className="sap-input w-24 font-mono"
                  />
                </td>
                <td className="border-r border-[var(--sap-grid-line)] px-2 py-1 text-slate-600">
                  {l.description || <span className="italic text-slate-400">auto-doplní se</span>}
                </td>
                <td className="border-r border-[var(--sap-grid-line)] px-2 py-1 text-right">
                  <input
                    type="number"
                    data-testid={`qty-${l.line_no}`}
                    value={Number.isNaN(l.qty) ? "" : l.qty}
                    onChange={(e) => set(l.line_no, "qty", e.target.value)}
                    className="sap-input w-16 text-right"
                  />
                </td>
                <td className="border-r border-[var(--sap-grid-line)] px-2 py-1">
                  <input
                    data-testid={`uom-${l.line_no}`}
                    value={l.uom}
                    onChange={(e) => set(l.line_no, "uom", e.target.value)}
                    className="sap-input w-14 uppercase"
                  />
                </td>
                <td className="border-r border-[var(--sap-grid-line)] px-2 py-1">
                  <input
                    data-testid={`sklad-${l.line_no}`}
                    value={l.sklad}
                    onChange={(e) => set(l.line_no, "sklad", e.target.value)}
                    className="sap-input w-16 font-mono"
                  />
                </td>
                <td className="border-r border-[var(--sap-grid-line)] px-2 py-1 text-center">
                  <button
                    data-testid={`enter-${l.line_no}`}
                    onClick={() => dispatch({ type: "ENTER_LINE", line_no: l.line_no })}
                    title="Zadat / zkontrolovat řádek"
                    className="rounded-sm border border-slate-300 bg-white px-2 py-0.5 font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    ✓
                  </button>
                </td>
                <td className="border-r border-[var(--sap-grid-line)] px-2 py-1">
                  <Light line={l} />
                </td>
                <td className="px-2 py-1 text-center">
                  <button
                    data-testid={`delete-${l.line_no}`}
                    onClick={() => dispatch({ type: "DELETE_LINE", line_no: l.line_no })}
                    title="Smazat řádek"
                    className="rounded-sm px-2 py-0.5 text-red-600 transition hover:bg-red-50"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row */}
      <button
        data-testid="add-line"
        onClick={() => dispatch({ type: "ADD_LINE" })}
        className="rounded-sm border border-dashed border-slate-400 px-3 py-1.5 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50"
      >
        ➕ Přidat řádek
      </button>

      {/* Hint */}
      <p className="text-[11px] text-slate-500">
        Opište položky z PDF a u každého řádku stiskněte <span className="font-mono">✓</span> pro kontrolu.
        Objednávku lze dokončit, když je každý řádek <span className="font-medium text-emerald-700">skladem</span>{" "}
        nebo <span className="font-medium text-amber-700">není skladem</span> (doplní se v SAP později).
      </p>

      {/* Completion */}
      <div className="flex items-center justify-between border border-[var(--sap-grid-line)] bg-white px-4 py-3">
        <span className="text-[12px] text-slate-600">
          {lines.length === 0
            ? "Přidejte alespoň jeden řádek objednávky."
            : ready
              ? "Všechny řádky zkontrolovány — objednávku lze dokončit."
              : "Zkontrolujte všechny řádky (✓) — každý musí být skladem nebo není skladem."}
        </span>
        <button
          data-testid="complete-order"
          disabled={!ready}
          onClick={() => {
            dispatch({ type: "COMPLETE_ORDER" });
            router.push("/completion");
          }}
          className={`rounded-sm px-5 py-2 text-[13px] font-semibold text-white transition ${
            ready ? "bg-[var(--duvo-accent)] hover:brightness-110" : "cursor-not-allowed bg-slate-300"
          }`}
        >
          Dokončit objednávku →
        </button>
      </div>
    </div>
  );
}
