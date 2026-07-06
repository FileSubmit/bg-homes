import { getAuthLabel, getAuthState, signOut } from '../../lib/auth.js';
import { escapeHtml } from '../../lib/format.js';
import { fetchUnreadMessageCount } from '../../lib/messages.js';

const MESSAGES_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
`;

const MENU_ICON = `
  <svg data-icon-menu viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-5 w-5">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
`;

const CLOSE_ICON = `
  <svg data-icon-close viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="hidden h-5 w-5">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
`;

function getInitials(label) {
  const parts = label.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  const first = parts[0][0] ?? '';
  const second = parts.length > 1 ? parts[1][0] ?? '' : '';

  return `${first}${second}`.toUpperCase();
}

function navLink(href, label, pathname, { mobile = false } = {}) {
  const isActive = href === pathname || (href === '/properties' && pathname.startsWith('/properties/'));

  const desktopClasses = `relative py-2 text-sm font-semibold transition after:absolute after:-bottom-[1px] after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-emerald-500 after:transition-transform after:content-[''] ${
    isActive ? 'text-slate-900 after:scale-x-100' : 'text-slate-600 hover:text-slate-900 hover:after:scale-x-100'
  }`;

  const mobileClasses = `block rounded-xl px-3 py-2 text-base font-semibold transition ${
    isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
  }`;

  return `
    <a
      data-nav-link
      href="${href}"
      class="${mobile ? mobileClasses : desktopClasses}"
      aria-current="${isActive ? 'page' : 'false'}"
    >
      ${label}
    </a>
  `;
}

function authLinksDesktop(authState, pathname) {
  if (!authState.user) {
    return `
      ${navLink('/login', 'Вход', pathname)}
      <a
        href="/register"
        data-nav-link
        class="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Регистрация
      </a>
    `;
  }

  const label = getAuthLabel();
  const greeting = escapeHtml(label);
  const initials = escapeHtml(getInitials(label));
  const adminBadge = authState.isAdmin
    ? `
      <a
        href="/admin"
        data-nav-link
        class="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 transition hover:bg-emerald-100 lg:inline-flex"
      >
        Админ
      </a>
    `
    : '';

  return `
    <a
      href="/add-property"
      data-nav-link
      class="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-4 w-4">
        <path d="M12 5v14M5 12h14" />
      </svg>
      Добави имот
    </a>
    ${adminBadge}
    <a
      href="/profile?tab=messages"
      data-nav-link
      data-messages-link
      title="Съобщения"
      class="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-900 hover:text-slate-900"
    >
      ${MESSAGES_ICON}
      <span data-messages-badge class="absolute -right-1 -top-1 hidden h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white"></span>
    </a>
    <a href="/profile" data-nav-link class="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
      <span class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">${initials}</span>
      <span class="hidden max-w-[8rem] truncate xl:inline">${greeting}</span>
    </a>
    <button
      type="button"
      data-logout-button
      title="Изход"
      class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-rose-300 hover:text-rose-600"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
    </button>
  `;
}

function authLinksMobile(authState, pathname) {
  if (!authState.user) {
    return `
      ${navLink('/login', 'Вход', pathname, { mobile: true })}
      ${navLink('/register', 'Регистрация', pathname, { mobile: true })}
    `;
  }

  const greeting = escapeHtml(getAuthLabel());
  const adminLink = authState.isAdmin ? navLink('/admin', 'Админ', pathname, { mobile: true }) : '';

  return `
    <p class="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Здравей, ${greeting}</p>
    ${navLink('/add-property', 'Добави имот', pathname, { mobile: true })}
    <a data-nav-link data-messages-link href="/profile?tab=messages" class="flex items-center justify-between rounded-xl px-3 py-2 text-base font-semibold text-slate-700 transition hover:bg-slate-50">
      Съобщения
      <span data-messages-badge class="hidden h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold leading-none text-white"></span>
    </a>
    ${navLink('/profile', 'Профил', pathname, { mobile: true })}
    ${adminLink}
    <button
      type="button"
      data-logout-button
      class="mt-1 block w-full rounded-xl px-3 py-2 text-left text-base font-semibold text-rose-600 transition hover:bg-rose-50"
    >
      Изход
    </button>
  `;
}

export function renderHeader(pathname = window.location.pathname, authState = getAuthState()) {
  return `
    <header data-site-header class="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div class="border-b border-slate-100 bg-slate-900 text-slate-300">
        <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-xs sm:px-6 lg:px-8">
          <a href="mailto:contact@bghomes.bg" class="flex items-center gap-1.5 transition hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
              <path d="M3 6l9 6 9-6M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
            </svg>
            <span class="hidden sm:inline">contact@bghomes.bg</span>
          </a>
          <div class="flex items-center gap-3 font-medium">
            <a href="/properties?transaction_type=sale" data-nav-link class="transition hover:text-white">За продажба</a>
            <span class="h-3 w-px bg-slate-700"></span>
            <a href="/properties?transaction_type=rent" data-nav-link class="transition hover:text-white">Под наем</a>
          </div>
        </div>
      </div>

      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <a href="/" class="flex items-center gap-2.5">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
              <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
            </svg>
          </span>
          <span class="flex flex-col leading-none">
            <span class="text-lg font-bold tracking-tight text-slate-900">BG Homes</span>
            <span class="hidden text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400 sm:block">Имоти в България</span>
          </span>
        </a>

        <nav class="hidden items-center gap-6 md:flex">
          ${navLink('/', 'Начало', pathname)}
          ${navLink('/properties', 'Имоти', pathname)}
        </nav>

        <div class="hidden items-center gap-3 md:flex">
          ${authLinksDesktop(authState, pathname)}
        </div>

        <button
          type="button"
          data-menu-toggle
          class="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-700 md:hidden"
          aria-expanded="false"
          aria-controls="primary-nav"
        >
          ${MENU_ICON}
          ${CLOSE_ICON}
        </button>
      </div>

      <nav id="primary-nav" data-nav-menu class="hidden border-t border-slate-100 bg-white px-4 pb-4 pt-2 md:hidden">
        <div class="flex flex-col gap-1">
          ${navLink('/', 'Начало', pathname, { mobile: true })}
          ${navLink('/properties', 'Имоти', pathname, { mobile: true })}
          <div class="my-1 border-t border-slate-100"></div>
          ${authLinksMobile(authState, pathname)}
        </div>
      </nav>
    </header>
  `;
}

let pollHandle = null;

function updateMessagesBadges(count) {
  document.querySelectorAll('[data-messages-badge]').forEach((badge) => {
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : String(count);
      badge.classList.remove('hidden');
      badge.classList.add('flex');
    } else {
      badge.textContent = '';
      badge.classList.add('hidden');
      badge.classList.remove('flex');
    }
  });
}

export async function refreshUnreadBadge() {
  const authState = getAuthState();

  if (!authState.user) {
    updateMessagesBadges(0);
    return;
  }

  const { count } = await fetchUnreadMessageCount(authState.user.id);
  updateMessagesBadges(count);
}

function ensureUnreadPolling() {
  if (pollHandle) {
    return;
  }

  pollHandle = setInterval(refreshUnreadBadge, 20000);
}

export function hydrateHeader(root) {
  const menuToggle = root.querySelector('[data-menu-toggle]');
  const navMenu = root.querySelector('[data-nav-menu]');
  const logoutButtons = root.querySelectorAll('[data-logout-button]');
  const menuIcon = root.querySelector('[data-icon-menu]');
  const closeIcon = root.querySelector('[data-icon-close]');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      const isHidden = navMenu.classList.toggle('hidden');
      menuToggle.setAttribute('aria-expanded', String(!isHidden));
      menuIcon?.classList.toggle('hidden', !isHidden);
      closeIcon?.classList.toggle('hidden', isHidden);
    });
  }

  logoutButtons.forEach((logoutButton) => {
    logoutButton.addEventListener('click', async () => {
      await signOut();
    });
  });

  void refreshUnreadBadge();
  ensureUnreadPolling();
}
