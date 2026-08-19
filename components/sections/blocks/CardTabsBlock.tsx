"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

const VoltBlock = dynamic(() => import("@/components/sections/VoltBlock"), { ssr: false });

// ─── Legacy manual-authoring shape (kept for backward compat with sections
// already saved this way — see the fallback render path at the bottom of this
// file). New card-tabs blocks use the auto-populating shape below instead. ───
export interface CardTabsCard {
  id: string;
  voltId?: string;
  productId?: string;
  networkLabel?: string;
  term?: string;
}
export interface CardTabsTab {
  key: string;
  label: string;
  cards: CardTabsCard[];
  groupByNetwork?: boolean;
  groupByTerm?: boolean;
}

interface ScopedPackage {
  id: string;
  productTypeSlug: string | null;
  productTypeName: string | null;
  networkSlug: string | null;
  networkName: string | null;
  term: string | null;
}

export interface CardTabsContent {
  /** Auto-populating mode (current default): which Product Types drive Level-1
   * tabs. Every active package under these types is fetched and organized into
   * Product Type -> Network -> Term automatically — no manual per-card binding. */
  productTypeSlugs?: string[];
  /** One Volt card design renders every card (same v1 scope as ProductGridBlock). */
  voltId?: string;
  minCardWidth?: number;
  cardAspectRatio?: string;
  /** Legacy manual-authoring shape — present only on sections saved before the
   * auto-populating rework. Ignored when productTypeSlugs is set. */
  tabs?: CardTabsTab[];
}

interface Props {
  content?: CardTabsContent;
  darkBg?: boolean;
}

interface Level {
  key: string;
  label: string;
}

// Groups while preserving first-seen order, so tab order tracks fetch/insert
// order rather than alphabetizing labels.
function levelsFrom(packages: ScopedPackage[], keyFn: (p: ScopedPackage) => string | null, nameFn: (p: ScopedPackage) => string | null): Level[] {
  const seen = new Map<string, string>();
  for (const pkg of packages) {
    const key = keyFn(pkg);
    if (key && !seen.has(key)) seen.set(key, nameFn(pkg) || key);
  }
  return Array.from(seen.entries()).map(([key, label]) => ({ key, label }));
}

const EMPTY_MSG_STYLE: React.CSSProperties = {
  padding: 24, textAlign: "center", color: "var(--section-muted, rgba(0,0,0,0.4))", fontSize: 13,
};

/**
 * CardTabsBlock — auto-populating 3-level tab grid of live packages:
 *   Level 1 (tabs): Product Type, from the block's configured productTypeSlugs.
 *   Level 2 (sub-tabs): Network, within the active Product Type — auto-hidden
 *     when only one network is present.
 *   Level 3 (term-tabs): contract Term, within the active Network — auto-hidden
 *     when only one term is present.
 * Every active package matching the configured Product Types appears
 * automatically and stays current as packages are added/edited/removed — no
 * manual per-card authoring in the Designer. Mirrors ProductGridBlock's fetch/
 * drill-down pattern (Product Type -> Network -> Category) with Term as the
 * third layer instead of Service Category, and this block's own tab styling.
 *
 * Falls back to the legacy manually-authored `tabs[]` shape when
 * productTypeSlugs isn't set, so sections saved before this rework still render.
 */
export default function CardTabsBlock({ content }: Props) {
  const slugs = useMemo(
    () => (content?.productTypeSlugs || []).map((s) => s.trim()).filter(Boolean),
    [content?.productTypeSlugs]
  );

  if (slugs.length === 0 && content?.tabs?.length) {
    return <LegacyCardTabs content={content} />;
  }

  return <AutoCardTabs content={content} />;
}

function AutoCardTabs({ content }: { content?: CardTabsContent }) {
  const slugs = useMemo(
    () => (content?.productTypeSlugs || []).map((s) => s.trim()).filter(Boolean),
    [content?.productTypeSlugs]
  );
  const voltId = content?.voltId;
  const minCardWidth = content?.minCardWidth || 260;
  const cardAspectRatio = content?.cardAspectRatio || "0.65";

  const [packages, setPackages] = useState<ScopedPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeNetwork, setActiveNetwork] = useState<string | null>(null);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);

  useEffect(() => {
    if (slugs.length === 0) { setPackages([]); setLoading(false); return; }
    let active = true;
    setLoading(true);
    Promise.all(
      slugs.map((slug) =>
        fetch(`/api/packages?productType=${encodeURIComponent(slug)}`)
          .then((r) => (r.ok ? r.json() : { packages: [] }))
          .then((d) => (Array.isArray(d?.packages) ? (d.packages as ScopedPackage[]) : []))
          .catch(() => [] as ScopedPackage[])
      )
    ).then((results) => {
      if (!active) return;
      setPackages(results.flat());
      setLoading(false);
    });
    return () => { active = false; };
  }, [slugs]);

  // ── Level 1: Product Types present among the fetched packages, in configured order ──
  const types = useMemo(() => {
    const found = levelsFrom(packages, (p) => p.productTypeSlug, (p) => p.productTypeName);
    const byKey = new Map(found.map((t) => [t.key, t]));
    return slugs.filter((s) => byKey.has(s)).map((s) => byKey.get(s)!);
  }, [packages, slugs]);
  const effectiveType = activeType && types.some((t) => t.key === activeType) ? activeType : (types[0]?.key ?? null);
  const packagesForType = useMemo(() => packages.filter((p) => p.productTypeSlug === effectiveType), [packages, effectiveType]);

  // ── Level 2: Networks within the active Product Type ──
  const networks = useMemo(() => levelsFrom(packagesForType, (p) => p.networkSlug, (p) => p.networkName), [packagesForType]);
  const showNetworkTabs = networks.length > 1;
  const effectiveNetwork = showNetworkTabs && activeNetwork && networks.some((n) => n.key === activeNetwork) ? activeNetwork : (showNetworkTabs ? networks[0]?.key ?? null : null);
  const packagesForNetwork = useMemo(
    () => (effectiveNetwork ? packagesForType.filter((p) => p.networkSlug === effectiveNetwork) : packagesForType),
    [packagesForType, effectiveNetwork]
  );

  // ── Level 3: Terms within the active Network ──
  const terms = useMemo(() => levelsFrom(packagesForNetwork, (p) => p.term, (p) => p.term), [packagesForNetwork]);
  const showTermTabs = terms.length > 1;
  const effectiveTerm = showTermTabs && activeTerm && terms.some((t) => t.key === activeTerm) ? activeTerm : (showTermTabs ? terms[0]?.key ?? null : null);
  const visiblePackages = useMemo(
    () => (effectiveTerm ? packagesForNetwork.filter((p) => p.term === effectiveTerm) : packagesForNetwork),
    [packagesForNetwork, effectiveTerm]
  );

  if (slugs.length === 0) return <div style={EMPTY_MSG_STYLE}>No product types configured.</div>;
  if (!voltId) return <div style={EMPTY_MSG_STYLE}>No card design selected.</div>;
  if (loading) return <div style={EMPTY_MSG_STYLE}>Loading…</div>;
  if (types.length === 0) return <div style={EMPTY_MSG_STYLE}>No packages available yet.</div>;

  return (
    <div className="cms-card-tabs">
      <div className="cms-card-tabs__bar" role="tablist">
        {types.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === effectiveType}
            className={`cms-card-tabs__tab${t.key === effectiveType ? " cms-card-tabs__tab--active" : ""}`}
            onClick={() => { setActiveType(t.key); setActiveNetwork(null); setActiveTerm(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {showNetworkTabs && (
        <div className="cms-card-tabs__subbar" role="tablist">
          {networks.map((n) => (
            <button
              key={n.key}
              type="button"
              role="tab"
              aria-selected={n.key === effectiveNetwork}
              className={`cms-card-tabs__subtab${n.key === effectiveNetwork ? " cms-card-tabs__subtab--active" : ""}`}
              onClick={() => { setActiveNetwork(n.key); setActiveTerm(null); }}
            >
              {n.label}
            </button>
          ))}
        </div>
      )}
      {showTermTabs && (
        <div className="cms-card-tabs__termbar" role="tablist">
          {terms.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === effectiveTerm}
              className={`cms-card-tabs__termtab${t.key === effectiveTerm ? " cms-card-tabs__termtab--active" : ""}`}
              onClick={() => setActiveTerm(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {visiblePackages.length === 0 ? (
        <div style={EMPTY_MSG_STYLE}>No packages match this selection.</div>
      ) : (
        <div className="cms-card-tabs__panel">
          {visiblePackages.map((pkg) => (
            <div key={pkg.id} className="cms-card-tabs__cell">
              <VoltBlock voltId={voltId} productId={pkg.id} fitMode="contain" />
              <a href={`/coverage?package=${encodeURIComponent(pkg.id)}`} className="cms-card-tabs__cta">
                Check coverage <i className="bi bi-geo-alt" />
              </a>
            </div>
          ))}
        </div>
      )}
      <CardTabsStyles minCardWidth={minCardWidth} cardAspectRatio={cardAspectRatio} />
    </div>
  );
}

/** Legacy render path — manually-authored tabs[] with per-card voltId/productId
 * binding, optionally grouped by networkLabel/term captured at bind time. Kept
 * so sections saved before the auto-populating rework keep rendering as before. */
function LegacyCardTabs({ content }: { content?: CardTabsContent }) {
  const tabs = content?.tabs || [];
  const minCardWidth = content?.minCardWidth || 260;
  const cardAspectRatio = content?.cardAspectRatio || "0.65";
  const [active, setActive] = useState(0);
  const [activeSub, setActiveSub] = useState<Record<string, number>>({});
  const [activeTerm, setActiveTerm] = useState<Record<string, number>>({});

  function groupCardsBy(cards: CardTabsCard[], keyFn: (c: CardTabsCard) => string | undefined, fallback: string) {
    const groups: { label: string; cards: CardTabsCard[] }[] = [];
    const byLabel = new Map<string, CardTabsCard[]>();
    for (const c of cards) {
      const label = keyFn(c) || fallback;
      let bucket = byLabel.get(label);
      if (!bucket) { bucket = []; byLabel.set(label, bucket); groups.push({ label, cards: bucket }); }
      bucket.push(c);
    }
    return groups;
  }

  if (tabs.length === 0) return <div style={EMPTY_MSG_STYLE}>No tabs configured.</div>;

  return (
    <div className="cms-card-tabs">
      <div className="cms-card-tabs__bar" role="tablist">
        {tabs.map((t, i) => (
          <button key={t.key} type="button" role="tab" aria-selected={i === active}
            className={`cms-card-tabs__tab${i === active ? " cms-card-tabs__tab--active" : ""}`}
            onClick={() => setActive(i)}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => {
        const groups = t.groupByNetwork ? groupCardsBy(t.cards, (c) => c.networkLabel, "Other") : null;
        const showSubTabs = !!groups && groups.length > 1;
        const subIdx = showSubTabs ? Math.min(activeSub[t.key] ?? 0, groups!.length - 1) : 0;
        const networkCards = showSubTabs ? groups![subIdx].cards : t.cards;
        const termKey = `${t.key}:${subIdx}`;
        const termGroups = t.groupByTerm ? groupCardsBy(networkCards, (c) => c.term, "Other") : null;
        const showTermTabs = !!termGroups && termGroups.length > 1;
        const termIdx = showTermTabs ? Math.min(activeTerm[termKey] ?? 0, termGroups!.length - 1) : 0;
        const cellsToRender = showTermTabs ? termGroups![termIdx].cards : networkCards;
        return (
          <div key={t.key} role="tabpanel" aria-hidden={i !== active} className="cms-card-tabs__panelwrap" style={{ display: i === active ? "block" : "none" }}>
            {showSubTabs && (
              <div className="cms-card-tabs__subbar" role="tablist">
                {groups!.map((g, gi) => (
                  <button key={g.label} type="button" role="tab" aria-selected={gi === subIdx}
                    className={`cms-card-tabs__subtab${gi === subIdx ? " cms-card-tabs__subtab--active" : ""}`}
                    onClick={() => setActiveSub((s) => ({ ...s, [t.key]: gi }))}>
                    {g.label}
                  </button>
                ))}
              </div>
            )}
            {showTermTabs && (
              <div className="cms-card-tabs__termbar" role="tablist">
                {termGroups!.map((g, gi) => (
                  <button key={g.label} type="button" role="tab" aria-selected={gi === termIdx}
                    className={`cms-card-tabs__termtab${gi === termIdx ? " cms-card-tabs__termtab--active" : ""}`}
                    onClick={() => setActiveTerm((s) => ({ ...s, [termKey]: gi }))}>
                    {g.label}
                  </button>
                ))}
              </div>
            )}
            <div className="cms-card-tabs__panel">
              {cellsToRender.map((c) => (
                <div key={c.id} className="cms-card-tabs__cell">
                  {c.voltId
                    ? <VoltBlock voltId={c.voltId} productId={c.productId} fitMode="contain" />
                    : <div className="cms-card-tabs__empty">No card design selected</div>}
                  {c.productId && (
                    <a href={`/coverage?package=${encodeURIComponent(c.productId)}`} className="cms-card-tabs__cta">
                      Check coverage <i className="bi bi-geo-alt" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <CardTabsStyles minCardWidth={minCardWidth} cardAspectRatio={cardAspectRatio} />
    </div>
  );
}

function CardTabsStyles({ minCardWidth, cardAspectRatio }: { minCardWidth: number; cardAspectRatio: string }) {
  return (
    <style jsx>{`
      .cms-card-tabs__bar {
        display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-bottom: 32px;
        background: var(--cms-surface, rgba(255,255,255,0.04));
        border: 1px solid var(--cms-border, rgba(255,255,255,0.09));
        border-radius: 999px; padding: 5px; width: fit-content; margin-left: auto; margin-right: auto;
      }
      .cms-card-tabs__tab {
        border: 0; background: transparent; color: var(--section-text, rgba(0,0,0,0.85)); opacity: 0.7;
        font-size: 13px; font-weight: 600; letter-spacing: 0.02em;
        border-radius: 999px; padding: 10px 22px; cursor: pointer; transition: opacity .15s, background .15s, color .15s;
      }
      .cms-card-tabs__tab:hover { opacity: 1; }
      .cms-card-tabs__tab--active { opacity: 1; background: var(--cms-primary, #0d6efd); color: #fff; }
      .cms-card-tabs__subbar {
        display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 14px;
      }
      .cms-card-tabs__subtab {
        border: 1px solid var(--cms-border, rgba(0,0,0,0.14)); background: transparent;
        color: var(--section-text, rgba(0,0,0,0.75)); opacity: 0.75;
        font-size: 11.5px; font-weight: 600; letter-spacing: 0.02em;
        border-radius: 999px; padding: 6px 16px; cursor: pointer; transition: opacity .15s, background .15s, color .15s, border-color .15s;
      }
      .cms-card-tabs__subtab:hover { opacity: 1; }
      .cms-card-tabs__subtab--active { opacity: 1; background: var(--section-text, rgba(0,0,0,0.85)); color: var(--section-bg, #fff); border-color: transparent; }
      .cms-card-tabs__termbar {
        display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-bottom: 20px;
      }
      .cms-card-tabs__termtab {
        border: 1px dashed var(--cms-border, rgba(0,0,0,0.18)); background: transparent;
        color: var(--section-muted, rgba(0,0,0,0.6)); opacity: 0.8;
        font-size: 10.5px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase;
        border-radius: 999px; padding: 4px 12px; cursor: pointer; transition: opacity .15s, background .15s, color .15s, border-color .15s;
      }
      .cms-card-tabs__termtab:hover { opacity: 1; }
      .cms-card-tabs__termtab--active { opacity: 1; background: var(--cms-primary, #0d6efd); color: #fff; border-color: transparent; border-style: solid; }
      .cms-card-tabs__panel {
        display: flex; flex-wrap: wrap; justify-content: center; gap: 20px;
      }
      .cms-card-tabs__cell { position: relative; flex: 0 1 ${minCardWidth}px; min-height: 160px; aspect-ratio: ${cardAspectRatio}; }
      .cms-card-tabs__empty {
        display: flex; align-items: center; justify-content: center; height: 100%; min-height: 160px;
        border: 1px dashed var(--cms-border, rgba(0,0,0,0.15)); border-radius: 12px;
        color: var(--section-muted, rgba(0,0,0,0.4)); font-size: 12px;
      }
      .cms-card-tabs__cta {
        position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%);
        display: inline-flex; align-items: center; gap: 6px; z-index: 5;
        padding: 8px 16px; border-radius: 999px; white-space: nowrap;
        background: var(--cms-primary, #0d6efd); color: #fff;
        font-size: 12px; font-weight: 700; letter-spacing: 0.02em; text-decoration: none;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        transition: transform .15s, box-shadow .15s;
      }
      .cms-card-tabs__cta:hover { transform: translateX(-50%) translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.32); color: #fff; }
    `}</style>
  );
}
