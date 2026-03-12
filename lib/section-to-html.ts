/**
 * Section to HTML Converters
 * Converts structured section data to HTML for visual editor initialization
 */

import type {
  SectionConfig,
} from "@/types/section";

/**
 * Convert a Hero Carousel section to HTML
 */
export function heroCarouselToHtml(section: any): string {
  if (!section.items || section.items.length === 0) {
    return `<div class="hero-carousel">
  <div class="carousel-slide" style="min-height: 400px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center;">
    <div class="text-center text-white p-4">
      <h1 class="display-4 fw-bold mb-3">Your Headline Here</h1>
      <p class="lead mb-4">Add your subheading text</p>
      <a href="#" class="btn btn-light btn-lg">Get Started</a>
    </div>
  </div>
</div>`;
  }

  const slides = section.items.map((item: any, index: number) => {
    const overlay = item.overlay || { heading: "", subheading: "" };
    const bgImage = item.src ? `background-image: url('${item.src}'); background-size: cover; background-position: center;` : "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);";

    return `<div class="carousel-slide ${index === 0 ? "active" : ""}" style="min-height: 100vh; ${bgImage} display: flex; align-items: center; justify-content: center;">
    <div class="text-center text-white p-4" style="background: rgba(0,0,0,0.4); border-radius: 8px;">
      <h1 class="display-4 fw-bold mb-3">${overlay.heading || "Slide " + (index + 1)}</h1>
      ${overlay.subheading ? `<p class="lead mb-4">${overlay.subheading}</p>` : ""}
      ${overlay.button ? `<a href="${overlay.button.href}" class="btn btn-light btn-lg">${overlay.button.text}</a>` : ""}
    </div>
  </div>`;
  });

  return `<div class="hero-carousel">
  ${slides.join("\n  ")}
</div>`;
}

/**
 * Convert a Text & Image section to HTML
 */
export function textImageToHtml(section: any): string {
  const imageOnLeft = section.layout === "left";
  const textAlign = section.textAlign || "left";

  const imageCol = `<div class="col-md-6">
    <img src="${section.imageSrc || "/images/placeholder.jpg"}" alt="${section.imageAlt || ""}" class="img-fluid rounded shadow" style="width: 100%; height: auto;">
  </div>`;

  const buttons = section.buttons?.map((btn: any) => {
    const variant = btn.variant === "outline" ? "btn-outline-primary" : btn.variant === "secondary" ? "btn-secondary" : "btn-primary";
    return `<a href="${btn.href}" class="btn ${variant} me-2">${btn.text}</a>`;
  }).join("\n      ") || "";

  const textCol = `<div class="col-md-6">
    <div class="p-4" style="text-align: ${textAlign};">
      <h2 class="mb-4">${section.heading || "Your Heading"}</h2>
      <div class="mb-4">${section.content || "<p>Your content here.</p>"}</div>
      ${buttons ? `<div class="mt-4">${buttons}</div>` : ""}
    </div>
  </div>`;

  return `<section class="py-5">
  <div class="container">
    <div class="row align-items-center g-4">
      ${imageOnLeft ? imageCol + "\n      " + textCol : textCol + "\n      " + imageCol}
    </div>
  </div>
</section>`;
}

/**
 * Convert a Stats Grid section to HTML
 */
export function statsGridToHtml(section: any): string {
  const colClass = section.columns === 2 ? "col-md-6" : section.columns === 3 ? "col-md-4" : "col-md-3";
  const textAlign = section.textAlign || "center";

  const stats = section.stats?.map((stat: any) => `<div class="${colClass}">
    <div class="text-${textAlign} p-4">
      <div class="display-4 fw-bold text-primary mb-2">
        ${stat.prefix || ""}${stat.value}${stat.suffix || ""}
      </div>
      <div class="h5 mb-2">${stat.label}</div>
      ${stat.description ? `<p class="text-muted small mb-0">${stat.description}</p>` : ""}
    </div>
  </div>`).join("\n      ") || "";

  return `<section class="py-5 bg-light">
  <div class="container">
    ${section.heading ? `<h2 class="text-center mb-2">${section.heading}</h2>` : ""}
    ${section.subheading ? `<p class="text-center text-muted mb-5">${section.subheading}</p>` : ""}
    <div class="row g-4">
      ${stats}
    </div>
  </div>
</section>`;
}

/**
 * Convert a Card Grid section to HTML
 */
export function cardGridToHtml(section: any): string {
  const colClass = section.columns === 2 ? "col-md-6" : section.columns === 3 ? "col-md-4" : "col-md-3";

  const cards = section.cards?.map((card: any) => {
    const buttons = card.buttons?.map((btn: any) => {
      const variant = btn.variant === "outline" ? "btn-outline-primary" : btn.variant === "secondary" ? "btn-secondary" : "btn-primary";
      return `<a href="${btn.href}" class="btn ${variant} btn-sm me-2">${btn.text}</a>`;
    }).join("\n          ") || "";

    return `<div class="${colClass}">
    <div class="card h-100 shadow-sm">
      ${card.imageSrc ? `<img src="${card.imageSrc}" class="card-img-top" alt="${card.title}">` : ""}
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <h5 class="card-title" ${card.color ? `style="color: ${card.color};"` : ""}>${card.title}</h5>
          ${card.badge ? `<span class="badge bg-primary">${card.badge}</span>` : ""}
        </div>
        <p class="card-text">${card.description}</p>
        ${buttons ? `<div class="mt-3">${buttons}</div>` : ""}
      </div>
    </div>
  </div>`;
  }).join("\n      ") || "";

  return `<section class="py-5">
  <div class="container">
    ${section.heading ? `<h2 class="text-center mb-2">${section.heading}</h2>` : ""}
    ${section.subheading ? `<p class="text-center text-muted mb-5">${section.subheading}</p>` : ""}
    <div class="row g-4">
      ${cards}
    </div>
  </div>
</section>`;
}

/**
 * Convert a Banner section to HTML
 */
export function bannerToHtml(section: any): string {
  const variantMap: Record<string, string> = {
    info: "alert-info",
    success: "alert-success",
    warning: "alert-warning",
    error: "alert-danger",
  };
  const variantClass = variantMap[section.variant] || "alert-info";

  return `<div class="alert ${variantClass} ${section.dismissible ? "alert-dismissible fade show" : ""} mb-0" role="alert">
  <div class="container">
    ${section.content}
    ${section.dismissible ? `<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>` : ""}
  </div>
</div>`;
}

/**
 * Convert a Table section to HTML
 */
export function tableToHtml(section: any): string {
  const tableClasses = [
    "table",
    section.striped ? "table-striped" : "",
    section.bordered ? "table-bordered" : "",
    section.hover ? "table-hover" : "",
  ].filter(Boolean).join(" ");

  const headers = section.headers?.map((h: any) => `<th>${h}</th>`).join("\n            ") || "";
  const rows = section.rows?.map((row: any) =>
    `<tr>
            ${row.cells.map((cell: any) => `<td>${cell}</td>`).join("\n            ")}
          </tr>`
  ).join("\n          ") || "";

  return `<section class="py-5">
  <div class="container">
    ${section.heading ? `<h2 class="text-center mb-2">${section.heading}</h2>` : ""}
    ${section.subheading ? `<p class="text-center text-muted mb-5">${section.subheading}</p>` : ""}
    <div class="table-responsive">
      <table class="${tableClasses}">
        <thead>
          <tr>
            ${headers}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  </div>
</section>`;
}

/**
 * Convert any section type to HTML
 */
export function sectionToHtml(section: SectionConfig): string {
  switch (section.type as string) {
    case "hero-carousel":
      return heroCarouselToHtml(section as any);
    case "text-image":
      return textImageToHtml(section as any);
    case "stats-grid":
      return statsGridToHtml(section as any);
    case "card-grid":
      return cardGridToHtml(section as any);
    case "banner":
      return bannerToHtml(section as any);
    case "table":
      return tableToHtml(section as any);
    default:
      return "<div>Unknown section type</div>";
  }
}

/**
 * Get default CSS for visual editor canvas
 */
export function getDefaultCanvasCSS(): string {
  return `
/* Default Bootstrap-compatible styles for visual editor */
* { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 15px; width: 100%; }
.row { display: flex; flex-wrap: wrap; margin-left: -15px; margin-right: -15px; }
.col-md-3 { flex: 0 0 25%; max-width: 25%; padding-left: 15px; padding-right: 15px; }
.col-md-4 { flex: 0 0 33.333%; max-width: 33.333%; padding-left: 15px; padding-right: 15px; }
.col-md-6 { flex: 0 0 50%; max-width: 50%; padding-left: 15px; padding-right: 15px; }
.col-12 { flex: 0 0 100%; max-width: 100%; padding-left: 15px; padding-right: 15px; }

.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.py-5 { padding-top: 3rem; padding-bottom: 3rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 1rem; }
.mb-4 { margin-bottom: 1.5rem; }
.mb-5 { margin-bottom: 3rem; }
.mt-3 { margin-top: 1rem; }
.mt-4 { margin-top: 1.5rem; }
.me-2 { margin-right: 0.5rem; }
.p-4 { padding: 1.5rem; }
.g-4 { gap: 1.5rem; }

.bg-light { background-color: #f8f9fa; }
.text-white { color: white; }
.text-muted { color: #6c757d; }
.text-primary { color: #0d6efd; }

.fw-bold { font-weight: 700; }
.display-4 { font-size: 2.5rem; font-weight: 300; }
.lead { font-size: 1.25rem; font-weight: 300; }
.h5 { font-size: 1.25rem; }
.small { font-size: 0.875rem; }

.btn { display: inline-block; padding: 0.375rem 0.75rem; border-radius: 0.25rem; text-decoration: none; cursor: pointer; }
.btn-primary { background-color: #0d6efd; color: white; border: 1px solid #0d6efd; }
.btn-secondary { background-color: #6c757d; color: white; border: 1px solid #6c757d; }
.btn-light { background-color: #f8f9fa; color: #212529; border: 1px solid #f8f9fa; }
.btn-outline-primary { background-color: transparent; color: #0d6efd; border: 1px solid #0d6efd; }
.btn-lg { padding: 0.5rem 1rem; font-size: 1.25rem; }
.btn-sm { padding: 0.25rem 0.5rem; font-size: 0.875rem; }

.card { border: 1px solid rgba(0,0,0,.125); border-radius: 0.25rem; background: white; }
.card-body { padding: 1rem; }
.card-title { margin-bottom: 0.75rem; }
.card-text { margin-bottom: 0; }
.card-img-top { border-top-left-radius: calc(0.25rem - 1px); border-top-right-radius: calc(0.25rem - 1px); width: 100%; }
.h-100 { height: 100%; }
.shadow-sm { box-shadow: 0 .125rem .25rem rgba(0,0,0,.075); }
.shadow { box-shadow: 0 .5rem 1rem rgba(0,0,0,.15); }

.img-fluid { max-width: 100%; height: auto; }
.rounded { border-radius: 0.25rem; }

.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 0.75rem; vertical-align: top; border-top: 1px solid #dee2e6; }
.table thead th { vertical-align: bottom; border-bottom: 2px solid #dee2e6; }
.table-striped tbody tr:nth-of-type(odd) { background-color: rgba(0,0,0,.05); }
.table-bordered th, .table-bordered td { border: 1px solid #dee2e6; }
.table-hover tbody tr:hover { background-color: rgba(0,0,0,.075); }
.table-responsive { overflow-x: auto; }

.alert { padding: 1rem; border-radius: 0.25rem; }
.alert-info { background-color: #cff4fc; color: #055160; border: 1px solid #b6effb; }
.alert-success { background-color: #d1e7dd; color: #0f5132; border: 1px solid #badbcc; }
.alert-warning { background-color: #fff3cd; color: #664d03; border: 1px solid #ffecb5; }
.alert-danger { background-color: #f8d7da; color: #842029; border: 1px solid #f5c2c7; }

.badge { display: inline-block; padding: 0.25em 0.4em; font-size: 75%; font-weight: 700; border-radius: 0.25rem; }
.bg-primary { background-color: #0d6efd; color: white; }

.d-flex { display: flex; }
.flex-wrap { flex-wrap: wrap; }
.align-items-center { align-items: center; }
.align-items-start { align-items: flex-start; }
.justify-content-center { justify-content: center; }
.justify-content-between { justify-content: space-between; }

/* Responsive grid - only collapse on very small screens */
@media (max-width: 576px) {
  .col-md-3, .col-md-4, .col-md-6 { flex: 0 0 100%; max-width: 100%; }
  .display-4 { font-size: 2rem; }
}
`;
}
