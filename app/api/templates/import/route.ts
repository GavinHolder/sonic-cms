import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { analyzeHtml, processZip } from "@/lib/template-import-utils";

export async function POST(req: NextRequest) {
  const auth = requireRole(req, "EDITOR");
  if (auth instanceof NextResponse) return auth;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const filename = file.name.toLowerCase();

  if (filename.endsWith(".html") || filename.endsWith(".htm")) {
    const html = await file.text();
    const { needsAttention } = analyzeHtml(html);
    return NextResponse.json({
      success: true,
      data: { html, css: "", mediaSlots: {}, analysis: { autoHandled: [], needsAttention } },
    });
  }

  if (filename.endsWith(".zip")) {
    return processZip(await file.arrayBuffer());
  }

  return NextResponse.json({ error: "Only .html and .zip files are supported" }, { status: 400 });
}
