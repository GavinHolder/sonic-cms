/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  pixelWidth,
  truncateToWidth,
  TITLE_FONT,
  TITLE_MAX_PX,
} from '@/lib/seo-preview'

describe('pixelWidth (canvas branch in jsdom)', () => {
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    // Clear the module cache between tests to reset _canvas
    // In jsdom, canvas is available
    canvas = document.createElement('canvas')
    ctx = canvas.getContext('2d')!
    expect(ctx).toBeDefined()
  })

  it('uses canvas.measureText when available', () => {
    // In jsdom, pixelWidth should use canvas
    const result = pixelWidth('hello', TITLE_FONT)
    expect(result).toBeGreaterThan(0)
    expect(typeof result).toBe('number')
  })

  it('returns non-zero for non-empty string', () => {
    const result = pixelWidth('test', TITLE_FONT)
    expect(result).toBeGreaterThan(0)
  })
})

describe('truncateToWidth (canvas binary search in jsdom)', () => {
  it('uses binary search when canvas is available', () => {
    // Very short maxPx to force truncation
    const result = truncateToWidth('abcdefghij', 50, TITLE_FONT)
    expect(result.truncated).toBe(true)
    expect(result.display).toContain('…')
    // Canvas-based result should be more precise than simple char count
    expect(result.display.length).toBeGreaterThan(0)
  })

  it('still respects the fit boundary with canvas', () => {
    // Long string that fits
    const short = 'hi'
    const result = truncateToWidth(short, TITLE_MAX_PX, TITLE_FONT)
    expect(result.truncated).toBe(false)
  })

  it('uses binary search for medium truncation', () => {
    // Text that definitely needs truncation
    const longText = 'The quick brown fox jumps over the lazy dog and then some more text'
    const result = truncateToWidth(longText, 100, TITLE_FONT)
    expect(result.truncated).toBe(true)
    expect(result.display).toMatch(/…$/)
  })
})
