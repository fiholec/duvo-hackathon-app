"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useStore,
  useDispatch,
  lineReady,
  allLinesReady,
  type WorkingLine,
} from "@/lib/store";
import { lightHex } from "@/lib/checks";
import { ActionLog } from "@/components/ActionLog";
import { StockPanel } from "@/components/StockPanel";

function Light({ line }: { line: WorkingLine }) {
  const color = line.result?.light ?? "neutral";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block h-3 w-3 rounded-full ${
          color !== "neutral" ? "light-pulse" : ""
        }`}
        style={{ backgroundColor: lightHex[color], boxShadow: `0 0 5px ${lightHex[color]}` }}
      />
      <span className="font-mono text-[10px] text-slate-500">
        {line.result?.outcome ?? "—"}
      </span>
    </span>
  );
}

/** The conditional error-branch / stock actions for a single line. */
function LineActions({ line }: { line: WorkingLine }) {
  const dispatch = useDispatch();
  const o = line.result?.outcome;
  if (!line.entered || !line.result) return <span className="text-slate-400">—</span>;

  if (o === "IN_STOCK") {
    return <span className="text-[11px] font-medium text-emerald-700">✓ Skladem</span>;
  }
  if (o === "OUT_OF_STOCK") {
    return line.delayNoticeSent ? (
      <span className="text-[11px] font-medium text-amber-700">✓ Zpoždění oznámeno</span>
    ) : (
      <button
        data-testid={`delay-${line.line_no}`}
        onClick={() => dispatch({ type: "SEND_DELAY_NOTICE", line_no: line.line_no })}
        className="rounded-sm bg-amber-600 px-2 py-1 text-[11px] font-medium text-white hover:brightness-110"
      >
        ✉ Upozornit DEK na zpoždění
      </button>
    );
  }
  if (o === "SUCCESSOR") {
    return (
      <button
        data-testid={`successor-${line.line_no}`}
        onClick={() => dispatch({ type: "ACCEPT_SUCCESSOR", line_no: line.line_no })}
        className="rounded-sm bg-amber-600 px-2 py-1 text-[11px] font-medium text-white hover:brightness-110"
      >
        ✉ Oznámit DEK + převzít nástupce {line.successorOffered}
      </button>
    );
  }
  // ARTICLE_NOT_FOUND / QTY_ERROR / WAREHOUSE_ERROR → verify, then operator rewrites
  return line.verificationSent ? (
    <span className="text-[11px] font-medium text-slate-600">
      ☎ Ověřeno — opravte pole a stiskněte Enter
    </span>
  ) : (
    <button
      data-testid={`verify-${line.line_no}`}
      onClick={() => dispatch({ type: "VERIFY_DEK", line_no: line.line_no })}
      className="rounded-sm bg-red-600 px-2 py-1 text-[11px] font-medium text-white hover:brightness-110"
    >
      ☎ Ověřit s DEK
    </button>
  );
}

export function OrderEntryScreen() {
  const { po, lines } = useStore();
  const dispatch = useDispatch();
  const router = useRouter();
  const [selected, setSelected] = useState<number>(lines[0]?.line_no ?? 0);
  if (!po) return null;

  const selectedLine = lines.find((l) => l.line_no === selected) ?? lines[0];
  const ready = allLinesReady(lines);

  const set = (line_no: number, field: keyof WorkingLine, value: string) =>
    dispatch({ type: "SET_FIELD", line_no, field, value });

  return (
    <div className="mx-auto max-w-6xl space-y-3">
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
        <div className="ml-auto flex items-center gap-2">
          <button
            data-testid="load-demo"
            onClick={() => dispatch({ type: "LOAD_PO", poNumber: "NO-540-26-01605" })}
            className="rounded-sm border border-slate-300 bg-white px-3 py-1 text-[11px] text-slate-700 transition hover:bg-slate-50"
          >
            Načíst demo objednávku
          </button>
          <button
            data-testid="load-random"
            onClick={() => dispatch({ type: "LOAD_RANDOM" })}
            className="rounded-sm border border-slate-300 bg-white px-3 py-1 text-[11px] text-slate-700 transition hover:bg-slate-50"
          >
            🎲 Načíst náhodnou objednávku
          </button>
        </div>
      </div>

      {/* Line-item grid */}
      <div className="overflow-x-auto border border-[var(--sap-grid-line)] bg-white">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[var(--sap-grid-head)] text-left text-[11px] font-semibold text-slate-700">
              <th className="border-r border-[var(--sap-grid-line)] px-2 py-1.5">Poz.</th>
              <th className="border-r border-[var(--sap-grid-line)] px-2 py-1.5">Materiál</th>
              <th className="border-r border-[var(--sap-grid-line)] px-2 py-1.5">Krátký text</th>
              <th className="border-r border-[var(--sap-grid-line)] px-2 py-1.5 text-right">Množ.</th>
              <th className="border-r border-[var(--sap-grid-line)] px-2 py-1.5">MJ</th>
              <th className="border-r border-[var(--sap-grid-line)] px-2 py-1.5">Sklad</th>
              <th className="border-r border-[var(--sap-grid-line)] px-2 py-1.5">Enter</th>
              <th className="border-r border-[var(--sap-grid-line)] px-2 py-1.5">Stav</th>
              <th className="px-2 py-1.5">Akce / větev</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const isSel = l.line_no === selected;
              return (
                <tr
                  key={l.line_no}
                  onClick={() => setSelected(l.line_no)}
                  className={`border-t border-[var(--sap-grid-line)] ${
                    isSel ? "bg-blue-50/60" : "hover:bg-slate-50"
                  } ${lineReady(l) ? "ring-inset" : ""}`}
                >
                  <td className="border-r border-[var(--sap-grid-line)] px-2 py-1 font-mono text-slate-600">
                    {l.line_no}
                  </td>
                  <td className="border-r border-[var(--sap-grid-line)] px-2 py-1">
                    <input
                      data-testid={`material-${l.line_no}`}
                      data-field="material_number"
                      data-line={l.line_no}
                      name={`material_${l.line_no}`}
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
                      data-field="qty"
                      data-line={l.line_no}
                      name={`qty_${l.line_no}`}
                      value={Number.isNaN(l.qty) ? "" : l.qty}
                      onChange={(e) => set(l.line_no, "qty", e.target.value)}
                      className="sap-input w-16 text-right"
                    />
                  </td>
                  <td className="border-r border-[var(--sap-grid-line)] px-2 py-1">
                    <input
                      data-testid={`uom-${l.line_no}`}
                      data-field="uom"
                      data-line={l.line_no}
                      name={`uom_${l.line_no}`}
                      value={l.uom}
                      onChange={(e) => set(l.line_no, "uom", e.target.value)}
                      className="sap-input w-14 uppercase"
                    />
                  </td>
                  <td className="border-r border-[var(--sap-grid-line)] px-2 py-1">
                    <input
                      data-testid={`sklad-${l.line_no}`}
                      data-field="sklad"
                      data-line={l.line_no}
                      name={`sklad_${l.line_no}`}
                      value={l.sklad}
                      onChange={(e) => set(l.line_no, "sklad", e.target.value)}
                      className="sap-input w-16 font-mono"
                    />
                  </td>
                  <td className="border-r border-[var(--sap-grid-line)] px-2 py-1 text-center">
                    <button
                      data-testid={`enter-${l.line_no}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(l.line_no);
                        dispatch({ type: "ENTER_LINE", line_no: l.line_no });
                      }}
                      title="Zadat / zkontrolovat řádek"
                      className="rounded-sm border border-slate-300 bg-white px-2 py-0.5 font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      ✓
                    </button>
                  </td>
                  <td className="border-r border-[var(--sap-grid-line)] px-2 py-1">
                    <Light line={l} />
                  </td>
                  <td className="px-2 py-1">
                    <LineActions line={l} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Helper hint */}
      <p className="text-[11px] text-slate-500">
        Tip: zadejte chybný materiál, množství (např. <span className="font-mono">0</span>) nebo
        sklad (např. <span className="font-mono">99999</span>) a stiskněte Enter — spustí se
        příslušná chybová větev. Po vyřešení s DEK pole opravte a stiskněte Enter znovu
        (přepis do SAP → návrat ke kontrole skladu).
      </p>

      {/* Stock display + action log */}
      <div className="grid gap-3 lg:grid-cols-2">
        <StockPanel
          materialNumber={selectedLine?.material_number ?? ""}
          uom={selectedLine?.uom ?? ""}
        />
        <ActionLog compact />
      </div>

      {/* Completion */}
      <div className="flex items-center justify-between border border-[var(--sap-grid-line)] bg-white px-4 py-3">
        <span className="text-[12px] text-slate-600">
          {ready
            ? "Všechny řádky vyřešeny — objednávku lze dokončit."
            : "Zadejte a vyřešte všechny řádky (skladem, nebo s oznámeným zpožděním)."}
        </span>
        <button
          data-testid="complete-order"
          disabled={!ready}
          onClick={() => {
            dispatch({ type: "COMPLETE_ORDER" });
            router.push("/completion");
          }}
          className={`rounded-sm px-5 py-2 text-[13px] font-semibold text-white transition ${
            ready
              ? "bg-[var(--duvo-accent)] hover:brightness-110"
              : "cursor-not-allowed bg-slate-300"
          }`}
        >
          Dokončit objednávku →
        </button>
      </div>
    </div>
  );
}
