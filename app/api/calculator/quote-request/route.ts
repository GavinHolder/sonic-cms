import { NextRequest, NextResponse } from "next/server";
import { createTransporter, getEmailConfig } from "@/lib/email";
import { renderEmailLayout, buildEmailTheme, sectionHeading, dataTable, paragraph } from "@/lib/email/layout";
import { resolveEmailLogo } from "@/lib/email/assets";
import { getEmailSettings, DEFAULT_EMAIL_SETTINGS } from "@/lib/email-settings";

// Strips CR/LF so client-supplied values can't inject extra email headers (e.g. a fake
// "Bcc:" line) when interpolated into the Subject header.
function stripCrlf(value: unknown): string {
  return String(value ?? "").replace(/[\r\n]+/g, " ");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, notes, calcType, strength, dimensions, result, currency, refNumber } = body;

    if (!name || !email) {
      return NextResponse.json({ success: false, error: "Name and email are required." }, { status: 400 });
    }

    const cfg = await getEmailConfig();
    if (!cfg.admin_email) {
      return NextResponse.json({ success: false, error: "Admin email not configured." }, { status: 500 });
    }

    const transporter = await createTransporter();

    const appearance = await getEmailSettings().catch(() => DEFAULT_EMAIL_SETTINGS);
    const theme = buildEmailTheme({ brand: appearance.brandColor, headerBg: appearance.headerBg, pageBg: appearance.pageBg });
    const logo = resolveEmailLogo();

    // Every user-supplied value is escaped inside the layout helpers (dataTable/paragraph/title).
    const dimRows = Object.entries((dimensions ?? {}) as Record<string, number>).map(([k, v]) => ({
      label: k.charAt(0).toUpperCase() + k.slice(1),
      value: `${Number(v).toLocaleString()} mm`,
    }));

    const clientRows = [
      { label: "Name", value: String(name) },
      { label: "Email", value: String(email) },
      ...(phone ? [{ label: "Phone", value: String(phone) }] : []),
      ...(notes ? [{ label: "Notes", value: String(notes) }] : []),
    ];

    const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    const html = renderEmailLayout({
      title: "Quote Request Received",
      preheader: `Quote request ${stripCrlf(refNumber)} from ${stripCrlf(name)}`,
      theme,
      logoSrc: logo.src,
      showLogo: appearance.showLogo,
      showCompanyName: appearance.showCompanyName,
      footerText: `Reply directly to this email to respond to the client · ${date}`,
      bodyHtml:
        paragraph(`Reference: ${refNumber}`, theme) +
        sectionHeading("Client Details", theme) +
        dataTable(clientRows, theme) +
        sectionHeading("Estimate Details", theme) +
        dataTable(
          [
            { label: "Project Type", value: String(calcType) },
            { label: "Mix Strength", value: String(strength) },
            ...dimRows,
          ],
          theme
        ) +
        sectionHeading("Calculated Quantities", theme) +
        dataTable(
          [
            { label: "Volume", value: `${Number(result.volumeM3)} m³` },
            { label: "Weight", value: `${Number(result.weightKg).toLocaleString()} kg` },
            { label: "Cement Bags", value: `${Number(result.cementBags)} bags` },
            { label: "Estimated Total", value: `${currency ?? ""}${Number(result.estimatedCost).toLocaleString()}` },
          ],
          theme
        ),
      cta: { label: "Reply to Client", href: `mailto:${stripCrlf(email)}` },
    });

    await transporter.sendMail({
      from: cfg.smtp_from || cfg.smtp_user,
      to: cfg.admin_email,
      replyTo: stripCrlf(email),
      subject: stripCrlf(`Quote Request ${refNumber} — ${name} (${calcType})`),
      html,
      attachments: appearance.showLogo && logo.attachment ? [logo.attachment] : [],
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send quote request.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
