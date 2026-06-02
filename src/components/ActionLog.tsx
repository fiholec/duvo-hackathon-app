"use client";

import { useStore } from "@/lib/store";

const channelMeta = {
  email: { glyph: "✉", tint: "text-blue-700", label: "E-mail" },
  phone: { glyph: "☎", tint: "text-amber-700", label: "Telefon" },
  system: { glyph: "⚙", tint: "text-slate-600", label: "SAP" },
} as const;

/** Renders the external manual/email/phone steps. Nothing is actually sent (PRD §3). */
export function ActionLog({ compact = false }: { compact?: boolean }) {
  const { actionLog } = useStore();

  return (
    <div className="flex h-full flex-col border border-[var(--sap-grid-line)] bg-white">
      <div className="border-b border-[var(--sap-grid-line)] bg-[var(--sap-header)] px-3 py-1.5 text-[12px] font-semibold text-slate-700">
        Protokol akcí (e-mail / telefon — nic se reálně neodesílá)
      </div>
      <ul className={`flex-1 overflow-auto ${compact ? "max-h-44" : ""}`}>
        {actionLog.length === 0 && (
          <li className="px-3 py-3 text-[12px] italic text-slate-400">
            Zatím žádné akce.
          </li>
        )}
        {actionLog.map((e) => {
          const m = channelMeta[e.channel];
          return (
            <li
              key={e.id}
              className="flex items-start gap-2 border-b border-slate-100 px-3 py-1.5 text-[12px]"
            >
              <span className="font-mono text-[11px] text-slate-400">{e.time}</span>
              <span className={`shrink-0 ${m.tint}`} title={m.label}>
                {m.glyph}
              </span>
              <span className="text-slate-700">{e.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
