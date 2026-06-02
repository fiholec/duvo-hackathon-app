import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

/** GET /api/catalog — the live validation catalogue from Supabase. */
export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const [products, successors, locations] = await Promise.all([
      db.from("products").select("hilti_article_code, description, unit_of_measure"),
      db.from("product_successors").select("old_hilti_article_code, new_hilti_article_code"),
      db.from("customer_delivery_locations").select("location_code"),
    ]);
    if (products.error || successors.error || locations.error) {
      throw new Error(products.error?.message || successors.error?.message || locations.error?.message);
    }
    return NextResponse.json({
      products: (products.data ?? []).map((r) => ({
        code: r.hilti_article_code,
        description: r.description,
        uom: r.unit_of_measure,
      })),
      successors: (successors.data ?? []).map((r) => ({
        old: r.old_hilti_article_code,
        new: r.new_hilti_article_code,
      })),
      locations: (locations.data ?? []).map((r) => r.location_code),
    });
  } catch (e) {
    return NextResponse.json({ products: [], successors: [], locations: [], error: String(e) });
  }
}
