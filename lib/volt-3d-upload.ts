/**
 * Volt 3D Upload Utilities
 *
 * File system helpers for saving and deleting GLB/Blender files
 * uploaded via the Volt 3D Blender sync pipeline.
 */

import path from "path"
import fs from "fs/promises"
import { existsSync } from "fs"

export const VOLT_3D_DIR = path.join(process.cwd(), "public", "uploads", "volt-3d")

/**
 * Save an uploaded binary buffer to the volt-3d upload directory.
 *
 * @param buffer - Raw file bytes
 * @param filename - Target filename (e.g. "cma1b2c3_v1.glb")
 * @returns Public URL path (e.g. "/uploads/volt-3d/cma1b2c3_v1.glb")
 */
export async function saveUploadedFile(buffer: Buffer, filename: string): Promise<string> {
  await fs.mkdir(VOLT_3D_DIR, { recursive: true })
  await fs.writeFile(path.join(VOLT_3D_DIR, filename), buffer)
  return `/uploads/volt-3d/${filename}`
}

/**
 * Delete an uploaded file by its public URL path.
 * Silently ignores missing files or paths outside the volt-3d upload directory.
 *
 * @param urlPath - Public path (e.g. "/uploads/volt-3d/cma1b2c3_v1.glb")
 */
export async function deleteUploadedFile(urlPath: string): Promise<void> {
  try {
    const abs = path.resolve(path.join(process.cwd(), "public", urlPath))
    const safeDir = path.resolve(path.join(process.cwd(), "public", "uploads", "volt-3d"))
    if (!abs.startsWith(safeDir)) return // path traversal guard
    if (existsSync(abs)) await fs.unlink(abs)
  } catch {
    // Ignore — file may already be deleted or path invalid
  }
}
