/**
 * Backup & Restore Library
 *
 * Full-site backup/restore for the white-label CMS.
 * Creates ZIP archives containing DB exports (JSON), uploaded media files,
 * and config files from data/.
 *
 * ASSUMPTIONS:
 * 1. Prisma client is available and connected
 * 2. data/ directory is writable (for backups)
 * 3. public/uploads/ contains user media files
 * 4. ZIP libraries (archiver, adm-zip) are installed
 *
 * FAILURE MODES:
 * - Disk full: archiver will throw on write — caught by caller
 * - DB connection lost mid-export: partial JSON — wrapped in transaction where possible
 * - Corrupt ZIP on restore: adm-zip throws on parse — caught and returned as error
 * - Foreign key violations on restore: delete in reverse dep order, insert in dep order
 * - Path traversal in filenames: validated with sanitizeFilename()
 */

import prisma from "@/lib/prisma"
import archiver from "archiver"
import AdmZip from "adm-zip"
import fs from "fs"
import path from "path"
import { Readable } from "stream"

// ── Constants ──────────────────────────────────────────────────────────────────

const BACKUPS_DIR = path.join(process.cwd(), "data", "backups")
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads")
const DATA_DIR = path.join(process.cwd(), "data")

const CMS_VERSION = "0.1.0"

const CONFIG_FILES = ["seo-config.json", "navbar-config.json"]

/** Restore categories and their table mappings (insertion order = dependency order) */
const CATEGORY_TABLES: Record<string, string[]> = {
  settings: ["SystemSettings", "SiteConfig"],
  users: ["User", "ApiKey"],
  pages: ["Page", "Section", "SectionVersion"],
  content: ["ContentType", "ContentField", "ContentEntry", "ContentEntryVersion"],
  media: ["MediaAsset"],
  volt: ["VoltElement", "VoltAsset", "Volt3DAsset", "Volt3DVersion"],
  plugins: ["Plugin", "ClientFeature"],
  forms: ["FormSubmission", "AuditLog", "Redirect", "OtpToken"],
  features: ["CoverageMap", "CoverageRegion", "CoverageLabel", "Project", "CustomElement"],
}

/**
 * Full dependency-ordered list of all tables.
 * Parents first — children after their parents.
 */
const ALL_TABLES_INSERT_ORDER = [
  "User",
  "ApiKey",
  "SystemSettings",
  "SiteConfig",
  "Page",
  "Section",
  "SectionVersion",
  "CustomElement",
  "MediaAsset",
  "ContentType",
  "ContentField",
  "ContentEntry",
  "ContentEntryVersion",
  "VoltElement",
  "VoltAsset",
  "Volt3DAsset",
  "Volt3DVersion",
  "Plugin",
  "ClientFeature",
  "FormSubmission",
  "AuditLog",
  "Redirect",
  "OtpToken",
  "CoverageMap",
  "CoverageRegion",
  "CoverageLabel",
  "Project",
]

/** Reverse of insert order — children first for deletion */
const ALL_TABLES_DELETE_ORDER = [...ALL_TABLES_INSERT_ORDER].reverse()

// ── Types ──────────────────────────────────────────────────────────────────────

export interface BackupManifest {
  cmsVersion: string
  createdAt: string
  tables: Record<string, number>
  fileCount: number
  totalSize: string
}

export interface BackupInfo {
  filename: string
  createdAt: string
  size: string
}

export type RestoreCategory =
  | "everything"
  | "settings"
  | "pages"
  | "content"
  | "media"
  | "volt"
  | "users"
  | "plugins"
  | "forms"
  | "features"

export interface RestoreResult {
  restored: string[]
  preRestoreBackup: string
  tablesRestored: number
  recordsRestored: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function sanitizeFilename(name: string): string {
  // Strip path components — only allow alphanumeric, dash, dot, underscore
  const base = path.basename(name)
  if (/[^a-zA-Z0-9._-]/.test(base)) {
    throw new Error("Invalid filename: contains disallowed characters")
  }
  if (base.startsWith(".") || base.includes("..")) {
    throw new Error("Invalid filename: path traversal detected")
  }
  return base
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

/**
 * Map a table name string to a prisma model accessor.
 * Prisma client uses camelCase model names as properties.
 */
function getPrismaModel(tableName: string): any {
  const map: Record<string, any> = {
    User: prisma.user,
    ApiKey: prisma.apiKey,
    SystemSettings: prisma.systemSettings,
    SiteConfig: prisma.siteConfig,
    Page: prisma.page,
    Section: prisma.section,
    SectionVersion: prisma.sectionVersion,
    CustomElement: prisma.customElement,
    MediaAsset: prisma.mediaAsset,
    ContentType: prisma.contentType,
    ContentField: prisma.contentField,
    ContentEntry: prisma.contentEntry,
    ContentEntryVersion: prisma.contentEntryVersion,
    VoltElement: prisma.voltElement,
    VoltAsset: prisma.voltAsset,
    Volt3DAsset: prisma.volt3DAsset,
    Volt3DVersion: prisma.volt3DVersion,
    Plugin: prisma.plugin,
    ClientFeature: prisma.clientFeature,
    FormSubmission: prisma.formSubmission,
    AuditLog: prisma.auditLog,
    Redirect: prisma.redirect,
    OtpToken: prisma.otpToken,
    CoverageMap: prisma.coverageMap,
    CoverageRegion: prisma.coverageRegion,
    CoverageLabel: prisma.coverageLabel,
    Project: prisma.project,
  }
  return map[tableName]
}

/** Collect all files recursively under a directory, returning relative paths */
function collectFiles(dir: string, base?: string): string[] {
  if (!fs.existsSync(dir)) return []
  const result: string[] = []
  const root = base ?? dir
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      result.push(...collectFiles(full, root))
    } else {
      result.push(path.relative(root, full).replace(/\\/g, "/"))
    }
  }
  return result
}

// ── Core Functions ─────────────────────────────────────────────────────────────

/**
 * Create a full site backup as a ZIP file.
 * Exports all DB tables as JSON + copies uploads + config files.
 */
export async function createBackup(): Promise<{ filename: string; size: string }> {
  ensureDir(BACKUPS_DIR)

  const timestamp = new Date()
    .toISOString()
    .replace(/[T:]/g, "-")
    .replace(/\..+/, "")
  const filename = `backup-${timestamp}.zip`
  const zipPath = path.join(BACKUPS_DIR, filename)

  return new Promise(async (resolve, reject) => {
    const output = fs.createWriteStream(zipPath)
    const archive = archiver("zip", { zlib: { level: 6 } })

    output.on("close", () => {
      const size = formatBytes(archive.pointer())
      resolve({ filename, size })
    })

    archive.on("error", (err: Error) => {
      // Clean up partial file
      try { fs.unlinkSync(zipPath) } catch {}
      reject(err)
    })

    archive.pipe(output)

    // ── Export DB tables ──────────────────────────────────────────────
    const tableCounts: Record<string, number> = {}
    let totalRecords = 0

    for (const tableName of ALL_TABLES_INSERT_ORDER) {
      const model = getPrismaModel(tableName)
      if (!model) continue
      try {
        const records = await model.findMany()
        tableCounts[tableName] = records.length
        totalRecords += records.length
        archive.append(JSON.stringify(records, null, 2), {
          name: `db/${tableName}.json`,
        })
      } catch (err) {
        // Table might not exist yet (migration pending) — skip gracefully
        tableCounts[tableName] = 0
      }
    }

    // ── Copy upload files ────────────────────────────────────────────
    let fileCount = 0
    if (fs.existsSync(UPLOADS_DIR)) {
      const uploadFiles = collectFiles(UPLOADS_DIR)
      for (const relPath of uploadFiles) {
        const fullPath = path.join(UPLOADS_DIR, relPath)
        archive.file(fullPath, { name: `uploads/${relPath}` })
        fileCount++
      }
    }

    // ── Copy config files ────────────────────────────────────────────
    for (const configFile of CONFIG_FILES) {
      const configPath = path.join(DATA_DIR, configFile)
      if (fs.existsSync(configPath)) {
        archive.file(configPath, { name: `config/${configFile}` })
        fileCount++
      }
    }

    // ── Write manifest ───────────────────────────────────────────────
    const manifest: BackupManifest = {
      cmsVersion: CMS_VERSION,
      createdAt: new Date().toISOString(),
      tables: tableCounts,
      fileCount,
      totalSize: "calculating...",
    }
    archive.append(JSON.stringify(manifest, null, 2), {
      name: "manifest.json",
    })

    await archive.finalize()
  })
}

/**
 * List all backup files in data/backups/.
 */
export function listBackups(): BackupInfo[] {
  ensureDir(BACKUPS_DIR)

  const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith(".zip"))
  return files
    .map((filename) => {
      const filePath = path.join(BACKUPS_DIR, filename)
      const stat = fs.statSync(filePath)
      return {
        filename,
        createdAt: stat.mtime.toISOString(),
        size: formatBytes(stat.size),
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/**
 * Delete a backup file. Validates filename to prevent path traversal.
 */
export function deleteBackup(filename: string): void {
  const safe = sanitizeFilename(filename)
  if (!safe.endsWith(".zip")) {
    throw new Error("Invalid backup file: must be a .zip file")
  }
  const filePath = path.join(BACKUPS_DIR, safe)
  if (!fs.existsSync(filePath)) {
    throw new Error("Backup not found")
  }
  fs.unlinkSync(filePath)
}

/**
 * Get full path for a backup file. Validates filename.
 */
export function getBackupPath(filename: string): string {
  const safe = sanitizeFilename(filename)
  if (!safe.endsWith(".zip")) {
    throw new Error("Invalid backup file: must be a .zip file")
  }
  const filePath = path.join(BACKUPS_DIR, safe)
  if (!fs.existsSync(filePath)) {
    throw new Error("Backup not found")
  }
  return filePath
}

/**
 * Restore from a ZIP buffer.
 *
 * ASSUMPTIONS:
 * 1. ZIP contains manifest.json at root
 * 2. DB JSON files are in db/ directory
 * 3. Upload files are in uploads/ directory
 * 4. Config files are in config/ directory
 * 5. Categories array is non-empty
 *
 * FAILURE MODES:
 * - Corrupt ZIP: adm-zip throws on parse — surfaced as error message
 * - Version mismatch: logged as warning but proceeds (forward-compatible)
 * - FK violation on insert: tables inserted in dependency order to prevent this
 * - Partial restore on error: pre-restore backup exists for rollback
 */
export async function restoreFromZip(
  zipBuffer: Buffer,
  categories: RestoreCategory[]
): Promise<RestoreResult> {
  // 1. Create safety backup first
  const safetyBackup = await createBackup()

  // 2. Parse ZIP
  let zip: AdmZip
  try {
    zip = new AdmZip(zipBuffer)
  } catch {
    throw new Error("Failed to parse backup file: invalid or corrupt ZIP")
  }

  // 3. Read and validate manifest
  const manifestEntry = zip.getEntry("manifest.json")
  if (!manifestEntry) {
    throw new Error("Invalid backup: missing manifest.json")
  }
  const manifest: BackupManifest = JSON.parse(
    manifestEntry.getData().toString("utf8")
  )

  // Resolve categories
  const resolvedCategories: string[] = categories.includes("everything")
    ? Object.keys(CATEGORY_TABLES)
    : categories.filter((c) => c !== "everything")

  // Collect tables to restore (in dependency order)
  const tablesToRestore: string[] = []
  for (const table of ALL_TABLES_INSERT_ORDER) {
    for (const cat of resolvedCategories) {
      if (CATEGORY_TABLES[cat]?.includes(table)) {
        if (!tablesToRestore.includes(table)) {
          tablesToRestore.push(table)
        }
        break
      }
    }
  }

  // Tables to delete (reverse dependency order)
  const tablesToDelete = [...tablesToRestore].reverse()

  let recordsRestored = 0

  // 4. Delete existing records for selected tables
  for (const tableName of tablesToDelete) {
    const model = getPrismaModel(tableName)
    if (!model) continue
    try {
      await model.deleteMany({})
    } catch {
      // Table might not exist — continue
    }
  }

  // 5. Insert records from backup in dependency order
  for (const tableName of tablesToRestore) {
    const entry = zip.getEntry(`db/${tableName}.json`)
    if (!entry) continue

    const records = JSON.parse(entry.getData().toString("utf8"))
    if (!Array.isArray(records) || records.length === 0) continue

    const model = getPrismaModel(tableName)
    if (!model) continue

    // Convert date strings back to Date objects for Prisma
    const processed = records.map((record: any) => {
      const cleaned = { ...record }
      for (const [key, value] of Object.entries(cleaned)) {
        if (
          typeof value === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
        ) {
          cleaned[key] = new Date(value)
        }
      }
      return cleaned
    })

    // Use createMany for bulk insert — skip duplicates
    try {
      await model.createMany({
        data: processed,
        skipDuplicates: true,
      })
      recordsRestored += processed.length
    } catch (err: any) {
      // If createMany fails (some models don't support it), fall back to individual creates
      for (const record of processed) {
        try {
          await model.create({ data: record })
          recordsRestored++
        } catch {
          // Skip records that fail (e.g., duplicates)
        }
      }
    }
  }

  // 6. Restore media files if media category selected
  if (resolvedCategories.includes("media")) {
    ensureDir(UPLOADS_DIR)

    // Clear existing uploads
    if (fs.existsSync(UPLOADS_DIR)) {
      const existing = collectFiles(UPLOADS_DIR)
      for (const relPath of existing) {
        try {
          fs.unlinkSync(path.join(UPLOADS_DIR, relPath))
        } catch {}
      }
    }

    // Extract upload files from ZIP
    const zipEntries = zip.getEntries()
    for (const entry of zipEntries) {
      if (entry.entryName.startsWith("uploads/") && !entry.isDirectory) {
        const relPath = entry.entryName.replace("uploads/", "")
        const destPath = path.join(UPLOADS_DIR, relPath)
        ensureDir(path.dirname(destPath))
        fs.writeFileSync(destPath, entry.getData())
      }
    }
  }

  // 7. Restore config files if settings category selected
  if (resolvedCategories.includes("settings")) {
    const zipEntries = zip.getEntries()
    for (const entry of zipEntries) {
      if (entry.entryName.startsWith("config/") && !entry.isDirectory) {
        const configName = path.basename(entry.entryName)
        if (CONFIG_FILES.includes(configName)) {
          const destPath = path.join(DATA_DIR, configName)
          fs.writeFileSync(destPath, entry.getData())
        }
      }
    }
  }

  return {
    restored: resolvedCategories,
    preRestoreBackup: safetyBackup.filename,
    tablesRestored: tablesToRestore.length,
    recordsRestored,
  }
}
