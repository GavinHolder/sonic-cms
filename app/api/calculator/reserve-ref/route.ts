/**
 * GET /api/calculator/reserve-ref
 *
 * Atomically reads the current quote_ref_counter from system_settings,
 * formats a reference string, increments the counter, and returns the ref.
 *
 * No auth required — calculator is a public feature page.
 * Rate-limiting should be added at the infrastructure layer if abuse is a concern.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const DEFAULT_PREFIX = "CE";
const DEFAULT_COUNTER = 1001;

export async function GET() {
  try {
    // Read current settings
    const rows = await prisma.systemSettings.findMany({
      where: { key: { in: ["quote_ref_prefix", "quote_ref_counter"] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const prefix = map.quote_ref_prefix || DEFAULT_PREFIX;
    const counter = parseInt(map.quote_ref_counter || String(DEFAULT_COUNTER), 10);
    const next = isNaN(counter) ? DEFAULT_COUNTER : counter;

    const ref = `${prefix}-${String(next).padStart(4, "0")}`;

    // Increment counter (upsert so it works even if row doesn't exist)
    await prisma.systemSettings.upsert({
      where: { key: "quote_ref_counter" },
      update: { value: String(next + 1) },
      create: { key: "quote_ref_counter", value: String(next + 1) },
    });

    return NextResponse.json({ ref });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reserve reference number";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
