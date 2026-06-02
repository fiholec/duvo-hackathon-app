"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useStore, useDispatch } from "@/lib/store";
import type { Actor } from "@/lib/types";
import { StatusBar } from "./StatusBar";

/** The navigable screens, as real routes. `completion` is reachable but not a tab. */
export const NAV_TABS: { href: string; label: string; tcode: string }[] = [
  { href: "/order-entry", label: "Zadání objednávky", tcode: "ME21N" },
  { href: "/processed-orders", label: "Zpracované objednávky", tcode: "ME2N" },
  { href: "/audit-log", label: "Audit log", tcode: "SLG1" },
  { href: "/savings", label: "Úspora s duvo", tcode: "ROI" },
];

const TCODE_BY_PATH: Record<string, string> = {
  "/order-entry": "ME21N",
  "/processed-orders": "ME2N",
  "/audit-log": "SLG1",
  "/savings": "ROI",
  "/completion": "ME23N",
};

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

/** Shows who is driving the session; auto-detected for the duvo automation agent. */
function ActorBadge() {
  const { actor } = useStore();
  const dispatch = useDispatch();
  const set = (a: Actor) => dispatch({ type: "SET_ACTOR", actor: a });
  return (
    <div className="flex items-center gap-1 rounded-sm bg-white/10 p-0.5" title="Kdo zpracovává objednávku">
      {(["operator", "duvo-agent"] as Actor[]).map((a) => (
        <button
          key={a}
          data-testid={`actor-${a}`}
          onClick={() => set(a)}
          className={`rounded-sm px-2 py-0.5 text-[11px] font-medium transition ${
            actor === a ? "bg-white text-slate-800" : "text-white/70 hover:bg-white/10"
          }`}
        >
          {a === "operator" ? "👤 Operátor" : "🤖 duvo agent"}
        </button>
      ))}
    </div>
  );
}

export function SapShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const tcode = TCODE_BY_PATH[pathname] ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {/* GUI title bar */}
      <div className="flex items-center justify-between bg-[var(--sap-toolbar-2)] px-3 py-1 text-[11px] text-white/80">
        <span className="font-mono">SAP Easy Access — Hilti ČR (DEMO · duvo)</span>
        <span className="font-mono">PJ1 / 800 / CS</span>
      </div>

      {/* Command toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-[var(--sap-toolbar)] px-3 py-1.5">
        <span className="font-mono text-[11px] text-white/60">{tcode}</span>
        <input
          readOnly
          value={tcode}
          className="h-6 w-24 rounded-sm border border-white/30 bg-white px-2 font-mono text-[12px] text-slate-800"
        />
        <ToolbarIcon label="Enter" glyph="✓" />
        <ToolbarIcon label="Uložit" glyph="💾" />
        <ToolbarIcon label="Zpět" glyph="←" />
        <ToolbarIcon label="Konec" glyph="⏻" />
        <div className="mx-1 h-5 w-px bg-white/20" />

        {/* Screen tabs — real route links */}
        <nav className="flex items-center gap-1">
          {NAV_TABS.map((t) => {
            const isActive = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                data-testid={`tab-${t.href.slice(1)}`}
                className={`rounded-sm px-3 py-1 text-[12px] font-medium transition ${
                  isActive ? "bg-white text-slate-800 shadow-sm" : "text-white/85 hover:bg-white/15"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto">
          <ActorBadge />
        </div>
      </div>

      {/* Screen body — the active route renders here */}
      <main className="flex-1 overflow-auto p-3 sm:p-4">{children}</main>

      <StatusBar />
    </div>
  );
}
