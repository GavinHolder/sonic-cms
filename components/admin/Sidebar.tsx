"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import UpdateBadge from "@/components/admin/UpdateBadge";
import UpdateModal from "@/components/admin/UpdateModal";

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
    id: "forms",
    label: "Form Inbox",
    icon: "bi-inbox",
    href: "/admin/forms",
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
    href: "/admin/features",
    subItems: [], // populated dynamically from enabledFeatures state
  },
  {
    id: "activity",
    label: "Activity Log",
    icon: "bi-clock-history",
    href: "/admin/activity",
  },
  {
    id: "redirects",
    label: "Redirects",
    icon: "bi-signpost-split",
    href: "/admin/redirects",
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
        id: "site-config",
        label: "Site Config",
        icon: "bi-building",
        href: "/admin/settings/site-config",
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

// Map slug → sidebar sub-item definition
const FEATURE_SUB_ITEMS: Record<string, SubMenuItem> = {
  "concrete-calculator": { id: "concrete-settings", label: "Concrete Calculator", icon: "bi-calculator", href: "/admin/features/concrete-settings" },
  "coverage-maps":       { id: "coverage-maps",     label: "Coverage Maps",       icon: "bi-map",        href: "/admin/features/coverage-maps" },
  "projects":            { id: "projects",           label: "Projects",            icon: "bi-building",   href: "/admin/features/projects" },
};

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(["content"]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [contentTypes, setContentTypes] = useState<{ slug: string; pluralName: string; icon: string }[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateModalInfo, setUpdateModalInfo] = useState<Parameters<typeof UpdateModal>[0]["info"]>(null);

  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => r.json())
      .then(({ data }) => {
        setLogoUrl(data?.logoUrl ?? "");
        setCompanyName(data?.companyName ?? "Your Company");
      })
      .catch(() => {
        setLogoUrl("");
        setCompanyName("Your Company");
      });
  }, []);

  useEffect(() => {
    fetch("/api/features")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setEnabledFeatures(
            (d.data as { slug: string; enabled: boolean }[])
              .filter((f) => f.enabled)
              .map((f) => f.slug)
          );
        }
      })
      .catch(() => {});
  }, [pathname]); // re-fetch on nav so toggling a feature updates sidebar immediately

  // Fetch content types for dynamic sidebar entries
  useEffect(() => {
    fetch("/api/admin/content-types")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.success && Array.isArray(d.data)) {
          setContentTypes(d.data.map((ct: { slug: string; pluralName: string; icon: string }) => ({
            slug: ct.slug, pluralName: ct.pluralName, icon: ct.icon,
          })));
        }
      })
      .catch(() => {});
  }, [pathname]);

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
    // Exact-match-only hrefs: leaf settings pages that share a common prefix
    const exactOnly = ["/admin/settings"];
    if (exactOnly.includes(href)) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const hasActiveChild = (subItems?: SubMenuItem[]) => {
    if (!subItems) return false;
    return subItems.some((item) => isActive(item.href));
  };

  // Build resolved menu items with dynamic content types injected into Content submenu
  const resolvedMenuItems = menuItems.map(item => {
    if (item.id === "content" && contentTypes.length > 0) {
      const dynamicItems: SubMenuItem[] = contentTypes.map(ct => ({
        id: `ct-${ct.slug}`,
        label: ct.pluralName,
        icon: ct.icon,
        href: `/admin/content/${ct.slug}`,
      }));
      // Add separator-like "Content Types" management link at the end
      const manageItem: SubMenuItem = {
        id: "content-types-manage",
        label: "Manage Types",
        icon: "bi-gear",
        href: "/admin/content-types",
      };
      return {
        ...item,
        subItems: [...(item.subItems || []), ...dynamicItems, manageItem],
      };
    }
    return item;
  });

  return (
    <>
      <style>{`
        .admin-sidebar {
          width: 260px;
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          overflow-y: auto;
          z-index: 1030;
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
        className="d-flex align-items-center px-3 mb-0 text-decoration-none border-bottom"
        style={{ minHeight: "72px" }}
      >
        {companyName === null ? null : logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={companyName} style={{ height: "36px", maxWidth: "180px", objectFit: "contain" }} />
        ) : (
          <span className="fw-semibold text-body-emphasis" style={{ fontSize: "0.9375rem" }}>{companyName}</span>
        )}
      </Link>

      {/* Navigation */}
      <ul className="nav nav-pills flex-column mb-auto p-2">
        {resolvedMenuItems.map((item) => {
          // Dynamically inject enabled feature sub-items
          const effectiveItem = item.id === "features"
            ? {
                ...item,
                subItems: [
                  { id: "manage-features", label: "Manage Features", icon: "bi-sliders", href: "/admin/features" },
                  ...enabledFeatures
                    .filter((slug) => FEATURE_SUB_ITEMS[slug])
                    .map((slug) => FEATURE_SUB_ITEMS[slug]),
                ],
              }
            : item;
          const item2 = effectiveItem;
          return (
          <li key={item2.id} className="nav-item">
            {item2.subItems ? (
              <>
                <button
                  onClick={() => toggleExpanded(item2.id)}
                  className={`nav-link d-flex align-items-center w-100 border-0 text-start ${
                    hasActiveChild(item2.subItems)
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
                  <i className={`bi ${item2.icon} me-2`} style={{ width: "20px" }}></i>
                  <span className="flex-grow-1">{item2.label}</span>
                  <i
                    className={`bi bi-chevron-${expandedItems.includes(item2.id) ? "down" : "right"}`}
                    style={{ fontSize: "0.75rem", opacity: 0.5 }}
                  ></i>
                </button>

                {expandedItems.includes(item2.id) && (
                  <ul className="nav flex-column ms-3 ps-1 border-start" style={{ borderColor: "#dee2e6 !important" }}>
                    {item2.subItems.map((subItem) => (
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
                href={item2.href || "#"}
                className={`nav-link d-flex align-items-center ${
                  isActive(item2.href) ? "active" : "link-body-emphasis"
                }`}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
              >
                <i className={`bi ${item2.icon} me-2`} style={{ width: "20px" }}></i>
                {item2.label}
              </Link>
            )}
          </li>
          );
        })}
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
        <div className="d-flex justify-content-center mt-2">
          <UpdateBadge
            onOpenModal={(info) => {
              setUpdateModalInfo(info as Parameters<typeof UpdateModal>[0]["info"]);
              setShowUpdateModal(true);
            }}
          />
        </div>
      </div>
    </div>
    <UpdateModal
      show={showUpdateModal}
      info={updateModalInfo}
      onClose={() => setShowUpdateModal(false)}
    />
    </>
  );
}
