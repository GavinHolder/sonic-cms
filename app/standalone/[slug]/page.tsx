import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCmsSiteData, replaceCmsVars } from "@/lib/cms-site-data";
import type { FormField } from "@/types/page";
import { PageType } from "@prisma/client";

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

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildFormHtml(slug: string, title: string, fields: FormField[]): string {
  const fieldHtml = fields.map(f => {
    const label = `<label for="cms-f-${escHtml(f.id)}">${escHtml(f.label)}${f.required ? " *" : ""}</label>`;
    const req = f.required ? " required" : "";
    const ph = f.placeholder ? ` placeholder="${escHtml(f.placeholder)}"` : "";

    if (f.type === "textarea") {
      return `<div>${label}<textarea id="cms-f-${escHtml(f.id)}" name="${escHtml(f.name)}"${ph}${req}></textarea></div>`;
    }
    if (f.type === "select") {
      const opts = (f.options ?? []).map(o => {
        const val = typeof o === "string" ? o : o.value;
        const lbl = typeof o === "string" ? o : o.label;
        return `<option value="${escHtml(val)}">${escHtml(lbl)}</option>`;
      }).join("");
      return `<div>${label}<select id="cms-f-${escHtml(f.id)}" name="${escHtml(f.name)}"${req}><option value="">Select...</option>${opts}</select></div>`;
    }
    if (f.type === "checkbox") {
      return `<div style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="cms-f-${escHtml(f.id)}" name="${escHtml(f.name)}"${req}>${label}</div>`;
    }
    const inputType = f.type === "phone" ? "tel" : f.type;
    return `<div>${label}<input type="${inputType}" id="cms-f-${escHtml(f.id)}" name="${escHtml(f.name)}"${ph}${req}></div>`;
  }).join("\n");

  return `<form data-cms-form data-source="${escHtml(title)}" style="display:flex;flex-direction:column;gap:1rem">\n${fieldHtml}\n<div><button type="submit">Submit</button></div>\n</form>`;
}

export default async function StandalonePage({ params }: Props) {
  const { slug } = await params;

  const page = await prisma.page.findUnique({
    where: { slug, type: "STANDALONE", enabled: true },
    select: { customHtml: true, customCss: true, customCssUrls: true, title: true, mediaSlots: true },
  });

  if (!page) notFound();

  const siteData = await getCmsSiteData();
  let html = replaceCmsVars(page.customHtml || "", siteData);
  let css = replaceCmsVars(page.customCss || "", siteData);

  // Layer 2: media slot replacement
  const mediaSlots = (page.mediaSlots && typeof page.mediaSlots === "object" && !Array.isArray(page.mediaSlots))
    ? (page.mediaSlots as Record<string, string>)
    : {};
  html = html.replace(/\{\{cms\.media\.([a-z0-9_-]+)\}\}/g, (_, name: string) => mediaSlots[name] ?? "");
  css  = css.replace( /\{\{cms\.media\.([a-z0-9_-]+)\}\}/g, (_, name: string) => mediaSlots[name] ?? "");

  // Layer 3: form injection
  let formsInjected = false;
  const formMatches = [...html.matchAll(/\{\{cms\.form\.([a-z0-9-]+)\}\}/g)];
  for (const [match, formSlug] of formMatches) {
    const formPage = await prisma.page.findUnique({
      where: { slug: formSlug, type: PageType.FORM, enabled: true },
      select: { formConfig: true, title: true },
    });
    const fields = formPage
      ? ((formPage.formConfig as { fields?: FormField[] } | null)?.fields ?? [])
      : [];
    const formHtml = formPage
      ? buildFormHtml(formSlug, formPage.title, fields)
      : `<!-- CMS form '${formSlug}' not found -->`;
    html = html.replace(match, formHtml);
    if (formPage) formsInjected = true;
  }

  const cssUrls: string[] = (() => {
    try { return JSON.parse(page.customCssUrls || "[]"); } catch { return []; }
  })();

  /* eslint-disable react/no-danger */
  /* SECURITY: customHtml/customCss are admin-authored content stored in the DB.
     Write access is restricted to SUPER_ADMIN and ADMIN roles. Not user input. */
  return (
    <>
      <head>
        {formsInjected && <script src="/cms-forms.js" />}
        {cssUrls.map((url, i) => (
          <link key={i} rel="stylesheet" href={url} />
        ))}
        {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      </head>

      {html
        ? <div dangerouslySetInnerHTML={{ __html: html }} />
        : (
          <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center",
            justifyContent: "center", fontFamily: "system-ui, sans-serif",
            color: "#6b7280", textAlign: "center",
          }}>
            <div>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>{page.title}</h2>
              <p>No HTML content yet. Edit this page in Admin &rarr; Pages.</p>
            </div>
          </div>
        )
      }
    </>
  );
  /* eslint-enable react/no-danger */
}
