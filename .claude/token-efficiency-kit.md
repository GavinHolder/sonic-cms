# Token-Efficiency Kit (portable, global)

Make **efficient token usage** a non-negotiable in *every* project, on *every* PC.
This file is git-tracked, so `git pull` retrieves it on any machine. The **active**
global rule lives on each PC at `~/.claude/CLAUDE.md` (Claude Code loads it for all
projects automatically).

Inspired by **Headroom** (github.com/chopratejas/headroom) — a proxy that compresses
tool output / logs / files / RAG chunks before they reach the model (60–95% fewer
tokens, reversible). Headroom is the *tooling* layer; the rule below is the *behavior*
layer. Use both.

---

## 1. The global rule — paste into `~/.claude/CLAUDE.md` on each PC

```md
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
- If Headroom is running, route model traffic through it (see kit).

**Output**
- No preamble, no recap, no restating the plan. Code/edits are the answer.
- Answer in the fewest tokens that are correct and complete.

**When in doubt: do less, say less.**
```

---

## 2. Reusable setup prompt — paste into Claude Code in any project / on any PC

> Set up token efficiency as a non-negotiable here. Do exactly this, nothing else:
>
> 1. Open `~/.claude/CLAUDE.md` (create it if missing). If it has no
>    "EFFICIENT TOKEN USAGE" section, append the rule block from
>    `.claude/token-efficiency-kit.md` section 1 verbatim.
> 2. If this project has a `./CLAUDE.md`, add near the top:
>    `## Token Efficiency → non-negotiable, see global rule in ~/.claude/CLAUDE.md`.
>    If it has no `./CLAUDE.md`, create a minimal one with that line.
> 3. Check whether Headroom is installed (`which headroom`). If not, read
>    github.com/chopratejas/headroom, tell me the official install command, and
>    ask before installing anything.
> 4. Do not refactor or touch anything unrelated. Report what changed in one line.

---

## 3. Headroom — install & wire into Claude Code

Headroom is a local proxy (default **port 8787**) plus a Python/Node library.
It supports Anthropic + OpenAI + Bedrock and 100+ models. `headroom wrap claude`
(Claude Code) is officially supported. Source of truth: github.com/chopratejas/headroom

> ⚠️ The package is **`headroom-ai`** — NOT the plain `headroom` on PyPI, which is an
> unrelated project.

```bash
# Python (Requires Python 3.10+)
pip install "headroom-ai[all]"
# or Node
npm install headroom-ai

# start the compression proxy (dashboard at http://localhost:8787/dashboard)
headroom proxy --port 8787
```

Use it with Claude Code, two ways:

```bash
# A) wrap the CLI (preferred — adds --memory / --code-graph)
headroom wrap claude

# B) point Claude Code at the proxy manually
ANTHROPIC_BASE_URL=http://localhost:8787 claude
```

Best wins on: server logs (~90% removable), MCP/tool JSON (~70% redundant), DB rows
(shared schema), file trees (repeated metadata). Compression is reversible — the model
can pull the original data back when it actually needs it.

---

## 4. Sync across both PCs

The rule must live at `~/.claude/CLAUDE.md` on **each** machine. Pick one:

- **Manual (simplest):** copy section 1 into `~/.claude/CLAUDE.md` on PC #1 and PC #2.
- **Versioned (recommended):** keep `~/.claude/` (or just `~/.claude/CLAUDE.md`) in a
  small git/dotfiles repo; `git pull` on both PCs to stay in sync.
- **Via this repo:** `git pull` here on PC #2 to get this kit, then copy section 1 into
  `~/.claude/CLAUDE.md`.

Per-project rules (the `./CLAUDE.md` in each repo) already sync automatically — they're
committed to that repo.
