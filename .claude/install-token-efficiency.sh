#!/usr/bin/env bash
# install-token-efficiency.sh — make "efficient token usage" a global Claude Code rule.
#
# Idempotent. Safe to run on each PC. It will:
#   1. Ensure ~/.claude/CLAUDE.md contains the EFFICIENT TOKEN USAGE block.
#   2. (optional) Sync ~/.claude/CLAUDE.md into a dotfiles git repo so both PCs match.
#
# Usage:
#   bash .claude/install-token-efficiency.sh                 # install/update the rule
#   bash .claude/install-token-efficiency.sh --dotfiles DIR  # also link into a dotfiles repo
#
set -euo pipefail

MARKER="## ⛔ NON-NEGOTIABLE: EFFICIENT TOKEN USAGE (GLOBAL)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$SCRIPT_DIR/global-CLAUDE.md"
DEST="${CLAUDE_HOME:-$HOME/.claude}/CLAUDE.md"
DOTFILES=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dotfiles) DOTFILES="${2:-}"; shift 2 ;;
    -h|--help)  grep -E '^#( |$)' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

[ -f "$SRC" ] || { echo "ERROR: $SRC not found" >&2; exit 1; }

mkdir -p "$(dirname "$DEST")"
touch "$DEST"

# Strip the leading HTML comment from the source body before appending.
BODY="$(sed '/^<!--/,/-->/d' "$SRC")"

if grep -qF "$MARKER" "$DEST"; then
  echo "✓ Rule already present in $DEST — no change."
else
  { [ -s "$DEST" ] && printf '\n'; printf '%s\n' "$BODY"; } >> "$DEST"
  echo "✓ Appended EFFICIENT TOKEN USAGE rule to $DEST"
fi

# Optional dotfiles sync: move the real file into the repo and symlink it back.
if [ -n "$DOTFILES" ]; then
  mkdir -p "$DOTFILES/claude"
  TARGET="$DOTFILES/claude/CLAUDE.md"
  if [ ! -L "$DEST" ]; then
    cp "$DEST" "$TARGET"
    ln -sf "$TARGET" "$DEST"
    echo "✓ Moved rule to $TARGET and symlinked $DEST -> it"
  fi
  if command -v git >/dev/null && git -C "$DOTFILES" rev-parse >/dev/null 2>&1; then
    git -C "$DOTFILES" add claude/CLAUDE.md
    if git -C "$DOTFILES" diff --cached --quiet; then
      echo "• Nothing new to commit in dotfiles repo."
    elif git -C "$DOTFILES" commit -m "chore: sync global Claude token-efficiency rule"; then
      echo "✓ Committed to dotfiles repo. Run: git -C \"$DOTFILES\" push"
    else
      echo "⚠ Staged claude/CLAUDE.md but commit failed (see git output above). Commit manually."
    fi
  else
    echo "• $DOTFILES is not a git repo yet. Init it, then re-run with --dotfiles."
  fi
fi

echo
echo "Next: restart Claude Code so it reloads ~/.claude/CLAUDE.md."
echo "Optional Headroom proxy:  pip install \"headroom-ai[all]\" && headroom wrap claude"
