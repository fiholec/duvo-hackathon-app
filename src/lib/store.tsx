"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import {
  getPo,
  getPoLines,
  findMaterial,
  generateRandomPo,
} from "./mockData";
import { evaluateLine, isBlocking, type CheckResult } from "./checks";
import { findProduct, setCatalog } from "./catalog";
import { loadPersisted, savePersisted } from "./persistence";
import type {
  PurchaseOrder,
  PoLine,
  PoLineValidation,
  ValidationOutcome,
  Actor,
  AuditEvent,
  ProcessedOrderRecord,
} from "./types";

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
  actor: Actor;
  po: PurchaseOrder | null;
  lines: WorkingLine[];
  validationLog: PoLineValidation[]; // -> po_line_validation table
  actionLog: ActionLogEntry[];
  auditLog: AuditEvent[]; // -> audit_log table (persisted)
  processedOrders: ProcessedOrderRecord[]; // -> processed_order table (persisted)
  ordersCompleted: number;
  hydrated: boolean;
}

/** Meta is injected by the dispatch wrapper: real timestamp + the current actor. */
interface Meta {
  ts?: string;
  actor?: Actor;
}

type Action =
  | { type: "SET_ACTOR"; actor: Actor }
  | { type: "HYDRATE"; processedOrders: ProcessedOrderRecord[]; auditLog: AuditEvent[] }
  | { type: "LOAD_PO"; poNumber: string }
  | { type: "LOAD_RANDOM" }
  | { type: "SET_PO_FIELD"; field: "po_number" | "requested_delivery_date"; value: string }
  | { type: "ADD_LINE" }
  | { type: "DELETE_LINE"; line_no: number }
  | { type: "SET_FIELD"; line_no: number; field: keyof WorkingLine; value: string }
  | { type: "ENTER_LINE"; line_no: number }
  | { type: "SEND_DELAY_NOTICE"; line_no: number }
  | { type: "ACCEPT_SUCCESSOR"; line_no: number }
  | { type: "VERIFY_DEK"; line_no: number }
  | { type: "COMPLETE_ORDER" }
  | { type: "CONFIRM_ORDER" }
  | { type: "RESET" };

const hhmmss = (ts: string) => (ts.length >= 19 ? ts.slice(11, 19) : ts);

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

/** A fresh, empty purchase order — the operator fills the number + date by hand. */
const EMPTY_PO: PurchaseOrder = {
  po_number: "",
  supplier: "Hilti ČR spol. s r.o.",
  customer: "Stavebniny DEK a.s.",
  requested_delivery_date: "",
  status: "received",
};

const initialState: State = {
  actor: "operator",
  po: EMPTY_PO,
  lines: [], // start empty — operator adds rows manually from the PDF
  validationLog: [],
  actionLog: [],
  auditLog: [],
  processedOrders: [],
  ordersCompleted: 0,
  hydrated: false,
};

// ── log builders (pure; timestamp comes in via the action) ────────────────────
function withAction(
  state: State,
  ts: string,
  channel: ActionLogEntry["channel"],
  text: string,
): ActionLogEntry[] {
  return [...state.actionLog, { id: state.actionLog.length + 1, time: hhmmss(ts), channel, text }];
}

function withAudit(
  state: State,
  ts: string,
  actor: Actor,
  type: AuditEvent["type"],
  line_no: number | null,
  message: string,
): AuditEvent[] {
  return [
    ...state.auditLog,
    {
      id: state.auditLog.length + 1,
      ts,
      actor,
      type,
      po_number: state.po?.po_number ?? "",
      line_no,
      message,
    },
  ];
}

function withValidation(
  state: State,
  ts: string,
  line_no: number,
  outcome: ValidationOutcome,
  detail: string,
): PoLineValidation[] {
  return [
    ...state.validationLog,
    { po_number: state.po?.po_number ?? "", line_no, outcome, detail, created_at: hhmmss(ts) },
  ];
}

/** Reset only the per-order working fields; cross-order logs/queue persist. */
function freshOrder(po: PurchaseOrder, lines: PoLine[]) {
  return {
    po,
    lines: toWorkingLines(lines),
    validationLog: [] as PoLineValidation[],
    actionLog: [] as ActionLogEntry[],
  };
}

function reducer(state: State, action: Action & Meta): State {
  const ts = action.ts ?? "1970-01-01T00:00:00.000Z";
  const actor = action.actor ?? state.actor;

  switch (action.type) {
    case "SET_ACTOR":
      return { ...state, actor: action.actor };

    case "HYDRATE":
      return {
        ...state,
        processedOrders: action.processedOrders,
        auditLog: action.auditLog,
        hydrated: true,
      };

    case "LOAD_PO": {
      const po = getPo(action.poNumber);
      if (!po) return state;
      return {
        ...state,
        ...freshOrder(po, getPoLines(action.poNumber)),
        auditLog: withAudit({ ...state, po }, ts, actor, "order_loaded", null, `Objednávka ${po.po_number} načtena do SAP (ME21N).`),
      };
    }

    case "LOAD_RANDOM": {
      const { po, lines } = generateRandomPo();
      const fresh = freshOrder(po, lines);
      return {
        ...state,
        ...fresh,
        auditLog: withAudit({ ...state, po }, ts, actor, "order_loaded", null, `Náhodná objednávka ${po.po_number} načtena do SAP (ME21N).`),
      };
    }

    case "SET_PO_FIELD":
      return state.po ? { ...state, po: { ...state.po, [action.field]: action.value } } : state;

    case "ADD_LINE": {
      // Mandatory: PO number + delivery date must be filled before any row is added.
      if (!state.po || !state.po.po_number.trim() || !state.po.requested_delivery_date.trim()) {
        return state;
      }
      const nextNo = state.lines.length
        ? Math.max(...state.lines.map((l) => l.line_no)) + 10
        : 10;
      const blank: WorkingLine = {
        line_no: nextNo,
        material_number: "",
        description: "",
        qty: NaN,
        uom: "",
        sklad: "",
        entered: false,
        result: null,
        delayNoticeSent: false,
        verificationSent: false,
        successorOffered: null,
        resolved: false,
      };
      return { ...state, lines: [...state.lines, blank] };
    }

    case "DELETE_LINE":
      return { ...state, lines: state.lines.filter((l) => l.line_no !== action.line_no) };

    case "SET_FIELD": {
      const lines = state.lines.map((l) => {
        if (l.line_no !== action.line_no) return l;
        const next: WorkingLine = { ...l, [action.field]: action.value } as WorkingLine;
        if (action.field === "qty") next.qty = Number(action.value);
        if (action.field === "material_number") {
          next.description = findProduct(action.value)?.description ?? "";
        }
        return { ...next, entered: false, result: null }; // editing re-opens the line
      });
      return { ...state, lines };
    }

    case "ENTER_LINE": {
      const line = state.lines.find((l) => l.line_no === action.line_no);
      if (!line) return state;
      const result = evaluateLine(line.material_number, line.qty, line.uom, line.sklad);
      const wasBlocking = line.result ? isBlocking(line.result.outcome) : false;
      const lines = state.lines.map((l) =>
        l.line_no === action.line_no
          ? {
              ...l,
              entered: true,
              result,
              successorOffered: result.successor ?? null,
              resolved: wasBlocking && !isBlocking(result.outcome),
            }
          : l,
      );
      return {
        ...state,
        lines,
        validationLog: withValidation(state, ts, action.line_no, result.outcome, result.message),
        auditLog: withAudit(
          state,
          ts,
          actor,
          "line_entered",
          action.line_no,
          `Řádek ${action.line_no} zadán: ${line.material_number}, ${line.qty} ${line.uom}, sklad ${line.sklad} → ${result.outcome}.`,
        ),
      };
    }

    case "SEND_DELAY_NOTICE": {
      const line = state.lines.find((l) => l.line_no === action.line_no);
      const lines = state.lines.map((l) =>
        l.line_no === action.line_no ? { ...l, delayNoticeSent: true } : l,
      );
      return {
        ...state,
        lines,
        actionLog: withAction(state, ts, "email", `Upozornění na zpoždění odesláno do DEK – pozice ${action.line_no} (${line?.material_number}).`),
        auditLog: withAudit(state, ts, actor, "delay_notice", action.line_no, `Upozornění na zpoždění do DEK – pozice ${action.line_no}.`),
      };
    }

    case "ACCEPT_SUCCESSOR": {
      const line = state.lines.find((l) => l.line_no === action.line_no);
      if (!line?.successorOffered) return state;
      const succ = line.successorOffered;
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
      return {
        ...state,
        lines,
        actionLog: withAction(state, ts, "email", `Oznámení o změně na nástupce ${succ} odesláno do DEK – po odsouhlasení přepis do SAP (pozice ${action.line_no}).`),
        auditLog: withAudit(state, ts, actor, "successor_accepted", action.line_no, `Převzat nástupce ${succ} – pozice ${action.line_no}, oznámeno DEK.`),
      };
    }

    case "VERIFY_DEK": {
      const line = state.lines.find((l) => l.line_no === action.line_no);
      const lines = state.lines.map((l) =>
        l.line_no === action.line_no ? { ...l, verificationSent: true } : l,
      );
      return {
        ...state,
        lines,
        actionLog: withAction(state, ts, "phone", `Manuální ověření (mail/telefon) s DEK – pozice ${action.line_no} (${line?.material_number}). Po odsouhlasení přepis do SAP.`),
        auditLog: withAudit(state, ts, actor, "dek_verification", action.line_no, `Ověření s DEK – pozice ${action.line_no}.`),
      };
    }

    case "COMPLETE_ORDER": {
      if (!state.po) return state;
      const po = { ...state.po, status: "completed" as const };
      const record: ProcessedOrderRecord = {
        po_number: po.po_number,
        supplier: po.supplier,
        customer: po.customer,
        actor,
        completed_at: ts,
        confirmed_at: null,
        status: "completed",
        line_count: state.lines.length,
        lines: state.lines.map((l) => ({
          line_no: l.line_no,
          material_number: l.material_number,
          description: l.description,
          qty: l.qty,
          uom: l.uom,
          sklad: l.sklad,
          outcome: l.result?.outcome ?? "OK",
        })),
      };
      return {
        ...state,
        // Record the order, then reset the working form for the next one.
        po: EMPTY_PO,
        lines: [],
        validationLog: [],
        actionLog: [],
        processedOrders: [record, ...state.processedOrders.filter((p) => p.po_number !== po.po_number)],
        auditLog: withAudit(state, ts, actor, "order_completed", null, `Objednávka ${po.po_number} dokončena v SAP (${state.lines.length} pozic).`),
      };
    }

    case "CONFIRM_ORDER": {
      if (!state.po) return state;
      const po = { ...state.po, status: "confirmed" as const };
      return {
        ...state,
        po,
        ordersCompleted: state.ordersCompleted + 1,
        processedOrders: state.processedOrders.map((p) =>
          p.po_number === po.po_number ? { ...p, status: "confirmed" as const, confirmed_at: ts } : p,
        ),
        actionLog: withAction(state, ts, "email", `Potvrzení objednávky ${po.po_number} odesláno do DEK. Proces ukončen.`),
        auditLog: withAudit(state, ts, actor, "order_confirmed", null, `Potvrzení objednávky ${po.po_number} odesláno do DEK – proces ukončen.`),
      };
    }

    case "RESET":
      return {
        ...initialState,
        actor: state.actor,
        auditLog: state.auditLog,
        processedOrders: state.processedOrders,
        ordersCompleted: state.ordersCompleted,
        hydrated: state.hydrated,
      };

    default:
      return state;
  }
}

const StateCtx = createContext<State | null>(null);
type WrappedDispatch = (action: Action) => void;
const DispatchCtx = createContext<WrappedDispatch | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, initialState);

  // Keep the latest actor in a ref so the dispatch wrapper stays stable.
  const actorRef = useRef<Actor>(state.actor);
  useEffect(() => {
    actorRef.current = state.actor;
  }, [state.actor]);

  // Inject real timestamp + current actor into every dispatched action.
  const dispatch = useCallback<WrappedDispatch>((action) => {
    rawDispatch({ ...action, ts: new Date().toISOString(), actor: actorRef.current });
  }, []);

  // Detect a browser-automation agent (duvo) driving the form.
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.webdriver) {
      rawDispatch({ type: "SET_ACTOR", actor: "duvo-agent" });
    }
  }, []);

  // Hydrate persisted state (processed orders + audit log) after mount.
  // loadPersisted is async now (Supabase via /api/persistence); guard against
  // a dispatch after unmount.
  useEffect(() => {
    let cancelled = false;
    loadPersisted().then((p) => {
      if (!cancelled) {
        rawDispatch({ type: "HYDRATE", processedOrders: p.processedOrders, auditLog: p.auditLog });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the product / warehouse catalogue from Supabase so validation hits the DB.
  useEffect(() => {
    fetch("/api/catalog", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.products)) setCatalog(d);
      })
      .catch(() => {});
  }, []);

  // Persist whenever the durable data changes (post-hydration only).
  useEffect(() => {
    if (!state.hydrated) return;
    savePersisted({ processedOrders: state.processedOrders, auditLog: state.auditLog });
  }, [state.processedOrders, state.auditLog, state.hydrated]);

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
  // Submittable when in stock, or out of stock (reconciled in SAP later).
  // Errors (article/qty/warehouse/successor) must be fixed to green/amber first.
  return o === "VALID" || o === "IN_STOCK" || o === "OUT_OF_STOCK";
}

export function allLinesReady(lines: WorkingLine[]): boolean {
  return lines.length > 0 && lines.every(lineReady);
}
