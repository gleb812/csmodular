// scripts/promote-lib.js
//
// Usage:
//   node scripts/promote-lib.js [export.json] <target-lib> [status]
//
// Examples:
//   node scripts/promote-lib.js user-export.json my-lib passable
//   node scripts/promote-lib.js --from-downloads my-lib passable
//   node scripts/promote-lib.js my-lib passable            (auto: latest in ~/Downloads)
//
// Reads user-export.json (from browser export script),
// copies modules to public/libraries/<target-lib>/modules/,
// updates _index.json + _meta.json + root _index.json.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

// ── Parse args ──────────────────────────────────────────────────────
let args = process.argv.slice(2);
let fromDownloads = false;

if (args[0] === '--from-downloads') {
  fromDownloads = true;
  args = args.slice(1);
}

let exportPath = null;
let targetLib = null;
let status = 'passable';

if (fromDownloads || args.length === 2 || args.length === 1) {
  // --from-downloads <lib> [status]
  // <lib> [status]
  targetLib = args[0];
  status = args[1] || 'passable';
} else if (args.length >= 2) {
  // <export.json> <lib> [status]
  exportPath = args[0];
  targetLib = args[1];
  status = args[2] || 'passable';
}

if (!targetLib) {
  console.error('Usage:');
  console.error('  node scripts/promote-lib.js <export.json> <target-lib> [status]');
  console.error('  node scripts/promote-lib.js --from-downloads <target-lib> [status]');
  console.error('  node scripts/promote-lib.js <target-lib> [status]   (auto: latest in ~/Downloads)');
  process.exit(1);
}

if (!['stable', 'passable', 'dev', 'broken'].includes(status)) {
  console.error(`❌ Invalid status: ${status}`);
  process.exit(1);
}

// ── Resolve export path ─────────────────────────────────────────────
function findLatestInDownloads() {
  const dir = join(homedir(), 'Downloads');
  if (!existsSync(dir)) return null;

  const candidates = readdirSync(dir)
    .filter(f => /^user-export.*\.json$/i.test(f))
    .map(f => {
      const full = join(dir, f);
      return { full, mtime: statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  return candidates[0]?.full || null;
}

if (!exportPath) {
  exportPath = findLatestInDownloads();
  if (!exportPath) {
    console.error('❌ No user-export*.json in ~/Downloads/');
    console.error('   Run the export script in browser DevTools Console first.');
    process.exit(1);
  }
  console.log(`📂 Using latest from Downloads: ${basename(exportPath)}`);
}

if (!existsSync(exportPath)) {
  console.error(`❌ ${exportPath} not found`);
  process.exit(1);
}

// ── Read export ─────────────────────────────────────────────────────
const raw = JSON.parse(readFileSync(exportPath, 'utf-8'));

// Group: "user/MyMod.js" → { MyMod: { js, txt } }
const modules = new Map();
for (const [key, content] of Object.entries(raw)) {
  const m = key.match(/^[^/]+\/([^/]+)\.(js|txt)$/);
  if (!m) continue;
  const [, name, ext] = m;
  if (!modules.has(name)) modules.set(name, {});
  modules.get(name)[ext] = content;
}

if (modules.size === 0) {
  console.error('❌ No modules found in export');
  process.exit(1);
}

// ── Write files ─────────────────────────────────────────────────────
const libDir = join('public/libraries', targetLib);
const modulesDir = join(libDir, 'modules');
mkdirSync(modulesDir, { recursive: true });

let written = 0;
for (const [name, files] of modules) {
  if (files.js) {
    writeFileSync(join(modulesDir, `${name}.js`), files.js, 'utf-8');
    written++;
  }
  if (files.txt) {
    writeFileSync(join(modulesDir, `${name}.txt`), files.txt, 'utf-8');
  }
}

// ── _meta.json (if absent) ──────────────────────────────────────────
const metaPath = join(libDir, '_meta.json');
if (!existsSync(metaPath)) {
  writeFileSync(metaPath, JSON.stringify({
    name: targetLib,
    displayName: targetLib,
    author: 'unknown',
    version: '0.1.0',
    description: '',
    createdAt: new Date().toISOString(),
  }, null, 2) + '\n', 'utf-8');
  console.log(`✅ Created ${metaPath}`);
}

// ── _index.json (merge) ─────────────────────────────────────────────
const indexPath = join(libDir, '_index.json');
let index = { modules: [] };
if (existsSync(indexPath)) {
  try {
    index = JSON.parse(readFileSync(indexPath, 'utf-8'));
    index.modules = (index.modules || []).map(m =>
      typeof m === 'string' ? { name: m, displayName: m, category: 'custom', status: 'dev' } : m
    );
  } catch {
    console.warn(`⚠️  Could not parse ${indexPath}, overwriting`);
  }
}

function parseField(js, field) {
  const m = js.match(new RegExp(`${field}:\\s*['"]([^'"]+)['"]`));
  return m ? m[1] : null;
}

for (const [name, files] of modules) {
  const existing = index.modules.find(m => m.name === name);
  const category = files.js ? (parseField(files.js, 'category') || 'custom') : 'custom';
  const jsStatus = files.js ? parseField(files.js, 'status') : null;

  if (existing) {
    existing.category = category;
    if (!existing.status) existing.status = jsStatus || status;
  } else {
    index.modules.push({
      name,
      displayName: name,
      category,
      status: jsStatus || status,
    });
  }
}

index.modules.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');
console.log(`✅ Updated ${indexPath} (${index.modules.length} modules)`);

// ── Root _index.json ────────────────────────────────────────────────
const rootIndexPath = 'public/libraries/_index.json';
let rootIndex = { libraries: [] };
if (existsSync(rootIndexPath)) {
  try {
    rootIndex = JSON.parse(readFileSync(rootIndexPath, 'utf-8'));
  } catch { /* ignore */ }
}
if (!rootIndex.libraries) rootIndex.libraries = [];
if (!rootIndex.libraries.includes(targetLib)) {
  rootIndex.libraries.push(targetLib);
  rootIndex.libraries.sort();
  writeFileSync(rootIndexPath, JSON.stringify(rootIndex, null, 2) + '\n', 'utf-8');
  console.log(`✅ Added "${targetLib}" to ${rootIndexPath}`);
} else {
  console.log(`ℹ️  "${targetLib}" already in ${rootIndexPath}`);
}

// ── Summary ─────────────────────────────────────────────────────────
console.log('');
console.log(`📦 Promoted ${written} module(s) → ${libDir}/modules/`);
console.log('');
console.log('Next:');
console.log('  rm -rf dist node_modules/.vite');
console.log('  npm run build');
console.log(`  ls dist/libraries/${targetLib}/modules/`);
console.log(`  git add public/libraries/${targetLib}/ public/libraries/_index.json`);
console.log(`  git commit -m "Add ${targetLib} (${written} modules)"`);
console.log('  git push');