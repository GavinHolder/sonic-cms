"use client";

import { useState } from "react";
import { SECTION_TEMPLATES, TEMPLATE_CATEGORIES, type SectionTemplate } from "@/lib/section-templates";

interface Props {
  onSelect: (template: SectionTemplate) => void;
  onBlank: () => void;
  onClose: () => void;
}

export default function SectionTemplateGallery({ onSelect, onBlank, onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = SECTION_TEMPLATES.filter(t => {
    if (activeCategory !== "all" && t.category !== activeCategory) return false;
    if (search) {
      const s = search.toLowerCase();
      return t.name.toLowerCase().includes(s) || t.description.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: 16, width: 800, maxWidth: "95vw",
        maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
          <i className="bi bi-grid-1x2" style={{ color: "var(--cms-primary, #2563eb)", fontSize: 20 }} />
          <div style={{ flex: 1 }}>
            <h5 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Choose a Template</h5>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Start with a pre-built design or begin from scratch</p>
          </div>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 180 }}
          />
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Categories */}
        <div style={{ padding: "8px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", gap: 4, overflowX: "auto" }}>
          <button
            className={`btn btn-sm ${activeCategory === "all" ? "btn-primary" : "btn-outline-secondary"}`}
            style={{ fontSize: 11, whiteSpace: "nowrap" }}
            onClick={() => setActiveCategory("all")}
          >
            All
          </button>
          {TEMPLATE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`btn btn-sm ${activeCategory === cat.id ? "btn-primary" : "btn-outline-secondary"}`}
              style={{ fontSize: 11, whiteSpace: "nowrap" }}
              onClick={() => setActiveCategory(cat.id)}
            >
              <i className={`bi ${cat.icon} me-1`} />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {/* Blank option always first */}
            <div
              onClick={onBlank}
              style={{
                border: "2px dashed #dee2e6", borderRadius: 12, padding: 20,
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 8, cursor: "pointer", minHeight: 140,
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--cms-primary, #2563eb)"; e.currentTarget.style.background = "#f0f7ff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#dee2e6"; e.currentTarget.style.background = ""; }}
            >
              <i className="bi bi-plus-circle" style={{ fontSize: 28, color: "#94a3b8" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Blank Section</span>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>Start from scratch</span>
            </div>

            {/* Templates */}
            {filtered.map(template => (
              <div
                key={template.id}
                onClick={() => onSelect(template)}
                style={{
                  border: "1px solid #e2e8f0", borderRadius: 12, padding: 16,
                  display: "flex", flexDirection: "column", gap: 6, cursor: "pointer",
                  minHeight: 140, transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--cms-primary, #2563eb)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ fontSize: 32, textAlign: "center", padding: "8px 0" }}>{template.thumbnail}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{template.name}</div>
                <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.3 }}>{template.description}</div>
                <div style={{ marginTop: "auto" }}>
                  <span className="badge" style={{ background: "#f1f5f9", color: "#64748b", fontSize: 9 }}>
                    {template.sectionType}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
              <i className="bi bi-search" style={{ fontSize: 32 }} />
              <p style={{ marginTop: 8 }}>No templates matching &quot;{search}&quot;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
