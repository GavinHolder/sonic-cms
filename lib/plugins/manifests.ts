import type { PluginManifest } from './types'

// ── Core Plugins (canDisable: false) ─────────────────────────────────────────

export const PAGES_MANIFEST: PluginManifest = {
  id: 'pages',
  name: 'Pages & Sections',
  description: 'Pages, sections, landing page management, section editor, page editor, SEO, and navbar configuration',
  version: '1.0.0',
  author: 'CMS Core',
  icon: 'bi-file-earmark-text',
  routes: {
    admin: [
      '/admin/content/landing-page',
      '/admin/content/pages',
      '/admin/content/navbar',
      '/admin/content/seo',
      '/admin/page-editor/[slug]',
      '/admin/editor/[sectionId]',
      '/admin/section-preview',
    ],
    api: [
      '/api/pages',
      '/api/pages/landing',
      '/api/pages/[slug]',
      '/api/pages/[slug]/publish',
      '/api/pages/[slug]/duplicate',
      '/api/sections',
      '/api/sections/[id]',
      '/api/sections/[id]/spacing',
      '/api/sections/reorder',
      '/api/elements',
      '/api/elements/[id]',
      '/api/elements/reorder',
      '/api/navbar',
      '/api/navbar-links',
      '/api/seo',
      '/api/seo/audit',
      '/api/seo/readiness',
    ],
    public: [
      '/',
      '/[slug]',
    ],
  },
  sidebarItems: [{
    parentId: 'content',
    items: [
      { id: 'landing-page', label: 'Landing Page', icon: 'bi-house-door', href: '/admin/content/landing-page' },
      { id: 'pages', label: 'Pages', icon: 'bi-files', href: '/admin/content/pages' },
      { id: 'navbar', label: 'Navbar', icon: 'bi-compass', href: '/admin/content/navbar' },
      { id: 'seo', label: 'SEO', icon: 'bi-search', href: '/admin/content/seo' },
    ],
  }],
  settingsTabs: [],
  prismaModels: ['Page', 'Section', 'SectionVersion', 'CustomElement'],
  dependencies: [],
  coreMinVersion: '1.0.0',
  touchesFiles: [
    'lib/page-manager.ts',
    'lib/section-manager.ts',
    'lib/section-data.ts',
    'lib/section-data-v2.ts',
    'lib/seo-config.ts',
    'lib/metadata-generator.ts',
    'lib/navbar-config.ts',
    'lib/navigation-utils.ts',
    'components/sections/DynamicSection.tsx',
    'components/sections/HeroCarousel.tsx',
    'components/sections/FlexibleSectionRenderer.tsx',
    'components/sections/TextImageSection.tsx',
    'components/sections/CTAFooter.tsx',
    'components/sections/LowerThirdRenderer.tsx',
    'components/sections/MotionElementRenderer.tsx',
    'components/sections/TriangleOverlay.tsx',
    'components/sections/TriangleSectionWrapper.tsx',
    'components/sections/AnimBgRenderer.tsx',
    'components/layout/Navbar.tsx',
  ],
  touchesModels: ['Page', 'Section', 'SectionVersion', 'CustomElement'],
  touchesRoutes: ['/api/pages/**', '/api/sections/**', '/api/elements/**', '/api/navbar/**', '/api/seo/**'],
  tier: 'core',
  canDisable: false,
  defaultEnabled: true,
}

export const AUTH_MANIFEST: PluginManifest = {
  id: 'auth',
  name: 'Authentication',
  description: 'Users, roles, login, JWT authentication, OTP verification, and API key management',
  version: '1.0.0',
  author: 'CMS Core',
  icon: 'bi-shield-lock',
  routes: {
    admin: [
      '/admin/login',
      '/admin/forgot-password',
      '/admin/users',
    ],
    api: [
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/me',
      '/api/auth/refresh',
      '/api/users',
      '/api/users/[id]',
      '/api/otp/send',
      '/api/otp/verify',
      '/api/admin/api-keys',
      '/api/admin/api-keys/[id]',
    ],
    public: [
      '/client-login',
    ],
  },
  sidebarItems: [{
    parentId: 'root',
    items: [
      { id: 'users', label: 'Users', icon: 'bi-people', href: '/admin/users' },
    ],
  }],
  settingsTabs: [],
  prismaModels: ['User', 'OtpToken', 'ApiKey'],
  dependencies: [],
  coreMinVersion: '1.0.0',
  touchesFiles: [
    'lib/auth.ts',
    'lib/auth-config.ts',
    'lib/api-keys.ts',
    'lib/api-middleware.ts',
    'lib/rate-limit.ts',
    'lib/email.ts',
  ],
  touchesModels: ['User', 'OtpToken', 'ApiKey'],
  touchesRoutes: ['/api/auth/**', '/api/users/**', '/api/otp/**', '/api/admin/api-keys/**'],
  tier: 'core',
  canDisable: false,
  defaultEnabled: true,
}

export const MEDIA_MANIFEST: PluginManifest = {
  id: 'media',
  name: 'Media Library',
  description: 'Media asset management, file uploads, image browsing, Unsplash integration',
  version: '1.0.0',
  author: 'CMS Core',
  icon: 'bi-images',
  routes: {
    admin: [
      '/admin/media',
    ],
    api: [
      '/api/media',
      '/api/media/[id]',
      '/api/media/upload',
      '/api/media/upload-simple',
      '/api/media/files',
      '/api/media/usage',
      '/api/unsplash/search',
    ],
    public: [],
  },
  sidebarItems: [{
    parentId: 'root',
    items: [
      { id: 'media', label: 'Media Library', icon: 'bi-images', href: '/admin/media' },
    ],
  }],
  settingsTabs: [],
  prismaModels: ['MediaAsset'],
  dependencies: [],
  coreMinVersion: '1.0.0',
  touchesFiles: [
    'components/admin/MediaPickerModal.tsx',
    'components/admin/MediaUploadModal.tsx',
  ],
  touchesModels: ['MediaAsset'],
  touchesRoutes: ['/api/media/**', '/api/unsplash/**'],
  tier: 'core',
  canDisable: false,
  defaultEnabled: true,
}

export const SETTINGS_MANIFEST: PluginManifest = {
  id: 'settings',
  name: 'Settings',
  description: 'Site configuration, maintenance mode, system settings, site config, email/SMTP, and admin preferences',
  version: '1.0.0',
  author: 'CMS Core',
  icon: 'bi-gear',
  routes: {
    admin: [
      '/admin/settings',
      '/admin/settings/site-config',
      '/admin/settings/api-keys',
      '/admin/settings/navbar-links',
      '/admin/dashboard',
      '/admin/documents',
    ],
    api: [
      '/api/site-config',
      '/api/settings/email',
      '/api/admin/maintenance',
      '/api/health',
    ],
    public: [
      '/maintenance-preview',
    ],
  },
  sidebarItems: [
    {
      parentId: 'settings',
      items: [
        { id: 'settings-general', label: 'General', icon: 'bi-sliders', href: '/admin/settings' },
        { id: 'site-config', label: 'Site Config', icon: 'bi-building', href: '/admin/settings/site-config' },
        { id: 'api-keys', label: 'API Keys', icon: 'bi-key', href: '/admin/settings/api-keys' },
      ],
    },
    {
      parentId: 'root',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2', href: '/admin/dashboard' },
        { id: 'documents', label: 'Documentation', icon: 'bi-book', href: '/admin/documents' },
      ],
    },
  ],
  settingsTabs: [
    { id: 'site', label: 'Site', icon: 'bi-globe2' },
    { id: 'ui', label: 'UI Preferences', icon: 'bi-palette' },
    { id: 'editor', label: 'Editor', icon: 'bi-pencil-square' },
    { id: 'preview', label: 'Preview', icon: 'bi-eye' },
    { id: 'scroll', label: 'Scroll Behavior', icon: 'bi-arrows-vertical' },
    { id: 'data', label: 'Data Management', icon: 'bi-database' },
    { id: 'email', label: 'Email & SMTP', icon: 'bi-envelope-at' },
    { id: 'about', label: 'About', icon: 'bi-info-circle' },
  ],
  prismaModels: ['SystemSettings', 'SiteConfig'],
  dependencies: [],
  coreMinVersion: '1.0.0',
  touchesFiles: [
    'lib/cms-settings.ts',
    'lib/admin/docs-content.ts',
    'components/admin/Sidebar.tsx',
    'components/admin/AdminLayout.tsx',
  ],
  touchesModels: ['SystemSettings', 'SiteConfig'],
  touchesRoutes: ['/api/site-config/**', '/api/settings/**', '/api/admin/maintenance/**', '/api/health/**'],
  tier: 'core',
  canDisable: false,
  defaultEnabled: true,
}

export const UPDATES_MANIFEST: PluginManifest = {
  id: 'updates',
  name: 'CMS Updates',
  description: 'CMS update system, version checking, GitHub Actions deployment trigger, update scheduling',
  version: '1.0.0',
  author: 'CMS Core',
  icon: 'bi-arrow-up-circle',
  routes: {
    admin: [],
    api: [
      '/api/admin/updates/check',
      '/api/admin/updates/config',
      '/api/admin/updates/schedule',
      '/api/admin/updates/status',
      '/api/admin/updates/trigger',
      '/api/admin/updates/verify',
    ],
    public: [],
  },
  sidebarItems: [],
  settingsTabs: [
    { id: 'cms-updates', label: 'CMS Updates', icon: 'bi-arrow-up-circle' },
  ],
  prismaModels: [],
  dependencies: ['settings'],
  coreMinVersion: '1.0.0',
  touchesFiles: [
    'lib/github-actions.ts',
    'components/admin/UpdateBadge.tsx',
    'components/admin/UpdateModal.tsx',
  ],
  touchesModels: ['SystemSettings'],
  touchesRoutes: ['/api/admin/updates/**'],
  tier: 'core',
  canDisable: false,
  defaultEnabled: true,
}

// ── Standard Plugins (canDisable: true, defaultEnabled: true) ────────────────

export const CONTENT_TYPES_MANIFEST: PluginManifest = {
  id: 'content-types',
  name: 'Content Types',
  description: 'Custom content type engine with dynamic routing, blog, team, and any custom content',
  version: '1.0.0',
  author: 'CMS Core',
  icon: 'bi-collection',
  routes: {
    admin: [
      '/admin/content-types',
      '/admin/content/[typeSlug]',
      '/admin/content/[typeSlug]/[entryId]',
    ],
    api: [
      '/api/admin/content-types',
      '/api/admin/content-types/[id]',
      '/api/admin/content-entries/[typeSlug]',
      '/api/admin/content-entries/[typeSlug]/[entryId]',
      '/api/admin/content-entries/_versions/[entryId]',
      '/api/content/[typeSlug]',
      '/api/cron/publish-scheduled',
    ],
    public: [
      '/content/[typeSlug]',
      '/content/[typeSlug]/[slug]',
      '/content/[typeSlug]/feed.xml',
    ],
  },
  sidebarItems: [{
    parentId: 'content',
    items: [
      { id: 'content-types-manage', label: 'Manage Types', icon: 'bi-sliders2', href: '/admin/content-types' },
    ],
  }],
  settingsTabs: [],
  prismaModels: ['ContentType', 'ContentField', 'ContentEntry', 'ContentEntryVersion'],
  dependencies: [],
  coreMinVersion: '1.0.0',
  touchesFiles: [
    'lib/content-types.ts',
    'app/admin/content-types/page.tsx',
    'app/admin/content/[typeSlug]/page.tsx',
    'app/admin/content/[typeSlug]/[entryId]/page.tsx',
    'app/content/[typeSlug]/page.tsx',
    'app/content/[typeSlug]/[slug]/page.tsx',
    'app/content/[typeSlug]/feed.xml/route.ts',
  ],
  touchesModels: ['ContentType', 'ContentField', 'ContentEntry', 'ContentEntryVersion'],
  touchesRoutes: ['/api/admin/content-types/**', '/api/admin/content-entries/**', '/api/content/**', '/api/cron/publish-scheduled'],
  tier: 'free',
  canDisable: true,
  defaultEnabled: true,
  sectionTypes: [
    { id: 'blog-feed', label: 'Blog Feed', icon: 'bi-journal-text', description: 'Latest blog posts in a card grid — automatically pulls from your Blog content type' },
    { id: 'team-grid', label: 'Team Grid', icon: 'bi-people', description: 'Team member cards — automatically pulls from your Team content type' },
  ],
}

export const VOLT_STUDIO_MANIFEST: PluginManifest = {
  id: 'volt-studio',
  name: 'Volt Studio',
  description: 'Vector design editor, VoltRenderer, 3D asset management, Volt library, and flip card designs',
  version: '1.0.0',
  author: 'CMS Core',
  icon: 'bi-lightning-charge-fill',
  routes: {
    admin: [
      '/admin/volt',
      '/admin/volt-3d',
    ],
    api: [
      '/api/volt',
      '/api/volt/[id]',
      '/api/volt-3d',
      '/api/volt-3d/[id]',
      '/api/volt-3d/[id]/confirm',
      '/api/public/volt/[id]',
    ],
    public: [
      '/volt-preview/[id]',
    ],
  },
  sidebarItems: [{
    parentId: 'volt',
    items: [
      { id: 'volt-vector', label: 'Vector Designs', icon: 'bi-vector-pen', href: '/admin/volt' },
      { id: 'volt-3d', label: '3D Assets', icon: 'bi-box', href: '/admin/volt-3d' },
    ],
  }],
  settingsTabs: [],
  prismaModels: ['VoltElement', 'VoltAsset', 'Volt3DAsset', 'Volt3DVersion'],
  dependencies: ['media'],
  coreMinVersion: '1.0.0',
  touchesFiles: [
    'lib/volt/volt-utils.ts',
    'lib/volt/volt-reducer.ts',
    'lib/volt/volt-defaults.ts',
    'lib/volt/personality-to-anime.ts',
    'lib/volt-3d-auth.ts',
    'lib/volt-3d-upload.ts',
    'components/sections/VoltBlock.tsx',
    'components/sections/Volt3DRenderer.tsx',
  ],
  touchesModels: ['VoltElement', 'VoltAsset', 'Volt3DAsset', 'Volt3DVersion'],
  touchesRoutes: ['/api/volt/**', '/api/volt-3d/**', '/api/public/volt/**'],
  tier: 'free',
  canDisable: true,
  defaultEnabled: true,
}

export const BRAND_TOKENS_MANIFEST: PluginManifest = {
  id: 'brand-tokens',
  name: 'Brand Tokens',
  description: 'Global colour, typography, and spacing tokens with automatic CSS variable injection',
  version: '1.0.0',
  author: 'CMS Core',
  icon: 'bi-brush',
  routes: {
    admin: [],
    api: [
      '/api/admin/brand-tokens',
    ],
    public: [],
  },
  sidebarItems: [],
  settingsTabs: [
    { id: 'brand', label: 'Brand', icon: 'bi-brush' },
  ],
  prismaModels: [],
  dependencies: ['settings'],
  coreMinVersion: '1.0.0',
  touchesFiles: [
    'lib/brand-tokens.ts',
    'components/admin/BrandTokenEditor.tsx',
  ],
  touchesModels: ['SystemSettings'],
  touchesRoutes: ['/api/admin/brand-tokens'],
  tier: 'free',
  canDisable: true,
  defaultEnabled: true,
}

export const SECTION_TEMPLATES_MANIFEST: PluginManifest = {
  id: 'section-templates',
  name: 'Section Templates',
  description: 'Pre-built section template gallery for quick section creation',
  version: '1.0.0',
  author: 'CMS Core',
  icon: 'bi-layout-text-window-reverse',
  routes: {
    admin: [],
    api: [],
    public: [],
  },
  sidebarItems: [],
  settingsTabs: [],
  prismaModels: [],
  dependencies: ['pages'],
  coreMinVersion: '1.0.0',
  touchesFiles: [
    'lib/section-templates/index.ts',
    'lib/layout-templates.ts',
  ],
  touchesModels: [],
  touchesRoutes: [],
  tier: 'free',
  canDisable: true,
  defaultEnabled: true,
}

export const FORM_INBOX_MANIFEST: PluginManifest = {
  id: 'form-inbox',
  name: 'Form Inbox',
  description: 'Form submissions viewer and management for contact forms and custom forms',
  version: '1.0.0',
  author: 'CMS Core',
  icon: 'bi-inbox',
  routes: {
    admin: [
      '/admin/forms',
    ],
    api: [
      '/api/admin/form-submissions',
      '/api/forms/submit',
    ],
    public: [],
  },
  sidebarItems: [{
    parentId: 'root',
    items: [
      { id: 'forms', label: 'Form Inbox', icon: 'bi-inbox', href: '/admin/forms' },
    ],
  }],
  settingsTabs: [],
  prismaModels: ['FormSubmission'],
  dependencies: ['pages'],
  coreMinVersion: '1.0.0',
  touchesFiles: [
    'app/admin/forms/page.tsx',
  ],
  touchesModels: ['FormSubmission'],
  touchesRoutes: ['/api/admin/form-submissions', '/api/forms/submit'],
  tier: 'free',
  canDisable: true,
  defaultEnabled: true,
}

export const ACTIVITY_LOG_MANIFEST: PluginManifest = {
  id: 'activity-log',
  name: 'Activity Log',
  description: 'Audit trail and activity log viewer for tracking admin actions',
  version: '1.0.0',
  author: 'CMS Core',
  icon: 'bi-clock-history',
  routes: {
    admin: [
      '/admin/activity',
    ],
    api: [
      '/api/admin/audit-logs',
    ],
    public: [],
  },
  sidebarItems: [{
    parentId: 'root',
    items: [
      { id: 'activity', label: 'Activity Log', icon: 'bi-clock-history', href: '/admin/activity' },
    ],
  }],
  settingsTabs: [],
  prismaModels: ['AuditLog'],
  dependencies: [],
  coreMinVersion: '1.0.0',
  touchesFiles: [
    'lib/audit-log.ts',
    'app/admin/activity/page.tsx',
  ],
  touchesModels: ['AuditLog'],
  touchesRoutes: ['/api/admin/audit-logs'],
  tier: 'free',
  canDisable: true,
  defaultEnabled: true,
}

export const REDIRECTS_MANIFEST: PluginManifest = {
  id: 'redirects',
  name: 'Redirects',
  description: '301/302 redirect management with hit tracking',
  version: '1.0.0',
  author: 'CMS Core',
  icon: 'bi-signpost-split',
  routes: {
    admin: [
      '/admin/redirects',
    ],
    api: [
      '/api/admin/redirects',
      '/api/redirects/check',
    ],
    public: [],
  },
  sidebarItems: [{
    parentId: 'root',
    items: [
      { id: 'redirects', label: 'Redirects', icon: 'bi-signpost-split', href: '/admin/redirects' },
    ],
  }],
  settingsTabs: [],
  prismaModels: ['Redirect'],
  dependencies: [],
  coreMinVersion: '1.0.0',
  touchesFiles: [
    'app/admin/redirects/page.tsx',
  ],
  touchesModels: ['Redirect'],
  touchesRoutes: ['/api/admin/redirects', '/api/redirects/check'],
  tier: 'free',
  canDisable: true,
  defaultEnabled: true,
}

export const CODE_INJECTION_MANIFEST: PluginManifest = {
  id: 'code-injection',
  name: 'Code Injection',
  description: 'Custom head and body script injection via SystemSettings (analytics, chat widgets, tracking pixels)',
  version: '1.0.0',
  author: 'CMS Core',
  icon: 'bi-code-slash',
  routes: {
    admin: [],
    api: [],
    public: [],
  },
  sidebarItems: [],
  settingsTabs: [],
  prismaModels: [],
  dependencies: ['settings'],
  coreMinVersion: '1.0.0',
  touchesFiles: [
    'app/layout.tsx',
  ],
  touchesModels: ['SystemSettings'],
  touchesRoutes: [],
  tier: 'free',
  canDisable: true,
  defaultEnabled: true,
}

// ── Optional Plugins (canDisable: true, defaultEnabled: false) ───────────────

export const CONCRETE_CALCULATOR_MANIFEST: PluginManifest = {
  id: 'concrete-calculator',
  name: 'Concrete Calculator',
  description: 'Concrete volume calculator with quote requests and reference number generation',
  version: '1.0.0',
  author: 'CMS Core',
  icon: 'bi-calculator',
  routes: {
    admin: [
      '/admin/features/concrete-settings',
    ],
    api: [
      '/api/calculator/quote-request',
      '/api/calculator/reserve-ref',
      '/api/settings/calculator',
    ],
    public: [
      '/calculator',
    ],
  },
  sidebarItems: [{
    parentId: 'features',
    items: [
      { id: 'concrete-settings', label: 'Concrete Calculator', icon: 'bi-calculator', href: '/admin/features/concrete-settings' },
    ],
  }],
  settingsTabs: [],
  prismaModels: [],
  dependencies: [],
  coreMinVersion: '1.0.0',
  touchesFiles: [
    'lib/concrete-calculator.ts',
    'app/calculator/page.tsx',
    'app/admin/features/concrete-settings/page.tsx',
  ],
  touchesModels: ['ClientFeature', 'SystemSettings'],
  touchesRoutes: ['/api/calculator/**', '/api/settings/calculator'],
  tier: 'pro',
  canDisable: true,
  defaultEnabled: false,
  sectionTypes: [
    { id: 'concrete-calculator', label: 'Concrete Calculator', icon: 'bi-calculator', description: 'Embeddable concrete volume calculator with quote generation' },
  ],
  pageTypes: [
    { id: 'calculator-page', label: 'Calculator Page', icon: 'bi-calculator', description: 'Standalone page with the concrete volume calculator' },
  ],
}

export const COVERAGE_MAPS_MANIFEST: PluginManifest = {
  id: 'coverage-maps',
  name: 'Coverage Maps',
  description: 'Interactive coverage maps with regions, labels, and polygon drawing',
  version: '1.0.0',
  author: 'CMS Core',
  icon: 'bi-map',
  routes: {
    admin: [
      '/admin/features/coverage-maps',
    ],
    api: [
      '/api/coverage-maps',
      '/api/coverage-maps/[id]',
      '/api/coverage-maps/[id]/regions',
      '/api/coverage-maps/[id]/regions/[regionId]',
      '/api/coverage-maps/[id]/labels',
      '/api/coverage-maps/[id]/labels/[labelId]',
      '/api/coverage-maps/[id]/public',
      '/api/coverage-maps/public',
    ],
    public: [
      '/coverage',
    ],
  },
  sidebarItems: [{
    parentId: 'features',
    items: [
      { id: 'coverage-maps', label: 'Coverage Maps', icon: 'bi-map', href: '/admin/features/coverage-maps' },
    ],
  }],
  settingsTabs: [],
  prismaModels: ['CoverageMap', 'CoverageRegion', 'CoverageLabel'],
  dependencies: [],
  coreMinVersion: '1.0.0',
  touchesFiles: [
    'app/admin/features/coverage-maps/page.tsx',
    'app/coverage/page.tsx',
  ],
  touchesModels: ['CoverageMap', 'CoverageRegion', 'CoverageLabel', 'ClientFeature'],
  touchesRoutes: ['/api/coverage-maps/**'],
  tier: 'pro',
  canDisable: true,
  defaultEnabled: false,
  sectionTypes: [
    { id: 'coverage-map', label: 'Coverage Map', icon: 'bi-map', description: 'Interactive map showing service areas with regions and labels' },
  ],
  pageTypes: [
    { id: 'coverage-page', label: 'Coverage Page', icon: 'bi-map', description: 'Standalone coverage area page with interactive map' },
  ],
}

export const PROJECTS_MANIFEST: PluginManifest = {
  id: 'projects',
  name: 'Projects',
  description: 'Project showcase gallery with image management and ordering',
  version: '1.0.0',
  author: 'CMS Core',
  icon: 'bi-building',
  routes: {
    admin: [
      '/admin/features/projects',
    ],
    api: [
      '/api/projects',
      '/api/projects/[id]',
    ],
    public: [],
  },
  sidebarItems: [{
    parentId: 'features',
    items: [
      { id: 'projects', label: 'Projects', icon: 'bi-building', href: '/admin/features/projects' },
    ],
  }],
  settingsTabs: [],
  prismaModels: ['Project'],
  dependencies: ['media'],
  coreMinVersion: '1.0.0',
  touchesFiles: [
    'app/admin/features/projects/page.tsx',
    'components/sections/ProjectsGallery.tsx',
  ],
  touchesModels: ['Project', 'ClientFeature'],
  touchesRoutes: ['/api/projects/**'],
  tier: 'pro',
  canDisable: true,
  defaultEnabled: false,
  sectionTypes: [
    { id: 'projects-showcase', label: 'Projects Showcase', icon: 'bi-building', description: 'Grid of project cards with image gallery and lightbox' },
  ],
  pageTypes: [
    { id: 'projects-page', label: 'Projects Page', icon: 'bi-building', description: 'Standalone page showcasing all projects' },
  ],
}

// ── Aggregate Export ─────────────────────────────────────────────────────────

export const BUILTIN_MANIFESTS: PluginManifest[] = [
  // Core
  PAGES_MANIFEST,
  AUTH_MANIFEST,
  MEDIA_MANIFEST,
  SETTINGS_MANIFEST,
  UPDATES_MANIFEST,
  // Standard
  CONTENT_TYPES_MANIFEST,
  VOLT_STUDIO_MANIFEST,
  BRAND_TOKENS_MANIFEST,
  SECTION_TEMPLATES_MANIFEST,
  FORM_INBOX_MANIFEST,
  ACTIVITY_LOG_MANIFEST,
  REDIRECTS_MANIFEST,
  CODE_INJECTION_MANIFEST,
  // Optional
  CONCRETE_CALCULATOR_MANIFEST,
  COVERAGE_MAPS_MANIFEST,
  PROJECTS_MANIFEST,
]
