// Time-savings / ROI model. duvo automates the manual SAP order-entry workflow.
// Baseline: the process runs ~150x/week and takes ~10 min of manual operator time.

export interface SavingsAssumptions {
  runsPerWeek: number; // how often the workflow runs
  minutesPerRun: number; // manual minutes per run today
  automationRate: number; // 0..1 share of the manual time duvo removes
  hourlyRateCzk: number; // loaded operator cost, CZK / hour
}

export const DEFAULT_ASSUMPTIONS: SavingsAssumptions = {
  runsPerWeek: 150,
  minutesPerRun: 10,
  automationRate: 1, // happy path: the full manual entry is automated
  hourlyRateCzk: 450,
};

const WEEKS_PER_MONTH = 52 / 12; // 4.333…
const WEEKS_PER_YEAR = 52;

export interface SavingsResult {
  minutesSavedPerRun: number;
  hoursPerWeek: number;
  hoursPerMonth: number;
  hoursPerYear: number;
  czkPerWeek: number;
  czkPerMonth: number;
  czkPerYear: number;
  /** working days/year reclaimed, assuming an 8h day */
  workDaysPerYear: number;
}

export function computeSavings(a: SavingsAssumptions): SavingsResult {
  const minutesSavedPerRun = a.minutesPerRun * a.automationRate;
  const minutesPerWeek = minutesSavedPerRun * a.runsPerWeek;
  const hoursPerWeek = minutesPerWeek / 60;
  const hoursPerMonth = hoursPerWeek * WEEKS_PER_MONTH;
  const hoursPerYear = hoursPerWeek * WEEKS_PER_YEAR;
  return {
    minutesSavedPerRun,
    hoursPerWeek,
    hoursPerMonth,
    hoursPerYear,
    czkPerWeek: hoursPerWeek * a.hourlyRateCzk,
    czkPerMonth: hoursPerMonth * a.hourlyRateCzk,
    czkPerYear: hoursPerYear * a.hourlyRateCzk,
    workDaysPerYear: hoursPerYear / 8,
  };
}

const czk = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 });

export const formatCzk = (v: number) => czk.format(Math.round(v));
export const formatNum = (v: number) => num.format(v);
