"use client";

import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  getPo,
  getPoLines,
  findMaterial,
  generateRandomPo,
  purchaseOrders,
  poLines as seedLines,
} from "./mockData";
import { evaluateLine, isBlocking, type CheckResult } from "./checks";
import type {
  PurchaseOrder,
  PoLine,
  PoLineValidation,
  ValidationOutcome,
} from "./types";

export type Screen = "inbox" | "entry" | "completion" | "savings";

/** A line being keyed into SAP. Working values are editable copies of the PoLine. */
export interface WorkingLine {
  line_no: number;
  material_number: string;
  description: string;
  qty: number;
  uom: string;
  sklad: string;
  entered: boolean; // has been keyed + checked at least once
  result: CheckResult | null;
  delayNoticeSent: boolean; // OUT_OF_STOCK -> delay notice to DEK
  verificationSent: boolean; // blocking error -> verify mail/call to DEK
  successorOffered: string | null;
  resolved: boolean; // blocking error resolved via re-entry
}

export interface ActionLogEntry {
  id: number;
  time: string;
  channel: "email" | "phone" | "system";
  text: string;
}

interface State {
  screen: Screen;
  po: PurchaseOrder | null;
  lines: WorkingLine[];
  pdfChecked: boolean;
  validationLog: PoLineValidation[]; // -> po_line_validation table
  actionLog: ActionLogEntry[];
  ordersCompleted: number;
  seq: number;
}

type Action =
  | { type: "GOTO"; screen: Screen }
  | { type: "LOAD_PO"; poNumber: string }
  | { type: "LOAD_RANDOM" }
  | { type: "CHECK_PDF" }
  | { type: "START_ENTRY" }
  | { type: "SET_FIELD"; line_no: number; field: keyof WorkingLine; value: string }
  | { type: "ENTER_LINE"; line_no: number }
  | { type: "SEND_DELAY_NOTICE"; line_no: number }
  | { type: "ACCEPT_SUCCESSOR"; line_no: number }
  | { type: "VERIFY_DEK"; line_no: number }
  | { type: "COMPLETE_ORDER" }
  | { type: "CONFIRM_ORDER" }
  | { type: "RESET" };

const clock = (seq: number) => {
  // Deterministic faux timestamps (avoid Date.now hydration drift). 08:00 + seq min.
  const base = 8 * 60 + seq;
  const h = Math.floor(base / 60) % 24;
  const m = base % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

function toWorkingLines(lines: PoLine[]): WorkingLine[] {
  return lines.map((l) => ({
    line_no: l.line_no,
    material_number: l.material_number,
    description: findMaterial(l.material_number)?.description ?? "",
    qty: l.qty,
    uom: l.uom,
    sklad: l.target_storage_location,
    entered: false,
    result: null,
    delayNoticeSent: false,
    verificationSent: false,
    successorOffered: null,
    resolved: false,
  }));
}

const initialState: State = {
  screen: "inbox",
  po: purchaseOrders[0],
  lines: toWorkingLines(seedLines),
  pdfChecked: false,
  validationLog: [],
  actionLog: [],
  ordersCompleted: 0,
  seq: 0,
};

function logAction(
  state: State,
  channel: ActionLogEntry["channel"],
  text: string,
): { actionLog: ActionLogEntry[]; seq: number } {
  const seq = state.seq + 1;
  return {
    seq,
    actionLog: [...state.actionLog, { id: seq, time: clock(seq), channel, text }],
  };
}

function logValidation(
  state: State,
  line_no: number,
  outcome: ValidationOutcome,
  detail: string,
): PoLineValidation[] {
  return [
    ...state.validationLog,
    {
      po_number: state.po?.po_number ?? "",
      line_no,
      outcome,
      detail,
      created_at: clock(state.seq + 1),
    },
  ];
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "GOTO":
      return { ...state, screen: action.screen };

    case "LOAD_PO": {
      const po = getPo(action.poNumber);
      if (!po) return state;
      return {
        ...initialState,
        po,
        lines: toWorkingLines(getPoLines(action.poNumber)),
        ordersCompleted: state.ordersCompleted,
        seq: state.seq,
      };
    }

    case "LOAD_RANDOM": {
      const { po, lines } = generateRandomPo();
      return {
        ...initialState,
        po,
        lines: toWorkingLines(lines),
        ordersCompleted: state.ordersCompleted,
        seq: state.seq,
      };
    }

    case "CHECK_PDF": {
      const a = logAction(state, "system", `Manuální kontrola PDF objednávky ${state.po?.po_number} dokončena – V pořádku? ANO.`);
      return { ...state, pdfChecked: true, ...a };
    }

    case "START_ENTRY": {
      const po = state.po ? { ...state.po, status: "in_entry" as const } : null;
      const a = logAction(state, "system", `Zahájeno manuální zadání do SAP (ME21N) – ${po?.po_number}.`);
      return { ...state, po, screen: "entry", ...a };
    }

    case "SET_FIELD": {
      const lines = state.lines.map((l) => {
        if (l.line_no !== action.line_no) return l;
        const next: WorkingLine = { ...l, [action.field]: action.value } as WorkingLine;
        if (action.field === "qty") next.qty = Number(action.value);
        if (action.field === "material_number") {
          next.description = findMaterial(action.value)?.description ?? "";
        }
        // editing a field re-opens the line
        return { ...next, entered: false, result: null };
      });
      return { ...state, lines };
    }

    case "ENTER_LINE": {
      const line = state.lines.find((l) => l.line_no === action.line_no);
      if (!line) return state;
      const result = evaluateLine(line.material_number, line.qty, line.uom, line.sklad);
      const validationLog = logValidation(state, action.line_no, result.outcome, result.message);
      const wasBlocking = line.result ? isBlocking(line.result.outcome) : false;
      const lines = state.lines.map((l) =>
        l.line_no === action.line_no
          ? {
              ...l,
              entered: true,
              result,
              successorOffered: result.successor ?? null,
              // resolved if a previously blocking line now clears the blocking checks
              resolved: wasBlocking && !isBlocking(result.outcome),
            }
          : l,
      );
      return { ...state, lines, validationLog };
    }

    case "SEND_DELAY_NOTICE": {
      const line = state.lines.find((l) => l.line_no === action.line_no);
      const a = logAction(state, "email", `Upozornění na zpoždění odesláno do DEK – pozice ${action.line_no} (${line?.material_number}).`);
      const lines = state.lines.map((l) =>
        l.line_no === action.line_no ? { ...l, delayNoticeSent: true } : l,
      );
      return { ...state, lines, ...a };
    }

    case "ACCEPT_SUCCESSOR": {
      const line = state.lines.find((l) => l.line_no === action.line_no);
      if (!line?.successorOffered) return state;
      const succ = line.successorOffered;
      const a = logAction(state, "email", `Oznámení o změně na nástupce ${succ} odesláno do DEK – po odsouhlasení přepis do SAP (pozice ${action.line_no}).`);
      const lines = state.lines.map((l) =>
        l.line_no === action.line_no
          ? {
              ...l,
              material_number: succ,
              description: findMaterial(succ)?.description ?? "",
              entered: false,
              result: null,
            }
          : l,
      );
      return { ...state, lines, ...a };
    }

    case "VERIFY_DEK": {
      const line = state.lines.find((l) => l.line_no === action.line_no);
      const a = logAction(state, "phone", `Manuální ověření (mail/telefon) s DEK – pozice ${action.line_no} (${line?.material_number}). Po odsouhlasení přepis do SAP.`);
      const lines = state.lines.map((l) =>
        l.line_no === action.line_no ? { ...l, verificationSent: true } : l,
      );
      return { ...state, lines, ...a };
    }

    case "COMPLETE_ORDER": {
      const po = state.po ? { ...state.po, status: "completed" as const } : null;
      const a = logAction(state, "system", `Objednávka ${po?.po_number} dokončena v SAP.`);
      return { ...state, po, screen: "completion", ...a };
    }

    case "CONFIRM_ORDER": {
      const po = state.po ? { ...state.po, status: "confirmed" as const } : null;
      const a = logAction(state, "email", `Potvrzení objednávky ${po?.po_number} odesláno do DEK. Proces ukončen.`);
      return { ...state, po, ordersCompleted: state.ordersCompleted + 1, ...a };
    }

    case "RESET":
      return {
        ...initialState,
        ordersCompleted: state.ordersCompleted,
        seq: state.seq,
      };

    default:
      return state;
  }
}

const StateCtx = createContext<State | null>(null);
const DispatchCtx = createContext<Dispatch<Action> | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  );
}

export function useStore() {
  const s = useContext(StateCtx);
  if (!s) throw new Error("useStore must be used within StoreProvider");
  return s;
}

export function useDispatch() {
  const d = useContext(DispatchCtx);
  if (!d) throw new Error("useDispatch must be used within StoreProvider");
  return d;
}

// ── Derived selectors ─────────────────────────────────────────────────────────

/** A line is demo-ready when its checks clear: in stock, or short with a delay notice sent. */
export function lineReady(l: WorkingLine): boolean {
  if (!l.entered || !l.result) return false;
  const o = l.result.outcome;
  if (o === "IN_STOCK") return true;
  if (o === "OUT_OF_STOCK") return l.delayNoticeSent;
  return false; // any blocking outcome
}

export function allLinesReady(lines: WorkingLine[]): boolean {
  return lines.length > 0 && lines.every(lineReady);
}
