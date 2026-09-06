const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('site.js', 'utf8');

function createFixture(fetchOk, search = '', pathname = '/contact/', options = {}) {
  const gtagCalls = [];
  const documentListeners = {};
  const formListeners = {};
  const serviceListeners = {};
  const formFields = new Map();
  const serviceField = {
    value: 'Business IT support',
    addEventListener(name, listener) {
      serviceListeners[name] = listener;
    }
  };
  const urgentSupportNote = { hidden: true };
  const button = { disabled: false, textContent: 'Send message' };
  const status = { textContent: '' };
  const form = {
    action: 'https://formspree.io/f/mbdqzoqd',
    listeners: formListeners,
    addEventListener(name, listener) {
      formListeners[name] = listener;
    },
    appendChild(field) { formFields.set(field.name, field); },
    getAttribute(name) {
      return name === 'data-form-name' ? 'contact' : null;
    },
    querySelector(selector) {
      if (selector === '[name="service"]') return serviceField;
      if (selector === '[data-urgent-support-note]') return urgentSupportNote;
      if (selector === 'button[type="submit"]') return button;
      if (selector === '[data-form-status]') return status;
      const fieldName = /^\[name="([^"]+)"\]$/.exec(selector)?.[1];
      if (fieldName) return formFields.get(fieldName) || null;
      return null;
    },
    reset() {
      serviceField.value = '';
    }
  };
  const context = {
    URL,
    URLSearchParams,
    FormData: class FormData {
      constructor(formValue) {
        if (formValue !== form) throw new Error('Unexpected form submitted');
      }
    },
    CustomEvent: class CustomEvent {
      constructor(type, options) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    fetch: options.fetch || (async () => ({ ok: fetchOk })),
    document: {
      documentElement: { setAttribute() {} },
      head: { appendChild() {} },
      addEventListener(name, listener) {
        if (!documentListeners[name]) documentListeners[name] = [];
        documentListeners[name].push(listener);
      },
      createElement() {
        return {};
      },
      querySelector(selector) {
        if (selector === '[data-contact-form]') return form;
        return null;
      },
      querySelectorAll(selector) {
        if (selector === 'a[href^="https://calendly.com/zain-odysseysolutions/30min"]') {
          return options.calendlyLinks || [];
        }
        return [];
      }
    },
    window: {
      dataLayer: [],
      dispatchEvent() {},
      gtag(...args) {
        gtagCalls.push(args);
      },
      location: {
        origin: 'https://odysseysolutions.co',
        pathname,
        search
      },
      sessionStorage: options.sessionStorage || {
        getItem() { return null; },
        setItem() {}
      }
    }
  };

  context.window.window = context.window;
  vm.runInNewContext(source, context, { filename: 'site.js' });
  return { button, context, documentListeners, formFields, formListeners, gtagCalls, serviceField, serviceListeners, status, urgentSupportNote };
}

async function verifySuccessfulForm() {
  const fixture = createFixture(true);
  await fixture.formListeners.submit({ preventDefault() {} });
  const leadCalls = fixture.gtagCalls.filter(([command, name]) => command === 'event' && name === 'generate_lead');
  if (leadCalls.length !== 1) throw new Error('Successful form submission must emit generate_lead exactly once');
  const parameters = leadCalls[0][2];
  if (parameters.form_name !== 'contact' || parameters.service_category !== 'business_it_support') {
    throw new Error('Successful form submission must include only safe form context');
  }
  if (!fixture.button.disabled || fixture.button.textContent !== 'Message sent') {
    throw new Error('Successful submission must prevent an accidental duplicate request');
  }
}

async function verifyFailedForm() {
  const fixture = createFixture(false);
  await fixture.formListeners.submit({ preventDefault() {} });
  if (fixture.gtagCalls.some(([command, name]) => command === 'event' && name === 'generate_lead')) {
    throw new Error('Failed form submission must not emit generate_lead');
  }
  if (!fixture.status.textContent.includes('could not be sent')) {
    throw new Error('Failed form submission must show a recovery message');
  }
}

async function verifyNetworkFailureAndRetry() {
  let attempts = 0;
  const fixture = createFixture(true, '', '/contact/', {
    fetch: async () => {
      attempts += 1;
      if (attempts === 1) throw new TypeError('Network request failed');
      return { ok: true };
    }
  });
  await fixture.formListeners.submit({ preventDefault() {} });
  if (fixture.gtagCalls.some(([command, name]) => command === 'event' && name === 'generate_lead')) {
    throw new Error('Network failure must not emit generate_lead');
  }
  if (fixture.button.disabled || fixture.button.textContent !== 'Send message' || fixture.serviceField.value !== 'Business IT support') {
    throw new Error('Network failure must preserve the form and restore its submit button for retry');
  }
  if (!fixture.status.textContent.includes('(832) 713-8498') || !fixture.status.textContent.includes('info@odysseysolutions.co')) {
    throw new Error('Network failure must provide phone and email recovery options');
  }
  await fixture.formListeners.submit({ preventDefault() {} });
  const leadCalls = fixture.gtagCalls.filter(([command, name]) => command === 'event' && name === 'generate_lead');
  if (attempts !== 2 || leadCalls.length !== 1 || !fixture.button.disabled || fixture.button.textContent !== 'Message sent') {
    throw new Error('A successful retry must emit one lead and prevent another accidental request');
  }
}

function createLink(href, label, attributes = {}) {
  return {
    href,
    textContent: label,
    closest(selector) {
      return selector === 'a[href], [data-conversion]' ? this : null;
    },
    getAttribute(name) {
      if (name === 'href') return this.href;
      return attributes[name] || null;
    },
    setAttribute(name, value) {
      if (name === 'href') this.href = value;
      else attributes[name] = value;
    },
    hasAttribute(name) { return Object.hasOwn(attributes, name); }
  };
}

function verifyDecoratedCalendlyLink() {
  const bookingBase = 'https://calendly.com/zain-odysseysolutions/30min';
  const link = createLink(bookingBase, 'Book a consultation', { 'data-conversion-label': 'contact_hero' });
  const fixture = createFixture(true, '?utm_source=search&utm_medium=organic&utm_campaign=dental_it&email=private%40example.test&name=Private', '/contact/', {
    calendlyLinks: [link]
  });
  const expectedUrl = new URL(bookingBase);
  expectedUrl.searchParams.set('utm_source', 'search');
  expectedUrl.searchParams.set('utm_medium', 'organic');
  expectedUrl.searchParams.set('utm_campaign', 'dental_it');
  expectedUrl.searchParams.set('utm_content', '/contact/|/contact/|contact_hero');
  if (link.href !== expectedUrl.toString()) {
    throw new Error('Calendly decoration must preserve the booking destination and add only expected attribution');
  }
  for (const listener of fixture.documentListeners.click) listener({ target: link });
  const events = fixture.gtagCalls.filter(([command, name]) => command === 'event' && name === 'calendar_open');
  const expectedParameters = {
    conversion_name: 'calendar_open',
    page_path: '/contact/',
    conversion_label: 'contact_hero',
    destination: expectedUrl.toString()
  };
  const parameters = events[0]?.[2] || {};
  if (events.length !== 1 || Object.keys(parameters).length !== Object.keys(expectedParameters).length ||
      Object.entries(expectedParameters).some(([name, value]) => parameters[name] !== value)) {
    throw new Error('A decorated Calendly click must emit one event containing only approved interaction context');
  }
}

function verifyBlockedAttributionStorage() {
  for (const blockedMethod of ['getItem', 'setItem']) {
    const link = createLink('https://calendly.com/zain-odysseysolutions/30min', 'Book a consultation');
    const sessionStorage = {
      getItem() { return null; },
      setItem() {}
    };
    sessionStorage[blockedMethod] = () => { throw new Error('Storage unavailable'); };
    const fixture = createFixture(true, '?utm_source=referral&utm_medium=website&utm_campaign=healthcare', '/contact/', {
      calendlyLinks: [link],
      sessionStorage
    });
    const bookingUrl = new URL(link.href);
    const expectedAttribution = {
      landing_page: '/contact/',
      utm_source: 'referral',
      utm_medium: 'website',
      utm_campaign: 'healthcare'
    };
    for (const [name, value] of Object.entries(expectedAttribution)) {
      if (fixture.formFields.get(name)?.value !== value) {
        throw new Error(`Blocked ${blockedMethod} must preserve current-page ${name} for the contact form`);
      }
      if (name.startsWith('utm_') && bookingUrl.searchParams.get(name) !== value) {
        throw new Error(`Blocked ${blockedMethod} must preserve current-page ${name} for Calendly`);
      }
    }
    for (const listener of fixture.documentListeners.click) listener({ target: link });
    if (fixture.gtagCalls.filter(([command, name]) => command === 'event' && name === 'calendar_open').length !== 1) {
      throw new Error(`Blocked ${blockedMethod} must not prevent Calendly click measurement`);
    }
  }
}

function verifyContactClick(href, eventName, expectedDestination) {
  const fixture = createFixture(true);
  fixture.documentListeners.click[0]({ target: createLink(href, 'Contact Odyssey') });
  const events = fixture.gtagCalls.filter(([command, name]) => command === 'event' && name === eventName);
  if (events.length !== 1) throw new Error(`${eventName} must emit exactly once`);
  if (events[0][2].destination !== expectedDestination) {
    throw new Error(`${eventName} must use a privacy-safe destination`);
  }
}

function verifyDownloadUsesEnhancedMeasurement() {
  const fixture = createFixture(true);
  fixture.documentListeners.click[0]({ target: createLink('/downloads/odyssey-toolkit.pdf', 'Download toolkit') });
  if (fixture.gtagCalls.some(([command]) => command === 'event')) {
    throw new Error('Downloads must rely on GA4 enhanced measurement, not a duplicate custom event');
  }
}

function verifyResourceServiceClick() {
  const fixture = createFixture(true);
  const link = createLink('/managed-it-services-houston/', 'Explore managed IT services', {
    'data-conversion': 'resource_service_cta',
    'data-conversion-label': 'cybersecurity_checklist_to_managed_it',
    'data-service-category': 'cybersecurity'
  });
  fixture.documentListeners.click[0]({ target: link });
  const events = fixture.gtagCalls.filter(([command, name]) => command === 'event' && name === 'resource_service_cta');
  if (events.length !== 1 || events[0][2].conversion_label !== 'cybersecurity_checklist_to_managed_it' || events[0][2].service_category !== 'cybersecurity') {
    throw new Error('Resource service CTA must emit its named conversion exactly once');
  }
}

function verifyInferredResourceServiceClick() {
  const fixture = createFixture(true, '', '/resources/example-guide.html');
  const link = createLink('/managed-it-services-houston/', 'Explore managed IT services');
  fixture.documentListeners.click[0]({ target: link });
  const events = fixture.gtagCalls.filter(([command, name]) => command === 'event' && name === 'resource_service_cta');
  if (events.length !== 1 || events[0][2].conversion_label !== 'resource_link_to_managed_it_services' || events[0][2].service_category !== 'managed_it_services') {
    throw new Error('Unmarked resource service links must emit a privacy-safe service conversion');
  }
}

function verifyServicePreselection() {
  const cases = [
    ['business-it-support', 'Business IT support'],
    ['cybersecurity', 'Cybersecurity'],
    ['hipaa-guidance', 'HIPAA guidance or training'],
    ['hipaa-training', 'HIPAA guidance or training'],
    ['hr-hipaa-demo', 'HR and HIPAA software demo'],
    ['urgent-it-support', 'Urgent IT support'],
    ['technology-project', 'One-time IT project'],
    ['ongoing-it-support', 'Managed IT services']
  ];
  for (const [service, expected] of cases) {
    const fixture = createFixture(true, `?service=${service}`);
    const selected = fixture.context.document.querySelector('[data-contact-form]').querySelector('[name="service"]').value;
    if (selected !== expected) throw new Error(`${service} must preselect ${expected}`);
    if (service === 'urgent-it-support' && fixture.urgentSupportNote.hidden) {
      throw new Error('Urgent support preselection must reveal the urgent contact guidance');
    }
  }
}

Promise.resolve()
  .then(verifySuccessfulForm)
  .then(verifyFailedForm)
  .then(verifyNetworkFailureAndRetry)
  .then(() => verifyContactClick('tel:+18327138498', 'click_to_call', 'phone'))
  .then(() => verifyContactClick('mailto:info@odysseysolutions.co', 'email_click', 'email'))
  .then(() => verifyContactClick('https://calendly.com/zain-odysseysolutions/30min', 'calendar_open', 'https://calendly.com/zain-odysseysolutions/30min'))
  .then(verifyDecoratedCalendlyLink)
  .then(verifyBlockedAttributionStorage)
  .then(verifyDownloadUsesEnhancedMeasurement)
  .then(verifyResourceServiceClick)
  .then(verifyInferredResourceServiceClick)
  .then(verifyServicePreselection)
  .then(() => console.log('Measurement behavior checks passed'))
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
