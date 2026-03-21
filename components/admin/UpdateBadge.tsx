"use client";

import { useEffect, useState, useCallback } from "react";

interface UpdateInfo {
  localVersion: string;
  upstreamVersion: string | null;
  upstreamDate?: string;
  updateAvailable: boolean;
  changelog: { features: string[]; bugfixes: string[]; breaking: string[] } | null;
  updateStatus: "idle" | "in_progress" | "scheduled" | "failed" | "completed";
  scheduledTime: string | null;
  lastError: string | null;
  error?: string;
}

interface Props {
  onOpenModal: (info: UpdateInfo) => void;
}

export default function UpdateBadge({ onOpenModal }: Props) {
  const [info, setInfo] = useState<UpdateInfo | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/updates/check");
      if (!res.ok) return;
      const data = await res.json() as UpdateInfo;
      setInfo(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    check();
    // Poll every 60s normally; every 10s when update in progress
    const interval = setInterval(check, info?.updateStatus === "in_progress" ? 10_000 : 60_000);
    return () => clearInterval(interval);
  }, [check, info?.updateStatus]);

  if (!info) return null;

  const { updateStatus, updateAvailable, upstreamVersion, scheduledTime } = info;

  if (updateStatus === "in_progress") {
    return (
      <span className="badge bg-warning text-dark d-flex align-items-center gap-2 px-3 py-2" style={{ fontSize: "0.78rem" }}>
        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
        Updating CMS...
      </span>
    );
  }

  if (updateStatus === "failed") {
    return (
      <button
        className="btn btn-sm btn-danger d-flex align-items-center gap-2"
        onClick={() => onOpenModal(info)}
        title={info.lastError ?? "Update failed"}
      >
        <i className="bi bi-exclamation-triangle-fill" />
        Update failed
      </button>
    );
  }

  if (updateStatus === "scheduled" && scheduledTime) {
    const time = new Date(scheduledTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return (
      <button
        className="btn btn-sm btn-outline-info d-flex align-items-center gap-2"
        onClick={() => onOpenModal(info)}
      >
        <i className="bi bi-clock" />
        Update scheduled {time}
      </button>
    );
  }

  if (updateAvailable && upstreamVersion) {
    return (
      <button
        className="btn btn-sm btn-primary d-flex align-items-center gap-2"
        onClick={() => onOpenModal(info)}
      >
        <i className="bi bi-arrow-up-circle-fill" />
        Update available v{upstreamVersion}
      </button>
    );
  }

  // Up to date — show subtle indicator
  return (
    <span className="text-muted small d-flex align-items-center gap-1" title={`CMS v${info.localVersion}`}>
      <i className="bi bi-check-circle text-success" />
      v{info.localVersion}
    </span>
  );
}
