"use client";

import { useState, useEffect } from "react";
import { getPages } from "@/lib/page-manager";

interface LinkOption {
  value: string;
  label: string;
}

interface LinkPickerProps {
  value: string;
  onChange: (value: string) => void;
  /** Section anchor options, e.g. [{ value: "#hero-1", label: "Home: Hero" }] */
  sectionOptions?: LinkOption[];
  placeholder?: string;
  className?: string;
}

/**
 * LinkPicker — shared admin dropdown for selecting internal links.
 *
 * Shows: Home / section anchors / dynamic CMS pages / enabled feature pages / custom URL.
 * Falls back gracefully if feature API is unavailable (not SUPER_ADMIN or offline).
 */
export function LinkPicker({
  value,
  onChange,
  sectionOptions = [],
  placeholder = "e.g., /contact or https://example.com",
  className = "",
}: LinkPickerProps) {
  const [dynamicPages, setDynamicPages] = useState<LinkOption[]>([]);
  const [featurePages, setFeaturePages] = useState<LinkOption[]>([]);

  useEffect(() => {
    // CMS pages from localStorage
    const pages = getPages();
    setDynamicPages(
      pages
        .filter((p) => p.enabled)
        .map((p) => ({ value: `/${p.slug}`, label: `Page: ${p.title}` }))
    );

    // Enabled feature pages from API (requires SUPER_ADMIN session cookie)
    fetch("/api/features")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.data)) {
          setFeaturePages(
            data.data
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((f: any) => f.enabled && f.slug)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((f: any) => ({ value: `/${f.slug}`, label: `Feature: ${f.name}` }))
          );
        }
      })
      .catch(() => {}); // Non-admin users or offline — silently skip
  }, []);

  const allOptions: LinkOption[] = [
    { value: "/", label: "Home" },
    ...sectionOptions,
    ...dynamicPages,
    ...featurePages,
    { value: "custom", label: "Custom URL..." },
  ];

  // Detect whether the current value is a "custom" URL not in the predefined list
  const predefinedValues = allOptions.map((o) => o.value).filter((v) => v !== "custom");
  const isCustom = value !== "" && !predefinedValues.includes(value);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === "custom") return; // keep current custom value, show text input
    onChange(selected);
  };

  return (
    <div className={className}>
      <select
        className="form-select"
        value={isCustom ? "custom" : value || ""}
        onChange={handleSelectChange}
      >
        <option value="">Select page…</option>
        {allOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {isCustom && (
        <input
          type="text"
          className="form-control mt-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
