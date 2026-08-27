if (!window.__odysseySiteScriptLoading && !window.__odysseySiteReady) {
  window.__odysseySiteScriptLoading = true;
  const sharedSiteScript = document.createElement('script');
  sharedSiteScript.src = '/site.js?v=20260827d';
  document.head.appendChild(sharedSiteScript);
}

document.querySelectorAll('.resources-menu').forEach((menu) => {
  const trigger = menu.querySelector('summary');

  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      trigger.focus();
    }
  });
});

document.addEventListener('click', (event) => {
  document.querySelectorAll('.resources-menu[open]').forEach((menu) => {
    if (!menu.contains(event.target)) menu.open = false;
  });
});

document.querySelectorAll('.read-link').forEach((link) => {
  if (link.textContent.trim().toLowerCase() !== 'learn more') return;
  const card = link.closest('article');
  const heading = card && card.querySelector('h2, h3');
  if (heading) {
    const topic = heading.textContent.trim();
    link.setAttribute('aria-label', `Learn more about ${topic}`);
    const context = document.createElement('span');
    context.className = 'sr-only';
    context.textContent = ` about ${topic}`;
    link.append(context);
  }
});
