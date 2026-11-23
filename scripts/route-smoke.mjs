#!/usr/bin/env node
/**
 * Build-time smoke check for internal literal links, category slugs, and
 * essential navigation entries. Dynamic href expressions are skipped because
 * their values are runtime data; route templates are checked separately.
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
  '/hadith/library', '/category/hadith', '/category/prophets', '/prophets',
  '/companions', '/category/companions', '/seerah', '/category/seerah',
  '/category/fiqh', '/duas', '/category/duas', '/category/aqeedah',
  '/category/history', '/category/scholars', '/category/muslim-life',
  '/category/dictionary', '/about', '/sources',
];

const requiredNavigation = [
  {
    file: path.join(root, 'components', 'Header.tsx'),
    links: ['/quran', '/duas', '/hadith', '/prophets', '/companions', '/seerah'],
  },
  {
    file: path.join(root, 'components', 'Footer.tsx'),
    links: ['/explore', '/duas', '/about', '/sources'],
  },
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
      if (!value || value.includes('$' + '{')) { skippedDynamic++; continue; }
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

// Check every category slug declared in lib/content.ts against the route
// template so newly added categories cannot silently point at missing pages.
const categoriesFile = path.join(root, 'lib', 'content.ts');
if (fs.existsSync(categoriesFile)) {
  const content = fs.readFileSync(categoriesFile, 'utf8');
  const categoryBlock = content.match(/export const categories\s*:\s*Category\[\]\s*=\s*\[([\s\S]*?)\n\];/);
  if (!categoryBlock) {
    problems.push({ file: 'lib/content.ts', href: 'categories declaration', pathname: 'unparsed category list' });
  } else {
    const categoryIds = [...categoryBlock[1].matchAll(/\bid\s*:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    for (const slug of categoryIds) {
      const route = '/category/' + slug;
      if (!routeTemplates.some((template) => matchesRoute(template, route))) {
        problems.push({ file: 'category-inventory', href: route, pathname: route });
      }
    }
  }
}

for (const route of coreRoutes) {
  if (!routeTemplates.some((template) => matchesRoute(template, route))) {
    problems.push({ file: 'core-route-inventory', href: route, pathname: route });
  }
}

for (const requirement of requiredNavigation) {
  if (!fs.existsSync(requirement.file)) {
    problems.push({ file: path.relative(root, requirement.file), href: 'required navigation file', pathname: 'missing file' });
    continue;
  }
  const source = fs.readFileSync(requirement.file, 'utf8');
  for (const link of requirement.links) {
    const found = source.includes('href="' + link + '"') || source.includes("href='" + link + "'");
    if (!found) problems.push({ file: path.relative(root, requirement.file), href: link, pathname: 'required navigation link missing' });
  }
}

if (problems.length) {
  console.error('Route/navigation smoke check FAILED:');
  for (const item of problems.slice(0, 30)) console.error('- ' + item.file + ': ' + item.href + ' -> ' + item.pathname);
  if (problems.length > 30) console.error('… and ' + (problems.length - 30) + ' more');
  process.exit(1);
}
console.log('Route/navigation smoke check passed: ' + scanned + ' internal literal links, ' + checked.size + ' unique targets, ' + routeTemplates.length + ' route templates, ' + skippedDynamic + ' dynamic hrefs skipped, required header/footer links present, category slugs checked.');
