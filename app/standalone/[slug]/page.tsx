import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCmsSiteData, replaceCmsVars } from "@/lib/cms-site-data";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = await prisma.page.findUnique({
    where: { slug, type: "STANDALONE", enabled: true },
    select: { title: true, metaTitle: true, metaDescription: true },
  });
  if (!page) return {};
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
  };
}

export default async function StandalonePage({ params }: Props) {
  const { slug } = await params;

  const page = await prisma.page.findUnique({
    where: { slug, type: "STANDALONE", enabled: true },
    select: { customHtml: true, customCss: true, customCssUrls: true, title: true },
  });

  if (!page) notFound();

  const siteData = await getCmsSiteData();
  const html = replaceCmsVars(page.customHtml || "", siteData);
  const css = replaceCmsVars(page.customCss || "", siteData);
  const cssUrls: string[] = (() => {
    try { return JSON.parse(page.customCssUrls || "[]"); } catch { return []; }
  })();

  return (
    <>
      <head>
        {/* External CSS files — admin-configured URLs */}
        {cssUrls.map((url, i) => (
          <link key={i} rel="stylesheet" href={url} />
        ))}
        {/* Inline custom CSS */}
        {/* eslint-disable-next-line react/no-danger */}
        {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      </head>

      {/* SECURITY: customHtml/customCss are admin-authored content stored in the DB.
          Write access is restricted to SUPER_ADMIN and ADMIN roles. Not user input. */}
      {html
        // eslint-disable-next-line react/no-danger
        ? <div dangerouslySetInnerHTML={{ __html: html }} />
        : (
          <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center",
            justifyContent: "center", fontFamily: "system-ui, sans-serif",
            color: "#6b7280", textAlign: "center",
          }}>
            <div>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>{page.title}</h2>
              <p>No HTML content yet. Edit this page in Admin → Pages.</p>
            </div>
          </div>
        )
      }
    </>
  );
}
