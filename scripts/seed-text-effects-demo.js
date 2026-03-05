/**
 * Seed Script: Text Effects Demo Sections
 *
 * Creates 4 FLEXIBLE sections on the landing page to demonstrate
 * all text-effects animation types and clip-masking.
 *
 * HOW TO RUN:
 *   1. Open http://localhost:3000/admin/login and log in
 *   2. Open browser DevTools → Console
 *   3. Paste the entire contents of this file and press Enter
 *
 * WHAT IT CREATES:
 *   Section A — Image Clip Mask Demo     (large text, image/video plays through letterforms)
 *   Section B — Typewriter · Scramble · Glitch  (3 background-mode layers)
 *   Section C — Cascade · Wave · Reveal          (3 background-mode layers)
 *   Section D — Blur-In · Word-by-Word · Intro   (2 background + 1 intro mode)
 *
 * TO REMOVE: re-run the landing page admin and delete the sections named "🎬 TEXT EFFECTS..."
 */

(async function seedTextEffects() {

  // ─── Helper ─────────────────────────────────────────────────────────────────
  function makeLayer(id, type, config) {
    return {
      id,
      type,
      enabled: true,
      opacity: 100,
      blendMode: "normal",
      useColorPalette: false,
      colors: ["#4ecdc4", "#6a82fb", "#f39c12"],
      config,
    };
  }

  async function post(displayName, background, paddingTop, paddingBottom, animBgLayers, overlayOpacity = 0) {
    const content = {
      contentMode: "single",
      animBg: {
        enabled: true,
        layers: animBgLayers,
        overlayColor: "#000000",
        overlayOpacity,
      },
      layout: { type: "preset", preset: "2-col-split" },
      elements: [],
    };
    const res = await fetch('/api/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageSlug: '/',
        type: 'FLEXIBLE',
        displayName,
        background,
        paddingTop,
        paddingBottom,
        content,
      }),
    });
    const json = await res.json();
    if (json.success) {
      console.log(`✅ Created: "${displayName}" (id: ${json.data.id})`);
    } else {
      console.error(`❌ Failed: "${displayName}"`, json.error);
    }
    return json;
  }

  // ─── Section A: Image Clip Mask Demo ────────────────────────────────────────
  // Large "Your Company" text with an image playing THROUGH the letterforms.
  // Edit fillMediaUrl in the Animation tab to swap to your own image or video.
  await post(
    "🎭 TEXT CLIP MASK — Image/Video Through Text",
    "#080808",
    0, 0,
    [
      makeLayer("clip-1", "text-effects", {
        text: "Your Company",
        animation: "typewriter",
        direction: "left",
        fontSize: 22,
        fontWeight: "900",
        letterSpacing: 0.08,
        posX: 50,
        posY: 50,
        fillType: "image-clip",
        fillColor: "",
        fillGradient: "linear-gradient(135deg, #4ecdc4, #6a82fb)",
        fillMediaUrl: "/images/placeholder-hero.jpg",  // ← Edit this in admin to your own image/video
        speed: 0.6,
        stagger: 80,
        loop: true,
        loopDelay: 2000,
        mode: "background",
        exitEffect: "fade",
        holdDuration: 1500,
        customCode: "",
      }),
    ],
    0
  );

  // ─── Section B: Typewriter · Scramble · Glitch ─────────────────────────────
  await post(
    "🔤 TEXT FX: Typewriter · Scramble · Glitch",
    "#0f172a",
    0, 0,
    [
      makeLayer("fw-1", "text-effects", {
        text: "TYPEWRITER",
        animation: "typewriter",
        direction: "left",
        fontSize: 7,
        fontWeight: "800",
        letterSpacing: 0.2,
        posX: 50,
        posY: 22,
        fillType: "gradient",
        fillColor: "",
        fillGradient: "linear-gradient(90deg, #4ecdc4, #45b7d1)",
        fillMediaUrl: "",
        speed: 1,
        stagger: 60,
        loop: true,
        loopDelay: 1200,
        mode: "background",
        exitEffect: "fade",
        holdDuration: 1500,
        customCode: "",
      }),
      makeLayer("fw-2", "text-effects", {
        text: "SCRAMBLE",
        animation: "scramble",
        direction: "left",
        fontSize: 7,
        fontWeight: "800",
        letterSpacing: 0.2,
        posX: 50,
        posY: 50,
        fillType: "solid",
        fillColor: "#f39c12",
        fillGradient: "",
        fillMediaUrl: "",
        speed: 1.2,
        stagger: 40,
        loop: true,
        loopDelay: 800,
        mode: "background",
        exitEffect: "fade",
        holdDuration: 1500,
        customCode: "",
      }),
      makeLayer("fw-3", "text-effects", {
        text: "GLITCH",
        animation: "glitch",
        direction: "left",
        fontSize: 7,
        fontWeight: "900",
        letterSpacing: 0.15,
        posX: 50,
        posY: 78,
        fillType: "gradient",
        fillColor: "",
        fillGradient: "linear-gradient(90deg, #e74c3c, #9b59b6)",
        fillMediaUrl: "",
        speed: 1.5,
        stagger: 30,
        loop: true,
        loopDelay: 600,
        mode: "background",
        exitEffect: "fade",
        holdDuration: 1500,
        customCode: "",
      }),
    ]
  );

  // ─── Section C: Cascade · Wave · Reveal ─────────────────────────────────────
  await post(
    "✨ TEXT FX: Cascade · Wave · Reveal",
    "#1a1a2e",
    0, 0,
    [
      makeLayer("cwr-1", "text-effects", {
        text: "CASCADE",
        animation: "cascade",
        direction: "top",
        fontSize: 7,
        fontWeight: "800",
        letterSpacing: 0.25,
        posX: 50,
        posY: 22,
        fillType: "gradient",
        fillColor: "",
        fillGradient: "linear-gradient(135deg, #f9ca24, #f0932b)",
        fillMediaUrl: "",
        speed: 1,
        stagger: 80,
        loop: true,
        loopDelay: 1500,
        mode: "background",
        exitEffect: "fade",
        holdDuration: 2000,
        customCode: "",
      }),
      makeLayer("cwr-2", "text-effects", {
        text: "WAVE MOTION",
        animation: "wave",
        direction: "left",
        fontSize: 6,
        fontWeight: "700",
        letterSpacing: 0.1,
        posX: 50,
        posY: 50,
        fillType: "gradient",
        fillColor: "",
        fillGradient: "linear-gradient(90deg, #6a82fb, #fc5c7d)",
        fillMediaUrl: "",
        speed: 0.8,
        stagger: 60,
        loop: true,
        loopDelay: 1000,
        mode: "background",
        exitEffect: "fade",
        holdDuration: 1500,
        customCode: "",
      }),
      makeLayer("cwr-3", "text-effects", {
        text: "REVEAL",
        animation: "reveal",
        direction: "left",
        fontSize: 7,
        fontWeight: "900",
        letterSpacing: 0.3,
        posX: 50,
        posY: 78,
        fillType: "solid",
        fillColor: "#00f5a0",
        fillGradient: "",
        fillMediaUrl: "",
        speed: 1,
        stagger: 50,
        loop: true,
        loopDelay: 1200,
        mode: "background",
        exitEffect: "wipe",
        holdDuration: 2000,
        customCode: "",
      }),
    ]
  );

  // ─── Section D: Blur-In · Word-by-Word · Intro Mode ─────────────────────────
  // Layer 3 is INTRO mode — covers the section, plays once, then exits with glitch.
  // Scroll away and back to replay the intro.
  await post(
    "💫 TEXT FX: Blur-In · Word-by-Word · Intro Mode",
    "#0d1117",
    0, 0,
    [
      makeLayer("bwi-1", "text-effects", {
        text: "BLUR IN",
        animation: "blur-in",
        direction: "left",
        fontSize: 7,
        fontWeight: "800",
        letterSpacing: 0.2,
        posX: 50,
        posY: 25,
        fillType: "gradient",
        fillColor: "",
        fillGradient: "linear-gradient(90deg, #a8edea, #fed6e3)",
        fillMediaUrl: "",
        speed: 0.8,
        stagger: 60,
        loop: true,
        loopDelay: 1500,
        mode: "background",
        exitEffect: "fade",
        holdDuration: 2000,
        customCode: "",
      }),
      makeLayer("bwi-2", "text-effects", {
        text: "WORD BY WORD EFFECT",
        animation: "word-by-word",
        direction: "left",
        fontSize: 4.5,
        fontWeight: "700",
        letterSpacing: 0.05,
        posX: 50,
        posY: 50,
        fillType: "gradient",
        fillColor: "",
        fillGradient: "linear-gradient(135deg, #ffecd2, #fcb69f)",
        fillMediaUrl: "",
        speed: 0.9,
        stagger: 150,
        loop: true,
        loopDelay: 2000,
        mode: "background",
        exitEffect: "fade",
        holdDuration: 2500,
        customCode: "",
      }),
      makeLayer("bwi-3", "text-effects", {
        text: "INTRO SEQUENCE",
        animation: "typewriter",
        direction: "left",
        fontSize: 6,
        fontWeight: "900",
        letterSpacing: 0.15,
        posX: 50,
        posY: 50,
        fillType: "gradient",
        fillColor: "",
        fillGradient: "linear-gradient(90deg, #ff6b6b, #feca57)",
        fillMediaUrl: "",
        speed: 1.2,
        stagger: 55,
        loop: false,
        loopDelay: 0,
        mode: "intro",
        exitEffect: "glitch",
        holdDuration: 2000,
        customCode: "",
      }),
    ]
  );

  console.log('\n🎉 All text-effects demo sections created!');
  console.log('📌 Go to http://localhost:3000 to see them (scroll past existing sections).');
  console.log('🎭 Section A: Edit "fillMediaUrl" in Admin → Animation tab to use your own image/video.');
  console.log('💫 Section D: Scroll away and back to replay the intro sequence.');

})();
