import AdminLayout from "@/components/admin/AdminLayout";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface ChangelogSection {
  type: string;
  items: string[];
}

interface ChangelogEntry {
  id: string;
  date: string;
  label: string;
  isUnreleased: boolean;
  sections: ChangelogSection[];
}

const SECTION_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  added:     { bg: "#dcfce7", text: "#15803d", dot: "#22c55e" },
  features:  { bg: "#dcfce7", text: "#15803d", dot: "#22c55e" },
  fixed:     { bg: "#dbeafe", text: "#1d4ed8", dot: "#3b82f6" },
  "bug fixes": { bg: "#dbeafe", text: "#1d4ed8", dot: "#3b82f6" },
  changed:   { bg: "#fef9c3", text: "#a16207", dot: "#eab308" },
  breaking:  { bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444" },
  removed:   { bg: "#f3f4f6", text: "#374151", dot: "#6b7280" },
};

function getColor(type: string) {
  return SECTION_COLORS[type.toLowerCase()] ?? { bg: "#f3f4f6", text: "#374151", dot: "#9ca3af" };
}

function parseMarkdown(md: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const lines = md.split("\n");

  let current: ChangelogEntry | null = null;
  let currentSection: ChangelogSection | null = null;
  let entryIndex = 0;

  for (const line of lines) {
    // Top-level entry: ## [2026-03-31] Session  OR  ## v1.2.3 (2026-01-15)
    if (line.startsWith("## ")) {
      if (current) entries.push(current);
      const text = line.slice(3).trim();
      const isUnreleased = text.toLowerCase().includes("unreleased");
      // Extract date — look for [YYYY-MM-DD] or (YYYY-MM-DD)
      const dateMatch = text.match(/[\[(](\d{4}-\d{2}-\d{2})[\])]/) ??
                        text.match(/(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch?.[1] ?? "";
      // Extract label (version or session name)
      const label = text
        .replace(/[\[(]\d{4}-\d{2}-\d{2}[\])]/, "")
        .replace(/[\[(].*?[\])]/, "")
        .replace(/^v[\d.]+/, (v) => v)
        .trim();
      current = { id: `entry-${entryIndex++}`, date, label, isUnreleased, sections: [] };
      currentSection = null;
      continue;
    }

    // Sub-section: ### Added  /  ### Fixed  etc.
    if (line.startsWith("### ") && current) {
      currentSection = { type: line.slice(4).trim(), items: [] };
      current.sections.push(currentSection);
      continue;
    }

    // List item
    if (line.startsWith("- ") && currentSection) {
      currentSection.items.push(line.slice(2).trim());
    }
  }

  if (current) entries.push(current);
  return entries;
}

function renderItem(raw: string): React.ReactNode {
  // Bold **text**
  const parts = raw.split(/\*\*([^*]+)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1 ? <strong key={i}>{p}</strong> : p
  );
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function ChangelogPage() {
  let content = "";

  // Try docs/CHANGELOG.md first, then root CHANGELOG.md
  const paths = [
    path.join(process.cwd(), "docs", "CHANGELOG.md"),
    path.join(process.cwd(), "CHANGELOG.md"),
  ];
  for (const p of paths) {
    if (existsSync(p)) { content = await readFile(p, "utf-8"); break; }
  }

  // Fallback: generate from cms-version.json
  if (!content) {
    try {
      const versionPath = path.join(process.cwd(), "public", "cms-version.json");
      if (existsSync(versionPath)) {
        const ver = JSON.parse(await readFile(versionPath, "utf-8"));
        content = `# Changelog\n\n## v${ver.version} (${ver.date})\n\n`;
        if (ver.changelog?.features?.length)
          content += "### Added\n" + ver.changelog.features.map((f: string) => `- ${f}`).join("\n") + "\n\n";
        if (ver.changelog?.bugfixes?.length)
          content += "### Fixed\n" + ver.changelog.bugfixes.map((f: string) => `- ${f}`).join("\n") + "\n\n";
        if (ver.changelog?.breaking?.length)
          content += "### Breaking\n" + ver.changelog.breaking.map((f: unknown) =>
            `- ${typeof f === "string" ? f : (f as { message: string }).message}`
          ).join("\n") + "\n\n";
      }
    } catch { /* ignore */ }
  }

  const entries = content ? parseMarkdown(content) : [];

  return (
    <AdminLayout title="Changelog" subtitle="Version history and release notes">
      <div style={{ maxWidth: 860 }}>

        {entries.length === 0 && (
          <div className="text-center py-5 text-muted">
            <p style={{ fontSize: 13 }}>No changelog found. Add entries to <code>docs/CHANGELOG.md</code>.</p>
          </div>
        )}

        {entries.map((entry, ei) => (
          <div
            key={entry.id}
            style={{
              display: "flex",
              gap: 24,
              marginBottom: ei < entries.length - 1 ? 0 : 0,
              position: "relative",
            }}
          >
            {/* Timeline spine */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0, paddingTop: 6 }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: entry.isUnreleased ? "#f59e0b" : "#6366f1",
                border: "2px solid #fff",
                boxShadow: `0 0 0 2px ${entry.isUnreleased ? "#fde68a" : "#c7d2fe"}`,
                flexShrink: 0,
                zIndex: 1,
              }} />
              {ei < entries.length - 1 && (
                <div style={{ width: 2, flex: 1, backgroundColor: "#e5e7eb", marginTop: 6, minHeight: 24 }} />
              )}
            </div>

            {/* Entry card */}
            <div style={{ flex: 1, paddingBottom: 32 }}>
              {/* Entry header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div>
                  {entry.isUnreleased ? (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      backgroundColor: "#fef9c3", color: "#a16207",
                      borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em",
                      border: "1px solid #fde68a", marginBottom: 4,
                    }}>
                      UNRELEASED
                    </span>
                  ) : entry.label && entry.label !== "Session" ? (
                    <span style={{
                      display: "inline-block",
                      backgroundColor: "#ede9fe", color: "#5b21b6",
                      borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600,
                      border: "1px solid #c4b5fd", marginBottom: 4,
                    }}>
                      {entry.label}
                    </span>
                  ) : null}
                  {entry.date && (
                    <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                      {formatDate(entry.date)}
                    </div>
                  )}
                </div>
                {!entry.isUnreleased && entry.sections.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {entry.sections.map((s) => {
                      const c = getColor(s.type);
                      return (
                        <span
                          key={s.type}
                          style={{
                            fontSize: 11, fontWeight: 600, padding: "1px 8px",
                            borderRadius: 999, backgroundColor: c.bg, color: c.text,
                            border: `1px solid ${c.dot}44`,
                          }}
                        >
                          {s.type} ({s.items.length})
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sections */}
              {entry.sections.map((section) => {
                if (!section.items.length) return null;
                const c = getColor(section.type);
                return (
                  <div
                    key={section.type}
                    style={{
                      marginBottom: 10,
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    {/* Section header */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 14px",
                      backgroundColor: c.bg,
                      borderBottom: "1px solid #e5e7eb",
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: c.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: c.text, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {section.type}
                      </span>
                    </div>
                    {/* Items */}
                    <div style={{ padding: "8px 14px", backgroundColor: "#fff" }}>
                      {section.items.map((item, ii) => (
                        <div
                          key={ii}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                            padding: "5px 0",
                            borderBottom: ii < section.items.length - 1 ? "1px solid #f3f4f6" : "none",
                            fontSize: 13,
                            color: "#374151",
                            lineHeight: 1.5,
                          }}
                        >
                          <span style={{ color: c.dot, fontSize: 16, marginTop: -1, flexShrink: 0, fontWeight: 700 }}>·</span>
                          <span>{renderItem(item)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {entry.sections.length === 0 && !entry.isUnreleased && (
                <p style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>No details recorded.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
