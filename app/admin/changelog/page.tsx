import AdminLayout from "@/components/admin/AdminLayout";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Changelog page — renders CHANGELOG.md as HTML.
 * Safe: content is server-generated from a local file, never user input.
 */
export default async function ChangelogPage() {
  let content = "";
  const filePath = path.join(process.cwd(), "CHANGELOG.md");

  if (existsSync(filePath)) {
    content = await readFile(filePath, "utf-8");
  }

  // Fallback: generate from cms-version.json if no CHANGELOG.md
  if (!content) {
    try {
      const versionPath = path.join(process.cwd(), "public", "cms-version.json");
      if (existsSync(versionPath)) {
        const ver = JSON.parse(await readFile(versionPath, "utf-8"));
        content = `# Changelog\n\n## v${ver.version} (${ver.date})\n\n`;
        if (ver.changelog?.features?.length) {
          content += "### Features\n" + ver.changelog.features.map((f: string) => `- ${f}`).join("\n") + "\n\n";
        }
        if (ver.changelog?.bugfixes?.length) {
          content += "### Bug Fixes\n" + ver.changelog.bugfixes.map((f: string) => `- ${f}`).join("\n") + "\n\n";
        }
        if (ver.changelog?.breaking?.length) {
          content += "### Breaking Changes\n" + ver.changelog.breaking.map((f: unknown) => `- ${typeof f === "string" ? f : (f as { message: string }).message}`).join("\n") + "\n\n";
        }
      }
    } catch { /* ignore */ }
  }

  if (!content) content = "No changelog available. Run `npm run changelog` to generate from git history.";

  // Simple markdown to HTML (headings, lists, rules, inline code)
  const html = content
    .split("\n")
    .map((line) => {
      if (line.startsWith("### ")) return `<h5 class="mt-3 mb-2 text-primary fw-semibold">${line.slice(4)}</h5>`;
      if (line.startsWith("## ")) {
        const text = line.slice(3);
        const isUnreleased = text.includes("Unreleased");
        return `<h4 class="mt-4 mb-2 pb-1 border-bottom ${isUnreleased ? "text-warning" : ""}"><code>${text.split(" (")[0]}</code>${text.includes("(") ? ` <small class="text-muted fw-normal">${text.split("(")[1]?.replace(")", "")}</small>` : ""}</h4>`;
      }
      if (line.startsWith("# ")) return "";
      if (line.startsWith("- ")) return `<li style="font-size:13px;margin-bottom:2px;">${line.slice(2)}</li>`;
      if (line === "---") return `<hr class="my-2 opacity-10" />`;
      if (line.startsWith("All notable")) return `<p class="text-muted mb-4" style="font-size:13px;">${line}</p>`;
      return line ? `<p style="font-size:13px;">${line}</p>` : "";
    })
    .join("\n");

  return (
    <AdminLayout title="Changelog" subtitle="Version history and recent changes">
      <div style={{ maxWidth: 800 }}>
        <div className="card shadow-sm">
          {/* Safe: html is generated from local CHANGELOG.md file, not user input */}
          <div className="card-body" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </AdminLayout>
  );
}
