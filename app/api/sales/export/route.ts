import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { listSales } from "@/features/sales/queries";
import { rateLimit, rateLimitMessage } from "@/lib/security/rate-limit";
import { buildCsv } from "@/lib/security/csv";
import { AppError } from "@/lib/errors";

// CSV export endpoint. Defense-in-depth:
//   1. Explicit `requirePermission("sale:read")` here so unauthenticated
//      hits get a clean 401 instead of bubbling an internal redirect.
//   2. Per-user rate limit — exports run heavy queries; cap abuse.
//   3. perPage is capped to 1000 (schema max) so a 10k pull doesn't OOM.
//      If you need bigger exports later, switch to streaming.
//   4. Cell values are formula-escaped (CSV injection mitigation).
const EXPORT_LIMIT = 5;
const EXPORT_WINDOW_MS = 60_000; // 5 exports / minute / user
const MAX_ROWS = 1000;

export async function GET(request: NextRequest) {
  try {
    const member = await requirePermission("sale:read");

    const rl = rateLimit(
      `sales-export:${member.userId}`,
      EXPORT_LIMIT,
      EXPORT_WINDOW_MS,
    );
    if (!rl.ok) {
      return NextResponse.json(
        { error: rateLimitMessage(rl, "exports") },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.retryAfterSeconds),
          },
        },
      );
    }

    const params = Object.fromEntries(new URL(request.url).searchParams);
    const result = await listSales({
      ...params,
      page: 1,
      perPage: MAX_ROWS,
    });

    const headers = [
      "Receipt #",
      "Date (UTC)",
      "Items",
      "Subtotal",
      "Discount",
      "Tax",
      "Total",
      "Payment",
      "Cashier",
      "Status",
    ];
    const rows = result.items.map((s) => [
      s.receiptNumber,
      s.createdAtIso,
      s.itemCount,
      (s.subtotalCentavos / 100).toFixed(2),
      (s.discountCentavos / 100).toFixed(2),
      (s.taxCentavos / 100).toFixed(2),
      (s.totalCentavos / 100).toFixed(2),
      s.paymentMethod,
      s.cashierName,
      s.voidedAt ? "VOIDED" : "PAID",
    ]);

    const csv = buildCsv(headers, rows);
    const filename = `sales-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        // Don't let the browser cache exports — they contain sensitive
        // sales data and the dataset changes with every new sale.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
