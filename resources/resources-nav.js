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
