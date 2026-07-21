document.querySelectorAll('.resources-menu').forEach((menu) => {
  const trigger = menu.querySelector('summary');

  menu.addEventListener('toggle', () => {
    trigger.setAttribute('aria-expanded', String(menu.open));
  });

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
