"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useClientFeature } from "@/lib/hooks/useClientFeature";
import {
  calculateConcrete,
  DEFAULT_CONCRETE_SETTINGS,
  type CalcType,
  type CalcResult,
} from "@/lib/concrete-calculator";

const ConcreteViz3D = dynamic(() => import("@/components/calculator/ConcreteViz3D"), { ssr: false });

// ─── Calc type definitions ──────────────────────────────────────────────────────

const CALC_TYPES: {
  id: CalcType;
  label: string;
  icon: string;
  inputs: { id: string; label: string; unit: string; defaultVal: number; min: number; max: number; step: number }[];
}[] = [
  {
    id: "slab",
    label: "Slab / Floor",
    icon: "bi-square",
    inputs: [
      { id: "length", label: "Length", unit: "mm", defaultVal: 5000, min: 500, max: 20000, step: 100 },
      { id: "width", label: "Width", unit: "mm", defaultVal: 4000, min: 500, max: 20000, step: 100 },
      { id: "depth", label: "Thickness", unit: "mm", defaultVal: 100, min: 50, max: 500, step: 10 },
    ],
  },
  {
    id: "column",
    label: "Column / Cylinder",
    icon: "bi-circle",
    inputs: [
      { id: "diameter", label: "Diameter", unit: "mm", defaultVal: 300, min: 100, max: 2000, step: 25 },
      { id: "height", label: "Height", unit: "mm", defaultVal: 3000, min: 500, max: 10000, step: 100 },
    ],
  },
  {
    id: "footing",
    label: "Footing / Strip",
    icon: "bi-layout-text-window",
    inputs: [
      { id: "length", label: "Length", unit: "mm", defaultVal: 6000, min: 500, max: 20000, step: 100 },
      { id: "width", label: "Width", unit: "mm", defaultVal: 500, min: 100, max: 2000, step: 25 },
      { id: "depth", label: "Depth", unit: "mm", defaultVal: 400, min: 100, max: 1000, step: 25 },
    ],
  },
  {
    id: "staircase",
    label: "Staircase",
    icon: "bi-ladder",
    inputs: [
      { id: "steps", label: "Number of Steps", unit: "", defaultVal: 12, min: 2, max: 30, step: 1 },
      { id: "rise", label: "Rise per Step", unit: "mm", defaultVal: 180, min: 100, max: 300, step: 5 },
      { id: "run", label: "Run per Step", unit: "mm", defaultVal: 250, min: 150, max: 500, step: 5 },
      { id: "width", label: "Width", unit: "mm", defaultVal: 1200, min: 600, max: 3000, step: 50 },
    ],
  },
];

// ─── Slider + scrubber dimension input ────────────────────────────────────────

interface DimInputProps {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function DimInput({ label, unit, value, min, max, step, onChange }: DimInputProps) {
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(0);
  const hasDragged = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const clamp = useCallback((v: number) => Math.min(max, Math.max(min, v)), [min, max]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault();
    isDragging.current = true;
    hasDragged.current = false;
    startY.current = e.clientY;
    startValue.current = value;

    const onMove = (me: MouseEvent) => {
      const dy = startY.current - me.clientY; // up = positive = increase
      if (Math.abs(dy) > 3) {
        hasDragged.current = true;
        document.body.style.cursor = "ns-resize";
        document.body.style.userSelect = "none";
        const steps = Math.round(dy / 4);
        onChange(clamp(startValue.current + steps * step));
      }
    };

    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      // If no drag occurred, focus the input for typing
      if (!hasDragged.current) {
        setTimeout(() => inputRef.current?.select(), 0);
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [value, step, clamp, onChange]);

  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-baseline mb-1">
        <label className="form-label fw-semibold small mb-0">{label}</label>
        <span className="text-muted small">{value.toLocaleString()}{unit ? ` ${unit}` : ""}</span>
      </div>
      {/* Range slider */}
      <input
        type="range"
        className="form-range mb-2"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(clamp(parseFloat(e.target.value)))}
      />
      {/* Scrubber number input */}
      <div className="d-flex align-items-center gap-2">
        <div className="input-group input-group-sm" style={{ width: 140 }}>
          <input
            ref={inputRef}
            type="number"
            className="form-control text-center"
            style={{ cursor: "ns-resize", fontFamily: "monospace", fontWeight: 600 }}
            min={min} max={max} step={step}
            value={value}
            title="Type a value or click &amp; drag up/down"
            onChange={(e) => onChange(clamp(parseFloat(e.target.value) || min))}
            onMouseDown={handleMouseDown}
          />
          {unit && <span className="input-group-text text-muted">{unit}</span>}
        </div>
        <div className="text-muted" style={{ fontSize: "0.7rem" }}>
          <i className="bi bi-arrows-vertical me-1" />drag
        </div>
      </div>
    </div>
  );
}

function initInputs(calcType: CalcType): Record<string, number> {
  const t = CALC_TYPES.find((x) => x.id === calcType)!;
  return Object.fromEntries(t.inputs.map((i) => [i.id, i.defaultVal]));
}

function generateRef(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rnd = Math.floor(Math.random() * 9000) + 1000;
  return `CE-${yy}${mm}${dd}-${rnd}`;
}

// ─── Dot-label: padded "Description ........ value" line ──────────────────────

function ReportLine({ label, value, bold, large }: { label: string; value: string; bold?: boolean; large?: boolean }) {
  return (
    <div className="d-flex align-items-baseline" style={{ fontFamily: "monospace", fontSize: large ? "15px" : "13px" }}>
      <span style={{ color: bold ? "#111827" : "#374151", fontWeight: bold ? 700 : 400, flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, borderBottom: "1px dotted #cbd5e1", margin: "0 6px 3px", minWidth: 20 }} />
      <span style={{ color: bold ? "#111827" : "#374151", fontWeight: bold ? 700 : 400, flexShrink: 0 }}>{value}</span>
    </div>
  );
}

// ─── Quote request modal ───────────────────────────────────────────────────────

interface QuoteModalProps {
  show: boolean;
  onClose: () => void;
  calcType: CalcType;
  strength: string;
  inputs: Record<string, number>;
  result: CalcResult;
  currency: string;
  refNumber: string;
}

function QuoteModal({ show, onClose, calcType, strength, inputs, result, currency, refNumber }: QuoteModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) { setError("Name and email are required."); return; }
    setSending(true); setError("");
    try {
      const res = await fetch("/api/calculator/quote-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, notes, calcType, strength, dimensions: inputs, result, currency, refNumber }),
      });
      const j = await res.json();
      if (j.success) { setSent(true); }
      else { setError(j.error || "Failed to send. Please try again."); }
    } catch { setError("Network error. Please try again."); }
    finally { setSending(false); }
  };

  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 2040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 2050 }} tabIndex={-1}>
        <div className="modal-dialog modal-dialog-scrollable modal-fullscreen-sm-down" style={{ marginTop: 90, marginBottom: 24 }}>
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header border-0 pb-0" style={{ background: "#1e3a5f", borderRadius: "12px 12px 0 0" }}>
              <div className="p-1">
                <div style={{ fontSize: "10px", letterSpacing: "0.15em", color: "#93c5fd", textTransform: "uppercase", marginBottom: 4 }}>Reference: {refNumber}</div>
                <h5 className="modal-title fw-bold text-white mb-0">
                  <i className="bi bi-envelope-paper me-2" />Request Formal Quote
                </h5>
                <div style={{ fontSize: "12px", color: "#bfdbfe", marginTop: 4 }}>
                  We&apos;ll contact you with an accurate project quote
                </div>
              </div>
              <button type="button" className="btn-close btn-close-white ms-auto" onClick={onClose} />
            </div>
            {sent ? (
              <div className="modal-body text-center py-5">
                <div className="mb-3" style={{ fontSize: 48 }}>✅</div>
                <h5 className="fw-bold text-success">Quote request sent!</h5>
                <p className="text-muted small mb-0">We&apos;ll be in touch within 1–2 business days with a formal quote for reference <strong>{refNumber}</strong>.</p>
                <button className="btn btn-primary mt-4" onClick={onClose}>Close</button>
              </div>
            ) : (
              <div className="modal-body p-4">
                {/* Summary strip */}
                <div className="rounded p-3 mb-4" style={{ background: "#f1f5f9", borderLeft: "4px solid #1e3a5f" }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold" style={{ textTransform: "capitalize" }}>{calcType} · {strength}</div>
                      <div className="text-muted small">{result.volumeM3} m³ · {result.cementBags} bags cement</div>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold" style={{ fontSize: 18, color: "#1e3a5f" }}>{currency}{result.estimatedCost.toLocaleString()}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>indicative estimate</div>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Full Name <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" placeholder="e.g. John Smith" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Email Address <span className="text-danger">*</span></label>
                  <input type="email" className="form-control" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Phone <span className="text-muted fw-normal small">(optional)</span></label>
                  <input type="tel" className="form-control" placeholder="+27 82 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Project Notes <span className="text-muted fw-normal small">(optional)</span></label>
                  <textarea className="form-control" rows={3} placeholder="Site address, special requirements, timeline..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                {error && <div className="alert alert-danger py-2 small">{error}</div>}
              </div>
            )}
            {!sent && (
              <div className="modal-footer border-0 pt-0">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary px-4"
                  onClick={handleSubmit}
                  disabled={sending}
                >
                  {sending
                    ? <><span className="spinner-border spinner-border-sm me-2" />Sending…</>
                    : <><i className="bi bi-send me-2" />Send Quote Request</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Report-style result card ──────────────────────────────────────────────────

interface EstimateReportProps {
  result: CalcResult;
  calcType: CalcType;
  strength: string;
  inputs: Record<string, number>;
  currency: string;
  refNumber: string;
  cementBagSize: number;
  cementBagPrice: number;
  deliveryFee: number;
  onRequestQuote: () => void;
}

function EstimateReport({
  result, calcType, strength, inputs, currency, refNumber,
  cementBagSize, cementBagPrice, deliveryFee, onRequestQuote,
}: EstimateReportProps) {
  const currentType = CALC_TYPES.find((t) => t.id === calcType)!;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const materialCost = result.estimatedCost - deliveryFee;

  const handlePrint = () => window.print();

  return (
    <>
      <style>{`
        @media print {
          body > *:not(.print-area) { display: none !important; }
          .print-area { display: block !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="card border-0 shadow print-area" style={{ borderRadius: 12, overflow: "hidden" }}>
        {/* Report header */}
        <div style={{ background: "#1e3a5f", padding: "20px 28px" }}>
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#93c5fd", textTransform: "uppercase", marginBottom: 4 }}>
                Concrete Calculator
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>ESTIMATE REPORT</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "monospace", fontSize: 13, color: "#bfdbfe" }}>Ref: {refNumber}</div>
              <div style={{ fontSize: 11, color: "#7dd3fc", marginTop: 2 }}>{today}</div>
            </div>
          </div>
        </div>

        {/* Type + strength bar */}
        <div style={{ background: "#f1f5f9", padding: "10px 28px", borderBottom: "1px solid #e2e8f0" }}>
          <div className="d-flex gap-4">
            <div>
              <span style={{ fontSize: 10, letterSpacing: "0.12em", color: "#94a3b8", textTransform: "uppercase" }}>Project Type</span>
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14, textTransform: "capitalize", marginTop: 1 }}>{currentType.label}</div>
            </div>
            <div style={{ borderLeft: "1px solid #e2e8f0" }} />
            <div>
              <span style={{ fontSize: 10, letterSpacing: "0.12em", color: "#94a3b8", textTransform: "uppercase" }}>Mix Strength</span>
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14, marginTop: 1 }}>{strength}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 28px" }}>
          {/* Dimensions section */}
          <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 10 }}>
            ── Dimensions
          </div>
          <div className="mb-4 ps-2">
            {currentType.inputs.map((inp) => (
              <ReportLine
                key={inp.id}
                label={inp.label}
                value={`${Number(inputs[inp.id] ?? inp.defaultVal).toLocaleString()} ${inp.unit}`}
              />
            ))}
          </div>

          {/* Quantities section */}
          <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 10 }}>
            ── Calculated Quantities
          </div>
          <div className="mb-4 ps-2">
            <ReportLine label="Concrete Volume" value={`${result.volumeM3} m³`} />
            <ReportLine label="Total Weight" value={`${result.weightKg.toLocaleString()} kg (~${Math.round(result.weightKg / 1000)} t)`} />
            <ReportLine label="Cement Bags Required" value={`${result.cementBags} × ${cementBagSize} kg bags`} />
          </div>

          {/* Cost section */}
          <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 10 }}>
            ── Cost Estimate (Indicative)
          </div>
          <div className="mb-3 ps-2">
            <ReportLine label={`Materials (${result.cementBags} bags @ ${currency}${cementBagPrice})`} value={`${currency}${materialCost.toLocaleString()}`} />
            {deliveryFee > 0 && (
              <ReportLine label="Delivery Fee" value={`${currency}${deliveryFee.toLocaleString()}`} />
            )}
          </div>

          {/* Total line */}
          <div style={{ borderTop: "2px solid #1e3a5f", paddingTop: 12, marginTop: 4 }}>
            <ReportLine
              label="TOTAL ESTIMATE"
              value={`${currency}${result.estimatedCost.toLocaleString()}`}
              bold
              large
            />
          </div>

          {/* Disclaimer */}
          <div className="mt-4 p-3 rounded" style={{ background: "#fffbeb", border: "1px solid #fde68a", fontSize: 11, color: "#78350f" }}>
            <i className="bi bi-exclamation-triangle me-1" />
            This is an indicative estimate only. Prices may vary based on location, market conditions, and site requirements. Request a formal quote for accurate pricing.
          </div>
        </div>

        {/* Actions */}
        <div className="d-flex gap-2 no-print" style={{ padding: "0 28px 20px" }}>
          <button className="btn btn-outline-secondary btn-sm" onClick={handlePrint}>
            <i className="bi bi-printer me-1" />Print / Save PDF
          </button>
          <button className="btn btn-primary ms-auto" onClick={onRequestQuote}>
            <i className="bi bi-envelope-paper me-2" />Request Formal Quote
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Inner calculator ──────────────────────────────────────────────────────────

interface CalculatorInnerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
}

// ─── Estimate report modal wrapper ────────────────────────────────────────────

interface EstimateModalProps extends EstimateReportProps {
  show: boolean;
  onClose: () => void;
}

function EstimateModal({ show, onClose, ...reportProps }: EstimateModalProps) {
  if (!show) return null;
  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 2040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 2050 }} tabIndex={-1}>
        {/* fullscreen on mobile, large dialog on desktop with top margin to clear navbar */}
        <div
          className="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-sm-down"
          style={{ marginTop: 90, marginBottom: 24 }}
        >
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
            <div className="modal-header border-0 pb-0 px-4 pt-3">
              <div />
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body px-3 px-md-4 pb-4 pt-0">
              <EstimateReport {...reportProps} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CalculatorInner({ config }: CalculatorInnerProps) {
  const [calcType, setCalcType] = useState<CalcType>("slab");
  const [inputs, setInputs] = useState<Record<string, number>>(initInputs("slab"));
  // Debounce inputs/type to 3D viewer — prevents scene rebuild on every slider tick
  const [debouncedInputs, setDebouncedInputs] = useState(inputs);
  const [debouncedCalcType, setDebouncedCalcType] = useState(calcType);
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedInputs(inputs); setDebouncedCalcType(calcType); }, 350);
    return () => clearTimeout(t);
  }, [inputs, calcType]);
  const [strength, setStrength] = useState("25MPa");
  const [result, setResult] = useState<CalcResult | null>(null);
  const [refNumber, setRefNumber] = useState<string>("");
  const [showQuote, setShowQuote] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const settings = { ...DEFAULT_CONCRETE_SETTINGS, ...config };
  const currentType = CALC_TYPES.find((t) => t.id === calcType)!;

  const handleCalcTypeChange = (type: CalcType) => {
    setCalcType(type);
    setInputs(initInputs(type));
    setResult(null);
    setShowReport(false);
  };

  const handleCalculate = async () => {
    const res = calculateConcrete(calcType, inputs, strength, settings);
    setResult(res);
    // Reserve a sequential reference number from the server
    try {
      const r = await fetch("/api/calculator/reserve-ref");
      const j = await r.json();
      if (j.ref) setRefNumber(j.ref);
      else setRefNumber(generateRef()); // fallback if API fails
    } catch {
      setRefNumber(generateRef()); // fallback to random ref
    }
    setShowReport(true);
  };

  return (
    <>
      {/* Calc type selector — scrollable row on mobile */}
      <div className="d-flex gap-2 mb-4 flex-wrap" role="group">
        {CALC_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn ${calcType === t.id ? "btn-primary" : "btn-outline-secondary"} d-flex align-items-center gap-2`}
            style={{ fontSize: 13 }}
            onClick={() => handleCalcTypeChange(t.id)}
          >
            <i className={t.icon} />
            <span className="d-none d-sm-inline">{t.label}</span>
            <span className="d-inline d-sm-none">{t.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      <div className="row g-3 g-md-4 align-items-start">
        {/* ── 3D viz — appears first on mobile (order-1 → order-md-2) ── */}
        <div className="col-12 col-md-7 order-1 order-md-2">
          <ConcreteViz3D calcType={debouncedCalcType} dimensions={debouncedInputs} result={result} />
          {result && (
            <div className="mt-3 text-center">
              <button
                className="btn btn-success px-4 shadow-sm"
                onClick={() => setShowReport(true)}
              >
                <i className="bi bi-file-earmark-text me-2" />View Estimate Report
              </button>
            </div>
          )}
        </div>

        {/* ── Inputs — appears second on mobile, left column on desktop ── */}
        <div className="col-12 col-md-5 order-2 order-md-1">
          <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
            <div className="card-body p-3 p-md-4">
              <h6 className="fw-bold mb-1" style={{ color: "#1e3a5f" }}>
                <i className="bi bi-sliders me-2" />{currentType.label}
              </h6>
              <div className="text-muted small mb-4">Adjust sliders or drag a number up/down.</div>

              {currentType.inputs.map((inp) => (
                <DimInput
                  key={inp.id}
                  label={inp.label}
                  unit={inp.unit}
                  value={inputs[inp.id] ?? inp.defaultVal}
                  min={inp.min}
                  max={inp.max}
                  step={inp.step}
                  onChange={(v) => setInputs((prev) => ({ ...prev, [inp.id]: v }))}
                />
              ))}

              <div className="mb-4">
                <label className="form-label fw-semibold small">Concrete Strength</label>
                <select
                  className="form-select"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                >
                  {Object.keys(settings.mixRatios).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <button className="btn btn-primary btn-lg w-100 fw-semibold" onClick={handleCalculate}>
                <i className="bi bi-calculator me-2" />Calculate
              </button>

              {result && (
                <button
                  className="btn btn-outline-primary btn-sm w-100 mt-2"
                  onClick={() => setShowReport(true)}
                >
                  <i className="bi bi-file-earmark-text me-2" />View Estimate Report
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {result && (
        <EstimateModal
          show={showReport}
          onClose={() => setShowReport(false)}
          result={result}
          calcType={calcType}
          strength={strength}
          inputs={inputs}
          currency={settings.currencySymbol}
          refNumber={refNumber}
          cementBagSize={settings.cementBagSize}
          cementBagPrice={settings.cementBagPrice}
          deliveryFee={settings.deliveryFee}
          onRequestQuote={() => { setShowReport(false); setShowQuote(true); }}
        />
      )}

      {result && (
        <QuoteModal
          show={showQuote}
          onClose={() => setShowQuote(false)}
          calcType={calcType}
          strength={strength}
          inputs={inputs}
          result={result}
          currency={settings.currencySymbol}
          refNumber={refNumber}
        />
      )}
    </>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CalculatorPage() {
  const { enabled, config, loading } = useClientFeature("concrete-calculator");

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="container py-5 text-center">
        <h2>Page Not Found</h2>
        <p className="text-muted">This calculator is not available.</p>
      </div>
    );
  }

  return (
    /* pt clears fixed navbar — uses CSS var so it works with both standard and tall navbar */
    <div className="container px-3 px-md-4 pb-5" style={{ maxWidth: 1000, paddingTop: "calc(var(--navbar-height, 100px) + 24px)" }}>
      <div className="mb-4">
        <h1 className="fw-bold mb-1 fs-3 fs-md-1" style={{ color: "#1e3a5f" }}>
          <i className="bi bi-calculator me-2" />Concrete Calculator
        </h1>
        <p className="text-muted mb-0">
          Calculate concrete volumes, cement quantities, and indicative project costs.
        </p>
      </div>
      <CalculatorInner config={config} />
    </div>
  );
}
