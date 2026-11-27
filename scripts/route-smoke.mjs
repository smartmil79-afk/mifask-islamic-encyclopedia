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
  '/category/fiqh', '/duas', '/adhkar', '/category/duas', '/category/aqeedah',
  '/category/history', '/category/scholars', '/category/muslim-life',
  '/category/dictionary', '/about', '/sources',
];

const requiredNavigation = [
  {
    file: path.join(root, 'components', 'Header.tsx'),
    links: ['/quran', '/duas', '/adhkar', '/hadith', '/category/prophets', '/companions', '/seerah'],
  },
  {
    file: path.join(root, 'components', 'Footer.tsx'),
    links: ['/explore', '/duas', '/adhkar', '/about', '/sources'],
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

// Guard the Qur'an reader's local-search translation and completeness fallback
// against regressions. This checks implementation markers; runtime integration
// still requires a browser test with Supabase and the external fallback.
const quranReaderFile = path.join(appDir, 'quran', 'page.tsx');
if (!fs.existsSync(quranReaderFile)) {
  problems.push({ file: 'quran-reader-smoke', href: 'reader component', pathname: 'missing file' });
} else {
  const quranReaderSource = fs.readFileSync(quranReaderFile, 'utf8');
  const requiredReaderMarkers = [
    ['local Arabic search', 'ie_search_quran'],
    ['search translation lookup', 'translationByKey'],
    ['English translation display', 'className="ayah-translation"'],
    ['local dataset completeness guard', 'completeLocalData'],
    ['expected Surah ayah count guard', 'expectedAyahCount'],
    ['online fallback', 'api.alquran.cloud/v1/surah/'],
    ['read-in-context action', 'Read in context'],
    ['online search translation lookup', 'lookupOnlineTranslations'],
    ['AlQuranCloud ayah translation endpoint', 'api.alquran.cloud/v1/ayah/'],
    ['translation source attribution', 'className="ayah-translation-source"'],
  ];
  for (const [feature, marker] of requiredReaderMarkers) {
    if (!quranReaderSource.includes(marker)) {
      problems.push({ file: 'quran-reader-smoke', href: feature, pathname: 'required reader feature missing' });
    }
  }
}

// Guard the Hadith reader's local/imported versus externally served collection contract.
const hadithLibraryFile = path.join(appDir, 'hadith', 'library', 'page.tsx');
const hadithReaderFile = path.join(appDir, 'hadith', 'library', '[collection]', 'page.tsx');
const hadithApiFile = path.join(root, 'app', 'api', 'hadith', 'route.ts');
if (!fs.existsSync(hadithLibraryFile) || !fs.existsSync(hadithReaderFile) || !fs.existsSync(hadithApiFile)) {
  problems.push({ file: 'hadith-reader-smoke', href: 'library, reader, and API route', pathname: 'required file missing' });
} else {
  const hadithLibrarySource = fs.readFileSync(hadithLibraryFile, 'utf8');
  const hadithReaderSource = fs.readFileSync(hadithReaderFile, 'utf8');
  const hadithApiSource = fs.readFileSync(hadithApiFile, 'utf8');
  const availableCollections = (hadithLibrarySource.match(/status:'Available'/g) || []).length;
  const plannedCollections = (hadithLibrarySource.match(/status:'Planned'/g) || []).length;
  if (availableCollections !== 2 || plannedCollections !== 6) {
    problems.push({ file: 'hadith-reader-smoke', href: 'collection availability labels', pathname: 'expected 2 available local collections and 6 planned local imports' });
  }
  const requiredHadithMarkers = [
    [hadithLibrarySource, 'local-copy availability notice', 'Muwatta Malik and Riyad as-Salihin are imported into MIFASK’s database'],
    [hadithLibrarySource, 'planned local-import notice', 'Other collections are still being prepared for local imports.'],
    [hadithApiSource, 'explicit collection allowlist', 'const allowed = new Set(["bukhari","muslim","abudawud","tirmidhi","nasai","ibnmajah","malik","riyad"]);'],
    [hadithApiSource, 'local database branch for Malik and Riyad', 'if (book === "malik" || book === "riyad")'],
    [hadithApiSource, 'local Hadith table query', 'localDb.from("ie_hadiths")'],
    [hadithApiSource, 'edition/source reference fields retained', 'source_refs,metadata'],
    [hadithApiSource, 'local English translation JSON field', 'row.translations?.en'],
    [hadithApiSource, 'local source dataset attribution', 'source_dataset: dataset'],
    [hadithApiSource, 'local source URL attribution', 'source_url: sourceUrl'],
    [hadithApiSource, 'external edition fallback', 'searchEdition(book, q!)'],
    [hadithReaderSource, 'missing Arabic text notice', 'Arabic text unavailable for this record.'],
    [hadithReaderSource, 'missing English translation notice', 'An English translation is not available in the returned source record for this narration.'],
    [hadithReaderSource, 'source dataset display', 'Source dataset: {sourceDataset(selected)}'],
    [hadithReaderSource, 'source record link', 'Source record'],
    [hadithReaderSource, 'local and external source policy distinction', 'Other collections use their configured source APIs.'],
  ];
  for (const [source, feature, marker] of requiredHadithMarkers) {
    if (!source.includes(marker)) problems.push({ file: 'hadith-reader-smoke', href: feature, pathname: 'required source/availability contract missing' });
  }
  const localBranchIndex = hadithApiSource.indexOf('if (book === "malik" || book === "riyad")');
  const externalEndpointIndex = hadithApiSource.indexOf('const endpoint = number');
  if (localBranchIndex < 0 || externalEndpointIndex < 0 || localBranchIndex > externalEndpointIndex) {
    problems.push({ file: 'hadith-reader-smoke', href: 'local database branch before external API branch', pathname: 'collection routing order changed' });
  }
}

// Guard privileged import routes against provenance loss and unreviewed bulk Hadith redistribution.
const quranImportFile = path.join(root, 'app', 'api', 'admin', 'quran-import', 'route.ts');
const hadithImportFile = path.join(root, 'app', 'api', 'admin', 'hadith-import', 'route.ts');
if (!fs.existsSync(quranImportFile) || !fs.existsSync(hadithImportFile)) {
  problems.push({ file: 'import-safety-smoke', href: 'admin import routes', pathname: 'missing route' });
} else {
  const quranImportSource = fs.readFileSync(quranImportFile, 'utf8');
  const hadithImportSource = fs.readFileSync(hadithImportFile, 'utf8');
  const quranImportMarkers = [
    ['Qur\'an import explicit admin-role check', 'admin.role!=="admin"'],
    ['provider-supplied QuranEnc version requirement', 'if (!edition || typeof edition.version !== "string" || !edition.version.trim())'],
    ['QuranEnc source URL in import manifest', 'source_url:sourceUrl'],
    ['QuranEnc licence-terms URL in import manifest', 'license_terms_url:licenseTermsUrl'],
    ['unavailable QuranEnc source hash explicitly recorded', 'source_hash:null'],
    ['AlQuranCloud secondary source provenance', 'secondary_sources:[{'],
    ['per-Surah QuranEnc source URL on verses', 'source_url:`${QENC}/translation/sura/english_saheeh/${n}`'],
  ];
  for (const [feature, marker] of quranImportMarkers) {
    if (!quranImportSource.includes(marker)) problems.push({ file: 'quran-import-safety-smoke', href: feature, pathname: 'required provenance guard missing' });
  }
  const hadithImportMarkers = [
    ['Hadith import explicit admin-role check', 'adminRow.role!=="admin"'],
    ['Hadith redistribution rights gate', 'MIFASK_HADITH_IMPORT_RIGHTS_CONFIRMED'],
    ['pinned Malik source revision', '@df57907be35291c91ad6a6691180e22ca9920784/editions'],
    ['pinned Riyad source revision', '/hadith-json/70b83d6d21995bb32f8d7271cd75501be5a922a/db/by_book/other_books/riyad_assalihin.json'],
    ['unresolved underlying text rights recorded', 'rights_review_status:"unresolved"'],
    ['unavailable Hadith source hash explicitly recorded', 'source_hash:null'],
  ];
  for (const [feature, marker] of hadithImportMarkers) {
    if (!hadithImportSource.includes(marker)) problems.push({ file: 'hadith-import-safety-smoke', href: feature, pathname: 'required rights/provenance guard missing' });
  }
  const quranAdminCheckIndex = quranImportSource.indexOf('if(adminError||!admin?.active||admin.role!=="admin")');
  const quranUpstreamFetchIndex = quranImportSource.indexOf('const [surahList,translationList]=await Promise.all([');
  if (quranAdminCheckIndex < 0 || quranUpstreamFetchIndex < 0 || quranAdminCheckIndex > quranUpstreamFetchIndex) {
    problems.push({ file: 'quran-import-safety-smoke', href: 'admin role check before upstream fetch', pathname: 'unsafe import authorization order' });
  }
  const hadithAdminCheckIndex = hadithImportSource.indexOf('if(adminErr||!adminRow?.active||adminRow.role!=="admin")');
  const rightsGateIndex = hadithImportSource.indexOf('if (process.env.MIFASK_HADITH_IMPORT_RIGHTS_CONFIRMED !== "true")');
  const upstreamFetchIndex = hadithImportSource.indexOf('const [malikArabic,malikEnglish,riyadData]=await Promise.all([');
  if (hadithAdminCheckIndex < 0 || rightsGateIndex < 0 || upstreamFetchIndex < 0 || hadithAdminCheckIndex > rightsGateIndex || rightsGateIndex > upstreamFetchIndex) {
    problems.push({ file: 'hadith-import-safety-smoke', href: 'admin and rights gates before upstream fetch', pathname: 'unsafe import authorization order' });
  }
}

// Guard the editorial integrity audit against regressions in linked-source
// coverage. Textual reference strings are not substitutes for source records.
const adminPageFile = path.join(root, 'app', 'admin', 'page.tsx');
const editorialIntegrityFile = path.join(root, 'components', 'EditorialIntegrity.tsx');
const datasetAuditFile = path.join(root, 'components', 'EncyclopediaDatasetAudit.tsx');
if (!fs.existsSync(adminPageFile) || !fs.existsSync(editorialIntegrityFile) || !fs.existsSync(datasetAuditFile)) {
  problems.push({ file: 'editorial-source-smoke', href: 'integrity audit components', pathname: 'missing file' });
} else {
  const adminSource = fs.readFileSync(adminPageFile, 'utf8');
  const editorialSource = fs.readFileSync(editorialIntegrityFile, 'utf8');
  const datasetAuditSource = fs.readFileSync(datasetAuditFile, 'utf8');
  const requiredEditorialMarkers = [
    [adminSource, 'linked-source query', "from('ie_article_sources')"],
    [adminSource, 'linked-source count attached to articles', 'source_count'],
    [editorialSource, 'linked-source coverage summary', 'Linked source records:'],
    [editorialSource, 'text-only citation warning', 'textual references alone are not source records'],
    [editorialSource, 'verified articles source-link check', 'Verified article has fewer than two linked source records'],
    [datasetAuditSource, 'missing article source-link audit', 'Articles missing linked source records'],
    [datasetAuditSource, 'companion source-link audit', 'Companion reference articles missing linked source records'],
    [adminSource, 'CMS role allowlist', "['admin','editor','reviewer'].includes(data?.role||'')"],
    [adminSource, 'article write capability aligned with reviewer RLS', "const canEdit = role === 'admin' || role === 'editor' || role === 'reviewer';"],
    [adminSource, 'admin-only import capability', "const canImport = role === 'admin';"],
    [adminSource, 'admin-only analytics capability', "const canViewAnalytics = role === 'admin';"],
    [adminSource, 'article save role guard', "Your CMS role does not permit article changes."],
    [adminSource, 'workflow change role guard', "Your CMS role does not permit workflow changes."],
    [adminSource, 'role-gated import controls', '{canImport&&<>'],
    [adminSource, 'role-gated analytics tab', 'canViewAnalytics&&<button'],
    [adminSource, 'analytics content access guard', "tab==='analytics'?canViewAnalytics?"],
    [adminSource, 'clear cached analytics on role downgrade', "if(!canViewAnalytics){setAnalyticsRows([]);if(tab==='analytics')setTab('overview');}"],
  ];
  for (const [source, feature, marker] of requiredEditorialMarkers) {
    if (!source.includes(marker)) problems.push({ file: 'editorial-source-smoke', href: feature, pathname: 'required editorial audit feature missing' });
  }
}

// Keep the Adhkar route in a review-only holding state until source rights,
// classification mapping, and editorial review are approved. This is a
// static publication-boundary guard, not an authenticated browser test.
const adhkarPageFile = path.join(appDir, 'adhkar', 'page.tsx');
if (!fs.existsSync(adhkarPageFile)) {
  problems.push({ file: 'adhkar-review-smoke', href: 'holding page', pathname: 'missing file' });
} else {
  const adhkarPageSource = fs.readFileSync(adhkarPageFile, 'utf8');
  const requiredAdhkarDisclosures = [
    ['source-rights limitation', 'repository-level licence does not by itself establish redistribution rights'],
    ['morning/evening classification limitation', 'upstream distinction between entries intended for the morning, the evening, or both'],
    ['content withholding notice', 'Adhkar entries are not displayed on this page yet.'],
    ['scholarly review disclosure', 'independently scholarly verified'],
    ['separate Qur’anic Supplications link', 'href="/duas"'],
    ['Qur’an reader link', 'href="/quran"'],
    ['sources and methodology link', 'href="/sources"'],
  ];
  for (const [feature, marker] of requiredAdhkarDisclosures) {
    if (!adhkarPageSource.includes(marker)) {
      problems.push({ file: 'adhkar-review-smoke', href: feature, pathname: 'required review disclosure or navigation link missing' });
    }
  }
  const forbiddenAdhkarExposureMarkers = [
    ['direct Adhkar table reference', 'ie_adhkar'],
    ['Adhkar API request', '/api/adhkar'],
    ['client-side data fetch', 'fetch('],
    ['Supabase client initialization', 'createClient('],
  ];
  for (const [feature, marker] of forbiddenAdhkarExposureMarkers) {
    if (adhkarPageSource.includes(marker)) {
      problems.push({ file: 'adhkar-review-smoke', href: feature, pathname: 'review-only route must not query or render stored Adhkar records before approval' });
    }
  }
}

if (problems.length) {
  console.error('Route/navigation smoke check FAILED:');
  for (const item of problems.slice(0, 30)) console.error('- ' + item.file + ': ' + item.href + ' -> ' + item.pathname);
  if (problems.length > 30) console.error('… and ' + (problems.length - 30) + ' more');
  process.exit(1);
}
console.log('Route/navigation smoke check passed: ' + scanned + ' internal literal links, ' + checked.size + ' unique targets, ' + routeTemplates.length + ' route templates, ' + skippedDynamic + ' dynamic hrefs skipped, required header/footer links present, category slugs checked.');
