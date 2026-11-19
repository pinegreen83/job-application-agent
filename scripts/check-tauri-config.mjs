import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import Ajv from 'ajv';

const require = createRequire(import.meta.url);
const schemaPath = require.resolve('@tauri-apps/cli/config.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
const config = JSON.parse(readFileSync(new URL('../backend/tauri.conf.json', import.meta.url), 'utf8'));
// The upstream schema has Rust-style escaped quotes in a pattern, incompatible
// with JavaScript's Unicode regexp flag. Keep the pattern with legacy JS parsing.
const validate = new Ajv({ strict: false, unicodeRegExp: false, validateFormats: false, allErrors: true }).compile(schema);
if (!validate(config)) {
  console.error(validate.errors);
  process.exitCode = 1;
} else {
  for (const icon of config.bundle.icon) {
    if (!existsSync(new URL(`../backend/${icon}`, import.meta.url))) throw new Error(`Missing icon: ${icon}`);
  }
  console.log('Tauri configuration structure/patterns match the installed CLI schema; icon paths exist. URI formats, native compilation and IPC enforcement remain unverified.');
}
