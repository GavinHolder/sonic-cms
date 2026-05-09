/**
 * POST /api/media/upload - Upload media file
 *
 * Handles image and video uploads with Sharp image processing
 */

import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import sharp from "sharp";
import prisma from "@/lib/prisma";
import {
  requireRole,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-middleware";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";
const MAX_IMAGE_SIZE = parseInt(process.env.MAX_IMAGE_SIZE || "10485760");   // 10MB images
const MAX_VIDEO_SIZE = parseInt(process.env.MAX_VIDEO_SIZE || "209715200");  // 200MB videos
const MEDIA_URL = process.env.MEDIA_URL || "/uploads";

// Allowed mime types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
];

export async function POST(request: NextRequest) {
  try {
    // Require EDITOR role
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const altText = formData.get("altText") as string;
    const caption = formData.get("caption") as string;
    const tags = formData.get("tags") as string; // Comma-separated

    if (!file) {
      return errorResponse("NO_FILE", "No file provided", 400, "file");
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse(
        "INVALID_FILE_TYPE",
        `File type ${file.type} not allowed. Allowed types: ${ALLOWED_TYPES.join(", ")}`,
        400,
        "file"
      );
    }

    // Validate file size — separate limits for images and videos
    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return errorResponse(
        "FILE_TOO_LARGE",
        `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. ` +
          `${isVideo ? "Videos" : "Images"} must be under ${maxSize / 1024 / 1024} MB.`,
        400,
        "file"
      );
    }

    // Create upload directory if it doesn't exist
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.name);
    const filename = `${timestamp}-${randomString}${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    let width: number | null = null;
    let height: number | null = null;
    let thumbnailUrl: string | null = null;

    // Process images with Sharp
    if (file.type.startsWith("image/")) {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      width = metadata.width || null;
      height = metadata.height || null;

      // Save original image
      await image.toFile(filePath);

      // Generate thumbnail (max 300px width)
      if (width && width > 300) {
        const thumbnailFilename = `thumb-${filename}`;
        const thumbnailPath = path.join(UPLOAD_DIR, thumbnailFilename);

        await sharp(buffer)
          .resize(300, null, {
            withoutEnlargement: true,
            fit: "inside",
          })
          .toFile(thumbnailPath);

        thumbnailUrl = `${MEDIA_URL}/${thumbnailFilename}`;
      }
    } else {
      // For videos, just save the file
      await writeFile(filePath, buffer);
    }

    // Parse tags
    const tagArray = tags
      ? tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0)
      : [];

    const fileUrl = `${MEDIA_URL}/${filename}`;

    // Attempt to create a media asset record — non-fatal if it fails
    // (file is already saved; DB record is optional for tracking purposes)
    let mediaAsset = null;
    try {
      mediaAsset = await prisma.mediaAsset.create({
        data: {
          filename,
          originalName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          width,
          height,
          url: fileUrl,
          thumbnailUrl,
          altText: altText || null,
          caption: caption || null,
          tags: tagArray,
          uploadedBy: user.userId,
        },
        include: {
          uploadedByUser: { select: { username: true } },
        },
      });
    } catch {
      // DB record creation failed — file is still accessible via URL
    }

    return successResponse(
      {
        media: {
          id: mediaAsset?.id ?? null,
          filename,
          originalName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          width,
          height,
          url: fileUrl,
          thumbnailUrl,
          altText: altText || null,
          caption: caption || null,
          tags: tagArray,
          uploadedBy: mediaAsset?.uploadedByUser?.username ?? user.username,
          createdAt: mediaAsset?.createdAt ?? new Date(),
        },
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
