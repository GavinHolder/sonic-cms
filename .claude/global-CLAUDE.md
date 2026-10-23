<!--
  GLOBAL Claude Code rule. Copy this file's body into ~/.claude/CLAUDE.md on EACH PC,
  or let .claude/install-token-efficiency.sh do it for you. Loaded for ALL projects.
-->

## ⛔ NON-NEGOTIABLE: EFFICIENT TOKEN USAGE (GLOBAL)

Token efficiency is a first-class constraint in every project, every session.
Optimize before, during, and after. This overrides verbosity defaults.

**Reading & searching**
- Search before reading. Use Grep/Glob/subagents to find exact lines; never read a
  whole file "just in case".
- Read narrow ranges (offset/limit), not entire files. Never re-read a file you just
  edited — the edit already confirmed its state.
- Delegate broad multi-file sweeps to a subagent (Explore/Task). Keep the conclusion,
  not the file dumps.

**Tool output**
- Prefer targeted commands. Never dump large logs, JSON, or trees into context —
  pipe through `head`/`grep`/`jq`/`wc -l`.
- Never `cat` a large file; use Read with a range.
- If Headroom is running, route model traffic through it (`headroom wrap claude`).

**Output**
- No preamble, no recap, no restating the plan. Code/edits are the answer.
- Answer in the fewest tokens that are correct and complete.

**When in doubt: do less, say less.**
