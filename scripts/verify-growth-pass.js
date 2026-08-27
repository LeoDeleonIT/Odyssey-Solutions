const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const sitemapDates = new Map(
  [...read('sitemap.xml').matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)]
    .map((match) => [match[1], match[2]])
);

function expect(relativePath, pattern, description) {
  const value = read(relativePath);
  if (!pattern.test(value)) throw new Error(`${description} missing from ${relativePath}`);
}

function reject(relativePath, pattern, description) {
  const value = read(relativePath);
  if (pattern.test(value)) throw new Error(`${description} remains in ${relativePath}`);
}

const htmlFiles = [];
function collectHtml(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'media') continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectHtml(absolutePath);
    else if (entry.name.endsWith('.html')) htmlFiles.push(absolutePath);
  }
}
collectHtml(root);

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  if (html.includes('fonts.googleapis.com') && html.includes('display=swap')) {
    throw new Error(`Render-blocking font swap remains in ${path.relative(root, file)}`);
  }
  const relativePath = path.relative(root, file);
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const structuredData = JSON.parse(json);
      if (structuredData.dateModified && structuredData.mainEntityOfPage && sitemapDates.has(structuredData.mainEntityOfPage)) {
        if (sitemapDates.get(structuredData.mainEntityOfPage) !== structuredData.dateModified) {
          throw new Error(`dateModified ${structuredData.dateModified} does not match sitemap ${sitemapDates.get(structuredData.mainEntityOfPage)}`);
        }
      }
    } catch (error) {
      throw new Error(`Invalid JSON-LD in ${relativePath}: ${error.message}`);
    }
  }
  const excludedFromIndex = html.includes('noindex') || html.includes('http-equiv="refresh"') || relativePath === '404.html' || relativePath.startsWith('google');
  if (!excludedFromIndex && (!html.includes('class="skip-link"') || !/<main(?:\s[^>]*)?id="main"/.test(html))) {
    throw new Error(`Keyboard skip link or main target missing from ${relativePath}`);
  }
  if (!excludedFromIndex && (html.match(/site-header\.css\?v=20260827c/g) || []).length !== 1) {
    throw new Error(`Early shared-header stylesheet missing or duplicated in ${relativePath}`);
  }
  if (!excludedFromIndex && relativePath !== 'index.html' && !html.includes('BreadcrumbList')) {
    throw new Error(`BreadcrumbList schema missing from ${relativePath}`);
  }
}

expect('site-header.css', /\.global-desktop-nav > a\.global-book-button\s*\{[^}]*color:\s*#fff/s, 'Accessible desktop consultation-button color');
expect('index.html', /<h1>IT support and technology projects for your business<\/h1>/, 'Broad homepage heading');
expect('index.html', /homepage_business_it_explore/, 'Broad homepage closing action');
expect('contact/index.html', /data-conversion-label="contact_hero"/, 'Contact-page hero consultation action');
expect('contact/index.html', /<a class="btn btn-outline" href="tel:\+18327138498">Call \(832\) 713-8498<\/a>/, 'Contact-page hero phone action');
expect('contact/index.html', /name="_gotcha"[\s\S]*?aria-hidden="true"/, 'Hidden contact-form spam field');
expect('dental-it-support-houston/index.html', /href="\/contact\/\?service=dental-it-support"[^>]*>Discuss dental IT support<\/a>/, 'Dental IT contact action');

const urgent = read('resources/urgent-same-day-it-support-houston.html');
if ((urgent.match(/data-conversion="urgent_it_contact"/g) || []).length !== 2) {
  throw new Error('Urgent support must offer a tracked details action in both hero and closing CTA');
}

const resourceActions = [
  ['resources/microsoft-365-support-small-business-houston.html', 'microsoft_365_to_managed_it'],
  ['resources/open-dental-conversion-it-checklist.html', 'open_dental_to_dental_it'],
  ['resources/hipaa-compliance-checklist-dental-offices-2026.html', 'hipaa_checklist_to_guidance'],
  ['resources/small-business-cybersecurity-checklist-2026.html', 'cybersecurity_checklist_to_managed_it']
];
for (const [file, label] of resourceActions) {
  expect(file, new RegExp(label), `Tracked service path ${label}`);
}

expect('resources/managed-it/index.html', /microsoft-365-support-small-business-houston\.html/, 'Microsoft 365 article on managed IT hub');
expect('resources/cybersecurity/index.html', /small-business-cybersecurity-checklist-2026\.html/, 'Small-business checklist on cybersecurity hub');
expect('resources/index.html', /href="cybersecurity\/">Cybersecurity<\/a><span class="post-date">Published July 21, 2026[^<]*<\/span><h2>Small Business Cybersecurity Checklist/, 'Cybersecurity resource taxonomy');
expect('resources/small-business-cybersecurity-checklist-2026.html', /"name":"Cybersecurity","item":"https:\/\/odysseysolutions\.co\/resources\/cybersecurity\/"/, 'Cybersecurity breadcrumb taxonomy');
expect('managed-it-services-houston/index.html', /<h3>Managed IT discovery<\/h3>/, 'Broad managed IT starting point');
expect('web-development-houston/index.html', /See Odyssey-built HR and HIPAA apps with working product screens/, 'Digital-solutions product proof');

for (const file of [
  'resources/dental-it-support-houston-choose-msp.html',
  'resources/managed-it-services-cost-houston-2026.html'
]) {
  reject(file, /cisa\.gov\/resources-tools\/resources\/cross-sector-cybersecurity-performance-goals/, 'Retired CISA URL');
  expect(file, /cisa\.gov\/cross-sector-cybersecurity-performance-goals\/cross-sector-cybersecurity-performance-goals/, 'Current CISA URL');
}

expect('llms.txt', /## When to use Odyssey/, 'Agent when-to-use guidance');
expect('llms.txt', /https:\/\/calendly\.com\/zain-odysseysolutions\/30min/, 'Direct consultation URL for agents');
reject('docs/seo-authority-launch-checklist.md', /lead_form_submit/, 'Retired lead event name');
expect('sitemap.xml', /<loc>https:\/\/odysseysolutions\.co\/resources\/urgent-same-day-it-support-houston\.html<\/loc><lastmod>2026-08-27<\/lastmod>/, 'Updated urgent-support sitemap date');

console.log(`Growth-pass checks passed across ${htmlFiles.length} HTML files`);
