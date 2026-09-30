#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run(cmd, options = {}) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', ...options });
}

function runQuiet(cmd) {
  return execSync(cmd, { encoding: 'utf-8' }).trim();
}

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version;

const arg = process.argv[2];
if (!arg) {
  console.log(`Current version: ${currentVersion}`);
  console.log('Usage: npm run release <patch|minor|major|x.y.z>');
  process.exit(1);
}

// Calculate target version
let nextVersion = arg;
const [major, minor, patch] = currentVersion.split('.').map(Number);
if (arg === 'patch') nextVersion = `${major}.${minor}.${patch + 1}`;
else if (arg === 'minor') nextVersion = `${major}.${minor + 1}.0`;
else if (arg === 'major') nextVersion = `${major + 1}.0.0`;

if (!/^\d+\.\d+\.\d+.*$/.test(nextVersion)) {
  console.error(`Invalid version format: ${nextVersion}`);
  process.exit(1);
}

console.log(`Preparing release: v${currentVersion} -> v${nextVersion}`);

// 1. Verify working git tree
const status = runQuiet('git status --porcelain');
if (status) {
  console.error('Working directory has uncommitted changes. Please commit or stash first:');
  console.error(status);
  process.exit(1);
}

// 2. Run unit tests
console.log('\nRunning unit tests...');
run('npm run test');

// 3. Run build verification
console.log('\nVerifying production build...');
run('npm run build');

// 4. Update package.json & package-lock.json
pkg.version = nextVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

const lockPath = path.join(rootDir, 'package-lock.json');
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  lock.version = nextVersion;
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = nextVersion;
  }
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
}

// 5. Update src/config/version.ts & index.html if they exist
const versionTsPath = path.join(rootDir, 'src', 'config', 'version.ts');
if (fs.existsSync(versionTsPath)) {
  fs.writeFileSync(versionTsPath, `export const APP_VERSION = '${nextVersion}';\n`);
}

const indexPath = path.join(rootDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let indexHtml = fs.readFileSync(indexPath, 'utf8');
  indexHtml = indexHtml.replace(/v\d+\.\d+\.\d+\s*•\s*Loading\.\.\./, `v${nextVersion} • Loading...`);
  fs.writeFileSync(indexPath, indexHtml);
}

// 6. Update tauri.conf.json & Cargo.toml if they exist
const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  tauriConf.version = nextVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
}

const cargoTomlPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
if (fs.existsSync(cargoTomlPath)) {
  let cargo = fs.readFileSync(cargoTomlPath, 'utf8');
  cargo = cargo.replace(/^version\s*=\s*"[^"]+"/m, `version = "${nextVersion}"`);
  fs.writeFileSync(cargoTomlPath, cargo);
}

// 7. Commit & tag
console.log('\nCommitting version bump and creating git tag...');
run(`git add package.json package-lock.json src/config/version.ts index.html src-tauri/tauri.conf.json src-tauri/Cargo.toml`);
run(`git commit -m "chore(release): v${nextVersion}"`);
run(`git tag -a v${nextVersion} -m "Release v${nextVersion}"`);

console.log(`\nSuccessfully prepared release v${nextVersion}!`);
console.log('Next steps:');
console.log('  1. Push commits and tag to GitHub:');
console.log(`     git push origin main --tags`);
console.log('  2. GitHub Actions will automatically compile SCRCD and publish the release with assets.');
