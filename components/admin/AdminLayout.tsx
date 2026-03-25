"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import { ToastProvider } from "./ToastProvider";
import TokenRefresher from "./TokenRefresher";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      {/* Auto-refresh authentication tokens */}
      <TokenRefresher />

      <div className="d-flex admin-layout" style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
        {/* Mobile overlay — closes sidebar when tapping outside */}
        {sidebarOpen && (
          <div
            className="d-md-none"
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
              zIndex: 1099,
            }}
          />
        )}

        {/* Sidebar — always visible on md+, drawer on mobile */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <div
          style={{
            marginLeft: "260px",
            flex: 1,
            // On mobile the sidebar is a drawer overlay, so no margin needed
            minWidth: 0,
          }}
          className="admin-main-content"
        >
          {/* Header */}
          <div className="bg-white border-bottom">
            <div className="container-fluid px-3 px-md-4 d-flex align-items-center justify-content-between gap-2" style={{ minHeight: "72px" }}>
                {/* Mobile hamburger */}
                <button
                  className="btn btn-sm btn-outline-secondary d-md-none flex-shrink-0"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open sidebar"
                  style={{ width: "38px", height: "38px", padding: 0 }}
                >
                  <i className="bi bi-list fs-5"></i>
                </button>

                <div className="flex-grow-1 min-w-0">
                  {title && <h1 className="h4 h3-md mb-0 text-truncate">{title}</h1>}
                  {subtitle && <p className="text-muted mb-0 d-none d-sm-block small">{subtitle}</p>}
                </div>

                {actions && <div className="flex-shrink-0">{actions}</div>}
            </div>
          </div>

          {/* Page Content */}
          <div className="container-fluid p-3 p-md-4">{children}</div>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .admin-main-content {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </ToastProvider>
  );
}
