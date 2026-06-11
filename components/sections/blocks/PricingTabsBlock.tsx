"use client";

import { useState } from "react";

/**
 * PricingTabsBlock — authorable pricing block with Wireless/Fibre/Voice tabs.
 *
 * Content shape (stored in the Flexible element's `content`):
 *   { tabs: [ { key, label, plans?[], groups?[{title,subtitle,plans[]}], note?{heading,text}, rates?[{label,value}] } ] }
 * Each plan: { name, spec?, price, period?, flag?, popular?, desc?, features?[] }
 *
 * Pure content → editable in the Flexible editor. Client-side tab switching only.
 */

interface Plan {
  name: string; spec?: string; price: string; period?: string;
  flag?: string; popular?: boolean; desc?: string; features?: string[];
}
interface Group { title: string; subtitle?: string; plans: Plan[]; }
interface Tab {
  key: string; label: string;
  plans?: Plan[]; groups?: Group[];
  note?: { heading: string; text: string };
  rates?: { label: string; value: string }[];
}

function PlanCard({ p }: { p: Plan }) {
  return (
    <div className={`sp-card${p.popular ? " sp-card--popular" : ""}`}>
      {p.popular && <span className="sp-popular">Most popular</span>}
      {p.spec && <div className="sp-spec">{p.spec}{p.flag ? ` · ${p.flag}` : ""}</div>}
      <h4 className="sp-name">{p.name}</h4>
      <div className="sp-amount">{p.price}{p.period && <span className="sp-period">{p.period}</span>}</div>
      {p.desc && <p className="sp-desc">{p.desc}</p>}
      {p.features && p.features.length > 0 && (
        <ul className="sp-feats">
          {p.features.map((f, i) => <li key={i}><span className="sp-tick">✓</span>{f}</li>)}
        </ul>
      )}
      <span className="sp-cta">Sign up{p.name ? ` for ${p.name}` : ""} →</span>
    </div>
  );
}

export default function PricingTabsBlock({ content }: { content: Record<string, unknown>; darkBg?: boolean }) {
  const tabs = (content?.tabs as Tab[]) || [];
  const [active, setActive] = useState(0);
  if (tabs.length === 0) return null;
  const tab = tabs[Math.min(active, tabs.length - 1)];

  return (
    <div className="sonic-pricing">
      <div className="sp-tabbar" role="tablist">
        {tabs.map((t, i) => (
          <button
            key={t.key || i}
            role="tab"
            aria-selected={i === active}
            className={`sp-tab${i === active ? " sp-tab--active" : ""}`}
            onClick={() => setActive(i)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab.groups && tab.groups.length > 0 ? (
        tab.groups.map((g, gi) => (
          <div key={gi} className="sp-group">
            <div className="sp-group-head">
              <span className="sp-group-title">{g.title}</span>
              {g.subtitle && <span className="sp-group-sub">{g.subtitle}</span>}
            </div>
            <div className="sp-grid">{g.plans.map((p, pi) => <PlanCard key={pi} p={p} />)}</div>
          </div>
        ))
      ) : (
        <div className="sp-grid">{(tab.plans || []).map((p, pi) => <PlanCard key={pi} p={p} />)}</div>
      )}

      {tab.note && (
        <div className="sp-note">
          <span className="sp-note-h">{tab.note.heading}</span>
          <span className="sp-note-t">{tab.note.text}</span>
        </div>
      )}

      {tab.rates && tab.rates.length > 0 && (
        <div className="sp-rates">
          {tab.rates.map((r, i) => (
            <div key={i} className="sp-rate"><b>{r.value}</b><span>{r.label}</span></div>
          ))}
        </div>
      )}

      <style>{`
        .sonic-pricing { --sp-red: var(--theme-red, #E31E24); color: var(--section-text, #f6f7fb); }
        .sp-tabbar { display: flex; gap: 4px; justify-content: center; margin-bottom: 36px;
          background: var(--theme-card-bg, rgba(255,255,255,0.04)); border: 1px solid var(--theme-card-border, rgba(255,255,255,0.09));
          border-radius: 999px; padding: 5px; width: fit-content; margin-left: auto; margin-right: auto; }
        .sp-tab { border: 0; background: transparent; color: inherit; opacity: 0.7;
          font-family: var(--theme-font-mono, 'JetBrains Mono'), monospace; font-size: 12px; font-weight: 600;
          letter-spacing: 0.12em; text-transform: uppercase; padding: 10px 26px; border-radius: 999px; cursor: pointer; transition: all .25s ease; }
        .sp-tab:hover { opacity: 1; }
        .sp-tab--active { background: var(--sp-red); color: #fff; opacity: 1; box-shadow: 0 8px 22px -10px var(--sp-red); }
        .sp-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        @media (max-width: 1100px) { .sp-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .sp-grid { grid-template-columns: 1fr; } }
        .sp-card { position: relative; border-radius: 14px; padding: 26px 22px;
          background: var(--theme-card-bg, rgba(255,255,255,0.04)); border: 1px solid var(--theme-card-border, rgba(255,255,255,0.09));
          display: flex; flex-direction: column; transition: transform .3s ease, border-color .3s ease; }
        .sp-card:hover { transform: translateY(-4px); border-color: rgba(227,30,36,0.5); }
        .sp-card--popular { border-color: var(--sp-red); background: rgba(227,30,36,0.07); }
        .sp-popular { position: absolute; top: -11px; left: 22px; background: var(--sp-red); color: #fff;
          font-family: var(--theme-font-mono, monospace); font-size: 10px; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 4px 11px; border-radius: 999px; }
        .sp-spec { font-family: var(--theme-font-mono, monospace); font-size: 11px; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--sp-red); margin-bottom: 12px; }
        .sp-name { font-family: var(--theme-font-display, 'Archivo Black'), sans-serif; font-size: 19px; margin: 0 0 10px; letter-spacing: -0.01em; }
        .sp-amount { font-family: var(--theme-font-display, 'Archivo Black'), sans-serif; font-size: 30px; line-height: 1; margin-bottom: 14px; }
        .sp-period { font-family: var(--theme-font-body, 'Inter'), sans-serif; font-size: 13px; font-weight: 500; opacity: 0.6; margin-left: 4px; }
        .sp-desc { font-size: 13px; opacity: 0.72; line-height: 1.5; margin: 0 0 14px; }
        .sp-feats { list-style: none; padding: 0; margin: 0 0 18px; display: flex; flex-direction: column; gap: 8px; }
        .sp-feats li { font-size: 13px; opacity: 0.85; display: flex; align-items: flex-start; gap: 9px; }
        .sp-tick { color: var(--sp-red); font-weight: 700; }
        .sp-cta { margin-top: auto; font-family: var(--theme-font-mono, monospace); font-size: 11px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase; color: var(--sp-red); cursor: pointer; }
        .sp-group { margin-bottom: 30px; }
        .sp-group-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 16px; padding-bottom: 10px;
          border-bottom: 1px solid var(--theme-card-border, rgba(255,255,255,0.09)); }
        .sp-group-title { font-family: var(--theme-font-display, 'Archivo Black'), sans-serif; font-size: 16px; }
        .sp-group-sub { font-size: 12px; opacity: 0.6; }
        .sp-note { display: flex; flex-direction: column; gap: 6px; margin-top: 22px; padding: 22px 24px; border-radius: 14px;
          background: rgba(227,30,36,0.08); border: 1px solid rgba(227,30,36,0.25); }
        .sp-note-h { font-family: var(--theme-font-display, 'Archivo Black'), sans-serif; font-size: 17px; }
        .sp-note-t { font-size: 14px; opacity: 0.78; line-height: 1.55; }
        .sp-rates { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; }
        .sp-rate { flex: 1; min-width: 130px; padding: 16px 18px; border-radius: 12px;
          background: var(--theme-card-bg, rgba(255,255,255,0.04)); border: 1px solid var(--theme-card-border, rgba(255,255,255,0.09)); }
        .sp-rate b { display: block; font-family: var(--theme-font-display, 'Archivo Black'), sans-serif; font-size: 18px; color: var(--sp-red); }
        .sp-rate span { font-size: 12px; opacity: 0.7; }
      `}</style>
    </div>
  );
}
