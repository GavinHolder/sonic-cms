"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";

const TemplateBlock = dynamic(() => import("@/components/sections/blocks/TemplateBlock"), { ssr: false });

interface Props {
  html: string;
  css: string;
  productId?: string;
  networkSlug?: string;
  networkName?: string;
  productTypeSlugs?: string[];
  templateOptions?: Record<string, string>;
}

export default function TemplatePreviewClient({ html, css, productId, networkSlug, networkName, productTypeSlugs, templateOptions }: Props) {
  // app/globals.css sets body{background:#fff} site-wide — correct for real pages, but
  // this route is nothing but a bare canvas-preview iframe (nested inside the Designer's
  // own canvas iframe) whose whole point is to show the template floating transparently
  // over whatever section background the Designer canvas paints behind it. Scoped to just
  // this route's own DOM, not the shared stylesheet — matches CLAUDE.md's rule against
  // touching global/shared files for a single feature.
  useEffect(() => {
    const prevBody = document.body.style.background;
    const prevHtml = document.documentElement.style.background;
    document.body.style.background = "transparent";
    document.documentElement.style.background = "transparent";
    return () => {
      document.body.style.background = prevBody;
      document.documentElement.style.background = prevHtml;
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh", background: "transparent", overflow: "hidden" }}>
      <TemplateBlock
        html={html}
        css={css}
        productId={productId}
        networkSlug={networkSlug}
        networkName={networkName}
        productTypeSlugs={productTypeSlugs}
        templateOptions={templateOptions}
      />
    </div>
  );
}
