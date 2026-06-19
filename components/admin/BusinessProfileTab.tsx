"use client";
import { useState, useEffect, useCallback } from "react";
import { useConfirm } from "@/components/admin/ConfirmProvider";
import type { GbpLocation, GbpBusinessInfo, GbpReview, GbpPost } from "@/lib/gbp-client";

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

function Stars({ r }: { r: string }) {
  const n = STARS[r] ?? 0;
  return <>{[1,2,3,4,5].map((i) => <i key={i} className={`bi bi-star${i<=n?"-fill":""} text-warning`} />)}</>;
}

export default function BusinessProfileTab() {
  const askConfirm = useConfirm();
  const [state, setState] = useState<"loading"|"disconnected"|"connected"|"error">("loading");
  const [email, setEmail] = useState("");
  const [locations, setLocations] = useState<GbpLocation[]>([]);
  const [locationId, setLocationId] = useState<string|null>(null);
  const [info, setInfo] = useState<GbpBusinessInfo|null>(null);
  const [reviews, setReviews] = useState<GbpReview[]>([]);
  const [posts, setPosts] = useState<GbpPost[]>([]);
  const [insights, setInsights] = useState<Array<{metric:string;value:number}>>([]);
  const [draft, setDraft] = useState({ summary: "", actionType: "", actionUrl: "" });
  const [posting, setPosting] = useState(false);
  const [postMsg, setPostMsg] = useState<string|null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/gbp/locations");
      const j = await r.json() as { connected?: boolean; locations?: GbpLocation[]; currentLocationId?: string; accountEmail?: string };
      if (j.connected === false || !j.locations) { setState("disconnected"); return; }
      setLocations(j.locations); setLocationId(j.currentLocationId ?? null); setEmail(j.accountEmail ?? ""); setState("connected");
      if (j.currentLocationId) {
        const [ir, rr, pr, inr] = await Promise.allSettled([fetch("/api/gbp/info").then(x=>x.json()), fetch("/api/gbp/reviews").then(x=>x.json()), fetch("/api/gbp/posts").then(x=>x.json()), fetch("/api/gbp/insights").then(x=>x.json())]);
        if (ir.status==="fulfilled") setInfo((ir.value as {info?:GbpBusinessInfo}).info ?? null);
        if (rr.status==="fulfilled") setReviews((rr.value as {reviews?:GbpReview[]}).reviews ?? []);
        if (pr.status==="fulfilled") setPosts((pr.value as {posts?:GbpPost[]}).posts ?? []);
        if (inr.status==="fulfilled") setInsights((inr.value as {insights?:Array<{metric:string;value:number}>}).insights ?? []);
      }
    } catch { setState("error"); }
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("gbp") === "connected") window.history.replaceState({}, "", window.location.pathname + "?tab=business-profile");
    load();
  }, [load]);

  async function selectLoc(loc: GbpLocation) {
    await fetch("/api/gbp/locations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locationId: loc.name, locationName: loc.title }) });
    setLocationId(loc.name); await load();
  }

  async function disconnect() {
    if (!(await askConfirm("Disconnect Google Business Profile?"))) return;
    setDisconnecting(true);
    await fetch("/api/gbp/disconnect", { method: "POST" });
    setState("disconnected"); setDisconnecting(false);
  }

  async function submitPost(e: React.FormEvent) {
    e.preventDefault(); if (!draft.summary.trim()) return;
    setPosting(true); setPostMsg(null);
    try {
      const r = await fetch("/api/gbp/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const j = await r.json() as { post?: GbpPost; error?: string };
      if (j.post) { setPostMsg("Post published."); setDraft({ summary:"", actionType:"", actionUrl:"" }); setPosts(p=>[j.post!,...p]); }
      else setPostMsg(`Failed: ${j.error ?? "unknown"}`);
    } catch { setPostMsg("Network error."); }
    finally { setPosting(false); }
  }

  if (state === "loading") return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;

  if (state === "disconnected") return (
    <div className="card border-0 shadow-sm">
      <div className="card-body p-4">
        <h5 className="fw-bold mb-1">Connect Google Business Profile</h5>
        <p className="text-muted mb-4">Manage posts, view reviews, and track insights from your GBP listing.</p>
        <ul className="list-unstyled mb-4">
          <li className="mb-1"><i className="bi bi-check-circle-fill text-success me-2" />Google credentials configured in Settings → Google Integration</li>
          <li className="mb-1"><i className="bi bi-info-circle me-2 text-muted" />Your Google account must be a manager of the GBP listing</li>
          <li className="mb-1"><i className="bi bi-info-circle me-2 text-muted" />Add <code>/api/gbp/callback</code> to authorised redirect URIs in Google Cloud</li>
        </ul>
        <a href="/api/gbp/connect" className="btn btn-primary"><i className="bi bi-google me-2" />Connect Google Business Profile</a>
      </div>
    </div>
  );

  if (state === "error") return <div className="alert alert-warning"><i className="bi bi-exclamation-triangle-fill me-2" />Failed to load Business Profile data. Check your connection.</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div><span className="badge bg-success me-2">Connected</span><span className="text-muted small">{email}</span></div>
        <button className="btn btn-outline-danger btn-sm" onClick={disconnect} disabled={disconnecting}>{disconnecting?"Disconnecting…":"Disconnect"}</button>
      </div>

      {locations.length > 1 && (
        <div className="mb-4">
          <label className="form-label fw-semibold">Location</label>
          <select className="form-select" value={locationId ?? ""} onChange={(e) => { const l = locations.find(x=>x.name===e.target.value); if(l) selectLoc(l); }}>
            {locations.map(l=><option key={l.name} value={l.name}>{l.title}</option>)}
          </select>
        </div>
      )}

      <div className="row g-4">
        {info && (
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-transparent fw-bold">Business Info</div>
              <div className="card-body">
                <div className="row g-2">
                  <div className="col-md-4"><span className="text-muted small">Name</span><br /><strong>{info.title}</strong></div>
                  <div className="col-md-4"><span className="text-muted small">Phone</span><br />{info.phoneNumbers?.primaryPhone ?? "—"}</div>
                  <div className="col-md-4"><span className="text-muted small">Category</span><br />{info.categories?.primaryCategory?.displayName ?? "—"}</div>
                  {info.storefrontAddress && <div className="col-12"><span className="text-muted small">Address</span><br />{[...(info.storefrontAddress.addressLines??[]),info.storefrontAddress.locality].filter(Boolean).join(", ")}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {insights.length > 0 && (
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-transparent fw-bold">30-Day Insights</div>
              <div className="card-body">
                {insights.map(i=><div key={i.metric} className="mb-2"><div className="text-muted small">{i.metric.replace(/_/g," ")}</div><div className="fw-bold fs-4">{i.value.toLocaleString()}</div></div>)}
              </div>
            </div>
          </div>
        )}

        <div className={insights.length > 0 ? "col-md-9" : "col-12"}>
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent fw-bold">Recent Reviews</div>
            {reviews.length === 0
              ? <div className="card-body text-muted text-center py-4">No reviews yet.</div>
              : <ul className="list-group list-group-flush">
                  {reviews.map(r=>(
                    <li key={r.name} className="list-group-item">
                      <div className="d-flex justify-content-between mb-1"><strong className="small">{r.reviewer.displayName}</strong><Stars r={r.starRating} /></div>
                      {r.comment && <p className="mb-1 small">{r.comment}</p>}
                      {r.reviewReply && <div className="bg-light rounded p-2 small text-muted"><strong>Your reply:</strong> {r.reviewReply.comment}</div>}
                    </li>
                  ))}
                </ul>
            }
          </div>
        </div>

        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent fw-bold">Create Post</div>
            <div className="card-body">
              <form onSubmit={submitPost}>
                <div className="mb-3">
                  <label className="form-label">Post Content</label>
                  <textarea className="form-control" rows={3} maxLength={500} placeholder="What&apos;s new at your business?" value={draft.summary} onChange={e=>setDraft(d=>({...d,summary:e.target.value}))} />
                  <div className="form-text">{draft.summary.length}/500</div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="form-label">Call to Action</label>
                    <select className="form-select" value={draft.actionType} onChange={e=>setDraft(d=>({...d,actionType:e.target.value}))}>
                      <option value="">None</option>
                      {["LEARN_MORE","CALL","BOOK","ORDER","SIGN_UP"].map(a=><option key={a} value={a}>{a.replace("_"," ")}</option>)}
                    </select>
                  </div>
                  {draft.actionType && <div className="col-md-8"><label className="form-label">CTA URL</label><input type="url" className="form-control" placeholder="https://…" value={draft.actionUrl} onChange={e=>setDraft(d=>({...d,actionUrl:e.target.value}))} /></div>}
                </div>
                {postMsg && <div className={`alert py-2 ${postMsg.startsWith("Post")?"alert-success":"alert-danger"}`}>{postMsg}</div>}
                <button type="submit" className="btn btn-primary" disabled={posting||!draft.summary.trim()}>{posting?"Publishing…":"Publish Post"}</button>
              </form>
              {posts.length > 0 && (
                <div className="mt-4">
                  <h6 className="fw-semibold mb-2">Recent Posts</h6>
                  <ul className="list-group">
                    {posts.slice(0,5).map(p=>(
                      <li key={p.name} className="list-group-item d-flex justify-content-between align-items-center">
                        <span className="small">{p.summary.slice(0,80)}{p.summary.length>80?"…":""}</span>
                        <span className="badge bg-secondary ms-2">{p.state}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
