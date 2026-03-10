#!/usr/bin/env node

/**
 * Script to publish FleetForge libraries to NPM
 * Usage: node tools/scripts/publish-libs.js [--dry-run]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LIBS_TO_PUBLISH = [
  'core',
  'mqtt-client',
  'ota-client',
  'sdk',
  'security',
  'telemetry',
];

const isDryRun = process.argv.includes('--dry-run');

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}${message}${reset}`);
}

function exec(command, cwd) {
  try {
    return execSync(command, { cwd, stdio: 'inherit' });
  } catch (error) {
    log(`Error executing: ${command}`, 'error');
    throw error;
  }
}

function publishLib(libName) {
  const libPath = path.join(__dirname, '../../libs', libName);
  const distPath = path.join(__dirname, '../../dist/libs', libName);

  log(`\n📦 Publishing @fleetforge/${libName}...`, 'info');

  // Check if dist exists
  if (!fs.existsSync(distPath)) {
    log(`❌ Build output not found for ${libName}. Run 'npm run build' first.`, 'error');
    return false;
  }

  // Copy package.json to dist
  const packageJsonPath = path.join(libPath, 'package.json');
  const distPackageJsonPath = path.join(distPath, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    fs.copyFileSync(packageJsonPath, distPackageJsonPath);
  }

  // Copy README if exists
  const readmePath = path.join(libPath, 'README.md');
  const distReadmePath = path.join(distPath, 'README.md');

  if (fs.existsSync(readmePath)) {
    fs.copyFileSync(readmePath, distReadmePath);
  }

  // Publish
  const publishCommand = isDryRun
    ? 'npm publish --dry-run --access public'
    : 'npm publish --access public';

  try {
    exec(publishCommand, distPath);
    log(`✅ Successfully published @fleetforge/${libName}`, 'success');
    return true;
  } catch (error) {
    log(`❌ Failed to publish @fleetforge/${libName}`, 'error');
    return false;
  }
}

function main() {
  log('🚀 FleetForge Library Publisher', 'info');
  log(`Mode: ${isDryRun ? 'DRY RUN' : 'PRODUCTION'}`, 'warning');

  if (!isDryRun) {
    log('\n⚠️  This will publish libraries to NPM. Continue? (Ctrl+C to cancel)', 'warning');
    // Wait 3 seconds
    execSync('sleep 3');
  }

  // Build all libraries first
  log('\n🔨 Building all libraries...', 'info');
  exec('npm run build', path.join(__dirname, '../..'));

  // Publish each library
  const results = LIBS_TO_PUBLISH.map((lib) => ({
    lib,
    success: publishLib(lib),
  }));

  // Summary
  log('\n📊 Publication Summary:', 'info');
  results.forEach(({ lib, success }) => {
    const status = success ? '✅' : '❌';
    log(`${status} @fleetforge/${lib}`, success ? 'success' : 'error');
  });

  const successCount = results.filter((r) => r.success).length;
  log(`\n${successCount}/${LIBS_TO_PUBLISH.length} libraries published successfully`, 'info');

  if (successCount < LIBS_TO_PUBLISH.length) {
    process.exit(1);
  }
}

main();

