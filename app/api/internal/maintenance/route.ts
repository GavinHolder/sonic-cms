import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";

interface MaintenanceInfo {
  enabled: boolean;
  template: string;
  slug: string;
}

const getMaintenanceInfo = unstable_cache(
  async (): Promise<MaintenanceInfo> => {
    try {
      const [mode, tpl, page] = await Promise.all([
        prisma.systemSettings.findUnique({ where: { key: "maintenance_mode" } }),
        prisma.systemSettings.findUnique({ where: { key: "maintenance_template" } }),
        prisma.systemSettings.findUnique({ where: { key: "maintenance_page_slug" } }),
      ]);
      return {
        enabled: mode?.value === "true",
        template: tpl?.value ?? "plain",
        slug: page?.value ?? "",
      };
    } catch {
      return { enabled: false, template: "plain", slug: "" };
    }
  },
  ["internal-maintenance"],
  { revalidate: 10, tags: ["maintenance-config"] }
);

/** Internal endpoint — called by middleware (Edge) to resolve maintenance mode without Prisma */
export async function GET(req: NextRequest) {
  const internal = req.headers.get("x-internal");
  if (!internal) return NextResponse.json({ enabled: false }, { status: 403 });
  return NextResponse.json(await getMaintenanceInfo());
}
