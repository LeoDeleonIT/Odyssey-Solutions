const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('site.js', 'utf8');

function createFixture(fetchOk) {
  const gtagCalls = [];
  const documentListeners = {};
  const formListeners = {};
  const serviceField = { value: 'Business IT support' };
  const button = { disabled: false, textContent: 'Send message' };
  const status = { textContent: '' };
  const form = {
    action: 'https://formspree.io/f/mbdqzoqd',
    listeners: formListeners,
    addEventListener(name, listener) {
      formListeners[name] = listener;
    },
    appendChild() {},
    getAttribute(name) {
      return name === 'data-form-name' ? 'contact' : null;
    },
    querySelector(selector) {
      if (selector === '[name="service"]') return serviceField;
      if (selector === 'button[type="submit"]') return button;
      if (selector === '[data-form-status]') return status;
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
    fetch: async () => ({ ok: fetchOk }),
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
      querySelectorAll() {
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
        pathname: '/contact/',
        search: ''
      },
      sessionStorage: {
        getItem() { return null; },
        setItem() {}
      }
    }
  };

  context.window.window = context.window;
  vm.runInNewContext(source, context, { filename: 'site.js' });
  return { button, context, documentListeners, formListeners, gtagCalls, status };
}

async function verifySuccessfulForm() {
  const fixture = createFixture(true);
  await fixture.formListeners.submit({ preventDefault() {} });
  const leadCalls = fixture.gtagCalls.filter(([command, name]) => command === 'event' && name === 'generate_lead');
  if (leadCalls.length !== 1) throw new Error('Successful form submission must emit generate_lead exactly once');
  const parameters = leadCalls[0][2];
  if (parameters.form_name !== 'contact' || parameters.service_category !== 'Business IT support') {
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

function createLink(href, label) {
  return {
    textContent: label,
    closest(selector) {
      return selector === 'a[href], [data-conversion]' ? this : null;
    },
    getAttribute(name) {
      return name === 'href' ? href : null;
    },
    hasAttribute() { return false; }
  };
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

Promise.resolve()
  .then(verifySuccessfulForm)
  .then(verifyFailedForm)
  .then(() => verifyContactClick('tel:+18327138498', 'click_to_call', 'phone'))
  .then(() => verifyContactClick('mailto:info@odysseysolutions.co', 'email_click', 'email'))
  .then(() => verifyContactClick('https://calendly.com/zain-odysseysolutions/30min', 'calendar_open', 'https://calendly.com/zain-odysseysolutions/30min'))
  .then(verifyDownloadUsesEnhancedMeasurement)
  .then(() => console.log('Measurement behavior checks passed'))
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
