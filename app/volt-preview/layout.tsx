/** Bare layout for the Volt preview iframe — no navbar, no footer, transparent bg */
export default function VoltPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ background: "transparent" }}>
      <body style={{ margin: 0, padding: 0, background: "transparent" }}>
        {children}
      </body>
    </html>
  );
}
