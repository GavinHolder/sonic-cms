/**
 * GET /api/link-destinations — every destination a button/link can point at (VIEWER+).
 *
 *   (no params)                      grouped catalog: built-ins, pages, sections, forms, documents, features,
 *                                    policies, galleries, content. Disabled items are returned flagged, not dropped.
 *   ?currentPage=<slug|/>            sections of that page use the in-page "#id" form and sort first.
 *   ?group=media&type=document|image paginated media-library search (&q=&page=&perPage=&folderId=).
 *
 * All business logic lives in lib/link-destinations.ts; this route validates -> calls -> responds.
 * Never cached: a page/plugin toggled a moment ago must show up in the next picker that opens.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, handleApiError } from "@/lib/api-middleware";
import { loadCatalog, searchMedia, type MediaLinkType } from "@/lib/link-destinations";

const SLUG_RE = /^[A-Za-z0-9_\-./]{1,200}$/;

function noStore<T extends NextResponse>(res: T): T {
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function intParam(v: string | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const user = requireRole(request, "VIEWER");
    if (user instanceof Response) return noStore(user as NextResponse);

    const params = request.nextUrl.searchParams;
    const group = params.get("group");

    if (group === "media") {
      const type = params.get("type");
      if (type !== "document" && type !== "image") {
        return noStore(errorResponse("VALIDATION_ERROR", "type must be 'document' or 'image'", 400, "type"));
      }
      const result = await searchMedia(prisma, {
        type: type as MediaLinkType,
        q: params.get("q") ?? undefined,
        page: intParam(params.get("page")),
        perPage: intParam(params.get("perPage")),
        folderId: params.get("folderId"),
      });
      return noStore(successResponse(result));
    }

    if (group !== null && group !== "") {
      return noStore(errorResponse("VALIDATION_ERROR", "unknown group", 400, "group"));
    }

    const rawCurrent = params.get("currentPage");
    const currentPage = rawCurrent && SLUG_RE.test(rawCurrent) ? rawCurrent : null;
    const catalog = await loadCatalog(prisma, { currentPage });
    return noStore(successResponse(catalog));
  } catch (error) {
    return noStore(handleApiError(error));
  }
}
