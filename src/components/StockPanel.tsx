"use client";

import { findMaterial, findStock, findUomConversion, storageLocations, stock } from "@/lib/mockData";

/** MMBE-style stock display for one material across storage locations. */
export function StockPanel({
  materialNumber,
  uom,
}: {
  materialNumber: string;
  uom: string;
}) {
  const material = findMaterial(materialNumber);
  const rows = stock.filter((s) => s.material_number === materialNumber);
  const conv = findUomConversion(materialNumber, uom);

  return (
    <div className="flex h-full flex-col border border-[var(--sap-grid-line)] bg-white">
      <div className="border-b border-[var(--sap-grid-line)] bg-[var(--sap-header)] px-3 py-1.5 text-[12px] font-semibold text-slate-700">
        Skladová dostupnost (MMBE) — {materialNumber || "—"}
      </div>
      <div className="p-3 text-[12px]">
        {!material ? (
          <p className="italic text-slate-400">Materiál nenalezen v kmenových datech.</p>
        ) : (
          <>
            <div className="mb-2 text-slate-700">
              <span className="font-medium">{material.description}</span>
              <span className="ml-2 text-slate-400">
                zákl. MJ {material.base_uom}
                {conv && conv !== 1 ? ` · 1 ${uom} = ${conv} ${material.base_uom}` : ""}
              </span>
            </div>
            {rows.length === 0 ? (
              <p className="italic text-amber-700">
                Materiál není veden v žádném skladu.
              </p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--sap-grid-line)] text-left text-slate-500">
                    <th className="py-1 pr-2 font-medium">Sklad</th>
                    <th className="py-1 pr-2 text-right font-medium">K dispozici</th>
                    <th className="py-1 pr-2 text-right font-medium">Rezerv.</th>
                    <th className="py-1 text-right font-medium">Dostupné</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const loc = storageLocations.find((s) => s.code === r.storage_location_code);
                    const available = r.on_hand - r.reserved;
                    return (
                      <tr key={r.storage_location_code} className="border-b border-slate-100">
                        <td className="py-1 pr-2 font-mono">
                          {r.storage_location_code}
                          <span className="ml-1 text-slate-400">{loc?.name}</span>
                        </td>
                        <td className="py-1 pr-2 text-right font-mono">{r.on_hand}</td>
                        <td className="py-1 pr-2 text-right font-mono text-slate-500">
                          {r.reserved}
                        </td>
                        <td
                          className={`py-1 text-right font-mono font-semibold ${
                            available > 0 ? "text-emerald-700" : "text-red-600"
                          }`}
                        >
                          {available}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <p className="mt-2 text-[11px] text-slate-400">
              Dostupné = K dispozici − Rezervováno (SSOT pohled stock_availability).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
