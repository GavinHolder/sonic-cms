/**
 * Smoke tests for Volt utility functions.
 *
 * Run with:  npx tsx --tsconfig tsconfig.json lib/volt/__tests__/volt-utils.smoke.test.ts
 *
 * No test-runner dependency — uses Node assert. Exit 0 = all pass.
 */

import assert from 'node:assert/strict'
import { personalityToAnimeConfig } from '../personality-to-anime'
import { createRectangleLayer, createNewVoltElement } from '../volt-defaults'
import type { VoltLayerAnimation } from '@/types/volt'

// ─── helpers ────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function test(name: string, fn: () => void): void {
  try {
    fn()
    console.log(`  ✓  ${name}`)
    passed++
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`  ✗  ${name}`)
    console.error(`     ${msg}`)
    failed++
  }
}

// ─── Test 1: personalityToAnimeConfig ────────────────────────────────────────

console.log('\nTest suite: personalityToAnimeConfig')

const sampleAnim: VoltLayerAnimation = {
  character: 50,
  speed: 40,
  style: 60,
  delay: 0,
  animates: { opacity: true, scale: false, position: false, rotation: false, fill: false },
}

test('returns an object', () => {
  const cfg = personalityToAnimeConfig(sampleAnim)
  assert.ok(cfg !== null && typeof cfg === 'object', 'expected object')
})

test('duration is a finite number', () => {
  const { duration } = personalityToAnimeConfig(sampleAnim)
  assert.ok(typeof duration === 'number', `duration must be number, got ${typeof duration}`)
  assert.ok(Number.isFinite(duration), `duration must be finite, got ${duration}`)
})

test('duration is between 100 and 1400', () => {
  const { duration } = personalityToAnimeConfig(sampleAnim)
  assert.ok(duration >= 100, `duration ${duration} below minimum 100`)
  assert.ok(duration <= 1400, `duration ${duration} exceeds maximum 1400`)
})

test('ease is a non-empty string', () => {
  const { ease } = personalityToAnimeConfig(sampleAnim)
  assert.ok(ease !== undefined && ease !== null, 'ease must not be undefined/null')
  assert.ok(typeof ease === 'string', `ease must be string, got ${typeof ease}`)
  assert.ok(ease.length > 0, 'ease must be non-empty')
})

test('delay is passed through from input', () => {
  const { delay } = personalityToAnimeConfig(sampleAnim)
  assert.strictEqual(delay, sampleAnim.delay)
})

test('speed=0 produces duration at low end (≥ 100, ≤ 200)', () => {
  const cfg = personalityToAnimeConfig({ ...sampleAnim, speed: 0 })
  assert.strictEqual(cfg.duration, 100, `expected 100 for speed=0, got ${cfg.duration}`)
})

test('speed=100 produces duration at high end (≥ 1300)', () => {
  const cfg = personalityToAnimeConfig({ ...sampleAnim, speed: 100 })
  assert.ok(cfg.duration >= 1300, `expected ≥1300 for speed=100, got ${cfg.duration}`)
})

test('character<30 & style<30 produces spring ease', () => {
  const cfg = personalityToAnimeConfig({ ...sampleAnim, character: 10, style: 10 })
  assert.ok(cfg.ease.startsWith('spring('), `expected spring ease, got "${cfg.ease}"`)
})

test('character≥70 & style≥70 produces easeInOutQuart', () => {
  const cfg = personalityToAnimeConfig({ ...sampleAnim, character: 80, style: 80 })
  assert.strictEqual(cfg.ease, 'easeInOutQuart')
})

// ─── Test 2: createRectangleLayer ────────────────────────────────────────────

console.log('\nTest suite: createRectangleLayer')

test('returns a layer object', () => {
  const layer = createRectangleLayer(10, 10, 40, 30)
  assert.ok(layer !== null && typeof layer === 'object')
})

test('type === "vector"', () => {
  const layer = createRectangleLayer(10, 10, 40, 30)
  assert.strictEqual(layer.type, 'vector')
})

test('role === "structure"', () => {
  const layer = createRectangleLayer(10, 10, 40, 30)
  assert.strictEqual(layer.role, 'structure')
})

test('coordinates match inputs', () => {
  const layer = createRectangleLayer(10, 10, 40, 30)
  assert.strictEqual(layer.x, 10)
  assert.strictEqual(layer.y, 10)
  assert.strictEqual(layer.width, 40)
  assert.strictEqual(layer.height, 30)
})

test('vectorData.pathData contains M and Z', () => {
  const layer = createRectangleLayer(10, 10, 40, 30)
  const path = layer.vectorData?.pathData ?? ''
  assert.ok(path.includes('M'), `path missing "M": "${path}"`)
  assert.ok(path.includes('Z'), `path missing "Z": "${path}"`)
})

test('vectorData.fills has exactly 1 entry', () => {
  const layer = createRectangleLayer(10, 10, 40, 30)
  const fills = layer.vectorData?.fills ?? []
  assert.strictEqual(fills.length, 1, `expected 1 fill, got ${fills.length}`)
})

test('fill type is "solid"', () => {
  const layer = createRectangleLayer(10, 10, 40, 30)
  assert.strictEqual(layer.vectorData?.fills[0]?.type, 'solid')
})

test('id is a non-empty string (nanoid)', () => {
  const layer = createRectangleLayer(10, 10, 40, 30)
  assert.ok(typeof layer.id === 'string' && layer.id.length > 0)
})

test('two calls produce distinct ids', () => {
  const a = createRectangleLayer(0, 0, 10, 10)
  const b = createRectangleLayer(0, 0, 10, 10)
  assert.notStrictEqual(a.id, b.id, 'ids should be unique')
})

// ─── Test 3: createNewVoltElement ────────────────────────────────────────────

console.log('\nTest suite: createNewVoltElement')

test('returns an object', () => {
  const el = createNewVoltElement('test-user')
  assert.ok(el !== null && typeof el === 'object')
})

test('authorId is set correctly', () => {
  const el = createNewVoltElement('test-user')
  assert.strictEqual(el.authorId, 'test-user')
})

test('states has exactly 2 entries (rest + hover)', () => {
  const el = createNewVoltElement('test-user')
  assert.strictEqual(el.states.length, 2, `expected 2 states, got ${el.states.length}`)
})

test('first state is "rest"', () => {
  const el = createNewVoltElement('test-user')
  assert.strictEqual(el.states[0]?.id, 'rest')
  assert.strictEqual(el.states[0]?.name, 'rest')
})

test('second state is "hover"', () => {
  const el = createNewVoltElement('test-user')
  assert.strictEqual(el.states[1]?.id, 'hover')
  assert.strictEqual(el.states[1]?.name, 'hover')
})

test('layers starts empty', () => {
  const el = createNewVoltElement('test-user')
  assert.ok(Array.isArray(el.layers), 'layers must be an array')
  assert.strictEqual(el.layers.length, 0)
})

test('canvasWidth === 800', () => {
  const el = createNewVoltElement('test-user')
  assert.strictEqual(el.canvasWidth, 800)
})

test('canvasHeight === 500', () => {
  const el = createNewVoltElement('test-user')
  assert.strictEqual(el.canvasHeight, 500)
})

test('default name is "New Design"', () => {
  const el = createNewVoltElement('test-user')
  assert.strictEqual(el.name, 'New Design')
})

test('custom name is applied', () => {
  const el = createNewVoltElement('test-user', 'My Card')
  assert.strictEqual(el.name, 'My Card')
})

test('isPublic defaults to false', () => {
  const el = createNewVoltElement('test-user')
  assert.strictEqual(el.isPublic, false)
})

test('has3D defaults to false', () => {
  const el = createNewVoltElement('test-user')
  assert.strictEqual(el.has3D, false)
})

test('createdAt and updatedAt are ISO date strings', () => {
  const el = createNewVoltElement('test-user')
  assert.ok(!isNaN(Date.parse(el.createdAt)), `createdAt "${el.createdAt}" is not a valid date`)
  assert.ok(!isNaN(Date.parse(el.updatedAt)), `updatedAt "${el.updatedAt}" is not a valid date`)
})

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`)
console.log(`  ${passed} passed, ${failed} failed`)
console.log(`${'─'.repeat(50)}\n`)

if (failed > 0) {
  process.exit(1)
}
