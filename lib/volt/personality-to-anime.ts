// lib/volt/personality-to-anime.ts
import type { VoltLayerAnimation } from '@/types/volt'

export interface AnimeConfig {
  duration: number
  ease: string
  delay?: number
}

export function personalityToAnimeConfig(anim: VoltLayerAnimation): AnimeConfig {
  const duration = Math.round(100 + Math.pow(anim.speed / 100, 1.5) * 1300)
  const { character, style } = anim

  let ease: string

  if (character < 30 && style < 30) {
    ease = `spring(1, 80, ${10 + Math.round(style / 5)}, 0)`
  } else if (character < 30 && style >= 70) {
    ease = 'easeOutCubic'
  } else if (character >= 70 && style < 30) {
    ease = `spring(1, 60, 5, 0)`
  } else if (character >= 70 && style >= 70) {
    ease = 'easeInOutQuart'
  } else {
    ease = 'easeOutQuad'
  }

  return { duration, ease, delay: anim.delay }
}
