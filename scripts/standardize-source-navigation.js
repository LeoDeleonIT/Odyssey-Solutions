const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const writeChanges = process.argv.includes('--write');
const ignoredDirectories = new Set(['.git', 'brand', 'media', 'tmp']);

const serviceLinks = [
  ['/it-support-houston/', 'Business IT Support'],
  ['/remote-it-support/', 'Remote IT Support'],
  ['/managed-it-services-houston/', 'Managed IT Services'],
  ['/dental-it-support-houston/', 'Dental IT Support'],
  ['/remote-dental-it-support/', 'Remote Dental IT'],
  ['/healthcare-it-support-houston/', 'Healthcare IT'],
  ['/healthcare-it-readiness-review/', 'Healthcare IT Readiness Review'],
  ['/dental-cybersecurity-houston/', 'Dental Cybersecurity'],
  ['/hipaa-compliance-consulting-texas/', 'HIPAA Guidance'],
  ['/hipaa-training-texas/', 'HIPAA Training'],
  ['/people-compliance-platform/', 'HR + HIPAA Software'],
  ['/web-development-houston/', 'Websites, Tools & Apps']
];

function collectHtml(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectHtml(absolutePath, output);
    else if (entry.name.endsWith('.html')) output.push(absolutePath);
  }
  return output;
}

function publicPath(absolutePath) {
  const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');
  if (relativePath === 'index.html') return '/';
  return `/${relativePath.replace(/index\.html$/, '')}`;
}

function currentAttribute(currentPath, destination, prefix = false) {
  const current = prefix ? currentPath.startsWith(destination) : currentPath === destination;
  return current ? ' aria-current="page"' : '';
}

function serviceMarkup(currentPath) {
  return serviceLinks
    .map(([href, label]) => `              <a href="${href}"${currentAttribute(currentPath, href)}>${label}</a>`)
    .join('\n');
}

function mobileServiceMarkup(currentPath) {
  return serviceLinks
    .map(([href, label]) => `            <a href="${href}"${currentAttribute(currentPath, href)}>${label}</a>`)
    .join('\n');
}

function sourceHeader(currentPath) {
  const serviceActive = serviceLinks.some(([href]) => currentPath === href);
  const resourcesActive = currentPath.startsWith('/resources/');
  const aboutActive = currentPath.startsWith('/about/') || currentPath.startsWith('/authors/') || currentPath.startsWith('/editorial-policy/');

  return `  <header class="site-header source-site-header">
    <div class="source-header-inner">
      <a class="source-brand" href="/" aria-label="Odyssey Solutions home">Odyss<span>e</span>y Solutions</a>
      <nav class="source-desktop-nav" aria-label="Primary navigation">
        <a href="/"${currentAttribute(currentPath, '/')}>Home</a>
        <details class="source-services-menu">
          <summary${serviceActive ? ' aria-current="page"' : ''}>Services</summary>
          <div class="source-services-panel">
${serviceMarkup(currentPath)}
          </div>
        </details>
        <a href="/case-studies/"${currentAttribute(currentPath, '/case-studies/', true)}>Results</a>
        <a href="/service-areas/"${currentAttribute(currentPath, '/service-areas/', true)}>Service Areas</a>
        <a href="/resources/"${resourcesActive ? ' aria-current="page"' : ''}>Resources</a>
        <a href="/about/"${aboutActive ? ' aria-current="page"' : ''}>About</a>
        <a href="/contact/"${currentAttribute(currentPath, '/contact/')}>Contact</a>
        <a class="source-book-button" href="https://calendly.com/zain-odysseysolutions/30min" data-conversion="calendar_open" data-conversion-label="source_header_desktop">Book Consultation</a>
      </nav>
      <details class="source-mobile-menu">
        <summary aria-label="Open navigation">Menu</summary>
        <nav class="source-mobile-nav" aria-label="Mobile navigation">
          <a href="/"${currentAttribute(currentPath, '/')}>Home</a>
          <strong>Services</strong>
${mobileServiceMarkup(currentPath)}
          <a href="/case-studies/"${currentAttribute(currentPath, '/case-studies/', true)}>Results</a>
          <a href="/service-areas/"${currentAttribute(currentPath, '/service-areas/', true)}>Service Areas</a>
          <a href="/resources/"${resourcesActive ? ' aria-current="page"' : ''}>Resources</a>
          <a href="/about/"${aboutActive ? ' aria-current="page"' : ''}>About</a>
          <a href="/contact/"${currentAttribute(currentPath, '/contact/')}>Contact</a>
          <a class="source-mobile-book" href="https://calendly.com/zain-odysseysolutions/30min" data-conversion="calendar_open" data-conversion-label="source_header_mobile">Book Consultation</a>
        </nav>
      </details>
    </div>
  </header>`;
}

const changed = [];
const missing = [];

for (const absolutePath of collectHtml(root)) {
  const html = fs.readFileSync(absolutePath, 'utf8');
  if (!html.includes('class="site-header')) continue;
  const expected = sourceHeader(publicPath(absolutePath));
  if (html.includes(expected)) continue;
  const updated = html.replace(/\s*<header class="site-header[\s\S]*?<\/header>/, `\n${expected}`);
  const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');

  if (updated === html) {
    missing.push(relativePath);
    continue;
  }

  changed.push(relativePath);
  if (writeChanges) fs.writeFileSync(absolutePath, updated);
}

if (missing.length) {
  throw new Error(`Could not locate a replaceable source header in: ${missing.join(', ')}`);
}

if (!writeChanges && changed.length) {
  throw new Error(`Source navigation is not standardized in ${changed.length} file(s): ${changed.join(', ')}`);
}

console.log(writeChanges
  ? `Standardized source navigation in ${changed.length} HTML files`
  : 'Source navigation is standardized across all pages with a site header');
