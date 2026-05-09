"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HomepageClient from "@/app/HomepageClient";

export default function PreviewLandingPageClient() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [badgeDismissed, setBadgeDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" }).then((res) => {
      if (!res.ok) {
        router.replace(
          "/admin/login?redirect=" +
            encodeURIComponent("/preview/landing-page")
        );
      } else {
        setAuthed(true);
      }
    });
  }, [router]);

  if (!authed) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: "100vh" }}
      >
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading page content...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <HomepageClient />

      {!badgeDismissed && (
        <div
          style={{
            position: "fixed",
            top: "1rem",
            right: "1rem",
            zIndex: 2000,
          }}
        >
          <span className="badge bg-warning text-dark d-flex align-items-center gap-2 px-3 py-2 shadow">
            <i className="bi bi-eye"></i>
            Preview Mode — not live
            <button
              type="button"
              className="btn-close btn-close-dark ms-1"
              style={{ fontSize: "0.65rem" }}
              aria-label="Dismiss"
              onClick={() => setBadgeDismissed(true)}
            />
          </span>
        </div>
      )}
    </>
  );
}
