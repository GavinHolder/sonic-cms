/**
 * Fix Hero Section Structure
 *
 * Updates the hero section in the database to match the correct HeroSection type
 * with proper content.slides structure instead of the old items structure.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixHeroSection() {
  console.log('🔧 Fixing hero section structure...\n');

  try {
    // Find the home page
    const homePage = await prisma.page.findUnique({
      where: { slug: '/' },
    });

    if (!homePage) {
      console.log('❌ Home page not found. Creating it first...');
      // You may need to create the page first if it doesn't exist
      return;
    }

    console.log(`✅ Found home page (ID: ${homePage.id})`);

    // Find the hero section
    const heroSection = await prisma.section.findFirst({
      where: {
        pageId: homePage.id,
        type: 'HERO',
      },
    });

    if (!heroSection) {
      console.log('❌ Hero section not found. Creating new one...');

      // Create new hero section with correct structure
      // Find admin user to use as creator
      const adminUser = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
      const newHero = await prisma.section.create({
        data: {
          pageId: homePage.id,
          type: 'HERO',
          displayName: 'Hero Carousel',
          enabled: true,
          order: 0,
          background: 'transparent',
          paddingTop: 0,
          paddingBottom: 0,
          createdBy: adminUser?.id || 'system',
          content: {
            slides: [
              {
                id: '1',
                type: 'image',
                src: '/images/placeholder-hero.jpg',
                overlay: {
                  heading: {
                    text: 'Fast, Reliable Internet',
                    fontSize: 56,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    color: '#ffffff',
                    animation: 'slideUp',
                    animationDuration: 800,
                    animationDelay: 200,
                  },
                  subheading: {
                    text: 'Across the Your Region Region',
                    fontSize: 24,
                    fontWeight: 400,
                    fontFamily: 'inherit',
                    color: '#ffffff',
                    animation: 'slideUp',
                    animationDuration: 800,
                    animationDelay: 400,
                  },
                  buttons: [
                    {
                      text: 'Check Coverage',
                      href: '/coverage',
                      backgroundColor: '#2563eb',
                      textColor: '#ffffff',
                      variant: 'filled',
                      animation: 'slideUp',
                      animationDuration: 800,
                      animationDelay: 600,
                    },
                  ],
                  position: 'center',
                  spacing: {
                    betweenHeadingSubheading: 16,
                    betweenSubheadingButtons: 32,
                    betweenButtons: 16,
                  },
                  overlayOffset: {
                    top: 100,
                    right: 0,
                    bottom: 0,
                    left: 0,
                  },
                },
                gradient: {
                  enabled: true,
                  type: 'preset',
                  preset: {
                    direction: 'bottom',
                    startOpacity: 70,
                    endOpacity: 0,
                    color: '#000000',
                  },
                },
              },
              {
                id: '2',
                type: 'image',
                src: '/images/placeholder-support.jpg',
                overlay: {
                  heading: {
                    text: 'Locally Supported',
                    fontSize: 56,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    color: '#ffffff',
                    animation: 'fadeIn',
                    animationDuration: 800,
                    animationDelay: 200,
                  },
                  subheading: {
                    text: 'Real people, real solutions',
                    fontSize: 24,
                    fontWeight: 400,
                    fontFamily: 'inherit',
                    color: '#ffffff',
                    animation: 'fadeIn',
                    animationDuration: 800,
                    animationDelay: 400,
                  },
                  buttons: [
                    {
                      text: 'Contact Support',
                      href: '/support',
                      backgroundColor: '#2563eb',
                      textColor: '#ffffff',
                      variant: 'filled',
                      animation: 'fadeIn',
                      animationDuration: 800,
                      animationDelay: 600,
                    },
                  ],
                  position: 'center',
                  spacing: {
                    betweenHeadingSubheading: 16,
                    betweenSubheadingButtons: 32,
                    betweenButtons: 16,
                  },
                  overlayOffset: {
                    top: 100,
                    right: 0,
                    bottom: 0,
                    left: 0,
                  },
                },
                gradient: {
                  enabled: true,
                  type: 'preset',
                  preset: {
                    direction: 'bottom',
                    startOpacity: 70,
                    endOpacity: 0,
                    color: '#000000',
                  },
                },
              },
            ],
            autoPlay: true,
            autoPlayInterval: 5000,
            showDots: true,
            showArrows: true,
            transitionDuration: 800,
          },
        },
      });

      console.log(`✅ Created new hero section (ID: ${newHero.id})`);
    } else {
      console.log(`✅ Found existing hero section (ID: ${heroSection.id})`);
      console.log(`   Current type: ${heroSection.type}`);

      // Update existing hero section
      const updated = await prisma.section.update({
        where: { id: heroSection.id },
        data: {
          type: 'HERO',
          displayName: 'Hero Carousel',
          background: 'transparent',
          paddingTop: 0,
          paddingBottom: 0,
          order: 0,
          content: {
            slides: [
              {
                id: '1',
                type: 'image',
                src: '/images/placeholder-hero.jpg',
                overlay: {
                  heading: {
                    text: 'Fast, Reliable Internet',
                    fontSize: 56,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    color: '#ffffff',
                    animation: 'slideUp',
                    animationDuration: 800,
                    animationDelay: 200,
                  },
                  subheading: {
                    text: 'Across the Your Region Region',
                    fontSize: 24,
                    fontWeight: 400,
                    fontFamily: 'inherit',
                    color: '#ffffff',
                    animation: 'slideUp',
                    animationDuration: 800,
                    animationDelay: 400,
                  },
                  buttons: [
                    {
                      text: 'Check Coverage',
                      href: '/coverage',
                      backgroundColor: '#2563eb',
                      textColor: '#ffffff',
                      variant: 'filled',
                      animation: 'slideUp',
                      animationDuration: 800,
                      animationDelay: 600,
                    },
                  ],
                  position: 'center',
                  spacing: {
                    betweenHeadingSubheading: 16,
                    betweenSubheadingButtons: 32,
                    betweenButtons: 16,
                  },
                  overlayOffset: {
                    top: 100,
                    right: 0,
                    bottom: 0,
                    left: 0,
                  },
                },
                gradient: {
                  enabled: true,
                  type: 'preset',
                  preset: {
                    direction: 'bottom',
                    startOpacity: 70,
                    endOpacity: 0,
                    color: '#000000',
                  },
                },
              },
              {
                id: '2',
                type: 'image',
                src: '/images/placeholder-support.jpg',
                overlay: {
                  heading: {
                    text: 'Locally Supported',
                    fontSize: 56,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    color: '#ffffff',
                    animation: 'fadeIn',
                    animationDuration: 800,
                    animationDelay: 200,
                  },
                  subheading: {
                    text: 'Real people, real solutions',
                    fontSize: 24,
                    fontWeight: 400,
                    fontFamily: 'inherit',
                    color: '#ffffff',
                    animation: 'fadeIn',
                    animationDuration: 800,
                    animationDelay: 400,
                  },
                  buttons: [
                    {
                      text: 'Contact Support',
                      href: '/support',
                      backgroundColor: '#2563eb',
                      textColor: '#ffffff',
                      variant: 'filled',
                      animation: 'fadeIn',
                      animationDuration: 800,
                      animationDelay: 600,
                    },
                  ],
                  position: 'center',
                  spacing: {
                    betweenHeadingSubheading: 16,
                    betweenSubheadingButtons: 32,
                    betweenButtons: 16,
                  },
                  overlayOffset: {
                    top: 100,
                    right: 0,
                    bottom: 0,
                    left: 0,
                  },
                },
                gradient: {
                  enabled: true,
                  type: 'preset',
                  preset: {
                    direction: 'bottom',
                    startOpacity: 70,
                    endOpacity: 0,
                    color: '#000000',
                  },
                },
              },
            ],
            autoPlay: true,
            autoPlayInterval: 5000,
            showDots: true,
            showArrows: true,
            transitionDuration: 800,
          },
        },
      });

      console.log(`✅ Updated hero section to correct structure`);
    }

    console.log('\n✨ Hero section fix complete!');

  } catch (error) {
    console.error('❌ Error fixing hero section:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixHeroSection();
