#!/usr/bin/env node
/**
 * Start Claude Code - One-click setup script
 *
 * This script handles everything needed to run Claude Code from leaked source:
 * 1. Check/install Bun runtime
 * 2. Install npm dependencies
 * 3. Create stub modules for Anthropic private packages
 * 4. Create missing generated/feature-gated files
 * 5. Download ripgrep binaries from official npm package
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, chmodSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

const log = (msg) => console.log(`\x1b[36m[setup]\x1b[0m ${msg}`);
const ok = (msg) => console.log(`\x1b[32m  ✓\x1b[0m ${msg}`);
const warn = (msg) => console.log(`\x1b[33m  !\x1b[0m ${msg}`);
const err = (msg) => console.error(`\x1b[31m  ✗\x1b[0m ${msg}`);

// ─── Step 1: Check Bun ───────────────────────────────────────────────
log('Checking Bun runtime...');

const bunPath = join(process.env.HOME, '.bun', 'bin', 'bun');
let hasBun = false;
try {
  const result = spawnSync('bun', ['--version'], { encoding: 'utf8' });
  if (result.status === 0) {
    ok(`Bun ${result.stdout.trim()} found`);
    hasBun = true;
  }
} catch {}

if (!hasBun) {
  try {
    const result = spawnSync(bunPath, ['--version'], { encoding: 'utf8' });
    if (result.status === 0) {
      ok(`Bun ${result.stdout.trim()} found at ${bunPath}`);
      hasBun = true;
    }
  } catch {}
}

if (!hasBun) {
  log('Installing Bun...');
  try {
    execSync('curl -fsSL https://bun.sh/install | bash', { stdio: 'inherit' });
    ok('Bun installed');
  } catch {
    err('Failed to install Bun. Please install manually: https://bun.sh');
    process.exit(1);
  }
}

// Find bun binary
const BUN = (() => {
  try { execSync('bun --version', { stdio: 'pipe' }); return 'bun'; } catch {}
  if (existsSync(bunPath)) return bunPath;
  err('Cannot find bun binary');
  process.exit(1);
})();

// ─── Step 2: Install dependencies ────────────────────────────────────
log('Installing dependencies...');
try {
  execSync(`${BUN} install`, { cwd: ROOT, stdio: 'inherit' });
  ok('Dependencies installed');
} catch (e) {
  err('Failed to install dependencies');
  process.exit(1);
}

// ─── Step 3: Create stub modules for private packages ────────────────
log('Creating stub modules for Anthropic private packages...');

const stubs = {
  '@anthropic-ai/mcpb': 'export default {};',

  '@anthropic-ai/sandbox-runtime': `
export class SandboxManager {
  static initialize() { return Promise.resolve(); }
  static isSandboxingEnabled() { return false; }
  static getSandboxUnavailableReason() { return undefined; }
  static isSandboxRequired() { return false; }
  static checkDependencies() { return Promise.resolve({ satisfied: true }); }
  static isSupportedPlatform() { return false; }
  static wrapWithSandbox(cmd, args, opts) { return { cmd, args, opts }; }
  static updateConfig() {}
  static reset() { return Promise.resolve(); }
  static getFsReadConfig() { return undefined; }
  static getFsWriteConfig() { return undefined; }
  static getNetworkRestrictionConfig() { return undefined; }
  static getIgnoreViolations() { return undefined; }
  static getAllowUnixSockets() { return false; }
  static getAllowLocalBinding() { return false; }
  static getEnableWeakerNestedSandbox() { return false; }
  static getProxyPort() { return undefined; }
  static getSocksProxyPort() { return undefined; }
  static getLinuxHttpSocketPath() { return undefined; }
  static getLinuxSocksSocketPath() { return undefined; }
  static waitForNetworkInitialization() { return Promise.resolve(); }
  static getSandboxViolationStore() { return new SandboxViolationStore(); }
  static annotateStderrWithSandboxFailures(stderr) { return stderr; }
  static cleanupAfterCommand() {}
}
export const SandboxRuntimeConfigSchema = { parse: (v) => v };
export class SandboxViolationStore {
  getViolations() { return []; }
  clear() {}
}
export default { SandboxManager, SandboxRuntimeConfigSchema, SandboxViolationStore };
`,

  '@ant/computer-use-mcp': `
export const API_RESIZE_PARAMS = {};
export const targetImageSize = () => ({});
export const buildComputerUseTools = () => [];
export const createComputerUseMcpServer = () => ({});
export const bindSessionContext = () => ({});
export const DEFAULT_GRANT_FLAGS = {};
export default {};
`,

  '@ant/computer-use-swift': 'export default {};',

  '@ant/claude-for-chrome-mcp': `
export const BROWSER_TOOLS = [];
export const createClaudeForChromeMcpServer = () => ({});
export default {};
`,

  '@alcalzone/ansi-tokenize': `
export const ansiCodesToString = () => '';
export const diffAnsiCodes = () => ({});
export const styledCharsFromTokens = () => [];
export const tokenize = () => [];
export const reduceAnsiCodes = () => ({});
export const undoAnsiCodes = () => ({});
export default {};
`,

  'color-diff-napi': `
export const ColorDiff = {};
export const ColorFile = {};
export const getSyntaxTheme = () => ({});
export default {};
`,

  'modifiers-napi': 'module.exports = {};',
  'audio-capture-napi': 'export default {};',
  'image-processor-napi': 'export default {};',
  'url-handler-napi': 'export default {};',
};

for (const [pkg, content] of Object.entries(stubs)) {
  const dir = join(ROOT, 'node_modules', pkg);
  if (existsSync(join(dir, 'package.json')) && !readFileSync(join(dir, 'package.json'), 'utf8').includes('stub')) {
    continue; // Real package exists, skip
  }
  mkdirSync(dir, { recursive: true });
  const isCommonJS = content.startsWith('module.exports');
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: pkg, version: '0.0.0-stub', main: 'index.js',
    type: isCommonJS ? 'commonjs' : 'module'
  }));
  writeFileSync(join(dir, 'index.js'), content.trim() + '\n');
  ok(`Stubbed: ${pkg}`);
}

// ─── Step 4: Create missing source files ─────────────────────────────
log('Creating missing source files (generated/feature-gated)...');

const missingFiles = {
  // Generated types (normally created by build scripts)
  'src/entrypoints/sdk/coreTypes.generated.ts': (() => {
    // Read coreSchemas to generate type stubs
    const schemasPath = join(SRC, 'entrypoints/sdk/coreSchemas.ts');
    if (!existsSync(schemasPath)) return '// stub\nexport default {};\n';
    const content = readFileSync(schemasPath, 'utf8');
    const schemas = [...content.matchAll(/export const (\w+Schema)\b/g)]
      .map(m => m[1])
      .filter(s => !s.startsWith('HOOK'));
    return schemas.map(s => `export type ${s.replace(/Schema$/, '')} = any;`).join('\n') + '\n';
  })(),

  'src/entrypoints/sdk/settingsTypes.generated.ts':
    'export type Settings = Record<string, unknown>;\n',

  'src/entrypoints/sdk/runtimeTypes.ts':
    'export default {};\n',

  'src/entrypoints/sdk/toolTypes.ts':
    'export default {};\n',

  // Feature-gated files (removed at compile time, not in source map)
  'src/types/connectorText.ts': `
export type ConnectorTextBlock = { type: 'connector_text'; text: string };
export type ConnectorTextDelta = { type: 'connector_text_delta'; text: string };
export function isConnectorTextBlock(_block: unknown): _block is ConnectorTextBlock { return false; }
export function connectorTextBlockCount(_blocks: unknown[]): number { return 0; }
`,

  'src/utils/filePersistence/types.ts': `
export const DEFAULT_UPLOAD_CONCURRENCY = 5;
export const FILE_COUNT_LIMIT = 100;
export const OUTPUTS_SUBDIR = 'outputs';
export type FilesPersistedEventData = Record<string, unknown>;
export type PersistedFile = { path: string; content: string };
export type TurnStartTime = number;
export default {};
`,

  'src/tools/TungstenTool/TungstenTool.ts':
    "export const TungstenTool: any = { name: 'Tungsten' };\nexport default {};\n",

  'src/tools/WorkflowTool/constants.ts':
    'export default {};\n',

  'src/tools/TungstenTool/TungstenLiveMonitor.ts':
    'export default {};\n',

  'src/utils/ultraplan/prompt.txt.ts':
    'export default {};\n',

  'src/ink/global.d.ts':
    'export default {};\n',

  'src/skills/bundled/verify/examples/cli.md': '',
  'src/skills/bundled/verify/examples/server.md': '',
  'src/skills/bundled/verify/SKILL.md': '',
};

for (const [file, content] of Object.entries(missingFiles)) {
  const fullPath = join(ROOT, file);
  if (!existsSync(fullPath)) {
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content.trim() ? content.trim() + '\n' : '');
    ok(`Created: ${file}`);
  }
}

// ─── Step 5: Download ripgrep from official npm package ──────────────
log('Setting up ripgrep...');

const rgVendorDir = join(SRC, 'utils/vendor/ripgrep');
if (!existsSync(rgVendorDir)) {
  try {
    const tmpDir = join(ROOT, '.tmp-rg-setup');
    mkdirSync(tmpDir, { recursive: true });
    execSync(`npm pack @anthropic-ai/claude-code --pack-destination ${tmpDir}`, {
      cwd: tmpDir, stdio: 'pipe'
    });
    const tgz = execSync(`ls ${tmpDir}/anthropic-ai-claude-code-*.tgz`, { encoding: 'utf8' }).trim();
    execSync(`tar -xzf ${tgz} -C ${tmpDir}`, { stdio: 'pipe' });

    const srcRg = join(tmpDir, 'package/vendor/ripgrep');
    if (existsSync(srcRg)) {
      mkdirSync(dirname(rgVendorDir), { recursive: true });
      cpSync(srcRg, rgVendorDir, { recursive: true });
      // Make executables
      for (const platform of ['arm64-darwin', 'x64-darwin', 'arm64-linux', 'x64-linux']) {
        const rgBin = join(rgVendorDir, platform, 'rg');
        if (existsSync(rgBin)) chmodSync(rgBin, 0o755);
      }
      for (const platform of ['arm64-win32', 'x64-win32']) {
        const rgBin = join(rgVendorDir, platform, 'rg.exe');
        if (existsSync(rgBin)) chmodSync(rgBin, 0o755);
      }
      ok('Ripgrep binaries installed');
    }

    // Cleanup
    execSync(`rm -rf ${tmpDir}`, { stdio: 'pipe' });
  } catch (e) {
    warn(`Could not download ripgrep: ${e.message}`);
    warn('Grep/search features may not work. Install rg manually: https://github.com/BurntSushi/ripgrep');
  }
} else {
  ok('Ripgrep already set up');
}

// ─── Done ────────────────────────────────────────────────────────────
console.log('');
log('\x1b[32m Setup complete!\x1b[0m');
console.log('');
console.log('  To run Claude Code:');
console.log('');
console.log('    \x1b[1m# Set your API key\x1b[0m');
console.log('    export ANTHROPIC_API_KEY="sk-ant-xxx"');
console.log('');
console.log('    \x1b[1m# (Optional) Use a third-party proxy\x1b[0m');
console.log('    export ANTHROPIC_BASE_URL="https://your-proxy.com"');
console.log('    export DISABLE_PROMPT_CACHING=1');
console.log('');
console.log('    \x1b[1m# Interactive mode\x1b[0m');
console.log('    bun src/entrypoints/cli.tsx');
console.log('');
console.log('    \x1b[1m# Non-interactive (pipe/script) mode\x1b[0m');
console.log('    bun src/entrypoints/cli.tsx -p "your prompt" --dangerously-skip-permissions < /dev/null');
console.log('');
