import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  console.log('Creating admin user...');
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@yourcompany.co.za',
      passwordHash: await hashPassword('admin2026'),
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`✅ Admin: ${admin.username}`);

  // Create landing page
  const landingPage = await prisma.page.upsert({
    where: { slug: '/' },
    update: {},
    create: {
      slug: '/',
      title: 'Home',
      type: 'LANDING',
      status: 'PUBLISHED',
      createdBy: admin.id,
      publishedAt: new Date(),
    },
  });
  console.log(`✅ Page: ${landingPage.title}`);

  // Delete existing sections
  await prisma.section.deleteMany({ where: { pageId: landingPage.id } });

  let order = 0;

  // ============================================
  // HERO SECTION - Full-screen carousel
  // ============================================
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'HERO',
      enabled: true,
      order: order++,
      displayName: 'Hero Carousel',
      paddingTop: 0,
      paddingBottom: 0,
      background: 'transparent',
      content: {
        slides: [
          {
            id: 'slide-1',
            type: 'color',
            src: '',
            gradient: {
              enabled: true,
              type: 'preset',
              preset: { direction: 'bottom', startOpacity: 80, endOpacity: 20, color: '#1e3a8a' }
            },
            overlay: {
              heading: {
                text: 'Welcome to Your Company',
                fontSize: 64,
                fontWeight: 800,
                color: '#ffffff',
                animation: 'slideUp',
                animationDuration: 800,
                animationDelay: 200
              },
              subheading: {
                text: 'Your tagline goes here — clear, compelling, customer-focused',
                fontSize: 28,
                fontWeight: 400,
                color: '#ffffff',
                animation: 'slideUp',
                animationDuration: 800,
                animationDelay: 400
              },
              buttons: [
                {
                  text: 'Get Started',
                  href: '#about',
                  backgroundColor: '#2563eb',
                  textColor: '#ffffff',
                  variant: 'filled',
                  animation: 'slideUp',
                  animationDelay: 600
                },
                {
                  text: 'Learn More',
                  href: '#services',
                  backgroundColor: 'transparent',
                  textColor: '#ffffff',
                  variant: 'outline',
                  animation: 'slideUp',
                  animationDelay: 700
                }
              ],
              position: 'center',
              spacing: { betweenHeadingSubheading: 20, betweenSubheadingButtons: 40, betweenButtons: 16 }
            }
          }
        ],
        autoPlay: true,
        autoPlayInterval: 6000,
        showDots: true,
        showArrows: true,
        transitionDuration: 800
      },
      createdBy: admin.id,
    },
  });

  // ============================================
  // ABOUT SECTION
  // ============================================
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'NORMAL',
      enabled: true,
      order: order++,
      displayName: 'About Us',
      navLabel: 'About',
      paddingTop: 100,
      paddingBottom: 100,
      background: 'white',
      content: {
        heading: 'About Your Company',
        subheading: 'A short, punchy description of what you do',
        body: `
          <div class="text-center">
            <p class="lead fs-3 fw-light text-muted mb-4">
              Replace this with your company's mission statement.
            </p>
            <p class="fs-5 mb-4">
              Tell your story here. Who are you? What do you offer? Why should customers choose you?
              This is your opportunity to connect with visitors and build trust.
            </p>
            <p class="fs-5 text-primary fw-semibold">
              Edit this section in the admin panel to reflect your brand.
            </p>
          </div>
        `,
        layout: 'text-only',
        layoutPreset: 'centered'
      },
      createdBy: admin.id,
    },
  });

  // ============================================
  // CTA SECTION
  // ============================================
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'CTA',
      enabled: true,
      order: order++,
      displayName: 'CTA: Get In Touch',
      paddingTop: 60,
      paddingBottom: 60,
      background: 'blue',
      content: {
        heading: 'Ready to Work With Us?',
        subheading: 'Contact us today to discuss your requirements',
        buttons: [
          { text: 'Contact Us', href: '#contact', variant: 'light' },
          { text: 'View Services', href: '#services', variant: 'outline-light' }
        ],
        style: 'banner'
      },
      createdBy: admin.id,
    },
  });

  // ============================================
  // FOOTER SECTION
  // ============================================
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'FOOTER',
      enabled: true,
      order: 999999,
      displayName: 'Footer',
      paddingTop: 60,
      paddingBottom: 40,
      background: 'gray',
      content: {
        logo: '',
        tagline: 'Your Company — replace this tagline',
        companyInfo: {
          name: 'Your Company',
          address: '123 Main Road, City, 0000',
          phone: '+27 00 000 0000',
          email: 'info@yourcompany.co.za',
          position: 'top-left'
        },
        columns: [
          {
            id: 'col-1',
            title: 'Company',
            links: [
              { text: 'About Us', href: '/about' },
              { text: 'Services', href: '/services' },
              { text: 'Contact', href: '/contact' }
            ]
          },
          {
            id: 'col-2',
            title: 'Legal',
            links: [
              { text: 'Terms of Service', href: '/terms' },
              { text: 'Privacy Policy', href: '/privacy' },
              { text: 'Regulatory / Compliance', href: '/regulatory' }
            ]
          }
        ],
        copyright: '© 2026 Your Company (Pty) Ltd. All rights reserved.',
        socialLinks: [
          { platform: 'facebook', url: 'https://facebook.com/yourcompany', icon: 'bi-facebook' },
          { platform: 'instagram', url: 'https://instagram.com/yourcompany', icon: 'bi-instagram' }
        ]
      },
      createdBy: admin.id,
    },
  });

  console.log(`✅ Created ${order + 1} sections`);
  console.log('🎉 Seed complete!');
  console.log('\n🔐 Login Credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin2026');
  console.log('   URL: http://localhost:3000/admin/login');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
