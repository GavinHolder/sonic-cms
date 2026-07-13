/**
 * GET /api/media/files - List files in public/images/uploads/ and public/uploads/
 * DELETE /api/media/files?name=filename - Delete a file from disk
 *
 * This is a filesystem-only route (no database).
 * Used by the Media Library admin page and MediaPickerModal.
 */

import { NextRequest, NextResponse } from "next/server";
import { readdir, stat, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { requireRole } from "@/lib/api-middleware";

const UPLOAD_DIRS = [
  { dir: join(process.cwd(), "public", "images", "uploads"), urlPrefix: "/images/uploads", excludePrefix: null },
  // Exclude thumb-* files from the /uploads dir — those are auto-generated thumbnails
  // created by the DB-backed upload route and should not appear as standalone library items.
  { dir: join(process.cwd(), "public", "uploads"), urlPrefix: "/uploads", excludePrefix: "thumb-" },
];

// Allowed extensions for serving
const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg", "avif",
  "mp4", "webm", "mov",
  "pdf",
]);

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  pdf: "application/pdf",
};

function isSafeFilename(name: string): boolean {
  // Reject path traversal attempts and hidden files
  if (name.includes("..") || name.includes("/") || name.includes("\\")) return false;
  if (name.startsWith(".")) return false;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXTENSIONS.has(ext);
}

// ============================================
// GET /api/media/files
// ============================================

export async function GET(request: NextRequest) {
  try {
    const user = requireRole(request, "VIEWER");
    if (user instanceof Response) return user;

    const allFiles: Array<{
      name: string;
      url: string;
      size: number;
      type: string;
      modifiedAt: string;
    }> = [];

    for (const { dir, urlPrefix, excludePrefix } of UPLOAD_DIRS) {
      if (!existsSync(dir)) continue;

      const entries = await readdir(dir);
      const files = await Promise.all(
        entries.map(async (name) => {
          try {
            // Skip thumbnail files (internal, not user-facing)
            if (excludePrefix && name.startsWith(excludePrefix)) return null;

            const filePath = join(dir, name);
            const info = await stat(filePath);
            if (!info.isFile()) return null;

            const ext = name.split(".").pop()?.toLowerCase() ?? "";
            if (!ALLOWED_EXTENSIONS.has(ext)) return null;

            return {
              name,
              url: `${urlPrefix}/${name}`,
              size: info.size,
              type: MIME_MAP[ext] ?? "application/octet-stream",
              modifiedAt: info.mtime.toISOString(),
            };
          } catch {
            return null;
          }
        })
      );

      for (const f of files) {
        if (f) allFiles.push(f);
      }
    }

    allFiles.sort(
      (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    );

    return NextResponse.json({ files: allFiles });
  } catch (error) {
    console.error("Media list error:", error);
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
  }
}

// ============================================
// DELETE /api/media/files?name=filename
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }

    if (!isSafeFilename(name)) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
    }

    const { resolve } = await import("path");

    // Search both upload directories for the file
    for (const { dir } of UPLOAD_DIRS) {
      const filePath = join(dir, name);
      if (!existsSync(filePath)) continue;

      // Verify the resolved path is still inside the upload dir (defense in depth)
      const resolved = resolve(filePath);
      const dirResolved = resolve(dir);
      if (!resolved.startsWith(dirResolved)) {
        return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
      }

      await unlink(filePath);
      return NextResponse.json({ success: true, deleted: name });
    }

    return NextResponse.json({ error: "File not found" }, { status: 404 });
  } catch (error) {
    console.error("Media delete error:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
