import './header.scss';
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
  <svg data-icon-close viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="d-none h-5 w-5">
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

function navAnchor(href, label, isActive, { mobile = false } = {}) {
  const desktopClasses = `site-nav-link ${isActive ? 'active' : ''}`;

  const mobileClasses = `d-block rounded-4 px-6 py-2 fs-6 fw-semibold transition ${
    isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover-bg-slate-50'
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

function navLink(href, label, pathname, options = {}) {
  const isActive = href === pathname;

  return navAnchor(href, label, isActive, options);
}

function transactionNavLink(transactionType, label, pathname, activeTransactionType, options = {}) {
  const isActive = pathname.startsWith('/properties') && activeTransactionType === transactionType;

  return navAnchor(`/properties?transaction_type=${transactionType}`, label, isActive, options);
}

function authLinksDesktop(authState, pathname) {
  if (!authState.user) {
    return `
      ${navLink('/login', 'Вход', pathname)}
      <a
        href="/register"
        data-nav-link
        class="rounded-pill bg-slate-900 px-3 py-2 fs-sm fw-semibold text-white transition hover-bg-slate-800"
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
        class="d-none rounded-pill border border-emerald-200 bg-emerald-50 px-6 py-1 fs-xs fw-semibold text-uppercase tracking-wide text-emerald-700 transition hover-bg-emerald-100 d-lg-inline-flex"
      >
        Админ
      </a>
    `
    : '';

  return `
    <a
      href="/add-property"
      data-nav-link
      class="d-inline-flex align-items-center gap-17 rounded-pill bg-emerald-600 px-3 py-2 fs-sm fw-semibold text-white shadow-sm transition hover-bg-emerald-500"
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
      class="position-relative d-inline-flex h-9 w-9 align-items-center justify-content-center rounded-pill border border-slate-200 text-slate-500 transition hover-border-slate-900 hover-text-slate-900"
    >
      ${MESSAGES_ICON}
      <span data-messages-badge class="position-absolute header-badge-offset d-none h-4 min-w-4 align-items-center justify-content-center rounded-pill bg-rose-500 px-1 header-badge-text fw-bold lh-1 text-white"></span>
    </a>
    <a href="/profile" data-nav-link class="d-flex align-items-center gap-2 rounded-pill py-1 ps-1 pe-6 fs-sm fw-medium text-slate-700 transition hover-bg-slate-100">
      <span class="d-flex h-8 w-8 align-items-center justify-content-center rounded-circle bg-slate-900 fs-xs fw-semibold text-white">${initials}</span>
      <span class="d-none header-greeting text-truncate d-xl-inline">${greeting}</span>
    </a>
    <button
      type="button"
      data-logout-button
      title="Изход"
      class="d-inline-flex h-9 w-9 align-items-center justify-content-center rounded-pill border border-slate-200 text-slate-500 transition hover-border-rose-300 hover-text-rose-600"
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
    <p class="px-6 pb-1 pt-6 fs-xs fw-semibold text-uppercase tracking-wide text-slate-400">Здравей, ${greeting}</p>
    ${navLink('/add-property', 'Добави имот', pathname, { mobile: true })}
    <a data-nav-link data-messages-link href="/profile?tab=messages" class="d-flex align-items-center justify-content-between rounded-4 px-6 py-2 fs-6 fw-semibold text-slate-700 transition hover-bg-slate-50">
      Съобщения
      <span data-messages-badge class="d-none h-5 min-w-5 align-items-center justify-content-center rounded-pill bg-rose-500 px-17 fs-xs fw-bold lh-1 text-white"></span>
    </a>
    ${navLink('/profile', 'Профил', pathname, { mobile: true })}
    ${adminLink}
    <button
      type="button"
      data-logout-button
      class="mt-1 d-block w-100 rounded-4 px-6 py-2 text-start fs-6 fw-semibold text-rose-600 transition hover-bg-rose-50"
    >
      Изход
    </button>
  `;
}

export function renderHeader(pathname = window.location.pathname, authState = getAuthState(), search = window.location.search) {
  const activeTransactionType = new URLSearchParams(search).get('transaction_type');

  return `
    <header data-site-header class="position-sticky top-0 z-40 border-bottom border-slate-200-80 bg-white-85 backdrop-blur-md">
      <div class="border-bottom border-slate-100 bg-slate-900 text-slate-300">
        <div class="mx-auto d-flex max-w-7xl align-items-center justify-content-between gap-3 px-3 px-sm-4 px-lg-9 py-17 fs-xs">
          <a href="mailto:contact@bghomes.bg" class="d-flex align-items-center gap-17 transition hover-text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
              <path d="M3 6l9 6 9-6M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
            </svg>
            <span class="d-none d-sm-inline">contact@bghomes.bg</span>
          </a>
          <div class="d-flex align-items-center gap-6 fw-medium">
            <a href="/properties?transaction_type=sale" data-nav-link class="transition hover-text-white">За продажба</a>
            <span class="h-3 w-px bg-slate-700"></span>
            <a href="/properties?transaction_type=rent" data-nav-link class="transition hover-text-white">Под наем</a>
          </div>
        </div>
      </div>

      <div class="mx-auto d-flex max-w-7xl align-items-center justify-content-between gap-3 px-3 py-6 px-sm-4 px-lg-9">
        <a href="/" class="d-flex align-items-center gap-18">
          <span class="d-flex h-9 w-9 align-items-center justify-content-center rounded-4 bg-emerald-600 text-white shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
              <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
            </svg>
          </span>
          <span class="d-flex flex-column lh-1">
            <span class="fs-6 fw-bold tracking-tight text-slate-900">BG Homes</span>
            <span class="d-none header-tagline fw-medium text-uppercase tracking-widest text-slate-400 d-sm-block">Имоти в България</span>
          </span>
        </a>

        <nav class="d-none align-items-center gap-4 d-md-flex">
          ${navLink('/', 'Начало', pathname)}
          ${transactionNavLink('sale', 'Продажби', pathname, activeTransactionType)}
          ${transactionNavLink('rent', 'Наеми', pathname, activeTransactionType)}
        </nav>

        <div class="d-none align-items-center gap-6 d-md-flex">
          ${authLinksDesktop(authState, pathname)}
        </div>

        <button
          type="button"
          data-menu-toggle
          class="d-inline-flex align-items-center justify-content-center rounded-pill border border-slate-200 p-2 text-slate-700 d-md-none"
          aria-expanded="false"
          aria-controls="primary-nav"
        >
          ${MENU_ICON}
          ${CLOSE_ICON}
        </button>
      </div>

      <nav id="primary-nav" data-nav-menu class="d-none border-top border-slate-100 bg-white px-3 pb-3 pt-2 d-md-none">
        <div class="d-flex flex-column gap-1">
          ${navLink('/', 'Начало', pathname, { mobile: true })}
          ${transactionNavLink('sale', 'Продажби', pathname, activeTransactionType, { mobile: true })}
          ${transactionNavLink('rent', 'Наеми', pathname, activeTransactionType, { mobile: true })}
          <div class="my-1 border-top border-slate-100"></div>
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
      badge.classList.remove('d-none');
      badge.classList.add('d-flex');
    } else {
      badge.textContent = '';
      badge.classList.add('d-none');
      badge.classList.remove('d-flex');
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
      const isHidden = navMenu.classList.toggle('d-none');
      menuToggle.setAttribute('aria-expanded', String(!isHidden));
      menuIcon?.classList.toggle('d-none', !isHidden);
      closeIcon?.classList.toggle('d-none', isHidden);
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
