const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const measurementId = 'G-VPKTJC4QXJ';
const assetVersion = '20260827e';
const businessId = 'https://odysseysolutions.co/#business';
const servicePaths = [
  '/it-support-houston/',
  '/managed-it-services-houston/',
  '/remote-it-support/',
  '/dental-it-support-houston/',
  '/remote-dental-it-support/',
  '/dental-cybersecurity-houston/',
  '/dental-software-support/',
  '/healthcare-it-support-houston/',
  '/healthcare-it-readiness-review/',
  '/hipaa-compliance-consulting-texas/',
  '/hipaa-training-texas/',
  '/web-development-houston/',
  '/people-compliance-platform/'
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function collectFiles(directory, predicate, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'media') continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(absolutePath, predicate, output);
    else if (predicate(absolutePath)) output.push(absolutePath);
  }
  return output;
}

function fail(message) {
  throw new Error(message);
}

const htmlFiles = collectFiles(root, (file) => file.endsWith('.html'));
const publicFiles = new Set(
  collectFiles(root, () => true).map((file) => path.relative(root, file).split(path.sep).join('/'))
);
const sitemap = read('sitemap.xml');
const sitemapEntries = [...sitemap.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)];
const sitemapDates = new Map(sitemapEntries.map((match) => [match[1], match[2]]));
const searchMetadata = {
  title: new Map(),
  description: new Map(),
  canonical: new Map()
};

function recordUniqueMetadata(kind, value, relativePath) {
  const normalized = value.replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const previousPath = searchMetadata[kind].get(normalized);
  if (previousPath) fail(`Duplicate ${kind} found in ${previousPath} and ${relativePath}`);
  searchMetadata[kind].set(normalized, relativePath);
}

if (sitemapDates.size !== sitemapEntries.length) fail('Duplicate URL found in sitemap.xml');

for (const [url] of sitemapDates) {
  const parsed = new URL(url);
  let localPath = decodeURIComponent(parsed.pathname).replace(/^\//, '');
  if (!localPath) localPath = 'index.html';
  const candidates = [localPath, `${localPath}.html`, path.posix.join(localPath, 'index.html')];
  if (!candidates.some((candidate) => publicFiles.has(candidate))) {
    fail(`Sitemap URL has no local file: ${url}`);
  }
}

for (const absolutePath of htmlFiles) {
  const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');
  const html = fs.readFileSync(absolutePath, 'utf8');
  const redirectPage = /http-equiv=["']refresh["']/i.test(html);
  const excludedFromIndex = redirectPage || /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html) || relativePath === '404.html' || relativePath.startsWith('google');
  let isResourceArticle = false;

  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let structuredData;
    try {
      structuredData = JSON.parse(json);
    } catch (error) {
      fail(`Invalid JSON-LD in ${relativePath}: ${error.message}`);
    }
    if (structuredData.dateModified && structuredData.mainEntityOfPage && sitemapDates.has(structuredData.mainEntityOfPage)) {
      if (sitemapDates.get(structuredData.mainEntityOfPage) !== structuredData.dateModified) {
        fail(`Article dateModified and sitemap lastmod differ in ${relativePath}`);
      }
    }
    if (structuredData['@type'] === 'BlogPosting') {
      isResourceArticle = true;
      if (!structuredData.author?.['@id'] && !structuredData.author?.url) fail(`Article author identity is incomplete in ${relativePath}`);
      if (structuredData.publisher?.['@id'] !== businessId) fail(`Article publisher must reference Odyssey in ${relativePath}`);
    }
    if (structuredData['@type'] === 'Service' && structuredData.provider?.['@id'] !== businessId) {
      fail(`Service provider must reference Odyssey in ${relativePath}`);
    }
  }

  if (excludedFromIndex) continue;

  if (!/<html[^>]+lang=["']en["']/i.test(html)) fail(`English language declaration missing from ${relativePath}`);
  if ((html.match(/<link[^>]+rel=["']canonical["']/gi) || []).length !== 1) fail(`Expected one canonical link in ${relativePath}`);
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1].replace(/&amp;/g, '&').trim() || '';
  if (title.length < 30 || title.length > 70) fail(`Search title length is outside the reviewed range in ${relativePath}`);
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
  if (!description) fail(`Meta description is missing from ${relativePath}`);
  const canonicalUrl = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1];
  if (!sitemapDates.has(canonicalUrl)) fail(`Canonical URL is missing from sitemap.xml in ${relativePath}`);
  recordUniqueMetadata('title', title, relativePath);
  recordUniqueMetadata('description', description, relativePath);
  recordUniqueMetadata('canonical', canonicalUrl, relativePath);
  for (const [label, pattern] of [
    ['Open Graph type', /property=["']og:type["']/i],
    ['Open Graph title', /property=["']og:title["']/i],
    ['Open Graph description', /property=["']og:description["']/i],
    ['Open Graph URL', /property=["']og:url["']/i],
    ['Open Graph image', /property=["']og:image["']/i],
    ['Twitter card', /name=["']twitter:card["']/i]
  ]) {
    if (!pattern.test(html)) fail(`${label} metadata is missing from ${relativePath}`);
  }
  if ((html.match(new RegExp(`googletagmanager\\.com/gtag/js\\?id=${measurementId}`, 'g')) || []).length !== 1) fail(`Expected one GA4 loader in ${relativePath}`);
  if (/fonts\.(?:googleapis|gstatic)\.com/.test(html)) fail(`External Google Fonts request remains in ${relativePath}`);
  if ((html.match(new RegExp(`/site-header\\.css\\?v=${assetVersion}`, 'g')) || []).length !== 1) fail(`Expected one early shared-header stylesheet in ${relativePath}`);
  if (!html.includes('class="site-header source-site-header"')) fail(`Standard source header missing from ${relativePath}`);
  for (const requiredPath of ['/', '/it-support-houston/', '/case-studies/', '/service-areas/', '/resources/', '/about/', '/contact/']) {
    if (!html.includes(`href="${requiredPath}"`)) fail(`Source navigation is missing ${requiredPath} in ${relativePath}`);
  }
  if (!html.includes('class="source-mobile-menu"') || !html.includes('aria-label="Mobile navigation"')) {
    fail(`No-JavaScript mobile navigation is missing from ${relativePath}`);
  }
  if (!html.includes(`site.css?v=${assetVersion}`) && !html.includes(`blog.css?v=${assetVersion}`)) fail(`Shared CSS cache version is stale in ${relativePath}`);
  if (!html.includes('class="skip-link"') || !/<main(?:\s[^>]*)?id=["']main["']/.test(html)) fail(`Skip link or main target missing from ${relativePath}`);
  if (relativePath !== 'index.html' && !html.includes('BreadcrumbList')) fail(`BreadcrumbList schema missing from ${relativePath}`);
  if (/—/.test(html.replace(/<script[\s\S]*?<\/script>/gi, ''))) fail(`Em dash found in public copy in ${relativePath}`);
  if (/cisa\.gov\/resources-tools\/resources\/cross-sector-cybersecurity-performance-goals/.test(html)) fail(`Retired CISA URL found in ${relativePath}`);
  if (isResourceArticle && !servicePaths.some((servicePath) => html.includes(`href="${servicePath}"`) || html.includes(`href='${servicePath}'`))) {
    fail(`Resource article has no relevant Odyssey service path in ${relativePath}`);
  }
  if (isResourceArticle && !/<img\s+class=["']article-cover["'][^>]*loading=["']eager["'][^>]*fetchpriority=["']high["']/i.test(html)) {
    fail(`Resource article cover image is not prioritized in ${relativePath}`);
  }

  const visibleHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const headingLevels = [...visibleHtml.matchAll(/<h([1-6])\b/gi)].map((match) => Number(match[1]));
  if (!headingLevels.length || headingLevels[0] !== 1) fail(`Page must begin its heading hierarchy with an h1 in ${relativePath}`);
  for (let index = 1; index < headingLevels.length; index += 1) {
    if (headingLevels[index] - headingLevels[index - 1] > 1) fail(`Heading level skips in ${relativePath}`);
  }
  for (const match of visibleHtml.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt=["'][^"']*["']/.test(match[0])) fail(`Image alt attribute missing in ${relativePath}`);
  }
  for (const match of visibleHtml.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
    const control = match[0];
    if (/type=["']hidden["']/i.test(control) || /aria-hidden=["']true["']/i.test(control)) continue;
    const id = control.match(/\bid=["']([^"']+)["']/i)?.[1];
    if (!id || !new RegExp(`<label[^>]+for=["']${id}["']`, 'i').test(visibleHtml)) fail(`Visible form control lacks a programmatic label in ${relativePath}`);
  }
}

for (const requiredFile of ['404.html', 'llms.txt', 'robots.txt', 'sitemap.xml', 'site.js', 'site-header.css', 'fonts/exo-2-latin-v26.woff2', 'fonts/orbitron-latin-v35.woff2', 'fonts/OFL-Exo2.txt', 'fonts/OFL-Orbitron.txt']) {
  if (!publicFiles.has(requiredFile)) fail(`Required public file missing: ${requiredFile}`);
}

const homepage = read('index.html');
const homepageSchemas = [...homepage.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
const organization = homepageSchemas.find((item) => Array.isArray(item['@type']) && item['@type'].includes('Organization'));
const website = homepageSchemas.find((item) => item['@type'] === 'WebSite');
if (!organization || !organization.contactPoint?.telephone || !organization.contactPoint?.email) fail('Homepage Organization contact data is incomplete');
if (!website || website.publisher?.['@id'] !== businessId) fail('Homepage WebSite identity is incomplete');
if (!homepage.includes('(832) 713-8498') || !homepage.includes('info@odysseysolutions.co')) fail('Primary phone or email changed on homepage');
if (!homepage.includes('https://calendly.com/zain-odysseysolutions/30min')) fail('Primary Calendly URL changed on homepage');
if (!/Page not found/i.test(read('404.html')) || !read('404.html').includes('sitemap.xml') || !read('404.html').includes('llms.txt')) fail('404 recovery links are incomplete');
if (!/:focus-visible|\.skip-link:focus/.test(read('site.css') + read('site-header.css') + read('resources/blog.css'))) fail('Visible keyboard focus styles missing');
if (!/scroll-margin-top:\s*104px/.test(read('site-header.css'))) fail('Sticky-header anchor offset is missing');
if (!/fonts\/exo-2-latin-v26\.woff2/.test(read('site-header.css')) || !/fonts\/orbitron-latin-v35\.woff2/.test(read('site-header.css'))) fail('Self-hosted font declarations are incomplete');

console.log(`Site-quality checks passed across ${htmlFiles.length} HTML files and ${sitemapDates.size} sitemap URLs`);
