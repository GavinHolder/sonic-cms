'use client'

/**
 * /test-volt — Visual verification page for VoltRenderer features.
 *
 * Tests:
 * 1. Overflow card  — canvasOverflow: 'visible', bleed image layer
 * 2. Carousel card  — carousel with 3 slides, slot overrides, arrows + dots
 *
 * Uses VoltRenderer directly (no API) so it works without saved DB records.
 * No auth required.
 */

import dynamic from 'next/dynamic'
import type { VoltElementData, VoltLayer, VoltLayerAnimation } from '@/types/volt'

const VoltRenderer = dynamic(() => import('@/components/volt/VoltRenderer'), { ssr: false })

// ── Shared defaults ──────────────────────────────────────────────────────────

const DEFAULT_ANIM: VoltLayerAnimation = {
  character: 50,
  speed: 40,
  style: 60,
  delay: 0,
  animates: { opacity: true, scale: false, position: false, rotation: false, fill: false },
}

const BASE_LAYER: Omit<VoltLayer, 'id' | 'name' | 'type' | 'role' | 'x' | 'y' | 'width' | 'height'> = {
  rotation: 0,
  zIndex: 1,
  visible: true,
  locked: false,
  opacity: 1,
  blendMode: 'normal',
  animation: DEFAULT_ANIM,
}

// ── Overflow Card (400×300) ───────────────────────────────────────────────────

const overflowElement: VoltElementData = {
  id: 'test-overflow',
  name: 'Overflow Test Card',
  description: 'Tests canvasOverflow visible + bleed image layer',
  mood: 'bold',
  elementType: 'custom',
  isPublic: false,
  authorId: 'test',
  thumbnail: null,
  canvasWidth: 400,
  canvasHeight: 300,
  has3D: false,
  tags: [],
  isPaid: false,
  downloads: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  canvasBackground: '#1a1a2e',
  canvasOverflow: 'visible',
  states: [
    {
      id: 'state-rest',
      name: 'rest',
      trigger: 'mouseleave',
      layerOverrides: {},
    },
    {
      id: 'state-hover',
      name: 'hover',
      trigger: 'mouseenter',
      layerOverrides: {},
    },
  ],
  layers: [
    // Background vector (dark navy fill)
    {
      ...BASE_LAYER,
      id: 'bg',
      name: 'Background',
      type: 'vector',
      role: 'background',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      zIndex: 0,
      vectorData: {
        pathData: 'M 0 0 L 100 0 L 100 100 L 0 100 Z',
        fills: [
          {
            id: 'fill-bg',
            type: 'solid',
            color: '#16213e',
            opacity: 1,
            blendMode: 'normal',
          },
        ],
        closed: true,
      },
    },
    // Bleed image — positioned outside left edge
    {
      ...BASE_LAYER,
      id: 'img',
      name: 'Bleed Photo',
      type: 'image',
      role: 'structure',
      x: -10,
      y: -25,
      width: 55,
      height: 75,
      rotation: -8,
      zIndex: 2,
      bleed: true,
      imageData: {
        url: 'https://picsum.photos/seed/volt1/220/225',
        alt: 'Product photo',
        mode: 'fill',
        opacity: 1,
      },
    },
    // Product name text
    {
      ...BASE_LAYER,
      id: 'txt-name',
      name: 'Product Name',
      type: 'text',
      role: 'content',
      x: 46,
      y: 12,
      width: 50,
      height: 20,
      zIndex: 3,
      textLayerData: {
        content: 'PRODUCT NAME',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 26,
        fontWeight: 700,
        fontStyle: 'normal',
        color: '#ffffff',
        textAlign: 'left',
        verticalAlign: 'top',
        lineHeight: 1.2,
        letterSpacing: 2,
        textTransform: 'uppercase',
        wordWrap: true,
      },
    },
    // Price text
    {
      ...BASE_LAYER,
      id: 'txt-price',
      name: 'Price',
      type: 'text',
      role: 'content',
      x: 46,
      y: 36,
      width: 45,
      height: 15,
      zIndex: 3,
      textLayerData: {
        content: '$1,299.99',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 20,
        fontWeight: 700,
        fontStyle: 'normal',
        color: '#818cf8',
        textAlign: 'left',
        verticalAlign: 'top',
        lineHeight: 1.2,
        letterSpacing: 0,
        textTransform: 'none',
        wordWrap: false,
      },
    },
  ],
}

// ── Carousel Card (400×280) ──────────────────────────────────────────────────

const carouselElement: VoltElementData = {
  id: 'test-carousel',
  name: 'Carousel Test Card',
  description: 'Tests carousel with 3 slides and slot overrides',
  mood: 'minimal',
  elementType: 'custom',
  isPublic: false,
  authorId: 'test',
  thumbnail: null,
  canvasWidth: 400,
  canvasHeight: 280,
  has3D: false,
  tags: [],
  isPaid: false,
  downloads: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  canvasBackground: '#1e1b4b',
  states: [
    {
      id: 'state-rest',
      name: 'rest',
      trigger: 'mouseleave',
      layerOverrides: {},
    },
    {
      id: 'state-hover',
      name: 'hover',
      trigger: 'mouseenter',
      layerOverrides: {},
    },
  ],
  carousel: {
    enabled: true,
    transition: 'fade',
    duration: 400,
    ease: 'easeInOutCubic',
    autoPlay: false,
    autoInterval: 3000,
    showArrows: true,
    showDots: true,
    arrowStyle: 'rounded',
    slides: [
      {
        id: 'slide1',
        name: 'Stormtrooper',
        slotOverrides: {
          'slot-title': 'Stormtrooper Helmet',
          'slot-price': '$1,299.99',
          'slot-badge': 'NEW',
        },
      },
      {
        id: 'slide2',
        name: 'Darth Vader',
        slotOverrides: {
          'slot-title': 'Darth Vader Mask',
          'slot-price': '$2,499.99',
          'slot-badge': 'SALE',
        },
      },
      {
        id: 'slide3',
        name: 'Mandalorian',
        slotOverrides: {
          'slot-title': 'Mandalorian Armor',
          'slot-price': '$899.99',
          'slot-badge': 'HOT',
        },
      },
    ],
  },
  layers: [
    // Background vector
    {
      ...BASE_LAYER,
      id: 'bg2',
      name: 'Background',
      type: 'vector',
      role: 'background',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      zIndex: 0,
      vectorData: {
        pathData: 'M 0 0 L 100 0 L 100 100 L 0 100 Z',
        fills: [
          {
            id: 'fill-bg2',
            type: 'solid',
            color: '#1e1b4b',
            opacity: 1,
            blendMode: 'normal',
          },
        ],
        closed: true,
      },
    },
    // Title slot
    {
      ...BASE_LAYER,
      id: 'slot-title',
      name: 'Title Slot',
      type: 'slot',
      role: 'content',
      x: 8,
      y: 12,
      width: 75,
      height: 20,
      zIndex: 2,
      slotData: {
        slotType: 'title',
        slotLabel: 'Title',
        contentFieldHint: 'Product name',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '20px',
        fontWeight: 700,
        color: '#ffffff',
        textAlign: 'left',
      },
    },
    // Price slot (body type)
    {
      ...BASE_LAYER,
      id: 'slot-price',
      name: 'Price Slot',
      type: 'slot',
      role: 'content',
      x: 8,
      y: 38,
      width: 55,
      height: 16,
      zIndex: 2,
      slotData: {
        slotType: 'body',
        slotLabel: 'Price',
        contentFieldHint: 'Product price',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '26px',
        fontWeight: 800,
        color: '#818cf8',
        textAlign: 'left',
      },
    },
    // Badge slot
    {
      ...BASE_LAYER,
      id: 'slot-badge',
      name: 'Badge Slot',
      type: 'slot',
      role: 'accent',
      x: 75,
      y: 12,
      width: 17,
      height: 10,
      zIndex: 3,
      slotData: {
        slotType: 'badge',
        slotLabel: 'Badge',
        contentFieldHint: 'Badge text',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '12px',
        fontWeight: 700,
        color: '#f59e0b',
        textAlign: 'center',
      },
    },
  ],
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TestVoltPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#ffffff',
      }}
    >
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', opacity: 0.9 }}>
        Volt Renderer — Visual Test
      </h1>
      <p style={{ fontSize: '0.8rem', opacity: 0.4, marginBottom: '48px' }}>
        Tests: overflow + bleed image layer | carousel with slot overrides
      </p>

      <div
        style={{
          display: 'flex',
          gap: '60px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: 900,
        }}
      >
        {/* Overflow card */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.75rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Overflow + Bleed Image
          </span>
          <div style={{ width: 400, height: 300 }}>
            <VoltRenderer voltElement={overflowElement} />
          </div>
        </div>

        {/* Carousel card */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.75rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Carousel (3 slides — use arrows)
          </span>
          <div style={{ width: 400, height: 280 }}>
            <VoltRenderer voltElement={carouselElement} />
          </div>
        </div>
      </div>
    </div>
  )
}
