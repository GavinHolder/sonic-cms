import type { Metadata } from "next";
import { fetchSeoConfig, buildMetadata } from "@/lib/metadata-generator";

export async function generateMetadata(): Promise<Metadata> {
  const seoConfig = await fetchSeoConfig();
  return buildMetadata({ title: "Client Login", metaDescription: "Access your client account.", slug: "client-login", noindex: true }, seoConfig);
}

export default function ClientLoginPage() {
  return (
    <main className="w-full bg-white py-20">
      <div className="mx-auto max-w-4xl px-4 text-center">
        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-900">Client Login</h1>
        <p className="mt-4 text-lg text-gray-600">
          Access your account using the options below.
        </p>

        {/* Buttons */}
        <div className="mt-12 flex flex-col items-center justify-center gap-6 md:flex-row">
          {/* Client Portal */}
          <a
            href="#"
            className="w-full max-w-xs rounded bg-blue-600 px-8 py-4 text-center text-lg font-semibold text-white shadow hover:bg-blue-700"
          >
            Client Portal
          </a>

          {/* Webmail */}
          <a
            href="#"
            className="w-full max-w-xs rounded bg-sky-600 px-8 py-4 text-center text-lg font-semibold text-white shadow hover:bg-sky-700"
          >
            Webmail
          </a>
        </div>

        {/* Optional note */}
        <p className="mt-10 text-sm text-gray-500">
          Both links open in a new tab for your convenience.
        </p>
      </div>
    </main>
  );
}
