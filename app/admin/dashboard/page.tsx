import AdminLayout from "@/components/admin/AdminLayout";
import InfoCard from "@/components/admin/InfoCard";
import HelpText from "@/components/admin/HelpText";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [pageCount, sectionCount, mediaCount, userCount, setupFlag] = await Promise.all([
    prisma.page.count(),
    prisma.section.count(),
    prisma.mediaAsset.count(),
    prisma.user.count(),
    prisma.systemSettings.findUnique({ where: { key: "cms_setup_complete" } }),
  ]);

  const needsSetup = setupFlag?.value !== "true";

  return (
    <AdminLayout title="Dashboard" subtitle="Welcome back to your CMS">
      <div style={{ maxWidth: "1320px" }}>
        {/* Setup Banner — shown until first-run wizard is completed */}
        {needsSetup && (
          <div className="card border-warning shadow-sm mb-4">
            <div className="card-body d-flex align-items-center gap-3 py-3">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle bg-warning bg-opacity-10 flex-shrink-0"
                style={{ width: 48, height: 48 }}
              >
                <i className="bi bi-gear-wide-connected text-warning fs-4"></i>
              </div>
              <div className="flex-grow-1">
                <h6 className="mb-1 fw-bold">CMS Setup Required</h6>
                <p className="mb-0 text-muted small">
                  Your CMS hasn&apos;t been configured yet. Connect your GitHub repo and deployment
                  settings to enable updates and auto-deploy.
                </p>
              </div>
              <a href="/admin/setup" className="btn btn-warning btn-sm flex-shrink-0">
                <i className="bi bi-arrow-right me-1"></i>
                Run Setup
              </a>
            </div>
          </div>
        )}

        {/* Welcome Message */}
        <HelpText variant="info" collapsible={false}>
          <strong>Welcome to Your Company CMS!</strong>
          <div className="mt-2">
            This is your central hub for managing all website content. Use the navigation menu on
            the left to access different areas of the CMS. Need help? Check out the help icons
            throughout the interface or contact your administrator.
          </div>
        </HelpText>

        {/* Stats Cards */}
        <div className="row g-4 mb-4">
          <div className="col-12 col-sm-6 col-lg-3">
            <InfoCard
              title="Total Pages"
              value={String(pageCount)}
              icon="bi-file-earmark-text"
              description="Pages in CMS"
              variant="primary"
              href="/admin/content/landing-page"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <InfoCard
              title="Sections"
              value={String(sectionCount)}
              icon="bi-columns-gap"
              description="Content sections"
              variant="info"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <InfoCard
              title="Media Files"
              value={String(mediaCount)}
              icon="bi-images"
              description="Images & videos"
              variant="success"
              href="/admin/media"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <InfoCard
              title="Users"
              value={String(userCount)}
              icon="bi-people"
              description="Admin users"
              variant="warning"
              href="/admin/users"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-white d-flex align-items-center gap-2">
            <i className="bi bi-lightning-charge text-warning fs-5"></i>
            <h5 className="mb-0">Quick Actions</h5>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-12 col-md-6 col-lg-3">
                <a
                  href="/admin/content/landing-page"
                  className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2"
                  style={{ padding: "1rem" }}
                >
                  <i className="bi bi-house-door fs-5"></i>
                  <span>Landing Page</span>
                </a>
              </div>
              <div className="col-12 col-md-6 col-lg-3">
                <a
                  href="/admin/content/navbar"
                  className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2"
                  style={{ padding: "1rem" }}
                >
                  <i className="bi bi-compass fs-5"></i>
                  <span>Navigation</span>
                </a>
              </div>
              <div className="col-12 col-md-6 col-lg-3">
                <a
                  href="/admin/media"
                  className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2"
                  style={{ padding: "1rem" }}
                >
                  <i className="bi bi-cloud-arrow-up fs-5"></i>
                  <span>Upload Media</span>
                </a>
              </div>
              <div className="col-12 col-md-6 col-lg-3">
                <a
                  href="/admin/users"
                  className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2"
                  style={{ padding: "1rem" }}
                >
                  <i className="bi bi-person-plus fs-5"></i>
                  <span>Manage Users</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card shadow-sm">
          <div className="card-header bg-white d-flex align-items-center gap-2">
            <i className="bi bi-clock-history text-primary fs-5"></i>
            <h5 className="mb-0">Recent Activity</h5>
          </div>
          <div className="card-body">
            <div className="text-center py-5 text-muted">
              <i className="bi bi-journal-text display-1" style={{ opacity: 0.3 }}></i>
              <p className="mb-0 mt-3">No recent activity to display</p>
              <small>Your recent changes and updates will appear here</small>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
