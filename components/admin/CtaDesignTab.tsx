"use client";

import { useId, useState } from "react";
import GoogleFontPicker from "@/components/admin/GoogleFontPicker";
import {
  safeCssColor,
  safeCssShadow,
  pruneCtaDesign,
  type CtaDesign,
  type CtaDesignCard,
  type CtaDesignFormCard,
  type CtaDesignField,
  type CtaDesignButton,
} from "@/lib/cta-design";

/**
 * "Design" tab of the CTA section editor (contact-form style only).
 * Edits the optional `content.design` object; the live look is resolved from it by
 * lib/cta-design.ts. Inputs validate with the SAME validators the renderer uses, so
 * a value the live page would ignore is flagged here instead of failing silently.
 */
interface CtaDesignTabProps {
  design: CtaDesign | undefined;
  onChange: (design: CtaDesign | undefined) => void;
}

type GroupKey = "card" | "formCard" | "field" | "button";
type GroupValue = string | number | boolean | undefined;

function ColorInput({ label, value, onChange, hint }: { label: string; value: string | undefined; onChange: (v: string | undefined) => void; hint?: string }) {
  const id = useId();
  const text = value ?? "";
  const invalid = text !== "" && safeCssColor(text) === undefined;
  return (
    <div className="col-md-4 col-sm-6">
      <label className="form-label small mb-1" htmlFor={id}>{label}</label>
      <div className="input-group input-group-sm">
        <input
          type="color"
          className="form-control form-control-color"
          aria-label={`${label} picker`}
          value={/^#[0-9a-f]{6}$/i.test(text) ? text : "#000000"}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          id={id}
          type="text"
          className={`form-control ${invalid ? "is-invalid" : ""}`}
          value={text}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="Default"
          aria-describedby={invalid || hint ? `${id}-help` : undefined}
        />
      </div>
      {invalid ? (
        <div id={`${id}-help`} className="text-danger small mt-1">Use a hex, rgb() or hsl() colour. This value is ignored.</div>
      ) : hint ? (
        <div id={`${id}-help`} className="form-text">{hint}</div>
      ) : null}
    </div>
  );
}

function NumberInput({ label, value, onChange, min, max, step = 1 }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; min: number; max: number; step?: number }) {
  const id = useId();
  return (
    <div className="col-md-4 col-sm-6">
      <label className="form-label small mb-1" htmlFor={id}>{label}</label>
      <div className="input-group input-group-sm">
        <input
          id={id}
          type="number"
          className="form-control"
          min={min}
          max={max}
          step={step}
          value={value ?? ""}
          onChange={(e) => {
            const n = e.target.value === "" ? undefined : Number(e.target.value);
            onChange(n === undefined || !Number.isFinite(n) ? undefined : Math.min(max, Math.max(min, n)));
          }}
          placeholder="Default"
        />
        <span className="input-group-text">px</span>
      </div>
    </div>
  );
}

function ShadowInput({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string | undefined) => void }) {
  const id = useId();
  const text = value ?? "";
  const invalid = text !== "" && safeCssShadow(text) === undefined;
  return (
    <div className="col-md-8">
      <label className="form-label small mb-1" htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        className={`form-control form-control-sm ${invalid ? "is-invalid" : ""}`}
        value={text}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder="e.g. 0 24px 60px rgba(0,0,0,.28) — or none"
        aria-describedby={`${id}-help`}
      />
      <div id={`${id}-help`} className={invalid ? "text-danger small mt-1" : "form-text"}>
        {invalid ? "Use offsets, blur and a hex/rgb colour, or \"none\". This value is ignored." : "Offsets, blur and a colour, or \"none\"."}
      </div>
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="col-md-4 col-sm-6 d-flex align-items-end">
      <div className="form-check mb-1">
        <input id={id} type="checkbox" className="form-check-input" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <label className="form-check-label small" htmlFor={id}>{label}</label>
      </div>
    </div>
  );
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="col-md-4 col-sm-6">
      <label className="form-label small mb-1" htmlFor={id}>{label}</label>
      <select id={id} className="form-select form-select-sm" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function FontInput({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string | undefined) => void }) {
  return (
    <div className="col-md-6">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <span className="form-label small mb-0">{label}</span>
        {value && (
          <button type="button" className="btn btn-link btn-sm p-0" onClick={() => onChange(undefined)}>
            Use site font
          </button>
        )}
      </div>
      <GoogleFontPicker value={value ?? ""} onChange={(v) => onChange(v || undefined)} />
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border rounded p-3 mb-3">
      <legend className="float-none w-auto px-2 fs-6 fw-semibold mb-0">{title}</legend>
      <div className="row g-3">{children}</div>
    </fieldset>
  );
}

export default function CtaDesignTab({ design, onChange }: CtaDesignTabProps) {
  const [undo, setUndo] = useState<CtaDesign | undefined>(undefined);
  const d: CtaDesign = design ?? {};
  const card: CtaDesignCard = d.card ?? {};
  const formCard: CtaDesignFormCard = d.formCard ?? {};
  const field: CtaDesignField = d.field ?? {};
  const button: CtaDesignButton = d.button ?? {};

  const setTop = <K extends keyof CtaDesign>(key: K, value: CtaDesign[K] | undefined) => {
    setUndo(undefined);
    onChange(pruneCtaDesign({ ...d, [key]: value }));
  };
  const setIn = (group: GroupKey, key: string, value: GroupValue) => {
    setUndo(undefined);
    onChange(pruneCtaDesign({ ...d, [group]: { ...(d[group] ?? {}), [key]: value } }));
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <p className="text-muted small mb-0" style={{ maxWidth: "60ch" }}>
          Optional look for the contact form. Leave a setting empty to keep the standard look. Check text contrast against its background (4.5:1 or better).
        </p>
        {design ? (
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => {
              setUndo(design);
              onChange(undefined);
            }}
          >
            <i className="bi bi-arrow-counterclockwise me-1" />
            Reset to default look
          </button>
        ) : undo ? (
          <div className="small" role="status">
            Design reset.{" "}
            <button
              type="button"
              className="btn btn-link btn-sm p-0 align-baseline"
              onClick={() => {
                onChange(undo);
                setUndo(undefined);
              }}
            >
              Undo
            </button>
          </div>
        ) : (
          <span className="badge text-bg-light border">Standard look</span>
        )}
      </div>

      <Group title="Background and tone">
        <Choice
          label="Text tone"
          value={d.tone ?? "auto"}
          options={[
            { value: "auto", label: "Automatic (from background)" },
            { value: "light", label: "Dark text (light surface)" },
            { value: "dark", label: "Light text (dark surface)" },
          ]}
          onChange={(v) => setTop("tone", v === "auto" ? undefined : v)}
        />
        <Check label="No veil over the photo" checked={d.overlay === "none"} onChange={(v) => setTop("overlay", v ? "none" : undefined)} />
        {d.overlay !== "none" && (
          <ColorInput label="Photo veil" value={d.overlay} onChange={(v) => setTop("overlay", v)} hint="Default: black at 45%." />
        )}
      </Group>

      <Group title="Card">
        <Check label="One panel behind both columns" checked={d.card !== undefined} onChange={(v) => setTop("card", v ? {} : undefined)} />
        {d.card !== undefined && (
          <>
            <ColorInput label="Panel background" value={card.background} onChange={(v) => setIn("card", "background", v)} hint="rgba() gives a see-through panel." />
            <NumberInput label="Max width" value={card.maxWidth} min={480} max={1320} onChange={(v) => setIn("card", "maxWidth", v)} />
            <NumberInput label="Corner radius" value={card.radius} min={0} max={80} onChange={(v) => setIn("card", "radius", v)} />
            <NumberInput label="Corner radius (phone)" value={card.radiusMobile} min={0} max={80} onChange={(v) => setIn("card", "radiusMobile", v)} />
            <NumberInput label="Padding" value={card.padding} min={0} max={120} onChange={(v) => setIn("card", "padding", v)} />
            <NumberInput label="Padding (phone)" value={card.paddingMobile} min={0} max={120} onChange={(v) => setIn("card", "paddingMobile", v)} />
            <ShadowInput label="Shadow" value={card.shadow} onChange={(v) => setIn("card", "shadow", v)} />
          </>
        )}
      </Group>

      <Group title="Text">
        <ColorInput label="Eyebrow" value={d.eyebrowColor} onChange={(v) => setTop("eyebrowColor", v)} />
        <ColorInput label="Heading" value={d.headingColor} onChange={(v) => setTop("headingColor", v)} />
        <ColorInput label="Heading accent line" value={d.accentColor} onChange={(v) => setTop("accentColor", v)} />
        <ColorInput label="Paragraph" value={d.textColor} onChange={(v) => setTop("textColor", v)} />
        <ColorInput label="Small text" value={d.mutedColor} onChange={(v) => setTop("mutedColor", v)} hint="Form hint, tile labels." />
        <NumberInput label="Heading size" value={d.headingSize} min={24} max={96} onChange={(v) => setTop("headingSize", v)} />
        <Check label="Headings in capitals" checked={d.headingUppercase === true} onChange={(v) => setTop("headingUppercase", v || undefined)} />
        <div className="col-12" />
        <FontInput label="Heading font" value={d.headingFont} onChange={(v) => setTop("headingFont", v)} />
        <FontInput label="Body font" value={d.bodyFont} onChange={(v) => setTop("bodyFont", v)} />
      </Group>

      <Group title="Contact rows">
        <Choice
          label="Style"
          value={d.contactStyle ?? "plain"}
          options={[
            { value: "plain", label: "Plain list" },
            { value: "tiles", label: "Tiles with round icon" },
          ]}
          onChange={(v) => setTop("contactStyle", v === "plain" ? undefined : v)}
        />
        {d.contactStyle === "tiles" && (
          <>
            <ColorInput label="Tile background" value={d.tileBackground} onChange={(v) => setTop("tileBackground", v)} />
            <ColorInput label="Tile text" value={d.tileTextColor} onChange={(v) => setTop("tileTextColor", v)} />
            <ColorInput label="Icon circle" value={d.iconBackground} onChange={(v) => setTop("iconBackground", v)} />
            <ColorInput label="Icon" value={d.iconColor} onChange={(v) => setTop("iconColor", v)} />
            <NumberInput label="Tile corner radius" value={d.tileRadius} min={0} max={40} onChange={(v) => setTop("tileRadius", v)} />
            <Check label="Hide the address on phones" checked={d.hideAddressOnMobile === true} onChange={(v) => setTop("hideAddressOnMobile", v || undefined)} />
          </>
        )}
      </Group>

      <Group title="Form panel">
        <ColorInput label="Background" value={formCard.background} onChange={(v) => setIn("formCard", "background", v)} />
        <ColorInput label="Title" value={formCard.titleColor} onChange={(v) => setIn("formCard", "titleColor", v)} />
        <Check label="No border" checked={formCard.border === "none"} onChange={(v) => setIn("formCard", "border", v ? "none" : undefined)} />
        {formCard.border !== "none" && <ColorInput label="Border" value={formCard.border} onChange={(v) => setIn("formCard", "border", v)} />}
        <NumberInput label="Corner radius" value={formCard.radius} min={0} max={80} onChange={(v) => setIn("formCard", "radius", v)} />
        <NumberInput label="Corner radius (phone)" value={formCard.radiusMobile} min={0} max={80} onChange={(v) => setIn("formCard", "radiusMobile", v)} />
        <NumberInput label="Padding" value={formCard.padding} min={0} max={80} onChange={(v) => setIn("formCard", "padding", v)} />
        <NumberInput label="Padding (phone)" value={formCard.paddingMobile} min={0} max={80} onChange={(v) => setIn("formCard", "paddingMobile", v)} />
        <ShadowInput label="Shadow" value={formCard.shadow} onChange={(v) => setIn("formCard", "shadow", v)} />
      </Group>

      <Group title="Fields">
        <ColorInput label="Label" value={field.labelColor} onChange={(v) => setIn("field", "labelColor", v)} />
        <ColorInput label="Background" value={field.background} onChange={(v) => setIn("field", "background", v)} />
        <ColorInput label="Typed text" value={field.textColor} onChange={(v) => setIn("field", "textColor", v)} />
        <ColorInput label="Placeholder" value={field.placeholderColor} onChange={(v) => setIn("field", "placeholderColor", v)} />
        <ColorInput label="Border" value={field.borderColor} onChange={(v) => setIn("field", "borderColor", v)} hint="Needs 3:1 against the panel." />
        <ColorInput label="Border on hover" value={field.hoverBorderColor} onChange={(v) => setIn("field", "hoverBorderColor", v)} />
        <NumberInput label="Border width" value={field.borderWidth} min={0} max={4} step={0.5} onChange={(v) => setIn("field", "borderWidth", v)} />
        <NumberInput label="Corner radius" value={field.radius} min={0} max={40} onChange={(v) => setIn("field", "radius", v)} />
        <NumberInput label="Height" value={field.height} min={32} max={80} onChange={(v) => setIn("field", "height", v)} />
        <Check label="Stack half-width fields on phones" checked={field.stackOnMobile === true} onChange={(v) => setIn("field", "stackOnMobile", v || undefined)} />
      </Group>

      <Group title="Button">
        <ColorInput label="Background" value={button.background} onChange={(v) => setIn("button", "background", v)} />
        <ColorInput label="Background on hover" value={button.hover} onChange={(v) => setIn("button", "hover", v)} />
        <ColorInput label="Label" value={button.color} onChange={(v) => setIn("button", "color", v)} />
        <NumberInput label="Corner radius" value={button.radius} min={0} max={80} onChange={(v) => setIn("button", "radius", v)} />
        <NumberInput label="Height" value={button.height} min={32} max={96} onChange={(v) => setIn("button", "height", v)} />
        <Choice
          label="Icon"
          value={button.icon ?? "send"}
          options={[
            { value: "send", label: "Paper plane" },
            { value: "arrow-right", label: "Arrow" },
            { value: "none", label: "No icon" },
          ]}
          onChange={(v) => setIn("button", "icon", v === "send" ? undefined : v)}
        />
        <Choice
          label="Icon position"
          value={button.iconPosition ?? "before"}
          options={[
            { value: "before", label: "Before the label" },
            { value: "after", label: "After the label" },
          ]}
          onChange={(v) => setIn("button", "iconPosition", v === "before" ? undefined : v)}
        />
        <Check label="Label in capitals" checked={button.uppercase === true} onChange={(v) => setIn("button", "uppercase", v || undefined)} />
        <Check label="Use the heading font" checked={button.headingFont === true} onChange={(v) => setIn("button", "headingFont", v || undefined)} />
      </Group>

      <Group title="Focus and messages">
        <ColorInput label="Focus ring" value={d.focusColor} onChange={(v) => setTop("focusColor", v)} hint="Fields, button and contact tiles." />
        <ColorInput label="Success message" value={d.successColor} onChange={(v) => setTop("successColor", v)} />
        <ColorInput label="Error message" value={d.errorColor} onChange={(v) => setTop("errorColor", v)} />
      </Group>
    </div>
  );
}
