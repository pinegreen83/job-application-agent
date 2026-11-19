import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
export const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function version(command) {
  const windowsNpm = process.platform === 'win32' && command === npmCommand;
  // npm.cmd needs cmd.exe on Windows; this is a fixed command without user args.
  const result = spawnSync(windowsNpm ? 'npm.cmd --version' : command, windowsNpm ? [] : ['--version'], {
    encoding: 'utf8', timeout: 15_000, cwd: repositoryRoot,
    shell: windowsNpm,
  });
  return result.status === 0 ? result.stdout.trim().split(/\r?\n/)[0] : undefined;
}

export function checkEnvironment({ native = false } = {}) {
  let failed = false;
  const report = (label, valid, detail, required = true) => {
    console.log(`${valid ? 'OK' : required ? 'FAIL' : 'NOTE'} ${label}: ${detail}`);
    if (!valid && required) failed = true;
  };
  const recommended = readFileSync(new URL('../.node-version', import.meta.url), 'utf8').trim();
  const [major, minor] = process.versions.node.split('.').map(Number);
  report('Node', major > 22 || (major === 22 && minor >= 12), process.versions.node);
  report('shared Node version', process.versions.node === recommended, `recommended ${recommended}`, false);
  const npm = version(npmCommand);
  report('npm', Boolean(npm && Number.parseInt(npm, 10) >= 10), npm ?? 'not found; install npm >=10');
  const git = version('git');
  report('Git', Boolean(git), git ?? 'not found');
  for (const tool of ['rustc', 'cargo']) {
    const found = version(tool);
    report(tool, Boolean(found), found ?? 'not found; required for native Tauri development', native);
  }
  report('native host', ['win32', 'darwin'].includes(process.platform), `${process.platform}/${process.arch}; Windows/macOS are product targets`, native);
  console.log('Native checks do not prove MSVC/SDK/WebView2 or Xcode availability, CLI policy permission, compilation, or app startup. See docs/DEVELOPMENT.md.');
  console.log('No credentials, account tokens, environment dumps, or personal files are inspected.');
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const unknown = process.argv.slice(2).filter(arg => arg !== '--native');
  if (unknown.length) {
    console.error('Usage: node scripts/doctor.mjs [--native]');
    process.exitCode = 2;
  } else process.exitCode = checkEnvironment({ native: process.argv.includes('--native') });
}
