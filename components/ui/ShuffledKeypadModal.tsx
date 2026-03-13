"use client";

/**
 * ShuffledKeypadModal — human verification via a shuffled 10-key numeric pad.
 *
 * Flow:
 *  1. On mount, generate a random 6-digit OTP and display it to the user.
 *  2. The 10-key pad (0–9) has its digit positions shuffled randomly.
 *  3. A countdown timer (TIMER_SECONDS) reshuffles the key positions when it expires.
 *  4. User taps keys to enter the OTP. Auto-verifies on the 6th digit.
 *  5. Correct entry → onVerified(). Wrong entry → clear & reshuffle.
 */

import { useState, useEffect, useCallback, useRef } from "react";

const TIMER_SECONDS = 15;

/** Fisher-Yates shuffle */
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

interface Props {
  onVerified: () => void;
  onCancel: () => void;
}

export default function ShuffledKeypadModal({ onVerified, onCancel }: Props) {
  const [otp] = useState(() => generateOtp());
  const [keys, setKeys] = useState<number[]>(() => shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
  const [entered, setEntered] = useState("");
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [error, setError] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const verifyingRef = useRef(false);

  /** Reshuffle key positions with a brief fade transition */
  const reshuffleKeys = useCallback(() => {
    setShuffling(true);
    setTimeout(() => {
      setKeys(shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
      setShuffling(false);
    }, 180);
  }, []);

  /** Countdown timer — reshuffles and resets when it hits 0 */
  useEffect(() => {
    if (timeLeft <= 0) {
      reshuffleKeys();
      setTimeLeft(TIMER_SECONDS);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, reshuffleKeys]);

  /** Verify entry once 6 digits have been entered */
  useEffect(() => {
    if (entered.length !== 6 || verifyingRef.current) return;
    verifyingRef.current = true;

    if (entered === otp) {
      // Brief pause so user sees the 6th dot fill, then proceed
      setTimeout(() => onVerified(), 300);
    } else {
      setError(true);
      setTimeout(() => {
        setError(false);
        setEntered("");
        reshuffleKeys();
        setTimeLeft(TIMER_SECONDS);
        verifyingRef.current = false;
      }, 800);
    }
  }, [entered, otp, onVerified, reshuffleKeys]);

  const handleDigit = (d: number) => {
    if (entered.length >= 6 || verifyingRef.current) return;
    setEntered((s) => s + String(d));
  };

  const handleBackspace = () => {
    if (verifyingRef.current) return;
    setEntered((s) => s.slice(0, -1));
    setError(false);
  };

  // Build 3×4 grid: first 9 cells = digits at positions 0-8,
  // row4: backspace | digit[9] | empty
  // Layout: [keys[0..8]] in rows of 3, then [← | keys[9] | (empty)]
  const gridDigits = keys.slice(0, 9);
  const lastDigit = keys[9];

  const timerPct = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor = timeLeft <= 5 ? "#ef4444" : timeLeft <= 10 ? "#f59e0b" : "#3b82f6";

  return (
    <div
      className="modal d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1200 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 340 }}>
        <div className="modal-content shadow-lg border-0" style={{ borderRadius: 16 }}>

          {/* Header */}
          <div className="d-flex align-items-center justify-content-between px-4 pt-3 pb-0">
            <div className="d-flex align-items-center gap-2">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 32, height: 32, background: "#eff6ff" }}
              >
                <i className="bi bi-shield-lock text-primary" style={{ fontSize: 15 }} />
              </div>
              <span className="fw-semibold" style={{ fontSize: 15 }}>Human check</span>
            </div>
            <button type="button" className="btn-close" onClick={onCancel} aria-label="Close" />
          </div>

          <div className="px-4 pb-4 pt-3">

            {/* OTP display */}
            <div className="text-center mb-1">
              <p className="text-muted mb-2" style={{ fontSize: 12 }}>
                Enter this code using the keypad below
              </p>
              <div className="d-flex justify-content-center gap-1 mb-3">
                {otp.split("").map((digit, i) => (
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
                      letterSpacing: 0,
                    }}
                  >
                    {digit}
                  </div>
                ))}
              </div>
            </div>

            {/* Entry dots */}
            <div className="d-flex justify-content-center gap-2 mb-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    width: 12, height: 12,
                    borderRadius: "50%",
                    background: error
                      ? "#ef4444"
                      : i < entered.length
                      ? "#2563eb"
                      : "#e2e8f0",
                    transition: "background 120ms ease",
                  }}
                />
              ))}
            </div>

            {/* Error message */}
            <div
              className="text-center mb-2"
              style={{
                fontSize: 12,
                color: "#ef4444",
                minHeight: 18,
                transition: "opacity 150ms",
                opacity: error ? 1 : 0,
              }}
            >
              Incorrect — try again
            </div>

            {/* Keypad */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                opacity: shuffling ? 0.3 : 1,
                transition: "opacity 180ms ease",
              }}
            >
              {/* Rows 1–3: 9 shuffled digits */}
              {gridDigits.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDigit(d)}
                  className="btn"
                  style={{
                    height: 52,
                    fontSize: 20,
                    fontWeight: 600,
                    background: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    color: "#1e293b",
                    transition: "background 100ms",
                  }}
                  onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#dbeafe"; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
                >
                  {d}
                </button>
              ))}

              {/* Row 4: backspace | last digit | empty */}
              <button
                type="button"
                onClick={handleBackspace}
                className="btn"
                style={{
                  height: 52,
                  fontSize: 18,
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  color: "#64748b",
                }}
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => handleDigit(lastDigit)}
                className="btn"
                style={{
                  height: 52,
                  fontSize: 20,
                  fontWeight: 600,
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  color: "#1e293b",
                  transition: "background 100ms",
                }}
                onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#dbeafe"; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
              >
                {lastDigit}
              </button>
              {/* Empty cell */}
              <div />
            </div>

            {/* Timer bar */}
            <div className="mt-3" style={{ position: "relative" }}>
              <div
                style={{
                  height: 3,
                  background: "#f1f5f9",
                  borderRadius: 99,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${timerPct}%`,
                    background: timerColor,
                    borderRadius: 99,
                    transition: "width 1s linear, background 500ms ease",
                  }}
                />
              </div>
              <p className="text-muted text-center mt-1 mb-0" style={{ fontSize: 11 }}>
                Keypad shuffles in {timeLeft}s
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
