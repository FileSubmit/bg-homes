import template from './header.html?raw';

export function renderHeader() {
  return template;
}

export function hydrateHeader(root) {
  const menuToggle = root.querySelector('[data-menu-toggle]');
  const navMenu = root.querySelector('[data-nav-menu]');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      const isHidden = navMenu.classList.toggle('hidden');
      menuToggle.setAttribute('aria-expanded', String(!isHidden));
    });
  }

  setHeaderActive(window.location.pathname);
}

export function setHeaderActive(pathname) {
  const navLinks = document.querySelectorAll('[data-nav-link]');

  navLinks.forEach((link) => {
    const isActive = link.getAttribute('href') === pathname || (pathname.startsWith('/properties/') && link.getAttribute('href') === '/properties');

    link.classList.toggle('text-slate-900', isActive);
    link.classList.toggle('text-slate-600', !isActive);
    link.classList.toggle('font-semibold', isActive);
    link.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}