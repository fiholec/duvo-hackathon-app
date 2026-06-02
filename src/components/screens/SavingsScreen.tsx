"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  DEFAULT_ASSUMPTIONS,
  computeSavings,
  formatCzk,
  formatNum,
  type SavingsAssumptions,
} from "@/lib/savings";

function Field({
  label,
  suffix,
  value,
  onChange,
  step = 1,
  min = 0,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-slate-300">{label}</span>
      <div className="flex items-center rounded-md border border-white/15 bg-white/5 focus-within:border-[var(--duvo-accent)]">
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent px-3 py-2 text-[15px] font-semibold text-white outline-none"
        />
        <span className="px-3 text-[12px] text-slate-400">{suffix}</span>
      </div>
    </label>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-[var(--duvo-accent)]/40 bg-[var(--duvo-accent)]/10"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="text-[12px] uppercase tracking-wide text-slate-400">{label}</div>
      <div
        className={`mt-1 text-2xl font-bold tracking-tight ${
          highlight ? "text-[var(--duvo-accent)]" : "text-white"
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[12px] text-slate-400">{sub}</div>}
    </div>
  );
}

export function SavingsScreen() {
  const { ordersCompleted } = useStore();
  const [a, setA] = useState<SavingsAssumptions>(DEFAULT_ASSUMPTIONS);
  const r = computeSavings(a);

  const upd = (patch: Partial<SavingsAssumptions>) => setA((prev) => ({ ...prev, ...patch }));
  const liveMinutes = ordersCompleted * r.minutesSavedPerRun;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="overflow-hidden rounded-2xl bg-[var(--duvo-ink)] text-white shadow-xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <span className="text-[var(--duvo-accent)]">duvo</span>
              <span className="text-white/90">· Kalkulačka úspory</span>
            </div>
            <p className="mt-1 text-[13px] text-slate-300">
              Automatizace manuálního zadávání objednávek DEK → Hilti do SAP.
            </p>
          </div>
          <div className="rounded-lg border border-[var(--duvo-accent)]/40 bg-[var(--duvo-accent)]/10 px-4 py-2 text-center">
            <div className="text-[11px] uppercase tracking-wide text-slate-300">
              Zpracováno v této relaci
            </div>
            <div className="text-xl font-bold text-[var(--duvo-accent)]">
              {ordersCompleted} obj. · {formatNum(liveMinutes)} min
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[300px_1fr]">
          {/* Assumptions */}
          <div className="space-y-4">
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">
              Předpoklady
            </h3>
            <Field
              label="Počet běhů workflow / týden"
              suffix="× / týd."
              value={a.runsPerWeek}
              onChange={(n) => upd({ runsPerWeek: n })}
            />
            <Field
              label="Manuální čas na 1 běh"
              suffix="min"
              value={a.minutesPerRun}
              onChange={(n) => upd({ minutesPerRun: n })}
            />
            <Field
              label="Míra automatizace"
              suffix="%"
              value={Math.round(a.automationRate * 100)}
              onChange={(n) => upd({ automationRate: Math.min(1, Math.max(0, n / 100)) })}
              step={5}
            />
            <Field
              label="Hodinová sazba operátora"
              suffix="Kč / h"
              value={a.hourlyRateCzk}
              onChange={(n) => upd({ hourlyRateCzk: n })}
              step={50}
            />
            <p className="text-[11px] leading-relaxed text-slate-400">
              Výchozí hodnoty dle zadání: workflow běží ~150× týdně a zabere ~10 min
              manuální práce. Hodnoty lze upravit.
            </p>
          </div>

          {/* Results */}
          <div className="space-y-5">
            <div>
              <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-slate-400">
                Ušetřený čas
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Týdně" value={`${formatNum(r.hoursPerWeek)} h`} />
                <Stat label="Měsíčně" value={`${formatNum(r.hoursPerMonth)} h`} />
                <Stat
                  label="Ročně"
                  value={`${formatNum(r.hoursPerYear)} h`}
                  sub={`≈ ${formatNum(r.workDaysPerYear)} pracovních dní`}
                />
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-slate-400">
                Finanční úspora (CZK)
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Týdně" value={formatCzk(r.czkPerWeek)} />
                <Stat label="Měsíčně" value={formatCzk(r.czkPerMonth)} highlight />
                <Stat label="Ročně" value={formatCzk(r.czkPerYear)} highlight />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-[13px] text-slate-300">
              <p>
                Při <span className="font-semibold text-white">{a.runsPerWeek}</span> bězích
                týdně po <span className="font-semibold text-white">{a.minutesPerRun} min</span>{" "}
                a automatizaci{" "}
                <span className="font-semibold text-white">
                  {Math.round(a.automationRate * 100)} %
                </span>{" "}
                ušetří duvo přibližně{" "}
                <span className="font-semibold text-[var(--duvo-accent)]">
                  {formatCzk(r.czkPerYear)}
                </span>{" "}
                ročně a uvolní{" "}
                <span className="font-semibold text-[var(--duvo-accent)]">
                  {formatNum(r.workDaysPerYear)} pracovních dní
                </span>{" "}
                kapacity operátorů na hodnotnější práci.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
