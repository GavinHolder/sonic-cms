"use client";

import { useState, useEffect } from "react";
import { getTheme, toggleTheme, type Theme } from "@/lib/theme";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(getTheme());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  function handleToggle() {
    const next = toggleTheme();
    setThemeState(next);
  }

  return (
    <button
      onClick={handleToggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className={className}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "6px 8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: 0.8,
        transition: "opacity 0.2s ease",
        color: "inherit",
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
      onMouseLeave={e => (e.currentTarget.style.opacity = "0.8")}
    >
      {theme === "dark" ? (
        <i className="bi bi-sun" style={{ fontSize: "18px" }} />
      ) : (
        <i className="bi bi-moon" style={{ fontSize: "18px" }} />
      )}
    </button>
  );
}
