import { NextRequest, NextResponse } from "next/server";
import { createTransporter, getEmailConfig } from "@/lib/email";

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

    const dimRows = Object.entries(dimensions as Record<string, number>)
      .map(([k, v]) => `<tr>
        <td style="padding:6px 12px;color:#6b7280;width:160px">${k.charAt(0).toUpperCase() + k.slice(1)}</td>
        <td style="padding:6px 12px;font-family:monospace;color:#111827">${Number(v).toLocaleString()} mm</td>
      </tr>`)
      .join("");

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Quote Request — ${refNumber}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:640px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

    <!-- Header -->
    <div style="background:#1e3a5f;padding:32px 40px;color:#fff">
      <div style="font-size:11px;letter-spacing:0.15em;color:#93c5fd;margin-bottom:8px;text-transform:uppercase">Concrete Calculator</div>
      <h1 style="margin:0;font-size:24px;font-weight:700">Quote Request Received</h1>
      <div style="margin-top:12px;font-size:13px;color:#bfdbfe">Reference: <strong style="color:#fff;font-family:monospace">${refNumber}</strong></div>
    </div>

    <!-- Client info -->
    <div style="padding:28px 40px;border-bottom:1px solid #e5e7eb">
      <div style="font-size:11px;letter-spacing:0.12em;color:#6b7280;text-transform:uppercase;margin-bottom:12px">Client Details</div>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:4px 0;color:#6b7280;width:100px">Name</td><td style="padding:4px 0;color:#111827;font-weight:600">${name}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Email</td><td style="padding:4px 0;color:#111827">${email}</td></tr>
        ${phone ? `<tr><td style="padding:4px 0;color:#6b7280">Phone</td><td style="padding:4px 0;color:#111827">${phone}</td></tr>` : ""}
        ${notes ? `<tr><td style="padding:4px 0;color:#6b7280;vertical-align:top">Notes</td><td style="padding:4px 0;color:#111827">${notes}</td></tr>` : ""}
      </table>
    </div>

    <!-- Estimate details -->
    <div style="padding:28px 40px;border-bottom:1px solid #e5e7eb">
      <div style="font-size:11px;letter-spacing:0.12em;color:#6b7280;text-transform:uppercase;margin-bottom:12px">Estimate Details</div>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:4px 0;color:#6b7280;width:160px">Project Type</td>
          <td style="padding:4px 0;color:#111827;font-weight:600;text-transform:capitalize">${calcType}</td>
        </tr>
        <tr><td style="padding:4px 0;color:#6b7280">Mix Strength</td><td style="padding:4px 0;color:#111827">${strength}</td></tr>
      </table>
      <div style="margin-top:16px;background:#f9fafb;border-radius:8px;overflow:hidden">
        <div style="padding:8px 12px;background:#f3f4f6;font-size:11px;letter-spacing:0.1em;color:#9ca3af;text-transform:uppercase">Dimensions</div>
        <table style="width:100%;border-collapse:collapse">${dimRows}</table>
      </div>
    </div>

    <!-- Results -->
    <div style="padding:28px 40px;border-bottom:1px solid #e5e7eb;background:#f8fafc">
      <div style="font-size:11px;letter-spacing:0.12em;color:#6b7280;text-transform:uppercase;margin-bottom:16px">Calculated Quantities</div>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:8px 0;color:#374151;border-bottom:1px dashed #e5e7eb">Volume</td>
          <td style="padding:8px 0;text-align:right;font-family:monospace;font-weight:600;color:#111827;border-bottom:1px dashed #e5e7eb">${result.volumeM3} m³</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#374151;border-bottom:1px dashed #e5e7eb">Weight</td>
          <td style="padding:8px 0;text-align:right;font-family:monospace;font-weight:600;color:#111827;border-bottom:1px dashed #e5e7eb">${result.weightKg.toLocaleString()} kg</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#374151;border-bottom:1px dashed #e5e7eb">Cement Bags</td>
          <td style="padding:8px 0;text-align:right;font-family:monospace;font-weight:600;color:#111827;border-bottom:1px dashed #e5e7eb">${result.cementBags} bags</td>
        </tr>
        <tr>
          <td style="padding:12px 0 0;color:#1e3a5f;font-weight:700;font-size:15px">Estimated Total</td>
          <td style="padding:12px 0 0;text-align:right;font-family:monospace;font-weight:700;font-size:18px;color:#1e3a5f">${currency}${result.estimatedCost.toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:20px 40px;text-align:center">
      <p style="margin:0;font-size:11px;color:#9ca3af">Reply directly to this email to respond to the client · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: cfg.smtp_from || cfg.smtp_user,
      to: cfg.admin_email,
      replyTo: email,
      subject: `Quote Request ${refNumber} — ${name} (${calcType})`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send quote request.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
