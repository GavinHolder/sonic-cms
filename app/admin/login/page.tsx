"use client";

import { useState } from "react";
import Link from "next/link";
import { AUTH_CONFIG, MOCK_USER, type Session } from "@/lib/auth-config";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validation
    if (!username || !password) {
      setError("Please enter both username and password");
      setIsLoading(false);
      return;
    }

    try {
      // Call real authentication API
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies
        body: JSON.stringify({
          username,
          password,
          rememberMe,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log("Login successful!", data);

        // Store user info in localStorage for UI purposes
        const session: Session = {
          user: data.data.user,
          token: data.data.accessToken,
          expiresAt: Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 4 * 60 * 60 * 1000),
        };

        localStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(session));

        if (rememberMe) {
          localStorage.setItem("remember_me", "true");
        }

        // Redirect to dashboard
        window.location.href = "/admin/dashboard";
      } else {
        // Handle error
        const errorMessage =
          data.error?.message ||
          "Invalid username or password";
        setError(errorMessage);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please check your connection and try again.");
      setIsLoading(false);
    }
  };

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
            {/* Logo and Title */}
            <div className="text-center mb-4">
              <img
                src="/images/logo-placeholder.png"
                alt="Your Company"
                style={{ height: "60px", marginBottom: "1.5rem" }}
              />
              <h1 className="h3 mb-2 fw-normal">Admin Portal</h1>
              <p className="text-muted">Please sign in to continue</p>
            </div>

            {/* Login Card */}
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  {/* Error Message */}
                  {error && (
                    <div className="alert alert-danger" role="alert">
                      {error}
                    </div>
                  )}

                  {/* Username Field */}
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      className="form-control"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="admin"
                      required
                      autoComplete="username"
                    />
                  </div>

                  {/* Password Field */}
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">
                      Password
                    </label>
                    <div className="input-group">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? "👁️" : "👁️‍🗨️"}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="mb-3 d-flex justify-content-between align-items-center">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="rememberMe">
                        Remember me
                      </label>
                    </div>
                    <Link
                      href="/admin/forgot-password"
                      className="text-decoration-none"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {/* Login Button */}
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
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>

                {/* Additional Info */}
                <div className="text-center mt-3 pt-3 border-top">
                  <p className="text-muted small mb-0">
                    Need access?{" "}
                    <a
                      href="mailto:admin@yourcompany.co.za"
                      className="text-decoration-none"
                    >
                      Contact your administrator
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-4">
              <p className="text-muted small">
                All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
