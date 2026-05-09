import { NextRequest, NextResponse } from "next/server";
import { mkdir, unlink } from "fs/promises";
import { createWriteStream, existsSync } from "fs";
import { join } from "path";
import sharp from "sharp";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Busboy = require("busboy") as (opts: { headers: Record<string, string> }) => import("stream").Writable & {
  on(event: "file", listener: (fieldname: string, file: import("stream").Readable, info: { filename: string; mimeType: string }) => void): void;
  on(event: "error", listener: (err: Error) => void): void;
  on(event: string, listener: (...args: unknown[]) => void): void;
};
import { Readable } from "stream";
import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/api-middleware";

/**
 * Simple Media Upload API
 *
 * Handles image/video uploads with automatic optimization.
 * Uses busboy streaming to bypass Next.js body size limits — supports
 * videos up to 200 MB without buffering the entire request into memory.
 *
 * Saves to public/images/uploads/
 * Also creates a MediaAsset DB record when the request is authenticated,
 * so the gallery picker and other DB-backed features can find the file.
 */

const UPLOAD_DIR = join(process.cwd(), "public", "images", "uploads");
const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1080;
const WEBP_QUALITY = 85;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;   // 10 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;  // 200 MB

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/** Parse a multipart request with busboy, streaming the first "file" field to disk. */
function parseMultipart(request: NextRequest): Promise<{
  filename: string;
  originalName: string;
  mimeType: string;
  filePath: string;
  size: number;
}> {
  return new Promise((resolve, reject) => {
    const contentType = request.headers.get("content-type") ?? "";
    const bb = Busboy({ headers: { "content-type": contentType } });

    let settled = false;
    const finish = (val: Parameters<typeof resolve>[0] | Error) => {
      if (settled) return;
      settled = true;
      val instanceof Error ? reject(val) : resolve(val);
    };

    bb.on("file", (_fieldname: string, fileStream: import("stream").Readable, info: { filename: string; mimeType: string }) => {
      const { filename, mimeType } = info;
      const isImage = mimeType.startsWith("image/");
      const isVideo = mimeType.startsWith("video/");
      const isPdf   = mimeType === "application/pdf";

      if (!isImage && !isVideo && !isPdf) {
        fileStream.resume(); // drain
        finish(new Error("Only images, videos, and PDFs are allowed."));
        return;
      }

      const timestamp  = Date.now();
      const sanitized  = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const ext        = sanitized.split(".").pop() ?? "bin";
      const base       = sanitized.split(".").slice(0, -1).join(".") || "upload";
      const outName    = `${base}-${timestamp}.${ext}`;
      const filePath   = join(UPLOAD_DIR, outName);
      const writer     = createWriteStream(filePath);

      let size = 0;
      const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      let oversized = false;

      fileStream.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (!oversized && size > maxBytes) {
          oversized = true;
          fileStream.destroy();
          writer.destroy();
          unlink(filePath).catch(() => {});
          const limitMB = maxBytes / 1024 / 1024;
          finish(new Error(
            `File too large: ${(size / 1024 / 1024).toFixed(1)} MB. ` +
            `${isVideo ? "Videos" : "Images"} must be under ${limitMB} MB.`
          ));
        }
      });

      fileStream.pipe(writer);

      writer.on("finish", () => {
        if (!oversized) finish({ filename: outName, originalName: filename, mimeType, filePath, size });
      });

      writer.on("error", (err: Error) => finish(err));
      fileStream.on("error", (err: Error) => finish(err));
    });

    bb.on("error", (err: Error) => finish(err));

    // Feed the request body into busboy using Node.js 17+ Readable.fromWeb()
    const body = request.body;
    if (!body) {
      finish(new Error("No request body"));
      return;
    }

    // Readable.fromWeb is available in Node.js 17+ (project uses Node 22)
    const nodeStream = Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]);
    nodeStream.pipe(bb);
  });
}

export async function POST(request: NextRequest) {
  try {
    await ensureUploadDir();

    const { filename, originalName, mimeType, filePath, size } = await parseMultipart(request);

    const isImage = mimeType.startsWith("image/");
    const isPdf   = mimeType === "application/pdf";
    const timestamp = filename.match(/-(\d+)\./)?.[1] ?? Date.now().toString();
    const base = filename.split("-" + timestamp)[0];

    let finalFilename: string;
    let finalUrl: string;
    let finalMimeType: string;
    let width: number | null = null;
    let height: number | null = null;

    if (isImage) {
      const webpFilename = `${base}-${timestamp}.webp`;
      const webpPath = join(UPLOAD_DIR, webpFilename);

      const info = await sharp(filePath)
        .resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(webpPath);

      width  = info.width  ?? null;
      height = info.height ?? null;

      await unlink(filePath).catch(() => {});

      finalFilename = webpFilename;
      finalUrl      = `/images/uploads/${webpFilename}`;
      finalMimeType = "image/webp";
    } else {
      finalFilename = filename;
      finalUrl      = `/images/uploads/${filename}`;
      finalMimeType = mimeType;
    }

    // Create a MediaAsset DB record when the request is authenticated so
    // DB-backed features (gallery picker, etc.) can find this file.
    const user = authenticate(request);
    if (user) {
      prisma.mediaAsset.create({
        data: {
          filename:     finalFilename,
          originalName: originalName || finalFilename,
          mimeType:     finalMimeType,
          fileSize:     size,
          width,
          height,
          url:          finalUrl,
          uploadedBy:   user.userId,
        },
      }).catch(() => {/* non-fatal */});
    }

    return NextResponse.json({
      success: true,
      url:  finalUrl,
      type: isImage ? "image" : isPdf ? "pdf" : "video",
      ...(isImage ? {} : { size }),
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Upload failed";
    console.error("upload-simple error:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
