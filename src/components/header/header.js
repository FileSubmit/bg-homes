import { getAuthLabel, getAuthState, signOut } from '../../lib/auth.js';

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function navLink(href, label, pathname) {
  const isActive = href === pathname || (href === '/properties' && pathname.startsWith('/properties/'));

  return `
    <a
      data-nav-link
      href="${href}"
      class="text-sm font-medium transition ${isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'}"
      aria-current="${isActive ? 'page' : 'false'}"
    >
      ${label}
    </a>
  `;
}

function authLinks(authState, pathname) {
  if (!authState.user) {
    return `
      ${navLink('/login', 'Login', pathname)}
      ${navLink('/register', 'Register', pathname)}
    `;
  }

  const adminLink = authState.isAdmin ? navLink('/admin', 'Admin', pathname) : '';
  const greeting = escapeHtml(getAuthLabel());

  return `
    <span class="text-sm font-medium text-slate-500">Hi, ${greeting}</span>
    <button
      type="button"
      data-logout-button
      class="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
    >
      Sign out
    </button>
    ${adminLink}
  `;
}

export function renderHeader(pathname = window.location.pathname, authState = getAuthState()) {
  return `
    <header class="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <a href="/" class="text-lg font-semibold tracking-tight text-slate-900">BG Homes</a>
        <button
          type="button"
          data-menu-toggle
          class="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 md:hidden"
          aria-expanded="false"
          aria-controls="primary-nav"
        >
          Menu
        </button>
        <nav id="primary-nav" data-nav-menu class="hidden w-full md:block md:w-auto">
          <ul class="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-6">
            <li>${navLink('/', 'Home', pathname)}</li>
            <li>${navLink('/properties', 'Properties', pathname)}</li>
            <li class="hidden md:block md:h-4 md:w-px md:bg-slate-200"></li>
            <li class="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-4">
              ${authLinks(authState, pathname)}
            </li>
          </ul>
        </nav>
      </div>
    </header>
  `;
}

export function hydrateHeader(root) {
  const menuToggle = root.querySelector('[data-menu-toggle]');
  const navMenu = root.querySelector('[data-nav-menu]');
  const logoutButton = root.querySelector('[data-logout-button]');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      const isHidden = navMenu.classList.toggle('hidden');
      menuToggle.setAttribute('aria-expanded', String(!isHidden));
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      await signOut();
    });
  }
}