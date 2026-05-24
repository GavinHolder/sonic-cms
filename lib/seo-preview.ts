export type StatusLevel = 'good' | 'warning' | 'error'

export function getTitleStatus(title: string): StatusLevel {
  const len = title.length
  if (len === 0 || len > 70) return 'error'
  if (len > 60) return 'warning'
  return 'good'
}

export function getDescStatus(desc: string): StatusLevel {
  const len = desc.length
  if (len === 0 || len > 180) return 'error'
  if (len > 160) return 'warning'
  return 'good'
}

export function statusClass(status: StatusLevel): string {
  if (status === 'good') return 'text-success'
  if (status === 'warning') return 'text-warning'
  return 'text-danger'
}

// Canvas-based pixel width — browser only, SSR falls back to char * 8
let _canvas: HTMLCanvasElement | null = null

function getCtx(): CanvasRenderingContext2D | null {
  if (typeof window === 'undefined') return null
  if (!_canvas) _canvas = document.createElement('canvas')
  return _canvas.getContext('2d')
}

export function pixelWidth(text: string, font: string): number {
  const c = getCtx()
  if (!c) return text.length * 8
  c.font = font
  return c.measureText(text).width
}

// Binary search truncation to fit text within maxPx
export function truncateToWidth(
  text: string,
  maxPx: number,
  font: string,
): { display: string; truncated: boolean } {
  if (pixelWidth(text, font) <= maxPx) return { display: text, truncated: false }

  const c = getCtx()
  if (!c) {
    const chars = Math.max(1, Math.floor(maxPx / 8) - 1)
    return { display: text.slice(0, chars) + '…', truncated: true }
  }

  c.font = font
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (c.measureText(text.slice(0, mid) + '…').width <= maxPx) lo = mid
    else hi = mid - 1
  }
  // lo=0 means even a single char + ellipsis exceeded maxPx — returns bare '…'
  return { display: text.slice(0, lo) + '…', truncated: true }
}

export const TITLE_FONT = '20px arial, sans-serif'
export const DESC_FONT = '14px arial, sans-serif'
export const TITLE_MAX_PX = 600
export const DESC_MAX_PX = 920
