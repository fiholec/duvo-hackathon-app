"use client";

import { useStore, useDispatch, type Screen } from "@/lib/store";
import { StatusBar } from "./StatusBar";
import { InboxScreen } from "./screens/InboxScreen";
import { OrderEntryScreen } from "./screens/OrderEntryScreen";
import { CompletionScreen } from "./screens/CompletionScreen";
import { SavingsScreen } from "./screens/SavingsScreen";

const TABS: { id: Screen; label: string; tcode: string }[] = [
  { id: "inbox", label: "Příchozí PDF", tcode: "SBWP" },
  { id: "entry", label: "Zadání objednávky", tcode: "ME21N" },
  { id: "completion", label: "Dokončení", tcode: "ME23N" },
  { id: "savings", label: "Úspora s duvo", tcode: "ROI" },
];

function ToolbarIcon({ label, glyph }: { label: string; glyph: string }) {
  return (
    <button
      title={label}
      className="grid h-6 w-6 place-items-center rounded-sm text-white/90 transition hover:bg-white/15"
    >
      <span className="text-[13px] leading-none">{glyph}</span>
    </button>
  );
}

export function SapShell() {
  const { screen } = useStore();
  const dispatch = useDispatch();
  const active = TABS.find((t) => t.id === screen) ?? TABS[0];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {/* GUI title bar */}
      <div className="flex items-center justify-between bg-[var(--sap-toolbar-2)] px-3 py-1 text-[11px] text-white/80">
        <span className="font-mono">
          SAP Easy Access — Hilti ČR (DEMO · duvo)
        </span>
        <span className="font-mono">PJ1 / 800 / CS</span>
      </div>

      {/* Command toolbar */}
      <div className="flex items-center gap-2 bg-[var(--sap-toolbar)] px-3 py-1.5">
        <span className="font-mono text-[11px] text-white/60">{active.tcode}</span>
        <input
          readOnly
          value={active.tcode}
          className="h-6 w-28 rounded-sm border border-white/30 bg-white px-2 font-mono text-[12px] text-slate-800"
        />
        <ToolbarIcon label="Enter" glyph="✓" />
        <ToolbarIcon label="Uložit" glyph="💾" />
        <ToolbarIcon label="Zpět" glyph="←" />
        <ToolbarIcon label="Konec" glyph="⏻" />
        <div className="mx-1 h-5 w-px bg-white/20" />

        {/* Screen tabs */}
        <nav className="flex items-center gap-1">
          {TABS.map((t) => {
            const isActive = t.id === screen;
            return (
              <button
                key={t.id}
                onClick={() => dispatch({ type: "GOTO", screen: t.id })}
                className={`rounded-sm px-3 py-1 text-[12px] font-medium transition ${
                  isActive
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-white/85 hover:bg-white/15"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto font-mono text-[11px] text-white/60">
          NO-540-26 · sklad 54081
        </div>
      </div>

      {/* Screen body */}
      <main className="flex-1 overflow-auto p-3 sm:p-4">
        {screen === "inbox" && <InboxScreen />}
        {screen === "entry" && <OrderEntryScreen />}
        {screen === "completion" && <CompletionScreen />}
        {screen === "savings" && <SavingsScreen />}
      </main>

      <StatusBar />
    </div>
  );
}
