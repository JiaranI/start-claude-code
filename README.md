# Start Claude Code

> Run Claude Code `v2.1.88` from leaked source code - one command setup.

## Quick Start

```bash
git clone https://github.com/yourname/start-claude-code.git
cd start-claude-code

# Set API key
export ANTHROPIC_API_KEY="sk-ant-xxx"

# Run!
./start.sh
```

First run will automatically install Bun, dependencies, and configure everything.

---

## Usage

### Interactive mode (terminal UI)

```bash
export ANTHROPIC_API_KEY="sk-ant-xxx"
./start.sh
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

./start.sh -p "hello" --model claude-sonnet-4-20250514 \
  --dangerously-skip-permissions --no-session-persistence < /dev/null
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
bun src/entrypoints/cli.tsx
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Required.** Your API key | - |
| `ANTHROPIC_BASE_URL` | API base URL (no `/v1` suffix) | `https://api.anthropic.com` |
| `ANTHROPIC_MODEL` | Default model | `claude-sonnet-4-6` |
| `DISABLE_PROMPT_CACHING` | Disable prompt caching (needed for most proxies) | `0` |
| `DISABLE_INTERLEAVED_THINKING` | Disable interleaved thinking | `0` |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | Disable experimental beta headers | `0` |

---

## What is this?

On March 31, 2026, the full source code of Anthropic's Claude Code CLI was [leaked](https://x.com/Fried_rice/status/2038894956459290963) via a `.map` file in their npm registry. This repository contains:

- The complete `src/` directory (~1,900 files, 512,000+ lines of TypeScript)
- Build shims and stubs to make it runnable from source
- A one-click setup script

**Source authenticity**: Verified by comparing all 1,902 source files against `@anthropic-ai/claude-code@2.1.88`'s source map — **100% byte-identical match, zero differences.**

### Tech Stack

| Component | Technology |
|---|---|
| Runtime | Bun |
| Language | TypeScript |
| Terminal UI | React + Ink |
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
└── ...
```

---

## Status

| Feature | Status | Notes |
|---|---|---|
| `--version` / `--help` | Working | |
| `-p` non-interactive mode | Working | Full API call + tool use |
| Third-party proxy support | Working | Set `ANTHROPIC_BASE_URL` |
| Interactive TUI | WIP | See below |

### Why the TUI doesn't fully work yet

The leak only contains the `src/` directory — raw TypeScript source before compilation. Running it from source requires reverse-engineering the build infrastructure that Anthropic didn't ship:

| Missing piece | What it is | Our workaround |
|---|---|---|
| `bun:bundle` | Compile-time feature flag API (dead code elimination) | Runtime shim returning `false` for all flags |
| `MACRO.*` | Build-time constant injection (`MACRO.VERSION` etc.) | Global variable definition in preload |
| `package.json` | Dependency declarations (94 packages) | Reverse-engineered from import statements |
| Private npm packages | `@anthropic-ai/sandbox-runtime`, `@ant/*`, `@anthropic-ai/mcpb` | Empty stub modules with fake exports |
| Generated files | `coreTypes.generated.ts` etc. (built by internal scripts) | Manually created type stubs |
| Feature-gated files | Files deleted at compile time (`connectorText.ts`, `TungstenTool/*`) | Empty stub files |

The interactive TUI uses a **custom fork of Ink** (React terminal renderer) with 140+ components. Most rendering works, but some components depend on stubbed packages that return empty/no-op values, causing subtle rendering issues.

**We're actively reverse-engineering the remaining pieces.** PRs welcome.

---

## Troubleshooting

### "API Error: 400 ... invalid beta flag"

Your proxy doesn't support Claude beta headers. The code auto-disables betas for non-Anthropic URLs, but you can also set:

```bash
export CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1
export DISABLE_INTERLEAVED_THINKING=1
```

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

### Stuck / no output in non-interactive mode

Always pipe `/dev/null` to stdin:

```bash
bun src/entrypoints/cli.tsx -p "hello" < /dev/null
```

---

## Disclaimer

This repository archives source code that was leaked from Anthropic's npm registry. All original source code is the property of [Anthropic](https://www.anthropic.com).
