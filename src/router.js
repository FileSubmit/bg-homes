import { getAuthState } from './lib/auth.js';

const routeMatchers = [
  {
    title: 'Начало',
    test: (pathname) => pathname === '/',
    load: () => import('./pages/home/home.js'),
  },
  {
    title: 'Вход',
    test: (pathname) => pathname === '/login',
    load: () => import('./pages/login/login.js'),
  },
  {
    title: 'Регистрация',
    test: (pathname) => pathname === '/register',
    load: () => import('./pages/register/register.js'),
  },
  {
    title: 'Забравена парола',
    test: (pathname) => pathname === '/forgot-password',
    load: () => import('./pages/forgot-password/forgot-password.js'),
  },
  {
    title: 'Нова парола',
    test: (pathname) => pathname === '/reset-password',
    load: () => import('./pages/reset-password/reset-password.js'),
  },
  {
    title: 'Имоти',
    test: (pathname) => pathname === '/properties',
    load: () => import('./pages/properties/properties.js'),
  },
  {
    title: 'Добавяне на имот',
    test: (pathname) => pathname === '/add-property',
    load: () => import('./pages/add-property/add-property.js'),
  },
  {
    title: 'Редактиране на имот',
    test: (pathname) => /^\/properties\/[^/]+\/edit$/.test(pathname),
    load: () => import('./pages/add-property/add-property.js'),
  },
  {
    title: 'Детайли за имота',
    test: (pathname) => /^\/properties\/[^/]+$/.test(pathname),
    load: () => import('./pages/property-details/property-details.js'),
  },
  {
    title: 'Профил',
    test: (pathname) => pathname === '/profile',
    load: () => import('./pages/profile/profile.js'),
  },
  {
    title: 'Админ',
    test: (pathname) => pathname === '/admin',
    load: () => import('./pages/admin/admin.js'),
  },
  {
    title: 'Общи условия',
    test: (pathname) => pathname === '/terms',
    load: () => import('./pages/terms/terms.js'),
  },
  {
    title: 'Политика за лични данни',
    test: (pathname) => pathname === '/privacy',
    load: () => import('./pages/privacy/privacy.js'),
  },
  {
    title: 'Политика за бисквитки',
    test: (pathname) => pathname === '/cookies',
    load: () => import('./pages/cookies/cookies.js'),
  },
];

const authRequiredPatterns = [
  /^\/admin$/,
  /^\/add-property$/,
  /^\/profile$/,
  /^\/properties\/[^/]+\/edit$/,
];

function requiresAuth(pathname) {
  return authRequiredPatterns.some((pattern) => pattern.test(pathname));
}

const notFoundRoute = {
  title: 'Страницата не е намерена',
  load: () => import('./pages/not-found/not-found.js'),
};

function matchRoute(pathname) {
  return routeMatchers.find((route) => route.test(pathname)) ?? notFoundRoute;
}

function getRouteParams(pathname) {
  const propertyMatch = pathname.match(/^\/properties\/([^/]+)(?:\/edit)?$/);

  if (propertyMatch) {
    return { id: propertyMatch[1] };
  }

  return {};
}

let navigate = null;

async function renderRoute(pageSlot, onRouteChange) {
  if (!pageSlot || !navigate) {
    return;
  }

  const pathname = window.location.pathname;
  const authState = await getAuthState();

  if (requiresAuth(pathname)) {
    if (!authState.user) {
      await navigate(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (pathname === '/admin' && !authState.isAdmin) {
      pageSlot.innerHTML = `
        <section class="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div class="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10">
            <p class="text-sm font-semibold uppercase tracking-[0.3em] text-rose-600">Отказан достъп</p>
            <h1 class="mt-3 text-3xl font-bold tracking-tight text-slate-900">Само за администратори</h1>
            <p class="mt-4 text-slate-600">Влезли сте в профила си, но нямате администраторски права.</p>
            <a class="mt-8 inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white" href="/">Начало</a>
          </div>
        </section>
      `;
      document.title = 'Отказан достъп | BG Homes';
      onRouteChange?.({ pathname, route: 'Отказан достъп', params: {} });
      return;
    }
  }

  const route = matchRoute(pathname);
  const params = getRouteParams(pathname);
  const module = await route.load();

  pageSlot.innerHTML = await module.render(params, { authState });
  document.title = `${route.title} | BG Homes`;

  if (typeof module.hydrate === 'function') {
    module.hydrate(pageSlot, params, { authState });
  }

  onRouteChange?.({ pathname, route: route.title, params });
}

export function initRouter({ pageSlot, onRouteChange }) {
  navigate = async (nextPath) => {
    const currentPath = window.location.pathname + window.location.search;

    if (nextPath === currentPath) {
      return;
    }

    window.history.pushState({}, '', nextPath);
    await renderRoute(pageSlot, onRouteChange);
  };

  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href]');

    if (!anchor) {
      return;
    }

    const url = new URL(anchor.href, window.location.origin);

    if (url.origin !== window.location.origin) {
      return;
    }

    if (anchor.hasAttribute('download') || anchor.target === '_blank') {
      return;
    }

    event.preventDefault();
    void navigate(url.pathname + url.search);
  });

  window.addEventListener('popstate', () => {
    void renderRoute(pageSlot, onRouteChange);
  });

  void renderRoute(pageSlot, onRouteChange);

  return {
    refresh: () => renderRoute(pageSlot, onRouteChange),
    navigate,
  };
}

export function navigateTo(nextPath) {
  if (!navigate) {
    return;
  }

  void navigate(nextPath);
}