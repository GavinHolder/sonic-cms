"use client";
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

interface ClientLayoutProps {
  children: React.ReactNode;
  showNavigation: boolean;
}

/**
 * ClientLayout wraps page content.
 *
 * For public pages (showNavigation=true): renders a scroll-snap container div.
 * Scroll snap is on this wrapper instead of html because Chromium doesn't
 * reliably support scroll-snap-type on the viewport scroll container.
 *
 * For admin pages (showNavigation=false): pure pass-through, no snap.
 */
export default function ClientLayout({ children, showNavigation }: ClientLayoutProps) {
  const snapRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Reset snap container to top on every route change so the hero always loads first
  useEffect(() => {
    if (snapRef.current) {
      snapRef.current.scrollTop = 0
    }
  }, [pathname])

  if (!showNavigation) {
    return <>{children}</>;
  }

  return (
    <div id="snap-container" ref={snapRef}>
      {children}
    </div>
  );
}
