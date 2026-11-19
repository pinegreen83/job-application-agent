import { spawnSync } from 'node:child_process';
import { checkEnvironment, npmCommand, repositoryRoot } from './doctor.mjs';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--tests')) {
  console.error('Usage: node scripts/setup.mjs [--tests]');
  process.exit(2);
}
if (checkEnvironment() !== 0) process.exit(1);

function run(command, commandArgs) {
  console.log(`\nRunning ${command === process.execPath ? 'node' : command} ${commandArgs.join(' ')}`);
  const windowsNpm = process.platform === 'win32' && command === npmCommand;
  const result = spawnSync(windowsNpm ? [npmCommand, ...commandArgs].join(' ') : command, windowsNpm ? [] : commandArgs, {
    cwd: repositoryRoot, stdio: 'inherit',
    shell: windowsNpm,
  });
  if (result.error || result.status !== 0) {
    console.error('Setup stopped. Resolve the command failure and retry; existing source and Git state were not reset.');
    process.exit(result.status || 1);
  }
}

// All command arguments are fixed here, never constructed from user text.
// npm ci only replaces generated node_modules; it does not alter source or locks.
run(npmCommand, ['ci']);
run(npmCommand, ['run', 'build']);
if (args.includes('--tests')) {
  run(process.execPath, ['node_modules/playwright/cli.js', 'install', 'chromium']);
  run(npmCommand, ['test']);
}
console.log('\nFrontend setup complete. Start with npm run dev. Native app validation remains separate.');
