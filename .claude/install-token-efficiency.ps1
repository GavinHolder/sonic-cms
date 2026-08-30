# install-token-efficiency.ps1 - make "efficient token usage" a global Claude Code rule (Windows).
#
# Idempotent. Safe to run repeatedly on each PC. Writes the rule into the
# per-user global config that every Claude Code instance on this machine loads:
#   $HOME\.claude\CLAUDE.md   (e.g. C:\Users\<you>\.claude\CLAUDE.md)
#
# Usage (from PowerShell):
#   .\.claude\install-token-efficiency.ps1
#
# After running, restart Claude Code so it reloads the global CLAUDE.md.

$ErrorActionPreference = 'Stop'

$claudeDir = Join-Path $HOME '.claude'
$claudeMd  = Join-Path $claudeDir 'CLAUDE.md'

New-Item -ItemType Directory -Force -Path $claudeDir | Out-Null
if (-not (Test-Path $claudeMd)) { New-Item -ItemType File -Path $claudeMd | Out-Null }

if (Select-String -Path $claudeMd -Pattern 'EFFICIENT TOKEN USAGE \(GLOBAL\)' -Quiet) {
    Write-Host "Rule already present in $claudeMd - no change."
} else {
$rule = @'

## NON-NEGOTIABLE: EFFICIENT TOKEN USAGE (GLOBAL)

Token efficiency is a first-class constraint in every project, every session.
Optimize before, during, and after. This overrides verbosity defaults.

**Reading & searching**
- Search before reading. Use Grep/Glob/subagents to find exact lines; never read a
  whole file "just in case".
- Read narrow ranges (offset/limit), not entire files. Never re-read a file you just
  edited - the edit already confirmed its state.
- Delegate broad multi-file sweeps to a subagent (Explore/Task). Keep the conclusion,
  not the file dumps.

**Tool output**
- Prefer targeted commands. Never dump large logs, JSON, or trees into context -
  pipe through head/grep/jq/wc -l.
- Never cat a large file; use Read with a range.
- If Headroom is running, route model traffic through it (headroom wrap claude).

**Output**
- No preamble, no recap, no restating the plan. Code/edits are the answer.
- Answer in the fewest tokens that are correct and complete.

**When in doubt: do less, say less.**
'@
    Add-Content -Path $claudeMd -Value $rule -Encoding UTF8
    Write-Host "Appended rule to $claudeMd"
}

Write-Host "Done. Restart Claude Code so it reloads the global CLAUDE.md"
