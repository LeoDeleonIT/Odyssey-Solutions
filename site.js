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
    var link = event.target.closest('[data-conversion]');
    if (!link) return;

    window.odysseyTrackConversion(link.getAttribute('data-conversion'), {
      conversion_label: link.getAttribute('data-conversion-label') || link.textContent.trim(),
      destination: link.getAttribute('href') || ''
    });
  });

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
    '/web-development-houston/', '/hipaa-training-texas/'
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
              '</div>' +
              '<div class="global-service-group"><strong>Security &amp; Compliance</strong>' +
                serviceLink('/dental-cybersecurity-houston/', 'Dental Cybersecurity') +
                serviceLink('/hipaa-compliance-consulting-texas/', 'HIPAA Guidance') +
                serviceLink('/hipaa-training-texas/', 'HIPAA Training') +
              '</div>' +
              '<div class="global-service-group"><strong>Software &amp; Growth</strong>' +
                serviceLink('/people-compliance-platform/', 'HR + HIPAA Software') +
                serviceLink('/web-development-houston/', 'Web Development') +
              '</div>' +
            '</div>' +
          '</details>' +
          '<a href="/case-studies/"' + currentAttribute('/case-studies/', true) + '>Results</a>' +
          '<a href="/service-areas/"' + currentAttribute('/service-areas/', true) + '>Service Areas</a>' +
          '<a href="/resources/"' + currentAttribute('/resources/', true) + '>Resources</a>' +
          '<a href="/about/"' + currentAttribute('/about/', true) + '>About</a>' +
          '<a class="global-book-button" href="/contact/">Book Consultation</a>' +
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
        '</div>' +
        '<div class="global-mobile-group"><strong>Security &amp; Compliance</strong>' +
          serviceLink('/dental-cybersecurity-houston/', 'Dental Cybersecurity') +
          serviceLink('/hipaa-compliance-consulting-texas/', 'HIPAA Guidance') +
          serviceLink('/hipaa-training-texas/', 'HIPAA Training') +
        '</div>' +
        '<div class="global-mobile-group"><strong>Software &amp; Growth</strong>' +
          serviceLink('/people-compliance-platform/', 'HR + HIPAA Software') +
          serviceLink('/web-development-houston/', 'Web Development') +
        '</div>' +
        '<a href="/case-studies/"' + currentAttribute('/case-studies/', true) + '>Results</a>' +
        '<a href="/service-areas/"' + currentAttribute('/service-areas/', true) + '>Service Areas</a>' +
        '<a href="/resources/"' + currentAttribute('/resources/', true) + '>Resources</a>' +
        '<a href="/about/"' + currentAttribute('/about/', true) + '>About</a>' +
        '<a class="global-mobile-book" href="/contact/">Book Consultation</a>' +
      '</nav>';
  }

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
        status.textContent = 'The form could not be sent. Call (832) 805-8467 or email leo@odysseysolutions.co.';
      }
    });
  }
})();
