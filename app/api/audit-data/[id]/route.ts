import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { corsJson, corsPreflight } from "@/lib/cors";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const rows = await sql`SELECT id, brand_url, result, created_at FROM comp_audits WHERE id = ${params.id}`;

  if (rows.length === 0) {
    return corsJson({ error: "Audit not found." }, { status: 404 });
  }

  const row = rows[0];

  return corsJson({
    id: row.id,
    brandUrl: row.brand_url,
    result: row.result,
    createdAt: row.created_at,
    branding: {
      brandName: process.env.NEXT_PUBLIC_BRAND_NAME ?? "Westward Marketing Lab",
      primaryColor: process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR ?? "#055671",
      calendarUrl: process.env.NEXT_PUBLIC_CALENDAR_URL ?? "",
    },
  });
}
