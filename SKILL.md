# claw-git

Git helper for AI agents — quick status, smart commits with AI generation, branch management.

## Usage

```bash
# Check status
claw-git status          # Full status
claw-git q               # Quick emoji status

# Commit
claw-git commit -ap      # Stage all, commit, push
claw-git commit -g       # Generate commit message with AI (gemini)
claw-git commit "msg"    # Commit with message

# Sync
claw-git pull -r         # Pull --rebase
claw-git push -f         # Push --force
```

## Options

- `-g, --generate`: Generate commit message using AI (requires `gemini` CLI)
- `-a, --all`: Auto-stage all changes
- `-p, --push`: Push after commit
- `--human, -H — Human-readable output (default: JSON) for automation

## When to Use

Use this tool instead of raw `git` when you want:
1. Quick status checks (emoji indicators)
2. To save time writing commit messages (let AI do it)
3. One-command stage-commit-push workflows

## Dependencies

- Node.js
- `gemini` CLI (optional, for AI commit generation)
