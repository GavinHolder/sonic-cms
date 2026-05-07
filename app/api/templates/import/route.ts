import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { requireRole } from "@/lib/api-middleware";

export async function POST(req: NextRequest) {
  const auth = requireRole(req, "EDITOR");
  if (auth instanceof NextResponse) return auth;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const filename = file.name.toLowerCase();

  if (filename.endsWith(".html") || filename.endsWith(".htm")) {
    const html = await file.text();
    return NextResponse.json({ success: true, data: { html, css: "" } });
  }

  if (filename.endsWith(".zip")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch {
      return NextResponse.json({ error: "Invalid or corrupt ZIP file" }, { status: 400 });
    }

    let html = "";
    const cssParts: string[] = [];
    const jsParts: string[] = [];

    // Prioritise index.html, then any other html file
    const entries = zip.getEntries().filter(e => !e.isDirectory);
    const htmlEntries = entries.filter(e => {
      const n = e.entryName.toLowerCase();
      return n.endsWith(".html") || n.endsWith(".htm");
    });
    const cssEntries  = entries.filter(e => e.entryName.toLowerCase().endsWith(".css"));
    // Skip minified JS — it bloats the template and is usually a CDN dep the designer should link instead
    const jsEntries   = entries.filter(e => {
      const n = e.entryName.toLowerCase();
      return n.endsWith(".js") && !n.endsWith(".min.js");
    });

    const indexEntry = htmlEntries.find(e => {
      const base = e.entryName.split("/").pop()?.toLowerCase() ?? "";
      return base === "index.html" || base === "index.htm";
    }) ?? htmlEntries[0];

    if (!indexEntry) {
      return NextResponse.json({ error: "No HTML file found in ZIP" }, { status: 400 });
    }

    html = indexEntry.getData().toString("utf8");

    for (const e of cssEntries) {
      cssParts.push(`/* ${e.entryName} */\n${e.getData().toString("utf8")}`);
    }

    for (const e of jsEntries) {
      jsParts.push(`/* ${e.entryName} */\n${e.getData().toString("utf8")}`);
    }

    // Inject extracted JS as a single inline <script> block before </body>
    if (jsParts.length > 0) {
      const scriptBlock = `<script>\n${jsParts.join("\n\n")}\n</script>`;
      if (/<\/body>/i.test(html)) {
        html = html.replace(/<\/body>/i, `${scriptBlock}\n</body>`);
      } else {
        html = html + "\n" + scriptBlock;
      }
    }

    return NextResponse.json({
      success: true,
      data: { html, css: cssParts.join("\n\n") },
    });
  }

  return NextResponse.json(
    { error: "Only .html and .zip files are supported" },
    { status: 400 }
  );
}
