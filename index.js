#!/usr/bin/env node
/**
 * claw-git — Git helper for AI agents
 * Quick status, smart commits, branch management
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VERSION = '1.0.0';

// ANSI colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: opts.pipe ? 'pipe' : undefined, ...opts }).trim();
  } catch (e) {
    if (opts.silent) return null;
    throw e;
  }
}

function isGitRepo() {
  return run('git rev-parse --is-inside-work-tree', { silent: true, pipe: true }) === 'true';
}

function getBranch() {
  return run('git branch --show-current', { pipe: true });
}

function getStatus() {
  const status = run('git status --porcelain', { pipe: true });
  if (!status) return { staged: [], unstaged: [], untracked: [] };
  
  const lines = status.split('\n').filter(Boolean);
  const staged = [], unstaged = [], untracked = [];
  
  for (const line of lines) {
    const x = line[0], y = line[1];
    const file = line.slice(3);
    
    if (x === '?' && y === '?') {
      untracked.push(file);
    } else {
      if (x !== ' ' && x !== '?') staged.push({ status: x, file });
      if (y !== ' ' && y !== '?') unstaged.push({ status: y, file });
    }
  }
  
  return { staged, unstaged, untracked };
}

function getLastCommit() {
  const hash = run('git rev-parse --short HEAD', { silent: true, pipe: true });
  const msg = run('git log -1 --format=%s', { silent: true, pipe: true });
  const time = run('git log -1 --format=%ar', { silent: true, pipe: true });
  return hash ? { hash, msg, time } : null;
}

function getRemoteStatus() {
  // Fetch to update remote refs (quiet)
  run('git fetch --quiet 2>/dev/null || true', { silent: true, pipe: true });
  
  const ahead = run('git rev-list --count @{u}..HEAD 2>/dev/null || echo 0', { pipe: true });
  const behind = run('git rev-list --count HEAD..@{u} 2>/dev/null || echo 0', { pipe: true });
  
  return { ahead: parseInt(ahead) || 0, behind: parseInt(behind) || 0 };
}

// ============ COMMANDS ============

function cmdStatus(opts = {}) {
  if (!isGitRepo()) {
    console.log(`${c.red}Not a git repository${c.reset}`);
    process.exit(1);
  }
  
  const branch = getBranch();
  const status = getStatus();
  const last = getLastCommit();
  const remote = getRemoteStatus();
  
  if (opts.json) {
    console.log(JSON.stringify({ branch, ...status, last, remote }, null, 2));
    return;
  }
  
  // Branch line
  let branchLine = `${c.bold}${c.cyan}${branch}${c.reset}`;
  if (remote.ahead > 0) branchLine += ` ${c.green}↑${remote.ahead}${c.reset}`;
  if (remote.behind > 0) branchLine += ` ${c.red}↓${remote.behind}${c.reset}`;
  console.log(`\n  📍 ${branchLine}`);
  
  // Last commit
  if (last) {
    console.log(`  ${c.dim}└─ ${last.hash} ${last.msg} (${last.time})${c.reset}`);
  }
  
  // Changes
  const total = status.staged.length + status.unstaged.length + status.untracked.length;
  if (total === 0) {
    console.log(`\n  ${c.green}✓ Clean working tree${c.reset}\n`);
    return;
  }
  
  console.log('');
  
  if (status.staged.length > 0) {
    console.log(`  ${c.green}Staged (${status.staged.length}):${c.reset}`);
    status.staged.forEach(s => console.log(`    ${c.green}${s.status}${c.reset} ${s.file}`));
  }
  
  if (status.unstaged.length > 0) {
    console.log(`  ${c.yellow}Modified (${status.unstaged.length}):${c.reset}`);
    status.unstaged.forEach(s => console.log(`    ${c.yellow}${s.status}${c.reset} ${s.file}`));
  }
  
  if (status.untracked.length > 0) {
    console.log(`  ${c.red}Untracked (${status.untracked.length}):${c.reset}`);
    status.untracked.forEach(f => console.log(`    ${c.red}?${c.reset} ${f}`));
  }
  
  console.log('');
}

function cmdQuick(opts = {}) {
  if (!isGitRepo()) {
    console.log(`${c.red}Not a git repository${c.reset}`);
    process.exit(1);
  }
  
  const branch = getBranch();
  const status = getStatus();
  const remote = getRemoteStatus();
  
  const total = status.staged.length + status.unstaged.length + status.untracked.length;
  const staged = status.staged.length;
  
  let emoji = '🟢';
  if (total > 0) emoji = staged > 0 ? '🟡' : '🔴';
  
  let line = `${emoji} ${branch}`;
  if (remote.ahead > 0) line += ` ↑${remote.ahead}`;
  if (remote.behind > 0) line += ` ↓${remote.behind}`;
  if (total > 0) line += ` | ${staged}S ${status.unstaged.length}M ${status.untracked.length}U`;
  else line += ' | clean';
  
  console.log(line);
}

function cmdCommit(message, opts = {}) {
  if (!isGitRepo()) {
    console.log(`${c.red}Not a git repository${c.reset}`);
    process.exit(1);
  }
  
  const status = getStatus();
  
  // Auto-stage if requested or nothing staged
  if (opts.all || status.staged.length === 0) {
    run('git add -A');
    console.log(`${c.dim}Staged all changes${c.reset}`);
  }
  
  // Generate message if not provided
  if (!message) {
    const staged = run('git diff --cached --stat', { pipe: true });
    const files = staged.split('\n').slice(0, -1).map(l => l.split('|')[0].trim());
    
    if (files.length === 0) {
      console.log(`${c.yellow}Nothing to commit${c.reset}`);
      return;
    }
    
    if (files.length === 1) {
      message = `update ${files[0]}`;
    } else if (files.length <= 3) {
      message = `update ${files.join(', ')}`;
    } else {
      message = `update ${files.length} files`;
    }
  }
  
  // Commit
  run(`git commit -m "${message.replace(/"/g, '\\"')}"`);
  console.log(`${c.green}✓${c.reset} Committed: ${c.bold}${message}${c.reset}`);
  
  // Push if requested
  if (opts.push) {
    console.log(`${c.dim}Pushing...${c.reset}`);
    run('git push');
    console.log(`${c.green}✓${c.reset} Pushed`);
  }
}

function cmdPush(opts = {}) {
  if (!isGitRepo()) {
    console.log(`${c.red}Not a git repository${c.reset}`);
    process.exit(1);
  }
  
  const branch = getBranch();
  const remote = getRemoteStatus();
  
  if (remote.ahead === 0) {
    console.log(`${c.green}✓${c.reset} Already up to date`);
    return;
  }
  
  console.log(`${c.dim}Pushing ${remote.ahead} commit(s) to origin/${branch}...${c.reset}`);
  
  if (opts.force) {
    run('git push --force-with-lease');
  } else {
    run('git push');
  }
  
  console.log(`${c.green}✓${c.reset} Pushed`);
}

function cmdPull(opts = {}) {
  if (!isGitRepo()) {
    console.log(`${c.red}Not a git repository${c.reset}`);
    process.exit(1);
  }
  
  const branch = getBranch();
  console.log(`${c.dim}Pulling from origin/${branch}...${c.reset}`);
  
  if (opts.rebase) {
    run('git pull --rebase');
  } else {
    run('git pull');
  }
  
  console.log(`${c.green}✓${c.reset} Pulled`);
}

function cmdBranches(opts = {}) {
  if (!isGitRepo()) {
    console.log(`${c.red}Not a git repository${c.reset}`);
    process.exit(1);
  }
  
  const current = getBranch();
  const branches = run('git branch --format="%(refname:short)"', { pipe: true }).split('\n').filter(Boolean);
  
  if (opts.json) {
    console.log(JSON.stringify({ current, branches }));
    return;
  }
  
  console.log('');
  for (const b of branches) {
    const marker = b === current ? `${c.green}* ${c.bold}` : '  ';
    console.log(`${marker}${b}${c.reset}`);
  }
  console.log('');
}

function cmdLog(count = 10, opts = {}) {
  if (!isGitRepo()) {
    console.log(`${c.red}Not a git repository${c.reset}`);
    process.exit(1);
  }
  
  if (opts.oneline) {
    const log = run(`git log -${count} --oneline`, { pipe: true });
    console.log(log);
    return;
  }
  
  const format = `${c.yellow}%h${c.reset} %s ${c.dim}(%ar)${c.reset}`;
  const log = run(`git log -${count} --format="${format}"`, { pipe: true });
  console.log('\n' + log + '\n');
}

function cmdDiff(opts = {}) {
  if (!isGitRepo()) {
    console.log(`${c.red}Not a git repository${c.reset}`);
    process.exit(1);
  }
  
  if (opts.staged) {
    console.log(run('git diff --cached', { pipe: true }));
  } else {
    console.log(run('git diff', { pipe: true }));
  }
}

function cmdUndo(opts = {}) {
  if (!isGitRepo()) {
    console.log(`${c.red}Not a git repository${c.reset}`);
    process.exit(1);
  }
  
  if (opts.soft) {
    run('git reset --soft HEAD~1');
    console.log(`${c.green}✓${c.reset} Undid last commit (changes kept staged)`);
  } else {
    run('git reset HEAD~1');
    console.log(`${c.green}✓${c.reset} Undid last commit (changes unstaged)`);
  }
}

function cmdStash(action, opts = {}) {
  if (!isGitRepo()) {
    console.log(`${c.red}Not a git repository${c.reset}`);
    process.exit(1);
  }
  
  switch (action) {
    case 'save':
    case undefined:
      run('git stash');
      console.log(`${c.green}✓${c.reset} Stashed changes`);
      break;
    case 'pop':
      run('git stash pop');
      console.log(`${c.green}✓${c.reset} Popped stash`);
      break;
    case 'list':
      const list = run('git stash list', { pipe: true });
      console.log(list || 'No stashes');
      break;
    case 'drop':
      run('git stash drop');
      console.log(`${c.green}✓${c.reset} Dropped stash`);
      break;
    default:
      console.log(`Unknown stash action: ${action}`);
  }
}

function showHelp() {
  console.log(`
${c.bold}claw-git${c.reset} v${VERSION} — Git helper for AI agents

${c.bold}USAGE${c.reset}
  node index.js <command> [options]

${c.bold}COMMANDS${c.reset}
  ${c.cyan}status${c.reset}              Full status with remote info (--json)
  ${c.cyan}quick${c.reset}, ${c.cyan}q${c.reset}           One-line status (emoji + counts)
  ${c.cyan}commit${c.reset} [msg]        Commit changes (-a/--all, -p/--push)
  ${c.cyan}push${c.reset}                Push to remote (-f/--force)
  ${c.cyan}pull${c.reset}                Pull from remote (-r/--rebase)
  ${c.cyan}branches${c.reset}, ${c.cyan}br${c.reset}       List branches (--json)
  ${c.cyan}log${c.reset} [n]             Show last n commits (--oneline)
  ${c.cyan}diff${c.reset}                Show unstaged diff (--staged)
  ${c.cyan}undo${c.reset}                Undo last commit (--soft)
  ${c.cyan}stash${c.reset} [action]      Stash commands (save/pop/list/drop)

${c.bold}EXAMPLES${c.reset}
  node index.js status             # Full repo status
  node index.js q                  # Quick one-liner
  node index.js commit "fix bug"   # Commit with message
  node index.js commit -ap         # Stage all, commit, push
  node index.js log 5              # Last 5 commits
`);
}

// ============ MAIN ============

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'status') {
    cmdStatus({ json: args.includes('--json') });
    return;
  }
  
  const cmd = args[0];
  const rest = args.slice(1);
  
  switch (cmd) {
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    
    case 'quick':
    case 'q':
      cmdQuick();
      break;
    
    case 'commit':
    case 'c':
      const msg = rest.find(a => !a.startsWith('-'));
      cmdCommit(msg, {
        all: rest.includes('-a') || rest.includes('--all'),
        push: rest.includes('-p') || rest.includes('--push'),
      });
      break;
    
    case 'push':
      cmdPush({ force: rest.includes('-f') || rest.includes('--force') });
      break;
    
    case 'pull':
      cmdPull({ rebase: rest.includes('-r') || rest.includes('--rebase') });
      break;
    
    case 'branches':
    case 'br':
      cmdBranches({ json: rest.includes('--json') });
      break;
    
    case 'log':
    case 'l':
      const count = parseInt(rest.find(a => !a.startsWith('-'))) || 10;
      cmdLog(count, { oneline: rest.includes('--oneline') });
      break;
    
    case 'diff':
    case 'd':
      cmdDiff({ staged: rest.includes('--staged') || rest.includes('-s') });
      break;
    
    case 'undo':
      cmdUndo({ soft: rest.includes('--soft') || rest.includes('-s') });
      break;
    
    case 'stash':
      cmdStash(rest[0]);
      break;
    
    case '--version':
    case '-v':
      console.log(VERSION);
      break;
    
    default:
      console.log(`Unknown command: ${cmd}`);
      console.log('Run with --help for usage');
      process.exit(1);
  }
}

main();
