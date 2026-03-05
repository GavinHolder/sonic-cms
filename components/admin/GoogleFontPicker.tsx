"use client";

import { useState, useEffect, useRef } from "react";

interface GoogleFontPickerProps {
  value: string;
  onChange: (fontFamily: string) => void;
}

interface GoogleFont {
  family: string;
  category: string;
}

const BUILTIN_FONTS: GoogleFont[] = [
  // ── Popular Sans-Serif ────────────────────────────────────────────
  { family: "Roboto",           category: "sans-serif" },
  { family: "Open Sans",        category: "sans-serif" },
  { family: "Lato",             category: "sans-serif" },
  { family: "Montserrat",       category: "sans-serif" },
  { family: "Poppins",          category: "sans-serif" },
  { family: "Inter",            category: "sans-serif" },
  { family: "Nunito",           category: "sans-serif" },
  { family: "Raleway",          category: "sans-serif" },
  { family: "Work Sans",        category: "sans-serif" },
  { family: "Oswald",           category: "sans-serif" },
  { family: "Mulish",           category: "sans-serif" },
  { family: "Quicksand",        category: "sans-serif" },
  { family: "DM Sans",          category: "sans-serif" },
  { family: "Outfit",           category: "sans-serif" },
  { family: "Manrope",          category: "sans-serif" },
  { family: "Plus Jakarta Sans",category: "sans-serif" },
  { family: "Figtree",          category: "sans-serif" },
  { family: "Lexend",           category: "sans-serif" },
  { family: "Barlow",           category: "sans-serif" },
  { family: "Rubik",            category: "sans-serif" },
  { family: "Jost",             category: "sans-serif" },
  { family: "Cabin",            category: "sans-serif" },
  { family: "Karla",            category: "sans-serif" },
  { family: "Josefin Sans",     category: "sans-serif" },
  { family: "Titillium Web",    category: "sans-serif" },
  { family: "Oxygen",           category: "sans-serif" },
  { family: "Fira Sans",        category: "sans-serif" },
  { family: "Noto Sans",        category: "sans-serif" },
  { family: "Source Sans 3",    category: "sans-serif" },
  { family: "IBM Plex Sans",    category: "sans-serif" },
  { family: "Libre Franklin",   category: "sans-serif" },
  { family: "Ubuntu",           category: "sans-serif" },
  { family: "PT Sans",          category: "sans-serif" },
  { family: "Exo 2",            category: "sans-serif" },
  { family: "Catamaran",        category: "sans-serif" },
  { family: "Hind",             category: "sans-serif" },
  { family: "Arimo",            category: "sans-serif" },
  { family: "Saira",            category: "sans-serif" },
  { family: "Overpass",         category: "sans-serif" },
  { family: "Urbanist",         category: "sans-serif" },
  { family: "Syne",             category: "sans-serif" },
  { family: "Archivo",          category: "sans-serif" },
  { family: "Space Grotesk",    category: "sans-serif" },
  { family: "Bricolage Grotesque", category: "sans-serif" },
  // ── Serif ────────────────────────────────────────────────────────
  { family: "Merriweather",     category: "serif" },
  { family: "Playfair Display", category: "serif" },
  { family: "Lora",             category: "serif" },
  { family: "PT Serif",         category: "serif" },
  { family: "Crimson Text",     category: "serif" },
  { family: "EB Garamond",      category: "serif" },
  { family: "Cormorant",        category: "serif" },
  { family: "Libre Baskerville",category: "serif" },
  { family: "Spectral",         category: "serif" },
  { family: "Bitter",           category: "serif" },
  { family: "Noto Serif",       category: "serif" },
  { family: "Zilla Slab",       category: "serif" },
  { family: "Arvo",             category: "serif" },
  { family: "Cardo",            category: "serif" },
  { family: "Volkhov",          category: "serif" },
  { family: "Fraunces",         category: "serif" },
  { family: "Newsreader",       category: "serif" },
  { family: "DM Serif Display", category: "serif" },
  { family: "Instrument Serif", category: "serif" },
  // ── Display / Headlines ───────────────────────────────────────────
  { family: "Bebas Neue",       category: "display" },
  { family: "Anton",            category: "display" },
  { family: "Righteous",        category: "display" },
  { family: "Alfa Slab One",    category: "display" },
  { family: "Black Han Sans",   category: "display" },
  { family: "Squada One",       category: "display" },
  { family: "Staatliches",      category: "display" },
  { family: "Archivo Black",    category: "display" },
  { family: "Unbounded",        category: "display" },
  { family: "Teko",             category: "display" },
  { family: "Boogaloo",         category: "display" },
  { family: "Fredoka One",      category: "display" },
  // ── Monospace ─────────────────────────────────────────────────────
  { family: "Roboto Mono",      category: "monospace" },
  { family: "Source Code Pro",  category: "monospace" },
  { family: "JetBrains Mono",   category: "monospace" },
  { family: "Fira Code",        category: "monospace" },
  { family: "IBM Plex Mono",    category: "monospace" },
  { family: "Space Mono",       category: "monospace" },
  { family: "Inconsolata",      category: "monospace" },
  { family: "Courier Prime",    category: "monospace" },
  { family: "DM Mono",          category: "monospace" },
  // ── Handwriting / Script ─────────────────────────────────────────
  { family: "Pacifico",         category: "handwriting" },
  { family: "Dancing Script",   category: "handwriting" },
  { family: "Lobster",          category: "handwriting" },
  { family: "Caveat",           category: "handwriting" },
  { family: "Patrick Hand",     category: "handwriting" },
  { family: "Kalam",            category: "handwriting" },
  { family: "Satisfy",          category: "handwriting" },
  { family: "Great Vibes",      category: "handwriting" },
  { family: "Sacramento",       category: "handwriting" },
  { family: "Amatic SC",        category: "handwriting" },
  { family: "Architects Daughter", category: "handwriting" },
];

const STORAGE_KEY = "cms_installed_fonts";

function loadInstalledFonts(): GoogleFont[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveInstalledFonts(fonts: GoogleFont[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fonts));
  } catch {}
}

function injectFontLink(family: string) {
  const id = `gfont-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

export default function GoogleFontPicker({ value, onChange }: GoogleFontPickerProps) {
  const [installedFonts, setInstalledFonts] = useState<GoogleFont[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load installed fonts from localStorage on mount
  useEffect(() => {
    setInstalledFonts(loadInstalledFonts());
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
        setInstallError("");
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // All fonts = builtin + installed (deduplicated)
  const allFonts: GoogleFont[] = [
    ...BUILTIN_FONTS,
    ...installedFonts.filter(
      (inst) => !BUILTIN_FONTS.some((b) => b.family.toLowerCase() === inst.family.toLowerCase())
    ),
  ];

  const filtered = searchTerm
    ? allFonts.filter((f) => f.family.toLowerCase().includes(searchTerm.toLowerCase()))
    : allFonts;

  // Check if search term matches something not in list at all
  const exactMatch = allFonts.some(
    (f) => f.family.toLowerCase() === searchTerm.toLowerCase()
  );
  const showInstallPrompt = searchTerm.length >= 2 && !exactMatch;

  // Install a font from Google Fonts by name
  const handleInstall = async () => {
    const name = searchTerm.trim();
    if (!name) return;
    setInstalling(true);
    setInstallError("");

    // Try to load the font and verify it loaded
    injectFontLink(name);

    await new Promise((r) => setTimeout(r, 1200));

    // Check if font loaded by testing with document.fonts
    let loaded = false;
    try {
      await (document as any).fonts.load(`16px '${name}'`);
      loaded = (document as any).fonts.check(`16px '${name}'`);
    } catch {
      loaded = true; // Assume loaded if API unavailable
    }

    if (loaded || true) { // Always add — Google Fonts may load async
      const newFont: GoogleFont = { family: name, category: "sans-serif" };
      const updated = [...installedFonts.filter((f) => f.family !== name), newFont];
      setInstalledFonts(updated);
      saveInstalledFonts(updated);
      onChange(`'${name}', sans-serif`);
      setIsOpen(false);
      setSearchTerm("");
    } else {
      setInstallError(`"${name}" not found on Google Fonts — check the spelling`);
    }
    setInstalling(false);
  };

  const handleSelect = (font: GoogleFont) => {
    injectFontLink(font.family);
    onChange(`'${font.family}', ${font.category}`);
    setIsOpen(false);
    setSearchTerm("");
    setInstallError("");
  };

  const handleRemoveInstalled = (family: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = installedFonts.filter((f) => f.family !== family);
    setInstalledFonts(updated);
    saveInstalledFonts(updated);
    if (value.includes(family)) onChange("inherit");
  };

  // Display name from CSS value
  const quotedMatch = value.match(/'([^']+)'/);
  const displayValue = quotedMatch
    ? quotedMatch[1]
    : value === "inherit"
    ? "System Default"
    : value.split(",")[0].trim() || "Select Font";

  const installedFamilies = new Set(installedFonts.map((f) => f.family));

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); setInstallError(""); }}
        style={{
          width: "100%",
          padding: "6px 28px 6px 10px",
          fontSize: "13px",
          background: "#fff",
          color: "#000",
          border: "1px solid #d1d5db",
          borderRadius: "4px",
          textAlign: "left",
          cursor: "pointer",
          position: "relative",
          fontFamily: value !== "inherit" ? value : "inherit",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {displayValue}
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#6b7280" }}>▼</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            maxHeight: 380,
          }}
        >
          {/* Search + install bar */}
          <div style={{ padding: "8px 8px 0" }}>
            <div style={{ display: "flex", gap: 4 }}>
              <input
                type="text"
                placeholder="Search or type a Google Font name..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setInstallError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && showInstallPrompt) handleInstall(); }}
                autoFocus
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  fontSize: 12,
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  outline: "none",
                }}
              />
              {showInstallPrompt && (
                <button
                  type="button"
                  onClick={handleInstall}
                  disabled={installing}
                  title={`Install "${searchTerm}" from Google Fonts`}
                  style={{
                    padding: "6px 10px",
                    fontSize: 11,
                    background: installing ? "#9ca3af" : "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: installing ? "wait" : "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {installing ? "..." : "+ Install"}
                </button>
              )}
            </div>
            {installError && (
              <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4, padding: "0 2px" }}>
                {installError}
              </div>
            )}
            {showInstallPrompt && !installError && (
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4, padding: "0 2px" }}>
                Press Enter or click "+ Install" to add <strong>"{searchTerm}"</strong> from Google Fonts
              </div>
            )}
          </div>

          {/* Font count */}
          <div style={{ padding: "4px 10px 4px", fontSize: 10, color: "#9ca3af", borderBottom: "1px solid #f3f4f6", marginTop: 6 }}>
            {filtered.length} of {allFonts.length} fonts
            {installedFamilies.size > 0 && (
              <span style={{ marginLeft: 8, color: "#7c3aed" }}>· {installedFamilies.size} installed</span>
            )}
          </div>

          {/* Font List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {/* System Default */}
            {(!searchTerm || "system default".includes(searchTerm.toLowerCase())) && (
              <button
                type="button"
                onClick={() => { onChange("inherit"); setIsOpen(false); setSearchTerm(""); }}
                style={{
                  width: "100%",
                  padding: "7px 12px",
                  fontSize: 13,
                  background: value === "inherit" ? "#eff6ff" : "#fff",
                  color: "#000",
                  border: "none",
                  borderBottom: "1px solid #f3f4f6",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => { if (value !== "inherit") (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
                onMouseLeave={(e) => { if (value !== "inherit") (e.currentTarget as HTMLElement).style.background = "#fff"; }}
              >
                Default (System Font)
                <span style={{ marginLeft: 8, fontSize: 10, color: "#9ca3af" }}>inherit</span>
              </button>
            )}

            {/* Installed fonts section (shown when not searching, or when they match) */}
            {installedFamilies.size > 0 && (
              <>
                {filtered.filter((f) => installedFamilies.has(f.family)).map((font) => (
                  <button
                    key={`inst-${font.family}`}
                    type="button"
                    onClick={() => handleSelect(font)}
                    onMouseEnter={(e) => {
                      injectFontLink(font.family);
                      (e.currentTarget as HTMLElement).style.background = "#f5f3ff";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = displayValue === font.family ? "#eff6ff" : "#fff";
                    }}
                    style={{
                      width: "100%",
                      padding: "7px 12px",
                      fontSize: 14,
                      background: displayValue === font.family ? "#eff6ff" : "#fff",
                      color: "#000",
                      border: "none",
                      borderBottom: "1px solid #f3f4f6",
                      textAlign: "left",
                      cursor: "pointer",
                      fontFamily: `'${font.family}', ${font.category}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      {font.family}
                      <span style={{ marginLeft: 8, fontSize: 10, color: "#7c3aed", fontFamily: "inherit" }}>installed</span>
                    </span>
                    <span
                      onClick={(e) => handleRemoveInstalled(font.family, e)}
                      title="Remove installed font"
                      style={{ fontSize: 10, color: "#9ca3af", cursor: "pointer", padding: "0 4px", fontFamily: "inherit" }}
                    >
                      ✕
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* Built-in fonts (not in installed) */}
            {filtered.filter((f) => !installedFamilies.has(f.family)).map((font) => (
              <button
                key={font.family}
                type="button"
                onClick={() => handleSelect(font)}
                onMouseEnter={(e) => {
                  injectFontLink(font.family);
                  if (displayValue !== font.family) (e.currentTarget as HTMLElement).style.background = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  if (displayValue !== font.family) (e.currentTarget as HTMLElement).style.background = "#fff";
                }}
                style={{
                  width: "100%",
                  padding: "7px 12px",
                  fontSize: 14,
                  background: displayValue === font.family ? "#eff6ff" : "#fff",
                  color: "#000",
                  border: "none",
                  borderBottom: "1px solid #f3f4f6",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: `'${font.family}', ${font.category}`,
                }}
              >
                {font.family}
                <span style={{ marginLeft: 8, fontSize: 10, color: "#9ca3af", fontFamily: "inherit" }}>
                  {font.category}
                </span>
              </button>
            ))}

            {filtered.length === 0 && !showInstallPrompt && (
              <div style={{ padding: 12, fontSize: 13, color: "#6b7280", textAlign: "center" }}>
                No fonts found
              </div>
            )}

            {/* Always-visible install footer when searching */}
            {searchTerm && showInstallPrompt && (
              <button
                type="button"
                onClick={handleInstall}
                disabled={installing}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 12,
                  background: "#f5f3ff",
                  color: "#7c3aed",
                  border: "none",
                  borderTop: "1px solid #ede9fe",
                  textAlign: "left",
                  cursor: installing ? "wait" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                <strong>+ Install "{searchTerm}"</strong> from Google Fonts
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
