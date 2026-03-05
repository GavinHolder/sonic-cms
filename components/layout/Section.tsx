import Container from "@/components/ui/Container";
import Banner from "@/components/ui/Banner";

export interface SectionProps {
  children: React.ReactNode;
  className?: string;
  background?: string; // Preset name ("white", "gray", etc.) or custom hex ("#2563eb")
  containerSize?: "sm" | "md" | "lg" | "xl" | "full";
  spacing?: "sm" | "md" | "lg" | "none";
  paddingTop?: number; // Custom top padding in pixels
  paddingBottom?: number; // Custom bottom padding in pixels
  banner?: {
    content: React.ReactNode;
    variant: "info" | "success" | "warning" | "error";
  };
  id?: string;
  fullScreen?: boolean; // Enable full-screen snap mode with internal scrolling
  snapThreshold?: number; // Snap aggressiveness (0-100%, default 50%)
}

export default function Section({
  children,
  className = "",
  background = "white",
  containerSize = "lg",
  spacing = "lg",
  paddingTop,
  paddingBottom,
  banner,
  id,
  fullScreen = false,
  snapThreshold = 100, // Default 100% = one full viewport height (more aggressive)
}: SectionProps) {
  // Navbar height constant for consistent spacing across all sections
  const NAVBAR_HEIGHT = 100; // pixels (navbar + safe clearance)

  // Background colors: preset names mapped to values, custom hex used directly
  const backgroundPresets: Record<string, string> = {
    white: "#ffffff",
    gray: "#f8f9fa",
    blue: "rgba(37, 99, 235, 0.1)",
    transparent: "transparent",
    lightblue: "#dbeafe",
  };

  // Resolve: if it's a preset name use the mapping, otherwise treat as raw CSS color
  const resolvedBg = backgroundPresets[background] ?? background;

  // Default spacing values (in pixels) when not using custom padding
  const defaultSpacings = {
    none: { top: 0, bottom: 0 },
    sm: { top: 48, bottom: 48 },
    md: { top: 64, bottom: 64 },
    lg: { top: 80, bottom: 80 },
  };

  // Enforce minimum top padding to prevent content from hiding behind navbar
  const getEnforcedPadding = () => {
    let topPadding: number;
    let bottomPadding: number;

    // Calculate top padding (always enforce minimum)
    if (paddingTop !== undefined) {
      topPadding = Math.max(paddingTop, NAVBAR_HEIGHT);
    } else {
      const defaultTop = defaultSpacings[spacing].top;
      topPadding = Math.max(defaultTop, NAVBAR_HEIGHT);
    }

    // Calculate bottom padding (no minimum enforcement)
    if (paddingBottom !== undefined) {
      bottomPadding = paddingBottom;
    } else {
      bottomPadding = defaultSpacings[spacing].bottom;
    }

    return { topPadding, bottomPadding };
  };

  const { topPadding, bottomPadding } = getEnforcedPadding();

  // Use CSS custom properties for dynamic values
  // This allows media queries and better CSS architecture
  const cssVars = {
    "--section-pt": `${topPadding}px`,
    "--section-pb": `${bottomPadding}px`,
    "--section-bg": resolvedBg,
    "--section-min-h": fullScreen ? "100vh" : "auto",
  } as React.CSSProperties;

  return (
    <section
      id={id}
      className={`cms-section ${className}`}
      style={cssVars}
      data-fullscreen={fullScreen ? "true" : "false"}
      data-background={background}
      data-snap-threshold={snapThreshold}
    >
      <div className="section-content-wrapper">
        <Container size={containerSize}>
          {banner && (
            <Banner variant={banner.variant} className="mb-4">
              {banner.content}
            </Banner>
          )}
          {children}
        </Container>
      </div>
    </section>
  );
}
