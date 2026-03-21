import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import { join, extname } from "path";
import { Readable } from "stream";

/**
 * Serve user-uploaded files from public/uploads/.
 * Next.js standalone mode does not serve runtime-added files from public/ —
 * only files present at build time are available as static assets.
 * This route handler reads the file from disk at request time.
 */

const MIME: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
  ".mp4":  "video/mp4",
  ".webm": "video/webm",
  ".pdf":  "application/pdf",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const filePath = join(process.cwd(), "public", "uploads", ...segments);

  if (!existsSync(filePath)) {
    return new NextResponse(null, { status: 404 });
  }

  const stat = statSync(filePath);
  if (!stat.isFile()) {
    return new NextResponse(null, { status: 404 });
  }

  const ext = extname(segments[segments.length - 1]).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";

  const readable = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

  return new NextResponse(readable, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
