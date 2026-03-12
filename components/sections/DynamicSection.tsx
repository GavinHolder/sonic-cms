'use client'

import React, { useRef } from "react";
import dynamic from "next/dynamic";
import DOMPurify from "isomorphic-dompurify";
import HeroCarousel from "./HeroCarousel";

const AnimBgRenderer = dynamic(() => import("./AnimBgRenderer"), { ssr: false });
const MotionElementRenderer = dynamic(() => import("./MotionElementRenderer"), { ssr: false });
const VoltRenderer = dynamic(() => import('@/components/volt/VoltRenderer'), { ssr: false });
const Volt3DRenderer = dynamic(() => import('./Volt3DRenderer'), { ssr: false })
import TextImageSection from "./TextImageSection";
import StatsGrid from "./StatsGrid";
import CardGrid from "./CardGrid";
import CTAFooter from "./CTAFooter";
import FlexibleSectionRenderer from "./FlexibleSectionRenderer";
import TriangleSectionWrapper from "./TriangleSectionWrapper";
import LowerThirdRenderer from "./LowerThirdRenderer";
import SectionTextOverlay from "./SectionTextOverlay";
import Section from "@/components/layout/Section";
import {
  getEffectiveBackgroundColor,
  getContrastColor,
  getTextColorClasses,
} from "@/lib/color-utils";
import Banner from "@/components/ui/Banner";
import type {
  SectionConfig,
  FooterSection,
  CTASection,
  NormalSection,
  FlexibleSection,
} from "@/types/section";
import type { VoltElementData } from '@/types/volt'

/**
 * DynamicSection Component
 *
 * Renders any section type based on configuration from backend.
 * This is the bridge between backend data and React components.
 *
 * Supports visual override mode: when a section has visualOverride.enabled = true,
 * it renders custom HTML instead of the structured component.
 *
 * Usage:
 * ```tsx
 * <DynamicSection section={sectionConfig} />
 * ```
 */
interface DynamicSectionProps {
  section: SectionConfig;
  isFirstAfterHero?: boolean;
}

/**
 * Check if a section should have a triangle overlay.
 *
 * RULES:
 * - HERO and FOOTER sections NEVER get triangles
 * - The first section after hero (order 1) NEVER gets a triangle
 *   (it would overlap the hero which looks bad)
 * - Section must have triangleEnabled = true
 */
function shouldShowTriangle(section: SectionConfig, isFirstAfterHero: boolean): boolean {
  if (!section.triangleEnabled) return false;
  if (section.type === "HERO" || section.type === "FOOTER") return false;
  if (isFirstAfterHero) return false;
  return true;
}

/** Wraps any section JSX with LowerThirdRenderer and/or MotionElementRenderer if configured */
function wrapSection(section: SectionConfig, el: React.ReactElement): React.ReactElement {
  const hasLt = section.lowerThird?.enabled;
  const hasMotion = section.motionElements && section.motionElements.length > 0;
  if (!hasLt && !hasMotion) return el;

  return (
    <div style={{ position: "relative" }}>
      {/* z-index 10: section content sits above "behind" motion layer (z:5) but below
          "above-lower-third" (z:15) and "above-content" (z:25) motion layers */}
      <div style={{ position: "relative", zIndex: 10 }}>{el}</div>
      {hasLt && <LowerThirdRenderer config={section.lowerThird!} />}
      {hasMotion && (
        <MotionElementRenderer elements={section.motionElements!} sectionId={section.id} />
      )}
    </div>
  );
}

export default function DynamicSection({ section, isFirstAfterHero = false }: DynamicSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null)

  // Don't render disabled sections
  if (!section.enabled) {
    return null;
  }

  // ⚡ Volt Studio — renders volt design when applied to this section
  if ((section as any).voltElementId && (section as any).voltElement) {
    const voltEl = (section as any).voltElement as VoltElementData
    const slotMap = (section as any).voltSlotMap ?? {}
    const sectionContent = (section as any).content ?? {}

    const slots: Record<string, string> = {}
    for (const [slotId, fieldName] of Object.entries(slotMap)) {
      const val = sectionContent[fieldName as string]
      if (typeof val === 'string') slots[slotId] = val
    }

    const wrapped = wrapSection(section, (
      <section
        ref={sectionRef}
        id={section.id}
        data-section-id={section.id}
        className="cms-section"
        style={{
          '--section-bg': 'transparent',
          '--section-pt': `${section.paddingTop ?? 80}px`,
          '--section-pb': `${section.paddingBottom ?? 80}px`,
        } as React.CSSProperties}
      >
        <div className="section-content-wrapper">
          <VoltRenderer voltElement={voltEl} slots={slots} style={{ width: '100%', height: '100%' }} />
        </div>
        {voltEl.layers
          .filter(l => l.type === '3d-object' && l.visible !== false && l.object3DData?.assetUrl)
          .map(l => (
            <Volt3DRenderer
              key={l.id}
              data={l.object3DData!}
              x={l.x}
              y={l.y}
              width={l.width}
              height={l.height}
              sectionRef={sectionRef}
            />
          ))}
      </section>
    ))

    if (shouldShowTriangle(section, isFirstAfterHero)) {
      return <TriangleSectionWrapper section={section}>{wrapped}</TriangleSectionWrapper>
    }
    return wrapped
  }

  // Cast to any for legacy kebab-case branches that access non-typed properties
  const s = section as any;

  switch (section.type as string) {
    case "hero":
    case "hero-carousel":
    case "HERO":
      return <HeroCarousel section={section as any} />;

    case "text-image": {
      const el = (
        <TextImageSection
          id={s.id}
          heading={s.heading}
          content={s.content}
          imageSrc={s.imageSrc}
          imageAlt={s.imageAlt}
          layout={s.layout}
          buttons={s.buttons}
          background={s.background}
          banner={s.banner}
          paddingTop={s.paddingTop}
          paddingBottom={s.paddingBottom}
          fullScreen={s.fullScreen}
          snapThreshold={s.snapThreshold}
        />
      );
      const wrapped = wrapSection(section, el);
      if (shouldShowTriangle(section, isFirstAfterHero)) {
        return <TriangleSectionWrapper section={section}>{wrapped}</TriangleSectionWrapper>;
      }
      return wrapped;
    }

    case "stats-grid": {
      const el = (
        <StatsGrid
          id={s.id}
          heading={s.heading}
          subheading={s.subheading}
          stats={s.stats}
          columns={s.columns}
          background={s.background}
          banner={s.banner}
          paddingTop={s.paddingTop}
          paddingBottom={s.paddingBottom}
          fullScreen={s.fullScreen}
          snapThreshold={s.snapThreshold}
        />
      );
      const wrapped = wrapSection(section, el);
      if (shouldShowTriangle(section, isFirstAfterHero)) {
        return <TriangleSectionWrapper section={section}>{wrapped}</TriangleSectionWrapper>;
      }
      return wrapped;
    }

    case "card-grid": {
      const el = (
        <CardGrid
          id={s.id}
          heading={s.heading}
          subheading={s.subheading}
          cards={s.cards}
          columns={s.columns}
          background={s.background}
          banner={s.banner}
          paddingTop={s.paddingTop}
          paddingBottom={s.paddingBottom}
          fullScreen={s.fullScreen}
          snapThreshold={s.snapThreshold}
        />
      );
      const wrapped = wrapSection(section, el);
      if (shouldShowTriangle(section, isFirstAfterHero)) {
        return <TriangleSectionWrapper section={section}>{wrapped}</TriangleSectionWrapper>;
      }
      return wrapped;
    }

    case "banner": {
      const el = (
        <div
          className="w-100"
          style={{
            position: "relative",
            zIndex: 1,
            display: "block",
            width: "100%",
            maxWidth: "100%",
            margin: 0,
            padding: 0,
          }}
        >
          <Banner variant={s.variant}>
            <div dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(s.content, {
                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
                ALLOWED_ATTR: ['href', 'target', 'rel']
              })
            }} />
          </Banner>
        </div>
      );
      const wrapped = wrapSection(section, el);
      if (shouldShowTriangle(section, isFirstAfterHero)) {
        return <TriangleSectionWrapper section={section}>{wrapped}</TriangleSectionWrapper>;
      }
      return wrapped;
    }

    case "table":
      return (
        <Section
          background={s.background}
          containerSize="lg"
          paddingTop={s.paddingTop}
          paddingBottom={s.paddingBottom}
          banner={s.banner}
          fullScreen={s.fullScreen}
          snapThreshold={s.snapThreshold}
        >
          {s.heading && (
            <h2 className="h2 fw-bold text-center mb-2">{s.heading}</h2>
          )}
          {s.subheading && (
            <p className="text-center text-muted mb-4">{s.subheading}</p>
          )}

          <div className="table-responsive">
            <table
              className={`table ${s.striped ? "table-striped" : ""} ${
                s.bordered ? "table-bordered" : ""
              } ${s.hover ? "table-hover" : ""}`}
            >
              <thead>
                <tr>
                  {s.headers.map((header: any, index: number) => (
                    <th key={index}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.rows.map((row: any) => (
                  <tr key={row.id}>
                    {row.cells.map((cell: any, cellIndex: number) => (
                      <td key={cellIndex} dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(cell, {
                          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'span', 'br'],
                          ALLOWED_ATTR: ['href', 'class', 'target', 'rel']
                        })
                      }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      );

    case "cta-footer": {
      const el = (
        <CTAFooter
          heading={s.heading}
          subheading={s.subheading}
          buttons={s.buttons}
          contactInfo={s.contactInfo}
          socialLinks={s.socialLinks}
          background={s.background}
          paddingTop={s.paddingTop}
          paddingBottom={s.paddingBottom}
          fullScreen={s.fullScreen}
          snapThreshold={s.snapThreshold}
        />
      );
      const wrapped = wrapSection(section, el);
      if (shouldShowTriangle(section, isFirstAfterHero)) {
        return <TriangleSectionWrapper section={section}>{wrapped}</TriangleSectionWrapper>;
      }
      return wrapped;
    }

    case "flexible":
    case "FLEXIBLE": {
      const el = <FlexibleSectionRenderer section={section as FlexibleSection} />;
      const wrapped = wrapSection(section, el);
      if (shouldShowTriangle(section, isFirstAfterHero)) {
        return <TriangleSectionWrapper section={section}>{wrapped}</TriangleSectionWrapper>;
      }
      return wrapped;
    }

    case "footer":
    case "FOOTER": {
      // Footer NEVER gets triangle overlay (enforced in renderTriangleOverlay too)
      return <FooterRenderer section={section as FooterSection} />;
    }

    case "cta":
    case "CTA": {
      const el = <CTARenderer section={section as CTASection} />;
      const wrapped = wrapSection(section, el);
      if (shouldShowTriangle(section, isFirstAfterHero)) {
        return <TriangleSectionWrapper section={section}>{wrapped}</TriangleSectionWrapper>;
      }
      return wrapped;
    }

    case "normal":
    case "NORMAL": {
      const el = <NormalRenderer section={section as NormalSection} />;
      const wrapped = wrapSection(section, el);
      if (shouldShowTriangle(section, isFirstAfterHero)) {
        return <TriangleSectionWrapper section={section}>{wrapped}</TriangleSectionWrapper>;
      }
      return wrapped;
    }

    default:
      console.warn(`Unknown section type: ${(section as any).type}`);
      return null;
  }
}

/**
 * Footer section renderer with intelligent dynamic layout
 * Columns and certification logos adjust based on main logo position
 */
function FooterRenderer({ section }: { section: FooterSection }) {
  const { content, background, paddingTop, paddingBottom } = section;

  // Map preset background colors to hex values
  const bgColor =
    background === "gray"
      ? "#f8f9fa"
      : background === "blue"
      ? "#1e3a5f"
      : background === "lightblue"
      ? "#e8f4fd"
      : background === "transparent"
      ? "transparent"
      : "#ffffff";

  // Automatic text color adaptation based on background brightness
  const effectiveBgColor = getEffectiveBackgroundColor(
    bgColor,
    content.backgroundImage,
    content.gradient
  );
  const contrastColor = getContrastColor(effectiveBgColor);
  const { text: textClass, muted: mutedClass, link: linkClass, cursor: cursorClass } =
    getTextColorClasses(contrastColor);

  const logoPos = content.logoPosition || "top-left";

  // Helper to get alignment class
  const getAlignClass = (pos: string) => {
    if (pos.endsWith("center")) return "text-center justify-content-center";
    if (pos.endsWith("right")) return "text-end justify-content-end";
    return "text-start justify-content-start";
  };

  // Build logo element
  const logoElement = (content.logo || content.tagline) && (
    <div className="mb-3">
      {content.logo && (
        <img
          src={content.logo}
          alt="Logo"
          style={{ maxHeight: "60px", marginBottom: "12px" }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
      {content.tagline && (
        <p className={`${mutedClass} small mb-0`}>{content.tagline}</p>
      )}
    </div>
  );

  // Build company info element
  const ci = content.companyInfo;
  const companyInfoElement = (ci && (ci.name || ci.address || ci.phone || ci.email)) && (
    <div className="mb-3">
      {ci.name && (
        <h6 className={`fw-bold mb-2 ${textClass}`}>{ci.name}</h6>
      )}
      {ci.address && (
        <p className={`small mb-1 ${mutedClass}`}>
          <i className="bi bi-geo-alt me-1"></i>
          {ci.address}
        </p>
      )}
      {ci.phone && (
        <p className={`small mb-1 ${mutedClass}`}>
          <i className="bi bi-telephone me-1"></i>
          <a href={`tel:${ci.phone}`} className={linkClass}>
            {ci.phone}
          </a>
        </p>
      )}
      {ci.email && (
        <p className={`small mb-0 ${mutedClass}`}>
          <i className="bi bi-envelope me-1"></i>
          <a href={`mailto:${ci.email}`} className={linkClass}>
            {ci.email}
          </a>
        </p>
      )}
    </div>
  );

  // Build certification logos - auto-flow based on main logo position
  const certLogos = content.certificationLogos?.filter(cert => cert.image) || [];
  const certElements = certLogos.map((cert, i) => (
    <div key={`cert-${i}`} className="mb-3 text-center">
      <img
        src={cert.image}
        alt="Certification"
        style={{ maxHeight: "50px", marginBottom: "8px" }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      {cert.text && (
        <p className={`${mutedClass} small mb-0`} style={{ whiteSpace: "pre-line" }}>
          {cert.text}
        </p>
      )}
    </div>
  ));

  // Build columns element with even distribution using flexbox
  const columnsElement = content.columns && content.columns.length > 0 && (
    <div className="d-flex gap-4 justify-content-between">
      {content.columns.map((col) => (
        <div key={col.id} style={{ flex: '1 1 0', minWidth: 0 }}>
          <h6 className={`fw-bold mb-3 ${textClass}`}>{col.title}</h6>
          <ul className="list-unstyled">
            {col.links.map((link, i) => (
              <li key={i} className="mb-2">
                <a href={link.href} className={linkClass}>
                  {link.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );

  // Build social links element
  const socialElement = content.socialLinks && content.socialLinks.length > 0 && (
    <div className="d-flex gap-3 mb-3">
      {content.socialLinks.map((social, i) => (
        <a
          key={i}
          href={social.url}
          className={linkClass}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={social.platform}
          title={social.platform}
        >
          <i className={`bi ${social.icon || "bi-link-45deg"} fs-5`}></i>
        </a>
      ))}
    </div>
  );

  // Build gradient overlay styles
  const getGradientStyle = (): React.CSSProperties => {
    const gradient = content.gradient;
    if (!gradient?.enabled) return {};

    if (gradient.type === "preset" && gradient.preset) {
      const { direction, startOpacity, endOpacity, color } = gradient.preset;

      // Convert hex color to rgba
      const hexToRgba = (hex: string, opacity: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
      };

      const directionMap: Record<string, string> = {
        top: "to top",
        bottom: "to bottom",
        left: "to left",
        right: "to right",
      };

      return {
        background: `linear-gradient(${directionMap[direction] || "to bottom"}, ${hexToRgba(color, startOpacity)}, ${hexToRgba(color, endOpacity)})`,
      };
    }

    if (gradient.type === "custom" && gradient.custom?.src) {
      return {
        backgroundImage: `url(${gradient.custom.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      };
    }

    return {};
  };

  // Build background styles (image only, no padding - handled by wrapper)
  const backgroundStyles: React.CSSProperties = {
    position: "relative",
  };

  // Add background image if provided
  if (content.backgroundImage) {
    backgroundStyles.backgroundImage = `url(${content.backgroundImage})`;
    backgroundStyles.backgroundSize = "cover";
    backgroundStyles.backgroundPosition = "center";
    backgroundStyles.backgroundRepeat = "no-repeat";
  }

  // Intelligent layout based on logo position
  return (
    <footer
      id={section.id}
      className={cursorClass}
      style={{
        ...backgroundStyles,
        "--section-bg": bgColor,
        "--section-pt": `${paddingTop ?? 80}px`,
        "--section-pb": `${paddingBottom ?? 40}px`,
      } as React.CSSProperties}
    >
      {/* Gradient overlay (if enabled) */}
      {content.gradient?.enabled && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            ...getGradientStyle(),
          }}
        />
      )}

      <div className="section-content-wrapper" style={{ justifyContent: "flex-start" }}>
        <div
          className="container"
          style={{
            position: "relative",
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }}
        >
        {/* TOP-LEFT: Logo + Company Info | Columns to the right */}
        {logoPos === "top-left" && (
          <div className="row mb-5 align-items-start">
            <div className="col-lg-3 col-md-4">
              {logoElement}
              {companyInfoElement && (
                <div className="mt-4 pt-4 border-top">
                  {companyInfoElement}
                </div>
              )}
              {socialElement && <div className="mt-4">{socialElement}</div>}
            </div>
            <div className="col-lg-8 col-md-7 offset-lg-1 offset-md-1">
              {columnsElement}
            </div>
          </div>
        )}

        {/* TOP-CENTER: Logo + Company Info centered, Columns below */}
        {logoPos === "top-center" && (
          <>
            <div className="row mb-5">
              <div className="col-12 text-center">
                {logoElement}
                {companyInfoElement && (
                  <div className="mt-4 pt-4 border-top d-inline-block">
                    {companyInfoElement}
                  </div>
                )}
                {socialElement && <div className="mt-4">{socialElement}</div>}
              </div>
            </div>
            <div className="row mb-5">
              <div className="col-12">{columnsElement}</div>
            </div>
          </>
        )}

        {/* TOP-RIGHT: Columns to the left | Logo + Company Info */}
        {logoPos === "top-right" && (
          <div className="row mb-5 align-items-start g-5">
            <div className="col-md-9 pe-5">
              {columnsElement}
            </div>
            <div className="col-md-3 ps-4 text-end">
              {logoElement}
              {companyInfoElement && (
                <div className="mt-4 pt-4 border-top">
                  {companyInfoElement}
                </div>
              )}
              {socialElement && <div className="mt-4 d-flex justify-content-end">{socialElement}</div>}
            </div>
          </div>
        )}

        {/* BOTTOM POSITIONS: Columns in middle, logo + company info at bottom */}
        {logoPos.startsWith("bottom") && (
          <>
            <div className="row mb-5">
              <div className="col-12">{columnsElement}</div>
            </div>
            <div className="row mb-5 align-items-start">
              {logoPos === "bottom-left" && (
                <div className="col-md-3 pe-4">
                  {logoElement}
                  {companyInfoElement && <div className="mt-4 pt-4 border-top">{companyInfoElement}</div>}
                  {socialElement && <div className="mt-4">{socialElement}</div>}
                </div>
              )}
              {logoPos === "bottom-center" && (
                <div className="col-12 text-center">
                  {logoElement}
                  {companyInfoElement && <div className="mt-4 pt-4 border-top d-inline-block">{companyInfoElement}</div>}
                  {socialElement && <div className="mt-4 d-flex justify-content-center">{socialElement}</div>}
                </div>
              )}
              {logoPos === "bottom-right" && (
                <div className="col-md-3 ms-auto ps-4 text-end">
                  {logoElement}
                  {companyInfoElement && <div className="mt-4 pt-4 border-top">{companyInfoElement}</div>}
                  {socialElement && <div className="mt-4 d-flex justify-content-end">{socialElement}</div>}
                </div>
              )}
            </div>
          </>
        )}

        {/* Certification Logos Row - ALWAYS at bottom before copyright, max 5 logos, evenly spaced */}
        {certElements.length > 0 && (
          <div className="row mb-5">
            <div className="col-12">
              <div className="d-flex justify-content-evenly align-items-center flex-wrap">
                {certElements.slice(0, 5)}
              </div>
            </div>
          </div>
        )}

        {/* Copyright - ALWAYS at the absolute bottom */}
        {content.copyright && (
          <div className={`row mt-auto pt-4 border-top`} style={{ marginTop: 'auto' }}>
            <div className="col-12">
              <div className={`small ${mutedClass} text-center`}>
                {content.copyright}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </footer>
  );
}

/**
 * CTA section renderer.
 *
 * When content.style === "contact-form" the section delegates entirely to
 * CTAFooter which handles form state, validation, and OTP verification.
 * All other styles use the inline banner/card/fullwidth layout below.
 */
function CTARenderer({ section }: { section: CTASection }) {
  const { content, background, paddingTop, paddingBottom } = section;

  // Contact-form mode: delegate to CTAFooter with all form-related props
  if (content.style === "contact-form") {
    return (
      <CTAFooter
        heading={content.heading}
        subheading={content.subheading}
        buttons={content.buttons}
        background={background}
        paddingTop={paddingTop}
        paddingBottom={paddingBottom}
        snapThreshold={(section as any).snapThreshold}
        style="contact-form"
        formFields={content.formFields}
        formTitle={content.formTitle}
        formSuccessMessage={content.formSuccessMessage}
        sectionName={section.displayName}
      />
    );
  }

  const bgColor =
    background === "blue"
      ? "#1e3a5f"
      : background === "lightblue"
      ? "#e8f4fd"
      : background === "gray"
      ? "#f8f9fa"
      : background === "transparent"
      ? "transparent"
      : "#ffffff";
  const isBlue = background === "blue";
  const textClass = isBlue ? "text-white" : "";
  const mutedClass = isBlue ? "text-white-50" : "text-muted";

  return (
    <section
      id={section.id}
      className="cms-section"
      style={{
        "--section-bg": bgColor,
        "--section-pt": `${paddingTop ?? 80}px`,
        "--section-pb": `${paddingBottom ?? 80}px`,
      } as React.CSSProperties}
    >
      <div className="section-content-wrapper" style={{ justifyContent: "center" }}>
        <div className="container text-center">
          {content.heading && (
            <h2 className={`fw-bold mb-3 ${textClass}`}>{content.heading}</h2>
          )}
          {content.subheading && (
            <p className={`lead mb-4 ${mutedClass}`}>{content.subheading}</p>
          )}
          {content.buttons && content.buttons.length > 0 && (
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              {content.buttons.map((btn, i) => (
                <a
                  key={i}
                  href={btn.href}
                  className={`btn ${
                    btn.variant === "outline"
                      ? isBlue
                        ? "btn-outline-light"
                        : "btn-outline-primary"
                      : btn.variant === "secondary"
                      ? "btn-secondary"
                      : isBlue
                      ? "btn-light"
                      : "btn-primary"
                  } btn-lg`}
                >
                  {btn.text}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Resolve background color from preset name or custom hex string.
 * Shared across section renderers.
 */
const BG_PRESETS: Record<string, string> = {
  white: "#ffffff",
  gray: "#f8f9fa",
  blue: "#1e3a5f",
  lightblue: "#e8f4fd",
  transparent: "transparent",
};

function resolveBgColor(background?: string): string {
  if (!background) return "#ffffff";
  return BG_PRESETS[background] ?? background;
}

/**
 * Determine if background is dark enough to need light text.
 * Handles both preset names and hex colors.
 */
function isDarkBackground(background?: string): boolean {
  if (!background) return false;
  // Known dark presets
  if (background === "blue") return true;
  // Known light presets
  if (background === "white" || background === "gray" || background === "lightblue" || background === "transparent") return false;
  // Custom hex - calculate luminance
  if (background.startsWith("#") && background.length >= 7) {
    const r = parseInt(background.slice(1, 3), 16);
    const g = parseInt(background.slice(3, 5), 16);
    const b = parseInt(background.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }
  return false;
}

/**
 * Normal section renderer
 * Supports text overlay, gradient overlay, background images, and custom hex backgrounds.
 */
function NormalRenderer({ section }: { section: NormalSection }) {
  const { content, background, paddingTop, paddingBottom } = section;
  const bgColor = resolveBgColor(background);
  const darkBg = isDarkBackground(background);
  const textClass = darkBg ? "text-white" : "";
  const mutedClass = darkBg ? "text-white-50" : "text-muted";

  const isImageLayout =
    content.layout === "text-image" || content.layout === "image-text";

  // Build background styles for image/video backgrounds
  const backgroundStyles: React.CSSProperties = {};
  if (content.backgroundImage) {
    backgroundStyles.backgroundImage = `url(${content.backgroundImage})`;
    backgroundStyles.backgroundSize = "cover";
    backgroundStyles.backgroundPosition = "center";
    backgroundStyles.backgroundRepeat = "no-repeat";
  }

  // Build gradient overlay style
  const getGradientStyle = (): React.CSSProperties => {
    const gradient = content.gradient;
    if (!gradient?.enabled) return {};

    if (gradient.type === "preset" && gradient.preset) {
      const { direction, startOpacity, endOpacity, color } = gradient.preset;
      const hexToRgba = (hex: string, opacity: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
      };
      const dirMap: Record<string, string> = {
        top: "to top", bottom: "to bottom", left: "to left", right: "to right",
        topLeft: "to top left", topRight: "to top right",
        bottomLeft: "to bottom left", bottomRight: "to bottom right",
      };
      return {
        background: `linear-gradient(${dirMap[direction] || "to bottom"}, ${hexToRgba(color, startOpacity)}, ${hexToRgba(color, endOpacity)})`,
      };
    }

    if (gradient.type === "custom" && gradient.custom?.src) {
      return {
        backgroundImage: `url(${gradient.custom.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      };
    }

    return {};
  };

  // Determine if section has visual background (image/video/gradient) for overlay contrast
  const hasVisualBg = !!(content.backgroundImage || content.backgroundVideo || content.gradient?.enabled);
  const overlayTextColor = hasVisualBg || darkBg ? "#ffffff" : "#1a1a1a";

  return (
    <section
      id={section.id}
      className="cms-section"
      data-content-mode={section.contentMode || "single"}
      style={{
        ...backgroundStyles,
        "--section-bg": bgColor,
        "--section-pt": `${paddingTop ?? 80}px`,
        "--section-pb": `${paddingBottom ?? 80}px`,
      } as React.CSSProperties}
    >
      {/* Animated background (if enabled) — stored in content.animBg */}
      {(content as any).animBg?.enabled && (
        <AnimBgRenderer config={(content as any).animBg} sectionId={section.id} />
      )}

      {/* Gradient overlay (if enabled) */}
      {content.gradient?.enabled && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            ...getGradientStyle(),
          }}
        />
      )}

      {/* Text overlay (animated on scroll) */}
      {content.overlay && (content.overlay.heading || content.overlay.subheading) && (
        <SectionTextOverlay
          heading={content.overlay.heading}
          subheading={content.overlay.subheading}
          animation={content.overlay.animation}
          position={content.overlay.position}
          textColor={overlayTextColor}
        />
      )}

      <div className="section-content-wrapper" style={{ position: "relative", zIndex: 20 }}>
        <div className="container">
          {content.heading && (
            <h2 className={`fw-bold mb-2 ${textClass}`}>{content.heading}</h2>
          )}
          {content.subheading && (
            <p className={`${mutedClass} mb-4`}>{content.subheading}</p>
          )}

          {isImageLayout && content.imageSrc ? (
            <div className="row align-items-center g-4">
              <div
                className={`col-md-6 ${
                  content.layout === "image-text" ? "order-md-1" : "order-md-2"
                }`}
              >
                <img
                  src={content.imageSrc}
                  alt={content.imageAlt || ""}
                  className="img-fluid rounded"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <div
                className={`col-md-6 ${
                  content.layout === "image-text" ? "order-md-2" : "order-md-1"
                }`}
              >
                {content.body && (
                  <div
                    className={textClass}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(content.body, {
                        ALLOWED_TAGS: [
                          "p", "h3", "h4", "h5", "ul", "ol", "li",
                          "strong", "em", "a", "br", "span", "div",
                          "table", "thead", "tbody", "tr", "th", "td",
                          "button", "i",
                        ],
                        ALLOWED_ATTR: [
                          "href", "class", "target", "rel", "style",
                          "id", "data-bs-toggle", "data-bs-target", "data-bs-parent",
                          "aria-label", "type",
                        ],
                      }),
                    }}
                  />
                )}
              </div>
            </div>
          ) : (
            content.body && (
              <div
                className={textClass}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(content.body, {
                    ALLOWED_TAGS: [
                      "p", "h3", "h4", "h5", "h6", "h2", "ul", "ol", "li",
                      "strong", "em", "a", "br", "span", "div",
                      "table", "thead", "tbody", "tr", "th", "td",
                      "button", "i",
                    ],
                    ALLOWED_ATTR: [
                      "href", "class", "target", "rel", "style",
                      "id", "data-bs-toggle", "data-bs-target", "data-bs-parent",
                      "aria-label", "type", "scope",
                    ],
                  }),
                }}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}
