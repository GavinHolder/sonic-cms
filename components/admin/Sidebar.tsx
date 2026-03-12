"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

interface SubMenuItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  href?: string;
  subItems?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "bi-speedometer2",
    href: "/admin/dashboard",
  },
  {
    id: "content",
    label: "Content",
    icon: "bi-file-earmark-text",
    subItems: [
      {
        id: "landing-page",
        label: "Landing Page",
        icon: "bi-house-door",
        href: "/admin/content/landing-page",
      },
      {
        id: "pages",
        label: "Pages",
        icon: "bi-files",
        href: "/admin/content/pages",
      },
      {
        id: "navbar",
        label: "Navbar",
        icon: "bi-compass",
        href: "/admin/content/navbar",
      },
      {
        id: "seo",
        label: "SEO",
        icon: "bi-search",
        href: "/admin/content/seo",
      },
    ],
  },
  {
    id: "media",
    label: "Media Library",
    icon: "bi-images",
    href: "/admin/media",
  },
  {
    id: "volt",
    label: "Volt Studio",
    icon: "bi-lightning-charge-fill",
    subItems: [
      { id: "volt-vector", label: "Vector Designs", icon: "bi-vector-pen", href: "/admin/volt" },
      { id: "volt-3d", label: "3D Assets", icon: "bi-box", href: "/admin/volt-3d" },
    ],
  },
  {
    id: "users",
    label: "Users",
    icon: "bi-people",
    href: "/admin/users",
  },
  {
    id: "features",
    label: "Features",
    icon: "bi-toggles",
    subItems: [
      {
        id: "concrete-settings",
        label: "Concrete Calculator",
        icon: "bi-calculator",
        href: "/admin/features/concrete-settings",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "bi-gear",
    subItems: [
      {
        id: "settings-general",
        label: "General",
        icon: "bi-sliders",
        href: "/admin/settings",
      },
      {
        id: "api-keys",
        label: "API Keys",
        icon: "bi-key",
        href: "/admin/settings/api-keys",
      },
    ],
  },
  {
    id: "documents",
    label: "Documentation",
    icon: "bi-book",
    href: "/admin/documents",
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(["content"]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    onClose?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const hasActiveChild = (subItems?: SubMenuItem[]) => {
    if (!subItems) return false;
    return subItems.some((item) => isActive(item.href));
  };

  return (
    <>
      <style>{`
        .admin-sidebar {
          width: 260px;
          min-height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          overflow-y: auto;
          z-index: 1045;
          transition: transform 0.25s ease;
        }
        @media (max-width: 767px) {
          .admin-sidebar {
            transform: translateX(-100%);
          }
          .admin-sidebar.sidebar-open {
            transform: translateX(0);
          }
        }
      `}</style>
    <div
      className={`admin-sidebar d-flex flex-column flex-shrink-0 bg-body-tertiary border-end${isOpen ? " sidebar-open" : ""}`}
    >
      {/* Mobile close button */}
      <button
        className="d-md-none btn btn-sm btn-link position-absolute text-secondary"
        style={{ top: "0.75rem", right: "0.75rem", zIndex: 1 }}
        onClick={onClose}
        aria-label="Close sidebar"
      >
        <i className="bi bi-x-lg fs-5"></i>
      </button>
      {/* Logo */}
      <Link
        href="/admin/dashboard"
        className="d-flex align-items-center p-3 mb-0 text-decoration-none border-bottom"
      >
        <img src="/images/logo-placeholder.svg" alt="CMS" style={{ height: "36px" }} />
      </Link>

      {/* Navigation */}
      <ul className="nav nav-pills flex-column mb-auto p-2">
        {menuItems.map((item) => (
          <li key={item.id} className="nav-item">
            {item.subItems ? (
              <>
                <button
                  onClick={() => toggleExpanded(item.id)}
                  className={`nav-link d-flex align-items-center w-100 border-0 text-start ${
                    hasActiveChild(item.subItems)
                      ? "text-primary fw-semibold"
                      : "link-body-emphasis"
                  }`}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.375rem",
                    background: "transparent",
                    fontSize: "0.875rem",
                  }}
                >
                  <i className={`bi ${item.icon} me-2`} style={{ width: "20px" }}></i>
                  <span className="flex-grow-1">{item.label}</span>
                  <i
                    className={`bi bi-chevron-${expandedItems.includes(item.id) ? "down" : "right"}`}
                    style={{ fontSize: "0.75rem", opacity: 0.5 }}
                  ></i>
                </button>

                {expandedItems.includes(item.id) && (
                  <ul className="nav flex-column ms-3 ps-1 border-start" style={{ borderColor: "#dee2e6 !important" }}>
                    {item.subItems.map((subItem) => (
                      <li key={subItem.id} className="nav-item">
                        <Link
                          href={subItem.href}
                          className={`nav-link d-flex align-items-center ${
                            isActive(subItem.href)
                              ? "active"
                              : "link-body-emphasis"
                          }`}
                          style={{
                            padding: "0.375rem 0.75rem",
                            borderRadius: "0.375rem",
                            fontSize: "0.8125rem",
                          }}
                        >
                          <i className={`bi ${subItem.icon} me-2`} style={{ width: "18px", fontSize: "0.875rem" }}></i>
                          {subItem.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <Link
                href={item.href || "#"}
                className={`nav-link d-flex align-items-center ${
                  isActive(item.href) ? "active" : "link-body-emphasis"
                }`}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
              >
                <i className={`bi ${item.icon} me-2`} style={{ width: "20px" }}></i>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>

      {/* Divider */}
      <hr className="mx-3 my-0" />

      {/* User Section */}
      <div className="p-3">
        <div className="d-flex align-items-center gap-2 mb-2">
          <div
            className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-semibold flex-shrink-0"
            style={{ width: "32px", height: "32px", fontSize: "0.8125rem" }}
          >
            A
          </div>
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <div className="fw-semibold text-truncate" style={{ fontSize: "0.8125rem" }}>
              Admin User
            </div>
            <div className="text-body-secondary text-truncate" style={{ fontSize: "0.6875rem" }}>
              Super Admin
            </div>
          </div>
        </div>
        <Link
          href="/admin/login"
          className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-1"
        >
          <i className="bi bi-box-arrow-right"></i>
          Logout
        </Link>
      </div>
    </div>
    </>
  );
}
