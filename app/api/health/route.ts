import { NextResponse } from "next/server";
import versionData from "@/public/cms-version.json";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: versionData.version,
    date: versionData.date,
  });
}
