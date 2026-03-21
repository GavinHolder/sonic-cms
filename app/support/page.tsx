import type { Metadata } from "next";
import { fetchSeoConfig, buildMetadata } from "@/lib/metadata-generator";

export async function generateMetadata(): Promise<Metadata> {
  const seoConfig = await fetchSeoConfig();
  return buildMetadata({ title: "Support", metaDescription: "Get help and contact our support team.", slug: "support" }, seoConfig);
}

export default function SupportPage() {
  return (
    <main className="w-full bg-white py-20">
      <div className="mx-auto max-w-5xl px-4">
        {/* Page Title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Support</h1>
          <p className="mt-4 text-lg text-gray-600">
            Need help? We&apos;ve got your back — reach out and we&apos;ll get you sorted.
          </p>
        </div>

        {/* Contact Options */}
        <section className="mt-12 justify-items-center">
          <h2 className="text-2xl font-semibold text-gray-900">Contact Us</h2>

          <div className="mt-6 space-y-4 text-gray-700">
            <p>
              <strong>Phone:</strong> +27 00 000 0000
            </p>
            <p>
              <strong>Email:</strong>{" "}
              <a
                href="mailto:support@yourcompany.co.za"
                className="text-blue-600 hover:underline"
              >
                support@yourcompany.co.za
              </a>
            </p>
            <p>
              <strong>Office Hours:</strong> Monday–Friday, 08:00–17:00
            </p>
          </div>
        </section>

        {/* Troubleshooting Checklist */}
        <section className="mt-16 justify-items-center">
          <h2 className="text-2xl font-semibold text-gray-900">
            Quick Troubleshooting
          </h2>
          <p className="mt-2 text-gray-600">
            Before contacting support, try these quick checks — they solve 80%
            of issues without waiting for a callback.
          </p>

          <ul className="mt-6 list-disc space-y-3 pl-6 text-gray-700">
            <li>
              Check that your equipment is powered on and all cables are firmly
              connected.
            </li>
            <li>
              Restart your equipment (turn it off for 30 seconds, then back on).
            </li>
            <li>
              Ensure your account is active and not suspended for billing.
            </li>
            <li>Check if only one device is affected or your whole setup.</li>
            <li>
              Verify if there&apos;s a known issue in your area (call us if unsure).
            </li>
          </ul>
        </section>

        {/* When to Contact Support */}
        <section className="mt-16 justify-items-center">
          <h2 className="text-2xl font-semibold text-gray-900">
            When Should You Contact Us?
          </h2>

          <ul className="mt-6 list-disc space-y-3 pl-6 text-gray-700">
            <li>Your service is down and rebooting didn&apos;t help.</li>
            <li>You&apos;re experiencing performance issues.</li>
            <li>You want to change your package or update account details.</li>
            <li>You need help with installation or upgrades.</li>
          </ul>
        </section>

        {/* Final CTA */}
        <section className="mt-20 text-center">
          <a
            href="mailto:support@yourcompany.co.za"
            className="inline-block rounded bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Contact Support
          </a>
        </section>
      </div>
    </main>
  );
}
