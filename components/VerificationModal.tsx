"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const TIMER_SECONDS = 15;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (method: "email" | "keypad") => void;
  /** Pre-fill email — also disables the email input if provided */
  email?: string;
  /** Purpose token passed to /api/otp/send — e.g. "cta-form" or "form-page" */
  purpose?: string;
  /** Action label shown in the header: "Verify to <context>" */
  context?: string;
}

export default function VerificationModal({
  isOpen,
  onClose,
  onVerified,
  email,
  purpose = "verification",
  context = "continue",
}: VerificationModalProps) {
  // Auto-select method based on screen width; re-evaluated each open
  const [method, setMethod] = useState<"email" | "keypad">("email");

  // ── Email method state ──
  const [emailInput, setEmailInput] = useState(email || "");
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // ── Keypad method state ──
  const [kpOtp, setKpOtp] = useState(generateOtp);
  const [kpKeys, setKpKeys] = useState<number[]>(() => shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
  const [entered, setEntered] = useState("");
  const [kpError, setKpError] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const verifyingRef = useRef(false);

  // Re-detect screen size and reset all state on each open
  useEffect(() => {
    if (!isOpen) return;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    setMethod(isMobile ? "keypad" : "email");
    // Email reset
    setEmailInput(email || "");
    setOtpSent(false);
    setSending(false);
    setSendError(null);
    setDigits(["", "", "", "", "", ""]);
    setVerifyError(null);
    setVerifying(false);
    setResendCooldown(0);
    // Keypad reset
    setKpOtp(generateOtp());
    setKpKeys(shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
    setEntered("");
    setKpError(false);
    setShuffling(false);
    setTimeLeft(TIMER_SECONDS);
    verifyingRef.current = false;
  }, [isOpen, email]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Focus first digit input after OTP is sent
  useEffect(() => {
    if (otpSent && !sending && method === "email") {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [otpSent, sending, method]);

  const reshuffleKeys = useCallback(() => {
    setShuffling(true);
    setTimeout(() => {
      setKpKeys(shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
      setShuffling(false);
    }, 180);
  }, []);

  // Keypad countdown — reshuffles on zero
  useEffect(() => {
    if (!isOpen || method !== "keypad") return;
    if (timeLeft <= 0) {
      reshuffleKeys();
      setTimeLeft(TIMER_SECONDS);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, reshuffleKeys, isOpen, method]);

  // Keypad auto-verify once 6 digits entered
  useEffect(() => {
    if (!isOpen || method !== "keypad") return;
    if (entered.length !== 6 || verifyingRef.current) return;
    verifyingRef.current = true;
    if (entered === kpOtp) {
      setTimeout(() => onVerified("keypad"), 300);
    } else {
      setKpError(true);
      setTimeout(() => {
        setKpError(false);
        setEntered("");
        reshuffleKeys();
        setTimeLeft(TIMER_SECONDS);
        verifyingRef.current = false;
      }, 800);
    }
  }, [entered, kpOtp, onVerified, reshuffleKeys, isOpen, method]);

  const sendOtp = useCallback(async () => {
    const addr = emailInput.trim();
    if (!addr) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addr, purpose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setOtpSent(true);
      setResendCooldown(30);
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setSending(false);
    }
  }, [emailInput, purpose]);

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setVerifyError(null);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length < 6) { setVerifyError("Please enter all 6 digits."); return; }
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim(), code, purpose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      onVerified("email");
    } catch (err: unknown) {
      setVerifyError(err instanceof Error ? err.message : "Verification failed");
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setVerifying(false);
    }
  };

  const switchTo = (m: "email" | "keypad") => {
    setMethod(m);
    if (m === "keypad") {
      setKpOtp(generateOtp());
      setKpKeys(shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
      setEntered("");
      setKpError(false);
      setTimeLeft(TIMER_SECONDS);
      verifyingRef.current = false;
    } else {
      setDigits(["", "", "", "", "", ""]);
      setVerifyError(null);
    }
  };

  if (!isOpen) return null;

  const code = digits.join("");
  const kpGridDigits = kpKeys.slice(0, 9);
  const kpLastDigit = kpKeys[9];
  const timerPct = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor = timeLeft <= 5 ? "#ef4444" : timeLeft <= 10 ? "#f59e0b" : "#3b82f6";

  return (
    <div
      className="modal d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1200 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down"
        style={{ maxWidth: 420 }}
      >
        <div className="modal-content shadow-lg border-0" style={{ borderRadius: 16 }}>
          {/* Header */}
          <div className="modal-header border-0 pb-0">
            <div className="d-flex align-items-center gap-2">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style={{ width: 32, height: 32, background: "#eff6ff" }}
              >
                <i className="bi bi-shield-lock text-primary" style={{ fontSize: 15 }} />
              </div>
              <span className="fw-semibold" style={{ fontSize: 15 }}>
                Verify to {context}
              </span>
            </div>
            <button
              type="button"
              className="btn-close ms-auto"
              onClick={onClose}
              aria-label="Close"
            />
          </div>

          <div className="modal-body px-4 pb-4 pt-3">
            {method === "email" ? (
              /* ── Email OTP ── */
              <div>
                {!otpSent ? (
                  <div className="text-center">
                    <p className="text-muted mb-3" style={{ fontSize: 14 }}>
                      We&apos;ll send a 6-digit code to your email address.
                    </p>
                    <input
                      type="email"
                      className="form-control mb-3 text-center"
                      placeholder="your@email.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      disabled={!!email || sending}
                      onKeyDown={(e) => { if (e.key === "Enter") sendOtp(); }}
                    />
                    {sendError && (
                      <div className="alert alert-danger py-2 mb-3" style={{ fontSize: 13 }}>
                        <i className="bi bi-exclamation-triangle me-1" />
                        {sendError}
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary w-100"
                      onClick={sendOtp}
                      disabled={!emailInput.trim() || sending}
                    >
                      {sending ? (
                        <><span className="spinner-border spinner-border-sm me-2" />Sending…</>
                      ) : (
                        <><i className="bi bi-send me-2" />Send Code</>
                      )}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-muted text-center mb-3" style={{ fontSize: 14 }}>
                      Code sent to <strong>{emailInput}</strong>
                    </p>
                    {sendError && (
                      <div className="alert alert-danger py-2 mb-3" style={{ fontSize: 13 }}>
                        {sendError}
                      </div>
                    )}
                    <div className="d-flex justify-content-center gap-2 mb-3">
                      {digits.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { inputRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleDigitChange(i, e.target.value)}
                          onKeyDown={(e) => {
                            handleKeyDown(i, e);
                            if (e.key === "Enter" && code.length === 6) handleVerify();
                          }}
                          onPaste={handlePaste}
                          disabled={verifying}
                          className={`form-control text-center fw-bold p-0 ${verifyError ? "is-invalid" : ""}`}
                          style={{ width: 46, height: 54, fontSize: 22, borderRadius: 8 }}
                        />
                      ))}
                    </div>
                    {verifyError && (
                      <div className="text-danger text-center mb-3" style={{ fontSize: 13 }}>
                        <i className="bi bi-x-circle me-1" />{verifyError}
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary w-100 mb-3"
                      onClick={handleVerify}
                      disabled={code.length < 6 || verifying}
                    >
                      {verifying ? (
                        <><span className="spinner-border spinner-border-sm me-2" />Verifying…</>
                      ) : (
                        <><i className="bi bi-check-lg me-2" />Verify Code</>
                      )}
                    </button>
                    <div className="text-center text-muted" style={{ fontSize: 13 }}>
                      Didn&apos;t receive it?{" "}
                      {resendCooldown > 0 ? (
                        <span>Resend in {resendCooldown}s</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-link p-0 border-0 text-primary"
                          style={{ fontSize: 13 }}
                          onClick={sendOtp}
                          disabled={sending}
                        >
                          {sending ? "Sending…" : "Resend code"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-center mt-3 pt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-muted"
                    style={{ fontSize: 12, minHeight: 44, display: "inline-flex", alignItems: "center" }}
                    onClick={() => switchTo("keypad")}
                  >
                    No email access? Use keypad instead →
                  </button>
                </div>
              </div>
            ) : (
              /* ── Shuffled Keypad ── */
              <div>
                <p className="text-muted text-center mb-2" style={{ fontSize: 13 }}>
                  Enter this code using the keypad below
                </p>

                {/* OTP display */}
                <div className="d-flex justify-content-center gap-1 mb-3">
                  {kpOtp.split("").map((digit, i) => (
                    <div
                      key={i}
                      className="d-flex align-items-center justify-content-center fw-bold"
                      style={{
                        width: 38, height: 44,
                        background: "#f8faff",
                        border: "1.5px solid #dbeafe",
                        borderRadius: 8,
                        fontSize: 22,
                        color: "#1d4ed8",
                      }}
                    >
                      {digit}
                    </div>
                  ))}
                </div>

                {/* Entry progress dots */}
                <div className="d-flex justify-content-center gap-2 mb-2">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div
                      key={i}
                      style={{
                        width: 12, height: 12,
                        borderRadius: "50%",
                        background: kpError
                          ? "#ef4444"
                          : i < entered.length
                          ? "#2563eb"
                          : "#e2e8f0",
                        transition: "background 120ms ease",
                      }}
                    />
                  ))}
                </div>

                <div
                  className="text-center mb-2"
                  style={{ fontSize: 12, color: "#ef4444", minHeight: 18, opacity: kpError ? 1 : 0 }}
                >
                  Incorrect — try again
                </div>

                {/* 3×4 keypad grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 8,
                    opacity: shuffling ? 0.3 : 1,
                    transition: "opacity 180ms ease",
                  }}
                >
                  {kpGridDigits.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        if (entered.length >= 6 || verifyingRef.current) return;
                        setEntered((s) => s + String(d));
                      }}
                      className="btn"
                      style={{
                        height: 52, fontSize: 20, fontWeight: 600,
                        background: "#f1f5f9", border: "1px solid #e2e8f0",
                        borderRadius: 10, color: "#1e293b",
                        transition: "background 100ms",
                      }}
                      onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#dbeafe"; }}
                      onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
                    >
                      {d}
                    </button>
                  ))}

                  {/* Row 4: ← | last digit | empty */}
                  <button
                    type="button"
                    onClick={() => {
                      if (verifyingRef.current) return;
                      setEntered((s) => s.slice(0, -1));
                      setKpError(false);
                    }}
                    className="btn"
                    style={{
                      height: 52, fontSize: 18,
                      background: "#fff", border: "1px solid #e2e8f0",
                      borderRadius: 10, color: "#64748b",
                    }}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (entered.length >= 6 || verifyingRef.current) return;
                      setEntered((s) => s + String(kpLastDigit));
                    }}
                    className="btn"
                    style={{
                      height: 52, fontSize: 20, fontWeight: 600,
                      background: "#f1f5f9", border: "1px solid #e2e8f0",
                      borderRadius: 10, color: "#1e293b",
                      transition: "background 100ms",
                    }}
                    onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#dbeafe"; }}
                    onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
                  >
                    {kpLastDigit}
                  </button>
                  <div />
                </div>

                {/* Shuffle countdown bar */}
                <div className="mt-3">
                  <div style={{ height: 3, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%", width: `${timerPct}%`,
                        background: timerColor, borderRadius: 99,
                        transition: "width 1s linear, background 500ms ease",
                      }}
                    />
                  </div>
                  <p className="text-muted text-center mt-1 mb-0" style={{ fontSize: 11 }}>
                    Keypad shuffles in {timeLeft}s
                  </p>
                </div>

                <div className="text-center mt-3 pt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-muted"
                    style={{ fontSize: 12, minHeight: 44, display: "inline-flex", alignItems: "center" }}
                    onClick={() => switchTo("email")}
                  >
                    Have email access? Switch to email →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
