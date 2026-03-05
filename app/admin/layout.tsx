import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "CMS Admin Portal",
  description: "Content Management System",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Bootstrap 5.3 CSS — admin only */}
      <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
        rel="stylesheet"
        integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN"
        crossOrigin="anonymous"
      />
      {/* Bootstrap Icons */}
      <link
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.min.css"
        rel="stylesheet"
      />

      {children}

      {/* Bootstrap 5.3 JS Bundle */}
      <Script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
    </>
  );
}
