/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readHeroFrameMeasure } from '@/components/admin/hero/useHeroFrameMeasure'

// jsdom has no layout engine: every rect / client size is 0 unless stubbed. These tests pin
// down how the measurer turns the (stubbed) real-hero DOM into the layer + item rects.
interface Box {
  left: number
  top: number
  width: number
  height: number
}

interface ClientSizes {
  clientWidth: number
  clientHeight: number
  offsetWidth: number
  offsetHeight: number
  clientLeft?: number
  clientTop?: number
}

function stubRect(el: Element, b: Box) {
  ;(el as HTMLElement).getBoundingClientRect = () =>
    ({ ...b, x: b.left, y: b.top, right: b.left + b.width, bottom: b.top + b.height, toJSON: () => ({}) }) as DOMRect
}

function stubClient(el: Element, v: ClientSizes) {
  for (const [k, val] of Object.entries({ clientLeft: 0, clientTop: 0, ...v })) {
    Object.defineProperty(el, k, { value: val, configurable: true })
  }
}

let root: HTMLElement

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>'
  root = document.getElementById('root') as HTMLElement
})

function addLayer(box: Box, client?: Partial<ClientSizes>): HTMLElement {
  const layer = document.createElement('div')
  layer.setAttribute('data-ff-layer', '')
  root.appendChild(layer)
  stubRect(layer, box)
  stubClient(layer, { clientWidth: box.width, clientHeight: box.height, offsetWidth: box.width, offsetHeight: box.height, ...client })
  return layer
}

function addItem(layer: HTMLElement, id: string, style: string, box: Box): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('data-ff-id', id)
  el.setAttribute('style', style)
  layer.appendChild(el)
  stubRect(el, box)
  return el
}

describe('readHeroFrameMeasure', () => {
  it('reports ready with no layer when the hero has no freeform layer', () => {
    expect(readHeroFrameMeasure(root)).toEqual({ ready: true, layer: null, items: {} })
  })

  it('layer = the measured padding box (tablet 768x1024 under a 100px navbar offset)', () => {
    addLayer({ left: 0, top: 100, width: 768, height: 1024 })
    expect(readHeroFrameMeasure(root).layer).toEqual({ x: 0, y: 100, w: 768, h: 1024 })
  })

  it('subtracts a scrollbar (offset - client) so % resolves against the scrollport, not the border box', () => {
    // mobile stack layer with a 15px vertical scrollbar
    addLayer({ left: 0, top: 100, width: 375, height: 812 }, { clientWidth: 360, offsetWidth: 375 })
    expect(readHeroFrameMeasure(root).layer).toEqual({ x: 0, y: 100, w: 360, h: 812 })
  })

  it('adds clientLeft/clientTop (borders) to the origin', () => {
    addLayer(
      { left: 10, top: 20, width: 102, height: 202 },
      { clientLeft: 1, clientTop: 2, clientWidth: 100, clientHeight: 198, offsetWidth: 102, offsetHeight: 202 }
    )
    expect(readHeroFrameMeasure(root).layer).toEqual({ x: 11, y: 22, w: 100, h: 198 })
  })

  it('an unusable (zero-size) layer is treated as no layer', () => {
    addLayer({ left: 0, top: 0, width: 0, height: 0 })
    expect(readHeroFrameMeasure(root)).toEqual({ ready: true, layer: null, items: {} })
  })

  it('an absolutely positioned wrapper is measured as itself (not stacked)', () => {
    const layer = addLayer({ left: 0, top: 100, width: 768, height: 1024 })
    addItem(layer, 'row-0', 'position:absolute', { left: 234, top: 306, width: 300, height: 58 })
    expect(readHeroFrameMeasure(root).items['row-0']).toEqual({ rect: { x: 234, y: 306, w: 300, h: 58 }, stacked: false })
  })

  it('a mobile auto-stack wrapper (position: relative, full-width flex row) is measured by its FIRST CHILD, flagged stacked', () => {
    const layer = addLayer({ left: 0, top: 100, width: 375, height: 812 })
    const wrapper = addItem(layer, 'btn-0', 'position:relative', { left: 20, top: 400, width: 335, height: 48 })
    const child = document.createElement('a')
    wrapper.appendChild(child)
    stubRect(child, { left: 97, top: 400, width: 180, height: 48 })
    expect(readHeroFrameMeasure(root).items['btn-0']).toEqual({ rect: { x: 97, y: 400, w: 180, h: 48 }, stacked: true })
  })

  it('a stacked wrapper with no child falls back to its own rect', () => {
    const layer = addLayer({ left: 0, top: 100, width: 375, height: 812 })
    addItem(layer, 'img-0', 'position:relative', { left: 20, top: 500, width: 335, height: 9 })
    expect(readHeroFrameMeasure(root).items['img-0']).toEqual({ rect: { x: 20, y: 500, w: 335, h: 9 }, stacked: true })
  })

  it('omits zero-size elements (no measured handle) and elements without an id', () => {
    const layer = addLayer({ left: 0, top: 100, width: 768, height: 1024 })
    addItem(layer, 'img-0', 'position:absolute', { left: 100, top: 100, width: 0, height: 0 })
    addItem(layer, '', 'position:absolute', { left: 100, top: 100, width: 50, height: 50 })
    addItem(layer, 'heading', 'position:absolute', { left: 100, top: 100, width: 50, height: 50 })
    expect(Object.keys(readHeroFrameMeasure(root).items)).toEqual(['heading'])
  })
})
