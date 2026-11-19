import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('..', import.meta.url)));
const config = path.join(root, '.gitleaks.toml');
const manifest = JSON.parse(readFileSync(new URL('./security-tools.json', import.meta.url), 'utf8')).gitleaks;
const findingsExit = 23;
class CheckFailure extends Error {}
const fail = message => { throw new CheckFailure(message); };
function within(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
function directory(...parts) {
  let current = root;
  for (const part of parts) {
    if (!part || part === '..' || /[/\\:]/.test(part)) fail('Unsafe tool directory.');
    current = path.join(current, part);
    if (!existsSync(current)) mkdirSync(current);
    const stat = lstatSync(current);
    if (!stat.isDirectory() || stat.isSymbolicLink() || !within(realpathSync(current), root)) fail('Tool directory must stay inside the workspace.');
  }
  return current;
}
function regularFile(file) {
  if (!within(path.resolve(file), root)) fail('Managed file is outside the workspace.');
  if (!existsSync(file)) return;
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || !within(realpathSync(file), root)) fail('Managed file must be a single regular local file.');
}
function run(command, args, cwd = root, encoding = 'utf8') {
  const result = spawnSync(command, args, { cwd, encoding, windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.signal || result.status === null) fail('A privacy-check tool could not run; raw output is suppressed.');
  return result;
}
function git(args, cwd = root) {
  const result = run('git', args, cwd);
  if (result.status !== 0) fail('Git inspection failed; raw output is suppressed.');
  return result.stdout;
}
const privateSegment = /(^|\/)(private|local-data|user-data|node_modules|target|dist|test-results|playwright-report|coverage|\.git|\.aws|\.codex|\.agents)(\/|$)/i;
const sensitiveExtension = /\.(?:db(?:-.*)?|sqlite(?:3)?(?:-.*)?|eml|msg|pdf|docx?|log|pem|key|p12|pfx|keystore|exe|dll|dylib|so|app|msi|dmg|pkg|zip|tar|gz|7z|rar)$/i;
function forbidden(file, mode = '100644') {
  const normalized = file.replaceAll('\\', '/');
  const name = path.posix.basename(normalized);
  return !['100644', '100755'].includes(mode) || privateSegment.test(normalized) || sensitiveExtension.test(name)
    || /^\.env(?:\..*)?$/i.test(name) && name !== '.env.example'
    || /^(?:credentials|secrets).*\.json$/i.test(name)
    || normalized.startsWith('/') || normalized.split('/').includes('..') || /[\x00-\x1f\x7f:]/.test(normalized) || file.includes('\\');
}
function historyBoundary(cwd = root) {
  const trees = new Set(git(['log', '--all', '--format=%T'], cwd).trim().split(/\r?\n/).filter(Boolean));
  const blocked = new Set();
  for (const tree of trees) {
    if (!/^[a-f0-9]{40,64}$/.test(tree)) fail('Git history inspection failed.');
    for (const entry of git(['ls-tree', '-r', '-z', '--full-tree', tree], cwd).split('\0').filter(Boolean)) {
      const tab = entry.indexOf('\t');
      if (tab < 0) fail('Git history inspection failed.');
      const mode = entry.slice(0, tab).split(' ')[0];
      const file = entry.slice(tab + 1);
      if (forbidden(file, mode)) blocked.add(file);
    }
  }
  return blocked.size;
}
function trackedEntries(cwd = root) {
  return git(['ls-files', '--stage', '-z'], cwd).split('\0').filter(Boolean).map(entry => {
    const tab = entry.indexOf('\t');
    const [mode, object, stage] = entry.slice(0, tab).split(' ');
    if (tab < 0 || stage !== '0' || !/^[a-f0-9]{40,64}$/.test(object)) fail('Resolve tracked merge entries before scanning.');
    return { mode, object, file: entry.slice(tab + 1) };
  });
}
function publicFiles() {
  const entries = trackedEntries();
  const blocked = entries.filter(entry => forbidden(entry.file, entry.mode));
  if (blocked.length) fail(`Public-file boundary rejected ${blocked.length} tracked entries. No filenames or contents are printed.`);
  for (const example of ['private/report.json', 'local-data/m0.sqlite3', 'frontend/dist/index.html', 'backend/target/app.exe', 'backend/gen/schemas/desktop-schema.json', 'test-results/.last-run.json', '.env', '.env.local', 'source.eml', 'original.pdf', 'credentials.json']) {
    const result = run('git', ['check-ignore', '--no-index', '--quiet', '--', example]);
    if (result.status !== 0) fail('A required private/generated ignore rule is missing.');
  }
  return entries;
}

async function prepareTool() {
  const asset = manifest.assets[`${process.platform}-${process.arch}`];
  const expectedName = `gitleaks_${manifest.version}_${process.platform === 'win32' ? 'windows' : 'darwin'}_${process.arch === 'arm64' ? 'arm64' : 'x64'}.${process.platform === 'win32' ? 'zip' : 'tar.gz'}`;
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version) || !asset || asset.name !== expectedName || !/^[a-f0-9]{64}$/.test(asset.sha256)) fail('No valid pinned scanner for this OS/CPU.');
  const toolDir = directory('private', 'security-check', 'tools', manifest.version, `${process.platform}-${process.arch}`);
  const archive = path.join(toolDir, asset.name);
  regularFile(archive);
  if (!existsSync(archive)) {
    const url = `https://github.com/gitleaks/gitleaks/releases/download/v${manifest.version}/${asset.name}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) fail('Pinned scanner download failed.');
    const bytes = Buffer.from(await response.arrayBuffer());
    verifyArchive(bytes, asset.sha256);
    writeFileSync(archive, bytes, { flag: 'wx' });
  }
  verifyArchive(readFileSync(archive), asset.sha256);
  const binaryName = process.platform === 'win32' ? 'gitleaks.exe' : 'gitleaks';
  const list = run('tar', ['-tf', archive]);
  if (list.status !== 0 || list.stdout.split(/\r?\n/).filter(name => name === binaryName).length !== 1) fail('Scanner archive layout is unexpected.');
  const detail = run('tar', ['-tvf', archive, binaryName]);
  if (detail.status !== 0 || !detail.stdout.trimStart().startsWith('-')) fail('Scanner entry is not a regular file.');
  const binary = path.join(toolDir, binaryName);
  regularFile(binary);
  if (run('tar', ['-xf', archive, '-C', toolDir, binaryName]).status !== 0) fail('Scanner extraction failed.');
  regularFile(binary);
  if (!existsSync(binary)) fail('Scanner binary is missing.');
  if (process.platform !== 'win32') chmodSync(binary, 0o700);
  const version = run(binary, ['version']);
  if (version.status !== 0 || version.stdout.trim().replace(/^v/, '') !== manifest.version) fail('Scanner version does not match the pin.');
  return binary;
}
function verifyArchive(bytes, expected) {
  if (createHash('sha256').update(bytes).digest('hex') !== expected) fail('Scanner archive checksum mismatch; nothing was executed.');
}

function scanner(binary, kind, source, report) {
  regularFile(report);
  const result = run(binary, [kind, source, '--no-banner', '--redact=100', '--exit-code', String(findingsExit), '--config', config,
    '--report-format', 'json', '--report-path', report, ...(kind === 'git' ? ['--log-opts=--all'] : [])]);
  // Tool stdout/stderr are intentionally never forwarded, even on failure.
  if (![0, findingsExit].includes(result.status)) fail('Credential scanner failed; raw output is suppressed.');
  const findings = existsSync(report) ? JSON.parse(readFileSync(report, 'utf8')) : [];
  if (!Array.isArray(findings) || result.status === findingsExit && findings.length === 0 || result.status === 0 && findings.length !== 0) fail('Scanner report/exit status mismatch.');
  return { status: result.status, count: findings.length };
}
function removeOwnedFixture(fixture, parent) {
  // Recursive cleanup is limited to one mkdtemp child of our verified workspace directory.
  const resolved = realpathSync(fixture);
  if (lstatSync(fixture).isSymbolicLink() || path.dirname(resolved) !== realpathSync(parent) || !within(resolved, root) || !/^(?:snapshot|seed)-/.test(path.basename(resolved))) fail('Refusing unsafe temporary cleanup.');
  rmSync(resolved, { recursive: true });
}
function scanSnapshot(binary, entries, fixtureRoot, report, kind, cwd = root) {
  const sourceRoot = realpathSync(cwd);
  const snapshot = mkdtempSync(path.join(fixtureRoot, 'snapshot-'));
  try {
    for (const { file, object } of entries) {
      if (forbidden(file)) fail('Unsafe snapshot entry.');
      const destination = path.resolve(snapshot, file);
      if (!within(destination, snapshot)) fail('Unsafe snapshot destination.');
      if (kind === 'index') {
        const result = run('git', ['cat-file', 'blob', object], cwd, null);
        if (result.status !== 0) fail('Git index blob inspection failed.');
        mkdirSync(path.dirname(destination), { recursive: true }); writeFileSync(destination, result.stdout);
      } else {
        const source = path.resolve(sourceRoot, file);
        if (!existsSync(source)) continue;
        if (!within(source, sourceRoot) || !within(realpathSync(source), sourceRoot) || lstatSync(source).isSymbolicLink() || !lstatSync(source).isFile()) fail('Tracked snapshot source is not a regular workspace file.');
        mkdirSync(path.dirname(destination), { recursive: true }); copyFileSync(source, destination);
      }
    }
    return scanner(binary, 'dir', snapshot, report);
  } finally { removeOwnedFixture(snapshot, fixtureRoot); }
}
function selfTest(binary, fixtureRoot, reports) {
  const original = Buffer.from('synthetic archive integrity fixture');
  const digest = createHash('sha256').update(original).digest('hex');
  verifyArchive(original, digest);
  const changed = Buffer.from(original); changed[0] ^= 1;
  let rejected = false;
  try { verifyArchive(changed, digest); } catch (error) { rejected = error instanceof CheckFailure; }
  if (!rejected) fail('Tampered archive self-test failed.');
  for (const name of ['private/fixture.txt', '.env', 'sample.eml', 'resume.pdf', 'm0.sqlite3', 'key.pem', 'output.log']) {
    if (!forbidden(name)) fail('Private-file policy self-test failed.');
  }
  if (forbidden('frontend/src/App.tsx') || forbidden('.env.example') || !forbidden('linked-source', '120000')) fail('Public-file policy self-test failed.');
  const fixture = mkdtempSync(path.join(fixtureRoot, 'seed-'));
  try {
    const empty = path.join(fixture, 'empty-template'); mkdirSync(empty);
    git(['init', '--quiet', '--template', empty], fixture);
    const commit = () => {
      git(['add', '--', 'sample.txt'], fixture);
      git(['-c', 'user.name=M0 Scanner Test', '-c', 'user.email=m0-scanner@example.invalid', '-c', 'commit.gpgsign=false', '-c', `core.hooksPath=${empty}`, 'commit', '--quiet', '-m', 'synthetic detector test'], fixture);
    };
    writeFileSync(path.join(fixture, 'sample.txt'), 'const sample = "clean synthetic source";\n'); commit();
    if (scanner(binary, 'git', fixture, path.join(reports, 'self-clean.json')).status !== 0) fail('Clean scanner fixture was rejected.');
    // Construct an unissued, high-entropy token shape only at runtime. Never log it.
    const suffix = createHash('sha256').update('m0-unissued-detector-fixture').digest('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 36);
    const syntheticToken = ['gh', 'p_'].join('') + suffix;
    const tokenSource = `const token = "${syntheticToken}";\n`;
    writeFileSync(path.join(fixture, 'sample.txt'), tokenSource);
    git(['add', '--', 'sample.txt'], fixture);
    writeFileSync(path.join(fixture, 'sample.txt'), 'const sample = "clean working file";\n');
    const stagedReport = path.join(reports, 'self-index.json');
    if (scanSnapshot(binary, trackedEntries(fixture), fixtureRoot, stagedReport, 'index', fixture).status !== findingsExit) fail('Staged credential self-test failed.');
    if (readFileSync(stagedReport, 'utf8').includes(syntheticToken)) fail('Scanner report redaction self-test failed.');
    if (scanSnapshot(binary, trackedEntries(fixture), fixtureRoot, path.join(reports, 'self-working-clean.json'), 'working', fixture).status !== 0) fail('Clean working snapshot self-test failed.');
    writeFileSync(path.join(fixture, 'sample.txt'), tokenSource); commit();
    const seededReport = path.join(reports, 'self-seeded.json');
    if (scanner(binary, 'git', fixture, seededReport).status !== findingsExit) fail('Synthetic credential was not detected.');
    if (readFileSync(seededReport, 'utf8').includes(syntheticToken)) fail('Scanner report redaction self-test failed.');
    if (historyBoundary(fixture) !== 0) fail('Clean historical file-boundary fixture failed.');
    const forbiddenFile = path.join(fixture, 'fixture.sqlite3');
    writeFileSync(forbiddenFile, 'synthetic path fixture, not a real database');
    git(['add', '--force', '--', 'fixture.sqlite3'], fixture);
    git(['-c', 'user.name=M0 Scanner Test', '-c', 'user.email=m0-scanner@example.invalid', '-c', 'commit.gpgsign=false', '-c', `core.hooksPath=${empty}`, 'commit', '--quiet', '-m', 'synthetic forbidden-path fixture'], fixture);
    unlinkSync(forbiddenFile);
    git(['add', '--update', '--', 'fixture.sqlite3'], fixture);
    git(['-c', 'user.name=M0 Scanner Test', '-c', 'user.email=m0-scanner@example.invalid', '-c', 'commit.gpgsign=false', '-c', `core.hooksPath=${empty}`, 'commit', '--quiet', '-m', 'remove synthetic forbidden-path fixture'], fixture);
    if (historyBoundary(fixture) !== 1) fail('Deleted historical private-file fixture was not rejected.');
    console.log('PASS tampered archive rejection, staged/history credential detection and redaction, clean working fixture, and current/deleted historical private-file self-tests.');
  } finally { removeOwnedFixture(fixture, fixtureRoot); }
}

async function main() {
  const options = process.argv.slice(2);
  if (options.some(option => option !== '--self-test') || new Set(options).size !== options.length) fail('Usage: npm run check:privacy -- [--self-test]');
  if (realpathSync(git(['rev-parse', '--show-toplevel']).trim()) !== root) fail('Run from the project Git checkout.');
  if (git(['rev-parse', '--is-shallow-repository']).trim() !== 'false') fail('Full Git history is required; fetch the complete checkout before scanning.');
  const entries = publicFiles();
  const historicalBlocked = historyBoundary();
  if (historicalBlocked) fail(`Public-file boundary rejected ${historicalBlocked} historical paths, including deleted files. No names or contents are printed.`);
  const reports = directory('private', 'security-check', 'reports');
  const fixtureRoot = directory('private', 'security-check', 'fixtures');
  const binary = await prepareTool();
  console.log(`Pinned Gitleaks ${manifest.version}: archive SHA256 and executable version verified.`);
  if (options.includes('--self-test')) selfTest(binary, fixtureRoot, reports);
  const history = scanner(binary, 'git', root, path.join(reports, 'history.json'));
  const index = scanSnapshot(binary, entries, fixtureRoot, path.join(reports, 'index.json'), 'index');
  const current = scanSnapshot(binary, entries, fixtureRoot, path.join(reports, 'tracked.json'), 'working');
  console.log(`Public tracked-file boundary: ${entries.length} entries passed. History findings: ${history.count}; index findings: ${index.count}; working snapshot findings: ${current.count}.`);
  if (history.count || index.count || current.count) {
    process.exitCode = 1;
    console.error('Credential findings require review. Only redacted local reports under private/security-check/reports were written; raw values are not printed or uploaded.');
  } else console.log('PASS credential scan. This does not prove absence of all personal information; review public changes and OS artifacts separately.');
}
try { await main(); } catch (error) {
  // Unexpected platform/tool exceptions may contain paths or source; do not dump them.
  process.exitCode = 1;
  console.error(error instanceof CheckFailure
    ? error.message : 'Privacy check could not finish. Raw tool output and exception details are suppressed.');
}
