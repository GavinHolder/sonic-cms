/**
 * GET    /api/admin/form-submissions           - List form submissions (admin)
 * PUT    /api/admin/form-submissions            - Update submission status { id, status }
 * DELETE /api/admin/form-submissions?id=<id>   - Delete a submission
 */

import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, handleApiError } from "@/lib/api-middleware";

export async function GET(request: NextRequest) {
  try {
    const user = requireRole(request, "VIEWER");
    if (user instanceof Response) return user;

    const { searchParams } = new URL(request.url);
    const pageSlug = searchParams.get("pageSlug");
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const status = searchParams.get("status");

    const where: any = {};
    if (pageSlug) where.pageSlug = pageSlug;
    if (status) where.status = status;

    const [submissions, total] = await Promise.all([
      prisma.formSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: { page: { select: { title: true, slug: true } } },
      }),
      prisma.formSubmission.count({ where }),
    ]);

    return successResponse(
      { submissions: submissions.map(s => ({
        id: s.id,
        pageSlug: s.pageSlug,
        pageTitle: s.page?.title ?? s.pageSlug,
        data: s.data,
        userEmail: s.userEmail,
        status: s.status,
        createdAt: s.createdAt,
      })) },
      200,
      { total, limit, offset }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    const body = await request.json();
    const { id, status } = body as { id: string; status: string };
    if (!id || !status) return errorResponse("MISSING_FIELDS", "id and status are required", 400);

    const sub = await prisma.formSubmission.findUnique({ where: { id } });
    if (!sub) return errorResponse("NOT_FOUND", "Submission not found", 404);

    const updated = await prisma.formSubmission.update({
      where: { id },
      data: { status },
    });
    return successResponse({ id: updated.id, status: updated.status });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return errorResponse("MISSING_ID", "Submission ID required", 400);

    const sub = await prisma.formSubmission.findUnique({ where: { id } });
    if (!sub) return errorResponse("NOT_FOUND", "Submission not found", 404);

    await prisma.formSubmission.delete({ where: { id } });
    return successResponse({ message: "Deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
