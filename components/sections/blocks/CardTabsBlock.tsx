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
}

export interface CardTabsTab {
  key: string;
  label: string;
  cards: CardTabsCard[];
}

interface Props {
  content?: { tabs?: CardTabsTab[]; minCardWidth?: number; cardAspectRatio?: string };
  darkBg?: boolean;
}

/**
 * CardTabsBlock — tab-switched grid of existing Volt card designs, each
 * optionally bound to a live product via VoltBlock's productId prop.
 * Reuses the card design/binding pipeline unmodified; this component only
 * supplies the tab chrome and grid layout.
 *
 * All tab panels render simultaneously (display:none for inactive ones)
 * rather than conditionally mounting — so bound VoltBlocks fetch their
 * package once and switching tabs never re-triggers a fetch.
 */
export default function CardTabsBlock({ content }: Props) {
  const tabs = content?.tabs || [];
  const minCardWidth = content?.minCardWidth || 260;
  // Cards are absolutely-positioned Volt layers with no intrinsic height of their
  // own — without an aspect-ratio here, .cms-card-tabs__cell collapses to its bare
  // min-height (160px) no matter how tall the underlying Volt design actually is.
  const cardAspectRatio = content?.cardAspectRatio || "0.65";
  const [active, setActive] = useState(0);

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
      {tabs.map((t, i) => (
        <div
          key={t.key}
          role="tabpanel"
          aria-hidden={i !== active}
          className="cms-card-tabs__panel"
          style={{ display: i === active ? "flex" : "none" }}
        >
          {t.cards.map((c) => (
            <div key={c.id} className="cms-card-tabs__cell">
              {c.voltId
                ? <VoltBlock voltId={c.voltId} productId={c.productId} fitMode="contain" />
                : <div className="cms-card-tabs__empty">No card design selected</div>}
            </div>
          ))}
        </div>
      ))}
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
        .cms-card-tabs__panel {
          flex-wrap: wrap;
          justify-content: center;
          gap: 20px;
        }
        .cms-card-tabs__cell { flex: 0 1 ${minCardWidth}px; min-height: 160px; aspect-ratio: ${cardAspectRatio}; }
        .cms-card-tabs__empty {
          display: flex; align-items: center; justify-content: center; height: 100%; min-height: 160px;
          border: 1px dashed var(--cms-border, rgba(0,0,0,0.15)); border-radius: 12px;
          color: var(--section-muted, rgba(0,0,0,0.4)); font-size: 12px;
        }
      `}</style>
    </div>
  );
}
