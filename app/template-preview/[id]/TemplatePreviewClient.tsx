"use client";

import dynamic from "next/dynamic";

const TemplateBlock = dynamic(() => import("@/components/sections/blocks/TemplateBlock"), { ssr: false });

interface Props {
  html: string;
  css: string;
  productId?: string;
  networkSlug?: string;
  networkName?: string;
  productTypeSlugs?: string[];
}

export default function TemplatePreviewClient({ html, css, productId, networkSlug, networkName, productTypeSlugs }: Props) {
  return (
    <div style={{ width: "100%", height: "100vh", background: "transparent", overflow: "hidden" }}>
      <TemplateBlock
        html={html}
        css={css}
        productId={productId}
        networkSlug={networkSlug}
        networkName={networkName}
        productTypeSlugs={productTypeSlugs}
      />
    </div>
  );
}
