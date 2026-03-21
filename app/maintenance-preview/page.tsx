"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import MaintenancePage, { type MaintenanceTemplate, type MaintenanceTheme } from "@/components/MaintenancePage";

function Preview() {
  const params = useSearchParams();

  const theme: MaintenanceTheme = {
    template:     (params.get("template") as MaintenanceTemplate) || "plain",
    logoUrl:      params.get("logo")        || undefined,
    companyName:  params.get("company")     || undefined,
    customImage:  params.get("customImage") || undefined,
    primaryColor: params.get("primary")     || undefined,
    darkColor:    params.get("dark")        || undefined,
    lightColor:   params.get("light")       || undefined,
  };

  return <MaintenancePage theme={theme} />;
}

export default function MaintenancePreviewPage() {
  return (
    <Suspense>
      <Preview />
    </Suspense>
  );
}
