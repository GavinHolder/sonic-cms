"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import NetworksManager from "@/components/admin/coverage/NetworksManager";

// Standalone route — kept working; the same manager also renders as a tab inside
// the Coverage Maps plugin admin.
export default function NetworksAdminPage() {
  return (
    <AdminLayout
      title="Networks & Packages"
      subtitle="Provider networks (FNO / WISP / Wireless) and their packages — linked to coverage polygons"
    >
      <NetworksManager />
    </AdminLayout>
  );
}
