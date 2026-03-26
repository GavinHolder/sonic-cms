#!/usr/bin/env node
/**
 * Generate CHANGELOG.md from git history.
 * Groups commits by version bumps, categorizes by conventional commit type.
 * Safe: execSync only runs hardcoded git commands, no user input.
 *
 * Run: node scripts/generate-changelog.mjs
 */

import { execSync } from 'child_process'
import { writeFileSync } from 'fs'

const log = execSync('git log --oneline --pretty=format:"%h|%s|%ai" main', { encoding: 'utf-8' }).trim().split('\n')

const versions = []
let current = { version: 'Unreleased', date: '', commits: { features: [], fixes: [], refactors: [], docs: [], breaking: [] } }

for (const line of log) {
  const [hash, msg, date] = line.split('|')
  if (!msg) continue

  if (msg.startsWith('chore: auto-bump version to')) {
    const ver = msg.match(/v([\d.]+)/)
    if (ver) {
      const hasContent = Object.values(current.commits).some(a => a.length > 0)
      if (hasContent) versions.push(current)
      current = { version: ver[1], date: date ? date.split(' ')[0] : '', commits: { features: [], fixes: [], refactors: [], docs: [], breaking: [] } }
      continue
    }
  }

  if (msg.startsWith('Merge branch')) continue
  if (msg.startsWith('chore:')) continue

  if (msg.startsWith('feat!:')) {
    current.commits.breaking.push(msg.replace(/^feat!:\s*/, ''))
    current.commits.features.push(msg.replace(/^feat!:\s*/, ''))
  }
  else if (msg.startsWith('feat:')) current.commits.features.push(msg.replace(/^feat:\s*/, ''))
  else if (msg.startsWith('fix:')) current.commits.fixes.push(msg.replace(/^fix:\s*/, ''))
  else if (msg.startsWith('refactor:')) current.commits.refactors.push(msg.replace(/^refactor:\s*/, ''))
  else if (msg.startsWith('docs:')) current.commits.docs.push(msg.replace(/^docs:\s*/, ''))
}

const hasCurrent = Object.values(current.commits).some(a => a.length > 0)
if (hasCurrent) versions.push(current)

let md = '# Changelog\n\nAll notable changes to the White-Label CMS.\n\n'
md += '> Auto-generated from git history. Run `node scripts/generate-changelog.mjs` to regenerate.\n\n'

for (const v of versions) {
  const header = v.version === 'Unreleased' ? 'Unreleased' : `v${v.version}`
  md += `## ${header}${v.date ? ` (${v.date})` : ''}\n\n`

  if (v.commits.breaking.length) {
    md += '### ⚠️ Breaking Changes\n'
    v.commits.breaking.forEach(c => md += `- ${c}\n`)
    md += '\n'
  }
  if (v.commits.features.length) {
    md += '### Features\n'
    v.commits.features.filter(f => !v.commits.breaking.includes(f)).forEach(c => md += `- ${c}\n`)
    if (v.commits.features.filter(f => !v.commits.breaking.includes(f)).length) md += '\n'
  }
  if (v.commits.fixes.length) {
    md += '### Bug Fixes\n'
    v.commits.fixes.forEach(c => md += `- ${c}\n`)
    md += '\n'
  }
  if (v.commits.refactors.length) {
    md += '### Refactoring\n'
    v.commits.refactors.forEach(c => md += `- ${c}\n`)
    md += '\n'
  }
  if (v.commits.docs.length) {
    md += '### Documentation\n'
    v.commits.docs.forEach(c => md += `- ${c}\n`)
    md += '\n'
  }

  md += '---\n\n'
}

writeFileSync('CHANGELOG.md', md)
console.log(`✅ Generated CHANGELOG.md with ${versions.length} versions`)
