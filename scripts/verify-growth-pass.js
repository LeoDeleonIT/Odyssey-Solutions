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

const sourceFiles = [];
function collectSource(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['.git', 'brand', 'media'].includes(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectSource(absolutePath);
    else if (/\.(html|js|md|json|ya?ml|sh|xml|txt)$/i.test(entry.name)) sourceFiles.push(absolutePath);
  }
}
collectSource(root);

const restrictedBuildTerms = ['co' + 'dex', 'chat' + 'gpt', 'open' + 'ai', 'cla' + 'ude', 'anthro' + 'pic'];
const restrictedBuildPattern = new RegExp(`\\b(${restrictedBuildTerms.join('|')})\\b`, 'i');
for (const sourceFile of sourceFiles) {
  const relativePath = path.relative(root, sourceFile);
  if (restrictedBuildPattern.test(fs.readFileSync(sourceFile, 'utf8'))) {
    throw new Error(`Development-tool reference remains in ${relativePath}`);
  }
}

for (const retiredFile of ['MEMORY.md', 'settings.json']) {
  if (fs.existsSync(path.join(root, retiredFile))) throw new Error(`Retired development artifact remains: ${retiredFile}`);
}

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
  if (!excludedFromIndex && (html.match(/site-header\.css\?v=20260827e/g) || []).length !== 1) {
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
expect('contact/index.html', /<option>Online recommendation<\/option>/, 'Neutral contact-form referral source');
expect('remote-it-support/index.html', /<option>Online recommendation<\/option>/, 'Neutral remote-support referral source');
expect('resources\/odyssey-it-resilience-toolkit\/index.html', /<option>Online recommendation<\/option>/, 'Neutral toolkit referral source');
expect('contact/index.html', /data-urgent-support-note hidden/, 'Conditional urgent-support guidance');
expect('contact/index.html', /name="_gotcha"[\s\S]*?aria-hidden="true"/, 'Hidden contact-form spam field');
expect('site.js', /resource_link_to_/, 'Automatic resource-to-service measurement');
expect('site.js', />Contact<\/a>/, 'Direct contact path in mobile navigation');
expect('site-header.css', /scroll-margin-top:\s*104px/, 'Sticky-header anchor offset');
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
expect('resources/managed-it-services-cost-houston-2026.html', /<title>How Much Do Managed IT Services Cost in Houston\? \| Odyssey<\/title>/, 'Search Console informed managed IT pricing title');
expect('resources/managed-it-services-cost-houston-2026.html', /roughly \$75 to \$250\+ per user/, 'Managed IT pricing search description');
expect('resources/new-dental-office-it-setup-houston.html', /<title>New Dental Office IT Setup in Houston \| Odyssey<\/title>/, 'Search Console informed dental setup title');
expect('resources/new-dental-office-it-setup-houston.html', /<h1>New Dental Office IT Setup in Houston<\/h1>/, 'Search Console informed dental setup heading');
expect('resources/new-dental-office-it-setup-houston.html', /dental-office-network-setup-houston\.html/, 'Dental setup link to network checklist');
expect('resources/dental-office-network-setup-houston.html', /<title>Dental Office Network Setup in Houston \| New Office Checklist<\/title>/, 'Search Console informed dental network title');
expect('resources/dental-office-network-setup-houston.html', /dental_network_to_dental_it/, 'Dental network service action');
expect('healthcare-it-support-houston/index.html', /<title>Healthcare IT Support in Houston \| Medical Practices<\/title>/, 'Search Console informed healthcare IT title');
expect('healthcare-it-support-houston/index.html', /<h1>Healthcare IT Support for Houston Medical Practices<\/h1>/, 'Search Console informed healthcare IT heading');
expect('healthcare-it-support-houston/index.html', /href="tel:\+18327138498">Call \(832\) 713-8498<\/a>/, 'Healthcare IT hero phone action');
expect('dental-it-support-houston/index.html', /<title>Dental IT &amp; Software Support in Houston \| Odyssey<\/title>/, 'Search Console informed dental IT title');
expect('dental-it-support-houston/index.html', /dental-office-network-setup-houston\.html/, 'Dental IT path to network checklist');
expect('case-studies/trinity-dental-multi-location-it/index.html', /dental-office-network-setup-houston\.html/, 'Case-study path to network checklist');
expect('it-support-houston/index.html', /<h3 id="after-hours-emergency-it-support">After-hours emergency IT support<\/h3>/, 'After-hours emergency support section');
expect('it-support-houston/index.html', /Call for after-hours support and pricing\./, 'After-hours support pricing action');
expect('resources/urgent-same-day-it-support-houston.html', /\/it-support-houston\/#after-hours-emergency-it-support/, 'Urgent guide after-hours support path');

const responsiveImageChecks = [
  ['product-images/people-operations-demo-640.webp', 'index.html', /people-operations-demo-640\.webp/, 'Homepage Odyssey HR responsive image'],
  ['product-images/hipaa-training-demo-640.webp', 'index.html', /hipaa-training-demo-640\.webp/, 'Homepage HIPAA Training responsive image'],
  ['resources/images/odyssey-dental-ai-policy-preview-360.webp', 'index.html', /odyssey-dental-ai-policy-preview-360\.webp/, 'Homepage policy preview responsive image'],
  ['resources/images/odyssey-dental-downtime-plan-preview-360.webp', 'index.html', /odyssey-dental-downtime-plan-preview-360\.webp/, 'Homepage downtime preview responsive image'],
  ['resources/images/dental-office-it-buildout-640.webp', 'dental-it-support-houston/index.html', /dental-office-it-buildout-640\.webp/, 'Dental IT mobile cover image'],
  ['resources/images/dental-office-it-buildout-640.webp', 'resources/new-dental-office-it-setup-houston.html', /dental-office-it-buildout-640\.webp/, 'Dental office checklist mobile cover image'],
  ['product-images/people-operations-demo-640.webp', 'people-compliance-platform/index.html', /people-operations-demo-640\.webp/, 'People platform Odyssey HR responsive image'],
  ['product-images/hipaa-training-demo-640.webp', 'people-compliance-platform/index.html', /hipaa-training-demo-640\.webp/, 'People platform HIPAA Training responsive image']
];
for (const [imagePath, pagePath, imagePattern, description] of responsiveImageChecks) {
  if (!fs.existsSync(path.join(root, imagePath))) throw new Error(`${description} file is missing`);
  expect(pagePath, imagePattern, description);
}
const underlinkedResources = [
  ['resources/business-it-outage-same-day-recovery-guide.html', 'resources/business-it/index.html', 'resources/urgent-same-day-it-support-houston.html', '/it-support-houston/'],
  ['resources/dental-office-it-budget-houston.html', 'resources/dental-it/index.html', 'resources/new-dental-office-it-setup-houston.html', '/dental-it-support-houston/'],
  ['resources/dental-office-technology-opening-timeline.html', 'resources/dental-it/index.html', 'resources/new-dental-office-it-setup-houston.html', '/dental-it-support-houston/'],
  ['resources/employee-onboarding-hipaa-training-software.html', 'resources/healthcare-it/index.html', 'resources/secure-healthcare-employee-onboarding-offboarding.html', '/people-compliance-platform/'],
  ['resources/healthcare-it-after-hours-escalation-houston.html', 'resources/healthcare-it/index.html', 'resources/healthcare-it-support-response-houston.html', '/healthcare-it-support-houston/'],
  ['resources/small-business-it-support-houston-costs.html', 'resources/business-it/index.html', 'resources/managed-it-services-cost-houston-2026.html', '/it-support-houston/']
];
for (const [target, hub, relatedArticle, servicePath] of underlinkedResources) {
  const filename = path.basename(target);
  if (!read(hub).includes(`href="../${filename}"`)) throw new Error(`Category-hub path to ${target} missing from ${hub}`);
  if (!read(relatedArticle).includes(`href="${filename}"`)) throw new Error(`Related-article path to ${target} missing from ${relatedArticle}`);
  if (!read(target).includes(`href="${servicePath}"`)) throw new Error(`Service path ${servicePath} missing from ${target}`);
}
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
expect('sitemap.xml', /<loc>https:\/\/odysseysolutions\.co\/resources\/urgent-same-day-it-support-houston\.html<\/loc><lastmod>2026-08-30<\/lastmod>/, 'Updated urgent-support sitemap date');
expect('resources/dental-practice-remote-access-workflow.html', /<h1>Remote IT Support for Dental Practices<\/h1>/, 'Dental remote-support guide heading');
expect('resources/dental-practice-remote-access-workflow.html', /dental_remote_access_to_remote_dental_it/, 'Dental remote-access service action');
expect('resources/dental-practice-remote-access-workflow.html', /multi-location-dental-it-standardization\.html/, 'Dental remote-access related guide');
expect('resources/multi-location-dental-it-standardization.html', /<h1>Multi-Location Dental IT: Standardize Every Office<\/h1>/, 'Multi-location dental IT guide heading');
expect('resources/multi-location-dental-it-standardization.html', /multi_location_dental_it_to_service/, 'Multi-location dental IT service action');
expect('resources/multi-location-dental-it-standardization.html', /case-studies\/trinity-dental-multi-location-it/, 'Multi-location dental IT case-study path');
expect('resources/dental-it/index.html', /dental-practice-remote-access-workflow\.html/, 'Dental hub remote-access guide path');
expect('resources/dental-it/index.html', /multi-location-dental-it-standardization\.html/, 'Dental hub multi-location guide path');
expect('resources/index.html', /dental-practice-remote-access-workflow\.html/, 'Resource hub remote-access guide path');
expect('resources/index.html', /multi-location-dental-it-standardization\.html/, 'Resource hub multi-location guide path');
expect('resources/ehr-it-support-houston-medical-practices.html', /<h1>EHR IT Support in Houston for Medical Practices<\/h1>/, 'EHR IT support guide heading');
expect('resources/ehr-it-support-houston-medical-practices.html', /ehr_support_to_healthcare_it/, 'EHR IT support service action');
expect('resources/healthcare-it/index.html', /ehr-it-support-houston-medical-practices\.html/, 'Healthcare hub EHR IT support guide path');
expect('resources/index.html', /ehr-it-support-houston-medical-practices\.html/, 'Resource hub EHR IT support guide path');
expect('sitemap.xml', /<loc>https:\/\/odysseysolutions\.co\/resources\/dental-practice-remote-access-workflow\.html<\/loc><lastmod>2026-09-04<\/lastmod>/, 'Dental remote-support sitemap entry');
expect('sitemap.xml', /<loc>https:\/\/odysseysolutions\.co\/resources\/multi-location-dental-it-standardization\.html<\/loc><lastmod>2026-09-03<\/lastmod>/, 'Multi-location dental IT sitemap entry');
expect('sitemap.xml', /<loc>https:\/\/odysseysolutions\.co\/resources\/ehr-it-support-houston-medical-practices\.html<\/loc><lastmod>2026-09-04<\/lastmod>/, 'EHR IT support sitemap entry');

console.log(`Growth-pass checks passed across ${htmlFiles.length} HTML files`);
