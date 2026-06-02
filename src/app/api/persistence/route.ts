import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import type { AuditEvent, ProcessedOrderLine, ProcessedOrderRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /api/persistence — load processed orders (with lines) + the audit log. */
export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const [orders, lines, audit] = await Promise.all([
      db.from("processed_order").select("*").order("completed_at", { ascending: false }),
      db.from("processed_order_line").select("*"),
      db.from("audit_log").select("*").order("ts", { ascending: true }),
    ]);
    if (orders.error || lines.error || audit.error) {
      throw new Error(orders.error?.message || lines.error?.message || audit.error?.message);
    }

    const linesByPo = new Map<string, ProcessedOrderLine[]>();
    for (const l of lines.data ?? []) {
      const arr = linesByPo.get(l.po_number) ?? [];
      arr.push({
        line_no: l.line_no,
        material_number: l.material_number,
        description: l.description,
        qty: Number(l.qty),
        uom: l.uom,
        sklad: l.sklad,
        outcome: l.outcome,
      });
      linesByPo.set(l.po_number, arr);
    }

    const processedOrders: ProcessedOrderRecord[] = (orders.data ?? []).map((o) => ({
      po_number: o.po_number,
      supplier: o.supplier,
      customer: o.customer,
      actor: o.actor,
      completed_at: o.completed_at,
      confirmed_at: o.confirmed_at,
      status: o.status,
      line_count: o.line_count,
      lines: (linesByPo.get(o.po_number) ?? []).sort((a, b) => a.line_no - b.line_no),
    }));

    const auditLog: AuditEvent[] = (audit.data ?? []).map((a, i) => ({
      id: i + 1,
      ts: a.ts,
      actor: a.actor,
      type: a.type,
      po_number: a.po_number,
      line_no: a.line_no,
      message: a.message,
    }));

    return NextResponse.json({ processedOrders, auditLog });
  } catch (e) {
    // Degrade gracefully — the app reads this as "nothing persisted yet".
    return NextResponse.json({ processedOrders: [], auditLog: [], error: String(e) });
  }
}

/** POST /api/persistence — idempotent upsert of the full processed-orders + audit arrays. */
export async function POST(req: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = (await req.json()) as {
      processedOrders?: ProcessedOrderRecord[];
      auditLog?: AuditEvent[];
    };
    const processedOrders = body.processedOrders ?? [];
    const auditLog = body.auditLog ?? [];

    if (processedOrders.length) {
      const orderRows = processedOrders.map((o) => ({
        po_number: o.po_number,
        supplier: o.supplier,
        customer: o.customer,
        actor: o.actor,
        completed_at: o.completed_at,
        confirmed_at: o.confirmed_at,
        status: o.status,
        line_count: o.line_count,
      }));
      const r1 = await db.from("processed_order").upsert(orderRows, { onConflict: "po_number" });
      if (r1.error) throw new Error(r1.error.message);

      const lineRows = processedOrders.flatMap((o) =>
        o.lines.map((l) => ({
          po_number: o.po_number,
          line_no: l.line_no,
          material_number: l.material_number,
          description: l.description,
          qty: l.qty,
          uom: l.uom,
          sklad: l.sklad,
          outcome: l.outcome,
        })),
      );
      if (lineRows.length) {
        const r2 = await db
          .from("processed_order_line")
          .upsert(lineRows, { onConflict: "po_number,line_no" });
        if (r2.error) throw new Error(r2.error.message);
      }
    }

    if (auditLog.length) {
      const auditRows = auditLog.map((a) => ({
        event_key: `${a.po_number}|${a.ts}|${a.type}|${a.line_no ?? ""}`,
        ts: a.ts,
        actor: a.actor,
        type: a.type,
        po_number: a.po_number,
        line_no: a.line_no,
        message: a.message,
      }));
      const r3 = await db
        .from("audit_log")
        .upsert(auditRows, { onConflict: "event_key", ignoreDuplicates: true });
      if (r3.error) throw new Error(r3.error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
