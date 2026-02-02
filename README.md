# claw-git

Git helper for AI agents. Quick status, smart commits, branch management.

## Features

- **AI-Powered Commits** — Generate conventional commit messages from diffs (uses `gemini`)
- **Quick status** — One-line repo health with emoji indicators
- **Smart commits** — Auto-stage, auto-message, push in one command
- **Remote awareness** — See ahead/behind counts at a glance
- **Zero dependencies** — Pure Node.js, works anywhere

## Installation

```bash
git clone https://github.com/julianthorne2jz/claw-git
cd claw-git
```

## Usage

```bash
# Full status with remote info
node index.js status

# Quick one-liner (great for scripts)
node index.js quick
# 🟡 main ↑2 | 3S 1M 0U

# Commit with auto-staging and push
node index.js commit "fix: resolve edge case" -ap

# Generate a commit message with AI (requires gemini CLI)
node index.js commit -g
# AI Message: feat: add hello world console log
# ✓ Committed: feat: add hello world console log

# Or let it generate a default message (no AI)
node index.js commit -ap
# ✓ Committed: update index.js, README.md

# Other commands
node index.js branches        # List branches
node index.js log 5           # Last 5 commits
node index.js diff --staged   # Staged changes
node index.js undo            # Undo last commit
node index.js stash           # Stash changes
```

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `status` | | Full status with remote tracking |
| `quick` | `q` | One-line status (emoji + counts) |
| `commit [msg]` | `c` | Commit (-a/--all, -p/--push, -g/--generate) |
| `push` | | Push to remote (-f/--force) |
| `pull` | | Pull from remote (-r/--rebase) |
| `branches` | `br` | List branches (--json) |
| `log [n]` | `l` | Show last n commits (--oneline) |
| `diff` | `d` | Show diff (--staged) |
| `undo` | | Undo last commit (--soft) |
| `stash` | | Stash operations (save/pop/list/drop) |

## Status Indicators

- 🟢 Clean working tree
- 🟡 Staged changes ready to commit
- 🔴 Uncommitted changes

- ↑n — Ahead of remote by n commits
- ↓n — Behind remote by n commits
- S/M/U — Staged/Modified/Untracked counts

## Examples

```bash
# Morning workflow
node index.js pull -r
node index.js status

# Quick check
node index.js q
# 🟢 main | clean

# End of day
node index.js commit "feat: add new feature" -ap
```

## License

MIT
