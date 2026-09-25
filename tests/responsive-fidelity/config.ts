/**
 * Shared configuration for the responsive-fidelity harness.
 * See run.ts for the full description of what is asserted.
 */
export const BASE_URL = process.env.FIDELITY_BASE_URL ?? "http://127.0.0.1:3100";

export interface ViewportSpec {
  name: string;
  w: number;
  h: number;
}

/** The device sizes the site owner actually tests on (phones, tablets portrait+landscape, laptop, desktop). */
export const VIEWPORTS: ViewportSpec[] = [
  { name: "phone-375x812", w: 375, h: 812 },
  { name: "phone-390x844", w: 390, h: 844 },
  { name: "phone-430x932", w: 430, h: 932 },
  { name: "tablet-768x1024", w: 768, h: 1024 },
  { name: "tablet-820x1180", w: 820, h: 1180 },
  { name: "tablet-834x1194", w: 834, h: 1194 },
  { name: "tablet-800x1280", w: 800, h: 1280 },
  { name: "tablet-landscape-1114x765", w: 1114, h: 765 },
  { name: "laptop-1440x900", w: 1440, h: 900 },
  { name: "desktop-1920x950", w: 1920, h: 950 }, // a 1080p monitor minus browser chrome: the owner's everyday desktop window
  { name: "desktop-1920x1080", w: 1920, h: 1080 },
];

/** Tolerances (px unless noted). */
export const TOL = {
  rect: 1,
  scale: 0.002,
  offset: 1,
  section: 1,
  overlap: 4,
};

/** Route prefix intercepted by the runner to serve committed synthetic image assets. */
export const FIXTURE_ASSET_ROUTE = "/fx-assets/";
