"use client";

import { useToast } from "@/components/admin/ToastProvider";

export interface EmailColors {
  brandColor: string;
  headerBg: string;
  pageBg: string;
}

export const DEFAULT_EMAIL_COLORS: EmailColors = {
  brandColor: "#e31e24",
  headerBg: "#ffffff",
  pageBg: "#eef0f3",
};

const HEX = /^#[0-9a-fA-F]{6}$/;

const FIELDS: { key: keyof EmailColors; label: string; help: string }[] = [
  { key: "brandColor", label: "Brand colour", help: "Accent bar, links and highlights" },
  { key: "headerBg", label: "Header background", help: "Behind the logo at the top" },
  { key: "pageBg", label: "Page background", help: "Outer background around the email" },
];

interface Props {
  value: EmailColors;
  onChange: (next: EmailColors) => void;
}

/** Three hex-validated colour controls for the shared email layout. */
export default function EmailAppearanceSettings({ value, onChange }: Props) {
  const toast = useToast();

  const set = (key: keyof EmailColors, v: string) => onChange({ ...value, [key]: v });

  const commit = (key: keyof EmailColors, v: string) => {
    if (!HEX.test(v)) {
      toast.error(`${v || "Empty value"} is not a valid hex colour (e.g. #e31e24)`);
      set(key, DEFAULT_EMAIL_COLORS[key]);
    }
  };

  return (
    <div className="mb-3">
      <label className="form-label small fw-medium">Email colours</label>
      <div className="row g-3">
        {FIELDS.map(({ key, label, help }) => {
          const v = value[key];
          const valid = HEX.test(v);
          return (
            <div className="col-md-4" key={key}>
              <div className="small fw-medium mb-1">{label}</div>
              <div className="input-group input-group-sm">
                <input
                  type="color"
                  className="form-control form-control-color"
                  value={valid ? v : DEFAULT_EMAIL_COLORS[key]}
                  onChange={(e) => set(key, e.target.value)}
                  aria-label={label}
                />
                <input
                  type="text"
                  className={`form-control ${valid ? "" : "is-invalid"}`}
                  value={v}
                  maxLength={7}
                  onChange={(e) => set(key, e.target.value)}
                  onBlur={(e) => commit(key, e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  title="Reset to default"
                  onClick={() => set(key, DEFAULT_EMAIL_COLORS[key])}
                >
                  <i className="bi bi-arrow-counterclockwise" />
                </button>
              </div>
              <div className="form-text">{help}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
