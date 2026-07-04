import { getAuthState } from './lib/auth.js';

const routeMatchers = [
  {
    title: 'Home',
    test: (pathname) => pathname === '/',
    load: () => import('./pages/home/home.js'),
  },
  {
    title: 'Login',
    test: (pathname) => pathname === '/login',
    load: () => import('./pages/login/login.js'),
  },
  {
    title: 'Register',
    test: (pathname) => pathname === '/register',
    load: () => import('./pages/register/register.js'),
  },
  {
    title: 'Forgot password',
    test: (pathname) => pathname === '/forgot-password',
    load: () => import('./pages/forgot-password/forgot-password.js'),
  },
  {
    title: 'Reset password',
    test: (pathname) => pathname === '/reset-password',
    load: () => import('./pages/reset-password/reset-password.js'),
  },
  {
    title: 'Properties',
    test: (pathname) => pathname === '/properties',
    load: () => import('./pages/properties/properties.js'),
  },
  {
    title: 'Property details',
    test: (pathname) => /^\/properties\/[^/]+$/.test(pathname),
    load: () => import('./pages/property-details/property-details.js'),
  },
  {
    title: 'Admin',
    test: (pathname) => pathname === '/admin',
    load: () => import('./pages/admin/admin.js'),
  },
];

const notFoundRoute = {
  title: 'Page not found',
  load: () => import('./pages/not-found/not-found.js'),
};

function matchRoute(pathname) {
  return routeMatchers.find((route) => route.test(pathname)) ?? notFoundRoute;
}

function getRouteParams(pathname) {
  const propertyMatch = pathname.match(/^\/properties\/([^/]+)$/);

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

  if (pathname === '/admin') {
    if (!authState.user) {
      await navigate(`/login?next=${encodeURIComponent('/admin')}`);
      return;
    }

    if (!authState.isAdmin) {
      pageSlot.innerHTML = `
        <section class="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div class="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10">
            <p class="text-sm font-semibold uppercase tracking-[0.3em] text-rose-600">Access denied</p>
            <h1 class="mt-3 text-3xl font-bold tracking-tight text-slate-900">Admin access only</h1>
            <p class="mt-4 text-slate-600">Your account is signed in, but it does not have admin privileges.</p>
            <a class="mt-8 inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white" href="/">Go home</a>
          </div>
        </section>
      `;
      document.title = 'Access denied | BG Homes';
      onRouteChange?.({ pathname, route: 'Access denied', params: {} });
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
    if (nextPath === window.location.pathname) {
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
    void navigate(url.pathname);
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