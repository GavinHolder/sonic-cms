import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function SeoWidget() {
  const lastRun = await prisma.seoEngineRun.findFirst({ orderBy: { runAt: "desc" } });

  if (!lastRun) return (
    <div className="card border-0 shadow-sm">
      <div className="card-body d-flex align-items-center gap-3 py-3">
        <div className="d-flex align-items-center justify-content-center rounded-circle bg-secondary bg-opacity-10 flex-shrink-0" style={{width:48,height:48}}>
          <i className="bi bi-robot text-secondary fs-4" />
        </div>
        <div className="flex-grow-1">
          <h6 className="mb-1 fw-bold">SEO Engine</h6>
          <p className="mb-0 text-muted small">No runs yet. Visit SEO → Overview to start.</p>
        </div>
        <Link href="/admin/content/seo?tab=overview" className="btn btn-outline-secondary btn-sm flex-shrink-0">Go to SEO</Link>
      </div>
    </div>
  );

  const issues = (lastRun.issues as Array<{severity:string}>) ?? [];
  const errors  = issues.filter(i=>i.severity==="error").length;
  const warns   = issues.filter(i=>i.severity==="warning").length;
  const hoursAgo = Math.round((Date.now() - new Date(lastRun.runAt).getTime()) / 3_600_000);
  const col = errors > 0 ? "danger" : warns > 0 ? "warning" : "success";
  const icon = errors > 0 ? "bi-exclamation-circle-fill" : warns > 0 ? "bi-exclamation-triangle-fill" : "bi-check-circle-fill";

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body d-flex align-items-center gap-3 py-3">
        <div className={`d-flex align-items-center justify-content-center rounded-circle bg-${col} bg-opacity-10 flex-shrink-0`} style={{width:48,height:48}}>
          <i className={`bi ${icon} text-${col} fs-4`} />
        </div>
        <div className="flex-grow-1">
          <h6 className="mb-1 fw-bold">SEO Health</h6>
          <p className="mb-0 text-muted small">
            {errors > 0 && <span className="text-danger fw-semibold">{errors} errors </span>}
            {warns > 0  && <span className="text-warning fw-semibold">{warns} warnings </span>}
            {errors === 0 && warns === 0 && <span className="text-success">All clear </span>}
            · {lastRun.pagesAutoFilled} auto-filled · {hoursAgo}h ago
          </p>
        </div>
        <Link href="/admin/content/seo?tab=overview" className={`btn btn-outline-${col} btn-sm flex-shrink-0`}>
          {errors > 0 ? `Fix ${errors} issues` : "View SEO"}
        </Link>
      </div>
    </div>
  );
}
