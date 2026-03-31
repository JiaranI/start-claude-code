# Start Claude Code

> Run Claude Code `v2.1.88` from leaked source — one command setup. Both interactive TUI and non-interactive modes work.

## Quick Start

```bash
git clone https://github.com/JiaranI/start-claude-code.git
cd start-claude-code

# Set API key (or use existing OAuth login from official Claude Code)
export ANTHROPIC_API_KEY="sk-ant-xxx"

# Run!
./start.sh
```

First run will automatically install Bun, dependencies, and configure everything.

---

## Usage

### Interactive TUI (full terminal UI)

```bash
# With API key
export ANTHROPIC_API_KEY="sk-ant-xxx"
./start.sh --dangerously-skip-permissions

# Or with existing OAuth login (if you've used official Claude Code before)
./start.sh --dangerously-skip-permissions
```

### Non-interactive mode (scripts/pipes)

```bash
export ANTHROPIC_API_KEY="sk-ant-xxx"
./start.sh -p "explain this code" --dangerously-skip-permissions < /dev/null
```

### Use a third-party proxy

```bash
export ANTHROPIC_BASE_URL="https://your-proxy.com"   # Don't include /v1
export ANTHROPIC_API_KEY="your-key"
export DISABLE_PROMPT_CACHING=1
export DISABLE_INTERLEAVED_THINKING=1
export CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1

# Non-interactive (recommended for proxies)
./start.sh -p "hello" --model claude-sonnet-4-20250514 \
  --dangerously-skip-permissions --no-session-persistence < /dev/null

# Interactive TUI with proxy
./start.sh --model claude-sonnet-4-20250514 --dangerously-skip-permissions --bare
```

### Specify model

```bash
./start.sh --model claude-sonnet-4-20250514
./start.sh --model claude-opus-4-20250514
./start.sh --model claude-haiku-4-5-20241022
```

---

## Manual Setup

If you prefer to set up step by step:

```bash
# 1. Install Bun
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"

# 2. Run setup
node scripts/setup.mjs

# 3. Run
bun src/entrypoints/cli.tsx --dangerously-skip-permissions
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | API key (not needed if using OAuth) | - |
| `ANTHROPIC_BASE_URL` | API base URL (no `/v1` suffix) | `https://api.anthropic.com` |
| `ANTHROPIC_MODEL` | Default model | `claude-sonnet-4-6` |
| `DISABLE_PROMPT_CACHING` | Disable prompt caching (needed for most proxies) | `0` |
| `DISABLE_INTERLEAVED_THINKING` | Disable interleaved thinking (needed for some proxies) | `0` |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | Disable experimental beta headers (needed for some proxies) | `0` |
| `CLAUDE_CODE_FORCE_FULL_LOGO` | Show full welcome screen with border and tips | `0` |

---

## Status

| Feature | Status |
|---|---|
| `--version` / `--help` | Working |
| `-p` non-interactive mode | Working (full API call + tool use) |
| Interactive TUI | Working (full UI rendering + input) |
| OAuth login | Working (reuses existing official Claude Code login) |
| Third-party proxy | Working (set `ANTHROPIC_BASE_URL`) |

---

## What is this?

On March 31, 2026, the full source code of Anthropic's Claude Code CLI was [leaked](https://x.com/Fried_rice/status/2038894956459290963) via a `.map` file in their npm registry. This repository contains:

- The complete `src/` directory (~1,900 files, 512,000+ lines of TypeScript)
- Build shims and stubs to make it runnable from source
- A one-click setup script

**Source authenticity**: Verified by comparing all 1,902 source files against `@anthropic-ai/claude-code@2.1.88`'s source map — **100% byte-identical match, zero differences.**

### What was leaked vs what we had to reconstruct

The leak only contains `src/` — raw TypeScript before compilation. Running from source required reverse-engineering the missing build infrastructure:

| Missing piece | What it is | Our workaround |
|---|---|---|
| `bun:bundle` | Compile-time feature flag API (dead code elimination) | Runtime shim returning `false` for all flags |
| `MACRO.*` | Build-time constant injection (`MACRO.VERSION` etc.) | Global variable definition in preload |
| `package.json` | Dependency declarations (94 packages) | Reverse-engineered from import statements |
| Private npm packages | `@anthropic-ai/sandbox-runtime`, `@ant/*`, `@anthropic-ai/mcpb` | Empty stub modules with fake exports |
| Generated files | `coreTypes.generated.ts` etc. (built by internal scripts) | Manually created type stubs |
| Feature-gated files | Files deleted at compile time (`connectorText.ts`, `TungstenTool/*`) | Empty stub files |
| Keybinding dispatch | `registerHandler` callbacks gated behind chord-only check | Removed `wasInChord` guard |

### Tech Stack

| Component | Technology |
|---|---|
| Runtime | Bun |
| Language | TypeScript |
| Terminal UI | React + Ink (custom fork) |
| CLI Parser | Commander.js |
| API | Anthropic SDK |
| Code Search | ripgrep (bundled) |
| Protocols | MCP, LSP |

### Source Structure

```
src/
├── main.tsx              # CLI entrypoint
├── QueryEngine.ts        # Core LLM API caller
├── tools/                # ~40 agent tools (Bash, Edit, Read, etc.)
├── commands/             # ~50 slash commands (/commit, /review, etc.)
├── components/           # ~140 Ink UI components
├── services/             # API, MCP, OAuth, analytics
├── bridge/               # IDE integration (VS Code, JetBrains)
├── coordinator/          # Multi-agent orchestration
├── skills/               # Skill system
├── plugins/              # Plugin system
├── memdir/               # Persistent memory
├── buddy/                # Companion sprites (19 animals!)
└── ...
```

---

## Troubleshooting

### "API Error: 400 ... invalid beta flag"

Your proxy doesn't support Claude beta headers. Set:

```bash
export CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1
export DISABLE_INTERLEAVED_THINKING=1
```

Or use `--bare` mode which skips most features.

### "API Error: 400 ... cache_control"

```bash
export DISABLE_PROMPT_CACHING=1
```

### "API Error: 400 ... /v1/v1/messages"

Your `ANTHROPIC_BASE_URL` should NOT include `/v1`:

```bash
# Wrong
export ANTHROPIC_BASE_URL="https://proxy.com/v1"

# Correct
export ANTHROPIC_BASE_URL="https://proxy.com"
```

### "API Error: 401" in interactive mode with proxy

Interactive mode may use OAuth tokens from a previous official Claude Code login. Use `--bare` to force API key auth:

```bash
./start.sh --dangerously-skip-permissions --bare
```

### Stuck / no output in non-interactive mode

Always pipe `/dev/null` to stdin:

```bash
./start.sh -p "hello" --dangerously-skip-permissions < /dev/null
```

---

## Disclaimer

This repository archives source code that was leaked from Anthropic's npm registry. All original source code is the property of [Anthropic](https://www.anthropic.com).
