const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pagePath = 'resources/odyssey-it-resilience-toolkit/index.html';
const html = fs.readFileSync(path.join(root, pagePath), 'utf8');
const site = fs.readFileSync(path.join(root, 'site.js'), 'utf8');
const privacy = fs.readFileSync(path.join(root, 'privacy/index.html'), 'utf8');
const args = process.argv.slice(2);
const allowPending = args.includes('--allow-pending');
const pendingEndpoint = 'APPS_SCRIPT_TOOLKIT_ENDPOINT_PENDING';
const checks = [];

function check(name, verify) {
  try {
    verify();
    checks.push({ name, passed: true });
  } catch (error) {
    checks.push({ name, passed: false, reason: error.message });
  }
}

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g)) {
    result[match[1]] = match[2] ?? match[3] ?? '';
  }
  return result;
}

const forms = [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)].map((match) => ({
  attributes: attributes(match[1]),
  body: match[2]
}));
const copyForms = forms.filter((form) => form.attributes['data-form-name'] === 'toolkit_email');
const reviewForms = forms.filter((form) => form.attributes['data-form-name'] === 'toolkit_review');
const copyForm = copyForms[0];
const reviewForm = reviewForms[0];

check('Only the explicit preparation flag may bypass a pending endpoint', () => {
  assert.ok(args.length <= 1 && args.every((argument) => argument === '--allow-pending'),
    'Usage: node scripts/verify-toolkit-email.js [--allow-pending]');
});

check('Two distinct forms, with an accessible email request', () => {
  assert.equal(copyForms.length, 1, 'One optional toolkit email form is required');
  assert.equal(reviewForms.length, 1, 'Keep the existing toolkit review form');
  assert.equal(forms.length, 2, 'The page should contain only the copy and review forms');
  assert.ok(Object.hasOwn(copyForm.attributes, 'data-toolkit-email-form'));
  assert.ok(!Object.hasOwn(copyForm.attributes, 'data-contact-form'));
  assert.equal(copyForm.attributes.method.toLowerCase(), 'post');
  assert.equal(copyForm.attributes.target, '_blank');
  assert.equal(copyForm.attributes.rel, 'noopener');
  assert.ok(!Object.hasOwn(copyForm.attributes, 'novalidate'), 'Native browser validation must stay enabled');
  assert.ok(!Object.hasOwn(copyForm.attributes, 'enctype') || copyForm.attributes.enctype === 'application/x-www-form-urlencoded');
  assert.equal(copyForm.attributes['aria-labelledby'], 'toolkit-copy-heading');
  assert.match(html, /<h2 id="toolkit-copy-heading">Email me a copy<\/h2>/);
  assert.match(copyForm.body, /Confirmation opens in a new tab\./);
  assert.doesNotMatch(copyForm.body, /data-form-status/, 'Only the response tab can confirm delivery');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'Email and review fields must have unique IDs');
});

check('Email is required and organization is optional', () => {
  assert.ok(copyForm, 'Toolkit email form is missing');
  const fields = [...copyForm.body.matchAll(/<(input|select|textarea)\b([^>]*)>/g)]
    .map((match) => ({ tag: match[1], ...attributes(match[2]) }));
  const email = fields.find((field) => field.name === 'email');
  const company = fields.find((field) => field.name === 'company');
  assert.ok(email && company, 'Both requested fields must exist');
  assert.equal(email.type, 'email');
  assert.equal(email.autocomplete, 'email');
  assert.ok(Object.hasOwn(email, 'required'));
  assert.equal(company.autocomplete, 'organization');
  assert.equal(company.maxlength, '160', 'Match the delivery service organization limit');
  assert.ok(!Object.hasOwn(company, 'required'), 'Organization must not block a request');
  assert.deepEqual(fields.filter((field) => Object.hasOwn(field, 'required')).map((field) => field.name), ['email']);
  assert.deepEqual(fields.filter((field) => field.type !== 'hidden' && field.name !== '_gotcha').map((field) => field.name), ['email', 'company']);
  for (const field of [email, company]) {
    assert.ok(copyForm.body.includes(`<label for="${field.id}">`), `${field.name} must have a visible label`);
  }
  const trap = fields.find((field) => field.name === '_gotcha');
  assert.ok(trap, 'Keep the existing form spam-control pattern');
  assert.equal(trap['aria-hidden'], 'true');
  assert.equal(trap.tabindex, '-1');
  assert.equal(trap.autocomplete, 'off');
  assert.ok(trap.class.split(/\s+/).includes('sr-only'));
});

check('A requested copy does not enroll the visitor in marketing', () => {
  assert.ok(copyForm, 'Toolkit email form is missing');
  assert.match(html, /Receive the toolkit download link and an invitation to discuss your IT needs\./);
  assert.match(copyForm.body, /One requested email\. This does not enroll you in marketing emails\./);
  assert.match(copyForm.body, /href="\/privacy\/">privacy policy<\/a>/);
  assert.match(copyForm.body, /type="submit">Email me a copy<\/button>/);
  const names = [...copyForm.body.matchAll(/\bname="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(names.sort(), ['_gotcha', 'company', 'email', 'source'].sort(), 'Only the four fields accepted by the delivery service may be submitted');
  assert.match(copyForm.body, /type="hidden" name="source" value="odyssey-it-resilience-toolkit-email"/);
  const submit = attributes(copyForm.body.match(/<button\b([^>]*)>/)?.[1] || '');
  assert.equal(submit.type, 'submit');
  assert.ok(!Object.hasOwn(submit, 'name'), 'A named submit button would add an unsupported backend field');
  assert.ok(!Object.hasOwn(submit, 'formnovalidate'));
});

check('All existing direct downloads stay available without signup', () => {
  const prefix = '/resources/downloads/odyssey-it-resilience-toolkit/';
  const expected = new Map([
    ['odyssey-it-resilience-toolkit-full.zip', 2],
    ['odyssey-dental-ai-use-policy-template.pdf', 1],
    ['odyssey-dental-ai-use-policy-template.docx', 1],
    ['odyssey-dental-practice-it-downtime-plan.pdf', 1],
    ['odyssey-dental-practice-it-downtime-plan.docx', 1],
    ['odyssey-it-resilience-tracker.xlsx', 1]
  ]);
  const links = [...html.matchAll(/<a\b([^>]*)>/g)].map((match) => attributes(match[1]))
    .filter((link) => link.href?.startsWith(prefix));
  assert.equal(links.length, 7, 'Keep the hero, bundle and five individual download links');
  for (const [filename, count] of expected) {
    const matching = links.filter((link) => link.href === prefix + filename);
    assert.equal(matching.length, count, `${filename} direct link changed`);
    assert.ok(fs.existsSync(path.join(root, prefix.slice(1), filename)), `${filename} must remain public`);
    for (const link of matching) {
      assert.ok(Object.hasOwn(link, 'download'));
      assert.equal(link['data-conversion'], 'toolkit_download');
      assert.ok(!Object.hasOwn(link, 'hidden') && link['aria-hidden'] !== 'true');
    }
  }
  assert.match(html, /<span>No signup required<\/span>/);
  for (const form of forms) assert.ok(!form.body.includes(prefix), 'Do not place public downloads behind a form');
});

check('The existing review request stays separate', () => {
  assert.ok(reviewForm, 'Existing review form is missing');
  assert.equal(reviewForm.attributes.action, 'https://formspree.io/f/mbdqzoqd');
  assert.equal(reviewForm.attributes['data-form-name'], 'toolkit_review');
  assert.ok(Object.hasOwn(reviewForm.attributes, 'data-contact-form'));
  assert.ok(!Object.hasOwn(reviewForm.attributes, 'data-toolkit-email-form'));
  assert.ok(!Object.hasOwn(reviewForm.attributes, 'target'));
  assert.ok(!Object.hasOwn(reviewForm.attributes, 'rel'));
  assert.match(reviewForm.body, /name="_subject" value="Odyssey IT Resilience Toolkit Review Request"/);
  assert.match(reviewForm.body, /name="source" value="odyssey-it-resilience-toolkit"/);
  const names = [...reviewForm.body.matchAll(/\bname="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(names, ['_subject', 'source', 'name', 'email', 'company', 'priority', 'lead_source', 'message', '_gotcha']);
  for (const name of ['name', 'email', 'message']) {
    const field = [...reviewForm.body.matchAll(/<(?:input|textarea)\b([^>]*)>/g)]
      .map((match) => attributes(match[1])).find((item) => item.name === name);
    assert.ok(field && Object.hasOwn(field, 'required'), `Keep the required review ${name} field`);
  }
  assert.match(reviewForm.body, /type="submit">Request Toolkit Review<\/button>/);
  assert.match(reviewForm.body, /aria-live="polite"[^>]*data-form-status/);
});

check('Native requests do not claim success or emit a source-page conversion', () => {
  assert.ok(copyForm, 'Toolkit email form is missing');
  assert.doesNotMatch(copyForm.body, /data-conversion|\bon(?:submit|click)\s*=/);
  assert.ok(!Object.keys(copyForm.attributes).some((name) => /^on/i.test(name)));
  assert.doesNotMatch(site, /toolkit_email_request|data-toolkit-email-form|isToolkitEmail/,
    'The source page must not intercept or confirm native delivery requests');
  assert.match(site, /querySelector\('\[data-contact-form\]'\)/, 'Keep the existing review-form handler');
});

check('Search metadata and public page identity stay stable', () => {
  assert.match(html, /<title>Free IT Resilience Toolkit \| Odyssey<\/title>/);
  assert.ok(html.includes('<meta name="description" content="Download a free AI-use policy, dental downtime plan, and IT resilience tracker for backup tests, vendors, insurance, and office moves.">'));
  assert.ok(html.includes('<link rel="canonical" href="https://odysseysolutions.co/resources/odyssey-it-resilience-toolkit/">'));
  assert.ok(html.includes('G-VPKTJC4QXJ'));
  assert.ok(html.includes('https://calendly.com/zain-odysseysolutions/30min'));
});

check('The toolkit offers a broader business path without relabeling dental templates', () => {
  assert.match(html, /href="#email-copy">Email Me a Copy<\/a>/,
    'The optional email form should be reachable from the hero');
  assert.match(html, /professional offices, service businesses, nonprofits, and growing teams organize backup tests, vendor records, office moves, and follow-up actions\./);
  assert.match(html, /The AI-use policy and downtime plan are written specifically for dental practices\./,
    'Dental-specific resources must remain clearly labeled');
  assert.match(html, /<h2>Discuss one IT priority with Odyssey<\/h2>/);
  assert.match(html, /You can start a conversation before completing the files\./);
  assert.doesNotMatch(html, /Review the completed files with Odyssey/);
});

check('Privacy notice explains toolkit delivery and limited request data', () => {
  const notice = privacy.match(/<p>The optional toolkit email form[\s\S]*?<\/p>/)?.[0];
  assert.ok(notice, 'The privacy policy must describe the optional toolkit email service');
  assert.match(notice, /Google Apps Script and Google Workspace/);
  assert.match(notice, /email address and optional organization in its business mailbox/);
  assert.match(notice, /does not subscribe you to marketing emails/);
  assert.match(notice, /temporarily stores a salted hash of the email address and request counters/);
  assert.match(notice, /limit duplicate requests and abuse/);
  assert.match(notice, /Form entries are not sent to Google Analytics/);
});

check(allowPending && copyForm?.attributes.action === pendingEndpoint
  ? 'Pending endpoint is explicitly allowed for preparation only'
  : 'The email request uses a deployed Apps Script web app endpoint', () => {
  assert.ok(copyForm, 'Toolkit email form is missing');
  if (allowPending && copyForm.attributes.action === pendingEndpoint) return;
  assert.ok(!html.includes(pendingEndpoint), 'Replace APPS_SCRIPT_TOOLKIT_ENDPOINT_PENDING with the verified deployed /exec URL before publication. Use --allow-pending only for preparation checks.');
  assert.match(copyForm.attributes.action, /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/,
    'Use the public deployment URL, not an editor or development URL');
  assert.notEqual(copyForm.attributes.action, reviewForm.attributes.action, 'Email delivery must not reuse the review form endpoint');
});

for (const item of checks) {
  console.log(`${item.passed ? 'PASS' : 'FAIL'} ${item.name}${item.reason ? `: ${item.reason}` : ''}`);
}
if (checks.some((item) => !item.passed)) process.exitCode = 1;
else if (allowPending && copyForm.attributes.action === pendingEndpoint) {
  console.log('PREPARATION ONLY: markup and privacy checks passed with a pending endpoint. Publication is blocked until normal validation passes and provider delivery is independently verified.');
} else console.log('Toolkit email markup and form routing checks passed. Provider delivery still requires independent verification.');
