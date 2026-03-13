"use client";

import { useEffect, useRef, useState } from "react";
import ScrollStageTrack from "./ScrollStageTrack";
import type { ScrollStageConfig } from "./types";

interface Props {
  config: ScrollStageConfig;
  multiLimit: number;
  children: React.ReactNode;
  /** Section padding values — applied to the content column only */
  contentPaddingTop?: number;
  contentPaddingBottom?: number;
  /** Called whenever the active zone changes — lets parent sync content filtering */
  onActiveZoneChange?: (zone: number) => void;
}

export default function ScrollStageWrapper({
  config,
  multiLimit,
  children,
  contentPaddingTop = 100,
  contentPaddingBottom = 100,
  onActiveZoneChange,
}: Props) {
  const [activeZone, setActiveZone] = useState(0);
  const [contentOpacity, setContentOpacity] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sectionTopRef = useRef<number>(0);
  const prevZoneRef = useRef(0);

  // Mobile detection via matchMedia — avoids SSR mismatch
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    // Signal -1 to parent so it shows all zones in stacked layout on mobile
    if (mq.matches) onActiveZoneChange?.(-1);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (e.matches) onActiveZoneChange?.(-1);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const getScroller = () =>
    (document.getElementById('snap-container') as HTMLElement | null) ?? document.documentElement;

  const updateSectionTop = () => {
    if (!wrapperRef.current) return;
    const scroller = getScroller();
    const scrollerTop = scroller === document.documentElement ? 0 : scroller.getBoundingClientRect().top;
    const wrapperTop = wrapperRef.current.getBoundingClientRect().top;
    const scrollTop = scroller === document.documentElement ? window.scrollY : scroller.scrollTop;
    sectionTopRef.current = wrapperTop - scrollerTop + scrollTop;
  };

  useEffect(() => {
    updateSectionTop();
    window.addEventListener('resize', updateSectionTop, { passive: true });
    return () => window.removeEventListener('resize', updateSectionTop);
  }, []);

  // Zone detection via scroll position
  useEffect(() => {
    if (isMobile) return;
    const scroller = getScroller();
    const handleScroll = () => {
      updateSectionTop();
      const sectionTop = sectionTopRef.current;
      const zoneH = window.innerHeight;
      const scrollTop = scroller === document.documentElement ? window.scrollY : scroller.scrollTop;
      const relScroll = scrollTop - sectionTop;
      const mid = relScroll + zoneH * 0.5;
      const zone = Math.max(0, Math.min(multiLimit - 1, Math.floor(mid / zoneH)));

      if (zone !== prevZoneRef.current) {
        // Cross-fade content on zone change
        setContentOpacity(0);
        setTimeout(() => {
          setActiveZone(zone);
          prevZoneRef.current = zone;
          onActiveZoneChange?.(zone);
          setContentOpacity(1);
        }, 150);
      }
    };

    const target: EventTarget = scroller === document.documentElement ? window : scroller;
    target.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => target.removeEventListener('scroll', handleScroll);
  }, [isMobile, multiLimit, onActiveZoneChange]);

  const globalSide = config.side || 'right';
  const zones = config.zones || [];
  // Only use sideOverride that doesn't flip mid-section — use active zone's override
  const side = zones[activeZone]?.sideOverride || globalSide;

  // The outer wrapper is exactly multiLimit * 100vh tall — this is the scroll spacer.
  // Both columns stretch to fill it via alignItems: stretch. Sticky children inside each
  // column then scroll normally against #snap-container.
  const zoneH = `${multiLimit * 100}vh`;

  // Navbar height — sticky content must start below it
  const NAV_H = 76;
  // On mobile use the section's configured top padding (min NAV_H) so content
  // always clears the fixed navbar with proper breathing room
  const mobilePaddingTop = Math.max(NAV_H, contentPaddingTop);

  if (isMobile) {
    return <div style={{ paddingTop: mobilePaddingTop }}>{children}</div>;
  }

  const contentCol = (
    <div style={{ flex: '0 0 60%', minWidth: 0, position: 'relative' }}>
      <div style={{
        position: 'sticky',
        top: NAV_H,
        height: `calc(100vh - ${NAV_H}px)`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingTop: contentPaddingTop,
        paddingBottom: contentPaddingBottom,
        opacity: contentOpacity,
        transition: 'opacity 150ms ease',
      }}>
        {children}
      </div>
    </div>
  );

  const trackCol = (
    <div style={{ flex: '0 0 40%', minWidth: 0, position: 'relative' }}>
      <ScrollStageTrack
        zones={zones}
        activeZone={activeZone}
        sectionTopRef={sectionTopRef}
        scrollMode={config.scrollMode ?? 'snap'}
      />
    </div>
  );

  return (
    <div
      ref={wrapperRef}
      style={{ display: 'flex', alignItems: 'stretch', width: '100%', height: zoneH, position: 'relative' }}
    >
      {/* Zone snap markers — give #snap-container a snap point at each zone boundary.
          Zone 0 is covered by the section element's own scroll-snap-align: start.
          Zones 1..N need explicit markers so mandatory snap doesn't skip them. */}
      {Array.from({ length: multiLimit }, (_, i) => i > 0 && (
        <div
          key={`snap-zone-${i}`}
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: `${i * 100}vh`,
            left: 0,
            width: '100%',
            height: 1,
            scrollSnapAlign: 'start',
            pointerEvents: 'none',
          }}
        />
      ))}
      {side === 'right'
        ? <>{contentCol}{trackCol}</>
        : <>{trackCol}{contentCol}</>
      }
    </div>
  );
}
