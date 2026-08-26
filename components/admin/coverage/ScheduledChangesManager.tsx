"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/admin/ToastProvider";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

interface PkgRef {
  id: string;
  name: string;
  price: string;
  term?: string | null;
}
interface NetworkRef {
  id: string;
  name: string;
  category: string;
  packages: PkgRef[];
}

type ChangeType = "PRICE_UPDATE" | "CREATE" | "DELETE" | "REPLACE";
type ChangeStatus = "SCHEDULED" | "APPLIED" | "CANCELLED" | "FAILED";

interface ScheduledChange {
  id: string;
  type: ChangeType;
  status: ChangeStatus;
  scheduledAt: string;
  packageId?: string | null;
  package?: { id: string; name: string; price: string; network: { name: string } } | null;
  newPrice?: string | null;
  createData?: { name?: string; price?: string | number; networkId?: string } | null;
  note?: string | null;
  appliedAt?: string | null;
  errorMessage?: string | null;
}

const TYPE_LABEL: Record<ChangeType, string> = {
  PRICE_UPDATE: "Price Update",
  CREATE: "New Package",
  DELETE: "Delete Package",
  REPLACE: "Replace Package",
};
const TYPE_ICON: Record<ChangeType, string> = {
  PRICE_UPDATE: "bi-tag",
  CREATE: "bi-plus-circle",
  DELETE: "bi-trash",
  REPLACE: "bi-arrow-repeat",
};
const STATUS_BADGE: Record<ChangeStatus, string> = {
  SCHEDULED: "text-bg-primary",
  APPLIED: "text-bg-success",
  CANCELLED: "text-bg-secondary",
  FAILED: "text-bg-danger",
};

// Reusable "new package" field set — same shape ScheduledPackageChange.createData
// expects (see lib/packages/scheduled-changes.ts), used by both CREATE and REPLACE
// (REPLACE = delete an existing package + create one of these on the same date).
interface NewPkgForm {
  networkId: string;
  name: string;
  price: string;
  speedDown: string;
  speedUp: string;
  term: string;
  kind: "DATA" | "VAS";
}
const emptyNewPkg = (networkId: string): NewPkgForm => ({ networkId, name: "", price: "", speedDown: "", speedUp: "", term: "", kind: "DATA" });

export default function ScheduledChangesManager({ networks }: { networks: NetworkRef[] }) {
  const toast = useToast();
  const [changes, setChanges] = useState<ScheduledChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<ChangeType | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // ── Modal form state ──────────────────────────────────────────────────────
  const [scheduledAt, setScheduledAt] = useState("");
  const [note, setNote] = useState("");
  const [selectedPkgIds, setSelectedPkgIds] = useState<Set<string>>(new Set());
  const [pkgNewPrices, setPkgNewPrices] = useState<Record<string, string>>({});
  const [deleteTargetId, setDeleteTargetId] = useState("");
  const [replaceTargetId, setReplaceTargetId] = useState("");
  const [newPkg, setNewPkg] = useState<NewPkgForm>(emptyNewPkg(networks[0]?.id || ""));

  const resetModalState = () => {
    setScheduledAt("");
    setNote("");
    setSelectedPkgIds(new Set());
    setPkgNewPrices({});
    setDeleteTargetId("");
    setReplaceTargetId("");
    setNewPkg(emptyNewPkg(networks[0]?.id || ""));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/scheduled-package-changes");
      if (r.ok) setChanges(await r.json());
      else toast.error("Failed to load scheduled changes");
    } catch { toast.error("Failed to load scheduled changes"); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const allPackages = networks.flatMap((n) => n.packages.map((p) => ({ ...p, networkName: n.name })));

  const togglePkg = (id: string) => {
    setSelectedPkgIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const submit = async () => {
    if (!scheduledAt) { toast.error("Pick a date"); return; }
    if (!modalType) return;

    let body: Record<string, unknown>;
    if (modalType === "PRICE_UPDATE") {
      const priceUpdates = Array.from(selectedPkgIds).map((id) => ({ packageId: id, newPrice: pkgNewPrices[id] }));
      if (priceUpdates.length === 0) { toast.error("Select at least one package"); return; }
      if (priceUpdates.some((u) => !u.newPrice)) { toast.error("Set a new price for every selected package"); return; }
      body = { type: "PRICE_UPDATE", scheduledAt, note, priceUpdates };
    } else if (modalType === "DELETE") {
      if (!deleteTargetId) { toast.error("Pick a package to delete"); return; }
      body = { type: "DELETE", scheduledAt, note, packageId: deleteTargetId };
    } else if (modalType === "CREATE") {
      if (!newPkg.networkId || !newPkg.name.trim() || !newPkg.price.trim()) { toast.error("Network, name and price are required"); return; }
      body = { type: "CREATE", scheduledAt, note, createData: { ...newPkg, name: newPkg.name.trim(), price: newPkg.price.trim() } };
    } else {
      // REPLACE
      if (!replaceTargetId) { toast.error("Pick a package to replace"); return; }
      if (!newPkg.networkId || !newPkg.name.trim() || !newPkg.price.trim()) { toast.error("The new package's network, name and price are required"); return; }
      body = { type: "REPLACE", scheduledAt, note, packageId: replaceTargetId, createData: { ...newPkg, name: newPkg.name.trim(), price: newPkg.price.trim() } };
    }

    const res = await fetch("/api/scheduled-package-changes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast.success("Change scheduled");
      setModalType(null);
      resetModalState();
      load();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to schedule change");
    }
  };

  const cancelChange = (c: ScheduledChange) =>
    setConfirm({
      title: "Cancel scheduled change",
      message: `Cancel this ${TYPE_LABEL[c.type].toLowerCase()} scheduled for ${new Date(c.scheduledAt).toLocaleDateString()}?`,
      onConfirm: async () => {
        const res = await fetch(`/api/scheduled-package-changes/${c.id}`, { method: "PUT" });
        if (res.ok) { toast.success("Change cancelled"); load(); } else toast.error("Failed to cancel");
        setConfirm(null);
      },
    });

  const deleteChange = (c: ScheduledChange) =>
    setConfirm({
      title: "Remove from history",
      message: `Permanently remove this record?`,
      onConfirm: async () => {
        const res = await fetch(`/api/scheduled-package-changes/${c.id}`, { method: "DELETE" });
        if (res.ok) { toast.success("Removed"); load(); } else toast.error("Failed to remove");
        setConfirm(null);
      },
    });

  const pending = changes.filter((c) => c.status === "SCHEDULED");
  const history = changes.filter((c) => c.status !== "SCHEDULED");

  const describeTarget = (c: ScheduledChange) => {
    if (c.type === "PRICE_UPDATE") return c.package ? `${c.package.name} (${c.package.network.name}) → R${c.newPrice}` : "Package deleted";
    if (c.type === "DELETE") return c.package ? `${c.package.name} (${c.package.network.name})` : "Package already deleted";
    if (c.type === "CREATE") return c.createData?.name ? `New: ${c.createData.name}` : "—";
    // REPLACE
    const oldName = c.package ? c.package.name : "(deleted package)";
    return `${oldName} → ${c.createData?.name || "new package"}`;
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-0">Scheduled Changes</h5>
          <div className="text-muted small">Price updates, new packages, deletions and replacements that take effect automatically on a future date.</div>
        </div>
        <div className="btn-group">
          <button className="btn btn-primary btn-sm dropdown-toggle" data-bs-toggle="dropdown">
            <i className="bi bi-plus-lg me-1" />Schedule a Change
          </button>
          <ul className="dropdown-menu">
            {(Object.keys(TYPE_LABEL) as ChangeType[]).map((t) => (
              <li key={t}>
                <button className="dropdown-item" onClick={() => { resetModalState(); setModalType(t); }}>
                  <i className={`bi ${TYPE_ICON[t]} me-2`} />{TYPE_LABEL[t]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : (
        <>
          <div className="card shadow-sm mb-3">
            <div className="card-header bg-light"><strong className="small">Pending ({pending.length})</strong></div>
            <div className="card-body p-0">
              {pending.length === 0 ? (
                <div className="text-muted small p-3">Nothing scheduled.</div>
              ) : (
                <table className="table table-sm mb-0">
                  <thead><tr><th>Type</th><th>Target</th><th>Date</th><th>Note</th><th /></tr></thead>
                  <tbody>
                    {pending.map((c) => (
                      <tr key={c.id}>
                        <td><i className={`bi ${TYPE_ICON[c.type]} me-1`} />{TYPE_LABEL[c.type]}</td>
                        <td>{describeTarget(c)}</td>
                        <td>{new Date(c.scheduledAt).toLocaleDateString()}</td>
                        <td className="text-muted small">{c.note || "—"}</td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => cancelChange(c)}>Cancel</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header bg-light"><strong className="small">History</strong></div>
            <div className="card-body p-0">
              {history.length === 0 ? (
                <div className="text-muted small p-3">No applied, cancelled or failed changes yet.</div>
              ) : (
                <table className="table table-sm mb-0">
                  <thead><tr><th>Type</th><th>Target</th><th>Date</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {history.map((c) => (
                      <tr key={c.id}>
                        <td><i className={`bi ${TYPE_ICON[c.type]} me-1`} />{TYPE_LABEL[c.type]}</td>
                        <td>
                          {describeTarget(c)}
                          {c.errorMessage && <div className="text-danger small">{c.errorMessage}</div>}
                        </td>
                        <td>{new Date(c.scheduledAt).toLocaleDateString()}</td>
                        <td><span className={`badge ${STATUS_BADGE[c.status]}`}>{c.status}</span></td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => deleteChange(c)}><i className="bi bi-trash" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {modalType && (
        <div className="modal d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className={`bi ${TYPE_ICON[modalType]} me-2`} />Schedule: {TYPE_LABEL[modalType]}</h5>
                <button className="btn-close" onClick={() => setModalType(null)} />
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-control" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                    <div className="form-text">Applied automatically at the start of this day.</div>
                  </div>
                  <div className="col-6">
                    <label className="form-label">Note <span className="text-muted">(optional)</span></label>
                    <input className="form-control" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. September price increase" />
                  </div>
                </div>

                {modalType === "PRICE_UPDATE" && (
                  <>
                    <label className="form-label">Select packages</label>
                    <div className="border rounded p-2 mb-2" style={{ maxHeight: 260, overflowY: "auto" }}>
                      {allPackages.length === 0 ? <div className="text-muted small">No packages yet.</div> : allPackages.map((p) => (
                        <div key={p.id} className="d-flex align-items-center gap-2 py-1">
                          <input type="checkbox" className="form-check-input" checked={selectedPkgIds.has(p.id)} onChange={() => togglePkg(p.id)} />
                          <span className="flex-grow-1 small">{p.name} <span className="text-muted">({p.networkName})</span> — currently R{p.price}</span>
                          {selectedPkgIds.has(p.id) && (
                            <input
                              type="text" className="form-control form-control-sm" style={{ width: 110 }}
                              placeholder="New price" value={pkgNewPrices[p.id] ?? ""}
                              onChange={(e) => setPkgNewPrices((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {modalType === "DELETE" && (
                  <div className="mb-2">
                    <label className="form-label">Package to delete</label>
                    <select className="form-select" value={deleteTargetId} onChange={(e) => setDeleteTargetId(e.target.value)}>
                      <option value="">— Select —</option>
                      {networks.map((n) => (
                        <optgroup key={n.id} label={n.name}>
                          {n.packages.map((p) => <option key={p.id} value={p.id}>{p.name} (R{p.price})</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                )}

                {modalType === "REPLACE" && (
                  <div className="mb-3">
                    <label className="form-label">Package to replace</label>
                    <select className="form-select" value={replaceTargetId} onChange={(e) => {
                      setReplaceTargetId(e.target.value);
                      const pkg = allPackages.find((p) => p.id === e.target.value);
                      const net = networks.find((n) => n.packages.some((pp) => pp.id === e.target.value));
                      if (net) setNewPkg((prev) => ({ ...prev, networkId: net.id }));
                    }}>
                      <option value="">— Select —</option>
                      {networks.map((n) => (
                        <optgroup key={n.id} label={n.name}>
                          {n.packages.map((p) => <option key={p.id} value={p.id}>{p.name} (R{p.price})</option>)}
                        </optgroup>
                      ))}
                    </select>
                    <div className="form-text">Deleted the same day the new package below is created.</div>
                  </div>
                )}

                {(modalType === "CREATE" || modalType === "REPLACE") && (
                  <div className="card"><div className="card-body">
                    <div className="fw-semibold small mb-2">New package details</div>
                    <div className="row g-2 mb-2">
                      <div className="col-6">
                        <label className="form-label small">Network</label>
                        <select className="form-select form-select-sm" value={newPkg.networkId} onChange={(e) => setNewPkg({ ...newPkg, networkId: e.target.value })}>
                          <option value="">— Select —</option>
                          {networks.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                        </select>
                      </div>
                      <div className="col-6">
                        <label className="form-label small">Kind</label>
                        <select className="form-select form-select-sm" value={newPkg.kind} onChange={(e) => setNewPkg({ ...newPkg, kind: e.target.value === "VAS" ? "VAS" : "DATA" })}>
                          <option value="DATA">Data package</option>
                          <option value="VAS">Value-added service</option>
                        </select>
                      </div>
                      <div className="col-6">
                        <label className="form-label small">Name</label>
                        <input className="form-control form-control-sm" value={newPkg.name} onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })} placeholder="e.g. Home 50/50" />
                      </div>
                      <div className="col-6">
                        <label className="form-label small">Price</label>
                        <input className="form-control form-control-sm" value={newPkg.price} onChange={(e) => setNewPkg({ ...newPkg, price: e.target.value })} placeholder="R599" />
                      </div>
                      <div className="col-4">
                        <label className="form-label small">Down</label>
                        <input className="form-control form-control-sm" value={newPkg.speedDown} onChange={(e) => setNewPkg({ ...newPkg, speedDown: e.target.value })} placeholder="50 Mbps" />
                      </div>
                      <div className="col-4">
                        <label className="form-label small">Up</label>
                        <input className="form-control form-control-sm" value={newPkg.speedUp} onChange={(e) => setNewPkg({ ...newPkg, speedUp: e.target.value })} placeholder="50 Mbps" />
                      </div>
                      <div className="col-4">
                        <label className="form-label small">Term</label>
                        <input className="form-control form-control-sm" value={newPkg.term} onChange={(e) => setNewPkg({ ...newPkg, term: e.target.value })} placeholder="24-Month" />
                      </div>
                    </div>
                    <div className="form-text">Features, category and product type can be filled in later from the package's own Edit form once it's created — this covers what's needed to launch it on the day.</div>
                  </div></div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={submit}>Schedule</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog isOpen title={confirm.title} message={confirm.message} variant="danger" confirmText="Confirm"
          onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />
      )}
    </>
  );
}
