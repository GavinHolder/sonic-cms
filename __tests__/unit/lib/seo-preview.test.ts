import { describe, it, expect } from 'vitest'
import {
  getTitleStatus,
  getDescStatus,
  statusClass,
  pixelWidth,
  truncateToWidth,
  TITLE_FONT,
  TITLE_MAX_PX,
} from '@/lib/seo-preview'

describe('getTitleStatus', () => {
  it('returns error for empty string', () => {
    expect(getTitleStatus('')).toBe('error')
  })
  it('returns good for 1 char', () => {
    expect(getTitleStatus('a')).toBe('good')
  })
  it('returns good for exactly 60 chars', () => {
    expect(getTitleStatus('a'.repeat(60))).toBe('good')
  })
  it('returns warning for 61 chars', () => {
    expect(getTitleStatus('a'.repeat(61))).toBe('warning')
  })
  it('returns warning for exactly 70 chars', () => {
    expect(getTitleStatus('a'.repeat(70))).toBe('warning')
  })
  it('returns error for 71 chars', () => {
    expect(getTitleStatus('a'.repeat(71))).toBe('error')
  })
})

describe('getDescStatus', () => {
  it('returns error for empty string', () => {
    expect(getDescStatus('')).toBe('error')
  })
  it('returns good for 1 char', () => {
    expect(getDescStatus('a')).toBe('good')
  })
  it('returns good for exactly 160 chars', () => {
    expect(getDescStatus('a'.repeat(160))).toBe('good')
  })
  it('returns warning for 161 chars', () => {
    expect(getDescStatus('a'.repeat(161))).toBe('warning')
  })
  it('returns warning for exactly 180 chars', () => {
    expect(getDescStatus('a'.repeat(180))).toBe('warning')
  })
  it('returns error for 181 chars', () => {
    expect(getDescStatus('a'.repeat(181))).toBe('error')
  })
})

describe('statusClass', () => {
  it('maps good to text-success', () => {
    expect(statusClass('good')).toBe('text-success')
  })
  it('maps warning to text-warning', () => {
    expect(statusClass('warning')).toBe('text-warning')
  })
  it('maps error to text-danger', () => {
    expect(statusClass('error')).toBe('text-danger')
  })
})

describe('pixelWidth (SSR fallback in node)', () => {
  it('returns char-count * 8 when no canvas available', () => {
    expect(pixelWidth('hello', TITLE_FONT)).toBe(5 * 8)
  })
  it('returns 0 for empty string', () => {
    expect(pixelWidth('', TITLE_FONT)).toBe(0)
  })
  it('handles long strings in SSR fallback', () => {
    const longStr = 'a'.repeat(100)
    expect(pixelWidth(longStr, TITLE_FONT)).toBe(100 * 8)
  })
})

describe('truncateToWidth (SSR fallback in node)', () => {
  it('returns text unchanged when it fits within maxPx', () => {
    // 'hi' = 2 chars * 8 = 16px — well under 600
    expect(truncateToWidth('hi', TITLE_MAX_PX, TITLE_FONT)).toEqual({
      display: 'hi',
      truncated: false,
    })
  })
  it('truncates with ellipsis when text overflows', () => {
    // maxPx=40 => Math.floor(40/8)-1 = 4 chars
    const result = truncateToWidth('abcdefghij', 40, TITLE_FONT)
    expect(result.truncated).toBe(true)
    expect(result.display).toBe('abcd…')
  })
  it('preserves at least 1 char even at tiny maxPx', () => {
    // Math.max(1, Math.floor(1/8)-1) = Math.max(1, 0-1) = 1 char
    const result = truncateToWidth('abc', 1, TITLE_FONT)
    expect(result.truncated).toBe(true)
    expect(result.display.length).toBeGreaterThanOrEqual(2) // at least 1 char + ellipsis
  })
  it('handles text at exactly fitting boundary', () => {
    // 50 chars * 8 = 400px, exactly at boundary
    const text = 'a'.repeat(50)
    const result = truncateToWidth(text, 400, TITLE_FONT)
    expect(result.truncated).toBe(false)
    expect(result.display).toBe(text)
  })
  it('truncates text just over the boundary', () => {
    // 51 chars * 8 = 408px, just over 400px
    const text = 'a'.repeat(51)
    const result = truncateToWidth(text, 400, TITLE_FONT)
    expect(result.truncated).toBe(true)
    expect(result.display).toContain('…')
  })
})
