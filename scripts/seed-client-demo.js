/**
 * Client Demo Seed — COMPLETE REBUILD v2
 *
 * HOW TO RUN:
 *   1. Log in at http://localhost:3000/admin/login
 *   2. Open browser DevTools → Console tab
 *   3. Paste this entire file and press Enter
 *   4. Wait ~45 seconds for "SEED COMPLETE"
 *   5. Visit http://localhost:3000
 *
 * WHAT IT CREATES (Landing page — 21 sections + footer):
 *   Hero Carousel  ·  Platform Stats (4-col)  ·  Fibre Pulse BG
 *   Aurora Price Cards  ·  Hero-Header Cards  ·  Neon-Edge Cards
 *   Scattered Cards  ·  Flip-Modal Cards  ·  Card Effects (5)
 *   Text FX: Typewriter  ·  Scramble  ·  Glitch  ·  Wave
 *   Word By Word  ·  Multi-Text  ·  All 12 Scroll Animations
 *   3D-Tilt BG  ·  Parallax BG  ·  SVG BG  ·  Banners
 *   HTML Block  ·  Buttons + Navigation  ·  Footer
 *
 *   Demo Pages: /packages  /about
 */

(async function clientDemo() {

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  const uid = () => Math.random().toString(36).slice(2, 10);

  /** AnimBg layer */
  function L(id, type, config, colors, opacity = 100, blend = 'normal') {
    return { id, type, enabled: true, opacity, blendMode: blend,
      useColorPalette: false, colors: colors || [], config };
  }

  /**
   * Flexible Element
   * row, col, span → gridRow, gridCol, gridColSpan for type:"grid" layout
   */
  function E(type, row, col, span, content, anim, styling) {
    return {
      id: uid(), type,
      position: { mode: 'grid', gridRow: row, gridCol: col, gridColSpan: span || 1 },
      content: content || {},
      animation: anim ? { type: 'none', duration: 700, delay: 0, ...anim } : { type: 'none' },
      styling: styling || {},
    };
  }

  /** Triangle + hover text config — spread into POST body at top level */
  function T(side, shape, c1, c2, grad = 'linear', a1 = 100, a2 = 80,
              text = '', style = 2, size = 44, anim = 'slide') {
    return {
      triangleEnabled: true,
      triangleSide: side,
      triangleShape: shape,
      triangleHeight: 260,
      triangleGradientType: grad,
      triangleColor1: c1,
      triangleColor2: c2,
      triangleAlpha1: a1,
      triangleAlpha2: a2,
      triangleAngle: 135,
      hoverTextEnabled: !!text,
      hoverText: text,
      hoverTextStyle: style,
      hoverFontSize: size,
      hoverAnimationType: anim,
    };
  }

  /** POST a FLEXIBLE section */
  async function S(opts) {
    const body = {
      pageSlug: opts.slug || '/',
      type: 'FLEXIBLE',
      displayName: opts.name,
      background: opts.bg || '#04091a',
      paddingTop:    opts.pt !== undefined ? opts.pt : 100,
      paddingBottom: opts.pb !== undefined ? opts.pb : 80,
      contentMode: opts.multi ? 'multi' : 'single',
      content: {
        contentMode: opts.multi ? 'multi' : 'single',
        animBg: {
          enabled: !!(opts.layers && opts.layers.length),
          layers: opts.layers || [],
          overlayColor: '#000000',
          overlayOpacity: opts.overlay || 0,
        },
        layout: opts.layout,
        elements: opts.elements || [],
      },
      // bg image fields
      ...(opts.bgImg ? {
        bgImageUrl: opts.bgImg,
        bgImageSize: 'cover',
        bgImagePosition: 'center',
        bgImageOpacity: opts.bgOpacity || 30,
        bgParallax: opts.parallax || false,
      } : {}),
      // triangle
      ...(opts.tri || {}),
    };
    const r = await fetch('/api/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (j.success) console.log('  ✅', opts.name);
    else console.error('  ❌', opts.name, j.error || j);
    return j;
  }

  /** POST a HERO or FOOTER section */
  async function Special(opts) {
    const r = await fetch('/api/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageSlug: opts.slug || '/',
        type: opts.type,
        displayName: opts.name,
        background: opts.bg || 'transparent',
        paddingTop: opts.pt || 0,
        paddingBottom: opts.pb || 0,
        content: opts.content,
      }),
    });
    const j = await r.json();
    if (j.success) console.log('  ✅', opts.name);
    else console.error('  ❌', opts.name, j.error || j);
    return j;
  }

  /** Ensure page exists in DB */
  async function Page(slug, title) {
    const r = await fetch('/api/pages', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, title, type: 'FULL_PAGE', status: 'PUBLISHED' }),
    });
    const j = await r.json();
    const errStr = typeof j.error === 'string' ? j.error : JSON.stringify(j.error || '');
    if (j.success || r.status === 409 || errStr.toLowerCase().includes('already'))
      console.log('  ✅ page /' + slug);
    else console.warn('  ⚠️ page /' + slug, j.error || j);
  }

  /** Delete all sections for a pageSlug */
  async function Clear(slug) {
    const r = await fetch('/api/sections?pageSlug=' + encodeURIComponent(slug));
    const j = await r.json();
    if (j.success && j.data?.length) {
      for (const s of j.data) await fetch('/api/sections/' + s.id, { method: 'DELETE' });
      console.log('  🗑️  Cleared ' + j.data.length + ' sections from ' + slug);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SHARED HERO SLIDE FACTORY
  // ═══════════════════════════════════════════════════════════════
  function Slide(id, src, gradDir, gradColor, gradStart, heading, hSize,
                 sub, subColor, buttons, pos = 'center') {
    return {
      id, type: 'image', src,
      gradient: { enabled: true, type: 'preset',
        preset: { direction: gradDir, startOpacity: gradStart, endOpacity: 15, color: gradColor } },
      overlay: {
        heading: { text: heading, fontSize: hSize, fontWeight: 900, fontFamily: 'inherit',
          color: '#ffffff', animation: 'slideUp', animationDuration: 900, animationDelay: 200 },
        subheading: { text: sub, fontSize: 22, fontWeight: 400, fontFamily: 'inherit',
          color: subColor, animation: 'slideUp', animationDuration: 900, animationDelay: 500 },
        buttons,
        position: pos,
        spacing: { betweenHeadingSubheading: 18, betweenSubheadingButtons: 44, betweenButtons: 14 },
      },
    };
  }

  function Btn(text, href, bg, variant = 'filled', delay = 800) {
    return { text, href, backgroundColor: bg, textColor: '#ffffff', variant,
      animation: 'slideUp', animationDuration: 800, animationDelay: delay };
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 1 — CLEAR
  // ═══════════════════════════════════════════════════════════════
  console.log('\n🗑️  Clearing existing sections...');
  await Clear('/');
  await Clear('packages');
  await Clear('about');

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2 — ENSURE PAGES IN DB
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📄 Ensuring demo pages...');
  await Page('packages', 'Packages & Pricing');
  await Page('about', 'About Us');

  // ═══════════════════════════════════════════════════════════════
  // PHASE 3 — LANDING PAGE
  // ═══════════════════════════════════════════════════════════════
  console.log('\n🚀 Building landing page...');

  // ── HERO ─────────────────────────────────────────────────────
  await Special({
    type: 'HERO', name: 'Hero Carousel', bg: 'transparent', pt: 0, pb: 0,
    content: {
      slides: [
        Slide('s1', '/images/placeholder-hero.jpg', 'bottom', '#03091a', 82,
          'Superfast Fibre Internet', 70,
          "Up to 1 Gbps · No contracts · Your Region's most trusted ISP",
          '#cbd5e1',
          [Btn('View Packages', '/packages', '#2563eb', 'filled', 800),
           Btn('About Us',   '/about',    'transparent', 'outline', 1000)]),
        Slide('s2', '/images/placeholder-support.jpg', 'right', '#0d2400', 88,
          'Local Team. World-Class Support.', 62,
          'Based in Your City · Average response under 3 minutes · Real people, not bots',
          '#dcfce7',
          [Btn('Contact Support', '/support', '#16a34a', 'filled', 800)], 'left'),
      ],
      autoPlay: true, autoPlayInterval: 5500,
      showDots: true, showArrows: true, transitionDuration: 900,
    },
  });

  // ── 01 · PLATFORM OVERVIEW — WiFi Pulse BG · 4 Stats ────────
  // Layout: 2 rows × 4 cols. Row 1 = full-width heading, Row 2 = 4 stat cards.
  await S({
    name: '01 · Platform at a Glance — WiFi Pulse BG · 4-Col Stats',
    bg: '#03081a',
    layers: [
      L('wp','wifi-pulse',{
        ringCount:5, speed:2.8, interval:1700, maxRadius:70, thickness:2,
        style:'arcs', posX:85, posY:50, direction:270, arcSpread:60,
        ringColor:'#38bdf8', shadowOpacity:50, perspective3d:false,
      }, ['#38bdf8','#0284c7','#7dd3fc'], 72),
      L('fs','floating-shapes',{
        count:8, sizeMin:15, sizeMax:60, speedMin:12, speedMax:24,
        blur:20, opacityMin:5, opacityMax:15, shapes:['circle','blob'],
      }, ['#38bdf8','#818cf8'], 28, 'overlay'),
    ],
    layout: { type: 'grid', gridRows: 2, gridCols: 4, gridGap: 28 },
    elements: [
      // Row 1: Full-width intro heading
      E('text', 1, 1, 4, {
        heading:    'Built for business website platforms',
        subheading: 'A complete visual CMS — every feature you need to launch, manage, and grow your ISP website. Scroll to explore.',
        headingAlign: 'center',
      }, { type:'fadeIn', duration:800, delay:0 },
        { textColor:'#ffffff', textAlign:'center' }),

      // Row 2: 4 stats side by side
      E('stats', 2, 1, 1, {
        statsNumber:'12', statsLabel:'AnimBg Types',
        statsSubLabel:'WiFi · Fibre · Particles · 3D & more',
        statsIcon:'bi-layers-fill', statsAccentColor:'#38bdf8',
        statsGlass:true,
      }, { type:'slideInLeft', duration:700, delay:0 }),
      E('stats', 2, 2, 1, {
        statsNumber:'11', statsLabel:'Element Types',
        statsSubLabel:'Text, Cards, Stats, Price, HTML...',
        statsIcon:'bi-grid-3x3-gap-fill', statsAccentColor:'#818cf8',
        statsGlass:true,
      }, { type:'slideUp', duration:700, delay:120 }),
      E('stats', 2, 3, 1, {
        statsNumber:'13', statsLabel:'Scroll Animations',
        statsSubLabel:'Fade · Flip · Zoom · Bounce & more',
        statsIcon:'bi-magic', statsAccentColor:'#34d399',
        statsGlass:true,
      }, { type:'slideUp', duration:700, delay:240 }),
      E('stats', 2, 4, 1, {
        statsNumber:'∞', statsLabel:'Layout Options',
        statsSubLabel:'11 presets + custom grid + absolute',
        statsIcon:'bi-layout-wtf', statsAccentColor:'#f59e0b',
        statsGlass:true,
      }, { type:'slideInRight', duration:700, delay:360 }),
    ],
    tri: T('right','modern','#2563eb','#7c3aed','linear',100,80,'PLATFORM',2,52),
  });

  // ── 02 · FIBRE PULSE BG · 2-col · Glass + Glow Cards ────────
  // Layout: 2 rows × 2 cols. Left=explanation+stats, Right=cards.
  await S({
    name: '02 · Fibre Pulse BG · Glass Card · Glow Card',
    bg: '#050c18',
    layers: [
      L('fp','fibre-pulse',{
        cableCount:12, pulseCount:4, pulseSpeed:6, pulseSize:16,
        cableWidth:1.5, cableOpacity:28, origin:'top-left', curvature:55,
        cableColor:'#00ff88', pulseColor:'#00e5ff',
        pulseDirection:'source-to-end', randomPulseCount:true,
      }, ['#00ff88','#00e5ff','#7c3aed'], 88),
    ],
    layout: { type: 'grid', gridRows: 2, gridCols: 2, gridGap: 32 },
    elements: [
      // Left col row 1: text explanation
      E('text', 1, 1, 1, {
        badge:'🔌 ANIMATED BACKGROUND', badgeColor:'#00ff88',
        heading:'Fibre Optic Cable Animator',
        subheading:'Light pulses race along curved cable paths. ISP-exclusive. Configure cables, pulse speed, colours, and origin corner.',
        headingAlign:'left',
        text:'<ul style="color:#94a3b8;font-size:14px;line-height:2;margin-top:14px;padding-left:18px"><li>12 cables · 4 simultaneous pulses</li><li>Origin: top-left · Curvature: 55°</li><li>Dual colour: green + cyan</li><li>Blend mode + opacity per layer</li></ul>',
      }, { type:'slideInLeft', duration:800, delay:0 },
        { textColor:'#f1f5f9' }),

      // Right col row 1: Glass card
      E('card', 1, 2, 1, {
        cardIcon:'bi-house-fill', cardTitle:'Home Fibre — Glass Effect',
        cardBody:'True FTTH · 25Mbps–1Gbps · Symmetrical · Uncapped · Free WiFi 6 router.',
        cardBgType:'gradient',
        cardBgGradient:'linear-gradient(135deg,#0f2027,#1a3a4a)',
        cardEffect:'glass', cardTextColor:'#e2e8f0',
        cardTags:['25–1000Mbps','Uncapped','FTTH'],
        cardButton:{ text:'View Plans', href:'/packages', icon:'bi-arrow-right', variant:'outline' },
      }, { type:'scaleIn', duration:600, delay:150 }),

      // Left col row 2: Stats
      E('stats', 2, 1, 1, {
        statsNumber:'1 Gbps', statsLabel:'Max Fibre Speed',
        statsSubLabel:'Symmetrical upload + download',
        statsIcon:'bi-lightning-charge-fill', statsAccentColor:'#00ff88',
        statsTrend:'up', statsTrendValue:'New for 2026', statsGlass:true,
      }, { type:'bounceIn', duration:700, delay:250 }),

      // Right col row 2: Glow card
      E('card', 2, 2, 1, {
        cardIcon:'bi-building', cardTitle:'Business Fibre — Glow Effect',
        cardBody:'Dedicated lines · BGP routing · SLA 99.9% · Static IPs · 24/7 NOC.',
        cardBgType:'solid', cardBgColor:'#0c1823',
        cardEffect:'glow', cardGlowColor:'#00e5ff', cardTextColor:'#e2e8f0',
        cardTags:['Dedicated','SLA','BGP'],
        cardButton:{ text:'Business Plans', href:'/packages', icon:'bi-arrow-right', variant:'outline' },
      }, { type:'scaleIn', duration:600, delay:350 }),
    ],
    tri: T('left','classic','#00ff88','#00bcd4','linear',90,70,'FIBRE',1,44),
  });

  // ── 03 · ISP PRICE CARDS — AURORA PRESET ────────────────────
  await S({
    name: '03 · ISP Price Cards — Aurora Preset · Count-Up + Glow Blobs',
    bg: '#0a0812',
    multi: true,
    layers: [
      L('mg','moving-gradient',{
        speed:8, angle:135,
        colorStops:['#0a0812','#1a0a2e','#0d1428','#08100a'],
        saturation:100, brightness:70,
      }, ['#f97316','#f59e0b','#7c3aed'], 100),
    ],
    layout: { type: 'grid', gridRows: 2, gridCols: 4, gridGap: 24 },
    elements: [
      E('text', 1, 1, 4, {
        badge:'✨ AURORA PRESET — cardPreset: "aurora"', badgeColor:'#f97316',
        heading:'Aurora Price Cards',
        subheading:'Organic animated glow blobs float behind each card. On hover the blobs speed up and the card lifts. Featured card: always-on aurora. Set cardPreset: "aurora" on any isp-price-card element.',
        headingAlign:'center',
      }, { type:'fadeIn', duration:700, delay:0 },
        { textColor:'#ffffff', textAlign:'center' }),

      E('isp-price-card', 2, 1, 1, {
        packageName:'Fibre 25', packageType:'fibre',
        price:'R499', priceLabel:'/pm',
        downloadSpeed:25, uploadSpeed:25, speedUnit:'Mbps',
        features:'Uncapped data\nFree router\n24/7 support\nNo contracts',
        isFeatured:false, accentColor:'#38bdf8',
        cardBgColor:'#0f172a', textColor:'#f1f5f9',
        buttonText:'Get Started', navTarget:'/packages',
        cardPreset:'aurora',
      }, { type:'slideUp', duration:700, delay:0 }),
      E('isp-price-card', 2, 2, 1, {
        packageName:'Fibre 100', packageType:'fibre',
        price:'R699', priceLabel:'/pm',
        downloadSpeed:100, uploadSpeed:100, speedUnit:'Mbps',
        features:'Uncapped data\nFree WiFi 6 router\nPriority support\nNo lock-in',
        isFeatured:true, featuredLabel:'⚡ MOST POPULAR',
        accentColor:'#f97316', cardBgColor:'#1a0d0a', textColor:'#f1f5f9',
        buttonText:'Get Started', navTarget:'/packages',
        cardPreset:'aurora',
      }, { type:'slideUp', duration:700, delay:100 }),
      E('isp-price-card', 2, 3, 1, {
        packageName:'Fibre 500', packageType:'fibre',
        price:'R999', priceLabel:'/pm',
        downloadSpeed:500, uploadSpeed:500, speedUnit:'Mbps',
        features:'Uncapped data\nFree WiFi 6 router\n2× static IP\nSLA 99.9%\nNo lock-in',
        isFeatured:false, accentColor:'#a78bfa',
        cardBgColor:'#130a1a', textColor:'#f1f5f9',
        buttonText:'Get Started', navTarget:'/packages',
        cardPreset:'aurora',
      }, { type:'slideUp', duration:700, delay:200 }),
      E('isp-price-card', 2, 4, 1, {
        packageName:'Fibre 1G', packageType:'fibre',
        price:'R1,499', priceLabel:'/pm',
        downloadSpeed:1000, uploadSpeed:1000, speedUnit:'Mbps',
        features:'Uncapped data\nFree WiFi 6E router\n4× static IP\nBGP routing\nDedicated SLA',
        isFeatured:false, accentColor:'#34d399',
        cardBgColor:'#071a10', textColor:'#f1f5f9',
        buttonText:'Get Started', navTarget:'/packages',
        cardPreset:'aurora',
      }, { type:'slideUp', duration:700, delay:300 }),
    ],
    tri: T('right','modern','#f97316','#f59e0b','linear',100,85,'AURORA',2,52),
  });

  // ── 04 · ISP PRICE CARDS — HERO-HEADER PRESET ───────────────
  await S({
    name: '04 · ISP Price Cards — Hero-Header Preset · Gradient Banner',
    bg: '#03080f',
    multi: true,
    layers: [
      L('fs','floating-shapes',{
        count:12, sizeMin:20, sizeMax:80, speedMin:8, speedMax:16,
        blur:30, opacityMin:4, opacityMax:12, shapes:['circle','blob'],
      }, ['#06b6d4','#3b82f6','#6366f1'], 40, 'overlay'),
    ],
    layout: { type: 'grid', gridRows: 2, gridCols: 3, gridGap: 28 },
    elements: [
      E('text', 1, 1, 3, {
        badge:'🎨 HERO-HEADER PRESET — cardPreset: "hero-header"', badgeColor:'#06b6d4',
        heading:'Hero-Header Price Cards',
        subheading:'Full-bleed gradient or image banner at the top of each card. The gradient animates continuously. Optionally set headerImage to any photo URL for an immersive full-bleed header.',
        headingAlign:'center',
      }, { type:'fadeIn', duration:700, delay:0 },
        { textColor:'#ffffff', textAlign:'center' }),

      E('isp-price-card', 2, 1, 1, {
        packageName:'Home WiFi', packageType:'wifi',
        price:'R299', priceLabel:'/pm',
        downloadSpeed:50, uploadSpeed:20, speedUnit:'Mbps',
        features:'Point-to-point wireless\nNo install fee\nUncapped options\n24/7 support',
        isFeatured:false, accentColor:'#06b6d4',
        cardBgColor:'#04111a', textColor:'#f1f5f9',
        buttonText:'Check Coverage', navTarget:'/packages',
        cardPreset:'hero-header',
      }, { type:'slideInLeft', duration:700, delay:0 }),
      E('isp-price-card', 2, 2, 1, {
        packageName:'Fibre 100', packageType:'fibre',
        price:'R699', priceLabel:'/pm',
        downloadSpeed:100, uploadSpeed:100, speedUnit:'Mbps',
        features:'Uncapped data\nFree WiFi 6 router\nPriority support\nNo lock-in',
        isFeatured:true, featuredLabel:'⭐ FEATURED',
        accentColor:'#3b82f6', cardBgColor:'#070f20', textColor:'#f1f5f9',
        buttonText:'Get Started', navTarget:'/packages',
        cardPreset:'hero-header',
      }, { type:'slideUp', duration:700, delay:150 }),
      E('isp-price-card', 2, 3, 1, {
        packageName:'Fixed Wireless', packageType:'fwa',
        price:'R449', priceLabel:'/pm',
        downloadSpeed:100, uploadSpeed:50, speedUnit:'Mbps',
        features:'No trenching\nSame-day activate\nOutdoor antenna\nEstate solution',
        isFeatured:false, accentColor:'#6366f1',
        cardBgColor:'#0a0820', textColor:'#f1f5f9',
        buttonText:'Get FWA', navTarget:'/packages',
        cardPreset:'hero-header',
      }, { type:'slideInRight', duration:700, delay:300 }),
    ],
    tri: T('left','classic','#06b6d4','#3b82f6','linear',95,75,'HEADER',1,48),
  });

  // ── 05 · ISP PRICE CARDS — NEON-EDGE PRESET ─────────────────
  await S({
    name: '05 · ISP Price Cards — Neon-Edge Preset · Animated Glow Border',
    bg: '#020408',
    multi: true,
    layers: [
      L('pf','particle-field',{
        count:35, speed:0.5, size:1.8, connectDistance:100,
        connectOpacity:0.1, shape:'circle', drawConnections:true,
      }, ['#00eaff','#ff00aa','#7700ff'], 50),
    ],
    layout: { type: 'grid', gridRows: 2, gridCols: 3, gridGap: 32 },
    elements: [
      E('text', 1, 1, 3, {
        badge:'⚡ NEON-EDGE PRESET — cardPreset: "neon-edge"', badgeColor:'#00eaff',
        heading:'Neon-Edge Price Cards',
        subheading:'Animated neon border cycles between two colours. On hover the border pulses faster and the card levitates. Set --neon-c and --neon-c2 via accentColor to customise the glow.',
        headingAlign:'center',
      }, { type:'fadeIn', duration:700, delay:0 },
        { textColor:'#e0f7ff', textAlign:'center' }),

      E('isp-price-card', 2, 1, 1, {
        packageName:'LTE Basic', packageType:'lte',
        price:'R199', priceLabel:'/pm',
        downloadSpeed:30, uploadSpeed:15, speedUnit:'Mbps',
        features:'SIM included\nUnlimited bundles\nAuto failover\nNo contracts',
        isFeatured:false, accentColor:'#00eaff',
        cardBgColor:'#02080f', textColor:'#e0f7ff',
        buttonText:'Add LTE', navTarget:'/packages',
        cardPreset:'neon-edge',
      }, { type:'slideInLeft', duration:700, delay:0 }),
      E('isp-price-card', 2, 2, 1, {
        packageName:'LTE Pro', packageType:'lte',
        price:'R349', priceLabel:'/pm',
        downloadSpeed:75, uploadSpeed:30, speedUnit:'Mbps',
        features:'Dual-SIM failover\nPriority data\nStatic IP option\nMonthly flex',
        isFeatured:true, featuredLabel:'🔥 NEON PICK',
        accentColor:'#ff00aa', cardBgColor:'#0f010a', textColor:'#ffe0f5',
        buttonText:'Go Pro', navTarget:'/packages',
        cardPreset:'neon-edge',
      }, { type:'slideUp', duration:700, delay:150 }),
      E('isp-price-card', 2, 3, 1, {
        packageName:'Fibre 250', packageType:'fibre',
        price:'R849', priceLabel:'/pm',
        downloadSpeed:250, uploadSpeed:250, speedUnit:'Mbps',
        features:'Uncapped symmetrical\nWiFi 6 router\nSLA 99.9%\nNo lock-in',
        isFeatured:false, accentColor:'#7700ff',
        cardBgColor:'#070012', textColor:'#e8d9ff',
        buttonText:'Get Fibre', navTarget:'/packages',
        cardPreset:'neon-edge',
      }, { type:'slideInRight', duration:700, delay:300 }),
    ],
    tri: T('right','modern','#00eaff','#ff00aa','linear',100,80,'NEON',2,54),
  });

  // ── 06 · ISP PRICE CARDS — SCATTERED PRESET ─────────────────
  await S({
    name: '06 · ISP Price Cards — Scattered Preset · Tilt + Hover Straighten',
    bg: '#0c0908',
    multi: true,
    layers: [
      L('mg2','moving-gradient',{
        speed:12, angle:45,
        colorStops:['#0c0908','#1a0f08','#180c0c','#0c0c18'],
        saturation:80, brightness:60,
      }, ['#f59e0b','#ef4444','#6366f1'], 100),
    ],
    layout: { type: 'grid', gridRows: 2, gridCols: 4, gridGap: 32 },
    pt: 80, pb: 100,
    elements: [
      E('text', 1, 1, 4, {
        badge:'🃏 SCATTERED PRESET — cardPreset: "scattered"', badgeColor:'#f59e0b',
        heading:'Scattered Price Cards',
        subheading:'Each card has a unique deterministic tilt angle derived from its package name. On hover the card straightens, lifts, and scales up — revealing itself fully. No two cards tilt the same.',
        headingAlign:'center',
      }, { type:'fadeIn', duration:700, delay:0 },
        { textColor:'#fff5e0', textAlign:'center' }),

      E('isp-price-card', 2, 1, 1, {
        packageName:'Alpha', packageType:'fibre',
        price:'R399', priceLabel:'/pm',
        downloadSpeed:25, uploadSpeed:25, speedUnit:'Mbps',
        features:'Entry fibre\nFree router\n24/7 support',
        isFeatured:false, accentColor:'#f59e0b',
        cardBgColor:'#1a1000', textColor:'#fff5e0',
        buttonText:'Start', navTarget:'/packages',
        cardPreset:'scattered',
      }, { type:'fadeIn', duration:700, delay:0 }),
      E('isp-price-card', 2, 2, 1, {
        packageName:'Bravo', packageType:'fibre',
        price:'R599', priceLabel:'/pm',
        downloadSpeed:100, uploadSpeed:100, speedUnit:'Mbps',
        features:'Uncapped\nWiFi 6 router\nPriority support',
        isFeatured:true, featuredLabel:'★ POPULAR',
        accentColor:'#ef4444', cardBgColor:'#1a0000', textColor:'#ffe0e0',
        buttonText:'Get It', navTarget:'/packages',
        cardPreset:'scattered',
      }, { type:'fadeIn', duration:700, delay:100 }),
      E('isp-price-card', 2, 3, 1, {
        packageName:'Charlie', packageType:'wifi',
        price:'R299', priceLabel:'/pm',
        downloadSpeed:50, uploadSpeed:20, speedUnit:'Mbps',
        features:'Wireless home\nNo trenching\n24/7 support',
        isFeatured:false, accentColor:'#6366f1',
        cardBgColor:'#09081a', textColor:'#e8e8ff',
        buttonText:'Connect', navTarget:'/packages',
        cardPreset:'scattered',
      }, { type:'fadeIn', duration:700, delay:200 }),
      E('isp-price-card', 2, 4, 1, {
        packageName:'Delta', packageType:'lte',
        price:'R199', priceLabel:'/pm',
        downloadSpeed:30, uploadSpeed:15, speedUnit:'Mbps',
        features:'LTE backup\nSIM included\nAuto failover',
        isFeatured:false, accentColor:'#34d399',
        cardBgColor:'#001a0c', textColor:'#d0fff0',
        buttonText:'Add LTE', navTarget:'/packages',
        cardPreset:'scattered',
      }, { type:'fadeIn', duration:700, delay:300 }),
    ],
  });

  // ── 07 · ISP PRICE CARDS — FLIP-MODAL PRESET ────────────────
  await S({
    name: '07 · ISP Price Cards — Flip-Modal Preset · 3D Flip + Modal Detail',
    bg: '#040820',
    multi: true,
    layers: [
      L('wp','wifi-pulse',{
        ringCount:4, speed:2, interval:2000, maxRadius:65, thickness:1.5,
        style:'circles', posX:50, posY:50, direction:0, arcSpread:360,
        ringColor:'#4f46e5', shadowOpacity:40, perspective3d:false,
      }, ['#4f46e5','#7c3aed','#818cf8'], 50),
    ],
    layout: { type: 'grid', gridRows: 2, gridCols: 3, gridGap: 28 },
    elements: [
      E('text', 1, 1, 3, {
        badge:'🔄 FLIP-MODAL PRESET — cardPreset: "flip-modal"', badgeColor:'#7c3aed',
        heading:'Flip-Modal Price Cards',
        subheading:'Click any card to flip it 180° and reveal full feature details on the back. Set expandMode: "modal" to pop a full detail overlay instead, or "both" for flip-then-modal. Try clicking below!',
        headingAlign:'center',
      }, { type:'fadeIn', duration:700, delay:0 },
        { textColor:'#e8e0ff', textAlign:'center' }),

      E('isp-price-card', 2, 1, 1, {
        packageName:'Starter', packageType:'fibre',
        price:'R499', priceLabel:'/pm',
        downloadSpeed:25, uploadSpeed:25, speedUnit:'Mbps',
        features:'Uncapped data\nFree router\n24/7 support\nNo lock-in\nEmail setup\nBasic DNS',
        isFeatured:false, accentColor:'#818cf8',
        cardBgColor:'#080a20', textColor:'#e8e0ff',
        buttonText:'Get Started', navTarget:'/packages',
        cardPreset:'flip-modal', expandMode:'flip',
      }, { type:'slideInLeft', duration:700, delay:0 }),
      E('isp-price-card', 2, 2, 1, {
        packageName:'Pro 100', packageType:'fibre',
        price:'R699', priceLabel:'/pm',
        downloadSpeed:100, uploadSpeed:100, speedUnit:'Mbps',
        features:'Uncapped data\nFree WiFi 6 router\nPriority support\n2× email addresses\nStatic IP option\nSLA 99.5%\nNo lock-in',
        isFeatured:true, featuredLabel:'🏆 TOP PICK',
        accentColor:'#7c3aed', cardBgColor:'#0d0718', textColor:'#f0e8ff',
        buttonText:'Go Pro', navTarget:'/packages',
        cardPreset:'flip-modal', expandMode:'both',
      }, { type:'slideUp', duration:700, delay:150 }),
      E('isp-price-card', 2, 3, 1, {
        packageName:'Business 1G', packageType:'fibre',
        price:'R1,499', priceLabel:'/pm',
        downloadSpeed:1000, uploadSpeed:1000, speedUnit:'Mbps',
        features:'Symmetrical 1 Gbps\nFree WiFi 6E router\n4× static IP\nBGP routing\nDedicated SLA 99.9%\n24/7 priority support\nNo lock-in\nMonthly billing',
        isFeatured:false, accentColor:'#4f46e5',
        cardBgColor:'#060a1a', textColor:'#cdd8ff',
        buttonText:'Contact Sales', navTarget:'/packages',
        cardPreset:'flip-modal', expandMode:'modal',
      }, { type:'slideInRight', duration:700, delay:300 }),
    ],
    tri: T('right','modern','#7c3aed','#4f46e5','linear',100,85,'FLIP',2,56),
  });

  // ── 08 · CARD EFFECTS — all 5 (5-col, particle-field bg) ────
  await S({
    name: '08 · Card Effects — Glass · Glow · RGB · Shimmer · Pulse-Glow',
    bg: '#07090f',
    layers: [
      L('pf','particle-field',{
        count:55, speed:0.8, size:2.5, connectDistance:120,
        connectOpacity:0.15, shape:'circle', drawConnections:true,
      }, ['#6366f1','#8b5cf6','#a78bfa'], 60),
    ],
    layout: { type: 'grid', gridRows: 2, gridCols: 5, gridGap: 20 },
    elements: [
      E('text', 1, 1, 5, {
        badge:'🎴 CARD VISUAL EFFECTS', badgeColor:'#818cf8',
        heading:'5 Card Effects — Side by Side',
        subheading:'Every card supports built-in visual effects. Combine with any background type (solid, gradient, or image), custom glow colours, icons, tags, and buttons.',
        headingAlign:'center',
      }, { type:'fadeIn', duration:700, delay:0 },
        { textColor:'#f8fafc', textAlign:'center' }),

      E('card', 2, 1, 1, {
        cardIcon:'bi-droplet-fill', cardTitle:'Glass',
        cardBody:'Frosted glassmorphism — semi-transparent backdrop with blur and subtle inner border.',
        cardBgType:'gradient', cardBgGradient:'linear-gradient(135deg,#1e3a5f,#2d5f8a)',
        cardEffect:'glass', cardTextColor:'#e2e8f0',
      }, { type:'slideUp', duration:600, delay:0 }),
      E('card', 2, 2, 1, {
        cardIcon:'bi-sun-fill', cardTitle:'Glow',
        cardBody:'Pulsing coloured shadow on hover. Any hex colour — amber, cyan, red, green.',
        cardBgType:'solid', cardBgColor:'#0f172a',
        cardEffect:'glow', cardGlowColor:'#f59e0b', cardTextColor:'#e2e8f0',
      }, { type:'slideUp', duration:600, delay:100 }),
      E('card', 2, 3, 1, {
        cardIcon:'bi-rainbow', cardTitle:'RGB',
        cardBody:'Animated rainbow border cycling the full colour spectrum. Bold and eye-catching.',
        cardBgType:'solid', cardBgColor:'#0f0f1a',
        cardEffect:'rgb', cardTextColor:'#e2e8f0',
      }, { type:'slideUp', duration:600, delay:200 }),
      E('card', 2, 4, 1, {
        cardIcon:'bi-gem', cardTitle:'Shimmer',
        cardBody:'Light shimmer sweep across the surface. Subtle and elegant for premium content.',
        cardBgType:'gradient', cardBgGradient:'linear-gradient(135deg,#1a1a2e,#0f3460)',
        cardEffect:'shimmer', cardTextColor:'#e2e8f0',
      }, { type:'slideUp', duration:600, delay:300 }),
      E('card', 2, 5, 1, {
        cardIcon:'bi-heart-pulse-fill', cardTitle:'Pulse-Glow',
        cardBody:'Breathing glow that pulses — perfect for featured items or CTAs. Heartbeat rhythm.',
        cardBgType:'gradient', cardBgGradient:'linear-gradient(135deg,#2d0036,#4a0050)',
        cardEffect:'pulse-glow', cardGlowColor:'#d946ef', cardTextColor:'#f0e6ff',
      }, { type:'slideUp', duration:600, delay:400 }),
    ],
    tri: T('right','modern','#f59e0b','#ef4444','radial',100,80,'CARD FX',2,50),
  });

  // ── 09 · TEXT EFFECTS — TYPEWRITER ───────────────────────────
  await S({
    name: '09 · Text Effects — Typewriter · Single Large Text',
    bg: '#030308',
    layers: [
      L('te-a','text-effects',{
        mode:'background',
        text:'100 MBPS', animation:'typewriter',
        posX:50, posY:50,
        fontSize:14, fontWeight:'900',
        letterSpacing:0.15,
        fillType:'solid', fillColor:'#ffffff',
        speed:0.8, stagger:80,
        loop:true, loopDelay:1500,
      }, ['#ffffff'], 100),
    ],
    layout: { type: 'grid', gridRows: 1, gridCols: 2, gridGap: 28 },
    elements: [
      E('text', 1, 1, 1, {
        badge:'⌨️ TYPEWRITER', badgeColor:'#6366f1',
        heading:'Typewriter',
        subheading:'Each character types in one by one. Set speed (ms per char), stagger, loopDelay, and fillType: solid/gradient/image-clip.',
      }, { type:'fadeIn', duration:700, delay:0 },
        { textColor:'#f1f5f9' }),
      E('card', 1, 2, 1, {
        cardIcon:'bi-code-slash', cardTitle:'Config',
        cardBody:'animation: "typewriter"\nspeed: 0.8 (~75ms/char)\nloop: true\nloopDelay: 1500\nfillType: "solid"\nfillColor: "#ffffff"',
        cardBgType:'gradient', cardBgGradient:'linear-gradient(135deg,#1e1b4b,#312e81)',
        cardEffect:'glass', cardTextColor:'#c7d2fe',
      }, { type:'slideInRight', duration:700, delay:200 }),
    ],
  });

  // ── 10 · TEXT EFFECTS — SCRAMBLE ─────────────────────────────
  await S({
    name: '10 · Text Effects — Scramble · Random Char Reveal',
    bg: '#080310',
    layers: [
      L('te-b','text-effects',{
        mode:'background',
        text:'CONNECTED', animation:'scramble',
        posX:50, posY:50,
        fontSize:12, fontWeight:'900',
        letterSpacing:0.12,
        fillType:'gradient', fillGradient:'linear-gradient(90deg,#7c3aed,#ec4899)',
        speed:1.2, loop:true, loopDelay:1200,
      }, ['#7c3aed','#ec4899'], 100),
    ],
    layout: { type: 'grid', gridRows: 1, gridCols: 2, gridGap: 28 },
    elements: [
      E('text', 1, 1, 1, {
        badge:'🔀 SCRAMBLE', badgeColor:'#7c3aed',
        heading:'Scramble',
        subheading:'Characters cycle through random glyphs before snapping to the final letter. A fast, energetic reveal for brand names or keywords.',
      }, { type:'fadeIn', duration:700, delay:0 },
        { textColor:'#f1f5f9' }),
      E('card', 1, 2, 1, {
        cardIcon:'bi-shuffle', cardTitle:'Config',
        cardBody:'animation: "scramble"\nspeed: 1.2\nfillType: "gradient"\nfillGradient:\n"linear-gradient(90deg,\n#7c3aed, #ec4899)"',
        cardBgType:'gradient', cardBgGradient:'linear-gradient(135deg,#2d1b69,#4c1d95)',
        cardEffect:'glass', cardTextColor:'#ddd6fe',
      }, { type:'slideInRight', duration:700, delay:200 }),
    ],
  });

  // ── 11 · TEXT EFFECTS — GLITCH ───────────────────────────────
  await S({
    name: '11 · Text Effects — Glitch · Corrupt + Slice Artifacts',
    bg: '#030f08',
    layers: [
      L('te-c','text-effects',{
        mode:'background',
        text:'FIBRE', animation:'glitch',
        posX:50, posY:50,
        fontSize:18, fontWeight:'900',
        letterSpacing:0.08,
        fillType:'solid', fillColor:'#ff4444',
        speed:1.0, loop:true, loopDelay:2000,
      }, ['#ff4444','#00ff88'], 100),
    ],
    layout: { type: 'grid', gridRows: 1, gridCols: 2, gridGap: 28 },
    elements: [
      E('text', 1, 1, 1, {
        badge:'📡 GLITCH', badgeColor:'#ff4444',
        heading:'Glitch',
        subheading:'Rapid colour corruption, slice artifacts, and chromatic aberration. Creates a cyberpunk / digital-noise effect. Works best with short, bold words.',
      }, { type:'fadeIn', duration:700, delay:0 },
        { textColor:'#f1f5f9' }),
      E('card', 1, 2, 1, {
        cardIcon:'bi-reception-4', cardTitle:'Config',
        cardBody:'animation: "glitch"\nspeed: 1.0\nfillType: "solid"\nfillColor: "#ff4444"\nfontSize: 18 (% viewport)',
        cardBgType:'gradient', cardBgGradient:'linear-gradient(135deg,#064e3b,#065f46)',
        cardEffect:'glass', cardTextColor:'#a7f3d0',
      }, { type:'slideInRight', duration:700, delay:200 }),
    ],
  });

  // ── 12 · TEXT EFFECTS — WAVE ─────────────────────────────────
  await S({
    name: '12 · Text Effects — Wave · Bouncing Letter Motion',
    bg: '#040a18',
    layers: [
      L('te-d','text-effects',{
        mode:'background',
        text:'Your Company', animation:'wave',
        posX:50, posY:50,
        fontSize:20, fontWeight:'900',
        letterSpacing:0.1,
        fillType:'gradient', fillGradient:'linear-gradient(90deg,#00d4ff,#7c3aed)',
        speed:0.5, stagger:50, loop:true, loopDelay:800,
      }, ['#00d4ff','#7c3aed'], 100),
    ],
    layout: { type: 'grid', gridRows: 1, gridCols: 2, gridGap: 28 },
    elements: [
      E('text', 1, 1, 1, {
        badge:'🌊 WAVE', badgeColor:'#00d4ff',
        heading:'Wave',
        subheading:'Each letter bobs up and down in a sine wave pattern with staggered timing. Fluid and rhythmic — great for brand names or taglines.',
      }, { type:'fadeIn', duration:700, delay:0 },
        { textColor:'#e0f7ff' }),
      E('card', 1, 2, 1, {
        cardIcon:'bi-water', cardTitle:'Config',
        cardBody:'animation: "wave"\nspeed: 0.5 · stagger: 50\nfillType: "gradient"\nfillGradient:\n"linear-gradient(90deg,\n#00d4ff, #7c3aed)"',
        cardBgType:'gradient', cardBgGradient:'linear-gradient(135deg,#0c1a2e,#162a40)',
        cardEffect:'glass', cardTextColor:'#bae6fd',
      }, { type:'slideInRight', duration:700, delay:200 }),
    ],
  });

  // ── 13 · TEXT EFFECTS — FADE SLIDE ───────────────────────────
  await S({
    name: '13 · Text Effects — Word By Word · Elegant Word Entrance',
    bg: '#0a0a0a',
    layers: [
      L('te-e','text-effects',{
        mode:'background',
        text:'HIGH SPEED INTERNET', animation:'word-by-word',
        posX:50, posY:50,
        fontSize:6, fontWeight:'700',
        letterSpacing:0.2,
        fillType:'solid', fillColor:'#e2e8f0',
        speed:0.6, stagger:120,
        loop:true, loopDelay:2500,
      }, ['#e2e8f0'], 100),
    ],
    layout: { type: 'grid', gridRows: 1, gridCols: 2, gridGap: 28 },
    elements: [
      E('text', 1, 1, 1, {
        badge:'✨ WORD BY WORD', badgeColor:'#94a3b8',
        heading:'Word By Word',
        subheading:'Each word fades in while sliding up, one after another. Clean and understated — ideal for longer phrases, subtitles, or taglines where readability matters.',
      }, { type:'fadeIn', duration:700, delay:0 },
        { textColor:'#f1f5f9' }),
      E('card', 1, 2, 1, {
        cardIcon:'bi-arrow-up-circle', cardTitle:'Config',
        cardBody:'animation: "word-by-word"\nspeed: 0.6 · stagger: 120\nfontSize: 6 (% vw)\nletterSpacing: 0.2\nfillType: "solid"',
        cardBgType:'solid', cardBgColor:'#1a1a1a',
        cardEffect:'glass', cardTextColor:'#cbd5e1',
      }, { type:'slideInRight', duration:700, delay:200 }),
    ],
  });

  // ── 14 · TEXT EFFECTS — MULTI-TEXT (textItems array) ─────────
  await S({
    name: '14 · Text Effects — Multi-Text · 3 Independent Animations',
    bg: '#050510',
    layers: [
      L('te-f','text-effects',{
        mode:'background',
        textItems:[
          { text:'FAST',       animationType:'typewriter', x:18, y:28, fontSize:10,
            fillType:'solid',    fillColor:'#00ff88',   fontWeight:900, speed:0.9, stagger:70, loop:true, loopDelay:1000 },
          { text:'RELIABLE',   animationType:'wave',       x:50, y:58, fontSize:8,
            fillType:'solid',    fillColor:'#ffffff',   fontWeight:700, speed:0.5, stagger:50, loop:true, loopDelay:800  },
          { text:'AFFORDABLE', animationType:'scramble',   x:78, y:82, fontSize:6,
            fillType:'solid',    fillColor:'#ff9900',   fontWeight:600, speed:1.0, loop:true, loopDelay:1200 },
        ],
      }, ['#00ff88','#ffffff','#ff9900'], 100),
    ],
    layout: { type: 'grid', gridRows: 1, gridCols: 2, gridGap: 28 },
    elements: [
      E('text', 1, 1, 1, {
        badge:'🎭 MULTI-TEXT (textItems)', badgeColor:'#f59e0b',
        heading:'Multiple Independent Texts',
        subheading:'Three completely independent text animators in a single layer. Each has its own position (x/y %), size, fill, animation type, and speed. Perfect for dynamic backgrounds.',
      }, { type:'fadeIn', duration:700, delay:0 },
        { textColor:'#fff8e0' }),
      E('card', 1, 2, 1, {
        cardIcon:'bi-collection', cardTitle:'textItems Config',
        cardBody:'Use textItems: [...] array\ninstead of text: string.\nEach item: text, animationType,\nx, y (0-100 %), fontSize,\nfillType, fillColor, speed.',
        cardBgType:'gradient', cardBgGradient:'linear-gradient(135deg,#1a1200,#2a1f00)',
        cardEffect:'glass', cardTextColor:'#fde68a',
      }, { type:'slideInRight', duration:700, delay:200 }),
    ],
    tri: T('left','classic','#f59e0b','#ff9900','linear',90,70,'TEXT FX',1,44),
  });

  // ── 15 · ALL 12 SCROLL ANIMATIONS (4×4 grid, multi) ─────────
  const animNames = ['fadeIn','slideUp','slideDown','slideInLeft',
    'slideInRight','scaleIn','zoomIn','flipInX',
    'flipInY','bounceIn','rotateIn','blurIn'];
  const animDesc = [
    'Opacity 0→1','Translates up 40px + fade','Translates down 40px + fade',
    'Slides from left + fade','Slides from right + fade',
    'Scale 0.7→1 + fade','Scale 0.4→1 dramatic','3D flip on X axis',
    '3D flip on Y axis','Elastic bounce in','Rotates 180° + fade','Blur 8px→0 + fade',
  ];
  const cardGrads = [
    'linear-gradient(135deg,#1e1b4b,#2d1b69)',
    'linear-gradient(135deg,#14532d,#065f46)',
    'linear-gradient(135deg,#1e3a5f,#1e40af)',
    'linear-gradient(135deg,#4a1942,#7b2d7f)',
    'linear-gradient(135deg,#422006,#7c2d12)',
    'linear-gradient(135deg,#1a1a2e,#16213e)',
    'linear-gradient(135deg,#0a2744,#1e3a5f)',
    'linear-gradient(135deg,#1b0a2e,#2d1b69)',
    'linear-gradient(135deg,#0a1a0a,#14532d)',
    'linear-gradient(135deg,#2a0a0a,#7f1d1d)',
    'linear-gradient(135deg,#1a0a2e,#4c1d95)',
    'linear-gradient(135deg,#030712,#111827)',
  ];

  await S({
    name: '15 · All 12 Scroll Animations — Scroll Away + Back to Replay',
    bg: '#060a10',
    multi: true,
    layers: [
      L('fs2','floating-shapes',{
        count:14, sizeMin:20, sizeMax:90, speedMin:10, speedMax:20,
        blur:24, opacityMin:4, opacityMax:12, shapes:['circle','blob','triangle'],
      }, ['#6366f1','#8b5cf6','#06b6d4'], 50),
    ],
    layout: { type: 'grid', gridRows: 5, gridCols: 3, gridGap: 18 },
    elements: [
      E('text', 1, 1, 3, {
        badge:'🎬 SCROLL ANIMATIONS', badgeColor:'#818cf8',
        heading:'Every Animation — Scroll Away & Back to Replay',
        subheading:'Each card uses a different entrance animation triggered by Intersection Observer. Duration and delay are individually configurable per element.',
        headingAlign:'center',
      }, { type:'fadeIn', duration:700, delay:0 },
        { textColor:'#f8fafc', textAlign:'center' }),

      ...animNames.map((anim, i) => {
        const row = Math.floor(i / 3) + 2; // rows 2, 3, 4, 5
        const col = (i % 3) + 1;           // cols 1, 2, 3
        return E('card', row, col, 1, {
          cardIcon:'bi-play-circle-fill',
          cardTitle: anim,
          cardBody: animDesc[i],
          cardBgType:'gradient',
          cardBgGradient: cardGrads[i],
          cardEffect:'glass',
          cardTextColor:'#e2e8f0',
        }, { type: anim, duration:700, delay:(i % 3) * 100 });
      }),
    ],
    tri: T('left','modern','#6366f1','#06b6d4','linear',100,80,'ANIMATIONS',2,48),
  });

  // ── 16 · 3D TILT BG · Auto-tilting immersive section ─────────
  await S({
    name: '16 · 3D-Tilt Background · Mouse & Auto Perspective',
    bg: '#050315',
    bgImg: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80',
    bgOpacity: 20,
    layers: [
      // 3d-tilt: mode must be 'auto' or 'mouse' — config maps to TiltConfig
      L('tilt','3d-tilt',{
        mode:'auto', intensity:6, speed:6, perspective:1200,
      }, ['#818cf8','#6366f1'], 100),
      L('mg2','moving-gradient',{
        speed:12, angle:225,
        colorStops:['#050315cc','#1e1b4b99','#050315cc'],
        saturation:100, brightness:60,
      }, [], 55, 'normal'),
    ],
    layout: { type: 'asymmetric-60-40', gridGap: 40 },
    elements: [
      E('text', 1, 1, 1, {
        badge:'🎮 3D TILT BACKGROUND', badgeColor:'#818cf8',
        heading:'3D Perspective Tilt',
        subheading:'The entire background tilts in 3D space — automatically floating or reacting to your mouse. Creates a stunning depth effect with any content layered on top.',
        text:'<ul style="color:#a5b4fc;font-size:14px;line-height:2;margin-top:12px;padding-left:18px"><li>mode: "auto" — always animating</li><li>mode: "mouse" — follows cursor</li><li>mode: "both" — auto + mouse</li><li>intensity · speed · perspective</li></ul>',
      }, { type:'slideInLeft', duration:800, delay:0 },
        { textColor:'#f1f5f9' }),
      E('card', 1, 2, 1, {
        cardIcon:'bi-box', cardTitle:'How It Works',
        cardBody:'The AnimBg layer wraps the entire section background in a 3D perspective container. On auto mode it slowly rotates between -intensity and +intensity degrees. On mouse mode it tracks cursor position for an interactive parallax feel.',
        cardBgType:'gradient', cardBgGradient:'linear-gradient(135deg,#0f0728cc,#1e1b4bcc)',
        cardEffect:'glass', cardTextColor:'#c7d2fe',
      }, { type:'slideInRight', duration:700, delay:200 }),
    ],
    tri: T('right','classic','#818cf8','#a78bfa','linear',90,70,'3D TILT',1,44),
  });

  // ── 17 · PARALLAX BG + GRADIENT OVERLAYS ────────────────────
  await S({
    name: '17 · Parallax Background · Gradient Overlay · Layer Blending',
    bg: '#0a0f1e',
    bgImg: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80',
    bgOpacity: 55,
    parallax: true,
    layers: [
      L('pd','parallax-drift',{
        layerCount:3, speedMultiplier:0.4,
        color1:'#0a0f1e', color2:'#0d2244',
        blurAmount:0, opacity:40,
      }, ['#3b82f6','#06b6d4'], 40, 'multiply'),
    ],
    layout: { type: 'grid', gridRows: 2, gridCols: 2, gridGap: 32 },
    elements: [
      E('text', 1, 1, 1, {
        badge:'🖼️ PARALLAX BACKGROUND', badgeColor:'#38bdf8',
        heading:'Background Image + Parallax',
        subheading:'Set any image URL as the section background. Toggle parallax scrolling for a depth illusion. Layer animated backgrounds on top with blend modes.',
        text:'<ul style="color:#94a3b8;font-size:14px;line-height:2;margin-top:12px;padding-left:18px"><li>Any URL — Unsplash, local, CDN</li><li>Parallax on/off · speed control</li><li>Opacity 0–100% · cover/contain</li><li>Blend AnimBg layers on top</li><li>12 gradient presets + custom CSS</li></ul>',
      }, { type:'slideInLeft', duration:800, delay:0 },
        { textColor:'#f1f5f9' }),
      E('card', 1, 2, 1, {
        cardIcon:'bi-palette-fill', cardTitle:'Gradient Overlay',
        cardBody:'Any CSS gradient string as background. 12 presets in the admin Background tab, plus a free-form CSS field. Blend with AnimBg layers using 5 blend modes.',
        cardBgType:'gradient', cardBgGradient:'linear-gradient(135deg,#0d1a2e,#1e3a5f)',
        cardEffect:'glass', cardTextColor:'#bae6fd',
      }, { type:'slideInRight', duration:700, delay:100 }),
      E('stats', 2, 1, 1, {
        statsNumber:'29', statsLabel:'Colour Presets',
        statsSubLabel:'Plus custom hex in Background tab',
        statsIcon:'bi-paint-bucket', statsAccentColor:'#38bdf8',
        statsTrend:'up', statsTrendValue:'All admin-configurable',
        statsGlass:true,
      }, { type:'bounceIn', duration:700, delay:200 }),
      E('stats', 2, 2, 1, {
        statsNumber:'5', statsLabel:'Blend Modes',
        statsSubLabel:'Normal · Multiply · Screen · Overlay · Soft-light',
        statsIcon:'bi-layers', statsAccentColor:'#7dd3fc',
        statsTrend:'neutral', statsTrendValue:'Per AnimBg layer',
        statsGlass:true,
      }, { type:'bounceIn', duration:700, delay:350 }),
    ],
    tri: T('left','classic','#2563eb','#38bdf8','linear',90,70,'PARALLAX',1,44),
  });

  // ── 18 · SVG ANIMATION BG · LAYOUT PRESETS GALLERY ──────────
  await S({
    name: '18 · SVG Animation BG · Layout Presets Gallery',
    bg: '#080f1a',
    layers: [
      L('svg','svg-animation',{
        svgType:'hexagons', speed:4, scale:1.2,
        strokeColor:'#2563eb', strokeOpacity:28, fillOpacity:5,
        animationType:'rotate',
      }, ['#2563eb','#7c3aed'], 50),
    ],
    layout: { type: 'grid', gridRows: 2, gridCols: 2, gridGap: 36 },
    elements: [
      E('text', 1, 1, 1, {
        badge:'📐 LAYOUT SYSTEM', badgeColor:'#60a5fa',
        heading:'11 Presets + Custom Grid',
        subheading:'Choose a preset, define an NxM custom grid, or switch to absolute drag-and-drop positioning. Mix and match.',
        text:'<ul style="color:#94a3b8;font-size:14px;line-height:2;margin-top:12px;padding-left:18px"><li>2-col-split · 3-col-grid · 4-col-grid</li><li>asymmetric 60/40 · 40/60</li><li>asymmetric 3col 50/25/25</li><li>hero-2col · sidebar-70-30 · 30-70</li><li>masonry layout</li><li>Custom grid: any N × M rows/cols</li><li>Absolute: drag element to x/y</li></ul>',
      }, { type:'slideInLeft', duration:800, delay:0 },
        { textColor:'#f1f5f9' }),
      E('html', 1, 2, 1, {
        html:`<div style="font-family:monospace;font-size:13px;color:#a5b4fc;line-height:2"><div style="background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.25);border-radius:10px;padding:20px"><div style="color:#818cf8;font-size:10px;letter-spacing:3px;margin-bottom:14px">GRID MODES</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div style="background:rgba(99,102,241,.18);border-radius:6px;padding:10px"><span style="color:#c7d2fe;display:block">PRESET</span><span style="color:#64748b;font-size:11px">11 built-in</span></div><div style="background:rgba(99,102,241,.18);border-radius:6px;padding:10px"><span style="color:#c7d2fe;display:block">GRID</span><span style="color:#64748b;font-size:11px">N × M custom</span></div><div style="background:rgba(99,102,241,.18);border-radius:6px;padding:10px"><span style="color:#c7d2fe;display:block">ABSOLUTE</span><span style="color:#64748b;font-size:11px">drag x/y/z</span></div><div style="background:rgba(99,102,241,.18);border-radius:6px;padding:10px"><span style="color:#c7d2fe;display:block">MULTI-MODE</span><span style="color:#64748b;font-size:11px">grows freely</span></div></div></div></div>`,
      }, { type:'fadeIn', duration:700, delay:100 }),
      E('stats', 2, 1, 1, {
        statsNumber:'11', statsLabel:'Grid Presets',
        statsSubLabel:'Plus NxM custom + absolute drag mode',
        statsIcon:'bi-grid-3x3', statsAccentColor:'#60a5fa', statsGlass:true,
      }, { type:'slideUp', duration:700, delay:200 }),
      E('stats', 2, 2, 1, {
        statsNumber:'12', statsLabel:'Max Columns',
        statsSubLabel:'Bootstrap grid · any colSpan',
        statsIcon:'bi-layout-three-columns', statsAccentColor:'#818cf8', statsGlass:true,
      }, { type:'slideUp', duration:700, delay:350 }),
    ],
    tri: T('right','modern','#2563eb','#7c3aed','linear',95,75,'LAYOUTS',2,48),
  });

  // ── 19 · BANNER ELEMENTS (multi, full-width col) ─────────────
  await S({
    name: '19 · Banner Elements — Gradient · Image · Floated · CTA',
    bg: '#0a1020',
    multi: true,
    layers: [
      L('sc','3d-scene',{
        sceneType:'stars', starCount:180, starSpeed:0.3, starSize:1.5,
        twinkle:true, depth:true,
      }, ['#ffffff','#c7d2fe'], 80),
    ],
    layout: { type: 'grid', gridRows: 5, gridCols: 1, gridGap: 24 },
    elements: [
      E('text', 1, 1, 1, {
        badge:'🖼️ BANNER BLOCK ELEMENT', badgeColor:'#34d399',
        heading:'Banner Elements — 4 Styles',
        subheading:'Banners support gradient, image+overlay, or solid backgrounds. Float left/right at any width, or go full-width with an embedded CTA button.',
        headingAlign:'center',
      }, { type:'fadeIn', duration:700, delay:0 },
        { textColor:'#f1f5f9', textAlign:'center' }),
      E('banner', 2, 1, 1, {
        bannerType:'gradient',
        bannerGradient:'linear-gradient(135deg,#1e3a5f 0%,#2563eb 50%,#7c3aed 100%)',
        bannerHeight:160, bannerHeading:'Full-Width Gradient Banner',
        bannerSubheading:'Any CSS gradient · heading · subheading · optional CTA button',
        bannerTextPosition:'center',
        bannerButton:{ text:'View Packages', href:'/packages', icon:'bi-arrow-right' },
        bannerOverlay:'rgba(0,0,0,0.2)',
      }, { type:'slideUp', duration:700, delay:100 }),
      E('banner', 3, 1, 1, {
        bannerType:'image',
        bannerSrc:'/images/placeholder-support.jpg',
        bannerHeight:180, bannerHeading:'Image Banner — Photo Background',
        bannerSubheading:'Photo with dark overlay. Heading and subheading float on top.',
        bannerTextPosition:'left',
        bannerOverlay:'rgba(0,0,0,0.62)',
      }, { type:'slideUp', duration:700, delay:200 }),
      E('banner', 4, 1, 1, {
        bannerType:'gradient',
        bannerGradient:'linear-gradient(90deg,#065f46 0%,#047857 100%)',
        bannerHeight:130, bannerHeading:'24/7 Local Your Region Support',
        bannerSubheading:'Real humans in Your City — not a call centre.',
        bannerTextPosition:'left',
        bannerButton:{ text:'Contact Us', href:'/support', icon:'bi-headset' },
        bannerFloat:'left', bannerFloatWidth:'58%',
        bannerOverlay:'rgba(0,0,0,0.1)',
      }, { type:'slideInLeft', duration:700, delay:300 }),
      E('divider', 5, 1, 1, {
        dividerType:'gradient', dividerHeight:2,
        dividerColor:'linear-gradient(90deg,transparent,#2563eb,#7c3aed,transparent)',
        dividerLabel:'Continue Scrolling',
      }, { type:'fadeIn', duration:700, delay:400 }),
    ],
    tri: T('left','modern','#34d399','#059669','linear',100,80,'BANNERS',2,46),
  });

  // ── 20 · HTML BLOCK + CUSTOM @KEYFRAMES ─────────────────────
  await S({
    name: '20 · HTML Block — Custom @keyframes · Scoped CSS · Zero Bleed',
    bg: '#0a0a14',
    layers: [
      L('mg3','moving-gradient',{
        speed:8, angle:225,
        colorStops:['#0a0a14','#14001a','#001420','#0a0a14'],
        saturation:100, brightness:60,
      }, [], 100),
    ],
    layout: { type: 'grid', gridRows: 2, gridCols: 2, gridGap: 32 },
    elements: [
      E('text', 1, 1, 1, {
        badge:'💻 HTML BLOCK ELEMENT', badgeColor:'#a78bfa',
        heading:'Raw HTML — Isolated CSS',
        subheading:'The HTML block renders any HTML, CSS, and JavaScript. Styles are scoped to a unique ID — zero bleed into the rest of the page.',
        text:'<ul style="color:#94a3b8;font-size:14px;line-height:2;margin-top:12px;padding-left:18px"><li>Custom <code style="color:#c084fc">@keyframes</code> animations</li><li>Scoped CSS variables</li><li>Bootstrap classes work inside</li><li>Inline JS for interactivity</li><li>SVG · Canvas · Three.js · GSAP</li><li>Zero bleed — safe for complex libs</li></ul>',
      }, { type:'slideInLeft', duration:800, delay:0 },
        { textColor:'#f1f5f9' }),
      E('html', 1, 2, 1, {
        html:`<style>
@keyframes _orb_spin{from{transform:rotate(0deg) translateX(48px) rotate(0deg)}to{transform:rotate(360deg) translateX(48px) rotate(-360deg)}}
@keyframes _orb_pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.2);opacity:.6}}
._orb_wrap{display:flex;align-items:center;justify-content:center;height:200px;position:relative}
._orb_core{width:48px;height:48px;border-radius:50%;background:radial-gradient(circle,#7c3aed,#2563eb);box-shadow:0 0 28px #7c3aed88;animation:_orb_pulse 2s ease-in-out infinite}
._orb_dot{position:absolute;width:10px;height:10px;border-radius:50%;top:50%;left:50%;margin:-5px;animation:_orb_spin 2s linear infinite}
._orb_label{color:#64748b;font-size:11px;letter-spacing:2px;text-align:center;margin-top:10px;font-family:monospace}
</style>
<div class="_orb_wrap">
  <div class="_orb_core"></div>
  <div class="_orb_dot" style="background:#38bdf8"></div>
  <div class="_orb_dot" style="background:#00ff88;animation-delay:-.66s"></div>
  <div class="_orb_dot" style="background:#f59e0b;animation-delay:-1.33s;animation-duration:2.8s"></div>
</div>
<p class="_orb_label">CUSTOM @keyframes · SCOPED CSS · ZERO BLEED</p>`,
      }, { type:'scaleIn', duration:700, delay:200 }),
      E('text', 2, 1, 2, {
        text:'<p style="color:#3f3f50;font-size:12px;text-align:center;font-family:monospace;letter-spacing:1px">Styles scoped to unique section ID — never affects admin UI, other sections, or third-party libraries</p>',
      }, { type:'fadeIn', duration:500, delay:400 }),
    ],
    tri: T('right','classic','#a78bfa','#ec4899','radial',90,70,'HTML BLOCK',1,44),
  });

  // ── 21 · BUTTONS + DIVIDERS + PAGE NAVIGATION (multi) ───────
  await S({
    name: '21 · Buttons (4 variants) · Dividers · Page Navigation',
    bg: '#080e18',
    multi: true,
    layers: [
      L('fs3','floating-shapes',{
        count:6, sizeMin:30, sizeMax:100, speedMin:12, speedMax:22,
        blur:30, opacityMin:3, opacityMax:8, shapes:['blob'],
      }, ['#2563eb','#7c3aed','#0891b2'], 40),
    ],
    layout: { type: 'grid', gridRows: 4, gridCols: 2, gridGap: 24 },
    elements: [
      E('text', 1, 1, 2, {
        badge:'🔘 BUTTONS · DIVIDERS · NAVIGATION', badgeColor:'#60a5fa',
        heading:'4 Button Variants · 4 Divider Styles · Page Links',
        subheading:'Buttons: filled · outline · dark · ghost. Sizes: sm/md/lg. Optional icon, full-width mode. Links target pages, anchors, or external URLs.',
        headingAlign:'center',
      }, { type:'fadeIn', duration:700, delay:0 },
        { textColor:'#f1f5f9', textAlign:'center' }),

      E('html', 2, 1, 1, {
        html:`<div style="display:flex;flex-direction:column;gap:14px;padding:8px">
<a href="/packages" style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;box-shadow:0 4px 18px rgba(37,99,235,.35);transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 28px rgba(37,99,235,.5)'" onmouseout="this.style.transform='';this.style.boxShadow='0 4px 18px rgba(37,99,235,.35)'"><i class="bi bi-tags-fill"></i> Filled — View Packages</a>
<a href="/about" style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:transparent;color:#60a5fa;border:2px solid #60a5fa;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;transition:all .2s" onmouseover="this.style.background='rgba(96,165,250,.12)'" onmouseout="this.style.background='transparent'"><i class="bi bi-building"></i> Outline — About Us</a>
<a href="/support" style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:#1e293b;color:#f1f5f9;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;transition:all .2s" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#1e293b'"><i class="bi bi-headset"></i> Dark — Get Support</a>
<a href="#" style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:transparent;color:#64748b;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;transition:all .2s" onmouseover="this.style.color='#94a3b8'" onmouseout="this.style.color='#64748b'"><i class="bi bi-eye"></i> Ghost — Transparent BG</a>
</div>`,
      }, { type:'slideInLeft', duration:700, delay:100 }),
      E('html', 2, 2, 1, {
        html:`<div style="padding:8px;display:flex;flex-direction:column;gap:28px">
<div><div style="height:2px;background:linear-gradient(90deg,transparent,#2563eb,#7c3aed,transparent)"></div><p style="color:#334155;font-size:10px;text-align:center;margin:5px 0 0;letter-spacing:2px;font-family:monospace">GRADIENT DIVIDER</p></div>
<div style="display:flex;align-items:center;gap:14px"><div style="flex:1;height:1px;background:rgba(99,102,241,.2)"></div><span style="color:#475569;font-size:10px;letter-spacing:3px;font-family:monospace">WAVE</span><div style="flex:1;height:1px;background:rgba(99,102,241,.2)"></div></div>
<div style="display:flex;align-items:center;justify-content:center;gap:6px">${Array(9).fill(0).map((_,i)=>`<div style="width:${5-Math.abs(i-4)}px;height:${5-Math.abs(i-4)}px;border-radius:50%;background:rgba(99,102,241,${0.2+Math.abs(i-4)*0.08})"></div>`).join('')}</div>
<div style="height:1px;background:rgba(99,102,241,.3);box-shadow:0 0 10px rgba(99,102,241,.6)"></div>
<p style="color:#334155;font-size:10px;text-align:center;letter-spacing:2px;font-family:monospace">LINE · DOTS · WAVE · GRADIENT DIVIDERS</p></div>`,
      }, { type:'slideInRight', duration:700, delay:200 }),

      E('text', 3, 1, 2, {
        heading:'Navigate to Demo Pages',
        subheading:'Two complete demo pages created below — each with its own animated backgrounds, sections, and content.',
        headingAlign:'center',
      }, { type:'fadeIn', duration:700, delay:0 },
        { textColor:'#f1f5f9', textAlign:'center' }),
      E('button', 4, 1, 1, {
        buttonText:'View Packages & Pricing', buttonHref:'/packages',
        buttonVariant:'filled', buttonIcon:'bi-tags-fill',
        buttonSize:'lg', buttonFullWidth:true,
      }, { type:'slideInLeft', duration:700, delay:100 }),
      E('button', 4, 2, 1, {
        buttonText:'About Us Internet', buttonHref:'/about',
        buttonVariant:'outline', buttonIcon:'bi-building',
        buttonSize:'lg', buttonFullWidth:true,
      }, { type:'slideInRight', duration:700, delay:200 }),
    ],
    tri: T('left','classic','#2563eb','#0891b2','linear',95,75,'NAVIGATE',1,44),
  });

  // ── FOOTER ───────────────────────────────────────────────────
  await Special({
    type: 'FOOTER', name: 'Footer', bg: '#060b14', pt: 60, pb: 40,
    content: {
      logo: '/images/logo-placeholder.png',
      tagline: 'Serving your region since 2010',
      companyInfo: {
        name: 'Your Company', position: 'top-left',
        address: '12 Harbour Road, Your City, Western Cape, 7200',
        phone: '+27 28 312 4567', email: 'info@yourcompany.co.za',
      },
      columns: [
        { id:'c1', title:'Quick Links', links:[
          { text:'View Packages', href:'/packages' },
          { text:'About Us', href:'/about' },
          { text:'Coverage Map', href:'/coverage' },
          { text:'Get Support', href:'/support' },
        ]},
        { id:'c2', title:'Services', links:[
          { text:'Home Fibre', href:'/packages' },
          { text:'Business Fibre', href:'/packages' },
          { text:'Fixed Wireless', href:'/packages' },
          { text:'LTE Backup', href:'/packages' },
        ]},
        { id:'c3', title:'Company', links:[
          { text:'About Us', href:'/about' },
          { text:'Careers', href:'#' },
          { text:'Privacy Policy', href:'#' },
          { text:'Terms of Service', href:'#' },
        ]},
      ],
      copyright: '© 2026 Your Company (Pty) Ltd. All rights reserved.',
      socialLinks: [
        { platform:'facebook', url:'https://facebook.com', icon:'bi-facebook' },
        { platform:'twitter', url:'https://twitter.com', icon:'bi-twitter-x' },
        { platform:'instagram', url:'https://instagram.com', icon:'bi-instagram' },
        { platform:'linkedin', url:'https://linkedin.com', icon:'bi-linkedin' },
      ],
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // PHASE 4 — /packages PAGE
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📦 Building /packages page...');

  await Special({
    type: 'HERO', name: 'Packages Hero', slug: 'packages',
    bg: 'transparent', pt: 0, pb: 0,
    content: {
      slides: [
        Slide('ph1', '/images/placeholder-hero.jpg', 'bottom', '#0d1117', 84,
          'Internet Packages', 72,
          'Fibre · WiFi · LTE · Fixed Wireless · No contracts · Local support',
          '#cbd5e1',
          [Btn('Scroll to Packages', '#packages', '#2563eb')]),
      ],
      autoPlay: false, showDots: false, showArrows: false, transitionDuration: 800,
    },
  });

  await S({
    name: 'Packages — Fibre Plans', slug: 'packages',
    bg: '#0d0c1a', multi: true,
    layers: [L('mg4','moving-gradient',{ speed:12, angle:135, colorStops:['#0d0c1a','#1a0a2e','#0a0c14'], saturation:100, brightness:75 }, [], 100)],
    layout: { type:'grid', gridRows:2, gridCols:4, gridGap:24 },
    elements: [
      E('text', 1, 1, 4, { heading:'Fibre Internet', subheading:'Symmetrical speeds · Uncapped · FTTH · No lock-in contracts', headingAlign:'center', badge:'FIBRE', badgeColor:'#f97316' }, { type:'fadeIn', duration:700, delay:0 }, { textColor:'#ffffff', textAlign:'center' }),
      E('isp-price-card', 2, 1, 1, { packageName:'Fibre 25', packageType:'fibre', price:'R499', priceLabel:'/pm', downloadSpeed:25, uploadSpeed:25, speedUnit:'Mbps', features:'Uncapped data\nFree router\n24/7 support\nNo lock-in', isFeatured:false, accentColor:'#38bdf8', cardBgColor:'#0f172a', textColor:'#f1f5f9', buttonText:'Get Started' }, { type:'slideUp', duration:700, delay:0 }),
      E('isp-price-card', 2, 2, 1, { packageName:'Fibre 100', packageType:'fibre', price:'R699', priceLabel:'/pm', downloadSpeed:100, uploadSpeed:100, speedUnit:'Mbps', features:'Uncapped data\nFree WiFi 6 router\nPriority support\nNo lock-in', isFeatured:true, featuredLabel:'⚡ MOST POPULAR', accentColor:'#f97316', cardBgColor:'#1a0d0a', textColor:'#f1f5f9', buttonText:'Get Started' }, { type:'slideUp', duration:700, delay:100 }),
      E('isp-price-card', 2, 3, 1, { packageName:'Fibre 500', packageType:'fibre', price:'R999', priceLabel:'/pm', downloadSpeed:500, uploadSpeed:500, speedUnit:'Mbps', features:'Uncapped data\nFree WiFi 6 router\n2× static IP\nSLA 99.9%\nNo lock-in', isFeatured:false, accentColor:'#a78bfa', cardBgColor:'#130a1a', textColor:'#f1f5f9', buttonText:'Get Started' }, { type:'slideUp', duration:700, delay:200 }),
      E('isp-price-card', 2, 4, 1, { packageName:'Fibre 1G', packageType:'fibre', price:'R1,499', priceLabel:'/pm', downloadSpeed:1000, uploadSpeed:1000, speedUnit:'Mbps', features:'Uncapped data\nFree WiFi 6E router\n4× static IP\nBGP routing\nDedicated SLA\nNo lock-in', isFeatured:false, accentColor:'#34d399', cardBgColor:'#071a10', textColor:'#f1f5f9', buttonText:'Get Started' }, { type:'slideUp', duration:700, delay:300 }),
    ],
    tri: T('right','modern','#7c3aed','#f97316','linear',100,80,'FIBRE',2,48),
  });

  await S({
    name: 'Packages — Wireless Plans', slug: 'packages',
    bg: '#04111a', multi: true,
    layers: [L('wv3','waves',{ waveCount:3, speed:3, amplitude:35, frequency:0.6, fillStyle:'stroke', lineWidth:1.5, opacity:35 }, ['#0891b2','#06b6d4'], 50)],
    layout: { type:'grid', gridRows:2, gridCols:3, gridGap:28 },
    elements: [
      E('text', 1, 1, 3, { heading:'Wireless Internet', subheading:"Where fibre hasn't reached yet — fast wireless that performs.", headingAlign:'center', badge:'WIRELESS', badgeColor:'#06b6d4' }, { type:'fadeIn', duration:700, delay:0 }, { textColor:'#ffffff', textAlign:'center' }),
      E('isp-price-card', 2, 1, 1, { packageName:'Home WiFi', packageType:'wifi', price:'R299', priceLabel:'/pm', downloadSpeed:50, uploadSpeed:20, speedUnit:'Mbps', features:'Point-to-point wireless\nNo install fee\nUncapped options\n24/7 support', isFeatured:true, featuredLabel:'🌐 BEST COVERAGE', accentColor:'#06b6d4', cardBgColor:'#04111a', textColor:'#f1f5f9', buttonText:'Check Coverage' }, { type:'slideInLeft', duration:700, delay:0 }),
      E('isp-price-card', 2, 2, 1, { packageName:'LTE Backup', packageType:'lte', price:'R199', priceLabel:'/pm', downloadSpeed:30, uploadSpeed:15, speedUnit:'Mbps', features:'Auto failover\nSIM included\nUnlimited bundles\nNo contracts', isFeatured:false, accentColor:'#a855f7', cardBgColor:'#0e0618', textColor:'#f1f5f9', buttonText:'Add LTE Backup' }, { type:'slideUp', duration:700, delay:100 }),
      E('isp-price-card', 2, 3, 1, { packageName:'Fixed Wireless', packageType:'fwa', price:'R449', priceLabel:'/pm', downloadSpeed:100, uploadSpeed:50, speedUnit:'Mbps', features:'No trenching\nSame-day activate\nOutdoor antenna\nEstate solution', isFeatured:true, featuredLabel:'🏠 ESTATE SOLUTION', accentColor:'#f97316', cardBgColor:'#1a0800', textColor:'#f1f5f9', buttonText:'Get FWA' }, { type:'slideInRight', duration:700, delay:200 }),
    ],
    tri: T('left','classic','#0891b2','#0d9488','linear',90,70,'WIRELESS',1,44),
  });

  await Special({
    type:'FOOTER', name:'Packages Footer', slug:'packages', bg:'#060b14', pt:60, pb:40,
    content:{ tagline:'Serving your region since 2010', columns:[{ id:'c1', title:'Quick Links', links:[{ text:'Home', href:'/' },{ text:'About Us', href:'/about' },{ text:'Get Support', href:'/support' }] }], copyright:'© 2026 Your Company (Pty) Ltd.' },
  });

  // ═══════════════════════════════════════════════════════════════
  // PHASE 5 — /about PAGE
  // ═══════════════════════════════════════════════════════════════
  console.log('\n🏢 Building /about page...');

  await Special({
    type:'HERO', name:'About Hero', slug:'about',
    bg:'transparent', pt:0, pb:0,
    content:{
      slides:[
        Slide('ah1','/images/placeholder-support.jpg','right','#0d2400',88,
          'About Your Company', 66,
          "South Africa's Your Region region's leading ISP since 2010 — local team, world-class infrastructure.",
          '#dcfce7',
          [Btn('View Packages','/packages','#16a34a')], 'left'),
      ],
      autoPlay:false, showDots:false, showArrows:false, transitionDuration:800,
    },
  });

  await S({
    name:'About — Our Story + Stats', slug:'about',
    bg:'#050d10',
    layers:[L('fp3','fibre-pulse',{ cableCount:8, pulseCount:3, pulseSpeed:5, pulseSize:14, cableWidth:1.2, cableOpacity:22, origin:'top-right', curvature:50, cableColor:'#34d399', pulseColor:'#10b981', pulseDirection:'source-to-end' }, ['#34d399','#10b981'], 60)],
    layout:{ type:'grid', gridRows:2, gridCols:3, gridGap:28 },
    elements:[
      E('text', 1, 1, 2, { badge:'🏢 OUR STORY', badgeColor:'#34d399', heading:'Local Since 2010', subheading:'Your Company started with a single tower in Your City. Today we serve 4,800+ homes and businesses across the Your Region.', text:'<p style="color:#94a3b8;font-size:15px;line-height:1.85;margin-top:12px">Our engineers live here. When you call us, you speak to a local who knows your street — not a script-reader in a distant call centre.</p>' }, { type:'slideInLeft', duration:800, delay:0 }, { textColor:'#f1f5f9' }),
      E('stats', 1, 3, 1, { statsNumber:'2010', statsLabel:'Founded', statsSubLabel:'Your City, Western Cape', statsIcon:'bi-building', statsAccentColor:'#34d399', statsGlass:true }, { type:'slideInRight', duration:700, delay:100 }),
      E('stats', 2, 1, 1, { statsNumber:'4,800+', statsLabel:'Active Customers', statsSubLabel:'Your Region region', statsIcon:'bi-people-fill', statsAccentColor:'#34d399', statsTrend:'up', statsTrendValue:'+18% this year', statsGlass:true }, { type:'bounceIn', duration:700, delay:0 }),
      E('stats', 2, 2, 1, { statsNumber:'99.7%', statsLabel:'Network Uptime', statsSubLabel:'Past 12 months', statsIcon:'bi-graph-up-arrow', statsAccentColor:'#10b981', statsTrend:'up', statsTrendValue:'+0.2% vs 2025', statsGlass:true }, { type:'bounceIn', duration:700, delay:150 }),
      E('stats', 2, 3, 1, { statsNumber:'< 3 min', statsLabel:'Support Response', statsSubLabel:'Average call wait time', statsIcon:'bi-headset', statsAccentColor:'#6ee7b7', statsTrend:'neutral', statsTrendValue:'Industry best', statsGlass:true }, { type:'bounceIn', duration:700, delay:300 }),
    ],
    tri: T('right','modern','#34d399','#059669','linear',95,75,'ABOUT US',2,48),
  });

  await S({
    name:'About — Why Choose Us', slug:'about',
    bg:'#04080f',
    layers:[L('pf3','particle-field',{ count:40, speed:0.6, size:2, connectDistance:100, connectOpacity:0.1, shape:'circle', drawConnections:true }, ['#34d399','#059669'], 50)],
    layout:{ type:'grid', gridRows:2, gridCols:3, gridGap:24 },
    elements:[
      E('text', 1, 1, 3, { heading:'Why Choose Us?', subheading:'Beyond just internet — we build the infrastructure your community depends on.', headingAlign:'center', badge:'OUR VALUES', badgeColor:'#10b981' }, { type:'fadeIn', duration:700, delay:0 }, { textColor:'#f1f5f9', textAlign:'center' }),
      E('card', 2, 1, 1, { cardIcon:'bi-geo-alt-fill', cardTitle:'Genuinely Local', cardBody:"Our team lives and works in the Your Region. We're invested in the community — not a distant corporation.", cardBgType:'gradient', cardBgGradient:'linear-gradient(135deg,#052e16,#14532d)', cardEffect:'glass', cardTextColor:'#a7f3d0' }, { type:'slideInLeft', duration:700, delay:0 }),
      E('card', 2, 2, 1, { cardIcon:'bi-lightning-charge-fill', cardTitle:'Real Infrastructure', cardBody:'We own our fibre, towers, and core network. No middlemen — direct from your home to the internet.', cardBgType:'gradient', cardBgGradient:'linear-gradient(135deg,#0a2744,#1e40af)', cardEffect:'glow', cardGlowColor:'#34d399', cardTextColor:'#bae6fd' }, { type:'fadeIn', duration:700, delay:150 }),
      E('card', 2, 3, 1, { cardIcon:'bi-shield-check-fill', cardTitle:'No Surprises', cardBody:'Transparent pricing, no lock-in, no hidden fees. The price you see is the price you pay — forever.', cardBgType:'gradient', cardBgGradient:'linear-gradient(135deg,#1a0a2e,#4c1d95)', cardEffect:'shimmer', cardTextColor:'#e2e8f0' }, { type:'slideInRight', duration:700, delay:300 }),
    ],
    tri: T('left','classic','#059669','#0d9488','linear',90,70,'WHY US',1,44),
  });

  await Special({
    type:'FOOTER', name:'About Footer', slug:'about', bg:'#060b14', pt:60, pb:40,
    content:{ tagline:'Serving your region since 2010', columns:[{ id:'c1', title:'Quick Links', links:[{ text:'Home', href:'/' },{ text:'View Packages', href:'/packages' },{ text:'Get Support', href:'/support' }] }], copyright:'© 2026 Your Company (Pty) Ltd.' },
  });

  // ═══════════════════════════════════════════════════════════════
  // DONE
  // ═══════════════════════════════════════════════════════════════
  console.log('\n\n🎉 SEED COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Landing:  http://localhost:3000');
  console.log('  Packages: http://localhost:3000/packages');
  console.log('  About:    http://localhost:3000/about');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

})();
