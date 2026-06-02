"use client";

import { useStore } from "@/lib/store";
import { outcomeLight, lightHex } from "@/lib/checks";

/**
 * The status bar — PRD §11 calls this the most important component, not decoration.
 * Every branch surfaces here via a colored light + message, fed by the validation log.
 */
export function StatusBar() {
  const { validationLog } = useStore();
  const last = validationLog[validationLog.length - 1];
  const color = last ? outcomeLight[last.outcome] : "neutral";
  const message = last
    ? last.detail
    : "Připraveno. Zadejte transakci nebo zkontrolujte objednávku.";

  return (
    <footer className="border-t border-[var(--sap-grid-line)] bg-[var(--sap-statusbar)] px-3 py-1.5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full ${
            color !== "neutral" ? "light-pulse" : ""
          }`}
          style={{
            backgroundColor: lightHex[color],
            boxShadow: `0 0 6px ${lightHex[color]}`,
          }}
        />
        <span className="font-mono text-[12px] tracking-tight text-slate-800">
          {last ? `[${last.outcome}] ` : ""}
          {message}
        </span>
        <span className="ml-auto hidden font-mono text-[11px] text-slate-500 sm:block">
          SAP ECC · ME21N · {validationLog.length} kontrol
        </span>
      </div>
    </footer>
  );
}
