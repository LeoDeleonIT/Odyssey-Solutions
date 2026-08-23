(function () {
  if (window.__odysseySiteReady) return;
  window.__odysseySiteReady = true;

  window.dataLayer = window.dataLayer || [];
  window.odysseyTrackConversion = function (conversionName, details) {
    var payload = Object.assign({
      event: 'odyssey_conversion',
      conversion_name: conversionName,
      page_path: window.location.pathname
    }, details || {});

    window.dataLayer.push(payload);
    document.documentElement.setAttribute('data-odyssey-last-conversion', conversionName);
    window.dispatchEvent(new CustomEvent('odyssey:conversion', { detail: payload }));
  };

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href], [data-conversion]');
    if (!link) return;

    var destination = link.getAttribute('href') || '';
    var conversionName = link.getAttribute('data-conversion');
    if (!conversionName) {
      if (destination.indexOf('tel:') === 0) conversionName = 'click_to_call';
      else if (destination.indexOf('mailto:') === 0) conversionName = 'email_click';
      else if (destination.indexOf('calendly.com/') !== -1) conversionName = 'calendar_open';
      else if (link.hasAttribute('download') || /\.(pdf|docx|xlsx|zip)(?:[?#]|$)/i.test(destination)) conversionName = 'file_download';
    }
    if (!conversionName) return;

    var safeDestination = destination;
    var conversionLabel = link.getAttribute('data-conversion-label') || link.textContent.trim();
    if (destination.indexOf('tel:') === 0) safeDestination = 'phone';
    if (destination.indexOf('mailto:') === 0) safeDestination = 'email';
    if (destination.indexOf('tel:') === 0) conversionLabel = 'phone_link';
    if (destination.indexOf('mailto:') === 0) conversionLabel = 'email_link';

    window.odysseyTrackConversion(conversionName, {
      conversion_label: conversionLabel,
      destination: safeDestination
    });
  });

  function readAttribution() {
    var parameters = new URLSearchParams(window.location.search);
    var current = {
      landing_page: window.location.pathname,
      utm_source: parameters.get('utm_source') || '',
      utm_medium: parameters.get('utm_medium') || '',
      utm_campaign: parameters.get('utm_campaign') || ''
    };

    try {
      var stored = window.sessionStorage.getItem('odyssey_attribution');
      if (stored) return JSON.parse(stored);
      window.sessionStorage.setItem('odyssey_attribution', JSON.stringify(current));
    } catch (error) {
      // Attribution still works for this page when storage is unavailable.
    }
    return current;
  }

  var attribution = readAttribution();

  var style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = '/site-header.css?v=20260729b';
  document.head.appendChild(style);

  var currentPath = window.location.pathname.replace(/\/index\.html$/, '/');
  var servicePaths = [
    '/it-support-houston/', '/remote-it-support/', '/managed-it-services-houston/',
    '/dental-it-support-houston/', '/remote-dental-it-support/',
    '/dental-cybersecurity-houston/', '/people-compliance-platform/',
    '/hipaa-compliance-consulting-texas/', '/healthcare-it-support-houston/',
    '/healthcare-it-readiness-review/', '/web-development-houston/',
    '/hipaa-training-texas/'
  ];

  function isCurrent(path, prefix) {
    if (path === '/') return currentPath === '/';
    return prefix ? currentPath.indexOf(path) === 0 : currentPath === path;
  }

  function currentAttribute(path, prefix) {
    return isCurrent(path, prefix) ? ' aria-current="page"' : '';
  }

  function serviceLink(path, label) {
    return '<a href="' + path + '"' + currentAttribute(path, false) + '>' + label + '</a>';
  }

  var serviceActive = servicePaths.some(function (path) { return isCurrent(path, false); });
  var header = document.querySelector('.site-header');

  if (header) {
    header.className = 'site-header global-site-header';
    header.innerHTML =
      '<div class="global-header-inner">' +
        '<a class="global-brand" href="/" aria-label="Odyssey Solutions home">Odyss<span>e</span>y Solutions</a>' +
        '<nav class="global-desktop-nav" aria-label="Primary navigation">' +
          '<a href="/"' + currentAttribute('/', false) + '>Home</a>' +
          '<details class="global-services-menu' + (serviceActive ? ' active' : '') + '">' +
            '<summary aria-haspopup="true" aria-expanded="false">Services</summary>' +
            '<div class="global-services-panel">' +
              '<div class="global-service-group"><strong>Business IT</strong>' +
                serviceLink('/it-support-houston/', 'Business IT Support') +
                serviceLink('/remote-it-support/', 'Remote IT Support') +
                serviceLink('/managed-it-services-houston/', 'Managed IT Services') +
              '</div>' +
              '<div class="global-service-group"><strong>Dental &amp; Healthcare</strong>' +
                serviceLink('/dental-it-support-houston/', 'Dental IT Support') +
                serviceLink('/remote-dental-it-support/', 'Remote Dental IT') +
                serviceLink('/healthcare-it-support-houston/', 'Healthcare IT') +
                serviceLink('/healthcare-it-readiness-review/', 'Healthcare IT Readiness Review') +
              '</div>' +
              '<div class="global-service-group"><strong>Security &amp; Compliance</strong>' +
                serviceLink('/dental-cybersecurity-houston/', 'Dental Cybersecurity') +
                serviceLink('/hipaa-compliance-consulting-texas/', 'HIPAA Guidance') +
                serviceLink('/hipaa-training-texas/', 'HIPAA Training') +
              '</div>' +
              '<div class="global-service-group"><strong>Software &amp; Growth</strong>' +
                serviceLink('/people-compliance-platform/', 'HR + HIPAA Software') +
                serviceLink('/web-development-houston/', 'Websites, Tools & Apps') +
              '</div>' +
            '</div>' +
          '</details>' +
          '<a href="/case-studies/"' + currentAttribute('/case-studies/', true) + '>Results</a>' +
          '<a href="/service-areas/"' + currentAttribute('/service-areas/', true) + '>Service Areas</a>' +
          '<a href="/resources/"' + currentAttribute('/resources/', true) + '>Resources</a>' +
          '<a href="/about/"' + currentAttribute('/about/', true) + '>About</a>' +
          '<a class="global-book-button" href="https://calendly.com/zain-odysseysolutions/30min" data-conversion="calendar_open" data-conversion-label="global_header_desktop">Book Consultation</a>' +
        '</nav>' +
        '<button class="global-mobile-toggle" aria-controls="global-mobile-navigation" aria-expanded="false" aria-label="Open navigation">☰</button>' +
      '</div>' +
      '<nav id="global-mobile-navigation" class="global-mobile-nav" aria-label="Mobile navigation" hidden>' +
        '<a href="/"' + currentAttribute('/', false) + '>Home</a>' +
        '<div class="global-mobile-group"><strong>Business IT</strong>' +
          serviceLink('/it-support-houston/', 'Business IT Support') +
          serviceLink('/remote-it-support/', 'Remote IT Support') +
          serviceLink('/managed-it-services-houston/', 'Managed IT Services') +
        '</div>' +
        '<div class="global-mobile-group"><strong>Dental &amp; Healthcare</strong>' +
          serviceLink('/dental-it-support-houston/', 'Dental IT Support') +
          serviceLink('/remote-dental-it-support/', 'Remote Dental IT') +
          serviceLink('/healthcare-it-support-houston/', 'Healthcare IT') +
          serviceLink('/healthcare-it-readiness-review/', 'Healthcare IT Readiness Review') +
        '</div>' +
        '<div class="global-mobile-group"><strong>Security &amp; Compliance</strong>' +
          serviceLink('/dental-cybersecurity-houston/', 'Dental Cybersecurity') +
          serviceLink('/hipaa-compliance-consulting-texas/', 'HIPAA Guidance') +
          serviceLink('/hipaa-training-texas/', 'HIPAA Training') +
        '</div>' +
        '<div class="global-mobile-group"><strong>Software &amp; Growth</strong>' +
          serviceLink('/people-compliance-platform/', 'HR + HIPAA Software') +
          serviceLink('/web-development-houston/', 'Websites, Tools & Apps') +
        '</div>' +
        '<a href="/case-studies/"' + currentAttribute('/case-studies/', true) + '>Results</a>' +
        '<a href="/service-areas/"' + currentAttribute('/service-areas/', true) + '>Service Areas</a>' +
        '<a href="/resources/"' + currentAttribute('/resources/', true) + '>Resources</a>' +
        '<a href="/about/"' + currentAttribute('/about/', true) + '>About</a>' +
        '<a class="global-mobile-book" href="https://calendly.com/zain-odysseysolutions/30min" data-conversion="calendar_open" data-conversion-label="global_header_mobile">Book Consultation</a>' +
      '</nav>';
  }

  function limitedCampaignValue(value) {
    return String(value || '').trim().slice(0, 200);
  }

  function calendlyPlacement(link) {
    if (link.hasAttribute('data-conversion-label')) return link.getAttribute('data-conversion-label');
    if (link.closest('.site-header')) return 'header';
    if (link.closest('.site-footer')) return 'footer';
    if (link.closest('.cta-band')) return 'bottom_cta';
    if (link.closest('.sidebar, .contact-card')) return 'sidebar';
    if (link.closest('.inline-cta')) return 'inline_cta';
    return 'page_cta';
  }

  document.querySelectorAll('a[href^="https://calendly.com/zain-odysseysolutions/30min"]').forEach(function (link) {
    try {
      var bookingUrl = new URL(link.href);
      var placement = calendlyPlacement(link);
      var landingPage = attribution.landing_page || currentPath;
      var contentLabel = limitedCampaignValue(landingPage + '|' + currentPath + '|' + placement);

      if (!bookingUrl.searchParams.get('utm_source')) {
        bookingUrl.searchParams.set('utm_source', limitedCampaignValue(attribution.utm_source) || 'odyssey_website');
      }
      if (!bookingUrl.searchParams.get('utm_medium')) {
        bookingUrl.searchParams.set('utm_medium', limitedCampaignValue(attribution.utm_medium) || 'website');
      }
      if (!bookingUrl.searchParams.get('utm_campaign')) {
        bookingUrl.searchParams.set('utm_campaign', limitedCampaignValue(attribution.utm_campaign) || 'consultation');
      }
      if (!bookingUrl.searchParams.get('utm_content')) {
        bookingUrl.searchParams.set('utm_content', contentLabel);
      }

      link.href = bookingUrl.toString();
      link.setAttribute('data-conversion', 'calendar_open');
      link.setAttribute('data-conversion-label', placement);
    } catch (error) {
      // The original scheduling link remains usable if URL parsing fails.
    }
  });

  var toggle = document.querySelector('.global-mobile-toggle');
  var mobile = document.querySelector('.global-mobile-nav');
  if (toggle && mobile) {
    toggle.addEventListener('click', function () {
      var open = mobile.classList.toggle('open');
      mobile.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
  }

  document.querySelectorAll('.global-services-menu').forEach(function (menu) {
    var summary = menu.querySelector('summary');
    menu.addEventListener('toggle', function () {
      summary.setAttribute('aria-expanded', String(menu.open));
    });
    summary.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        summary.focus();
      }
    });
  });

  document.addEventListener('click', function (event) {
    document.querySelectorAll('.global-services-menu[open]').forEach(function (menu) {
      if (!menu.contains(event.target)) menu.open = false;
    });
  });

  var form = document.querySelector('[data-contact-form]');
  if (form) {
    var requestedService = new URLSearchParams(window.location.search).get('service');
    var serviceOptions = {
      'healthcare-it-readiness-review': 'Healthcare IT Readiness Review',
      'healthcare-it-support': 'Healthcare IT support',
      'dental-it-support': 'Dental IT support',
      'managed-it-services': 'Managed IT services',
      'digital-solution': 'Website, tool, or app'
    };
    var serviceField = form.querySelector('[name="service"]');
    if (serviceField && serviceOptions[requestedService]) {
      serviceField.value = serviceOptions[requestedService];
    }

    var attributionFields = {
      page_url: window.location.origin + window.location.pathname,
      landing_page: attribution.landing_page,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign
    };
    Object.keys(attributionFields).forEach(function (fieldName) {
      var field = form.querySelector('[name="' + fieldName + '"]');
      if (!field) {
        field = document.createElement('input');
        field.type = 'hidden';
        field.name = fieldName;
        form.appendChild(field);
      }
      field.value = attributionFields[fieldName] || '';
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var button = form.querySelector('button[type="submit"]');
      var status = form.querySelector('[data-form-status]');
      var original = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending...';
      status.textContent = '';
      try {
        var response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('send failed');
        form.reset();
        button.textContent = 'Message sent';
        status.textContent = 'Thank you. The Odyssey team will respond within one business day.';
        if (typeof window.odysseyTrackConversion === 'function') {
          window.odysseyTrackConversion('lead_form_submit', {
            form_name: form.getAttribute('data-form-name') || 'contact_form'
          });
        }
      } catch (error) {
        button.textContent = original;
        button.disabled = false;
        status.textContent = 'The form could not be sent. Call (832) 713-8498 or email info@odysseysolutions.co.';
      }
    });
  }
})();
