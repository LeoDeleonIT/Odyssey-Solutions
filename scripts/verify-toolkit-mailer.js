const assert = require('assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('integrations/toolkit-email/Code.gs', 'utf8');
const manifest = JSON.parse(fs.readFileSync('integrations/toolkit-email/appsscript.json', 'utf8'));
const toolkitUrl = 'https://odysseysolutions.co/resources/odyssey-it-resilience-toolkit/';
const downloadUrl = 'https://odysseysolutions.co/resources/downloads/odyssey-it-resilience-toolkit/odyssey-it-resilience-toolkit-full.zip';
const calendarUrl = 'https://calendly.com/zain-odysseysolutions/30min';
const expectedBody = `Thanks for requesting the Odyssey IT Resilience Toolkit.

Download the complete toolkit:
${downloadUrl}

The package includes dental AI-use and downtime templates plus the IT Resilience Tracker. You can preview the resources and download individual files here:
${toolkitUrl}

If you would like help applying the toolkit to your business, you can book a conversation with Odyssey:
${calendarUrl}

Odyssey Solutions
(832) 713-8498
info@odysseysolutions.co

You requested this copy through the Odyssey toolkit page.`;

function fixture(options = {}) {
  let now = Date.parse('2026-09-06T15:00:00Z');
  let quota = options.quota ?? 1500;
  let held = false;
  const properties = new Map();
  const calls = { attempts: [], recipients: 0, warnings: [], quota: 0, properties: 0, locks: 0, releases: 0 };
  class Clock extends Date { static now() { return now; } }
  const context = {
    Date: Clock,
    console: { warn(message) { calls.warnings.push(message); } },
    MailApp: {
      getRemainingDailyQuota() { calls.quota += 1; return quota; },
      sendEmail(message) {
        assert.ok(held, 'Mail sends remain inside the script lock to serialize quota decisions');
        calls.attempts.push(JSON.parse(JSON.stringify(message)));
        if (options.failSend === calls.attempts.length) throw new Error('Provider error containing private@example.test');
        const recipients = message.to.split(',').length;
        assert.ok(quota >= recipients, 'A send has enough remaining recipient quota');
        calls.recipients += recipients;
        quota -= recipients;
      }
    },
    LockService: {
      getScriptLock() {
        return {
          tryLock(timeout) {
            calls.locks += 1;
            assert.equal(timeout, 2000);
            held = options.lockAvailable !== false;
            return held;
          },
          releaseLock() { calls.releases += 1; held = false; }
        };
      }
    },
    PropertiesService: {
      getScriptProperties() {
        calls.properties += 1;
        return {
          getProperty(key) { return properties.get(key) ?? null; },
          setProperty(key, value) {
            if (options.failReservationWrite && key === 'TOOLKIT_MAILER_STATE_V1') throw new Error('State unavailable');
            properties.set(key, value);
          }
        };
      }
    },
    Utilities: {
      getUuid() { return crypto.randomUUID(); },
      newBlob(text) { return { getBytes() { return [...Buffer.from(text, 'utf8')]; } }; },
      formatDate(date, timezone, format) {
        assert.equal(timezone, 'America/Chicago');
        assert.equal(format, 'yyyy-MM-dd');
        return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
      },
      computeHmacSha256Signature(text, salt) { return [...crypto.createHmac('sha256', salt).update(text).digest()]; }
    },
    HtmlService: {
      createHtmlOutput(content) {
        return {
          content,
          setTitle(title) { this.title = title; return this; },
          addMetaTag(name, value) { this[name] = value; return this; }
        };
      }
    }
  };
  vm.runInNewContext(source, context, { filename: 'Code.gs' });
  return { context, calls, properties, advance(ms) { now += ms; }, state() { return JSON.parse(properties.get('TOOLKIT_MAILER_STATE_V1')); } };
}

function request(fields = {}, overrides = {}) {
  const contents = new URLSearchParams({ email: 'requester@example.test', company: 'Example office', _gotcha: '', source: 'odyssey-it-resilience-toolkit-email', ...fields }).toString();
  return { queryString: null, contentLength: Buffer.byteLength(contents), postData: { type: 'application/x-www-form-urlencoded', contents }, ...overrides };
}

function rawRequest(contents, overrides = {}) {
  return { queryString: null, contentLength: Buffer.byteLength(contents), postData: { type: 'application/x-www-form-urlencoded', contents }, ...overrides };
}

function assertRecovery(result) {
  for (const url of [toolkitUrl, downloadUrl, calendarUrl, 'mailto:info@odysseysolutions.co', 'tel:+18327138498']) assert.ok(result.content.includes(url));
  assert.doesNotMatch(result.content, /requester@example\.test|private@example\.test|Example office|<script|postMessage|gtag|dataLayer/i);
}

let checked = 0;
function test(label, run) {
  try { run(); checked += 1; } catch (error) { throw new Error(`${label}: ${error.message}`); }
}

test('Send-only deployment manifest', () => {
  assert.deepEqual(manifest.oauthScopes, ['https://www.googleapis.com/auth/script.send_mail']);
  assert.deepEqual(manifest.webapp, { access: 'ANYONE_ANONYMOUS', executeAs: 'USER_DEPLOYING' });
  assert.equal(manifest.timeZone, 'America/Chicago');
  assert.doesNotMatch(source, /GmailApp|DriveApp|SpreadsheetApp|UrlFetchApp|setXFrameOptionsMode|ALLOWALL|ContentService|ScriptApp\.getOAuthToken/);
});

test('GET and authorization helper never send', () => {
  const f = fixture();
  assertRecovery(f.context.doGet({ parameter: { email: 'requester@example.test' } }));
  assert.equal(f.calls.attempts.length, 0);
  assert.equal(f.calls.quota + f.calls.properties + f.calls.locks, 0);
  assert.equal(f.context.authorizeToolkitMailer().remainingRecipientQuota, 1500);
  assert.equal(f.calls.quota, 1);
  assert.equal(f.calls.attempts.length, 0);
  assert.equal(f.properties.size, 0);
});

test('One fixed requested copy and separate internal notification', () => {
  const f = fixture();
  const result = f.context.doPost(request());
  assert.match(result.content, /Request received/);
  assert.match(result.content, /submitted to our email service/);
  assertRecovery(result);
  assert.equal(f.calls.attempts.length, 2);
  assert.deepEqual(f.calls.attempts[0], { to: 'requester@example.test', subject: 'Your Odyssey IT Resilience Toolkit', body: expectedBody, name: 'Odyssey Solutions', replyTo: 'leo@odysseysolutions.co,zain@odysseysolutions.co' });
  assert.equal(f.calls.attempts[1].to, 'leo@odysseysolutions.co,zain@odysseysolutions.co');
  assert.equal(f.calls.attempts[1].replyTo, 'leo@odysseysolutions.co,zain@odysseysolutions.co');
  assert.equal(f.calls.recipients, 3);
  assert.doesNotMatch(result.content, /leo@|zain@/);
  assert.equal(f.calls.attempts[1].subject, 'Toolkit copy requested on the Odyssey website');
  assert.match(f.calls.attempts[1].body, /Requester email: requester@example.test\nOrganization: Example office/);
  assert.deepEqual(Object.keys(f.calls.attempts[1]).sort(), ['body', 'name', 'replyTo', 'subject', 'to']);
  assert.equal(f.state().count, 1);
  assert.equal(Object.keys(f.state().recipients).length, 1);
  assert.doesNotMatch(JSON.stringify([...f.properties]), /requester|example|Example office/);
  assert.equal(f.calls.releases, 1);
});

test('Organization optional and bounded text never changes requested copy', () => {
  for (const company of ['', 'A'.repeat(160), '<b>Private organization</b>']) {
    const f = fixture();
    const result = f.context.doPost(request({ company }));
    assert.match(result.content, /Request received/);
    assert.equal(f.calls.attempts[0].body, expectedBody);
    assert.doesNotMatch(result.content, /Private organization/);
  }
});

for (const email of ['', 'not-an-email', 'a@example.test,b@example.test', 'a@example.test;b@example.test', 'Name <a@example.test>', 'a@example.test\r\nBcc: b@example.test', '.first@example.test', 'two..dots@example.test', 'last.@example.test', 'a@-invalid.test', `${'a'.repeat(65)}@example.test`, `a@${'b'.repeat(250)}.test`]) {
  test(`Reject invalid single address ${JSON.stringify(email)}`, () => {
    const f = fixture(); const result = f.context.doPost(request({ email }));
    assert.match(result.content, /Check your request/); assertRecovery(result);
    assert.equal(f.calls.attempts.length + f.calls.locks, 0);
  });
}

for (const company of ['a'.repeat(161), 'line\nbreak', 'control\u0000character']) {
  test('Reject oversized or control-character organization', () => {
    const f = fixture(); assert.match(f.context.doPost(request({ company })).content, /Check your request/);
    assert.equal(f.calls.attempts.length, 0);
  });
}

for (const suffix of ['&email=second%40example.test', '&%65mail=second%40example.test', '&company=duplicate', '&_gotcha=duplicate', '&source=duplicate', '&subject=Injected', '&body=Injected', '&cc=third%40example.test', '&bcc=third%40example.test', '&url=https%3A%2F%2Fevil.example', '&replyTo=third%40example.test', '&__proto__=x', '&broken', '&bad=%ZZ']) {
  test(`Reject repeated, unknown or malformed parameter ${suffix}`, () => {
    const f = fixture(); const valid = request();
    assert.match(f.context.doPost(rawRequest(valid.postData.contents + suffix)).content, /Check your request/);
    assert.equal(f.calls.attempts.length + f.calls.locks, 0);
  });
}

test('POST only, native encoding, fixed source, and real byte cap', () => {
  const inputs = [undefined, request({}, { queryString: 'email=requester%40example.test' }), request({ source: 'different' }), request({}, { contentLength: 4097 }), request({}, { contentLength: -1 }), request({}, { postData: { type: 'application/json', contents: '{}' } }), rawRequest('email=a%40example.test&company=' + 'x'.repeat(4096)), rawRequest('email=a%40example.test&company=' + '🧭'.repeat(1100), { contentLength: 50 })];
  for (const input of inputs) {
    const f = fixture(); assert.match(f.context.doPost(input).content, /Check your request/); assert.equal(f.calls.attempts.length, 0);
  }
});

test('Honeypot has no mail, lock, quota or persistent-state effect', () => {
  const f = fixture(); const result = f.context.doPost(request({ _gotcha: 'bot-filled' }));
  assert.match(result.content, /not processed/); assertRecovery(result);
  assert.equal(f.calls.attempts.length + f.calls.locks + f.calls.quota + f.properties.size, 0);
});

test('Normalized address deduplication persists across calls', () => {
  const f = fixture(); f.context.doPost(request());
  const result = f.context.doPost(request({ email: '  REQUESTER@EXAMPLE.TEST  ' }));
  assert.match(result.content, /limited to one every 24 hours/); assertRecovery(result);
  assert.equal(f.calls.attempts.length, 2); assert.equal(f.state().count, 1);
});

test('Private salt prevents reusable public address hashes', () => {
  const a = fixture(); const b = fixture(); a.context.doPost(request()); b.context.doPost(request());
  assert.notEqual(Object.keys(a.state().recipients)[0], Object.keys(b.state().recipients)[0]);
});

test('24-hour cooldown survives date rollover and expired cleanup allows later copy', () => {
  const f = fixture(); f.context.doPost(request()); f.advance(14 * 60 * 60 * 1000);
  assert.match(f.context.doPost(request()).content, /limited to one every 24 hours/);
  f.advance(10 * 60 * 60 * 1000);
  assert.match(f.context.doPost(request()).content, /Request received/);
  assert.equal(f.calls.attempts.length, 4); assert.equal(f.state().count, 1); assert.equal(Object.keys(f.state().recipients).length, 1);
});

test('Daily request cap limits three-recipient requests to 75 recipients', () => {
  const f = fixture();
  for (let i = 0; i < 25; i += 1) assert.match(f.context.doPost(request({ email: `person${i}@example.test` })).content, /Request received/);
  assert.match(f.context.doPost(request({ email: 'beyond-cap@example.test' })).content, /temporarily unavailable/);
  assert.equal(f.calls.attempts.length, 50); assert.equal(f.calls.recipients, 75); assert.equal(f.state().count, 25);
});

test('Quota floor reserves capacity for visitor and both internal recipients', () => {
  for (const quota of [0, 1, 2]) { const f = fixture({ quota }); assert.match(f.context.doPost(request()).content, /temporarily unavailable/); assert.equal(f.calls.attempts.length, 0); }
  const f = fixture({ quota: 3 }); assert.match(f.context.doPost(request()).content, /Request received/); assert.equal(f.calls.attempts.length, 2); assert.equal(f.calls.recipients, 3);
  assert.match(f.context.doPost(request({ email: 'next@example.test' })).content, /temporarily unavailable/);
  assert.equal(f.calls.attempts.length, 2);
});

test('Concurrent lock failure has no side effects', () => {
  const f = fixture({ lockAvailable: false }); assertRecovery(f.context.doPost(request()));
  assert.equal(f.calls.attempts.length + f.calls.properties + f.calls.quota + f.calls.releases, 0);
});

test('Reservation failure prevents both sends', () => {
  const f = fixture({ failReservationWrite: true }); assert.match(f.context.doPost(request()).content, /temporarily unavailable/);
  assert.equal(f.calls.attempts.length, 0); assert.equal(f.calls.releases, 1);
});

test('Ambiguous requester failure preserves reservation and never blindly retries', () => {
  const f = fixture({ failSend: 1 }); const result = f.context.doPost(request());
  assert.match(result.content, /could not confirm/); assertRecovery(result);
  assert.equal(f.calls.attempts.length, 1); assert.equal(f.state().count, 1);
  assert.match(f.context.doPost(request()).content, /limited to one every 24 hours/);
  assert.equal(f.calls.attempts.length, 1); assert.equal(f.calls.releases, 2);
});

test('Internal notification failure does not mislabel or repeat accepted copy', () => {
  const f = fixture({ failSend: 2 }); const result = f.context.doPost(request());
  assert.match(result.content, /Request received/); assertRecovery(result);
  assert.equal(f.calls.attempts.length, 2); assert.equal(f.calls.warnings.length, 1);
  assert.doesNotMatch(JSON.stringify(f.calls.warnings), /requester|private|example\.test/);
  f.context.doPost(request()); assert.equal(f.calls.attempts.length, 2);
});

test('Corrupt or oversized state and missing salt fail closed', () => {
  const states = ['not-json', JSON.stringify({ day: '2026-09-06', count: 99, recipients: {} }), JSON.stringify({ day: '2026-09-06', count: 1, recipients: Object.fromEntries(Array.from({ length: 51 }, (_, i) => [i.toString(16).padStart(64, '0'), 1])) })];
  for (const state of states) {
    const f = fixture(); f.properties.set('TOOLKIT_MAILER_STATE_V1', state);
    assert.match(f.context.doPost(request()).content, /temporarily unavailable/); assert.equal(f.calls.attempts.length, 0);
  }
  const f = fixture(); f.context.doPost(request()); f.properties.delete('TOOLKIT_MAILER_PRIVATE_SALT');
  assert.match(f.context.doPost(request({ email: 'new@example.test' })).content, /temporarily unavailable/); assert.equal(f.calls.attempts.length, 2);
});

console.log(`Toolkit mailer checks passed: ${checked} mocked behavior cases; no real email or Google authorization used.`);
