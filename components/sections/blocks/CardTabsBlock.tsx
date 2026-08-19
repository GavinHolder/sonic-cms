"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const VoltBlock = dynamic(() => import("@/components/sections/VoltBlock"), { ssr: false });

export interface CardTabsCard {
  /** Stable identity for this card slot — used as the props-panel binding key so
   * reordering/reapplying a template never shuffles which product a slot points to. */
  id: string;
  voltId?: string;
  productId?: string;
  /** Network display name, captured alongside productId when a product is bound
   * (see updateCardTabCardProduct in flexible-designer.html). Lets a tab group its
   * cards into per-network sub-tabs without a live lookup at render time. */
  networkLabel?: string;
  /** Contract term (e.g. "24-Month", "Prepaid", "12-Month"), captured the same way
   * as networkLabel. Enables a third tab level nested inside each network group. */
  term?: string;
}

export interface CardTabsTab {
  key: string;
  label: string;
  cards: CardTabsCard[];
  /** When true and this tab's cards span more than one distinct networkLabel,
   * render a second row of sub-tabs (one per network) instead of one flat grid
   * — e.g. a "Fibre" tab split into AirFibre / Kuluntu Connect sub-tabs. */
  groupByNetwork?: boolean;
  /** When true and the active set of cards (after any network grouping) spans
   * more than one distinct term, render a third tab row nested inside — e.g.
   * AirFibre split into Prepaid / 24-Month term tabs. */
  groupByTerm?: boolean;
}

interface Props {
  content?: { tabs?: CardTabsTab[]; minCardWidth?: number; cardAspectRatio?: string };
  darkBg?: boolean;
}

interface CardGroup {
  label: string;
  cards: CardTabsCard[];
}

// Groups cards while preserving first-seen order, so tab order tracks the order
// cards were added in the Designer rather than alphabetizing labels.
function groupCardsBy(cards: CardTabsCard[], keyFn: (c: CardTabsCard) => string | undefined, fallback: string): CardGroup[] {
  const groups: CardGroup[] = [];
  const byLabel = new Map<string, CardTabsCard[]>();
  for (const c of cards) {
    const label = keyFn(c) || fallback;
    let bucket = byLabel.get(label);
    if (!bucket) {
      bucket = [];
      byLabel.set(label, bucket);
      groups.push({ label, cards: bucket });
    }
    bucket.push(c);
  }
  return groups;
}

/**
 * CardTabsBlock — up to 3-level tab-switched grid of existing Volt card designs,
 * each optionally bound to a live product via VoltBlock's productId prop. Reuses
 * the card design/binding pipeline unmodified; this component only supplies the
 * tab chrome and grid layout.
 *
 * Level 1 (tabs): manually authored in the Designer — e.g. major category
 * (Fibre / Wireless / Voice).
 * Level 2 (sub-tabs, groupByNetwork): auto-derived from each bound card's
 * networkLabel — e.g. Fibre split into AirFibre / Kuluntu Connect.
 * Level 3 (term-tabs, groupByTerm): auto-derived from each bound card's term,
 * nested inside the active level-2 group — e.g. AirFibre split into
 * Prepaid / 24-Month. Levels 2 and 3 are both optional per tab and only render
 * when the underlying cards actually span more than one value — binding every
 * card to the same network/term just falls back to the flat grid.
 *
 * All panels render simultaneously (display:none for inactive ones) rather than
 * conditionally mounting — so bound VoltBlocks fetch their package once and
 * switching tabs never re-triggers a fetch.
 */
export default function CardTabsBlock({ content }: Props) {
  const tabs = content?.tabs || [];
  const minCardWidth = content?.minCardWidth || 260;
  // Cards are absolutely-positioned Volt layers with no intrinsic height of their
  // own — without an aspect-ratio here, .cms-card-tabs__cell collapses to its bare
  // min-height (160px) no matter how tall the underlying Volt design actually is.
  const cardAspectRatio = content?.cardAspectRatio || "0.65";
  const [active, setActive] = useState(0);
  // Keyed by tab.key (not index) so switching top-level tabs and back preserves
  // each tab's own sub-tab selection instead of resetting to 0.
  const [activeSub, setActiveSub] = useState<Record<string, number>>({});
  // Keyed by `${tab.key}:${subIdx}` — term groups are scoped to whichever
  // network sub-group is currently active, so the same tab can show different
  // term selections per network without them clobbering each other.
  const [activeTerm, setActiveTerm] = useState<Record<string, number>>({});

  if (tabs.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--section-muted, rgba(0,0,0,0.4))", fontSize: 13 }}>
        No tabs configured.
      </div>
    );
  }

  return (
    <div className="cms-card-tabs">
      <div className="cms-card-tabs__bar" role="tablist">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={`cms-card-tabs__tab${i === active ? " cms-card-tabs__tab--active" : ""}`}
            onClick={() => setActive(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => {
        const groups = t.groupByNetwork ? groupCardsBy(t.cards, (c) => c.networkLabel, "Other") : null;
        // Only worth a second tab row when it actually splits into >1 group —
        // a single network under groupByNetwork just falls back to the flat grid.
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
                  <button
                    key={g.label}
                    type="button"
                    role="tab"
                    aria-selected={gi === subIdx}
                    className={`cms-card-tabs__subtab${gi === subIdx ? " cms-card-tabs__subtab--active" : ""}`}
                    onClick={() => setActiveSub((s) => ({ ...s, [t.key]: gi }))}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}
            {showTermTabs && (
              <div className="cms-card-tabs__termbar" role="tablist">
                {termGroups!.map((g, gi) => (
                  <button
                    key={g.label}
                    type="button"
                    role="tab"
                    aria-selected={gi === termIdx}
                    className={`cms-card-tabs__termtab${gi === termIdx ? " cms-card-tabs__termtab--active" : ""}`}
                    onClick={() => setActiveTerm((s) => ({ ...s, [termKey]: gi }))}
                  >
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
                  {/* Real availability is address-dependent — send the visitor to the
                      coverage map with this package pre-selected rather than implying
                      it's available everywhere. */}
                  {c.productId && (
                    <a
                      href={`/coverage?package=${encodeURIComponent(c.productId)}`}
                      className="cms-card-tabs__cta"
                    >
                      Check coverage <i className="bi bi-geo-alt" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
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
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 20px;
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
    </div>
  );
}
