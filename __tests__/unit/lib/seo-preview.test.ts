import { describe, it, expect } from 'vitest'
import {
  getTitleStatus,
  getDescStatus,
  statusClass,
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
