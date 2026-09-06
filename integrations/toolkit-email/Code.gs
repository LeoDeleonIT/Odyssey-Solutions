// Deploy as the verified leo@odysseysolutions.co account. MailApp uses the
// deploying account as sender; this script requests send-only authorization.
var TOOLKIT_MAILER = Object.freeze({
  toolkitUrl: 'https://odysseysolutions.co/resources/odyssey-it-resilience-toolkit/',
  downloadUrl: 'https://odysseysolutions.co/resources/downloads/odyssey-it-resilience-toolkit/odyssey-it-resilience-toolkit-full.zip',
  calendarUrl: 'https://calendly.com/zain-odysseysolutions/30min',
  publicContact: 'info@odysseysolutions.co',
  // MailApp documents a singular replyTo address. Verify the resulting header
  // and reply recipients with a controlled live test before public activation.
  replyTo: 'leo@odysseysolutions.co,zain@odysseysolutions.co',
  notificationTo: 'leo@odysseysolutions.co,zain@odysseysolutions.co',
  subject: 'Your Odyssey IT Resilience Toolkit',
  maxPostBytes: 4096,
  dailyRequestCap: 25,
  cooldownMs: 24 * 60 * 60 * 1000,
  maxReservations: 50,
  timezone: 'America/Chicago',
  stateKey: 'TOOLKIT_MAILER_STATE_V1',
  saltKey: 'TOOLKIT_MAILER_PRIVATE_SALT'
});

var TOOLKIT_EMAIL_BODY = [
  'Thanks for requesting the Odyssey IT Resilience Toolkit.',
  '',
  'Download the complete toolkit:',
  TOOLKIT_MAILER.downloadUrl,
  '',
  'The package includes dental AI-use and downtime templates plus the IT Resilience Tracker. You can preview the resources and download individual files here:',
  TOOLKIT_MAILER.toolkitUrl,
  '',
  'If you would like help applying the toolkit to your business, you can book a conversation with Odyssey:',
  TOOLKIT_MAILER.calendarUrl,
  '',
  'Odyssey Solutions',
  '(832) 713-8498',
  TOOLKIT_MAILER.publicContact,
  '',
  'You requested this copy through the Odyssey toolkit page.'
].join('\n');

// This helper requests the minimal mail scope and checks quota. It sends nothing.
function authorizeToolkitMailer() {
  return { remainingRecipientQuota: MailApp.getRemainingDailyQuota() };
}

function doGet() {
  return toolkitResult_('info');
}

function doPost(event) {
  var request;
  try {
    request = parseToolkitRequest_(event);
  } catch (error) {
    return toolkitResult_('invalid');
  }
  if (request._gotcha) return toolkitResult_('not_processed');

  var lock;
  var acquired = false;
  try {
    lock = LockService.getScriptLock();
    acquired = lock.tryLock(2000);
    if (!acquired) return toolkitResult_('unavailable');

    var properties = PropertiesService.getScriptProperties();
    var now = Date.now();
    var day = Utilities.formatDate(new Date(now), TOOLKIT_MAILER.timezone, 'yyyy-MM-dd');
    var rawState = properties.getProperty(TOOLKIT_MAILER.stateKey);
    var state = readToolkitState_(rawState, now, day);
    var salt = properties.getProperty(TOOLKIT_MAILER.saltKey);
    // Missing salt with existing reservations must not silently reset deduplication.
    if (!salt && rawState) throw new Error('Missing private mailer state');
    if (!salt) {
      salt = Utilities.getUuid() + Utilities.getUuid();
      properties.setProperty(TOOLKIT_MAILER.saltKey, salt);
    }
    var recipientKey = toolkitRecipientKey_(request.email, salt);
    if (Object.prototype.hasOwnProperty.call(state.recipients, recipientKey)) {
      return toolkitResult_('duplicate');
    }
    if (state.count >= TOOLKIT_MAILER.dailyRequestCap ||
        Object.keys(state.recipients).length >= TOOLKIT_MAILER.maxReservations ||
        MailApp.getRemainingDailyQuota() < 1 + TOOLKIT_MAILER.notificationTo.split(',').length) {
      return toolkitResult_('unavailable');
    }

    // Persist a reservation before either send. Keep it even after an ambiguous
    // provider error, so refreshing or retrying cannot blindly send another copy.
    state.count += 1;
    state.recipients[recipientKey] = now;
    properties.setProperty(TOOLKIT_MAILER.stateKey, JSON.stringify(state));

    try {
      MailApp.sendEmail({
        to: request.email,
        subject: TOOLKIT_MAILER.subject,
        body: TOOLKIT_EMAIL_BODY,
        name: 'Odyssey Solutions',
        replyTo: TOOLKIT_MAILER.replyTo
      });
    } catch (error) {
      return toolkitResult_('unconfirmed');
    }

    try {
      MailApp.sendEmail({
        to: TOOLKIT_MAILER.notificationTo,
        subject: 'Toolkit copy requested on the Odyssey website',
        body: 'A visitor requested one toolkit email.\n\n' +
          'Requester email: ' + request.email + '\n' +
          'Organization: ' + (request.company || 'Not provided') + '\n\n' +
          'The requester email was submitted to the mail service.\n' +
          'This request does not subscribe the visitor to marketing emails.',
        name: 'Odyssey Solutions',
        replyTo: TOOLKIT_MAILER.replyTo
      });
    } catch (error) {
      // The requested copy was already submitted. Do not report its delivery as
      // failed, retry either email, or log the requester's personal information.
      console.warn('Toolkit internal notification could not be confirmed.');
    }
    return toolkitResult_('accepted');
  } catch (error) {
    return toolkitResult_('unavailable');
  } finally {
    if (acquired) lock.releaseLock();
  }
}

function parseToolkitRequest_(event) {
  if (!event || event.queryString || !event.postData ||
      String(event.postData.type).split(';')[0].trim().toLowerCase() !== 'application/x-www-form-urlencoded') {
    throw new Error('Expected a native POST');
  }
  var length = Number(event.contentLength);
  var raw = event.postData.contents;
  if (!Number.isInteger(length) || length <= 0 || length > TOOLKIT_MAILER.maxPostBytes ||
      typeof raw !== 'string' || !raw || raw.length > TOOLKIT_MAILER.maxPostBytes ||
      Utilities.newBlob(raw).getBytes().length > TOOLKIT_MAILER.maxPostBytes) {
    throw new Error('Invalid POST size');
  }
  var request = Object.create(null);
  var allowed = ['email', 'company', '_gotcha', 'source'];
  raw.split('&').forEach(function (pair) {
    var equals = pair.indexOf('=');
    if (equals < 1) throw new Error('Invalid field');
    var name = decodeURIComponent(pair.slice(0, equals).replace(/\+/g, ' '));
    var value = decodeURIComponent(pair.slice(equals + 1).replace(/\+/g, ' '));
    if (allowed.indexOf(name) === -1 || Object.prototype.hasOwnProperty.call(request, name)) {
      throw new Error('Unexpected or repeated field');
    }
    request[name] = value;
  });
  if (request.source !== undefined && request.source !== 'odyssey-it-resilience-toolkit-email') {
    throw new Error('Unexpected source');
  }
  var email = String(request.email || '').trim();
  var localPart = email.split('@')[0];
  if (email.length > 254 || localPart.length > 64 ||
      !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?$/i.test(email) ||
      localPart.charAt(0) === '.' || localPart.slice(-1) === '.' || localPart.indexOf('..') !== -1) {
    throw new Error('Invalid single email');
  }
  var company = request.company || '';
  if (company.length > 160 || /[\u0000-\u001f\u007f]/.test(company)) throw new Error('Invalid organization');
  request.email = email;
  request.company = company.trim();
  return request;
}

function readToolkitState_(raw, now, day) {
  var state = raw ? JSON.parse(raw) : { day: day, count: 0, recipients: {} };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(state.day) || state.day > day ||
      !Number.isInteger(state.count) || state.count < 0 || state.count > TOOLKIT_MAILER.dailyRequestCap ||
      !state.recipients || typeof state.recipients !== 'object' || Array.isArray(state.recipients)) {
    throw new Error('Invalid private mailer state');
  }
  var keys = Object.keys(state.recipients);
  if (keys.length > TOOLKIT_MAILER.maxReservations) throw new Error('Mailer state exceeds bound');
  keys.forEach(function (key) {
    var timestamp = state.recipients[key];
    if (!/^[a-f0-9]{64}$/.test(key) || !Number.isSafeInteger(timestamp) || timestamp < 0 || timestamp > now) {
      throw new Error('Invalid reservation');
    }
    if (now - timestamp >= TOOLKIT_MAILER.cooldownMs) delete state.recipients[key];
  });
  if (state.day !== day) {
    state.day = day;
    state.count = 0;
  }
  return state;
}

function toolkitRecipientKey_(email, salt) {
  return Utilities.computeHmacSha256Signature(email.trim().toLowerCase(), salt)
    .map(function (byte) { return ('0' + (byte & 255).toString(16)).slice(-2); }).join('');
}

function toolkitResult_(kind) {
  var messages = {
    info: ['Get the IT Resilience Toolkit', 'Use the optional email form on the toolkit page to request one copy, or download the files directly below.'],
    accepted: ['Request received', 'Your toolkit email was submitted to our email service. Check your inbox for the toolkit link. If it does not arrive, you can still download the files below.'],
    duplicate: ['Download your toolkit', 'Email requests to the same address are limited to one every 24 hours. Another email has not been sent. You can download the files below.'],
    invalid: ['Check your request', 'Return to the toolkit page and enter one valid email address. Organization is optional and limited to 160 characters. You can also download the files below.'],
    not_processed: ['Use the direct download', 'This email request was not processed. You can download the files below or contact Odyssey for help.'],
    unavailable: ['Email temporarily unavailable', 'We cannot complete this email request right now. You can download the files below, call (832) 713-8498, or email info@odysseysolutions.co.'],
    unconfirmed: ['Use the direct download', 'We could not confirm that your toolkit email was submitted. To avoid duplicate emails, this request will not be retried automatically. You can download the files below or contact Odyssey for help.']
  };
  var copy = messages[kind];
  return HtmlService.createHtmlOutput('<!doctype html><html lang="en"><head><base target="_top">' +
    '<style>body{margin:0;background:#f4f7fb;color:#0f172a;font:17px/1.6 system-ui,sans-serif}' +
    'main{max-width:680px;margin:8vh auto;padding:36px;background:white;border:1px solid #dbe3ee;border-radius:18px}' +
    'h1{font-size:30px;line-height:1.2}a{color:#075985}nav{display:grid;gap:12px;margin:26px 0}' +
    '.download{background:#075985;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;text-align:center}' +
    '.brand{font-weight:700}.note{font-size:14px;color:#475569}@media(max-width:720px){main{margin:20px;padding:24px}}</style></head><body><main>' +
    '<p class="brand">Odyssey Solutions</p><h1>' + copy[0] + '</h1><p role="status">' + copy[1] + '</p>' +
    '<nav aria-label="Toolkit and support"><a class="download" href="' + TOOLKIT_MAILER.downloadUrl + '">Download the complete toolkit</a>' +
    '<a href="' + TOOLKIT_MAILER.toolkitUrl + '">Preview resources and individual files</a>' +
    '<a href="' + TOOLKIT_MAILER.calendarUrl + '">Book a conversation with Odyssey</a></nav>' +
    '<p><a href="tel:+18327138498">(832) 713-8498</a> · <a href="mailto:' + TOOLKIT_MAILER.publicContact + '">' + TOOLKIT_MAILER.publicContact + '</a></p>' +
    '<p class="note">One requested toolkit copy. This does not subscribe you to marketing emails.</p></main></body></html>')
    .setTitle('Odyssey toolkit email')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
