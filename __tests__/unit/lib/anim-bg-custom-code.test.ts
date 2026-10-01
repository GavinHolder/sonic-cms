import { describe, it, expect, vi } from 'vitest'

const animeAnimate = vi.hoisted(() => vi.fn(() => ({ pause: vi.fn(), play: vi.fn(), revert: vi.fn() })))
vi.mock('animejs', () => ({ animate: animeAnimate, stagger: vi.fn() }))

import { customCodeAnimator } from '@/lib/anim-bg/animators'

describe('customCodeAnimator', () => {
  it('passes anime shim and animate to admin code without ReferenceError', () => {
    const container = {} as HTMLElement
    const handle = customCodeAnimator(container, {
      code: 'anime({ targets: container, x: 1, easing: "linear" }); return { pause(){}, destroy(){} };',
    } as never)
    expect(animeAnimate).toHaveBeenCalledWith(container, { x: 1, ease: 'linear' })
    expect(typeof handle.destroy).toBe('function')
  })
})
