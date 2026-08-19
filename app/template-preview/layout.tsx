/** Bare layout for the Section Block template preview iframe — no navbar, no footer,
 * transparent bg. Mirrors app/volt-preview/layout.tsx exactly. */
export default function TemplatePreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "transparent" }}>
        {children}
      </body>
    </html>
  );
}
