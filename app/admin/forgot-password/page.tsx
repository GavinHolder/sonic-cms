"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // TODO: Implement actual password reset with backend API
    if (!email) {
      setError("Please enter your email address");
      setIsLoading(false);
      return;
    }

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);
      // TODO: Replace with actual password reset
      console.log("Password reset requested for:", email);
    }, 1000);
  };

  if (success) {
    return (
      <div
        className="d-flex align-items-center"
        style={{
          minHeight: "100vh",
          backgroundColor: "#f8f9fa",
          padding: "1rem",
        }}
      >
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card shadow-sm text-center">
                <div className="card-body p-4">
                  <div
                    className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: "4rem", height: "4rem", fontSize: "2rem" }}
                  >
                    ✓
                  </div>
                  <h2 className="h4 mb-3">Check Your Email</h2>
                  <p className="text-muted mb-4">
                    We've sent password reset instructions to <strong>{email}</strong>
                  </p>
                  <Link href="/admin/login" className="btn btn-outline-primary">
                    Back to Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="d-flex align-items-center"
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
        padding: "1rem",
      }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-6 col-lg-4">
            {/* Header */}
            <div className="text-center mb-4">
              <img
                src="/images/logo-placeholder.png"
                alt="Your Company"
                style={{ height: "60px", marginBottom: "1.5rem" }}
              />
              <h1 className="h3 mb-2 fw-normal">Forgot Password?</h1>
              <p className="text-muted">Enter your email to receive reset instructions</p>
            </div>

            {/* Form Card */}
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  {/* Error Message */}
                  {error && (
                    <div className="alert alert-danger" role="alert">
                      {error}
                    </div>
                  )}

                  {/* Email Field */}
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@yourcompany.co.za"
                      required
                    />
                  </div>

                  {/* Reset Button */}
                  <button
                    type="submit"
                    className="btn btn-outline-primary w-100"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </button>

                  {/* Back to Login */}
                  <div className="text-center mt-3">
                    <Link href="/admin/login" className="text-decoration-none">
                      ← Back to Login
                    </Link>
                  </div>
                </form>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-4">
              <p className="text-muted small">© 2026 Your Company. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
