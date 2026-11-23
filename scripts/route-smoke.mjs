#!/usr/bin/env node
/**
 * Build-time smoke check for internal literal links.
 * It verifies app-router page targets referenced by app/components TSX files
 * and a core route inventory. Dynamic href expressions are skipped because
 * their values are runtime data; their route templates are covered separately.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appDir = path.join(root, 'app');
const sourceDirs = [appDir, path.join(root, 'components')].filter((d) => fs.existsSync(d));
const pageNames = new Set(['page.tsx', 'page.ts', 'page.jsx', 'page.js']);
const sourceExtensions = new Set(['.tsx', '.ts', '.jsx', '.js']);
const coreRoutes = [
  '/', '/explore', '/search', '/assistant', '/learn', '/dictionary',
  '/knowledge-graph', '/saved', '/quran', '/category/quran', '/hadith',
  '/hadith/library', '/category/prophets', '/prophets', '/companions',
  '/seerah', '/category/fiqh', '/duas', '/about', '/sources',
];

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function routeFromPageFile(file) {
  const rel = path.relative(appDir, path.dirname(file)).split(path.sep);
  const segments = rel.filter((s) => !(s.startsWith('(') && s.endsWith(')')) && !s.startsWith('@'));
  return '/' + segments.join('/');
}

const routeTemplates = walk(appDir)
  .filter((file) => pageNames.has(path.basename(file)))
  .map(routeFromPageFile);

function matchesRoute(template, pathname) {
  const segments = template.split('/').filter(Boolean);
  let pattern = '^';
  for (const segment of segments) {
    if (segment.startsWith('[[...') && segment.endsWith(']]')) {
      pattern += '(?:/[^/]+)*';
    } else if (segment.startsWith('[...') && segment.endsWith(']')) {
      pattern += '(?:/[^/]+)+';
    } else if (segment.startsWith('[') && segment.endsWith(']')) {
      pattern += '/[^/]+';
    } else {
      pattern += '/' + segment.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
    }
  }
  if (!segments.length) pattern = '^/';
  return new RegExp(pattern + '/?$').test(pathname);
}

const hrefPattern = /\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|\{\s*(['"])(.*?)\3\s*\})/g;
const problems = [];
const checked = new Set();
let scanned = 0;
let skippedDynamic = 0;

for (const dir of sourceDirs) {
  for (const file of walk(dir)) {
    if (!sourceExtensions.has(path.extname(file))) continue;
    const source = fs.readFileSync(file, 'utf8');
    hrefPattern.lastIndex = 0;
    let match;
    while ((match = hrefPattern.exec(source)) !== null) {
      const value = match[1] ?? match[2] ?? match[4];
      if (!value || value.includes('${')) { skippedDynamic++; continue; }
      if (!value.startsWith('/') || value.startsWith('//')) continue;
      if (/^\/(?:api|_next)(?:\/|$)/.test(value)) continue;
      const pathname = new URL(value, 'https://mifask.invalid').pathname.replace(/\/$/, '') || '/';
      if (/\.[a-z0-9]{2,5}$/i.test(pathname)) continue;
      scanned++;
      const key = pathname;
      if (checked.has(key)) continue;
      checked.add(key);
      if (!routeTemplates.some((template) => matchesRoute(template, pathname))) {
        problems.push({ file: path.relative(root, file), href: value, pathname });
      }
    }
  }
}

for (const route of coreRoutes) {
  if (!routeTemplates.some((template) => matchesRoute(template, route))) {
    problems.push({ file: 'core-route-inventory', href: route, pathname: route });
  }
}

if (problems.length) {
  console.error('Route smoke check FAILED. Missing app-router targets:');
  for (const item of problems.slice(0, 30)) console.error(`- ${item.file}: ${item.href} -> ${item.pathname}`);
  if (problems.length > 30) console.error(`… and ${problems.length - 30} more`);
  process.exit(1);
}
console.log(`Route smoke check passed: ${scanned} internal literal links, ${checked.size} unique targets, ${routeTemplates.length} route templates, ${skippedDynamic} dynamic hrefs skipped.`);
