"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import InfoCard from "@/components/admin/InfoCard";
import HelpText from "@/components/admin/HelpText";

export default function AdminDashboard() {
  return (
    <AdminLayout title="Dashboard" subtitle="Welcome back to Your Company CMS">
      <div style={{ maxWidth: "1320px" }}>
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
              value="12"
              icon="bi-file-earmark-text"
              description="Active pages"
              variant="primary"
              href="/admin/content/landing-page"
              trend={{ value: 8, direction: "up" }}
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <InfoCard
              title="Sections"
              value="47"
              icon="bi-columns-gap"
              description="Content sections"
              variant="info"
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <InfoCard
              title="Media Files"
              value="128"
              icon="bi-images"
              description="Images & videos"
              variant="success"
              href="/admin/media"
              trend={{ value: 12, direction: "up" }}
            />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <InfoCard
              title="Users"
              value="5"
              icon="bi-people"
              description="Active users"
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
