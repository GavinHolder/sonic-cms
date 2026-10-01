import { describe, it, expect } from 'vitest'
import { isReflowBackdropVolt, partitionReflowBlocks } from '@/lib/flexible/reflow-backdrop'

describe('isReflowBackdropVolt', () => {
  it('true for a volt block with reflowBackdrop:true and a voltId', () => {
    expect(isReflowBackdropVolt({ type: 'volt', props: { reflowBackdrop: true, voltId: 'v1' } })).toBe(true)
  })

  it('false when reflowBackdrop is unset (ordinary volt block, untouched)', () => {
    expect(isReflowBackdropVolt({ type: 'volt', props: { voltId: 'v1' } })).toBe(false)
  })

  it('false when reflowBackdrop is explicitly false', () => {
    expect(isReflowBackdropVolt({ type: 'volt', props: { reflowBackdrop: false, voltId: 'v1' } })).toBe(false)
  })

  it('false without a voltId — fails safe to a normal (placeholder-showing) leaf instead of vanishing', () => {
    expect(isReflowBackdropVolt({ type: 'volt', props: { reflowBackdrop: true } })).toBe(false)
  })

  it('false for a non-volt block even if reflowBackdrop/voltId are somehow set', () => {
    expect(isReflowBackdropVolt({ type: 'text', props: { reflowBackdrop: true, voltId: 'v1' } })).toBe(false)
  })

  it('false for null/undefined input', () => {
    expect(isReflowBackdropVolt(null)).toBe(false)
    expect(isReflowBackdropVolt(undefined)).toBe(false)
  })

  it('false when props is missing entirely', () => {
    expect(isReflowBackdropVolt({ type: 'volt' })).toBe(false)
  })
})

describe('partitionReflowBlocks', () => {
  it('splits flagged volt blocks into backdropBlocks, everything else into leafBlocks, preserving order', () => {
    const heading = { id: 1, type: 'text', props: {} }
    const glassCard = { id: 2, type: 'volt', props: { reflowBackdrop: true, voltId: 'glass-1' } }
    const paragraph = { id: 3, type: 'text', props: {} }
    const button = { id: 4, type: 'button', props: {} }
    const ordinaryVolt = { id: 5, type: 'volt', props: { voltId: 'v2' } }

    const { leafBlocks, backdropBlocks } = partitionReflowBlocks([
      heading, glassCard, paragraph, button, ordinaryVolt,
    ])

    expect(leafBlocks).toEqual([heading, paragraph, button, ordinaryVolt])
    expect(backdropBlocks).toEqual([glassCard])
  })

  it('supports multiple backdrop blocks in one section, preserving DOM/array order', () => {
    const back = { id: 1, type: 'volt', props: { reflowBackdrop: true, voltId: 'a' } }
    const front = { id: 2, type: 'volt', props: { reflowBackdrop: true, voltId: 'b' } }
    const { leafBlocks, backdropBlocks } = partitionReflowBlocks([back, front])
    expect(leafBlocks).toEqual([])
    expect(backdropBlocks).toEqual([back, front])
  })

  it('empty input -> empty groups', () => {
    expect(partitionReflowBlocks([])).toEqual({ leafBlocks: [], backdropBlocks: [] })
  })

  it('no flagged blocks -> all blocks stay leaves, backdropBlocks empty (non-flagged volts unaffected)', () => {
    const blocks = [
      { id: 1, type: 'text', props: {} },
      { id: 2, type: 'volt', props: { fullBleed: true, voltId: 'bg' } },
      { id: 3, type: 'volt', props: { voltId: 'v3' } },
    ]
    const { leafBlocks, backdropBlocks } = partitionReflowBlocks(blocks)
    expect(leafBlocks).toEqual(blocks)
    expect(backdropBlocks).toEqual([])
  })
})
