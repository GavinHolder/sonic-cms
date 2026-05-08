import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import { join, extname, resolve, sep } from "path";
import { Readable } from "stream";

const UPLOAD_DIR = resolve(process.cwd(), "public", "images", "uploads");

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

  // Resolve to absolute path and verify it stays within UPLOAD_DIR
  const filePath = resolve(join(UPLOAD_DIR, ...segments));
  if (!filePath.startsWith(UPLOAD_DIR + sep) && filePath !== UPLOAD_DIR) {
    return new NextResponse(null, { status: 404 });
  }

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
